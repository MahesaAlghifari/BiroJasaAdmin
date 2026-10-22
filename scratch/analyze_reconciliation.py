import re

with open("scratch/deep_sheet_audit_utf8.txt", "r", encoding="utf-8") as f:
    content = f.read()

sections = content.split("=======================================================")
sheets_data = []

for sec in sections:
    sec = sec.strip()
    if not sec:
        continue
    lines = [l.strip() for l in sec.split("\n") if l.strip()]
    title = lines[0] if lines else "Unknown"
    
    # Extract params and breakdown
    params = []
    breakdown = []
    mode = None
    for l in lines[1:]:
        if "--- INPUTS & PARAMETERS ---" in l:
            mode = "params"
            continue
        elif "--- BREAKDOWN (B & C) ---" in l:
            mode = "breakdown"
            continue
        if mode == "params":
            params.append(l)
        elif mode == "breakdown":
            breakdown.append(l)
            
    sheets_data.append((title, params, breakdown))

print(f"Parsed {len(sheets_data)} sheets.\n")

for title, params, breakdown in sheets_data:
    print(f"\n######################################################################")
    print(f"### {title}")
    print(f"######################################################################")
    
    # Print notable params
    key_params = [p for p in params if any(k in p for k in ["F5:", "F6:", "F7:", "F8:", "F9:", "F10:", "F11:", "F12:", "F13:", "F14:", "F15:", "F16:", "F17:", "F18:", "F19:", "F20:", "F21:", "F22:", "F23:", "I5:", "I6:", "I7:", "I8:", "I9:", "I10:", "I11:", "I12:", "I13:", "I14:"])]
    for kp in key_params:
        print(f"  {kp}")
        
    print("  --- Key Breakdown Rows ---")
    for b in breakdown:
        if any(w in b.lower() for w in ["total", "sum", "jasa", "proses", "tarik berkas", "masuk bpkb", "bbn", "opsen", "stnk", "tnkb", "pkb"]):
            print(f"    {b}")
