# GCP "Always Free" Deployment Guide

## 1. Create the VM Instance

1. Go to **GCP Console → Compute Engine → VM Instances → Create Instance**
2. Configure:

| Setting | Value |
|---|---|
| **Name** | `travel-agent` |
| **Region** | `us-west1`, `us-central1`, or `us-east1` ⚠️ |
| **Machine type** | `e2-micro` (0.25 vCPU, 1 GB RAM) |
| **Boot disk** | Ubuntu 22.04 LTS, 30 GB Standard |
| **Firewall** | ✅ Allow HTTP traffic, ✅ Allow HTTPS traffic |

> [!CAUTION]
> The **Always Free Tier** only applies to `e2-micro` instances in `us-west1`, `us-central1`, or `us-east1`. Any other region WILL incur charges.

## 2. Reserve a Static IP

Without this, your IP changes on reboot and DNS breaks.

1. Go to **VPC Network → IP Addresses**
2. Find your VM's ephemeral IP → click **Reserve** (or **Promote to Static**)
3. Name it `travel-agent-ip`
4. Update your DNS: Add an **A record** for `api.100cr.cloud` pointing to this static IP

## 3. Deploy the Application

SSH into your instance (click the **SSH** button in the GCP Console), then:

```bash
# Clone the repo
git clone https://github.com/Atman-Deshmane/Travel-Agent.git /opt/travel-agent
cd /opt/travel-agent

# Create your .env file
nano .env
# Paste your environment variables:
#   GEMINI_API_KEY=...
#   GOOGLE_MAPS_API_KEY=...
#   GROQ_API_KEY=...

# Run the deploy script
chmod +x gcp_deploy.sh
sudo ./gcp_deploy.sh
```

## 4. Post-Deploy Checklist

```bash
# 1. Generate embeddings (one-time)
sudo -u www-data /opt/travel-agent/venv/bin/python /opt/travel-agent/scripts/sync_embeddings.py

# 2. Start the service
sudo systemctl start travel-agent

# 3. Verify it's running
sudo systemctl status travel-agent
curl http://localhost:5001/api/warmup

# 4. Set up SSL (free via Let's Encrypt)
sudo certbot --nginx -d api.100cr.cloud

# 5. Test from outside
curl https://api.100cr.cloud/api/warmup
```

## 5. Common Operations

| Action | Command |
|---|---|
| View live logs | `sudo journalctl -u travel-agent -f` |
| Restart app | `sudo systemctl restart travel-agent` |
| Stop app | `sudo systemctl stop travel-agent` |
| Pull updates | `cd /opt/travel-agent && git pull && sudo systemctl restart travel-agent` |
| Re-sync embeddings | `sudo -u www-data /opt/travel-agent/venv/bin/python /opt/travel-agent/scripts/sync_embeddings.py` |
| Renew SSL | `sudo certbot renew` (auto-renews via cron) |

## 6. Swap File (Recommended for e2-micro)

The `e2-micro` only has 1 GB RAM. Add swap to prevent OOM kills:

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 7. Cost Summary

| Resource | Free Tier Limit | Your Usage |
|---|---|---|
| e2-micro VM | 1 instance/month | ✅ 1 instance |
| Standard disk | 30 GB | ✅ 30 GB |
| Egress | 1 GB/month (to non-US) | ✅ Low traffic |
| Static IP | Free while attached to running VM | ✅ |

> [!WARNING]
> A static IP costs **~$0.004/hour (~$3/month)** if reserved but NOT attached to a running VM. Always release it if you delete the instance.
