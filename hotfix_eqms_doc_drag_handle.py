#!/usr/bin/env python3
"""
Hotfix: adds drag handle to eQMS document draft/pending rows.
Run from repo root:
  python3 hotfix_eqms_doc_drag_handle.py
"""
import sys

F = 'apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'
with open(F) as f: s = f.read()

OLD = """                            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                              <Link href={`/dashboard/companies/${companyId}/documents/${doc.id}`}
                                style={{ height: 28, padding: '0 12px', fontSize: 12, background: '#E6F1FB', border: '0.5px solid #85B7EB', borderRadius: 6, color: '#185FA5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                                Open
                              </Link>
                              {canEdit && (
                                <button onClick={() => deleteDocument(doc.id, doc.title)}
                                  style={{ height: 28, padding: '0 8px', fontSize: 12, background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 6, color: '#A32D2D', cursor: 'pointer' }}>
                                  Delete
                                </button>
                              )}
                            </div>"""

NEW = """                            <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
                              {canEdit && (
                                <div
                                  draggable
                                  onDragStart={e => { setDragDocId(doc.id); setDragDocTitle(doc.title); e.dataTransfer.effectAllowed = 'move' }}
                                  onDragEnd={() => setDragDocId(null)}
                                  title="Drag to move to another folder"
                                  style={{ cursor: 'grab', color: '#c8c4bc', padding: '0 4px', fontSize: 14, lineHeight: 1, opacity: dragDocId === doc.id ? 0.4 : 1 }}
                                >⠿</div>
                              )}
                              <Link href={`/dashboard/companies/${companyId}/documents/${doc.id}`}
                                style={{ height: 28, padding: '0 12px', fontSize: 12, background: '#E6F1FB', border: '0.5px solid #85B7EB', borderRadius: 6, color: '#185FA5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                                Open
                              </Link>
                              {canEdit && (
                                <button onClick={() => deleteDocument(doc.id, doc.title)}
                                  style={{ height: 28, padding: '0 8px', fontSize: 12, background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 6, color: '#A32D2D', cursor: 'pointer' }}>
                                  Delete
                                </button>
                              )}
                            </div>"""

if OLD not in s:
    print('ERROR: target not found')
    sys.exit(1)
if s.count(OLD) > 1:
    print('ERROR: found more than once')
    sys.exit(1)

with open(F, 'w') as f: f.write(s.replace(OLD, NEW, 1))
print('OK: drag handle added to document rows')
