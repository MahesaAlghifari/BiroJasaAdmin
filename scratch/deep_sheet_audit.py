import zipfile
import xml.etree.ElementTree as ET

wb_path = r"C:\Users\mahes\Downloads\Copy of Hitungan Pajak Beta 4 version hhahaheheh.xlsx"

sheets_to_inspect = [
    ("Sheet 4: PAJAK TAHUNAN  R4", "xl/worksheets/sheet4.xml"),
    ("Sheet 5: PAJAK TAHUNAN R2 ", "xl/worksheets/sheet5.xml"),
    ("Sheet 6: Mutasi LD F-B ke DKI ", "xl/worksheets/sheet6.xml"),
    ("Sheet 7: Mutasi LD B-F_F-F", "xl/worksheets/sheet7.xml"),
    ("Sheet 8: Mutasi AS", "xl/worksheets/sheet8.xml"),
    ("Sheet 9: Mutasi AS ke DKI", "xl/worksheets/sheet9.xml"),
    ("Sheet 10: BBN JEKARDAH", "xl/worksheets/sheet10.xml"),
    ("Sheet 11: BBN B Jabar_TRG (2)", "xl/worksheets/sheet11.xml"),
    ("Sheet 12: BBN B Jabar_TRG", "xl/worksheets/sheet12.xml"),
    ("Sheet 13: BBN Kab Bogor", "xl/worksheets/sheet13.xml"),
    ("Sheet 14: BBN Kota Bogor", "xl/worksheets/sheet14.xml"),
    ("Sheet 15: Mutasi LD Jauh Banget non DKI", "xl/worksheets/sheet15.xml"),
    ("Sheet 16: Mutasi LD Jauh Banget (5)", "xl/worksheets/sheet16.xml"),
    ("Sheet 17: Mutasi LDJB ke DKI", "xl/worksheets/sheet17.xml"),
    ("Sheet 18: BBN LD", "xl/worksheets/sheet18.xml"),
    ("Sheet 19: Mutasi Pindah Alamat LD", "xl/worksheets/sheet19.xml"),
    ("Sheet 20: Mutasi Pindah Alamat AS", "xl/worksheets/sheet20.xml"),
    ("Sheet 22: Ganti nopol ", "xl/worksheets/sheet22.xml"),
]

ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

with zipfile.ZipFile(wb_path) as z:
    shared_strings = []
    if "xl/sharedStrings.xml" in z.namelist():
        with z.open("xl/sharedStrings.xml") as f:
            ss_root = ET.parse(f).getroot()
            for si in ss_root.findall(".//s:si", ns):
                t_el = si.find("s:t", ns)
                if t_el is not None and t_el.text:
                    shared_strings.append(t_el.text)
                else:
                    txt = "".join(t.text for t in si.findall(".//s:t", ns) if t.text)
                    shared_strings.append(txt)

    with open("scratch/deep_sheet_audit_utf8.txt", "w", encoding="utf-8") as out:
        for title, path in sheets_to_inspect:
            out.write(f"\n=======================================================\n")
            out.write(f"=== {title} ({path}) ===\n")
            out.write(f"=======================================================\n")
            try:
                with z.open(path) as f:
                    root = ET.parse(f).getroot()
                    cells = {}
                    for c in root.findall(".//s:c", ns):
                        r = c.get("r")
                        v_el = c.find("s:v", ns)
                        f_el = c.find("s:f", ns)
                        v = v_el.text if v_el is not None else ""
                        if c.get("t") == "s" and v.isdigit():
                            idx = int(v)
                            if idx < len(shared_strings):
                                v = shared_strings[idx]
                        f_txt = f_el.text if f_el is not None else ""
                        cells[r] = (v, f_txt)
                    
                    # Print key cells
                    # Inputs: E, F, G, H, I rows 5 to 25
                    out.write("--- INPUTS & PARAMETERS ---\n")
                    for col in ["E", "F", "G", "H", "I"]:
                        for row in range(5, 26):
                            ref = f"{col}{row}"
                            if ref in cells and (cells[ref][0] or cells[ref][1]):
                                out.write(f"  {ref}: val={cells[ref][0]} | f={cells[ref][1]}\n")
                    
                    # Breakdown column B & C rows 15 to 45
                    out.write("--- BREAKDOWN (B & C) ---\n")
                    for row in range(15, 46):
                        b_ref = f"B{row}"
                        c_ref = f"C{row}"
                        b_val = cells.get(b_ref, ("", ""))[0]
                        c_val = cells.get(c_ref, ("", ""))[0]
                        c_formula = cells.get(c_ref, ("", ""))[1]
                        if b_ref in cells or c_ref in cells:
                            if c_val or c_formula or b_val:
                                out.write(f"  Row {row:2d}: B={b_val} | C_val={c_val} | C_formula={c_formula}\n")
            except Exception as e:
                out.write(f"Error loading {path}: {e}\n")

print("Deep audit complete!")
