<# 
tools/night_shift/safe_ralph.ps1
Safe Ralph Night Shift Runner — FULL REPLACEMENT (SSoT v2)
Compatible with Windows PowerShell 5.1

Guarantees:
- SSoT v2 ticket schema support (ops/feature)
- fail-fast on missing rules (tools/night_shift/oracle_rules.ps1) and missing gate scripts
- ops/feature mode auto-fixed (if ticket.mode missing/invalid -> inferred)
- target worktree isolation under .worktrees/<ticket_id>.<mode>
- worktree conflict auto removal (by branch ref OR by path)
- durable status output: outputs/night_shift/<ticket_id>/run_N/00_status.txt
- no $ticketAbs unbound errors (initialized early, null-guarded)
#>

param(
    [Parameter(Mandatory = $true)][string]$TicketPath
)

# Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

# ---------------- utilities ----------------
function NowIso() { (Get-Date).ToString("o") }

function Write-Log([string]$msg) {
    Write-Host $msg
}

function Die([string]$msg) {
    throw $msg
}

function Ensure-Dir([string]$p) {
    New-Item -ItemType Directory -Force -Path $p | Out-Null
}

function RepoRoot() {
    (git rev-parse --show-toplevel).Trim()
}

function Read-Ticket([string]$absPath) {
    if (-not (Test-Path $absPath)) { Die "Ticket not found: $absPath" }
    $raw = Get-Content $absPath -Raw
    if (-not $absPath.ToLower().EndsWith(".json")) { Die "Ticket must be JSON: $absPath" }
    return ($raw | ConvertFrom-Json)
}

function Normalize-Mode([object]$ticket) {
    $m = $null
    if ($ticket.PSObject.Properties.Name -contains "mode") { $m = [string]$ticket.mode }
    if ($null -eq $m) { $m = "" }
    $m = $m.Trim().ToLower()

    if ($m -ne "ops" -and $m -ne "feature") {
        # infer:
        # - if target.verify_commands exists and non-empty -> feature
        # - else ops
        $hasVerify = $false
        if ($ticket.PSObject.Properties.Name -contains "target") {
            $t = $ticket.target
            if ($t -and ($t.PSObject.Properties.Name -contains "verify_commands")) {
                try {
                    $arr = @($t.verify_commands)
                    if ($arr.Count -gt 0) { $hasVerify = $true }
                }
                catch { }
            }
        }
        if ($hasVerify) { $m = "feature" } else { $m = "ops" }
        try { $ticket | Add-Member -NotePropertyName "mode" -NotePropertyValue $m -Force } catch { }
    }
    return $m
}

function Get-OpsBranch([object]$ticket) {
    if ($ticket.PSObject.Properties.Name -contains "ops") {
        $o = $ticket.ops
        if ($o -and ($o.PSObject.Properties.Name -contains "branch")) {
            $b = ([string]$o.branch).Trim()
            if ($b) { return $b }
        }
    }
    # fallback to current branch
    return (git rev-parse --abbrev-ref HEAD).Trim()
}

function Get-TargetBranch([object]$ticket) {
    if ($ticket.PSObject.Properties.Name -contains "target") {
        $t = $ticket.target
        if ($t -and ($t.PSObject.Properties.Name -contains "branch")) {
            $b = ([string]$t.branch).Trim()
            if ($b) { return $b }
        }
    }
    Die "Ticket missing target.branch (SSoT v2)"
}

function Get-TicketId([object]$ticket) {
    if ($ticket.PSObject.Properties.Name -contains "ticket_id") {
        $id = ([string]$ticket.ticket_id).Trim()
        if ($id) { return $id }
    }
    Die "Ticket missing ticket_id (SSoT v2)"
}

