#!/usr/bin/env python3
"""
Adds document settings (header/footer) panel to project detail page.
Run: python3 patch_doc_settings.py
"""

FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# 1. Add doc settings state variables after existing state
new_state = '''  const [showDocSettings, setShowDocSettings] = useState(false)
  const [docSettings, setDocSettings] = useState({
    footer_confidentiality: 'Confidential',
    footer_show_version: true,
    footer_show_date: true,
    footer_show_page_numbers: true,
  })'''

if 'showDocSettings' not in content:
    content = content.replace(
        '  const [addingDoc, setAddingDoc] = useState(false)',
        '  const [addingDoc, setAddingDoc] = useState(false)\n' + new_state
    )

# 2. Populate docSettings when project loads
load_patch = '''    setDocSettings({
      footer_confidentiality: data.project.footer_confidentiality || 'Confidential',
      footer_show_version: data.project.footer_show_version ?? true,
      footer_show_date: data.project.footer_show_date ?? true,
      footer_show_page_numbers: data.project.footer_show_page_numbers ?? true,
    })'''

if 'setDocSettings({' not in content:
    content = content.replace(
        '    setDocs(data.docs)',
        '    setDocs(data.docs)\n' + load_patch
    )

# 3. Add save doc settings function
save_fn = '''
  async function saveDocSettings() {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docSettings),
    })
    setShowDocSettings(false)
    load()
  }
'''

if 'saveDocSettings' not in content:
    content = content.replace(
        '  async function updateProjectStatus',
        save_fn + '\n  async function updateProjectStatus'
    )

# 4. Add "Doc Settings" button next to "Edit project" button
doc_btn = '''            <button onClick={() => setShowDocSettings(v => !v)} style={{height:30,padding:'0 12px',fontSize:12,background:showDocSettings?'rgba(78,140,140,0.1)':'transparent',border:showDocSettings?'0.5px solid rgba(78,140,140,0.3)':'0.5px solid rgba(0,0,0,0.2)',borderRadius:8,color:showDocSettings?'#2e5f5f':'#1a1a18',cursor:'pointer'}}>
              Doc settings
            </button>'''

if 'Doc settings' not in content:
    content = content.replace(
        "              {editMode ? 'Done editing' : 'Edit project'}\n            </button>",
        "              {editMode ? 'Done editing' : 'Edit project'}\n            </button>\n" + doc_btn
    )

# 5. Add the settings panel before the annex/docs grid
settings_panel = '''
      {/* Document settings panel */}
      {showDocSettings && (
        <div style={{background:'#fff',border:'0.5px solid rgba(0,0,0,0.1)',borderRadius:12,padding:'16px 20px',marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:14,color:'#1a1f24'}}>Document header &amp; footer settings</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'#5a6472',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Footer</div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:12,color:'#5a6472',marginBottom:4,display:'block'}}>Confidentiality text</label>
                <input value={docSettings.footer_confidentiality} onChange={e => setDocSettings(s => ({...s, footer_confidentiality: e.target.value}))}
                  style={{width:'100%',height:32,padding:'0 10px',fontSize:12,border:'0.5px solid rgba(0,0,0,0.18)',borderRadius:6,outline:'none'}} />
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[
                  {key:'footer_show_version', label:'Show version'},
                  {key:'footer_show_date', label:'Show date'},
                  {key:'footer_show_page_numbers', label:'Show page numbers'},
                ].map(({key, label}) => (
                  <label key={key} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#2e3640',cursor:'pointer'}}>
                    <input type="checkbox" checked={docSettings[key as keyof typeof docSettings] as boolean}
                      onChange={e => setDocSettings(s => ({...s, [key]: e.target.checked}))}
                      style={{width:14,height:14,cursor:'pointer'}} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'#5a6472',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Header preview</div>
              <div style={{border:'1px solid #e0ddd8',borderRadius:6,padding:'10px 14px',background:'#faf9f7',fontSize:11}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:8,borderBottom:'1px solid #e0ddd8',marginBottom:8}}>
                  <span style={{color:'#8a96a2'}}>[LOGO]</span>
                  <span style={{fontWeight:600,color:'#2e3640'}}>Document name</span>
                  <span style={{color:'#5a6472',fontFamily:'monospace'}}>DOC-001</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',color:'#8a96a2'}}>
                  <span>{docSettings.footer_show_version ? 'v1 · ' : ''}{docSettings.footer_confidentiality}</span>
                  <span>{docSettings.footer_show_date ? new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : ''}</span>
                  <span>{docSettings.footer_show_page_numbers ? 'Page 1 of N' : ''}</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}>
            <button onClick={() => setShowDocSettings(false)} style={{height:30,padding:'0 14px',fontSize:12,cursor:'pointer',background:'none',border:'0.5px solid rgba(0,0,0,0.15)',borderRadius:6,color:'#5a6472'}}>Cancel</button>
            <button onClick={saveDocSettings} style={{height:30,padding:'0 14px',fontSize:12,cursor:'pointer',background:'#4e8c8c',border:'none',borderRadius:6,color:'#fff',fontWeight:500}}>Save settings</button>
          </div>
        </div>
      )}
'''

if 'showDocSettings && (' not in content:
    # Insert before the annex + docs grid
    content = content.replace(
        "      <div style={{display:'grid',gridTemplateColumns:'176px minmax(0,1fr)',gap:14}}>",
        settings_panel + "\n      <div style={{display:'grid',gridTemplateColumns:'176px minmax(0,1fr)',gap:14}}>"
    )

with open(FILE, 'w') as f:
    f.write(content)

print('✓ Document settings panel patched successfully')
