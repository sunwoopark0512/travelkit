# scripts/render_card_html.py
from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime
import html

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = ROOT / "templates"
OUT_DIR = ROOT / "outputs" / "cards_mobile"


def now_iso():
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def write_text(p: Path, s: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s, encoding="utf-8")


def kv_table_html(defs: dict) -> str:
    rows = ['<table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>']
    for k, v in defs.items():
        rows.append(f"<tr><td>{html.escape(str(k))}</td><td>{html.escape(str(v))}</td></tr>")
    rows.append("</tbody></table>")
    return "".join(rows)


def ol_html(steps: list) -> str:
    items = "".join([f"<li>{html.escape(str(s))}</li>" for s in steps])
    return f"<ol>{items}</ol>"


def faq_html(faq: list) -> str:
    # faq: [{"q": "...", "a": "..."}, ...]
    parts = []
    for qa in faq:
        parts.append(f"<p><b>Q:</b> {html.escape(str(qa.get('q','')))}</p>")
        parts.append(f"<p><b>A:</b> {html.escape(str(qa.get('a','')))}</p>")
    return "\n".join(parts)


def render(template: str, data: dict) -> str:
    # very small template: replace {{key}} with html-escaped text unless it's *_html blocks.
    out = template
    for k, v in data.items():
        if k.endswith("_html"):
            rep = str(v)
        else:
            rep = html.escape(str(v))
        out = out.replace("{{" + k + "}}", rep)
    return out


def main(card_json_path: str) -> int:
    tpl = read_text(TEMPLATES / "card.html")
    card = json.loads(read_text(Path(card_json_path)))

    data = {
        "title": card.get("title", ""),
        "card_id": card.get("card_id", ""),
        "cluster_id": card.get("cluster_id", ""),
        "locked": str(card.get("locked", False)).lower(),
        "preview_line": card.get("preview_line", ""),
        "pass_condition": card.get("pass_condition", ""),
        "unlock_rule": card.get("unlock_rule", ""),
        "definitions_table_html": kv_table_html(card.get("definitions", {})),
        "procedure_html": ol_html(card.get("procedure_steps", [])),
        "faq_html": faq_html(card.get("faq", [])),
        "generated_at": now_iso(),
    }

    html_out = render(tpl, data)
    out_path = OUT_DIR / f"{data['card_id']}.html"
    write_text(out_path, html_out)
    print(f"Wrote: {out_path}")
    return 0


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python scripts/render_card_html.py <card_json_path>")
        raise SystemExit(2)
    raise SystemExit(main(sys.argv[1]))
