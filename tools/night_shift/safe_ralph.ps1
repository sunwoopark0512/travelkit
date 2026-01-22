# tools/night_shift/safe_ralph.ps1
# Safe Ralph Night Shift Runner (SSoT-driven)

param(
    [Parameter(Mandatory = $true)][string]$TicketPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail([string]$msg) { Write-Host "SAFE_RALPH_FAIL: $msg"; exit 1 }
function Ensure-Dir([string]$p) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
function Get-RepoRoot { (git rev-parse --show-toplevel).Trim() }

function Read-Ticket([string]$path) {
    if (-not (Test-Path $path)) { throw "Ticket not found: $path" }
    $raw = Get-Content $path -Raw
    if ($path.ToLower().EndsWith(".json")) { return ($raw | ConvertFrom-Json) }
    throw "Ticket must be JSON: $path"
}

function Remove-BranchWorktreeIfExists([string]$repoRoot, [string]$branch) {
    $cwd = Get-Location
    try {
        Set-Location $repoRoot
        $lines = @(git worktree list --porcelain)
        # Find blocks: worktree <path> ... branch <ref>
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -like "worktree *") {
                $path = $lines[$i].Substring("worktree ".Length).Trim()
                $branchLine = ""
                for ($j = $i + 1; $j -lt $lines.Count; $j++) {
                    if ($lines[$j] -like "worktree *") { break }
                    if ($lines[$j] -like "branch *") { $branchLine = $lines[$j]; break }
                }
                if ($branchLine -and $branchLine -like "branch *") {
                    $ref = $branchLine.Substring("branch ".Length).Trim()
                    if ($ref -eq "refs/heads/$branch") {
                        try {
                            & git worktree remove $path --force 2>&1 | Out-Null
                            Write-Host "Worktree conflict removed: $path"
                        }
                        catch {
                            Write-Warning "Failed to remove worktree at $path"
                        }
                    }
                }
            }
        }
    }
    finally { Set-Location $cwd }
}

function New-Worktree([string]$repoRoot, [string]$ticketId, [string]$branch, [string]$overrideName) {
    $wtRoot = Join-Path $repoRoot ".worktrees"
    Ensure-Dir $wtRoot

    $name = $ticketId
    if (-not [string]::IsNullOrWhiteSpace($overrideName)) { $name = $overrideName }
    $wt = Join-Path $wtRoot $name

    # Cleanup path if exists
    if (Test-Path $wt) {
        try {
            & git worktree remove $wt --force 2>&1 | Out-Null
        }
        catch {
            # If folder exists but not worktree, simple remove
            Remove-Item -Recurse -Force $wt -ErrorAction SilentlyContinue
        }
    }

    # Cleanup branch conflicts
    Remove-BranchWorktreeIfExists -repoRoot $repoRoot -branch $branch

    Write-Host "Worktree add -> $wt ($branch)"
    # Capture output to suppress noise, check exit code
    $err = & git worktree add $wt $branch 2>&1
    if ($LASTEXITCODE -ne 0) {
        # If still stuck, try pruning
        & git worktree prune
        $err = & git worktree add $wt $branch 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "git worktree add failed: $err"
        }
    }
    return $wt
}

function Remove-Worktree([string]$wt) {
    if (Test-Path $wt) {
        # Write-Host "Worktree remove -> $wt"
        & git worktree remove $wt --force 2>&1 | Out-Null
    }
}

