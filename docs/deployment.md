# Admin SUN89 — Production Deployment & Release Engineering Guide

**Document Version:** 1.0 (Phase 7.7 Baseline)  
**System:** Admin SUN89 — Biro Jasa Management System  
**Deployment Target:** Single-Server Linux (Ubuntu 22.04/24.04 LTS / Debian 12) or Windows Server with Node.js LTS, Systemd process supervision, and Nginx/Caddy HTTPS reverse proxy.

---

## 1. Architecture Overview

Admin SUN89 uses a decoupled architecture where the immutable application release artifact is strictly isolated from mutable production state:

```text
                           INTERNET
                              │
                              ▼ (HTTPS :443)
                   ┌──────────────────────┐
                   │ HTTPS Reverse Proxy   │ (Nginx / Caddy)
                   │ - TLS Termination    │ - Serves static frontend (/dist)
                   │ - Security Headers   │ - Proxies /api/* to Express :3001
                   │ - X-Forwarded-*      │ - Denies public /uploads access
                   └──────────┬───────────┘
                              │ (HTTP :3001, loopback only)
                              ▼
                   ┌──────────────────────┐
                   │ Express API Service  │ (Supervised by Systemd)
                   │ - Trust Proxy = 1    │
                   │ - Single-use Tickets │
                   │ - In-memory Limiter  │
                   └─────┬──────────┬─────┘
                         │          │
                         ▼          ▼
                 ┌─────────────┐ ┌────────────────────────┐
                 │ SQLite WAL  │ │ Persistent Store       │
                 │ database    │ │ server/uploads/        │
                 │ (.sqlite)   │ │ (Non-public, hashed)   │
                 └─────────────┘ └────────────────────────┘
```

### Invariant: Immutable Release vs Mutable State
```text
/var/www/adminsunbirojasa/
├── current -> releases/0.0.1/         <-- Symbolic link to active release
├── releases/
│   ├── 0.0.1/                         <-- Immutable application code
│   │   ├── dist/                      <-- Frontend production SPA
│   │   ├── server/                    <-- Backend server runtime
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   └── release-manifest.json
│   └── 0.0.2/                         <-- Staged next release
├── data/                              <-- MUTABLE: SQLite database (persistent)
│   └── database.sqlite
├── uploads/                           <-- MUTABLE: Document binary store (persistent)
├── backups/                           <-- MUTABLE: Disaster recovery snapshots
└── .env                               <-- MUTABLE: Environment secrets
```

---

## 2. Prerequisites & System Requirements

* **Node.js:** $\ge$ 20.18.0 or 22.x LTS (`node -v`)
* **Package Manager:** npm $\ge$ 10.x
* **Operating System:** Linux (systemd-enabled) or Windows Server
* **Dedicated System User:** `sun89` (non-root, restricted shell)
* **Required Directories:**
  ```bash
  sudo mkdir -p /var/www/adminsunbirojasa/{releases,data,uploads,backups}
  sudo chown -R sun89:sun89 /var/www/adminsunbirojasa
  ```

---

## 3. Environment Configuration (`.env`)

Create `/var/www/adminsunbirojasa/.env` with strict permissions (`chmod 600 .env`):

```ini
# [REQ-PROD] Runtime Environment
NODE_ENV=production
PORT=3001

# [REQ-PROD] High-Entropy Secret (Minimum 32 characters, unique to production)
# Generate via: openssl rand -base64 48
JWT_SECRET=production_generated_high_entropy_secret_minimum_32_characters_long

# [REQ-PROD] Authorized Origins (Comma-separated, NO wildcards allowed)
CORS_ORIGIN=https://admin.birojasa.com

# [REQ-PROD] Persistent Datastore Paths (Absolute paths recommended)
DB_PATH=/var/www/adminsunbirojasa/data/database.sqlite
UPLOAD_DIR=/var/www/adminsunbirojasa/uploads
BACKUP_DIR=/var/www/adminsunbirojasa/backups

# [REQ-PROD] Reverse Proxy Trust (1 for single reverse proxy hop)
TRUST_PROXY=1

# [OPTIONAL] Rate Limiting & File Size Bounds
MAX_FILE_SIZE_BYTES=5242880
TICKET_TTL_SECONDS=60
RATE_LIMIT_LOGIN_MAX=10
RATE_LIMIT_API_MAX=600
RATE_LIMIT_UPLOAD_MAX=30
```

---

## 4. Build & Packaging Workflow

Execute in CI/CD pipeline or build server:

