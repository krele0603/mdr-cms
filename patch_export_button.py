#!/usr/bin/env python3
"""
Adds export button to document editor top bar.
Run: python3 patch_export_button.py
"""

import re

FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/documents/[docId]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# 1. Add exporting state after submitting state
if 'const [exporting, setExporting] = useState(false)' not in content:
    content = content.replace(
        'const [submitting, setSubmitting] = useState(false)',
        'const [submitting, setSubmitting] = useState(false)\n  const [exporting, setExporting] = useState(false)'
    )

# 2. Add export function after submitForReview function
export_fn = '''
  async function exportDoc(fmt: 'docx') {
    setExporting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/export?format=${fmt}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || `document.${fmt}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Export failed: ' + e.message)
    } finally {
      setExporting(false)
    }
  }
'''

if 'async function exportDoc' not in content:
    content = content.replace(
        'async function submitForReview()',
        export_fn + '\n  async function submitForReview()'
    )

# 3. Add export button in top bar — insert after the "Show/Hide example" button
export_btn = '''
          {/* Export button */}
          <button
            onClick={() => exportDoc('docx')}
            disabled={exporting}
            style={{
              height: 28, padding: '0 12px', fontSize: 12, cursor: exporting ? 'default' : 'pointer',
              background: 'transparent',
              border: '0.5px solid rgba(0,0,0,0.15)',
              borderRadius: 6, color: '#5a6472',
              opacity: exporting ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {exporting ? 'Exporting…' : 'Export DOCX'}
          </button>'''

# Insert before the closing </div> of the right controls section
# Find the last button in the top bar (the show/hide example button) and add after it
target = "            {showReference ? 'Hide example' : 'Show example'}\n          </button>\n        </div>\n      </div>"
replacement = "            {showReference ? 'Hide example' : 'Show example'}\n          </button>\n" + export_btn + "\n        </div>\n      </div>"

if 'Export DOCX' not in content:
    content = content.replace(target, replacement)

with open(FILE, 'w') as f:
    f.write(content)

print('✓ Export button patched successfully')
