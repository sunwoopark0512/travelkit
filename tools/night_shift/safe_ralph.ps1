# tools/night_shift/safe_ralph.ps1
# Safe Ralph Night Shift Runner (SSoT-driven)

param(
    [Parameter(Mandatory = $true)][string]$TicketPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Die([string]$msg) { Write-Host "SAFE_RALPH_FAIL: $msg"; exit 1 }
function Ensure-Dir([string]$p) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
function RepoRoot { (git rev-parse --show-toplevel).Trim() }

function Read-Ticket([string]$path) {
    if (-not (Test-Path $path)) { throw "Ticket not found: $path" }
    $raw = Get-Content $path -Raw
    if ($path.ToLower().EndsWith(".json")) { return ($raw | ConvertFrom-Json) }
    throw "Ticket must be JSON: $path"
}

function Get-WorktreeListPorcelain([string]$root) {
    $cwd = Get-Location
    try { Set-Location $root; return @(git worktree list --porcelain) }
    finally { Set-Location $cwd }
}

function Remove-WorktreeByPath([string]$root, [string]$path) {
    $cwd = Get-Location
    try {
        Set-Location $root
        if (Test-Path $path) {
            & git worktree remove $path --force 2>$null | Out-Null
        }
    }
    finally { Set-Location $cwd }
}

function Remove-BranchWorktreeIfExists([string]$root, [string]$branch) {
    $lines = Get-WorktreeListPorcelain $root
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -like "worktree *") {
            $wtPath = $lines[$i].Substring("worktree ".Length).Trim()
            $refLine = $null
            for ($j = $i + 1; $j -lt $lines.Count; $j++) {
                if ($lines[$j] -like "worktree *") { break }
                if ($lines[$j] -like "branch *") { $refLine = $lines[$j]; break }
            }
            if ($refLine) {
                $ref = $refLine.Substring("branch ".Length).Trim()
                if ($ref -eq "refs/heads/$branch") {
                    try {
                        Remove-WorktreeByPath -root $root -path $wtPath
                        Write-Host "Worktree conflict removed (branch=$branch): $wtPath"
                    }
                    catch {
                        Write-Warning "Failed removing worktree: $wtPath"
                    }
                }
            }
        }
    }
}

function New-TargetWorktree([string]$root, [string]$ticketId, [string]$branch) {
    $wtRoot = Join-Path $root ".worktrees"
    Ensure-Dir $wtRoot

    $wt = Join-Path $wtRoot $ticketId

    # remove same path if leftover
    try { Remove-WorktreeByPath -root $root -path $wt } catch {}

    # remove any other worktree holding this branch
    Remove-BranchWorktreeIfExists -root $root -branch $branch

    $cwd = Get-Location
    try {
        Set-Location $root
        Write-Host "Worktree add -> $wt ($branch)"
        & git worktree add $wt $branch 2>&1 | Out-Null
        if (-not (Test-Path $wt)) { throw "Worktree add failed: $wt" }
        return $wt
    }
    finally { Set-Location $cwd }
}

function Remove-TargetWorktree([string]$root, [string]$wt) {
    try {
        Remove-WorktreeByPath -root $root -path $wt
    }
    catch {}
}

function NowStamp() { (Get-Date).ToString("yyyyMMdd_HHmmss") }

function Invoke-VerifyCommands([object]$ticket, [string]$targetWt, [string]$outPath) {
    $cmds = @()
    if ($ticket.target.PSObject.Properties.Name -contains "verify_commands") {
        $cmds = @($ticket.target.verify_commands)
    }
    if ($cmds.Count -eq 0) { throw "verify_commands empty (MODE=feature requires it)" }

    $cwd = Get-Location
    try {
        Set-Location $targetWt
        $sb = New-Object System.Text.StringBuilder
        foreach ($c in $cmds) {
            $cStr = [string]$c
            $sb.AppendLine("=== CMD: $cStr ===") | Out-Null
            Write-Host "RUN: $cStr"
            $out = & powershell -NoProfile -Command $cStr 2>&1
            $sb.AppendLine(($out | Out-String)) | Out-Null
            if ($LASTEXITCODE -ne 0) {
                $sb.AppendLine("=== EXITCODE: $LASTEXITCODE ===") | Out-Null
                throw "verify command failed: $cStr"
            }
        }
        Ensure-Dir (Split-Path $outPath)
        $sb.ToString() | Set-Content -Encoding UTF8 $outPath
    }
    finally { Set-Location $cwd }
}

