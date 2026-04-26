#!/usr/bin/env python3
"""
Updates DOCX export route to resolve $variable nodes before export.
Run: python3 patch_export_variables.py
"""

FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/api/projects/[id]/documents/[docId]/export/route.ts'

with open(FILE, 'r') as f:
    content = f.read()

# Add variable resolution before conversion
if 'resolveVariablesInContent' not in content:
    # Add import
    content = content.replace(
        "import { NextRequest, NextResponse } from 'next/server'",
        "import { NextRequest, NextResponse } from 'next/server'\nimport { resolveVariablesInContent } from '@/lib/variable-node'"
    )

    # Load variables and resolve before converting
    old = "    // Convert content\n    const content = doc.content || {}"
    new = """    // Load project variables for resolution
    const { query: dbQuery } = await import('@/lib/db')
    const vars = await dbQuery(
      `SELECT tag, value FROM project_variables WHERE project_id = $1::uuid AND value != ''`,
      [params.id]
    )

    // Convert content - resolve variable nodes first
    const rawContent = doc.content || {}
    const content = Object.keys(rawContent).length > 0
      ? resolveVariablesInContent(rawContent, vars as any[])
      : rawContent"""

    if old in content:
        content = content.replace(old, new)
        print('✓ Variable resolution added to export')
    else:
        print('⚠ Could not find content conversion section')
else:
    print('Export already has variable resolution')

with open(FILE, 'w') as f:
    f.write(content)
print('done')
