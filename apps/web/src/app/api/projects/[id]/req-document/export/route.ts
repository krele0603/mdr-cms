import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string } }

function convertNode(node: any, docx: any): any[] {
  const { Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
    BorderStyle, AlignmentType, UnderlineType } = docx
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
      runs.push(new TextRun({ text: n.text || '', bold, italics: italic, underline: underline ? { type: UnderlineType.SINGLE } : undefined, strike, color }))
    }
    return runs
  }

  function getAlign(attrs: any) {
    const a = attrs?.textAlign
    if (a === 'center') return AlignmentType.CENTER
    if (a === 'right') return AlignmentType.RIGHT
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
    case 'bulletList':
      for (const item of node.content || []) for (const para of item.content || [])
        results.push(new Paragraph({ children: textRuns(para.content || []), bullet: { level: 0 }, spacing: { after: 60 } }))
      break
    case 'orderedList':
      for (const item of node.content || []) for (const para of item.content || [])
        results.push(new Paragraph({ children: textRuns(para.content || []), numbering: { reference: 'default-numbering', level: 0 }, spacing: { after: 60 } }))
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
    default:
      for (const child of node.content || []) results.push(...convertNode(child, docx))
  }
  return results
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, text_content, template_id, approved_by_name } = await req.json()

  // Fetch project
  const project = await queryOne(
    `SELECT p.name, p.device_name, p.manufacturer_name, p.header_logo_url,
            p.footer_show_version, p.footer_show_date, p.footer_show_page_numbers, p.footer_confidentiality
     FROM projects p WHERE p.id = $1::uuid`,
    [params.id]
  )
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch variables
  const variables = await query(
    `SELECT tag, value FROM project_variables WHERE project_id = $1::uuid`,
    [params.id]
  )
  const getVar = (tag: string) => variables.find((v: any) => v.tag === tag)?.value || ''

  // Fetch requirements
  const lists = await query(
    `SELECT id, type, name FROM req_lists WHERE project_id = $1::uuid AND type = $2`,
    [params.id, type]
  )
  const allReqs: any[] = []
  for (const list of lists) {
    const groups = await query(`SELECT id, name, prefix FROM req_groups WHERE list_id = $1::uuid ORDER BY position`, [list.id])
    for (const g of groups) {
      const reqs = await query(`SELECT req_id, text FROM requirements WHERE group_id = $1::uuid ORDER BY position`, [g.id])
      for (const r of reqs) allReqs.push({ ...r, groupName: g.name })
    }
  }

  // Fetch FMEA
  const fmea = await queryOne(
    `SELECT title, record_id, revision, doc_date FROM fmea_documents WHERE project_id = $1::uuid`,
    [params.id]
  )

  // Fetch template questions
  let questions: string[] = []
  if (template_id) {
    const qs = await query(
      `SELECT question_text FROM structured_template_questions WHERE template_id = $1::uuid ORDER BY position`,
      [template_id]
    )
    questions = qs.map((q: any) => q.question_text)
  }

  const docx = await import('docx')
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, WidthType, BorderStyle, Header, Footer,
    PageNumber, NumberFormat, SectionType, TableLayoutType } = docx

  const typeLabel = type === 'system' ? 'System Requirements Specification' : 'Software Requirements Specification'
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const sectionChildren: any[] = []

  // Title
  sectionChildren.push(
    new Paragraph({ children: [new TextRun({ text: typeLabel, bold: true, size: 52 })], heading: HeadingLevel.TITLE, spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: project.name, size: 28, color: '5a6472' })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: project.device_name, size: 24, color: '8a96a2' })], spacing: { after: 400 } }),
  )

  // Section 1: Purpose / Scope / References
  sectionChildren.push(
    new Paragraph({ text: '1. Purpose, Scope and References', heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } })
  )
  if (text_content?.type === 'doc') {
    sectionChildren.push(...convertNode(text_content, docx))
  }

  // Section 2: Project Description
  sectionChildren.push(
    new Paragraph({ text: '2. Project Description', heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 } })
  )
  const descFields = [
    ['Device Name', getVar('$device_name')],
    ['Manufacturer', getVar('$manufacturer_name')],
    ['Intended Use', getVar('$intended_use')],
    ['Device Description', getVar('$device_description')],
    ['Classification', getVar('$classification')],
  ].filter(([_, v]) => v)

  if (descFields.length > 0) {
    const descRows = descFields.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })], width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: 'f8f7f4' } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })], width: { size: 70, type: WidthType.PERCENTAGE } }),
        ]
      })
    )
    sectionChildren.push(
      new Table({ rows: descRows, width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED }),
      new Paragraph({ children: [], spacing: { after: 120 } })
    )
  }

  // Section 3: Requirements table
  sectionChildren.push(
    new Paragraph({ text: '3. Requirements', heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 } })
  )
  if (allReqs.length > 0) {
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ID', bold: true, size: 18 })] })], width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: 'f5f2ee' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Group', bold: true, size: 18 })] })], width: { size: 20, type: WidthType.PERCENTAGE }, shading: { fill: 'f5f2ee' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Requirement', bold: true, size: 18 })] })], width: { size: 65, type: WidthType.PERCENTAGE }, shading: { fill: 'f5f2ee' } }),
      ]
    })
    const reqRows = allReqs.map(r =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.req_id, size: 18, font: 'Courier New' })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.groupName, size: 18 })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.text, size: 18 })] })], width: { size: 65, type: WidthType.PERCENTAGE } }),
        ]
      })
    )
    sectionChildren.push(
      new Table({ rows: [headerRow, ...reqRows], width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED }),
      new Paragraph({ children: [], spacing: { after: 120 } })
    )
  } else {
    sectionChildren.push(new Paragraph({ children: [new TextRun({ text: 'No requirements defined.', italics: true, color: '9b9991' })], spacing: { after: 120 } }))
  }

  // Section 4: Risk Management Reference
  sectionChildren.push(
    new Paragraph({ text: '4. Risk Management Reference', heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 } })
  )
  if (fmea) {
    const fmeaText = `${fmea.title || 'Risk Analysis'}${fmea.record_id ? ` — ${fmea.record_id}` : ''}, Revision ${fmea.revision || '1.0'}${fmea.doc_date ? `, ${new Date(fmea.doc_date).toLocaleDateString('en-GB')}` : ''}`
    sectionChildren.push(new Paragraph({ children: [new TextRun({ text: fmeaText, size: 20 })], spacing: { after: 120 } }))
  } else {
    sectionChildren.push(new Paragraph({ children: [new TextRun({ text: 'No risk analysis document found.', italics: true, color: '9b9991' })], spacing: { after: 120 } }))
  }

  // Section 5: Verification checklist
  if (questions.length > 0) {
    sectionChildren.push(
      new Paragraph({ text: '5. Requirements Verification', heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 } }),
      new Paragraph({ children: [new TextRun({ text: 'All software requirements have been verified as meeting the following criteria:', size: 20 })], spacing: { after: 120 } })
    )

    const verifHeaderRow = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Software requirements', bold: true, size: 18 })] })], width: { size: 85, type: WidthType.PERCENTAGE }, shading: { fill: 'f5f2ee' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '(Y/N)', bold: true, size: 18 })] })], width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: 'f5f2ee' } }),
      ]
    })
    const verifRows = questions.map((q, i) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${String.fromCharCode(97 + i)}) ${q}`, size: 18 })] })], width: { size: 85, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Y', bold: true, size: 18 })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        ]
      })
    )
    sectionChildren.push(
      new Table({ rows: [verifHeaderRow, ...verifRows], width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED }),
      new Paragraph({ children: [], spacing: { after: 200 } })
    )

    // Approved by
    const approverName = approved_by_name || session.name
    sectionChildren.push(
      new Paragraph({ children: [new TextRun({ text: `Verified and approved by: `, size: 20 }), new TextRun({ text: approverName, bold: true, size: 20 })], spacing: { after: 60 } }),
      new Paragraph({ children: [new TextRun({ text: `Date: ${today}`, size: 20 })], spacing: { after: 60 } }),
    )
  }

  // Build document
  const doc = new Document({
    numbering: { config: [{ reference: 'default-numbering', levels: [{ level: 0, format: NumberFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
    sections: [{
      properties: { type: SectionType.CONTINUOUS },
      headers: {
        default: new Header({
          children: [
            new Table({
              rows: [new TableRow({ children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: typeLabel, bold: true, size: 18 })] })], borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e0ddd8' } } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: project.name, size: 16, color: '6b6a64' })], alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e0ddd8' } } }),
              ]})],
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },  },
            }),
            new Paragraph({ children: [] }),
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({ children: [], border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'e0ddd8' } } }),
            new Table({
              rows: [new TableRow({ children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: project.footer_confidentiality || 'Confidential', size: 16, color: '8a96a2' })] })], borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE } } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: today, size: 16, color: '8a96a2' })], alignment: AlignmentType.CENTER })], borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE } } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ children: [PageNumber.CURRENT] })], alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE } } }),
              ]})],
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },  },
            }),
          ]
        })
      },
      children: sectionChildren,
    }],
  })

  const buffer = new Uint8Array(await Packer.toBuffer(doc))
  const filename = `${type}-requirements-${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  })
}
