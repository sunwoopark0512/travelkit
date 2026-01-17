param(
    [string]$OutputFile = "outputs/evidence_bundle.txt",
    [string]$OracleExcerpt = "outputs/oracle_excerpt.md",
    [int]$PrNumber = 9
)

$ErrorActionPreference = "Continue"
mkdir outputs -Force | Out-Null
"=== PR #$PrNumber Strict Evidence Bundle (Run: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) ===" | Out-File $OutputFile -Encoding utf8
"=== PR #$PrNumber Strict Evidence Bundle (Oracle Excerpt) ===" | Out-File $OracleExcerpt -Encoding utf8

function Log-Section {
    param($Title, $Content)
    $Header = "`n--- [EVIDENCE] $Title ---"
    $FullContent = "$Header`n$Content"
    
    # Bundle can be larger
    $FullContent | Out-File $OutputFile -Append -Encoding utf8
    
    # Oracle Excerpt needs to be clean UTF-8
    $FullContent | Out-File $OracleExcerpt -Append -Encoding utf8
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
    $Contract = Get-Content docs/governance/ROLE_CONTRACT.md | Select-String "Ledger Submission" -Context 0,2
    Log-Section "ROLE_CONTRACT_LEDGER_RULE_EXCERPT" "$Contract"
} else {
    Log-Section "ROLE_CONTRACT_LEDGER_RULE_EXCERPT" "❌ FAIL: ROLE_CONTRACT.md not found"
}

# 5. PROJECT_OVERVIEW_MD
powershell -File tools/generate_ledger.ps1
if (Test-Path "outputs/project_overview.md") {
    Log-Section "PROJECT_OVERVIEW_MD" (Get-Content "outputs/project_overview.md" -Raw)
} else {
    Log-Section "PROJECT_OVERVIEW_MD" "❌ FAIL: project_overview.md not found"
}

# 6. PROJECT_LEDGER_MD
if (Test-Path "outputs/project_ledger.md") {
    Log-Section "PROJECT_LEDGER_MD" (Get-Content "outputs/project_ledger.md" -Raw)
} else {
    Log-Section "PROJECT_LEDGER_MD" "❌ FAIL: project_ledger.md not found"
}

# 7. AIRTABLE_SYNC_LOG
powershell -File tools/update_airtable.ps1
if (Test-Path "outputs/airtable_sync.log") {
    $SyncLog = Get-Content "outputs/airtable_sync.log" -Raw
    $SyncVerdict = if ($SyncLog -match "DRY_RUN" -or $SyncLog -match "AIRTABLE_OK") { "✅ PASS (Logged)" } else { "❌ FAIL" }
    Log-Section "AIRTABLE_SYNC_LOG" "$SyncLog`nVerdict: $SyncVerdict"
} else {
    Log-Section "AIRTABLE_SYNC_LOG" "❌ FAIL: Log not found"
}

# 8. STICKY_VERIFY
$Sticky = powershell -File apps/android/sticky_verify.ps1 -PrNumber $PrNumber 2>&1
$StickyVerdict = if ($Sticky -match "PASS") { "✅ PASS" } else { "❌ FAIL" }
Log-Section "STICKY_VERIFY" "$Sticky`nVerdict: $StickyVerdict"

# 9. COMMAND_LOG
$Params = @{
    "Canon" = "docs/opencode/opencode_canon_v1.md"
    "Playbook" = "docs/opencode/opencode_control_playbook_v1.md"
}
$Validation = ""
foreach ($Key in $Params.Keys) {
    if (Test-Path $Params[$Key]) { $Validation += "✅ $Key found at $($Params[$Key])`n" }
    else { $Validation += "❌ $Key MISSING at $($Params[$Key])`n" }
}
$CommandLog = @"
Standard SSoT Verification:
$Validation

Commands Executed:
1. tools/generate_evidence_strict.ps1 (Ref: docs/opencode/opencode_canon_v1.md)
2. tools/generate_ledger.ps1
3. tools/update_airtable.ps1
"@
Log-Section "COMMAND_LOG" $CommandLog

# 10. FINAL_VERDICT
if ($CheckStatus -match "PASS" -and $SyncVerdict -match "PASS" -and $StickyVerdict -match "PASS" -and $RunStatus -match "PASS") {
    $FinalVerdict = "Verdict: ✅ PASS"
} else {
    $FinalVerdict = "Verdict: ❌ FAIL (See above for details)"
}
Log-Section "FINAL_VERDICT" $FinalVerdict

Write-Host "Bundle generated at $OutputFile" -ForegroundColor Green
Write-Host "Oracle Excerpt generated at $OracleExcerpt" -ForegroundColor Green
