param([string]$UrlListFile, [string]$OutDir="data/ingest/raw")
if (-not (Test-Path $UrlListFile)) { throw "No URL list at $UrlListFile" }
if (-not (Test-Path $OutDir)) { New-Item -Force -ItemType Directory $OutDir | Out-Null }

$urls = Get-Content $UrlListFile
foreach ($u in $urls) {
    if ([string]::IsNullOrWhiteSpace($u)) { continue }
    try {
        $res = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 10
        $safeName = $u -replace '[^a-zA-Z0-9]', '_'
        $outFile = Join-Path $OutDir ("$safeName" + ".html")
        $res.Content | Out-File -Encoding utf8 $outFile
        Write-Host "Fetched: $u -> $outFile"
    } catch { Write-Warning "Failed: $u" }
}
