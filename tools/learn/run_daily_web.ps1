param(
    [string]$UrlList="data/ingest/urls.txt",
    [string]$Topic="WebLearning",
    [int]$Count=3
)
$ErrorActionPreference = "Stop"

# Determine PS Command
$psCmd = "powershell"
if (Get-Command pwsh -ErrorAction SilentlyContinue) { $psCmd = "pwsh" }

function Run-Step([string]$Name, [string]$Script, [hashtable]$ArgsHashtable) {
    Write-Host "
[Step: $Name]" -ForegroundColor Cyan
    
    # Build Argument List manually
    $procArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $Script)
    foreach ($key in $ArgsHashtable.Keys) {
        $procArgs += "-$key"
        $procArgs += $ArgsHashtable[$key].ToString()
    }

    # Execute
    & $psCmd $procArgs
    
    # Check Result
    if ($LASTEXITCODE -ne 0) {
        throw "Step [$Name] failed with Exit Code $LASTEXITCODE"
    }
}

# 0. Prep
if (-not (Test-Path $UrlList)) { 
    if (-not (Test-Path (Split-Path $UrlList))) { New-Item -Force -ItemType Directory (Split-Path $UrlList) | Out-Null }
    "https://example.com" | Out-File $UrlList -Encoding utf8
}

# 1. Pipeline Execution
Run-Step "Fetch"     "skills/web_ingest_fetch/src/fetch.ps1"       @{ UrlListFile=$UrlList }
Run-Step "Extract"   "skills/web_ingest_extract/src/extract.ps1"     @{}
Run-Step "Pack KB"   "skills/web_ingest_pack_kb/src/pack.ps1"         @{ OutKB="data/learn/kb.jsonl" }
Run-Step "Generate"  "skills/physics_problem_generator/src/generate.ps1" @{ Topic=$Topic; Count=$Count; KB="data/learn/kb.jsonl" }

Write-Host "
SUCCESS: Web Learning Loop Completed." -ForegroundColor Green
