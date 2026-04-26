#!/usr/bin/env python3
"""
Inserts View button into template version history items.
Uses line numbers since the file has markdown corruption.
"""
FILE = '/home/mefisto/stacks/mdr-cms/apps/web/src/app/dashboard/templates/[id]/page.tsx'

with open(FILE, 'r') as f:
    lines = f.readlines()

# Find the line with v.version in the history panel (line 673 from grep, 0-indexed: 672)
target_line = None
for i, line in enumerate(lines):
    if 'fontFamily: .monospace.' in line and 'v.version' in line and 'history' not in line.lower():
        target_line = i
        break
    # Also check for the markdown-corrupted version
    if 'monospace' in line and '{v.version}' in line:
        target_line = i
        break

if target_line is None:
    print('Could not find v.version line, searching broader...')
    for i, line in enumerate(lines):
        if 'v.version' in line and 'monospace' in line:
            target_line = i
            print(f'Found at line {i+1}: {line.rstrip()}')
            break

if target_line is not None:
    print(f'Found version line at {target_line + 1}')
    
    # Find the line with is_current badge (should be next line)
    # We want to insert a View button after the is_current badge line
    # Look for the closing </div> of the version+badge row
    
    # The structure is:
    # line N:   <span>v.version</span>
    # line N+1: {v.is_current && <span>current</span>}
    # line N+2: </div>  <- we want to insert View button before this
    
    # Find the closing div of this inner section (within next 5 lines)
    close_div_line = None
    for j in range(target_line, min(target_line + 6, len(lines))):
        if '</div>' in lines[j] and 'style' not in lines[j]:
            close_div_line = j
            break
    
    if close_div_line is not None:
        print(f'Found closing div at line {close_div_line + 1}: {lines[close_div_line].rstrip()}')
        
        # Insert View button before the closing </div>
        view_button = """                        <button onClick={() => previewVersion(v.id)}
                          style={{ height: 18, padding: '0 6px', fontSize: 10, background: previewVersionId === v.id ? 'rgba(78,140,140,0.15)' : 'rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 3, cursor: 'pointer', color: previewVersionId === v.id ? '#2e5f5f' : '#5a6472', marginLeft: 'auto' }}>
                          {previewVersionId === v.id ? 'Hide' : 'View'}
                        </button>
"""
        lines.insert(close_div_line, view_button)
        print('Inserted View button')
    else:
        print('Could not find closing div')
        # Print context for debugging
        for j in range(target_line - 1, min(target_line + 8, len(lines))):
            print(f'  {j+1}: {lines[j].rstrip()}')
else:
    print('ERROR: Could not find version line')

with open(FILE, 'w') as f:
    f.writelines(lines)
print('done')
