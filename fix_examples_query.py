#!/usr/bin/env python3
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/projects/[id]/documents/[docId]/examples/route.ts'

with open(FILE, 'r') as f:
    content = f.read()

old = """  // Get all available examples for the template this document uses
  const available = await query(`
    SELECT te.id, te.name, te.description
    FROM template_examples te
    JOIN templates t ON t.id = te.template_id
    JOIN template_versions tv ON tv.template_id = t.id AND tv.is_current = true
    JOIN project_documents pd ON pd.template_version_id = tv.id
    WHERE pd.id = $1::uuid
    ORDER BY te.sort_order ASC
  `, [params.docId])"""

new = """  // Get all available examples for the template this document uses
  const available = await query(`
    SELECT DISTINCT te.id, te.name, te.description
    FROM template_examples te
    JOIN template_versions tv ON tv.template_id = te.template_id
    JOIN project_documents pd ON pd.template_version_id = tv.id
    WHERE pd.id = $1::uuid
    ORDER BY te.name ASC
  `, [params.docId])"""

if old in content:
    content = content.replace(old, new)
    print('Fixed query')
else:
    print('Pattern not found - printing current query section:')
    start = content.find('Get all available')
    print(content[start:start+400])

with open(FILE, 'w') as f:
    f.write(content)
print('done')
