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

// Convert mammoth HTML output to TipTap JSON
function htmlToTiptap(html: string): any {
  const doc: any = { type: 'doc', content: [] }

  // Split by block-level tags
  const blocks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/(?=<h[1-6]|<p|<ul|<ol|<table|<blockquote)/i)
    .filter(b => b.trim())

  for (const block of blocks) {
    const node = parseBlock(block.trim())
    if (node) {
      if (Array.isArray(node)) doc.content.push(...node)
      else doc.content.push(node)
    }
  }

  if (doc.content.length === 0) {
    doc.content.push({ type: 'paragraph' })
  }

  return doc
}

function parseBlock(html: string): any {
  // Headings
  const hMatch = html.match(/^<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/i)
  if (hMatch) {
    const level = Math.min(parseInt(hMatch[1]), 4)
    return { type: 'heading', attrs: { level }, content: parseInline(hMatch[2]) }
  }

  // Paragraph
  const pMatch = html.match(/^<p[^>]*>([\s\S]*?)<\/p>/i)
  if (pMatch) {
    const content = parseInline(pMatch[1])
    if (content.length === 0) return { type: 'paragraph' }
    return { type: 'paragraph', content }
  }

  // Unordered list
  const ulMatch = html.match(/^<ul[^>]*>([\s\S]*?)<\/ul>/i)
  if (ulMatch) {
    const items = parseListItems(ulMatch[1])
    if (items.length > 0) return { type: 'bulletList', content: items }
    return null
  }

  // Ordered list
  const olMatch = html.match(/^<ol[^>]*>([\s\S]*?)<\/ol>/i)
  if (olMatch) {
    const items = parseListItems(olMatch[1])
    if (items.length > 0) return { type: 'orderedList', content: items }
    return null
  }

  // Table
  const tableMatch = html.match(/^<table[^>]*>([\s\S]*?)<\/table>/i)
  if (tableMatch) {
    return parseTable(tableMatch[1])
  }

  // Fallback — treat as paragraph
  const text = stripTags(html).trim()
  if (!text) return null
  return { type: 'paragraph', content: [{ type: 'text', text }] }
}

function parseListItems(html: string): any[] {
  const items: any[] = []
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let m
  while ((m = liRegex.exec(html)) !== null) {
    const content = parseInline(m[1])
    if (content.length > 0) {
      items.push({ type: 'listItem', content: [{ type: 'paragraph', content }] })
    }
  }
  return items
}

function parseTable(html: string): any {
  const rows: any[] = []
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rm
  while ((rm = rowRegex.exec(html)) !== null) {
    const cells: any[] = []
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    const isHeader = rm[1].includes('<th')
    let cm
    while ((cm = cellRegex.exec(rm[1])) !== null) {
      const content = parseInline(cm[1])
      cells.push({
        type: isHeader ? 'tableHeader' : 'tableCell',
        attrs: { colspan: 1, rowspan: 1, colwidth: null },
        content: [{ type: 'paragraph', content: content.length > 0 ? content : [] }]
      })
    }
    if (cells.length > 0) rows.push({ type: 'tableRow', content: cells })
  }
  if (rows.length === 0) return null
  return { type: 'table', content: rows }
}

function parseInline(html: string): any[] {
  const nodes: any[] = []
  // Remove inner block tags, just get text with marks
  const cleaned = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(div|span|p)[^>]*>/gi, '')

  // Split on mark tags
  const parts = cleaned.split(/(<strong>|<\/strong>|<em>|<\/em>|<u>|<\/u>|<b>|<\/b>|<i>|<\/i>)/i)

  let bold = false
  let italic = false
  let underline = false

  for (const part of parts) {
    if (!part) continue
    if (/<strong>|<b>/i.test(part)) { bold = true; continue }
    if (/<\/strong>|<\/b>/i.test(part)) { bold = false; continue }
    if (/<em>|<i>/i.test(part)) { italic = true; continue }
    if (/<\/em>|<\/i>/i.test(part)) { italic = false; continue }
    if (/<u>/i.test(part)) { underline = true; continue }
    if (/<\/u>/i.test(part)) { underline = false; continue }

    const text = stripTags(part)
    if (!text) continue

    const marks: any[] = []
    if (bold) marks.push({ type: 'bold' })
    if (italic) marks.push({ type: 'italic' })
    if (underline) marks.push({ type: 'underline' })

    nodes.push({ type: 'text', text, ...(marks.length > 0 ? { marks } : {}) })
  }

  return nodes
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
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

  // Handle DOCX upload (multipart form)
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const level = parseInt(formData.get('level') as string)
    const name = (formData.get('name') as string)?.trim()

    if (!file || !level || !name)
      return NextResponse.json({ error: 'file, level and name required' }, { status: 400 })

    if (!file.name.endsWith('.docx'))
      return NextResponse.json({ error: 'Only .docx files supported' }, { status: 400 })

    try {
      const mammoth = await import('mammoth')
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const result = await mammoth.convertToHtml({ buffer })
      const html = result.value
      const content = htmlToTiptap(html)

      // If preview=true, just return the content without saving
      const preview = formData.get('preview') === 'true'
      if (preview) {
        return NextResponse.json({ name, level, content, warnings: result.messages })
      }

      const row = await queryOne(
        `INSERT INTO qms_templates (name, level, content, created_by)
         VALUES ($1, $2, $3, $4::uuid)
         RETURNING id, name, level, status, created_at`,
        [name, level, JSON.stringify(content), session.id]
      )
      return NextResponse.json(row, { status: 201 })
    } catch (err: any) {
      console.error('DOCX import error:', err)
      return NextResponse.json({ error: 'Failed to process DOCX: ' + err.message }, { status: 500 })
    }
  }

  // Handle JSON (manual create or save after preview)
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
