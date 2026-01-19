---
description: "Gemini CLI 설치/인증/헤드리스 실행/안전한 PS 리다이렉션/금지 패턴 방지에 사용"
---

# TravelKit Gemini CLI Skill

## 목적
Gemini CLI를 Windows PowerShell 환경에서 안전하고 정확하게 사용하기 위한 가이드입니다.

---

## 설치

```powershell
npm install -g @google/gemini-cli
gemini --version
```

---

## 인증 (환경변수 기반 - 기본 플로우)

### Option 1: Gemini API Key (권장)

```powershell
# 환경변수 설정
$env:GEMINI_API_KEY = "your-api-key-here"

# 또는 영구 설정 (PowerShell Profile)
# Add to $PROFILE:
# $env:GEMINI_API_KEY = "your-api-key-here"

# 실행
gemini -p "Hello"
```

### Option 2: Vertex AI

```powershell
$env:GOOGLE_API_KEY = "your-api-key"
$env:GOOGLE_GENAI_USE_VERTEXAI = "true"
gemini -p "Hello"
```

### 중요: 인증 실패 케이스

> `gemini` 실행 시 `settings.json`도 없고 환경변수도 없으면 **인증 실패**합니다.
> 반드시 위 환경변수 중 하나를 설정하거나 `gemini` 인터랙티브 모드에서 로그인하세요.

---

## 헤드리스 실행

### 기본 텍스트 출력
```powershell
gemini -p "이 코드베이스를 설명해줘"
```

### JSON 출력 (스크립트용)
```powershell
gemini -p "분석 결과를 JSON으로" --output-format json
```

### 스트리밍 JSON (CI용)
```powershell
gemini -p "테스트 실행" --output-format stream-json
```

---

## ⚠️ 금지 패턴 (Windows PowerShell)

### 1. `-p`와 positional prompt 동시 사용 금지

```powershell
# ❌ 잘못된 사용 (에러 발생)
gemini -p "첫번째" "두번째"

# ✅ 올바른 사용
gemini -p "하나의 프롬프트로 합쳐서 작성"
```

### 2. 백슬래시(\) 라인 컨티뉴 금지

```powershell
# ❌ 잘못된 사용 (Bash 습관, PS에서 작동 안 함)
gemini -p "긴 프롬프트" \
  --output-format json

# ✅ 올바른 사용 (한 줄)
gemini -p "긴 프롬프트" --output-format json

# ✅ 또는 백틱(`) 사용
gemini -p "긴 프롬프트" `
  --output-format json
```

### 3. `>` 리다이렉션 주의

```powershell
# ⚠️ 가능하지만 줄 분리 시 깨질 수 있음
gemini -p "결과" > output.txt

# ✅ 권장: Out-File 사용
gemini -p "결과" | Out-File -Encoding utf8 output.txt

# ✅ 또는 변수 저장 후 파일 작성
$result = gemini -p "결과"
$result | Out-File -Encoding utf8 output.txt
```

---

## 안전한 PS 리다이렉션 패턴

### 파일 저장
```powershell
# UTF-8로 저장 (권장)
gemini -p "분석해줘" | Out-File -Encoding utf8 "outputs/gemini_result.txt"

# 또는
$output = gemini -p "분석해줘"
[System.IO.File]::WriteAllText("outputs/gemini_result.txt", $output, [System.Text.Encoding]::UTF8)
```

### 에러 캡처
```powershell
$result = gemini -p "명령" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Gemini CLI 실패: $result" -ForegroundColor Red
}
```

---

## settings.json 정책

**위치:** `~/.gemini/settings.json`

### 허용
- MCP 서버 설정 (팀 승인된 서버만)
- 모델 기본값 설정
- 출력 형식 기본값

### 금지
- API 키 저장 (`GEMINI_API_KEY`는 환경변수로만)
- 비밀 정보 저장
- 비승인 MCP 엔드포인트

### 예시 설정
```json
{
  "defaultModel": "gemini-2.5-pro",
  "outputFormat": "json",
  "mcpServers": {
    "github": {
      "command": "gh",
      "args": ["mcp"]
    }
  }
}
```

---

## make 없이 동등 명령

| make 타겟 | PowerShell 동등 명령 |
|----------|---------------------|
| `make gemini-docs` | `Select-String -Path 'docs/gemini-cli.md' -Pattern '^## '` |
| `make gemini-guardrail-check` | `powershell -NoProfile -ExecutionPolicy Bypass -File skills/gemini_cli_onboarding/src/validate_guardrails.ps1` |
| `make gemini-experiment` | 아래 스크립트 참조 |
| `make evidence PR=N` | `powershell -File tools/generate_evidence_strict.ps1 -PrNumber N` |

### gemini-experiment 동등 명령
```powershell
Write-Host "=== Gemini CLI 48h Experiment Checklist ==="
Write-Host ""
Write-Host "[Success Indicators]"
Write-Host "- [ ] make gemini-guardrail-check returns exit 0"
Write-Host "- [ ] outputs/oracle_excerpt_prN.md has exactly 10 headers"
Write-Host "- [ ] Headless mode produces valid JSON"
Write-Host "- [ ] No forbidden shell commands in audit log"
Write-Host "- [ ] FINAL_VERDICT contains 'Verdict: PASS'"
```

---

## 문제 해결

| 문제 | 해결 |
|------|------|
| `gemini: command not found` | `npm bin -g` 경로가 PATH에 있는지 확인 |
| `Authentication failed` | `$env:GEMINI_API_KEY` 설정 확인 |
| PowerShell 스크립트 실행 오류 | `-NoProfile -ExecutionPolicy Bypass` 추가 |
| 출력 깨짐 | `Out-File -Encoding utf8` 사용 |

