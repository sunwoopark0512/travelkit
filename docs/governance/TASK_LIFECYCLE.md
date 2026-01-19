# Task Lifecycle (Status Transition Rules)

This document defines how TravelKit Issues move across statuses using labels:
- status:backlog
- status:doing
- status:blocked
- status:done

## Roles (Who can change status?)
### Human (repo maintainer)
- Can apply/remove any status label.
- Has final authority on status:done.

### Agents (chatgpt / opencode / antigravity)
- Can propose status changes by commenting on the Issue.
- Can apply labels **only if** they have repo permissions via automation; otherwise must request a maintainer action.
- Must never bypass required checks or merge gates.

## State Definitions
### status:backlog
- Work is defined but not started.
- Issue has Description + Acceptance Criteria (PASS/FAIL).

### status:doing
- Work has started.
- A branch/PR may exist, but PR must include Closes #N or Fixes #N.

### status:blocked
- Work cannot proceed due to a dependency or missing decision.
- The blocker must be explicitly written:
  - what is blocked
  - why
  - what is needed to unblock
  - who owns the unblock action (Human/Agent)

### status:done
- Acceptance Criteria are satisfied (PASS).
- Any required checks (e.g., equire-linked-issue) passed for merged changes.
- The Issue summary is updated with outcome and reference PR(s).

## Allowed Transitions
- acklog -> doing
- doing -> done
- doing -> blocked
- locked -> doing
- (exceptional) acklog -> blocked (only if a dependency is discovered before start)

## Unblocking Procedure (blocked -> doing)
To move from status:blocked to status:doing, the Issue must include:
- Evidence that the blocker is resolved (link/commit/decision)
- A short re-plan (next concrete step)
- Owner confirmation (Human or authorized Agent)

## Done Checklist (doing -> done)
Before setting status:done, confirm:
- [ ] Acceptance Criteria are all PASS
- [ ] Linked PR(s) exist with Closes #N / Fixes #N
- [ ] Required checks are SUCCESS
- [ ] No secrets/tokens/PII were introduced
