#!/usr/bin/env python3
"""
Hotfix: injects dragDocId, dragRecordId, dragDocTitle state vars +
moveDocToFolder + moveRecordToFolder functions into the eQMS level page.

Run from repo root:
  python3 hotfix_eqms_dnd_functions.py
"""
import sys

F = 'apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'
with open(F) as f: s = f.read()

OLD = """  async function deleteDocument(docId: string, title: string) {
    if (!confirm(`Delete \"${title}\"? This cannot be undone.`)) return
    await fetch(`/api/eqms/documents/${docId}`, { method: 'DELETE' })
    if (selectedFolder) loadDocuments(selectedFolder)
  }"""

NEW = """  async function deleteDocument(docId: string, title: string) {
    if (!confirm(`Delete \"${title}\"? This cannot be undone.`)) return
    await fetch(`/api/eqms/documents/${docId}`, { method: 'DELETE' })
    if (selectedFolder) loadDocuments(selectedFolder)
  }

  const [dragDocId, setDragDocId] = useState<string | null>(null)
  const [dragRecordId, setDragRecordId] = useState<string | null>(null)
  const [dragDocTitle, setDragDocTitle] = useState('')

  async function moveDocToFolder(targetFolderId: string) {
    if (!dragDocId || targetFolderId === selectedFolder) { setDragDocId(null); return }
    const targetName = folders.find(f => f.id === targetFolderId)?.name || 'folder'
    const res = await fetch(`/api/eqms/documents/${dragDocId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: targetFolderId }),
    })
    setDragDocId(null)
    if (res.ok && selectedFolder) {
      loadDocuments(selectedFolder)
      alert(`"${dragDocTitle}" moved to ${targetName}`)
    }
  }

  async function moveRecordToFolder(targetFolderId: string) {
    if (!dragRecordId || targetFolderId === selectedFolder) { setDragRecordId(null); return }
    const res = await fetch(`/api/eqms/records/${dragRecordId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: targetFolderId }),
    })
    setDragRecordId(null)
    if (res.ok && selectedFolder) loadRecords(selectedFolder)
  }"""

if OLD not in s:
    print('ERROR: deleteDocument function not found — already patched or file diverged')
    sys.exit(1)
if s.count(OLD) > 1:
    print('ERROR: found more than once')
    sys.exit(1)

with open(F, 'w') as f: f.write(s.replace(OLD, NEW, 1))
print('OK: drag state + move functions injected')
