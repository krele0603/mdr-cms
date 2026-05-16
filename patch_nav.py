path = '/home/mefisto/stacks/mdr-cms/apps/web/src/components/layout/DashboardNav.tsx'
with open(path, 'r') as f:
    content = f.read()

old = "  { label: 'Users', href: '/dashboard/users', roles: ['admin'],"
new = """  { label: 'Audit Trail', href: '/dashboard/audit', roles: ['admin'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
  { label: 'Users', href: '/dashboard/users', roles: ['admin'],"""
content = content.replace(old, new)

with open(path, 'w') as f:
    f.write(content)

print("✓ DashboardNav.tsx patched - Audit Trail added")
