---
type: judgment
title: "App Mode vs Web Mode"
version: "1.0.0"
source_url: "https://stitch.withgoogle.com/docs/guide/device-types"
updated: "2026-01-20"
owner: "SunwooPark"
status: "active"
tags: ["stitch","decision","judgment"]
---

# Judgment: App Mode vs Web Mode

## Decision Criteria

| Context | App Mode | Web Mode |
| :--- | :--- | :--- |
| **Navigation** | Bottom Tabs (Thumb zone) | Top Bar / Sidebar |
| **Layout Strategy** | Vertical Stack | Multi-column / Grid Sprawl |
| **Scrolling** | Strictly Vertical | Horizontal & Vertical |
| **Primary Interaction** | Touch / Tap | Click / Hover |

## Anti-patterns
- **"Resizing is Translating"**: Squeezing a Web Mode design to phone width destroys hierarchy. Use a prompt to *translate* the layout (e.g., "Move nav to bottom").
- **"Hidden Content"**: Switching from App to Web often hides lower content because the frame remains short. Always expand the frame height manually.

## Gold Questions
Q: How does App Mode handle navigation compared to Web Mode?
A: App Mode uses bottom-aligned tabs for thumb access; Web Mode uses top-aligned bars or multi-column grids.

Q: If I switch a project from App to Web, why is half the content missing?
A: The canvas frame height from the App design is likely too short for the generated Web content. You must manually drag the frame handle down.

Q: What is the best way to move from Mobile to Desktop?
A: Do not just resize. Write a prompt to "Translate" the UI (e.g., "Consolidate bottom tabs into a top nav bar").
