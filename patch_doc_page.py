#!/usr/bin/env python3
"""
Patch: apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx
Applies 4 changes for TF lifecycle v2:
  1. Add latestRevision state + showStartRevisionModal state
  2. Fetch latestRevision on load
  3. Replace soft lock banner (client-only → everyone, with TF version + "Start new revision" button)
  4. Replace toolbar "↻ New revision" button with TF-aware logic
  5. Append "Start new TF revision" modal before closing </div>

Run from repo root:
  python3 patches/patch_doc_page.py
"""

import sys

TARGET = 'apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(TARGET, 'r') as f:
    src = f.read()

errors = []

# ── PATCH 1: Add new state variables after [revising] state ──────────────────
OLD1 = '  const [revising, setRevising] = useState(false)'
NEW1 = '''  const [revising, setRevising] = useState(false)
  const [latestRevision, setLatestRevision] = useState<any>(null)
  const [showStartRevisionModal, setShowStartRevisionModal] = useState(false)
  const [startingRevision, setStartingRevision] = useState(false)'''

if OLD1 not in src:
    errors.append('PATCH 1 (state vars): target not found')
elif src.count(OLD1) > 1:
    errors.append('PATCH 1 (state vars): found more than once')
else:
    src = src.replace(OLD1, NEW1, 1)
    print('PATCH 1 applied: new state variables')

# ── PATCH 2: Fetch latestRevision in the members/variables useEffect ─────────
OLD2 = "  useEffect(() => {\n    fetch(`/api/projects/${projectId}/members`).then(r => r.ok ? r.json() : []).then(setMembers)"
NEW2 = "  useEffect(() => {\n    fetch(`/api/projects/${projectId}/tf-revision`)\n      .then(r => r.ok ? r.json() : null)\n      .then(d => { if (d) setLatestRevision(d) })\n    fetch(`/api/projects/${projectId}/members`).then(r => r.ok ? r.json() : []).then(setMembers)"

if OLD2 not in src:
    errors.append('PATCH 2 (fetch latestRevision): target not found')
elif src.count(OLD2) > 1:
    errors.append('PATCH 2 (fetch latestRevision): found more than once')
else:
    src = src.replace(OLD2, NEW2, 1)
    print('PATCH 2 applied: fetch latestRevision')

# ── PATCH 3: Soft lock banner — widen to all roles, add TF info + button ─────
OLD3 = '''      {isClient && isApproved && (
        <div style={{ padding: '8px 16px', flexShrink: 0, background: 'rgba(58,122,90,0.08)', borderBottom: '1px solid rgba(58,122,90,0.2)', fontSize: 12, color: '#3a7a5a' }}>
          ✓ This record has been approved and is read-only.
        </div>
      )}'''

NEW3 = '''      {isApproved && (
        <div style={{ padding: '8px 16px', flexShrink: 0, background: 'rgba(58,122,90,0.06)', borderBottom: '1px solid rgba(58,122,90,0.2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#3a7a5a', fontWeight: 500 }}>
            ✓ Approved{latestRevision ? ` · Locked in TF v${latestRevision.version}` : ''}
            {doc?.approved_at ? ` · ${new Date(doc.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
          </span>
          {(isAdmin || isConsultant) && latestRevision && doc?.annex !== 'STED' && (
            <button
              onClick={() => setShowStartRevisionModal(true)}
              style={{ marginLeft: 'auto', height: 24, padding: '0 10px', fontSize: 11, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 5, color: '#5a6472', cursor: 'pointer' }}>
              ↻ Start new TF revision
            </button>
          )}
        </div>
      )}'''

if OLD3 not in src:
    errors.append('PATCH 3 (soft lock banner): target not found')
elif src.count(OLD3) > 1:
    errors.append('PATCH 3 (soft lock banner): found more than once')
else:
    src = src.replace(OLD3, NEW3, 1)
    print('PATCH 3 applied: soft lock banner')

# ── PATCH 4: Toolbar "↻ New revision" button → TF-aware ──────────────────────
OLD4 = '''          {isAdmin && isApproved && (
            <button onClick={reviseDoc} disabled={revising} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', opacity: revising ? 0.7 : 1 }}>{revising ? 'Creating…' : '↻ New revision'}</button>
          )}'''

NEW4 = '''          {isAdmin && isApproved && !latestRevision && (
            <button onClick={reviseDoc} disabled={revising} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', opacity: revising ? 0.7 : 1 }}>{revising ? 'Creating…' : '↻ New revision'}</button>
          )}
          {isAdmin && isApproved && latestRevision && (
            <button onClick={() => setShowStartRevisionModal(true)} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472' }}>↻ New TF revision</button>
          )}'''

if OLD4 not in src:
    errors.append('PATCH 4 (toolbar button): target not found')
elif src.count(OLD4) > 1:
    errors.append('PATCH 4 (toolbar button): found more than once')
else:
    src = src.replace(OLD4, NEW4, 1)
    print('PATCH 4 applied: toolbar button')

# ── PATCH 5: Append "Start new TF revision" modal before final </div> ────────
OLD5 = '''      )}
    </div>
  )
}'''

NEW5 = '''      )}

      {/* Start new TF revision modal */}
      {showStartRevisionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Start new TF revision</div>
            <div style={{ fontSize: 13, color: '#5a6472', marginBottom: 18, lineHeight: 1.55 }}>
              This will open <strong>all approved documents</strong> for editing, including the STED.
              The current TF v{latestRevision?.version} snapshot is preserved and accessible in revision history.
              You will need to re-approve every document and issue a new TF version when ready.
            </div>
            <div style={{ background: '#FFFBCC', border: '0.5px solid #F5E24A', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#7A6500', marginBottom: 20 }}>
              ⚠ All annex documents and the STED will be set to <strong>Draft</strong>. Clients will be able to edit them again.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowStartRevisionModal(false)}
                style={{ height: 32, padding: '0 16px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, color: '#5a6472', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  setStartingRevision(true)
                  try {
                    const res = await fetch(`/api/projects/${projectId}/tf-revision`, { method: 'POST' })
                    const data = await res.json()
                    if (!res.ok) { alert(data.error || 'Failed to start revision'); return }
                    setShowStartRevisionModal(false)
                    window.location.href = `/dashboard/projects/${projectId}`
                  } finally { setStartingRevision(false) }
                }}
                disabled={startingRevision}
                style={{ height: 32, padding: '0 16px', fontSize: 13, background: startingRevision ? '#ccc' : '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: startingRevision ? 'default' : 'pointer', fontWeight: 500 }}>
                {startingRevision ? 'Starting…' : 'Yes, start new revision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}'''

# OLD5 might appear once or more depending on how the file ends — we want the LAST occurrence
last_idx = src.rfind(OLD5)
if last_idx == -1:
    errors.append('PATCH 5 (modal): closing pattern not found')
else:
    src = src[:last_idx] + NEW5 + src[last_idx + len(OLD5):]
    print('PATCH 5 applied: start new TF revision modal')

# ── Write or report errors ────────────────────────────────────────────────────
if errors:
    print('\nERRORS — file NOT written:')
    for e in errors:
        print(f'  • {e}')
    sys.exit(1)

with open(TARGET, 'w') as f:
    f.write(src)

print(f'\nOK: all patches applied to {TARGET}')
