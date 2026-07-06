# rebuild-backend.ps1
# Backend-clinic Docker imajını yeniden oluşturur ve başlatır.
# Proje kök dizininden çalıştırın:
#   cd D:\pulpax-react-v.02-master\pulpax-react-v.02-master
#   .\rebuild-backend.ps1

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $ProjectRoot

Write-Host "=== Pulpax Backend-Clinic Rebuild ===" -ForegroundColor Cyan
Write-Host "Proje dizini: $ProjectRoot" -ForegroundColor Gray

# 1. Docker imajı oluştur
Write-Host "`n[1/3] Backend-clinic imaji olusturuluyor..." -ForegroundColor Yellow
docker build -t pulpax-main-backend-clinic:latest -f backend-clinic/Dockerfile .
if ($LASTEXITCODE -ne 0) {
    Write-Host "HATA: Docker build basarisiz!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "Build tamamlandi." -ForegroundColor Green

# 2. Eski container'i durdur ve yeni imajla başlat
Write-Host "`n[2/3] Container yeniden baslatiliyor..." -ForegroundColor Yellow
docker stop pulpax-backend-clinic 2>$null
docker rm pulpax-backend-clinic 2>$null

# docker-compose ile yeniden başlat
docker-compose -f docker-compose.app.yml up -d backend-clinic
if ($LASTEXITCODE -ne 0) {
    Write-Host "HATA: Container baslatma basarisiz!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "Container baslatildi." -ForegroundColor Green

# 3. Log'ları kontrol et (10 saniye bekle)
Write-Host "`n[3/3] Container loglari (10 saniye)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
docker logs pulpax-backend-clinic --tail 30

Write-Host "`n=== Rebuild Tamamlandi ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sonraki adimlar:" -ForegroundColor White
Write-Host "  1. Pulpax'a login olun ve bir hasta sayfasini acin"
Write-Host "  2. Browser DevTools > Network > /api/v1/auth/login isteğinden JWT token'i kopyalayin"
Write-Host "  3. SaaS yönetim panelinden klinik UUID'yi bulun (X-Tenant-ID)"
Write-Host "  4. Seed scriptini calistirin:"
Write-Host ""
Write-Host "     .\seed-treatments.ps1 -Token 'JWT_TOKEN' -BaseUrl 'http://localhost:7010/api/v1' -ClinicId 'CLINIC_UUID'" -ForegroundColor Green
Write-Host ""
Write-Host "     VEYA doğrudan SQL ile:"
Write-Host "     psql -U pulpax_user -h localhost -p 5433 -d pulpax_tenant_a -v clinic_id=`"'CLINIC_UUID'`" -f seed-treatments.sql" -ForegroundColor Green

Pop-Location
