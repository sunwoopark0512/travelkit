# Smoke test for AI pipeline v1 (Windows-first)
$ErrorActionPreference = "Stop"

Write-Host "1) Syntax check"
python -m py_compile tools\llm_client.py
python -m py_compile tools\sheet_io.py
python -m py_compile tools\ai_eval.py
python -m py_compile tools\script_gen.py
Write-Host "OK: py_compile"

if (-not $env:SHEET_KEY) { throw "Missing env:SHEET_KEY" }
if (-not $env:OPENAI_API_KEY) { throw "Missing env:OPENAI_API_KEY" }

Write-Host "2) Eval dry-run (no sheet writes)"
python tools\ai_eval.py --sheet-key $env:SHEET_KEY --tab INBOX --out-tab EVAL_LOG --limit 2 --prompt-ver v1 --dry-run

Write-Host "3) Done"
