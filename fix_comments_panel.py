#!/usr/bin/env python3
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

f = open(FILE, 'r')
lines = f.readlines()
f.close()

panel = [
    "        {/* Comments panel */}\n",
    "        {showComments && (\n",
    "          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid #d8d4ce', background: '#faf9f7' }}>\n",
    "            <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0ddd8', background: '#f5f2ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>\n",
    "              <span style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase', letterSpacing: '0.06em' }}>\n",
    "                {'Comments'}{comments.filter((c: any) => !c.resolved).length > 0 && ` (${comments.filter((c: any) => !c.resolved).length})`}\n",
    "              </span>\n",
    "              <button onClick={() => setShowComments(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a96a2', fontSize: 16 }}>\u00d7</button>\n",
    "            </div>\n",
    "            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>\n",
    "              {commentsLoading ? (\n",
    "                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#8a96a2' }}>Loading\u2026</div>\n",
    "              ) : comments.length === 0 ? (\n",
    "                <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: '#8a96a2', lineHeight: 1.6 }}>No comments yet.<br />Be the first to add one.</div>\n",
    "              ) : comments.filter((c: any) => !c.parent_id).map((c: any) => (\n",
    "                <div key={c.id} style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', opacity: c.resolved ? 0.5 : 1 }}>\n",
    "                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>\n",
    "                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>\n",
    "                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(78,140,140,0.15)', color: '#2e5f5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, flexShrink: 0 }}>\n",
    "                        {c.author_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}\n",
    "                      </div>\n",
    "                      <div>\n",
    "                        <div style={{ fontSize: 11, fontWeight: 500, color: '#1a1f24' }}>{c.author_name}</div>\n",
    "                        <div style={{ fontSize: 10, color: '#8a96a2' }}>{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>\n",
    "                      </div>\n",
    "                    </div>\n",
    "                    <button onClick={() => resolveComment(c.id, !c.resolved)} title={c.resolved ? 'Unresolve' : 'Resolve'}\n",
    "                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.resolved ? '#3a7a5a' : '#8a96a2', fontSize: 14 }}>\n",
    "                      {c.resolved ? '\u2713' : '\u25cb'}\n",
    "                    </button>\n",
    "                  </div>\n",
    "                  <div style={{ fontSize: 12, color: c.content.startsWith('\u26a0') ? '#943030' : '#2e3640', lineHeight: 1.6,\n",
    "                    background: c.content.startsWith('\u26a0') ? 'rgba(148,48,48,0.06)' : 'transparent',\n",
    "                    padding: c.content.startsWith('\u26a0') ? '6px 8px' : '0', borderRadius: 4 }}>\n",
    "                    {c.content}\n",
    "                  </div>\n",
    "                  {comments.filter((r: any) => r.parent_id === c.id).map((reply: any) => (\n",
    "                    <div key={reply.id} style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid #e0ddd8' }}>\n",
    "                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>\n",
    "                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(78,140,140,0.1)', color: '#2e5f5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600 }}>\n",
    "                          {reply.author_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}\n",
    "                        </div>\n",
    "                        <span style={{ fontSize: 10, fontWeight: 500, color: '#5a6472' }}>{reply.author_name}</span>\n",
    "                        <span style={{ fontSize: 10, color: '#8a96a2' }}>{new Date(reply.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>\n",
    "                      </div>\n",
    "                      <div style={{ fontSize: 11, color: '#2e3640', lineHeight: 1.5 }}>{reply.content}</div>\n",
    "                    </div>\n",
    "                  ))}\n",
    "                  {!c.resolved && (\n",
    "                    <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}\n",
    "                      style={{ marginTop: 6, background: 'none', border: 'none', fontSize: 11, color: '#4e8c8c', cursor: 'pointer', padding: 0 }}>\n",
    "                      {replyTo === c.id ? 'Cancel reply' : '\u21a9 Reply'}\n",
    "                    </button>\n",
    "                  )}\n",
    "                  {replyTo === c.id && (\n",
    "                    <div style={{ marginTop: 8 }}>\n",
    "                      <textarea value={newComment} onChange={e => setNewComment(e.target.value)}\n",
    "                        placeholder=\"Write a reply\u2026\" autoFocus\n",
    "                        style={{ width: '100%', height: 56, padding: '6px 8px', fontSize: 11, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />\n",
    "                      <button onClick={() => postComment(c.id)} disabled={postingComment || !newComment.trim()}\n",
    "                        style={{ marginTop: 4, height: 26, padding: '0 10px', fontSize: 11, background: '#4e8c8c', border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', opacity: postingComment || !newComment.trim() ? 0.6 : 1 }}>\n",
    "                        {postingComment ? 'Posting\u2026' : 'Reply'}\n",
    "                      </button>\n",
    "                    </div>\n",
    "                  )}\n",
    "                </div>\n",
    "              ))}\n",
    "            </div>\n",
    "            <div style={{ padding: '10px 14px', borderTop: '1px solid #e0ddd8', background: '#fff' }}>\n",
    "              <textarea value={replyTo ? '' : newComment}\n",
    "                onChange={e => { if (!replyTo) setNewComment(e.target.value) }}\n",
    "                placeholder={replyTo ? 'Replying to comment above\u2026' : 'Add a comment\u2026'}\n",
    "                disabled={!!replyTo}\n",
    "                style={{ width: '100%', height: 64, padding: '8px 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const, opacity: replyTo ? 0.5 : 1 }} />\n",
    "              <button onClick={() => postComment()} disabled={postingComment || !newComment.trim() || !!replyTo}\n",
    "                style={{ marginTop: 6, width: '100%', height: 30, fontSize: 12, background: '#4e8c8c', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', opacity: postingComment || !newComment.trim() || !!replyTo ? 0.6 : 1, fontWeight: 500 }}>\n",
    "                {postingComment ? 'Posting\u2026' : 'Post comment'}\n",
    "              </button>\n",
    "            </div>\n",
    "          </div>\n",
    "        )}\n",
]

# Find the correct insertion point - just before the closing </div> of split pane
# Look for the pattern: line ending the reference panel section followed by closing of split pane div
insert_at = None
for i in range(len(lines) - 3, 0, -1):
    if lines[i].strip() == '</div>' and lines[i+1].strip() == '</div>' and lines[i+2].strip() == '</div>':
        insert_at = i + 1
        break

if insert_at is None:
    # Fallback: find by line 804
    insert_at = 804
    print(f'Using fallback insertion at line {insert_at}')
else:
    print(f'Inserting at line {insert_at + 1}')

new_lines = lines[:insert_at] + panel + lines[insert_at:]

f = open(FILE, 'w')
f.writelines(new_lines)
f.close()
print('Done! Comments panel inserted.')
