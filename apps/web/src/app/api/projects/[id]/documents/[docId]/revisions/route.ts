import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

// Returns all revisions of this document (same name+code+annex in this project)
// ordered by revision number ascending — includes superseded, obsolete, draft, approved
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the source doc to find its lineage key
  const siblings = await query(
    `SELECT id, name, code, annex, status, revision, updated_at
     FROM project_documents
     WHERE project_id = $1::uuid
       AND (name, code, annex) = (
         SELECT name, code, annex FROM project_documents
         WHERE id = $2::uuid
       )
     ORDER BY revision ASC`,
    [params.id, params.docId]
  )

  return NextResponse.json(siblings)
}
