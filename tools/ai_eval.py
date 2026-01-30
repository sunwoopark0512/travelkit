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
# EVAL_LOG now acts as "Tango Insights Log"
EVAL_HEADERS = ["Date","IdemKey","Title","Type","SafetyLevel","InsightQuality","NextAction","EvalJson","Model","PromptVer"]
QUEUE_HEADERS = ["Date","IdemKey","Title","Body","Priority","Tag","Status","Notes"]

def compute_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]

def make_tango_eval_prompt(title: str, body: str) -> str:
    # Persona: Tango Somatic Coach
    return f"""
# Role
You are a 'Tango Somatic Coach'. Your goal is to help a 50-60s dancer analyze their practice notes for body awareness, safety, and joy.

# Input
- Title: {title}
- Body: {body}

# Analysis Goals
1. **Type**: Classify the note (Physical_Sensation, Emotional_State, Musicality, Partnership, Risk_Signal).
2. **Safety Level**: 0 (Safe) to 10 (High Injury Risk). High risk if pain/tension is mentioned.
3. **Insight Quality**: 0-100. How deep is the somatic awareness? (e.g. "hurt" = low, "kneecap alignment felt off" = high).

# Output JSON Schema
{{
    "type": "Physical|Emotional|Musical|Partner|Risk",
    "safety_level": 0,
    "insight_quality": 0,
    "key_muscle_or_joint": "e.g. Knee, Lower Back, None",
    "coaching_tip": "One sentence advice based on Alexander Technique or Yoga",
    "next_action": "ARCHIVE"
}}
""".strip()

def validate_eval_json(d: Dict[str, Any]) -> Tuple[bool, str]:
    required = ["type", "safety_level", "insight_quality", "coaching_tip"]
    for k in required:
        if k not in d:
            return False, f"missing:{k}"
    return True, "ok"

def already_evaluated(eval_rows, idem: str, prompt_ver: str) -> bool:
    # eval_rows includes header; indices by EVAL_HEADERS
    for r in eval_rows[1:]:
        if len(r) >= 10 and r[1] == idem and r[9] == prompt_ver:
            return True
    return False

def main():
    ap = argparse.ArgumentParser(description="Tango Insight Evaluator")
    ap.add_argument("--sheet-key", required=True)
    ap.add_argument("--tab", default="INBOX")
    ap.add_argument("--out-tab", default="EVAL_LOG")
    ap.add_argument("--queue-tab", default="CONTENT_QUEUE")
    ap.add_argument("--write-queue", action="store_true")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--provider", default="openai")
    ap.add_argument("--model", default="gpt-4o-mini")
    ap.add_argument("--prompt-ver", default="v1_tango")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    client = get_gspread_client()
    sheet = open_sheet(client, args.sheet_key)

    inbox_ws = ensure_tab(sheet, args.tab, ["Date","Title","Body","IdemKey"])
    eval_ws  = ensure_tab(sheet, args.out_tab, EVAL_HEADERS)
    # CONTENT_QUEUE will store "Journal Candidates"
    queue_ws = ensure_tab(sheet, args.queue_tab, QUEUE_HEADERS) if args.write_queue else None

    inbox = read_rows(inbox_ws)
    eval_rows = read_rows(eval_ws)
    
    processed = 0
    for row in inbox[1:]:
        if processed >= args.limit:
            break
            
        title = (row[1] if len(row) > 1 else "") or ""
        body  = (row[2] if len(row) > 2 else "") or ""
        idem  = (row[3] if len(row) > 3 else "") or compute_hash(title + "\n" + body)

        title = str(title).strip()
        body = str(body).strip()
        
        if not title:
            continue

        if already_evaluated(eval_rows, idem, args.prompt_ver):
            print(f"SKIP: already evaluated idem={idem}")
            continue

        prompt = make_tango_eval_prompt(title, body)

        d = None
        last_err = None
        
        if args.dry_run:
            print(f"DRY-RUN: Would analyze '{title}'")
            processed += 1
            continue

        for attempt in range(1, 4):
            try:
                d = call_llm_json(prompt, provider=args.provider, model=args.model)
                ok, reason = validate_eval_json(d)
                if not ok:
                    raise LLMError(f"Invalid json: {reason}")
                break
            except Exception as e:
                last_err = e
                if attempt < 3:
                    backoff_sleep(attempt)

        if d is None:
            print(f"FAIL: eval idem={idem} err={last_err}")
            continue

        try:
            insight_q = int(d["insight_quality"])
            safety = int(d["safety_level"])
            tango_type = d["type"]
            coaching = d["coaching_tip"]
            
            ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            # EVAL_HEADERS = ["Date","IdemKey","Title","Type","SafetyLevel","InsightQuality","NextAction","EvalJson","Model","PromptVer"]
            eval_row = [
                ts, idem, title, 
                tango_type, str(safety), str(insight_q), 
                "ARCHIVE", 
                json.dumps(d, ensure_ascii=False),
                args.model, args.prompt_ver
            ]

            append_row(eval_ws, eval_row)
            eval_rows.append(eval_row)
            print(f"SUCCESS: analyzed idem={idem} type={tango_type} safety={safety}")

            # If write-queue is on, we queue it for "Journal Generation"
            # Priority: Safety risks get high priority (to reflect on pain), High Insight get high priority.
            if args.write_queue and queue_ws:
                priority = 3
                if safety >= 5: priority = 1 # Urgent reflection needed on pain
                elif insight_q >= 80: priority = 2 # Good insight to preserve
                
                # Tag = Category
                queue_row = [ts, idem, title, body, str(priority), tango_type, "READY", coaching]
                append_row(queue_ws, queue_row)
                print(f"SUCCESS: queued for Journal idem={idem}")
            
            processed += 1
            
        except Exception as e:
            print(f"FAIL: processing result for idem={idem}: {e}")

    if args.verify:
        final_rows = read_rows(eval_ws)
        print(f"VERIFY: EVAL_LOG rows={len(final_rows)-1}")
    print("DONE")

if __name__ == "__main__":
    main()
