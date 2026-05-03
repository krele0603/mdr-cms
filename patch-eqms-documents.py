import sys

path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/eqms/documents/route.ts'
with open(path, 'r', encoding='utf-8') as f:
    txt = f.read()

old = """  const { folder_id, level, title, code, company_id } = await req.json()
  if (!folder_id || !level || !title?.trim())
    return NextResponse.json({ error: 'folder_id, level and title are required' }, { status: 400 })

  const doc = await queryOne(
    `INSERT INTO eqms_documents (level, folder_id, code, title, status, company_id, created_by)
     VALUES ($1::int, $2::uuid, $3, $4, 'draft', $5::uuid, $6::uuid)
     RETURNING id, level, folder_id, code, title, status`,
    [level, folder_id, code?.trim() || null, title.trim(), company_id || null, session.id]
  )

  const version = await queryOne(
    `INSERT INTO eqms_document_versions
       (document_id, version_major, version_minor, content, status, created_by)
     VALUES ($1::uuid, 1, 0, '{"type":"doc","content":[{"type":"paragraph"}]}', 'draft', $2::uuid)
     RETURNING id`,
    [doc.id, session.id]
  )"""

new = """  const { folder_id, level, title, code, company_id, template_content } = await req.json()
  if (!folder_id || !level || !title?.trim())
    return NextResponse.json({ error: 'folder_id, level and title are required' }, { status: 400 })

  const doc = await queryOne(
    `INSERT INTO eqms_documents (level, folder_id, code, title, status, company_id, created_by)
     VALUES ($1::int, $2::uuid, $3, $4, 'draft', $5::uuid, $6::uuid)
     RETURNING id, level, folder_id, code, title, status`,
    [level, folder_id, code?.trim() || null, title.trim(), company_id || null, session.id]
  )

  const initialContent = template_content
    ? JSON.stringify(template_content)
    : '{"type":"doc","content":[{"type":"paragraph"}]}'

  const version = await queryOne(
    `INSERT INTO eqms_document_versions
       (document_id, version_major, version_minor, content, status, created_by)
     VALUES ($1::uuid, 1, 0, $3, 'draft', $2::uuid)
     RETURNING id`,
    [doc.id, session.id, initialContent]
  )"""

if old in txt:
    txt = txt.replace(old, new)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(txt)
    print('Patched OK')
else:
    print('Pattern not found')
    idx = txt.find('template_content')
    if idx >= 0:
        print('Already patched')
    else:
        print('Need manual check')
