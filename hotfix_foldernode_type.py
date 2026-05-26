#!/usr/bin/env python3
"""
Hotfix: adds onDrop to FolderNode TypeScript type definition.
Run from repo root:
  python3 hotfix_foldernode_type.py
"""
import sys

F = 'apps/web/src/app/dashboard/companies/[id]/eqms/[level]/page.tsx'
with open(F) as f: s = f.read()

OLD = """function FolderNode({ folder, depth, selected, onSelect, onRename, onDelete, onAddChild, canEdit }: {
  folder: Folder & { children: any[] }; depth: number; selected: string | null
  onSelect: (id: string) => void; onRename: (id: string, name: string) => void
  onDelete: (id: string) => void; onAddChild: (parentId: string) => void; canEdit: boolean
}) {"""

NEW = """function FolderNode({ folder, depth, selected, onSelect, onRename, onDelete, onAddChild, canEdit, onDrop }: {
  folder: Folder & { children: any[] }; depth: number; selected: string | null
  onSelect: (id: string) => void; onRename: (id: string, name: string) => void
  onDelete: (id: string) => void; onAddChild: (parentId: string) => void; canEdit: boolean
  onDrop?: (folderId: string) => void
}) {"""

if OLD not in s:
    print('ERROR: target not found — may already be patched'); sys.exit(1)
with open(F, 'w') as f: f.write(s.replace(OLD, NEW, 1))
print('OK: FolderNode type fixed')
