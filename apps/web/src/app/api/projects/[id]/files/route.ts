// /api/projects/[id]/files/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = '/data/uploads'
const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar']

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._\-\s]/g, '')
    .replace(/\.\./g, '')
    .replace(/^\./, '')
    .trim()
    .slice(0, 200)
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const annex = searchParams.get('annex')

  const files = await query(
    `SELECT pf.*, u.name AS uploaded_by_name
     FROM project_files pf
     LEFT JOIN users u ON u.id = pf.uploaded_by
     WHERE pf.project_id = $1::uuid ${annex ? 'AND pf.annex = $2' : ''}
     ORDER BY pf.created_at DESC`,
    annex ? [params.id, annex] : [params.id]
  )

  const storage = await queryOne(
    `SELECT storage_limit_mb, storage_used_bytes FROM projects WHERE id = $1::uuid`,
    [params.id]
  )

  return NextResponse.json({ files, storage })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const annex = formData.get('annex') as string | null

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!annex) {
      return NextResponse.json({ error: 'No annex specified' }, { status: 400 })
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File too large. Maximum size is 3MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`
      }, { status: 413 })
    }

    // Check extension
    const originalName = file.name
    const ext = path.extname(originalName).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({
        error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
      }, { status: 415 })
    }

    // Sanitize filename
    const baseName = sanitizeFilename(path.basename(originalName, ext))
    if (!baseName) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    // Check storage limit
    const project = await queryOne(
      `SELECT storage_limit_mb, storage_used_bytes FROM projects WHERE id = $1::uuid`,
      [params.id]
    )
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const limitBytes = project.storage_limit_mb * 1024 * 1024
    const usedBytes = Number(project.storage_used_bytes) || 0
    if (usedBytes + file.size > limitBytes) {
      const usedMb = (usedBytes / 1024 / 1024).toFixed(1)
      return NextResponse.json({
        error: `Storage limit reached. Used: ${usedMb}MB / ${project.storage_limit_mb}MB. Please contact your admin to request more space.`,
        storage_full: true,
      }, { status: 507 })
    }

    // Create project upload directory
    const projectDir = path.join(UPLOAD_DIR, params.id)
    if (!existsSync(projectDir)) {
      await mkdir(projectDir, { recursive: true })
    }

    // Generate unique stored filename
    const uniqueId = crypto.randomBytes(8).toString('hex')
    const storedName = `${uniqueId}_${baseName}${ext}`
    const filePath = path.join(projectDir, storedName)

    // Write file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(filePath, buffer)

    // Save to DB
    const fileRecord = await queryOne(
      `INSERT INTO project_files (project_id, annex, uploaded_by, original_name, stored_name, file_size, mime_type)
       VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7)
       RETURNING *`,
      [params.id, annex, session.id, originalName, storedName, file.size, file.type || 'application/octet-stream']
    )

    // Update storage usage
    await query(
      `UPDATE projects SET storage_used_bytes = storage_used_bytes + $1 WHERE id = $2::uuid`,
      [file.size, params.id]
    )

    return NextResponse.json({ ...fileRecord, uploaded_by_name: session.name }, { status: 201 })

  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed: ' + (err.message || 'Unknown error') }, { status: 500 })
  }
}
