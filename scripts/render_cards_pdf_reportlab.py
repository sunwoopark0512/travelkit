# scripts/render_cards_pdf_reportlab.py
import os, json, pathlib
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

ROOT = pathlib.Path(__file__).resolve().parents[1]
EXTRACT_DIR = ROOT / "outputs" / "cards_extract"
OUT_DIR = ROOT / "outputs" / "cards_pdf_rl"

def wrap_text(text: str, width: int) -> list[str]:
    lines = []
    for para in (text or "").splitlines():
        while len(para) > width:
            lines.append(para[:width])
            para = para[width:]
        lines.append(para)
    return lines

def main(card_id: str):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    card = json.loads((EXTRACT_DIR / f"{card_id}.json").read_text(encoding="utf-8"))

    w, h = A4
    c = canvas.Canvas(str(OUT_DIR / f"{card_id}.pdf"), pagesize=A4)

    x = 40
    y = h - 50

    def draw_line(s: str, dy=14, font="Helvetica", size=11):
        nonlocal y
        c.setFont(font, size)
        c.drawString(x, y, s[:150])
        y -= dy
        if y < 60:
            c.showPage()
            y = h - 50

    draw_line(card.get("title",""), dy=18, font="Helvetica-Bold", size=16)
    draw_line(card.get("preview_line",""), dy=16, size=11)
    draw_line(f"Pass Condition: {card.get('pass_condition','')}", dy=14, size=10)
    if card.get("locked", False):
        draw_line(f"Unlock Rule: {card.get('unlock_rule','')}", dy=16, size=10)

    draw_line("—", dy=10)

    for section_title, key in [
        ("Checklist A", "checklist_a"),
        ("Action (60s)", "action_60s"),
        ("Checklist B", "checklist_b"),
    ]:
        draw_line(section_title, dy=16, font="Helvetica-Bold", size=12)
        for ln in wrap_text(card.get(key,""), 95):
            draw_line(ln, dy=12, size=9)
        draw_line(" ", dy=10)

    draw_line("System Claim", dy=16, font="Helvetica-Bold", size=12)
    for ln in wrap_text(card.get("system_claim",""), 95):
        draw_line(ln, dy=12, size=9)

    draw_line(f"card_id: {card.get('card_id','')} / cluster_id: {card.get('cluster_id','')}", dy=12, size=8)

    c.save()
    print(f"Wrote: outputs/cards_pdf_rl/{card_id}.pdf")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python scripts/render_cards_pdf_reportlab.py <card_id>")
        raise SystemExit(2)
    main(sys.argv[1])
