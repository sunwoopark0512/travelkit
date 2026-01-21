import os
import shutil
import subprocess

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANDING_DIR = os.path.join(BASE_DIR, "web", "landing")
DOCS_SRC_DIR = os.path.join(BASE_DIR, "docs")
PUBLISH_DIR = os.path.join(BASE_DIR, "publish")
DOCS_OUT_DIR = os.path.join(PUBLISH_DIR, "docs")

def run_command(command, cwd=None):
    print(f"Running: {command}")
    subprocess.check_call(command, shell=True, cwd=cwd)

def build_site():
    print(f"Building site from {BASE_DIR}")
    
    # 1. Clean Publish Directory
    if os.path.exists(PUBLISH_DIR):
        shutil.rmtree(PUBLISH_DIR)
    os.makedirs(PUBLISH_DIR)
    
    # 2. Copy Landing Page (Root)
    print(f"Copying landing page from {LANDING_DIR} to {PUBLISH_DIR}")
    if os.path.exists(LANDING_DIR):
        # shutil.copytree(LANDING_DIR, PUBLISH_DIR, dirs_exist_ok=True)
        # Using loop to avoid nesting or permission issues on top level
        for item in os.listdir(LANDING_DIR):
            s = os.path.join(LANDING_DIR, item)
            d = os.path.join(PUBLISH_DIR, item)
            if os.path.isdir(s):
                shutil.copytree(s, d, dirs_exist_ok=True)
            else:
                shutil.copy2(s, d)
    else:
        print("Error: Landing directory not found!")
        return

    # 3. Build MkDocs (Docs)
    print("Building MkDocs...")
    # Make sure we have the SSoT synced first (optional, but good practice)
    # run_command("python scripts/sync_ssot.py", cwd=BASE_DIR)
    
    # MkDocs build -> site/
    # We want it to go to publish/docs
    # But mkdocs build --site-dir usually cleans the dir.
    # So we build to standard 'site' then move, or build directly to publish/docs?
    # Let's build directly to publish/docs.
    
    # First ensure the 'docs' folder exists in source if we need specific file moves? 
    # No, mkdocs.yml defines the structure.
    
    # We need to ensure 'docs/ssot.md' exists because mkdocs needs it.
    # CI does: cp ssot/SSoT.md docs/ssot.md
    ssot_src = os.path.join(BASE_DIR, "ssot", "SSoT.md")
    ssot_dest_docs = os.path.join(BASE_DIR, "docs", "ssot.md")
    if os.path.exists(ssot_src):
        shutil.copy2(ssot_src, ssot_dest_docs)
        print("Synced SSoT.md to docs/")

    run_command(f"mkdocs build --clean --site-dir \"{DOCS_OUT_DIR}\"", cwd=BASE_DIR)
    
    # 4. Verification
    print("\n--- Verification ---")
    
    landing_index = os.path.join(PUBLISH_DIR, "index.html")
    docs_index = os.path.join(DOCS_OUT_DIR, "index.html")
    
    if os.path.exists(landing_index):
        print("✅ Landing Page (Root) exists.")
    else:
        print("❌ Landing Page (Root) MISSING.")
        
    if os.path.exists(docs_index):
        print("✅ Docs (Subdir) exists.")
    else:
        print("❌ Docs (Subdir) MISSING.")

    print(f"\nBuild complete. Output in: {PUBLISH_DIR}")

if __name__ == "__main__":
    try:
        build_site()
    except Exception as e:
        print(f"Build failed: {e}")
        exit(1)
