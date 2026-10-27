#!/usr/bin/env bash
# ==============================================================================
# crave. Production Docker Deployment Script
# Turnkey deployment with environment verification, migration, and health checks
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Text formatters
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "============================================================"
echo "          crave. Production Docker Deployment              "
echo "============================================================"
echo -e "${NC}"

# 1. Environment file check
if [ ! -f .env ]; then
  echo -e "${RED}[ERROR] .env file not found in $SCRIPT_DIR!${NC}"
  echo -e "Please create .env using .env.example as a template before deploying:"
  echo -e "  cp .env.example .env && nano .env"
  exit 1
fi

# Verify critical environment variables
if ! grep -q '^DATABASE_URL=' .env || [ -z "$(grep '^DATABASE_URL=' .env | cut -d'=' -f2-)" ]; then
  echo -e "${YELLOW}[WARNING] DATABASE_URL is not set or empty in .env.${NC}"
  echo -e "If using self-hosted PostgreSQL via Docker, deploy with: docker compose --profile with-db up -d"
fi

# 2. Docker daemon check
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}[ERROR] Docker daemon is not running or accessible.${NC}"
  echo -e "Please start Docker and try again."
  exit 1
fi

# 3. Docker Compose check
if ! docker compose version > /dev/null 2>&1; then
  echo -e "${RED}[ERROR] Docker Compose v2 is required but not installed.${NC}"
  exit 1
fi

echo -e "${GREEN}[1/4] Building production images...${NC}"
docker compose build --pull

echo -e "\n${GREEN}[2/4] Running database migrations...${NC}"
if docker compose run --rm migrate; then
  echo -e "${GREEN}✓ Database migrations completed successfully.${NC}"
else
  echo -e "${YELLOW}[WARNING] Migration step exited with an issue. Review logs if tables are not initialized.${NC}"
fi

echo -e "\n${GREEN}[3/4] Starting services (Redis, Backend, Frontend)...${NC}"
docker compose up -d redis backend frontend

echo -e "\n${GREEN}[4/4] Verifying health checks...${NC}"
for i in {1..30}; do
  if docker compose ps | grep -q "crave-frontend" && docker compose ps | grep -q "(healthy)"; then
    echo -e "${GREEN}✓ All services are up and healthy!${NC}"
    break
  fi
  echo -ne "Waiting for services to become healthy ($i/30)...\r"
  sleep 2
done

echo -e "\n${CYAN}${BOLD}"
echo "============================================================"
echo "          Deployment Complete & Ready                       "
echo "============================================================"
echo -e "${NC}"
echo -e "  Web App:        ${GREEN}http://localhost:${PORT:-3000}${NC}"
echo -e "  Health Check:   ${GREEN}http://localhost:${PORT:-3000}/api/health${NC}"
echo -e "  WebSocket:      ${GREEN}Internal network on backend:8000${NC}"
echo -e "  Redis Cache:    ${GREEN}localhost:${REDIS_PORT:-6379}${NC}"
echo ""
echo -e "${BOLD}Useful management commands:${NC}"
echo -e "  View logs:      ${CYAN}docker compose logs -f${NC}"
echo -e "  Check status:   ${CYAN}docker compose ps${NC}"
echo -e "  Stop stack:     ${CYAN}docker compose down${NC}"
echo -e "  Restart:        ${CYAN}docker compose restart${NC}"
echo -e "  Run migration:  ${CYAN}docker compose run --rm migrate${NC}"
echo "============================================================"
