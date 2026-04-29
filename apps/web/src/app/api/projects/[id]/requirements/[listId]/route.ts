// /api/projects/[id]/requirements/[listId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; listId: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  if (body.name !== undefined) {
    await query(`UPDATE req_lists SET name = $1, updated_at = NOW() WHERE id = $2::uuid AND project_id = $3::uuid`, [body.name, params.listId, params.id])
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await query(`DELETE FROM req_lists WHERE id = $1::uuid AND project_id = $2::uuid`, [params.listId, params.id])
  return NextResponse.json({ ok: true })
}
