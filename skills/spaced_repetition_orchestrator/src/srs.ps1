param([string]$Verified, [string]$Out)
Get-Content $Verified | ConvertFrom-Json | ForEach-Object {
  @{ id=$_.id; front="Review Q"; interval="1d" }
} | ConvertTo-Json -Compress | Out-File -Encoding utf8 $Out
Write-Host "OK: $Out"
