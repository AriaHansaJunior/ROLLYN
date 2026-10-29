import zipfile
import xml.etree.ElementTree as ET
import datetime
import json
import os

xlsx_path = '07. Database Report FG Juli 26.xlsx'
out_path = 'storage/app/real_fg_july2026.json'

os.makedirs('storage/app', exist_ok=True)

with zipfile.ZipFile(xlsx_path, 'r') as z:
    print("Loading shared strings...")
    shared_strings = []
    with z.open('xl/sharedStrings.xml') as f:
        for event, elem in ET.iterparse(f, events=('end',)):
            if elem.tag.endswith('si'):
                runs = [node.text for node in elem.iter() if node.tag.endswith('t') and node.text]
                shared_strings.append(''.join(runs))
                elem.clear()

    print("Parsing sheet1 (Data Base)...")
    valid_rolls = []
    with z.open('xl/worksheets/sheet1.xml') as f:
        for event, elem in ET.iterparse(f, events=('end',)):
            if elem.tag.endswith('row'):
                row_num = int(elem.attrib.get('r', 0))
                if row_num > 1:
                    row_data = {}
                    for c in elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                        r_ref = c.attrib.get('r', '')
                        col_letter = ''.join([ch for ch in r_ref if ch.isalpha()])
                        t_attr = c.attrib.get('t', '')
                        v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                        val = v.text if v is not None else None
                        if val is not None and t_attr == 's':
                            val = shared_strings[int(val)] if int(val) < len(shared_strings) else val
                        if val is not None:
                            row_data[col_letter] = val
                    
                    roll_no = row_data.get('E')
                    grade = row_data.get('F')
                    weight_raw = row_data.get('N')
                    
                    # Filter out header or invalid placeholder rows
                    if roll_no and grade and weight_raw:
                        try:
                            weight = float(weight_raw)
                            if weight > 0 and grade != '0' and grade != 'REJECT PRODUCT':
                                gsm = int(float(row_data.get('G', 0))) if row_data.get('G') else 0
                                width = int(float(row_data.get('K', 0))) if row_data.get('K') else 0
                                diameter = int(float(row_data.get('L', 0))) if row_data.get('L') else 0
                                date_serial = row_data.get('D')
                                entry_date = None
                                if date_serial and date_serial.isdigit():
                                    d_int = int(date_serial)
                                    if d_int > 30000:
                                        entry_date = str(datetime.date(1899, 12, 30) + datetime.timedelta(days=d_int))
                                
                                jop = row_data.get('T', '')
                                if jop == 'JOP-0' or jop == '0':
                                    jop = ''
                                
                                valid_rolls.append({
                                    'row_idx': row_num,
                                    'no_roll': roll_no,
                                    'entry_date': entry_date,
                                    'shift': row_data.get('C', '1'),
                                    'form': row_data.get('B', '1'),
                                    'grade': grade.strip(),
                                    'gsm': gsm,
                                    'weight': weight,
                                    'width': width,
                                    'diameter': diameter,
                                    'plybond': row_data.get('H', ''),
                                    'thickness': row_data.get('I', ''),
                                    'bulk': row_data.get('J', ''),
                                    'core': row_data.get('M', ''),
                                    'cobb': row_data.get('O', ''),
                                    'exmaterial': row_data.get('P', 'IMPORT'),
                                    'lokasi_actual': row_data.get('Q', ''),
                                    'jop': jop,
                                    'pic': row_data.get('U', '')
                                })
                        except (ValueError, TypeError):
                            pass
                elem.clear()

print(f"Total valid production rolls extracted: {len(valid_rolls)}")
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(valid_rolls, f, indent=2, ensure_ascii=False)

print(f"Saved successfully to {out_path} ({os.path.getsize(out_path)} bytes)")

