'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'
import TextStyle from '@tiptap/extension-text-style'
import { TableOfContents, getHierarchicalIndexes } from '@tiptap/extension-table-of-contents'
import { VariableNode, setProjectVariables, mergeCompanyVariables } from '@/lib/variable-node'

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'

const LEVEL_META: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'Policies',          color: '#3C3489', bg: '#EEEDFE', border: '#AFA9EC' },
  2: { label: 'Procedures',        color: '#0C447C', bg: '#E6F1FB', border: '#85B7EB' },
  3: { label: 'Work Instructions', color: '#27500A', bg: '#EAF3DE', border: '#97C459' },
  4: { label: 'Forms & Templates', color: '#633806', bg: '#FAEEDA', border: '#FAC775' },
  5: { label: 'Records',           color: '#5F5E5A', bg: '#F1EFE8', border: '#D3D1C7' },
}

const DOC_STATUS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft:    { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7', label: 'Draft' },
  active:   { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Active' },
  archived: { bg: '#f5f5f5', color: '#999',    border: '#ddd',    label: 'Archived' },
}

const DEFAULT_SIZES = { p: 14, h1: 26, h2: 20, h3: 15, h4: 14 }

interface TocItem { id: string; textContent: string; level: number; itemIndex: number }

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Green',  value: '#bbf7d0' },
  { label: 'Blue',   value: '#bae6fd' },
  { label: 'Pink',   value: '#fecdd3' },
  { label: 'Purple', value: '#e9d5ff' },
  { label: 'None',   value: null },
]

const TEXT_COLORS = [
  { label: 'Default',   value: null },
  { label: 'Black',     value: '#1a1f24' },
  { label: 'Dark grey', value: '#5a6472' },
  { label: 'Grey',      value: '#8a96a2' },
  { label: 'Teal',      value: '#2e5f5f' },
  { label: 'Blue',      value: '#1d4ed8' },
  { label: 'Red',       value: '#dc2626' },
  { label: 'Orange',    value: '#ea580c' },
  { label: 'Green',     value: '#16a34a' },
  { label: 'Purple',    value: '#7c3aed' },
]

const FONTS = [
  { label: 'DM Sans',            value: "'DM Sans', sans-serif" },
  { label: 'Cormorant Garamond', value: "'Cormorant Garamond', serif" },
  { label: 'Georgia',            value: 'Georgia, serif' },
  { label: 'Times New Roman',    value: "'Times New Roman', serif" },
  { label: 'Arial',              value: 'Arial, sans-serif' },
  { label: 'Helvetica',          value: 'Helvetica, Arial, sans-serif' },
  { label: 'Courier New',        value: "'Courier New', monospace" },
]

// ── Icons ────────────────────────────────────────────────────────────────────
const I = {
  Bold:        () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><path d='M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z'/><path d='M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z'/></svg>,
  Italic:      () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><line x1='19' y1='4' x2='10' y2='4'/><line x1='14' y1='20' x2='5' y2='20'/><line x1='15' y1='4' x2='9' y2='20'/></svg>,
  Underline:   () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><path d='M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3'/><line x1='4' y1='21' x2='20' y2='21'/></svg>,
  Strike:      () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='5' y1='12' x2='19' y2='12'/><path d='M16 6C16 6 14 4 12 4c-2.2 0-4 1.8-4 4 0 1.9 1.3 3 3 3.5'/><path d='M8 18s2 2 4 2c2.2 0 4-1.8 4-4 0-1.9-1.3-3-3-3.5'/></svg>,
  Highlight:   () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><path d='M12 20h9'/><path d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'/></svg>,
  BulletList:  () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='9' y1='6' x2='20' y2='6'/><line x1='9' y1='12' x2='20' y2='12'/><line x1='9' y1='18' x2='20' y2='18'/><circle cx='4' cy='6' r='1.5' fill='currentColor' stroke='none'/><circle cx='4' cy='12' r='1.5' fill='currentColor' stroke='none'/><circle cx='4' cy='18' r='1.5' fill='currentColor' stroke='none'/></svg>,
  OrderedList: () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='10' y1='6' x2='21' y2='6'/><line x1='10' y1='12' x2='21' y2='12'/><line x1='10' y1='18' x2='21' y2='18'/><path d='M4 6h1v4M4 10h2' strokeWidth='1.5'/><path d='M6 18H4c0-1 2-2 2-3s-1-1.5-2-1' strokeWidth='1.5'/></svg>,
  AlignLeft:   () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='3' y1='6' x2='21' y2='6'/><line x1='3' y1='12' x2='15' y2='12'/><line x1='3' y1='18' x2='18' y2='18'/></svg>,
  AlignCenter: () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='3' y1='6' x2='21' y2='6'/><line x1='6' y1='12' x2='18' y2='12'/><line x1='4' y1='18' x2='20' y2='18'/></svg>,
  AlignRight:  () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='3' y1='6' x2='21' y2='6'/><line x1='9' y1='12' x2='21' y2='12'/><line x1='6' y1='18' x2='21' y2='18'/></svg>,
  AlignJust:   () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='3' y1='6' x2='21' y2='6'/><line x1='3' y1='12' x2='21' y2='12'/><line x1='3' y1='18' x2='21' y2='18'/></svg>,
  Table:       () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><rect x='3' y='3' width='18' height='18' rx='2'/><line x1='3' y1='9' x2='21' y2='9'/><line x1='3' y1='15' x2='21' y2='15'/><line x1='9' y1='9' x2='9' y2='21'/><line x1='15' y1='9' x2='15' y2='21'/></svg>,
  Undo:        () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><path d='M3 7v6h6'/><path d='M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13'/></svg>,
  Redo:        () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><path d='M21 7v6h-6'/><path d='M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13'/></svg>,
  ChevDown:    () => <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><polyline points='6 9 12 15 18 9'/></svg>,
  ToC:         () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='3' y1='5' x2='21' y2='5'/><line x1='6' y1='9' x2='21' y2='9'/><line x1='6' y1='13' x2='21' y2='13'/><line x1='9' y1='17' x2='21' y2='17'/><line x1='3' y1='5' x2='3' y2='17'/></svg>,
}

