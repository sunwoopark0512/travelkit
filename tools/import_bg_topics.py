import os
import sys
import csv
import datetime
import hashlib

# Add tools to path
sys.path.append(os.path.join(os.getcwd(), 'tools'))

try:
    from sheet_io import get_gspread_client, open_sheet, ensure_tab, append_row, read_rows
    from blog_gen import BLOGQ_HEADERS, compute_hash, _now
except ImportError:
    # If running directly from tools/ might need adjustment, but standard is from root
    from tools.sheet_io import get_gspread_client, open_sheet, ensure_tab, append_row, read_rows
    from tools.blog_gen import BLOGQ_HEADERS, compute_hash, _now

def import_topics():
    csv_path = 'inputs/batch_tango_100.csv'
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    # 1. Connect to Sheet
    key = os.getenv("SHEET_KEY", "dummy-sheet-key")
    print(f"Connecting to sheet {key[:5]}...")
    client = get_gspread_client()
    sheet = open_sheet(client, key)
    
    # 2. Ensure BLOG_QUEUE
    # BLOGQ_HEADERS = ["Date","IdemKey","SourceTitle","SourceBody","TargetReader","PostType","Keywords","Angle","Status","Notes"]
    q_ws = ensure_tab(sheet, "BLOG_QUEUE", BLOGQ_HEADERS)
    
    # 3. Read CSV
    print(f"Reading {csv_path}...")
    encodings = ['utf-8', 'cp949', 'euc-kr']
    rows = []
    
    for enc in encodings:
        try:
            with open(csv_path, 'r', encoding=enc) as f:
                # Manual TSV detection since user pasted TSV into .csv
                start = f.read(1024)
                f.seek(0)
                delimiter = '\t' if '\t' in start else ','
                reader = csv.DictReader(f, delimiter=delimiter)
                rows = list(reader)
            if rows and ('Topic' in rows[0] or '주제' in rows[0]): # Validate header (Topic or 주제)
                 break
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"WARN: Read failed with {enc}: {e}")
            continue
            
    if not rows:
        print("Failed to read CSV or empty.")
        return

    print(f"Found {len(rows)} topics. Uploading to BLOG_QUEUE...")

    # 4. Append to Sheet (Batch)
    new_rows = []
    count = 0
    for r in rows:
        # Mapping:
        # Topic/주제 -> SourceTitle
        # OneLineDesc/한줄설명 -> SourceBody
        # Category/카테고리 -> Keywords
        
        # Robust Key Access (English or Korean)
        title = r.get('Topic') or r.get('주제') or ''
        title = title.strip()
        
        body = r.get('OneLineDesc') or r.get('한줄설명') or ''
        body = body.strip()
        
        cat = r.get('Category') or r.get('카테고리') or ''
        cat = cat.strip()
        
        if not title: 
            continue

        idem = compute_hash(title + body)
        
        # ["Date","IdemKey","SourceTitle","SourceBody","TargetReader","PostType","Keywords","Angle","Status","Notes"]
        new_row = [
            _now(),
            idem,
            title,
            body,
            "50~60대 탱고",  # TargetReader Default
            "Tip/Guide",     # PostType
            cat,             # Keywords
            "",              # Angle
            "WAIT",          # Status (WAIT so it doesn't auto-gen all at once)
            "Batch Import"   # Notes
        ]
        
        new_rows.append(new_row)
        count += 1

    if new_rows:
        print(f"Sending {len(new_rows)} rows in one batch...")
        q_ws.append_rows(new_rows)
        print(f"✅ Successfully uploaded {len(new_rows)} items to BLOG_QUEUE.")
    print("👉 Change Status to 'READY' in the sheet to generate blog posts.")

if __name__ == "__main__":
    import_topics()