```bash
# 1. Clean installation of exact locked dependencies
npm ci

# 2. Strict static type analysis
npm run typecheck

# 3. Comprehensive test suite verification
npm test

# 4. Production frontend bundle generation
npm run build

# 5. Deterministic release packaging
npm run release:package
```

The packager creates an immutable release in `releases/<version>/` containing:
- `dist/` (compiled frontend SPA)
- `server/` (server source and schemas)
- `package.json` & `package-lock.json`
- `release-manifest.json` (metadata, git hash, build timestamp, checksums)

---

## 5. Deployment Procedure

### Step 1: Transfer Release Artifact to Host
```bash
rsync -avz --delete releases/0.0.1/ sun89@production-host:/var/www/adminsunbirojasa/releases/0.0.1/
```

### Step 2: Install Production Dependencies (in release dir)
```bash
cd /var/www/adminsunbirojasa/releases/0.0.1
npm ci --omit=dev
```

### Step 3: Switch Active Symlink
```bash
ln -sfn /var/www/adminsunbirojasa/releases/0.0.1 /var/www/adminsunbirojasa/current
```

### Step 4: Start or Restart Application Service
```bash
sudo systemctl restart sun89
```

---

## 6. Process Supervision (Systemd)

Install service unit at `/etc/systemd/system/sun89.service`:

```ini
[Unit]
Description=Admin SUN89 Biro Jasa Management System
After=network.target

[Service]
Type=simple
User=sun89
Group=sun89
WorkingDirectory=/var/www/adminsunbirojasa/current
EnvironmentFile=/var/www/adminsunbirojasa/.env
ExecStart=/usr/bin/npx tsx server/src/server.ts
Restart=always
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=15

# Sandboxing & Security Hardening
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
ReadWritePaths=/var/www/adminsunbirojasa/data /var/www/adminsunbirojasa/uploads /var/www/adminsunbirojasa/backups

[Install]
WantedBy=multi-user.target
```

Enable and manage service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sun89
sudo systemctl start sun89
sudo systemctl status sun89
```

---

## 7. Reverse Proxy Configuration

### Nginx Reference Configuration (`/etc/nginx/sites-available/sun89`)
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

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 10M;

    # Static Frontend SPA
    root /var/www/adminsunbirojasa/current/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # CRITICAL: Prevent direct access to internal storage
    location /uploads {
        deny all;
        return 404;
    }

    # API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

---

## 8. Verification & Post-Deployment Smoke Tests

### Health Probes
```bash
# 1. Process Liveness Probe (Returns 200)
curl -i http://127.0.0.1:3001/api/health/live

# 2. Dependency Readiness Probe (Checks SQLite + Storage, Returns 200)
curl -i http://127.0.0.1:3001/api/health/ready
```

### Automated Live Smoke Test Suite
```bash
npx tsx scripts/smoke-test.ts http://127.0.0.1:3001 https://admin.birojasa.com
```

Checks:
1. Frontend SPA HTML served (`200 OK`)
2. Backend Liveness returns `200 OK`
3. Backend Readiness reports SQLite & storage healthy
4. Authentication issues valid JWT session token
5. Orders API returns operational records
6. Finance API returns invoices and cash balance
7. Pricing API returns Samsat items
8. Document metadata loads cleanly
9. Document access ticket generates and streams file bytes
10. Security headers active and unauthenticated requests rejected (`401`)

---

## 9. Upgrade Procedure (Atomic Release Switching)

> [!NOTE]
> Atomic symlink switching (`ln -sfn`) ensures filesystem release transitions are instantaneous. Because this baseline deploys a single Node.js process under systemd, restarting the service (`systemctl restart sun89`) incurs a brief sub-second restart interval. Simulated release switching and data continuity across upgrades are **VERIFIED**; live zero-downtime uninterrupted traffic continuity is classified as **NOT VERIFIED** without dual-instance socket-passing or rolling blue/green infrastructure.

Always execute pre-upgrade backup before deploying new software versions:

```bash
# 1. Execute Pre-Upgrade Backup Snapshot
npx tsx scripts/backup.ts

# 2. Prepare and Transfer Release N+1
rsync -avz releases/0.0.2/ /var/www/adminsunbirojasa/releases/0.0.2/
cd /var/www/adminsunbirojasa/releases/0.0.2 && npm ci --omit=dev

# 3. Atomic Symlink Switch
ln -sfn /var/www/adminsunbirojasa/releases/0.0.2 /var/www/adminsunbirojasa/current

# 4. Graceful Restart
sudo systemctl restart sun89

