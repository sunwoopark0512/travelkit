# OpenCode Glossary v1.0

**Status**: FINAL / LOCKED
**Context**: `oh-my-opencode` Control Plane & Project Standards

## 1. Artifacts (Required Outputs)

- **CANON** (`docs/opencode/opencode_canon_v1.md`)
  - **Definition**: The immutable laws (R1-R5), Architecture, and Model definitions.
  - **Source**: Derived from `src/agents/*.ts` and `src/hooks/*.ts`.

- **GLOSSARY** (`docs/opencode/opencode_glossary_v1.md`)
  - **Definition**: The controlled dictionary of Commands, States, and Roles.
  - **Purpose**: "Ambiguity Reduction" in Agent-to-Agent communication.

- **PLAYBOOK** (`docs/opencode/opencode_control_playbook_v1.md`)
  - **Definition**: Operational procedures, "3-Strikes" Failure Protocol (`orchestrator-sisyphus.ts:483`), and Evidence Standards.

- **EVIDENCE_BUNDLE** (`outputs/evidence_bundle_prN.txt`)
  - **Definition**: A verifiable text file containing 10 Standard Headers verifying PR integrity.
  - **Rule**: Must be attached to PR via `--body-file`.

## 2. States (Lifecycle)

- **PENDING**: Work started, evidence accumulating.
- **PASS**: All checks green, strict evidence attached, Oracle verified.
- **FAIL**: Any check red, evidence missing, or Oracle rejection.
- **PASS_NA**: Skipped check with explicit reason and "No-Op" proof.
- **LOCKED**: Standard/Doc is finalized. Changes require formal PR.

## 3. Verbs (Commands)

- **ULW (Ultrawork)**
  - **Definition**: "Magic word" engaging `keyword-detector` (`variant='max'`).
  - **Action**: Loop `Context` -> `Plan` -> `Execute` -> `Verify` -> `Bundle` -> `Verdict` until PASS.

- **EVIDENCE_FIRST**
  - **Definition**: Principle of collecting logs/state *before* attempting fixes.

- **STRICT_BUNDLE**
  - **Definition**: Generating the evidence file with the Mandatory 10 Headers:
    1. CHECKS_SNAPSHOT
    2. LATEST_RUN_META
    3. DIFF_AFTER
    4. ROLE_CONTRACT_EXCERPT
    5. PROJECT_OVERVIEW
    6. PROJECT_LEDGER
    7. AIRTABLE_SYNC_LOG
    8. STICKY_VERIFY
    9. COMMAND_LOG
    10. FINAL_VERDICT

## 4. Roles (Agents)

- **Sisyphus** (`orchestrator-sisyphus.ts`)
  - **Type**: Orchestrator (Write/Plan)
  - **Rule**: "You do NOT execute tasks yourself... DELEGATE."

- **Oracle** (`oracle.ts`)
  - **Type**: Advisor (Read-Only)
  - **Rule**: "Read-only consultation agent... High-IQ reasoning."

- **Librarian** (`librarian.ts`)
  - **Type**: Researcher
  - **Rule**: "Reference Grep (External)... Search docs/OSS."

- **Explore** (`explore.ts`)
  - **Type**: Code Searcher
  - **Rule**: "Contextual Grep (Internal)... Find patterns in THIS repo."
