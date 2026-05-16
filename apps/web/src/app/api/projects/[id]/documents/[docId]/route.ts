import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { queryOne, auditLog } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.role === 'client' || session.role === 'client-MR') {
    const member = await queryOne(
      `SELECT id FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid`,
      [params.id, session.id]
    )
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const doc = await queryOne(
    `SELECT
       pd.id, pd.project_id, pd.annex, pd.name, pd.code, pd.content, pd.status, pd.updated_at,
       tv.id AS template_version_id, tv.version AS template_version, tv.example_content,
       t.id AS template_id, t.name AS template_name, t.tag_code,
       p.name AS project_name, p.device_name
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

  if (session.role === 'client' || session.role === 'client-MR') {
    const member = await queryOne(
      `SELECT id FROM project_members WHERE project_id = $1::uuid AND user_id = $2::uuid`,
      [params.id, session.id]
    )
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  const setClauses: string[] = ['updated_at = NOW()']
  const vals: any[] = []
  let i = 1

  if (body.content !== undefined)         { setClauses.push(`content = $${i++}`);         vals.push(JSON.stringify(body.content)) }
  if (body.status !== undefined)          { setClauses.push(`status = $${i++}`);           vals.push(body.status) }
  if (body.revision !== undefined)        { setClauses.push(`revision = $${i++}`);         vals.push(body.revision || null) }
  if (body.color_flag !== undefined)      { setClauses.push(`color_flag = $${i++}`);       vals.push(body.color_flag || null) }
  if (body.tracker_comment !== undefined) { setClauses.push(`tracker_comment = $${i++}`); vals.push(body.tracker_comment || null) }
  if (body.assigned_to !== undefined)     { setClauses.push(`assigned_to = $${i++}`);     vals.push(body.assigned_to || null) }

  vals.push(params.docId)
  vals.push(params.id)

  const doc = await queryOne(
    `UPDATE project_documents SET ${setClauses.join(', ')}
     WHERE id = $${i++}::uuid AND project_id = $${i++}::uuid
     RETURNING id, content, status, revision, color_flag, tracker_comment, assigned_to, updated_at`,
    vals
  )
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.status !== undefined) {
    await auditLog(session.id, 'document', params.docId, 'status_changed', {
      status: body.status,
      project_id: params.id,
    })
  } else if (body.content !== undefined) {
    await auditLog(session.id, 'document', params.docId, 'content_saved', {
      project_id: params.id,
    })
  }
  return NextResponse.json(doc)
}
