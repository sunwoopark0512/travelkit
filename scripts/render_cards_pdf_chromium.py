# scripts/render_cards_pdf_chromium.py
import os, json, pathlib
from typing import Dict, Any

# Requires: pip install playwright
# And: playwright install chromium

ROOT = pathlib.Path(__file__).resolve().parents[1]
EXTRACT_DIR = ROOT / "outputs" / "cards_extract"
OUT_DIR = ROOT / "outputs" / "cards_pdf"
TEMPLATE_DIR = ROOT / "templates"

def load_card(card_id: str) -> Dict[str, Any]:
    p = EXTRACT_DIR / f"{card_id}.json"
    return json.loads(p.read_text(encoding="utf-8"))

def render_html(card: Dict[str, Any]) -> str:
    # Minimal Mustache-like replace (stdlib only)
    html = (TEMPLATE_DIR / "card.html").read_text(encoding="utf-8")
    html = html.replace("{{title}}", card.get("title",""))
    html = html.replace("{{preview_line}}", card.get("preview_line",""))
    html = html.replace("{{pass_condition}}", card.get("pass_condition",""))
    html = html.replace("{{unlock_rule}}", card.get("unlock_rule",""))
    html = html.replace("{{checklist_a}}", card.get("checklist_a",""))
    html = html.replace("{{action_60s}}", card.get("action_60s",""))
    html = html.replace("{{checklist_b}}", card.get("checklist_b",""))
    html = html.replace("{{definitions}}", card.get("definitions",""))
    html = html.replace("{{procedure}}", card.get("procedure",""))
    html = html.replace("{{faq}}", card.get("faq",""))
    html = html.replace("{{system_claim}}", card.get("system_claim",""))
    html = html.replace("{{card_id}}", card.get("card_id",""))
    html = html.replace("{{cluster_id}}", card.get("cluster_id",""))

    locked = bool(card.get("locked", False))
    if locked:
        html = html.replace("{{#locked}}", "").replace("{{/locked}}", "")
    else:
        # remove locked block crudely
        start = html.find("{{#locked}}")
        end = html.find("{{/locked}}")
        if start != -1 and end != -1:
            html = html[:start] + html[end+len("{{/locked}}"):]
        html = html.replace("{{#locked}}", "").replace("{{/locked}}", "")
    return html

async def main(card_id: str):
    from playwright.async_api import async_playwright

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    card = load_card(card_id)

    tmp_dir = ROOT / "outputs" / "_tmp_html"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    (tmp_dir / "card.css").write_text((TEMPLATE_DIR / "card.css").read_text(encoding="utf-8"), encoding="utf-8")
    html = render_html(card)
    html_path = tmp_dir / f"{card_id}.html"
    html_path.write_text(html, encoding="utf-8")

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(html_path.as_uri())
        await page.pdf(path=str(OUT_DIR / f"{card_id}.pdf"), format="A4", print_background=True)
        await browser.close()
    
    print(f"Generated PDF (Chromium): {OUT_DIR / f'{card_id}.pdf'}")

if __name__ == "__main__":
    import sys, asyncio
    if len(sys.argv) != 2:
        print("Usage: python scripts/render_cards_pdf_chromium.py <card_id>")
        raise SystemExit(2)
    asyncio.run(main(sys.argv[1]))
