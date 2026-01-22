# tools/night_shift/oracle_gate_check.ps1
# Oracle Gate Check (SSoT-driven)

param(
    [Parameter(Mandatory = $true)][string]$TicketPath,
    [Parameter(Mandatory = $false)][string]$TargetWorktree
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail([string]$msg) {
    Write-Host "Verdict: FAIL"
    Write-Host $msg
    exit 1
}

function Pass([string]$msg) {
    Write-Host "Verdict: PASS"
    if ($msg) { Write-Host $msg }
    exit 0
}

function Get-RepoRoot { (git rev-parse --show-toplevel).Trim() }

function Read-Ticket([string]$path) {
    if (-not (Test-Path $path)) { throw "Ticket not found: $path" }
    $raw = Get-Content $path -Raw
    if ($path.ToLower().EndsWith(".json")) { return ($raw | ConvertFrom-Json) }
    throw "Ticket must be JSON: $path"
}

function Get-ChangedFilesFromHead([string]$repoRoot, [string]$worktreeOrNull) {
    $cwd = Get-Location
    try {
        if ([string]::IsNullOrWhiteSpace($worktreeOrNull)) {
            Set-Location $repoRoot
        }
        else {
            if (-not (Test-Path $worktreeOrNull)) { throw "TargetWorktree not found: $worktreeOrNull" }
            Set-Location $worktreeOrNull
        }
        $out = git show --name-only --pretty="" HEAD
        return @($out | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" })
    }
    finally {
        Set-Location $cwd
    }
}

function Test-ScopeAllowlist {
    param(
        [string[]]$Files,
        [string[]]$AllowPrefixes,
        [string[]]$DenyPrefixes,
        [string[]]$DenyExact,
        [string[]]$DenyRegex
    )

    $reasons = New-Object System.Collections.Generic.List[string]
    foreach ($f in $Files) {
        foreach ($p in $DenyPrefixes) {
            if ($p -and $f.StartsWith($p)) { $reasons.Add("Scope violation: '$f' matches deny prefix '$p'") }
        }
        foreach ($x in $DenyExact) {
            if ($x -and $f -eq $x) { $reasons.Add("Scope violation: '$f' is denied exact file '$x'") }
        }
        foreach ($rx in $DenyRegex) {
            if ($rx -and ($f -match $rx)) { $reasons.Add("Scope violation: '$f' matches deny regex '$rx'") }
        }

        $allowed = $false
        foreach ($ap in $AllowPrefixes) {
            if ($ap -and $f.StartsWith($ap)) { $allowed = $true; break }
        }
        if (-not $allowed) {
            $reasons.Add("Scope violation: '$f' not in allowlist")
        }
    }

    if ($reasons.Count -gt 0) {
        return [pscustomobject]@{ pass = $false; reasons = @($reasons) }
    }
    return [pscustomobject]@{ pass = $true; reasons = @() }
}

function Test-MkDocsRouting {
    param(
        [string]$repoRoot,
        [string]$policyRouteMode # auto|docs|static
    )

    $mkdocs = Join-Path $repoRoot "mkdocs.yml"
    $docsDir = Join-Path $repoRoot "docs"
    $staticIndex = Join-Path $repoRoot "new-backend/src/main/resources/static/index.html"

    $hasMkdocs = Test-Path $mkdocs
    $hasDocs = Test-Path $docsDir
    $hasStatic = Test-Path $staticIndex

    if ($policyRouteMode -eq "docs") {
        if ($hasMkdocs -and $hasDocs) { return [pscustomobject]@{ pass = $true; reason = "mkdocs.yml+docs/ present (docs routing ok)" } }
        return [pscustomobject]@{ pass = $false; reason = "mkdocs_route=docs but mkdocs.yml+docs/ not present" }
    }

    if ($policyRouteMode -eq "static") {
        if ($hasStatic) { return [pscustomobject]@{ pass = $true; reason = "static index present (static routing ok)" } }
        return [pscustomobject]@{ pass = $false; reason = "mkdocs_route=static but static index not found" }
    }

    # auto
    if ($hasMkdocs -and $hasDocs) { return [pscustomobject]@{ pass = $true; reason = "auto: mkdocs detected (landing under docs/)" } }
    if ($hasDocs) { return [pscustomobject]@{ pass = $true; reason = "auto: docs/ exists (landing under docs/)" } }
    if ($hasStatic) { return [pscustomobject]@{ pass = $true; reason = "auto: static index detected (landing under new-backend/.../static/)" } }
    return [pscustomobject]@{ pass = $false; reason = "auto: could not infer landing route (no mkdocs.yml, no docs/, no static index)" }
}

# ---- main ----
try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail "Missing required command: git" }

    $repoRoot = Get-RepoRoot
    $ticketAbs = (Resolve-Path $TicketPath).Path
    $t = Read-Ticket $ticketAbs

    foreach ($k in @("ticket_id", "branch", "mode", "verify_kind", "policy")) {
        if (-not $t.PSObject.Properties.Name.Contains($k)) { Fail "Missing ticket field: $k" }
    }
    if (-not $t.policy.PSObject.Properties.Name.Contains("mkdocs_route")) { Fail "Missing ticket.policy.mkdocs_route" }
    if (-not $t.policy.PSObject.Properties.Name.Contains("evidence")) { Fail "Missing ticket.policy.evidence" }

    $mode = [string]$t.mode
    if ($mode -ne "ops" -and $mode -ne "feature") { Fail "Invalid ticket.mode: $mode (must be ops|feature)" }

    # Fail-fast: oracle_rules.ps1 must exist (SSoT)
    $rulesPath = Join-Path $repoRoot "tools/night_shift/oracle_rules.ps1"
    if (-not (Test-Path $rulesPath)) { Fail "Fail-fast: missing required rules file: tools/night_shift/oracle_rules.ps1" }

    # MkDocs routing check (repo-level)
    $mk = Test-MkDocsRouting -repoRoot $repoRoot -policyRouteMode ([string]$t.policy.mkdocs_route)
    if (-not $mk.pass) { Fail ("MkDocs routing check FAIL: " + $mk.reason) }

    # Scope check:
    if ($mode -eq "ops") {
        # Ops branch: check HEAD of current workspace only
        $files = Get-ChangedFilesFromHead -repoRoot $repoRoot -worktreeOrNull $null
        $allow = @($t.policy.ops_allow)
        $denyP = @($t.policy.ops_deny)
        $denyE = @($t.policy.deny_exact)
        $denyR = @($t.policy.deny_regex)
        $res = Test-ScopeAllowlist -Files $files -AllowPrefixes $allow -DenyPrefixes $denyP -DenyExact $denyE -DenyRegex $denyR
        if (-not $res.pass) { Fail (($res.reasons | Select-Object -First 3) -join "`n") }
        Pass ("Ops scope OK. " + $mk.reason)
    }

    # feature mode: require TargetWorktree
    if ([string]::IsNullOrWhiteSpace($TargetWorktree)) { Fail "feature mode requires -TargetWorktree" }
    $filesT = Get-ChangedFilesFromHead -repoRoot $repoRoot -worktreeOrNull $TargetWorktree
    $allowT = @($t.policy.target_allow)
    $denyPT = @($t.policy.target_deny)
    $denyE2 = @($t.policy.deny_exact)
    $denyR2 = @($t.policy.deny_regex)
    $resT = Test-ScopeAllowlist -Files $filesT -AllowPrefixes $allowT -DenyPrefixes $denyPT -DenyExact $denyE2 -DenyRegex $denyR2
    if (-not $resT.pass) { Fail (($resT.reasons | Select-Object -First 3) -join "`n") }

    Pass ("Target scope OK. " + $mk.reason)
}
catch {
    Fail ("Unhandled error: " + $_.Exception.Message)
}
# tools/night_shift/oracle_gate_check.ps1
# Oracle Gate Check (SSoT-driven)
# - Fail-fast if oracle_rules.ps1 missing
# - Enforces allowlist / scope risk
# - Includes MkDocs routing check (auto)
# - Mode-aware: ops vs feature (target worktree)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
    [Parameter(Mandatory = $true)][string]$TicketPath,
    [Parameter(Mandatory = $false)][string]$TargetWorktree
)

