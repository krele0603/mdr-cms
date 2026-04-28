// ============================================================
// /api/projects/[id]/fmea/[fmeaId]/sheets/route.ts
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string; fmeaId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.name?.trim() || !body.prefix?.trim()) {
    return NextResponse.json({ error: 'name and prefix are required' }, { status: 400 })
  }
  const sheet = await queryOne(
    `INSERT INTO fmea_sheets (fmea_id, name, prefix, position)
     VALUES ($1::uuid, $2, $3, (SELECT COALESCE(MAX(position),0)+1 FROM fmea_sheets WHERE fmea_id = $1::uuid))
     RETURNING *`,
    [params.fmeaId, body.name.trim(), body.prefix.trim().toUpperCase()]
  )
  return NextResponse.json({ ...sheet, rows: [] }, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; fmeaId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  // body = { sheetId, name?, prefix? }
  if (body.name) {
    await query(`UPDATE fmea_sheets SET name = $1 WHERE id = $2::uuid AND fmea_id = $3::uuid`, [body.name, body.sheetId, params.fmeaId])
  }
  if (body.prefix) {
    await query(`UPDATE fmea_sheets SET prefix = $1 WHERE id = $2::uuid AND fmea_id = $3::uuid`, [body.prefix.toUpperCase(), body.sheetId, params.fmeaId])
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; fmeaId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const sheetId = searchParams.get('sheetId')
  await query(`DELETE FROM fmea_sheets WHERE id = $1::uuid AND fmea_id = $2::uuid`, [sheetId, params.fmeaId])
  return NextResponse.json({ ok: true })
}
