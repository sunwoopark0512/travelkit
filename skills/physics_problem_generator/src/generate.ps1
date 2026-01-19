param(
    [string]$Topic="physics",
    [string]$Difficulty="easy",
    [int]$Count=3,
    [string]$Out="data/learn/problems.jsonl",
    [string]$KB=""
)
Import-Module "$PSScriptRoot/../../common/OpenResponses.psm1" -Force

$context = ""
if ($KB -and (Test-Path $KB)) {
    try {
        $recs = Get-Content $KB | ConvertFrom-Json
        # Take first 3 chunks as context (simple RAG stub)
        if ($recs) {
            $txt = $recs | Select-Object -First 3 -ExpandProperty content
            $context = "Context: $txt"
        }
    } catch {
        Write-Warning "Failed to read KB: $_"
    }
}

$sysPrompt = "Generate $Count problems for $Topic. $context"
# Pass system prompt if module supports it, or just use it in topic
$res = Invoke-OpenResponses -Task "generate" -Input @{ topic="$Topic ($context)"; count=$Count }

$res.output | ForEach-Object { $_ | ConvertTo-Json -Compress } | Out-File -Encoding utf8 $Out
Write-Host "OK: $Out (ContextLen: $(.Length))"
