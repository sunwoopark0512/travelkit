# Travelkit Ops Runbook

## 🔧 Git: Fix Remote/Push Issues
**Symptom**: `403 Forbidden` or `Repository not found`.
**Diagnosis**: Missing permissions on original repo or detached fork.
**Fix**:
1.  Ensure you have a repo at `github.com/sunwoopark0512/travelkit` (create if missing).
2.  Reset remote:
    ```powershell
    git remote remove origin
    git remote add origin https://github.com/sunwoopark0512/travelkit.git
    git push -u origin HEAD:main
    ```

## 🔒 Git: Unlock Index
**Symptom**: `Unable to create .../.git/index.lock: File exists`.
**Fix**:
```powershell
Remove-Item -Path ".git\index.lock" -Force -ErrorAction SilentlyContinue
```

## 🧹 Git: Clean Branch Reconstruction
**Symptom**: Commit history polluted with unwanted files (`jdk/`, logs).
**Fix**:
```powershell
# 1. Fetch Upstream
git fetch upstream

# 2. Hard Reset Branch
git checkout -f -B clean-branch-name upstream/main

# 3. Checkout Allowlist Files Only
git checkout <COMMIT_HASH> -- path/to/file
```

## 🛡️ Audit: Run Local Regression
**Symptom**: Need to verify compliance before push.
**Fix**:
```powershell
powershell -ExecutionPolicy Bypass -File apps\android\ci_regression.ps1
```
**Success Criteria**: "🎉 CI Regression Passed" and Exit Code 0.
