param([string]$Topic, [string]$Difficulty, [int]$Count, [string]$Out)
Import-Module "$PSScriptRoot/../../common/OpenResponses.psm1" -Force
$res = Invoke-OpenResponses -Task "generate" -Input @{ topic=$Topic; count=$Count }
$res.output | ForEach-Object { $_ | ConvertTo-Json -Compress } | Out-File -Encoding utf8 $Out
Write-Host "OK: $Out"
