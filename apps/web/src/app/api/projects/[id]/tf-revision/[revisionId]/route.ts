import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; revisionId: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const revision = await queryOne(
    `SELECT r.id, r.version, r.version_x, r.version_y, r.version_z,
            r.approved_at, r.notes,
            u.name AS approved_by_name
     FROM tf_revisions r
     LEFT JOIN users u ON u.id = r.approved_by
     WHERE r.id = $1::uuid AND r.project_id = $2::uuid`,
    [params.revisionId, params.id]
  )
  if (!revision) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const documents = await query(
    `SELECT document_name, document_code, annex, document_revision, created_at
     FROM tf_revision_documents
     WHERE revision_id = $1::uuid
     ORDER BY annex, document_code`,
    [params.revisionId]
  )

  return NextResponse.json({ ...revision, documents })
}
