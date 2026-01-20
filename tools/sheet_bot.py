import gspread
from oauth2client.service_account import ServiceAccountCredentials
import sys
import argparse
import hashlib
import time
import random
import datetime
import json
import csv
import os

# Configuration
SHEET_KEY = '1WXfrjGxFnL4RM7r8d1wcLPZh2isboEH-PL8OjtYThEU'
CREDENTIALS_FILE = 'credentials.json'
MAX_RETRIES = 5
DEFAULT_HEADERS = ["Date", "Title", "Body", "IdemKey"]

class SimulationError(Exception):
    def __init__(self, code):
        self.code = code

def get_client():
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_FILE, scope)
    return gspread.authorize(creds)

def exponential_backoff(attempt):
    sleep_time = min(30, (2 ** attempt) + random.uniform(0, 1))
    print(f"DEBUG: Sleeping {sleep_time:.2f}s before retry {attempt}...")
    time.sleep(sleep_time)

def compute_idem_key(title, body):
    t = title if title else ""
    b = body if body else ""
    raw = f"{t}|{b}".encode('utf-8')
    return hashlib.sha1(raw).hexdigest()

def ensure_tab(sheet, tab_name):
    try:
        ws = sheet.worksheet(tab_name)
        print(f"INFO: Tab '{tab_name}' exists.")
        return ws
    except gspread.WorksheetNotFound:
        print(f"INFO: Tab '{tab_name}' not found. Creating...")
        ws = sheet.add_worksheet(title=tab_name, rows=100, cols=20)
        ws.append_row(DEFAULT_HEADERS)
        print(f"INFO: Created '{tab_name}' with headers.")
        return ws

def process_row(worksheet, row_data, verify=False, tail=10):
    # Idempotency Check
    all_values = worksheet.get_all_values()
    recent_rows = all_values[-tail:] if all_values else []
    current_key = row_data[-1]
    
    for r in recent_rows:
        if len(r) > 0 and r[-1] == current_key:
            print(f"SKIP: Duplicate Idempotency Key: {current_key}")
            return "SKIP"

    worksheet.append_row(row_data)
    print(f"SUCCESS: Appended row -> {row_data[1]}") # Print Title
    
    if verify:
        last_row = worksheet.get_all_values()[-1]
        if len(last_row) >= 1 and last_row[-1] == row_data[-1]:
            print("VERIFY: PASS")
        else:
            print("VERIFY: FAIL")
            return "FAIL"
    return "SUCCESS"

def main():
    parser = argparse.ArgumentParser(description='Sheet Bot v3 (Product Grade)')
    parser.add_argument('--tab', help='Target Tab Name')
    parser.add_argument('--title', help='Entry Title')
    parser.add_argument('--body', help='Entry Body')
    parser.add_argument('--idem-key', help='Manual IdemKey')
    parser.add_argument('--verify', action='store_true', help='Enable verification')
    parser.add_argument('--tail', type=int, default=10, help='Idempotency scan range')
    
    # v3 New Flags
    parser.add_argument('--simulate', type=int, help='Simulate HTTP Error Code (429, 503, etc)')
    parser.add_argument('--ensure-tab', action='store_true', help='Create tab if missing')
    parser.add_argument('--json', help='Batch Input JSON File')
    parser.add_argument('--csv', help='Batch Input CSV File')
    
    # Legacy Positional Support (minimal)
    parser.add_argument('pos_tab', nargs='?')
    parser.add_argument('pos_data', nargs='*')

    args = parser.parse_args()
    
    # Mode Switch
    target_tab = args.tab if args.tab else args.pos_tab
    if not target_tab and not args.json and not args.csv:
        parser.print_help()
        sys.exit(1)

    print(f"INFO: Sheet Bot v3 Started (Simulate: {args.simulate})")
    
    client = None
    rows_to_process = []

    # Prepare Data
    if args.json:
        with open(args.json, 'r', encoding='utf-8') as f:
            data = json.load(f) # Expect verification that it is a list
            for entry in data:
                k = compute_idem_key(entry.get('Title'), entry.get('Body'))
                ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                rows_to_process.append([ts, entry.get('Title'), entry.get('Body', ''), k])
    elif args.csv:
        with open(args.csv, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for entry in reader:
                k = compute_idem_key(entry.get('Title'), entry.get('Body'))
                ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                rows_to_process.append([ts, entry.get('Title'), entry.get('Body', ''), k])
    elif args.title:
        k = args.idem_key if args.idem_key else compute_idem_key(args.title, args.body)
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        rows_to_process.append([ts, args.title, args.body if args.body else "", k])

    # Processing Loop
    try:
        # Client Init (Retry Block)
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                # Simulation Hook
                if args.simulate and attempt < 3: # Fail first 2 attempts
                    raise SimulationError(args.simulate)
                
                if client is None:
                    client = get_client()
                
                sheet = client.open_by_key(SHEET_KEY)
                
                if args.ensure_tab:
                    worksheet = ensure_tab(sheet, target_tab)
                else:
                    worksheet = sheet.worksheet(target_tab)

                # Core Processing
                for row in rows_to_process:
                    process_row(worksheet, row, args.verify, args.tail)
                
                sys.exit(0) # All Done

            except (gspread.exceptions.APIError, SimulationError, Exception) as e:
                # Handle Simulation Wrapper
                err_code = e.code if isinstance(e, SimulationError) else getattr(e, 'response', {}).status_code if hasattr(e, 'response') else 500
                
                print(f"WARN: Attempt {attempt} failed (Code: {err_code}, Msg: {e})")
                
                if attempt == MAX_RETRIES:
                    print("ERROR: Max retries exhausted.")
                    sys.exit(1)
                
                client = None
                exponential_backoff(attempt)

    except KeyboardInterrupt:
        sys.exit(1)

