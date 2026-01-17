# OpenCode Control Playbook v1.0

**Status**: ACTIVE
**Usage**: Operational Guide for Sisyphus/Oracle/Antigravity

## 1. Operational Loop

### 1.1 Initiation
1.  **User Input**: Contains `ulw` or `ultrawork`.
2.  **System Action**: `keyword-detector` activates "Max Precision".
3.  **Role**: Sisyphus takes control (`orchestrator-sisyphus.ts`).

### 1.2 Orchestration (Sisyphus)
1.  **Analyze**: Read `todo_list_path` or create new plan with `TodoWrite`.
2.  **Delegate**: Use `delegate_task(category=..., prompt=...)`.
    -   *Visual*: `frontend-ui-ux-engineer`
    -   *Logic/Backend*: `business-logic` (Sisyphus directly or specialized subagent)
    -   *Research*: `explore` / `librarian` (Parallel)
3.  **Verify**: Run `lsp_diagnostics` and tests.
    -   **Rule**: "NO EVIDENCE = NOT COMPLETE" (`orchestrator-sisyphus.ts:471`)

### 1.3 Escalation (Oracle)
-   **Trigger**:
    -   Complex architecture.
    -   2+ failed fix attempts (`oracle.ts:15`).
    -   Security/Performance criticals.
-   **Action**: `call_omo_agent(agent="oracle", ...)`
-   **Output**: Recommendation only. Sisyphus must implement.

## 2. Model Routing Matrix

| Task Type | Model | Agent | Rationale |
|-----------|-------|-------|-----------|
| **Orchestration** | `anthropic/claude-opus-4-5` | Sisyphus | Max reasoning, context handling. |
| **Advisor/Logic** | `openai/gpt-5.2` | Oracle | High-IQ, zero-shot reasoning. |
| **Frontend/UI** | `google/gemini-3-pro-preview` | UI Agent | Creative, visual logic. |
| **Docs/Research** | `opencode/glm-4.7-free` | Librarian | Fast, cheap context gathering. |
| **Code Search** | `opencode/grok-code` | Explore | High speed pattern matching. |

> **Citation**: `README.md` and `src/agents/*.ts` default configs.

## 3. Failure Recovery Protocol (The "3 Strikes" Rule)
**Source**: `src/agents/orchestrator-sisyphus.ts:483`

1.  **Stop**: After 3 failed attempts, STOP edits.
2.  **Revert**: Usage git to revert to last known good state.
3.  **Document**: Record failure path.
4.  **Consult**: Call Oracle for analysis.

## 4. Evidence Bundle Requirements
Every completed task MUST include:
1.  **LSP Clean**: `lsp_diagnostics` returns 0 errors.
2.  **Build Pass**: `build` command exit code 0.
3.  **Test Pass**: Relevant tests pass.
4.  **Agent Verification**: Sisyphus confirms result matches prompt.
