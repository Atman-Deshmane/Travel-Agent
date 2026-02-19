#!/usr/bin/env bash
# ============================================
# Update & Restart Server from GitHub
# ============================================
# Pull latest code, install deps, restart service.
#
# Usage: bash scripts/update.sh
# ============================================
set -euo pipefail

APP_DIR="/opt/travel-agent"
SERVICE_NAME="travel-agent"

echo "🔄 Updating ${APP_DIR} from GitHub..."

cd "${APP_DIR}"

# 1. Back up server's data (would be lost/overwritten on pull)
PLACES_JSON="${APP_DIR}/data/kodaikanal_places.json"
IMAGES_DIR="${APP_DIR}/data/images"
USER_DATA_DIR="${APP_DIR}/user_data"
BACKUP_FILE="/tmp/kodaikanal_places_backup.json"
BACKUP_IMAGES="/tmp/kodaikanal_images_backup"
BACKUP_USERDATA="/tmp/kodaikanal_userdata_backup"

if [ -f "$PLACES_JSON" ]; then
    echo "💾 Backing up kodaikanal_places.json..."
    cp "$PLACES_JSON" "$BACKUP_FILE"
fi
if [ -d "$IMAGES_DIR" ]; then
    echo "💾 Backing up images directory..."
    rm -rf "$BACKUP_IMAGES"
    cp -r "$IMAGES_DIR" "$BACKUP_IMAGES"
fi
if [ -d "$USER_DATA_DIR" ]; then
    echo "💾 Backing up user_data directory..."
    rm -rf "$BACKUP_USERDATA"
    cp -r "$USER_DATA_DIR" "$BACKUP_USERDATA"
fi

# 2. Stash any local changes (e.g. places added via web UI) so pull doesn't fail
echo "📦 Stashing local changes..."
git stash --quiet 2>/dev/null || true

# 3. Pull latest code
echo "📥 Pulling latest changes..."
git pull origin main

# 4. Restore all backed-up data
if [ -f "$BACKUP_FILE" ]; then
    echo "♻️  Restoring kodaikanal_places.json..."
    cp "$BACKUP_FILE" "$PLACES_JSON"
    rm -f "$BACKUP_FILE"
fi
if [ -d "$BACKUP_IMAGES" ]; then
    echo "♻️  Restoring images directory..."
    mkdir -p "$IMAGES_DIR"
    cp -r "$BACKUP_IMAGES/"* "$IMAGES_DIR/" 2>/dev/null || true
    rm -rf "$BACKUP_IMAGES"
fi
if [ -d "$BACKUP_USERDATA" ]; then
    echo "♻️  Restoring user_data directory..."
    mkdir -p "$USER_DATA_DIR"
    cp -r "$BACKUP_USERDATA/"* "$USER_DATA_DIR/" 2>/dev/null || true
    rm -rf "$BACKUP_USERDATA"
fi

# 5. Fix file ownership & permissions (git pull creates files as root)
echo "🔐 Fixing file permissions..."
chown -R www-data:www-data "${APP_DIR}/data" "${APP_DIR}/user_data"
chmod -R 775 "${APP_DIR}/data" "${APP_DIR}/user_data"

# 6. Install/update Python dependencies
echo "📦 Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt --quiet

# 7. Restart the systemd service
echo "🔁 Restarting ${SERVICE_NAME} service..."
sudo systemctl restart "${SERVICE_NAME}"

# 8. Wait a moment and check status
sleep 2
if systemctl is-active --quiet "${SERVICE_NAME}"; then
    echo ""
    echo "============================================"
    echo "✅ Update Complete & Server Restarted!"
    echo "   Service: ${SERVICE_NAME} (active)"
    echo "============================================"
else
    echo ""
    echo "============================================"
    echo "❌ Service failed to start! Check logs:"
    echo "   sudo journalctl -u ${SERVICE_NAME} -n 50"
    echo "============================================"
    exit 1
fi
