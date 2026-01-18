# Gemini CLI Guardrails Validator
# TravelKit × OpenCode × ULW × Oracle
# Windows PowerShell 5.1 compatible
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File tools/gemini/validate_guardrails.ps1

param(
    [string]$RepoRoot = "."
)

$ErrorActionPreference = "Stop"

function Fail($msg) {
    Write-Host "[FAIL] $msg" -ForegroundColor Red
    exit 1
}

function Pass($msg) {
    Write-Host "[PASS] $msg" -ForegroundColor Green
}

# Normalize root
$root = Resolve-Path $RepoRoot

# Required files
$doc = Join-Path $root "docs/gemini-cli.md"
$rules = Join-Path $root "tools/gemini/guardrails.md"
$allow = Join-Path $root "tools/gemini/allowed_shell_commands.txt"

Write-Host "=== Gemini CLI Guardrails Validation ===" -ForegroundColor Cyan
Write-Host ""

# Check required files exist
if (-not (Test-Path $doc)) { Fail "Missing docs/gemini-cli.md" }
if (-not (Test-Path $rules)) { Fail "Missing tools/gemini/guardrails.md" }
if (-not (Test-Path $allow)) { Fail "Missing tools/gemini/allowed_shell_commands.txt" }

Pass "Required files present"

# Non-empty allowlist (ignore comment lines)
$allowLines = Get-Content $allow | Where-Object { $_ -and -not $_.Trim().StartsWith("#") }
if ($allowLines.Count -lt 8) { 
    Fail "allowed_shell_commands.txt must contain at least 8 allowlisted commands (found $($allowLines.Count))" 
}

Pass "allowed_shell_commands.txt has $($allowLines.Count) commands (>= 8)"

# Required doc sections (keyword checks)
$docText = Get-Content $doc -Raw

$required = @(
    "## Install",
    "## Authenticate",
    "## Project Context via GEMINI.md",
    "## Guardrails",
    "## Output paths",
    "## Experiment criteria"
)

foreach ($k in $required) {
    if ($docText -notmatch [regex]::Escape($k)) {
        Fail "docs/gemini-cli.md missing required section marker: $k"
    }
}

Pass "docs/gemini-cli.md contains all required section markers"

# Ensure guardrails mention write-scope limits
$rulesText = Get-Content $rules -Raw
if ($rulesText -notmatch "docs/\*\*" -or $rulesText -notmatch "tools/\*\*" -or $rulesText -notmatch "outputs/\*\*") {
    Fail "guardrails.md must mention allowed write scopes: docs/**, tools/**, outputs/**"
}

Pass "guardrails.md includes write-scope constraints"

# Final result
Write-Host ""
Write-Host "=== Validation Result ===" -ForegroundColor Cyan
Write-Host "[OK] Gemini CLI guardrails validated." -ForegroundColor Green
exit 0
