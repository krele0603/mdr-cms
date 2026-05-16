import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const entity_type = searchParams.get('entity_type') || ''
  const action      = searchParams.get('action') || ''
  const user_id     = searchParams.get('user_id') || ''
  const limit       = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset      = parseInt(searchParams.get('offset') || '0')

  const conditions: string[] = []
  const params: any[] = []
  let i = 1

  if (entity_type) { conditions.push(`al.entity_type = $${i++}`); params.push(entity_type) }
  if (action)      { conditions.push(`al.action = $${i++}`);      params.push(action) }
  if (user_id)     { conditions.push(`al.user_id = $${i++}::uuid`); params.push(user_id) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const logs = await query(`
    SELECT
      al.id, al.entity_type, al.entity_id, al.action, al.metadata, al.created_at,
      u.name AS user_name, u.email AS user_email, u.role AS user_role
    FROM audit_log al
    LEFT JOIN users u ON u.id = al.user_id
    ${where}
    ORDER BY al.created_at DESC
    LIMIT $${i++} OFFSET $${i++}
  `, [...params, limit, offset])

  const total = await query(`
    SELECT COUNT(*)::int AS count FROM audit_log al ${where}
  `, params)

  // Distinct filter options
  const entityTypes = await query(`SELECT DISTINCT entity_type FROM audit_log ORDER BY entity_type`)
  const actions     = await query(`SELECT DISTINCT action FROM audit_log ORDER BY action`)
  const users       = await query(`
    SELECT DISTINCT u.id, u.name FROM audit_log al
    JOIN users u ON u.id = al.user_id ORDER BY u.name
  `)

  return NextResponse.json({
    logs,
    total: total[0]?.count ?? 0,
    filters: { entityTypes: entityTypes.map(r => r.entity_type), actions: actions.map(r => r.action), users },
  })
}
