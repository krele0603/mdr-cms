// /api/projects/[id]/requirements/[listId]/reqs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; listId: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.group_id) return NextResponse.json({ error: 'group_id required' }, { status: 400 })

  // Auto-generate req_id from last existing req in group
  let reqId = body.req_id || ''
  if (!reqId) {
    const lastReq = await queryOne(
      `SELECT req_id FROM requirements WHERE group_id = $1::uuid ORDER BY position DESC LIMIT 1`,
      [body.group_id]
    )
    const count = await queryOne(
      `SELECT COUNT(*)::int AS cnt FROM requirements WHERE group_id = $1::uuid`,
      [body.group_id]
    )
    const next = (count?.cnt || 0) + 1
    if (lastReq?.req_id) {
      // Extract prefix: everything before the trailing digits (e.g. "SYS-FUN-" from "SYS-FUN-01")
      const match = lastReq.req_id.match(/^(.*[^\d])(\d+)$/)
      if (match) {
        reqId = `${match[1]}${String(next).padStart(match[2].length, '0')}`
      } else {
        reqId = String(next).padStart(2, '0')
      }
    } else {
      const group = await queryOne(`SELECT prefix FROM req_groups WHERE id = $1::uuid`, [body.group_id])
      const prefix = group?.prefix || ''
      reqId = prefix ? `${prefix}-${String(next).padStart(2, '0')}` : String(next).padStart(2, '0')
    }
  }

  const req_row = await queryOne(
    `INSERT INTO requirements (group_id, list_id, req_id, text, parent_req_id, position)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, (SELECT COALESCE(MAX(position),0)+1 FROM requirements WHERE group_id = $1::uuid))
     RETURNING *, NULL AS parent_req_code`,
    [body.group_id, params.listId, reqId, body.text || '', body.parent_req_id || null]
  )
  return NextResponse.json(req_row, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // body = { id, field, value }
  const allowed = ['req_id', 'text', 'parent_req_id']
  if (!allowed.includes(body.field)) return NextResponse.json({ error: 'Invalid field' }, { status: 400 })

  await query(
    `UPDATE requirements SET ${body.field} = $1, updated_at = NOW() WHERE id = $2::uuid AND list_id = $3::uuid`,
    [body.value || null, body.id, params.listId]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  await query(`DELETE FROM requirements WHERE id = $1::uuid AND list_id = $2::uuid`, [searchParams.get('reqId'), params.listId])
  return NextResponse.json({ ok: true })
}
