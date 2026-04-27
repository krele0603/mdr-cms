import { NextRequest, NextResponse } from 'next/server'
import { resolveVariablesInContent } from '@/lib/variable-node'
import { getSession } from '@/lib/auth'
import { queryOne } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

// Convert base64 data URL to buffer + extension
function parseDataUrl(dataUrl: string): { buffer: Buffer; ext: string; mimeType: string } | null {
  try {
    const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/)
    if (!match) return null
    const mimeType = match[1]
    const ext = match[2] === 'jpeg' ? 'jpg' : match[2]
    const buffer = Buffer.from(match[3], 'base64')
    return { buffer, ext, mimeType }
  } catch { return null }
}

// Estimate image dimensions from base64 (rough estimate for PNG/JPEG)
function estimateImageSize(buffer: Buffer, ext: string): { width: number; height: number } {
  // Default safe size: max width 14cm (about 530 docx units at 96dpi)
  // We'll use a fixed max width and let aspect ratio be handled by docx
  return { width: 530, height: 350 }
}

function convertNode(node: any, docx: any): any[] {
  const {
    Document, Paragraph, TextRun, HeadingLevel, Table, TableRow,
    TableCell, BorderStyle, AlignmentType, UnderlineType,
    NumberFormat, ImageRun,
  } = docx

  if (!node) return []

  const results: any[] = []

  function textRuns(inlineNodes: any[]): any[] {
    if (!inlineNodes) return []
    const runs: any[] = []
    for (const n of inlineNodes) {
      if (n.type === 'hardBreak') { runs.push(new TextRun({ break: 1 })); continue }
      if (n.type === 'image') {
        // Inline image - skip here, handled at block level
        continue
      }
      // Skip non-renderable nodes (commentMark, variableNode already resolved)
      if (n.type && n.type !== 'text') continue
      const marks = n.marks || []
      const bold = marks.some((m: any) => m.type === 'bold')
      const italic = marks.some((m: any) => m.type === 'italic')
      const underline = marks.some((m: any) => m.type === 'underline')
      const strike = marks.some((m: any) => m.type === 'strike')
      const fontMark = marks.find((m: any) => m.type === 'textStyle')
      const colorMark = marks.find((m: any) => m.type === 'textStyle')
      const color = colorMark?.attrs?.color?.replace('#', '') || undefined
      runs.push(new TextRun({
        text: n.text || '',
        bold,
        italics: italic,
        underline: underline ? { type: UnderlineType.SINGLE } : undefined,
        strike,
        color,
        font: fontMark?.attrs?.fontFamily?.replace(/['"]/g, '').split(',')[0].trim() || undefined,
      }))
    }
    return runs
  }

  function getAlign(attrs: any): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
    const a = attrs?.textAlign
    if (a === 'center') return AlignmentType.CENTER
    if (a === 'right') return AlignmentType.RIGHT
    if (a === 'justify') return AlignmentType.JUSTIFIED
    return AlignmentType.LEFT
  }

  switch (node.type) {
    case 'doc':
      for (const child of node.content || []) {
        results.push(...convertNode(child, docx))
      }
      break

    case 'paragraph':
      results.push(new Paragraph({
        children: textRuns(node.content || []),
        alignment: getAlign(node.attrs),
        spacing: { after: 120 },
      }))
      break

    case 'heading': {
      const level = node.attrs?.level || 1
      const headingMap: Record<number, any> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
      }
      results.push(new Paragraph({
        children: textRuns(node.content || []),
        heading: headingMap[level] || HeadingLevel.HEADING_1,
        alignment: getAlign(node.attrs),
        spacing: { before: 240, after: 120 },
      }))
      break
    }

    case 'image': {
      const src = node.attrs?.src
      if (src) {
        const parsed = parseDataUrl(src)
        if (parsed) {
          const { width, height } = estimateImageSize(parsed.buffer, parsed.ext)
          try {
            results.push(new Paragraph({
              children: [new ImageRun({
                data: parsed.buffer,
                transformation: { width, height },
                type: parsed.ext as any,
              })],
              spacing: { before: 120, after: 120 },
            }))
          } catch {
            results.push(new Paragraph({
              children: [new TextRun({ text: '[Image]', color: '8a96a2', italics: true })],
            }))
          }
        }
      }
      break
    }

    case 'bulletList':
      for (const item of node.content || []) {
        for (const para of item.content || []) {
          results.push(new Paragraph({
            children: textRuns(para.content || []),
            bullet: { level: 0 },
            spacing: { after: 60 },
          }))
        }
      }
      break

    case 'orderedList':
      for (const item of node.content || []) {
        for (const para of item.content || []) {
          results.push(new Paragraph({
            children: textRuns(para.content || []),
            numbering: { reference: 'default-numbering', level: 0 },
            spacing: { after: 60 },
          }))
        }
      }
      break

    case 'blockquote':
      for (const child of node.content || []) {
        const inner = convertNode(child, docx)
        for (const p of inner) {
          results.push(new Paragraph({
            children: (p as any).options?.children || [],
            indent: { left: 720 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 6, color: '4e8c8c', space: 8 },
            },
            spacing: { after: 120 },
          }))
        }
      }
      break

    case 'table': {
      const rows = (node.content || []).map((rowNode: any) => {
        const cells = (rowNode.content || []).map((cellNode: any) => {
          const cellContent: any[] = []
          for (const child of cellNode.content || []) {
            cellContent.push(...convertNode(child, docx))
          }
          if (cellContent.length === 0) cellContent.push(new Paragraph({ children: [] }))
          return new TableCell({
            children: cellContent,
            shading: cellNode.type === 'tableHeader' ? { fill: 'f5f2ee' } : undefined,
          })
        })
        return new TableRow({ children: cells })
      })
      results.push(new Table({ rows, width: { size: 100, type: 'pct' } }))
      results.push(new Paragraph({ children: [], spacing: { after: 120 } }))
      break
    }

    case 'horizontalRule':
      results.push(new Paragraph({
        children: [],
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e0ddd8' } },
        spacing: { before: 120, after: 120 },
      }))
      break

    default:
      for (const child of node.content || []) {
        results.push(...convertNode(child, docx))
      }
  }

  return results
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'docx'

  const doc = await queryOne(`
    SELECT
      pd.id, pd.name, pd.code, pd.annex, pd.content, pd.status,
      pd.updated_at,
      tv.version AS template_version,
      p.name AS project_name,
      p.device_name, p.manufacturer_name,
      p.footer_confidentiality,
      p.header_logo_url
    FROM project_documents pd
    JOIN projects p ON p.id = pd.project_id
    LEFT JOIN template_versions tv ON tv.id = pd.template_version_id
    WHERE pd.id = $1::uuid AND pd.project_id = $2::uuid
  `, [params.docId, params.id])

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (format !== 'docx') return NextResponse.json({ error: 'Only docx format supported' }, { status: 400 })

  try {
    const docx = await import('docx')
    const {
      Document, Packer, Paragraph, TextRun, AlignmentType,
      Header, Footer, PageNumber, NumberFormat, Tab,
      TabStopPosition, TabStopType, ImageRun,
    } = docx

    const { query: dbQuery } = await import('@/lib/db')
    const vars = await dbQuery(
      `SELECT tag, value FROM project_variables WHERE project_id = $1::uuid AND value != ''`,
      [params.id]
    )

    const rawContent = doc.content || {}
    const content = Object.keys(rawContent).length > 0
      ? resolveVariablesInContent(rawContent, vars as any[])
      : rawContent
    const bodyChildren = Object.keys(content).length > 0
      ? convertNode(content, docx)
      : [new Paragraph({ children: [new TextRun({ text: '(No content)', color: '999999', italics: true })] })]

    // Header — Logo (if available) | Document name | Code
    const headerChildren: any[] = []
    const logoUrl = doc.header_logo_url as string | null
    if (logoUrl) {
      const parsed = parseDataUrl(logoUrl)
      if (parsed) {
        try {
          headerChildren.push(new ImageRun({
            data: parsed.buffer,
            transformation: { width: 100, height: 40 },
          }))
        } catch { /* fall through to text fallback */ }
      }
    }

    const headerParagraph = new Paragraph({
      children: [
        ...(headerChildren.length > 0 ? headerChildren : [new TextRun({ text: doc.project_name, color: '8a96a2', size: 16 })]),
        new Tab(),
        new TextRun({ text: doc.name, bold: true, size: 20 }),
        new Tab(),
        new TextRun({ text: doc.code, color: '5a6472', size: 16 }),
      ],
      tabStops: [
        { type: TabStopType.CENTER, position: TabStopPosition.MAX / 2 },
        { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
      ],
      border: { bottom: { style: 'single', size: 1, color: 'e0ddd8', space: 4 } },
      spacing: { after: 200 },
    })

    const version = doc.template_version || 'v1'
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const confidentiality = doc.footer_confidentiality || 'Confidential'

    const footerParagraph = new Paragraph({
      children: [
        new TextRun({ text: `${version} · ${confidentiality}`, color: '8a96a2', size: 16 }),
        new Tab(),
        new TextRun({ text: dateStr, color: '8a96a2', size: 16 }),
        new Tab(),
        new TextRun({ text: 'Page ', color: '8a96a2', size: 16 }),
        new TextRun({ children: [PageNumber.CURRENT], color: '8a96a2', size: 16 }),
        new TextRun({ text: ' of ', color: '8a96a2', size: 16 }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], color: '8a96a2', size: 16 }),
      ],
      tabStops: [
        { type: TabStopType.CENTER, position: TabStopPosition.MAX / 2 },
        { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
      ],
      border: { top: { style: 'single', size: 1, color: 'e0ddd8', space: 4 } },
    })

    const document = new Document({
      numbering: {
        config: [{
          reference: 'default-numbering',
          levels: [{ level: 0, format: NumberFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT }],
        }],
      },
      styles: {
        default: {
          document: { run: { font: 'Calibri', size: 24, color: '1a1f24' }, paragraph: { spacing: { after: 120 } } },
        },
        paragraphStyles: [
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { font: 'Georgia', size: 36, bold: true, color: '1a1f24' }, paragraph: { spacing: { before: 360, after: 120 } } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', run: { font: 'Georgia', size: 28, bold: true, color: '2e3640' }, paragraph: { spacing: { before: 280, after: 100 } } },
          { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', run: { size: 24, bold: true, color: '2e3640' }, paragraph: { spacing: { before: 240, after: 80 } } },
          { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', run: { size: 22, bold: true, color: '5a6472' }, paragraph: { spacing: { before: 200, after: 60 } } },
        ],
      },
      sections: [{
        properties: { page: { margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } } },
        headers: { default: new Header({ children: [headerParagraph] }) },
        footers: { default: new Footer({ children: [footerParagraph] }) },
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
