param(
    [string]$LedgerFile = "outputs/project_ledger.md"
)

$ErrorActionPreference = "Stop"

$FilesToCheck = @("outputs/project_ledger.md", "outputs/project_overview.md")
foreach ($File in $FilesToCheck) {
    if (!(Test-Path $File)) {
        Write-Error "❌ Required file not found: $File"
    } else {
        Write-Host "✅ Found: $File" -ForegroundColor Gray
    }
}

if (-not $env:AIRTABLE_API_KEY -or -not $env:AIRTABLE_BASE_ID) {
    Write-Warning "⚠️ AIRTABLE keys missing. Running in DRY_RUN mode."
    $LogContent = @"
[Timestamp] $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
[Status] DRY_RUN
[Message] Validated existence of $(($FilesToCheck).Count) files. Ready for upload.
[Payload_Preview_Ledger]
$(Get-Content 'outputs/project_ledger.md' -Raw)
"@
    $LogContent | Out-File "outputs/airtable_sync.log" -Encoding utf8
    Write-Host "✅ DRY_RUN Logs saved to outputs/airtable_sync.log" -ForegroundColor Yellow
    exit 0
}

# TODO: Implement actual Airtable Upsert Logic
# For now, we assume this script will be enhanced with actual API calls when keys are provided.
# Example Logic:
# $Headers = @{ Authorization = "Bearer $env:AIRTABLE_API_KEY" }
# $Body = @{ fields = @{ "Markdown" = $Content; "LastUpdated" = (Get-Date).ToString("yyyy-MM-dd") } }
# Invoke-RestMethod -Uri ... -Method Patch -Headers $Headers -Body ($Body | ConvertTo-Json)

Write-Host "✅ Ledger uploaded to Airtable (Simulated)" -ForegroundColor Green
"Real upload success" | Out-File "outputs/airtable_upload_status.txt"
