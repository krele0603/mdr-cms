path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/templates/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# Add 'sted' to activeTab type and add STED tab button
old_tabs = """      {[['regular', 'Document Templates'], ['structured', 'Structured Templates']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key as any)}
            style={{ padding: '8px 16px', fontSize: 13, border: 'none', borderBottom: activeTab === key ? '2px solid #185FA5' : '2px solid transparent', background: 'transparent', color: activeTab === key ? '#185FA5' : '#6b6a64', cursor: 'pointer', fontWeight: activeTab === key ? 500 : 400, marginBottom: -1 }}>
            {label} {key === 'structured' && structuredTemplates.length > 0 && `(${structuredTemplates.length})`}
          </button>
        ))}"""

new_tabs = """      {[['regular', 'Document Templates'], ['structured', 'Structured Templates'], ['sted', 'STED Template']].map(([key, label]) => (
          <button key={key} onClick={() => { if (key === 'sted') { router.push('/dashboard/templates/sted'); return; } setActiveTab(key as any) }}
            style={{ padding: '8px 16px', fontSize: 13, border: 'none', borderBottom: activeTab === key ? '2px solid #185FA5' : '2px solid transparent', background: 'transparent', color: key === 'sted' ? '#856404' : activeTab === key ? '#185FA5' : '#6b6a64', cursor: 'pointer', fontWeight: activeTab === key ? 500 : 400, marginBottom: -1 }}>
            {label} {key === 'structured' && structuredTemplates.length > 0 && `(${structuredTemplates.length})`}
            {key === 'sted' && <span style={{ marginLeft: 4, fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#FFF3CD', color: '#856404', border: '0.5px solid #FFEEBA' }}>↗</span>}
          </button>
        ))}"""

if old_tabs in content:
    content = content.replace(old_tabs, new_tabs)
    print('Patch OK: STED tab added')
else:
    print('ERROR: tabs not found')

with open(path, 'w') as f:
    f.write(content)
print('Done')
