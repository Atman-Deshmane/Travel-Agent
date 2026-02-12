#!/bin/bash
# =============================================================
# GCP Deployment Script for Travel Agent Backend
# =============================================================
# Target: GCP e2-micro (Always Free Tier) / Ubuntu 22.04+
# Domain: api.100cr.cloud
#
# Usage:
#   chmod +x gcp_deploy.sh
#   sudo ./gcp_deploy.sh
# =============================================================

set -e  # Exit on any error

# --- Configuration ---
APP_NAME="travel-agent"
APP_DIR="/opt/travel-agent"
APP_USER="www-data"
DOMAIN="api.100cr.cloud"
GUNICORN_PORT=5001
GUNICORN_WORKERS=2  # e2-micro has 2 shared vCPUs

echo ""
echo "============================================================"
echo "  GCP Deployment: $APP_NAME"
echo "  Domain: $DOMAIN"
echo "============================================================"
echo ""

# --- 1. System Dependencies ---
echo "📦 [1/6] Installing system dependencies..."

apt-get update -qq
apt-get install -y -qq python3-pip python3-venv nginx certbot python3-certbot-nginx git > /dev/null

echo "  ✅ System packages installed"

# --- 2. App Directory Setup ---
echo ""
echo "📂 [2/6] Setting up application directory..."

if [ ! -d "$APP_DIR" ]; then
    mkdir -p "$APP_DIR"
    echo "  Created $APP_DIR"
else
    echo "  $APP_DIR already exists"
fi

# Copy project files (if running from project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/server.py" ]; then
    echo "  Syncing project files..."
    rsync -av --exclude='.venv' --exclude='node_modules' --exclude='.git' \
          --exclude='trip-dashboard' --exclude='__pycache__' \
          "$SCRIPT_DIR/" "$APP_DIR/" > /dev/null
    echo "  ✅ Project files synced"
else
    echo "  ⚠️  Run this script from the project root, or copy files to $APP_DIR manually"
fi

# --- 3. Python Virtual Environment ---
echo ""
echo "🐍 [3/6] Setting up Python virtual environment..."

if [ ! -d "$APP_DIR/venv" ]; then
    python3 -m venv "$APP_DIR/venv"
    echo "  Created virtual environment"
else
    echo "  Virtual environment already exists"
fi

"$APP_DIR/venv/bin/pip" install --upgrade pip -q
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/requirements.txt" -q
"$APP_DIR/venv/bin/pip" install gunicorn -q

echo "  ✅ Dependencies installed"

# --- 4. Systemd Service ---
echo ""
echo "⚙️  [4/6] Creating Systemd service..."

cat > /etc/systemd/system/${APP_NAME}.service << EOF
[Unit]
Description=Travel Agent Backend (Gunicorn)
After=network.target

[Service]
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment="PATH=${APP_DIR}/venv/bin"
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/venv/bin/gunicorn \
    --workers ${GUNICORN_WORKERS} \
    --bind 127.0.0.1:${GUNICORN_PORT} \
    --timeout 120 \
    --access-logfile /var/log/${APP_NAME}/access.log \
    --error-logfile /var/log/${APP_NAME}/error.log \
    server:app

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Create log directory
mkdir -p /var/log/${APP_NAME}
chown ${APP_USER}:${APP_USER} /var/log/${APP_NAME}

# Set ownership
chown -R ${APP_USER}:${APP_USER} "$APP_DIR"

systemctl daemon-reload
systemctl enable ${APP_NAME}

echo "  ✅ Systemd service created: ${APP_NAME}.service"

# --- 5. Nginx Configuration ---
echo ""
echo "🌐 [5/6] Configuring Nginx..."

cat > /etc/nginx/sites-available/${APP_NAME} << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Max upload size (for voice messages)
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:${GUNICORN_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts for long-running AI requests
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
        proxy_send_timeout 60s;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default  # Remove default site

# Test and reload
nginx -t
systemctl reload nginx

echo "  ✅ Nginx configured for ${DOMAIN}"

# --- 6. Summary ---
echo ""
echo "============================================================"
echo "  ✅ DEPLOYMENT COMPLETE"
echo "============================================================"
echo ""
echo "  App directory:  $APP_DIR"
echo "  Service:        sudo systemctl {start|stop|restart} $APP_NAME"
echo "  Logs:           sudo journalctl -u $APP_NAME -f"
echo "  Nginx logs:     /var/log/nginx/"
echo "  App logs:       /var/log/$APP_NAME/"
echo ""
echo "  📋 NEXT STEPS:"
echo "  1. Copy your .env file to $APP_DIR/.env"
echo "  2. Run embeddings sync:"
echo "     sudo -u $APP_USER $APP_DIR/venv/bin/python $APP_DIR/scripts/sync_embeddings.py"
echo "  3. Start the service:"
echo "     sudo systemctl start $APP_NAME"
echo "  4. Set up SSL with certbot:"
echo "     sudo certbot --nginx -d $DOMAIN"
echo "  5. Verify:"
echo "     curl https://${DOMAIN}/api/warmup"
echo ""
