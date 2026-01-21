---
type: reference
title: "Stitch Export Pipeline"
version: "1.0.0"
source_url: "internal"
updated: "2026-01-20"
owner: "SunwooPark"
status: "active"
tags: ["stitch","procedure","reference"]
---

# Reference: Stitch Export Pipeline

## Procedures

### 1. Ingest Export
```bash
# Unzip Stitch export to intake path
Expand-Archive -Path "Downloads/stitch_export.zip" -DestinationPath "assets/stitch_exports/YYYY-MM-DD/"
```

### 2. Verify Locally
```bash
# Run local server on intake folder
python -m http.server --directory assets/stitch_exports/YYYY-MM-DD/
```

### 3. Promote to Production
```bash
# Overwrite web/landing
Copy-Item -Recurse -Force "assets/stitch_exports/YYYY-MM-DD/*" "web/landing/"
```

## Input / Output Examples
**Input**: `stitch_export.zip` containing `index.html`, `assets/css/style.css`, `assets/images/hero.png`
**Output**: `web/landing/` structure mirrors the ZIP exactly.

## Gold Questions
Q: What is the exact command to serve the intake folder for verification?
A: `python -m http.server --directory assets/stitch_exports/<DATE>/`

Q: Where does the unzipped export permanently live?
A: In `assets/stitch_exports/<DATE>/` as a historical record.

Q: What happens if `web/landing` already has files?
A: They are overwritten by the new export. This is a destructive update.
