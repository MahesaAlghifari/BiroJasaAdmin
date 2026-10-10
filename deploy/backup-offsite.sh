#!/usr/bin/env bash
# ==============================================================================
# Admin SUN89 — Biro Jasa Management System
# Production Off-Site Encrypted Backup Synchronization Script
#
# Recommended cron setup (Runs daily at 02:00 AM UTC):
# 0 2 * * * sun89 /opt/admin-sun89/current/deploy/backup-offsite.sh >> /var/log/admin-sun89-backup.log 2>&1
# ==============================================================================

set -euo pipefail

APP_DIR="/opt/admin-sun89/current"
BACKUP_DIR="/opt/admin-sun89/shared/backups"
OFFSITE_REMOTE="${OFFSITE_RCLONE_REMOTE:-sun89-cloud-backup:admin-sun89-backups}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting off-site backup workflow..."

# 1. Execute Local Consistent Backup (VACUUM INTO for SQLite + tar for Uploads)
cd "$APP_DIR"
node node_modules/tsx/dist/cli.mjs scripts/backup.ts

# 2. Find Most Recent Snapshots
LATEST_DB=$(ls -t "$BACKUP_DIR"/db_backup_*.sqlite 2>/dev/null | head -n 1)
LATEST_UPLOADS=$(ls -dt "$BACKUP_DIR"/uploads_backup_* 2>/dev/null | head -n 1)

if [ -z "$LATEST_DB" ] || [ -z "$LATEST_UPLOADS" ]; then
    echo "ERROR: Could not locate recent local backup snapshots in $BACKUP_DIR."
    exit 1
fi

echo "Latest local snapshots:"
echo "  - DB: $LATEST_DB"
echo "  - Uploads: $LATEST_UPLOADS"

# 3. Create Compressed Archive
ARCHIVE_PATH="$BACKUP_DIR/sun89_bundle_${TIMESTAMP}.tar.gz"
tar -czf "$ARCHIVE_PATH" -C "$BACKUP_DIR" "$(basename "$LATEST_DB")" "$(basename "$LATEST_UPLOADS")"
echo "Created archive: $ARCHIVE_PATH ($(du -h "$ARCHIVE_PATH" | cut -f1))"

# 4. Optional Encryption (OpenSSL AES-256)
TARGET_SYNC_FILE="$ARCHIVE_PATH"
if [ -n "$BACKUP_ENCRYPTION_KEY" ]; then
    ENCRYPTED_PATH="${ARCHIVE_PATH}.enc"
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -in "$ARCHIVE_PATH" -out "$ENCRYPTED_PATH" -pass "pass:$BACKUP_ENCRYPTION_KEY"
    rm -f "$ARCHIVE_PATH"
    TARGET_SYNC_FILE="$ENCRYPTED_PATH"
    echo "Encrypted archive: $TARGET_SYNC_FILE"
fi

# 5. Off-Site Replication via Rclone (S3 / B2 / R2 / SFTP)
if command -v rclone >/dev/null 2>&1; then
    echo "Syncing $TARGET_SYNC_FILE to remote destination: $OFFSITE_REMOTE..."
    rclone copy "$TARGET_SYNC_FILE" "$OFFSITE_REMOTE/daily/"
    echo "✔ Off-site sync completed successfully."
else
    echo "WARNING: 'rclone' utility not found on server. Archiving locally only."
    echo "To enable automatic off-site cloud sync, install rclone (https://rclone.org) and configure remote '$OFFSITE_REMOTE'."
fi

# 6. Local Retention Cleanup (Retain last 14 days of local bundle archives)
find "$BACKUP_DIR" -name "sun89_bundle_*" -type f -mtime +14 -delete
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup workflow completed."
