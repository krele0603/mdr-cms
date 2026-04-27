#!/usr/bin/env python3
"""
Fix markdown link corruption in Next.js TypeScript files.
Caused by WinSCP's built-in editor converting identifiers to markdown links.

Usage:
  python3 fix_corruption.py                    # fixes all .ts/.tsx files in project
  python3 fix_corruption.py path/to/file.tsx   # fixes specific file
"""
import re
import sys
import os

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f'  SKIP {filepath}: {e}')
        return 0

    original = content

    # Fix [identifier.sub](http://identifier.sub) -> identifier.sub
    content = re.sub(r'\[([a-zA-Z_$][a-zA-Z0-9_.$]*)\]\(https?://[^\)]+\)', r'\1', content)

    # Fix specific known patterns that the regex might miss
    replacements = [
        ('[process.env.NEXT](http://process.env.NEXT)_PUBLIC_MAX_IMAGE_SIZE_KB', 'process.env.NEXT_PUBLIC_MAX_IMAGE_SIZE_KB'),
    ]
    for old, new in replacements:
        content = content.replace(old, new)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        fixes = sum(1 for a, b in zip(original, content) if a != b)
        print(f'  FIXED {filepath}')
        return 1
    return 0

# Determine files to process
if len(sys.argv) > 1:
    files = sys.argv[1:]
else:
    # Find all .ts and .tsx files in the project
    base = os.path.expanduser('~/stacks/mdr-cms/apps/web/src')
    files = []
    for root, dirs, filenames in os.walk(base):
        # Skip node_modules and .next
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.next', '.git']]
        for fn in filenames:
            if fn.endswith('.ts') or fn.endswith('.tsx'):
                files.append(os.path.join(root, fn))

print(f'Processing {len(files)} files...')
fixed = sum(fix_file(f) for f in files)
print(f'\nDone. Fixed {fixed} files.')
