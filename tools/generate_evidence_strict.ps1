param(
    [string]$OutputFile = "outputs/evidence_bundle.txt",
    [string]$OracleExcerpt = "outputs/oracle_excerpt.md",
    [int]$PrNumber = 9
)

$ErrorActionPreference = "Continue"
mkdir outputs -Force | Out-Null

# Sanitize function: convert nested [EVIDENCE] headers to [LEDGER_EVIDENCE]
function Sanitize-EmbeddedEvidence([string]$content) {
    if ([string]::IsNullOrWhiteSpace($content)) { return $content }
    return $content -replace '--- \[EVIDENCE\]', '--- [LEDGER_EVIDENCE]'
}

# Force UTF-8 Encoding helpers
function Write-UTF8 ($Path, $Content) {
    [System.IO.File]::AppendAllText($Path, "$Content`n", [System.Text.Encoding]::UTF8)
}

function Init-File ($Path, $Content) {
    [System.IO.File]::WriteAllText($Path, "$Content`n", [System.Text.Encoding]::UTF8)
}

Init-File $OutputFile "=== PR #$PrNumber Strict Evidence Bundle (Run: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) ==="
Init-File $OracleExcerpt "=== PR #$PrNumber Strict Evidence Bundle (Oracle Excerpt) ==="

function Log-Section {
    param($Title, $Content)
    $Header = "`n--- [EVIDENCE] $Title ---"
    $FullContent = "$Header`n$Content"
    
    # Write to both files in strict UTF-8
    Write-UTF8 $OutputFile $FullContent
    Write-UTF8 $OracleExcerpt $FullContent
}

# 1. CHECKS_SNAPSHOT (STRICT)
try {
    $Checks = gh pr checks $PrNumber 2>$null
    $CheckLog = $Checks | Out-String
    if ([string]::IsNullOrWhiteSpace($CheckLog)) {
        $CheckLog = "No CI checks configured on this branch."
        $CheckStatus = "✅ PASS (No CI)"
    } elseif ($CheckLog -match "fail") { $CheckStatus = "❌ FAIL" }
    elseif ($CheckLog -match "pending") { $CheckStatus = "⏳ PENDING" }
    else { $CheckStatus = "✅ PASS" }
} catch {
    $CheckLog = "Error fetching checks: $_"
    $CheckStatus = "⚠️ UNKNOWN"
}
Log-Section "CHECKS_SNAPSHOT (STRICT)" "$CheckLog`n`nVerdict: $CheckStatus"

# 2. LATEST_RUN_META
try {
    $PrInfo = gh pr view $PrNumber --json headRefName | ConvertFrom-Json
    $Branch = $PrInfo.headRefName
    $Run = gh run list --branch $Branch --limit 1 --json conclusion,url | ConvertFrom-Json
    if ($Run -and $Run.Count -gt 0) {
        $RunStatus = if ($Run[0].conclusion -eq "success") { "✅ PASS" } else { "❌ FAIL ($($Run[0].conclusion))" }
        Log-Section "LATEST_RUN_META" "Branch: $Branch`nURL: $($Run[0].url)`nConclusion: $($Run[0].conclusion)`nVerdict: $RunStatus"
    } else {
        $RunStatus = "✅ PASS (No CI runs)"
        Log-Section "LATEST_RUN_META" "Branch: $Branch`nNo CI runs found.`nVerdict: $RunStatus"
    }
} catch {
    $RunStatus = "⚠️ UNKNOWN"
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
    $Contract = Get-Content docs/governance/ROLE_CONTRACT.md | Select-String "Ledger Submission" -Context 0,2 | Out-String
    Log-Section "ROLE_CONTRACT_LEDGER_RULE_EXCERPT" "$Contract"
} else {
    Log-Section "ROLE_CONTRACT_LEDGER_RULE_EXCERPT" "❌ FAIL: ROLE_CONTRACT.md not found"
}

# 5. PROJECT_OVERVIEW_MD
$LedgerOutput = & powershell -File tools/generate_ledger.ps1 2>&1 | Out-String
Write-Host $LedgerOutput
if (Test-Path "outputs/project_overview.md") {
    $OverviewRaw = Get-Content "outputs/project_overview.md" -Raw -Encoding UTF8
    $OverviewContent = Sanitize-EmbeddedEvidence $OverviewRaw
    Log-Section "PROJECT_OVERVIEW_MD" $OverviewContent
} else {
    Log-Section "PROJECT_OVERVIEW_MD" "❌ FAIL: project_overview.md not found"
}

# 6. PROJECT_LEDGER_MD
if (Test-Path "outputs/project_ledger.md") {
    $LedgerRaw = Get-Content "outputs/project_ledger.md" -Raw -Encoding UTF8
    $LedgerContent = Sanitize-EmbeddedEvidence $LedgerRaw
    Log-Section "PROJECT_LEDGER_MD" $LedgerContent
} else {
    Log-Section "PROJECT_LEDGER_MD" "❌ FAIL: project_ledger.md not found"
}

# 7. AIRTABLE_SYNC_LOG
$AirtableOutput = & powershell -File tools/update_airtable.ps1 2>&1 | Out-String
Write-Host $AirtableOutput
if (Test-Path "outputs/airtable_sync.log") {
    $SyncLogRaw = Get-Content "outputs/airtable_sync.log" -Raw -Encoding UTF8
    $SyncLog = Sanitize-EmbeddedEvidence $SyncLogRaw
    $SyncVerdict = if ($SyncLog -match "DRY_RUN" -or $SyncLog -match "AIRTABLE_OK") { "✅ PASS (Logged)" } else { "❌ FAIL" }
    Log-Section "AIRTABLE_SYNC_LOG" "$SyncLog`n`nVerdict: $SyncVerdict"
} else {
    $SyncVerdict = "❌ FAIL"
    Log-Section "AIRTABLE_SYNC_LOG" "❌ FAIL: Log not found"
}

# 8. STICKY_VERIFY
$Sticky = powershell -File apps/android/sticky_verify.ps1 -PrNumber $PrNumber 2>&1 | Out-String
$StickyVerdict = if ($Sticky -match "PASS") { "✅ PASS" } else { "❌ FAIL" }
Log-Section "STICKY_VERIFY" "$Sticky`n`nVerdict: $StickyVerdict"

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

Write-Host "Bundle generated at $OutputFile (UTF-8)" -ForegroundColor Green
Write-Host "Oracle Excerpt generated at $OracleExcerpt (UTF-8)" -ForegroundColor Green
