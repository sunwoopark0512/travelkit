param([string]$Topic="mechanics", [string]$Difficulty="medium", [int]$Count=3)
$L="data/learn"
New-Item -Force -ItemType Directory "$L/logs" | Out-Null
$p="$L/problems.jsonl"; $a="$L/answers.txt"; $v="$L/verify.jsonl"; $s="$L/srs.jsonl"; $e="$L/eval.jsonl"

pwsh skills/physics_problem_generator/src/generate.ps1 -Topic $Topic -Difficulty $Difficulty -Count $Count -Out $p
"Stub Ans" | Out-File $a
pwsh skills/physics_solution_verifier/src/verify.ps1 -Problems $p -Answers $a -Out $v
pwsh skills/spaced_repetition_orchestrator/src/srs.ps1 -Verified $v -Out $s
pwsh skills/evals_cccd_loop/src/eval.ps1 -In $v -Out $e

Write-Host "Daily Run Complete."
