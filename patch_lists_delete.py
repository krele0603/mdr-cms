#!/usr/bin/env python3
"""
Adds delete functionality to TF Structures (lists) page.
Uses line-based insertion to avoid dealing with corrupted markdown links.
"""

FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/lists/page.tsx'

with open(FILE, 'r') as f:
    lines = f.readlines()

# Find key line numbers
load_lists_line = None
list_card_end_line = None  # line with closing </div> of list card
builtin_badge_line = None

for i, line in enumerate(lines):
    if 'async function loadLists' in line and load_lists_line is None:
        load_lists_line = i
    if 'Built-in' in line and 'Custom' in line and builtin_badge_line is None:
        builtin_badge_line = i

print(f'loadLists at line {load_lists_line + 1}')
print(f'builtin badge at line {builtin_badge_line + 1}')

# 1. Insert deleteList function before loadLists
if load_lists_line is not None and 'deleteList' not in ''.join(lines):
    delete_fn = """  async function deleteList(id: string, name: string) {
    if (!confirm(`Delete TF Structure "${name}"? Projects using it will not be affected.`)) return
    const res = await fetch(`/api/lists/${id}`, { method: 'DELETE' })
    if (res.ok) {
      loadLists()
      if (activeListId === id) setActiveListId(null)
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'Failed to delete')
    }
  }

"""
    lines.insert(load_lists_line, delete_fn)
    print('Inserted deleteList function')
    # Recalculate builtin_badge_line since we inserted lines
    builtin_badge_line += 1
else:
    print('deleteList already exists or loadLists not found')

# 2. Find the list card div and add delete button for custom lists
# The card ends a few lines after the doc_count line
# Find the closing </div> of the card
with open(FILE, 'w') as f:
    f.writelines(lines)

# Now re-read and do text replacement for the delete button
with open(FILE, 'r') as f:
    content = f.read()

# Add delete button inside the card for custom (non-builtin) lists
# Find the pattern of the card's inner content end
# The card has: badge div, name div, doc_count div, then closes
# We want to add a delete button after doc_count div but before card closes

old_card_end = """              {Number(l.doc_count)} document{Number(l.doc_count) !== 1 ? 's' : ''} configured
            </div>
          </div>"""

new_card_end = """              {Number(l.doc_count)} document{Number(l.doc_count) !== 1 ? 's' : ''} configured
            </div>
            {!l.is_builtin && (
              <button
                onClick={e => { e.stopPropagation(); deleteList(l.id, l.name) }}
                style={{ marginTop: 8, height: 22, padding: '0 8px', fontSize: 10, background: 'transparent', border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 4, color: '#943030', cursor: 'pointer' }}
              >
                Delete
              </button>
            )}
          </div>"""

if old_card_end in content:
    content = content.replace(old_card_end, new_card_end)
    print('Added delete button to list card')
else:
    # Try without the markdown corruption
    print('Trying alternate pattern...')
    # Find the doc_count line and the following closing divs
    import re
    pattern = r'(\{Number\(l\.doc_count\)[^\n]+\n\s+</div>\n\s+</div>)'
    match = re.search(pattern, content)
    if match:
        old = match.group(0)
        new = old.replace('          </div>', """          </div>
            {!l.is_builtin && (
              <button
                onClick={e => { e.stopPropagation(); deleteList(l.id, l.name) }}
                style={{ marginTop: 8, height: 22, padding: '0 8px', fontSize: 10, background: 'transparent', border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 4, color: '#943030', cursor: 'pointer' }}
              >
                Delete
              </button>
            )}""", 1)
        content = content.replace(old, new)
        print('Added delete button via regex')
    else:
        print('WARNING: Could not find card end pattern')

with open(FILE, 'w') as f:
    f.write(content)
print('Done')