function Invoke-VerifyCommands([object]$ticket, [string]$wt, [string]$stdoutPath) {
    $cmds = @($ticket.verify_commands)
    if ($cmds.Count -eq 0) { throw "verify_commands is empty" }

    $cwd = Get-Location
    try {
        Set-Location $wt
        $sb = New-Object System.Text.StringBuilder

        foreach ($c in $cmds) {
            $cStr = [string]$c
            $sb.AppendLine("=== CMD: $cStr ===") | Out-Null
            Write-Host "RUN(target): $cStr"

            # Execute inside worktree. Use cmd.exe to preserve simple quoting behavior.
            # Redirect stderr to stdout to capture everything
            $out = & cmd.exe /c "$cStr 2>&1"
            $sb.AppendLine(($out | Out-String)) | Out-Null

            if ($LASTEXITCODE -ne 0) {
                $sb.AppendLine("=== EXITCODE: $LASTEXITCODE ===") | Out-Null
                $failMsg = "verify command failed: $cStr"
                $sb.AppendLine($failMsg) | Out-Null
                # We write partial log before throwing
                Ensure-Dir (Split-Path $stdoutPath)
                $sb.ToString() | Set-Content -Encoding UTF8 $stdoutPath
                throw $failMsg
            }
        }

        Ensure-Dir (Split-Path $stdoutPath)
        $sb.ToString() | Set-Content -Encoding UTF8 $stdoutPath
    }
    finally {
        Set-Location $cwd
    }
}

