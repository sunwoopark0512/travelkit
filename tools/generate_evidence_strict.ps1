param(
    [string]$OutputFile = "outputs/evidence_bundle_pr9.txt",
    [int]$PrNumber = 9
)

$ErrorActionPreference = "Continue"
mkdir outputs -Force | Out-Null
"=== PR #$PrNumber Strict Evidence Bundle (Run: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) ===" | Out-File $OutputFile -Encoding utf8

function Log-Section {
    param($Title, $Content)
    "`n--- [EVIDENCE] $Title ---" | Out-File $OutputFile -Append -Encoding utf8
    $Content | Out-File $OutputFile -Append -Encoding utf8
}

# 1. CHECKS_SNAPSHOT (STRICT)
try {
    $Checks = gh pr checks $PrNumber 2>&1
    $CheckLog = $Checks | Out-String
    if ($Checks -match "fail") { $CheckStatus = "❌ FAIL" }
    elseif ($Checks -match "pending") { $CheckStatus = "⏳ PENDING" }
    else { $CheckStatus = "✅ PASS" }
} catch {
    $CheckLog = "Error fetching checks: $_"
    $CheckStatus = "⚠️ UNKNOWN"
}
Log-Section "CHECKS_SNAPSHOT (STRICT)" "$CheckLog`nVerdict: $CheckStatus"

# 2. LATEST_RUN_META
try {
    # Get branch name from PR
    $PrInfo = gh pr view $PrNumber --json headRefName | ConvertFrom-Json
    $Branch = $PrInfo.headRefName
    $Run = gh run list --branch $Branch --limit 1 --json conclusion,url | ConvertFrom-Json
    $RunStatus = if ($Run.conclusion -eq "success") { "✅ PASS" } else { "❌ FAIL ($($Run.conclusion))" }
    Log-Section "LATEST_RUN_META" "Branch: $Branch`nURL: $($Run.url)`nConclusion: $($Run.conclusion)`nVerdict: $RunStatus"
} catch {
    Log-Section "LATEST_RUN_META" "Error fetching run meta: $_"
}

# 3. DIFF_AFTER (Scope)
try {
    $Diff = gh pr view $PrNumber --json files --jq '.files[].path'
    Log-Section "DIFF_AFTER (Scope)" "$Diff"
} catch {
    Log-Section "DIFF_AFTER (Scope)" "Error fetching diff: $_"
}

# 4. ROLE_CONTRACT_LEDGER_RULE_EXCERPT
if (Test-Path "docs/governance/ROLE_CONTRACT.md") {
    $Contract = Get-Content docs/governance/ROLE_CONTRACT.md | Select-String "Ledger Submission" -Context 0,5
    Log-Section "ROLE_CONTRACT_LEDGER_RULE_EXCERPT" "$Contract"
} else {
    Log-Section "ROLE_CONTRACT_LEDGER_RULE_EXCERPT" "❌ FAIL: ROLE_CONTRACT.md not found"
}

# 5. PROJECT_OVERVIEW / LEDGER / OPENCODE CANON (New!)
# Force regenerate to be sure
powershell -File tools/generate_ledger.ps1
if (Test-Path "outputs/project_overview.md") {
    Log-Section "PROJECT_OVERVIEW_MD" (Get-Content "outputs/project_overview.md" -Raw)
}
if (Test-Path "outputs/project_ledger.md") {
    Log-Section "PROJECT_LEDGER_MD" (Get-Content "outputs/project_ledger.md" -Raw)
}

# Include OpenCode Canon Evidence if available
if (Test-Path "outputs/opencode_evidence_bundle.txt") {
    Log-Section "OPENCODE_CANON_EVIDENCE" (Get-Content "outputs/opencode_evidence_bundle.txt" -Raw)
}

# 6. AIRTABLE_SYNC_LOG
powershell -File tools/update_airtable.ps1
if (Test-Path "outputs/airtable_sync.log") {
    $SyncLog = Get-Content "outputs/airtable_sync.log" -Raw
    $SyncVerdict = if ($SyncLog -match "DRY_RUN" -or $SyncLog -match "AIRTABLE_OK") { "✅ PASS (Logged)" } else { "❌ FAIL" }
    Log-Section "AIRTABLE_SYNC_LOG (DRY_RUN or OK)" "$SyncLog`nVerdict: $SyncVerdict"
} else {
    Log-Section "AIRTABLE_SYNC_LOG (DRY_RUN or OK)" "❌ FAIL: Log not found"
}

# 7. STICKY_VERIFY
$Sticky = powershell -File apps/android/sticky_verify.ps1 -PrNumber $PrNumber 2>&1
$StickyVerdict = if ($Sticky -match "PASS") { "✅ PASS" } else { "❌ FAIL" }
Log-Section "STICKY_VERIFY" "$Sticky`nVerdict: $StickyVerdict"

# 8. FINAL_VERDICT
if ($CheckStatus -match "PASS" -and $SyncVerdict -match "PASS" -and $StickyVerdict -match "PASS") {
    $FinalVerdict = "PASS"
} else {
    $FinalVerdict = "FAIL (See above for details)"
}
Log-Section "FINAL_VERDICT" $FinalVerdict

Write-Host "Bundle generated at $OutputFile" -ForegroundColor Green
