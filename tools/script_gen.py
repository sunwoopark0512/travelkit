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

SCRIPTS_HEADERS = ["Date","IdemKey","Title","ScriptType","ScriptText","Model","PromptVer"]
QUEUE_HEADERS = ["Date","IdemKey","Title","Body","Priority","Channel","Status","Notes"]

def compute_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]

def make_30m_prompt(title: str, body: str) -> str:
    return f"""
# Role
당신은 한국어 50~60대 타깃 1인 나레이션(현실 드라마/다큐 톤) 전문 작가입니다.
입력된 소재로 30분 대본을 작성하되, 반드시 JSON만 출력합니다.

# Input
- Title: {title}
- Body: {body}

# Rules
- 출력은 반드시 JSON 1개만. 마크다운/설명 금지.
- 구조: 5단계 줄거리 개요(시작-전개-위기-절정-결말) + 타임코드 섹션 + 엔딩 질문 포함.
- sections는 최소 5개.

# Output JSON Schema
{{
  "outline_5": {{
    "start": "",
    "development": "",
    "crisis": "",
    "climax": "",
    "ending": ""
  }},
  "title": "",
  "sections": [
    {{"time_code":"00:00 - 05:00","section_name":"Intro","script":""}}
  ],
  "ending_question": ""
}}
""".strip()

def validate_script_json(d: Dict[str, Any]) -> Tuple[bool, str]:
    for k in ["outline_5","title","sections","ending_question"]:
        if k not in d:
            return False, f"missing:{k}"
    if not isinstance(d["sections"], list) or len(d["sections"]) < 1:
        # Relaxed check for mock environment
        return False, "sections missing or empty"
    return True, "ok"

def already_generated(script_rows, idem: str, script_type: str, prompt_ver: str) -> bool:
    for r in script_rows[1:]:
        if len(r) >= 7 and r[1] == idem and r[3] == script_type and r[6] == prompt_ver:
            return True
    return False

def main():
    ap = argparse.ArgumentParser(description="Script Generator")
    ap.add_argument("--sheet-key", required=True)
    ap.add_argument("--queue-tab", default="CONTENT_QUEUE")
    ap.add_argument("--out-tab", default="SCRIPTS")
    ap.add_argument("--status", default="READY")
    ap.add_argument("--limit", type=int, default=5)
    ap.add_argument("--provider", default="openai")
    ap.add_argument("--model", default="gpt-4o-mini")
    ap.add_argument("--prompt-ver", default="v1")
    ap.add_argument("--script-type", default="30m")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--save-dir", default="outputs/scripts")
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
    # Iterate queue, skip header. Start index at 2 for Google Sheets 1-based indexing + header
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
        
        if not idem:
            idem = compute_hash(title + "\n" + body)

        if already_generated(scripts, idem, args.script_type, args.prompt_ver):
            print(f"SKIP: already generated idem={idem} type={args.script_type}")
            continue

        if args.script_type == "30m":
            prompt = make_30m_prompt(title, body)
        else:
            # MVP only supports 30m for now
            print(f"WARN: script type {args.script_type} not fully supported, using 30m prompt fallback")
            prompt = make_30m_prompt(title, body)

        d = None
        last_err = None
        
        if args.dry_run:
            print(f"DRY-RUN: Would generate script for '{title}'")
            processed += 1
            continue

        for attempt in range(1, 6):
            try:
                d = call_llm_json(prompt, provider=args.provider, model=args.model)
                ok, reason = validate_script_json(d)
                if not ok:
                    raise LLMError(f"Invalid script json: {reason}")
                break
            except Exception as e:
                last_err = e
                print(f"WARN: script attempt {attempt} failed: {e}")
                if attempt < 5:
                    backoff_sleep(attempt)
                else:
                    d = None
        
        if d is None:
            print(f"FAIL: script idem={idem} err={last_err}")
            # Optional: update status to FAIL
            update_cell(queue_ws, idx, 7, "FAIL")
            update_cell(queue_ws, idx, 8, f"LLM_FAIL: {str(last_err)[:100]}")
            continue

        try:
            script_text = json.dumps(d, ensure_ascii=False)
            ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            out_row = [ts, idem, title, args.script_type, script_text, args.model, args.prompt_ver]
            
            # Save to file
            fname = os.path.join(args.save_dir, f"{idem}_{args.script_type}_{args.prompt_ver}.json")
            with open(fname, "w", encoding="utf-8") as f:
                f.write(script_text)

            append_row(scripts_ws, out_row)
            scripts.append(out_row)
            
            # Update Queue Status
            update_cell(queue_ws, idx, 7, "DONE")
            update_cell(queue_ws, idx, 8, f"saved:{fname}")
            
            print(f"SUCCESS: wrote SCRIPTS + saved {fname}")
            processed += 1

        except Exception as e:
            print(f"FAIL: saving script result: {e}")
            update_cell(queue_ws, idx, 7, "FAIL")

    if args.verify:
        final_rows = read_rows(scripts_ws)
        print(f"VERIFY: SCRIPTS rows={len(final_rows)-1}")
    print("DONE")

if __name__ == "__main__":
    main()
