# Gemini CLI Integration Guide

> TravelKit × OpenCode × ULW × Oracle 프로젝트를 위한 로컬 터미널 AI 에이전트 가이드

---

## Install

### Pre-requisites
- Node.js 20 or higher
- Windows / macOS / Linux

### Quick Install

```bash
# npm 글로벌 설치 (권장)
npm install -g @google/gemini-cli

# 또는 npx로 즉시 실행
npx @google/gemini-cli

# 버전 확인
gemini --version
```

### Release Tags
- `@latest` - 안정 버전 (권장)
- `@preview` - 주간 프리뷰
- `@nightly` - 일일 빌드

---

## Authenticate

### Option 1: Google Login (권장)

```bash
gemini
# "Login with Google" 선택 → 브라우저 인증
```

**Benefits:**
- Free tier: 60 req/min, 1,000 req/day
- Gemini 2.5 Pro (1M token context)
- No API key management

### Option 2: API Key

```bash
export GEMINI_API_KEY="YOUR_API_KEY"
gemini
```

### Option 3: Vertex AI (Enterprise)

```bash
export GOOGLE_API_KEY="YOUR_API_KEY"
export GOOGLE_GENAI_USE_VERTEXAI=true
gemini
```

---

## Project Context via GEMINI.md

Gemini CLI는 프로젝트 루트의 `GEMINI.md` 파일을 자동으로 로드하여 컨텍스트로 사용합니다.

### 위치
```
TravelKit_Final/
├── GEMINI.md          # 프로젝트 규칙 (자동 로드)
├── docs/
└── tools/
```

### 규칙
- **정책 전용**: Canon/guardrails/output paths만 포함
- **비밀 정보 금지**: API 키, 토큰, 비밀번호 절대 포함 금지
- **짧게 유지**: 핵심 규칙만 간결하게

### 예시 내용

```markdown
# TravelKit Context

## Role
Terminal assistant for TravelKit × OpenCode project.
Do not change code outside docs/**, tools/**, outputs/**.

## Strict Evidence Constraints
- All PRs require exactly 10 Evidence Headers
- FINAL_VERDICT must contain "Verdict: ✅ PASS"
```

---

## Guardrails

이 저장소는 터미널 에이전트의 안전하고 예측 가능한 운영을 위해 가드레일을 시행합니다.

### 가드레일 파일

| 파일 | 용도 |
|------|------|
| `tools/gemini/guardrails.md` | 사람용 규칙 |
| `tools/gemini/allowed_shell_commands.txt` | 허용 명령어 목록 |
| `skills/gemini_cli_onboarding/src/validate_guardrails.ps1` | 검증 스크립트 |

### Non-negotiables

1. **Repo root에서만 실행**
2. **비밀 정보 프롬프트에 붙여넣기 금지**
3. **허용 목록 외 쉘 명령 실행 금지**
4. **허용 경로 외 쓰기 금지**: `docs/**`, `tools/**`, `outputs/**`만 허용
5. **앱/백엔드 코드 수정 금지**

### 허용 쉘 명령어

전체 목록: `tools/gemini/allowed_shell_commands.txt`

```
git status
git diff
git log
gh pr view
gh pr comment
powershell -NoProfile
make gemini-docs
make gemini-guardrail-check
```

### MCP 정책

- 팀 승인 MCP 서버만 허용
- 공개/비신뢰 MCP 엔드포인트 금지
- MCP는 최소 권한으로 제한

---

## Output paths

### Evidence 출력 경로 규칙

| 파일 유형 | 경로 |
|----------|------|
| Evidence Bundle | `outputs/evidence_bundle_prN.txt` |
| Oracle Excerpt | `outputs/oracle_excerpt_prN.md` |
| Validation JSON | `outputs/strict_evidence_validate_prN.json` |
| Gemini Run Log | `outputs/gemini_runlog.txt` |

### Strict Evidence (10 Headers)

```
1. [EVIDENCE] CHECKS_SNAPSHOT (STRICT)
2. [EVIDENCE] LATEST_RUN_META
3. [EVIDENCE] DIFF_AFTER (Scope)
4. [EVIDENCE] ROLE_CONTRACT_LEDGER_RULE_EXCERPT
5. [EVIDENCE] PROJECT_OVERVIEW_MD
6. [EVIDENCE] PROJECT_LEDGER_MD
7. [EVIDENCE] AIRTABLE_SYNC_LOG
8. [EVIDENCE] STICKY_VERIFY
9. [EVIDENCE] COMMAND_LOG
10. [EVIDENCE] FINAL_VERDICT
```

### Gemini CLI로 Evidence 생성

```bash
gemini -p "PR13의 Strict Evidence 10 Headers를 생성하고 outputs/oracle_excerpt_pr13.md에 저장" --output-format json
```

---

## Experiment criteria

### 48시간 실험 기준

#### 성공 지표 (모두 관찰 가능해야 함)

