#!/bin/bash
# ============================================================
# Travel Agent - Production-Safe Deployment Script
# SAFE FOR SHARED SERVERS - Will NOT disturb existing services
# ============================================================

set -e  # Exit on any error

echo "=============================================="
echo "  Travel Agent - Production-Safe Deployment"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/travel-agent"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
TARGET_PORT=5001

# ============================================================
# STEP 1: Check Docker (DO NOT INSTALL - just verify)
# ============================================================
echo -e "${BLUE}[1/7] Checking Docker installation...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  Docker is NOT installed.                                   ║${NC}"
    echo -e "${RED}║  Please install Docker manually before running this script. ║${NC}"
    echo -e "${RED}║                                                              ║${NC}"
    echo -e "${RED}║  Run: curl -fsSL https://get.docker.com | sh                ║${NC}"
    echo -e "${RED}║  Then: sudo usermod -aG docker \$USER                        ║${NC}"
    echo -e "${RED}║  Then: newgrp docker (or logout/login)                      ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed ($(docker --version | cut -d' ' -f3 | tr -d ','))${NC}"

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install it manually.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is available${NC}"

# Show existing Docker containers (so user can see n8n is safe)
echo ""
echo -e "${BLUE}  Currently running Docker containers:${NC}"
docker ps --format "  - {{.Names}} ({{.Status}})" 2>/dev/null || echo "  (none or permission denied)"
echo ""

# ============================================================
# STEP 2: Check System Resources (RAM Warning)
# ============================================================
echo -e "${BLUE}[2/7] Checking system resources...${NC}"
echo ""
echo -e "${YELLOW}  Memory Status:${NC}"
free -h | head -2
echo ""

# Check available memory (warn if less than 500MB)
AVAILABLE_MB=$(free -m | awk '/^Mem:/ {print $7}')
if [ "$AVAILABLE_MB" -lt 500 ]; then
    echo -e "${YELLOW}⚠ Warning: Low available memory (${AVAILABLE_MB}MB)${NC}"
    echo -e "${YELLOW}  Docker build may be slow or fail.${NC}"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted by user."
        exit 1
    fi
else
    echo -e "${GREEN}✓ Sufficient memory available (${AVAILABLE_MB}MB)${NC}"
fi

# ============================================================
# STEP 3: Check Port Availability (CRITICAL)
# ============================================================
echo ""
echo -e "${BLUE}[3/7] Checking if port ${TARGET_PORT} is available...${NC}"

if netstat -tuln 2>/dev/null | grep -q ":${TARGET_PORT} " || ss -tuln 2>/dev/null | grep -q ":${TARGET_PORT} "; then
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ERROR: Port ${TARGET_PORT} is already in use!                       ║${NC}"
    echo -e "${RED}║                                                              ║${NC}"
    echo -e "${RED}║  Something is already listening on this port.               ║${NC}"
    echo -e "${RED}║  Please check with: ss -tuln | grep ${TARGET_PORT}                   ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Process using port ${TARGET_PORT}:"
    ss -tulnp 2>/dev/null | grep ":${TARGET_PORT}" || netstat -tulnp 2>/dev/null | grep ":${TARGET_PORT}" || echo "(unable to determine)"
    exit 1
fi
echo -e "${GREEN}✓ Port ${TARGET_PORT} is available${NC}"

# ============================================================
# STEP 4: Setup Application Directory
# ============================================================
echo ""
echo -e "${BLUE}[4/7] Setting up application directory...${NC}"

if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    echo -e "${GREEN}✓ Created $APP_DIR${NC}"
else
    echo -e "${GREEN}✓ $APP_DIR already exists${NC}"
fi

# ============================================================
# STEP 5: Verify Application Files
# ============================================================
echo ""
echo -e "${BLUE}[5/7] Checking application files...${NC}"

if [ ! -f "$APP_DIR/docker-compose.prod.yml" ]; then
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  Application files not found in $APP_DIR             ║${NC}"
    echo -e "${RED}║                                                              ║${NC}"
    echo -e "${RED}║  Please copy the project files first using:                 ║${NC}"
    echo -e "${RED}║                                                              ║${NC}"
    echo -e "${RED}║  rsync -avz --exclude='node_modules' \\                      ║${NC}"
    echo -e "${RED}║    --exclude='.venv' --exclude='__pycache__' \\              ║${NC}"
    echo -e "${RED}║    ./ user@vps:$APP_DIR/                             ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
echo -e "${GREEN}✓ docker-compose.prod.yml found${NC}"

if [ ! -f "$APP_DIR/Dockerfile" ]; then
    echo -e "${RED}Dockerfile not found in $APP_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dockerfile found${NC}"

