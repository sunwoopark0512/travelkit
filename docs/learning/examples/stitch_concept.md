---
type: concept
title: "Understanding Stitch Integration"
version: "1.0.0"
source_url: "https://stitch.example.com/docs"
updated: "2026-01-20"
owner: "SunwooPark"
status: "active"
tags: ["stitch","architecture","concept"]
---

# Concept: Stitch Integration

## Mental Model
Stitch is the "External Design Engine". Think of it as a specialized GPU for visuals, while the repo is the CPU for logic and deployment.
- **Stitch**: Generates HTML/CSS/JS based on prompts.
- **Repo**: Consumes these assets via the `intake` folder (`assets/stitch_exports/`).
- **Pipeline**: Merges the intake into `web/landing/` for production.

## Misconceptions
- **"The Repo generates the design"**: No, the repo only *serves* the design. It does not contain the logic to *create* valid CSS/HTML from scratch.
- **"Stitch is a library"**: No, Stitch is a product workflow.

## Gold Questions
Q: Who is responsible for CSS class naming?
A: Stitch. The repo should treat the CSS as an opaque binary blob mostly.

Q: How does a design update propagate?
A: Design in Stitch -> Export ZIP -> Unzip to Intake -> Verify -> Move to Web -> Push.

Q: Can we edit `index.html` manually?
A: Only for critical hotfixes (link corrections). Structural changes should go through Stitch to ensure visual consistency.
