---
type: reference
title: "Stitch MCP Tools API"
version: "1.0.0"
source_url: "https://stitch.withgoogle.com/docs/reference/mcp"
updated: "2026-01-20"
owner: "SunwooPark"
status: "active"
tags: ["stitch","mcp","api","reference"]
---

# Reference: Stitch MCP Tools API

## Procedures

### Setup Headers
```json
{
  "Authorization": "Bearer <YOUR_ACCESS_TOKEN>",
  "X-Goog-User-Project": "<YOUR_PROJECT_ID>"
}
```

### Tool Definitions

#### `list_projects`
- **Filter**: `view=owned` (default) or `view=shared`
- **Usage**: Retrieve list of active designs.

#### `get_screen`
- **Args**: `projectId`, `screenId`
- **Usage**: Fetch specific details/code for a single screen.

#### `generate_screen_from_text`
- **Args**: `projectId`, `prompt`, `deviceType`, `modelId`
- **Usage**: Create new design via API.

## Input / Output Examples
**Input**: `list_projects()`
**Output**: List of Project objects `{id, name, ...}`

**Input**: `generate_screen_from_text(projectId="123", prompt="Login page")`
**Output**: A new screen ID and metadata.

## Gold Questions
Q: Which two headers are required for Stitch MCP authentication?
A: `Authorization` (Bearer token) and `X-Goog-User-Project`.

Q: How long does a Stitch Access Token typically last?
A: 1 hour. It must be refreshed via `gcloud auth application-default print-access-token`.

Q: Which tool would you use to find the ID of a screen named "Home"?
A: `list_screens(projectId=...)` to list all, then filter by name.
