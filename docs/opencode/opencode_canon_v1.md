# OpenCode Canon v1.0 (SSoT)

**Status**: FINAL / LOCKED
**Source**: `oh-my-opencode` repo (v3.0.0-beta.8)
**Date**: 2026-01-17

> **Citation Policy**: All claims must strictly follow `CLAIM | SOURCE | WHY` format.

## 1. Core Architecture (Immutable)

### 1.1 The Orchestrator (Sisyphus)
- **CLAIM**: Sisyphus is the **Master Orchestrator** who delegates work and NEVER executes implementation tasks directly (checks, builds, edits) if specialists are available. It manages the Todo list.
- **SOURCE**: `src/agents/orchestrator-sisyphus.ts` lines 671-679
  > "You are the MASTER ORCHESTRATOR... You do NOT execute tasks yourself. You DELEGATE, COORDINATE, and VERIFY."
- **WHY**: Separates "Planning/Verification" (Sisyphus) from "Execution" (Subagents), preventing context overload and hallucination.

### 1.2 The Advisor (Oracle)
- **CLAIM**: Oracle is a **Read-Only Consultation Agent** specialized in high-IQ reasoning, architecture, and debugging. It is explicitly RESTRICTED from writing code or running tasks.
- **SOURCE**: `src/agents/oracle.ts` lines 101-110
  > "const restrictions = createAgentToolRestrictions(['write', 'edit', 'task', 'delegate_task'])... Description: Read-only consultation agent."
- **WHY**: Ensures there is a "Judge" who cannot "Do", providing unbiased 3rd-party auditing and risk assessment.

### 1.3 The "Ultrawork" Trigger (ULW)
- **CLAIM**: The keyword `ultrawork` (or `ulw`) triggers a "Maximum Precision" mode (`variant: "max"`) in the system, actively intercepting the chat flow.
- **SOURCE**: `src/hooks/keyword-detector/index.ts` lines 61-66
  > "const hasUltrawork = detectedKeywords.some((k) => k.type === 'ultrawork')... output.message.variant = 'max'"
- **WHY**: Provides a canonical "Switch" to force the system into its highest performance state for complex tasks.

### 1.4 The Execution Loop (Ralph Loop)
- **CLAIM**: The system supports a persistent, self-healing execution loop (`ralph-loop`) accessible via slash command or internal logic, driven by a `completion-promise`.
- **SOURCE**: `src/index.ts` lines 503-527
  > "if (ralphLoop && input.tool === 'slashcommand')... ralphLoop.startLoop(sessionID, prompt, { completionPromise... })"
- **WHY**: Enables "Fire and Forget" autonomy where the agent continues working until a specific condition (Promise) is met.

## 2. Model Registry (Canon)

- **CLAIM**: The default configuration explicitly binds specific models to agents, not generic ones.
- **SOURCE**: `src/agents/*.ts` (Default Configs)
  - **Sisyphus**: `anthropic/claude-opus-4-5` (`orchestrator-sisyphus.ts`) -> *Reasoning & Planning*
  - **Oracle**: `openai/gpt-5.2` (`oracle.ts:6`) -> *Pure Logic & Clean Code*
  - **Frontend**: `google/gemini-3-pro-preview` (`frontend-ui-ux-engineer.ts`) -> *Visual Context*
  - **Librarian**: `opencode/glm-4.7-free` The default cheap searcher.
- **WHY**: "Right Model for Right Task" optimization. Expensive models only for Orchestration/Judging; Fast models for search/drafting.

## 3. Evidence & Governance

- **CLAIM**: "No Evidence, No Claim" is enforced by the system structure. Tasks are not complete without verification.
- **SOURCE**: `src/agents/orchestrator-sisyphus.ts` lines 463-471
  > "Evidence Requirements... NO EVIDENCE = NOT COMPLETE. SUBAGENTS LIE - VERIFY EVERYTHING."
- **WHY**: Prevents the "Lazy Agent" problem where tasks are marked done without actual execution. This is the foundation of the "Strict Evidence Bundle".
