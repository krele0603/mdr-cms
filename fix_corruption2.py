#!/usr/bin/env python3
"""
Fix markdown link corruption using exact string replacement.
The corruption pattern is: [word](http://word) or [a.b](http://a.b)
"""
import os

BASE = os.path.expanduser('~/stacks/mdr-cms/apps/web/src')

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Build list of all corrupted patterns found in file
    # Pattern: [TEXT](http://SOMETHING) where we want just TEXT
    result = []
    i = 0
    while i < len(content):
        if content[i] == '[':
            # Find matching ]
            j = content.find(']', i)
            if j != -1 and j < i + 100:
                after = content[j+1:j+2]
                if after == '(':
                    # Find matching )
                    k = content.find(')', j+1)
                    if k != -1 and k < j + 200:
                        url = content[j+2:k]
                        text = content[i+1:j]
                        # Check if it looks like a corruption
                        # URL should start with http and text should be an identifier
                        if url.startswith('http') and all(c in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._$' for c in text) and text:
                            # This is corruption - keep just the text
                            result.append(text)
                            i = k + 1
                            continue
        result.append(content[i])
        i += 1
    
    content = ''.join(result)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Process all .ts and .tsx files
fixed_count = 0
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.next', '.git']]
    for fn in files:
        if fn.endswith('.ts') or fn.endswith('.tsx'):
            path = os.path.join(root, fn)
            if fix_file(path):
                print(f'FIXED: {path}')
                fixed_count += 1

print(f'\nDone. Fixed {fixed_count} files.')
