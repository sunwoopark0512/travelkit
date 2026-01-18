# TravelKit Project Context

> Gemini CLI 컨텍스트 파일 - 정책 전용, 비밀 정보 금지

## Role

Terminal assistant for TravelKit × OpenCode × ULW × Oracle project.
Do not change code outside `docs/**`, `tools/**`, and `outputs/**`.

## Strict Evidence Constraints

- All PRs require exactly 10 Evidence Headers
- FINAL_VERDICT must contain `Verdict: ✅ PASS` or `Verdict: ❌ FAIL`
- Evidence output path: `outputs/oracle_excerpt_prN.md`

## Output Path Conventions

| File Type | Path |
|-----------|------|
| Evidence Bundle | `outputs/evidence_bundle_prN.txt` |
| Oracle Excerpt | `outputs/oracle_excerpt_prN.md` |
| Validation JSON | `outputs/strict_evidence_validate_prN.json` |

## Guardrails Reference

See `tools/gemini/guardrails.md` for full rules.

**Key restrictions:**
- Shell commands: Only those in `tools/gemini/allowed_shell_commands.txt`
- File modifications: Only `docs/**`, `tools/**`, `outputs/**`
- No app code changes: `new-backend/**`, `last-mini-program/**` read-only

## MCP Policy

- Allowlisted MCP servers only (team-approved)
- No public/untrusted MCP endpoints
- MCP must not widen write access beyond repo governance rules
