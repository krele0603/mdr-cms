import { NextRequest, NextResponse } from 'next/server'
import { resolveVariablesInContent } from '@/lib/variable-node'
import { getSession } from '@/lib/auth'
import { queryOne } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

interface LayoutCell {
  row: number; col: number; content: string
  align: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'center' | 'bottom'
  customText?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
}
interface Layout {
  rows: number; cols: number; cells: LayoutCell[]
  borderTop?: boolean; borderBottom?: boolean
  showCellBorders?: boolean; colWidths?: number[]; rowHeight?: number
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; ext: string } | null {
  try {
    const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/)
    if (!match) return null
    const ext = match[2] === 'jpeg' ? 'jpg' : match[2]
    return { buffer: Buffer.from(match[3], 'base64'), ext }
  } catch { return null }
}

function getCell(layout: Layout, row: number, col: number): LayoutCell {
  return layout.cells.find(c => c.row === row && c.col === col) || { row, col, content: 'empty', align: 'left' }
}

function buildLayoutTable(layout: Layout, docx: any, ctx: {
  docName: string; docCode: string; version: string
  deviceName: string; manufacturerName: string; logo: string | null
}): any[] {
  const { Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType,
    WidthType, BorderStyle, PageNumber, ImageRun } = docx

  const colWidths = (layout.colWidths && layout.colWidths.length === layout.cols)
    ? layout.colWidths
    : Array(layout.cols).fill(Math.floor(100 / layout.cols))

  const rowHeightVal = (layout.rowHeight || 40) * 15 // convert px to twips approx

  const getAlign = (a: string) => a === 'center' ? AlignmentType.CENTER : a === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT
  const getVAlign = (a?: string) => a === 'top' ? 'top' : a === 'bottom' ? 'bottom' : 'center'

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  function buildCellChildren(cell: LayoutCell): any[] {
    const fs = (cell.fontSize || 11) * 2
    const bold = cell.bold
    const italics = cell.italic

    switch (cell.content) {
      case 'empty': return [new Paragraph({ children: [] })]
      case 'logo': {
        if (ctx.logo) {
          const parsed = parseDataUrl(ctx.logo)
          if (parsed) {
            try {
              const h = Math.min(layout.rowHeight || 40, 60) - 8
              return [new Paragraph({ children: [new ImageRun({ data: parsed.buffer, transformation: { width: Math.round(h * 2.5), height: h } })], alignment: getAlign(cell.align) })]
            } catch {}
          }
        }
        return [new Paragraph({ children: [new TextRun({ text: ctx.deviceName || '', size: fs || 18, bold: true })], alignment: getAlign(cell.align) })]
      }
      case 'document_name':
        return [new Paragraph({ children: [new TextRun({ text: ctx.docName, bold: bold !== undefined ? bold : true, italics, size: fs || 20 })], alignment: getAlign(cell.align) })]
      case 'document_code':
        return [new Paragraph({ children: [new TextRun({ text: ctx.docCode, bold, italics, size: fs || 16, color: '5a6472' })], alignment: getAlign(cell.align) })]
      case 'version':
        return [new Paragraph({ children: [new TextRun({ text: ctx.version, bold, italics, size: fs || 16, color: '8a96a2' })], alignment: getAlign(cell.align) })]
      case 'date':
        return [new Paragraph({ children: [new TextRun({ text: today, bold, italics, size: fs || 16, color: '8a96a2' })], alignment: getAlign(cell.align) })]
      case 'page_number':
        return [new Paragraph({ children: [
          new TextRun({ text: 'Page ', bold, italics, size: fs || 16, color: '8a96a2' }),
          new TextRun({ children: [PageNumber.CURRENT], bold, italics, size: fs || 16, color: '8a96a2' }),
          new TextRun({ text: ' of ', bold, italics, size: fs || 16, color: '8a96a2' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], bold, italics, size: fs || 16, color: '8a96a2' }),
        ], alignment: getAlign(cell.align) })]
      case 'device_name':
        return [new Paragraph({ children: [new TextRun({ text: ctx.deviceName, bold, italics, size: fs || 16, color: '5a6472' })], alignment: getAlign(cell.align) })]
      case 'manufacturer_name':
        return [new Paragraph({ children: [new TextRun({ text: ctx.manufacturerName, bold, italics, size: fs || 16, color: '5a6472' })], alignment: getAlign(cell.align) })]
      case 'custom':
        return [new Paragraph({ children: [new TextRun({ text: cell.customText || '', bold, italics, size: fs || 16 })], alignment: getAlign(cell.align) })]
      default:
        return [new Paragraph({ children: [] })]
    }
  }

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const lineBorder = { style: BorderStyle.SINGLE, size: 1, color: 'e0ddd8' }
  const cellBorder = layout.showCellBorders ? lineBorder : noBorder
  const topBorder = layout.borderTop ? lineBorder : noBorder
  const bottomBorder = layout.borderBottom ? lineBorder : noBorder

  const tableRows = Array.from({ length: layout.rows }, (_, ri) => {
    const cells = Array.from({ length: layout.cols }, (_, ci) => {
      const cell = getCell(layout, ri, ci)
      return new TableCell({
        children: buildCellChildren(cell),
        width: { size: Math.round(colWidths[ci]), type: WidthType.PERCENTAGE },
        borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
        verticalAlign: getVAlign(cell.verticalAlign) as any,
      })
    })
    return new TableRow({
      children: cells,
      height: { value: rowHeightVal, rule: 'exact' as any },
    })
  })

  return [new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: topBorder, bottom: bottomBorder, left: noBorder, right: noBorder, insideH: cellBorder, insideV: cellBorder },
  })]
}