function Get-Policy([object]$ticket) {
    $mk = "auto"
    $ev = "pack_only"

    if ($ticket.PSObject.Properties.Name -contains "target") {
        $t = $ticket.target
        if ($t) {
            if ($t.PSObject.Properties.Name -contains "mkdocs_route") {
                $mk = ([string]$t.mkdocs_route).Trim()
                if (-not $mk) { $mk = "auto" }
            }
            if ($t.PSObject.Properties.Name -contains "evidence_policy") {
                $ev = ([string]$t.evidence_policy).Trim()
                if (-not $ev) { $ev = "pack_only" }
            }
        }
    }
    return [pscustomobject]@{ mkdocs_route = $mk; evidence_policy = $ev }
}

function Get-Limits([object]$ticket) {
    $maxIters = 5
    $sameFail = 3
    $maxHours = 6
    if ($ticket.PSObject.Properties.Name -contains "limits") {
        $l = $ticket.limits
        if ($l) {
            if ($l.PSObject.Properties.Name -contains "max_iters") { $maxIters = [int]$l.max_iters }
            if ($l.PSObject.Properties.Name -contains "same_fail_limit") { $sameFail = [int]$l.same_fail_limit }
            if ($l.PSObject.Properties.Name -contains "max_hours") { $maxHours = [int]$l.max_hours }
        }
    }
    return [pscustomobject]@{
        max_iters       = $maxIters
        same_fail_limit = $sameFail
        max_hours       = $maxHours
    }
}

function Ensure-Branch-Ref([string]$repoRoot, [string]$branch) {
    $cwd = Get-Location
    try {
        Set-Location $repoRoot

        # If local branch exists -> ok
        $ok = $true
        & git show-ref --verify --quiet ("refs/heads/$branch") 2>$null
        if ($LASTEXITCODE -eq 0) { return }

        # If remote exists, create local tracking branch
        & git show-ref --verify --quiet ("refs/remotes/origin/$branch") 2>$null
        if ($LASTEXITCODE -ne 0) {
            # attempt fetch
            & git fetch origin 2>$null | Out-Null
            & git show-ref --verify --quiet ("refs/remotes/origin/$branch") 2>$null
            if ($LASTEXITCODE -ne 0) {
                Die "Invalid reference (missing branch): $branch (no refs/heads/$branch and no origin/$branch)"
            }
        }

        # create local branch from origin/<branch>
        & git branch $branch ("origin/$branch") 2>$null | Out-Null
    }
    finally { Set-Location $cwd }
}

function Remove-Worktree-ByBranch([string]$repoRoot, [string]$branch) {
    $cwd = Get-Location
    try {
        Set-Location $repoRoot
        $lines = @(git worktree list --porcelain)
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -like "worktree *") {
                $wtPath = $lines[$i].Substring("worktree ".Length).Trim()
                $branchLine = $null
                for ($j = $i + 1; $j -lt $lines.Count; $j++) {
                    if ($lines[$j] -like "worktree *") { break }
                    if ($lines[$j] -like "branch *") { $branchLine = $lines[$j]; break }
                }
                if ($branchLine) {
                    $ref = $branchLine.Substring("branch ".Length).Trim()
                    if ($ref -eq "refs/heads/$branch") {
                        try {
                            & git worktree remove $wtPath --force 2>&1 | Out-Null
                            if ($LASTEXITCODE -ne 0) { throw "git failed" }
                            Start-Sleep -Seconds 2
                            & git worktree prune
                            Write-Log "Worktree conflict removed (branch=$branch): $wtPath"
                        }
                        catch {
                            Write-Log "WARN: failed removing worktree (branch=$branch). Force deleting..."
                            Remove-Item -Recurse -Force $wtPath -ErrorAction SilentlyContinue
                            & git worktree prune
                        }
                    }
                }
            }
        }
    }
    finally { Set-Location $cwd }
}

function Remove-Worktree-ByPath([string]$repoRoot, [string]$wtPath) {
    if (-not (Test-Path $wtPath)) { return }
    $cwd = Get-Location
    try {
        Set-Location $repoRoot
        try {
            & git worktree remove $wtPath --force 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "git failed" }
            Start-Sleep -Seconds 2
            & git worktree prune
            Write-Log "Worktree path removed: $wtPath"
        }
        catch {
            # If folder exists but not registered as worktree, delete folder
            Remove-Item -Recurse -Force $wtPath -ErrorAction SilentlyContinue
            & git worktree prune
            Write-Log "Worktree folder deleted (fallback): $wtPath"
        }
    }
    finally { Set-Location $cwd }
}

