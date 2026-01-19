param([string]$Topic="phy",[string]$Difficulty="easy",[int]$Count=3,[string]$Out="data/learn/problems.jsonl")
Import-Module (Join-Path $PSScriptRoot "../../common/OpenResponses.psm1") -Force
$prov = if ($Env:LLM_PROVIDER) { $Env:LLM_PROVIDER } else { "Mock" }
$res = Invoke-OpenResponse -Provider $prov -SystemPrompt "Gen $Count problems for $Topic" -UserPrompt "Go" -OutputSchema "json"
try {
  $json = $res.Content | ConvertFrom-Json
  $json | ConvertTo-Json -Compress | Out-File -Encoding utf8 $Out
  Write-Host "OK: Generated $Out using $prov"
} catch { 
    Write-Error "JSON Parse Error: $_"
    exit 1 
}