function Fail([string]$msg) {
    Write-Host "Verdict: FAIL"
    Write-Host $msg
    exit 1
}

function Pass([string]$msg) {
    Write-Host "Verdict: PASS"
    if ($msg) { Write-Host $msg }
    exit 0
}

function Get-RepoRoot { (git rev-parse --show-toplevel).Trim() }

function Read-Ticket([string]$path) {
    if (-not (Test-Path $path)) { throw "Ticket not found: $path" }
    $raw = Get-Content $path -Raw
    if ($path.ToLower().EndsWith(".json")) { return ($raw | ConvertFrom-Json) }
    throw "Ticket must be JSON: $path"
}

function Get-ChangedFilesFromHead([string]$repoRoot, [string]$worktreeOrNull) {
    $cwd = Get-Location
    try {
        if ([string]::IsNullOrWhiteSpace($worktreeOrNull)) {
            Set-Location $repoRoot
        }
        else {
            if (-not (Test-Path $worktreeOrNull)) { throw "TargetWorktree not found: $worktreeOrNull" }
            Set-Location $worktreeOrNull
        }
        $out = git show --name-only --pretty="" HEAD
        return @($out | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" })
    }
    finally {
        Set-Location $cwd
    }
}

function Test-ScopeAllowlist {
    param(
        [string[]]$Files,
        [string[]]$AllowPrefixes,
        [string[]]$DenyPrefixes,
        [string[]]$DenyExact,
        [string[]]$DenyRegex
    )

    $reasons = New-Object System.Collections.Generic.List[string]
    foreach ($f in $Files) {
        foreach ($p in $DenyPrefixes) {
            if ($p -and $f.StartsWith($p)) { $reasons.Add("Scope violation: '$f' matches deny prefix '$p'") }
        }
        foreach ($x in $DenyExact) {
            if ($x -and $f -eq $x) { $reasons.Add("Scope violation: '$f' is denied exact file '$x'") }
        }
        foreach ($rx in $DenyRegex) {
            if ($rx -and ($f -match $rx)) { $reasons.Add("Scope violation: '$f' matches deny regex '$rx'") }
        }

        $allowed = $false
        foreach ($ap in $AllowPrefixes) {
            if ($ap -and $f.StartsWith($ap)) { $allowed = $true; break }
        }
        if (-not $allowed) {
            $reasons.Add("Scope violation: '$f' not in allowlist")
        }
    }

    if ($reasons.Count -gt 0) {
        return [pscustomobject]@{ pass = $false; reasons = @($reasons) }
    }
    return [pscustomobject]@{ pass = $true; reasons = @() }
}

function Test-MkDocsRouting {
    param(
        [string]$repoRoot,
        [string]$policyRouteMode # auto|docs|static
    )

    $mkdocs = Join-Path $repoRoot "mkdocs.yml"
    $docsDir = Join-Path $repoRoot "docs"
    $staticIndex = Join-Path $repoRoot "new-backend/src/main/resources/static/index.html"

    $hasMkdocs = Test-Path $mkdocs
    $hasDocs = Test-Path $docsDir
    $hasStatic = Test-Path $staticIndex

    if ($policyRouteMode -eq "docs") {
        if ($hasMkdocs -and $hasDocs) { return [pscustomobject]@{ pass = $true; reason = "mkdocs.yml+docs/ present (docs routing ok)" } }
        return [pscustomobject]@{ pass = $false; reason = "mkdocs_route=docs but mkdocs.yml+docs/ not present" }
    }

    if ($policyRouteMode -eq "static") {
        if ($hasStatic) { return [pscustomobject]@{ pass = $true; reason = "static index present (static routing ok)" } }
        return [pscustomobject]@{ pass = $false; reason = "mkdocs_route=static but static index not found" }
    }

    # auto
    if ($hasMkdocs -and $hasDocs) { return [pscustomobject]@{ pass = $true; reason = "auto: mkdocs detected (landing under docs/)" } }
    if ($hasDocs) { return [pscustomobject]@{ pass = $true; reason = "auto: docs/ exists (landing under docs/)" } }
    if ($hasStatic) { return [pscustomobject]@{ pass = $true; reason = "auto: static index detected (landing under new-backend/.../static/)" } }
    return [pscustomobject]@{ pass = $false; reason = "auto: could not infer landing route (no mkdocs.yml, no docs/, no static index)" }
}

# ---- main ----
try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail "Missing required command: git" }

    $repoRoot = Get-RepoRoot
    $ticketAbs = (Resolve-Path $TicketPath).Path
    $t = Read-Ticket $ticketAbs

    foreach ($k in @("ticket_id", "branch", "mode", "verify_kind", "policy")) {
        if (-not $t.PSObject.Properties.Name.Contains($k)) { Fail "Missing ticket field: $k" }
    }
    if (-not $t.policy.PSObject.Properties.Name.Contains("mkdocs_route")) { Fail "Missing ticket.policy.mkdocs_route" }
    if (-not $t.policy.PSObject.Properties.Name.Contains("evidence")) { Fail "Missing ticket.policy.evidence" }

    $mode = [string]$t.mode
    if ($mode -ne "ops" -and $mode -ne "feature") { Fail "Invalid ticket.mode: $mode (must be ops|feature)" }

    # Fail-fast: oracle_rules.ps1 must exist (SSoT)
    $rulesPath = Join-Path $repoRoot "tools/night_shift/oracle_rules.ps1"
    if (-not (Test-Path $rulesPath)) { Fail "Fail-fast: missing required rules file: tools/night_shift/oracle_rules.ps1" }

    # MkDocs routing check (repo-level)
    $mk = Test-MkDocsRouting -repoRoot $repoRoot -policyRouteMode ([string]$t.policy.mkdocs_route)
    if (-not $mk.pass) { Fail ("MkDocs routing check FAIL: " + $mk.reason) }

    # Scope check:
    if ($mode -eq "ops") {
        # Ops branch: check HEAD of current workspace only
        $files = Get-ChangedFilesFromHead -repoRoot $repoRoot -worktreeOrNull $null
        $allow = @($t.policy.ops_allow)
        $denyP = @($t.policy.ops_deny)
        $denyE = @($t.policy.deny_exact)
        $denyR = @($t.policy.deny_regex)
        $res = Test-ScopeAllowlist -Files $files -AllowPrefixes $allow -DenyPrefixes $denyP -DenyExact $denyE -DenyRegex $denyR
        if (-not $res.pass) { Fail (($res.reasons | Select-Object -First 3) -join "`n") }
    
        # Optional: Check Oracle Rules file itself if mode=ops (self-check)
        # Already checked existence above.

        Pass ("Ops scope OK. " + $mk.reason)
    }

    # feature mode: require TargetWorktree
    if ([string]::IsNullOrWhiteSpace($TargetWorktree)) { Fail "feature mode requires -TargetWorktree" }
    $filesT = Get-ChangedFilesFromHead -repoRoot $repoRoot -worktreeOrNull $TargetWorktree
    $allowT = @($t.policy.target_allow)
    $denyPT = @($t.policy.target_deny)
    $denyE2 = @($t.policy.deny_exact)
    $denyR2 = @($t.policy.deny_regex)
    $resT = Test-ScopeAllowlist -Files $filesT -AllowPrefixes $allowT -DenyPrefixes $denyPT -DenyExact $denyE2 -DenyRegex $denyR2
    if (-not $resT.pass) { Fail (($resT.reasons | Select-Object -First 3) -join "`n") }

    Pass ("Target scope OK. " + $mk.reason)
}
catch {
    Fail ("Unhandled error: " + $_.Exception.Message)
}
