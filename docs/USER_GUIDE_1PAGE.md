# Google Sheets Auto Input Bot (1-Page Guide)

## What it does
- Appends a structured row into a Google Sheet tab: [timestamp, idem_key, title, body]
- Optional: verifies by reading back the last row (no CSV export required)
- Prevents duplicates by idempotency key (scans last N rows)

## Requirements
- Python installed
- credentials.json (Service Account) exists locally (NEVER commit)
- Share the target Google Sheet with the service account email

## Quick start (PowerShell)
1) Verify credentials are ignored:
   - git check-ignore -v credentials.json
2) Ensure schema (tab + header):
   - python tools/sheet_bot.py --tab OUTPUT --ensure-schema --title "Init" --body "schema" --tail 1
3) Append single entry:
   - python tools/sheet_bot.py --tab OUTPUT --title "Hello" --body "Line1
Line2" --verify
4) Idempotent append:
   - python tools/sheet_bot.py --tab OUTPUT --title "Hello" --body "Line1
Line2" --verify
   - second run should SKIP_DUPLICATE

## Batch input
- JSON: python tools/sheet_bot.py --tab OUTPUT --json .\inputs\batch.json --ensure-schema --verify
- CSV : python tools/sheet_bot.py --tab OUTPUT --csv  .\inputs\batch.csv  --ensure-schema

## Troubleshooting
- 401/permission: Share the sheet with the service account email; rerun.
- Tab missing: use --ensure-schema to auto-create.
- Rate limit/server errors: use built-in retry; evidence mode can simulate with --simulate 429/503.

## Security
- credentials.json must remain local and ignored by git.
