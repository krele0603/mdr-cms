#!/usr/bin/env python3
"""
Adds example management to the document editor right panel.
- Consultants see "Manage examples" button that opens a panel to assign examples
- Clients see example switcher if multiple examples assigned
Run: python3 patch_doc_examples.py
"""

FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# 1. Add state for examples
examples_state = '''
  // Assigned examples for this record
  const [assignedExamples, setAssignedExamples] = useState<any[]>([])
  const [availableExamples, setAvailableExamples] = useState<any[]>([])
  const [activeExampleIdx, setActiveExampleIdx] = useState(0)
  const [showManageExamples, setShowManageExamples] = useState(false)
  const [loadingExamples, setLoadingExamples] = useState(false)
'''

if 'assignedExamples' not in content:
    content = content.replace(
        "  // Floating bubble",
        examples_state + "\n  // Floating bubble"
    )

# 2. Add loadExamples function
load_examples_fn = '''
  async function loadExamples() {
    setLoadingExamples(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/examples`)
      if (res.ok) {
        const data = await res.json()
        setAssignedExamples(data.assigned || [])
        setAvailableExamples(data.available || [])
        setActiveExampleIdx(0)
      }
    } finally { setLoadingExamples(false) }
  }

  async function addExample(templateExampleId: string) {
    await fetch(`/api/projects/${projectId}/documents/${docId}/examples`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_example_id: templateExampleId }),
    })
    loadExamples()
  }

  async function removeExample(templateExampleId: string) {
    await fetch(`/api/projects/${projectId}/documents/${docId}/examples?template_example_id=${templateExampleId}`, {
      method: 'DELETE',
    })
    loadExamples()
  }

'''

if 'loadExamples' not in content:
    content = content.replace(
        "  async function postComment",
        load_examples_fn + "  async function postComment"
    )

# 3. Load examples when doc loads
if 'loadExamples()' not in content:
    content = content.replace(
        "        setLoading(false)\n      })\n      .catch(() => router.push",
        "        setLoading(false)\n        loadExamples()\n      })\n      .catch(() => router.push"
    )

# 4. Update refEditor to use active assigned example
# Replace the hasExample check and refEditor population
old_ref = """  useEffect(() => {
    if (!refEditor || !doc) return
    const ex = doc.example_content
    if (ex && typeof ex === 'object' && Object.keys(ex).length > 0) refEditor.commands.setContent(ex)
  }, [refEditor, doc])"""

new_ref = """  useEffect(() => {
    if (!refEditor) return
    // Prefer assigned examples, fall back to legacy example_content
    if (assignedExamples.length > 0 && assignedExamples[activeExampleIdx]) {
      const ex = assignedExamples[activeExampleIdx].content
      if (ex && typeof ex === 'object' && Object.keys(ex).length > 0) {
        refEditor.commands.setContent(ex)
        return
      }
    }
    if (!doc) return
    const ex = doc.example_content
    if (ex && typeof ex === 'object' && Object.keys(ex).length > 0) refEditor.commands.setContent(ex)
  }, [refEditor, doc, assignedExamples, activeExampleIdx])"""

if old_ref in content:
    content = content.replace(old_ref, new_ref)

# 5. Update hasExample to include assigned examples
content = content.replace(
    "        setHasExample(!!(ex && typeof ex === 'object' && Object.keys(ex).length > 0))",
    "        setHasExample(!!(ex && typeof ex === 'object' && Object.keys(ex).length > 0))\n        // will be updated when examples load"
)

# 6. Replace the right panel (example panel) with new version that supports switcher + manage
old_right = """        {/* Right — example */}
        {showReference && (
          <div style={{ width: '40%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ede9e3', borderRight: showComments ? '1px solid #d8d4ce' : 'none' }}>
            <div style={{ padding: '8px 16px', flexShrink: 0, borderBottom: '1px solid #d8d4ce', background: '#e8e3dc', fontSize: 11, fontWeight: 600, color: '#5a6472', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
              <span>Example</span>
              {doc.template_name && <span style={{ fontWeight: 400, color: '#8a96a2', textTransform: 'none' as const, letterSpacing: 0 }}>— {doc.template_name}</span>}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
              {hasExample ? (
                <div style={{ maxWidth: 780, margin: '0 auto', background: '#fff', opacity: 0.92, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderRadius: 2, padding: '60px 72px', minHeight: 900 }}>
                  <EditorContent editor={refEditor} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, opacity: 0.2 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#5a6472' }}>No example available</div>
                  <div style={{ fontSize: 12, color: '#8a96a2', maxWidth: 240, lineHeight: 1.7 }}>Ask your consultant to provide an example.</div>
                </div>
              )}
              <div style={{ height: 48 }} />
            </div>
          </div>
        )}"""

