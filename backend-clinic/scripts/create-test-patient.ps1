[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
# Load .env into environment
$envFile = Join-Path (Get-Location) '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^\s*$') { return }
    $parts = $_ -split '='; $key = $parts[0].Trim(); $val = ($parts[1..($parts.Length-1)] -join '=').Trim('"')
    Set-Item -Path Env:\$key -Value $val
  }
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$payload = @{ email = 'doctor@pulpax.test'; password = $env:SEED_ADMIN_PASSWORD }
$body = $payload | ConvertTo-Json
try {
  # Use Invoke-WebRequest to capture status and content on errors
  $loginResp = Invoke-WebRequest -UseBasicParsing -Uri 'https://localhost:7010/api/v1/auth/login' -Method Post -Body $body -ContentType 'application/json' -WebSession $session -ErrorAction Stop
  $login = $loginResp.Content | ConvertFrom-Json
  Write-Output 'LOGIN_OK'
  Write-Output ($login | ConvertTo-Json -Depth 5)
  $tenantId = $login.tenantId
  $patientPayload = @{ firstName = 'API Test'; lastName = 'Patient'; phone = '05550001122' }
  $patientBody = $patientPayload | ConvertTo-Json
  $createResp = Invoke-WebRequest -UseBasicParsing -Uri 'https://localhost:7010/api/v1/patients' -Method Post -Body $patientBody -ContentType 'application/json' -WebSession $session -Headers @{ 'X-Tenant-ID' = $tenantId } -ErrorAction Stop
  $create = $createResp.Content | ConvertFrom-Json
  Write-Output 'CREATE_OK'
  Write-Output ($create | ConvertTo-Json -Depth 5)
} catch {
  if ($_.Exception.Response -ne $null) {
    $res = $_.Exception.Response.GetResponseStream()
    $sr = New-Object System.IO.StreamReader($res)
    $text = $sr.ReadToEnd()
    Write-Error "HTTP Error: $text"
  } else {
    Write-Error $_.Exception.Message
  }
  exit 1
}
