#!/usr/bin/env bash
# ============================================
# Setup Git on GCP Server
# ============================================
# Run this ONCE on a fresh GCP instance to connect
# the deployment directory to your GitHub repo.
#
# Usage: bash scripts/setup_git.sh
# ============================================
set -euo pipefail

# ---- CONFIGURATION ----
GITHUB_REPO_URL="https://github.com/Atman-Deshmane/Travel-Agent.git"
BRANCH="main"
APP_DIR="/opt/travel-agent"

echo "🔧 Setting up Git in ${APP_DIR}..."

cd "${APP_DIR}"

# Initialize git if not already a repo
if [ ! -d ".git" ]; then
    git init
    echo "✅ Git initialized"
else
    echo "ℹ️  Git already initialized"
fi

# Add remote (or update if exists)
if git remote get-url origin &>/dev/null; then
    git remote set-url origin "${GITHUB_REPO_URL}"
    echo "✅ Remote 'origin' updated to ${GITHUB_REPO_URL}"
else
    git remote add origin "${GITHUB_REPO_URL}"
    echo "✅ Remote 'origin' added: ${GITHUB_REPO_URL}"
fi

# Fetch and reset to main
echo "📥 Fetching from origin/${BRANCH}..."
git fetch origin "${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo ""
echo "============================================"
echo "✅ Git setup complete!"
echo "   Repo:   ${GITHUB_REPO_URL}"
echo "   Branch: ${BRANCH}"
echo "   Dir:    ${APP_DIR}"
echo ""
echo "Next: Run 'bash scripts/update.sh' to pull updates"
echo "============================================"
