import zipfile
import xml.etree.ElementTree as ET
import collections

with zipfile.ZipFile('07. Database Report FG Juli 26.xlsx', 'r') as z:
    shared_strings = []
    with z.open('xl/sharedStrings.xml') as f:
        for event, elem in ET.iterparse(f, events=('end',)):
            if elem.tag.endswith('si'):
                runs = [node.text for node in elem.iter() if node.tag.endswith('t') and node.text]
                shared_strings.append(''.join(runs))
                elem.clear()

    tier_weights = collections.defaultdict(list)
    tier_counts = collections.Counter()
    all_locs = collections.Counter()

    with z.open('xl/worksheets/sheet1.xml') as f:
        for event, elem in ET.iterparse(f, events=('end',)):
            if elem.tag.endswith('row'):
                loc = None
                weight = None
                for c in elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    r_ref = c.attrib.get('r', '')
                    col_letter = ''.join([ch for ch in r_ref if ch.isalpha()])
                    t_attr = c.attrib.get('t', '')
                    v_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = v_elem.text if v_elem is not None else None
                    if val is not None and t_attr == 's':
                        val = shared_strings[int(val)] if int(val) < len(shared_strings) else val
                    
                    if col_letter == 'Q':
                        loc = val
                    elif col_letter == 'N':
                        weight = val
                
                if loc and weight:
                    try:
                        w = float(weight)
                        all_locs[loc] += 1
                        parts = loc.split('-')
                        if len(parts) >= 2:
                            suffix = parts[-1]
                            tier_weights[suffix].append(w)
                            tier_counts[suffix] += 1
                    except ValueError:
                        pass
                elem.clear()

print("Suffix counts & average weights:")
for suffix, count in sorted(tier_counts.items()):
    w_list = tier_weights[suffix]
    avg_w = sum(w_list) / len(w_list) if w_list else 0
    print(f"Suffix: {suffix} | Count: {count} | Avg Weight: {avg_w:.1f} kg | Min: {min(w_list):.1f} | Max: {max(w_list):.1f}")

print("\nSample unique full locations:")
for l, c in all_locs.most_common(25):
    print(f"  {l}: {c} rolls")

