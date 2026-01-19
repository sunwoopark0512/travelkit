param(
    [string]$UrlList="data/ingest/urls.txt",
    [string]$Topic="WebLearning",
    [int]$Count=3
)

# 0. Prep
if (-not (Test-Path $UrlList)) { 
    New-Item -Force -ItemType Directory (Split-Path $UrlList) | Out-Null
    "https://example.com" | Out-File $UrlList -Encoding utf8
    Write-Warning "Created dummy URL list at $UrlList"
}

# 1. Pipeline
Write-Host "[1/4] Fetching..."
pwsh skills/web_ingest_fetch/src/fetch.ps1 -UrlListFile $UrlList

Write-Host "[2/4] Extracting..."
pwsh skills/web_ingest_extract/src/extract.ps1

Write-Host "[3/4] Packing KB..."
pwsh skills/web_ingest_pack_kb/src/pack.ps1 -OutKB "data/learn/kb.jsonl"

Write-Host "[4/4] Generating Problems from KB..."
pwsh skills/physics_problem_generator/src/generate.ps1 -Topic $Topic -Count $Count -KB "data/learn/kb.jsonl"

Write-Host "Done! Check data/learn/problems.jsonl"
