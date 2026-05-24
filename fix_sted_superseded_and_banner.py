#!/usr/bin/env python3
"""
Two fixes:

1. approve-sted/route.ts — unapproved check incorrectly includes superseded/obsolete docs,
   blocking STED approval after any document has been revised.
   Fix: exclude superseded and obsolete from the check.

2. doc page — lock banner shows only the latest TF version.
   Fix: fetch all TF revisions, show current version + dropdown of older ones.
   Also show the doc's own revision number in the banner.

Run from repo root:
  python3 patches/fix_sted_superseded_and_banner.py
"""

import sys

errors = []

# ══════════════════════════════════════════════════════════════════════════════
# FILE 1 — approve-sted: exclude superseded+obsolete from unapproved check
# ══════════════════════════════════════════════════════════════════════════════
F1 = 'apps/web/src/app/api/projects/[id]/documents/[docId]/approve-sted/route.ts'
with open(F1) as f: s1 = f.read()

OLD1 = """  // Check ALL non-STED documents in project are approved — hard block
  const unapproved = await query(
    `SELECT id, annex, name, status FROM project_documents
     WHERE project_id = $1::uuid AND annex != 'STED' AND status != 'approved'`,
    [projectId]
  )
  if (unapproved.length > 0) {
    return NextResponse.json({
      error: `Cannot approve STED: ${unapproved.length} document(s) are not yet approved`,
      unapproved_docs: unapproved.map((d: any) => ({ annex: d.annex, name: d.name, status: d.status }))
    }, { status: 400 })
  }"""

NEW1 = """  // Check all ACTIVE non-STED documents are approved — hard block
  // Superseded and obsolete docs are excluded (they are historical, not active)
  const unapproved = await query(
    `SELECT id, annex, name, status FROM project_documents
     WHERE project_id = $1::uuid
       AND annex != 'STED'
       AND status NOT IN ('approved', 'superseded', 'obsolete')`,
    [projectId]
  )
  if (unapproved.length > 0) {
    return NextResponse.json({
      error: `Cannot approve TF: ${unapproved.length} document(s) are not yet approved`,
      unapproved_docs: unapproved.map((d: any) => ({ annex: d.annex, name: d.name, status: d.status }))
    }, { status: 400 })
  }"""

if OLD1 not in s1:
    errors.append('FILE1 (unapproved check): target not found')
elif s1.count(OLD1) > 1:
    errors.append('FILE1 (unapproved check): found more than once')
else:
    s1 = s1.replace(OLD1, NEW1, 1)
    print('FILE1 PATCH applied: approve-sted excludes superseded/obsolete')

# ══════════════════════════════════════════════════════════════════════════════
# FILE 2 — doc page: fetch all revisions + version dropdown in lock banner
# ══════════════════════════════════════════════════════════════════════════════
F2 = 'apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'
with open(F2) as f: s2 = f.read()

# 2A — add allRevisions state next to latestRevision
OLD2A = """  const [latestRevision, setLatestRevision] = useState<any>(null)"""
NEW2A = """  const [latestRevision, setLatestRevision] = useState<any>(null)
  const [allRevisions, setAllRevisions] = useState<any[]>([])
  const [showRevisionDropdown, setShowRevisionDropdown] = useState(false)"""

if OLD2A not in s2:
    errors.append('FILE2A (allRevisions state): target not found')
elif s2.count(OLD2A) > 1:
    errors.append('FILE2A (allRevisions state): found more than once')
else:
    s2 = s2.replace(OLD2A, NEW2A, 1)
    print('FILE2A PATCH applied: allRevisions state added')

# 2B — fetch all revisions (replace single fetch with both)
OLD2B = """    fetch(`/api/projects/${projectId}/tf-revision`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLatestRevision(d) })"""

NEW2B = """    fetch(`/api/projects/${projectId}/tf-revision`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLatestRevision(d) })
    fetch(`/api/projects/${projectId}/tf-revision?all=1`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setAllRevisions(d) })"""

if OLD2B not in s2:
    errors.append('FILE2B (fetch allRevisions): target not found')
elif s2.count(OLD2B) > 1:
    errors.append('FILE2B (fetch allRevisions): found more than once')