function convertNode(node: any, docx: any): any[] {
  const { Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
    BorderStyle, AlignmentType, UnderlineType, NumberFormat, ImageRun } = docx

  if (!node) return []
  const results: any[] = []

  function textRuns(inlineNodes: any[]): any[] {
    if (!inlineNodes) return []
    const runs: any[] = []
    for (const n of inlineNodes) {
      if (n.type === 'hardBreak') { runs.push(new TextRun({ break: 1 })); continue }
      if (n.type && n.type !== 'text') continue
      const marks = n.marks || []
      const bold = marks.some((m: any) => m.type === 'bold')
      const italic = marks.some((m: any) => m.type === 'italic')
      const underline = marks.some((m: any) => m.type === 'underline')
      const strike = marks.some((m: any) => m.type === 'strike')
      const styleMark = marks.find((m: any) => m.type === 'textStyle')
      const color = styleMark?.attrs?.color?.replace('#', '') || undefined
      runs.push(new TextRun({
        text: n.text || '', bold, italics: italic,
        underline: underline ? { type: UnderlineType.SINGLE } : undefined,
        strike, color,
        font: styleMark?.attrs?.fontFamily?.replace(/['"]/g, '').split(',')[0].trim() || undefined,
      }))
    }
    return runs
  }

  function getAlign(attrs: any) {
    const a = attrs?.textAlign
    if (a === 'center') return AlignmentType.CENTER
    if (a === 'right') return AlignmentType.RIGHT
    if (a === 'justify') return AlignmentType.JUSTIFIED
    return AlignmentType.LEFT
  }

  switch (node.type) {
    case 'doc':
      for (const child of node.content || []) results.push(...convertNode(child, docx))
      break
    case 'paragraph':
      results.push(new Paragraph({ children: textRuns(node.content || []), alignment: getAlign(node.attrs), spacing: { after: 120 } }))
      break
    case 'heading': {
      const level = node.attrs?.level || 1
      const headingMap: Record<number, any> = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 }
      results.push(new Paragraph({ children: textRuns(node.content || []), heading: headingMap[level] || HeadingLevel.HEADING_1, alignment: getAlign(node.attrs), spacing: { before: 240, after: 120 } }))
      break
    }
    case 'image': {
      const src = node.attrs?.src
      if (src) {
        const parsed = parseDataUrl(src)
        if (parsed) {
          try {
            results.push(new Paragraph({ children: [new ImageRun({ data: parsed.buffer, transformation: { width: 530, height: 350 } })], spacing: { before: 120, after: 120 } }))
          } catch {
            results.push(new Paragraph({ children: [new TextRun({ text: '[Image]', color: '8a96a2', italics: true })] }))
          }
        }
      }
      break
    }
    case 'bulletList':
      for (const item of node.content || []) for (const para of item.content || [])
        results.push(new Paragraph({ children: textRuns(para.content || []), bullet: { level: 0 }, spacing: { after: 60 } }))
      break
    case 'orderedList':
      for (const item of node.content || []) for (const para of item.content || [])
        results.push(new Paragraph({ children: textRuns(para.content || []), numbering: { reference: 'default-numbering', level: 0 }, spacing: { after: 60 } }))
      break
    case 'blockquote':
      for (const child of node.content || []) {
        const inner = convertNode(child, docx)
        for (const p of inner) results.push(new Paragraph({ children: (p as any).options?.children || [], indent: { left: 720 }, border: { left: { style: BorderStyle.SINGLE, size: 6, color: '4e8c8c', space: 8 } }, spacing: { after: 120 } }))
      }
      break
    case 'table': {
      const rows = (node.content || []).map((rowNode: any) => {
        const cells = (rowNode.content || []).map((cellNode: any) => {
          const cellContent: any[] = []
          for (const child of cellNode.content || []) cellContent.push(...convertNode(child, docx))
          if (cellContent.length === 0) cellContent.push(new Paragraph({ children: [] }))
          return new TableCell({ children: cellContent, shading: cellNode.type === 'tableHeader' ? { fill: 'f5f2ee' } : undefined })
        })
        return new TableRow({ children: cells })
      })
      results.push(new Table({ rows, width: { size: 100, type: 'pct' } }))
      results.push(new Paragraph({ children: [], spacing: { after: 120 } }))
      break
    }
    case 'horizontalRule':
      results.push(new Paragraph({ children: [], border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e0ddd8' } }, spacing: { before: 120, after: 120 } }))
      break
    default:
      for (const child of node.content || []) results.push(...convertNode(child, docx))
  }
  return results
}

const DEFAULT_HEADER: Layout = {
  rows: 1, cols: 3, borderBottom: true, rowHeight: 40,
  cells: [
    { row: 0, col: 0, content: 'logo', align: 'left' },
    { row: 0, col: 1, content: 'document_name', align: 'center' },
    { row: 0, col: 2, content: 'document_code', align: 'right' },
  ],
}

const DEFAULT_FOOTER: Layout = {
  rows: 1, cols: 3, borderTop: true, rowHeight: 40,
  cells: [
    { row: 0, col: 0, content: 'version', align: 'left' },
    { row: 0, col: 1, content: 'date', align: 'center' },
    { row: 0, col: 2, content: 'page_number', align: 'right' },
  ],
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'docx'

  const doc = await queryOne(`
    SELECT pd.id, pd.name, pd.code, pd.annex, pd.content, pd.status, pd.updated_at,
           tv.version AS template_version,
           p.name AS project_name, p.device_name, p.manufacturer_name,
           p.header_logo_url, p.header_layout, p.footer_layout
    FROM project_documents pd
    JOIN projects p ON p.id = pd.project_id
    LEFT JOIN template_versions tv ON tv.id = pd.template_version_id
    WHERE pd.id = $1::uuid AND pd.project_id = $2::uuid
  `, [params.docId, params.id])

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (format !== 'docx') return NextResponse.json({ error: 'Only docx format supported' }, { status: 400 })

  try {
    const docx = await import('docx')
    const { Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, NumberFormat } = docx

    const { query: dbQuery } = await import('@/lib/db')
    const vars = await dbQuery(
      `SELECT tag, value FROM project_variables WHERE project_id = $1::uuid AND value != ''`,
      [params.id]
    )

    const rawContent = doc.content || {}
    const content = Object.keys(rawContent).length > 0 ? resolveVariablesInContent(rawContent, vars as any[]) : rawContent
    const bodyChildren = Object.keys(content).length > 0
      ? convertNode(content, docx)
      : [new Paragraph({ children: [new TextRun({ text: '(No content)', color: '999999', italics: true })] })]

    const headerLayout: Layout = doc.header_layout || DEFAULT_HEADER
    const footerLayout: Layout = doc.footer_layout || DEFAULT_FOOTER

    const ctx = {
      docName: doc.name,
      docCode: doc.code,
      version: doc.template_version || 'v1',
      deviceName: doc.device_name || '',
      manufacturerName: doc.manufacturer_name || '',
      logo: doc.header_logo_url || null,
    }

    const headerChildren = buildLayoutTable(headerLayout, docx, ctx)
    const footerChildren = buildLayoutTable(footerLayout, docx, ctx)

    const document = new Document({
      numbering: {
        config: [{ reference: 'default-numbering', levels: [{ level: 0, format: NumberFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT }] }],
      },
      styles: {
        default: { document: { run: { font: 'Calibri', size: 24, color: '1a1f24' }, paragraph: { spacing: { after: 120 } } } },
        paragraphStyles: [
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { font: 'Georgia', size: 36, bold: true, color: '1a1f24' }, paragraph: { spacing: { before: 360, after: 120 } } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', run: { font: 'Georgia', size: 28, bold: true, color: '2e3640' }, paragraph: { spacing: { before: 280, after: 100 } } },
          { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', run: { size: 24, bold: true, color: '2e3640' }, paragraph: { spacing: { before: 240, after: 80 } } },
          { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', run: { size: 22, bold: true, color: '5a6472' }, paragraph: { spacing: { before: 200, after: 60 } } },
        ],
      },
      sections: [{
        properties: { page: { margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } } },
        headers: { default: new Header({ children: headerChildren }) },
        footers: { default: new Footer({ children: footerChildren }) },
        children: bodyChildren,
      }],
    })

    const buffer = new Uint8Array(await Packer.toBuffer(document))
    const filename = `${doc.code}-${doc.name.replace(/[^a-z0-9]/gi, '_')}.docx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err: any) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Export failed: ' + err.message }, { status: 500 })
  }
}
