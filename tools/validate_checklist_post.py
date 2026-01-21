# tools/validate_checklist_post.py
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
import re
import json
from datetime import datetime


# -------------------------
# Gate model
# -------------------------

@dataclass
class GateResult:
    gate: str
    passed: bool
    reasons: List[str] = field(default_factory=list)
    metrics: Dict[str, object] = field(default_factory=dict)
    failed_sections: Set[str] = field(default_factory=set)  # e.g., {"Definitions", "Procedure", "FAQ", "Preview"}


@dataclass
class ValidationReport:
    passed: bool
    attempt: int
    gate_results: List[GateResult]
    rewrite_sections: List[str]
    status_label: str  # "PASS" | "FAIL" | "PASS_AFTER_REWRITE"
    metrics: Dict[str, object] = field(default_factory=dict)  # merged / summary metrics


# -------------------------
# Helpers
# -------------------------

_SECTION_ORDER = ["Preview", "Definitions", "Procedure", "FAQ", "SystemClaim", "Body"]


def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _merge_metrics(results: List[GateResult]) -> Dict[str, object]:
    merged: Dict[str, object] = {}
    for r in results:
        for k, v in (r.metrics or {}).items():
            merged[k] = v
    return merged


def _gate_summary(results: List[GateResult]) -> Tuple[bool, List[str]]:
    failed = []
    for r in results:
        if not r.passed:
            failed.extend([f"{r.gate}:{code}" for code in (r.reasons or ["FAIL"])])
    return (len(failed) == 0), failed


def _stable_list(xs: Set[str]) -> List[str]:
    return [x for x in _SECTION_ORDER if x in xs] + sorted([x for x in xs if x not in _SECTION_ORDER])


# -------------------------
# Rewrite mapping (Reason code -> section)
# -------------------------

REASON_TO_SECTION = {
    # Extractability / structure
    "MISSING_DEFINITIONS_TABLE": "Definitions",
    "DEFINITIONS_TOO_FEW_ROWS": "Definitions",
    "MISSING_PROCEDURE": "Procedure",
    "PROCEDURE_TOO_FEW_STEPS": "Procedure",
    "FAQ_LT_3": "FAQ",
    # Locking
    "MISSING_PASS_CONDITION": "Preview",
    "LOCKED_MISSING_UNLOCK_RULE": "Preview",
    # Authority / claim
    "MISSING_SYSTEM_CLAIM": "SystemClaim",
    "SYSTEM_CLAIM_INCOMPLETE": "SystemClaim",
}


def compute_rewrite_sections(failed_reasons: List[str]) -> List[str]:
    sections: Set[str] = set()
    for item in failed_reasons:
        # item format: "E:MISSING_SYSTEM_CLAIM" or "A:XYZ"
        code = item.split(":", 1)[-1].strip()
        sec = REASON_TO_SECTION.get(code)
        if sec:
            # SystemClaim은 "자동 삽입"이 원칙이면 rewrite 대상에서 제외할 수도 있으나
            # 요청이 "rewrite mapping"이므로 섹션은 산출하되, 호출부에서 정책적으로 제외 가능.
            sections.add(sec)
    return _stable_list(sections)


# -------------------------
# Gate checks
# -------------------------

def gate_a_structure(md: str) -> GateResult:
    """
    Gate A: 기본 블록 존재 (Preview/Definitions/Procedure/FAQ)
    """
    reasons = []
    failed_sections: Set[str] = set()

    has_def = bool(re.search(r"^##\s+Definitions\b", md, re.M))
    has_proc = bool(re.search(r"^##\s+Procedure\b", md, re.M))
    has_faq = bool(re.search(r"^##\s+FAQ\b", md, re.M))

    if not has_def:
        reasons.append("MISSING_DEFINITIONS_TABLE")
        failed_sections.add("Definitions")
    if not has_proc:
        reasons.append("MISSING_PROCEDURE")
        failed_sections.add("Procedure")
    if not has_faq:
        reasons.append("FAQ_LT_3")
        failed_sections.add("FAQ")

    passed = len(reasons) == 0
    return GateResult(gate="A", passed=passed, reasons=reasons, failed_sections=failed_sections)