# ---------------- main ----------------
try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Die "Missing required command: git" }
    $root = RepoRoot
    $ticketAbs = (Resolve-Path $TicketPath).Path
    $ticket = Read-Ticket $ticketAbs

    # required fields (fail-fast)
    foreach ($k in @("ticket_id", "mode", "ops", "target")) {
        if (-not $ticket.PSObject.Properties.Name.Contains($k)) { Die "Missing ticket field: $k" }
    }
    foreach ($k in @("branch")) {
        if (-not $ticket.target.PSObject.Properties.Name.Contains($k)) { Die "Missing ticket.target field: $k" }
    }

    $ticketId = [string]$ticket.ticket_id
    $mode = [string]$ticket.mode   # "ops" | "feature"
    if ($mode -ne "ops" -and $mode -ne "feature") { Die "Invalid ticket.mode: $mode" }

    $opsBranch = (git branch --show-current).Trim()
    if ($ticket.ops.PSObject.Properties.Name -contains "branch") {
        $expectedOps = [string]$ticket.ops.branch
        if (-not [string]::IsNullOrWhiteSpace($expectedOps) -and $expectedOps -ne $opsBranch) {
            Die "Must run from ops branch '$expectedOps' but current is '$opsBranch'"
        }
    }

    $maxIters = 5
    $sameFailLimit = 3
    $maxHours = 6.0
    if ($ticket.PSObject.Properties.Name -contains "limits") {
        if ($ticket.limits.PSObject.Properties.Name -contains "max_iters") { $maxIters = [int]$ticket.limits.max_iters }
        if ($ticket.limits.PSObject.Properties.Name -contains "same_fail_limit") { $sameFailLimit = [int]$ticket.limits.same_fail_limit }
        if ($ticket.limits.PSObject.Properties.Name -contains "max_hours") { $maxHours = [double]$ticket.limits.max_hours }
    }

    $policyEvidence = "pack_only"
    if ($ticket.target.PSObject.Properties.Name -contains "evidence_policy") {
        $policyEvidence = [string]$ticket.target.evidence_policy
    }
    if (@("pack_only", "commit", "external") -notcontains $policyEvidence) {
        Die "Invalid ticket.target.evidence_policy: $policyEvidence"
    }

    $nightRoot = Join-Path $root ("outputs/night_shift/{0}" -f $ticketId)
    Ensure-Dir $nightRoot

    $start = Get-Date
    $lastSig = ""
    $lastCount = 0

    for ($i = 1; $i -le $maxIters; $i++) {
        $elapsed = ((Get-Date) - $start).TotalHours
        if ($elapsed -ge $maxHours) { Die "TIMEOUT: max_hours reached ($maxHours)" }

        $runDir = Join-Path $nightRoot ("run_{0:000}_{1}" -f $i, (NowStamp))
        Ensure-Dir $runDir

        $status = Join-Path $runDir "00_status.txt"
        @"
RUN_INDEX=$i
TICKET_ID=$ticketId
MODE=$mode
OPS_BRANCH=$opsBranch
TARGET_BRANCH=$($ticket.target.branch)
EVIDENCE_POLICY=$policyEvidence
START=$(Get-Date -Format o)
"@ | Set-Content -Encoding UTF8 $status

        $wt = $null
        $errMsg = $null
        try {
            $wt = New-TargetWorktree -root $root -ticketId $ticketId -branch ([string]$ticket.target.branch)

            # (A) Local oracle gate (policy checks, allowlists, mkdocs routing, rules existence)
            & powershell -ExecutionPolicy Bypass -File "$root/tools/night_shift/oracle_gate_check.ps1" `
                -TicketPath "$ticketAbs" -TargetWorktree "$wt"
            if ($LASTEXITCODE -ne 0) { throw "oracle_gate_check failed" }

            # (B) Verify commands only if MODE=feature (policy-fixed)
            if ($mode -eq "feature") {
                $stdout = Join-Path $runDir "hardlock_stdout.txt"
                Invoke-VerifyCommands -ticket $ticket -targetWt $wt -outPath $stdout
            }
            else {
                Write-Host "MODE=ops -> verify_commands skipped (fixed by policy)"
            }

            # (C) Pack evidence always (policy controls what’s copied)
            & powershell -ExecutionPolicy Bypass -File "$root/tools/night_shift/pack_evidence.ps1" `
                -TicketPath "$ticketAbs" -TargetWorktree "$wt" -RunDir "$runDir" -Policy "$policyEvidence"
            if ($LASTEXITCODE -ne 0) { throw "pack_evidence failed" }

            @"
RESULT=PASS
END=$(Get-Date -Format o)
"@ | Add-Content -Encoding UTF8 $status

            Write-Host "SAFE_RALPH_PASS: Night Shift complete."
            exit 0
        }
        catch {
            $errMsg = $_.Exception.Message
            Write-Host "SAFE_RALPH_RUN_FAIL: $errMsg"

            # still try packing evidence on failure (best-effort)
            try {
                if ($wt) {
                    & powershell -ExecutionPolicy Bypass -File "$root/tools/night_shift/pack_evidence.ps1" `
                        -TicketPath "$ticketAbs" -TargetWorktree "$wt" -RunDir "$runDir" -Policy "$policyEvidence" 2>$null | Out-Null
                }
            }
            catch {}

            @"
RESULT=FAIL
ERROR=$errMsg
END=$(Get-Date -Format o)
"@ | Add-Content -Encoding UTF8 $status

            # same-failure abort
            $sig = $errMsg
            if ($sig -eq $lastSig) { $lastCount++ } else { $lastSig = $sig; $lastCount = 1 }
            if ($lastCount -ge $sameFailLimit) {
                Die "ABORT: same_fail_limit reached ($sameFailLimit) for: $sig"
            }
        }
        finally {
            if ($wt) { Remove-TargetWorktree -root $root -wt $wt }
        }
    }

    Die "ABORT: max_iters reached ($maxIters)"
}
catch {
    Die ("Unhandled error: " + $_.Exception.Message)
}
<#
.SYNOPSIS
    Safe Ralph: The Night Shift Runner (Isolated Worktree)
#>
param(
    [Parameter(Mandatory = $true)][string]$TicketPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# 1. Load Ticket
if (-not (Test-Path $TicketPath)) { Write-Error "Ticket missing: $TicketPath"; exit 1 }
$ticket = Get-Content -Raw $TicketPath | ConvertFrom-Json

$targetBranch = $ticket.branch
$verifyCmds = $ticket.verify_commands
$maxIters = if ($ticket.max_iters) { $ticket.max_iters } else { 5 }
$ticketId = [System.IO.Path]::GetFileNameWithoutExtension($TicketPath)

Write-Host ">>> [Safe Ralph] Starting Night Shift for $ticketId"
Write-Host ">>> Target Branch: $targetBranch"

# 2. Setup Isolation
$tempRunDir = Join-Path $PSScriptRoot "..\..\temp_runner_$ticketId"
if (Test-Path $tempRunDir) { Remove-Item -Recurse -Force $tempRunDir }
New-Item -ItemType Directory -Force $tempRunDir | Out-Null

Write-Host ">>> Preparing workspace in: $tempRunDir"

Copy-Item ".git" -Destination $tempRunDir -Recurse
Copy-Item "tools" -Destination $tempRunDir -Recurse
Copy-Item "tickets" -Destination $tempRunDir -Recurse

Push-Location $tempRunDir
try {
    # 3. Checkout Target Branch in Temp
    # Note: git checkout often writes to stderr even on success, so we suppress error action for this call
    Write-Host ">>> Checking out $targetBranch..."
    
    # Using specific git invokation to avoid NativeCommandError halting script
    $gitProc = Start-Process git -ArgumentList "checkout -f $targetBranch" -NoNewWindow -PassThru -Wait
    if ($gitProc.ExitCode -ne 0) {
        throw "Failed to checkout target branch: $targetBranch (ExitCode: $($gitProc.ExitCode))"
    }

    Write-Host ">>> Checked out $targetBranch"

    # 4. Loop
    $iter = 1
    while ($iter -le $maxIters) {
        Write-Host "--- Iteration $iter / $maxIters ---"
        
        $allCmdsPassed = $true
        foreach ($cmd in $verifyCmds) {
            Write-Host "Running: $cmd"
            Invoke-Expression $cmd
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "Command Failed: $cmd"
                $allCmdsPassed = $false
                break
            }
        }

        # Pack Evidence
        $packScript = "tools\night_shift\pack_evidence.ps1"
        if (Test-Path $packScript) {
            powershell -ExecutionPolicy Bypass -File $packScript -TicketId $ticketId -RunIndex $iter
        }

        # Oracle Gate
        $gateScript = "tools\night_shift\oracle_gate_check.ps1"
        if (Test-Path $gateScript) {
            powershell -ExecutionPolicy Bypass -File $gateScript -TicketPath "tickets\$ticketId.json"
            if ($LASTEXITCODE -eq 0) {
                Write-Host ">>> [PASS] Oracle Verdict: PASS. Job Complete."
                return
            }
        }

        $iter++
    }
}
finally {
    Pop-Location
}

Write-Error ">>> Safe Ralph Loop Failed."
exit 1
