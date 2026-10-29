import zipfile
import xml.etree.ElementTree as ET

with zipfile.ZipFile('07. Database Report FG Juli 26.xlsx', 'r') as z:
    with z.open('xl/sharedStrings.xml') as f:
        tree = ET.parse(f)
        root = tree.getroot()
        # namespace
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        shared_strings = []
        for si in root.findall('ns:si', ns):
            t = si.find('ns:t', ns)
            if t is not None and t.text is not None:
                shared_strings.append(t.text)
            else:
                # might be complex text run <r><t>...</t></r>
                runs = si.findall('.//ns:t', ns)
                shared_strings.append(''.join(r.text for r in runs if r.text))
        
        print(f"Total shared strings: {len(shared_strings)}")
        print(f"String 43: {shared_strings[43] if len(shared_strings) > 43 else 'N/A'}")
        print(f"String 76: {shared_strings[76] if len(shared_strings) > 76 else 'N/A'}")
        print(f"String 32: {shared_strings[32] if len(shared_strings) > 32 else 'N/A'}")

