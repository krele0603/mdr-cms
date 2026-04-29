// ============================================================
// /api/projects/[id]/fmea/[fmeaId]/rows/route.ts
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string; fmeaId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.sheet_id) return NextResponse.json({ error: 'sheet_id required' }, { status: 400 })

  const row = await queryOne(
    `INSERT INTO fmea_rows (sheet_id, hazard, sequence_of_events, hazardous_situation, harm,
      probability, severity, mitigation, residual_probability, residual_severity,
      verification_document, residual_hazard, benefit_analysis, new_hazards, position)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
       (SELECT COALESCE(MAX(position),0)+1 FROM fmea_rows WHERE sheet_id = $1::uuid))
     RETURNING *`,
    [
      body.sheet_id,
      body.hazard || '', body.sequence_of_events || '', body.hazardous_situation || '',
      body.harm || '', body.probability || null, body.severity || null,
      body.mitigation || '', body.residual_probability || null, body.residual_severity || null,
      body.verification_document || '', body.residual_hazard || '',
      body.benefit_analysis || '', body.new_hazards || '',
    ]
  )
  return NextResponse.json(row, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; fmeaId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  // body = { id, field, value }
  const allowed = [
    'hazard', 'sequence_of_events', 'hazardous_situation', 'harm',
    'probability', 'severity', 'mitigation', 'mitigation_req_ids',
    'residual_probability', 'residual_severity',
    'verification_document', 'residual_hazard', 'benefit_analysis', 'new_hazards',
  ]
  if (!allowed.includes(body.field)) return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  // Handle array fields
  if (body.field === 'mitigation_req_ids') {
    await query(
      `UPDATE fmea_rows SET mitigation_req_ids = $1::text[] WHERE id = $2::uuid`,
      [body.value, body.id]
    )
  } else {
    await query(
      `UPDATE fmea_rows SET ${body.field} = $1 WHERE id = $2::uuid`,
      [body.value, body.id]
    )
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; fmeaId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  await query(`DELETE FROM fmea_rows WHERE id = $1::uuid`, [searchParams.get('rowId')])
  return NextResponse.json({ ok: true })
}
