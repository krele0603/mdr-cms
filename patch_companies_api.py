path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/companies/[id]/route.ts'
with open(path, 'r') as f:
    content = f.read()

# 1. Add modules to GET select
content = content.replace(
    '`SELECT id, name, country, contact, email, created_at FROM companies WHERE id=$1::uuid`',
    '`SELECT id, name, country, contact, email, created_at, modules FROM companies WHERE id=$1::uuid`'
)

# 2. Add modules to PATCH
old_patch = "  const { name, country, contact, email } = await req.json()"
new_patch = "  const { name, country, contact, email, modules } = await req.json()"
content = content.replace(old_patch, new_patch)

old_update = """  const company = await queryOne(
    `UPDATE companies SET
       name    = COALESCE($1, name),
       country = COALESCE($2, country),
       contact = COALESCE($3, contact),
       email   = COALESCE($4, email)
     WHERE id = $5::uuid RETURNING id, name, country, contact, email`,
    [name || null, country || null, contact || null, email || null, params.id]
  )"""

new_update = """  const company = await queryOne(
    `UPDATE companies SET
       name    = COALESCE($1, name),
       country = COALESCE($2, country),
       contact = COALESCE($3, contact),
       email   = COALESCE($4, email),
       modules = COALESCE($5, modules)
     WHERE id = $6::uuid RETURNING id, name, country, contact, email, modules`,
    [name || null, country || null, contact || null, email || null, modules ? JSON.stringify(modules) : null, params.id]
  )"""
content = content.replace(old_update, new_update)

with open(path, 'w') as f:
    f.write(content)
print("✓ companies/[id]/route.ts patched")
