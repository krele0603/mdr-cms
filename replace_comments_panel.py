#!/usr/bin/env python3
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE, 'r') as f:
    lines = f.readlines()
f.close()

# CommentsPanel starts at line 341 (0-indexed: 340) and ends at line 493 (0-indexed: 492)
# We'll replace lines 340-492 with the new version

new_panel = '''function CommentsPanel({ comments, commentsLoading, members, newComment, setNewComment, replyTo, setReplyTo,
  postingComment, postComment, resolveComment, onClose, activeCommentId, setActiveCommentId,
  history, historyLoading, commentTab, setCommentTab }: {
  comments: Comment[]; commentsLoading: boolean; members: Member[]
  newComment: string; setNewComment: (v: string) => void
  replyTo: string | null; setReplyTo: (v: string | null) => void
  postingComment: boolean; postComment: (parentId?: string) => void
  resolveComment: (id: string, resolved: boolean) => void; onClose: () => void
  activeCommentId: string | null; setActiveCommentId: (id: string | null) => void
  history: any[]; historyLoading: boolean
  commentTab: \'comments\' | \'history\'; setCommentTab: (t: \'comments\' | \'history\') => void
}) {
  const [filter, setFilter] = useState<CommentFilter>(\'open\')
  const activeRef = useRef<HTMLDivElement>(null)
  const topLevel = comments.filter(c => !c.parent_id)
  const filtered = topLevel.filter(c => filter === \'open\' ? !c.resolved : c.resolved)
  const openCount = topLevel.filter(c => !c.resolved).length
  const resolvedCount = topLevel.filter(c => c.resolved).length

  useEffect(() => { if (activeCommentId && activeRef.current) activeRef.current.scrollIntoView({ behavior: \'smooth\', block: \'nearest\' }) }, [activeCommentId])
  useEffect(() => { if (activeCommentId) { const c = comments.find(c => c.id === activeCommentId); if (c) setFilter(c.resolved ? \'resolved\' : \'open\') } }, [activeCommentId])

  function avatar(name: string, warning: boolean) {
    return (
      <div style={{ width: 24, height: 24, borderRadius: \'50%\', background: warning ? \'rgba(148,48,48,0.12)\' : \'rgba(78,140,140,0.15)\', color: warning ? \'#943030\' : \'#2e5f5f\', display: \'flex\', alignItems: \'center\', justifyContent: \'center\', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
        {name.split(\' \').map((n: string) => n[0]).join(\'\').toUpperCase().slice(0, 2)}
      </div>
    )
  }

  const historyIcons: Record<string, string> = { submitted: \'📤\', approved: \'✓\', changes_requested: \'↩\', revised: \'↻\' }
  const historyLabels: Record<string, string> = { submitted: \'Submitted for review\', approved: \'Approved\', changes_requested: \'Changes requested\', revised: \'New revision created\' }
  const historyColors: Record<string, string> = { submitted: \'#2e5f5f\', approved: \'#3a7a5a\', changes_requested: \'#943030\', revised: \'#5a6472\' }

  return (
    <div style={{ width: 300, flexShrink: 0, display: \'flex\', flexDirection: \'column\', overflow: \'hidden\', borderLeft: \'1px solid #d8d4ce\', background: \'#faf9f7\' }}>
      {/* Header */}
      <div style={{ padding: \'10px 14px\', borderBottom: \'1px solid #e0ddd8\', background: \'#f5f2ee\', display: \'flex\', alignItems: \'center\', justifyContent: \'space-between\' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: \'#5a6472\', textTransform: \'uppercase\', letterSpacing: \'0.06em\' }}>Document panel</span>
        <button onClick={onClose} style={{ background: \'none\', border: \'none\', cursor: \'pointer\', color: \'#8a96a2\', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {/* Main tabs: Comments | History */}
      <div style={{ display: \'flex\', borderBottom: \'1px solid #e0ddd8\', background: \'#fff\' }}>
        <button onClick={() => setCommentTab(\'comments\')} style={{ flex: 1, height: 34, fontSize: 11, border: \'none\', background: \'none\', cursor: \'pointer\', borderBottom: commentTab === \'comments\' ? \'2px solid #4e8c8c\' : \'2px solid transparent\', color: commentTab === \'comments\' ? \'#2e5f5f\' : \'#8a96a2\', fontWeight: commentTab === \'comments\' ? 600 : 400 }}>
          Comments {openCount > 0 && `(${openCount})`}
        </button>
        <button onClick={() => setCommentTab(\'history\')} style={{ flex: 1, height: 34, fontSize: 11, border: \'none\', background: \'none\', cursor: \'pointer\', borderBottom: commentTab === \'history\' ? \'2px solid #4e8c8c\' : \'2px solid transparent\', color: commentTab === \'history\' ? \'#2e5f5f\' : \'#8a96a2\', fontWeight: commentTab === \'history\' ? 600 : 400 }}>
          History {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      {/* ── History tab ── */}
      {commentTab === \'history\' && (
        <div style={{ flex: 1, overflowY: \'auto\', padding: \'16px 14px\' }}>
          {historyLoading ? (
            <div style={{ textAlign: \'center\', fontSize: 12, color: \'#8a96a2\', padding: 20 }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: \'center\', fontSize: 12, color: \'#8a96a2\', padding: 20, lineHeight: 1.6 }}>
              No history yet.<br />History is recorded on status changes.
            </div>
          ) : (
            <div style={{ position: \'relative\' }}>
              <div style={{ position: \'absolute\', left: 11, top: 12, bottom: 0, width: 1, background: \'#e0ddd8\' }} />
              {history.map((h: any) => {
                const icon = historyIcons[h.action] || \'•\'
                const label = historyLabels[h.action] || h.action
                const color = historyColors[h.action] || \'#5a6472\'
                const bgColor = color === \'#943030\' ? \'rgba(148,48,48,0.1)\' : color === \'#3a7a5a\' ? \'rgba(58,122,90,0.1)\' : \'rgba(78,140,140,0.1)\'
                const borderColor = color === \'#943030\' ? \'rgba(148,48,48,0.2)\' : color === \'#3a7a5a\' ? \'rgba(58,122,90,0.2)\' : \'rgba(78,140,140,0.2)\'
                return (
                  <div key={h.id} style={{ display: \'flex\', gap: 12, marginBottom: 16, position: \'relative\' }}>
                    <div style={{ width: 22, height: 22, borderRadius: \'50%\', background: bgColor, color, display: \'flex\', alignItems: \'center\', justifyContent: \'center\', fontSize: 11, flexShrink: 0, zIndex: 1, border: `1px solid ${borderColor}` }}>{icon}</div>
                    <div style={{ flex: 1, paddingTop: 2 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 2 }}>{label}</div>
                      {h.user_name && <div style={{ fontSize: 11, color: \'#5a6472\', marginBottom: 2 }}>by {h.user_name}</div>}
                      {h.note && <div style={{ fontSize: 11, color: \'#8a96a2\', fontStyle: \'italic\', background: \'#f5f2ee\', padding: \'4px 8px\', borderRadius: 4, marginTop: 4 }}>{h.note}</div>}
                      <div style={{ fontSize: 10, color: \'#8a96a2\', marginTop: 3 }}>{new Date(h.created_at).toLocaleDateString(\'en-GB\', { day: \'numeric\', month: \'short\', year: \'numeric\', hour: \'2-digit\', minute: \'2-digit\' })}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Comments tab ── */}
      {commentTab === \'comments\' && (
        <>
          {/* Open/Resolved sub-tabs */}
          <div style={{ display: \'flex\', borderBottom: \'1px solid #e0ddd8\', background: \'#fff\' }}>
            {([\'open\', \'resolved\'] as CommentFilter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, height: 30, fontSize: 11, border: \'none\', background: \'none\', cursor: \'pointer\', borderBottom: filter === f ? \'2px solid #4e8c8c\' : \'2px solid transparent\', color: filter === f ? \'#2e5f5f\' : \'#8a96a2\', fontWeight: filter === f ? 600 : 400 }}>
                {f === \'open\' ? `Open (${openCount})` : `Resolved (${resolvedCount})`}
              </button>
            ))}
          </div>

          {/* Comment list */}
          <div style={{ flex: 1, overflowY: \'auto\', padding: \'8px 0\' }}>
            {commentsLoading ? (
              <div style={{ padding: 20, textAlign: \'center\', fontSize: 12, color: \'#8a96a2\' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: \'24px 14px\', textAlign: \'center\', fontSize: 12, color: \'#8a96a2\', lineHeight: 1.6 }}>
                {filter === \'open\' ? \'No open comments.\' : \'No resolved comments.\'}
              </div>
            ) : filtered.map(c => {
              const replies = comments.filter(r => r.parent_id === c.id)
              const isWarning = c.content.startsWith(\'⚠\')
              const isActive = activeCommentId === c.id
              return (
                <div key={c.id} ref={isActive ? activeRef : null}
                  onClick={() => setActiveCommentId(isActive ? null : c.id)}
                  style={{ padding: \'10px 14px\', borderBottom: \'0.5px solid rgba(0,0,0,0.06)\', opacity: c.resolved ? 0.65 : 1, background: isActive ? \'rgba(78,140,140,0.06)\' : \'transparent\', borderLeft: isActive ? \'3px solid #4e8c8c\' : \'3px solid transparent\', cursor: \'pointer\' }}>
                  {c.anchor_text && (
                    <div style={{ fontSize: 10, fontStyle: \'italic\', color: \'#5a6472\', background: \'#f5f2ee\', padding: \'3px 8px\', borderRadius: 3, borderLeft: \'2px solid #4e8c8c\', marginBottom: 7, overflow: \'hidden\', textOverflow: \'ellipsis\', whiteSpace: \'nowrap\' }}>
                      "{c.anchor_text.slice(0, 60)}{c.anchor_text.length > 60 ? \'…\' : \'\'}"
                    </div>
                  )}
                  <div style={{ display: \'flex\', alignItems: \'center\', justifyContent: \'space-between\', marginBottom: 6 }}>
                    <div style={{ display: \'flex\', alignItems: \'center\', gap: 7 }}>
                      {avatar(c.author_name, isWarning)}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: \'#1a1f24\' }}>{c.author_name}</div>
                        <div style={{ fontSize: 10, color: \'#8a96a2\' }}>{new Date(c.created_at).toLocaleDateString(\'en-GB\', { day: \'numeric\', month: \'short\', hour: \'2-digit\', minute: \'2-digit\' })}</div>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); resolveComment(c.id, !c.resolved) }}
                      style={{ background: c.resolved ? \'rgba(58,122,90,0.1)\' : \'transparent\', border: c.resolved ? \'0.5px solid rgba(58,122,90,0.3)\' : \'0.5px solid rgba(0,0,0,0.15)\', borderRadius: 5, cursor: \'pointer\', color: c.resolved ? \'#3a7a5a\' : \'#8a96a2\', fontSize: 11, padding: \'3px 8px\', fontWeight: 500 }}>
                      {c.resolved ? \'✓ Resolved\' : \'Resolve\'}
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: isWarning ? \'#943030\' : \'#2e3640\', lineHeight: 1.6, background: isWarning ? \'rgba(148,48,48,0.06)\' : \'transparent\', padding: isWarning ? \'6px 8px\' : 0, borderRadius: 4, whiteSpace: \'pre-wrap\' }}>
                    {c.content}
                  </div>
                  {replies.map(r => (
                    <div key={r.id} style={{ marginTop: 8, paddingLeft: 14, borderLeft: \'2px solid #e0ddd8\' }}>
                      <div style={{ display: \'flex\', alignItems: \'center\', gap: 5, marginBottom: 2 }}>
                        <div style={{ width: 18, height: 18, borderRadius: \'50%\', background: \'rgba(78,140,140,0.1)\', color: \'#2e5f5f\', display: \'flex\', alignItems: \'center\', justifyContent: \'center\', fontSize: 8, fontWeight: 700 }}>
                          {r.author_name.split(\' \').map((n: string) => n[0]).join(\'\').toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: \'#5a6472\' }}>{r.author_name}</span>
                        <span style={{ fontSize: 10, color: \'#8a96a2\' }}>{new Date(r.created_at).toLocaleDateString(\'en-GB\', { day: \'numeric\', month: \'short\' })}</span>
                      </div>
                      <div style={{ fontSize: 11, color: \'#2e3640\', lineHeight: 1.5 }}>{r.content}</div>
                    </div>
                  ))}
                  {!c.resolved && (
                    <button onClick={e => { e.stopPropagation(); setReplyTo(replyTo === c.id ? null : c.id) }}
                      style={{ marginTop: 7, background: \'none\', border: \'none\', fontSize: 11, color: \'#4e8c8c\', cursor: \'pointer\', padding: 0 }}>
                      {replyTo === c.id ? \'Cancel reply\' : \'↩ Reply\'}
                    </button>
                  )}
                  {replyTo === c.id && (
                    <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
                      <CommentInput value={newComment} onChange={setNewComment} members={members} placeholder="Write a reply… use @ to mention" style={{ height: 56 }} autoFocus />
                      <button onClick={() => postComment(c.id)} disabled={postingComment || !newComment.trim()}
                        style={{ marginTop: 4, height: 26, padding: \'0 12px\', fontSize: 11, background: \'#4e8c8c\', border: \'none\', borderRadius: 5, color: \'#fff\', cursor: \'pointer\', opacity: postingComment || !newComment.trim() ? 0.6 : 1 }}>
                        {postingComment ? \'Posting…\' : \'Reply\'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* New comment input */}
          {filter === \'open\' && !replyTo && (
            <div style={{ padding: \'10px 14px\', borderTop: \'1px solid #e0ddd8\', background: \'#fff\' }}>
              <div style={{ fontSize: 11, color: \'#8a96a2\', marginBottom: 6 }}>Select text in the document to attach a comment to it</div>
              <CommentInput value={newComment} onChange={setNewComment} placeholder="Add a comment… use @ to mention" members={members} style={{ height: 64 }} />
              <button onClick={() => postComment()} disabled={postingComment || !newComment.trim()}
                style={{ marginTop: 6, width: \'100%\', height: 30, fontSize: 12, background: \'#4e8c8c\', border: \'none\', borderRadius: 6, color: \'#fff\', cursor: \'pointer\', opacity: postingComment || !newComment.trim() ? 0.6 : 1, fontWeight: 500 }}>
                {postingComment ? \'Posting…\' : \'Post comment\'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
'''

# Find start and end of CommentsPanel (lines 341-493, 0-indexed 340-492)
start = 340  # line 341
end = 493    # line 493 (exclusive)

new_lines = lines[:start] + [new_panel + '\n'] + lines[end:]

with open(FILE, 'w') as f:
    f.writelines(new_lines)
print(f'Replaced CommentsPanel (lines 341-493) with new version including History tab')
print('done')
