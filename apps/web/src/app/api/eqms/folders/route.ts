import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const level = req.nextUrl.searchParams.get('level')
  const company_id = req.nextUrl.searchParams.get('company_id')
  if (!level) return NextResponse.json({ error: 'level required' }, { status: 400 })

  // Return global root folders + company-specific subfolders
  let rows
  if (company_id) {
    rows = await query(
      `SELECT id, level, parent_id, name, position, company_id
       FROM eqms_folders
       WHERE level = $1::int
         AND (company_id IS NULL OR company_id = $2::uuid)
       ORDER BY parent_id NULLS FIRST, position, name`,
      [level, company_id]
    )
  } else if (session.role === 'admin') {
    rows = await query(
      `SELECT id, level, parent_id, name, position, company_id
       FROM eqms_folders
       WHERE level = $1::int
       ORDER BY parent_id NULLS FIRST, position, name`,
      [level]
    )
  } else {
    // client — scope to their company
    rows = await query(
      `SELECT id, level, parent_id, name, position, company_id
       FROM eqms_folders
       WHERE level = $1::int
         AND (company_id IS NULL OR company_id = $2::uuid)
       ORDER BY parent_id NULLS FIRST, position, name`,
      [level, session.company_id]
    )
  }

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant', 'client', 'client-MR'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { level, parent_id, name, company_id } = await req.json()
  if (!level || !name) return NextResponse.json({ error: 'level and name required' }, { status: 400 })

  // Root folders (parent_id = null) are global — no company_id
  // Subfolders belong to a company
  const effectiveCompanyId = parent_id ? (company_id || session.company_id || null) : null

  const rows = await query(
    `INSERT INTO eqms_folders (level, parent_id, name, position, created_by, company_id)
     VALUES ($1::int, $2::uuid, $3,
       COALESCE((SELECT MAX(position)+1 FROM eqms_folders
                 WHERE level=$1::int
                 AND parent_id IS NOT DISTINCT FROM $2::uuid
                 AND company_id IS NOT DISTINCT FROM $4::uuid), 0),
       $5::uuid, $4::uuid)
     RETURNING id, level, parent_id, name, position, company_id`,
    [level, parent_id || null, name.trim(), effectiveCompanyId, session.id]
  )
  return NextResponse.json(rows[0])
}
