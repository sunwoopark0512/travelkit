# scripts/render_card_pdf_chromium.py
from __future__ import annotations
import asyncio
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PDF = ROOT / "outputs" / "cards_pdf"


async def main(html_path: str) -> int:
    try:
        from playwright.async_api import async_playwright
    except Exception as e:
        raise SystemExit("Playwright not installed. Install with: pip install playwright && playwright install chromium") from e

    p = Path(html_path).resolve()
    OUT_PDF.mkdir(parents=True, exist_ok=True)
    pdf_path = OUT_PDF / (p.stem + ".pdf")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page()
        await page.goto(p.as_uri(), wait_until="networkidle")
        await page.pdf(path=str(pdf_path), format="A4", print_background=True)
        await browser.close()

    print(f"Wrote: {pdf_path}")
    return 0


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python scripts/render_card_pdf_chromium.py <html_path>")
        raise SystemExit(2)
    raise SystemExit(asyncio.run(main(sys.argv[1])))
