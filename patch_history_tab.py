#!/usr/bin/env python3
"""
Adds History tab to the comments panel in the document editor.
Also writes history entry when client submits for review.
Run: python3 patch_history_tab.py
"""

FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

fixes = 0

# 1. Add history state
if '[history, setHistory]' not in content:
    content = content.replace(
        "  // Comments state\n  const [comments, setComments] = useState<Comment[]>([])",
        """  // Comments state
  const [comments, setComments] = useState<Comment[]>([])"""
    )
    content = content.replace(
        "  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)",
        """  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [commentTab, setCommentTab] = useState<'comments' | 'history'>('comments')"""
    )
    fixes += 1
    print('Added history state')

# 2. Add loadHistory function after loadComments
if 'loadHistory' not in content:
    content = content.replace(
        "  async function postComment(parentId?: string) {",
        """  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/history`)
      if (res.ok) setHistory(await res.json())
    } finally { setHistoryLoading(false) }
  }

  async function postComment(parentId?: string) {"""
    )
    fixes += 1
    print('Added loadHistory function')

# 3. Load history when comments panel opens
if 'loadHistory()' not in content:
    content = content.replace(
        "  useEffect(() => {\n    if (showComments) loadComments()\n  }, [showComments])",
        """  useEffect(() => {
    if (showComments) { loadComments(); loadHistory() }
  }, [showComments])"""
    )
    fixes += 1
    print('Updated showComments effect to also load history')

# 4. Write history on submit for review
if "action: 'submitted'" not in content:
    content = content.replace(
        "    await updateStatus('review'); setSubmitting(false)",
        """    await fetch(`/api/projects/${projectId}/documents/${docId}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submitted' }),
    }).catch(() => {})
    await updateStatus('review'); setSubmitting(false)"""
    )
    fixes += 1
    print('Added history write on submit')

# 5. Add History tab to CommentsPanel
# Find the filter tabs section and add History tab
ACTION_LABELS = {
    'submitted': { 'icon': '📤', 'label': 'Submitted for review', 'color': '#2e5f5f' },
    'approved': { 'icon': '✓', 'label': 'Approved', 'color': '#3a7a5a' },
    'changes_requested': { 'icon': '↩', 'label': 'Changes requested', 'color': '#943030' },
    'revised': { 'icon': '↻', 'label': 'New revision created', 'color': '#5a6472' },
}

# Add commentTab, history, historyLoading props to CommentsPanel
if 'historyLoading' not in content:
    content = content.replace(
        "  activeCommentId: string | null\n  setActiveCommentId: (id: string | null) => void\n}) {",
        """  activeCommentId: string | null
  setActiveCommentId: (id: string | null) => void
  history: any[]
  historyLoading: boolean
  commentTab: 'comments' | 'history'
  setCommentTab: (tab: 'comments' | 'history') => void
}) {"""
    )
    # Add history/historyLoading/commentTab to CommentsPanel destructure
    content = content.replace(
        "function CommentsPanel({ comments, commentsLoading, members, newComment, setNewComment, replyTo, setReplyTo,\n  postingComment, postComment, resolveComment, onClose, activeCommentId, setActiveCommentId }:",
        "function CommentsPanel({ comments, commentsLoading, members, newComment, setNewComment, replyTo, setReplyTo,\n  postingComment, postComment, resolveComment, onClose, activeCommentId, setActiveCommentId,\n  history, historyLoading, commentTab, setCommentTab }:"
    )
    fixes += 1
    print('Added history props to CommentsPanel')

