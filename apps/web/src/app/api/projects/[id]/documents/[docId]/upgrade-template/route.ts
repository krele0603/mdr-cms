import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

// GET - list available versions for the template linked to this document
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const docId = params.docId

  const versions = await query(`
    SELECT tv.id, tv.version, tv.is_current, tv.change_note, tv.created_at,
           u.name AS created_by_name,
           pd.template_version_id AS current_doc_version_id
    FROM template_versions tv
    JOIN templates t ON t.id = tv.template_id
    JOIN template_versions current_tv ON current_tv.template_id = t.id
    JOIN project_documents pd ON pd.template_version_id = current_tv.id AND pd.id = $1::uuid
    LEFT JOIN users u ON u.id = tv.created_by
    ORDER BY tv.created_at DESC
  `, [docId])

  return NextResponse.json(versions)
}

// POST - upgrade document to a specific template version
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const docId = params.docId
  const body = await req.json()
  const { template_version_id, apply_content } = body

  if (!template_version_id) {
    return NextResponse.json({ error: 'template_version_id is required' }, { status: 400 })
  }

  const tv = await queryOne(
    `SELECT id, content FROM template_versions WHERE id = $1::uuid`,
    [template_version_id]
  )
  if (!tv) return NextResponse.json({ error: 'Template version not found' }, { status: 404 })

  // Update template_version_id, optionally replace content with new template content
  if (apply_content) {
    await query(`
      UPDATE project_documents
      SET template_version_id = $1::uuid, content = $2, updated_at = NOW()
      WHERE id = $3::uuid AND project_id = $4::uuid
    `, [template_version_id, JSON.stringify(tv.content ?? {}), docId, params.id])
  } else {
    await query(`
      UPDATE project_documents
      SET template_version_id = $1::uuid, updated_at = NOW()
      WHERE id = $2::uuid AND project_id = $3::uuid
    `, [template_version_id, docId, params.id])
  }

  await query(`
    INSERT INTO document_history (document_id, user_id, action, note)
    VALUES ($1::uuid, $2::uuid, 'revised', $3)
  `, [docId, session.id, `Template upgraded to version ${tv.id}`])

  return NextResponse.json({ ok: true })
}
