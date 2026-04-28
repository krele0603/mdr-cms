// ============================================================
// /api/projects/[id]/fmea/[fmeaId]/rm-team/route.ts
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string; fmeaId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const row = await queryOne(
    `INSERT INTO fmea_rm_team (fmea_id, no, name, role, organisation, knowledge, position)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, (SELECT COALESCE(MAX(position),0)+1 FROM fmea_rm_team WHERE fmea_id = $1::uuid))
     RETURNING *`,
    [params.fmeaId, body.no || null, body.name || '', body.role || '', body.organisation || '', body.knowledge || '']
  )
  return NextResponse.json(row, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; fmeaId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const allowed = ['no', 'name', 'role', 'organisation', 'knowledge']
  if (!allowed.includes(body.field)) return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  await query(
    `UPDATE fmea_rm_team SET ${body.field} = $1 WHERE id = $2::uuid AND fmea_id = $3::uuid`,
    [body.value, body.id, params.fmeaId]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; fmeaId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  await query(`DELETE FROM fmea_rm_team WHERE id = $1::uuid AND fmea_id = $2::uuid`, [searchParams.get('rowId'), params.fmeaId])
  return NextResponse.json({ ok: true })
}