def gate_b_definitions_table(md: str) -> GateResult:
    """
    Gate B: Definitions가 Key-Value 테이블로 추출 가능해야 함.
    - "| Key | Value |" 헤더 필수
    - 최소 4행(헤더+구분선 제외, 데이터행 기준)
    """
    reasons = []
    failed_sections: Set[str] = set()

    m = re.search(r"^##\s+Definitions\b([\s\S]*?)(^##\s+|\Z)", md, re.M)
    if not m:
        reasons.append("MISSING_DEFINITIONS_TABLE")
        failed_sections.add("Definitions")
        return GateResult(gate="B", passed=False, reasons=reasons, failed_sections=failed_sections)

    block = m.group(1)
    has_header = "| Key | Value |" in block
    if not has_header:
        reasons.append("MISSING_DEFINITIONS_TABLE")
        failed_sections.add("Definitions")

    # naive row count: count lines starting with '|' excluding header and separator
    rows = [ln.strip() for ln in block.splitlines() if ln.strip().startswith("|")]
    data_rows = []
    for ln in rows:
        if ln.strip() == "| Key | Value |":
            continue
        if re.match(r"^\|\s*-+\s*\|\s*-+\s*\|$", ln):
            continue
        data_rows.append(ln)

    if len(data_rows) < 4:
        reasons.append("DEFINITIONS_TOO_FEW_ROWS")
        failed_sections.add("Definitions")

    passed = len(reasons) == 0
    return GateResult(gate="B", passed=passed, reasons=reasons, failed_sections=failed_sections, metrics={"definitions_rows": len(data_rows)})


def gate_c_procedure_steps(md: str) -> GateResult:
    """
    Gate C: Procedure는 번호 리스트로 최소 4 step.
    """
    reasons = []
    failed_sections: Set[str] = set()

    m = re.search(r"^##\s+Procedure\b([\s\S]*?)(^##\s+|\Z)", md, re.M)
    if not m:
        reasons.append("MISSING_PROCEDURE")
        failed_sections.add("Procedure")
        return GateResult(gate="C", passed=False, reasons=reasons, failed_sections=failed_sections)

    block = m.group(1)
    steps = re.findall(r"^\s*\d+\.\s+.+$", block, re.M)
    if len(steps) < 4:
        reasons.append("PROCEDURE_TOO_FEW_STEPS")
        failed_sections.add("Procedure")

    passed = len(reasons) == 0
    return GateResult(gate="C", passed=passed, reasons=reasons, failed_sections=failed_sections, metrics={"procedure_steps": len(steps)})


def gate_d_faq(md: str) -> GateResult:
    """
    Gate D: FAQ는 Q/A 포맷으로 최소 3문항.
    """
    reasons = []
    failed_sections: Set[str] = set()

    m = re.search(r"^##\s+FAQ\b([\s\S]*?)(^##\s+|\Z)", md, re.M)
    if not m:
        reasons.append("FAQ_LT_3")
        failed_sections.add("FAQ")
        return GateResult(gate="D", passed=False, reasons=reasons, failed_sections=failed_sections)

    block = m.group(1)
    qs = re.findall(r"^\s*Q:\s+.+$", block, re.M)
    ans = re.findall(r"^\s*A:\s+.+$", block, re.M)
    pairs = min(len(qs), len(ans))
    if pairs < 3:
        reasons.append("FAQ_LT_3")
        failed_sections.add("FAQ")

    passed = len(reasons) == 0
    return GateResult(gate="D", passed=passed, reasons=reasons, failed_sections=failed_sections, metrics={"faq_pairs": pairs})


