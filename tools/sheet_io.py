
import os
import json
from oauth2client.service_account import ServiceAccountCredentials
import gspread  # pip install gspread

MOCK_DB_FILE = "mock_sheet_db.json"

# Initial Data if DB doesn't exist
INITIAL_INBOX = [
    ["Date", "Title", "Body", "IdemKey"],
    ["2024-01-20", "오늘 워킹이 편했다", "보폭을 줄이니까 무릎에 힘이 덜 들어갔다. 상체를 세우려 하지 않고 발 아래로 무게를 떨어뜨렸던 게 큰 것 같다.", "mock_hash_1"],
    ["2024-01-20", "왼쪽 허리 신호", "오초 반복할 때 허리가 뻐근해짐. 코어 힘 풀려서 그런 듯하다.", "mock_hash_2"],
    ["2024-01-20", "파트너 연결", "상체 힘 빼니까 호흡이 맞았다. 내가 리드하려는 마음을 버리니 상대가 다가왔다.", "mock_hash_3"]
]
INITIAL_HEADERS = {
    "EVAL_LOG": ["Date","IdemKey","Title","Type","SafetyLevel","InsightQuality","NextAction","EvalJson","Model","PromptVer"],
    "CONTENT_QUEUE": ["Date","IdemKey","Title","Body","Priority","Tag","Status","Notes"],
    "SCRIPTS": ["Date","IdemKey","Title","Format","Content","Model","PromptVer"]
}

class MockSheet:
    def __init__(self):
        self.load()

    def load(self):
        if os.path.exists(MOCK_DB_FILE):
            try:
                with open(MOCK_DB_FILE, "r", encoding="utf-8") as f:
                    self.tabs = json.load(f)
            except:
                self.tabs = {}
        else:
            self.tabs = {}
        
        # Ensure minimal structure
        if "INBOX" not in self.tabs or not self.tabs["INBOX"]:
            self.tabs["INBOX"] = list(INITIAL_INBOX)
        
        for name, headers in INITIAL_HEADERS.items():
            if name not in self.tabs:
                self.tabs[name] = [headers]

    def save(self):
        with open(MOCK_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(self.tabs, f, ensure_ascii=False, indent=2)

    def worksheet(self, name):
        if name not in self.tabs:
            self.tabs[name] = []
        return MockWorksheet(self, name, self.tabs[name])

class MockWorksheet:
    def __init__(self, parent, title, data_ref):
        self.parent = parent
        self.title = title
        self._data = data_ref

    def get_all_values(self):
        return self._data
    
    def append_row(self, row):
        self._data.append(row)
        self.parent.save() # Auto-save
        
    def update_cell(self, row, col, val):
        # 1-based index
        r_idx = row - 1
        c_idx = col - 1
        if r_idx < len(self._data):
            while len(self._data[r_idx]) <= c_idx:
                self._data[r_idx].append("")
            self._data[r_idx][c_idx] = val
            self.parent.save() # Auto-save

def get_gspread_client():
    if os.getenv("SHEET_KEY") == "dummy-sheet-key":
        return "mock_client"
    
    # Real Client
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
    client = gspread.authorize(creds)
    return client

def open_sheet(client, key):
    if client == "mock_client":
        return MockSheet()
    return client.open_by_key(key)

def ensure_tab(sheet, tab_name, headers):
    try:
        ws = sheet.worksheet(tab_name)
        # Check headers (simple check)
        existing = ws.get_all_values()
        if not existing:
            ws.append_row(headers)
        return ws
    except:
        if isinstance(sheet, MockSheet):
            # Should be handled by worksheet() or init, but safely add
            sheet.tabs[tab_name] = [headers]
            sheet.save()
            return sheet.worksheet(tab_name)
        else:
            ws = sheet.add_worksheet(title=tab_name, rows=100, cols=20)
            ws.append_row(headers)
            return ws

def read_rows(ws):
    return ws.get_all_values()

def append_row(ws, row):
    ws.append_row(row)

def update_cell(ws, row, col, val):
    ws.update_cell(row, col, val)
