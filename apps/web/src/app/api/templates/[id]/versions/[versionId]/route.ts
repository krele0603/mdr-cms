import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { queryOne } from '@/lib/db'

type Params = { params: { id: string; versionId: string } }

// GET /api/templates/[id]/versions/[versionId] — load content of a specific version
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const version = await queryOne(
    `SELECT tv.id, tv.version, tv.is_current, tv.content, tv.example_content, tv.change_note, tv.created_at, u.name AS created_by_name
     FROM template_versions tv
     LEFT JOIN users u ON u.id = tv.created_by
     WHERE tv.id = $1::uuid AND tv.template_id = $2::uuid`,
    [params.versionId, params.id]
  )

  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(version)
}

// PATCH /api/templates/[id]/versions/[versionId] — update content of existing version
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req)
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { content, example_content, change_note } = body

  const version = await queryOne(
    `UPDATE template_versions
     SET
       content         = COALESCE($1, content),
       example_content = COALESCE($2, example_content),
       change_note     = COALESCE($3, change_note)
     WHERE id = $4::uuid AND template_id = $5::uuid
     RETURNING id, version, is_current, change_note, created_at`,
    [
      content !== undefined ? JSON.stringify(content) : null,
      example_content !== undefined ? JSON.stringify(example_content) : null,
      change_note ?? null,
      params.versionId,
      params.id,
    ]
  )

  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(version)
}
