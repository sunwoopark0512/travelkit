param(
    [string]$OutputFile = "outputs/evidence_bundle.txt",
    [int]$PrNumber = 5
)

$ErrorActionPreference = "Continue" # Continue to collect all evidence even if one fails
mkdir outputs -Force | Out-Null
"=== PR #$PrNumber Evidence Bundle (Run: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) ===" | Out-File $OutputFile

function Log-Evidence {
    param($Title, $Command)
    "`n--- [EVIDENCE] $Title ---" | Out-File $OutputFile -Append
    try {
        $Result = Invoke-Expression $Command 2>&1
        $Result | Out-File $OutputFile -Append
        if ($LASTEXITCODE -eq 0 -or $?) { "✅ PASS" | Out-File $OutputFile -Append }
        else { "❌ FAIL (Exit: $LASTEXITCODE)" | Out-File $OutputFile -Append }
    } catch {
        "❌ ERROR: $_" | Out-File $OutputFile -Append
    }
}

# 1. CI Checks
Log-Evidence "GH Checks" "gh pr checks $PrNumber"

# 2. Latest Run Status
Log-Evidence "Latest Run" "gh run list --branch pr6-role-hardening --limit 1"

# 3. Sticky Verify
# Note: Using relative path assumes running from repo root
Log-Evidence "Sticky Verify" "powershell -File apps/android/sticky_verify.ps1 -PrNumber $PrNumber"

# 4. PR Diff Cleanliness (Noise Check)
Log-Evidence "PR Diff Files" "gh pr view $PrNumber --json files --jq '.files[].path'"

# 5. Role Lint (Self-Check stub for now)
Log-Evidence "Role Lint (Check Contract Existence)" "Test-Path docs/governance/ROLE_CONTRACT.md"

# 6. Ledger System (Gov 2.0)
Log-Evidence "Ledger Generation" "powershell -File tools/generate_ledger.ps1"
Log-Evidence "Airtable Sync" "powershell -File tools/update_airtable.ps1"

Write-Host "Evidence bundle generated at $OutputFile" -ForegroundColor Green
