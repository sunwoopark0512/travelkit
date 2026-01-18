---
description: "Strict Evidence 10 헤더 + FINAL_VERDICT 형식 검증/생성/리그레션 체크에 사용"
---

# TravelKit Strict Evidence Skill

## 목적
PR 증거 번들이 OpenCode Canon의 Strict Evidence 형식을 준수하는지 검증하고 생성합니다.

---

## 10 헤더 형식 (고정 순서)

```
--- [EVIDENCE] CHECKS_SNAPSHOT (STRICT) ---
--- [EVIDENCE] LATEST_RUN_META ---
--- [EVIDENCE] DIFF_AFTER (Scope) ---
--- [EVIDENCE] ROLE_CONTRACT_LEDGER_RULE_EXCERPT ---
--- [EVIDENCE] PROJECT_OVERVIEW_MD ---
--- [EVIDENCE] PROJECT_LEDGER_MD ---
--- [EVIDENCE] AIRTABLE_SYNC_LOG ---
--- [EVIDENCE] STICKY_VERIFY ---
--- [EVIDENCE] COMMAND_LOG ---
--- [EVIDENCE] FINAL_VERDICT ---
```

---

## FINAL_VERDICT 규칙

**허용되는 형식:**
```
Verdict: ✅ PASS
Verdict: ❌ FAIL (See above for details)
```

**검증 정규식 (PowerShell):**
```powershell
# 이모지 허용 정규식
$pattern = '^Verdict:\s*(✅|❌)?\s*(PASS|FAIL)'
$content -match $pattern
```

---

## 표준 경로

| 파일 유형 | 경로 |
|----------|------|
| Evidence Bundle | `outputs/evidence_bundle_prN.txt` |
| Oracle Excerpt | `outputs/oracle_excerpt_prN.md` |
| PR 코멘트 소스 | `outputs/oracle_excerpt_prN.md` (이 파일을 `gh pr comment --body-file`로 업로드) |

---

## 증거 생성 (PowerShell, make 의존 없음)

```powershell
# PR 번호 지정
$pr = 14

# Evidence 생성
powershell -NoProfile -ExecutionPolicy Bypass -File tools/generate_evidence_strict.ps1 `
  -PrNumber $pr `
  -OutputFile "outputs/evidence_bundle_pr$pr.txt" `
  -OracleExcerpt "outputs/oracle_excerpt_pr$pr.md"

# 헤더 개수 검증
(Select-String -Path "outputs/oracle_excerpt_pr$pr.md" -Pattern '^\-\-\- \[EVIDENCE\]' -AllMatches).Matches.Count
# 예상: 10

# FINAL_VERDICT 확인
Select-String -Path "outputs/oracle_excerpt_pr$pr.md" -Pattern '^Verdict:'
```

---

## 검증 체크리스트

### 헤더 카운트 검증
```powershell
$count = (Select-String -Path "outputs/oracle_excerpt_pr$pr.md" -Pattern '^\-\-\- \[EVIDENCE\]' -AllMatches).Matches.Count
if ($count -ne 10) {
    Write-Host "❌ FAIL: Header count is $count (expected 10)" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Header count: 10" -ForegroundColor Green
```

### FINAL_VERDICT 존재 검증
```powershell
$hasVerdict = Select-String -Path "outputs/oracle_excerpt_pr$pr.md" -Pattern '^\-\-\- \[EVIDENCE\] FINAL_VERDICT' -Quiet
if (-not $hasVerdict) {
    Write-Host "❌ FAIL: FINAL_VERDICT section missing" -ForegroundColor Red
    exit 1
}
Write-Host "✅ FINAL_VERDICT section exists" -ForegroundColor Green
```

### PASS/FAIL 검증
```powershell
$verdictLine = Select-String -Path "outputs/oracle_excerpt_pr$pr.md" -Pattern '^Verdict:' | Select-Object -Last 1
if ($verdictLine -match 'PASS') {
    Write-Host "✅ Verdict: PASS" -ForegroundColor Green
} elseif ($verdictLine -match 'FAIL') {
    Write-Host "❌ Verdict: FAIL" -ForegroundColor Red
}
```

---

## 실패 분기

| 실패 유형 | 원인 | 해결책 |
|----------|------|--------|
| 헤더 10개 초과 | 중첩된 `[EVIDENCE]` 블록 | `Sanitize-EmbeddedEvidence` 함수로 변환 |
| 헤더 10개 미만 | 섹션 누락 | `generate_evidence_strict.ps1` 검토 |
| FINAL_VERDICT 누락 | 스크립트 오류 | 스크립트 마지막 섹션 확인 |
| 오프스코프 변경 | `docs/**`, `tools/**` 외 파일 수정 | DIFF_AFTER 섹션 검토, 잘못된 파일 제거 |

---

## PR 코멘트 업로드

```powershell
# oracle_excerpt를 PR 코멘트로 업로드
gh pr comment $pr --body-file "outputs/oracle_excerpt_pr$pr.md"

# 업로드 후 서버 검증
gh pr view $pr --json comments --jq '.comments[-1].body' > "outputs/latest_comment_pr$pr.txt"
(Select-String -Path "outputs/latest_comment_pr$pr.txt" -Pattern '^\-\-\- \[EVIDENCE\]' -AllMatches).Matches.Count
```