# Check for .env file
if [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Creating template .env file..."
    cat > "$APP_DIR/.env" << 'EOF'
# Travel Agent API Keys - EDIT THESE!
GOOGLE_MAPS_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
EOF
    echo -e "${YELLOW}⚠ Please edit $APP_DIR/.env with your actual API keys${NC}"
    echo ""
    read -p "Have you updated the .env file with real API keys? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Please update .env and run this script again.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file found${NC}"
fi

# ============================================================
# STEP 6: Build and Start Docker Container
# ============================================================
echo ""
echo -e "${BLUE}[6/7] Building and starting Docker container...${NC}"
echo -e "${YELLOW}  This may take a few minutes on first build...${NC}"
echo ""

cd $APP_DIR

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q '^travel_backend$'; then
    echo -e "${YELLOW}  Existing container found. Stopping and removing...${NC}"
    docker compose -f docker-compose.prod.yml down 2>/dev/null || true
fi

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo -e "${GREEN}✓ Container started${NC}"
echo ""
echo "  Running containers:"
docker ps --format "  - {{.Names}}: {{.Status}}" --filter "name=travel_backend"
echo ""

# Wait for health check
echo "  Waiting for service to be healthy..."
sleep 5

# Test the endpoint
if curl -sf http://localhost:${TARGET_PORT}/api/warmup > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API endpoint is responding${NC}"
else
    echo -e "${YELLOW}⚠ API may still be starting up. Check logs with: docker logs travel_backend${NC}"
fi

# ============================================================
# STEP 7: Setup Nginx (SAFELY - new file only)
# ============================================================
echo ""
echo -e "${BLUE}[7/7] Setting up Nginx (safely)...${NC}"

# Check if nginx config file exists
if [ ! -f "$APP_DIR/travel-agent.nginx" ]; then
    echo -e "${YELLOW}⚠ travel-agent.nginx not found, skipping Nginx setup${NC}"
    echo "  You'll need to configure Nginx manually."
else
    # Determine Nginx config location
    if [ -d "$NGINX_AVAILABLE" ]; then
        CONFIG_DEST="$NGINX_AVAILABLE/travel-agent"
        LINK_DEST="$NGINX_ENABLED/travel-agent"
        
        # Check if config already exists
        if [ -f "$CONFIG_DEST" ]; then
            echo -e "${YELLOW}  Nginx config already exists at $CONFIG_DEST${NC}"
            read -p "  Overwrite? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "  Skipping Nginx config update."
            else
                sudo cp $APP_DIR/travel-agent.nginx $CONFIG_DEST
                echo -e "${GREEN}✓ Updated Nginx config${NC}"
            fi
        else
            sudo cp $APP_DIR/travel-agent.nginx $CONFIG_DEST
            echo -e "${GREEN}✓ Installed Nginx config to $CONFIG_DEST${NC}"
        fi
        
        # Create symlink if it doesn't exist
        if [ ! -L "$LINK_DEST" ]; then
            sudo ln -sf $CONFIG_DEST $LINK_DEST
            echo -e "${GREEN}✓ Created symlink in sites-enabled${NC}"
        else
            echo -e "${GREEN}✓ Symlink already exists${NC}"
        fi
        
    elif [ -d "/etc/nginx/conf.d" ]; then
        CONFIG_DEST="/etc/nginx/conf.d/travel-agent.conf"
        
        if [ -f "$CONFIG_DEST" ]; then
            echo -e "${YELLOW}  Nginx config already exists at $CONFIG_DEST${NC}"
        else
            sudo cp $APP_DIR/travel-agent.nginx $CONFIG_DEST
            echo -e "${GREEN}✓ Installed Nginx config to $CONFIG_DEST${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Nginx configuration directory not found${NC}"
        echo "  Please configure Nginx manually."
    fi
    
    # Test and reload Nginx (only if nginx is installed)
    if command -v nginx &> /dev/null; then
        echo ""
        echo "  Testing Nginx configuration..."
        if sudo nginx -t 2>&1; then
            echo ""
            read -p "  Reload Nginx now? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                sudo systemctl reload nginx
                echo -e "${GREEN}✓ Nginx reloaded${NC}"
            fi
        else
            echo -e "${RED}  Nginx config test failed! Please fix before reloading.${NC}"
        fi
    fi
fi

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "=============================================="
echo -e "${GREEN}  Deployment Complete! 🎉${NC}"
echo "=============================================="
echo ""
echo "  Your API is now running at:"
echo "    - Local:  http://localhost:${TARGET_PORT}"
echo "    - Domain: http://api.100cr.cloud (after DNS + SSL)"
echo ""
echo "  SSL Setup (run once DNS is configured):"
echo -e "    ${YELLOW}sudo certbot --nginx -d api.100cr.cloud${NC}"
echo ""
echo "  Useful commands:"
echo "    View logs:   docker logs -f travel_backend"
echo "    Restart:     docker compose -f docker-compose.prod.yml restart"
echo "    Stop:        docker compose -f docker-compose.prod.yml down"
echo "    Rebuild:     docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "  Verify n8n is still running:"
echo "    docker ps | grep n8n"
echo ""
