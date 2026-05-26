#!/usr/bin/env python3
"""
Replaces apps/web/src/app/dashboard/help/page.tsx with the comprehensive version.

Run from repo root:
  python3 patch_help.py
"""
import shutil, sys

SRC = 'help_page.tsx'
DST = 'apps/web/src/app/dashboard/help/page.tsx'

try:
    shutil.copy2(SRC, DST)
    print(f'OK: replaced {DST}')
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