- [ ] `make gemini-guardrail-check`가 clean repo에서 exit 0 반환
- [ ] `docs/gemini-cli.md`가 존재하고 모든 필수 섹션 포함
- [ ] `outputs/oracle_excerpt_prN.md`가 Strict Evidence 제약 충족 (10 headers + FINAL_VERDICT)
- [ ] 실험 중 `docs/**`, `tools/**`, `outputs/**` 외 파일 쓰기 없음
- [ ] 문서화된 단계만으로 워크플로 재현 가능

#### 실패 패턴

- [ ] 허용 목록에 없는 쉘 명령 실행 시도
- [ ] `docs/**`, `tools/**`, `outputs/**` 외 경로에 쓰기
- [ ] Excerpt에 FINAL_VERDICT 누락 또는 헤더 개수 오류
- [ ] 프롬프트/로그/생성 파일에 비밀 정보 노출
- [ ] 알 수 없는 엔드포인트 또는 광범위 도구 접근으로 MCP 구성

### 실험 체크리스트

```bash
# Step 1: 가드레일 검증
make gemini-guardrail-check

# Step 2: Evidence 생성
make evidence PR=14

# Step 3: 파일 변경 확인
git status

# Step 4: 결과 보고서 저장
outputs/gemini_experiment_report.md
```

---

## Makefile helpers

```bash
make gemini-docs            # 문서 섹션 목록 출력
make gemini-guardrail-check # 가드레일 검증 실행
make gemini-experiment      # 실험 체크리스트 출력
```

---

## Quick Fixes (즉시 문제 3개 해결)

### 1. Verdict 정규식 미매치

**원인:** 검증 패턴이 `Verdict: PASS`만 허용인데, 실제는 `Verdict: ✅ PASS`

**처방 (정규식):**
```powershell
# 이모지 허용 정규식
$pattern = '^Verdict:\s*(✅\s*)?PASS(\s*\(.*\))?\s*$'
# 또는 FAIL 포함
$pattern = '^Verdict:\s*(✅|❌)?\s*(PASS|FAIL)'

# 검증 예시
$content = Get-Content "outputs/oracle_excerpt_pr9.md" -Raw
if ($content -match 'Verdict:\s*(✅\s*)?PASS') {
    Write-Host "✅ Verdict PASS 확인됨" -ForegroundColor Green
}
```

### 2. gemini 인증 에러 (code 41)

**원인:** Gemini CLI는 non-interactive에서 인증 환경변수/설정이 없으면 에러로 종료

**처방 (환경변수 설정):**
```powershell
# Option A: Gemini API Key
$env:GEMINI_API_KEY = "your-api-key-here"
gemini -p "Hello"

# Option B: Vertex AI
$env:GOOGLE_API_KEY = "your-api-key"
$env:GOOGLE_GENAI_USE_VERTEXAI = "true"
gemini -p "Hello"

# Option C: 인터랙티브 로그인 (1회)
gemini
# "Login with Google" 선택 → 브라우저 인증
```

### 3. Windows에서 make 없음

**원인:** 기본 Windows 환경에는 `make`가 없음

**처방 (PowerShell 직접 실행):**

| make 타겟 | PowerShell 동등 명령 |
|----------|---------------------|
| `make gemini-docs` | `Select-String -Path 'docs/gemini-cli.md' -Pattern '^## '` |
| `make gemini-guardrail-check` | `powershell -NoProfile -ExecutionPolicy Bypass -File skills/gemini_cli_onboarding/src/validate_guardrails.ps1` |
| `make gemini-experiment` | 아래 스크립트 참조 |
| `make evidence PR=N` | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/generate_evidence_strict.ps1 -PrNumber N` |

**gemini-experiment 동등 명령:**
```powershell
Write-Host "=== Gemini CLI 48h Experiment Checklist ===" -ForegroundColor Cyan
Write-Host "[Success Indicators]"
Write-Host "- [ ] validate_guardrails.ps1 exits 0"
Write-Host "- [ ] outputs/oracle_excerpt_prN.md has exactly 10 headers"
Write-Host "- [ ] Headless mode produces valid JSON"
Write-Host "- [ ] FINAL_VERDICT contains 'Verdict: PASS'"
```

---

## Troubleshooting

| 문제 | 해결 |
|------|------|
| `gemini: command not found` | npm global bin이 PATH에 있는지 확인 |
| 인증 문제 | `gemini` 재실행 후 로그인 |
| Windows PowerShell | `.ps1` 스크립트 실행 시 `powershell -NoProfile` 사용 |

---

## Architecture Fit

```
┌─────────────────────────────────────────────────────────────┐
│                    TravelKit System                          │
├────────────────┬────────────────┬───────────────────────────┤
│   Gemini CLI   │  OpenCode CLI  │   Oracle (Read-Only)      │
│   = 로컬 실행자 │  = 오케스트레이션│   = 판정자                 │
├────────────────┴────────────────┴───────────────────────────┤
│          Evidence Bundle = PR 코멘트 아카이브                 │
│          outputs/ = 실행 산출물 디렉토리                      │
└─────────────────────────────────────────────────────────────┘
```

---

## References

- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli)
- [Official Docs](https://github.com/google-gemini/gemini-cli/tree/main/docs)

