$ErrorActionPreference = "Stop"

Write-Host "--- CI Regression (Lite) ---" -ForegroundColor Cyan

# 1. PR Audit Comment Check
$commentFile = "PR2_AUDIT_COMMENT.txt"
if (Test-Path $commentFile) {
    $content = Get-Content $commentFile -Raw
    if ($content -match "PR2 Android Audit Verdict: APPROVE" -and $content -match "PR2 Audit Verdict: APPROVE") {
        Write-Host "✅ PR Audit Comment: Header Policy Passed" -ForegroundColor Green
    } else {
        Write-Host "❌ PR Audit Comment: Header Policy Failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️ PR Audit Comment not found (SKIP: file not found)" -ForegroundColor Yellow
}

# 2. Script Token Check
$scriptFile = "recover_and_verify.ps1"
if (Test-Path $scriptFile) {
    $scriptContent = Get-Content $scriptFile -Raw
    if ($scriptContent -match "PR2 Android Audit Verdict: APPROVE") {
        Write-Host "✅ Script Integrity: Header Generation Logic Found" -ForegroundColor Green
    } else {
        Write-Host "❌ Script Integrity: Header Logic Missing" -ForegroundColor Red
        exit 1
    }
}

# 3. Source Code Static Check (No 'debug_force_emit' in src/main)
Write-Host "--- Scanning src/main for leaks ---"
$searchPath = Join-Path $PSScriptRoot "app\src\main\java"
$mainFiles = Get-ChildItem -Path $searchPath -Recurse -Filter "*.kt"
$leakFound = $false

foreach ($file in $mainFiles) {
    $code = Get-Content $file.FullName -Raw
    if ($code -match "debug_force_emit") {
        Write-Host "❌ LEAK DETECTED: '$($file.Name)' contains 'debug_force_emit'" -ForegroundColor Red
        $leakFound = $true
    }
}

if ($leakFound) {
    exit 1
} else {
    Write-Host "✅ Source Check: No leaks in src/main" -ForegroundColor Green
}

# 4. Artifact Filename Policy (Check for banned patterns)
$bannedPatterns = @("*_new.log")
$bannedFound = $false
foreach ($pattern in $bannedPatterns) {
    if (Test-Path $pattern) {
        Write-Host "❌ ARTIFACT POLICY FAILED: Banned file found ($pattern) - Please delete manually." -ForegroundColor Red
        $bannedFound = $true
    }
}

if ($bannedFound) {
    exit 1
}

Write-Host "✅ Artifact Policy: Clean" -ForegroundColor Green

Write-Host "`n🎉 CI Regression Passed" -ForegroundColor Green
exit 0
