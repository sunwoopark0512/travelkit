---
type: judgment
title: "When to Bypass Stitch"
version: "1.0.0"
source_url: "internal"
updated: "2026-01-20"
owner: "SunwooPark"
status: "active"
tags: ["stitch","decision","judgment"]
---

# Judgment: When to Bypass Stitch

## Decision Criteria

| Scenario | Use Stitch? | Edit Repo Directly? | Reason |
| :--- | :--- | :--- | :--- |
| **New Section Layout** | ✅ YES | ❌ NO | Layouts require visual coherence engine. |
| **Color Palette Change** | ✅ YES | ❌ NO | Global variables are hard to balance manually. |
| **Typo Fix** | ❌ NO | ✅ YES | Faster, low risk. |
| **Link Update** | ❌ NO | ✅ YES | Functional change, zero visual risk. |
| **Add Analytics Script** | ❌ NO | ✅ YES | Invisible infrastructure. |

## Anti-patterns
- **"Frankenstein Editing"**: Copy-pasting a button style from Stitch into a legacy page without the full context.
- **"Repo-first Design"**: Trying to write CSS in VS Code to match a Figma screenshot without using the engine.

## Gold Questions
Q: A user reports a broken link on the landing page. Do we go to Stitch?
A: No. Fix it in `web/landing/index.html` directly to minimize TTR (Time To Resolution).

Q: We want to change the hero section from centered to left-aligned. Procedure?
A: Go to Stitch -> Prompt "Left align hero" -> Export -> Pipeline. Do NOT edit CSS manually.

Q: Why not edit colors manually?
A: It breaks the "Stitch as Source of Truth" for design tokens and makes future exports inconsistent.
