import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  await queryOne(
    `INSERT INTO company_members (company_id, user_id, added_by)
     VALUES ($1::uuid, $2::uuid, $3::uuid)
     ON CONFLICT DO NOTHING`,
    [params.id, user_id, session.id]
  )
  // Also update user's company_id if they are client/client-MR
  await query(
    `UPDATE users SET company_id = $1::uuid
     WHERE id = $2::uuid AND role IN ('client', 'client-MR')`,
    [params.id, user_id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user_id = req.nextUrl.searchParams.get('user_id')
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  await query(
    `DELETE FROM company_members WHERE company_id=$1::uuid AND user_id=$2::uuid`,
    [params.id, user_id]
  )
  return NextResponse.json({ ok: true })
}
