import os
import re
import yaml
import datetime
import shutil

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITERATIONS_DIR = os.path.join(BASE_DIR, "VibeCoding", "04_Iterations")
DOCS_ITERATIONS_DIR = os.path.join(BASE_DIR, "docs", "iterations")

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def parse_frontmatter(content):
    """Parses YAML frontmatter from markdown content."""
    match = re.search(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return None, content
    try:
        data = yaml.safe_load(match.group(1))
        body = content[match.end():].strip()
        return data, body
    except yaml.YAMLError:
        return None, content

def get_slug(text):
    """Creates a URL-safe slug from text."""
    if not text:
        return "untitled"
    slug = text.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug)
    return slug

def process_iterations():
    print(f"Scanning {ITERATIONS_DIR}...")
    
    iterations = []
    
    if not os.path.exists(ITERATIONS_DIR):
        print("Iterations directory not found.")
        return

    for filename in os.listdir(ITERATIONS_DIR):
        if not filename.endswith(".md"):
            continue
            
        filepath = os.path.join(ITERATIONS_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            
        data, body = parse_frontmatter(content)
        
        if not data:
            print(f"Skipping {filename}: No frontmatter found")
            continue
            
        # Filter rules
        if data.get("type") != "iteration":
            continue
        if data.get("status") != "done":
            print(f"Skipping {filename}: status is '{data.get('status')}' (needs 'done')")
            continue
            
        # Required fields check (loose check, just warn if missing)
        required = ["iteration", "model", "summary", "updated"]
        missing = [f for f in required if f not in data]
        if missing:
            print(f"Warning: {filename} missing fields: {missing}")

        iterations.append({
            "filename": filename,
            "data": data,
            "body": body
        })

    # Sort by iteration number (descending)
    iterations.sort(key=lambda x: x["data"].get("iteration", 0), reverse=True)
    
    if not iterations:
        print("No valid 'done' iterations found to export.")
        # We might want to clear the docs/iterations folder or verify it exists
        ensure_dir(DOCS_ITERATIONS_DIR)
        return

    # Prepare docs/iterations directory
    # We don't delete everything, just in case. But we could.
    ensure_dir(DOCS_ITERATIONS_DIR)

    # Generate Index content
    index_content = ["# Iteration Log", "", "Latest iterations and performance benchmarks.", ""]
    index_content.append("| Iteration | Date | Model | Success | Latency | Summary |")
    index_content.append("| :--- | :--- | :--- | :--- | :--- | :--- |")

    for item in iterations:
        data = item["data"]
        
        # Parse date for folder structure
        updated_raw = data.get("updated")
        created_raw = data.get("created")
        
        # Try to parse date, default to today
        date_obj = datetime.datetime.now()
        date_str = str(updated_raw or created_raw or datetime.date.today())
        
        # Handle various date formats including Luxon-like string or YYYY-MM-DD
        try:
            # Simple check for YYYY-MM-DD
            if re.match(r"\d{4}-\d{2}-\d{2}", date_str):
                date_obj = datetime.datetime.strptime(date_str[:10], "%Y-%m-%d")
        except:
            pass
            
        yyyy_mm = date_obj.strftime("%Y-%m")
        target_dir = os.path.join(DOCS_ITERATIONS_DIR, yyyy_mm)
        ensure_dir(target_dir)
        
        # Create Slug
        slug_base = f"it{data.get('iteration')}-{get_slug(data.get('summary', ''))[:30]}"
        target_file = f"{slug_base}.md"
        relative_link = f"{yyyy_mm}/{target_file}"
        
        # Write individual file
        # We assume the body is safe to publish, OR we construct a safe body using the fields.
        # User requirement: "Internal notes/prompt text excluded".
        # So we should reconstruct the body from specific fields to be safe, 
        # or use the body but strip specific sections if we had a marker.
        # For now, let's strictly use the "Strict Evidence" fields and maybe the summary.
        
        doc_content = []
        doc_content.append(f"# Iteration {data.get('iteration')}")
        doc_content.append("")
        doc_content.append(f"**Date**: {date_str}  ")
        doc_content.append(f"**Model**: {data.get('model')}  ")
        doc_content.append(f"**Status**: {data.get('status')}")
        doc_content.append("")
        doc_content.append("## Summary")
        doc_content.append(data.get("summary", "No summary provided."))
        doc_content.append("")
        doc_content.append("## Metrics")
        doc_content.append(f"- **Success**: {'✅ PASS' if data.get('success') else '❌ FAIL'}")
        doc_content.append(f"- **Latency**: {data.get('latency_sec')}s")
        doc_content.append(f"- **Bugs Found**: {data.get('bugs_found')}")
        doc_content.append("")
        
        # If there are 'keep' or 'fix' lists
        if data.get("keep"):
            doc_content.append("## Keep")
            for k in data["keep"]:
                doc_content.append(f"- {k}")
            doc_content.append("")
            
        if data.get("fix"):
            doc_content.append("## Fix")
            for f in data["fix"]:
                doc_content.append(f"- {f}")
            doc_content.append("")
            
        # Write to file
        with open(os.path.join(target_dir, target_file), "w", encoding="utf-8") as f:
            f.write("\n".join(doc_content))
            
        # Add to Index
        success_icon = "✅" if data.get("success") else "❌"
        iter_link = f"[{data.get('iteration')}]({relative_link})"
        row = f"| {iter_link} | {date_str} | {data.get('model')} | {success_icon} | {data.get('latency_sec')}s | {data.get('summary')} |"
        index_content.append(row)

    # Write Index
    with open(os.path.join(DOCS_ITERATIONS_DIR, "index.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(index_content))
    
    print(f"Exported {len(iterations)} iterations to {DOCS_ITERATIONS_DIR}")

if __name__ == "__main__":
    process_iterations()
