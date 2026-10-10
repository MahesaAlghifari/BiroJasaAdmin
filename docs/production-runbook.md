# Admin SUN89 — Production Operations & Recovery Runbook

**System:** Admin SUN89 — Biro Jasa Management System  
**Document Version:** 1.0 (Phase 7.6 Baseline)  
**Target Architecture:** Single-server deployment with HTTPS reverse proxy, Node.js/Express, SQLite WAL, and local persistent file storage.

---

## 1. System Topology & Architecture

```text
               INTERNET
                  │
                  ▼ (HTTPS :443)
       ┌────────────────────────┐
       │   HTTPS Reverse Proxy   │ (Nginx / Caddy)
       │   - TLS Termination    │ - Serves static frontend (/dist)
       │   - HSTS, CSP, CORS    │ - Proxies /api/* to :3001
       │   - X-Forwarded-*      │ - Rate limit safety net
       └──────────┬─────────────┘
                  │ (HTTP :3001, loopback only)
                  ▼
       ┌────────────────────────┐
       │ Express API Application │ (Node.js runtime)
       │   - Trust Proxy = 1    │
       │   - JWT & Ticket Auth  │
       │   - In-memory rate lim │
       └─────┬────────────┬─────┘
             │            │
             ▼            ▼
     ┌─────────────┐ ┌────────────────────────┐
     │ SQLite WAL  │ │ Persistent Disk Store  │
     │ database    │ │ server/uploads/        │
     │ (.sqlite)   │ │ (Non-public, hashed)   │
     └─────────────┘ └────────────────────────┘
```

---

## 2. Startup Procedures

### 2.1 Standard Node.js Production Start
```bash
# 1. Ensure production environment variables are configured
export NODE_ENV=production
export PORT=3001
export JWT_SECRET="your-generated-high-entropy-secret-at-least-32-chars"
export CORS_ORIGIN="https://admin.birojasa.com"
export DB_PATH="server/data/database.sqlite"
export UPLOAD_DIR="server/uploads"
export TRUST_PROXY=1

# 2. Build production assets
npm run build

# 3. Start Express backend
node dist-server/server.js   # or via tsx: npx tsx server/src/server.ts
```

### 2.2 Systemd Service Configuration (`/etc/systemd/system/sun89.service`)
```ini
[Unit]
Description=Admin SUN89 Biro Jasa Management System
After=network.target

[Service]
Type=simple
User=sun89
WorkingDirectory=/var/www/adminsunbirojasa
Environment=NODE_ENV=production
EnvironmentFile=/var/www/adminsunbirojasa/.env
ExecStart=/usr/bin/npx tsx server/src/server.ts
Restart=always
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=15

# Sandboxing & Filesystem Security
ProtectSystem=full
ReadWritePaths=/var/www/adminsunbirojasa/server/data /var/www/adminsunbirojasa/server/uploads /var/www/adminsunbirojasa/server/backups
PrivateTmp=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Commands:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sun89
sudo systemctl start sun89
sudo systemctl status sun89
```

---

## 3. Graceful Shutdown & Safe Restart

The application intercepts `SIGTERM` and `SIGINT` signals:
1. Stops accepting incoming HTTP connections on port 3001 (`server.close()`).
2. Allows active in-flight requests up to 10 seconds to finish.
3. Closes SQLite database connection cleanly (`closeDb()`), flushing WAL buffers to disk.
4. Exits with status `0`.

### Safe Restart Command:
```bash
sudo systemctl restart sun89
```

Or manually:
```bash
# Identify process ID
pgrep -f "server.ts"
# Send SIGTERM for graceful shutdown
kill -SIGTERM <PID>
```

---

## 4. Reverse Proxy Configurations (Nginx / Caddy)

