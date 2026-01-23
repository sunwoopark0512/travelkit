# =========================
# FILE: tools/night_shift/pack_evidence.ps1
# =========================
<#
Evidence packer (gitignore-friendly)
- Copies reproducibility artifacts from TARGET worktree into OPS outputs/night_shift/<ticket_id>/run_*/
- Policy:
  - pack_only: copy local artifacts
  - commit:    same as pack_only (does NOT git add/commit)
  - external:  write pointer note only
- IMPORTANT: This file must contain ONLY this implementation (no legacy appended code).
#>

param(
    [Parameter(Mandatory = $true)][string]$TicketPath,
    [Parameter(Mandatory = $true)][string]$TargetWorktree,
    [Parameter(Mandatory = $true)][string]$RunDir,
    [Parameter(Mandatory = $false)][ValidateSet("pack_only", "commit", "external")][string]$Policy = "pack_only"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Die([string]$msg) { Write-Host "PACK_EVIDENCE_FAIL: $msg"; exit 1 }
function Ensure-Dir([string]$p) { New-Item -ItemType Directory -Force -Path $p | Out-Null }

function Read-Ticket([string]$path) {
    if (-not (Test-Path $path)) { throw "Ticket not found: $path" }
    $raw = Get-Content $path -Raw
    if ($path.ToLower().EndsWith(".json")) { return ($raw | ConvertFrom-Json) }
    throw "Ticket must be JSON: $path"
}

function Copy-DirIfExists([string]$src, [string]$dst) {
    if (Test-Path $src) {
        Ensure-Dir $dst
        Copy-Item -Recurse -Force (Join-Path $src "*") $dst
    }
}

try {
    $ticketAbs = (Resolve-Path $TicketPath).Path
    $t = Read-Ticket $ticketAbs

    if (-not (Test-Path $TargetWorktree)) { Die "TargetWorktree not found: $TargetWorktree" }
    Ensure-Dir $RunDir

    $eviRoot = Join-Path $RunDir "evidence"
    Ensure-Dir $eviRoot

    # Snapshot: git status + diff (from target worktree)
    $cwd = Get-Location
    try {
        Set-Location $TargetWorktree
        (git status --porcelain=v1) | Set-Content -Encoding UTF8 (Join-Path $RunDir "git_status_porcelain.txt")
        (git rev-parse HEAD)        | Set-Content -Encoding UTF8 (Join-Path $RunDir "git_head.txt")
        (git diff --patch HEAD)     | Set-Content -Encoding UTF8 (Join-Path $RunDir "git_diff_from_head.patch")
    }
    finally { Set-Location $cwd }

    if ($Policy -eq "external") {
        @"
EVIDENCE_POLICY=external
NOTE: Provide external links in PR description. Local pack includes only pointers.
TICKET_ID=$($t.ticket_id)
TARGET_BRANCH=$($t.target.branch)
"@ | Set-Content -Encoding UTF8 (Join-Path $RunDir "evidence_policy.txt")
        Write-Host "PACK_EVIDENCE_OK: external"
        exit 0
    }

    # Copy evidence-like directories from target worktree (never forces git add)
    Copy-DirIfExists (Join-Path $TargetWorktree "outputs/evidence")     (Join-Path $eviRoot "outputs_evidence")
    Copy-DirIfExists (Join-Path $TargetWorktree "outputs/night_shift")  (Join-Path $eviRoot "outputs_night_shift")
    Copy-DirIfExists (Join-Path $TargetWorktree "web/dashboard")        (Join-Path $eviRoot "web_dashboard")

    @"
EVIDENCE_POLICY=$Policy
NOTE: Files are copied into outputs/night_shift/* and are gitignore-friendly.
TICKET_ID=$($t.ticket_id)
TARGET_BRANCH=$($t.target.branch)
"@ | Set-Content -Encoding UTF8 (Join-Path $RunDir "evidence_policy.txt")

    Write-Host "PACK_EVIDENCE_OK: $Policy"
    exit 0
}
catch {
    Die ("Unhandled error: " + $_.Exception.Message)
}
function Die([string]$msg) { Write-Host "PACK_EVIDENCE_FAIL: $msg"; exit 1 }
function Ensure-Dir([string]$p) { New-Item -ItemType Directory -Force -Path $p | Out-Null }

function Read-Ticket([string]$path) {
    if (-not (Test-Path $path)) { throw "Ticket not found: $path" }
    $raw = Get-Content $path -Raw
    if ($path.ToLower().EndsWith(".json")) { return ($raw | ConvertFrom-Json) }
    throw "Ticket must be JSON: $path"
}

function Copy-DirIfExists([string]$src, [string]$dst) {
    if (Test-Path $src) {
        Ensure-Dir $dst
        Copy-Item -Recurse -Force (Join-Path $src "*") $dst
    }
}

try {
    $ticketAbs = (Resolve-Path $TicketPath).Path
    $t = Read-Ticket $ticketAbs

    if (-not (Test-Path $TargetWorktree)) { Die "TargetWorktree not found: $TargetWorktree" }
    Ensure-Dir $RunDir

    $eviRoot = Join-Path $RunDir "evidence"
    Ensure-Dir $eviRoot

    # Snapshot: git status + diff (from target worktree)
    $cwd = Get-Location
    try {
        Set-Location $TargetWorktree
        (git status --porcelain=v1) | Set-Content -Encoding UTF8 (Join-Path $RunDir "git_status_porcelain.txt")
        (git rev-parse HEAD)        | Set-Content -Encoding UTF8 (Join-Path $RunDir "git_head.txt")
        (git diff --patch HEAD)     | Set-Content -Encoding UTF8 (Join-Path $RunDir "git_diff_from_head.patch")
    }
    finally { Set-Location $cwd }

    if ($Policy -eq "external") {
        @"
EVIDENCE_POLICY=external
NOTE: Provide external links in PR description. Local pack includes only pointers.
TICKET_ID=$($t.ticket_id)
TARGET_BRANCH=$($t.target.branch)
"@ | Set-Content -Encoding UTF8 (Join-Path $RunDir "evidence_policy.txt")
        Write-Host "PACK_EVIDENCE_OK: external"
        exit 0
    }

    # Copy evidence-like directories from target worktree (never forces git add)
    Copy-DirIfExists (Join-Path $TargetWorktree "outputs/evidence")     (Join-Path $eviRoot "outputs_evidence")
    Copy-DirIfExists (Join-Path $TargetWorktree "outputs/night_shift")  (Join-Path $eviRoot "outputs_night_shift")
    Copy-DirIfExists (Join-Path $TargetWorktree "web/dashboard")        (Join-Path $eviRoot "web_dashboard")

    @"
EVIDENCE_POLICY=$Policy
NOTE: Files are copied into outputs/night_shift/* and are gitignore-friendly.
TICKET_ID=$($t.ticket_id)
TARGET_BRANCH=$($t.target.branch)
"@ | Set-Content -Encoding UTF8 (Join-Path $RunDir "evidence_policy.txt")

    Write-Host "PACK_EVIDENCE_OK: $Policy"
    exit 0
}
catch {
    Die ("Unhandled error: " + $_.Exception.Message)
}
