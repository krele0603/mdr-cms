import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = '/data/uploads/eqms'

export async function GET(req: NextRequest, { params }: { params: { fileId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const file = await queryOne(
    `SELECT * FROM eqms_files WHERE id = $1::uuid`,
    [params.fileId]
  )
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const filePath = path.join(UPLOAD_DIR, file.company_id, file.stored_name)
  if (!existsSync(filePath)) return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })

  const buffer = await readFile(filePath)
  const ext = path.extname(file.original_name).toLowerCase()

  // PDFs open inline, everything else downloads
  const isPdf = ext === '.pdf'
  const disposition = isPdf ? 'inline' : `attachment; filename="${file.original_name}"`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': file.mime_type || 'application/octet-stream',
      'Content-Disposition': disposition,
      'Content-Length': String(file.file_size),
    }
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { fileId: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const file = await queryOne(
    `SELECT * FROM eqms_files WHERE id = $1::uuid`,
    [params.fileId]
  )
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete from disk
  const filePath = path.join('/data/uploads/eqms', file.company_id, file.stored_name)
  try {
    const { unlink } = await import('fs/promises')
    if (existsSync(filePath)) await unlink(filePath)
  } catch (e) { /* ignore disk errors */ }

  await import('@/lib/db').then(({ query }) =>
    query(`DELETE FROM eqms_files WHERE id = $1::uuid`, [params.fileId])
  )

  return NextResponse.json({ ok: true })
}
