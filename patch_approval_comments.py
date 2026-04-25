#!/usr/bin/env python3
"""
Adds approval workflow buttons and comments panel to document editor.
Run: python3 patch_approval_comments.py
"""

FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# ── 1. Add new state variables ────────────────────────────────────────────────
new_states = '''
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [postingComment, setPostingComment] = useState(false)
  const [showRequestChanges, setShowRequestChanges] = useState(false)
  const [changeReason, setChangeReason] = useState('')
  const [approving, setApproving] = useState(false)
  const [revising, setRevising] = useState(false)
'''

if 'showComments' not in content:
    content = content.replace(
        '  const [submitting, setSubmitting] = useState(false)',
        '  const [submitting, setSubmitting] = useState(false)' + new_states
    )

# ── 2. Add loadComments + approval functions ──────────────────────────────────
approval_fns = '''
  async function loadComments() {
    setCommentsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/comments`)
      if (res.ok) setComments(await res.json())
    } finally {
      setCommentsLoading(false)
    }
  }

  async function postComment(parentId?: string) {
    if (!newComment.trim()) return
    setPostingComment(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, parent_id: parentId || null }),
      })
      if (res.ok) {
        setNewComment('')
        setReplyTo(null)
        loadComments()
      }
    } finally {
      setPostingComment(false)
    }
  }

  async function resolveComment(commentId: string, resolved: boolean) {
    await fetch(`/api/projects/${projectId}/documents/${docId}/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved }),
    })
    loadComments()
  }

  async function approveDoc() {
    setApproving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/approve`, { method: 'POST' })
      if (res.ok) { setDocStatus('approved'); loadComments() }
    } finally { setApproving(false) }
  }

  async function requestChanges() {
    if (!changeReason.trim()) return
    const res = await fetch(`/api/projects/${projectId}/documents/${docId}/request-changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: changeReason }),
    })
    if (res.ok) {
      setDocStatus('inprogress')
      setChangeReason('')
      setShowRequestChanges(false)
      loadComments()
    }
  }

  async function reviseDoc() {
    if (!confirm('Create a new revision? The approved version will be preserved and a new draft will be created.')) return
    setRevising(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/revise`, { method: 'POST' })
      if (res.ok) {
        const newDoc = await res.json()
        router.push(`/dashboard/projects/${projectId}/documents/${newDoc.id}`)
      }
    } finally { setRevising(false) }
  }

'''

if 'loadComments' not in content:
    content = content.replace(
        '  async function submitForReview()',
        approval_fns + '  async function submitForReview()'
    )

# ── 3. Load comments when showComments opens ──────────────────────────────────
if 'loadComments()' not in content.split('async function loadComments')[0]:
    content = content.replace(
        '  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])',
        '''  useEffect(() => {
    if (showComments) loadComments()
  }, [showComments])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])'''
    )

# ── 4. Add comments toggle button + approval buttons in top bar ───────────────
# Add after the "Show/Hide example" button
comments_btn = '''
          {/* Comments toggle */}
          <button onClick={() => setShowComments(v => !v)} style={{
            height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer',
            background: showComments ? 'rgba(200,169,110,0.15)' : 'transparent',
            border: showComments ? '0.5px solid rgba(200,169,110,0.5)' : '0.5px solid rgba(0,0,0,0.15)',
            borderRadius: 6, color: showComments ? '#8a6020' : '#5a6472', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {comments.length > 0 ? `Comments (${comments.filter(c => !c.resolved).length})` : 'Comments'}
          </button>

          {/* Consultant/admin approval controls */}
          {!isClient && docStatus === 'review' && (
            <>
              <button onClick={approveDoc} disabled={approving} style={{
                height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer',
                background: '#3a7a5a', border: 'none', borderRadius: 6, color: '#fff',
                fontWeight: 500, opacity: approving ? 0.7 : 1,
              }}>{approving ? 'Approving…' : '✓ Approve'}</button>
              <button onClick={() => setShowRequestChanges(v => !v)} style={{
                height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer',
                background: showRequestChanges ? 'rgba(148,48,48,0.1)' : 'transparent',
                border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 6, color: '#943030', fontWeight: 500,
              }}>Request changes</button>
            </>
          )}

          {/* Admin: create revision from approved */}
          {!isClient && docStatus === 'approved' && session?.role === 'admin' && (
            <button onClick={reviseDoc} disabled={revising} style={{
              height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer',
              background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)',
              borderRadius: 6, color: '#5a6472', opacity: revising ? 0.7 : 1,
            }}>{revising ? 'Creating…' : '↻ New revision'}</button>
          )}'''

if 'Comments toggle' not in content:
    content = content.replace(
        "            {showReference ? 'Hide example' : 'Show example'}\n          </button>\n        </div>\n      </div>",
        "            {showReference ? 'Hide example' : 'Show example'}\n          </button>\n" + comments_btn + "\n        </div>\n      </div>"
    )

# ── 5. Add request changes modal (after approved banner) ─────────────────────
request_changes_modal = '''
      {/* Request changes modal */}
      {showRequestChanges && (
        <div style={{ padding: '12px 16px', flexShrink: 0, background: 'rgba(148,48,48,0.06)', borderBottom: '1px solid rgba(148,48,48,0.2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#943030', marginBottom: 6 }}>Reason for requesting changes</div>
            <textarea
              value={changeReason}
              onChange={e => setChangeReason(e.target.value)}
              placeholder="Explain what needs to be changed…"
              autoFocus
              style={{ width: '100%', height: 70, padding: '8px 10px', fontSize: 12, border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 6, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 22 }}>
            <button onClick={requestChanges} disabled={!changeReason.trim()} style={{ height: 28, padding: '0 12px', fontSize: 12, background: '#943030', border: 'none', borderRadius: 6, color: '#fff', cursor: changeReason.trim() ? 'pointer' : 'default', opacity: changeReason.trim() ? 1 : 0.5 }}>Send</button>
            <button onClick={() => { setShowRequestChanges(false); setChangeReason('') }} style={{ height: 28, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

'''

