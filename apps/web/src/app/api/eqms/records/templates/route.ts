import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

// Returns approved Level 4 eQMS documents for a company — used as templates for Level 5 records
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const company_id = req.nextUrl.searchParams.get('company_id')
  if (!company_id) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  // Must be member or admin
  if (session.role !== 'admin') {
    const { queryOne } = await import('@/lib/db')
    const membership = await queryOne(
      `SELECT id FROM company_members WHERE company_id = $1::uuid AND user_id = $2::uuid`,
      [company_id, session.id]
    )
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only active Level 4 documents with an active version
  const templates = await query(
    `SELECT d.id, d.title, d.code, d.status,
            v.version_major, v.version_minor
     FROM eqms_documents d
     JOIN eqms_document_versions v ON v.id = d.current_version_id
     WHERE d.level = 4
       AND d.company_id = $1::uuid
       AND d.status = 'active'
       AND v.status = 'active'
     ORDER BY d.title ASC`,
    [company_id]
  )

  return NextResponse.json(templates)
}
