# Gemini CLI Guardrails (TravelKit/OpenCode)

> These rules apply whenever Gemini CLI is used as a terminal agent in this repo.

---

## Non-negotiables

1. **Run from repo root only.**
2. **Never paste secrets** (API keys, tokens, passwords) into prompts.
3. **Never execute shell commands outside the approved allowlist.**
4. **Never write outside:** `docs/**`, `tools/**`, `outputs/**`.
5. **Never modify app/backend code** in this repo for Gemini CLI onboarding work.
6. **Prefer headless output** (`--output-format json`) when scripting.
7. **Any PR comment artifact** must be saved to `outputs/oracle_excerpt_pr<PR>.md` before posting.

---

## Strict Evidence compatibility

8. If drafting Strict Evidence excerpts: ensure **exactly 10 `--- [EVIDENCE]` headers** and include **FINAL_VERDICT**.
9. Do not introduce nested `--- [EVIDENCE]` sequences in docs (avoid format pollution).

---

## Logging (recommended)

10. Append each `gemini` invocation (command line only, no secrets) to `outputs/gemini_runlog.txt`.
11. If a command requires human approval, capture the prompt text to `outputs/gemini_human_prompt.log` (no secrets).

---

## MCP policy (optional feature)

12. MCP servers must be **team-approved** and configured in user home config only (`~/.gemini/settings.json`).
13. Do not connect to public/untrusted MCP endpoints.
14. If MCP is used, restrict tools to **least privilege**.

---

## Hygiene

15. Keep prompts short and command-like.
16. Prefer generating diffs/patches rather than editing many files directly.
17. Re-run `make gemini-guardrail-check` after doc changes.
18. If uncertain, **stop and request a human review** before executing anything risky.

---

## Write Scope Constraints

**Allowed write paths:**
- `docs/**` - 문서
- `tools/**` - 도구/스크립트
- `outputs/**` - 실행 산출물

**Forbidden write paths:**
- `new-backend/**` - 백엔드 코드
- `last-mini-program/**` - 미니프로그램 코드
- `apps/**` - 앱 코드
- Root config files without approval

---

## Violation Response

| 위반 유형 | 조치 |
|----------|------|
| 금지 명령 실행 | 즉시 중단, 이력 검토 |
| 허용 외 파일 수정 | `git checkout`으로 복원 |
| Evidence 헤더 오류 | 재생성 후 PR 코멘트 갱신 |
| 비밀 정보 노출 | 즉시 보고, 키 교체 |

---

## Validation

```bash
make gemini-guardrail-check
# OR
powershell -NoProfile -ExecutionPolicy Bypass -File skills/gemini_cli_onboarding/src/validate_guardrails.ps1
```

