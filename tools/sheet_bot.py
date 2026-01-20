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
    t = str(title).strip() if title else ""
    b = str(body).strip() if body else ""
    raw = f"{t}|{b}".encode('utf-8')
    return hashlib.sha1(raw).hexdigest()

def normalize_entry(entry):
    # Standardize keys from varied inputs
    def get_val(keys):
        for k in keys:
            if k in entry: return entry[k]
            if k.lower() in entry: return entry[k.lower()]
        return None

    title = get_val(['Title', 'Subject', 'Head', 'title'])
    body = get_val(['Body', 'Content', 'Description', 'body'])
    k = get_val(['IdemKey', 'Idem_Key', 'Key', 'idem_key'])
    
    if not k:
        k = compute_idem_key(title, body)
    
    return title, body, k

def ensure_tab(sheet, tab_name):
    try:
        ws = sheet.worksheet(tab_name)
        return ws
    except gspread.WorksheetNotFound:
        print(f"INFO: Tab '{tab_name}' not found. Creating...")
        ws = sheet.add_worksheet(title=tab_name, rows=100, cols=20)
        ws.append_row(DEFAULT_HEADERS)
        return ws

def find_idem_key_index(headers):
    # returns 0-based index
    candidates = ['IdemKey', 'idemkey', 'Key', 'key']
    for i, h in enumerate(headers):
        if h in candidates: return i
    return -1

def process_row(worksheet, row_data, verify=False, tail=10):
    # row_data = [Timestamp, Title, Body, IdemKey]
    target_key = row_data[3]

    # Idempotency Check
    all_values = worksheet.get_all_values()
    
    # Determine Key Column
    headers = all_values[0] if all_values else []
    key_idx = find_idem_key_index(headers)
    if key_idx == -1:
        # Default to 3 (4th column) if header not found
        key_idx = 3

    recent_rows = all_values[-tail:] if all_values else []
    for r in recent_rows:
        if len(r) > key_idx and r[key_idx] == target_key:
            print(f"SKIP: Duplicate Idempotency Key found: {target_key}")
            return "SKIP"

    # Append
    worksheet.append_row(row_data)
    print(f"SUCCESS: Appended row -> {row_data[1]}") # Print Title
    
    # Verify
    if verify:
        fresh_values = worksheet.get_all_values()
        if not fresh_values:
            print("VERIFY: FAIL (Sheet Empty)")
            return "FAIL"
            
        last_row = fresh_values[-1]
        
        found_key = last_row[key_idx] if len(last_row) > key_idx else "MISSING"
        
        if found_key == target_key:
            print(f"VERIFY: PASS (Key Match: {found_key})")
        else:
            print(f"VERIFY: FAIL (Expected {target_key}, Found {found_key})")
            return "FAIL"

    return "SUCCESS"

def main():
    parser = argparse.ArgumentParser(description='Sheet Bot v3 (Fixed)')
    parser.add_argument('--tab', help='Target Tab Name')
    parser.add_argument('--title', help='Entry Title')
    parser.add_argument('--body', help='Entry Body')
    parser.add_argument('--idem-key', help='Manual IdemKey')
    parser.add_argument('--verify', action='store_true', help='Enable verification')
    parser.add_argument('--tail', type=int, default=10, help='Idempotency scan range')
    parser.add_argument('--simulate', type=int, help='Simulate HTTP Error Code')
    parser.add_argument('--ensure-tab', action='store_true', help='Create tab if missing')
    parser.add_argument('--json', help='Batch Input JSON File')
    parser.add_argument('--csv', help='Batch Input CSV File')
    
    parser.add_argument('pos_tab', nargs='?')
    parser.add_argument('pos_data', nargs='*')

    args = parser.parse_args()
    
    target_tab = args.tab if args.tab else args.pos_tab
    if not target_tab and not args.json and not args.csv:
        parser.print_help()
        sys.exit(1)

    print(f"INFO: Sheet Bot v3 (Fixed) Started")
    
    client = None
    rows_to_process = []
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Ingestion Logic with Normalization
    if args.json:
        with open(args.json, 'r', encoding='utf-8-sig') as f:
            data = json.load(f)
            if isinstance(data, list):
                for entry in data:
                    t, b, k = normalize_entry(entry)
                    rows_to_process.append([ts, t, b, k])
    elif args.csv:
        with open(args.csv, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for entry in reader:
                t, b, k = normalize_entry(entry)
                if t or b:
                    rows_to_process.append([ts, t, b, k])
    elif args.title or args.body:
        entry = {'Title': args.title, 'Body': args.body}
        if args.idem_key: entry['IdemKey'] = args.idem_key
        t, b, k = normalize_entry(entry)
        rows_to_process.append([ts, t, b, k])
        
    # Processing Loop
    try:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                if args.simulate and attempt < 3: raise SimulationError(args.simulate)
                
                if client is None: client = get_client()
                sheet = client.open_by_key(SHEET_KEY)
                
                if args.ensure_tab: worksheet = ensure_tab(sheet, target_tab)
                else: worksheet = sheet.worksheet(target_tab)

                # Process Rows
                for row in rows_to_process:
                    process_row(worksheet, row, args.verify, args.tail)
                
                sys.exit(0)

            except (gspread.exceptions.APIError, SimulationError, Exception) as e:
                err_code = e.code if isinstance(e, SimulationError) else getattr(e, 'response', {}).status_code if hasattr(e, 'response') else 500
                print(f"WARN: Attempt {attempt} failed (Code: {err_code}, Msg: {e})")
                if attempt == MAX_RETRIES: sys.exit(1)
                client = None
                exponential_backoff(attempt)

    except KeyboardInterrupt:
        sys.exit(1)

if __name__ == '__main__':
    main()
