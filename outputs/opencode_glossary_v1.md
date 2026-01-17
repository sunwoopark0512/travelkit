# OpenCode Glossary v1.0

**Status**: FINAL
**Context**: `oh-my-opencode` Control Plane

## 1. Roles (Agents)

### Sisyphus
**Definition**: The Master Orchestrator. The ONLY agent allowed to plan and delegate.
**Rule**: NEVER executes implementation tasks directly unless trivial. MUST delegate to subagents.
**Citation**: `src/agents/orchestrator-sisyphus.ts:671` "You are the MASTER ORCHESTRATOR"

### Oracle
**Definition**: The High-IQ Advisor. Read-only.
**Rule**: Invoked for architecture, complex debugging (2+ failures), and security. NEVER writes code directly.
**Citation**: `src/agents/oracle.ts:109` "Read-only consultation agent."

### Librarian
**Definition**: The External Knowledge Source.
**Rule**: Searches docs, GitHub, and OSS examples.
**Citation**: `README.md:1208`

## 2. Commands (Tools/Keywords)

### `ulw` (Ultrawork)
**Definition**: "Magic word" to engage maximum precision mode.
**Effect**: Triggers `keyword-detector` hook, sets `variant="max"`.
**Citation**: `src/hooks/keyword-detector/index.ts:61`

### `delegate_task`
**Definition**: The primary tool Sisyphus uses to dispatch work.
**Signature**: `delegate_task(category?, agent?, prompt)`
**Citation**: `src/agents/orchestrator-sisyphus.ts:699`

### `ralph_loop`
**Definition**: Self-healing execution loop.
**Trigger**: `/ralph-loop` slash command or `ulw` logic.
**Citation**: `src/index.ts:182`

## 3. States

### `in_progress`
**Definition**: Active task status in Todo Management.
**Rule**: Only ONE task can be `in_progress` at a time.
**Citation**: `src/agents/orchestrator-sisyphus.ts:560`

### `completed`
**Definition**: Finished task status.
**Rule**: Mark immediately after verification.
**Citation**: `src/agents/orchestrator-sisyphus.ts:561`
