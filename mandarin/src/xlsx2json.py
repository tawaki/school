import zipfile, re, json, sys
from xml.etree import ElementTree as ET
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
z=zipfile.ZipFile(sys.argv[1])
ss=[''.join(t.text or '' for t in si.iter('{%s}t'%ns['m'])) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns)]
rows=[]
def col(ref):
    n=0
    for ch in re.match(r'[A-Z]+',ref).group(): n=n*26+ord(ch)-64
    return n-1
for ev,el in ET.iterparse(z.open('xl/worksheets/sheet1.xml')):
    if el.tag.endswith('}row'):
        r={}
        for c in el.findall('m:c',ns):
            v=c.find('m:v',ns); isv=c.find('m:is',ns)
            if v is not None: val=ss[int(v.text)] if c.get('t')=='s' else v.text
            elif isv is not None: val=''.join(t.text or '' for t in isv.iter('{%s}t'%ns['m']))
            else: continue
            r[col(c.get('r'))]=val
        rows.append([r.get(i,'') for i in range(max(r)+1)] if r else [])
        el.clear()
json.dump(rows,open(sys.argv[2],'w'),ensure_ascii=False)
print(len(rows)); print(rows[:4])
