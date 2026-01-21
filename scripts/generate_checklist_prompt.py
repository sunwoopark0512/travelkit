#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate a sealed Writer Prompt that enforces:
- R1: Preview 1-liner = 상태→효과 only
- R2: Definitions + Procedure + FAQ(>=3) mandatory
- R3: Pass Condition + (locked -> Unlock Rule 1-liner)
- R4: Stats widget is card_id-only anonymous aggregation

Output: prompt text to stdout (or file)
Stdlib only.
"""

from __future__ import annotations
import argparse
import datetime as dt
from textwrap import dedent

SEALED_RULESET_V1 = dedent("""\
[SEALED RULESET v1 — Checklist Writing Engine]
R1) Preview 1-liner must be exactly ONE line and must be "상태→효과" only.
    - Must include a measurable state (count/score/pass condition)
    - Must include exactly ONE effect (result)
    - Forbidden: explanation/why/how/tips/story/marketing fluff
R2) Every post MUST include these blocks: Definitions + Procedure + FAQ(>=3).
R3) Every post MUST declare Pass Condition.
    If locked=true, MUST also output Unlock Rule as exactly ONE line.
R4) Stats widget: aggregate by card_id only, anonymous. No user ids, no free-text comments stored.

[OUTPUT MUST FOLLOW TEMPLATE SKELETON v1 EXACTLY]
""")

TEMPLATE_SKELETON_V1 = dedent("""\
# {Title}

{PREVIEW_1LINER}  <!-- 상태→효과 only -->

**Pass Condition:** {PASS_CONDITION}
{UNLOCK_RULE_BLOCK}

---

## Routine Card
- Check 1 (질문 1)
- Check 2
- Check 3
- Check 4
- Check 5

## Action (30–60s)
- {time/count 기반 액션 1~3줄}

## Re-check
- Re-check 1
- Re-check 2
- Re-check 3
- Re-check 4
- Re-check 5

## Evidence (Optional but recommended)
- 기록 방식: score 0~5, pass true/false, card_id

---

## Definitions
- Routine Card: ...
- Pass Condition: ...
- Unlock Rule: ... (locked일 때만)
- {key term}: ...

## Procedure
1) ...
2) ...
3) ...

## FAQ
**Q1. 실패하면 어떻게 하나요?**  
A1. ...

**Q2. 통증/불편하면요?**  
A2. ...

**Q3. 빈도/주간 루틴은요?**  
A3. ...
""")

WRITER_INSTRUCTIONS = dedent("""\
[WRITER INSTRUCTIONS]
- Language: Korean
- Tone: compact, directive, no explanations.
- Do NOT add any extra sections outside the skeleton.
- Do NOT change headings, ordering, or required blocks.
- All checks must be phrased as questions.
- Action must include explicit time or count (e.g., 60s, 20회).
- FAQ must be >= 3, and answers must be short, operational.

[LOCKING RULE]
- If locked=true: preview must start with "🔒"
- If locked=false: preview must start with "✅"

[STATS WIDGET RULE — Do not implement tracking code, only text spec]
- Mention that stats are aggregated by card_id only, anonymous.
""")

def build_unlock_block(locked: bool, unlock_rule: str) -> str:
    if not locked:
        return ""
    # Exactly one line.
    return f"**Unlock Rule:** {unlock_rule}"

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", required=True)
    ap.add_argument("--card-id", required=True)
    ap.add_argument("--locked", action="store_true")
    ap.add_argument("--pass-condition", required=True)
    ap.add_argument("--unlock-rule", default="최근 7일 평균 4.2/5 이상 + 3일 연속 통과")
    ap.add_argument("--topic-notes", default="")
    args = ap.parse_args()

    today = dt.date.today().isoformat()

    unlock_block = build_unlock_block(args.locked, args.unlock_rule)

    prompt = dedent(f"""\
    You are writing a Checklist post under SEALED RULESET v1.
    Today: {today}
    card_id: {args.card_id}
    locked: {str(args.locked).lower()}

    {SEALED_RULESET_V1}

    [INPUT CONTEXT]
    - Title: {args.title}
    - Pass Condition: {args.pass_condition}
    - Unlock Rule (if locked): {args.unlock_rule}
    - Optional notes: {args.topic_notes}

    [TEMPLATE SKELETON v1 — fill the placeholders]
    {TEMPLATE_SKELETON_V1.format(
        Title=args.title,
        PREVIEW_1LINER="{PREVIEW_1LINER}",
        PASS_CONDITION=args.pass_condition,
        UNLOCK_RULE_BLOCK=unlock_block
    )}

    {WRITER_INSTRUCTIONS}

    [CRITICAL]
    - PREVIEW_1LINER must be exactly ONE LINE and must be "상태→효과" only.
    - If locked=true, PREVIEW_1LINER must start with 🔒
    - If locked=false, PREVIEW_1LINER must start with ✅
    - No extra commentary. Output only the final Markdown.
    """)
    print(prompt)

if __name__ == "__main__":
    main()
