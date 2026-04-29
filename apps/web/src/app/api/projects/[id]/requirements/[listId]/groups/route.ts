// /api/projects/[id]/requirements/[listId]/groups/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; listId: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const group = await queryOne(
    `INSERT INTO req_groups (list_id, name, prefix, position)
     VALUES ($1::uuid, $2, $3, (SELECT COALESCE(MAX(position),0)+1 FROM req_groups WHERE list_id = $1::uuid))
     RETURNING *`,
    [params.listId, body.name.trim(), body.prefix || '']
  )
  return NextResponse.json({ ...group, reqs: [] }, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  // body = { groupId, name?, prefix? }
  if (body.name !== undefined) {
    await query(`UPDATE req_groups SET name = $1 WHERE id = $2::uuid AND list_id = $3::uuid`, [body.name, body.groupId, params.listId])
  }
  if (body.prefix !== undefined) {
    await query(`UPDATE req_groups SET prefix = $1 WHERE id = $2::uuid AND list_id = $3::uuid`, [body.prefix, body.groupId, params.listId])
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  await query(`DELETE FROM req_groups WHERE id = $1::uuid AND list_id = $2::uuid`, [searchParams.get('groupId'), params.listId])
  return NextResponse.json({ ok: true })
}
