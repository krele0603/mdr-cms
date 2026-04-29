// /api/projects/[id]/files/[fileId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = '/data/uploads'

type Params = { params: { id: string; fileId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const file = await queryOne(
    `SELECT * FROM project_files WHERE id = $1::uuid AND project_id = $2::uuid`,
    [params.fileId, params.id]
  )
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const filePath = path.join(UPLOAD_DIR, params.id, file.stored_name)
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
  }

  const buffer = await readFile(filePath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': file.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.original_name)}"`,
      'Content-Length': String(file.file_size),
    },
  })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admin/consultant or the uploader can delete
  const file = await queryOne(
    `SELECT * FROM project_files WHERE id = $1::uuid AND project_id = $2::uuid`,
    [params.fileId, params.id]
  )
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canDelete = ['admin', 'consultant'].includes(session.role) || file.uploaded_by === session.id
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Delete from disk
  const filePath = path.join(UPLOAD_DIR, params.id, file.stored_name)
  if (existsSync(filePath)) {
    await unlink(filePath)
  }

  // Delete from DB and update storage usage
  await query(`DELETE FROM project_files WHERE id = $1::uuid`, [params.fileId])
  await query(
    `UPDATE projects SET storage_used_bytes = GREATEST(0, storage_used_bytes - $1) WHERE id = $2::uuid`,
    [file.file_size, params.id]
  )

  return NextResponse.json({ ok: true })
}