# 6. Add History tab button next to Open/Resolved tabs
if "'history'" not in content:
    content = content.replace(
        "      {/* Filter tabs */}\n      <div style={{ display: 'flex', borderBottom: '1px solid #e0ddd8', background: '#fff' }}>\n        {(['open', 'resolved'] as CommentFilter[]).map(f => (",
        """      {/* Tabs: Comments | History */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0ddd8', background: '#fff' }}>
        <button onClick={() => setCommentTab('comments')}
          style={{ flex: 1, height: 34, fontSize: 11, border: 'none', background: 'none', cursor: 'pointer', borderBottom: commentTab === 'comments' ? '2px solid #4e8c8c' : '2px solid transparent', color: commentTab === 'comments' ? '#2e5f5f' : '#8a96a2', fontWeight: commentTab === 'comments' ? 600 : 400 }}>
          Comments
        </button>
        <button onClick={() => setCommentTab('history')}
          style={{ flex: 1, height: 34, fontSize: 11, border: 'none', background: 'none', cursor: 'pointer', borderBottom: commentTab === 'history' ? '2px solid #4e8c8c' : '2px solid transparent', color: commentTab === 'history' ? '#2e5f5f' : '#8a96a2', fontWeight: commentTab === 'history' ? 600 : 400 }}>
          History {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      {/* History tab */}
      {commentTab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
          {historyLoading ? (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#8a96a2', padding: 20 }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#8a96a2', padding: 20, lineHeight: 1.6 }}>
              No history yet.<br />History is recorded on status changes.
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Timeline line */}
              <div style={{ position: 'absolute', left: 11, top: 12, bottom: 0, width: 1, background: '#e0ddd8' }} />
              {history.map((h: any, idx: number) => {
                const icons: Record<string, string> = { submitted: '📤', approved: '✓', changes_requested: '↩', revised: '↻' }
                const labels: Record<string, string> = { submitted: 'Submitted for review', approved: 'Approved', changes_requested: 'Changes requested', revised: 'New revision created' }
                const colors: Record<string, string> = { submitted: '#2e5f5f', approved: '#3a7a5a', changes_requested: '#943030', revised: '#5a6472' }
                const icon = icons[h.action] || '•'
                const label = labels[h.action] || h.action
                const color = colors[h.action] || '#5a6472'
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 12, marginBottom: 16, position: 'relative' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: color === '#943030' ? 'rgba(148,48,48,0.1)' : color === '#3a7a5a' ? 'rgba(58,122,90,0.1)' : 'rgba(78,140,140,0.1)', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, zIndex: 1, border: `1px solid ${color === '#943030' ? 'rgba(148,48,48,0.2)' : color === '#3a7a5a' ? 'rgba(58,122,90,0.2)' : 'rgba(78,140,140,0.2)'}` }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, paddingTop: 2 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 2 }}>{label}</div>
                      {h.user_name && <div style={{ fontSize: 11, color: '#5a6472', marginBottom: 2 }}>by {h.user_name}</div>}
                      {h.note && <div style={{ fontSize: 11, color: '#8a96a2', fontStyle: 'italic', background: '#f5f2ee', padding: '4px 8px', borderRadius: 4, marginTop: 4 }}>{h.note}</div>}
                      <div style={{ fontSize: 10, color: '#8a96a2', marginTop: 3 }}>{new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {commentTab === 'comments' && (
      <>{/* Comments filter tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0ddd8', background: '#fff' }}>
        {(['open', 'resolved'] as CommentFilter[]).map(f => ("""
    )
    fixes += 1
    print('Added History tab UI')

# 7. Close the commentTab === 'comments' wrapper before new comment input
if "      </>\n      )}\n\n      {/* New comment */}" not in content:
    content = content.replace(
        "      {/* New comment */}\n      {filter === 'open' && !replyTo && (",
        "      </>\n      )}\n\n      {/* New comment */}\n      {commentTab === 'comments' && filter === 'open' && !replyTo && ("
    )
    fixes += 1
    print('Closed commentTab wrapper')

# 8. Pass new props to CommentsPanel in JSX
if 'history={history}' not in content:
    content = content.replace(
        "            activeCommentId={activeCommentId} setActiveCommentId={setActiveCommentId}\n          />",
        """            activeCommentId={activeCommentId} setActiveCommentId={setActiveCommentId}
            history={history} historyLoading={historyLoading}
            commentTab={commentTab} setCommentTab={setCommentTab}
          />"""
    )
    fixes += 1
    print('Passed history props to CommentsPanel')

with open(FILE, 'w') as f:
    f.write(content)

print(f'Done. {fixes} fixes applied.')
