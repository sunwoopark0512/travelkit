# scripts/export_cards.py
from __future__ import annotations

import os
import re
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional

ROOT = Path(__file__).resolve().parents[1]
CARDS_DIR = ROOT / "docs" / "cards"
DASHBOARD_DIR = ROOT / "web" / "dashboard"
CARDS_JSON = DASHBOARD_DIR / "cards.json"
CARD_STATS_JSON = DASHBOARD_DIR / "card_stats.json"
LLMS_TXT = ROOT / "llms.txt"

SYSTEM_NAME = "Somatic Checklist Writing System"
SYSTEM_VERSION = "1.0"


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def write_text(p: Path, s: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s, encoding="utf-8")


def load_json(p: Path, default: Any) -> Any:
    if not p.exists():
        return default
    return json.loads(read_text(p))


def save_json(p: Path, obj: Any) -> None:
    write_text(p, json.dumps(obj, ensure_ascii=False, indent=2))


def parse_frontmatter(md: str) -> Dict[str, Any]:
    # very small YAML-like frontmatter parser for "key: value" and lists: [a,b]
    fm = {}
    m = re.match(r"^\s*---\s*\n([\s\S]*?)\n---\s*\n", md)
    if not m:
        return fm
    body = m.group(1)
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        # list support: [a, b]
        if v.startswith("[") and v.endswith("]"):
            inner = v[1:-1].strip()
            if not inner:
                fm[k] = []
            else:
                fm[k] = [x.strip().strip('"').strip("'") for x in inner.split(",")]
        else:
            # bool support
            if v.lower() in ("true", "false"):
                fm[k] = v.lower() == "true"
            else:
                fm[k] = v
    return fm


def extract_preview_line(md: str) -> str:
    # 규칙: "미리보기 1줄"은 상태→효과만. 문서 내 "**Preview**:" 라인 우선.
    m = re.search(r"^\s*\*\*Preview\*\*:\s*(.+)$", md, re.M)
    if m:
        return m.group(1).strip()
    # fallback: 첫 번째 헤더 아래 첫 문장
    lines = [ln.strip() for ln in md.splitlines() if ln.strip()]
    for ln in lines:
        if ln.startswith("#"):
            continue
        return ln[:120]
    return ""


def extract_required_fields(md: str) -> Dict[str, Any]:
    fm = parse_frontmatter(md)
    # 기대 frontmatter:
    # card_id, cluster_id, title, tags, locked(true/false)
    card_id = fm.get("card_id", "")
    cluster_id = fm.get("cluster_id", "")
    title = fm.get("title", "")
    tags = fm.get("tags", []) if isinstance(fm.get("tags", []), list) else []
    locked = bool(fm.get("locked", False))

    # Pass/Unlock는 body에서 key line으로 고정
    pass_m = re.search(r"^\s*\*\*Pass Condition\*\*:\s+(.+)$", md, re.M)
    unlock_m = re.search(r"^\s*\*\*Unlock Rule\*\*:\s+(.+)$", md, re.M)

    return {
        "card_id": card_id,
        "cluster_id": cluster_id,
        "title": title,
        "tags": tags,
        "locked": locked,
        "pass_condition": (pass_m.group(1).strip() if pass_m else ""),
        "unlock_rule": (unlock_m.group(1).strip() if unlock_m else ""),
        "preview_line": extract_preview_line(md),
    }


def slug_url(cluster_id: str, card_id: str) -> str:
    # MkDocs 경로가 /cards/<cluster>/<card>/ 로 나간다는 전제.
    return f"/cards/{cluster_id}/{card_id}/"


