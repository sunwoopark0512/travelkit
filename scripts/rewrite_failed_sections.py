#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rewrite only failed sections in a checklist post.

Inputs:
- --in: markdown file
- --validation: json output from validate_checklist_post.py
- --out: rewritten markdown file
- --mode: mock|llm  (mock default)

Behavior:
- Only replace sections listed in failed_sections.
- Never change other sections.
- Preserves template headings and order.

Stdlib only. LLM integration stub included.
"""

from __future__ import annotations
import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

# --- Section extraction helpers ---

def split_sections(md: str) -> Dict[str, str]:
    """
    Returns dict of section_name -> content (including heading line)
    Supports:
    - PREVIEW_1LINER (special)
    - Headings starting with ## ...
    Also keeps "preamble" above first ## as "__PREAMBLE__".
    """
    lines = md.splitlines()
    # preamble until first "## "
    first_h2 = None
    for i, ln in enumerate(lines):
        if ln.startswith("## "):
            first_h2 = i
            break
    preamble = "\n".join(lines[:first_h2]) if first_h2 is not None else md

    sections: Dict[str, str] = {"__PREAMBLE__": preamble}

    if first_h2 is None:
        return sections

    # Collect H2 blocks
    idx = first_h2
    while idx < len(lines):
        if not lines[idx].startswith("## "):
            idx += 1
            continue
        start = idx
        heading = lines[idx].strip()
        idx += 1
        while idx < len(lines) and not lines[idx].startswith("## "):
            idx += 1
        block = "\n".join(lines[start:idx])
        sections[heading] = block

    return sections

def replace_preamble_preview(md: str, new_preview_line: str) -> str:
    """
    Replace only the preview one-liner (line after H1, before Pass Condition).
    """
    lines = md.splitlines()
    # find title
    title_idx = None
    for i, ln in enumerate(lines):
        if ln.startswith("# "):
            title_idx = i
            break
    if title_idx is None:
        return md

    # locate preview line
    preview_idx = None
    for j in range(title_idx + 1, len(lines)):
        ln = lines[j].strip()
        if not ln:
            continue
        if ln.startswith("**Pass Condition:**"):
            break
        preview_idx = j
        break

    if preview_idx is None:
        # insert just before Pass Condition if found
        for j in range(title_idx + 1, len(lines)):
            if lines[j].strip().startswith("**Pass Condition:**"):
                lines.insert(j, new_preview_line)
                return "\n".join(lines)
        # fallback: append after title
        lines.insert(title_idx + 1, new_preview_line)
        return "\n".join(lines)

    lines[preview_idx] = new_preview_line
    return "\n".join(lines)

# --- Rewrite generation (mock/llm) ---

    if section_key == "## System Claim":
        return "\n".join([
            "## System Claim",
            "This content is strictly structured for machine readability.",
            "- **Routine Card**: Standardized workflow unit.",
            "- **Pass/Fail**: Binary outcome enforced.",
            "- **card_id**: Unique identifier for tracking.",
            "- **Card → Weekly Routine → Monthly Diagnosis**: Hierarchy definition.",
        ])

    if section_key == "## Procedure":
        return "\n".join([
            "## Procedure",
            "1. **Preparation**: Ensure the environment is ready (0s).",
            "2. **Execution**: Perform the core action (30-60s).",
            "3. **Verification**: Check against the pass condition (10s).",
            "4. **Recording**: Log the result immediately (5s).",
        ])

    if section_key == "## Definitions":
        locked = "**Unlock Rule:**" in current_md
        lines = [
            "## Definitions",
            "| Term | Definition |",
            "| :--- | :--- |",
            "| **Routine Card** | 5개 체크 질문 묶음(0~5점). |",
            "| **Pass Condition** | 체크 5개 중 4개 이상 통과. |",
            "| **card_id** | 익명 집계용 고정 식별자(개인정보 없음). |",
        ]
        if locked:
             lines.append("| **Unlock Rule** | 최근 7일 평균 4.2/5 이상 + 3일 연속 통과. |")
        else:
             lines.append("| **Status** | 현재 누구나 접근 가능한 공개 카드입니다. |")
        return "\n".join(lines)

    if section_key == "## FAQ":
        return "\n".join([
            "## FAQ",
            "**Q1. 실패하면 어떻게 하나요?**  ",
            "A1. 오늘은 리셋하지 말고 ‘Action(60s)’만 1회 더 하고 종료합니다.",
            "",
            "**Q2. 통증/불편하면요?**  ",
            "A2. 통증이 있으면 즉시 중단하고, 범위를 50%로 줄여 재측정합니다.",
            "",
            "**Q3. 빈도/주간 루틴은요?**  ",
            "A3. 주 3회만 기록합니다. 연속 2회 FAIL이면 난이도를 한 단계 낮춥니다.",
        ])

    if section_key == "## Evidence (Optional but recommended)":
        return "\n".join([
            "## Evidence (Optional but recommended)",
            "- 기록: card_id 기준으로만 익명 집계합니다. (user_id/댓글/자유 텍스트 저장 금지)",
            "- 필드: date, score(0~5), pass(true/false), card_id",
            "- 위젯: 오늘 통과율 + n / 가장 많이 막힌 체크 Top1 / 주간 평균 점수",
        ])

    # default: no change
    return None  # type: ignore

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="infile", required=True)
    ap.add_argument("--validation", required=True, help="validation json from validate_checklist_post.py")
    ap.add_argument("--out", dest="outfile", required=True)
    ap.add_argument("--mode", choices=["mock", "llm"], default="mock")
    args = ap.parse_args()

    md = Path(args.infile).read_text(encoding="utf-8")
    val = json.loads(Path(args.validation).read_text(encoding="utf-8"))

    failed_sections: List[str] = val.get("failed_sections", [])
    reasons: Dict[str, List[str]] = {}
    for gate, msgs in (val.get("reasons", {}) or {}).items():
        reasons[gate] = msgs

    # Rewrite preview separately if needed
    if "PREVIEW_1LINER" in failed_sections:
        new_preview = mock_rewrite("PREVIEW_1LINER", md, reasons) if args.mode == "mock" else None
        if new_preview:
            md = replace_preamble_preview(md, new_preview)

    # Rewrite H2 sections
    sections = split_sections(md)
    for sec in list(sections.keys()):
        if sec in failed_sections:
            new_block = mock_rewrite(sec, md, reasons) if args.mode == "mock" else None
            if new_block:
                sections[sec] = new_block

    # Reconstruct markdown (preamble + sections in original order)
    # Preserve order by scanning original md headings
    out_lines: List[str] = []
    out_lines.append(sections.get("__PREAMBLE__", "").rstrip())

    # Collect headings in original order
    headings = re.findall(r"^## .+$", md, flags=re.MULTILINE)
    for h in headings:
        block = sections.get(h)
        if block:
            out_lines.append("")  # spacing
            out_lines.append(block.rstrip())

    out_md = "\n".join(out_lines).strip() + "\n"
    Path(args.outfile).write_text(out_md, encoding="utf-8")

if __name__ == "__main__":
    main()
