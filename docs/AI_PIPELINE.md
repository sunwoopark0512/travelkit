# AI Pipeline (v1) — Windows-first

## 목적
INBOX(아이디어 입력) → EVAL_LOG(AI 평가) → CONTENT_QUEUE(제작 큐) → SCRIPTS(대본 생성)까지 “재실행 가능 + 증거 기반” 파이프라인을 제공한다.

## 전제
- Sheet Bot v3 기준선: INBOX 컬럼은 [Date, Title, Body, IdemKey]
- credentials.json은 로컬에만 존재(깃 커밋 금지)
- API 키는 환경변수로만 주입(코드/문서에 직접 기입 금지)

## 준비
### 1) Python 패키지
PowerShell:
- pip install gspread oauth2client requests

### 2) 환경변수
PowerShell:
- $env:OPENAI_API_KEY="YOUR_KEY"
- $env:SHEET_KEY="YOUR_SHEET_KEY"

## 탭(시트) 구조
- INBOX: Date, Title, Body, IdemKey (기존)
- EVAL_LOG: Date, IdemKey, Title, ScoreTotal, Category, FormatReco, NextAction, EvalJson, Model, PromptVer
- CONTENT_QUEUE: Date, IdemKey, Title, Body, Priority, Channel, Status, Notes
- SCRIPTS: Date, IdemKey, Title, ScriptType, ScriptText, Model, PromptVer

## 실행 (Evidence 생성)
### Evidence 201: 평가 실행
```powershell
python tools/ai_eval.py --sheet-key $env:SHEET_KEY --tab INBOX --out-tab EVAL_LOG --limit 20 --model gpt-4o-mini --prompt-ver v1 --verify 2>&1 | Tee-Object outputs\evidence\201_eval_json_tail200.txt
```

### Evidence 202: 평가 + 큐 반영

```powershell
python tools/ai_eval.py --sheet-key $env:SHEET_KEY --tab INBOX --out-tab EVAL_LOG --write-queue --queue-tab CONTENT_QUEUE --limit 20 --model gpt-4o-mini --prompt-ver v1 --verify 2>&1 | Tee-Object outputs\evidence\202_queue_write_tail200.txt
```

### Evidence 203: 30분 대본 생성

```powershell
python tools/script_gen.py --sheet-key $env:SHEET_KEY --queue-tab CONTENT_QUEUE --out-tab SCRIPTS --status READY --limit 5 --script-type 30m --model gpt-4o-mini --prompt-ver v1 --verify 2>&1 | Tee-Object outputs\evidence\203_script_30m_tail200.txt
```

### Evidence 204: 재실행(idempotency) 증명

동일 커맨드를 다시 실행했을 때 SKIP 로그가 나와야 한다.

```powershell
python tools/ai_eval.py --sheet-key $env:SHEET_KEY --tab INBOX --out-tab EVAL_LOG --limit 20 --model gpt-4o-mini --prompt-ver v1 --verify 2>&1 | Tee-Object outputs\evidence\204_idempotency_rerun_tail200.txt
python tools/script_gen.py --sheet-key $env:SHEET_KEY --queue-tab CONTENT_QUEUE --out-tab SCRIPTS --status READY --limit 5 --script-type 30m --model gpt-4o-mini --prompt-ver v1 --verify 2>&1 | Tee-Object -Append outputs\evidence\204_idempotency_rerun_tail200.txt
```

## 실패 대응

* OpenAI JSON 파싱 실패: 프롬프트 규칙 위반 가능 → 재실행(백오프 포함), 반복 시 prompt-ver 올려 수정
* Sheets 권한 실패: credentials.json 서비스 계정 이메일이 시트 편집자로 공유되어야 함
* 중복 생성 방지: EVAL_LOG는 (IdemKey, PromptVer), SCRIPTS는 (IdemKey, ScriptType, PromptVer) 기준으로 SKIP

## 원복

* 변경 전 기준선 복구: git reset --hard sheet-bot-v3
