'use client'
import { useState, useEffect } from 'react'

const ANNEXES = ['Annex I','Annex II','Annex III','Annex IV','Annex V',
                 'Annex VI','Annex VII','Annex VIII','Annex IX','Annex X']

interface DocList {
  id: string
  name: string
  description: string
  is_builtin: boolean
  builtin_key: string
  doc_count: number
}

interface ListDoc {
  id: string
  annex: string
  name: string
  code: string
}

export default function ListsPage() {
  const [lists, setLists] = useState<DocList[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [activeAnnex, setActiveAnnex] = useState('Annex I')
  const [docs, setDocs] = useState<ListDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [docsLoading, setDocsLoading] = useState(false)

  // New list modal
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDesc, setNewListDesc] = useState('')
  const [cloneFrom, setCloneFrom] = useState('')
  const [savingList, setSavingList] = useState(false)

  // New doc form
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [newDocName, setNewDocName] = useState('')
  const [newDocCode, setNewDocCode] = useState('')
  const [savingDoc, setSavingDoc] = useState(false)

  // Edit doc
  const [editDocId, setEditDocId] = useState<string | null>(null)
  const [editDocName, setEditDocName] = useState('')
  const [editDocCode, setEditDocCode] = useState('')

  async function loadLists() {
    const res = await fetch('/api/lists')
    const data = await res.json()
    setLists(data.lists || [])
    setLoading(false)
  }

  async function loadDocs(listId: string) {
    setDocsLoading(true)
    const res = await fetch(`/api/lists/${listId}`)
    const data = await res.json()
    setDocs(data.docs || [])
    setDocsLoading(false)
  }

  useEffect(() => { loadLists() }, [])

  function selectList(id: string) {
    setActiveListId(id)
    setActiveAnnex('Annex I')
    setShowAddDoc(false)
    setEditDocId(null)
    loadDocs(id)
  }

  async function createList() {
    if (!newListName.trim()) return
    setSavingList(true)
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newListName, description: newListDesc, clone_from: cloneFrom || undefined }),
    })
    const data = await res.json()
    setSavingList(false)
    if (res.ok) {
      setShowNewList(false)
      setNewListName(''); setNewListDesc(''); setCloneFrom('')
      await loadLists()
      selectList(data.id)
    }
  }

  async function addDoc() {
    if (!newDocName.trim() || !newDocCode.trim() || !activeListId) return
    setSavingDoc(true)
    await fetch(`/api/lists/${activeListId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annex: activeAnnex, name: newDocName, code: newDocCode }),
    })
    setNewDocName(''); setNewDocCode(''); setShowAddDoc(false)
    setSavingDoc(false)
    await loadDocs(activeListId)
    await loadLists()
  }

  async function deleteDoc(docId: string) {
    if (!activeListId || !confirm('Remove this document from the list?')) return
    await fetch(`/api/lists/${activeListId}/${docId}`, { method: 'DELETE' })
    await loadDocs(activeListId)
    await loadLists()
  }

  async function saveEditDoc() {
    if (!activeListId || !editDocId) return
    await fetch(`/api/lists/${activeListId}/${editDocId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editDocName, code: editDocCode }),
    })
    setEditDocId(null)
    await loadDocs(activeListId)
  }

  const activeList = lists.find(l => l.id === activeListId)
  const annexDocs = docs.filter(d => d.annex === activeAnnex)
  const annexCounts = ANNEXES.reduce((acc, a) => {
    acc[a] = docs.filter(d => d.annex === a).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 2 }}>Document lists</h1>
          <p style={{ fontSize: 13, color: '#6b6a64' }}>Define document structure per device type</p>
        </div>
        <button onClick={() => setShowNewList(true)} style={{ height: 32, padding: '0 14px', fontSize: 13, background: '#185FA5', border: '0.5px solid #185FA5', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
          + New list
        </button>
      </div>

      {/* List cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginBottom: 20 }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', padding: 32, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading...</div>
        ) : lists.map(l => (
          <div key={l.id} onClick={() => selectList(l.id)} style={{
            border: activeListId === l.id ? '2px solid #185FA5' : '0.5px solid rgba(0,0,0,0.1)',
            borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
            background: activeListId === l.id ? '#E6F1FB' : '#fff',
          }}>
            <div style={{ fontSize: 10, marginBottom: 5, display: 'inline-block', padding: '1px 6px', borderRadius: 3, background: l.is_builtin ? '#F1EFE8' : '#EEEDFE', color: l.is_builtin ? '#888780' : '#3C3489', border: `0.5px solid ${l.is_builtin ? '#D3D1C7' : '#AFA9EC'}` }}>
              {l.is_builtin ? 'Built-in' : 'Custom'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: activeListId === l.id ? '#0C447C' : '#1a1a18' }}>{l.name}</div>
            <div style={{ fontSize: 12, color: activeListId === l.id ? '#185FA5' : '#9b9991', marginTop: 3 }}>
              {Number(l.doc_count)} document{Number(l.doc_count) !== 1 ? 's' : ''} configured
            </div>
          </div>
        ))}
      </div>

      {/* Annex editor */}
      {activeListId && (
        <div style={{ display: 'grid', gridTemplateColumns: '180px minmax(0,1fr)', gap: 14 }}>

          {/* Annex nav */}
          <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            {ANNEXES.map(a => (
              <div key={a} onClick={() => { setActiveAnnex(a); setShowAddDoc(false); setEditDocId(null) }} style={{
                padding: '9px 12px', cursor: 'pointer', fontSize: 13,
                borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                background: a === activeAnnex ? '#E6F1FB' : '#fff',
                color: a === activeAnnex ? '#0C447C' : '#1a1a18',
                fontWeight: a === activeAnnex ? 500 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>{a}</span>
                <span style={{ fontSize: 11, borderRadius: 20, padding: '1px 6px', background: a === activeAnnex ? '#B5D4F4' : '#f1efe8', color: a === activeAnnex ? '#0C447C' : '#9b9991' }}>
                  {annexCounts[a] || 0}
                </span>
              </div>
            ))}
          </div>

          {/* Document panel */}
          <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '11px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{activeAnnex}</div>
                <div style={{ fontSize: 12, color: '#6b6a64', marginTop: 1 }}>{annexDocs.length} document{annexDocs.length !== 1 ? 's' : ''}</div>
              </div>
              <button onClick={() => { setShowAddDoc(true); setEditDocId(null) }} style={{ height: 30, padding: '0 12px', fontSize: 12, background: '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                + Add document
              </button>
            </div>

            {docsLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading...</div>
            ) : annexDocs.length === 0 && !showAddDoc ? (
              <div style={{ padding: 36, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
                No documents in {activeAnnex}.<br />Use "Add document" to build this annex.
              </div>
            ) : (
              <>
                {annexDocs.map(d => (
                  <div key={d.id} style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {editDocId === d.id ? (
                      <>
                        <input value={editDocName} onChange={e => setEditDocName(e.target.value)}
                          style={{ flex: 2, padding: '5px 8px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none' }} />
                        <input value={editDocCode} onChange={e => setEditDocCode(e.target.value)}
                          style={{ flex: 1, padding: '5px 8px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none', fontFamily: 'monospace' }} />
                        <button onClick={saveEditDoc} style={{ height: 26, padding: '0 10px', fontSize: 12, background: '#185FA5', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditDocId(null)} style={{ height: 26, padding: '0 10px', fontSize: 12, background: 'none', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: '#9b9991', fontFamily: 'monospace', marginTop: 1 }}>{d.code}</div>
                        </div>
                        <button onClick={() => { setEditDocId(d.id); setEditDocName(d.name); setEditDocCode(d.code) }}
                          style={{ height: 26, padding: '0 10px', fontSize: 12, background: '#E6F1FB', border: '0.5px solid #85B7EB', borderRadius: 6, color: '#185FA5', cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => deleteDoc(d.id)}
                          style={{ height: 26, padding: '0 10px', fontSize: 12, background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 6, color: '#A32D2D', cursor: 'pointer' }}>Remove</button>
                      </>
                    )}
                  </div>
                ))}
              </>
            )}

            {showAddDoc && (
              <div style={{ padding: '10px 14px', borderTop: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="Document name"
                  style={{ flex: 2, padding: '6px 9px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none' }} />
                <input value={newDocCode} onChange={e => setNewDocCode(e.target.value)} placeholder="Code (e.g. RM-001)"
                  style={{ flex: 1, padding: '6px 9px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none', fontFamily: 'monospace' }} />
                <button onClick={addDoc} disabled={savingDoc} style={{ height: 30, padding: '0 12px', fontSize: 12, background: savingDoc ? '#B5D4F4' : '#185FA5', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
                  {savingDoc ? 'Adding...' : 'Add'}
                </button>
                <button onClick={() => setShowAddDoc(false)} style={{ height: 30, padding: '0 10px', fontSize: 12, background: 'none', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {!activeListId && !loading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13, background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12 }}>
          Select a list above to manage its documents.
        </div>
      )}

      {/* New list modal */}
      {showNewList && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, border: '0.5px solid rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 14, fontWeight: 500 }}>New document list</h3>
              <button onClick={() => setShowNewList(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b6a64' }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b6a64', marginBottom: 4 }}>List name *</label>
                <input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="e.g. Class IIb Combination Device"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b6a64', marginBottom: 4 }}>Description</label>
                <input value={newListDesc} onChange={e => setNewListDesc(e.target.value)} placeholder="When to use this list"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b6a64', marginBottom: 4 }}>Start from</label>
                <select value={cloneFrom} onChange={e => setCloneFrom(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', background: '#fff' }}>
                  <option value="">Blank list</option>
                  {lists.map(l => <option key={l.id} value={l.id}>Clone "{l.name}"</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNewList(false)} style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createList} disabled={savingList} style={{ height: 32, padding: '0 14px', fontSize: 13, background: savingList ? '#B5D4F4' : '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                {savingList ? 'Creating...' : 'Create list'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
