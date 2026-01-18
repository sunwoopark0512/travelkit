param(
  [Parameter(Mandatory=$true)][string]$Query
)

$regPath = Join-Path $PSScriptRoot "registry.json"
if(!(Test-Path $regPath)){ throw "registry.json not found: $regPath" }

$reg = Get-Content $regPath -Raw | ConvertFrom-Json
$q = $Query.ToLowerInvariant()

$hits = $reg.skills | Where-Object {
  ($_.id.ToLowerInvariant().Contains($q)) -or
  ($_.title.ToLowerInvariant().Contains($q)) -or
  ($_.description.ToLowerInvariant().Contains($q)) -or
  ($_.triggers | ForEach-Object { $_.ToLowerInvariant() } | Where-Object { $_.Contains($q) } | Measure-Object).Count -gt 0
}

if(!$hits){ Write-Host "No hits for: $Query"; exit 0 }

$hits | Sort-Object { $_.scores.evidence } -Descending | ForEach-Object {
  Write-Host "== $($_.id) ==" -ForegroundColor Cyan
  Write-Host "Title: $($_.title)"
  Write-Host "Path : $($_.path)"
  Write-Host "Risk/Evidence/Windows: $($_.scores.risk)/$($_.scores.evidence)/$($_.scores.windows)"
  Write-Host "Triggers: $([string]::Join(', ', $_.triggers))"
  Write-Host ""
}
