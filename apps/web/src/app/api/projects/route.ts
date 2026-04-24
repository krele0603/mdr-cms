import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let projects

  if (session.role === 'admin') {
    projects = await query(`
      SELECT
        p.id, p.name, p.device_name, p.description,
        p.manufacturer_name, p.manufacturer_country,
        p.status, p.created_at,
        dl.name as list_name, dl.is_builtin, dl.builtin_key,
        u.name as created_by_name,
        COUNT(DISTINCT pm.user_id) as member_count,
        COUNT(DISTINCT pd.id) as total_docs,
        COUNT(DISTINCT pd.id) FILTER (WHERE pd.status = 'approved') as approved_docs
      FROM projects p
      LEFT JOIN document_lists dl ON p.list_id = dl.id
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN project_documents pd ON p.id = pd.project_id
      GROUP BY p.id, dl.name, dl.is_builtin, dl.builtin_key, u.name
      ORDER BY p.created_at DESC
    `)
  } else if (session.role === 'consultant') {
    projects = await query(`
      SELECT
        p.id, p.name, p.device_name, p.description,
        p.manufacturer_name, p.manufacturer_country,
        p.status, p.created_at,
        dl.name as list_name, dl.is_builtin, dl.builtin_key,
        u.name as created_by_name,
        COUNT(DISTINCT pm.user_id) as member_count,
        COUNT(DISTINCT pd.id) as total_docs,
        COUNT(DISTINCT pd.id) FILTER (WHERE pd.status = 'approved') as approved_docs
      FROM projects p
      LEFT JOIN document_lists dl ON p.list_id = dl.id
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN project_documents pd ON p.id = pd.project_id
      WHERE pm.user_id = $1 OR p.created_by = $1
      GROUP BY p.id, dl.name, dl.is_builtin, dl.builtin_key, u.name
      ORDER BY p.created_at DESC
    `, [session.id])
  } else {
    projects = await query(`
      SELECT
        p.id, p.name, p.device_name, p.description,
        p.manufacturer_name, p.manufacturer_country,
        p.status, p.created_at,
        dl.name as list_name, dl.is_builtin, dl.builtin_key,
        u.name as created_by_name,
        COUNT(DISTINCT pd.id) as total_docs,
        COUNT(DISTINCT pd.id) FILTER (WHERE pd.status = 'approved') as approved_docs
      FROM projects p
      LEFT JOIN document_lists dl ON p.list_id = dl.id
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN project_documents pd ON p.id = pd.project_id
      WHERE pm.user_id = $1
      GROUP BY p.id, dl.name, dl.is_builtin, dl.builtin_key, u.name
      ORDER BY p.created_at DESC
    `, [session.id])
  }

  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    name, device_name, description,
    manufacturer_name, manufacturer_country,
    manufacturer_contact, manufacturer_email,
    list_id,
  } = body

  if (!name || !device_name || !manufacturer_name || !list_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const list = await queryOne('SELECT id FROM document_lists WHERE id = $1', [list_id])
  if (!list) return NextResponse.json({ error: 'Invalid list' }, { status: 400 })

  const [project] = await query<{ id: string }>(`
    INSERT INTO projects (
      name, device_name, description,
      manufacturer_name, manufacturer_country,
      manufacturer_contact, manufacturer_email,
      list_id, created_by, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft')
    RETURNING id
  `, [
    name, device_name, description || null,
    manufacturer_name, manufacturer_country || null,
    manufacturer_contact || null, manufacturer_email || null,
    list_id, session.id,
  ])

  await query(
    'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
    [project.id, session.id, session.role]
  )

  const listDocs = await query<{
    id: string, annex: string, name: string, code: string, template_id: string
  }>(`
    SELECT id, annex, name, code, template_id
    FROM list_documents
    WHERE list_id = $1
    ORDER BY annex, position
  `, [list_id])

  if (listDocs.length > 0) {
    const values = listDocs.map((d, i) => {
      const base = i * 5
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5})`
    }).join(',')

    const params = listDocs.flatMap(d => [
      project.id, d.annex, d.name, d.code, 'draft'
    ])

    await query(`
      INSERT INTO project_documents (project_id, annex, name, code, status)
      VALUES ${values}
    `, params)
  }

  return NextResponse.json({ ok: true, id: project.id }, { status: 201 })
}
