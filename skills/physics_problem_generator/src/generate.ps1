param(
    [string]$Topic="physics",
    [string]$Difficulty="easy",
    [int]$Count=3,
    [string]$Out="data/learn/problems.jsonl",
    [string]$KB=""
)
$ErrorActionPreference = "Stop"
Import-Module "$PSScriptRoot/../../common/OpenResponses.psm1" -Force

$contextStr = ""
if ($KB -and (Test-Path $KB)) {
    try {
        $recs = Get-Content $KB -Encoding UTF8 -ErrorAction SilentlyContinue | ConvertFrom-Json
        if ($recs) {
            # Robust join
            $txtList = @($recs | Select-Object -First 3 | ForEach-Object { $_.content })
            $txt = $txtList -join "
"
            $contextStr = "Context: $txt"
        }
    } catch { Write-Warning "KB Read Fail: $_" }
}

# Explicit hashtable for PS 5.1 compatibility
$inputParams = @{ 
    topic = "$Topic"
    count = $Count
}

Write-Host "Invoking GenAI... (KB Len: $($contextStr.Length))"

# Call OpenResponses
$res = Invoke-OpenResponses -Task "generate" -InputData $inputParams

if ($res -and $res.output) {
    $res.output | ForEach-Object { $_ | ConvertTo-Json -Compress } | Out-File -Encoding utf8 $Out
    Write-Host "SUCCESS: Problems saved to $Out"
} else {
    throw "Empty response from OpenResponses"
}
