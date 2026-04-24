import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await queryOne(`
    SELECT p.id, p.name, p.device_name, p.description,
      p.manufacturer_name, p.manufacturer_country,
      p.manufacturer_contact, p.manufacturer_email,
      p.status, p.created_at,
      dl.name as list_name,
      u.name as created_by_name
    FROM projects p
    LEFT JOIN document_lists dl ON p.list_id = dl.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = $1::uuid
  `, [params.id])

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const docs = await query(`
    SELECT id, annex, name, code, status, updated_at
    FROM project_documents
    WHERE project_id = $1::uuid
    ORDER BY annex, name
  `, [params.id])

  return NextResponse.json({ project, docs })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const allowed = ['name', 'device_name', 'description', 'manufacturer_name',
    'manufacturer_country', 'manufacturer_contact', 'manufacturer_email', 'status']

  for (const [key, val] of Object.entries(body)) {
    if (allowed.includes(key)) {
      await query(
        `UPDATE projects SET ${key} = $1, updated_at = NOW() WHERE id = $2::uuid`,
        [val, params.id]
      )
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const project = await queryOne(
    `SELECT id, name FROM projects WHERE id = $1::uuid`,
    [params.id]
  )
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Cascade deletes project_documents, project_members, project_variables via FK ON DELETE CASCADE
  await query(`DELETE FROM projects WHERE id = $1::uuid`, [params.id])

  return NextResponse.json({ ok: true })
}
