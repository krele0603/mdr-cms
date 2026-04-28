import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await queryOne(
    `SELECT header_layout, footer_layout, header_logo_url FROM projects WHERE id = $1::uuid`,
    [params.id]
  )
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    header_layout: project.header_layout,
    footer_layout: project.footer_layout,
    logo: project.header_logo_url,
  })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { header_layout, footer_layout } = body

  await query(
    `UPDATE projects SET
      header_layout = COALESCE($1, header_layout),
      footer_layout = COALESCE($2, footer_layout),
      updated_at = NOW()
    WHERE id = $3::uuid`,
    [
      header_layout !== undefined ? JSON.stringify(header_layout) : null,
      footer_layout !== undefined ? JSON.stringify(footer_layout) : null,
      params.id,
    ]
  )

  return NextResponse.json({ ok: true })
}