function Btn({ active, disabled, onClick, title, children }: {
  active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button onMouseDown={e => { e.preventDefault(); if (!disabled) onClick() }} disabled={disabled} title={title}
      style={{ height: 30, minWidth: 30, padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', borderRadius: 5, background: active ? 'rgba(78,140,140,0.15)' : 'transparent', color: active ? '#2e5f5f' : disabled ? '#ccc' : '#2e3640', cursor: disabled ? 'default' : 'pointer', fontSize: 12 }}
      onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = 'rgba(0,0,0,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >{children}</button>
  )
}

function Sep() { return <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.12)', margin: '0 3px', flexShrink: 0 }} /> }
function Overlay({ onClose }: { onClose: () => void }) { return <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={onClose} /> }

function TableMenu({ editor, onClose, pos }: { editor: any; onClose: () => void; pos: { top: number; left: number } }) {
  const inTable = editor.can().addColumnAfter()
  const S = ({ title }: { title: string }) => <div style={{ fontSize: 10, fontWeight: 600, color: '#8a96a2', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px 4px' }}>{title}</div>
  const Item = ({ label, onClick, danger, disabled }: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) => (
    <button onMouseDown={e => { e.preventDefault(); if (!disabled) { onClick(); onClose() } }} disabled={disabled}
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 12, border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer', color: disabled ? '#ccc' : danger ? '#943030' : '#1a1f24', borderRadius: 4 }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >{label}</button>
  )
  return (
    <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.14)', minWidth: 200, padding: '6px 0' }}>
      <S title="Insert" /><Item label="Insert table (3×3)" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} /><Item label="Insert table (5×3)" onClick={() => editor.chain().focus().insertTable({ rows: 5, cols: 3, withHeaderRow: true }).run()} />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} /><S title="Columns" /><Item label="Add column before" disabled={!inTable} onClick={() => editor.chain().focus().addColumnBefore().run()} /><Item label="Add column after" disabled={!inTable} onClick={() => editor.chain().focus().addColumnAfter().run()} /><Item label="Delete column" disabled={!inTable} danger onClick={() => editor.chain().focus().deleteColumn().run()} />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} /><S title="Rows" /><Item label="Add row before" disabled={!inTable} onClick={() => editor.chain().focus().addRowBefore().run()} /><Item label="Add row after" disabled={!inTable} onClick={() => editor.chain().focus().addRowAfter().run()} /><Item label="Delete row" disabled={!inTable} danger onClick={() => editor.chain().focus().deleteRow().run()} />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} /><S title="Table" /><Item label="Toggle header row" disabled={!inTable} onClick={() => editor.chain().focus().toggleHeaderRow().run()} /><Item label="Delete table" disabled={!inTable} danger onClick={() => editor.chain().focus().deleteTable().run()} />
    </div>
  )
}

function FontPanel({ sizes, onChange, onClose, pos }: { sizes: typeof DEFAULT_SIZES; onChange: (k: keyof typeof DEFAULT_SIZES, v: number) => void; onClose: () => void; pos: { top: number; left: number } }) {
  const rows: { key: keyof typeof DEFAULT_SIZES; label: string; style: React.CSSProperties }[] = [
    { key: 'p',  label: 'Normal text', style: { fontSize: sizes.p } },
    { key: 'h1', label: 'Heading 1',   style: { fontSize: Math.min(sizes.h1, 26), fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 } },
    { key: 'h2', label: 'Heading 2',   style: { fontSize: Math.min(sizes.h2, 22), fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 } },
    { key: 'h3', label: 'Heading 3',   style: { fontSize: Math.min(sizes.h3, 16), fontWeight: 600 } },
    { key: 'h4', label: 'Heading 4',   style: { fontSize: sizes.h4, fontWeight: 600, color: '#5a6472' } },
  ]
  return (
    <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', padding: 16, width: 310 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Font sizes</div>
      {rows.map(r => (
        <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 10, color: '#8a96a2', marginBottom: 1 }}>{r.label}</div><div style={{ ...r.style, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>Sample text</div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button onClick={() => onChange(r.key, Math.max(8, sizes[r.key] - 1))} style={{ width: 24, height: 24, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 4, background: '#f5f2ee', cursor: 'pointer', fontSize: 14 }}>−</button>
            <input type="number" value={sizes[r.key]} onChange={e => onChange(r.key, Math.max(8, Math.min(72, parseInt(e.target.value) || sizes[r.key])))} style={{ width: 42, height: 24, textAlign: 'center', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: 12, outline: 'none' }} />
            <button onClick={() => onChange(r.key, Math.min(72, sizes[r.key] + 1))} style={{ width: 24, height: 24, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 4, background: '#f5f2ee', cursor: 'pointer', fontSize: 14 }}>+</button>
          </div>
        </div>
      ))}
      <button onClick={onClose} style={{ width: '100%', height: 28, marginTop: 6, fontSize: 12, background: '#4e8c8c', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Done</button>
    </div>
  )
}

function TocMenu({ pos, onClose, showOutline, onToggleOutline, onInsertToc }: { pos: { top: number; left: number }; onClose: () => void; showOutline: boolean; onToggleOutline: () => void; onInsertToc: () => void }) {
  return (
    <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.14)', minWidth: 220, padding: '6px 0' }}>
      <button onMouseDown={e => { e.preventDefault(); onToggleOutline(); onClose() }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        <div style={{ fontWeight: 500 }}>{showOutline ? 'Hide outline' : 'Show outline'}</div>
        <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 1 }}>Navigation panel with headings</div>
      </button>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
      <button onMouseDown={e => { e.preventDefault(); onInsertToc(); onClose() }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        <div style={{ fontWeight: 500 }}>Insert Table of Contents</div>
        <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 1 }}>Add ToC block to document</div>
      </button>
    </div>
  )
}

