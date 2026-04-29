import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { annex, name, code, template_id } = await req.json()
  if (!annex || !name || !code) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  let content: any = {}
  let templateVersionId: string | null = null

  if (template_id) {
    const tv = await queryOne<{ id: string; content: any }>(
      `SELECT id, content FROM template_versions WHERE template_id = $1::uuid AND is_current = TRUE LIMIT 1`,
      [template_id]
    )
    if (tv) {
      content = tv.content ?? {}
      templateVersionId = tv.id
    }
  }

  const [doc] = await query(`
    INSERT INTO project_documents (project_id, annex, name, code, status, content, template_version_id)
    VALUES ($1::uuid, $2, $3, $4, 'draft', $5, $6)
    RETURNING id
  `, [params.id, annex, name, code, JSON.stringify(content), templateVersionId])

  return NextResponse.json({ ok: true, id: doc.id }, { status: 201 })
}
