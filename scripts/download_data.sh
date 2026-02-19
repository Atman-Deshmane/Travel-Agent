#!/usr/bin/env bash
# ============================================
# Download kodaikanal_places.json from Server
# ============================================
# Pulls the latest master places JSON from the
# GCP server to your local data/ directory.
#
# Usage: bash scripts/download_data.sh
# ============================================
set -euo pipefail

SERVER="awareallthetime100@travel-agent-api"
REMOTE_FILE="/opt/travel-agent/data/kodaikanal_places.json"
LOCAL_FILE="$(cd "$(dirname "$0")/.." && pwd)/data/kodaikanal_places.json"

echo "📥 Downloading kodaikanal_places.json from server..."
scp "${SERVER}:${REMOTE_FILE}" "${LOCAL_FILE}"
echo "✅ Saved to ${LOCAL_FILE}"
