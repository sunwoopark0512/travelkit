# tools/night_shift/pack_evidence.ps1
# Evidence packer (gitignore-friendly)

param(
    [Parameter(Mandatory = $true)][string]$TicketPath,
    [Parameter(Mandatory = $true)][string]$TargetWorktree,
    [Parameter(Mandatory = $true)][string]$RunDir,
    [Parameter(Mandatory = $false)][ValidateSet("pack_only", "commit", "external")][string]$Policy = "pack_only"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail([string]$msg) { Write-Host "PACK_EVIDENCE_FAIL: $msg"; exit 1 }
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

    if (-not (Test-Path $TargetWorktree)) { Fail "TargetWorktree not found: $TargetWorktree" }
    Ensure-Dir $RunDir

    $eviRoot = Join-Path $RunDir "evidence"
    Ensure-Dir $eviRoot

    # Repro snapshot: git diff from target worktree HEAD (should be clean, but snapshot anyway)
    $cwd = Get-Location
    try {
        Set-Location $TargetWorktree
        $diff = git diff --patch HEAD
        $diff | Set-Content -Encoding UTF8 (Join-Path $RunDir "git_diff_from_head.patch")
    }
    finally { Set-Location $cwd }

    if ($Policy -eq "external") {
        @"
EVIDENCE_POLICY=external
NOTE: Provide external links in PR description. Local pack includes only pointers.
TARGET_BRANCH=$($t.branch)
TICKET_ID=$($t.ticket_id)
"@ | Set-Content -Encoding UTF8 (Join-Path $RunDir "evidence_policy.txt")
        Write-Host "PACK_EVIDENCE_OK: external"
        exit 0
    }

    # Copy candidate sources from target worktree (gitignore-friendly copies)
    Copy-DirIfExists (Join-Path $TargetWorktree "outputs/evidence") (Join-Path $eviRoot "outputs_evidence")
    Copy-DirIfExists (Join-Path $TargetWorktree "web/dashboard") (Join-Path $eviRoot "web_dashboard")
    Copy-DirIfExists (Join-Path $TargetWorktree "outputs/night_shift") (Join-Path $eviRoot "outputs_night_shift")

    @"
EVIDENCE_POLICY=$Policy
NOTE: This pack is a filesystem archive under outputs/night_shift/*.
It does NOT force git add of outputs/ (gitignore-friendly).
TARGET_BRANCH=$($t.branch)
TICKET_ID=$($t.ticket_id)
"@ | Set-Content -Encoding UTF8 (Join-Path $RunDir "evidence_policy.txt")

    Write-Host "PACK_EVIDENCE_OK: $Policy"
    exit 0
}
catch {
    Fail ("Unhandled error: " + $_.Exception.Message)
}
param(
    [string]$TicketId,
    [int]$RunIndex
)

$targetDir = "outputs\night_shift\$TicketId\run_$RunIndex"
New-Item -ItemType Directory -Force $targetDir | Out-Null

Write-Host "Packing evidence to $targetDir..."

$evidenceSources = @(
    "outputs/evidence/hardlock_stdout.txt",
    "outputs/evidence/hardlock_snapshot.txt",
    "web/dashboard/cards.json"
)

foreach ($src in $evidenceSources) {
    if (Test-Path $src) {
        Copy-Item $src $targetDir -Force
    }
}

git status > "$targetDir\git_status.txt"
