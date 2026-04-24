import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { queryOne } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user is a member of this project (or admin/consultant)
  if (session.role === 'client') {
    const member = await queryOne(
      `SELECT id FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid`,
      [params.id, session.id]
    )
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const doc = await queryOne(
    `SELECT
       pd.id,
       pd.project_id,
       pd.annex,
       pd.name,
       pd.code,
       pd.content,
       pd.status,
       pd.updated_at,
       tv.id            AS template_version_id,
       tv.version       AS template_version,
       tv.example_content,
       t.id             AS template_id,
       t.name           AS template_name,
       t.tag_code,
       p.name           AS project_name,
       p.device_name
     FROM project_documents pd
     LEFT JOIN template_versions tv ON tv.id = pd.template_version_id
     LEFT JOIN templates t ON t.id = tv.template_id
     LEFT JOIN projects p ON p.id = pd.project_id
     WHERE pd.id = $1::uuid AND pd.project_id = $2::uuid`,
    [params.docId, params.id]
  )

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(doc)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Clients can only edit if they are project members
  if (session.role === 'client') {
    const member = await queryOne(
      `SELECT id FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid`,
      [params.id, session.id]
    )
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { content, status } = body

  const doc = await queryOne(
    `UPDATE project_documents
     SET
       content    = COALESCE($1, content),
       status     = COALESCE($2, status),
       updated_at = NOW()
     WHERE id = $3::uuid AND project_id = $4::uuid
     RETURNING id, content, status, updated_at`,
    [
      content !== undefined ? JSON.stringify(content) : null,
      status || null,
      params.docId,
      params.id,
    ]
  )

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(doc)
}
