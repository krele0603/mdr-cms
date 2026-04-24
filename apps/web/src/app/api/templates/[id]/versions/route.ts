import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

// POST /api/templates/[id]/versions — create a new version
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { version, change_note, content, example_content, set_current } = body

  if (!version?.trim()) {
    return NextResponse.json({ error: 'Version is required' }, { status: 400 })
  }

  // Check version label uniqueness within template
  const existing = await queryOne(
    `SELECT id FROM template_versions WHERE template_id = $1::uuid AND version = $2`,
    [params.id, version.trim()]
  )
  if (existing) {
    return NextResponse.json({ error: 'Version label already exists for this template' }, { status: 409 })
  }

  // If set_current, unset all others first
  if (set_current) {
    await query(
      `UPDATE template_versions SET is_current = FALSE WHERE template_id = $1::uuid`,
      [params.id]
    )
  }

  const newVersion = await queryOne(
    `INSERT INTO template_versions (template_id, version, content, example_content, change_note, is_current, created_by)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid)
     RETURNING id, version, is_current, change_note, created_at`,
    [
      params.id,
      version.trim(),
      content ? JSON.stringify(content) : '{}',
      example_content ? JSON.stringify(example_content) : '{}',
      change_note?.trim() || null,
      set_current ?? true,
      session.id,
    ]
  )

  return NextResponse.json(newVersion, { status: 201 })
}

// PATCH /api/templates/[id]/versions — set a version as current
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { version_id } = body

  if (!version_id) {
    return NextResponse.json({ error: 'version_id required' }, { status: 400 })
  }

  // Verify version belongs to this template
  const ver = await queryOne(
    `SELECT id FROM template_versions WHERE id = $1::uuid AND template_id = $2::uuid`,
    [version_id, params.id]
  )
  if (!ver) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await query(
    `UPDATE template_versions SET is_current = FALSE WHERE template_id = $1::uuid`,
    [params.id]
  )
  await query(
    `UPDATE template_versions SET is_current = TRUE WHERE id = $1::uuid`,
    [version_id]
  )

  // Also mark template as active if it was draft
  await query(
    `UPDATE templates SET status = 'active', updated_at = NOW() WHERE id = $1::uuid AND status = 'draft'`,
    [params.id]
  )

  return NextResponse.json({ ok: true })
}
