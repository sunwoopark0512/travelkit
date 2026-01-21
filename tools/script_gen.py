import argparse
import datetime
import json
import hashlib
import sys
import os
from typing import Dict, Any, Tuple

# Ensure we can import from the same directory regardless of CWD
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from sheet_io import get_gspread_client, open_sheet, ensure_tab, read_rows, append_row, update_cell
    from llm_client import call_llm_json, LLMError, backoff_sleep
except ImportError:
    # Fallback for some environments
    from tools.sheet_io import get_gspread_client, open_sheet, ensure_tab, read_rows, append_row, update_cell
    from tools.llm_client import call_llm_json, LLMError, backoff_sleep

SCRIPTS_HEADERS = ["Date","IdemKey","Title","Format","Content","Model","PromptVer"]
QUEUE_HEADERS = ["Date","IdemKey","Title","Body","Priority","Tag","Status","Notes"]

def compute_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]

def make_tango_journal_prompt(title: str, body: str, coaching_tip: str) -> str:
    return f"""
# Role
You are a "Tango Archivist". You take raw notes from a dancer and turn them into a beautiful, structured "Somatic Journal Entry" for their long-term archive.

# Input
- Title: {title}
- Raw Note: {body}
- Coach's Tip: {coaching_tip}

# Task
Transform this into a structured journal entry.
Target Audience: The writer themselves (50s/60s dancer), looking back 1 year from now.
Tone: Encouraging, reflective, grounding.

# Output JSON Schema
{{
  "title": "{title} - Refined",
  "somatic_focus": "Key body part involved",
  "reflection": "3-4 sentences expanding on the raw note, connecting it to the coaching tip.",
  "action_item_next_practice": "One simple thing to try next time.",
  "tags": ["Tag1", "Tag2"]
}}
""".strip()

def validate_journal_json(d: Dict[str, Any]) -> Tuple[bool, str]:
    for k in ["title", "somatic_focus", "reflection", "action_item_next_practice"]:
        if k not in d:
            return False, f"missing:{k}"
    return True, "ok"

def already_generated(script_rows, idem: str, fmt: str, prompt_ver: str) -> bool:
    for r in script_rows[1:]:
        if len(r) >= 7 and r[1] == idem and r[3] == fmt and r[6] == prompt_ver:
            return True
    return False

def main():
    ap = argparse.ArgumentParser(description="Tango Journal Generator")
    ap.add_argument("--sheet-key", required=True)
    ap.add_argument("--queue-tab", default="CONTENT_QUEUE")
    ap.add_argument("--out-tab", default="SCRIPTS") # "SCRIPTS" now means "JOURNALS"
    ap.add_argument("--status", default="READY")
    ap.add_argument("--limit", type=int, default=5)
    ap.add_argument("--provider", default="openai")
    ap.add_argument("--model", default="gpt-4o-mini")
    ap.add_argument("--prompt-ver", default="v1_tango")
    ap.add_argument("--format", default="journal") # journal, quick_tip
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--save-dir", default="outputs/journals")
    args = ap.parse_args()

    # Ensure output dir
    if not os.path.exists(args.save_dir):
        os.makedirs(args.save_dir, exist_ok=True)

    client = get_gspread_client()
    sheet = open_sheet(client, args.sheet_key)

    queue_ws = ensure_tab(sheet, args.queue_tab, QUEUE_HEADERS)
    scripts_ws = ensure_tab(sheet, args.out_tab, SCRIPTS_HEADERS)

    queue = read_rows(queue_ws)
    scripts = read_rows(scripts_ws)

    processed = 0
    # Iterate queue, skip header. Start index at 2.
    for idx, row in enumerate(queue[1:], start=2):
        if processed >= args.limit:
            break
        
        if len(row) < 7:
            continue

        status = (row[6] or "").strip()
        if status != args.status:
            continue

        idem = (row[1] or "").strip()
        title = (row[2] or "").strip()
        body = (row[3] or "").strip()
        coaching = (row[7] if len(row) > 7 else "") or "Focus on breathing."
        
        if not idem:
            idem = compute_hash(title + "\n" + body)

        if already_generated(scripts, idem, args.format, args.prompt_ver):
            print(f"SKIP: already generated idem={idem} format={args.format}")
            continue

        prompt = make_tango_journal_prompt(title, body, coaching)

        d = None
        last_err = None
        
        if args.dry_run:
            print(f"DRY-RUN: Would journal '{title}'")
            processed += 1
            continue

        for attempt in range(1, 4):
            try:
                d = call_llm_json(prompt, provider=args.provider, model=args.model)
                ok, reason = validate_journal_json(d)
                if not ok:
                    raise LLMError(f"Invalid json: {reason}")
                break
            except Exception as e:
                last_err = e
                # print(f"WARN: attempt {attempt} failed: {e}")
                if attempt < 3:
                    backoff_sleep(attempt)
        
        if d is None:
            # print(f"FAIL: script idem={idem} err={last_err}")
            update_cell(queue_ws, idx, 7, "FAIL")
            continue

        try:
            script_text = json.dumps(d, ensure_ascii=False)
            ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            out_row = [ts, idem, title, args.format, script_text, args.model, args.prompt_ver]
            
            # Save to file
            fname = os.path.join(args.save_dir, f"{idem}_{args.format}_{args.prompt_ver}.json")
            with open(fname, "w", encoding="utf-8") as f:
                f.write(script_text)

            append_row(scripts_ws, out_row)
            scripts.append(out_row)
            update_cell(queue_ws, idx, 7, "DONE")
            
            print(f"SUCCESS: wrote JOURNAL + saved {fname}")
            processed += 1

        except Exception as e:
            print(f"FAIL: saving result: {e}")
            update_cell(queue_ws, idx, 7, "FAIL")

    if args.verify:
        final_rows = read_rows(scripts_ws)
        print(f"VERIFY: JOURNALS rows={len(final_rows)-1}")
    print("DONE")

if __name__ == "__main__":
    main()
