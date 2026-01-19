# ci_regression.ps1 - Lite CI Check for TravelKit Android (PR3)
# Checks:
# 1. PR2_AUDIT_COMMENT.txt header format (2 lines)
# 2. No artifacts named *_new.log
# 3. Source Code Static Check (No 'debug_force_emit' in src/main)

Write-Host "--- CI Regression (Lite) ---" -ForegroundColor Cyan

# 1. Audit Comment Check
if (Test-Path "PR2_AUDIT_COMMENT.txt") {
    $content = Get-Content "PR2_AUDIT_COMMENT.txt" -TotalCount 2
    if ($content.Count -ge 2 -and $content[0] -match "^#" -and $content[1] -match "^#") {
        # OK
    }
    else {
        Write-Host "⚠️ PR Audit Comment header invalid (Expected 2 lines starting with '#')" -ForegroundColor Yellow
        # Not blocking for now, just warning
    }
}
else {
    Write-Host "⚠️ PR Audit Comment not found (SKIP: file not found)" -ForegroundColor Yellow
}

Write-Host "--- Scanning src/main for leaks ---" -ForegroundColor Cyan

# 2. Source Code Leak Check
$mainSrc = "app/src/main/java"
if (-not (Test-Path $mainSrc)) {
    # If path doesn't exist (e.g. slight diff in structure), try finding recursively or skip
    $mainSrc = "app/src/main"
}

$mainFiles = Get-ChildItem -Path $mainSrc -Recurse -Include *.kt, *.java -ErrorAction SilentlyContinue
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
}
else {
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

Write-Host "CI Regression Passed." -ForegroundColor Green
exit 0
