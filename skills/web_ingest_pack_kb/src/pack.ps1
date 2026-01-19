param([string]$TextDir="data/ingest/text", [string]$OutKB="data/learn/kb.jsonl")
$outDir = Split-Path $OutKB -Parent
if (-not (Test-Path $outDir)) { New-Item -Force -ItemType Directory $outDir | Out-Null }
if (-not (Test-Path $TextDir)) { Write-Warning "No text dir"; return }

$rows = Get-ChildItem $TextDir -Filter *.txt | ForEach-Object {
    @{
        id = $_.BaseName
        content = (Get-Content $_.FullName -Raw).Trim()
        source = "web"
        ts = (Get-Date).ToString("s")
    }
}
$rows | ForEach-Object { $_ | ConvertTo-Json -Compress } | Out-File -Encoding utf8 $OutKB
Write-Host "Packed KB: $OutKB"
