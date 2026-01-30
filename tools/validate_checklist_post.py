from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple
import re
import json
from datetime import datetime


@dataclass
class GateResult:
    gate: str
    passed: bool
    reasons: List[str] = field(default_factory=list)
    metrics: Dict[str, object] = field(default_factory=dict)
    failed_sections: Set[str] = field(default_factory=set)


@dataclass
class ValidationReport:
    passed: bool
    attempt: int
    gate_results: List[GateResult]
    rewrite_sections: List[str]
    status_label: str  # PASS | FAIL | PASS_AFTER_REWRITE
    metrics: Dict[str, object] = field(default_factory=dict)


_SECTION_ORDER = ["Preview", "Definitions", "Procedure", "FAQ", "SystemClaim", "Body"]

REASON_TO_SECTION = {
    "MISSING_DEFINITIONS_TABLE": "Definitions",
    "DEFINITIONS_TOO_FEW_ROWS": "Definitions",
    "MISSING_PROCEDURE": "Procedure",
    "PROCEDURE_TOO_FEW_STEPS": "Procedure",
    "FAQ_LT_3": "FAQ",
    "MISSING_PASS_CONDITION": "Preview",
    "LOCKED_MISSING_UNLOCK_RULE": "Preview",
    "MISSING_SYSTEM_CLAIM": "SystemClaim",
    "SYSTEM_CLAIM_INCOMPLETE": "SystemClaim",
}


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
            codes = r.reasons or ["FAIL"]
            for code in codes:
                failed.append(f"{r.gate}:{code}")
    return (len(failed) == 0), failed


def _stable_list(xs: Set[str]) -> List[str]:
    return [x for x in _SECTION_ORDER if x in xs] + sorted([x for x in xs if x not in _SECTION_ORDER])


def compute_rewrite_sections(failed_reasons: List[str]) -> List[str]:
    sections: Set[str] = set()
    for item in failed_reasons:
        code = item.split(":", 1)[-1].strip()
        sec = REASON_TO_SECTION.get(code)
        if sec:
            sections.add(sec)
    return _stable_list(sections)


def gate_a_structure(md: str) -> GateResult:
    reasons = []
    failed: Set[str] = set()

    has_def = bool(re.search(r"^##\s+Definitions\b", md, re.M))
    has_proc = bool(re.search(r"^##\s+Procedure\b", md, re.M))
    has_faq = bool(re.search(r"^##\s+FAQ\b", md, re.M))

    if not has_def:
        reasons.append("MISSING_DEFINITIONS_TABLE")
        failed.add("Definitions")
    if not has_proc:
        reasons.append("MISSING_PROCEDURE")
        failed.add("Procedure")
    if not has_faq:
        reasons.append("FAQ_LT_3")
        failed.add("FAQ")

    return GateResult(gate="A", passed=(len(reasons) == 0), reasons=reasons, failed_sections=failed)


def gate_b_definitions_table(md: str) -> GateResult:
    reasons = []
    failed: Set[str] = set()

    m = re.search(r"^##\s+Definitions\b([\s\S]*?)(^##\s+|\Z)", md, re.M)
    if not m:
        reasons.append("MISSING_DEFINITIONS_TABLE")
        failed.add("Definitions")
        return GateResult(gate="B", passed=False, reasons=reasons, failed_sections=failed)

    block = m.group(1)
    has_header = "| Key | Value |" in block
    if not has_header:
        reasons.append("MISSING_DEFINITIONS_TABLE")
        failed.add("Definitions")

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
        failed.add("Definitions")

    return GateResult(
        gate="B",
        passed=(len(reasons) == 0),
        reasons=reasons,
        failed_sections=failed,
        metrics={"definitions_rows": len(data_rows)},
    )


def gate_c_procedure_steps(md: str) -> GateResult:
    reasons = []
    failed: Set[str] = set()

    m = re.search(r"^##\s+Procedure\b([\s\S]*?)(^##\s+|\Z)", md, re.M)
    if not m:
        reasons.append("MISSING_PROCEDURE")
        failed.add("Procedure")
        return GateResult(gate="C", passed=False, reasons=reasons, failed_sections=failed)

    block = m.group(1)
    steps = re.findall(r"^\s*\d+\.\s+.+$", block, re.M)
    if len(steps) < 4:
        reasons.append("PROCEDURE_TOO_FEW_STEPS")
        failed.add("Procedure")

    return GateResult(
        gate="C",
        passed=(len(reasons) == 0),
        reasons=reasons,
        failed_sections=failed,
        metrics={"procedure_steps": len(steps)},
    )


