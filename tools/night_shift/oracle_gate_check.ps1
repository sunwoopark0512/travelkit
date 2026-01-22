<#
.SYNOPSIS
    Oracle Gate Checker (Centralized Verdict)
    Reads a ticket and validates the current state against Oracle SSoT rules.
#>

param(
    [Parameter(Mandatory = $true)][string]$TicketPath,
    [string]$StdoutPath,
    [string]$SnapshotPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# 1. Load Ticket
if (-not (Test-Path $TicketPath)) { Write-Error "Ticket missing: $TicketPath"; exit 1 }
try {
    $ticket = Get-Content -Raw $TicketPath | ConvertFrom-Json
}
catch {
    Write-Error "Invalid Ticket JSON: $TicketPath"
    exit 1
}

# 2. Extract Rules from Ticket
$prNumber = $ticket.pr_number
$oracleConf = $ticket.oracle_pass
$requirePrVerdict = $oracleConf.require_final_verdict
$passRegex = $oracleConf.pass_regex

# 3. Load Oracle Rules Library
$rulesPath = Join-Path $PSScriptRoot "oracle_rules.ps1"
if (-not (Test-Path $rulesPath)) { Write-Error "Oracle Rules Lib missing"; exit 1 }
. $rulesPath

function Final-Verdict {
    param([bool]$Pass, [string[]]$Reasons)
    if ($Pass) {
        Write-Output "Verdict: ✅ PASS"
        exit 0
    }
    else {
        Write-Output "Verdict: ❌ FAIL"
        $Reasons | Select-Object -First 5 | ForEach-Object { Write-Output ("- " + $_) }
        exit 1
    }
}

$reasons = New-Object System.Collections.Generic.List[string]

# 4. Check 1: Evidence Presence (Local Execution Proof)
# Use provided paths or defaults from ticket logic (hardcoded for Hardlock SSoT)
$std = if ($StdoutPath) { $StdoutPath } else { "outputs/evidence/hardlock_stdout.txt" }
$snp = if ($SnapshotPath) { $SnapshotPath } else { "outputs/evidence/hardlock_snapshot.txt" }

$evCheck = Test-EvidencePresence -StdoutPath $std -SnapshotPath $snp
if (-not $evCheck.pass) {
    # If required evidence is missing, it's an immediate FAIL
    Final-Verdict -Pass $false -Reasons $evCheck.reasons
}

# 5. Check 2: Hardlock Signal in Stdout (Did it actually finish?)
$sigCheck = Test-HardlockSignalInStdout -StdoutPath $std
if (-not $sigCheck.pass) {
    Final-Verdict -Pass $false -Reasons $sigCheck.reasons
}

# 6. Check 3: PR Verdict (Optional / Night Shift Verification)
# Only check this if explicitly required by ticket AND we have a PR number
if ($requirePrVerdict -and $prNumber) {
    try {
        if (Get-Command gh -ErrorAction SilentlyContinue) {
            $json = gh pr view $prNumber --json comments
            if ($LASTEXITCODE -eq 0) {
                $obj = $json | ConvertFrom-Json
                $latest = $obj.comments | Select-Object -Last 1
                if ($latest) {
                    $body = $latest.body
                    if ($body -notmatch $passRegex) {
                        $reasons.Add("Latest PR comment does not match PASS regex: '$passRegex'")
                    }
                }
                else {
                    $reasons.Add("No comments on PR #$prNumber")
                }
            }
        }
        else {
            Write-Warning "GH CLI not found. Skipping PR Verdict Check."
        }
    }
    catch {
        Write-Warning "Failed to check PR comments: $_"
    }
}

if ($reasons.Count -gt 0) {
    Final-Verdict -Pass $false -Reasons $reasons.ToArray()
}
else {
    Final-Verdict -Pass $true -Reasons @()
}
