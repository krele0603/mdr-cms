import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const row = await queryOne(`SELECT * FROM sted_template LIMIT 1`)
  if (!row) return NextResponse.json({ error: 'STED template not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { content } = await req.json()
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const row = await queryOne(
    `UPDATE sted_template
     SET content = $1, updated_by = $2::uuid, updated_at = NOW()
     RETURNING *`,
    [JSON.stringify(content), session.id]
  )

  return NextResponse.json(row)
}
