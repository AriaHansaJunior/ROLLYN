import zipfile
import xml.etree.ElementTree as ET

with zipfile.ZipFile('07. Database Report FG Juli 26.xlsx', 'r') as z:
    shared_strings = []
    with z.open('xl/sharedStrings.xml') as f:
        for event, elem in ET.iterparse(f, events=('end',)):
            if elem.tag.endswith('si'):
                runs = [node.text for node in elem.iter() if node.tag.endswith('t') and node.text]
                shared_strings.append(''.join(runs))
                elem.clear()

    print("Reading sheet2 (SUMMARY)...")
    with z.open('xl/worksheets/sheet2.xml') as f:
        for event, elem in ET.iterparse(f, events=('end',)):
            if elem.tag.endswith('row'):
                row_num = int(elem.attrib.get('r', 0))
                if 1 <= row_num <= 10:
                    vals = {}
                    for c in elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                        r_ref = c.attrib.get('r', '')
                        col_letter = ''.join([ch for ch in r_ref if ch.isalpha()])
                        t_attr = c.attrib.get('t', '')
                        v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                        val = v.text if v is not None else None
                        if val is not None and t_attr == 's':
                            val = shared_strings[int(val)] if int(val) < len(shared_strings) else val
                        if val:
                            vals[col_letter] = val
                    if vals:
                        print(f"Row {row_num}: {vals}")
                elem.clear()