function OutlinePanel({ items, onClose }: { items: TocItem[]; onClose: () => void }) {
  return (
    <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#faf9f7', borderRight: '1px solid #e0ddd8' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0ddd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f5f2ee' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outline</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a96a2', fontSize: 16, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {items.length === 0 ? <div style={{ padding: '20px 14px', fontSize: 12, color: '#8a96a2' }}>No headings yet.</div>
          : items.map(item => (
          <button key={item.id} onClick={() => { const el = document.getElementById(item.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: `5px 14px 5px ${8 + (item.level - 1) * 12}px`, fontSize: item.level === 1 ? 12 : 11, fontWeight: item.level === 1 ? 600 : item.level === 2 ? 500 : 400, color: item.level === 1 ? '#1a1f24' : item.level === 2 ? '#2e3640' : '#5a6472', border: 'none', background: 'transparent', cursor: 'pointer', lineHeight: 1.4 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(78,140,140,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            {item.level > 1 && <span style={{ color: '#d8d4ce', marginRight: 4 }}>{'—'.repeat(item.level - 1)}</span>}
            {item.textContent}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function Toolbar({ editor, sizes, onSizeChange, showOutline, onToggleOutline, onInsertToc, variables = [], onInsertImage, zoom, onZoomChange }: {
  editor: any; sizes: typeof DEFAULT_SIZES; onSizeChange: (k: keyof typeof DEFAULT_SIZES, v: number) => void
  showOutline: boolean; onToggleOutline: () => void; onInsertToc: () => void
  variables?: any[]
  onInsertImage?: () => void
  zoom: number; onZoomChange: (z: number) => void
}) {
  const [showFont, setShowFont] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [hoverCell, setHoverCell] = useState({ r: 0, c: 0 })
  const [showTextColor, setShowTextColor] = useState(false)
  const [showHighlightColor, setShowHighlightColor] = useState(false)
  const [showInsert, setShowInsert] = useState(false)
  const [showInsertTable, setShowInsertTable] = useState(false)
  const [showInsertToc, setShowInsertToc] = useState(false)
  const [showTableOpts, setShowTableOpts] = useState(false)
  const fontRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const textColorRef = useRef<HTMLDivElement>(null)
  const highlightColorRef = useRef<HTMLDivElement>(null)
  const insertRef = useRef<HTMLDivElement>(null)
  const tableOptsRef = useRef<HTMLDivElement>(null)
  const [fontPos, setFontPos] = useState({ top: 0, left: 0 })
  const [tablePos, setTablePos] = useState({ top: 0, left: 0 })
  const [textColorPos, setTextColorPos] = useState({ top: 0, left: 0 })
  const [highlightColorPos, setHighlightColorPos] = useState({ top: 0, left: 0 })
  const [insertPos, setInsertPos] = useState({ top: 0, left: 0 })
  const [tableOptsPos, setTableOptsPos] = useState({ top: 0, left: 0 })

  if (!editor) return null

  const headingValue = editor.isActive('heading', { level: 1 }) ? '1' : editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : editor.isActive('heading', { level: 4 }) ? '4' : '0'
  const currentFont = FONTS.find(f => editor.isActive('textStyle', { fontFamily: f.value }))?.value || FONTS[0].value
  const inTable = editor.can().addColumnAfter()
  function getPos(ref: React.RefObject<HTMLDivElement>) { if (!ref.current) return { top: 0, left: 0 }; const r = ref.current.getBoundingClientRect(); return { top: r.bottom + 4, left: r.left } }
  function closeAll() { setShowFont(false); setShowTextColor(false); setShowHighlightColor(false); setShowInsert(false); setShowTableOpts(false) }

  const menuItem = (label: string, sub: string, icon: React.ReactNode, onClick: () => void, hasArrow?: boolean) => (
    <button onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24', textAlign: 'left' as const, justifyContent: 'space-between' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon}
        <div><div style={{ fontWeight: 500 }}>{label}</div><div style={{ fontSize: 10, color: '#8a96a2' }}>{sub}</div></div>
      </div>
      {hasArrow && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>}
    </button>
  )

  const tableSubItems = [
    { label: '─', sep: true },
    { label: 'Add column before', disabled: !inTable, onClick: () => { editor.chain().focus().addColumnBefore().run(); closeAll() } },
    { label: 'Add column after', disabled: !inTable, onClick: () => { editor.chain().focus().addColumnAfter().run(); closeAll() } },
    { label: 'Delete column', disabled: !inTable, danger: true, onClick: () => { editor.chain().focus().deleteColumn().run(); closeAll() } },
    { label: '─', sep: true },
    { label: 'Add row before', disabled: !inTable, onClick: () => { editor.chain().focus().addRowBefore().run(); closeAll() } },
    { label: 'Add row after', disabled: !inTable, onClick: () => { editor.chain().focus().addRowAfter().run(); closeAll() } },
    { label: 'Delete row', disabled: !inTable, danger: true, onClick: () => { editor.chain().focus().deleteRow().run(); closeAll() } },
    { label: '─', sep: true },
    { label: 'Toggle header row', disabled: !inTable, onClick: () => { editor.chain().focus().toggleHeaderRow().run(); closeAll() } },
    { label: 'Delete table', disabled: !inTable, danger: true, onClick: () => { editor.chain().focus().deleteTable().run(); closeAll() } },
  ]

  const tocSubItems = [
    { label: showOutline ? 'Hide outline panel' : 'Show outline panel', sub: 'Navigation with headings', onClick: () => { onToggleOutline(); closeAll() } },
    { label: 'Insert ToC block', sub: 'Auto-generated from headings', onClick: () => { onInsertToc(); closeAll() } },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 1, padding: '4px 10px', borderBottom: '1px solid #e0ddd8', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
      <Btn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><I.Undo /></Btn>
      <Btn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><I.Redo /></Btn>
      <Sep />
      <select value={headingValue} onChange={e => { const v = e.target.value; if (v === '0') editor.chain().focus().setParagraph().run(); else editor.chain().focus().toggleHeading({ level: parseInt(v) as 1|2|3|4 }).run() }} style={{ height: 28, padding: '0 6px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#2e3640' }}>
        <option value="0">Normal text</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option><option value="4">Heading 4</option>
      </select>
      <select value={currentFont} onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()} style={{ height: 28, padding: '0 6px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#2e3640', maxWidth: 160, marginLeft: 4 }}>
        {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
      <div ref={fontRef}>
        <Btn title="Font sizes" active={showFont} onClick={() => { setFontPos(getPos(fontRef)); setShowFont(v => !v); setShowTextColor(false); setShowHighlightColor(false); setShowInsert(false) }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Aa</span><I.ChevDown />
        </Btn>
      </div>
      {showFont && (<><Overlay onClose={() => setShowFont(false)} /><FontPanel sizes={sizes} onChange={onSizeChange} onClose={() => setShowFont(false)} pos={fontPos} /></>)}
      <Sep />
      <Btn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><I.Bold /></Btn>
      <Btn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><I.Italic /></Btn>
      <Btn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><I.Underline /></Btn>
      <Btn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><I.Strike /></Btn>
      {/* Text color */}
      <div ref={textColorRef} style={{ position: 'relative' }}>
        <button onMouseDown={e => { e.preventDefault(); setTextColorPos(getPos(textColorRef)); setShowTextColor(v => !v); setShowHighlightColor(false); setShowInsert(false); setShowFont(false) }}
          title="Text color" style={{ height: 30, minWidth: 30, padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1, border: 'none', borderRadius: 5, background: showTextColor ? 'rgba(78,140,140,0.15)' : 'transparent', cursor: 'pointer' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: editor.getAttributes('textStyle').color || '#1a1f24', lineHeight: 1 }}>A</span>
          <div style={{ width: 14, height: 3, borderRadius: 1, background: editor.getAttributes('textStyle').color || '#1a1f24' }} />
        </button>
        {showTextColor && (
          <><Overlay onClose={() => setShowTextColor(false)} />
          <div style={{ position: 'fixed', top: textColorPos.top, left: textColorPos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 10, width: 172 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#8a96a2', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Text color</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {TEXT_COLORS.map(c => (
                <button key={c.label} title={c.label} onMouseDown={e => {
                  e.preventDefault()
                  if (c.value) editor.chain().focus().setColor(c.value).run()
                  else editor.chain().focus().unsetColor().run()
                  setShowTextColor(false)
                }} style={{ width: 22, height: 22, borderRadius: 5, border: c.value === null ? '1px dashed #ccc' : '1px solid rgba(0,0,0,0.15)', background: c.value || '#fff', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                  {!c.value && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#8a96a2' }}>✕</span>}
                </button>
              ))}
            </div>
          </div></>
        )}
      </div>
      {/* Highlight color */}
      <div ref={highlightColorRef} style={{ position: 'relative' }}>
        <button onMouseDown={e => { e.preventDefault(); setHighlightColorPos(getPos(highlightColorRef)); setShowHighlightColor(v => !v); setShowTextColor(false); setShowInsert(false); setShowFont(false) }}
          title="Highlight" style={{ height: 30, minWidth: 30, padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1, border: 'none', borderRadius: 5, background: showHighlightColor ? 'rgba(78,140,140,0.15)' : 'transparent', cursor: 'pointer' }}>
          <I.Highlight />
          <div style={{ width: 14, height: 3, borderRadius: 1, background: '#fef08a', border: '0.5px solid #d4c030' }} />
        </button>
        {showHighlightColor && (
          <><Overlay onClose={() => setShowHighlightColor(false)} />
          <div style={{ position: 'fixed', top: highlightColorPos.top, left: highlightColorPos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 10, width: 140 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#8a96a2', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Highlight</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c.label} title={c.label} onMouseDown={e => {
                  e.preventDefault()
                  if (c.value) editor.chain().focus().toggleHighlight({ color: c.value }).run()
                  else editor.chain().focus().unsetHighlight().run()
                  setShowHighlightColor(false)
                }} style={{ width: 22, height: 22, borderRadius: 5, border: c.value === null ? '1px dashed #ccc' : '1px solid rgba(0,0,0,0.15)', background: c.value || '#fff', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                  {!c.value && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#8a96a2' }}>✕</span>}
                </button>
              ))}
            </div>
          </div></>
        )}
      </div>
      <Sep />
      <Btn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><I.BulletList /></Btn>
      <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><I.OrderedList /></Btn>
      {/* Table grid picker */}
      <div style={{ position: 'relative' }} ref={tableRef}>
        <Btn title="Insert table" active={showTable} onClick={() => { setTablePos(getPos(tableRef)); setShowTable(v => !v); setShowFont(false); setShowTextColor(false); setShowHighlightColor(false); setShowInsert(false) }}>
          <I.Table />
        </Btn>
        {showTable && (
          <><Overlay onClose={() => { setShowTable(false); setHoverCell({ r: 0, c: 0 }) }} />
          <div style={{ position: 'fixed', top: tablePos.top, left: tablePos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.14)', padding: '12px 12px 8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 18px)', gap: 2, marginBottom: 6 }}>
              {Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => (
                <div key={`${r}-${c}`}
                  onMouseEnter={() => setHoverCell({ r: r + 1, c: c + 1 })}
                  onMouseDown={e => { e.preventDefault(); editor.chain().focus().insertTable({ rows: r + 1, cols: c + 1, withHeaderRow: true }).run(); setShowTable(false); setHoverCell({ r: 0, c: 0 }) }}
                  style={{ width: 18, height: 18, borderRadius: 2, border: '1px solid', borderColor: (hoverCell.r > r && hoverCell.c > c) ? '#4e8c8c' : 'rgba(0,0,0,0.15)', background: (hoverCell.r > r && hoverCell.c > c) ? 'rgba(78,140,140,0.15)' : '#fff', cursor: 'pointer' }}
                />
              )))}
            </div>
            <div style={{ fontSize: 11, color: '#5a6472', textAlign: 'center', marginBottom: 6 }}>
              {hoverCell.r > 0 && hoverCell.c > 0 ? `${hoverCell.r} × ${hoverCell.c}` : 'Hover to select size'}
            </div>
            <div style={{ borderTop: '0.5px solid #e0ddd8', paddingTop: 6 }}>
              {inTable && tableSubItems.filter(i => !('label' in i && (i.label === 'Insert 3×3' || i.label === 'Insert 5×4'))).map((item, i) => item.sep ? (
                <div key={i} style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '3px 0' }} />
              ) : (
                <button key={i} onMouseDown={e => { e.preventDefault(); if (!item.disabled && item.onClick) item.onClick() }} disabled={!!item.disabled}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px', fontSize: 11, border: 'none', background: 'transparent', cursor: item.disabled ? 'default' : 'pointer', color: item.disabled ? '#ccc' : (item as any).danger ? '#943030' : '#1a1f24', borderRadius: 4 }}
                  onMouseEnter={e => { if (!item.disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div></>
        )}
      </div>
      <Sep />
      <Btn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><I.AlignLeft /></Btn>
      <Btn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><I.AlignCenter /></Btn>
      <Btn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><I.AlignRight /></Btn>
      <Btn title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><I.AlignJust /></Btn>
      <Sep />
      {/* + Insert menu with nested submenus */}
      <div ref={insertRef} style={{ position: 'relative' }}>
        <Btn title="Insert" active={showInsert} onClick={() => { setInsertPos(getPos(insertRef)); setShowFont(false); setShowTextColor(false); setShowHighlightColor(false); setShowTableOpts(false); setShowInsert(v => !v); }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>+ Insert</span><I.ChevDown />
        </Btn>
        {showInsert && (
          <><Overlay onClose={() => setShowInsert(false)} />
          <div style={{ position: 'fixed', top: insertPos.top, left: insertPos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.14)', minWidth: 200, padding: '6px 0' }}>
            <button onMouseDown={e => { e.preventDefault(); onInsertImage?.(); setShowInsert(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24', textAlign: 'left' as const }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>
              <div><div style={{ fontWeight: 500 }}>Image</div><div style={{ fontSize: 10, color: '#8a96a2' }}>Insert from file</div></div>
            </button>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
            <button onMouseDown={e => {
              e.preventDefault()
              editor.chain().focus().insertContent({ type: 'riskMatrixNode', attrs: { mode: 'initial' } }).run()
              setShowInsert(false)
            }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24', textAlign: 'left' as const }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="6" height="18" rx="1"/><rect x="10" y="3" width="12" height="8" rx="1"/><rect x="10" y="13" width="12" height="8" rx="1"/></svg>
              <div><div style={{ fontWeight: 500 }}>Risk Matrix</div><div style={{ fontSize: 10, color: '#8a96a2' }}>Initial risk matrix from FMEA</div></div>
            </button>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setShowInsertToc(true)}
              onMouseLeave={() => setShowInsertToc(false)}>
              <button onMouseDown={e => e.preventDefault()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24', textAlign: 'left' as const }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <I.ToC />
                  <div><div style={{ fontWeight: 500 }}>Table of Contents</div><div style={{ fontSize: 10, color: '#8a96a2' }}>Outline or insert ToC block</div></div>
                </div>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              {showInsertToc && (
                <div style={{ position: 'absolute', left: '100%', top: 0, marginLeft: 2, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 240, padding: '6px 0', zIndex: 10000 }}>
                  {tocSubItems.map((item, i) => (
                    <button key={i} onMouseDown={e => { e.preventDefault(); item.onClick() }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <div style={{ fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: '#8a96a2', marginTop: 1 }}>{item.sub}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div></>
        )}
      </div>
      <Sep />
      {/* Variable dropdown - standalone */}
      {variables.length > 0 && (
        <select value="" onChange={e => {
          const tag = e.target.value
          if (!tag || !editor) return
          editor.chain().focus().insertContent({ type: 'variableNode', attrs: { tag } }).run()
          e.target.value = ''
        }} style={{ height: 28, padding: '0 6px', fontSize: 12, border: '0.5px solid rgba(78,140,140,0.3)', borderRadius: 5, background: 'rgba(78,140,140,0.06)', cursor: 'pointer', color: '#2e5f5f', maxWidth: 130 }}>
          <option value="">+ Variable</option>
          {variables.filter(v => v.value).map((v: any) => (
            <option key={v.tag} value={v.tag}>{v.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}


// ── Comment input with @mention ───────────────────────────────────────────────


function makeExtensions(onTocUpdate: (items: any[]) => void) {
  return [
    StarterKit, TextStyle, FontFamily, Underline, Color, VariableNode, Image.configure({ inline: false, allowBase64: true }),
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: true }),
    TableRow, TableHeader, TableCell,
    Placeholder.configure({ placeholder: 'Start writing…' }),
    CharacterCount,
    TableOfContents.configure({ getIndex: getHierarchicalIndexes, onUpdate: (c: any) => onTocUpdate(c) }),
  ]
}

export default function EqmsDocumentEditor() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string
  const docId = params.docId as string

  const [doc, setDoc] = useState<any>(null)
  const [versions, setVersions] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [sessionRole, setSessionRole] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [companyVars, setCompanyVars] = useState<any[]>([])
  const [showChangeNote, setShowChangeNote] = useState(false)
  const [changeNote, setChangeNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [revising, setRevising] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  const [sizes, setSizes] = useState(DEFAULT_SIZES)
  const [zoom, setZoom] = useState(100)
  const [showOutline, setShowOutline] = useState(false)
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [wordCount, setWordCount] = useState(0)

  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const contentLoaded = useRef(false)

  const editor = useEditor({
    extensions: makeExtensions(setTocItems),
    content: {},
    editable: false,
    onUpdate: ({ editor }) => {
      if (!contentLoaded.current) return
      setSaveState('unsaved')
      setWordCount(editor.storage.characterCount?.words() ?? 0)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveContent(editor.getJSON()), 2000)
    },
  })

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => setSessionRole(d?.user?.role || ''))
    loadDoc()
  }, [docId])

  async function loadDoc() {
    setLoading(true)
    const [docRes, companyRes] = await Promise.all([
      fetch(`/api/eqms/documents/${docId}`),
      fetch(`/api/companies/${companyId}`),
    ])
    if (!docRes.ok) { router.back(); return }
    const data = await docRes.json()
    const companyData = await companyRes.json()
    setDoc(data.doc)
    setVersions(data.versions)
    setCompany(companyData.company)
    // Load company variables
    setProjectVariables([])
    const cvarsRes = await fetch(`/api/companies/${companyId}/variables`)
    const cvars = cvarsRes.ok ? await cvarsRes.json() : []
    mergeCompanyVariables(cvars)
    setCompanyVars(cvars)
    setLoading(false)
    setEditorReady(true)
  }

  useEffect(() => {
    if (!editor || !doc || !editorReady) return
    const content = doc.content && doc.content.type === 'doc'
      ? doc.content : { type: 'doc', content: [] }
    editor.commands.setContent(content)
    setWordCount(editor.storage.characterCount?.words() ?? 0)
    contentLoaded.current = true
    const canEdit = ['admin', 'consultant', 'client', 'client-MR'].includes(sessionRole)
      && doc.version_status === 'draft'
    editor.setEditable(canEdit)
  }, [editor, doc, sessionRole, editorReady])

  async function saveContent(content: any) {
    setSaveState('saving')
    try {
      const res = await fetch(`/api/eqms/documents/${docId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      setSaveState(res.ok ? 'saved' : 'error')
    } catch { setSaveState('error') }
  }

  async function submitForApproval() {
    setSubmitting(true)
    const res = await fetch(`/api/eqms/documents/${docId}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change_note: changeNote }),
    })
    if (res.ok) { setShowChangeNote(false); setChangeNote(''); loadDoc() }
    setSubmitting(false)
  }

  async function approve() {
    if (!confirm('Approve this document? The current active version will be archived.')) return
    setSubmitting(true)
    const res = await fetch(`/api/eqms/documents/${docId}/approve`, { method: 'POST' })
    if (res.ok) loadDoc()
    setSubmitting(false)
  }

  async function createRevision() {
    if (!confirm('Create a new revision? The approved version will be preserved in history.')) return
    setRevising(true)
    const res = await fetch(`/api/eqms/documents/${docId}/revise`, { method: 'POST' })
    if (res.ok) { loadDoc() }
    else { const d = await res.json(); alert(d.error || 'Failed to create revision') }
    setRevising(false)
  }

  function insertImage() {
    if (!editor) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => { editor.chain().focus().setImage({ src: ev.target?.result as string }).run() }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  function insertToc() {
    if (!editor || tocItems.length === 0) return
    const lines = tocItems.map(item => `<li>${item.textContent}</li>`).join('')
    editor.chain().focus().insertContent(`<div class="toc-block"><h4>Table of Contents</h4><ol>${lines}</ol></div>`).run()
  }

  const meta = doc ? LEVEL_META[doc.level] : null
  const status = doc ? (DOC_STATUS[doc.status] || DOC_STATUS.draft) : null
  const versionLabel = doc ? `v${doc.version_major}.${doc.version_minor}` : ''
  const isApproved = doc?.version_status === 'active'
  const canApprove = sessionRole === 'client-MR' || sessionRole === 'admin' || sessionRole === 'consultant'
  const hasPendingApproval = doc?.version_status === 'pending'

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
  if (!doc) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, height: 'calc(100vh - 56px)' }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.1)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 48, flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: '#9b9991', display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
          <Link href="/dashboard/companies" style={{ color: '#9b9991', textDecoration: 'none' }}>Companies</Link>
          <span>›</span>
          <Link href={`/dashboard/companies/${companyId}`} style={{ color: '#9b9991', textDecoration: 'none' }}>{company?.name || '…'}</Link>
          <span>›</span>
          {meta && <Link href={`/dashboard/companies/${companyId}/eqms/${doc.level}`} style={{ color: '#9b9991', textDecoration: 'none' }}>{meta.label}</Link>}
          <span>›</span>
          <span style={{ color: '#1a1a18', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{doc.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {meta && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: meta.bg, color: meta.color, border: `0.5px solid ${meta.border}`, fontWeight: 500 }}>Level {doc.level}</span>}
          {status && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: status.bg, color: status.color, border: `0.5px solid ${status.border}` }}>{status.label}</span>}
          <span style={{ fontSize: 11, color: '#9b9991' }}>{versionLabel}</span>
          <span style={{ fontSize: 11, color: saveState === 'saved' ? '#9b9991' : saveState === 'saving' ? '#c8a96e' : '#943030' }}>
            {saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Error' : 'Unsaved'}
          </span>
          <span style={{ fontSize: 11, color: '#9b9991' }}>{wordCount} words</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setShowVersions(v => !v)}
            style={{ height: 28, padding: '0 10px', fontSize: 12, background: showVersions ? 'rgba(24,95,165,0.1)' : 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, cursor: 'pointer', color: showVersions ? '#185FA5' : '#5a6472' }}>
            History
          </button>
          {!isApproved && !hasPendingApproval && (
            <button onClick={() => setShowChangeNote(true)}
              style={{ height: 28, padding: '0 10px', fontSize: 12, background: 'rgba(78,140,140,0.1)', border: '0.5px solid rgba(78,140,140,0.3)', borderRadius: 6, cursor: 'pointer', color: '#2e5f5f' }}>
              Submit for approval
            </button>
          )}
          {hasPendingApproval && <span style={{ fontSize: 11, color: '#c8a96e', alignSelf: 'center' }}>Pending approval</span>}
          {hasPendingApproval && canApprove && (
            <button onClick={approve} disabled={submitting}
              style={{ height: 28, padding: '0 10px', fontSize: 12, background: '#EAF3DE', border: '0.5px solid #97C459', borderRadius: 6, cursor: 'pointer', color: '#27500A', fontWeight: 500 }}>
              ✓ Approve
            </button>
          )}
          {isApproved && canApprove && (
            <button onClick={createRevision} disabled={revising}
              style={{ height: 28, padding: '0 10px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, cursor: 'pointer', color: '#5a6472', opacity: revising ? 0.6 : 1 }}>
              {revising ? 'Creating…' : '↻ New revision'}
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {editor && !isApproved && (
        <Toolbar
          editor={editor} sizes={sizes}
          onSizeChange={(k, v) => setSizes(p => ({ ...p, [k]: v }))}
          showOutline={showOutline} onToggleOutline={() => setShowOutline(v => !v)}
          onInsertToc={insertToc} onInsertImage={insertImage}
          variables={companyVars}
          zoom={zoom} onZoomChange={setZoom}
        />
      )}

      {/* Editor + sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {showOutline && (
          <div style={{ width: 220, flexShrink: 0, background: '#faf9f7', borderRight: '1px solid #e0ddd8', overflowY: 'auto' as const }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0ddd8', background: '#f5f2ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase' as const }}>Outline</span>
              <button onClick={() => setShowOutline(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a96a2', fontSize: 16 }}>×</button>
            </div>
            {tocItems.map(item => (
              <div key={item.id} style={{ padding: `5px 14px 5px ${8 + (item.level - 1) * 12}px`, fontSize: item.level === 1 ? 12 : 11, color: '#2e3640', cursor: 'pointer' }}
                onClick={() => { const el = document.getElementById(item.id); if (el) el.scrollIntoView({ behavior: 'smooth' }) }}>
                {item.textContent}
              </div>
            ))}
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto', padding: '40px 0', background: '#f5f2ee' }}>
          <div style={{ maxWidth: 780, margin: '0 auto', transformOrigin: 'top center', transform: `scale(${zoom / 100})`, marginBottom: zoom < 100 ? `${-(780 * (1 - zoom/100))}px` : 0 }}>
            <div style={{ background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 2 }}>
              <div style={{ padding: '60px 72px', minHeight: 900 }}>
                <div style={{ marginBottom: 32, paddingBottom: 20, borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#1a1a18', marginBottom: 6 }}>{doc.title}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#9b9991' }}>
                    {doc.code && <span style={{ fontFamily: 'monospace' }}>{doc.code}</span>}
                    <span>{versionLabel}</span>
                    {meta && <span style={{ color: meta.color }}>{meta.label}</span>}
                  </div>
                </div>
                <style>{`
                  .ProseMirror { outline: none; font-size: ${sizes.p}px; line-height: 1.8; color: #1a1f24; min-height: 600px; }
                  .ProseMirror p { margin: 0 0 10px; }
                  .ProseMirror h1 { font-family: 'Cormorant Garamond', serif; font-size: ${sizes.h1}px; font-weight: 700; margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e0ddd8; }
                  .ProseMirror h2 { font-family: 'Cormorant Garamond', serif; font-size: ${sizes.h2}px; font-weight: 600; margin: 22px 0 10px; }
                  .ProseMirror h3 { font-size: ${sizes.h3}px; font-weight: 600; margin: 18px 0 8px; }
                  .ProseMirror h4 { font-size: ${sizes.h4}px; font-weight: 600; margin: 14px 0 6px; color: #5a6472; }
                  .ProseMirror ul { list-style-type: disc !important; padding-left: 24px; margin: 6px 0 10px; }
                  .ProseMirror ol { list-style-type: decimal !important; padding-left: 24px; margin: 6px 0 10px; }
                  .ProseMirror li { margin-bottom: 3px; }
                  .ProseMirror li p { margin: 0; display: inline; }
                  .ProseMirror table { border-collapse: collapse; width: 100%; margin: 16px 0; }
                  .ProseMirror th { background: #f5f2ee; padding: 8px 12px; border: 1px solid #d8d4ce; font-weight: 600; }
                  .ProseMirror td { padding: 8px 12px; border: 1px solid #d8d4ce; vertical-align: top; }
                  .ProseMirror tr:nth-child(even) td { background: #faf9f7; }
                  .ProseMirror .selectedCell { background: rgba(78,140,140,0.1) !important; }
                  .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #8a96a2; pointer-events: none; height: 0; font-style: italic; }
                  .ProseMirror img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; }
                  .toc-block { background: #f5f2ee; border: 1px solid #e0ddd8; border-radius: 6px; padding: 16px 20px; margin: 16px 0; }
                  .toc-block h4 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #8a96a2; margin: 0 0 10px; }
                  .toc-block ol { margin: 0; padding-left: 18px; }
                  .column-resize-handle { background-color: #4e8c8c; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }
                `}</style>
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </div>
        {showVersions && (
          <div style={{ width: 280, borderLeft: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', overflow: 'auto', flexShrink: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', fontSize: 13, fontWeight: 500 }}>Version history</div>
            {versions.map(v => (
              <div key={v.id} style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>v{v.version_major}.{v.version_minor}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3,
                    background: v.status === 'active' ? '#EAF3DE' : '#f5f5f5',
                    color: v.status === 'active' ? '#27500A' : '#999',
                    border: `0.5px solid ${v.status === 'active' ? '#97C459' : '#ddd'}` }}>{v.status}</span>
                </div>
                {v.change_note && <div style={{ fontSize: 11, color: '#6b6a64', marginBottom: 4 }}>{v.change_note}</div>}
                <div style={{ fontSize: 10, color: '#9b9991' }}>{v.created_by_name} · {new Date(v.created_at).toLocaleDateString('en-GB')}</div>
                {v.approved_by_name && <div style={{ fontSize: 10, color: '#9b9991', marginTop: 2 }}>Approved by {v.approved_by_name}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showChangeNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
          onClick={() => setShowChangeNote(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Submit for approval</div>
              <button onClick={() => setShowChangeNote(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#5a6472' }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#5a6472', marginBottom: 6 }}>Change note (optional)</label>
              <textarea value={changeNote} onChange={e => setChangeNote(e.target.value)}
                placeholder="Describe what changed…" rows={4} autoFocus
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowChangeNote(false)} style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>Cancel</button>
              <button onClick={submitForApproval} disabled={submitting}
                style={{ height: 32, padding: '0 14px', fontSize: 13, background: '#4e8c8c', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
