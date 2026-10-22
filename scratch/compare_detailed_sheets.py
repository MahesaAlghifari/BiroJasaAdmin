import zipfile
import xml.etree.ElementTree as ET
import sys

sys.stdout = open("scratch/compare_detailed_output.txt", "w", encoding="utf-8")

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

    def load_sheet_cells(xml_path):
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
            return cells

    # 1. BBN comparison
    bbn_sheets = [
        ("Sheet 10: BBN JEKARDAH", "xl/worksheets/sheet10.xml"),
        ("Sheet 11: BBN B Jabar_TRG (2)", "xl/worksheets/sheet11.xml"),
        ("Sheet 12: BBN B Jabar_TRG", "xl/worksheets/sheet12.xml"),
        ("Sheet 13: BBN Kab Bogor", "xl/worksheets/sheet13.xml"),
        ("Sheet 14: BBN Kota Bogor", "xl/worksheets/sheet14.xml"),
        ("Sheet 18: BBN LD", "xl/worksheets/sheet18.xml"),
    ]

    print("="*80)
    print("ANALYSIS OF BBN SHEETS")
    print("="*80)
    for name, path in bbn_sheets:
        c = load_sheet_cells(path)
        print(f"\n--- {name} ---")
        # Check vehicle, region, formulas
        f13 = c.get("F13", ("", ""))[0]
        f14 = c.get("F14", ("", ""))[0]
        f15 = c.get("F15", ("", ""))[0]
        f16 = c.get("F16", ("", ""))[0]
        print(f"  F13 (Vehicle/Region?): '{f13}' | F14: '{f14}' | F15: '{f15}' | F16: '{f16}'")
        # Items in rows 26 to 36
        for r in range(16, 41):
            lbl = c.get(f"B{r}", ("", ""))[0]
            val = c.get(f"C{r}", ("", ""))[0]
            frm = c.get(f"C{r}", ("", ""))[1]
            if lbl or val or frm:
                print(f"    R{r:2d}: {lbl:<45} | val={val:<10} | formula={frm}")

    # 2. Mutasi LD comparison
    mutasi_ld_sheets = [
        ("Sheet 6: Mutasi LD F-B ke DKI", "xl/worksheets/sheet6.xml"),
        ("Sheet 7: Mutasi LD B-F_F-F", "xl/worksheets/sheet7.xml"),
        ("Sheet 15: Mutasi LD Jauh Banget non DKI", "xl/worksheets/sheet15.xml"),
        ("Sheet 16: Mutasi LD Jauh Banget (5)", "xl/worksheets/sheet16.xml"),
        ("Sheet 17: Mutasi LDJB ke DKI", "xl/worksheets/sheet17.xml"),
    ]

    print("\n" + "="*80)
    print("ANALYSIS OF MUTASI LD SHEETS")
    print("="*80)
    for name, path in mutasi_ld_sheets:
        c = load_sheet_cells(path)
        print(f"\n--- {name} ---")
        f11 = c.get("F11", ("", ""))[0]
        f12 = c.get("F12", ("", ""))[0]
        f13 = c.get("F13", ("", ""))[0]
        f14 = c.get("F14", ("", ""))[0]
        f15 = c.get("F15", ("", ""))[0]
        print(f"  F11: '{f11}' | F12: '{f12}' | F13: '{f13}' | F14: '{f14}' | F15: '{f15}'")
        for r in range(18, 45):
            lbl = c.get(f"B{r}", ("", ""))[0]
            val = c.get(f"C{r}", ("", ""))[0]
            frm = c.get(f"C{r}", ("", ""))[1]
            if lbl or val or frm:
                print(f"    R{r:2d}: {lbl:<45} | val={val:<10} | formula={frm}")

    # 3. Mutasi AS comparison
    mutasi_as_sheets = [
        ("Sheet 8: Mutasi AS", "xl/worksheets/sheet8.xml"),
        ("Sheet 9: Mutasi AS ke DKI", "xl/worksheets/sheet9.xml"),
    ]

    print("\n" + "="*80)
    print("ANALYSIS OF MUTASI AS SHEETS")
    print("="*80)
    for name, path in mutasi_as_sheets:
        c = load_sheet_cells(path)
        print(f"\n--- {name} ---")
        f13 = c.get("F13", ("", ""))[0]
        f14 = c.get("F14", ("", ""))[0]
        f15 = c.get("F15", ("", ""))[0]
        print(f"  F13: '{f13}' | F14: '{f14}' | F15: '{f15}'")
        for r in range(18, 43):
            lbl = c.get(f"B{r}", ("", ""))[0]
            val = c.get(f"C{r}", ("", ""))[0]
            frm = c.get(f"C{r}", ("", ""))[1]
            if lbl or val or frm:
                print(f"    R{r:2d}: {lbl:<45} | val={val:<10} | formula={frm}")

    # 4. Miscellaneous sheets
    misc_sheets = [
        ("Sheet 19: Mutasi Pindah Alamat LD", "xl/worksheets/sheet19.xml"),
        ("Sheet 20: Mutasi Pindah Alamat AS", "xl/worksheets/sheet20.xml"),
        ("Sheet 21: Revisi Pindah Alamat Samsat SM", "xl/worksheets/sheet21.xml"),
        ("Sheet 22: Ganti nopol ", "xl/worksheets/sheet22.xml"),
        ("Sheet 24: HIT. SELISIH BBN", "xl/worksheets/sheet24.xml"),
        ("Sheet 25: HIT. SELISIH MUTASI", "xl/worksheets/sheet25.xml"),
    ]

    print("\n" + "="*80)
    print("ANALYSIS OF MISC SHEETS")
    print("="*80)
    for name, path in misc_sheets:
        c = load_sheet_cells(path)
        print(f"\n--- {name} ---")
        for r in range(15, 42):
            lbl = c.get(f"B{r}", ("", ""))[0]
            val = c.get(f"C{r}", ("", ""))[0]
            frm = c.get(f"C{r}", ("", ""))[1]
            if lbl or val or frm:
                print(f"    R{r:2d}: {lbl:<45} | val={val:<10} | formula={frm}")
