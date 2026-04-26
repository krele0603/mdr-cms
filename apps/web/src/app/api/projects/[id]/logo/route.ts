import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

type Params = { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { logo } = body

  if (!logo) return NextResponse.json({ error: 'No logo provided' }, { status: 400 })
  if (!logo.startsWith('data:image/')) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
  if (logo.length > 700000) return NextResponse.json({ error: 'Logo too large. Max 500KB.' }, { status: 400 })

  await query(
    `UPDATE projects SET header_logo_url = $1, updated_at = NOW() WHERE id = $2::uuid`,
    [logo, params.id]
  )

  return NextResponse.json({ ok: true, logo })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || !['admin', 'consultant'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await query(
    `UPDATE projects SET header_logo_url = NULL, updated_at = NOW() WHERE id = $1::uuid`,
    [params.id]
  )

  return NextResponse.json({ ok: true })
}
