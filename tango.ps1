param (
    [string]$Action = "auto"
)

Clear-Host
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   💃 Tango Companion System" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. CHECK MODE (Real or Demo?)
$isReal = $false
if ($env:SHEET_KEY -and $env:SHEET_KEY -ne "dummy-sheet-key") {
    $isReal = $true
} else {
    # Set dummy if not present
    $env:SHEET_KEY = "dummy-sheet-key"
    $env:OPENAI_API_KEY = "dummy-api-key"
}

if ($isReal) {
    Write-Host "🟢 [REAL MODE] Connecting to Google Sheet..." -ForegroundColor Green
    Write-Host "   Key: $env:SHEET_KEY" -ForegroundColor Gray
} else {
    Write-Host "🟡 [DEMO MODE] Using Virtual Internal Sheet" -ForegroundColor Yellow
    Write-Host "   (To use real sheet: Read docs/HOW_TO_CONNECT.md)" -ForegroundColor Gray
}
Write-Host ""
Start-Sleep -Seconds 1

# 2. RUN ANALYSIS
Write-Host "Step 1. Analyzing Body Signals..." -ForegroundColor Yellow
python tools/ai_eval.py --sheet-key $env:SHEET_KEY --write-queue --prompt-ver v1_tango --tab INBOX --out-tab EVAL_LOG --queue-tab CONTENT_QUEUE
if ($LASTEXITCODE -ne 0) { Write-Error "Eval Failed"; exit }

# 3. RUN JOURNALING
Write-Host "Step 2. Writing Tango Journal..." -ForegroundColor Yellow
python tools/script_gen.py --sheet-key $env:SHEET_KEY --format journal --prompt-ver v1_tango --queue-tab CONTENT_QUEUE --out-tab SCRIPTS --save-dir outputs/tango_journals
if ($LASTEXITCODE -ne 0) { Write-Error "Journal Gen Failed"; exit }

# 4. SHOW RESULT
Write-Host ""
Write-Host "✨ DONE!" -ForegroundColor Cyan
if ($isReal) {
    Write-Host "   Check your Google Sheet 'SCRIPTS' tab." -ForegroundColor White
} else {
    Write-Host "   (Demo results saved in outputs/tango_journals)" -ForegroundColor Gray
}
