$regPath = Join-Path $PSScriptRoot "registry.json"
$reg = Get-Content $regPath -Raw | ConvertFrom-Json

function Clamp([int]$v){ if($v -lt 0){0} elseif($v -gt 5){5} else {$v} }

$reg.skills | ForEach-Object {
  $risk = 0
  if($_.scope.network){ $risk += 2 }
  if($_.scope.shell){ $risk += 2 }
  if(($_.scope.write_paths | Measure-Object).Count -gt 1){ $risk += 1 }
  $risk = Clamp $risk

  $evidence = 0
  if($_.description.Length -ge 60){ $evidence += 1 }
  if(($_.triggers | Measure-Object).Count -ge 4){ $evidence += 1 }
  if($_.id -match "strict-evidence"){ $evidence += 2 }
  $evidence = Clamp $evidence

  $windows = 3
  if($_.description.ToLowerInvariant().Contains("powershell")){ $windows += 2 }
  $windows = Clamp $windows

  [PSCustomObject]@{
    id = $_.id
    risk_auto = $risk
    evidence_auto = $evidence
    windows_auto = $windows
    risk_manual = $_.scores.risk
    evidence_manual = $_.scores.evidence
    windows_manual = $_.scores.windows
  }
} | Format-Table -AutoSize
