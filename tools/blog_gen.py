import argparse, datetime, json, hashlib, os, sys, re
from typing import Dict, Any, Tuple, List

# Dual import style (run as script vs module)
try:
    from tools.sheet_io import get_gspread_client, open_sheet, ensure_tab, read_rows, append_row, update_cell
    from tools.llm_client import call_llm_json, LLMError, backoff_sleep
except ImportError:
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from sheet_io import get_gspread_client, open_sheet, ensure_tab, read_rows, append_row, update_cell
    from llm_client import call_llm_json, LLMError, backoff_sleep

BLOGQ_HEADERS = ["Date","IdemKey","SourceTitle","SourceBody","TargetReader","PostType","Keywords","Angle","Status","Notes"]
# Stage 2 Headers: Optimized for Blog Publishing
BLOG_HEADERS  = ["Date","IdemKey","SEO_Title","TLDR","Intro","Body","Checklist","Common_Mistakes","Practice_Tips","ImagePrompt","ImageURL","ImageStatus","Model","PromptVer"]

def compute_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]

def _now() -> str:
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def make_blog_prompt(source_title: str, source_body: str, target: str, post_type: str, keywords: str, angle: str) -> str:
    # Stage 2: Public-facing, problem-solution oriented
    return f"""
# Role
당신은 50~60대 탱고 애호가를 돕는 '탱고 롱제비티 가이드(Tango Longevity Guide)'입니다.
목표: 단순 기록이 아니라, 독자가 "내 문제"라고 느끼고 해결책을 얻어가는 "블로그 포스팅"을 작성합니다.

# Input
- SourceTitle: \"\"\"{source_title}\"\"\"
- SourceBody: \"\"\"{source_body}\"\"\"
- TargetReader: \"\"\"{target}\"\"\"
- PostType: \"\"\"{post_type}\"\"\"
- Keywords: \"\"\"{keywords}\"\"\"
- Angle: \"\"\"{angle}\"\"\"

# Writing Rules (Stage 2 - Golden Sample Tone)
1. **Persona**: 다정하지만 단호한 전문가. 의학 용어 대신 쉬운 비유 사용. 옆에서 말해주는 듯한 구어체.
2. **Structure**: 
   - Intro: 공감 질문 -> 잘못된 상식(Misconception) 깨기.
   - Body: 
     - Body 1: 왜 아픈가 (원인) -> **"칼문장 1개"** 포함.
     - Body 2: 새로운 관점 (해결책) -> **"칼문장 1개"** 포함.
   - Common Mistakes: 흔한 실수 3가지.
   - Safety Checklist: 자가 점검 질문 4~5개.
   - Conclusion: 실천 팁 -> 위로와 안도감(Emotional Closing).
3. **Readability & Marketing (Crucial)**: 
   - **분량**: 총 공백 포함 1,500자 내외 (검색 엔진 최적화 & 체류 시간 확보).
   - **모바일 최적화**: 문단은 3줄 이내. 스마트폰에서 한 화면에 꽉 차게 보이지 않도록 엔터 활용.
   - **강조**: 핵심 단어는 **볼드체**로 처리. 스키밍(Skimming)해도 내용 파악 가능하게.
   - **명언**: 캡처하고 싶은 '칼문장'을 최소 3개 만드세요.
   - **문장**: 호흡을 짧게. (~다. 대신 ~해요. 등 자연스럽게)

# Output JSON Schema
{{
  "seo_title": "클릭을 부르는 매력적인 제목 (30자 내외)",
  "tldr": ["핵심 요약 1", "핵심 요약 2", "핵심 요약 3"],
  "intro": "독자의 고통/고민에 공감하는 도입부 (2-3문장)",
  "body_markdown": "## 소제목\\n본문 내용... (마크다운 포맷)",
  "checklist": ["안전 체크리스트 1", "안전 체크리스트 2", "안전 체크리스트 3", "안전 체크리스트 4", "안전 체크리스트 5"],
  "common_mistakes": ["흔한 실수 1", "흔한 실수 2", "흔한 실수 3"],
  "practice_tips": "오늘 당장 실천할 수 있는 구체적인 팁 (1문단)",
  "image_prompt": "Minimalist, calm, safety-focused illustration prompt describing the key movement or feeling"
}}
""".strip()

def _count_quotables(text: str) -> int:
    quote_lines = sum(1 for line in text.splitlines() if line.strip().startswith(">"))
    bold_spans = len(re.findall(r"\*\*(.{6,}?)\*\*", text))
    return quote_lines + bold_spans

