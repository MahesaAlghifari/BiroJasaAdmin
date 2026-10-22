import re

def get_sheet_content(sheet_name_pattern):
    with open("scratch/deep_sheet_audit_utf8.txt", "r", encoding="utf-8") as f:
        content = f.read()
    sections = content.split("=======================================================")
    for sec in sections:
        if sheet_name_pattern.lower() in sec.lower():
            return sec.strip()
    return ""

def print_sheet_details(title, pattern):
    print("\n" + "#"*80)
    print(f"### {title}")
    print("#"*80)
    sec = get_sheet_content(pattern)
    if not sec:
        print("NOT FOUND")
        return
    for line in sec.split("\n"):
        line = line.strip()
        # Filter for interesting lines: inputs (E/F/G/H/I rows), breakdown rows
        if any(line.startswith(prefix) for prefix in ["E", "F", "G", "H", "I", "  E", "  F", "  G", "  H", "  I", "Row", "  Row", "==="]):
            print(" ", line)

print("=== GROUP 2: BBN SHEETS ===")
print_sheet_details("Sheet 10: BBN JEKARDAH", "Sheet 10")
print_sheet_details("Sheet 11: BBN B Jabar_TRG (2)", "Sheet 11")
print_sheet_details("Sheet 12: BBN B Jabar_TRG", "Sheet 12")
print_sheet_details("Sheet 13: BBN Kab Bogor", "Sheet 13")
print_sheet_details("Sheet 14: BBN Kota Bogor", "Sheet 14")
print_sheet_details("Sheet 18: BBN LD", "Sheet 18")

print("\n=== GROUP 3: MUTASI AS SHEETS ===")
print_sheet_details("Sheet 8: Mutasi AS", "Sheet 8")
print_sheet_details("Sheet 9: Mutasi AS ke DKI", "Sheet 9")
print_sheet_details("Sheet 20: Mutasi Pindah Alamat AS", "Sheet 20")

print("\n=== GROUP 4: MUTASI LD SHEETS ===")
print_sheet_details("Sheet 6: Mutasi LD F-B ke DKI", "Sheet 6")
print_sheet_details("Sheet 7: Mutasi LD B-F_F-F", "Sheet 7")
print_sheet_details("Sheet 15: Mutasi LD Jauh Banget non DKI", "Sheet 15")
print_sheet_details("Sheet 16: Mutasi LD Jauh Banget (5)", "Sheet 16")
print_sheet_details("Sheet 17: Mutasi LDJB ke DKI", "Sheet 17")
print_sheet_details("Sheet 19: Mutasi Pindah Alamat LD", "Sheet 19")
