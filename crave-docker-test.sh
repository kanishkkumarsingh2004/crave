#!/bin/bash
# crave-docker-test.sh - Start the full Crave test environment with Docker
# Uses .env.test for local testing (never touches production .env)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "  Crave Food Delivery - Docker Test Setup"
echo "============================================"
echo ""

# Check if .env.test exists
if [ ! -f .env.test ]; then
  echo "ERROR: .env.test not found!"
  echo "Please create .env.test with your test configuration."
  exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker is not running. Please start Docker first."
  exit 1
fi

# Check if Docker Compose is available
if ! docker compose version > /dev/null 2>&1; then
  echo "ERROR: Docker Compose is not available."
  exit 1
fi

echo "[1/4] Building Docker images..."
docker compose -f docker-compose.test.yml build

echo ""
echo "[2/4] Running database migrations..."
docker compose -f docker-compose.test.yml up migrate --wait

echo ""
echo "[3/4] Starting all services..."
docker compose -f docker-compose.test.yml up -d backend frontend

echo ""
echo "[4/4] Waiting for services to be healthy..."
sleep 10

echo ""
echo "============================================"
echo "  Crave Test Environment is Ready!"
echo "============================================"
echo ""
echo "  Website:        http://localhost:3000"
echo "  WebSocket:      ws://localhost:8000"
echo "  Database:       localhost:5432 (PostgreSQL)"
echo "  Redis:          localhost:6379"
echo ""
echo "  Razorpay:       Test Mode (from .env.test)"
echo "  Admin Config:   http://localhost:3000/admin/payment-config"
echo ""
echo "============================================"
echo ""
echo "  Useful commands:"
echo "    Stop all:     docker compose -f docker-compose.test.yml down"
echo "    View logs:    docker compose -f docker-compose.test.yml logs -f"
echo "    Reset DB:     docker compose -f docker-compose.test.yml down -v"
echo "    Re-migrate:   docker compose -f docker-compose.test.yml up migrate"
echo ""
echo "============================================"
