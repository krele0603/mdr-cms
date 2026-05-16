path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/companies/[id]/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# 1. Add modules to company state interface (find company state setter)
# Add modules to the company data used in state
old_company_type = "const [company, setCompany] = useState<any>(null)"
# just leave as-is since it's `any`

# 2. Add toggleModule function after existing functions — find a good insertion point
# Insert before the return statement
old_return = "  if (loading) return ("
new_toggle_fn = """  async function toggleModule(mod: 'tfbuilder' | 'eqms', val: boolean) {
    const current = company?.modules || { tfbuilder: true, eqms: true }
    const updated = { ...current, [mod]: val }
    const res = await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules: updated }),
    })
    if (res.ok) setCompany((c: any) => ({ ...c, modules: updated }))
  }

  if (loading) return ("""
content = content.replace(old_return, new_toggle_fn)

# 3. Add module toggle UI after company header card, before eQMS section
old_eqms_section = "      {/* eQMS Levels */}\n      <div style={{ marginBottom: 14 }}>\n        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#1a1a18' }}>eQMS</div>"

new_eqms_section = """      {/* Module toggles — admin only */}
      {isAdmin && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '14px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>Licensed modules</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {([
              { key: 'tfbuilder', label: 'TFBuilder', sub: 'Technical file management', color: '#0C447C', bg: '#E6F1FB', border: '#85B7EB' },
              { key: 'eqms',     label: 'eQMS',      sub: 'Quality management system',  color: '#27500A', bg: '#EAF3DE', border: '#97C459' },
            ] as const).map(m => {
              const enabled = company?.modules?.[m.key] !== false
              return (
                <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderRadius: 10, border: `0.5px solid ${enabled ? m.border : 'rgba(0,0,0,0.1)'}`, background: enabled ? m.bg : '#f8f7f4', flex: 1 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: enabled ? m.color : '#8a96a2' }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: enabled ? m.color : '#9b9991', opacity: 0.8 }}>{m.sub}</div>
                  </div>
                  <div onClick={() => toggleModule(m.key, !enabled)}
                    style={{ width: 40, height: 22, borderRadius: 11, background: enabled ? m.color : '#d8d4ce', cursor: 'pointer', position: 'relative' as const, transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute' as const, top: 3, left: enabled ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: enabled ? m.color : '#9b9991', minWidth: 32 }}>{enabled ? 'On' : 'Off'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* eQMS Levels */}
      {company?.modules?.eqms !== false && (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#1a1a18' }}>eQMS</div>"""

content = content.replace(old_eqms_section, new_eqms_section)

# 4. Close the eQMS conditional — find end of eQMS grid
old_eqms_end = "        </div>\n      </div>\n\n      {/* TF Projects */}"
new_eqms_end = "        </div>\n      </div>\n      )}\n\n      {/* TF Projects */}"
content = content.replace(old_eqms_end, new_eqms_end)

# 5. Gate TFBuilder section
old_tf_section = "      {/* TF Projects */}\n      <div style={{ marginBottom: 14 }}>"
new_tf_section = "      {/* TF Projects */}\n      {company?.modules?.tfbuilder !== false && (\n      <div style={{ marginBottom: 14 }}>"
content = content.replace(old_tf_section, new_tf_section)

# 6. Find end of TF projects section to close conditional
# The TF section ends before Members section
old_tf_end = "\n      {/* Members */}"
new_tf_end = "\n      )}\n\n      {/* Members */}"
content = content.replace(old_tf_end, new_tf_end, 1)

with open(path, 'w') as f:
    f.write(content)
print("✓ companies/[id]/page.tsx patched with module toggles")
