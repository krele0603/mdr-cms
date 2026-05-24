#!/usr/bin/env python3
"""
Corrective patch: apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx

Fixes TF lifecycle flow:
- Remove bulk "Start new TF revision" modal and its state vars
- Restore single-doc revise button (works for both TF-locked and pre-TF docs)
- Soft lock banner: show TF lock info, no action button (revise is in toolbar)
- reviseDoc() gets a better confirm message when TF is locked

Run from repo root:
  python3 patches/fix_doc_page_tf.py
"""

import sys

TARGET = 'apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(TARGET, 'r') as f:
    src = f.read()

errors = []

# ── PATCH A: Remove showStartRevisionModal + startingRevision state vars ──────
OLD_A = '''  const [revising, setRevising] = useState(false)
  const [latestRevision, setLatestRevision] = useState<any>(null)
  const [showStartRevisionModal, setShowStartRevisionModal] = useState(false)
  const [startingRevision, setStartingRevision] = useState(false)'''

NEW_A = '''  const [revising, setRevising] = useState(false)
  const [latestRevision, setLatestRevision] = useState<any>(null)'''

if OLD_A not in src:
    errors.append('PATCH A (state vars): target not found')
elif src.count(OLD_A) > 1:
    errors.append('PATCH A (state vars): found more than once')
else:
    src = src.replace(OLD_A, NEW_A, 1)
    print('PATCH A applied: removed bulk-revise state vars')

# ── PATCH B: Fix reviseDoc() — better confirm when TF locked ──────────────────
OLD_B = '''  async function reviseDoc() {
    if (!confirm('Create a new revision? The approved version will be preserved.')) return
    setRevising(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/revise`, { method: 'POST' })
      if (res.ok) { const d = await res.json(); router.push(`/dashboard/projects/${projectId}/documents/${d.id}`) }
    } finally { setRevising(false) }
  }'''

NEW_B = '''  async function reviseDoc() {
    const msg = latestRevision
      ? `Reopen this document for editing?\\n\\nThe TF v${latestRevision.version} snapshot is preserved. Other approved documents stay locked — only this one will be set to Draft. Once it\\'s re-approved you can update and re-approve the STED to issue a new TF version.`
      : 'Create a new revision? The approved version will be preserved.'
    if (!confirm(msg)) return
    setRevising(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/revise`, { method: 'POST' })
      if (res.ok) { const d = await res.json(); router.push(`/dashboard/projects/${projectId}/documents/${d.id}`) }
    } finally { setRevising(false) }
  }'''

if OLD_B not in src:
    errors.append('PATCH B (reviseDoc): target not found')
elif src.count(OLD_B) > 1:
    errors.append('PATCH B (reviseDoc): found more than once')
else:
    src = src.replace(OLD_B, NEW_B, 1)
    print('PATCH B applied: reviseDoc confirm message')

# ── PATCH C: Soft lock banner — remove "Start new TF revision" button ─────────
OLD_C = '''      {isApproved && (
        <div style={{ padding: '8px 16px', flexShrink: 0, background: 'rgba(58,122,90,0.06)', borderBottom: '1px solid rgba(58,122,90,0.2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#3a7a5a', fontWeight: 500 }}>
            ✓ Approved{latestRevision ? ` · Locked in TF v${latestRevision.version}` : ''}
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

NEW_C = '''      {isApproved && (
        <div style={{ padding: '8px 16px', flexShrink: 0, background: 'rgba(58,122,90,0.06)', borderBottom: '1px solid rgba(58,122,90,0.2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#3a7a5a', fontWeight: 500 }}>
            ✓ Approved{latestRevision ? ` · Locked in TF v${latestRevision.version}` : ''}{doc?.annex === 'STED' && latestRevision ? ' — update STED to issue a new TF version' : ''}
          </span>
        </div>
      )}'''

if OLD_C not in src:
    errors.append('PATCH C (soft lock banner): target not found')
elif src.count(OLD_C) > 1:
    errors.append('PATCH C (soft lock banner): found more than once')
else:
    src = src.replace(OLD_C, NEW_C, 1)
    print('PATCH C applied: soft lock banner cleaned up')

# ── PATCH D: Toolbar revise buttons — restore single unified button ───────────
OLD_D = '''          {isAdmin && isApproved && !latestRevision && (
            <button onClick={reviseDoc} disabled={revising} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', opacity: revising ? 0.7 : 1 }}>{revising ? 'Creating…' : '↻ New revision'}</button>
          )}
          {isAdmin && isApproved && latestRevision && (
            <button onClick={() => setShowStartRevisionModal(true)} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472' }}>↻ New TF revision</button>
          )}'''

NEW_D = '''          {(isAdmin || isConsultant) && isApproved && (
            <button onClick={reviseDoc} disabled={revising} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', opacity: revising ? 0.7 : 1 }}>{revising ? 'Opening…' : '↻ Revise'}</button>
          )}'''

if OLD_D not in src:
    errors.append('PATCH D (toolbar button): target not found')
elif src.count(OLD_D) > 1:
    errors.append('PATCH D (toolbar button): found more than once')
else:
    src = src.replace(OLD_D, NEW_D, 1)
    print('PATCH D applied: unified revise button')

# ── PATCH E: Remove the bulk "Start new TF revision" modal entirely ───────────
OLD_E = '''      {/* Start new TF revision modal */}
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
      )}'''

NEW_E = ''  # remove entirely

if OLD_E not in src:
    errors.append('PATCH E (remove modal): target not found')
elif src.count(OLD_E) > 1:
    errors.append('PATCH E (remove modal): found more than once')
else:
    src = src.replace(OLD_E, NEW_E, 1)
    print('PATCH E applied: removed bulk-revise modal')

# ── Write or report ───────────────────────────────────────────────────────────
if errors:
    print('\nERRORS — file NOT written:')
    for e in errors:
        print(f'  • {e}')
    sys.exit(1)

with open(TARGET, 'w') as f:
    f.write(src)

print(f'\nOK: all patches applied to {TARGET}')
