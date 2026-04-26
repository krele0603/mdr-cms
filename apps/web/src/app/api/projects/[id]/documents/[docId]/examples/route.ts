import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string; docId: string } }

// GET - list examples assigned to this document, plus available ones from template
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get assigned examples
  const assigned = await query(`
    SELECT pde.id AS assignment_id, pde.sort_order,
           te.id, te.name, te.description, te.content
    FROM project_document_examples pde
    JOIN template_examples te ON te.id = pde.template_example_id
    WHERE pde.project_document_id = $1::uuid
    ORDER BY pde.sort_order ASC
  `, [params.docId])

  // Get all available examples for the template this document uses
  const available = await query(`
    SELECT DISTINCT te.id, te.name, te.description
    FROM template_examples te
    JOIN template_versions tv ON tv.template_id = te.template_id
    JOIN project_documents pd ON pd.template_version_id = tv.id
    WHERE pd.id = $1::uuid
    ORDER BY te.name ASC
  `, [params.docId])

  return NextResponse.json({ assigned, available })
}

// POST - assign an example to this document
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { template_example_id } = body

  if (!template_example_id) {
    return NextResponse.json({ error: 'template_example_id is required' }, { status: 400 })
  }

  // Get next sort_order
  const maxOrder = await queryOne(
    `SELECT COALESCE(MAX(sort_order), -1) AS max FROM project_document_examples WHERE project_document_id = $1::uuid`,
    [params.docId]
  )

  const assignment = await queryOne(`
    INSERT INTO project_document_examples (project_document_id, template_example_id, sort_order)
    VALUES ($1::uuid, $2::uuid, $3)
    ON CONFLICT (project_document_id, template_example_id) DO NOTHING
    RETURNING id, template_example_id, sort_order
  `, [params.docId, template_example_id, (maxOrder?.max ?? -1) + 1])

  return NextResponse.json(assignment, { status: 201 })
}

// DELETE - remove an example assignment
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const templateExampleId = searchParams.get('template_example_id')

  if (!templateExampleId) {
    return NextResponse.json({ error: 'template_example_id is required' }, { status: 400 })
  }

  await query(
    `DELETE FROM project_document_examples WHERE project_document_id = $1::uuid AND template_example_id = $2::uuid`,
    [params.docId, templateExampleId]
  )

  return NextResponse.json({ ok: true })
}
