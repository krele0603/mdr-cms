import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const docId = params.docId

  const history = await query(`
    SELECT dh.id, dh.action, dh.note, dh.created_at,
           u.name AS user_name, u.role AS user_role
    FROM document_history dh
    LEFT JOIN users u ON u.id = dh.user_id
    WHERE dh.document_id = $1::uuid
    ORDER BY dh.created_at ASC
  `, [docId])

  return NextResponse.json(history)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const docId = params.docId
  const userId = session.id

  const body = await req.json()
  const { action, note } = body

  if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 })

  await query(
    `INSERT INTO document_history (document_id, user_id, action, note) VALUES ($1::uuid, $2::uuid, $3, $4)`,
    [docId, userId, action, note || null]
  )

  return NextResponse.json({ ok: true })
}
