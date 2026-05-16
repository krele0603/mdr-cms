import { Pool } from 'pg'
const globalForPg = global as unknown as { pool: Pool }
export const pool = globalForPg.pool || new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})
if (process.env.NODE_ENV !== 'production') {
  globalForPg.pool = pool
}
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result.rows
  } finally {
    client.release()
  }
}
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] || null
}

// ── Audit log helper ─────────────────────────────────────────────────────────
// Call this after any important action. Never throws — audit failures are silent.
export async function auditLog(
  userId: string | null,
  entityType: string,
  entityId: string,
  action: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (user_id, entity_type, entity_id, action, metadata)
       VALUES ($1, $2, $3::uuid, $4, $5)`,
      [userId || null, entityType, entityId, action, JSON.stringify(metadata)]
    )
  } catch (e) {
    // Never crash the request over an audit failure
    console.error('[audit] failed to write log:', e)
  }
}