def build_clusters(card_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    clusters: Dict[str, Dict[str, Any]] = {}
    for row in card_rows:
        cid = row["cluster_id"]
        if cid not in clusters:
            clusters[cid] = {
                "cluster_id": cid,
                "title": cid.replace("_", " ").title(),
                "description": "",
                "cards": []
            }
        clusters[cid]["cards"].append({
            "card_id": row["card_id"],
            "title": row["title"] or row["card_id"],
            "preview_line": row["preview_line"],
            "locked": bool(row["locked"]),
            "pass_condition": row["pass_condition"],
            "unlock_rule": row["unlock_rule"],
            "tags": row["tags"],
            "url": slug_url(cid, row["card_id"]),
        })
    # stable sort
    out = []
    for k in sorted(clusters.keys()):
        clusters[k]["cards"] = sorted(clusters[k]["cards"], key=lambda x: x["card_id"])
        out.append(clusters[k])
    return out


def ensure_stats_schema() -> Dict[str, Any]:
    default = {
        "schema_version": "1.0",
        "updated": now_iso(),
        "by_card_id": {}
    }
    stats = load_json(CARD_STATS_JSON, default)
    # normalize
    if "by_card_id" not in stats:
        stats["by_card_id"] = {}
    return stats


def merge_stats_into_cards(cards_obj: Dict[str, Any], stats_obj: Dict[str, Any]) -> None:
    # cards.json.stats.by_card_id must exist
    by = stats_obj.get("by_card_id", {})
    cards_obj["stats"] = {"by_card_id": by}


def write_llms_txt(cards_obj: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append(f"SYSTEM_NAME: {SYSTEM_NAME}")
    lines.append(f"SYSTEM_VERSION: {SYSTEM_VERSION}")
    lines.append("ENTRYPOINTS:")
    lines.append("- /docs/ssot/")
    lines.append("- /docs/learning/")
    lines.append("- /dashboard/cards.json")
    lines.append("")
    lines.append("CLUSTERS:")
    for cl in cards_obj.get("clusters", []):
        lines.append(f"- {cl['cluster_id']}: /cards/{cl['cluster_id']}/")
        for c in cl.get("cards", []):
            lines.append(f"  - {c['card_id']}: {c['url']}")
    lines.append("")
    lines.append("STRUCTURE_RULES:")
    lines.append("- Every card includes Definitions (table), Procedure (steps), FAQ (>=3), System Claim.")
    lines.append("- Every card declares Pass Condition; locked cards declare Unlock Rule.")
    lines.append("")
    lines.append("MACHINE_READABLE:")
    lines.append("- cards.json is authoritative index for all routine cards (card_id keyed).")
    write_text(LLMS_TXT, "\n".join(lines) + "\n")


def main() -> int:
    DASHBOARD_DIR.mkdir(parents=True, exist_ok=True)

    card_files = []
    if CARDS_DIR.exists():
        card_files = sorted([p for p in CARDS_DIR.rglob("*.md") if p.is_file()])
    rows: List[Dict[str, Any]] = []
    for p in card_files:
        md = read_text(p)
        fields = extract_required_fields(md)
        if not fields["card_id"] or not fields["cluster_id"]:
            # skip invalid card
            continue
        rows.append(fields)

    clusters = build_clusters(rows)

    cards_obj = {
        "system": {"name": SYSTEM_NAME, "version": SYSTEM_VERSION, "updated": now_iso()},
        "clusters": clusters,
        "stats": {"by_card_id": {}}
    }

    stats_obj = ensure_stats_schema()
    # stub 집계: 카드가 새로 생기면 stats 기본값 부여 (실집계는 나중에)
    by = stats_obj.get("by_card_id", {})
    for row in rows:
        if row["card_id"] not in by:
            by[row["card_id"]] = {"attempts": 0, "passes": 0, "fails": 0, "last_7d": 0}
    stats_obj["updated"] = now_iso()
    save_json(CARD_STATS_JSON, stats_obj)

    merge_stats_into_cards(cards_obj, stats_obj)
    save_json(CARDS_JSON, cards_obj)
    write_llms_txt(cards_obj)

    print(f"Wrote: {CARDS_JSON}")
    print(f"Wrote: {CARD_STATS_JSON}")
    print(f"Wrote: {LLMS_TXT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
