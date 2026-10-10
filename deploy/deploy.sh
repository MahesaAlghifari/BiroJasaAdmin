#!/usr/bin/env bash
# ==============================================================================
# Admin SUN89 — Biro Jasa Management System
# Production Automated Release Deployment Script
#
# Usage:
#   sudo ./deploy/deploy.sh <version>
# Example:
#   sudo ./deploy/deploy.sh 0.0.1
# ==============================================================================

set -euo pipefail

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
    echo "ERROR: Version argument required (e.g., sudo ./deploy.sh 0.0.1)"
    exit 1
fi

APP_BASE_DIR="/opt/admin-sun89"
RELEASES_DIR="$APP_BASE_DIR/releases"
SHARED_DIR="$APP_BASE_DIR/shared"
CURRENT_LINK="$APP_BASE_DIR/current"
TARGET_RELEASE_DIR="$RELEASES_DIR/$VERSION"
SOURCE_RELEASE_DIR="releases/$VERSION"
SERVICE_NAME="admin-sun89"

echo "=================================================================="
echo " Starting Production Deployment for Admin SUN89 v$VERSION"
echo " Time: $(date -u +"%Y-%m-%d %H:%M:%SZ")"
echo "=================================================================="

# 1. Validation: Verify source release artifact exists
if [ ! -d "$SOURCE_RELEASE_DIR" ]; then
    echo "ERROR: Source release directory '$SOURCE_RELEASE_DIR' not found."
    echo "Please run 'npm run release:package' before deploying."
    exit 1
fi

if [ ! -f "$SOURCE_RELEASE_DIR/release-manifest.json" ]; then
    echo "ERROR: Release manifest missing in '$SOURCE_RELEASE_DIR'."
    exit 1
fi

# 2. Pre-Upgrade Backup: Take point-in-time snapshot of current state
echo "[1/7] Creating pre-deployment backup snapshot..."
if [ -f "$CURRENT_LINK/scripts/backup.ts" ]; then
    cd "$CURRENT_LINK"
    sudo -u sun89 npx tsx scripts/backup.ts || echo "WARNING: Backup script encountered a non-fatal warning."
    cd - > /dev/null
else
    echo "Notice: First-time deployment or backup script not yet present; skipping pre-upgrade backup."
fi

# 3. Save Previous Release for Rollback
PREVIOUS_RELEASE=""
if [ -L "$CURRENT_LINK" ]; then
    PREVIOUS_RELEASE=$(readlink -f "$CURRENT_LINK")
    echo "Notice: Current active release identified as: $PREVIOUS_RELEASE"
fi

# 4. Copy Release Artifact to Production Releases Directory
echo "[2/7] Installing release v$VERSION into $TARGET_RELEASE_DIR..."
mkdir -p "$RELEASES_DIR"
rm -rf "$TARGET_RELEASE_DIR"
cp -r "$SOURCE_RELEASE_DIR" "$TARGET_RELEASE_DIR"

# 5. Install Production Node Dependencies
echo "[3/7] Installing production dependencies in release v$VERSION..."
cd "$TARGET_RELEASE_DIR"
npm ci --omit=dev --silent
cd - > /dev/null

# Set Least-Privilege Permissions
chown -R root:sun89 "$TARGET_RELEASE_DIR"
chmod -R 750 "$TARGET_RELEASE_DIR"

# 6. Atomic Symlink Switch
echo "[4/7] Atomically switching active symlink to v$VERSION..."
ln -sfn "$TARGET_RELEASE_DIR" "$CURRENT_LINK"

# 7. Restart Application Service
echo "[5/7] Restarting $SERVICE_NAME systemd service..."
systemctl restart "$SERVICE_NAME"

# 8. Readiness Probe Verification
echo "[6/7] Waiting for readiness probe (HTTP 200 on /api/health/ready)..."
MAX_RETRIES=15
RETRY_COUNT=0
READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health/ready || echo "000")
    if [ "$HTTP_STATUS" -eq 200 ]; then
        READY=true
        echo "✔ Readiness probe PASSED (HTTP 200)."
        break
    fi
    echo "  - Readiness status: $HTTP_STATUS. Retrying in 2s ($((RETRY_COUNT + 1))/$MAX_RETRIES)..."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ "$READY" = false ]; then
    echo "❌ ERROR: Application failed to become ready after deployment!"
    if [ -n "$PREVIOUS_RELEASE" ] && [ -d "$PREVIOUS_RELEASE" ]; then
        echo "⚡ Executing automatic rollback to previous stable release: $PREVIOUS_RELEASE..."
        ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
        systemctl restart "$SERVICE_NAME"
        echo "✔ Rollback completed. System restored to previous release."
    fi
    exit 1
fi

# 9. Automated Post-Deployment Smoke Test
echo "[7/7] Running post-deployment smoke test suite..."
if [ -f "$CURRENT_LINK/scripts/smoke-test.ts" ]; then
    cd "$CURRENT_LINK"
    if sudo -u sun89 npx tsx scripts/smoke-test.ts http://127.0.0.1:3001 http://127.0.0.1:3000; then
        echo "✔ All smoke test assertions passed cleanly!"
    else
        echo "❌ ERROR: Post-deployment smoke test assertions failed!"
        if [ -n "$PREVIOUS_RELEASE" ] && [ -d "$PREVIOUS_RELEASE" ]; then
            echo "⚡ Executing automatic rollback due to failed smoke tests..."
            ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
            systemctl restart "$SERVICE_NAME"
            echo "✔ Rollback completed."
        fi
        exit 1
    fi
    cd - > /dev/null
fi

echo "=================================================================="
echo " SUCCESS: Admin SUN89 v$VERSION deployed and verified successfully!"
echo " Active release: $(readlink -f "$CURRENT_LINK")"
echo "=================================================================="
