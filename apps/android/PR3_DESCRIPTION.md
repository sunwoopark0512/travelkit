PR3: Hardening & Governance (Debug Isolation + CI Regression)

## Summary
This PR implements strict governance policies for audit logs and artifacts, ensuring compliance with [Project Audit Standards](README.md). It also isolates debug-forcing logic (`debug_force_emit`) to `src/debug`, guaranteeing that release builds remain clean.

## Changes
1.  **Source Set Separation**:
    *   Moved `DebugControlPanel` and forced-log logic to `app/src/debug/...`.
    *   Created `No-op` implementation in `app/src/main/...` for release builds.
2.  **CI Regression Pipeline**:
    *   Added `ci_regression.ps1` (Lite validation script).
    *   Added GitHub Workflow `.github/workflows/android-audit-governance.yml` (Runs on Push/PR).
3.  **Policy Enforcement**:
    *   Validates `PR2_AUDIT_COMMENT.txt` format (2-line header).
    *   Bans non-canonical artifact names (e.g., `*_new.log`).

## Verification
- **Local**: `.\ci_regression.ps1` -> **Passed** (Exit Code 0).
- **Static Analysis**: `src/main` contains 0 instances of `debug_force_emit`.

## Risks
- **Low**: Changes are strictly structural (debug source set) and additive (CI scripts). No runtime logic changes in production flow.
