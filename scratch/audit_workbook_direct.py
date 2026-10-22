import zipfile
import xml.etree.ElementTree as ET

wb_path = r"C:\Users\mahes\Downloads\Copy of Hitungan Pajak Beta 4 version hhahaheheh.xlsx"
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

    def audit_sheet(sheet_name, xml_path):
        print(f"\n{'='*75}")
        print(f"SHEET: {sheet_name} ({xml_path})")
        print(f"{'='*75}")
        with z.open(xml_path) as f:
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

            # 1. Inputs (F5:F25 and I5:I20)
            print("--- PARAMETERS & INPUTS ---")
            for col in ["F", "I"]:
                for row in range(5, 25):
                    ref = f"{col}{row}"
                    if ref in cells and (cells[ref][0] or cells[ref][1]):
                        # check if there is label in D or E or H
                        lbl = cells.get(f"E{row}", cells.get(f"D{row}", cells.get(f"H{row}", ("", ""))))[0]
                        print(f"  {ref} ({lbl}): val='{cells[ref][0]}' | formula='{cells[ref][1]}'")

            # 2. Key Breakdown Rows (B & C)
            print("--- BREAKDOWN ROWS (B & C) ---")
            for row in range(15, 45):
                b = cells.get(f"B{row}", ("", ""))[0]
                c_val = cells.get(f"C{row}", ("", ""))[0]
                c_f = cells.get(f"C{row}", ("", ""))[1]
                if b or c_val or c_f:
                    print(f"  Row {row:2d} | B='{b}' | C_val='{c_val}' | C_formula='{c_f}'")

    # Let's run on all relevant sheets!
    targets = [
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
        ("Sheet 21: Revisi Pindah Alamat Samsat SM", "xl/worksheets/sheet21.xml"),
        ("Sheet 22: Ganti nopol ", "xl/worksheets/sheet22.xml"),
        ("Sheet 24: HIT. SELISIH BBN", "xl/worksheets/sheet24.xml"),
        ("Sheet 25: HIT. SELISIH MUTASI", "xl/worksheets/sheet25.xml"),
    ]

    for title, path in targets:
        audit_sheet(title, path)
