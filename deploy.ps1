# ==============================================================================
# crave. Production Docker Deployment Script (PowerShell for Windows)
# ==============================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          crave. Production Docker Deployment (PowerShell)  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Environment file check
if (-not (Test-Path ".env")) {
    Write-Host "[ERROR] .env file not found in current directory!" -ForegroundColor Red
    Write-Host "Please create .env using .env.example before deploying:" -ForegroundColor Yellow
    Write-Host "  Copy-Item .env.example .env"
    exit 1
}

# 2. Docker daemon check
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Docker Desktop is not running. Please start Docker Desktop and try again." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Docker command not found or Docker Desktop not started." -ForegroundColor Red
    exit 1
}

# 3. Build images
Write-Host "`n[1/4] Building production images..." -ForegroundColor Green
docker compose build --pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker build failed. Inspect the output above." -ForegroundColor Red
    exit 1
}

# 4. Database Migrations
Write-Host "`n[2/4] Running database migrations..." -ForegroundColor Green
docker compose run --rm migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Database migration runner finished with code $LASTEXITCODE. Verify DATABASE_URL if tables are missing." -ForegroundColor Yellow
}

# 5. Start Services
Write-Host "`n[3/4] Starting services (Redis, Backend, Frontend)..." -ForegroundColor Green
docker compose up -d redis backend frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start services." -ForegroundColor Red
    exit 1
}

# 6. Verify Health
Write-Host "`n[4/4] Verifying container health..." -ForegroundColor Green
Start-Sleep -Seconds 5
docker compose ps

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "          Deployment Complete & Ready                       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Web App:        http://localhost:3000" -ForegroundColor Green
Write-Host "  Health Check:   http://localhost:3000/api/health" -ForegroundColor Green
Write-Host "  WebSocket:      Internal backend:8000" -ForegroundColor Green
Write-Host "`nUseful commands:"
Write-Host "  View logs:      docker compose logs -f" -ForegroundColor Yellow
Write-Host "  Check status:   docker compose ps" -ForegroundColor Yellow
Write-Host "  Stop stack:     docker compose down" -ForegroundColor Yellow
Write-Host "  Run migration:  docker compose run --rm migrate" -ForegroundColor Yellow
Write-Host "============================================================"
