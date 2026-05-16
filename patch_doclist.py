import re

# 1. Add "Document List" button on company detail page — next to eQMS section header
path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/companies/[id]/page.tsx'
with open(path) as f: c = f.read()

old = "      {/* eQMS Levels */}\n      {company?.modules?.eqms !== false && (\n      <div style={{ marginBottom: 14 }}>\n        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#1a1a18' }}>eQMS</div>"
new = """      {/* eQMS Levels */}
      {company?.modules?.eqms !== false && (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>eQMS</div>
          {['admin', 'consultant', 'client-MR'].includes(sessionRole) && (
            <Link href={`/dashboard/companies/${id}/eqms/doclist`} style={{ fontSize: 12, color: '#27500A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: '#EAF3DE', border: '0.5px solid #97C459' }}>
              📋 Document list
            </Link>
          )}
        </div>"""
c = c.replace(old, new)
with open(path, 'w') as f: f.write(c)
print("✓ company page patched")

# 2. Add doclist link in client nav (for MR)
nav_path = '/home/mefisto/stacks/mdr-cms/apps/web/src/components/layout/DashboardNav.tsx'
with open(nav_path) as f: nav = f.read()

old_nav = "                  {[{label:'Policies',level:1},{label:'Procedures',level:2},{label:'Work Instructions',level:3},{label:'Forms & Templates',level:4},{label:'Records',level:5}].map(({label,level}) => {"
new_nav = """                  {sessionData?.role === 'client-MR' && (
                    <a href={`/dashboard/companies/${selectedCompanyId}/eqms/doclist`}
                      style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 12px', borderRadius:8, fontSize:13, color: pathname.includes('doclist') ? '#4e8c8c' : 'rgba(255,255,255,0.55)', background: pathname.includes('doclist') ? 'rgba(78,140,140,0.15)' : 'transparent', textDecoration:'none', marginBottom:2 }}>
                      <span style={{fontSize:11,opacity:0.5}}>📋</span>Document list
                    </a>
                  )}
                  {[{label:'Policies',level:1},{label:'Procedures',level:2},{label:'Work Instructions',level:3},{label:'Forms & Templates',level:4},{label:'Records',level:5}].map(({label,level}) => {"""
nav = nav.replace(old_nav, new_nav)
with open(nav_path, 'w') as f: f.write(nav)
print("✓ nav patched")
