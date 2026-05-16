import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Return the raw JWT string so the TipTap client can pass it to Hocuspocus
  const token = cookies().get('session')?.value
  return NextResponse.json({ token })
}
