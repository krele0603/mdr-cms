path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# Find and remove the misplaced modal block
modal_marker = '\n\n      {/* STED Approve Modal */}\n      {showStedApprove &&'
start = content.find(modal_marker)
if start == -1:
    print('ERROR: modal not found')
    exit()

end_marker = '}\n  )\n}'
end = content.find(end_marker, start)
if end == -1:
    print('ERROR: end not found')
    exit()

content = content[:start] + content[end + len(end_marker):]
print('Removed misplaced modal')

modal_html = """

      {showStedApprove && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FFF3CD', color: '#856404', border: '0.5px solid #FFEEBA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>STED</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1f24' }}>Approve Technical File</div>
                <div style={{ fontSize: 12, color: '#5a6472' }}>Creates a locked TF revision snapshot</div>
              </div>
            </div>
            <div style={{ background: '#FFF3CD', border: '0.5px solid #FFEEBA', borderRadius: 8, padding: '10px 14px', marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: '#856404', fontWeight: 500, marginBottom: 4 }}>Version (X.Y.Z)</div>
              <div style={{ fontSize: 11, color: '#856404', marginBottom: 10 }}>X = major · Y = moderate · Z = minor (typos)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {([['X', stedVersionX, setSedVersionX, 1], ['Y', stedVersionY, setSedVersionY, 0], ['Z', stedVersionZ, setSedVersionZ, 0]] as [string, number, (v: number) => void, number][]).map(([label, val, setter, min], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {i > 0 && <span style={{ fontSize: 20, color: '#856404' }}>.</span>}
                    <div style={{ textAlign: 'center' as const }}>
                      <div style={{ fontSize: 10, color: '#856404', marginBottom: 2 }}>{label}</div>
                      <input type="number" min={min} value={val} onChange={e => setter(Math.max(min, parseInt(e.target.value) || min))}
                        style={{ width: 56, height: 34, textAlign: 'center' as const, fontSize: 16, fontWeight: 700, border: '1.5px solid #FFEEBA', borderRadius: 6, outline: 'none', color: '#856404' }} />
                    </div>
                  </div>
                ))}
                <div style={{ flex: 1, textAlign: 'right' as const, fontSize: 20, fontWeight: 700, color: '#856404' }}>{stedVersionX}.{stedVersionY}.{stedVersionZ}</div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#5a6472', display: 'block', marginBottom: 4 }}>Notes (optional)</label>
              <textarea value={stedNotes} onChange={e => setSedNotes(e.target.value)} placeholder="What changed in this revision?" rows={3}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
            </div>
            {stedApproveError && <div style={{ fontSize: 12, color: '#943030', background: 'rgba(148,48,48,0.06)', border: '0.5px solid rgba(148,48,48,0.2)', borderRadius: 6, padding: '8px 12px', marginBottom: 14, whiteSpace: 'pre-line' as const }}>{stedApproveError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setShowStedApprove(false); setSedApproveError('') }} style={{ height: 34, padding: '0 16px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>Cancel</button>
              <button onClick={approveSTED} disabled={stedApproving} style={{ height: 34, padding: '0 20px', fontSize: 13, background: '#856404', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontWeight: 500, opacity: stedApproving ? 0.7 : 1 }}>
                {stedApproving ? 'Approving...' : 'Approve TF v' + stedVersionX + '.' + stedVersionY + '.' + stedVersionZ}
              </button>
            </div>
          </div>
        </div>
      )}"""

real_end = '\n}\n'
last_idx = content.rfind(real_end)
content = content[:last_idx] + modal_html + content[last_idx:]

with open(path, 'w') as f:
    f.write(content)
print('Done')
