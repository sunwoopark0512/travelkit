# How to Connect Your Real Google Sheet (FINAL)

지금은 "연습 모드"입니다. 
이걸 따라하면 **"실전 모드"**가 되어, 사장님의 실제 엑셀(구글 시트)에 글이 써집니다.

---

## 1. 준비물 준비
1. **Google Cloud Console**에서 `credentials.json` 파일을 다운받으셨나요?
2. 그 파일을 이 폴더(`TravelKit_Final`) 안에 넣으세요.
3. 파일 안에 있는 `client_email` 주소(영어)를 복사해서,
   사장님 구글 시트에 **[공유] -> [편집자 권한]**으로 초대해주세요.

---

## 2. 시트 주소(Key) 알려주기
구글 시트 주소창: `https://docs.google.com/spreadsheets/d/` **`1A2B3C...`** `/edit...`
중간의 긴 코드를 복사해서 아래 명령어를 실행하세요:

```powershell
$env:SHEET_KEY="여기에_진짜_키를_붙여넣으세요"
```

---

## 3. 연결 확인 (진단 버튼)
제대로 연결됐는지 이 명령어로 확인하세요.

```powershell
.\check_connection.ps1
```

*   **성공(SUCCESS)**이 뜨면: 이제 **Real Mode**입니다.
*   **실패(FAIL)**가 뜨면: 에러 메시지(공유 안 함 / 키 틀림)를 확인하세요.

---

## 4. 실전 사용
연결 성공 후에는, 이제 똑같이 버튼만 누르면 됩니다.

```powershell
.\tango.ps1
```

그러면 **사장님이 적으신 진짜 일기**를 AI가 읽고 정리해줍니다.
