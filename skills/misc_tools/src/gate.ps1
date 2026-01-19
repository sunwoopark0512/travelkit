<#
.SYNOPSIS
    Automated Oracle Gate for Android Governance.
    Orchestrates Evidence 1-4 generation and reporting.

.DESCRIPTION
    1. Detects Base Branch properly (auto-fallback).
    2. Checks Diff Scope against Allowlist (Evidence 1).
    3. Runs CI Regression (Evidence 2).
    4. Runs Source Leak Check (Evidence 3).
    5. Runs scoped Secret Scan (Evidence 4).
    6. Generates _gate_report.md.
#>
$ErrorActionPreference = "Stop"

# --- Configuration ---
$ReportFile = Join-Path (Get-Location) "_gate_report.md"
$AllowlistFile = Join-Path $PSScriptRoot "audit_allowlist_globs.txt"

# --- Helper: Write to Report ---
function Add-Report ($Line) {
    echo $Line >> $ReportFile
    Write-Host $Line
}

# --- Initialize Report ---
"## ◉ Oracle Gate Report" > $ReportFile
Add-Report "Run Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report ""

# --- 1. Base Branch Detection ---
Write-Host "🔍 [Gate] Detecting Base Branch..." -ForegroundColor Cyan

$BaseRef = $null
if ($env:GITHUB_BASE_REF) {
    $BaseRef = "origin/$env:GITHUB_BASE_REF"
    Write-Host "   -> Found GITHUB_BASE_REF: $BaseRef" -ForegroundColor Green
}
else {
    # Fallback logic for local
    $candidates = @("upstream/main", "origin/main", "main")
    foreach ($c in $candidates) {
        # Use Start-Process to avoid NativeCommandError exceptions on stderr
        $p = Start-Process git -ArgumentList "rev-parse --verify $c" -NoNewWindow -PassThru -Wait -ErrorAction SilentlyContinue
        if ($p.ExitCode -eq 0) {
            $BaseRef = $c
            break
        }
    }
}

if (-not $BaseRef) {
    Write-Error "Could not determine base branch (tried upstream/main, origin/main, main). Ensure you fetched."
}
Add-Report "- **Base Branch**: **$BaseRef**"

# --- 2. Evidence 1: Diff Scope Check ---
Write-Host "🔍 [Gate] Checking Diff Scope..." -ForegroundColor Cyan
$DiffFiles = git diff --name-only $BaseRef HEAD -- apps/android/ | ForEach-Object { $_.Trim() }

if ($DiffFiles.Count -eq 0) {
    Add-Report "⚠️ **Warning**: No changed files detected."
}
else {
    $AllowPatterns = Get-Content $AllowlistFile | Where-Object { $_ -match "\S" -and $_ -notmatch "^#" }
    
    # Helper glob match
    function Test-IsAllowed ($path) {
        foreach ($p in $AllowPatterns) {
            if ($path -like $p) { return $true }
        }
        return $false
    }

    $Disallowed = @()
    foreach ($f in $DiffFiles) {
        if (-not (Test-IsAllowed $f)) {
            $Disallowed += $f
        }
    }

    if ($Disallowed.Count -gt 0) {
        Add-Report "❌ **Evidence 1 FAILED**: Found files outside allowlist."
        Add-Report "   Disallowed: $($Disallowed -join ', ')"
        $Host.UI.WriteErrorLine("Blocking Violation: Modified files are not in allowlist.")
        exit 1
    }
    Add-Report "✅ **Evidence 1 PASS**: Diff ($($DiffFiles.Count) files) is strictly within allowlist."
}

# --- 3. Evidence 2: CI Regression ---
Write-Host "🔍 [Gate] Running CI Regression..." -ForegroundColor Cyan
try {
    # Execute existing script
    & "$PSScriptRoot/ci_regression.ps1"
    if ($LASTEXITCODE -eq 0) {
        Add-Report "✅ **Evidence 2 PASS**: ci_regression.ps1 passed (Exit 0)."
    }
    else {
        throw "ci_regression.ps1 failed with exit code $LASTEXITCODE"
    }
}
catch {
    Add-Report "❌ **Evidence 2 FAILED**: CI Regression script failed."
    write-error $_
}

# --- 4. Evidence 3: Debug Leak Check ---
Write-Host "🔍 [Gate] Checking Debug Leaks (src/main)..." -ForegroundColor Cyan
$SrcMain = Join-Path $PSScriptRoot "app/src/main"
if (Test-Path $SrcMain) {
    # Use git grep if available for speed, else select-string
    $Leaks = Get-ChildItem -Path $SrcMain -Recurse -Include *.kt, *.java | Select-String "debug_force_emit"
    if ($Leaks) {
        Add-Report "❌ **Evidence 3 FAILED**: Found 'debug_force_emit' in src/main."
        exit 1
    }
    Add-Report "✅ **Evidence 3 PASS**: No debug_force_emit found in src/main."
}
else {
    Add-Report "⚠️ **Evidence 3 SKIP**: src/main path not found."
}

# --- 5. Evidence 4: Secret Scan (Scoped) ---
Write-Host "🔍 [Gate] Running Secret Scan (PR Mode)..." -ForegroundColor Cyan
# Pass changed files to secret_scan.ps1
$ChangedAbsPaths = $DiffFiles | ForEach-Object { (Resolve-Path $_ -ErrorAction SilentlyContinue).Path } 
# Note: Resolve-Path might fail if file deleted. Filter nulls.

& "$PSScriptRoot/secret_scan.ps1" -Targets $ChangedAbsPaths -PRMode
if ($LASTEXITCODE -eq 0) {
    Add-Report "✅ **Evidence 4 PASS**: Secret Scan passed on changed files."
}
else {
    Add-Report "❌ **Evidence 4 FAILED**: Secret Scan found risks."
    exit 1
}

Add-Report ""
Add-Report "🚀 **Oracle Gate: ALL PASSED**"
Write-Host "Gate finished successfully. Report saved to $ReportFile" -ForegroundColor Green

