$regPath = Join-Path $PSScriptRoot "registry.json"
$reg = Get-Content $regPath -Raw | ConvertFrom-Json

$reg.skills | Sort-Object { $_.scores.evidence } -Descending | ForEach-Object {
  "{0,-28}  R/E/W={1}/{2}/{3}  {4}" -f $_.id, $_.scores.risk, $_.scores.evidence, $_.scores.windows, $_.title
}
