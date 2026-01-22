Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-OracleResult {
    param(
        [bool]$Pass,
        [string[]]$Reasons
    )
    [pscustomobject]@{
        pass    = $Pass
        reasons = $Reasons
    }
}

function Get-RepoRoot {
    (git rev-parse --show-toplevel).Trim()
}

function Get-HeadChangedFiles {
    # files only (no stats)
    $out = git show --name-only --pretty="" HEAD
    $out | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
}

function Test-Allowlist {
    param(
        [Parameter(Mandatory = $true)][string]$Mode # "hardlock" | "night_shift"
    )

    $files = @(Get-HeadChangedFiles)

    if ($Mode -eq "hardlock") {
        $allowPrefixes = @("scripts/", "docs/", "web/dashboard/", "outputs/")
        $denyPrefixes = @("tools/night_shift/", "tickets/", "new-backend/")
        $denyExact = @(".gitignore", "mkdocs.yml")
        $denyRegex = @("^\.github/") # workflows etc.
    }
    elseif ($Mode -eq "night_shift") {
        $allowPrefixes = @("tools/night_shift/", "tickets/")
        $denyPrefixes = @("scripts/", "docs/", "web/", "new-backend/")
        $denyExact = @(".gitignore", "mkdocs.yml")
        $denyRegex = @("^\.github/")
    }
    else {
        throw "Unknown Mode: $Mode"
    }

    $reasons = New-Object System.Collections.Generic.List[string]
    foreach ($f in $files) {
        if ($f -eq "docs/ssot/ORACLE_CHECKLIST.md" -and $Mode -eq "night_shift") {
            # Exception: SSoT doc is allowed in night_shift branch if creating infrastructure
            continue
        }

        $isAllowed = $false
        foreach ($p in $allowPrefixes) {
            if ($f.StartsWith($p)) { $isAllowed = $true; break }
        }

        foreach ($p in $denyPrefixes) {
            if ($f.StartsWith($p)) {
                $reasons.Add("Scope violation: '$f' matches deny prefix '$p'")
            }
        }
        foreach ($x in $denyExact) {
            if ($f -eq $x) {
                $reasons.Add("Scope violation: '$f' is denied exact file '$x'")
            }
        }
        foreach ($rx in $denyRegex) {
            if ($f -match $rx) {
                $reasons.Add("Scope violation: '$f' matches deny regex '$rx'")
            }
        }

        if (-not $isAllowed) {
            # outputs/ may be absent from commit sometimes, but scope check is about changed files.
            $reasons.Add("Scope violation: '$f' not in allowlist for mode '$Mode'")
        }
    }

    if ($reasons.Count -gt 0) { return New-OracleResult -Pass:$false -Reasons:$reasons.ToArray() }
    return New-OracleResult -Pass:$true -Reasons:@()
}

function Test-EvidencePresence {
    param(
        [Parameter(Mandatory = $true)][string]$StdoutPath,
        [Parameter(Mandatory = $true)][string]$SnapshotPath
    )
    $reasons = New-Object System.Collections.Generic.List[string]

    if (-not (Test-Path $StdoutPath)) { $reasons.Add("Evidence missing: $StdoutPath") }
    if (-not (Test-Path $SnapshotPath)) { $reasons.Add("Evidence missing: $SnapshotPath") }

    if ($reasons.Count -gt 0) { return New-OracleResult -Pass:$false -Reasons:$reasons.ToArray() }
    return New-OracleResult -Pass:$true -Reasons:@()
}

function Test-HardlockSignalInStdout {
    param(
        [Parameter(Mandatory = $true)][string]$StdoutPath
    )
    $reasons = New-Object System.Collections.Generic.List[string]

    if (-not (Test-Path $StdoutPath)) {
        return New-OracleResult -Pass:$false -Reasons:@("Evidence missing: $StdoutPath")
    }

    $txt = Get-Content -Raw -Path $StdoutPath -ErrorAction Stop
    if ($txt -match "Traceback|Exception|SystemExit\(") {
        $reasons.Add("Stdout contains stack-trace or exception markers")
    }
    if ($txt -notmatch "HARDLOCK_RUN:\s*OK") {
        $reasons.Add("Stdout missing completion promise: HARDLOCK_RUN: OK")
    }

    if ($reasons.Count -gt 0) { return New-OracleResult -Pass:$false -Reasons:$reasons.ToArray() }
    return New-OracleResult -Pass:$true -Reasons:@()
}

function Test-MkDocsRouting {
    # Policy:
    # - if mkdocs.yml exists: landing must be in docs/, and nav includes index.md (or explicit landing)
    # - if no mkdocs.yml: do not fail; only enforce that ops branch did not change landing paths (handled by allowlist)
    $root = Get-RepoRoot
    $mk = Join-Path $root "mkdocs.yml"
    if (-not (Test-Path $mk)) {
        return New-OracleResult -Pass:$true -Reasons:@()
    }

    $reasons = New-Object System.Collections.Generic.List[string]
    $mkTxt = Get-Content -Raw -Path $mk -ErrorAction Stop

    # minimal required: nav exists and references docs/index.md or index.md
    if ($mkTxt -notmatch "(?m)^\s*nav\s*:") {
        $reasons.Add("mkdocs.yml exists but has no 'nav:' section")
    }
    if ($mkTxt -notmatch "index\.md") {
        $reasons.Add("mkdocs.yml nav does not reference index.md (routing risk)")
    }

    # Ensure docs/index.md exists
    $idx = Join-Path $root "docs/index.md"
    if (-not (Test-Path $idx)) {
        $reasons.Add("MkDocs routing risk: docs/index.md missing")
    }

    if ($reasons.Count -gt 0) { return New-OracleResult -Pass:$false -Reasons:$reasons.ToArray() }
    return New-OracleResult -Pass:$true -Reasons:@()
}

function Test-NightShiftFilesExistInHead {
    # Checks HEAD contains required files (not just working tree)
    $required = @(
        "tools/night_shift/safe_ralph.ps1",
        "tools/night_shift/oracle_gate_check.ps1",
        "tools/night_shift/pack_evidence.ps1"
    )

    $reasons = New-Object System.Collections.Generic.List[string]
    foreach ($p in $required) {
        $ok = $true
        try {
            git show "HEAD:$p" *> $null
        }
        catch {
            $ok = $false
        }
        if (-not $ok) { $reasons.Add("HEAD missing required file: $p") }
    }

    # Tickets: at least one exists
    $ticketsOk = $true
    try {
        $list = git show --name-only --pretty="" HEAD | Select-String -Pattern "^tickets/" -SimpleMatch
        if (-not $list) { $ticketsOk = $false }
    }
    catch { $ticketsOk = $false }

    if (-not $ticketsOk) { $reasons.Add("HEAD missing tickets/* entry") }

    if ($reasons.Count -gt 0) { return New-OracleResult -Pass:$false -Reasons:$reasons.ToArray() }
    return New-OracleResult -Pass:$true -Reasons:@()
}

function Get-OrModeFromBranch {
    $b = (git rev-parse --abbrev-ref HEAD).Trim()
    if ($b -like "hardlock/*") { return "hardlock" }
    if ($b -like "ops/*") { return "night_shift" }
    # fallback: infer by changed files
    return "unknown"
}

Export-ModuleMember -Function * -ErrorAction SilentlyContinue
