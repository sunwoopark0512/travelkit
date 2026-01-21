import os
import sys

# Append CWD to path so we can leverage existing tools
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'tools'))

try:
    from tools.sheet_io import get_gspread_client, open_sheet, ensure_tab, append_row
except ImportError:
    # If run from tools dir
    from sheet_io import get_gspread_client, open_sheet, ensure_tab, append_row

def main():
    print("DOT: Checking environment...")
    
    # 1. Check credentials
    if not os.path.exists('credentials.json') and not os.path.exists('../credentials.json'):
         print("FAIL: 'credentials.json' not found in project folder.")
         print("      copy it here from your Downloads folder.")
         sys.exit(1)
    
    # 2. Check Env Var
    key = os.getenv("SHEET_KEY")
    if not key or key == "dummy-sheet-key":
        print("FAIL: SHEET_KEY is not set to a real value.")
        print("      Set it via: $env:SHEET_KEY='your-key'")
        sys.exit(1)
        
    print(f"DOT: Attempting to connect to Sheet Key: {key[:5]}...")
    
    try:
        client = get_gspread_client()
        # open_sheet might return MockSheet if logic is weird, but get_gspread_client checks env
        # Wait, get_gspread_client in sheet_io.py checks for "dummy-sheet-key"
        # Since we validated key != dummy above, it should try real connection OR fail if credentials invalid
        
        sheet = open_sheet(client, key)
        print("SUCCESS: Connected to Sheet!")
        
        print("DOT: Verifying 'INBOX' tab...")
        ws = ensure_tab(sheet, "INBOX", ["Date", "Title", "Body", "IdemKey"])
        print("SUCCESS: Found/Created 'INBOX' tab.")
        
        print("DOT: Attempting Test Write...")
        import datetime
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        append_row(ws, [ts, "CONNECTION_TEST", "This is a test row from check_connection.ps1", "test_id"])
        print("SUCCESS: Wrote test row to INBOX.")
        
        print("-" * 30)
        print("✅ REAL MODE CONNECTED!")
        print("-" * 30)
        
    except Exception as e:
        print("\n❌ CONNECTION FAILED")
        print(f"Error Details: {e}")
        print("\nCommon Fixes:")
        print("1. Did you share the sheet with the email in credentials.json?")
        print("2. Is the SHEET_KEY copied correctly?")
        sys.exit(1)

if __name__ == "__main__":
    main()
