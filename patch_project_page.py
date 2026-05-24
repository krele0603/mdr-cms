#!/usr/bin/env python3
"""
Patch: apps/web/src/app/dashboard/projects/[id]/page.tsx
- Replace TF version badge block with dual-state badge (approved + in-progress)
- Add "Revision history" link

Run from repo root:
  python3 patches/patch_project_page.py
"""

import sys

TARGET = 'apps/web/src/app/dashboard/projects/[id]/page.tsx'

OLD = '''              {tfApproved && latestRevision && (
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'#EAF3DE',color:'#27500A',border:'0.5px solid #97C459',fontWeight:600}}>
                  ✓ TF v{latestRevision.version}
                </span>
              )}
              {readyForTfApproval && (
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(58,122,90,0.15)',color:'#3a7a5a',border:'0.5px solid rgba(58,122,90,0.4)',fontWeight:500}}>
                  ⬤ Ready for TF approval
                </span>
              )}'''

NEW = '''              {tfApproved && latestRevision && (() => {
                const hasDraftDocs = nonStedDocs.some((d: any) => d.status !== 'approved')
                return (
                  <span style={{display:'inline-flex',alignItems:'center',gap:0,borderRadius:20,overflow:'hidden',border:'0.5px solid #97C459',fontSize:11,fontWeight:600}}>
                    <span style={{padding:'2px 9px',background:'#EAF3DE',color:'#27500A'}}>
                      ✓ TF v{latestRevision.version}
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

with open(TARGET, 'r') as f:
    src = f.read()

if OLD not in src:
    print(f'ERROR: target block not found in {TARGET}')
    print('The file may have already been patched or diverged from expected content.')
    sys.exit(1)

if src.count(OLD) > 1:
    print(f'ERROR: target block found more than once in {TARGET} — refusing to patch')
    sys.exit(1)

patched = src.replace(OLD, NEW, 1)

with open(TARGET, 'w') as f:
    f.write(patched)

print(f'OK: patched {TARGET}')