def gate_e_authority(md: str) -> GateResult:
    """
    Gate E (Authority): '대표 시스템'으로 인식될 고정 구조가 존재해야 함.
    - Pass Condition 명시
    - locked일 때 Unlock Rule 1줄 존재
    - System Claim 섹션 존재 및 핵심 문장 포함
    """
    reasons = []
    failed_sections: Set[str] = set()

    # Pass Condition
    has_pass = bool(re.search(r"^\s*\*\*Pass Condition\*\*:\s+.+$", md, re.M))
    if not has_pass:
        reasons.append("MISSING_PASS_CONDITION")
        failed_sections.add("Preview")

    # locked/unlock: locked 표기 기준을 단순화 (문서 상단 Preview 블록 내 "**Locked**: true/false" 권장)
    locked_m = re.search(r"^\s*\*\*Locked\*\*:\s*(true|false)\s*$", md, re.M | re.I)
    is_locked = False
    if locked_m and locked_m.group(1).lower() == "true":
        is_locked = True

    if is_locked:
        has_unlock = bool(re.search(r"^\s*\*\*Unlock Rule\*\*:\s+.+$", md, re.M))
        if not has_unlock:
            reasons.append("LOCKED_MISSING_UNLOCK_RULE")
            failed_sections.add("Preview")

    # System Claim section
    has_claim = bool(re.search(r"^##\s+System Claim\b", md, re.M))
    if not has_claim:
        reasons.append("MISSING_SYSTEM_CLAIM")
        failed_sections.add("SystemClaim")
    else:
        claim_block = re.search(r"^##\s+System Claim\b([\s\S]*?)(^##\s+|\Z)", md, re.M)
        txt = (claim_block.group(1) if claim_block else "").lower()
        must = [
            "routine card",
            "somatic checklist writing system".lower(),
            "card_id",
            "pass/fail",
            "/dashboard/cards.json".lower(),
        ]
        missing = [k for k in must if k not in txt]
        if missing:
            reasons.append("SYSTEM_CLAIM_INCOMPLETE")
            failed_sections.add("SystemClaim")

    passed = len(reasons) == 0
    return GateResult(gate="E", passed=passed, reasons=reasons, failed_sections=failed_sections, metrics={"locked": is_locked})


# -------------------------
# Main validate entry
# -------------------------

def validate_checklist_post(md: str, attempt: int, used_rewrite: bool) -> ValidationReport:
    """
    attempt: 1 or 2
    used_rewrite: attempt 2가 rewrite 결과인지 여부
    """
    gates = [
        gate_a_structure(md),
        gate_b_definitions_table(md),
        gate_c_procedure_steps(md),
        gate_d_faq(md),
        gate_e_authority(md),
    ]
    passed, failed_reason_list = _gate_summary(gates)
    merged_metrics = _merge_metrics(gates)

    # FAIL -> RETRY / PASS / PASS_AFTER_REWRITE 라벨
    if passed and used_rewrite:
        status_label = "PASS_AFTER_REWRITE"
    elif passed:
        status_label = "PASS"
    else:
        status_label = "FAIL"

    rewrite_sections = compute_rewrite_sections(failed_reason_list)

    return ValidationReport(
        passed=passed,
        attempt=attempt,
        gate_results=gates,
        rewrite_sections=rewrite_sections,
        status_label=status_label,
        metrics=merged_metrics,
    )


def log_gate_transition(logger_fn, report: ValidationReport, failure_reasons_flat: List[str]) -> None:
    """
    blog_gen.py 스타일과 동일하게:
    - FAIL이면:  GATES: FAIL gate=A,B,E reasons="..." attempt=1 -> RETRY
    - PASS면:  GATES: PASS gate=A,B,C,D,E attempt=1 metrics={...}
    - PASS_AFTER_REWRITE면: GATES: PASS_AFTER_REWRITE ... attempt=2 metrics={...}
    """
    passed_gates = [r.gate for r in report.gate_results if r.passed]
    failed_gates = [r.gate for r in report.gate_results if not r.passed]

    gate_part = ",".join(passed_gates) if report.passed else ",".join(failed_gates)
    reasons_str = ";".join(failure_reasons_flat) if failure_reasons_flat else ""
    metrics_str = json.dumps(report.metrics, ensure_ascii=False)

    if report.status_label == "FAIL":
        # "GATES: FAIL … -> RETRY"
        logger_fn(
            f'GATES: FAIL gate={gate_part} reasons="{reasons_str}" attempt={report.attempt} '
            f'rewrite_sections="{",".join(report.rewrite_sections)}" -> RETRY'
        )
    elif report.status_label == "PASS_AFTER_REWRITE":
        logger_fn(f"GATES: PASS_AFTER_REWRITE gate={','.join([r.gate for r in report.gate_results])} attempt={report.attempt} metrics={metrics_str}")
    else:
        logger_fn(f"GATES: PASS gate={','.join([r.gate for r in report.gate_results])} attempt={report.attempt} metrics={metrics_str}")

if __name__ == "__main__":
    # Simple CLI test
    import sys
    from pathlib import Path
    
    if len(sys.argv) > 1:
        md = Path(sys.argv[1]).read_text(encoding="utf-8")
        report = validate_checklist_post(md, attempt=1, used_rewrite=False)
        print(f"Passed: {report.passed}")
        print(f"Status: {report.status_label}")
        print(f"Rewrite Sections: {report.rewrite_sections}")
        for r in report.gate_results:
            print(f"Gate {r.gate}: {r.passed} Reasons: {r.reasons}")
