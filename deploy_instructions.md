# Travel Agent - Production Deployment Instructions

## Quick Overview

| Component | Local | Production |
|-----------|-------|------------|
| Frontend  | `localhost:5173` | `https://100cr.cloud/kodaikanal/` |
| Backend API | `localhost:5001` | `https://api.100cr.cloud` |
| VPS Location | - | `/var/www/travel-agent` |

---

## Pre-requisites on VPS

```bash
# Install Docker (if not already installed)
curl -fsSL https://get.docker.com | sh

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

---

## Deployment Steps

### Step 1: Upload Files to VPS

From your **local machine**:

```bash
# Create the deployment directory on VPS
ssh user@your-vps-ip "sudo mkdir -p /var/www/travel-agent && sudo chown \$USER:\$USER /var/www/travel-agent"

# Copy project files (excluding node_modules, .venv, etc.)
rsync -avz --exclude='node_modules' --exclude='.venv' --exclude='__pycache__' --exclude='.git' \
  ./ user@your-vps-ip:/var/www/travel-agent/
```

Or use Git:
```bash
ssh user@your-vps-ip
cd /var/www/travel-agent
git clone https://github.com/Atman-Deshmane/Travel-Agent.git .
```

### Step 2: Create .env File on VPS

```bash
ssh user@your-vps-ip
cd /var/www/travel-agent

# Create .env with your API keys
cat > .env << 'EOF'
GOOGLE_MAPS_API_KEY=your_actual_key
GEMINI_API_KEY=your_actual_key
GROQ_API_KEY=your_actual_key
EOF
```

### Step 3: Build and Start Docker Container

```bash
cd /var/www/travel-agent
docker compose -f docker-compose.prod.yml up -d --build
```

Verify it's running:
```bash
docker ps
docker logs travel_backend
```

### Step 4: Configure Nginx

```bash
# Copy Nginx config
sudo cp travel-agent.nginx /etc/nginx/sites-available/travel-agent
sudo ln -sf /etc/nginx/sites-available/travel-agent /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Setup SSL with Certbot

```bash
sudo certbot --nginx -d api.100cr.cloud
```

### Step 6: Update Frontend API URL

The frontend needs to call the production API instead of localhost. Update:
- `trip-dashboard/src/config.ts` (or wherever API URLs are defined)
- Change `http://127.0.0.1:5001` → `https://api.100cr.cloud`

---

## DNS Configuration

Add an A record for `api.100cr.cloud` pointing to your VPS IP:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | api | YOUR_VPS_IP | 3600 |

---

## Useful Commands

```bash
# View container logs
docker logs -f travel_backend

# Restart container
docker compose -f docker-compose.prod.yml restart

# Rebuild after code changes
docker compose -f docker-compose.prod.yml up -d --build

# Stop container
docker compose -f docker-compose.prod.yml down

# Check container health
docker inspect travel_backend | grep -A 10 "Health"
```

---

## Troubleshooting

### Container not starting?
```bash
docker logs travel_backend
```

### API not accessible?
```bash
# Check if container is running
docker ps

# Check if port 5001 is listening
ss -tlnp | grep 5001

# Test API locally on VPS
curl http://localhost:5001/api/warmup
```

### Nginx errors?
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### SSL certificate issues?
```bash
sudo certbot renew --dry-run
```
