with open("scratch/deep_sheet_audit.txt", "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

sections = text.split("=======================================================")
for sec in sections:
    if not sec.strip():
        continue
    lines = [line.rstrip() for line in sec.strip().split("\n") if line.strip()]
    header = lines[0] if lines else ""
    print("\n" + "="*70)
    print(header)
    print("="*70)
    # Extract vehicle, service, process, and total rows
    for line in lines:
        if any(keyword in line for keyword in ["F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20", "I5", "I6", "I7", "I8", "I9", "I10", "I11", "I12", "I13", "I14", "I15", "I16", "I17", "I18"]):
            if "val=" in line:
                print(f"  [PARAM] {line}")
        elif "TOTAL" in line.upper() or "GRAND" in line.upper() or "JUMLAH" in line.upper() or "ROUNDUP(SUM" in line or "SUM(C" in line:
            print(f"  [TOTAL/SUM] {line}")
        elif any(comp in line.lower() for comp in ["tarik berkas", "mutasi masuk", "proses", "jasa", "bbn", "opsen", "stnk", "tnkb"]):
            print(f"  [ITEM] {line}")
