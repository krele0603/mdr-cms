#!/usr/bin/env node
// Run this once to set the admin password
// Usage: node scripts/set-admin-password.js

const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://mdrcms:' + process.env.POSTGRES_PASSWORD + '@localhost:5432/mdrcms'
})

async function main() {
  const password = process.argv[2]
  if (!password) {
    console.error('Usage: node scripts/set-admin-password.js <password>')
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)

  await pool.query(
    `INSERT INTO users (email, name, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
    ['admin@mdrcms.local', 'Admin', hash, 'admin']
  )

  console.log('✓ Admin password set successfully')
  console.log('  Email:', 'admin@mdrcms.local')
  console.log('  Password:', password)
  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
