#!/usr/bin/env python3
"""
Visual identity upgrade.
  1. Replaces globals.css with improved version
  2. Improves login page — richer brand panel, smoother form
  3. Improves dashboard layout — better main padding and background

Run from repo root:
  python3 patches/patch_visual.py
"""

import shutil, sys

errors = []

# ══════════════════════════════════════════════════════════════════════════════
# FILE 1 — globals.css: full replacement
# ══════════════════════════════════════════════════════════════════════════════
try:
    shutil.copy2('globals_new.css', 'apps/web/src/app/globals.css')
    print('FILE1 applied: globals.css replaced')
except Exception as e:
    errors.append(f'FILE1 (globals.css): {e}')

# ══════════════════════════════════════════════════════════════════════════════
# FILE 2 — login page: improve brand panel + form aesthetics
# ══════════════════════════════════════════════════════════════════════════════
F2 = 'apps/web/src/app/login/page.tsx'
with open(F2) as f: s2 = f.read()

OLD2 = """  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#1a1f24',
    }}>
      {/* Left — brand panel */}
      <div style={{
        width: 380, flexShrink: 0,
        background: '#2e3640',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 40px',
        borderRight: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4e8c8c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            TFbuilder
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>
            EasyMed Consulting
          </div>
        </div>"""

NEW2 = """  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#151a1f',
    }}>
      {/* Left — brand panel */}
      <div style={{
        width: 400, flexShrink: 0,
        background: 'linear-gradient(160deg, #1e2832 0%, #243040 50%, #1a2430 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 44px',
        borderRight: '0.5px solid rgba(255,255,255,0.07)',
        position: 'relative' as const,
        overflow: 'hidden',
      }}>
        {/* Decorative radial glow */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(78,140,140,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,169,110,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4e8c8c', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            TFbuilder
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
            EasyMed Consulting
          </div>
        </div>"""

if OLD2 not in s2:
    errors.append('FILE2 (login brand panel): target not found')
elif s2.count(OLD2) > 1:
    errors.append('FILE2 (login brand panel): found more than once')
else:
    s2 = s2.replace(OLD2, NEW2, 1)
    print('FILE2A applied: login brand panel improved')

# Improve login form panel
OLD2B = """        background: '#fff', color: '#1a1f24',"""
NEW2B = """        background: '#fff', color: '#1a1f24',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.15)',"""

if OLD2B not in s2:
    errors.append('FILE2B (login form shadow): target not found')
elif s2.count(OLD2B) > 1:
    errors.append('FILE2B (login form shadow): found more than once')
else:
    s2 = s2.replace(OLD2B, NEW2B, 1)
    print('FILE2B applied: login form depth shadow')

# ══════════════════════════════════════════════════════════════════════════════
# FILE 3 — dashboard layout: improve main padding
# ══════════════════════════════════════════════════════════════════════════════
F3 = 'apps/web/src/app/dashboard/layout.tsx'
with open(F3) as f: s3 = f.read()

OLD3 = '      <main style={{ flex: 1, overflow: \'auto\', padding: 28 }}>'
NEW3 = '      <main style={{ flex: 1, overflow: \'auto\', padding: \'28px 32px\', background: \'transparent\', minWidth: 0 }}>'

if OLD3 not in s3:
    errors.append('FILE3 (dashboard layout main): target not found')
elif s3.count(OLD3) > 1:
    errors.append('FILE3 (dashboard layout main): found more than once')
else:
    s3 = s3.replace(OLD3, NEW3, 1)
    print('FILE3 applied: dashboard layout padding')

# ══════════════════════════════════════════════════════════════════════════════
# Write
# ══════════════════════════════════════════════════════════════════════════════
if errors:
    print('\nERRORS (non-fatal for FILE1):')
    for e in errors: print(f'  • {e}')
    # File 1 is done via shutil — only fail if code files had errors
    code_errors = [e for e in errors if 'FILE1' not in e]
    if code_errors: sys.exit(1)

with open(F2, 'w') as f: f.write(s2)
print(f'Wrote {F2}')
with open(F3, 'w') as f: f.write(s3)
print(f'Wrote {F3}')

print('\nOK: visual patches applied')
