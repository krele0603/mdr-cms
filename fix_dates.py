# Fix 1: doclist page - files don't have updated_at, use created_at as fallback
path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/companies/[id]/eqms/doclist/page.tsx'
with open(path) as f: c = f.read()
c = c.replace(
    "new Date(doc.updated_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })",
    "new Date(doc.updated_at || doc.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })"
)
with open(path, 'w') as f: f.write(c)
print('✓ doclist page fixed')

# Fix 2: qms-templates page - use updated_at || created_at
path2 = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/qms-templates/page.tsx'
with open(path2) as f: c2 = f.read()
c2 = c2.replace(
    "new Date(t.updated_at).toLocaleDateString",
    "new Date(t.updated_at || t.created_at).toLocaleDateString"
)
with open(path2, 'w') as f: f.write(c2)
print('✓ qms-templates page fixed')

# Fix 3: doclist API - return created_at as updated_at for files
path3 = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/eqms/doclist/route.ts'
with open(path3) as f: c3 = f.read()
c3 = c3.replace(
    'ef.created_at, ef.folder_id,',
    'ef.created_at, ef.created_at AS updated_at, ef.folder_id,'
)
with open(path3, 'w') as f: f.write(c3)
print('✓ doclist API fixed')
