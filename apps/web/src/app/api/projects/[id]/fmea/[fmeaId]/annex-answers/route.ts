// ============================================================
// /api/projects/[id]/fmea/[fmeaId]/annex-answers/route.ts
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; fmeaId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  // body = { question_id, field, value }
  const allowed = ['answer', 'input_to_ra', 'risk_ids']
  if (!allowed.includes(body.field)) return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  await query(
    `INSERT INTO fmea_annex_a_answers (fmea_id, question_id, ${body.field})
     VALUES ($1::uuid, $2::uuid, $3)
     ON CONFLICT (fmea_id, question_id)
     DO UPDATE SET ${body.field} = $3`,
    [params.fmeaId, body.question_id, body.value]
  )
  return NextResponse.json({ ok: true })
}
