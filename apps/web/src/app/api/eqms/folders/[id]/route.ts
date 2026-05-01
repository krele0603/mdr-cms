import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant'].includes(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const rows = await query(
    `UPDATE eqms_folders SET name=$1 WHERE id=$2::uuid RETURNING id, name`,
    [name.trim(), params.id]
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant'].includes(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await query(
    `SELECT parent_id FROM eqms_folders WHERE id=$1::uuid`, [params.id]
  )
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (rows[0].parent_id === null)
    return NextResponse.json({ error: 'Cannot delete root folder' }, { status: 400 })

  await query(`DELETE FROM eqms_folders WHERE id=$1::uuid`, [params.id])
  return NextResponse.json({ ok: true })
}
