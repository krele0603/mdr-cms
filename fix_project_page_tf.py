#!/usr/bin/env python3
"""
Corrective patch: apps/web/src/app/dashboard/projects/[id]/page.tsx

Fixes TF badge dual-state logic:
- Previous patch keyed off tfApproved (STED approved) — wrong once STED is revised
- New logic: latestRevision exists = a TF has been approved at some point
  - All non-STED docs approved = TF is fully current (green only)
  - Any non-STED doc not approved = revision in progress (green + yellow)
- readyForTfApproval badge: show when all annex docs approved AND STED is draft/inprogress/review AND latestRevision exists
- Revision history link: show whenever latestRevision exists

Run from repo root:
  python3 patches/fix_project_page_tf.py
"""

import sys

TARGET = 'apps/web/src/app/dashboard/projects/[id]/page.tsx'

with open(TARGET, 'r') as f:
    src = f.read()

errors = []

# ── PATCH A: Fix the badge block ──────────────────────────────────────────────
OLD_A = '''              {tfApproved && latestRevision && (() => {
                const hasDraftDocs = nonStedDocs.some((d: any) => d.status !== 'approved')
                return (
                  <span style={{display:'inline-flex',alignItems:'center',gap:0,borderRadius:20,overflow:'hidden',border:'0.5px solid #97C459',fontSize:11,fontWeight:600}}>\n                    <span style={{padding:'2px 9px',background:'#EAF3DE',color:'#27500A'}}>\n                      ✓ TF v{latestRevision.version}
                    </span>
                    {hasDraftDocs && (
                      <>
                        <span style={{width:1,background:'rgba(46,96,50,0.25)',alignSelf:'stretch'}}/>
                        <a href={`/dashboard/projects/${id}/tf-revisions`}
                          style={{padding:'2px 9px',background:'#FFFBCC',color:'#7A6500',textDecoration:'none',fontWeight:500}}>
                          v{latestRevision.version_x}.{latestRevision.version_y + 1}.0 in progress →
                        </a>
                      </>
                    )}
                  </span>
                )
              })()}
              {!tfApproved && readyForTfApproval && (
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(58,122,90,0.15)',color:'#3a7a5a',border:'0.5px solid rgba(58,122,90,0.4)',fontWeight:500}}>
                  ⬤ Ready for TF approval
                </span>
              )}
              {tfApproved && latestRevision && (
                <a href={`/dashboard/projects/${id}/tf-revisions`}
                  style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'transparent',color:'#9b9991',border:'0.5px solid rgba(0,0,0,0.12)',textDecoration:'none'}}>
                  Revision history
                </a>
              )}'''

NEW_A = '''              {latestRevision && (() => {
                // A TF has been approved. Check if any non-superseded, non-STED doc is not approved.
                const activeDocs = nonStedDocs.filter((d: any) => d.status !== 'superseded')
                const revisionInProgress = activeDocs.some((d: any) => d.status !== 'approved')
                return (
                  <span style={{display:'inline-flex',alignItems:'center',gap:0,borderRadius:20,overflow:'hidden',border:'0.5px solid #97C459',fontSize:11,fontWeight:600}}>
                    <span style={{padding:'2px 9px',background:'#EAF3DE',color:'#27500A'}}>
                      ✓ TF v{latestRevision.version}
                    </span>
                    {revisionInProgress && (
                      <>
                        <span style={{width:1,background:'rgba(46,96,50,0.25)',alignSelf:'stretch'}}/>
                        <span style={{padding:'2px 9px',background:'#FFFBCC',color:'#7A6500',fontWeight:500}}>
                          revision in progress
                        </span>
                      </>
                    )}
                  </span>
                )
              })()}
              {readyForTfApproval && (
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(58,122,90,0.15)',color:'#3a7a5a',border:'0.5px solid rgba(58,122,90,0.4)',fontWeight:500}}>
                  ⬤ Ready for TF approval
                </span>
              )}
              {latestRevision && (
                <a href={`/dashboard/projects/${id}/tf-revisions`}
                  style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'transparent',color:'#9b9991',border:'0.5px solid rgba(0,0,0,0.12)',textDecoration:'none'}}>
                  Revision history
                </a>
              )}'''

if OLD_A not in src:
    errors.append('PATCH A (badge block): target not found')
elif src.count(OLD_A) > 1:
    errors.append('PATCH A (badge block): found more than once')
else:
    src = src.replace(OLD_A, NEW_A, 1)
    print('PATCH A applied: fixed dual-state badge logic')

# ── Write or report ───────────────────────────────────────────────────────────
if errors:
    print('\nERRORS — file NOT written:')
    for e in errors:
        print(f'  • {e}')
    sys.exit(1)

with open(TARGET, 'w') as f:
    f.write(src)

print(f'\nOK: patched {TARGET}')
