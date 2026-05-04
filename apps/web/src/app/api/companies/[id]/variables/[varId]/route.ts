import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; varId: string } }) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { value, name } = await req.json()

  await query(
    `UPDATE company_variables
     SET value = COALESCE($1, value),
         name  = COALESCE($2, name),
         updated_at = now()
     WHERE id = $3::uuid AND company_id = $4::uuid`,
    [value !== undefined ? value : null, name || null, params.varId, params.id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; varId: string } }) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Cannot delete global vars
  const row = await queryOne(
    `SELECT is_global FROM company_variables WHERE id = $1::uuid AND company_id = $2::uuid`,
    [params.varId, params.id]
  )
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (row.is_global) return NextResponse.json({ error: 'Cannot delete global variables' }, { status: 400 })

  await query(`DELETE FROM company_variables WHERE id = $1::uuid`, [params.varId])
  return NextResponse.json({ ok: true })
}
