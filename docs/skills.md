# TravelKit Skills 운영 규칙 (Local-only)

> 에이전트 스킬 관리를 위한 로컬 레지스트리 시스템

---

## Skills란?

- Skills는 폴더 + `SKILL.md`(YAML frontmatter + 본문)로 구성된 **재사용 가능한 작업 규칙 패키지**
- 에이전트는 대화 시작 시 skill의 **description** 목록을 먼저 보고, 관련 있으면 SKILL.md 전체를 읽고 따름 (Progressive disclosure)

---

## 디렉토리 구조

```
TravelKit_Final/
├── .agent/skills/                    # 승인된 스킬
│   ├── travelkit-strict-evidence/
│   │   └── SKILL.md
│   └── travelkit-gemini-cli/
│       └── SKILL.md
├── .agent/skills-external/           # 외부 반입 (검토용, 임시)
└── tools/skills/                     # 레지스트리 + 도구
    ├── registry.json                 # SSoT
    ├── validate_skills.ps1           # 검증 게이트
    ├── list.ps1                      # 목록
    ├── search.ps1                    # 검색
    └── score_skills.ps1              # 점수 산출
```

---

## 품질 시그널 (R/E/W 점수, 0-5)

| 점수 | 의미 |
|------|------|
| **Risk** | network/shell/write scope가 넓을수록 ↑ |
| **Evidence** | 검증 규칙/출력 포맷/리그레션 체크가 있으면 ↑ |
| **Windows** | PowerShell-first, make 불필요, 경로/인코딩 주의 있으면 ↑ |

---

## 외부 스킬 도입 프로세스

1. **반입**: 외부 레포/SkillsMP 출처를 기록하고 `.agent/skills-external/`에 복사
2. **라이선스 확인**: 원본 레포 LICENSE 확인 후 registry에 기록
3. **스코프 라벨링**: read/write 경로, network, shell 여부를 명시
4. **검증**: `tools/skills/validate_skills.ps1`를 통과해야 함
5. **승격**: `.agent/skills/`로 이동 + `tools/skills/registry.json` 등록

---

## 금지사항

- ❌ 라이선스 불명확한 스킬
- ❌ write scope가 전체(`**/*`)인 스킬
- ❌ 네트워크/쉘 실행이 필요한데 guardrails가 없는 스킬
- ❌ registry에 등록 없이 `.agent/skills/`에 직접 추가

---

## 사용법

```powershell
# 스킬 목록
powershell -NoProfile -ExecutionPolicy Bypass -File tools/skills/list.ps1

# 스킬 검색
powershell -NoProfile -ExecutionPolicy Bypass -File tools/skills/search.ps1 -Query "evidence"

# 점수 산출 (참고용)
powershell -NoProfile -ExecutionPolicy Bypass -File tools/skills/score_skills.ps1

# 검증 게이트
powershell -NoProfile -ExecutionPolicy Bypass -File tools/skills/validate_skills.ps1
```

---

## 관련 문서

- [Gemini CLI Guide](gemini-cli.md)
- [OpenCode Canon](opencode/opencode_canon_v1.md)
