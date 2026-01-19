# Contributing to TravelKit

## Core Rule (SSoT)
- **All work MUST start from a GitHub Issue.**
- No code/docs changes without an Issue that defines **Acceptance Criteria (PASS/FAIL)**.

## Workflow (Issue -> PR -> Merge)
1. Create/choose an Issue and ensure it has:
   - Description
   - Acceptance Criteria (PASS/FAIL)
   - No secrets/tokens/PII in text
2. Move the Issue label:
   - status:backlog -> status:doing
3. Create a branch:
   - git checkout -b <type>/<short-name>
4. Make changes and commit:
   - Commit message should include context; PR body must link the Issue.
5. Create a PR:
   - **PR body MUST include Closes #N or Fixes #N.**
6. Required Gate:
   - equire-linked-issue must be **SUCCESS** before merge.
7. Merge and close the loop:
   - Merge PR
   - Update Issue label: status:doing -> status:done

## Templates
- Use the repository templates:
  - Issue templates: .github/ISSUE_TEMPLATE/*
  - PR template: .github/PULL_REQUEST_TEMPLATE.md

## Validation
- Confirm required checks:
  - gh pr view <PR> --json statusCheckRollup
- Keep the repo clean:
  - git status should be clean before switching tasks.

## Security / Privacy (Hard Rule)
- Never include secrets, tokens, API keys, passwords, or PII in:
  - Issues, PRs, commit messages, logs, or generated excerpts.
- Use secure environment variables and secret stores instead.

