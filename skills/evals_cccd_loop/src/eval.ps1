param([string]$In, [string]$Out)
@{ accuracy=$true; ts=(Get-Date).ToString("s") } | ConvertTo-Json -Compress | Out-File -Encoding utf8 $Out
Write-Host "OK: $Out"
