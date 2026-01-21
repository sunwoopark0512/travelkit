---
type: judgment
title: "Choosing Stitch Design Modes"
version: "1.0.0"
source_url: "https://stitch.withgoogle.com/docs/guide/design-modes"
updated: "2026-01-20"
owner: "SunwooPark"
status: "active"
tags: ["stitch","decision","judgment"]
---

# Judgment: Choosing Stitch Design Modes

## Decision Criteria

| Scenario | Mode | Reason |
| :--- | :--- | :--- |
| **Complex Logic / Production Candidate** | `Thinking with 3 Pro` | Prioritizes reasoning (nav flow, hierarchy) over speed. |
| **Vibe Experimentation / Reskinning** | `Redesign (Nano Banana Pro)` | Best for applying aesthetic keywords (e.g., "Cyberpunk", "Claymorphism"). |
| **High-Fidelity Code / A/B Test** | `2.5 Pro` | Produces high-quality code; good for comparing against 3 Pro. |
| **Wireframing / Figma Export** | `Fast` | Optimized for speed and compatibility with direct Figma exports. |

## Anti-patterns
- **Using "Fast" for final logic**: You will lose navigational nuance and deep reasoning.
- **Using "3 Pro" for rapid vibe checks**: Too slow for "what if" color iterations. Use Redesign or Variations instead.

## Gold Questions
Q: Which mode should I use for a complex dashboard requiring deep logic?
A: Thinking with 3 Pro.

Q: I want to make an old app look like a "Y2K" interface. Which mode?
A: Redesign (Nano Banana Pro).

Q: What is the primary use case for "Fast" mode?
A: Rapid wireframing and initial sketches for Figma export.
