# NOTE: This file is intentionally self-contained for operational use.
import argparse
import csv
import datetime
import hashlib
import json
import os
import random
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

import gspread
from oauth2client.service_account import ServiceAccountCredentials

# Configuration (SSoT)
SHEET_KEY = "1WXfrjGxFnL4RM7r8d1wcLPZh2isboEH-PL8OjtYThEU"
CREDENTIALS_FILE = "credentials.json"

DEFAULT_COLUMNS = ["timestamp", "idem_key", "title", "body"]
DEFAULT_TAIL = 10
MAX_RETRIES = 5

# -------------------------
# Logging
# -------------------------
def log(event: str, **kwargs: Any) -> None:
    ts = datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z"
    payload = " ".join([f"{k}={repr(v)}" for k, v in kwargs.items()])
    print(f"{ts} | {event} | {payload}".rstrip())

# -------------------------
# Simulated retriable errors (for evidence without relying on real quota/outages)
# -------------------------
class SimulatedRetriableError(Exception):
    def __init__(self, code: int, message: str):
        super().__init__(message)
        self.code = code

def is_retriable_exception(e: Exception) -> bool:
    # Simulated
    if isinstance(e, SimulatedRetriableError):
        return e.code in (401, 429, 500, 502, 503, 504)

    # Best-effort for gspread/requests style errors
    msg = str(e).lower()
    retriable_markers = ["429", "too many requests", "quota", "rate limit", "503", "502", "504", "500", "internal error", "backend error"]
    if any(m in msg for m in retriable_markers):
        return True
    if "401" in msg or "unauthorized" in msg:
        return True
    return False

def backoff_sleep(attempt: int) -> float:
    # Exponential backoff with jitter
    base = min(2 ** attempt, 30)
    jitter = random.uniform(0, 1.0)
    return base + jitter

# -------------------------
# Sheets client
# -------------------------
def make_client() -> gspread.Client:
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_FILE, scope)
    return gspread.authorize(creds)

def open_sheet(client: gspread.Client) -> gspread.Spreadsheet:
    return client.open_by_key(SHEET_KEY)

# -------------------------
# Schema helpers
# -------------------------
def ensure_tab_and_header(sheet: gspread.Spreadsheet, tab: str, columns: List[str]) -> gspread.Worksheet:
    try:
        ws = sheet.worksheet(tab)
        log("TAB_FOUND", tab=tab)
    except Exception:
        log("TAB_MISSING_CREATE", tab=tab)
        ws = sheet.add_worksheet(title=tab, rows=1000, cols=max(10, len(columns)))

    # Header check (row 1)
    values = ws.row_values(1)
    if values[: len(columns)] != columns:
        log("HEADER_FIX", tab=tab, before=values[: len(columns)], after=columns)
        ws.update("A1", [columns])
    else:
        log("HEADER_OK", tab=tab, header=columns)

    return ws

