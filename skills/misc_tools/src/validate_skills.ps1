param(
  [string]$SkillsRoot = ".agent/skills",
  [string]$RegistryPath = "tools/skills/registry.json"
)

Write-Host "=== TravelKit Skills Validation ===" -ForegroundColor Cyan

if(!(Test-Path $RegistryPath)){ throw "[FAIL] Missing registry: $RegistryPath" }
$reg = Get-Content $RegistryPath -Raw | ConvertFrom-Json

$fail = $false

# 1) Registry entries must exist on disk
foreach($s in $reg.skills){
  if(!(Test-Path $s.path)){
    Write-Host "[FAIL] Skill path missing: $($s.id) -> $($s.path)" -ForegroundColor Red
    $fail = $true
    continue
  }

  $skillMd = Join-Path $s.path "SKILL.md"
  if(!(Test-Path $skillMd)){
    Write-Host "[FAIL] SKILL.md missing: $($s.id)" -ForegroundColor Red
    $fail = $true
    continue
  }

  # 2) Must contain YAML frontmatter + description
  $txt = Get-Content $skillMd -Raw
  if($txt -notmatch "(?s)^---\s*\r?\n.*?\r?\n---\s*\r?\n"){
    Write-Host "[FAIL] No YAML frontmatter: $($s.id)" -ForegroundColor Red
    $fail = $true
  }
  if($txt -notmatch "(?im)^\s*description\s*:\s*\S+"){
    Write-Host "[FAIL] Missing description in frontmatter: $($s.id)" -ForegroundColor Red
    $fail = $true
  }

  # 3) Scope constraints sanity
  if(($s.scope.write_paths | Where-Object { $_ -eq "**/*" -or $_ -eq "*" })){
    Write-Host "[FAIL] Write scope too broad (**/*): $($s.id)" -ForegroundColor Red
    $fail = $true
  }

  # 4) If shell/network are true, ensure guardrails exist
  if($s.scope.shell -or $s.scope.network){
    if(!(Test-Path "tools/gemini/guardrails.md")){
      Write-Host "[FAIL] guardrails.md required for shell/network skills: $($s.id)" -ForegroundColor Red
      $fail = $true
    }
  }

  Write-Host "[PASS] $($s.id)" -ForegroundColor Green
}

# 5) Ensure every folder under .agent/skills has registry entry
$folders = Get-ChildItem $SkillsRoot -Directory -ErrorAction SilentlyContinue
foreach($f in $folders){
  $id = $f.Name
  $exists = ($reg.skills | Where-Object { $_.id -eq $id } | Measure-Object).Count -gt 0
  if(!$exists){
    Write-Host "[FAIL] Orphan skill folder not in registry: $id" -ForegroundColor Red
    $fail = $true
  }
}

Write-Host ""
if($fail){
  Write-Host "=== Validation Result ===" -ForegroundColor Yellow
  Write-Host "[FAIL] Skills validation failed." -ForegroundColor Red
  exit 1
}

Write-Host "=== Validation Result ===" -ForegroundColor Yellow
Write-Host "[OK] Skills validation passed." -ForegroundColor Green
exit 0
