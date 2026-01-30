import os
import shutil
import subprocess

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANDING_DIR = os.path.join(BASE_DIR, "web", "landing")
DOCS_SRC_DIR = os.path.join(BASE_DIR, "docs")
PUBLISH_DIR = os.path.join(BASE_DIR, "publish")
PUBLISH_DOCS_DIR = os.path.join(PUBLISH_DIR, "docs")
SITE_DIR = os.path.join(BASE_DIR, "site")

def run_command(command, cwd=None):
    print(f"Running: {command}")
    subprocess.check_call(command, shell=True, cwd=cwd)

def build_publish():
    print(f"Building unified site in {PUBLISH_DIR}...")
    
    # 1. Clean Publish Directory
    if os.path.exists(PUBLISH_DIR):
        shutil.rmtree(PUBLISH_DIR)
    os.makedirs(PUBLISH_DIR)
    
    # 2. Copy Landing Page (Root) -> publish/
    print(f"Copying landing page from {LANDING_DIR} to {PUBLISH_DIR}")
    if os.path.exists(LANDING_DIR):
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

    # 3. Build MkDocs -> site/
    print("Building MkDocs to temporary site/ directory...")
    # Ensure SSoT exists in docs/ (simulating CI pre-step if needed, but CI does it explicitly)
    # We'll stick to the script strictly doing the merge part, assuming env is ready
    run_command("mkdocs build --clean", cwd=BASE_DIR)
    
    # 4. Copy site/* -> publish/docs/
    print(f"Copying MkDocs site to {PUBLISH_DOCS_DIR}")
    if os.path.exists(SITE_DIR):
        shutil.copytree(SITE_DIR, PUBLISH_DOCS_DIR, dirs_exist_ok=True)
    else:
        print("Error: MkDocs site build failed (site/ directory not found)")
        return

    # 5. Verification
    print("\n--- Verification ---")
    landing_index = os.path.join(PUBLISH_DIR, "index.html")
    docs_index = os.path.join(PUBLISH_DOCS_DIR, "index.html")
    
    if os.path.exists(landing_index):
        print("✅ Landing Page: publish/index.html exists.")
    else:
        print("❌ Landing Page: publish/index.html MISSING.")
        
    if os.path.exists(docs_index):
        print("✅ Docs Site: publish/docs/index.html exists.")
    else:
        print("❌ Docs Site: publish/docs/index.html MISSING.")

    print(f"\nUnified publish build complete at: {PUBLISH_DIR}")

if __name__ == "__main__":
    try:
        build_publish()
    except Exception as e:
        print(f"Build failed: {e}")
        exit(1)
