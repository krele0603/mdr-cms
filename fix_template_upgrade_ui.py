#!/usr/bin/env python3
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

old = "        {doc.template_name && <><span>·</span><span>Template: {doc.template_name} {doc.template_version}</span></>}"

new = """        {doc.template_name && (
          <>
            <span>·</span>
            <span>Template: {doc.template_name} {doc.template_version}</span>
            {(isAdmin || isConsultant) && templateVersions.length > 1 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowVersionUpgrade(v => !v)}
                  style={{ height: 18, padding: '0 6px', fontSize: 10, background: showVersionUpgrade ? 'rgba(78,140,140,0.15)' : 'rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 3, cursor: 'pointer', color: '#5a6472' }}>
                  ↑ Upgrade
                </button>
                {showVersionUpgrade && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 300, padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', marginBottom: 8 }}>Switch template version</div>
                    {templateVersions.map((tv: any) => {
                      const isCurrent = tv.id === tv.current_doc_version_id
                      return (
                        <div key={tv.id} style={{ padding: '8px 0', borderBottom: '0.5px solid #f0ede9', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>{tv.version}</span>
                              {isCurrent && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(78,140,140,0.1)', color: '#2e5f5f' }}>current</span>}
                              {tv.is_current && !isCurrent && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(200,169,110,0.1)', color: '#8a6020' }}>latest</span>}
                            </div>
                            {tv.change_note && <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 2 }}>{tv.change_note}</div>}
                            <div style={{ fontSize: 10, color: '#8a96a2' }}>{new Date(tv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          </div>
                          {!isCurrent && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <button onClick={() => upgradeTemplate(tv.id, false)} disabled={upgradingTemplate}
                                style={{ height: 24, padding: '0 8px', fontSize: 10, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 4, cursor: 'pointer', color: '#5a6472', whiteSpace: 'nowrap' }}>
                                Link only
                              </button>
                              <button onClick={() => upgradeTemplate(tv.id, true)} disabled={upgradingTemplate}
                                style={{ height: 24, padding: '0 8px', fontSize: 10, background: '#4e8c8c', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#fff', whiteSpace: 'nowrap' }}>
                                Apply content
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}"""

if old in content:
    content = content.replace(old, new)
    print('Fixed template upgrade UI')
else:
    print('Pattern not found')

with open(FILE, 'w') as f:
    f.write(content)
print('done')
