import os
import re
import yaml

# Pths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SSOT_PATH = os.path.join(BASE_DIR, "ssot", "SSoT.md")
README_PATH = os.path.join(BASE_DIR, "README.md")

def load_ssot():
    with open(SSOT_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Extract YAML frontmatter
    match = re.search(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        raise ValueError("SSoT.md missing YAML frontmatter")
    
    frontmatter = yaml.safe_load(match.group(1))
    return frontmatter

def generate_summary(data):
    summary = []
    summary.append(f"> **SSoT Status**: {data.get('project', 'Unknown')} (Updated: {data.get('updated', 'Unknown')})")
    summary.append(">")
    
    if "success_metrics" in data:
        summary.append("> **Success Metrics**:")
        for m in data["success_metrics"]:
            summary.append(f"> - {m}")
            
    summary.append(">")
    if "core_features" in data:
        summary.append("> **Core Features**:")
        for f in data["core_features"]:
            summary.append(f"> - {f}")
            
    return "\n".join(summary)

def update_readme(summary_text):
    with open(README_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    
    start_marker = "<!-- SSOT-SUMMARY-START -->"
    end_marker = "<!-- SSOT-SUMMARY-END -->"
    
    pattern = f"{re.escape(start_marker)}.*?{re.escape(end_marker)}"
    replacement = f"{start_marker}\n{summary_text}\n{end_marker}"
    
    if start_marker not in content:
        # Prepend if markers don't exist
        print("Markers not found, injecting at top...")
        # Inject after the first header if possible
        lines = content.splitlines()
        if lines and lines[0].startswith("# "):
            lines.insert(1, "\n" + replacement + "\n")
            new_content = "\n".join(lines)
        else:
            new_content = replacement + "\n\n" + content
    else:
        new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        
    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("README.md updated with SSoT summary.")

if __name__ == "__main__":
    try:
        data = load_ssot()
        summary = generate_summary(data)
        update_readme(summary)
    except Exception as e:
        print(f"Error: {e}")
        exit(1)
