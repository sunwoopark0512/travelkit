param([string]$Topic, [string]$Difficulty, [int]$Count, [string]$Out)
if (-not $Out.StartsWith("data/learn/")) { throw "Out unsafe" }
1..$Count | ForEach-Object { @{
  id=$_; topic=$Topic; question="Stub Q for $Topic"; answer="Stub A"
} } | ConvertTo-Json -Compress | Out-File -Encoding utf8 $Out
Write-Host "OK: $Out"