function New-TargetWorktree([string]$repoRoot, [string]$ticketId, [string]$mode, [string]$targetBranch) {
    $wtRoot = Join-Path $repoRoot ".worktrees"
    Ensure-Dir $wtRoot

    # Prune stale entries first
    & git worktree prune 2>&1 | Out-Null

    $wtName = "$ticketId.$mode"
    $wtPath = Join-Path $wtRoot $wtName

    # Remove conflicts: same branch already used elsewhere, and stale path
    Remove-Worktree-ByBranch -repoRoot $repoRoot -branch $targetBranch
    Remove-Worktree-ByPath   -repoRoot $repoRoot -wtPath $wtPath

    # Ensure branch exists locally (or fetch/create from origin)
    Ensure-Branch-Ref -repoRoot $repoRoot -branch $targetBranch

    $cwd = Get-Location
    try {
        Set-Location $repoRoot
        # Use --detach to avoid "branch already used" lock. We verify content, we don't need branch pointer.
        & git worktree add --detach $wtPath $targetBranch | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Die ("Worktree add failed (exit code $LASTEXITCODE)")
        }
        Write-Log "Worktree add (detached) -> $wtPath ($targetBranch)"
    }
    finally { Set-Location $cwd }

    return $wtPath
}

function Next-RunDir([string]$repoRoot, [string]$ticketId) {
    $base = Join-Path $repoRoot "outputs/night_shift/$ticketId"
    Ensure-Dir $base
    $dirs = @(Get-ChildItem $base -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^run_\d+$' })
    $n = 1
    if ($dirs.Count -gt 0) {
        $max = ($dirs | ForEach-Object { [int]($_.Name -replace '^run_', '') } | Measure-Object -Maximum).Maximum
        $n = $max + 1
    }
    $runDir = Join-Path $base ("run_{0}" -f $n)
    Ensure-Dir $runDir
    return [pscustomobject]@{ run_index = $n; run_dir = $runDir }
}

function Write-Status(
    [string]$statusPath,
    [hashtable]$kv
) {
    $lines = @()
    foreach ($k in $kv.Keys) {
        $v = $kv[$k]
        if ($null -eq $v) { $v = "" }
        $lines += ("{0}={1}" -f $k, $v)
    }
    ($lines -join "`r`n") | Set-Content -Encoding UTF8 $statusPath
}

function Invoke-VerifyCommands([object]$ticket, [string]$targetWt, [string]$runDir, [string]$mode) {
    # Feature mode: run target.verify_commands in the TARGET worktree.
    if ($mode -ne "feature") { 
        Write-Log "VERIFY: mode=$mode -> skip verify_commands"
        return 
    }

    if (-not ($ticket.PSObject.Properties.Name -contains "target")) { Die "Ticket missing target object" }
    $t = $ticket.target
    if (-not ($t.PSObject.Properties.Name -contains "verify_commands")) { Die "Feature mode requires target.verify_commands[]" }

    $cmds = @($t.verify_commands)
    if ($cmds.Count -eq 0) { Die "Feature mode requires non-empty target.verify_commands[]" }

    $cwd = Get-Location
    try {
        Set-Location $targetWt
        $stdoutPath = Join-Path $runDir "hardlock_stdout.txt"

        foreach ($c in $cmds) {
            $cmd = ([string]$c).Trim()
            if (-not $cmd) { continue }

            Write-Log "RUN: $cmd"
            Add-Content -Encoding UTF8 $stdoutPath ("`n===== RUN {0} =====`n{1}`n" -f (NowIso), $cmd)

            # capture output
            $output = & powershell -NoProfile -ExecutionPolicy Bypass -Command $cmd 2>&1 | Out-String
            $exit = $LASTEXITCODE

            Add-Content -Encoding UTF8 $stdoutPath $output
            Add-Content -Encoding UTF8 $stdoutPath ("`n[EXITCODE]={0}`n" -f $exit)

            if ($exit -ne 0) {
                Die ("verify_commands failed (exit=$exit): $cmd")
            }
        }
    }
    finally { Set-Location $cwd }
}

# ---------------- main ----------------
$ticketAbs = $null
$root = $null
$runInfo = $null
$statusPath = $null
$ticket = $null
$mode = $null
$ticketId = $null
$opsBranch = $null
$targetBranch = $null
$policy = $null
$limits = $null
$wt = $null

# retry bookkeeping
$failCounts = @{}
$startTime = Get-Date

try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Die "Missing required command: git" }

    $root = RepoRoot

    # Resolve ticket early (for stable $ticketAbs / status writing)
    if (Test-Path $TicketPath) { $ticketAbs = (Resolve-Path $TicketPath).Path }
    else { Die "Ticket path not found: $TicketPath" }

    $ticket = Read-Ticket $ticketAbs

    $ticketId = Get-TicketId $ticket
    $mode = Normalize-Mode $ticket
    $opsBranch = Get-OpsBranch $ticket
    $targetBranch = Get-TargetBranch $ticket
    $policy = Get-Policy $ticket
    $limits = Get-Limits $ticket

    $runInfo = Next-RunDir -repoRoot $root -ticketId $ticketId
    $statusPath = Join-Path $runInfo.run_dir "00_status.txt"

    Write-Status -statusPath $statusPath -kv @{
        RUN             = $runInfo.run_index
        OPS_BRANCH      = $opsBranch
        TARGET_BRANCH   = $targetBranch
        VERIFY_KIND     = $mode
        EVIDENCE_POLICY = $policy.evidence_policy
        START           = (NowIso)
        RESULT          = ""
        ERROR           = ""
        END             = ""
    }

    # ---- fail-fast required scripts ----
    $need = @(
        (Join-Path $root "tools/night_shift/oracle_gate_check.ps1"),
        (Join-Path $root "tools/night_shift/pack_evidence.ps1"),
        (Join-Path $root "tools/night_shift/oracle_rules.ps1")
    )
    foreach ($p in $need) {
        if (-not (Test-Path $p)) {
            Die "Fail-fast: required file missing: $p"
        }
    }

    # ---- retry loop ----
    for ($iter = 1; $iter -le $limits.max_iters; $iter++) {
        # stop by time
        $elapsed = (Get-Date) - $startTime
        if ($elapsed.TotalHours -gt $limits.max_hours) {
            Die ("ABORT: max_hours exceeded ({0}h)" -f $limits.max_hours)
        }

        try {
            # Always (re)create isolated worktree for target branch
            $wt = New-TargetWorktree -repoRoot $root -ticketId $ticketId -mode $mode -targetBranch $targetBranch

            # ---- oracle gate check (runs in ops workspace, may inspect target worktree HEAD) ----
            $gateScript = Join-Path $root "tools/night_shift/oracle_gate_check.ps1"
            $gateProcess = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $gateScript, "-TicketPath", $ticketAbs, "-TargetWorktree", $wt -PassThru -NoNewWindow -Wait
            
            # Since Start-Process with -Wait doesn't easily capture stdout without redirecting to file, 
            # and we want to see output and exit code. 
            # Reverting to & call but ensuring arguments are simple string.
            # actually the previous error might be because $wt was an object or had spaces?
            # Let's try explicit string casting and quoting.
            
            $gateOut = & powershell -NoProfile -ExecutionPolicy Bypass -Command "& '$gateScript' -TicketPath '$ticketAbs' -TargetWorktree '$wt'" 2>&1 | Out-String

            $gateExit = $LASTEXITCODE
            Add-Content -Encoding UTF8 (Join-Path $runInfo.run_dir "oracle_gate_stdout.txt") $gateOut

            if ($gateExit -ne 0) {
                Die ("oracle_gate_check failed (exit=$gateExit)")
            }

            Write-Log ("Gate OK. mkdocs={0}; evidence_policy={1}; mode={2}" -f $policy.mkdocs_route, $policy.evidence_policy, $mode)

            # ---- verify commands (feature only) ----
            Invoke-VerifyCommands -ticket $ticket -targetWt $wt -runDir $runInfo.run_dir -mode $mode

            # ---- pack evidence (always; pack_only keeps gitignore-friendly) ----
            $packOut = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "tools/night_shift/pack_evidence.ps1") `
                -TicketPath $ticketAbs -TargetWorktree $wt -RunDir $runInfo.run_dir -Policy $policy.evidence_policy 2>&1 | Out-String

            $packExit = $LASTEXITCODE
            Add-Content -Encoding UTF8 (Join-Path $runInfo.run_dir "pack_evidence_stdout.txt") $packOut
            if ($packExit -ne 0) {
                Die ("pack_evidence failed (exit=$packExit)")
            }

            # ---- success ----
            Write-Status -statusPath $statusPath -kv @{
                RUN             = $runInfo.run_index
                OPS_BRANCH      = $opsBranch
                TARGET_BRANCH   = $targetBranch
                VERIFY_KIND     = $mode
                EVIDENCE_POLICY = $policy.evidence_policy
                START           = ""  # keep original
                RESULT          = "PASS"
                ERROR           = ""
                END             = (NowIso)
            }

            Write-Log "SAFE_RALPH_PASS: Night Shift complete."
            exit 0
        }
        catch {
            $errMsg = $_.Exception.Message

            # classify failure key (stable bucket)
            $key = $errMsg
            if ($key.Length -gt 160) { $key = $key.Substring(0, 160) }

            if (-not $failCounts.ContainsKey($key)) { $failCounts[$key] = 0 }
            $failCounts[$key] = [int]$failCounts[$key] + 1

            Write-Status -statusPath $statusPath -kv @{
                RUN             = $runInfo.run_index
                OPS_BRANCH      = $opsBranch
                TARGET_BRANCH   = $targetBranch
                VERIFY_KIND     = $mode
                EVIDENCE_POLICY = $policy.evidence_policy
                START           = ""  # keep original
                RESULT          = "FAIL"
                ERROR           = $errMsg
                END             = (NowIso)
            }

            Write-Log ("SAFE_RALPH_RUN_FAIL: {0}" -f $errMsg)

            # cleanup target worktree on failure (prevents branch lock)
            if ($wt) {
                try { Remove-Worktree-ByPath -repoRoot $root -wtPath $wt } catch { }
                $wt = $null
            }

            if ($failCounts[$key] -ge $limits.same_fail_limit) {
                Die ("ABORT: same_fail_limit reached ({0}) for: {1}" -f $limits.same_fail_limit, $key)
            }

            # retry
            Write-Log ("Retrying... iter={0}/{1}" -f $iter, $limits.max_iters)
            Start-Sleep -Seconds 1
        }
    }

    Die "ABORT: max_iters exhausted"
}
catch {
    $finalErr = $_.Exception.Message

    # best-effort status write
    try {
        if ($statusPath) {
            $valRun = if ($runInfo) { $runInfo.run_index } else { "" }
            $valOps = if ($opsBranch) { $opsBranch } else { "" }
            $valTarget = if ($targetBranch) { $targetBranch } else { "" }
            $valMode = if ($mode) { $mode } else { "" }
            $valEv = if ($policy) { $policy.evidence_policy } else { "" }

            Write-Status -statusPath $statusPath -kv @{
                RUN             = $valRun
                OPS_BRANCH      = $valOps
                TARGET_BRANCH   = $valTarget
                VERIFY_KIND     = $valMode
                EVIDENCE_POLICY = $valEv
                START           = ""
                RESULT          = "FAIL"
                ERROR           = $finalErr
                END             = (NowIso)
            }
        }
    }
    catch { }

    Write-Log ("SAFE_RALPH_FAIL: {0}" -f $finalErr)
    exit 1
}
finally {
    # always best-effort cleanup of worktree to avoid branch locks
    try {
        if ($wt -and $root) {
            Remove-Worktree-ByPath -repoRoot $root -wtPath $wt
        }
    }
    catch { }
}
