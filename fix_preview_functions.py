#!/usr/bin/env python3
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/templates/[id]/page.tsx'

with open(FILE, 'r') as f:
    lines = f.readlines()

# Insert before line 475 (0-indexed: 474)
insert_at = 474

new_functions = """  async function previewVersion(versionId: string) {
    if (previewVersionId === versionId) {
      setPreviewVersionId(null)
      if (template?.content) templateEditor?.commands.setContent(template.content)
      templateEditor?.setEditable(true)
      return
    }
    const res = await fetch(`/api/templates/${templateId}/versions/${versionId}`)
    if (res.ok) {
      const data = await res.json()
      setPreviewVersionId(versionId)
      if (templateEditor && data.content) {
        templateEditor.setEditable(false)
        templateEditor.commands.setContent(data.content)
      }
    }
  }

  function restoreCurrentVersion() {
    setPreviewVersionId(null)
    if (templateEditor) {
      templateEditor.setEditable(true)
      if (template?.content) templateEditor.commands.setContent(template.content)
    }
  }

"""

lines.insert(insert_at, new_functions)

with open(FILE, 'w') as f:
    f.writelines(lines)

print(f'Inserted previewVersion and restoreCurrentVersion before line 475')
print('done')
