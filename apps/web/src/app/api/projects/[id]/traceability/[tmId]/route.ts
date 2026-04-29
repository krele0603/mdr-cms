// /api/projects/[id]/traceability/[tmId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type P = { params: { id: string; tmId: string } }

export async function PATCH(req: NextRequest, { params }: P) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const allowed = ['title', 'record_id', 'revision', 'doc_date', 'prepared_by', 'approved_by']
  for (const [key, val] of Object.entries(body)) {
    if (allowed.includes(key)) {
      await query(`UPDATE traceability_documents SET ${key} = $1, updated_at = NOW() WHERE id = $2::uuid AND project_id = $3::uuid`, [val, params.tmId, params.id])
    }
  }
  return NextResponse.json({ ok: true })
}
