import re

path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# ── Patch 1: Add annex to DocData interface ───────────────────────────────────
old_interface = """interface DocData {
  id: string; project_id: string; annex: string; name: string; code: string
  content: any; status: string; updated_at: string
  template_version_id: string | null; template_version: string | null
  example_content: any; template_name: string | null
  tag_code: string | null; project_name: string; device_name: string; revision?: number
}"""

# Already has annex — just verify it's there
if 'annex: string' in content:
    print('Patch 1 OK: annex already in DocData')
else:
    print('ERROR Patch 1: annex not in DocData')

# ── Patch 2: Add STED state variables after approvingDoc state ────────────────
old_state = "  const [submitting, setSubmitting] = useState(false)"
new_state = """  const [submitting, setSubmitting] = useState(false)
  const [showStedApprove, setShowStedApprove] = useState(false)
  const [stedVersionX, setSedVersionX] = useState(1)
  const [stedVersionY, setSedVersionY] = useState(0)
  const [stedVersionZ, setSedVersionZ] = useState(0)
  const [stedNotes, setSedNotes] = useState('')
  const [stedApproving, setSedApproving] = useState(false)
  const [stedApproveError, setSedApproveError] = useState('')"""

if old_state in content:
    content = content.replace(old_state, new_state)
    print('Patch 2 OK: STED state vars added')
else:
    print('ERROR Patch 2')

# ── Patch 3: Add approveSTED function after approveDoc ────────────────────────
old_approve = """  async function requestChanges() {"""
new_approve = """  async function approveSTED() {
    setSedApproving(true)
    setSedApproveError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/approve-sted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_x: stedVersionX,
          version_y: stedVersionY,
          version_z: stedVersionZ,
          notes: stedNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        let msg = data.error || 'Approval failed'
        if (data.unapproved_docs) {
          msg += ':\\n' + data.unapproved_docs.map((d: any) => `  • ${d.annex}: ${d.name} (${d.status})`).join('\\n')
        }
        setSedApproveError(msg)
        return
      }
      setDocStatus('approved')
      setShowStedApprove(false)
      alert(`TF approved at version ${data.version}! All annex documents have been snapshotted.`)
    } finally { setSedApproving(false) }
  }

  async function requestChanges() {"""

if old_approve in content:
    content = content.replace(old_approve, new_approve)
    print('Patch 3 OK: approveSTED function added')
else:
    print('ERROR Patch 3')

# ── Patch 4: Replace approve button with STED-aware version ──────────────────
old_approve_btn = """              <button onClick={approveDoc} disabled={approvingDoc} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: '#3a7a5a', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 500, opacity: approvingDoc ? 0.7 : 1 }}>{approvingDoc ? 'Approving…' : '✓ Approve'}</button>"""

new_approve_btn = """              {doc?.annex === 'STED' ? (
                <button onClick={() => setShowStedApprove(true)} disabled={approvingDoc}
                  style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: '#856404', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 500 }}>
                  ✓ Approve TF
                </button>
              ) : (
                <button onClick={approveDoc} disabled={approvingDoc} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: '#3a7a5a', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 500, opacity: approvingDoc ? 0.7 : 1 }}>{approvingDoc ? 'Approving…' : '✓ Approve'}</button>
              )}"""

if old_approve_btn in content:
    content = content.replace(old_approve_btn, new_approve_btn)
    print('Patch 4 OK: approve button updated')
else:
    print('ERROR Patch 4')

# ── Patch 5: Add STED approve modal before closing tag ───────────────────────
# Find the last </div> closing tag of the return statement
old_end = "    </>\n  )\n}"
new_end = """    <>
      {/* STED Approve Modal */}
      {showStedApprove && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FFF3CD', color: '#856404', border: '0.5px solid #FFEEBA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>STED</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1f24' }}>Approve Technical File</div>
                <div style={{ fontSize: 12, color: '#5a6472' }}>This will approve the STED and create a locked TF revision</div>
              </div>
            </div>

            <div style={{ background: '#FFF3CD', border: '0.5px solid #FFEEBA', borderRadius: 8, padding: '10px 14px', marginBottom: 18, marginTop: 14 }}>
              <div style={{ fontSize: 12, color: '#856404', fontWeight: 500, marginBottom: 4 }}>Version number (X.Y.Z)</div>
              <div style={{ fontSize: 11, color: '#856404', marginBottom: 10 }}>
                X = major (intended use changed) · Y = moderate (TF docs updated) · Z = minor (STED typos only)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ fontSize: 10, color: '#856404', marginBottom: 3 }}>X (major)</div>
                  <input type="number" min="1" value={stedVersionX} onChange={e => setSedVersionX(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: 60, height: 36, textAlign: 'center' as const, fontSize: 18, fontWeight: 700, border: '1.5px solid #FFEEBA', borderRadius: 6, outline: 'none', background: '#fff', color: '#856404' }} />
                </div>
                <span style={{ fontSize: 20, color: '#856404', fontWeight: 300 }}>.</span>
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ fontSize: 10, color: '#856404', marginBottom: 3 }}>Y (moderate)</div>
                  <input type="number" min="0" value={stedVersionY} onChange={e => setSedVersionY(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{ width: 60, height: 36, textAlign: 'center' as const, fontSize: 18, fontWeight: 700, border: '1.5px solid #FFEEBA', borderRadius: 6, outline: 'none', background: '#fff', color: '#856404' }} />
                </div>
                <span style={{ fontSize: 20, color: '#856404', fontWeight: 300 }}>.</span>
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ fontSize: 10, color: '#856404', marginBottom: 3 }}>Z (minor)</div>
                  <input type="number" min="0" value={stedVersionZ} onChange={e => setSedVersionZ(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{ width: 60, height: 36, textAlign: 'center' as const, fontSize: 18, fontWeight: 700, border: '1.5px solid #FFEEBA', borderRadius: 6, outline: 'none', background: '#fff', color: '#856404' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'right' as const }}>
                  <div style={{ fontSize: 11, color: '#856404' }}>Version</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#856404' }}>{stedVersionX}.{stedVersionY}.{stedVersionZ}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#5a6472', display: 'block', marginBottom: 4 }}>Notes (optional)</label>
              <textarea value={stedNotes} onChange={e => setSedNotes(e.target.value)} placeholder="What changed in this revision?"
                rows={3} style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
            </div>

            {stedApproveError && (
              <div style={{ fontSize: 12, color: '#943030', background: 'rgba(148,48,48,0.06)', border: '0.5px solid rgba(148,48,48,0.2)', borderRadius: 6, padding: '8px 12px', marginBottom: 14, whiteSpace: 'pre-line' as const }}>
                {stedApproveError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setShowStedApprove(false); setSedApproveError('') }}
                style={{ height: 34, padding: '0 16px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>
                Cancel
              </button>
              <button onClick={approveSTED} disabled={stedApproving}
                style={{ height: 34, padding: '0 20px', fontSize: 13, background: '#856404', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontWeight: 500, opacity: stedApproving ? 0.7 : 1 }}>
                {stedApproving ? 'Approving…' : `✓ Approve TF v${stedVersionX}.${stedVersionY}.${stedVersionZ}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
    </>
  )
}"""

if "    </>\n  )\n}" in content:
    content = content.replace("    </>\n  )\n}", new_end)
    print('Patch 5 OK: STED modal added')
else:
    print('ERROR Patch 5: closing tag not found')

with open(path, 'w') as f:
    f.write(content)
print('Done')
