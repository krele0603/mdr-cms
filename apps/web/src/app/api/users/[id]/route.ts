import { NextRequest, NextResponse } from 'next/server'
import { getSession, hashPassword } from '@/lib/auth'
import { query, queryOne, auditLog } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { name, role, active, password, company_id } = body
  const user = await queryOne('SELECT id FROM users WHERE id = $1::uuid', [params.id])
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (name !== undefined)
    await query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2::uuid', [name, params.id])
  if (role !== undefined)
    await query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2::uuid', [role, params.id])
  if (active !== undefined)
    await query('UPDATE users SET active = $1, updated_at = NOW() WHERE id = $2::uuid', [active, params.id])
  if (password) {
    const hash = await hashPassword(password)
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2::uuid', [hash, params.id])
  }
  if (company_id !== undefined)
    await query('UPDATE users SET company_id = $1::uuid, updated_at = NOW() WHERE id = $2::uuid', [company_id || null, params.id])
  await auditLog(session.id, 'user', params.id, 'updated', { fields: Object.keys(body) })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (params.id === session.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }
  const uid = params.id
  // Hard delete membership/log tables
  await query('DELETE FROM project_members WHERE user_id = $1::uuid', [uid])
  await query('DELETE FROM company_members WHERE user_id = $1::uuid', [uid])
  await query('DELETE FROM notifications WHERE user_id = $1::uuid', [uid])
  await query('DELETE FROM messages WHERE sender_id = $1::uuid OR recipient_id = $1::uuid', [uid])
  await query('DELETE FROM audit_log WHERE user_id = $1::uuid', [uid])
  await query('DELETE FROM document_history WHERE user_id = $1::uuid', [uid])
  // NULL out eqms_folder_access
  await query('DELETE FROM eqms_folder_access WHERE user_id = $1::uuid', [uid])
  await query('UPDATE eqms_folder_access SET granted_by = NULL WHERE granted_by = $1::uuid', [uid])
  // NULL out created_by / author / approved_by across all tables
  await query('UPDATE projects SET created_by = NULL WHERE created_by = $1::uuid', [uid])
  await query('UPDATE templates SET created_by = NULL WHERE created_by = $1::uuid', [uid])
  await query('UPDATE template_versions SET created_by = NULL WHERE created_by = $1::uuid', [uid])
  await query('UPDATE template_examples SET created_by = NULL WHERE created_by = $1::uuid', [uid])
  await query('UPDATE document_lists SET created_by = NULL WHERE created_by = $1::uuid', [uid])
  await query('UPDATE project_documents SET approved_by = NULL WHERE approved_by = $1::uuid', [uid])
  await query('UPDATE project_documents SET assigned_to = NULL WHERE assigned_to = $1::uuid', [uid])
  await query('UPDATE project_variables SET suggested_by = NULL WHERE suggested_by = $1::uuid', [uid])
  await query('UPDATE project_variables SET approved_by = NULL WHERE approved_by = $1::uuid', [uid])
  await query('UPDATE project_files SET uploaded_by = NULL WHERE uploaded_by = $1::uuid', [uid])
  await query('UPDATE project_req_documents SET updated_by = NULL WHERE updated_by = $1::uuid', [uid])
  await query('UPDATE document_comments SET author_id = NULL WHERE author_id = $1::uuid', [uid])
  await query('UPDATE document_comments SET resolved_by = NULL WHERE resolved_by = $1::uuid', [uid])
  await query('UPDATE eqms_folders SET created_by = NULL WHERE created_by = $1::uuid', [uid])
  await query('UPDATE eqms_documents SET created_by = NULL WHERE created_by = $1::uuid', [uid])
  await query('UPDATE eqms_document_versions SET created_by = NULL WHERE created_by = $1::uuid', [uid])
  await query('UPDATE eqms_document_versions SET approved_by = NULL WHERE approved_by = $1::uuid', [uid])
  await query('UPDATE eqms_records SET created_by = NULL WHERE created_by = $1::uuid', [uid])
  await query('UPDATE eqms_record_versions SET created_by = NULL WHERE created_by = $1::uuid', [uid])
  await query('UPDATE eqms_record_versions SET approved_by = NULL WHERE approved_by = $1::uuid', [uid])
  await query('DELETE FROM eqms_approvals WHERE requested_by = $1::uuid', [uid])
  await query('UPDATE eqms_approvals SET reviewed_by = NULL WHERE reviewed_by = $1::uuid', [uid])
  await query('UPDATE structured_templates SET created_by = NULL WHERE created_by = $1::uuid', [uid])
  await query('UPDATE company_members SET added_by = $2::uuid WHERE added_by = $1::uuid', [uid, session.id])
  // Delete the user
  await query('DELETE FROM users WHERE id = $1::uuid', [uid])
  await auditLog(session.id, 'user', uid, 'deleted', { user_id: uid })
  return NextResponse.json({ ok: true })
}
