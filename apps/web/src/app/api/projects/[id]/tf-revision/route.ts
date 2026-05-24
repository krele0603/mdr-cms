import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { queryOne } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const revision = await queryOne(
    `SELECT id, version, version_x, version_y, version_z, approved_at, notes
     FROM tf_revisions WHERE project_id = $1::uuid
     ORDER BY approved_at DESC LIMIT 1`,
    [params.id]
  )

  if (!revision) return NextResponse.json(null)
  return NextResponse.json(revision)
}
