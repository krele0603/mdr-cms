path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    txt = f.read()

# Fix the broken modal structure - the closing </div> for padding div is misplaced
# and e.target references are broken
old = '''            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Document title *</label>
                <input value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} placeholder="e.g. Quality Management Policy" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') createDocument() }}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Document code</label>
                <input value={newDocCode} onChange={e => setNewDocCode(e.target.value)} placeholder="e.g. POL-001"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' as const }} />
              </div>
            </div>
              <div>'''

new = '''            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Document title *</label>
                <input value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} placeholder="e.g. Quality Management Policy" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') createDocument() }}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 4 }}>Document code</label>
                <input value={newDocCode} onChange={e => setNewDocCode(e.target.value)} placeholder="e.g. POL-001"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' as const }} />
              </div>
              <div>'''

if old in txt:
    txt = txt.replace(old, new)
    print('Patch 1 OK')
else:
    print('Patch 1 NOT FOUND - trying alternate')
    # Try with e.target variants
    alt_old = old.replace('e.target.value', 'e.target.value')
    if alt_old in txt:
        txt = txt.replace(alt_old, new)
        print('Patch 1 alt OK')

# Also fix doc.id reference in deleteDocument call
old2 = 'deleteDocument(doc.id, doc.title)'
if old2 in txt:
    print('doc.id already clean')
else:
    print('doc.id may need fixing')

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(txt)
print('Saved')
