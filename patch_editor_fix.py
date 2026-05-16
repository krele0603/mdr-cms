path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/companies/[id]/documents/[docId]/page.tsx'
with open(path, 'r') as f:
    content = f.read()

# 1. Remove useSearchParams import
content = content.replace(
    "import { useParams, useRouter, useSearchParams } from 'next/navigation'",
    "import { useParams, useRouter } from 'next/navigation'"
)

# 2. Replace isRecord detection - use pathname instead
old_params = """  const companyId = params.id as string
  const docId = params.docId as string
  const searchParams = useSearchParams()
  const isRecord = searchParams.get('type') === 'record'"""

new_params = """  const companyId = params.id as string
  const docId = params.docId as string
  const [isRecord, setIsRecord] = useState(false)"""

content = content.replace(old_params, new_params)

# 3. Replace the loadDoc fetch to auto-detect record vs document
old_load = """    const [docRes, companyRes] = await Promise.all([
      fetch(isRecord ? `/api/eqms/records/${docId}` : `/api/eqms/documents/${docId}`),
      fetch(`/api/companies/${companyId}`),
    ])"""

new_load = """    // Auto-detect: try records first, fall back to documents
    const [recRes, companyRes] = await Promise.all([
      fetch(`/api/eqms/records/${docId}`),
      fetch(`/api/companies/${companyId}`),
    ])
    const isRec = recRes.ok
    setIsRecord(isRec)
    const docRes = isRec ? recRes : await fetch(`/api/eqms/documents/${docId}`)"""

content = content.replace(old_load, new_load)

with open(path, 'w') as f:
    f.write(content)

print("✓ Fixed: useSearchParams removed, auto-detection added")