def _split_paragraphs(text: str) -> List[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return paragraphs

def validate_marketing_gates(d: Dict[str, Any]) -> Tuple[Dict[str, int], List[str], List[str]]:
    intro = d.get("intro", "").strip()
    body = d.get("body_markdown", "").strip()
    practice = d.get("practice_tips", "").strip()
    target_text = f"{intro}\n\n{body}\n\n{practice}".replace("\r\n", "\n")
    total_len = len(target_text)

    paragraphs = _split_paragraphs(target_text)
    para_count = len(paragraphs)
    para_line_counts = [len([line for line in para.splitlines() if line.strip()]) for para in paragraphs]
    max_para_lines = max(para_line_counts) if para_line_counts else 0

    quotable_count = _count_quotables(target_text)

    tldr_items = [str(item).strip() for item in d.get("tldr", []) if item is not None]
    intro_len = len(intro)

    metrics = {
        "len": total_len,
        "intro": intro_len,
        "paras": para_count,
        "quotable": quotable_count
    }

    hard_reasons: List[str] = []
    soft_reasons: List[str] = []

    if total_len < 1200:
        hard_reasons.append(f"LEN_TOO_SHORT({total_len})")
    if total_len > 2000:
        hard_reasons.append(f"LEN_TOO_LONG({total_len})")
    if intro_len < 150 or intro_len > 350:
        hard_reasons.append(f"INTRO_OUT_OF_RANGE({intro_len})")
    for length in [len(item) for item in tldr_items]:
        if length < 30 or length > 70:
            hard_reasons.append(f"TLDR_ITEM_OUT_OF_RANGE({length})")

    if para_count < 8 or para_count > 16:
        soft_reasons.append(f"PARA_COUNT_OUT_OF_RANGE({para_count})")
    if max_para_lines > 4:
        soft_reasons.append(f"PARA_DENSE({max_para_lines})")
    if quotable_count < 3:
        soft_reasons.append(f"MISSING_QUOTABLE({quotable_count})")

    return metrics, hard_reasons, soft_reasons

def rewrite_with_reasons(base_prompt: str, reasons: List[str], metrics: Dict[str, int]) -> str:
    reason_text = ", ".join(reasons) if reasons else "none"
    metrics_text = " ".join(f"{key}={metrics.get(key, 0)}" for key in ("len", "intro", "quotable", "paras"))
    suffix = f"FAIL_REASONS: [{reason_text}] / METRICS: {metrics_text}"
    return f"{base_prompt}\n\n{suffix}".strip()

def validate_blog_json(d: Dict[str, Any]) -> Tuple[bool, str]:
    req = ["seo_title","tldr","intro","body_markdown","checklist","common_mistakes","practice_tips","image_prompt"]
    for k in req:
        if k not in d:
            return False, f"missing:{k}"
    if not isinstance(d["tldr"], list) or len(d["tldr"]) < 3:
        return False, "tldr must be list>=3"
    if not isinstance(d["checklist"], list) or len(d["checklist"]) < 3:
        return False, "checklist must be list>=3"
    if not isinstance(d["common_mistakes"], list) or len(d["common_mistakes"]) < 3:
        return False, "common_mistakes must be list>=3"
    return True, "ok"

def already_generated(blog_rows: List[List[str]], idem: str, prompt_ver: str) -> bool:
    for r in blog_rows[1:]:
        # Check IdemKey(col 1) and PromptVer(col 13 - adjusted for new schema)
        # New Schema has 14 cols. PromptVer is at index 13.
        if len(r) >= 14 and r[1] == idem and r[13] == prompt_ver:
            return True
    return False

def main():
    ap = argparse.ArgumentParser(description="Blog generator (Stage 2)")
    ap.add_argument("--sheet-key", required=True)
    ap.add_argument("--queue-tab", default="BLOG_QUEUE")
    ap.add_argument("--out-tab", default="BLOG_POSTS")
    ap.add_argument("--status", default="READY")
    ap.add_argument("--limit", type=int, default=3)
    ap.add_argument("--provider", default="openai")
    ap.add_argument("--model", default="gpt-4o-mini")
    ap.add_argument("--prompt-ver", default="v2_blog_golden") # Bump version for Marketing/Golden Sample
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--image-mode", default="placeholder", choices=["placeholder","prompt_only"], help="placeholder writes ImageURL as 'PLACEHOLDER'")
    args = ap.parse_args()

    client = get_gspread_client()
    sheet  = open_sheet(client, args.sheet_key)

    q_ws = ensure_tab(sheet, args.queue_tab, BLOGQ_HEADERS)
    b_ws = ensure_tab(sheet, args.out_tab, BLOG_HEADERS)

    q_rows = read_rows(q_ws)
    b_rows = read_rows(b_ws)

    processed = 0
    for idx, row in enumerate(q_rows[1:], start=2):
        if processed >= args.limit:
            break
        if len(row) < 10:
            continue

        status = (row[8] or "").strip()
        if status != args.status:
            continue

        # Extract fields
        date = (row[0] or "").strip() or _now()
        idem = (row[1] or "").strip()
        source_title = str(row[2] or "").strip()
        source_body  = str(row[3] or "").strip()
        target = str(row[4] or "50~60대 탱고 건강").strip()
        post_type = str(row[5] or "Checklist").strip()
        keywords = str(row[6] or "").strip()
        angle = str(row[7] or "").strip()

        if not source_title and not source_body:
            update_cell(q_ws, idx, 9, "FAIL")  # Status col
            update_cell(q_ws, idx, 10, "Missing source fields")
            continue

        if not idem:
            idem = compute_hash(source_title + "\n" + source_body + "\n" + angle)

        if already_generated(b_rows, idem, args.prompt_ver):
            print(f"SKIP: already generated idem={idem} prompt_ver={args.prompt_ver}")
            update_cell(q_ws, idx, 9, "DONE")
            update_cell(q_ws, idx, 10, "Skipped (already generated)")
            continue

        prompt = make_blog_prompt(source_title, source_body, target, post_type, keywords, angle)

        if args.dry_run:
            print(f"DRY-RUN: would generate blog idem={idem} title={source_title}")
            processed += 1
            continue

        final_d = None
        final_metrics: Dict[str, int] = {}
        failure_reasons: List[str] = []
        last_err = None
        used_rewrite = False
        final_attempt = 0

        for attempt in range(1, 3):
            current_prompt = prompt if attempt == 1 else rewrite_with_reasons(prompt, failure_reasons, final_metrics)
            try:
                print(f"Generating idem={idem} attempt={attempt}...")
                raw_d = call_llm_json(current_prompt, provider=args.provider, model=args.model)

                ok_schema, reason_schema = validate_blog_json(raw_d)
                if not ok_schema:
                    raise LLMError(f"Schema Fail: {reason_schema}")

                metrics, hard_reasons, soft_reasons = validate_marketing_gates(raw_d)
                final_metrics = metrics

                if hard_reasons:
                    failure_reasons = hard_reasons
                    break
                if soft_reasons:
                    failure_reasons = soft_reasons
                    if attempt == 1:
                        used_rewrite = True
                        print(f"GATES: FAIL reasons=[{', '.join(failure_reasons)}] -> RETRY")
                        continue
                    break

                final_d = raw_d
                final_attempt = attempt
                failure_reasons = []
                break

            except Exception as e:
                last_err = e
                failure_reasons = [str(e)]
                break

        if final_d is None:
            log_reasons = failure_reasons or ([str(last_err)] if last_err else ["unknown"])
            print(f"GATES: FAIL reasons=[{', '.join(log_reasons)}]")
            update_cell(q_ws, idx, 9, "FAIL")
            update_cell(q_ws, idx, 10, ", ".join(log_reasons))
            continue

        metrics_line = (
            f"len={final_metrics.get('len', 0)} intro={final_metrics.get('intro', 0)}"
            f" quotable={final_metrics.get('quotable', 0)} paras={final_metrics.get('paras', 0)}"
        )
        if used_rewrite:
            print(f"GATES: PASS_AFTER_REWRITE {metrics_line}")
        else:
            print(f"GATES: PASS {metrics_line}")

        image_url = "PLACEHOLDER" if args.image_mode == "placeholder" else ""
        image_status = "READY" if args.image_mode == "prompt_only" else "GENERATED"

        # Map to New Headers:
        # ["Date","IdemKey","SEO_Title","TLDR","Intro","Body","Checklist","Common_Mistakes","Practice_Tips","ImagePrompt","ImageURL","ImageStatus","Model","PromptVer"]
        blog_row = [
            _now(), idem,
            final_d["seo_title"],
            json.dumps(final_d["tldr"], ensure_ascii=False),
            final_d["intro"],
            final_d["body_markdown"],
            json.dumps(final_d["checklist"], ensure_ascii=False),
            json.dumps(final_d["common_mistakes"], ensure_ascii=False),
            final_d["practice_tips"],
            final_d["image_prompt"],
            image_url,
            image_status,
            args.model,
            args.prompt_ver
        ]

        append_row(b_ws, blog_row)
        b_rows.append(blog_row)
        update_cell(q_ws, idx, 9, "DONE")
        update_cell(q_ws, idx, 10, "Generated BLOG_POSTS (Golden Gates Passed)")
        print(f"SUCCESS: wrote BLOG_POSTS idem={idem} title={final_d['seo_title'][:40]}")

        processed += 1

    if args.verify:
        final_rows = read_rows(b_ws)
        print(f"VERIFY: BLOG_POSTS rows={len(final_rows)-1}")
    print("DONE")

if __name__ == "__main__":
    main()