# -------------------------
# Core logic
# -------------------------
def sha1_text(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()

def compute_idem_key(title: str, body: str, idem_key: Optional[str]) -> str:
    return idem_key.strip() if idem_key else sha1_text(title + "\n" + body)

def row_model(timestamp: str, idem_key: str, title: str, body: str) -> List[str]:
    return [timestamp, idem_key, title, body]

def tail_scan_for_idem(ws: gspread.Worksheet, tail: int, idem_key: str) -> bool:
    all_vals = ws.get_all_values()
    if not all_vals:
        return False
    # skip header if present
    data = all_vals[1:] if len(all_vals) >= 1 else []
    window = data[-tail:] if tail > 0 else data
    for r in window:
        if len(r) >= 2 and r[1] == idem_key:
            return True
    return False

def append_and_verify(ws: gspread.Worksheet, row: List[str], verify: bool) -> Tuple[bool, Optional[List[str]]]:
    ws.append_row(row, value_input_option="RAW")
    if not verify:
        return True, None
    # Read-back: last row
    all_vals = ws.get_all_values()
    if not all_vals or len(all_vals) < 2:
        return False, None
    last = all_vals[-1]
    # Compare only our columns length
    expected = row
    got = last[: len(expected)]
    return got == expected, got

def run_with_retry(fn, simulate_code: Optional[int] = None, simulate_failures: int = 0):
    attempt = 0
    while True:
        try:
            if simulate_code and simulate_failures > 0:
                # Fail first N attempts, then succeed
                if attempt < simulate_failures:
                    raise SimulatedRetriableError(simulate_code, f"Simulated retriable error code={simulate_code} attempt={attempt+1}")
            return fn()
        except Exception as e:
            retriable = is_retriable_exception(e)
            log("ERROR", attempt=attempt + 1, retriable=retriable, error=str(e)[:400])
            if not retriable or attempt >= (MAX_RETRIES - 1):
                log("RETRY_GIVEUP", attempts=attempt + 1)
                raise
            delay = backoff_sleep(attempt)
            log("RETRY_SLEEP", seconds=delay)
            time.sleep(delay)
            attempt += 1

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Append structured rows to a Google Sheet tab with verify/idempotency/retry + schema/batch.")
    p.add_argument("--tab", help="Target tab name (worksheet).")
    p.add_argument("--title", help="Title for the entry.")
    p.add_argument("--body", help="Body (multiline supported).")
    p.add_argument("--idem-key", dest="idem_key", help="Idempotency key (optional).")
    p.add_argument("--verify", action="store_true", help="Read back last row and verify it matches.")
    p.add_argument("--tail", type=int, default=DEFAULT_TAIL, help="Recent rows to scan for idempotency.")
    p.add_argument("--ensure-schema", action="store_true", help="Ensure tab exists and header matches schema.")
    p.add_argument("--schema", default="default", help="Schema name (currently only: default).")
    p.add_argument("--json", dest="json_path", help="Batch input JSON file: [{title, body, idem_key?}, ...]")
    p.add_argument("--csv", dest="csv_path", help="Batch input CSV file with headers: title, body, idem_key(optional)")
    p.add_argument("--simulate", choices=["401", "429", "503"], help="Simulate retriable errors for evidence.")
    p.add_argument("--simulate-failures", type=int, default=3, help="How many initial attempts to fail when --simulate is set.")
    # Backward compatible positional: python sheet_bot.py <TAB> <COL1> <COL2> ...
    p.add_argument("pos", nargs="*", help="Legacy positional args.")
    return p.parse_args()

def load_batch_json(path: str) -> List[Dict[str, str]]:
    with open(path, "r", encoding="utf-8-sig") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("JSON must be a list of objects")
    out: List[Dict[str, str]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        out.append({
            "title": str(item.get("title", "")),
            "body": str(item.get("body", "")),
            "idem_key": str(item.get("idem_key", "")).strip() or "",
        })
    return out

def load_batch_csv(path: str) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    with open(path, "r", encoding="utf-8", newline="") as f:
        r = csv.DictReader(f)
        for row in r:
            out.append({
                "title": str(row.get("title", "")),
                "body": str(row.get("body", "")),
                "idem_key": (str(row.get("idem_key", "")) if row.get("idem_key", "") is not None else "").strip() or "",
            })
    return out

def main() -> int:
    args = parse_args()

    simulate_code = int(args.simulate) if args.simulate else None
    simulate_failures = args.simulate_failures if simulate_code else 0

    # Legacy fallback
    if (not args.tab) and args.pos:
        tab = args.pos[0]
        rest = args.pos[1:]
        # legacy: append raw cols only
        def legacy_job():
            client = make_client()
            sheet = open_sheet(client)
            ws = sheet.worksheet(tab)
            ws.append_row(rest, value_input_option="RAW")
            log("LEGACY_APPEND_OK", tab=tab, cols=len(rest))
        run_with_retry(legacy_job, simulate_code=simulate_code, simulate_failures=simulate_failures)
        return 0

    if not args.tab:
        raise SystemExit("Missing --tab (or legacy positional TAB).")

    columns = DEFAULT_COLUMNS if args.schema == "default" else DEFAULT_COLUMNS
    tab = args.tab

    # Build entries list (single or batch)
    entries: List[Dict[str, str]] = []
    if args.json_path:
        entries = load_batch_json(args.json_path)
    elif args.csv_path:
        entries = load_batch_csv(args.csv_path)
    else:
        if not args.title or args.body is None:
            raise SystemExit("Single entry requires --title and --body (or use --json/--csv for batch).")
        entries = [{"title": args.title, "body": args.body, "idem_key": args.idem_key or ""}]

    def job():
        client = make_client()
        sheet = open_sheet(client)

        ws = ensure_tab_and_header(sheet, tab, columns) if args.ensure_schema else sheet.worksheet(tab)

        written = 0
        skipped = 0

        for e in entries:
            title = e.get("title", "")
            body = e.get("body", "")
            raw_idem = (e.get("idem_key") if isinstance(e, dict) else None)
            raw_idem = "" if raw_idem is None else str(raw_idem)
            raw_idem = raw_idem.strip()
            idem_key = compute_idem_key(title, body, raw_idem or args.idem_key)or args.idem_key)
            ts = datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z"
            row = row_model(ts, idem_key, title, body)

            if tail_scan_for_idem(ws, args.tail, idem_key):
                log("SKIP_DUPLICATE", tab=tab, idem_key=idem_key, title=title, tail=args.tail)
                skipped += 1
                continue

            ok, got = append_and_verify(ws, row, args.verify)
            if args.verify:
                if ok:
                    log("VERIFY_PASS", tab=tab, idem_key=idem_key)
                else:
                    log("VERIFY_FAIL", tab=tab, expected=row, got=got)
                    raise RuntimeError("Verification failed (read-back mismatch).")

            log("APPEND_OK", tab=tab, idem_key=idem_key, title=title)
            written += 1

        log("BATCH_DONE", tab=tab, written=written, skipped=skipped, total=len(entries))

    run_with_retry(job, simulate_code=simulate_code, simulate_failures=simulate_failures)
    return 0

if __name__ == "__main__":
    sys.exit(main())