# 5. Verify Health & Execute Smoke Tests
curl -f http://127.0.0.1:3001/api/health/ready
npx tsx scripts/smoke-test.ts
```

---

## 10. Rollback Procedure

If the new release encounters defects or fails post-deployment smoke tests:

```bash
# 1. Point Symlink Back to Previous Stable Release
ln -sfn /var/www/adminsunbirojasa/releases/0.0.1 /var/www/adminsunbirojasa/current

# 2. If Database Corruption Occurred, Restore Pre-Upgrade Backup Snapshot
# (Verify backup integrity first)
sqlite3 /var/www/adminsunbirojasa/backups/db_backup_pre_upgrade.sqlite "PRAGMA integrity_check;"
cp /var/www/adminsunbirojasa/backups/db_backup_pre_upgrade.sqlite /var/www/adminsunbirojasa/data/database.sqlite

# 3. Restart Application Service
sudo systemctl restart sun89

# 4. Run Smoke Tests to Confirm System Restored
npx tsx scripts/smoke-test.ts
```

---

## 11. Filesystem Permissions (Least Privilege)

```bash
# Application files: Readable by sun89, non-writable
chmod -R 550 /var/www/adminsunbirojasa/releases
chown -R root:sun89 /var/www/adminsunbirojasa/releases

# Mutable state directories: Owned and writable by sun89
chown -R sun89:sun89 /var/www/adminsunbirojasa/{data,uploads,backups}
chmod 750 /var/www/adminsunbirojasa/{data,uploads,backups}

# Secret configuration: Strictly owner-readable
chmod 600 /var/www/adminsunbirojasa/.env
chown sun89:sun89 /var/www/adminsunbirojasa/.env

# Uploaded documents: Non-executable
find /var/www/adminsunbirojasa/uploads -type f -exec chmod 640 {} +
```

---

## 12. Troubleshooting & Log Inspection

* **Service Logs:** `sudo journalctl -u sun89 -f`
* **Nginx Access Logs:** `sudo tail -f /var/log/nginx/access.log`
* **Nginx Error Logs:** `sudo tail -f /var/log/nginx/error.log`
* **Disaster Recovery Consistency Audit:** `npx tsx scripts/verify-dr.ts`


---

## 13. Infrastructure Handoff Package & Automated Tooling

To ensure deterministic, reproducible production provisioning, the deployment assets are packaged directly in [`deploy/`](file:///d:/Admin/adminsunbirojasa/deploy/):

| Asset | Purpose | Location |
| --- | --- | --- |
| **Automated Deployer** | Zero-downtime-prepared symlink release switch with automatic rollback on health/smoke failure | [`deploy/deploy.sh`](file:///d:/Admin/adminsunbirojasa/deploy/deploy.sh) |
| **Systemd Service** | Hardened, sandboxed process supervisor unit for Express API | [`deploy/admin-sun89.service`](file:///d:/Admin/adminsunbirojasa/deploy/admin-sun89.service) |
| **Nginx Reverse Proxy** | Production HTTP/2, TLS 1.3, HSTS, rate-limiting, and static file protection | [`deploy/nginx/admin-sun89.conf`](file:///d:/Admin/adminsunbirojasa/deploy/nginx/admin-sun89.conf) |
| **Caddyfile** | Alternative zero-configuration reverse proxy with automatic ACME Let's Encrypt TLS | [`deploy/caddy/Caddyfile`](file:///d:/Admin/adminsunbirojasa/deploy/caddy/Caddyfile) |
| **Environment Template** | Fully annotated, secure `.env` template for production deployment | [`deploy/.env.production.template`](file:///d:/Admin/adminsunbirojasa/deploy/.env.production.template) |
| **Off-Site Backup Sync** | Encrypted GPG/AES-256 cloud replication script for cron execution | [`deploy/backup-offsite.sh`](file:///d:/Admin/adminsunbirojasa/deploy/backup-offsite.sh) |
| **Health & Disk Monitor** | Probes liveness, readiness, SQLite size, upload volume, and backup freshness (< 24h) | [`scripts/monitor-health.ts`](file:///d:/Admin/adminsunbirojasa/scripts/monitor-health.ts) |
| **Disaster Recovery Drill** | Automated 15-step database & physical document SHA-256 integrity verification | [`scripts/verify-dr.ts`](file:///d:/Admin/adminsunbirojasa/scripts/verify-dr.ts) |

### Quick Execution Commands
```bash
# Deploy release 0.0.1 with automatic rollback protection
sudo ./deploy/deploy.sh 0.0.1

# Monitor system health, storage, and backup age
npm run monitor

# Verify disaster recovery integrity
npm run verify:dr

# Take immediate point-in-time snapshot
npm run backup
```
