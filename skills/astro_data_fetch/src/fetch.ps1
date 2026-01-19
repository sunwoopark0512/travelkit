param([string]$Topic="astro", [string]$Out="data/learn/astro.json")
if (-not $Out.StartsWith("data/learn/")) { throw "Out unsafe" }
@{ topic=$Topic; summary="Stub source" } | ConvertTo-Json | Out-File -Encoding utf8 $Out
Write-Host "OK: $Out"
