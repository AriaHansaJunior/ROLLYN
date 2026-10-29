import zipfile
import xml.etree.ElementTree as ET

with zipfile.ZipFile('07. Database Report FG Juli 26.xlsx', 'r') as z:
    with z.open('xl/worksheets/sheet1.xml') as f:
        content = f.read(100000).decode('utf-8', errors='ignore')
        pos = content.find('<row r="3"')
        if pos != -1:
            print(content[pos:pos+2500])
        else:
            print("Row 3 not found in chunk")