# ---- main ----
try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail "Missing required command: git" }

    $repoRoot = Get-RepoRoot
    $ticketAbs = (Resolve-Path $TicketPath).Path
    $t = Read-Ticket $ticketAbs

    foreach ($k in @("ticket_id", "branch", "mode", "verify_kind", "max_iters", "max_hours", "same_fail_limit", "policy", "oracle")) {
        if (-not $t.PSObject.Properties.Name.Contains($k)) { Fail "Missing ticket field: $k" }
    }
    if (-not $t.policy.PSObject.Properties.Name.Contains("evidence")) { Fail "Missing ticket.policy.evidence" }
    if (-not $t.policy.PSObject.Properties.Name.Contains("mkdocs_route")) { Fail "Missing ticket.policy.mkdocs_route" }

    $opsBranch = (git branch --show-current).Trim()

    $nightRoot = Join-Path $repoRoot ("outputs/night_shift/{0}" -f $t.ticket_id)
    Ensure-Dir $nightRoot

    $start = Get-Date
    $maxHours = [double]$t.max_hours
    $maxIters = [int]$t.max_iters
    $sameFailLimit = [int]$t.same_fail_limit

    $lastFailSig = ""
    $lastFailCount = 0

    $mode = [string]$t.mode
    if ($mode -ne "ops" -and $mode -ne "feature") { Fail "Invalid ticket.mode: $mode (must be ops|feature)" }

    # VERIFY_KIND safety clamp (mode wins)
    $verifyKind = "ops_only"
    if ($mode -eq "feature") { $verifyKind = "feature" }

    $policyEvidence = [string]$t.policy.evidence

    $wtName = ""
    if ($t.PSObject.Properties.Name.Contains("worktree")) {
        if ($t.worktree.PSObject.Properties.Name.Contains("name")) { $wtName = [string]$t.worktree.name }
    }

    for ($i = 1; $i -le $maxIters; $i++) {
        $elapsedHours = ((Get-Date) - $start).TotalHours
        if ($elapsedHours -ge $maxHours) { Fail "TIMEOUT: max_hours reached ($maxHours)" }

        $runDir = Join-Path $nightRoot ("run_{0}" -f $i)
        Ensure-Dir $runDir

        $statusFile = Join-Path $runDir "00_status.txt"
        @"
RUN=$i
OPS_BRANCH=$opsBranch
MODE=$mode
VERIFY_KIND=$verifyKind
TARGET_BRANCH=$($t.branch)
EVIDENCE_POLICY=$policyEvidence
START=$(Get-Date -Format o)
"@ | Set-Content -Encoding UTF8 $statusFile

        $wt = $null
        try {
            # Gate checks
            if ($mode -eq "ops") {
                Write-Host "GATE(ops): oracle_gate_check.ps1"
                & powershell -ExecutionPolicy Bypass -File "$repoRoot/tools/night_shift/oracle_gate_check.ps1" `
                    -TicketPath "$ticketAbs"
                if ($LASTEXITCODE -ne 0) { throw "oracle_gate_check(ops) failed" }

                # Mode=ops => verify_commands must not run
                Write-Host "MODE=ops -> skip verify_commands (ops_only)"

                # Evidence pack: for ops mode, pack from repoRoot (no target worktree); reuse repoRoot as TargetWorktree
                & powershell -ExecutionPolicy Bypass -File "$repoRoot/tools/night_shift/pack_evidence.ps1" `
                    -TicketPath "$ticketAbs" -TargetWorktree "$repoRoot" -RunDir "$runDir" -Policy "$policyEvidence"
                if ($LASTEXITCODE -ne 0) { throw "pack_evidence failed" }

                "RESULT=PASS`nEND=$(Get-Date -Format o)`n" | Add-Content -Encoding UTF8 $statusFile
                Write-Host ">>> [LOCAL PASS] Night Shift (ops) Complete."
                exit 0
            }

            # feature mode: create worktree for target branch
            $wt = New-Worktree -repoRoot $repoRoot -ticketId $t.ticket_id -branch ([string]$t.branch) -overrideName $wtName

            Write-Host "GATE(feature): oracle_gate_check.ps1 (target worktree)"
            & powershell -ExecutionPolicy Bypass -File "$repoRoot/tools/night_shift/oracle_gate_check.ps1" `
                -TicketPath "$ticketAbs" -TargetWorktree "$wt"
            if ($LASTEXITCODE -ne 0) { throw "oracle_gate_check(feature) failed" }

            # Verify (feature only)
            $stdout = Join-Path $runDir "hardlock_stdout.txt"
            Invoke-VerifyCommands -ticket $t -wt $wt -stdoutPath $stdout

            # Pack evidence from target worktree
            & powershell -ExecutionPolicy Bypass -File "$repoRoot/tools/night_shift/pack_evidence.ps1" `
                -TicketPath "$ticketAbs" -TargetWorktree "$wt" -RunDir "$runDir" -Policy "$policyEvidence"
            if ($LASTEXITCODE -ne 0) { throw "pack_evidence failed" }

            # Optional PR comment oracle source
            if ($t.oracle.PSObject.Properties.Name.Contains("source") -and ([string]$t.oracle.source -eq "pr_comment_latest")) {
                if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh CLI required for oracle.source=pr_comment_latest" }

                $prUrl = ""
                if ($t.PSObject.Properties.Name.Contains("pr_url")) { $prUrl = [string]$t.pr_url }
                if ([string]::IsNullOrWhiteSpace($prUrl) -and $t.PSObject.Properties.Name.Contains("repo") -and $t.PSObject.Properties.Name.Contains("pr_number")) {
                    $prUrl = "https://github.com/$($t.repo)/pull/$($t.pr_number)"
                }
                if ([string]::IsNullOrWhiteSpace($prUrl)) { throw "Cannot resolve pr_url for PR comment check" }

                $body = gh pr view $prUrl --json comments --jq ".comments|sort_by(.createdAt)|reverse|.[0].body"
                $body | Set-Content -Encoding UTF8 (Join-Path $runDir "oracle_latest_comment.txt")

                $passRx = "Verdict:\s*(✅\s*)?PASS"
                if ($t.oracle.PSObject.Properties.Name.Contains("pass_regex")) { $passRx = [string]$t.oracle.pass_regex }
                if ($body -notmatch $passRx) { throw "PR comment does not contain PASS (regex=$passRx)" }
            }

            "RESULT=PASS`nEND=$(Get-Date -Format o)`n" | Add-Content -Encoding UTF8 $statusFile
            Write-Host ">>> [LOCAL PASS] Night Shift (feature) Complete."
            exit 0
        }
        catch {
            $msg = $_.Exception.Message
            Write-Host "RUN FAIL: $msg"
            "RESULT=FAIL`nERROR=$msg`nEND=$(Get-Date -Format o)`n" | Add-Content -Encoding UTF8 $statusFile

            if ($msg -eq $lastFailSig) { $lastFailCount++ } else { $lastFailSig = $msg; $lastFailCount = 1 }
            if ($lastFailCount -ge $sameFailLimit) { Fail "ABORT: same_fail_limit reached ($sameFailLimit) for: $msg" }
        }
        finally {
            if ($wt) { Remove-Worktree $wt }
        }
    }

    Fail "ABORT: max_iters reached ($maxIters)"
}
catch {
    Fail ("Unhandled error: " + $_.Exception.Message)
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
