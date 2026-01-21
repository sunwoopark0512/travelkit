import os
import re
import datetime
import json
import csv

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(BASE_DIR, "docs", "learning")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
OUTPUT_JSONL = os.path.join(OUTPUT_DIR, "gold_qa.jsonl")
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "gold_qa.csv")

def ensure_output_dir():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

def parse_frontmatter(content):
    """
    Simple/Safe YAML frontmatter parser.
    Expects --- at start, content, --- ending.
    """
    match = re.search(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return None, content
    
    fm_text = match.group(1)
    body = content[match.end():]
    
    metadata = {}
    for line in fm_text.splitlines():
        if ":" in line:
            key, val = line.split(":", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            
            # Simple list handling [a,b]
            if val.startswith("[") and val.endswith("]"):
                items = val[1:-1].split(",")
                val = [i.strip().strip('"').strip("'") for i in items if i.strip()]
                
            metadata[key] = val
            
    return metadata, body

def extract_qa_from_section(body):
    """
    Extracts Q&A from a markdown section "## Gold Questions"
    Expects format:
    Q: ...
    A: ...
    """
    qa_pairs = []
    
    # Simple regex for Q/A blocks
    # Looks for 'Q: ...' followed eventually by 'A: ...'
    # Handles multiline answers until next Q: or end of section/file
    
    section_match = re.search(r"## Gold Questions(.*?)(^## |\Z)", body, re.DOTALL|re.MULTILINE)
    if not section_match:
        return qa_pairs
    
    section_text = section_match.group(1)
    
    # Split by "Q:"
    # This is a basic parser; rigid formatting required.
    chunks = re.split(r"(^|\n)Q: ", section_text)
    
    for chunk in chunks:
        if not chunk.strip():
            continue
            
        # Find "A:"
        parts = re.split(r"(^|\n)A: ", chunk)
        if len(parts) >= 2:
            question = parts[0].strip()
            # The rest is answer
            # Join just in case "A:" appears in answer (unlikely with this split logic but safer)
            answer_raw = " ".join(parts[1:]).strip() 
            qa_pairs.append({
                "question": question,
                "answer": answer_raw
            })
            
    return qa_pairs

def main():
    print(f"Scanning for Gold QA in {DOCS_DIR}...")
    ensure_output_dir()
    
    all_qa = []
    
    for root, dirs, files in os.walk(DOCS_DIR):
        # Exclude _templates
        if "_templates" in root:
            continue
            
        for file in files:
            if not file.endswith(".md"):
                continue
                
            filepath = os.path.join(root, file)
            rel_path = os.path.relpath(filepath, BASE_DIR).replace("\\", "/")
            
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
                
            meta, body = parse_frontmatter(content)
            if not meta:
                # print(f"Skipping {rel_path} (no frontmatter)")
                continue

            # Check for QA in body
            pairs = extract_qa_from_section(body)
            
            # Check for QA in metadata (gold_questions list of objects) - Not implemented in simple parser
            # Assuming body section for now based on templates.
            
            for i, p in enumerate(pairs):
                all_qa.append({
                    "doc_path": rel_path,
                    "doc_type": meta.get("type", "unknown"),
                    "version": meta.get("version", "1.0.0"),
                    "tags": meta.get("tags", []),
                    "question": p["question"],
                    "answer": p["answer"],
                    "qa_id": f"{os.path.basename(file)}:{i}"
                })

    # Sort
    all_qa.sort(key=lambda x: (x["doc_path"], x["qa_id"]))
    
    # Output JSONL
    with open(OUTPUT_JSONL, "w", encoding="utf-8") as f:
        for item in all_qa:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
            
    # Output CSV
    with open(OUTPUT_CSV, "w", encoding="utf-8", newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["doc_path", "type", "version", "question", "answer", "tags"])
        for item in all_qa:
            writer.writerow([
                item["doc_path"],
                item["doc_type"], 
                item["version"], 
                item["question"], 
                item["answer"], 
                ";".join(item["tags"]) if isinstance(item["tags"], list) else item["tags"]
            ])

    print(f"Generated {len(all_qa)} QA pairs.")
    print(f"JSONL: {OUTPUT_JSONL}")
    print(f"CSV: {OUTPUT_CSV}")

if __name__ == "__main__":
    main()
