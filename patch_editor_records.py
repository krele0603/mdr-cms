path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/companies/[id]/documents/[docId]/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# 1. Add useSearchParams import
if 'useSearchParams' not in content:
    content = content.replace(
        "import { useParams, useRouter } from 'next/navigation'",
        "import { useParams, useRouter, useSearchParams } from 'next/navigation'"
    )

# 2. Add isRecord detection after params
old_params = "  const companyId = params.id as string\n  const docId = params.docId as string"
new_params = """  const companyId = params.id as string
  const docId = params.docId as string
  const searchParams = useSearchParams()
  const isRecord = searchParams.get('type') === 'record'"""
content = content.replace(old_params, new_params)

# 3. Replace API calls in loadDoc to use records endpoint when isRecord
old_load = "    const [docRes, companyRes] = await Promise.all([\n      fetch(`/api/eqms/documents/${docId}`),\n      fetch(`/api/companies/${companyId}`),\n    ])"
new_load = """    const [docRes, companyRes] = await Promise.all([
      fetch(isRecord ? `/api/eqms/records/${docId}` : `/api/eqms/documents/${docId}`),
      fetch(`/api/companies/${companyId}`),
    ])"""
content = content.replace(old_load, new_load)

# 4. Replace saveContent API call
old_save = "      const res = await fetch(`/api/eqms/documents/${docId}`, {\n        method: 'PATCH', headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ content }),\n      })"
new_save = """      const res = await fetch(isRecord ? `/api/eqms/records/${docId}` : `/api/eqms/documents/${docId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })"""
content = content.replace(old_save, new_save)

# 5. Replace submitForApproval API call
old_submit = "    const res = await fetch(`/api/eqms/documents/${docId}/submit`, {"
new_submit = "    const res = await fetch(isRecord ? `/api/eqms/records/${docId}/submit` : `/api/eqms/documents/${docId}/submit`, {"
content = content.replace(old_submit, new_submit)

# 6. Replace approve API call
old_approve = "    const res = await fetch(`/api/eqms/documents/${docId}/approve`, { method: 'POST' })"
new_approve = "    const res = await fetch(isRecord ? `/api/eqms/records/${docId}/approve` : `/api/eqms/documents/${docId}/approve`, { method: 'POST' })"
content = content.replace(old_approve, new_approve)

# 7. Replace createRevision API call
old_revise = "    const res = await fetch(`/api/eqms/documents/${docId}/revise`, { method: 'POST' })"
new_revise = "    const res = await fetch(isRecord ? `/api/eqms/records/${docId}/revise` : `/api/eqms/documents/${docId}/revise`, { method: 'POST' })"
content = content.replace(old_revise, new_revise)

# 8. Update breadcrumb level label for records
old_breadcrumb = "          {meta && <Link href={`/dashboard/companies/${companyId}/eqms/${doc.level}`} style={{ color: '#9b9991', textDecoration: 'none' }}>{meta.label}</Link>}"
new_breadcrumb = "          {meta && <Link href={`/dashboard/companies/${companyId}/eqms/${isRecord ? 5 : doc.level}`} style={{ color: '#9b9991', textDecoration: 'none' }}>{isRecord ? 'Records' : meta.label}</Link>}"
content = content.replace(old_breadcrumb, new_breadcrumb)

with open(path, 'w') as f:
    f.write(content)

print("✓ eqms document editor patched to handle records")

# Check what was changed
changes = [
    'useSearchParams' in content,
    'isRecord' in content,
    'api/eqms/records' in content,
]
print(f"  useSearchParams: {changes[0]}")
print(f"  isRecord: {changes[1]}")
print(f"  records API: {changes[2]}")
