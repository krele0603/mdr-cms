import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS qms_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      level INT NOT NULL CHECK (level BETWEEN 1 AND 4),
      content JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
      status TEXT NOT NULL DEFAULT 'active',
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, []).catch(() => {})
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureTable()

  const level = req.nextUrl.searchParams.get('level')
  const rows = level
    ? await query(
        `SELECT id, name, level, status, created_at, updated_at
         FROM qms_templates WHERE level = $1 AND status = 'active'
         ORDER BY name ASC`,
        [level]
      )
    : await query(
        `SELECT id, name, level, status, created_at, updated_at
         FROM qms_templates WHERE status = 'active'
         ORDER BY level ASC, name ASC`,
        []
      )

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureTable()

  const contentType = req.headers.get('content-type') || ''

  // ── DOCX upload ────────────────────────────────────────────────────────────
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file      = formData.get('file') as File | null
    const level     = parseInt(formData.get('level') as string)
    const name      = (formData.get('name') as string)?.trim()
    const preview   = formData.get('preview') === 'true'

    if (!file || !level || !name)
      return NextResponse.json({ error: 'file, level and name required' }, { status: 400 })
    if (!file.name.endsWith('.docx'))
      return NextResponse.json({ error: 'Only .docx files supported' }, { status: 400 })

    try {
      const mammoth   = await import('mammoth')
      const buffer    = Buffer.from(await file.arrayBuffer())
      const result    = await mammoth.convertToHtml({ buffer })

      // Return raw HTML to the client — TipTap parses it natively
      // This is more reliable than any custom HTML→JSON converter
      if (preview) {
        return NextResponse.json({
          name,
          level,
          html: result.value,           // raw HTML for TipTap setContent()
          warnings: result.messages,
        })
      }

      // For a direct save (no preview step), we need TipTap JSON.
      // This path is rarely used — the UI always previews first.
      // Return html and let the client convert via editor.getJSON() after setContent()
      return NextResponse.json({
        name,
        level,
        html: result.value,
        warnings: result.messages,
        requiresClientSave: true,       // signal to client to save JSON after rendering
      })

    } catch (err: any) {
      console.error('DOCX import error:', err)
      return NextResponse.json({ error: 'Failed to process DOCX: ' + err.message }, { status: 500 })
    }
  }

  // ── JSON (manual create or save after preview) ─────────────────────────────
  const body = await req.json()
  const { name, level, content } = body
  if (!name?.trim() || !level)
    return NextResponse.json({ error: 'name and level required' }, { status: 400 })

  const row = await queryOne(
    `INSERT INTO qms_templates (name, level, content, created_by)
     VALUES ($1, $2, $3, $4::uuid)
     RETURNING id, name, level, status, created_at`,
    [name.trim(), level, JSON.stringify(content || { type: 'doc', content: [{ type: 'paragraph' }] }), session.id]
  )
  return NextResponse.json(row, { status: 201 })
}
