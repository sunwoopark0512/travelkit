# OpenCode Canon v1.0 (SSoT)

**Status**: FINAL / LOCKED
**Source**: `oh-my-opencode` repo (v3.0.0-beta.8)
**Date**: 2026-01-17

## 1. Architecture & Runtime

### 1.1 Entry Point (`src/index.ts`)
The plugin initializes a comprehensive set of hooks and tools. It acts as an operating system layer over OpenCode.
- **Hooks**: `keyword-detector` (ulw), `sisyphus-orchestrator`, `ralph-loop`, `session-recovery`, `context-window-monitor`.
- **Tools**: `delegate_task`, `call_omo_agent`, `skill_mcp`, `interactive_bash`.
> **Citation**: `src/index.ts:81` "const OhMyOpenCodePlugin: Plugin = async (ctx) => {"

### 1.2 Agents (`src/agents/`)
Agents are defined with rigid roles and model bindings.
- **Sisyphus** (`orchestrator-sisyphus.ts`): Main orchestrator. Delegates work.
  - Model: `anthropic/claude-opus-4-5` (default)
  - Role: "You do NOT execute tasks yourself. You DELEGATE, COORDINATE, and VERIFY."
> **Citation**: `src/agents/orchestrator-sisyphus.ts:679`

- **Oracle** (`oracle.ts`): Strategic advisor. Read-only.
  - Model: `openai/gpt-5.2`
  - Restrictions: `write`, `edit`, `task`, `delegate_task` are DENIED.
> **Citation**: `src/agents/oracle.ts:6` "const DEFAULT_MODEL = 'openai/gpt-5.2'"
> **Citation**: `src/agents/oracle.ts:101` "const restrictions = createAgentToolRestrictions(['write', 'edit', 'task', 'delegate_task'])"

### 1.3 Control Hooks (`src/hooks/`)
- **Ultrawork (`ulw`)**: Triggered by `keyword-detector`. Sets logic variant to "max".
> **Citation**: `src/hooks/keyword-detector/index.ts:61` "const hasUltrawork = detectedKeywords.some((k) => k.type === 'ultrawork')"

- **Ralph Loop**: persistent execution loop until completion promise.
> **Citation**: `src/index.ts:503` "if (ralphLoop && input.tool === 'slashcommand') {"

## 2. Configuration Schema

### 2.1 Config Files
- Priority: `.opencode/oh-my-opencode.json` > User Config.
- Schema: Supported via JSONC.

### 2.2 Agent Config
Agents can be overridden in config:
```json
{
  "agents": {
    "oracle": { "model": "..." }
  }
}
```

## 3. Directory Structure
- `src/agents`: Agent definitions.
- `src/tools`: Tool implementations.
- `src/hooks`: Hook logic (control plane).
- `src/features`: Shared logic (context injection, skills).

## 4. Models (Canon Registry)
- **Orchestrator**: `anthropic/claude-opus-4-5`
- **Advisor**: `openai/gpt-5.2`
- **Frontend**: `google/gemini-3-pro-preview`
- **Librarian**: `opencode/glm-4.7-free`
- **Explore**: `opencode/grok-code` (or Gemini Flash/Haiku)
> **Citation**: `README.md:1240` (Supported by code in `src/agents/*.ts`)
