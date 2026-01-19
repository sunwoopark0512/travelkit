param([string]$TextDir="data/ingest/text", [string]$OutKB="data/learn/kb.jsonl")
$p = Split-Path $OutKB -Parent; New-Item -Force -ItemType Directory $p | Out-Null
if (Test-Path $OutKB) { Remove-Item $OutKB -Force }
Get-ChildItem $TextDir -Filter *.txt | ForEach {
  $c = (Get-Content $_.FullName -Raw).Trim()
  if ($c) {
    @{id=$_.BaseName; source="web"; content=$c; ts=(Get-Date).ToString("s")} | ConvertTo-Json -Compress | Add-Content -Encoding UTF8 $OutKB
  }
}
Write-Host "Packed: $OutKB"
