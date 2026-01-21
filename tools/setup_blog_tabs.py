import os
import sys

# Add tools to path
sys.path.append(os.path.join(os.getcwd(), 'tools'))

from sheet_io import get_gspread_client, open_sheet, ensure_tab, append_row

BLOGQ_HEADERS = ["Date","IdemKey","SourceTitle","SourceBody","TargetReader","PostType","Keywords","Angle","Status","Notes"]
BLOG_HEADERS  = ["Date","IdemKey","SEO_Title","TLDR","Intro","Body","Checklist","Common_Mistakes","Practice_Tips","ImagePrompt","ImageURL","ImageStatus","Model","PromptVer"]

def main():
    key = os.getenv("SHEET_KEY")
    if not key:
        print("FAIL: Missing SHEET_KEY env var")
        return

    print(f"Connecting to sheet {key[:5]}...")
    client = get_gspread_client()
    sheet = open_sheet(client, key)

    print("1. Ensuring BLOG_QUEUE tab...")
    q_ws = ensure_tab(sheet, "BLOG_QUEUE", BLOGQ_HEADERS)
    
    print("2. Ensuring BLOG_POSTS tab...")
    b_ws = ensure_tab(sheet, "BLOG_POSTS", BLOG_HEADERS)

    print("3. Inserting Test Row into BLOG_QUEUE...")
    # Date, IdemKey, SourceTitle, SourceBody, TargetReader, PostType, Keywords, Angle, Status, Notes
    test_row = [
        "", "", "무릎", "오초 동작 시 무릎 안쪽이 시큰거림. 보폭을 줄이니 좀 나음.", 
        "50~60대 탱고 건강", "Checklist", "무릎,오초,안전", "무릎 안 다치는 오초 꿀팁", "READY", "Auto-Setup Test"
    ]
    append_row(q_ws, test_row)
    print("SUCCESS: Test row inserted. Ready to run tango_blog.ps1")

if __name__ == "__main__":
    main()
