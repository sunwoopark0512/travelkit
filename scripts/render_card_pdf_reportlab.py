# scripts/render_card_pdf_reportlab.py
from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs" / "cards_pdf_rl"


def now_iso():
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def main(card_json_path: str) -> int:
    card = json.loads(Path(card_json_path).read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)

    pdf_path = OUT / f"{card.get('card_id','card')}.pdf"
    c = canvas.Canvas(str(pdf_path), pagesize=A4)
    w, h = A4

    y = h - 48
    c.setFont("Helvetica-Bold", 16)
    c.drawString(48, y, card.get("title", ""))
    y -= 18

    c.setFont("Helvetica", 10)
    c.drawString(48, y, f"card_id: {card.get('card_id','')}  cluster_id: {card.get('cluster_id','')}  locked: {card.get('locked', False)}")
    y -= 18

    c.setFont("Helvetica", 11)
    c.drawString(48, y, f"Preview: {card.get('preview_line','')}")
    y -= 18

    c.setFont("Helvetica-Bold", 12)
    c.drawString(48, y, "Pass / Unlock")
    y -= 14
    c.setFont("Helvetica", 11)
    c.drawString(48, y, f"Pass Condition: {card.get('pass_condition','')}")
    y -= 14
    c.drawString(48, y, f"Unlock Rule: {card.get('unlock_rule','')}")
    y -= 18

    c.setFont("Helvetica-Bold", 12)
    c.drawString(48, y, "System Claim")
    y -= 14
    c.setFont("Helvetica", 10)
    claim = [
        "This page is a Routine Card in the Somatic Checklist Writing System.",
        "Each card is identified by card_id and evaluated by Pass/Fail gates.",
        "Cards are organized as Card → Weekly Routine → Monthly Diagnosis.",
        "The authoritative index is /dashboard/cards.json."
    ]
    for ln in claim:
        c.drawString(48, y, ln)
        y -= 12

    y -= 10
    c.setFont("Helvetica", 9)
    c.drawString(48, y, f"Generated: {now_iso()}")
    c.showPage()
    c.save()

    print(f"Wrote: {pdf_path}")
    return 0


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python scripts/render_card_pdf_reportlab.py <card_json_path>")
        raise SystemExit(2)
    raise SystemExit(main(sys.argv[1]))
