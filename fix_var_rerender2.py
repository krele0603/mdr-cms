#!/usr/bin/env python3
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

old = """  // Re-render variable chips when variable values load
  useEffect(() => {
    if (!editor || variables.length === 0) return
    // Update all variable node views by replacing their DOM content
    const dom = editor.view.dom
    dom.querySelectorAll('[data-variable]').forEach((el: Element) => {
      const tag = el.getAttribute('data-variable')
      if (!tag) return
      const value = (window as any).__projectVariables?.[tag] || null
      el.textContent = value || tag
      el.className = value ? 'variable-chip' : 'variable-chip variable-chip--empty'
    })
  }, [variables, editor])"""

new = """  // Re-render variable chips when variable values load
  useEffect(() => {
    if (variables.length === 0) return
    document.querySelectorAll('[data-variable]').forEach((el: Element) => {
      const tag = el.getAttribute('data-variable')
      if (!tag) return
      const value = (window as any).__projectVariables?.[tag] || null
      el.textContent = value || tag
      el.className = value ? 'variable-chip' : 'variable-chip variable-chip--empty'
    })
  }, [variables])"""

if old in content:
    content = content.replace(old, new)
    print('Fixed')
else:
    print('Pattern not found')
    # Show what we have around that area
    idx = content.find('Re-render variable chips')
    if idx >= 0:
        print(repr(content[idx:idx+400]))

with open(FILE, 'w') as f:
    f.write(content)
print('done')
