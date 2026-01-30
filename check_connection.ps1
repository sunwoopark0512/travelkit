
# Diagnostic Script: Verify Real Google Sheet Connection

Clear-Host
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Connection Diagnostic Tool" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Credentials Check
if (-not (Test-Path "credentials.json")) {
    Write-Host "MISSING: credentials.json" -ForegroundColor Red
    Write-Host "   -> Action: Copy your key file to this folder." -ForegroundColor Gray
    exit
}
Write-Host "FOUND: credentials.json" -ForegroundColor Green

# 2. Key Check
if (-not $env:SHEET_KEY -or $env:SHEET_KEY -eq "dummy-sheet-key") {
    Write-Host "MISSING: Env Var SHEET_KEY" -ForegroundColor Red
    Write-Host '   -> Action: Run $env:SHEET_KEY="your-key"' -ForegroundColor Gray
    exit
}

Write-Host "FOUND: SHEET_KEY" -ForegroundColor Green

# 3. Cloud Connection Test
Write-Host "------------------------------------------" -ForegroundColor Gray
Write-Host "Testing Cloud Connectivity..." -ForegroundColor Yellow
python tools/test_sheet_access.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "PERFECT! Real Mode Ready." -ForegroundColor Cyan
    Write-Host "   Now run: .\tango.ps1" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "CONNECTION FAILED. See error above." -ForegroundColor Red
}
