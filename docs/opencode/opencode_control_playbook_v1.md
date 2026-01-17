# OpenCode Control Playbook v1.0

**Status**: ACTIVE
**Source**: `oh-my-opencode` repo
**Citation Style**: `CLAIM | SOURCE | WHY`

## 1. Operational Loop (ULW Cycle)

### 1.1 Initiation
- **Trigger**: User inputs `ulw` or `ultrawork`.
- **System Response**: `keyword-detector` hook sets `variant="max"`.
- **Control**: Passed to **Sisyphus**.

### 1.2 Orchestration (Sisyphus)
- **Start**: `TodoWrite` to plan atomic steps (`orchestrator-sisyphus.ts:558`).
- **Delegate**: `delegate_task` to `frontend-ui-ux`, `explore`, or `librarian`.
- **Loop**: `ralph-loop` ensures continuous execution (~ `src/index.ts:503`).
- **Verify**: `lsp_diagnostics` + `build` + `test`.

### 1.3 Escalation (Oracle)
- **Condition**: "After 3 failed attempts, STOP edits" (`orchestrator-sisyphus.ts:483`).
- **Action**: `call_omo_agent(agent="oracle")`.
- **Output**: Analysis ONLY. No code.

## 2. API Standard (Strict Bundle)

Every PR MUST generate `outputs/evidence_bundle_prN.txt` with these **10 Mandatory Headers**:

1.  `[EVIDENCE] CHECKS_SNAPSHOT (STRICT)`
2.  `[EVIDENCE] LATEST_RUN_META`
3.  `[EVIDENCE] DIFF_AFTER (Scope)`
4.  `[EVIDENCE] ROLE_CONTRACT_LEDGER_RULE_EXCERPT` (or PASS_NA)
5.  `[EVIDENCE] PROJECT_OVERVIEW_MD`
6.  `[EVIDENCE] PROJECT_LEDGER_MD`
7.  `[EVIDENCE] AIRTABLE_SYNC_LOG`
8.  `[EVIDENCE] STICKY_VERIFY`
9.  `[EVIDENCE] COMMAND_LOG`
10. `[EVIDENCE] FINAL_VERDICT`

## 3. Failure Recovery Protocol (3 Strikes)

- **CLAIM**: Stop independent editing after 3 failures.
- **SOURCE**: `src/agents/orchestrator-sisyphus.ts` lines 483-490
  > "After 3 Consecutive Failures: 1. STOP... 2. REVERT... 3. DOCUMENT... 4. CONSULT Oracle"
- **WHY**: Prevents "Shotgun Debugging" (random changes hoping something works), preserving code integrity.

## 4. Model Routing Matrix (Standard)

| Task | Agent | Model | Rationale |
|------|-------|-------|-----------|
| Orchestration | Sisyphus | `claude-opus-4-5` | Max context/reasoning. |
| Logic/Audit | Oracle | `gpt-5.2` | Zero-shot logic, bias check. |
| View/UI | Frontend | `gemini-3-pro` | Multimodal UI understanding. |
| Search | Explore | `grok-code` | High throughput grep/nav. |
| Docs | Librarian | `glm-4.7-free` | Low cost web/doc search. |

> **Citation**: Derived from `src/agents/*.ts` defaults.
