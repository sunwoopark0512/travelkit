# Secret Scan Policy

## 1. Goal
To prevent high-risk secrets (private keys, API tokens) from entering the codebase while minimizing "noise" (false positives) that slows down development.

## 2. Two-Track Approach

### Track A: PR Blocking Gate (Strict)
- **Scope**: Only files changed in the PR (`git diff`).
- **Files**: Must match `audit_allowlist_globs.txt`.
- **Action**: Use `gate.ps1` (calls `secret_scan.ps1 -PRMode`).
- **Verdict**: **BLOCKING**. Any finding fails the build.
- **Philosophy**: "Clean water policy" - ensure new code is clean.

### Track B: Full Repo Scan (Non-Blocking)
- **Scope**: Entire repository.
- **Action**: Run `secret_scan.ps1` (without `-PRMode`).
- **Verdict**: **Warning / Report Only**.
- **Philosophy**: "Technical Debt Management" - identify and remediate historical leaks over time without stopping the line.

## 3. Configuration
- **Ignore List**: `apps/android/secret_scan_ignore_globs.txt`
- **Patterns**: Defined in `apps/android/secret_scan.ps1`.

## 4. Remediation
If the Gate fails:
1. Revoke the leaked credential immediately.
2. Remove it from the code.
3. If it is a false positive, add the exact path or pattern to `secret_scan_ignore_globs.txt` (requires Governance review).
