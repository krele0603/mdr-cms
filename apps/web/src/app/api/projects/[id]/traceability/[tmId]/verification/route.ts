// /api/projects/[id]/traceability/[tmId]/verification/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type P = { params: { id: string; tmId: string } }

export async function PATCH(req: NextRequest, { params }: P) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  // body = { id, field, value } or { id, extra_key, extra_value }
  if (body.extra_key !== undefined) {
    await query(
      `UPDATE verification_entries SET extra_values = jsonb_set(COALESCE(extra_values,'{}'), $1, $2) WHERE id = $3::uuid AND tm_id = $4::uuid`,
      [`{${body.extra_key}}`, JSON.stringify(body.extra_value || ''), body.id, params.tmId]
    )
  } else {
    const allowed = ['test_case', 'acceptance_criteria', 'evidence_link']
    if (!allowed.includes(body.field)) return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    await query(`UPDATE verification_entries SET ${body.field} = $1 WHERE id = $2::uuid AND tm_id = $3::uuid`, [body.value, body.id, params.tmId])
  }
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest, { params }: P) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  // Add extra column
  if (body.action === 'add_col') {
    const col = await queryOne(
      `INSERT INTO verification_extra_cols (tm_id, list_id, name, position)
       VALUES ($1::uuid, $2::uuid, $3, (SELECT COALESCE(MAX(position),0)+1 FROM verification_extra_cols WHERE tm_id=$1::uuid AND list_id=$2::uuid))
       RETURNING *`,
      [params.tmId, body.list_id, body.name]
    )
    return NextResponse.json(col, { status: 201 })
  }
  // Add verification entry manually
  if (body.action === 'add_entry') {
    const entry = await queryOne(
      `INSERT INTO verification_entries (tm_id, list_id, req_id, position)
       VALUES ($1::uuid, $2::uuid, $3, (SELECT COALESCE(MAX(position),0)+1 FROM verification_entries WHERE tm_id=$1::uuid AND list_id=$2::uuid))
       ON CONFLICT (tm_id, list_id, req_id) DO UPDATE SET req_id = EXCLUDED.req_id
       RETURNING *`,
      [params.tmId, body.list_id, body.req_id]
    )
    return NextResponse.json(entry, { status: 201 })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req: NextRequest, { params }: P) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  if (searchParams.get('colId')) {
    await query(`DELETE FROM verification_extra_cols WHERE id = $1::uuid AND tm_id = $2::uuid`, [searchParams.get('colId'), params.tmId])
  }
  return NextResponse.json({ ok: true })
}
