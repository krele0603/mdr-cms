import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = '/data/uploads/eqms'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.png', '.jpg', '.jpeg']

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._\-\s]/g, '')
    .replace(/\.\./g, '')
    .replace(/^\./, '')
    .trim()
    .slice(0, 200)
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const folder_id  = searchParams.get('folder_id')
  const record_id  = searchParams.get('record_id')
  const company_id = searchParams.get('company_id')

  if (!folder_id && !record_id) {
    return NextResponse.json({ error: 'folder_id or record_id required' }, { status: 400 })
  }

  const conditions: string[] = []
  const vals: any[] = []
  let i = 1

  if (folder_id)  { conditions.push(`f.folder_id = $${i++}::uuid`);  vals.push(folder_id) }
  if (record_id)  { conditions.push(`f.record_id = $${i++}::uuid`);  vals.push(record_id) }
  if (company_id) { conditions.push(`f.company_id = $${i++}::uuid`); vals.push(company_id) }

  // folder_id with no record_id = standalone files only
  if (folder_id && !record_id) conditions.push(`f.record_id IS NULL`)

  const files = await query(
    `SELECT f.*, u.name AS uploaded_by_name
     FROM eqms_files f
     LEFT JOIN users u ON u.id = f.uploaded_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY f.created_at DESC`,
    vals
  )

  return NextResponse.json(files)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file      = formData.get('file') as File | null
    const folder_id  = formData.get('folder_id') as string | null
    const company_id = formData.get('company_id') as string | null
    const record_id  = formData.get('record_id') as string | null

    if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!folder_id || !company_id) return NextResponse.json({ error: 'folder_id and company_id required' }, { status: 400 })

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large. Maximum size is 10MB.` }, { status: 413 })
    }

    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }, { status: 415 })
    }

    const baseName = sanitizeFilename(path.basename(file.name, ext))
    if (!baseName) return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })

    const companyDir = path.join(UPLOAD_DIR, company_id)
    if (!existsSync(companyDir)) await mkdir(companyDir, { recursive: true })

    const uniqueId = crypto.randomBytes(8).toString('hex')
    const storedName = `${uniqueId}_${baseName}${ext}`
    const filePath = path.join(companyDir, storedName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const fileRecord = await queryOne(
      `INSERT INTO eqms_files (company_id, folder_id, record_id, uploaded_by, original_name, stored_name, file_size, mime_type)
       VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5, $6, $7, $8)
       RETURNING *`,
      [company_id, folder_id, record_id ? record_id : null, session.id, file.name, storedName, file.size, file.type || 'application/octet-stream']
    )

    return NextResponse.json({ ...fileRecord, uploaded_by_name: session.name }, { status: 201 })
  } catch (err: any) {
    console.error('eQMS upload error:', err)
    return NextResponse.json({ error: 'Upload failed: ' + (err.message || 'Unknown error') }, { status: 500 })
  }
}
