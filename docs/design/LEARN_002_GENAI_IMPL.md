# LEARN-002: GenAI Skills Implementation Plan

## 1. Objective
- Implement real (or realistic mock) generation logic for `physics_problem_generator`.
- Establish the **Open Responses** integration pattern via a shared PowerShell module.
- Enable toggleable providers: `Mock` (default, CI-safe) vs. `Gemini` (API key required).

## 2. Architecture

### 2.1 Shared Module: `skills/common/OpenResponses.psm1`
A reusable module to handle LLM requests cleanly.

```powershell
# Interface
function Invoke-OpenResponse {
    param(
        [string]$Provider = "Mock", # Mock, Gemini, OpenAI
        [string]$SystemPrompt,
        [string]$UserPrompt,
        [string]$OutputSchema # "json" or "text"
    )
    # Returns standardized object: { content, usage, provider_metadata }
}
```

### 2.2 Skill Implementation: `physics_problem_generator`
Updates `src/generate.ps1` to use `Invoke-OpenResponse`.

- **Flow**:
  1. Construct Prompt: "Create $Count physics problems about '$Topic'..."
  2. Call `Invoke-OpenResponse -Provider $Env:LLM_PROVIDER`
  3. Parse JSON Output.
  4. Save to `data/learn/problems.jsonl`.

### 2.3 Provider: Mock (Default)
Returns deterministic but varied data based on input hash, ensuring CI stability.
- **Why**: We cannot expose API keys in public CI.
- **Behavior**: If Topic="Newton", returns pre-canned "Newton's Apple" question.

## 3. Task List (SSoT)

1. **Create `skills/common`**: Shared library folder.
2. **Impl `OpenResponses.psm1`**: With Mock provider logic.
3. **Refactor `physics_problem_generator`**:
   - Import `OpenResponses`
   - Replace stub string manipulation with `Invoke-OpenResponse`.
4. **Validation**:
   - Run `tools/learn/run_daily.ps1` and verify `problems.jsonl` structure.

## 4. Verification
- `Get-Module -ListAvailable OpenResponses` must pass.
- `generate.ps1` must output valid JSONL.
- CI must pass (using Mock provider).
