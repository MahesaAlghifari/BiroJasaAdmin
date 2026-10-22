import sys

keyword = sys.argv[1] if len(sys.argv) > 1 else ""

with open("scratch/audit_direct_output.txt", "r", encoding="utf-16", errors="ignore") as f:
    text = f.read()

sheets = text.split("===========================================================================")
for s in sheets:
    s = s.strip()
    if not s:
        continue
    header = s.split("\n")[0]
    if keyword.lower() in header.lower() or keyword.lower() in s.lower():
        print("="*75)
        print(s)
        print("\n")
