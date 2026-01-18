# Gemini CLI Tools

Gemini CLI 운영을 위한 가드레일 및 검증 도구 모음.

## 파일 구조

```
tools/gemini/
├── README.md                    # 이 파일
├── guardrails.md                # 운영 규칙 20개
├── allowed_shell_commands.txt   # 허용 쉘 명령어 목록
└── validate_guardrails.ps1      # 가드레일 검증 스크립트
```

## 사용법

### 가드레일 검증

```bash
make gemini-guardrail-check
# 또는
powershell -NoProfile -ExecutionPolicy Bypass -File tools/gemini/validate_guardrails.ps1
```

### 문서 확인

```bash
make gemini-docs
```

## 관련 문서

- [Gemini CLI 통합 가이드](../../docs/gemini-cli.md)
- [OpenCode Canon v1](../../docs/opencode/opencode_canon_v1.md)
