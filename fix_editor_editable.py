#!/usr/bin/env python3
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# The editor is created with content: '' then editorProps
# We need to update editable dynamically after doc loads
# Simplest fix: use editor.setEditable() in a useEffect when isApproved+isClient

old = "  useEffect(() => {\n    if (!editor || !doc) return\n    if (doc.content && Object.keys(doc.content).length > 0) {\n      editor.commands.setContent(doc.content)\n      setWordCount(editor.storage.characterCount?.words() ?? 0)\n    }\n  }, [editor, doc])"

new = """  useEffect(() => {
    if (!editor || !doc) return
    if (doc.content && Object.keys(doc.content).length > 0) {
      editor.commands.setContent(doc.content)
      setWordCount(editor.storage.characterCount?.words() ?? 0)
    }
  }, [editor, doc])

  // Set editor read-only for approved docs viewed by client
  useEffect(() => {
    if (!editor) return
    const shouldBeReadOnly = userRole === 'client' && docStatus === 'approved'
    editor.setEditable(!shouldBeReadOnly)
  }, [editor, userRole, docStatus])"""

if old in content:
    content = content.replace(old, new)
    print('Fixed: editor editable useEffect added')
else:
    print('Pattern not found - trying alternate')
    # Try finding just the setContent effect
    idx = content.find('editor.commands.setContent(doc.content)')
    if idx >= 0:
        print(f'Found setContent at char {idx}')
        print(repr(content[idx-100:idx+200]))

with open(FILE, 'w') as f:
    f.write(content)
print('done')
