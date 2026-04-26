#!/usr/bin/env python3
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# Add useEffect after the variables load to force re-render of variable nodes
old = "  useEffect(() => { if (showComments) loadComments() }, [showComments])"

new = """  // Re-render variable chips when variable values load
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
  }, [variables, editor])

  useEffect(() => { if (showComments) loadComments() }, [showComments])"""

if old in content:
    content = content.replace(old, new)
    print('Fixed: variable chip re-render useEffect added')
else:
    print('Pattern not found')

with open(FILE, 'w') as f:
    f.write(content)
print('done')
