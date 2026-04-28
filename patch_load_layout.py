#!/usr/bin/env python3
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE) as f:
    c = f.read()

fixes = 0

if 'async function loadLayout' not in c:
    old = '  function insertToc() {'
    new = '''  async function loadLayout() {
    const res = await fetch('/api/projects/' + projectId + '/layout')
    if (res.ok) {
      const data = await res.json()
      if (data.header_layout) setHeaderLayout(data.header_layout)
      if (data.footer_layout) setFooterLayout(data.footer_layout)
      if (data.logo) setProjectLogo(data.logo)
    }
  }

  function insertToc() {'''
    if old in c:
        c = c.replace(old, new)
        fixes += 1
        print('Added loadLayout function')
    else:
        print('WARNING: insertToc not found')
else:
    print('loadLayout already exists')

with open(FILE, 'w') as f:
    f.write(c)
print(f'Done. {fixes} fixes applied.')
