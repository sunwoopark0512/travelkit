import os
import sys
import time

sys.path.append(os.path.join(os.getcwd(), 'tools'))

try:
    from sheet_io import get_gspread_client, open_sheet, ensure_tab, read_rows, update_cell
    from blog_gen import BLOGQ_HEADERS
except ImportError:
    from tools.sheet_io import get_gspread_client, open_sheet, ensure_tab, read_rows, update_cell
    from tools.blog_gen import BLOGQ_HEADERS

def activate_batch_items():
    # Topics to activate
    targets = [
        "40대+ 탱고 워밍업 7분 루틴",
        "무릎이 편한 탱고 걷기 세팅",
        "허리가 편한 축(Axis) 만들기",
        "고관절 열리면 오초(8자) 쉬워진다",
        "40대+ 신발 선택 5원칙"
    ]
    
    key = os.getenv("SHEET_KEY", "dummy-sheet-key")
    print(f"Connecting to sheet {key[:5]}...")
    client = get_gspread_client()
    sheet = open_sheet(client, key)
    
    q_ws = ensure_tab(sheet, "BLOG_QUEUE", BLOGQ_HEADERS)
    rows = read_rows(q_ws)
    
    updated_count = 0
    # Header is row 1. Data starts row 2.
    # Col 3 is SourceTitle (index 2), Col 9 is Status (index 8)
    
    print("Scanning for targets...")
    for i, row in enumerate(rows[1:], start=2):
        if len(row) < 9: continue
        
        title = (row[2] or "").strip()
        status = (row[8] or "").strip()
        
        # Check if title matches any target (partial match is safe enough here)
        found = False
        for t in targets:
            if t in title:
                found = True
                break
        
        if found:
            if status != "READY":
                print(f"Activating row {i}: {title}")
                update_cell(q_ws, i, 9, "READY")
                time.sleep(1.0) # Rate limit
                updated_count += 1
            else:
                print(f"Already READY: {title}")
                
    print(f"Done. Activated {updated_count} items.")

if __name__ == "__main__":
    activate_batch_items()
