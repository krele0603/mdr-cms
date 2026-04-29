// /api/projects/[id]/storage/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storage = await queryOne(
    `SELECT storage_limit_mb, storage_used_bytes FROM projects WHERE id = $1::uuid`,
    [params.id]
  )
  return NextResponse.json(storage)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 })
  }

  // Add 50MB to storage limit
  await query(
    `UPDATE projects SET storage_limit_mb = storage_limit_mb + 50 WHERE id = $1::uuid`,
    [params.id]
  )

  const storage = await queryOne(
    `SELECT storage_limit_mb, storage_used_bytes FROM projects WHERE id = $1::uuid`,
    [params.id]
  )
  return NextResponse.json(storage)
}
