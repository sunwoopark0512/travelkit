# Sheet Bot v3 - 1 Page Guide

## 1. 개요 (Overview)
- 구글 시트($SHEET_KEY)에 데이터를 **안전하고(Retry)** **중복 없이(Idempotency)** 입력하는 도구입니다.
- 개발 지식 없이 명령어 복사/붙여넣기로 사용할 수 있습니다.

## 2. 설치 및 권한 (Setup)
- **필수 파일**: credentials.json (이 파일이 	ools/가 아닌 루트 폴더에 있어야 합니다.)
- **보안**: 이 파일은 **절대 Git에 커밋하지 마세요**. .gitignore에 등록되어 있습니다.

## 3. 기본 사용법 (Usage)
### (A) 한 줄 입력
\\\ash
python tools/sheet_bot.py --tab "INBOX" --title "아이디어" --body "냉장고 파먹기 레시피"
\\\

### (B) 배치 입력 (JSON)
\\\ash
python tools/sheet_bot.py --tab "INBOX" --json "data/batch_input.json"
\\\
- JSON 형식: \[{"Title": "...", "Body": "..."}, ...]\

### (C) 탭 자동 생성 (안전 모드)
\\\ash
python tools/sheet_bot.py --tab "NEW_PROJECT" --ensure-tab --title "Start"
\\\

## 4. 트러블슈팅 (Troubleshooting)
- **429/503 에러**: 봇이 자동으로 5번까지 재시도합니다. 기다리세요.
- **Title/Body 중복**: 봇이 최근 10줄을 확인하고 중복이면 SKIP 합니다. (정상 동작)
