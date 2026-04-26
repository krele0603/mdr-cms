#!/usr/bin/env python3
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

fixes = 0

# 1. Add a ref to track whether doc content has been loaded into editor
old1 = "  const latestContent = useRef<any>(null)"
new1 = """  const latestContent = useRef<any>(null)
  const contentLoaded = useRef<boolean>(false)"""

if old1 in content and 'contentLoaded' not in content:
    content = content.replace(old1, new1)
    fixes += 1
    print('Added contentLoaded ref')

# 2. Guard onUpdate so it only fires after content is loaded
old2 = """    onUpdate: ({ editor }) => {
      const content = editor.getJSON()
      latestContent.current = content
      setSaveState('unsaved')
      setWordCount(editor.storage.characterCount?.words() ?? 0)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(content), 2000)
    },"""

new2 = """    onUpdate: ({ editor }) => {
      if (!contentLoaded.current) return // Don't save until doc content is loaded
      const content = editor.getJSON()
      latestContent.current = content
      setSaveState('unsaved')
      setWordCount(editor.storage.characterCount?.words() ?? 0)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(content), 2000)
    },"""

if old2 in content:
    content = content.replace(old2, new2)
    fixes += 1
    print('Guarded onUpdate with contentLoaded check')

# 3. Set contentLoaded to true after setContent is called
old3 = """    if (doc.content && Object.keys(doc.content).length > 0) {
      editor.commands.setContent(doc.content)
      setWordCount(editor.storage.characterCount?.words() ?? 0)
    }
  }, [editor, doc])"""

new3 = """    if (doc.content && Object.keys(doc.content).length > 0) {
      editor.commands.setContent(doc.content)
      setWordCount(editor.storage.characterCount?.words() ?? 0)
    }
    // Mark content as loaded so autosave can begin
    contentLoaded.current = true
  }, [editor, doc])"""

if old3 in content:
    content = content.replace(old3, new3)
    fixes += 1
    print('Set contentLoaded after setContent')
else:
    print('WARNING: Could not find setContent block')

with open(FILE, 'w') as f:
    f.write(content)

print(f'Done. {fixes} fixes applied.')
