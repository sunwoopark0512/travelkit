#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validate a checklist post markdown against Gates A~E.
Returns PASS/FAIL + failed sections list + reasons.

Gate E (Authority) added:
- E1 System Claim existence + keywords
- E2 Definitions table existence + 4 rows
- E3 Procedure numbered steps + 4 steps
- E4 FAQ >= 3 items
- E5 Locking rules (Pass Condition/Unlock Rule) in preview block
"""

from __future__ import annotations
import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Tuple, Any, Optional

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
    "## System Claim",  # Added for Gate E
]

REQ_SYSTEM_CLAIM_KEYWORDS = [
    "Routine Card",
    "Pass/Fail",
    "card_id",
    "Card → Weekly Routine → Monthly Diagnosis",
]

FAIL_E1 = "GATE_E_FAIL: MISSING_SYSTEM_CLAIM"
FAIL_E2 = "GATE_E_FAIL: MISSING_DEFINITIONS_TABLE"
FAIL_E3 = "GATE_E_FAIL: MISSING_PROCEDURE_STEPS"
FAIL_E4 = "GATE_E_FAIL: FAQ_LT_3"
FAIL_E5 = "GATE_E_FAIL: LOCK_RULES_MISSING"

@dataclass
class ValidationResult:
    status: str  # PASS / FAIL
    failed_gates: List[str]
    failed_sections: List[str]
    reasons: Dict[str, List[str]]
    notes: Optional[Dict[str, Any]] = None

def extract_preview_line(md: str) -> str:
    """
    Preview line is expected immediately after title, before Pass Condition line.
    We'll take the first non-empty line after H1 that is NOT the Pass Condition.
    """
    lines = md.splitlines()
    title_idx = None
    for i, ln in enumerate(lines):
        if ln.startswith("# "):
            title_idx = i
            break
    if title_idx is None:
        return ""

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
    return len(re.findall(r"^\*\*Q\d+\.", md, flags=re.MULTILINE))

def extract_section(md: str, header: str) -> str:
    pattern = rf"(?ms)^\s*##\s+{re.escape(header)}\s*\n(.*?)(?=^\s*##\s+|\Z)"
    m = re.search(pattern, md)
    return m.group(1).strip() if m else ""

# --- Gate E Implementation ---

def _has_system_claim(md: str) -> bool:
    body = extract_section(md, "System Claim")
    if not body:
        return False
    return all(k in body for k in REQ_SYSTEM_CLAIM_KEYWORDS)

def _definitions_table_ok(md: str) -> bool:
    body = extract_section(md, "Definitions")
    if not body:
        return False
    if not re.search(r"(?m)^\s*\|.+\|\s*$\n^\s*\|[\s:-]+\|", body):
        return False
    rows = [ln for ln in body.splitlines() if ln.strip().startswith("|")]
    return len(rows) >= 6  # header + separator + 4 rows

def _procedure_steps_ok(md: str) -> bool:
    body = extract_section(md, "Procedure")
    if not body:
        return False
    steps = re.findall(r"(?m)^\s*\d+\.\s+.+$", body)
    return len(steps) >= 4

def _faq_ok(md: str) -> bool:
    body = extract_section(md, "FAQ")
    if not body:
        return False
    # Accept either "Q: ...\nA: ..." or "Q1 ...\nA1 ..." patterns (and bold variants)
    # The regex below is a bit simplified, aiming for standard markdown bold questions
    # But let's reuse generic logic or the one from Gate B (which was simpler)
    # Gate B logic was: count_faq_questions (starts with **Q\d+.)
    # Let's align with the stricter Gate E logic provided in suggestion
    q_count = len(re.findall(r"(?mi)^\s*(\*\*Q\d*[:.)]|\bQ[:.)])", body)) 
    # Adjusted regex to catch **Q1. pattern too
    
    # Fallback to existing count_faq_questions if strict regex fails but simplistic one worked
    # actually let's stick to the prompt's suggested logic for consistency
    q_count_simple = count_faq_questions(md)
    return q_count_simple >= 3

def _locking_rules_ok(md: str) -> bool:
    head = "\n".join(md.splitlines()[:40])
    has_pass = re.search(r"(?m)^\s*\*\*Pass Condition:\*\*\s+.+$", head) is not None
    has_unlock = re.search(r"(?m)^\s*\*\*Unlock Rule:\*\*\s+.+$", head) is not None
    return has_pass and has_unlock

def gate_e_authority(md: str, *, locked: bool) -> Tuple[bool, List[str], List[str]]:
    failures = []
    failed_sections = []

    if not _has_system_claim(md):
        failures.append(FAIL_E1)
        # System Claim missing -> we need to inject it. Map to "System Claim" section?
        # Actually in rewrite logic, missing section = injection.
        failed_sections.append("## System Claim")

    if not _definitions_table_ok(md):
        failures.append(FAIL_E2)
        failed_sections.append("## Definitions")

    if not _procedure_steps_ok(md):
        failures.append(FAIL_E3)
        failed_sections.append("## Procedure")

    if not _faq_ok(md):
        failures.append(FAIL_E4)
        failed_sections.append("## FAQ")

    if locked and not _locking_rules_ok(md):
        failures.append(FAIL_E5)
        # This maps to preview block rewrite
        failed_sections.append("PREVIEW_1LINER") # or generic top block name

    return (len(failures) == 0), failures, failed_sections

# --- Existing Gates ---

def gate_a_preview(md: str) -> Tuple[bool, List[str]]:
    reasons = []
    preview = extract_preview_line(md)
    if not preview:
        return False, ["Preview line missing."]
    if not (preview.startswith("🔒") or preview.startswith("✅")):
        reasons.append("Preview must start with 🔒 or ✅.")
    forbidden = ["왜", "방법", "팁", "설명", "이유", "노하우", "전략", "최적화"]
    if any(w in preview for w in forbidden):
        reasons.append("Preview contains forbidden explanatory words.")
    if not (re.search(r"\d", preview) or any(k in preview for k in ["통과", "연속", "이상", "평균", "점"])):
        reasons.append("Preview lacks measurable state.")
    punct = len(re.findall(r"[\.!?。]", preview))
    if punct >= 2:
        reasons.append("Preview must be a single sentence.")
    return (len(reasons) == 0), reasons

def gate_b_blocks(md: str) -> Tuple[bool, List[str], List[str]]:
    reasons = []
    failed_sections = []
    for h in REQUIRED_HEADINGS:
        if not has_heading(md, h):
            reasons.append(f"Missing heading: {h}")
            failed_sections.append(h)
    if count_faq_questions(md) < 3:
        reasons.append("FAQ must have at least 3 questions.")
        failed_sections.append("## FAQ")
    return (len(reasons) == 0), reasons, sorted(set(failed_sections))

def gate_c_conditions(md: str) -> Tuple[bool, List[str], List[str]]:
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
            reasons.append("Unlock Rule required when locked.")
            failed_sections.append("**Unlock Rule:**")
        elif "\n" in m_unlock.group(1):
             reasons.append("Unlock Rule must be exactly one line.")
             failed_sections.append("**Unlock Rule:**")
    return (len(reasons) == 0), reasons, sorted(set(failed_sections))

def gate_d_stats(md: str) -> Tuple[bool, List[str], List[str]]:
    reasons = []
    failed_sections = []
    if "card_id" not in md:
        reasons.append("Must mention card_id.")
        failed_sections.append("## Evidence (Optional but recommended)")
    must_have = ["익명", "집계"]
    if not all(k in md for k in must_have):
        reasons.append("Must mention anonymous aggregation.")
        failed_sections.append("## Evidence (Optional but recommended)")
    forbidden = ["user_id", "계정", "닉네임", "댓글 저장", "자유 텍스트"]
    if any(k in md for k in forbidden):
        reasons.append("Must not store personal identifiers.")
        failed_sections.append("## Evidence (Optional but recommended)")
    return (len(reasons) == 0), reasons, sorted(set(failed_sections))

def validate(md: str, locked: bool = False) -> ValidationResult:
    failed_gates = []
    failed_sections = []
    reasons = {}
    notes = {}

    # Gate A
    ok_a, r_a = gate_a_preview(md)
    if not ok_a:
        failed_gates.append("Gate A (Preview)")
        reasons["Gate A"] = r_a
        failed_sections.append("PREVIEW_1LINER")

    # Gate B
    ok_b, r_b, s_b = gate_b_blocks(md)
    if not ok_b:
        failed_gates.append("Gate B (Blocks)")
        reasons["Gate B"] = r_b
        failed_sections.extend(s_b)

    # Gate C
    ok_c, r_c, s_c = gate_c_conditions(md)
    if not ok_c:
        failed_gates.append("Gate C (Conditions)")
        reasons["Gate C"] = r_c
        failed_sections.extend(s_c)

    # Gate D
    ok_d, r_d, s_d = gate_d_stats(md)
    if not ok_d:
        failed_gates.append("Gate D (Stats)")
        reasons["Gate D"] = r_d
        failed_sections.extend(s_d)

    # Gate E (Authority)
    # Infer locked state from preview if not provided? 
    # Actually prompt says "locked" arg is passed.
    # But let's double check md for lock emoji too as fallback
    preview = extract_preview_line(md)
    is_locked_md = preview.startswith("🔒")
    final_locked = locked or is_locked_md

    ok_e, r_e, s_e = gate_e_authority(md, locked=final_locked)
    if not ok_e:
        failed_gates.append("Gate E (Authority)")
        reasons["Gate E"] = r_e
        failed_sections.extend(s_e)
        notes["gate_e"] = {"locked_checked": final_locked, "failures": r_e}

    status = "PASS" if not failed_gates else "FAIL"
    return ValidationResult(
        status=status,
        failed_gates=failed_gates,
        failed_sections=sorted(set(failed_sections)),
        reasons=reasons,
        notes=notes
    )

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="infile", required=True, help="Input markdown file")
    ap.add_argument("--json", dest="json_out", default="", help="Write json result to path")
    # Added locked arg to support Gate E properly
    ap.add_argument("--locked", action="store_true", help="Treat as locked content")
    args = ap.parse_args()

    md = Path(args.infile).read_text(encoding="utf-8")
    res = validate(md, locked=args.locked)

    out = {
        "status": res.status,
        "failed_gates": res.failed_gates,
        "failed_sections": res.failed_sections,
        "reasons": res.reasons,
        "notes": res.notes
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))

    if args.json_out:
        Path(args.json_out).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

if __name__ == "__main__":
    main()
