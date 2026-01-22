# 🧭 Oracle Verification Checklist (SSoT)

> **Single Source of Truth**  
> 이 문서는 본 레포지토리에서 모든 작업의 **PASS / FAIL 최종 판정 기준**이다.  
> Oracle은 이 체크리스트에만 근거해 판단하며, 주관적 해석은 허용되지 않는다.

---

## 0. Oracle 기본 원칙

- **PASS의 유일 조건**: 본 체크리스트의 모든 필수 항목 충족
- **FAIL 우선 원칙**: 하나라도 불충족 시 즉시 FAIL
- **Fail as Data**: 실패는 기록 대상이며, 은폐·무시는 중대 위반
- **Scope Control**: Git 변경 범위가 가장 높은 위험 요소

---

## 1. Git 변경 범위 (Scope / Allowlist)

### 1.1 브랜치별 Allowlist

#### A. Hardlock / Feature 브랜치
허용 경로:
- `scripts/`
- `docs/`
- `web/dashboard/`
- `outputs/` *(Evidence 생성 시, 커밋 여부는 정책에 따름)*

금지 경로 (변경 시 즉시 FAIL):
- `tools/night_shift/`
- `tickets/`
- CI/CD, workflow, infra 관련 파일
- `new-backend/`
- 루트 설정 파일 (`.gitignore`, `mkdocs.yml` 등)

---

#### B. Night Shift / Ops 브랜치
허용 경로:
- `tools/night_shift/`
- `tickets/`

금지 경로 (변경 시 즉시 FAIL):
- `scripts/`
- `docs/`
- `web/`
- 애플리케이션 코드 전반

---

### 1.2 Git 상태 판정 규칙

- `git show --name-only --stat HEAD` 기준
- Allowlist 외 파일이 **1개라도 포함** → ❌ FAIL
- 커밋 메시지와 변경 파일 간 목적 불일치 → ❌ FAIL

---

## 2. Hardlock 기능 검증 (Code-Level)

### 2.1 필수 대상
- `scripts/export_cards.py`
- `scripts/local_content_batch.py`

### 2.2 필수 조건

#### Export 단계
- Tango Axis 카드 **정확히 5개**
- EP 포지션 **정확히 {1,2,3,4,5}**
- 중복, 누락, 비정수 값 → ❌ FAIL
- 검증 실패 시 **즉시 종료(SystemExit)**

#### Batch 단계
- `cluster_id = tango_axis` 미존재 시 → ❌ FAIL
- Export 결과를 선행 입력으로 사용
- Export 미실행 상태에서 Batch 실행 → ❌ FAIL

---

## 3. Evidence 정책

### 3.1 필수 Evidence 항목

- `hardlock_stdout.txt`
  - Export + Batch 실행 로그
  - Stack trace 없음
  - FAIL 로그 발생 시 이유 명시

- `hardlock_snapshot.txt`
  - 최종 카드 상태 스냅샷
  - EP1~EP5 매핑 확인 가능

### 3.2 Evidence 저장 규칙

- 기본 위치: `outputs/`
- `.gitignore`로 커밋 제외 가능
- 단, **Oracle 판정 시 실제 파일 존재는 필수**
- Evidence 미존재 → ❌ FAIL

---

## 4. Night Shift (Safe Ralph Loop) 검증

### 4.1 필수 파일 존재

다음 파일이 **HEAD 커밋에 반드시 포함**되어야 함:
- `tools/night_shift/safe_ralph.ps1`
- `tools/night_shift/oracle_gate_check.ps1`
- `tools/night_shift/pack_evidence.ps1`
- `tickets/*.json` 또는 `tickets/*.yaml`

하나라도 누락 → ❌ FAIL

---

### 4.2 Safe Ralph Loop 필수 설계 조건

- **Bounded Loop**
  - `max_iters` 또는 `max_hours` 명시
- **Oracle Gate**
  - 최신 PR 코멘트 또는 Evidence에서 `PASS`만 종료 조건
- **Fail Pattern Detection**
  - 동일 실패 반복 시 조기 종료
- **Evidence Pack**
  - 실행 로그 + git diff + 상태 요약 자동 수집

---

## 5. MkDocs / Landing Page 위치 판정

### 5.1 MkDocs 사용 여부 확인

- `mkdocs.yml` 존재 시:
  - Landing Page는 반드시 `docs/` 하위
  - 예시:
    - `docs/index.md` (메인)
    - `docs/landing.md` (보조)
  - `mkdocs.yml`의 `nav:` 항목에 명시되어야 함

- `mkdocs.yml` 미존재 시:
  - 정적 랜딩은 `docs/` 또는 `web/` 중 **단일 기준만 사용**
  - 브랜치 목적과 무관한 랜딩 추가 → ❌ FAIL

### 5.2 금지 사항

- Ops / Night Shift 브랜치에서 랜딩 수정
- Hardlock 브랜치에서 `new-backend/` 랜딩 수정
- 랜딩 파일이 Scope Allowlist 밖에 위치 → ❌ FAIL

---

## 6. Oracle 최종 판정 규칙

### PASS
- Allowlist 위반 없음
- 필수 파일/증거 존재
- Hardlock 또는 Night Shift 목적 달성
- Evidence 기반으로 재현 가능

### FAIL
- Scope 위반
- Evidence 부재
- 필수 파일 누락
- 목적과 다른 파일 변경

Oracle은 **PASS / FAIL + 사유 3줄 이내**만 출력한다.  
설명, 변명, 추정은 허용되지 않는다.

---

## 7. 종료 선언

- Oracle이 `PASS`를 출력한 시점에서 작업은 종료된다.
- 그 이전에 “완료”, “거의 됨”, “로컬에서는 됨”은 모두 무효다.

**Oracle PASS = DONE**
