param(
  [Parameter(Mandatory=$true)][string]$UrlListFile,
  [string]$OutDir="data/ingest/raw",
  [int]$TimeoutSec=15
)
if (-not (Test-Path $UrlListFile)) { throw "Missing: $UrlListFile" }
New-Item -Force -ItemType Directory $OutDir | Out-Null
$manifest = Join-Path $OutDir "_manifest.jsonl"
$ua="TravelKitWebIngest/0.1 (+https://github.com/sunwoopark0512/travelkit)"

Get-Content $UrlListFile | Where { -not [string]::IsNullOrWhiteSpace($_) } | ForEach {
  $u = $_.Trim()
  try {
    $safe = ($u -replace '^https?://','') -replace '[^a-zA-Z0-9\.\-]','_'
    if ($safe.Length -gt 180) { $safe = $safe.Substring(0,180) }
    $outFile = Join-Path $OutDir "$safe.html"
    $res = Invoke-WebRequest -Uri $u -Headers @{ "User-Agent"=$ua } -TimeoutSec $TimeoutSec -UseBasicParsing
    $res.Content | Out-File -Encoding utf8 $outFile
    Write-Host "Fetched: $u -> $outFile"
  } catch { Write-Warning "Failed: $u $_" }
}
