import zipfile
import xml.etree.ElementTree as ET

wb_path = r"C:\Users\mahes\Downloads\Copy of Hitungan Pajak Beta 4 version hhahaheheh.xlsx"

with zipfile.ZipFile(wb_path) as z:
    with z.open("xl/workbook.xml") as f:
        root = ET.parse(f).getroot()
        ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        sheets = root.findall(".//s:sheet", ns)
        
    with z.open("xl/_rels/workbook.xml.rels") as f:
        rels_root = ET.parse(f).getroot()
        rels_ns = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}
        rels_map = {rel.get("Id"): rel.get("Target") for rel in rels_root.findall(".//r:Relationship", rels_ns)}

print(f"Total Sheets: {len(sheets)}\n")
for i, s in enumerate(sheets, 1):
    name = s.get("name")
    r_id = s.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
    target = rels_map.get(r_id, "")
    print(f"{i:2d}. Name: '{name}' | rId: {r_id} | Target: {target}")
