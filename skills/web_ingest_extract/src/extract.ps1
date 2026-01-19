param([string]$RawDir="data/ingest/raw", [string]$OutDir="data/ingest/text")
New-Item -Force -ItemType Directory $OutDir | Out-Null
Get-ChildItem $RawDir -Filter *.html | ForEach {
  try {
    $html = Get-Content $_.FullName -Raw
    $html = [regex]::Replace($html, "<script[^>]*>.*?</script>", " ", "Singleline,IgnoreCase")
    $html = [regex]::Replace($html, "<style[^>]*>.*?</style>", " ", "Singleline,IgnoreCase")
    $txt = [regex]::Replace($html, "<[^>]+>", " ")
    $txt = $txt -replace "&nbsp;"," " -replace "&amp;","&" -replace "&lt;","<" -replace "&gt;",">"
    $txt = [regex]::Replace($txt, "\s+", " ").Trim()
    $outFile = Join-Path $OutDir ".txt"
    $txt | Out-File -Encoding utf8 $outFile
    Write-Host "Extracted: $outFile"
  } catch { Write-Warning "Err: $(.Name)" }
}
