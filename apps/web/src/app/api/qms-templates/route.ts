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
      const JSZip     = (await import('jszip')).default
      const buffer    = Buffer.from(await file.arrayBuffer())

      // Extract alignment + color from raw DOCX XML
      const zip = await JSZip.loadAsync(buffer)
      const xmlFile = zip.file('word/document.xml')
      const docXml = xmlFile ? await xmlFile.async('text') : ''

      // Build text->style map from XML (match by text, not index — more reliable)
      const buildStyleMap = (xml: string): Map<string, { align?: string; color?: string }> => {
        const map = new Map<string, { align?: string; color?: string }>()
        const xmlNoTables = xml.replace(/<w:tbl[ >][\s\S]*?<\/w:tbl>/g, '')
        const paraRegex = /<w:p[ >][\s\S]*?<\/w:p>/g
        let pm
        while ((pm = paraRegex.exec(xmlNoTables)) !== null) {
          const paraXml = pm[0]
          const textParts: string[] = []
          const tReg = /<w:t[^>]*>([^<]*)<\/w:t>/g
          let tm
          while ((tm = tReg.exec(paraXml)) !== null) textParts.push(tm[1])
          const text = textParts.join('').trim()
          if (!text) continue
          const alignMatch = paraXml.match(/<w:jc[^>]*w:val="([^"]+)"/)
          const align = alignMatch ? alignMatch[1] : undefined
          const colors: string[] = []
          const runRegex = /<w:r[ >][\s\S]*?<\/w:r>/g
          let rm
          while ((rm = runRegex.exec(paraXml)) !== null) {
            const colorMatch = rm[0].match(/<w:color[^>]*w:val="([^"]+)"/)
            if (colorMatch && colorMatch[1] !== 'auto' && colorMatch[1] !== '000000') {
              colors.push('#' + colorMatch[1])
            }
          }
          if (align || colors.length > 0) {
            map.set(text.substring(0, 100), { align, color: colors[0] })
          }
        }
        return map
      }

      const styleMap = buildStyleMap(docXml)
      const result = await mammoth.convertToHtml({ buffer })

      // Protect tables, apply styles to paragraphs by text match
      const tableStore: string[] = []
      let processedHtml = result.value.replace(/<table[\s\S]*?<\/table>/gi, (m: string) => {
        tableStore.push(m)
        return '__TABLE_' + (tableStore.length - 1) + '__'
      })

      processedHtml = processedHtml.replace(
        /<(p|h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi,
        (match: string, tag: string, attrs: string, inner: string) => {
          const plainText = inner.replace(/<[^>]+>/g, '').trim().substring(0, 100)
          const style = styleMap.get(plainText)
          if (!style) return match
          const styles: string[] = []
          if (style.align) {
            const alignMap: Record<string,string> = { center: 'center', right: 'right', both: 'justify' }
            const ta = alignMap[style.align]
            if (ta) styles.push('text-align:' + ta)
          }
          // Color goes on a span wrapping the content (TipTap Color extension reads span style)
          // Alignment goes on the block element
          const colorStyle = style.color ? ' style="color:' + style.color + '"' : ''
          const blockStyle = styles.length > 0 ? ' style="' + styles.join(';') + '"' : ''
          const wrappedInner = style.color ? '<span' + colorStyle + '>' + inner + '</span>' : inner
          return '<' + tag + attrs + blockStyle + '>' + wrappedInner + '</' + tag + '>'
        }
      )

      const html = processedHtml.replace(/__TABLE_(\d+)__/g, (_: string, i: string) => tableStore[parseInt(i)])

      if (preview) {
        return NextResponse.json({
          name,
          level,
          html,
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
