param([string]$RawDir="data/ingest/raw", [string]$OutDir="data/ingest/text")
if (-not (Test-Path $OutDir)) { New-Item -Force -ItemType Directory $OutDir | Out-Null }
if (-not (Test-Path $RawDir)) { Write-Warning "No raw dir"; return }

Get-ChildItem $RawDir -Filter *.html | ForEach-Object {
    $txt = (Get-Content $_.FullName -Raw) -replace '<[^>]+>', ' ' # Simple strip tags
    $outFile = Join-Path $OutDir (.BaseName + ".txt")
    $txt | Out-File -Encoding utf8 $outFile
    Write-Host "Extracted: $outFile"
}