else:
    s2 = s2.replace(OLD2B, NEW2B, 1)
    print('FILE2B PATCH applied: fetches all TF revisions')

# 2C — replace the lock banner with version + dropdown
OLD2C = """      {isApproved && (
        <div style={{ padding: '8px 16px', flexShrink: 0, background: 'rgba(58,122,90,0.06)', borderBottom: '1px solid rgba(58,122,90,0.2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#3a7a5a', fontWeight: 500 }}>
            ✓ Approved{latestRevision ? ` · Locked in TF v${latestRevision.version}` : ''}{doc?.annex === 'STED' && latestRevision ? ' — update STED to issue a new TF version' : ''}
          </span>
        </div>
      )}"""

NEW2C = """      {isApproved && (
        <div style={{ padding: '6px 16px', flexShrink: 0, background: 'rgba(58,122,90,0.06)', borderBottom: '1px solid rgba(58,122,90,0.2)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#3a7a5a', fontWeight: 500 }}>
            ✓ Approved{doc?.revision && doc.revision > 1 ? ` · rev.${doc.revision}` : ''}
          </span>
          {latestRevision && (
            <span style={{ color: '#6b6a64' }}>·</span>
          )}
          {latestRevision && allRevisions.length <= 1 && (
            <span style={{ color: '#3a7a5a', fontWeight: 500 }}>
              TF v{latestRevision.version}
            </span>
          )}
          {latestRevision && allRevisions.length > 1 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowRevisionDropdown(v => !v)}
                style={{ height: 20, padding: '0 8px', fontSize: 11, background: 'rgba(58,122,90,0.1)', border: '0.5px solid rgba(58,122,90,0.3)', borderRadius: 4, color: '#3a7a5a', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                TF v{latestRevision.version} <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
              </button>
              {showRevisionDropdown && (
                <div style={{ position: 'absolute', top: 24, left: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 200, padding: '4px 0' }}
                  onMouseLeave={() => setShowRevisionDropdown(false)}>
                  <div style={{ padding: '6px 12px 4px', fontSize: 10, color: '#9b9991', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TF revision history</div>
                  {allRevisions.map((r: any, i: number) => (
                    <a key={r.id}
                      href={`/dashboard/projects/${projectId}/tf-revisions`}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', textDecoration: 'none', background: i === 0 ? 'rgba(58,122,90,0.05)' : 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ee')}
                      onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? 'rgba(58,122,90,0.05)' : 'transparent')}>
                      <span style={{ fontSize: 12, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#27500A' : '#3a3a36', fontFamily: 'monospace' }}>v{r.version}</span>
                      {i === 0 && <span style={{ fontSize: 10, color: '#6b9b3a', fontWeight: 500 }}>current</span>}
                      <span style={{ fontSize: 11, color: '#9b9991', marginLeft: 'auto' }}>{new Date(r.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                    </a>
                  ))}
                  <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', marginTop: 4, padding: '4px 0 2px' }}>
                    <a href={`/dashboard/projects/${projectId}/tf-revisions`}
                      style={{ display: 'block', padding: '5px 12px', fontSize: 11, color: '#5a6472', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ee')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      View full revision history →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
          {doc?.annex === 'STED' && latestRevision && (
            <span style={{ color: '#8a6020', fontSize: 11 }}>— update STED to issue a new TF version</span>
          )}
        </div>
      )}"""

if OLD2C not in s2:
    errors.append('FILE2C (lock banner with dropdown): target not found')
elif s2.count(OLD2C) > 1:
    errors.append('FILE2C (lock banner with dropdown): found more than once')
else:
    s2 = s2.replace(OLD2C, NEW2C, 1)
    print('FILE2C PATCH applied: lock banner with version dropdown')

# ══════════════════════════════════════════════════════════════════════════════
# Write
# ══════════════════════════════════════════════════════════════════════════════
if errors:
    print('\nERRORS — no files written:')
    for e in errors:
        print(f'  • {e}')
    sys.exit(1)

with open(F1, 'w') as f: f.write(s1)
print(f'Wrote {F1}')
with open(F2, 'w') as f: f.write(s2)
print(f'Wrote {F2}')
print('\nOK: all patches applied')
