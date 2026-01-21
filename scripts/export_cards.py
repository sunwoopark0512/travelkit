# scripts/export_cards.py
import os, re, json, glob, hashlib
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional

# Adjust root to project root
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

DEFAULT_SOURCE_GLOB = os.path.join(ROOT, "docs", "cards", "**", "*.md")
DASHBOARD_JSON = os.path.join(ROOT, "web", "dashboard", "cards.json")
OUT_MOBILE_DIR = os.path.join(ROOT, "outputs", "cards_mobile")
OUT_EXTRACT_DIR = os.path.join(ROOT, "outputs", "cards_extract")


def read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def parse_frontmatter(md: str) -> Tuple[Dict[str, Any], str]:
    """
    Very small YAML subset parser: key: value, lists: [a,b]
    If you already use PyYAML elsewhere, you can swap in safely.
    """
    if not md.lstrip().startswith("---"):
        return {}, md
    m = re.match(r"(?s)^\s*---\s*\n(.*?)\n---\s*\n(.*)$", md)
    if not m:
        return {}, md
    fm_raw, body = m.group(1), m.group(2)
    fm: Dict[str, Any] = {}
    for line in fm_raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        # list like [a, b]
        if v.startswith("[") and v.endswith("]"):
            inner = v[1:-1].strip()
            items = [x.strip().strip('"').strip("'") for x in inner.split(",") if x.strip()]
            fm[k] = items
        elif v.lower() in ("true", "false"):
            fm[k] = (v.lower() == "true")
        else:
            fm[k] = v
    return fm, body


def first_h1(body: str) -> str:
    m = re.search(r"(?m)^\s*#\s+(.+?)\s*$", body)
    return m.group(1).strip() if m else ""


def extract_section(md: str, header: str) -> str:
    pat = rf"(?ms)^\s*##\s+{re.escape(header)}\s*\n(.*?)(?=^\s*##\s+|\Z)"
    m = re.search(pat, md)
    return m.group(1).strip() if m else ""


def extract_preview_lines(body: str) -> Dict[str, str]:
    head = "\n".join(body.splitlines()[:40])
    out = {}
    # allow both "Preview:" and "preview_line:"
    m = re.search(r"(?mi)^\s*(Preview|preview_line)\s*:\s*(.+)$", head)
    if m:
        out["preview_line"] = m.group(2).strip()
    m = re.search(r"(?m)^\s*Pass Condition:\s*(.+)$", head)
    if m:
        out["pass_condition"] = m.group(1).strip()
    m = re.search(r"(?m)^\s*Unlock Rule:\s*(.+)$", head)
    if m:
        out["unlock_rule"] = m.group(1).strip()
    return out


def build_mobile_card(card: Dict[str, Any]) -> str:
    locked = bool(card.get("locked", False))
    lines = []
    lines.append(f"# {card.get('title','')}")
    lines.append("")
    lines.append(card.get("preview_line","").strip())
    lines.append("")
    lines.append(f"Pass Condition: {card.get('pass_condition','')}".strip())
    if locked:
        lines.append(f"Unlock Rule: {card.get('unlock_rule','')}".strip())
    lines.append("")
    lines.append("## Checklist A")
    lines.append(card.get("checklist_a","").strip())
    lines.append("")
    lines.append("## Action (60s)")
    lines.append(card.get("action_60s","").strip())
    lines.append("")
    lines.append("## Checklist B")
    lines.append(card.get("checklist_b","").strip())
    lines.append("")
    lines.append("STOP: 통증/불안정/호흡 이상이면 즉시 중단.")
    return "\n".join(lines).strip() + "\n"


def infer_url(card: Dict[str, Any]) -> str:
    # 규칙: /cards/<cluster_id>/<card_id>/
    cluster_id = card.get("cluster_id", "misc")
    card_id = card.get("card_id", "unknown")
    return f"/cards/{cluster_id}/{card_id}/"


def file_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]


def main(source_glob: str = DEFAULT_SOURCE_GLOB) -> None:
    ensure_dir(os.path.dirname(DASHBOARD_JSON))
    ensure_dir(OUT_MOBILE_DIR)
    ensure_dir(OUT_EXTRACT_DIR)

    paths = glob.glob(source_glob, recursive=True)
    cards: List[Dict[str, Any]] = []
    clusters: Dict[str, Dict[str, Any]] = {}

    for p in sorted(paths):
        md = read_text(p)
        fm, body = parse_frontmatter(md)
        title = first_h1(body)
        prev = extract_preview_lines(body)

        card_id = fm.get("card_id") or os.path.splitext(os.path.basename(p))[0]
        cluster_id = fm.get("cluster_id") or "misc"
        locked = bool(fm.get("locked", False))

        card = {
            "card_id": card_id,
            "cluster_id": cluster_id,
            "title": title,
            "preview_line": prev.get("preview_line", ""),
            "locked": locked,
            "pass_condition": prev.get("pass_condition", ""),
            "unlock_rule": prev.get("unlock_rule", "") if locked else "",
            "tags": fm.get("tags", []),
            "updated": fm.get("updated", ""),
            "source_path": os.path.relpath(p, ROOT).replace("\\", "/"),
            "url": infer_url({"cluster_id": cluster_id, "card_id": card_id}),
            # extractable blocks (for PDF rendering / validators / indexing)
            "checklist_a": extract_section(body, "Checklist A"),
            "action_60s": extract_section(body, "Action (60s)"),
            "checklist_b": extract_section(body, "Checklist B"),
            "definitions": extract_section(body, "Definitions"),
            "procedure": extract_section(body, "Procedure"),
            "faq": extract_section(body, "FAQ"),
            "system_claim": extract_section(body, "System Claim"),
            "content_hash": file_hash(body),
        }

        cards.append(card)

        if cluster_id not in clusters:
            clusters[cluster_id] = {
                "cluster_id": cluster_id,
                "title": cluster_id.replace("_", " ").title(),
                "description": "",
                "cards": [],
            }
        clusters[cluster_id]["cards"].append({
            "card_id": card_id,
            "title": title,
            "preview_line": card["preview_line"],
            "url": card["url"],
            "locked": locked,
            "pass_condition": card["pass_condition"],
            "unlock_rule": card["unlock_rule"],
            "tags": card["tags"],
        })

        # write mobile + extract json
        mobile_md = build_mobile_card(card)
        with open(os.path.join(OUT_MOBILE_DIR, f"{card_id}.md"), "w", encoding="utf-8") as f:
            f.write(mobile_md)
        with open(os.path.join(OUT_EXTRACT_DIR, f"{card_id}.json"), "w", encoding="utf-8") as f:
            json.dump(card, f, ensure_ascii=False, indent=2)

    dashboard = {
        "system": {
            "name": "Somatic Checklist Writing System",
            "version": "1.0",
            "updated": datetime.now().strftime("%Y-%m-%d"),
            "unit": "routine_card",
        },
        "clusters": list(clusters.values()),
        "routines": {"weekly": [], "monthly": []},
    }

    with open(DASHBOARD_JSON, "w", encoding="utf-8") as f:
        json.dump(dashboard, f, ensure_ascii=False, indent=2)

    print(f"Exported cards: {len(cards)}")
    print(f"Wrote: {os.path.relpath(DASHBOARD_JSON, ROOT)}")
    print(f"Wrote mobile: outputs/cards_mobile/*.md")
    print(f"Wrote extracts: outputs/cards_extract/*.json")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # allow overriding source glob
        main(sys.argv[1])
    else:
        main()
