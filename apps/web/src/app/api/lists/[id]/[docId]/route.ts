import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await query(
    'DELETE FROM list_documents WHERE id = $1::uuid AND list_id = $2::uuid',
    [params.docId, params.id]
  )

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, code } = await req.json()
  if (!name || !code) return NextResponse.json({ error: 'Name and code required' }, { status: 400 })

  await query(
    'UPDATE list_documents SET name = $1, code = $2 WHERE id = $3::uuid AND list_id = $4::uuid',
    [name, code, params.docId, params.id]
  )

  return NextResponse.json({ ok: true })
}

