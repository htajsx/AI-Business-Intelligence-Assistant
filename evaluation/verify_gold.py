import json
import sqlite3
import time
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DB_PATH = BASE_DIR / "data" / "processed" / "olist.db"
JSONL_PATH = BASE_DIR / "evaluation" / "test_set" / "questions.jsonl"
OUT_PATH = BASE_DIR / "evaluation" / "results" / "gold_check.md"

def verify():
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    questions = []
    with open(JSONL_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                questions.append(json.loads(line))
                
    ids = [q['id'] for q in questions]
    if len(set(ids)) != len(ids):
        print("WARNING: Duplicate IDs found!")
        
    diff_counts = {"easy": 0, "medium": 0, "hard": 0}
    lang_counts = {"en": 0, "vi": 0}
    type_counts = {"kpi": 0, "single_table": 0, "join": 0, "time_comparison": 0, "window": 0, "scoped": 0, "ambiguous": 0}
    
    for q in questions:
        diff_counts[q['difficulty']] += 1
        lang_counts[q['lang']] += 1
        type_counts[q['type']] += 1
        
    print(f"Total questions: {len(questions)}")
    print(f"Difficulties: {diff_counts}")
    print(f"Languages: {lang_counts}")
    print(f"Types: {type_counts}")
    
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
    except Exception as e:
        print(f"Could not connect to DB: {e}")
        return

    md_lines = []
    md_lines.append("| ID | Rows | Time (ms) | First Row | Flags |")
    md_lines.append("|---|---|---|---|---|")
    
    for q in questions:
        q_id = q['id']
        sql = q['gold_sql']
        
        start = time.perf_counter()
        flags = []
        rows = []
        first_row_str = ""
        
        try:
            cursor = conn.cursor()
            cursor.execute(sql)
            rows = cursor.fetchall()
            elapsed = int((time.perf_counter() - start) * 1000)
            
            if len(rows) == 0:
                flags.append("EMPTY")
            else:
                if len(rows) > 100:
                    flags.append("BIG")
                
                has_null = False
                for r in rows:
                    if any(val is None for val in r):
                        has_null = True
                        break
                if has_null:
                    flags.append("NULLS")
                    
                first_row_dict = dict(rows[0])
                first_row_str = str(first_row_dict)[:50] + ("..." if len(str(first_row_dict)) > 50 else "")
                
        except Exception as e:
            elapsed = int((time.perf_counter() - start) * 1000)
            flags.append("ERROR")
            first_row_str = str(e)[:50]
            
        md_lines.append(f"| {q_id} | {len(rows)} | {elapsed} | {first_row_str} | {','.join(flags)} |")
        
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
        
    print(f"Verification complete. Results saved to {OUT_PATH}")

if __name__ == "__main__":
    verify()