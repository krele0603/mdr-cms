import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

type Params = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const row = await queryOne(
    `SELECT id, name, level, content, status, created_at, updated_at FROM qms_templates WHERE id = $1::uuid`,
    [params.id]
  )
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'consultant'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, content } = body

  const updates: string[] = ['updated_at = NOW()']
  const values: any[] = []

  if (name?.trim()) {
    values.push(name.trim())
    updates.push(`name = $${values.length}`)
  }
  if (content) {
    values.push(JSON.stringify(content))
    updates.push(`content = $${values.length}`)
  }

  values.push(params.id)
  const row = await queryOne(
    `UPDATE qms_templates SET ${updates.join(', ')} WHERE id = $${values.length}::uuid RETURNING id, name, level, status, updated_at`,
    values
  )
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin')
    return NextResponse.json({ error: 'Only admin can delete templates' }, { status: 403 })

  await query(
    `UPDATE qms_templates SET status = 'archived', updated_at = NOW() WHERE id = $1::uuid`,
    [params.id]
  )
  return NextResponse.json({ ok: true })
}
