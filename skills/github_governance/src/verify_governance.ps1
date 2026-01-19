param(
    [string]$OutputFile = "outputs/governance_health.txt"
)

$ErrorActionPreference = "Continue"
mkdir outputs -Force | Out-Null
"=== Governance Health Evidence (Run: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) ===" | Out-File $OutputFile

function Log-Evidence {
    param($Title, $Command)
    "`n--- [EVIDENCE] $Title ---" | Out-File $OutputFile -Append
    try {
        $Result = Invoke-Expression $Command 2>&1
        $Result | Out-File $OutputFile -Append
        if ($LASTEXITCODE -eq 0 -or $?) { "✅ PASS" | Out-File $OutputFile -Append }
        else { "❌ FAIL" | Out-File $OutputFile -Append }
    } catch {
        "❌ ERROR: $_" | Out-File $OutputFile -Append
    }
}

# 1. Check Branch & Cleanliness
Log-Evidence "Git Branch Status" "git status"

# 2. Check Role Contract File
Log-Evidence "Role Contract Exists" "Test-Path docs/governance/ROLE_CONTRACT.md"

# 3. Check Sticky Verify Script
Log-Evidence "Sticky Verify Exists" "Test-Path apps/android/sticky_verify.ps1"

# 4. Check Recent Log (Governance Hardening Commit)
Log-Evidence "Recent Governance Log" "git log -n 5 --oneline --grep='governance'"

Write-Host "Governance evidence generated at $OutputFile" -ForegroundColor Green
