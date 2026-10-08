#!/bin/bash
# ==============================================================================
# CRAVE FOOD & DARK STORE DELIVERY - ORACLE CLOUD ALWAYS FREE DEPLOYMENT SCRIPT
# ==============================================================================

set -e

echo "🚀 Starting Crave Production Setup on Oracle Cloud VPS..."

# 1. Update Ubuntu packages
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw

# 2. Allow Firewall Ports in Ubuntu iptables/ufw
echo "🔓 Configuring Ubuntu Firewall for Ports 80, 443, 3000, and 8000..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
sudo ufw --force enable || true

# Oracle Ubuntu iptables flush for public inbound ports
sudo iptables -F || true
sudo netfilter-persistent save || true

# 3. Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# 4. Build & Run Containers via Docker Compose
echo "📦 Building and launching Crave Containers (Next.js + WebSocket Server + Redis)..."
docker compose down -v || true
docker compose up --build -d

echo "----------------------------------------------------------------------"
echo "✅ CRAVE IS LIVE AND DEPLOYED!"
echo "🌐 Frontend & API:   http://$(curl -s ifconfig.me):3000"
echo "🔌 WebSocket Server: ws://$(curl -s ifconfig.me):8000/api/ws"
echo "----------------------------------------------------------------------"