new_right = """        {/* Right — example */}
        {showReference && (
          <div style={{ width: '40%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ede9e3', borderRight: showComments ? '1px solid #d8d4ce' : 'none' }}>
            {/* Example header */}
            <div style={{ padding: '8px 16px', flexShrink: 0, borderBottom: '1px solid #d8d4ce', background: '#e8e3dc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase' as const, letterSpacing: '0.06em', flexShrink: 0 }}>Example</div>
              {/* Example switcher for multiple assigned examples */}
              {assignedExamples.length > 1 && (
                <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' as const }}>
                  {assignedExamples.map((ex: any, idx: number) => (
                    <button key={ex.id} onClick={() => setActiveExampleIdx(idx)}
                      style={{ height: 22, padding: '0 8px', fontSize: 10, borderRadius: 4, border: 'none', cursor: 'pointer', background: activeExampleIdx === idx ? '#4e8c8c' : 'rgba(0,0,0,0.1)', color: activeExampleIdx === idx ? '#fff' : '#5a6472', fontWeight: activeExampleIdx === idx ? 600 : 400 }}>
                      {ex.name}
                    </button>
                  ))}
                </div>
              )}
              {assignedExamples.length === 1 && (
                <span style={{ fontSize: 11, color: '#8a96a2' }}>{assignedExamples[0].name}</span>
              )}
              {/* Consultant: manage examples button */}
              {(isAdmin || isConsultant) && (
                <button onClick={() => setShowManageExamples(v => !v)}
                  style={{ marginLeft: 'auto', height: 24, padding: '0 8px', fontSize: 10, borderRadius: 4, border: showManageExamples ? '0.5px solid rgba(78,140,140,0.4)' : '0.5px solid rgba(0,0,0,0.2)', background: showManageExamples ? 'rgba(78,140,140,0.1)' : 'transparent', color: showManageExamples ? '#2e5f5f' : '#5a6472', cursor: 'pointer', flexShrink: 0, fontWeight: 500 }}>
                  Manage examples
                </button>
              )}
            </div>

            {/* Manage examples panel */}
            {showManageExamples && (isAdmin || isConsultant) && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #d8d4ce', background: '#e0dbd3', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', marginBottom: 8 }}>Assigned examples (visible to client)</div>
                {assignedExamples.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#8a96a2', marginBottom: 8 }}>No examples assigned yet.</div>
                ) : assignedExamples.map((ex: any) => (
                  <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1, fontSize: 12, color: '#1a1f24', fontWeight: 500 }}>{ex.name}</div>
                    {ex.description && <div style={{ fontSize: 11, color: '#8a96a2' }}>{ex.description}</div>}
                    <button onClick={() => removeExample(ex.template_example_id || ex.id)}
                      style={{ height: 22, padding: '0 8px', fontSize: 10, background: 'transparent', border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 4, color: '#943030', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                ))}
                {availableExamples.filter((av: any) => !assignedExamples.find((a: any) => (a.template_example_id || a.id) === av.id)).length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', marginTop: 10, marginBottom: 6 }}>Available from template</div>
                    {availableExamples.filter((av: any) => !assignedExamples.find((a: any) => (a.template_example_id || a.id) === av.id)).map((av: any) => (
                      <div key={av.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: '#1a1f24', fontWeight: 500 }}>{av.name}</div>
                          {av.description && <div style={{ fontSize: 10, color: '#8a96a2' }}>{av.description}</div>}
                        </div>
                        <button onClick={() => addExample(av.id)}
                          style={{ height: 22, padding: '0 8px', fontSize: 10, background: '#4e8c8c', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer' }}>
                          + Add
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {availableExamples.length === 0 && !loadingExamples && (
                  <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 6 }}>No examples in template library yet. Add them in the Template editor.</div>
                )}
              </div>
            )}

            {/* Example content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
              {assignedExamples.length > 0 || hasExample ? (
                <div style={{ maxWidth: 780, margin: '0 auto', background: '#fff', opacity: 0.92, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderRadius: 2, padding: '60px 72px', minHeight: 900 }}>
                  <EditorContent editor={refEditor} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, opacity: 0.2 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#5a6472' }}>No example available</div>
                  <div style={{ fontSize: 12, color: '#8a96a2', maxWidth: 240, lineHeight: 1.7 }}>
                    {(isAdmin || isConsultant) ? 'Click "Manage examples" to assign examples from the template library.' : 'Ask your consultant to assign an example for this document.'}
                  </div>
                </div>
              )}
              <div style={{ height: 48 }} />
            </div>
          </div>
        )}"""

if old_right in content:
    content = content.replace(old_right, new_right)
    print('✓ Right panel updated')
else:
    print('⚠ Right panel pattern not found - may need manual update')

with open(FILE, 'w') as f:
    f.write(content)

print('✓ Document examples patch applied')
