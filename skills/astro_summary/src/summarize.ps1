param([string]$In, [string]$Out="data/learn/astro_summary.txt")
if (-not (Test-Path $In)) { throw "Missing input" }
"Summary of $In : Stub" | Out-File -Encoding utf8 $Out
Write-Host "OK: $Out"
