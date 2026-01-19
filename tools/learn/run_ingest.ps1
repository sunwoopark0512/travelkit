param([string]$UrlListFile, [int]$TimeoutSec=15)
New-Item -Force -ItemType Directory "data/ingest/raw" | Out-Null
New-Item -Force -ItemType Directory "data/ingest/text" | Out-Null
New-Item -Force -ItemType Directory "data/learn" | Out-Null

powershell -File skills/web_ingest_fetch/src/fetch.ps1 -UrlListFile $UrlListFile -OutDir "data/ingest/raw" -TimeoutSec $TimeoutSec
powershell -File skills/web_ingest_extract/src/extract.ps1 -RawDir "data/ingest/raw" -OutDir "data/ingest/text"
powershell -File skills/web_ingest_pack_kb/src/pack.ps1 -TextDir "data/ingest/text" -OutKB "data/learn/kb.jsonl"
Write-Host "Ingest Complete."