### 4.1 Nginx Production Configuration (`/etc/nginx/sites-available/sun89`)
```nginx
server {
    listen 80;
    server_name admin.birojasa.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.birojasa.com;

    ssl_certificate /etc/letsencrypt/live/admin.birojasa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.birojasa.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # HSTS & Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Client upload size limit
    client_max_body_size 10M;

    # Static Frontend Assets
    root /var/www/adminsunbirojasa/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # CRITICAL: Do NOT expose server/uploads directly!
    location /uploads {
        deny all;
        return 404;
    }

    # API Proxy to Express
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 60s;
    }
}
```

### 4.2 Caddyfile Alternative
```caddy
admin.birojasa.com {
    tls admin@birojasa.com
    encode zstd gzip

    # Block public access to uploads or internal folders
    @blocked path /uploads* /server* /.env*
    respond @blocked 404

    # API Proxy
    handle /api/* {
        reverse_proxy 127.0.0.1:3001 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Static Frontend SPA
    handle {
        root * /var/www/adminsunbirojasa/dist
        try_files {path} /index.html
        file_server
    }
}
```

---

## 5. Backup Procedures

Backups MUST include both the SQLite database snapshot AND the physical uploads directory.

### 5.1 Automated Script (`scripts/backup.ts`)
Run on a cron schedule (e.g., nightly at 02:00 AM):
```bash
npx tsx scripts/backup.ts
```

### 5.2 SQLite Native Backup Command
To back up the database while the application is live:
```bash
# SQLite VACUUM INTO creates a crash-consistent, non-locking point-in-time snapshot
sqlite3 server/data/database.sqlite "VACUUM INTO 'server/backups/db_manual_backup.sqlite';"
```

### 5.3 Retention Policy
Keep:
- Hourly snapshots: 24 hours
- Daily snapshots: 30 days
- Monthly archives: 12 months

---

## 6. Restore Procedures (Disaster Recovery)

When recovering from a hardware failure, accidental deletion, or corrupt database:

### Step 1: Stop the Application Service
```bash
sudo systemctl stop sun89
```

### Step 2: Restore the Database File
```bash
# Verify backup file integrity first
sqlite3 /path/to/backup/db_backup.sqlite "PRAGMA integrity_check;"
# Should output: ok

# Copy verified backup to active database path
cp /path/to/backup/db_backup.sqlite server/data/database.sqlite
```

### Step 3: Restore Uploaded Document Files
```bash
# Copy physical documents back into uploads directory
cp -r /path/to/backup/uploads_backup/* server/uploads/
```

### Step 4: Verify Full Disaster Recovery Consistency
Run the automated DR verification utility:
```bash
npx tsx scripts/verify-dr.ts
```

### Step 5: Start Application & Health Check
```bash
sudo systemctl start sun89

# Verify liveness
curl -i http://localhost:3001/api/health

# Verify readiness (DB query + writable storage)
curl -i http://localhost:3001/api/health/ready
```

---

## 7. Incident Recovery Runbooks

### 7.1 Database Lock / Busy Contention
- **Symptom:** `SQLITE_BUSY: database is locked`
- **Mitigation:**
  1. The system configures `PRAGMA busy_timeout = 5000;` and `PRAGMA journal_mode = WAL;`.
  2. Verify that external scripts are not holding transactions open outside the application.
  3. Check disk I/O performance (`iostat -xz 1`).

### 7.2 Storage Full / Disk Exhaustion
- **Symptom:** HTTP 500 on document uploads (`ENOSPC: no space left on device`).
- **Inspection Command:**
  ```bash
  df -h server/uploads
  du -sh server/uploads
  ```
- **Mitigation:**
  1. Clean up old backups in `server/backups/`.
  2. Expand partition or mount `server/uploads` to a larger dedicated volume.
  3. Never delete active files in `server/uploads` directly without running soft-delete through the API.

### 7.3 Secret Rotation Procedure
When rotating `JWT_SECRET`:
1. Generate new 64-character secret:
   ```bash
   openssl rand -base64 48
   ```
2. Note that rotating the secret will invalidate active client sessions, requiring users to log in again.
3. Update `JWT_SECRET` in `.env`.
4. Restart application:
   ```bash
   sudo systemctl restart sun89
   ```
5. Confirm successful login via browser.
