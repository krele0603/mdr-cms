path = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/projects/[id]/documents/[docId]/route.ts'
with open(path, 'r') as f:
    content = f.read()

# Remove the wrongly placed audit block from GET function
bad_block = """  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Audit status changes specifically
  if (body.status !== undefined) {
    await auditLog(session.id, 'document', params.docId, 'status_changed', {
      status: body.status,
      project_id: params.id,
    })
  } else if (body.content !== undefined) {
    await auditLog(session.id, 'document', params.docId, 'content_saved', {
      project_id: params.id,
    })
  }
  return NextResponse.json(doc)
}
export async function PATCH("""

good_get = """  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(doc)
}
export async function PATCH("""

content = content.replace(bad_block, good_get)

# Now find the end of PATCH and add the audit block there
old_patch_end = """  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(doc)
}"""

new_patch_end = """  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (body.status !== undefined) {
    await auditLog(session.id, 'document', params.docId, 'status_changed', {
      status: body.status,
      project_id: params.id,
    })
  } else if (body.content !== undefined) {
    await auditLog(session.id, 'document', params.docId, 'content_saved', {
      project_id: params.id,
    })
  }
  return NextResponse.json(doc)
}"""

# Replace only the last occurrence (PATCH return, not GET)
idx = content.rfind(old_patch_end)
if idx != -1:
    content = content[:idx] + new_patch_end + content[idx + len(old_patch_end):]
    print("✓ audit block moved to correct location in PATCH")
else:
    print("✗ could not find PATCH return — check file manually")

with open(path, 'w') as f:
    f.write(content)
