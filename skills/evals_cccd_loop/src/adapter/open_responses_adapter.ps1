param([string]$Task, [string]$InJson, [string]$OutJson="data/learn/openresponses_out.json")
Import-Module "$PSScriptRoot/../../../common/OpenResponses.psm1" -Force
$t = Get-Content $InJson -Raw | ConvertFrom-Json
$ht = @{}
if ($t -is [System.Collections.IDictionary]) {
    $t.Keys | ForEach-Object { $ht[$_] = $t[$_] }
} else {
    $t.PSObject.Properties | ForEach-Object { $ht[$_.Name] = $_.Value }
}
$res = Invoke-OpenResponses -Task $Task -InputData $ht
$res | ConvertTo-Json -Depth 8 | Out-File -Encoding utf8 $OutJson
Write-Host "OK: $OutJson"
