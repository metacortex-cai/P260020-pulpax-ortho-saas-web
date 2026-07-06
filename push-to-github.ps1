$git = "D:\Git\cmd\git.exe"

# PAT ortam degiskeninden okunur, script icine hardcoded yazilmaz.
# Kullanmadan once: $env:PULPAX_GH_PAT1 = "ghp_..."
$PAT1 = $env:PULPAX_GH_PAT1

if (-not $PAT1) {
    Write-Host "HATA: PULPAX_GH_PAT1 ortam degiskeni tanimli degil." -ForegroundColor Red
    Write-Host '$env:PULPAX_GH_PAT1 = "ghp_..."' -ForegroundColor Yellow
    exit 1
}

$REPO1 = "https://$PAT1@github.com/metacortex-cai/pulpax-react-v.02.git"

Write-Host "=== Pulpax Push (metacortex-cai) ===" -ForegroundColor Cyan

if (-not (Test-Path ".git")) { & $git init }

$r1 = & $git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) { & $git remote set-url origin $REPO1 } else { & $git remote add origin $REPO1 }

$gitUser = & $git config user.name 2>&1
if (-not $gitUser) { & $git config user.name "Pulpax Developer"; & $git config user.email "dev@pulpax.com" }

& $git add .
$ts = Get-Date -Format "yyyy-MM-dd HH:mm"
& $git commit -m "chore: pulpax senkronizasyonu $ts"

Write-Host "Push ediliyor..." -ForegroundColor Yellow
& $git push -u origin main
if ($LASTEXITCODE -eq 0) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "HATA" -ForegroundColor Red }

Write-Host "=== TAMAMLANDI ===" -ForegroundColor Green