if 'Request changes modal' not in content:
    content = content.replace(
        "      {/* Split pane */}",
        request_changes_modal + "      {/* Split pane */}"
    )

# ── 6. Add comments panel — insert inside split pane after right example panel ─
comments_panel = '''
        {/* Comments panel */}
        {showComments && (
          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid #d8d4ce', background: '#faf9f7' }}>
            {/* Header */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0ddd8', background: '#f5f2ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Comments {comments.length > 0 && `(${comments.length})`}
              </span>
              <button onClick={() => setShowComments(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a96a2', fontSize: 16 }}>×</button>
            </div>

            {/* Comment list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
              {commentsLoading ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#8a96a2' }}>Loading…</div>
              ) : comments.length === 0 ? (
                <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: '#8a96a2', lineHeight: 1.6 }}>
                  No comments yet.<br />Be the first to add one.
                </div>
              ) : comments.filter(c => !c.parent_id).map((c: any) => (
                <div key={c.id} style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', opacity: c.resolved ? 0.5 : 1 }}>
                  {/* Comment header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(78,140,140,0.15)', color: '#2e5f5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, flexShrink: 0 }}>
                        {c.author_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: '#1a1f24' }}>{c.author_name}</div>
                        <div style={{ fontSize: 10, color: '#8a96a2' }}>{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => resolveComment(c.id, !c.resolved)}
                      title={c.resolved ? 'Unresolve' : 'Resolve'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.resolved ? '#3a7a5a' : '#8a96a2', fontSize: 14 }}
                    >{c.resolved ? '✓' : '○'}</button>
                  </div>

                  {/* Comment body */}
                  <div style={{ fontSize: 12, color: c.content.startsWith('⚠') ? '#943030' : '#2e3640', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: c.content.startsWith('⚠') ? 'rgba(148,48,48,0.06)' : 'transparent', padding: c.content.startsWith('⚠') ? '6px 8px' : '0', borderRadius: 4 }}>
                    {c.content}
                  </div>

                  {/* Replies */}
                  {comments.filter((r: any) => r.parent_id === c.id).map((reply: any) => (
                    <div key={reply.id} style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid #e0ddd8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(78,140,140,0.1)', color: '#2e5f5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600 }}>
                          {reply.author_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 500, color: '#5a6472' }}>{reply.author_name}</span>
                        <span style={{ fontSize: 10, color: '#8a96a2' }}>{new Date(reply.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#2e3640', lineHeight: 1.5 }}>{reply.content}</div>
                    </div>
                  ))}

                  {/* Reply button */}
                  {!c.resolved && (
                    <button
                      onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                      style={{ marginTop: 6, background: 'none', border: 'none', fontSize: 11, color: '#4e8c8c', cursor: 'pointer', padding: 0 }}
                    >{replyTo === c.id ? 'Cancel reply' : '↩ Reply'}</button>
                  )}

                  {/* Reply input */}
                  {replyTo === c.id && (
                    <div style={{ marginTop: 8 }}>
                      <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Write a reply…"
                        autoFocus
                        style={{ width: '100%', height: 56, padding: '6px 8px', fontSize: 11, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                      <button
                        onClick={() => postComment(c.id)}
                        disabled={postingComment || !newComment.trim()}
                        style={{ marginTop: 4, height: 26, padding: '0 10px', fontSize: 11, background: '#4e8c8c', border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', opacity: postingComment || !newComment.trim() ? 0.6 : 1 }}
                      >{postingComment ? 'Posting…' : 'Reply'}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* New comment input */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid #e0ddd8', background: '#fff' }}>
              <textarea
                value={replyTo ? '' : newComment}
                onChange={e => { if (!replyTo) setNewComment(e.target.value) }}
                placeholder={replyTo ? 'Replying to comment above…' : 'Add a comment…'}
                disabled={!!replyTo}
                style={{ width: '100%', height: 64, padding: '8px 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', opacity: replyTo ? 0.5 : 1 }}
              />
              <button
                onClick={() => postComment()}
                disabled={postingComment || !newComment.trim() || !!replyTo}
                style={{ marginTop: 6, width: '100%', height: 30, fontSize: 12, background: '#4e8c8c', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', opacity: postingComment || !newComment.trim() || !!replyTo ? 0.6 : 1, fontWeight: 500 }}
              >{postingComment ? 'Posting…' : 'Post comment'}</button>
            </div>
          </div>
        )}'''

if 'Comments panel' not in content:
    # Insert after the closing of the right reference panel
    content = content.replace(
        "      </div>\n    </div>\n  )\n}",
        "      </div>\n" + comments_panel + "\n    </div>\n  )\n}",
        1  # only replace the last occurrence
    )

# ── 7. Fix the split pane grid to also account for comments panel ─────────────
content = content.replace(
    "        gridTemplateColumns: showReference ? '1fr 1fr' : '1fr',",
    "        gridTemplateColumns: showReference && showComments ? '1fr 1fr' : showReference || showComments ? '1fr' : '1fr',"
)

with open(FILE, 'w') as f:
    f.write(content)

print('✓ Approval workflow and comments panel patched successfully')
