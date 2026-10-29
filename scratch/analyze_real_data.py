import zipfile
import xml.etree.ElementTree as ET
import collections

xlsx_path = '07. Database Report FG Juli 26.xlsx'

with zipfile.ZipFile(xlsx_path, 'r') as z:
    # 1. Load shared strings
    print("Loading shared strings...")
    shared_strings = []
    with z.open('xl/sharedStrings.xml') as f:
        # Use iterparse to save memory
        context = ET.iterparse(f, events=('end',))
        for event, elem in context:
            if elem.tag.endswith('si'):
                # find all t elements inside si
                runs = [node.text for node in elem.iter() if node.tag.endswith('t') and node.text]
                shared_strings.append(''.join(runs))
                elem.clear()
    print(f"Loaded {len(shared_strings)} shared strings.")

    # 2. Inspect sheet1 (Data Base)
    print("Parsing sheet1.xml (Data Base)...")
    cols = {}
    rows_data = []
    header_map = {}
    
    with z.open('xl/worksheets/sheet1.xml') as f:
        context = ET.iterparse(f, events=('end',))
        for event, elem in context:
            if elem.tag.endswith('row'):
                row_num = int(elem.attrib.get('r', 0))
                cell_vals = {}
                for c in elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    r_ref = c.attrib.get('r', '')
                    col_letter = ''.join([ch for ch in r_ref if ch.isalpha()])
                    t_attr = c.attrib.get('t', '')
                    v_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = v_elem.text if v_elem is not None else None
                    if val is not None:
                        if t_attr == 's':
                            val = shared_strings[int(val)] if int(val) < len(shared_strings) else val
                    cell_vals[col_letter] = val
                
                if row_num == 1:
                    header_map = cell_vals
                elif row_num > 1 and cell_vals:
                    rows_data.append(cell_vals)
                
                elem.clear()

print(f"Header: {header_map}")
print(f"Total data rows extracted: {len(rows_data)}")

# Let's inspect data completeness and distributions
grades = collections.Counter()
weights = []
locations = collections.Counter()
jops = collections.Counter()
shifts = collections.Counter()
pics = collections.Counter()
gsms = collections.Counter()

for r in rows_data:
    grade = r.get('F')
    gsm = r.get('G')
    weight = r.get('N')
    loc = r.get('Q')
    jop = r.get('T')
    shift = r.get('C')
    pic = r.get('U')
    
    if grade: grades[grade] += 1
    if gsm: gsms[gsm] += 1
    if loc: locations[loc] += 1
    if jop: jops[jop] += 1
    if shift: shifts[shift] += 1
    if pic: pics[pic] += 1
    if weight:
        try:
            w_float = float(weight)
            if w_float > 0:
                weights.append(w_float)
        except ValueError:
            pass

print("\n--- Summary Statistics ---")
print(f"Rows with weights: {len(weights)}")
if weights:
    weights.sort()
    print(f"Weight Min: {min(weights):.1f} kg")
    print(f"Weight Max: {max(weights):.1f} kg")
    print(f"Weight Mean: {sum(weights)/len(weights):.1f} kg")
    print(f"Weight Median: {weights[len(weights)//2]:.1f} kg")
    print(f"Weights < 750 kg: {sum(1 for w in weights if w < 750)}")
    print(f"Weights 750-1000 kg: {sum(1 for w in weights if 750 <= w <= 1000)}")
    print(f"Weights > 1000 kg: {sum(1 for w in weights if w > 1000)}")
    print(f"Weights > 1500 kg: {sum(1 for w in weights if w > 1500)}")
    print(f"Weights > 2000 kg: {sum(1 for w in weights if w > 2000)}")

print(f"\nUnique Grades ({len(grades)}):")
for g, cnt in grades.most_common(10):
    print(f"  {g}: {cnt}")

print(f"\nUnique GSMs ({len(gsms)}):")
for g, cnt in gsms.most_common(10):
    print(f"  {g}: {cnt}")

print(f"\nUnique Locations ({len(locations)}):")
for l, cnt in locations.most_common(15):
    print(f"  {l}: {cnt}")

print(f"\nUnique JOPs ({len(jops)}):")
for j, cnt in jops.most_common(10):
    print(f"  {j}: {cnt}")

print(f"\nPICs / Operators ({len(pics)}):")
for p, cnt in pics.most_common(10):
    print(f"  {p}: {cnt}")

