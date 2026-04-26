#!/usr/bin/env python3
"""
Adds version preview to template editor history panel.
Clicking "View" on a version loads it into a read-only preview pane.
"""

FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/templates/[id]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

fixes = 0

# 1. Add previewVersionId state
if 'previewVersionId' not in content:
    content = content.replace(
        "  const [showHistory, setShowHistory] = useState(false)",
        """  const [showHistory, setShowHistory] = useState(false)
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null)"""
    )
    fixes += 1
    print('Added previewVersionId state')

# 2. Add previewVersion function before loadExamples
if 'previewVersion' not in content:
    content = content.replace(
        "  async function loadExamples()",
        """  async function previewVersion(versionId: string) {
    if (previewVersionId === versionId) {
      setPreviewVersionId(null)
      // Restore current version content
      if (template?.content) templateEditor?.commands.setContent(template.content)
      return
    }
    const res = await fetch(`/api/templates/${templateId}/versions/${versionId}`)
    if (res.ok) {
      const data = await res.json()
      setPreviewVersionId(versionId)
      if (templateEditor && data.content) {
        templateEditor.setEditable(false)
        templateEditor.commands.setContent(data.content)
      }
    }
  }

  function restoreCurrentVersion() {
    setPreviewVersionId(null)
    if (templateEditor) {
      templateEditor.setEditable(true)
      if (template?.content) templateEditor.commands.setContent(template.content)
    }
  }

  async function loadExamples()"""
    )
    fixes += 1
    print('Added previewVersion function')

# 3. Add View button to each version in history panel
old_ver = "                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: v.is_current ? '#2e5f5f' : '#1a1f24' }}>{v.version}</div>\n                      {v.is_current && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(78,140,140,0.15)', color: '#2e5f5f' }}>current</span>}"

new_ver = """                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: v.is_current ? '#2e5f5f' : '#1a1f24' }}>{v.version}</span>
                        {v.is_current && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(78,140,140,0.15)', color: '#2e5f5f' }}>current</span>}
                        <button onClick={() => previewVersion(v.id)}
                          style={{ height: 18, padding: '0 6px', fontSize: 10, background: previewVersionId === v.id ? 'rgba(78,140,140,0.15)' : 'rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 3, cursor: 'pointer', color: previewVersionId === v.id ? '#2e5f5f' : '#5a6472' }}>
                          {previewVersionId === v.id ? 'Hide' : 'View'}
                        </button>
                      </div>"""

if old_ver in content:
    content = content.replace(old_ver, new_ver)
    fixes += 1
    print('Added View button to version history items')
else:
    print('WARNING: Version history item pattern not found')

# 4. Add preview banner to template editor when previewing old version
if 'previewVersionId && (' not in content:
    content = content.replace(
        "              <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', background: '#f5f2ee' }}>",
        """              {previewVersionId && (
                <div style={{ padding: '8px 16px', background: 'rgba(200,169,110,0.1)', borderBottom: '1px solid rgba(200,169,110,0.3)', fontSize: 12, color: '#8a6020', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <span>📖 Viewing older version (read-only)</span>
                  <button onClick={restoreCurrentVersion} style={{ height: 24, padding: '0 10px', fontSize: 11, background: '#4e8c8c', border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer' }}>Back to current</button>
                </div>
              )}
              <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', background: '#f5f2ee' }}>"""
    )
    fixes += 1
    print('Added preview banner')

with open(FILE, 'w') as f:
    f.write(content)

print(f'Done. {fixes} fixes applied.')
