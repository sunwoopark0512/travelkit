## Summary
[Briefly describe what this PR does. Focus on the "Why" and "What".]

## Changes
- **Core Logic**: [List major code changes]
- **Governance**: [List audit/compliance changes]
- **Refactoring**: [List cleanup items]

## Verification
- [ ] **Local Regression**: `.\ci_regression.ps1` -> **Passed** (Exit Code 0).
- [ ] **Static Guard**: No `debug_force_emit` leaks in `src/main`.
- [ ] **Artifacts**: `final_evidence.log` attached (if applicable).

## Risks
- **Level**: [Low/Medium/High]
- **Rationale**: [Explain why (e.g., changes guarded by source set separation)].

## Compliance Checklist
- [ ] Header format verified (`PR2 Android Audit Verdict: APPROVE`).
- [ ] No prohibited filenames (`*_new.log`).
- [ ] CI Pipeline Green.
