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

# 1. Pull latest code
echo "📥 Pulling latest changes..."
git pull origin main

# 2. Install/update Python dependencies
echo "📦 Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt --quiet

# 3. Restart the systemd service
echo "🔁 Restarting ${SERVICE_NAME} service..."
sudo systemctl restart "${SERVICE_NAME}"

# 4. Wait a moment and check status
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
