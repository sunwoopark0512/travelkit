# PR–Issue Linking Guide

## Rule (SSoT)
- Every change must be tracked by a GitHub Issue that defines **Acceptance Criteria (PASS/FAIL)**.

## Mandatory Linkage
- Every Pull Request body MUST include one of:
  - `Closes #N`
  - `Fixes #N`
- This linkage is enforced by the required status check:
  - `require-linked-issue`

## If a PR is not linked (Policy)
- A PR without `Closes #N` / `Fixes #N`:
  - MUST NOT be merged
  - MUST be returned for correction (edit PR body to add linkage)
- If linkage cannot be applied for any reason:
  - Close the PR and create a new PR properly linked to an Issue.

## Where to do it
- Use the PR template: `.github/PULL_REQUEST_TEMPLATE.md`
- The CI gate will block merges if linkage is missing.

## Quick verification
- Check required checks:
  - `gh pr view <PR> --json statusCheckRollup`
