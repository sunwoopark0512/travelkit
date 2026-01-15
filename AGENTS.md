# Travelkit Ops & Governance (AGENTS.md)

## 📌 Executive Summary
This document defines the **Operational Loop** for Travelkit Android development, ensuring compliance with audit standards, efficient issue resolution via Runbooks, and standardized PR workflows.

## 🏗 Operational Structure
- **Notion (Dashboard)**: Real-time tracking of objectives, blockers, and snapshots.
- **Repo (Asset Source)**: Immutable runbooks, templates, and evidence checklists.
- **CI (Enforcement)**: Automated regression testing via `ci_regression.ps1`.

## 📂 Asset Index
| Asset | Location | Purpose |
|-------|----------|---------|
| **Runbook DB** | [`docs/ops/runbook.md`](docs/ops/runbook.md) | Recipes for solving common issues (Git, Audit). |
| **Notion Template** | [`docs/ops/notion_ops.md`](docs/ops/notion_ops.md) | Copy-paste content for setting up the Notion Dashboard. |
| **PR Template** | [`docs/ops/pr_templates/PR3_BODY_TEMPLATE.md`](docs/ops/pr_templates/PR3_BODY_TEMPLATE.md) | Standardized PR description for audit compliance. |
| **Evidence Checklist** | [`notion_seed/03_EVIDENCE_CHECKLIST.md`](notion_seed/03_EVIDENCE_CHECKLIST.md) | Pre-submission validation list. |

## 🔄 The Operational Loop
1.  **Develop**: Feature implementation (isolated in `src/main`).
2.  **Verify**: Run `ci_regression.ps1` locally.
3.  **Recover**: If blocked, consult `docs/ops/runbook.md`.
4.  **Submit**: Create PR using `PR3_BODY_TEMPLATE.md`.
5.  **Audit**: CI checks governance; Evidence regenerated if requested via `recover_and_verify.ps1`.
