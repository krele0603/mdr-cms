// ============================================================
// /api/projects/[id]/fmea/[fmeaId]/criteria/route.ts
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; fmeaId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const allowed = ['r1_min', 'r1_max', 'r2_min', 'r2_max', 'r3_min', 'r3_max']
  for (const [key, val] of Object.entries(body)) {
    if (allowed.includes(key)) {
      await query(
        `UPDATE fmea_criteria SET ${key} = $1 WHERE fmea_id = $2::uuid`,
        [val, params.fmeaId]
      )
    }
  }
  return NextResponse.json({ ok: true })
}
