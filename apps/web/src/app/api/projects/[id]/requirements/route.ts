// /api/projects/[id]/requirements/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

const SYSTEM_GROUPS = ['Functional', 'Performance', 'Regulatory', 'Usability', 'Safety', 'Security', 'Other']
const SOFTWARE_GROUPS = ['Functional', 'Performance', 'Safety', 'Usability', 'Security/Cybersecurity', 'Other']

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lists = await query(
    `SELECT * FROM req_lists WHERE project_id = $1::uuid ORDER BY type DESC, position`,
    [params.id]
  )

  const listsWithData = await Promise.all(lists.map(async (list: any) => {
    const groups = await query(
      `SELECT * FROM req_groups WHERE list_id = $1::uuid ORDER BY position`,
      [list.id]
    )
    const groupsWithReqs = await Promise.all(groups.map(async (group: any) => {
      const reqs = await query(
        `SELECT r.*, pr.req_id AS parent_req_code
         FROM requirements r
         LEFT JOIN requirements pr ON pr.id = r.parent_req_id
         WHERE r.group_id = $1::uuid ORDER BY r.position`,
        [group.id]
      )
      return { ...group, reqs }
    }))
    return { ...list, groups: groupsWithReqs }
  }))

  return NextResponse.json({ lists: listsWithData })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { type, name } = body

  if (!type || !['system', 'software'].includes(type)) {
    return NextResponse.json({ error: 'type must be system or software' }, { status: 400 })
  }

  // Only one system list per project
  if (type === 'system') {
    const existing = await queryOne(
      `SELECT id FROM req_lists WHERE project_id = $1::uuid AND type = 'system'`,
      [params.id]
    )
    if (existing) return NextResponse.json({ error: 'System requirements list already exists' }, { status: 409 })
  }

  const list = await queryOne(
    `INSERT INTO req_lists (project_id, type, name, position)
     VALUES ($1::uuid, $2, $3, (SELECT COALESCE(MAX(position),0)+1 FROM req_lists WHERE project_id = $1::uuid))
     RETURNING *`,
    [params.id, type, name || null]
  )

  // Seed default groups
  const defaultGroups = type === 'system' ? SYSTEM_GROUPS : SOFTWARE_GROUPS
  for (let i = 0; i < defaultGroups.length; i++) {
    await query(
      `INSERT INTO req_groups (list_id, name, prefix, position) VALUES ($1::uuid, $2, $3, $4)`,
      [list.id, defaultGroups[i], '', i]
    )
  }

  const groups = await query(`SELECT * FROM req_groups WHERE list_id = $1::uuid ORDER BY position`, [list.id])
  return NextResponse.json({ ...list, groups: groups.map((g: any) => ({ ...g, reqs: [] })) }, { status: 201 })
}
