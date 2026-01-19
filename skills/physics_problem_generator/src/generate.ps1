param(
    [string]$Topic = "physics",
    [string]$Difficulty = "easy",
    [int]$Count = 3,
    [string]$Out = "data/learn/problems.jsonl"
)

# Import OpenResponses
$Note = "Loading OpenResponses module..."
Import-Module (Join-Path $PSScriptRoot "../../common/OpenResponses.psm1") -Force

# Construct Prompt
$sys = "You are a physics teacher. Generate $Count problems about '$Topic' (Difficulty: $Difficulty). Output JSON list."
$user = "Start generation."

# Call LLM (Default to Mock for now, or env var)
$prov = if ($Env:LLM_PROVIDER) { $Env:LLM_PROVIDER } else { "Mock" }

$res = Invoke-OpenResponse -Provider $prov -SystemPrompt $sys -UserPrompt $user -OutputSchema "json"

# Parse and Save
try {
    $json = $res.Content | ConvertFrom-Json
    # Normalize to JSONL
    $json | ConvertTo-Json -Compress | Out-File -Encoding utf8 $Out
    Write-Host "OK: Generated $Out using $prov"
} catch {
    Write-Error "Failed to parse LLM output or save file: $_"
    exit 1
}
