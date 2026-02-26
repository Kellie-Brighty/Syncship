#!/bin/bash
set -e

# ==============================================================================
# SyncShip Server Daemon Installer
# This script sets up a blank Ubuntu 20.04/22.04 server to deploy your web apps.
# It installs Nginx, Git, Node, Bun, Certbot, and the SyncShip Daemon.
# ==============================================================================

# 1. Parse Arguments (we need the user's secret Server Email and Token)
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --email) SERVER_EMAIL="$2"; shift ;;
        --token) SERVER_TOKEN="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$SERVER_EMAIL" ] || [ -z "$SERVER_TOKEN" ]; then
    echo "❌ Error: Missing --email or --token arguments."
    echo "Usage: curl -sL https://raw.githubusercontent.com/Kellie-Brighty/Syncship/main/droplet/static/install.sh | bash -s -- --email YOUR_DAEMON_EMAIL --token YOUR_DAEMON_TOKEN"
    exit 1
fi

echo "🚀 Starting SyncShip Daemon Installation..."
echo "🔑 Daemon Credentials acknowledged."
echo ""

# 2. Update System & Install Core Dependencies
echo "📦 Installing system dependencies (Nginx, Git, Certbot)..."
sudo apt-get update -y > /dev/null
sudo apt-get install -y curl git nginx python3-certbot-nginx rsync build-essential unzip > /dev/null

# 3. Install Node.js (v20)
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null
    sudo apt-get install -y nodejs > /dev/null
fi

# 4. Install Bun
if ! command -v bun &> /dev/null; then
    echo "📦 Installing Bun..."
    curl -fsSL https://bun.sh/install | bash > /dev/null
    export PATH="$HOME/.bun/bin:$PATH"
fi

# 5. Install PM2 (Process Manager)
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2 > /dev/null
fi

# 6. Setup Directory Structure
echo "📂 Creating /opt/syncship-daemon..."
sudo mkdir -p /opt/syncship-daemon
sudo chown -R $USER:$USER /opt/syncship-daemon
cd /opt/syncship-daemon

# 7. Download the Daemon Core
echo "⬇️ Downloading SyncShip Daemon..."
# In production, this would clone from a public GitHub release URL or a tarball.
# For now, we will assume the source is reachable or we do a sparse checkout.
# We'll just clone the main agency droplet repo and extract the daemon part.
if [ -d "daemon" ]; then
    rm -rf daemon
fi

# NOTE: Adjust this git clone URL to point to your public daemon release repository!
git clone https://github.com/Kellie-Brighty/Syncship.git temp_repo > /dev/null 2>&1
mv temp_repo/daemon ./daemon
rm -rf temp_repo

cd daemon

# 8. Setup Environment Variables & Firebase Key
# We securely write the .env file that locks this daemon to the user's specific ID.
echo "⚙️ Configuring environment variables..."

# The daemon authenticates via the standard Firebase Client SDK as an isolated tenant process
cat <<EOF > .env
# This unique credential ensures this daemon ONLY listens for YOUR deployments.
SYNC_USER_EMAIL=$SERVER_EMAIL
SYNC_DAEMON_TOKEN=$SERVER_TOKEN

# Google Cloud Firebase Details (Client SDK)
FIREBASE_API_KEY=AIzaSyCgmhQbILStmRwBIoSvsUKbJ7zONlfHxUw
FIREBASE_AUTH_DOMAIN=syncship-saas.firebaseapp.com
FIREBASE_PROJECT_ID=syncship-saas
FIREBASE_STORAGE_BUCKET=syncship-saas.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=430515257138
FIREBASE_APP_ID=1:430515257138:web:996ebca46579aadb39612b
EOF

echo "📦 Installing NPM dependencies for the daemon..."
npm install > /dev/null 2>&1
npm run build > /dev/null 2>&1

# 9. Start the Daemon with PM2
echo "🚀 Starting Daemon Service..."

# Stop it if it was already running
pm2 stop syncship-daemon > /dev/null 2>&1 || true
pm2 delete syncship-daemon > /dev/null 2>&1 || true

# Start with the .env file
pm2 start dist/index.js --name "syncship-daemon"

# Set PM2 to restart on server reboot
pm2 save > /dev/null
pm2 startup | tail -n 1 | bash > /dev/null 2>&1

echo "============================================================"
echo "✅ Installation Complete!"
echo "Your server is now securely linked to your SyncShip account."
echo "You can safely close this terminal."
echo "============================================================"