def gate_d_faq(md: str) -> GateResult:
    reasons = []
    failed: Set[str] = set()

    m = re.search(r"^##\s+FAQ\b([\s\S]*?)(^##\s+|\Z)", md, re.M)
    if not m:
        reasons.append("FAQ_LT_3")
        failed.add("FAQ")
        return GateResult(gate="D", passed=False, reasons=reasons, failed_sections=failed)

    block = m.group(1)
    qs = re.findall(r"^\s*Q:\s+.+$", block, re.M)
    ans = re.findall(r"^\s*A:\s+.+$", block, re.M)
    pairs = min(len(qs), len(ans))
    if pairs < 3:
        reasons.append("FAQ_LT_3")
        failed.add("FAQ")

    return GateResult(
        gate="D",
        passed=(len(reasons) == 0),
        reasons=reasons,
        failed_sections=failed,
        metrics={"faq_pairs": pairs},
    )


def gate_e_authority(md: str) -> GateResult:
    reasons = []
    failed: Set[str] = set()

    has_pass = bool(re.search(r"^\s*\*\*Pass Condition\*\*:\s+.+$", md, re.M))
    if not has_pass:
        reasons.append("MISSING_PASS_CONDITION")
        failed.add("Preview")

    locked_m = re.search(r"^\s*\*\*Locked\*\*:\s*(true|false)\s*$", md, re.M | re.I)
    is_locked = False
    if locked_m and locked_m.group(1).lower() == "true":
        is_locked = True

    if is_locked:
        has_unlock = bool(re.search(r"^\s*\*\*Unlock Rule\*\*:\s+.+$", md, re.M))
        if not has_unlock:
            reasons.append("LOCKED_MISSING_UNLOCK_RULE")
            failed.add("Preview")

    has_claim = bool(re.search(r"^##\s+System Claim\b", md, re.M))
    if not has_claim:
        reasons.append("MISSING_SYSTEM_CLAIM")
        failed.add("SystemClaim")
    else:
        claim_block = re.search(r"^##\s+System Claim\b([\s\S]*?)(^##\s+|\Z)", md, re.M)
        txt = (claim_block.group(1) if claim_block else "").lower()
        must = [
            "routine card",
            "somatic checklist writing system",
            "card_id",
            "pass/fail",
            "/dashboard/cards.json",
        ]
        missing = [k for k in must if k not in txt]
        if missing:
            reasons.append("SYSTEM_CLAIM_INCOMPLETE")
            failed.add("SystemClaim")

    return GateResult(
        gate="E",
        passed=(len(reasons) == 0),
        reasons=reasons,
        failed_sections=failed,
        metrics={"locked": is_locked},
    )


def validate_checklist_post(md: str, attempt: int, used_rewrite: bool) -> ValidationReport:
    gates = [
        gate_a_structure(md),
        gate_b_definitions_table(md),
        gate_c_procedure_steps(md),
        gate_d_faq(md),
        gate_e_authority(md),
    ]
    passed, failed_reason_list = _gate_summary(gates)
    metrics = _merge_metrics(gates)

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
        metrics=metrics,
    )


def log_gate_transition(logger_fn, report: ValidationReport) -> None:
    passed_gates = [r.gate for r in report.gate_results if r.passed]
    failed_gates = [r.gate for r in report.gate_results if not r.passed]

    # Flatten reasons for unified log
    _, failed_reason_list = _gate_summary(report.gate_results)
    reasons_str = ";".join(failed_reason_list)
    metrics_str = json.dumps(report.metrics, ensure_ascii=False)

    if report.status_label == "FAIL":
        gate_part = ",".join(failed_gates)
        logger_fn(
            f'GATES: FAIL gate={gate_part} reasons="{reasons_str}" attempt={report.attempt} '
            f'rewrite_sections="{",".join(report.rewrite_sections)}" -> RETRY'
        )
    elif report.status_label == "PASS_AFTER_REWRITE":
        logger_fn(
            f"GATES: PASS_AFTER_REWRITE gate={','.join([r.gate for r in report.gate_results])} "
            f"attempt={report.attempt} metrics={metrics_str}"
        )
    else:
        logger_fn(
            f"GATES: PASS gate={','.join([r.gate for r in report.gate_results])} "
            f"attempt={report.attempt} metrics={metrics_str}"
        )
