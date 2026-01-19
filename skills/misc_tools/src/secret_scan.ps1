<#
.SYNOPSIS
    Scans files for potential secrets using regex patterns.
    Supports "PR Mode" (Blocking, Changed Files Only) and "Full Mode" (Non-Blocking, Repo Scan).

.PARAMETER Targets
    List of file paths to scan. If $null, scans entire repo (subject to ignore globs).

.PARAMETER PRMode
    If set, treats findings as Blocking Errors (Exit 1).
    If not set (Full Scan), treats findings as Warnings (Exit 0) for reporting.

.DESCRIPTION
    1. Reads ignore globs from secret_scan_ignore_globs.txt.
    2. Scans provided Targets (or all files) against risk patterns.
    3. Output format: Standard Console + Returns Findings Object.
#>
param (
    [string[]]$Targets = $null,
    [switch]$PRMode
)

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$IgnoreFile = Join-Path $ScriptDir "secret_scan_ignore_globs.txt"

# --- 1. Load Ignore Patterns ---
$IgnorePatterns = @()
if (Test-Path $IgnoreFile) {
    $IgnorePatterns = Get-Content $IgnoreFile | Where-Object { $_ -match "\S" -and $_ -notmatch "^#" }
}

# --- 2. Risk Patterns (Regex) ---
# Simple high-risk patterns. Extend as needed.
$RiskPatterns = @(
    @{ Name = "Generic Key"; Regex = "(?i)(api_key|apikey|secret|token).{0,20}['`"][0-9a-zA-Z]{16,}['`"]" },
    @{ Name = "Private Key"; Regex = "(?i)BEGIN.*PRIVATE" + " KEY" },
    @{ Name = "AWS Key"; Regex = "AKIA" + "[0-9A-Z]{16}" }
)

# --- 3. Determine Files to Scan ---
$FilesToScan = @()

if ($Targets -is [array] -and $Targets.Count -eq 0 -and $PRMode) {
    Write-Host "🔍 [Secret Scan] No changed files to scan (PR Mode)." -ForegroundColor Cyan
    exit 0
}

if ($Targets) {
    Write-Host "🔍 [Secret Scan] Targeted Scan ($($Targets.Count) files)" -ForegroundColor Cyan
    foreach ($path in $Targets) {
        if (Test-Path $path -PathType Leaf) { $FilesToScan += (Resolve-Path $path).Path }
    }
}
else {
    Write-Host "🔍 [Secret Scan] Full Repo Scan" -ForegroundColor Cyan
    # Naive recursive get, filtering ignores is complex in pure PS without git clean -X, 
    # but for this scope we'll trust git-tracked files or manual recursion.
    # Using git ls-files is safer if available.
    try {
        $gitRoot = git rev-parse --show-toplevel
        $gitFiles = git ls-files | ForEach-Object { Join-Path $gitRoot $_ }
        $FilesToScan = $gitFiles
    }
    catch {
        Write-Warning "Git not found or not in repo. Fallback to dir scan."
        $FilesToScan = Get-ChildItem -Path $ScriptDir -Recurse -File | Select-Object -ExpandProperty FullName
    }
}

# --- 4. Filter Ignored Files ---
# Helper to check glob match (simplified for PS)
function Test-GlobMatch ($path, $patterns) {
    # Convert path to relative for matching
    $relPath = $path.Replace($PWD.Path + "\", "").Replace("\", "/")
    foreach ($p in $patterns) {
        # Simple wildcard match
        if ($relPath -like $p) { return $true }
    }
    return $false
}

$FinalList = @()
foreach ($f in $FilesToScan) {
    if (-not (Test-GlobMatch $f $IgnorePatterns)) {
        $FinalList += $f
    }
}
$FilesToScan = $FinalList

# --- 5. Scan ---
$Findings = @()
foreach ($file in $FilesToScan) {
    try {
        $content = Get-Content -LiteralPath $file -Raw -ErrorAction Stop
        foreach ($rule in $RiskPatterns) {
            if ($content -match $rule.Regex) {
                $Findings += [PSCustomObject]@{
                    File  = $file
                    Rule  = $rule.Name
                    Match = $Matches[0]
                }
            }
        }
    }
    catch {
        Write-Warning "Skipping file (read error): $file"
    }
}

# --- 6. Report ---
if ($Findings.Count -gt 0) {
    Write-Host "❌ Secrets Found ($($Findings.Count))" -ForegroundColor Red
    $Findings | Format-Table File, Rule -AutoSize

    if ($PRMode) {
        Write-Error "Blocking Secrets detected in allowlisted PR files!"
        exit 1
    }
    else {
        Write-Warning "Secrets detected (Non-blocking mode)"
        # Use Warning stream or specific exit code if needed for scheduled job
    }
}
else {
    Write-Host "✅ Secret Scan Passed (No matches)" -ForegroundColor Green
}

exit 0
