# Silver Creator OS - Operations Manual & Checklist

## 1. 실제 세팅 체크리스트 (초보자 10분 컷)

이 체크리스트는 Deluxe 플랜 설치 대행 시 **반드시 순서대로** 확인해야 합니다.

### A. 필수 파일 및 권한 확보
1.  **`credentials.json` 확보 & 위치**
    *   Google Cloud Console > IAM & Admin > Service Accounts > Key 생성 (JSON).
    *   파일명 `credentials.json`으로 변경 후, 프로젝트 **최상위 폴더(루트)**에 저장.
    *   *주의: 절대 깃헙에 올리지 말 것 (.gitignore 확인).*

2.  **구글 시트 공유 (가장 빈번한 실수 1위)**
    *   `credentials.json` 파일을 메모장으로 열어 `client_email` 값을 복사.
    *   고객의 구글 시트 우측 상단 [공유] 버튼 클릭.
    *   **편집자(Editor)** 권한으로 해당 이메일 초대.

3.  **환경변수 설정 (PowerShell)**
    *   터미널에 다음 두 줄 입력 (실제 키 값으로 대체):
    ```powershell
    $env:SHEET_KEY="구글시트_URL_중간의_긴_ID_값"
    $env:OPENAI_API_KEY="sk-..."
    ```

### B. 실행 테스트 (Smoke Test)
`.\tests\smoke_ai_pipeline.ps1` 실행. 흔한 실패 원인 Best 5:

1.  **`WorksheetNotFound`**: 시트에 `INBOX` 탭이 없음. -> 탭 이름 정확히 생성/수정.
2.  **`APIError` (403/404)**: 서비스 계정 이메일이 시트에 공유되지 않음. -> 공유 확인.
3.  **`LLMError: Missing env`**: 환경변수가 현재 터미널 세션에 없음. -> `$env:...` 다시 실행.
4.  **`ModuleNotFoundError`**: `pip install -r requirements.txt` (또는 `gspread oauth2client requests`) 누락.
5.  **`JSONDecodeError`**: `credentials.json` 내용이 손상됨. -> 파일 다시 다운로드.

---

## 2. 첫 고객 결제 & 배송 플로우 (System Connection)

우리는 **"소프트웨어"가 아니라 "결과(첫 대본)"를 팝니다.**

1.  **결제 (Payment)**
    *   스마트스토어/계좌이체 149,000원 결제 (Deluxe).

2.  **설문 (Onboarding Form)**
    *   "가장 다루고 싶은 주제 10개를 적어주세요." (INBOX 초기 데이터 확보)
    *   *예: "50대 은퇴 후 취미", "주말 농장 실패기" 등.*

3.  **설치 대행 (Installation Proxy)**
    *   AnyDesk/TeamViewer 접속.
    *   폴더 세팅, `credentials.json` 심기, 환경변수 입력.

4.  **시스템 구동 (Execution)**
    *   Ops(직원)가 고객 앞에서 직접 터미널 입력:
    *   `INBOX` 시트에 고객 주제 10개 붙여넣기.
    *   `python tools/ai_eval.py ...` (평가 실행) -> 점수 확인.
    *   `python tools/script_gen.py ...` (대본 생성) -> **Aha Moment 발생**.

5.  **Aha Moment (결정적 순간)**
    *   **시점**: `script_gen.py` 실행 후 "SUCCESS: wrote SCRIPTS" 로그가 뜨고, `outputs/scripts` 폴더에 파일이 생기는 순간.
    *   **액션**: 생성된 JSON/텍스트 파일을 열어 **30분 분량의 빼곡한 대본**을 눈으로 확인시켜줌.
    *   *"고객님, 방금 커피 한 모금 마시는 동안 영상 1편 분량 대본이 완성되었습니다."*

6.  **배송 완료 (Delivery)**
    *   생성된 대본 파일 전송 + 사용법 가이드(PDF) 전달.

---

## 3. 오퍼 카피 (Deluxe: 149,000원)

### 오퍼 재정의
**"설치 대행 + 1회 성과 보장 (One-Done Guarantee)"**
단순히 프로그램을 주는 게 아니라, **당신의 컴퓨터에서 '첫 번째 대본'이 나오는 것까지** 책임집니다.

### 증거 (Before & After)
*   **Before**: "소재 고민하느라 3일, 글 쓰느라 5시간... 결국 일주일에 영상 하나도 벅찼던 지난날."
*   **After**: "주제만 던져주면 AI가 3분 만에 기승전결 완벽한 대본을 뱉어냅니다. 이제 당신은 '낭독'만 하세요."

### 리스크 제거 (Risk Reversal) 문구 5선
1.  **"컴맹이어도 상관없습니다. 저희가 원격으로 접속해 마우스 하나까지 다 세팅해 드립니다."**
2.  **"설치 후 10분 안에 첫 대본이 안 나오면, 묻지도 따지지도 않고 100% 환불해 드립니다."**
3.  **"복잡한 프롬프트? API 키? 몰라도 됩니다. 당신 엑셀에 버튼 하나만 누르면 끝납니다."**
4.  **"매달 나가는 구독료 없습니다. 치킨 5마리 값으로 평생 비서를 고용하세요."**
5.  **"오류가 나면요? 평생 AS 기술 지원 오픈채팅방에 초대해 드립니다."**
