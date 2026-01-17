# Oh-My-OpenCode Deep Summary (SSoT)

**Version**: v3.0.0-beta.8
**Analysis Date**: 2026-01-17

## 1. Repository Structure
The `oh-my-opencode` repository acts as an "Operating System" for AI agents within the OpenCode environment.

- **`src/index.ts`**: The main entry point. Initializes all hooks and tools.
- **`src/agents/`**: Defines the persona and capabilities of each agent.
    - `orchestrator-sisyphus.ts`: The Master Orchestrator.
    - `oracle.ts`: The Read-Only Advisor.
    - `librarian.ts`, `explore.ts`, `frontend-ui-ux-engineer.ts`: Specialist subagents.
- **`src/hooks/`**: The "Control Plane". Intercepts messages and events to enforce rules.
    - `keyword-detector`: Detects `ulw` triggers.
    - `sisyphus-orchestrator`: Manages the main task loop.
    - `ralph-loop`: Implements the persistent execution loop.
    - `session-recovery`, `context-window-monitor`: Stability features.
- **`src/tools/`**: Implementation of agent capabilities.
    - `delegate_task`: The primary mechanism for Sisyphus to dispatch work.
    - `interactive_bash`: Terminal execution.
    - `call_omo_agent`: Direct agent-to-agent communication.

## 2. Core Modules & execution Flow

### 2.1 The "Ultrawork" (ULW) Trigger
1.  User sends `ulw` or `ultrawork` keyword.
2.  `src/hooks/keyword-detector/index.ts` intercepts this.
3.  Sets the session variant to `"max"` (Maximum Precision).
4.  Optionally triggers `ralph-loop` for continuous execution.

### 2.2 Sisyphus Orchestration
- Sisyphus is defined in `src/agents/orchestrator-sisyphus.ts`.
- It is explicitly instructed **NOT** to implement code directly if specialists are available.
- It uses `delegate_task` to spawn sub-agents for UI, Research, or Logic.
- It creates and manages a Todo list (`TodoWrite`).

### 2.3 Oracle Governance
- Oracle is defined in `src/agents/oracle.ts`.
- It acts as a high-IQ consultant (GPT-5.2 level).
- RESTRICTED tools: `write`, `edit`, `task`, `delegate_task`.
- Used for: Architecture decisions, strict auditing, and breaking "failure loops".

## 3. Configuration
- Config loading handled in `src/plugin-config.ts`.
- Supports `.opencode/oh-my-opencode.json` overrides.
- Allows customizing models per agent (e.g., swapping `oracle` to `gpt-4o`).

## 4. Failure & Recovery
- **Session Recovery**: `src/hooks/session-recovery/` attempts to fix context validation errors.
- **Edit Error Recovery**: `src/hooks/edit-error-recovery/` handles distinct file edit failures.
- **Ralph Loop**: Can fail, but is designed to retry or ask for clarification based on `maxIterations`.
