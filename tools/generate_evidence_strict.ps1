param(
    [string]$OutputFile = "outputs/evidence_bundle_pr8.txt",
    [int]$PrNumber = 8
)

$ErrorActionPreference = "Continue"
mkdir outputs -Force | Out-Null
"=== PR #$PrNumber Strict Evidence Bundle (Run: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) ===" | Out-File $OutputFile

function Log-Section {
    param($Title, $Content)
    "`n--- [EVIDENCE] $Title ---" | Out-File $OutputFile -Append
    $Content | Out-File $OutputFile -Append
}

# 1. CHECKS_SNAPSHOT (STRICT)
$Checks = gh pr checks $PrNumber
$CheckLog = $Checks | Out-String
if ($Checks -match "fail") { $CheckStatus = "❌ FAIL" }
elseif ($Checks -match "pending") { $CheckStatus = "⏳ PENDING" }
else { $CheckStatus = "✅ PASS" }
Log-Section "CHECKS_SNAPSHOT" "$CheckLog`nVerdict: $CheckStatus"

# 2. LATEST_RUN_META
$Run = gh run list --branch pr8-revenue-experiment-clean --limit 1 --json conclusion,url | ConvertFrom-Json
$RunStatus = if ($Run.conclusion -eq "success") { "✅ PASS" } else { "❌ FAIL ($($Run.conclusion))" }
Log-Section "LATEST_RUN_META" "URL: $($Run.url)`nConclusion: $($Run.conclusion)`nVerdict: $RunStatus"

# 3. DIFF_AFTER
$Diff = gh pr view $PrNumber --json files --jq '.files[].path'
Log-Section "DIFF_AFTER" "$Diff"

# 4. ROLE_CONTRACT_LEDGER_RULE_EXCERPT
$Contract = Get-Content docs/governance/ROLE_CONTRACT.md | Select-String "Ledger Submission" -Context 0,2
Log-Section "ROLE_CONTRACT_LEDGER_RULE_EXCERPT" "$Contract"

# 5. PROJECT_OVERVIEW/LEDGER
# Force regenerate to be sure
powershell -File tools/generate_ledger.ps1
Log-Section "PROJECT_OVERVIEW" (Get-Content "outputs/project_overview.md" -Raw)
Log-Section "PROJECT_LEDGER" (Get-Content "outputs/project_ledger.md" -Raw)

# 6. AIRTABLE_SYNC_LOG
powershell -File tools/update_airtable.ps1
if (Test-Path "outputs/airtable_sync.log") {
    $SyncLog = Get-Content "outputs/airtable_sync.log" -Raw
    $SyncVerdict = if ($SyncLog -match "DRY_RUN" -or $SyncLog -match "AIRTABLE_OK") { "✅ PASS (Logged)" } else { "❌ FAIL" }
    Log-Section "AIRTABLE_SYNC_LOG" "$SyncLog`nVerdict: $SyncVerdict"
} else {
    Log-Section "AIRTABLE_SYNC_LOG" "❌ FAIL: Log not found"
}

# 7. STICKY_VERIFY
$Sticky = powershell -File apps/android/sticky_verify.ps1 -PrNumber $PrNumber 2>&1
$StickyVerdict = if ($LASTEXITCODE -eq 0) { "✅ PASS" } else { "❌ FAIL" }
Log-Section "STICKY_VERIFY" "$Sticky`nVerdict: $StickyVerdict"

Write-Host "Bundle generated at $OutputFile" -ForegroundColor Green
