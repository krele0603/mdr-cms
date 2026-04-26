import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await query(
    `UPDATE notifications SET read = TRUE WHERE user_id = $1::uuid AND read = FALSE`,
    [session.id]
  )

  return NextResponse.json({ ok: true })
}
