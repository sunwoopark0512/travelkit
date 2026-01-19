# Contributing (TravelKit)

## SSoT (Single Source of Truth)
- **모든 작업 지시는 GitHub Issue로만 존재한다.**
- Notion/Slack/DM은 참고일 뿐이며, 실행 단위는 항상 Issue다.

## Workflow (표준)
1) Issue 생성
- 라벨 필수: `status:*`, `agent:*`, `type:*`, `priority:*`
- 본문 필수: Description / Acceptance Criteria / Output Artifact / Trigger to Start

2) Status 전이(라벨로만)
- `status:backlog`  `status:doing`  `status:done`
- 막힘: `status:blocked` (사유/해제 조건을 댓글로 기록)

3) PR 생성
- PR 본문에 반드시 **`Closes #N` 또는 `Fixes #N`** 포함
- PR 템플릿 체크리스트 충족 후 리뷰 요청

4) Done 처리
- Acceptance Criteria가 PASS여야 `status:done`
- 필요 시 issue close + 완료 코멘트 첨부

## Label 규칙
- Agent: `agent:chatgpt | agent:opencode | agent:antigravity`
- Status: `status:backlog | status:doing | status:done | status:blocked`
- Type: `type:design | type:governance | type:architecture`
- Priority: `priority:p0 | priority:p1 | priority:p2`

## Security (Hard Rules)
- **토큰/키/개인정보(PII)를 Issue/PR/로그/스크린샷에 절대 포함하지 않는다.**
- 환경변수로 주입하고, 로그에는 항상 마스킹한다.
- 쉘 실행이 필요한 Task는 명령 목록/범위/중단 조건을 명시하고, 필요 시 HITL 승인 지점을 둔다.

## Validator / Evals (초안)
- 변경이 크거나 에이전트 자동화가 개입되면, 최소한:
  - 재현 스텝
  - 통과 기준
  - 회귀 체크(핵심 3케이스)
  를 Issue/PR에 남긴다.

## Canonical reference
- 운영 헌법 및 시스템 규칙은 `GEMINI.md`를 기준으로 한다.