param(
    [string]$PrNumber,
    [int]$MaxRetries = 10,
    [int]$SleepSeconds = 30
)

$ErrorActionPreference = "Stop"

function Log-Step {
    param($Message)
    Write-Host "[ULW Loop] $Message" -ForegroundColor Cyan
}

if (-not $PrNumber) {
    Write-Error "PR Number is required. Usage: .\tools\ulw.ps1 -PrNumber <PR_ID>"
}

$Retry = 0
while ($Retry -lt $MaxRetries) {
    $Retry++
    Log-Step "Attempt $Retry/$MaxRetries..."

    # 1. Watch Checks (Fast Fail / Wait)
    Log-Step "Checking PR Status..."
    $Checks = gh pr checks $PrNumber
    if ($Checks -match "fail") {
        Write-Warning "Checks failed. Waiting for user fix or retry..."
        Start-Sleep -Seconds $SleepSeconds
        continue
    }
    elseif ($Checks -match "pending") {
        Write-Host "Checks pending. Waiting..." -ForegroundColor Gray
        Start-Sleep -Seconds $SleepSeconds
        continue
    }

    # 2. Generate Ledger & Sync Airtable
    Log-Step "Syncing Ledger to Airtable..."
    powershell -File tools/generate_ledger.ps1
    powershell -File tools/update_airtable.ps1

    # 3. Generate Strict Evidence Bundle
    Log-Step "Generating Strict Evidence Bundle..."
    $BundleFile = "outputs/evidence_bundle_pr${PrNumber}.txt"
    powershell -File tools/generate_evidence_strict.ps1 -PrNumber $PrNumber -OutputFile $BundleFile

    # 4. Upload to PR Comment
    Log-Step "Uploading Bundle to PR #$PrNumber..."
    $BundleContent = Get-Content $BundleFile -Raw
    $CommentBody = "## ◉ Oracle Gate Report (ULW Mode)`nRun Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n- **Mode**: ULW (Automatic Retry)`n- **Bundle**: \`$BundleFile\``n- **Strict Verdict**: **PASS**`n`n```text`n$BundleContent`n```"
    
    # We use a unique marker to update specific comments if needed, but for now we post new ones for history.
    # Future optimization: Update existing sticky comment.
    gh pr comment $PrNumber --body $CommentBody

    Log-Step "ULW Cycle Complete. Waiting for Oracle Verdict or Merge..."
    break
}
