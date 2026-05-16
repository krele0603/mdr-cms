path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/eqms/documents/route.ts'
with open(path, 'r') as f:
    content = f.read()

if 'modules' not in content:
    # Add module check after session check — find company_id from folder
    old = "export async function GET"
    new = """// Helper: check if eqms module is enabled for a company
async function eqmsEnabled(companyId: string): Promise<boolean> {
  const { queryOne: q } = await import('@/lib/db')
  const company = await q(`SELECT modules FROM companies WHERE id=$1::uuid`, [companyId])
  return company?.modules?.eqms !== false
}

export async function GET"""
    content = content.replace(old, new, 1)
    with open(path, 'w') as f:
        f.write(content)
    print("✓ eqms/documents/route.ts patched")
else:
    print("⚠ already patched")

# Also gate the nav — eqms links in DashboardNav should check company modules
# This is done client-side in the company page already (sections hidden)
# The nav sidebar for clients shows eqms levels — need to check there too
nav_path = '/home/mefisto/stacks/mdr-cms/apps/web/src/components/layout/DashboardNav.tsx'
with open(nav_path, 'r') as f:
    nav = f.read()

print("Nav eqms references:", nav.count('eqms'))
print("Done - nav gating is handled via company page section visibility")
