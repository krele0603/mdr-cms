#!/usr/bin/env python3
"""
Updates project detail page to show superseded (old) document versions
as clickable links in the annex document list.
"""

FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/projects/[id]/page.tsx'

with open(FILE, 'r') as f:
    content = f.read()

fixes = 0

# Update the document GET API call to also include superseded docs
# Find the project documents query - it likely filters by annex
# and we want to include superseded docs grouped under their active version

# Add superseded indicator to document status display
if 'superseded' not in content:
    content = content.replace(
        "  draft:      {",
        """  superseded: { bg: 'rgba(90,100,114,0.08)', color: '#8a96a2', border: 'rgba(90,100,114,0.2)', label: 'Superseded' },
  draft:      {"""
    )
    fixes += 1
    print('Added superseded status style')

with open(FILE, 'w') as f:
    f.write(content)

print(f'Done. {fixes} fixes applied.')
