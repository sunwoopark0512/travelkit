#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Two-attempt pipeline:
1) validate
2) if FAIL -> rewrite failed sections only -> validate again
PASS or FAIL_AFTER_REWRITE

Stdlib only.
"""

from __future__ import annotations
import argparse
import json
import subprocess
from pathlib import Path

def run(cmd: list[str]) -> str:
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{p.stdout}\n{p.stderr}")
    return p.stdout

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--draft", required=True, help="input markdown draft")
    ap.add_argument("--out", required=True, help="final markdown output")
    ap.add_argument("--workdir", default="outputs/checklist")
    ap.add_argument("--mode", choices=["mock", "llm"], default="mock")
    args = ap.parse_args()

    work = Path(args.workdir)
    work.mkdir(parents=True, exist_ok=True)

    draft = Path(args.draft)
    cur = work / "attempt1.md"
    cur.write_text(draft.read_text(encoding="utf-8"), encoding="utf-8")

    for attempt in (1, 2):
        val_json = work / f"validation_attempt{attempt}.json"
        val_out = run(["python", "scripts/validate_checklist_post.py", "--in", str(cur), "--json", str(val_json)])
        val = json.loads(val_out)

        if val["status"] == "PASS":
            tag = "PASS" if attempt == 1 else "PASS_AFTER_REWRITE"
            print(f"GATES: {tag}")
            Path(args.out).write_text(cur.read_text(encoding="utf-8"), encoding="utf-8")
            return

        if attempt == 1:
            print("GATES: FAIL -> RETRY")
            nxt = work / "attempt2.md"
            run([
                "python", "scripts/rewrite_failed_sections.py",
                "--in", str(cur),
                "--validation", str(val_json),
                "--out", str(nxt),
                "--mode", args.mode
            ])
            cur = nxt
        else:
            print("GATES: FAIL_AFTER_REWRITE")
            Path(args.out).write_text(cur.read_text(encoding="utf-8"), encoding="utf-8")
            return

if __name__ == "__main__":
    main()
