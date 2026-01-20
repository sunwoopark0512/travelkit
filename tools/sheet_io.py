import os
import gspread
from oauth2client.service_account import ServiceAccountCredentials

DEFAULT_HEADERS_INBOX = ["Date", "Title", "Body", "IdemKey"]

class MockWorksheet:
    def __init__(self, title, headers, initial_data=None):
        self._title = title
        self._headers = headers
        self._rows = [headers]
        if initial_data:
            self._rows.extend(initial_data)
        
    def append_row(self, row):
        self._rows.append(row)
        
    def get_all_values(self):
        return self._rows
        
    def update_cell(self, r, c, v):
        # Update in-memory row (1-based index to 0-based)
        if 0 <= r-1 < len(self._rows):
            row = self._rows[r-1]
            if 0 <= c-1 < len(row):
                 row[c-1] = v

class MockSheet:
    def __init__(self):
        self._worksheets = {}
        
    def worksheet(self, title):
        # Pre-populate specific tabs for testing flow
        if title not in self._worksheets:
             if title == "INBOX":
                 self._worksheets[title] = MockWorksheet(title, ["Date", "Title", "Body", "IdemKey"], [
                     ["2025-01-01", "Idea 1", "Body 1", "hash1"],
                     ["2025-01-02", "Idea 2", "Body 2", "hash2"],
                     ["2025-01-03", "Idea 3", "Body 3", "hash3"]
                 ])
             elif title == "CONTENT_QUEUE":
                 # Pre-populate Queue so script_gen.py has something to do in isolated runs
                 self._worksheets[title] = MockWorksheet(title, ["Date","IdemKey","Title","Body","Priority","Channel","Status","Notes"], [
                     ["2025-01-01", "hash1", "Idea 1", "Body 1", "5", "YouTube", "READY", ""],
                     ["2025-01-02", "hash2", "Idea 2", "Body 2", "4", "Shorts", "READY", ""]
                 ])
             else:
                 self._worksheets[title] = MockWorksheet(title, ["Header"])
        return self._worksheets[title]

    def add_worksheet(self, title, rows, cols):
        # If adding, check if we have default data
        return self.worksheet(title)

def get_gspread_client(credentials_file: str = "credentials.json"):
    if os.environ.get("SHEET_KEY") == "dummy-sheet-key":
        return "mock_client"

    scopes = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive",
    ]
    if not os.path.exists(credentials_file):
        raise FileNotFoundError(f"Missing credentials file: {credentials_file}")
    creds = ServiceAccountCredentials.from_json_keyfile_name(credentials_file, scopes)
    return gspread.authorize(creds)

def open_sheet(client, sheet_key: str):
    if client == "mock_client":
        return MockSheet()
    return client.open_by_key(sheet_key)

def ensure_tab(sheet, tab_name: str, headers: list):
    try:
        ws = sheet.worksheet(tab_name)
    except Exception:
        ws = sheet.add_worksheet(title=tab_name, rows="1000", cols=str(max(10, len(headers) + 5)))
        
    # Ensure correct headers if it was just created empty
    if not ws.get_all_values():
        ws.append_row(headers)
        
    return ws

def read_rows(ws):
    return ws.get_all_values()

def append_row(ws, row):
    ws.append_row(row)

def update_cell(ws, row_idx: int, col_idx: int, value: str):
    ws.update_cell(row_idx, col_idx, value)
