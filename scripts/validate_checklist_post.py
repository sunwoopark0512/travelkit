#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validate a checklist post markdown against Gates A~D.
Returns PASS/FAIL + failed sections list + reasons.

Stdlib only.
"""

from __future__ import annotations
import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Tuple

RE_H1 = re.compile(r"^#\s+(.+)$", re.MULTILINE)
RE_PASS = re.compile(r"^\*\*Pass Condition:\*\*\s+(.+)$", re.MULTILINE)
RE_UNLOCK = re.compile(r"^\*\*Unlock Rule:\*\*\s+(.+)$", re.MULTILINE)

# Required headings (exact)
REQUIRED_HEADINGS = [
    "## Routine Card",
    "## Action (30–60s)",
    "## Re-check",
    "## Evidence (Optional but recommended)",
    "## Definitions",
    "## Procedure",
    "## FAQ",
]

@dataclass
class ValidationResult:
    status: str  # PASS / FAIL
    failed_gates: List[str]
    failed_sections: List[str]
    reasons: Dict[str, List[str]]

def extract_preview_line(md: str) -> str:
    """
    Preview line is expected immediately after title, before Pass Condition line.
    We'll take the first non-empty line after H1 that is NOT the Pass Condition.
    """
    # Split by lines to be robust
    lines = md.splitlines()
    # find title line index
    title_idx = None
    for i, ln in enumerate(lines):
        if ln.startswith("# "):
            title_idx = i
            break
    if title_idx is None:
        return ""

    # iterate forward to find first non-empty line that isn't Pass Condition
    for j in range(title_idx + 1, len(lines)):
        ln = lines[j].strip()
        if not ln:
            continue
        if ln.startswith("**Pass Condition:**"):
            continue
        return ln
    return ""

def has_heading(md: str, heading: str) -> bool:
    return heading in md

def count_faq_questions(md: str) -> int:
    # Count occurrences of **Qn. ...**
    return len(re.findall(r"^\*\*Q\d+\.", md, flags=re.MULTILINE))

def gate_a_preview(md: str) -> Tuple[bool, List[str]]:
    """
    Gate A:
    - exactly one line preview
    - contains measurable state (heuristic: digit or score-like token or '통과'/'연속'/'이상')
    - contains exactly ONE effect (heuristic hard; enforce '→' is forbidden in final, but we can allow no arrow)
      We'll instead enforce: only one sentence (no ., !, ? more than 1) and no '왜/방법/팁/설명/이유/노하우'
    - must start with 🔒 or ✅
    """
    reasons = []
    preview = extract_preview_line(md)

    if not preview:
        return False, ["Preview line missing."]

    if not (preview.startswith("🔒") or preview.startswith("✅")):
        reasons.append("Preview must start with 🔒 or ✅.")

    forbidden = ["왜", "방법", "팁", "설명", "이유", "노하우", "전략", "최적화"]
    if any(w in preview for w in forbidden):
        reasons.append("Preview contains forbidden explanatory words.")

    # measurable state heuristic
    if not (re.search(r"\d", preview) or any(k in preview for k in ["통과", "연속", "이상", "평균", "점"])):
        reasons.append("Preview lacks measurable state (digit/통과/연속/이상/평균/점).")

    # one-liner: ensure no newline already done; ensure not multiple sentences
    punct = len(re.findall(r"[\.!?。]", preview))
    if punct >= 2:
        reasons.append("Preview must be a single sentence (too many sentence-ending punctuations).")

    return (len(reasons) == 0), reasons

def gate_b_blocks(md: str) -> Tuple[bool, List[str], List[str]]:
    """
    Gate B:
    - Definitions exists
    - Procedure exists
    - FAQ exists and >=3 questions
    Also verify required headings exist (template integrity).
    """
    reasons = []
    failed_sections = []

    for h in REQUIRED_HEADINGS:
        if not has_heading(md, h):
            reasons.append(f"Missing heading: {h}")
            failed_sections.append(h)

    # FAQ >=3
    faq_n = count_faq_questions(md)
    if faq_n < 3:
        reasons.append(f"FAQ must have at least 3 questions, found {faq_n}.")
        failed_sections.append("## FAQ")

    return (len(reasons) == 0), reasons, sorted(set(failed_sections))

def gate_c_conditions(md: str) -> Tuple[bool, List[str], List[str]]:
    """
    Gate C:
    - Pass Condition exists
    - If preview starts 🔒 then Unlock Rule must exist exactly one line
    """
    reasons = []
    failed_sections = []

    preview = extract_preview_line(md)
    m_pass = RE_PASS.search(md)
    if not m_pass or not m_pass.group(1).strip():
        reasons.append("Pass Condition missing or empty.")
        failed_sections.append("**Pass Condition:**")

    locked = preview.startswith("🔒")
    m_unlock = RE_UNLOCK.search(md)
    if locked:
        if not m_unlock or not m_unlock.group(1).strip():
            reasons.append("Unlock Rule required when locked (🔒) but missing/empty.")
            failed_sections.append("**Unlock Rule:**")
        else:
            # enforce one line (regex already line-based, but check for newline in captured value)
            if "\n" in m_unlock.group(1):
                reasons.append("Unlock Rule must be exactly one line.")
                failed_sections.append("**Unlock Rule:**")

    return (len(reasons) == 0), reasons, sorted(set(failed_sections))

def gate_d_stats(md: str) -> Tuple[bool, List[str], List[str]]:
    """
    Gate D:
    - Must mention card_id
    - Must mention anonymous aggregation
    - Must NOT mention user id/account/nickname/comment storage
    """
    reasons = []
    failed_sections = []

    # We accept it being mentioned in Evidence or elsewhere
    if "card_id" not in md:
        reasons.append("Must mention card_id for stats aggregation.")
        failed_sections.append("## Evidence (Optional but recommended)")

    must_have = ["익명", "집계"]
    if not all(k in md for k in must_have):
        reasons.append("Must mention anonymous aggregation (익명 + 집계).")
        failed_sections.append("## Evidence (Optional but recommended)")

    forbidden = ["user_id", "계정", "닉네임", "댓글 저장", "자유 텍스트"]
    if any(k in md for k in forbidden):
        reasons.append("Must not store personal identifiers or free-text comments.")
        failed_sections.append("## Evidence (Optional but recommended)")

    return (len(reasons) == 0), reasons, sorted(set(failed_sections))

def validate(md: str) -> ValidationResult:
    failed_gates: List[str] = []
    failed_sections: List[str] = []
    reasons: Dict[str, List[str]] = {}

    ok_a, r_a = gate_a_preview(md)
    if not ok_a:
        failed_gates.append("Gate A (Preview)")
        reasons["Gate A (Preview)"] = r_a
        failed_sections.append("PREVIEW_1LINER")

    ok_b, r_b, s_b = gate_b_blocks(md)
    if not ok_b:
        failed_gates.append("Gate B (Blocks)")
        reasons["Gate B (Blocks)"] = r_b
        failed_sections.extend(s_b)

    ok_c, r_c, s_c = gate_c_conditions(md)
    if not ok_c:
        failed_gates.append("Gate C (Conditions)")
        reasons["Gate C (Conditions)"] = r_c
        failed_sections.extend(s_c)

    ok_d, r_d, s_d = gate_d_stats(md)
    if not ok_d:
        failed_gates.append("Gate D (Stats)")
        reasons["Gate D (Stats)"] = r_d
        failed_sections.extend(s_d)

    status = "PASS" if not failed_gates else "FAIL"
    return ValidationResult(
        status=status,
        failed_gates=failed_gates,
        failed_sections=sorted(set(failed_sections)),
        reasons=reasons,
    )

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="infile", required=True, help="Input markdown file")
    ap.add_argument("--json", dest="json_out", default="", help="Write json result to path")
    args = ap.parse_args()

    md = Path(args.infile).read_text(encoding="utf-8")
    res = validate(md)

    out = {
        "status": res.status,
        "failed_gates": res.failed_gates,
        "failed_sections": res.failed_sections,
        "reasons": res.reasons,
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))

    if args.json_out:
        Path(args.json_out).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

if __name__ == "__main__":
    main()
