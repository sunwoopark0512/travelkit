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

# Tabs & headers
EVAL_HEADERS = ["Date","IdemKey","Title","ScoreTotal","Category","FormatReco","NextAction","EvalJson","Model","PromptVer"]
QUEUE_HEADERS = ["Date","IdemKey","Title","Body","Priority","Channel","Status","Notes"]

def compute_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]

def make_eval_prompt(title: str, body: str) -> str:
    # Use standard format for prompts
    return f"""
# Role
당신은 냉철한 콘텐츠 전략가이자 Product Owner입니다. 입력된 아이디어를 평가하고 반드시 JSON만 출력합니다.

# Input
- Title: {title}
- Body: {body}

# Rules
- 출력은 반드시 '유효한 JSON 1개'만. 마크다운/설명/여분 텍스트 금지.
- 모든 필드를 반드시 채우기. 누락 금지.
- 점수 범위: 각 0-20, score_total은 합(0-100).

# Output JSON Schema
{{
  "score_total": 0,
  "scores": {{"novelty":0,"pain":0,"pay":0,"repeatability":0,"ease":0}},
  "category": "money|family|relationship|society|philosophy|health|other",
  "format_reco": "30m_narration|shorts|blog|email|product",
  "hook": "",
  "angle": "",
  "cta": "",
  "risk_flags": [],
  "next_action": "QUEUE|REWRITE|DROP",
  "rewrite_suggestion": ""
}}
""".strip()

def validate_eval_json(d: Dict[str, Any]) -> Tuple[bool, str]:
    required = ["score_total","scores","category","format_reco","next_action"]
    for k in required:
        if k not in d:
            return False, f"missing:{k}"
    scores = d.get("scores", {})
    for sk in ["novelty","pain","pay","repeatability","ease"]:
        v = scores.get(sk, None)
        if not isinstance(v, int):
            return False, f"scores.{sk} not int"
        if v < 0 or v > 20:
            return False, f"scores.{sk} out of range"
    st = d.get("score_total")
    if not isinstance(st, int) or st < 0 or st > 100:
        return False, "score_total out of range"
    return True, "ok"

def already_evaluated(eval_rows, idem: str, prompt_ver: str) -> bool:
    # eval_rows includes header; indices by EVAL_HEADERS
    for r in eval_rows[1:]:
        if len(r) >= 10 and r[1] == idem and r[9] == prompt_ver:
            return True
    return False

def main():
    ap = argparse.ArgumentParser(description="AI Evaluator")
    ap.add_argument("--sheet-key", required=True)
    ap.add_argument("--tab", default="INBOX")
    ap.add_argument("--out-tab", default="EVAL_LOG")
    ap.add_argument("--queue-tab", default="CONTENT_QUEUE")
    ap.add_argument("--write-queue", action="store_true")
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--provider", default="openai")
    ap.add_argument("--model", default="gpt-4o-mini")
    ap.add_argument("--prompt-ver", default="v1")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    client = get_gspread_client()
    sheet = open_sheet(client, args.sheet_key)

    inbox_ws = ensure_tab(sheet, args.tab, ["Date","Title","Body","IdemKey"])
    eval_ws  = ensure_tab(sheet, args.out_tab, EVAL_HEADERS)
    queue_ws = ensure_tab(sheet, args.queue_tab, QUEUE_HEADERS) if args.write_queue else None

    inbox = read_rows(inbox_ws)
    eval_rows = read_rows(eval_ws)
    
    # We only care about processed keys if they match the current prompt_ver to allow re-eval with new prompts
    # But for now, simple IDEM check
    
    processed = 0
    # Start iterating from row 2 (index 1 of list, since list[0] is header)
    for row in inbox[1:]:
        if processed >= args.limit:
            break
            
        # Robust row reading
        title = (row[1] if len(row) > 1 else "") or ""
        body  = (row[2] if len(row) > 2 else "") or ""
        idem  = (row[3] if len(row) > 3 else "") or compute_hash(title + "\n" + body)

        title = str(title).strip()
        body = str(body).strip()
        
        if not title:
            continue

        if already_evaluated(eval_rows, idem, args.prompt_ver):
            print(f"SKIP: already evaluated idem={idem} prompt_ver={args.prompt_ver}")
            continue

        prompt = make_eval_prompt(title, body)

        d = None
        last_err = None
        
        if args.dry_run:
            print(f"DRY-RUN: Would evaluate '{title}'")
            # Mock success for dry run
            processed += 1
            continue

        # Retry Loop
        for attempt in range(1, 6):
            try:
                d = call_llm_json(prompt, provider=args.provider, model=args.model)
                ok, reason = validate_eval_json(d)
                if not ok:
                    raise LLMError(f"Invalid eval json: {reason}")
                break
            except Exception as e:
                last_err = e
                print(f"WARN: eval attempt {attempt} failed: {e}")
                if attempt < 5:
                    backoff_sleep(attempt)
                else:
                    d = None

        if d is None:
            print(f"FAIL: eval idem={idem} err={last_err}")
            continue

        # Parse & Save
        try:
            score_total = int(d["score_total"])
            category = d["category"]
            format_reco = d["format_reco"]
            next_action = d["next_action"]

            ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            eval_row = [
                ts, idem, title,
                str(score_total), category, format_reco, next_action,
                json.dumps(d, ensure_ascii=False),
                args.model, args.prompt_ver
            ]

            append_row(eval_ws, eval_row)
            eval_rows.append(eval_row)
            print(f"SUCCESS: wrote EVAL_LOG idem={idem} score={score_total}")

            if args.write_queue and queue_ws:
                if next_action == "QUEUE":
                    priority = 5 if score_total >= 85 else 4 if score_total >= 75 else 3
                    channel = "YouTube" if format_reco == "30m_narration" else "Shorts"
                    queue_row = [ts, idem, title, body, str(priority), channel, "READY", ""]
                    append_row(queue_ws, queue_row)
                    print(f"SUCCESS: queued CONTENT_QUEUE idem={idem}")
                else:
                    print(f"INFO: not queued (next_action={next_action}) idem={idem}")
            
            processed += 1
            
        except Exception as e:
            print(f"FAIL: processing result for idem={idem}: {e}")

    if args.verify:
        final_rows = read_rows(eval_ws)
        print(f"VERIFY: EVAL_LOG rows={len(final_rows)-1}")
    print("DONE")

if __name__ == "__main__":
    main()
