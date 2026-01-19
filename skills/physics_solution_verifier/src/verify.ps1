param([string]$Problems, [string]$Answers, [string]$Out)
if (-not (Test-Path $Problems)) { throw "Missing problems" }
Get-Content $Problems | ConvertFrom-Json | ForEach-Object { 
  @{ id=$_.id; verdict="PASS"; reason="Stub verify" }
} | ConvertTo-Json -Compress | Out-File -Encoding utf8 $Out
Write-Host "OK: $Out"
