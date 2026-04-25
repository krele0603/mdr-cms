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
import TextStyle from '@tiptap/extension-text-style'
import { TableOfContents, getHierarchicalIndexes } from '@tiptap/extension-table-of-contents'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocData {
  id: string; project_id: string; annex: string; name: string; code: string
  content: any; status: string; updated_at: string
  template_version_id: string | null; template_version: string | null
  example_content: any; template_name: string | null
  tag_code: string | null; project_name: string; device_name: string
  revision?: number
}

interface Comment {
  id: string; parent_id: string | null; content: string
  resolved: boolean; resolved_at: string | null; created_at: string
  author_id: string; author_name: string; author_role: string
  resolved_by_name: string | null
}

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'

interface TocItem { id: string; textContent: string; level: number; itemIndex: number }

const DOC_STATUS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft:       { bg: '#f5f2ee',                   color: '#5a6472', border: 'rgba(90,100,114,0.3)',   label: 'Draft' },
  inprogress:  { bg: 'rgba(200,169,110,0.12)',     color: '#8a6020', border: 'rgba(200,169,110,0.4)', label: 'In progress' },
  review:      { bg: 'rgba(78,140,140,0.1)',       color: '#2e5f5f', border: 'rgba(78,140,140,0.3)',  label: 'In review' },
  approved:    { bg: 'rgba(58,122,90,0.1)',        color: '#3a7a5a', border: 'rgba(58,122,90,0.3)',   label: 'Approved' },
  superseded:  { bg: 'rgba(90,100,114,0.08)',      color: '#8a96a2', border: 'rgba(90,100,114,0.2)', label: 'Superseded' },
}

const DEFAULT_SIZES = { p: 14, h1: 26, h2: 20, h3: 15, h4: 14 }

const FONTS = [
  { label: 'DM Sans',            value: "'DM Sans', sans-serif" },
  { label: 'Cormorant Garamond', value: "'Cormorant Garamond', serif" },
  { label: 'Georgia',            value: 'Georgia, serif' },
  { label: 'Times New Roman',    value: "'Times New Roman', serif" },
  { label: 'Arial',              value: 'Arial, sans-serif' },
  { label: 'Helvetica',          value: 'Helvetica, Arial, sans-serif' },
  { label: 'Courier New',        value: "'Courier New', monospace" },
]

// ── Icons ─────────────────────────────────────────────────────────────────────

const I = {
  Bold:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
  Italic:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
  Underline:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>,
  Strike:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><path d="M16 6C16 6 14 4 12 4c-2.2 0-4 1.8-4 4 0 1.9 1.3 3 3 3.5"/><path d="M8 18s2 2 4 2c2.2 0 4-1.8 4-4 0-1.9-1.3-3-3-3.5"/></svg>,
  Highlight:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  BulletList:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>,
  OrderedList: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4M4 10h2" strokeWidth="1.5"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" strokeWidth="1.5"/></svg>,
  AlignLeft:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>,
  AlignCenter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>,
  AlignRight:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>,
  AlignJust:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Table:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/></svg>,
  Blockquote:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>,
  Undo:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
  Redo:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>,
  ChevDown:    () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  ToC:         () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="5" x2="21" y2="5"/><line x1="6" y1="9" x2="21" y2="9"/><line x1="6" y1="13" x2="21" y2="13"/><line x1="9" y1="17" x2="21" y2="17"/><line x1="3" y1="5" x2="3" y2="17"/></svg>,
  Comment:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Download:    () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Btn({ active, disabled, onClick, title, children, danger }: {
  active?: boolean; disabled?: boolean; onClick: () => void
  title: string; children: React.ReactNode; danger?: boolean
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); if (!disabled) onClick() }}
      disabled={disabled} title={title}
      style={{ height: 30, minWidth: 30, padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', borderRadius: 5, background: active ? 'rgba(78,140,140,0.15)' : 'transparent', color: active ? '#2e5f5f' : disabled ? '#ccc' : danger ? '#943030' : '#2e3640', cursor: disabled ? 'default' : 'pointer', fontSize: 12 }}
      onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = 'rgba(0,0,0,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >{children}</button>
  )
}

function Sep() {
  return <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.12)', margin: '0 3px', flexShrink: 0 }} />
}

function Overlay({ onClose }: { onClose: () => void }) {
  return <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={onClose} />
}

// ── Submenus ──────────────────────────────────────────────────────────────────

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
      <S title="Insert" />
      <Item label="Insert table (3×3)" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
      <Item label="Insert table (5×3)" onClick={() => editor.chain().focus().insertTable({ rows: 5, cols: 3, withHeaderRow: true }).run()} />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
      <S title="Columns" />
      <Item label="Add column before" disabled={!inTable} onClick={() => editor.chain().focus().addColumnBefore().run()} />
      <Item label="Add column after"  disabled={!inTable} onClick={() => editor.chain().focus().addColumnAfter().run()} />
      <Item label="Delete column"     disabled={!inTable} danger onClick={() => editor.chain().focus().deleteColumn().run()} />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
      <S title="Rows" />
      <Item label="Add row before" disabled={!inTable} onClick={() => editor.chain().focus().addRowBefore().run()} />
      <Item label="Add row after"  disabled={!inTable} onClick={() => editor.chain().focus().addRowAfter().run()} />
      <Item label="Delete row"     disabled={!inTable} danger onClick={() => editor.chain().focus().deleteRow().run()} />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
      <S title="Table" />
      <Item label="Toggle header row" disabled={!inTable} onClick={() => editor.chain().focus().toggleHeaderRow().run()} />
      <Item label="Delete table" disabled={!inTable} danger onClick={() => editor.chain().focus().deleteTable().run()} />
    </div>
  )
}

function FontPanel({ sizes, onChange, onClose, pos }: {
  sizes: typeof DEFAULT_SIZES; onChange: (key: keyof typeof DEFAULT_SIZES, val: number) => void; onClose: () => void; pos: { top: number; left: number }
}) {
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: '#8a96a2', marginBottom: 1 }}>{r.label}</div>
            <div style={{ ...r.style, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>Sample text</div>
          </div>
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

function TocMenu({ pos, onClose, showOutline, onToggleOutline, onInsertToc }: {
  pos: { top: number; left: number }; onClose: () => void
  showOutline: boolean; onToggleOutline: () => void; onInsertToc: () => void
}) {
  return (
    <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.14)', minWidth: 220, padding: '6px 0' }}>
      <button onMouseDown={e => { e.preventDefault(); onToggleOutline(); onClose() }}
        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        <div style={{ fontWeight: 500 }}>{showOutline ? 'Hide outline' : 'Show outline'}</div>
        <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 1 }}>Navigation panel with headings</div>
      </button>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
      <button onMouseDown={e => { e.preventDefault(); onInsertToc(); onClose() }}
        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        <div style={{ fontWeight: 500 }}>Insert Table of Contents</div>
        <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 1 }}>Add ToC block to document</div>
      </button>
    </div>
  )
}

// ── Outline panel ─────────────────────────────────────────────────────────────

function OutlinePanel({ items, onClose }: { items: TocItem[]; onClose: () => void }) {
  return (
    <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#faf9f7', borderRight: '1px solid #e0ddd8' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0ddd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f5f2ee' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outline</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a96a2', fontSize: 16, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {items.length === 0 ? (
          <div style={{ padding: '20px 14px', fontSize: 12, color: '#8a96a2', lineHeight: 1.5 }}>No headings yet.</div>
        ) : items.map(item => (
          <button key={item.id}
            onClick={() => { const el = document.getElementById(item.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
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

function Toolbar({ editor, sizes, onSizeChange, showOutline, onToggleOutline, onInsertToc }: {
  editor: any; sizes: typeof DEFAULT_SIZES; onSizeChange: (k: keyof typeof DEFAULT_SIZES, v: number) => void
  showOutline: boolean; onToggleOutline: () => void; onInsertToc: () => void
}) {
  const [showTable, setShowTable] = useState(false)
  const [showFont, setShowFont] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)
  const fontRef = useRef<HTMLDivElement>(null)
  const tocRef = useRef<HTMLDivElement>(null)
  const [tablePos, setTablePos] = useState({ top: 0, left: 0 })
  const [fontPos, setFontPos] = useState({ top: 0, left: 0 })
  const [tocPos, setTocPos] = useState({ top: 0, left: 0 })

  if (!editor) return null

  const headingValue = editor.isActive('heading', { level: 1 }) ? '1' : editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : editor.isActive('heading', { level: 4 }) ? '4' : '0'
  const currentFont = FONTS.find(f => editor.isActive('textStyle', { fontFamily: f.value }))?.value || FONTS[0].value

  function getPos(ref: React.RefObject<HTMLDivElement>) {
    if (!ref.current) return { top: 0, left: 0 }
    const r = ref.current.getBoundingClientRect()
    return { top: r.bottom + 4, left: r.left }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 1, padding: '4px 10px', borderBottom: '1px solid #e0ddd8', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
      <Btn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><I.Undo /></Btn>
      <Btn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><I.Redo /></Btn>
      <Sep />
      <select value={headingValue} onChange={e => { const v = e.target.value; if (v === '0') editor.chain().focus().setParagraph().run(); else editor.chain().focus().toggleHeading({ level: parseInt(v) as 1|2|3|4 }).run() }}
        style={{ height: 28, padding: '0 6px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#2e3640' }}>
        <option value="0">Normal text</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option><option value="4">Heading 4</option>
      </select>
      <select value={currentFont} onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
        style={{ height: 28, padding: '0 6px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#2e3640', maxWidth: 160, marginLeft: 4 }}>
        {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
      <div ref={fontRef}>
        <Btn title="Font sizes" active={showFont} onClick={() => { setFontPos(getPos(fontRef)); setShowFont(v => !v); setShowTable(false); setShowToc(false) }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Aa</span><I.ChevDown />
        </Btn>
      </div>
      {showFont && (<><Overlay onClose={() => setShowFont(false)} /><FontPanel sizes={sizes} onChange={onSizeChange} onClose={() => setShowFont(false)} pos={fontPos} /></>)}
      <Sep />
      <Btn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><I.Bold /></Btn>
      <Btn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><I.Italic /></Btn>
      <Btn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><I.Underline /></Btn>
      <Btn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><I.Strike /></Btn>
      <Btn title="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}><I.Highlight /></Btn>
      <Sep />
      <Btn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><I.BulletList /></Btn>
      <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><I.OrderedList /></Btn>
      <Btn title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><I.Blockquote /></Btn>
      <Sep />
      <Btn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><I.AlignLeft /></Btn>
      <Btn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><I.AlignCenter /></Btn>
      <Btn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><I.AlignRight /></Btn>
      <Btn title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><I.AlignJust /></Btn>
      <Sep />
      <div ref={tableRef}>
        <Btn title="Table" active={showTable} onClick={() => { setTablePos(getPos(tableRef)); setShowTable(v => !v); setShowFont(false); setShowToc(false) }}>
          <I.Table /><I.ChevDown />
        </Btn>
      </div>
      {showTable && (<><Overlay onClose={() => setShowTable(false)} /><TableMenu editor={editor} onClose={() => setShowTable(false)} pos={tablePos} /></>)}
      <Sep />
      <div ref={tocRef}>
        <Btn title="Table of Contents" active={showToc || showOutline} onClick={() => { setTocPos(getPos(tocRef)); setShowToc(v => !v); setShowTable(false); setShowFont(false) }}>
          <I.ToC /><I.ChevDown />
        </Btn>
      </div>
      {showToc && (<><Overlay onClose={() => setShowToc(false)} /><TocMenu pos={tocPos} onClose={() => setShowToc(false)} showOutline={showOutline} onToggleOutline={onToggleOutline} onInsertToc={onInsertToc} /></>)}
    </div>
  )
}

// ── Comments panel ────────────────────────────────────────────────────────────

function CommentsPanel({ comments, commentsLoading, newComment, setNewComment, replyTo, setReplyTo, postingComment, postComment, resolveComment, onClose }: {
  comments: Comment[]; commentsLoading: boolean; newComment: string; setNewComment: (v: string) => void
  replyTo: string | null; setReplyTo: (v: string | null) => void; postingComment: boolean
  postComment: (parentId?: string) => void; resolveComment: (id: string, resolved: boolean) => void; onClose: () => void
}) {
  const unresolvedCount = comments.filter(c => !c.resolved).length
  const topLevel = comments.filter(c => !c.parent_id)

  return (
    <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid #d8d4ce', background: '#faf9f7' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0ddd8', background: '#f5f2ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Comments {unresolvedCount > 0 && `(${unresolvedCount})`}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a96a2', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {commentsLoading ? (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#8a96a2' }}>Loading…</div>
        ) : topLevel.length === 0 ? (
          <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: '#8a96a2', lineHeight: 1.6 }}>
            No comments yet.<br />Be the first to add one.
          </div>
        ) : topLevel.map(c => {
          const replies = comments.filter(r => r.parent_id === c.id)
          const isWarning = c.content.startsWith('⚠')
          return (
            <div key={c.id} style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', opacity: c.resolved ? 0.55 : 1 }}>
              {/* Author row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: isWarning ? 'rgba(148,48,48,0.12)' : 'rgba(78,140,140,0.15)', color: isWarning ? '#943030' : '#2e5f5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                    {c.author_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1f24' }}>{c.author_name}</div>
                    <div style={{ fontSize: 10, color: '#8a96a2' }}>{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
                <button onClick={() => resolveComment(c.id, !c.resolved)} title={c.resolved ? 'Unresolve' : 'Resolve'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.resolved ? '#3a7a5a' : '#8a96a2', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
                  {c.resolved ? '✓' : '○'}
                </button>
              </div>
              {/* Body */}
              <div style={{ fontSize: 12, color: isWarning ? '#943030' : '#2e3640', lineHeight: 1.6, background: isWarning ? 'rgba(148,48,48,0.06)' : 'transparent', padding: isWarning ? '6px 8px' : 0, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                {c.content}
              </div>
              {/* Replies */}
              {replies.map(r => (
                <div key={r.id} style={{ marginTop: 8, paddingLeft: 14, borderLeft: '2px solid #e0ddd8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(78,140,140,0.1)', color: '#2e5f5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>
                      {r.author_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#5a6472' }}>{r.author_name}</span>
                    <span style={{ fontSize: 10, color: '#8a96a2' }}>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#2e3640', lineHeight: 1.5 }}>{r.content}</div>
                </div>
              ))}
              {/* Reply */}
              {!c.resolved && (
                <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                  style={{ marginTop: 7, background: 'none', border: 'none', fontSize: 11, color: '#4e8c8c', cursor: 'pointer', padding: 0 }}>
                  {replyTo === c.id ? 'Cancel reply' : '↩ Reply'}
                </button>
              )}
              {replyTo === c.id && (
                <div style={{ marginTop: 8 }}>
                  <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a reply…" autoFocus
                    style={{ width: '100%', height: 56, padding: '6px 8px', fontSize: 11, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  <button onClick={() => postComment(c.id)} disabled={postingComment || !newComment.trim()}
                    style={{ marginTop: 4, height: 26, padding: '0 12px', fontSize: 11, background: '#4e8c8c', border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', opacity: postingComment || !newComment.trim() ? 0.6 : 1 }}>
                    {postingComment ? 'Posting…' : 'Reply'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* New comment */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #e0ddd8', background: '#fff' }}>
        <textarea
          value={replyTo ? '' : newComment}
          onChange={e => { if (!replyTo) setNewComment(e.target.value) }}
          placeholder={replyTo ? 'Replying above…' : 'Add a comment…'}
          disabled={!!replyTo}
          style={{ width: '100%', height: 64, padding: '8px 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', opacity: replyTo ? 0.5 : 1 }}
        />
        <button onClick={() => postComment()} disabled={postingComment || !newComment.trim() || !!replyTo}
          style={{ marginTop: 6, width: '100%', height: 30, fontSize: 12, background: '#4e8c8c', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', opacity: postingComment || !newComment.trim() || !!replyTo ? 0.6 : 1, fontWeight: 500 }}>
          {postingComment ? 'Posting…' : 'Post comment'}
        </button>
      </div>
    </div>
  )
}

// ── Editor styles ─────────────────────────────────────────────────────────────

function buildEditorStyles(sizes: typeof DEFAULT_SIZES) {
  return `
    .ProseMirror { outline: none; font-size: ${sizes.p}px; line-height: 1.8; color: #1a1f24; min-height: 600px; }
    .ProseMirror p { margin: 0 0 10px; font-size: ${sizes.p}px; }
    .ProseMirror h1 { font-family: 'Cormorant Garamond', serif; font-size: ${sizes.h1}px; font-weight: 700; line-height: 1.2; margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e0ddd8; }
    .ProseMirror h2 { font-family: 'Cormorant Garamond', serif; font-size: ${sizes.h2}px; font-weight: 600; line-height: 1.3; margin: 22px 0 10px; }
    .ProseMirror h3 { font-size: ${sizes.h3}px; font-weight: 600; margin: 18px 0 8px; }
    .ProseMirror h4 { font-size: ${sizes.h4}px; font-weight: 600; margin: 14px 0 6px; color: #5a6472; }
    .ProseMirror ul { list-style-type: disc !important; padding-left: 24px; margin: 6px 0 10px; }
    .ProseMirror ol { list-style-type: decimal !important; padding-left: 24px; margin: 6px 0 10px; }
    .ProseMirror ul ul { list-style-type: circle !important; }
    .ProseMirror li { margin-bottom: 3px; }
    .ProseMirror li p { margin: 0; display: inline; }
    .ProseMirror blockquote { border-left: 3px solid #4e8c8c; margin: 12px 0; padding: 8px 16px; background: rgba(78,140,140,0.05); color: #5a6472; font-style: italic; border-radius: 0 4px 4px 0; }
    .ProseMirror hr { border: none; border-top: 1px solid #e0ddd8; margin: 20px 0; }
    .ProseMirror table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: ${Math.max(sizes.p - 1, 11)}px; }
    .ProseMirror th { background: #f5f2ee; padding: 8px 12px; border: 1px solid #d8d4ce; font-weight: 600; text-align: left; color: #2e3640; }
    .ProseMirror td { padding: 8px 12px; border: 1px solid #d8d4ce; vertical-align: top; }
    .ProseMirror tr:nth-child(even) td { background: #faf9f7; }
    .ProseMirror mark { background: #fff3b0; border-radius: 2px; padding: 1px 2px; }
    .ProseMirror .selectedCell { background: rgba(78,140,140,0.1) !important; }
    .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #8a96a2; pointer-events: none; height: 0; font-style: italic; }
    .toc-block { background: #f5f2ee; border: 1px solid #e0ddd8; border-radius: 6px; padding: 16px 20px; margin: 16px 0; }
    .toc-block h4 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #8a96a2; margin: 0 0 10px; border: none; }
    .toc-block ol { margin: 0; padding-left: 18px; }
    .toc-block li { font-size: 13px; margin-bottom: 4px; color: #2e3640; }
    .tableWrapper { overflow-x: auto; }
    .column-resize-handle { background-color: #4e8c8c; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }
  `
}

// ── Extensions ────────────────────────────────────────────────────────────────

function makeExtensions(placeholder: string, onTocUpdate: (items: any[]) => void) {
  return [
    StarterKit, TextStyle, FontFamily, Underline,
    Highlight.configure({ multicolor: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: true }),
    TableRow, TableHeader, TableCell,
    Placeholder.configure({ placeholder }),
    CharacterCount,
    TableOfContents.configure({
      getIndex: getHierarchicalIndexes,
      onUpdate: (content: any) => onTocUpdate(content),
    }),
  ]
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DocumentEditorPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const docId = params.docId as string

  const [doc, setDoc] = useState<DocData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [showReference, setShowReference] = useState(true)
  const [showOutline, setShowOutline] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [docStatus, setDocStatus] = useState('draft')
  const [hasExample, setHasExample] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [revising, setRevising] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [sizes, setSizes] = useState(DEFAULT_SIZES)
  const [tocItems, setTocItems] = useState<TocItem[]>([])

  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [postingComment, setPostingComment] = useState(false)

  // Request changes state
  const [showRequestChanges, setShowRequestChanges] = useState(false)
  const [changeReason, setChangeReason] = useState('')

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestContent = useRef<any>(null)

  // ── Load session ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.ok ? r.json() : null).then(d => { if (d?.user) setUserRole(d.user.role) })
  }, [])

  // ── Load document ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/projects/${projectId}/documents/${docId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: DocData) => {
        setDoc(data); setDocStatus(data.status)
        const ex = data.example_content
        setHasExample(!!(ex && typeof ex === 'object' && Object.keys(ex).length > 0))
        setLoading(false)
      })
      .catch(() => router.push(`/dashboard/projects/${projectId}`))
  }, [projectId, docId])

  // ── Load comments ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (showComments) loadComments()
  }, [showComments])

  async function loadComments() {
    setCommentsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/comments`)
      if (res.ok) setComments(await res.json())
    } finally { setCommentsLoading(false) }
  }

  async function postComment(parentId?: string) {
    if (!newComment.trim()) return
    setPostingComment(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, parent_id: parentId || null }),
      })
      if (res.ok) { setNewComment(''); setReplyTo(null); loadComments() }
    } finally { setPostingComment(false) }
  }

  async function resolveComment(commentId: string, resolved: boolean) {
    await fetch(`/api/projects/${projectId}/documents/${docId}/comments/${commentId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved }),
    })
    loadComments()
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const save = useCallback(async (content: any) => {
    setSaveState('saving')
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      setSaveState('saved')
    } catch { setSaveState('error') }
  }, [projectId, docId])

  async function updateStatus(status: string) {
    setDocStatus(status)
    await fetch(`/api/projects/${projectId}/documents/${docId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  // ── Approval actions ────────────────────────────────────────────────────────
  async function submitForReview() {
    setSubmitting(true)
    if (latestContent.current) { if (saveTimer.current) clearTimeout(saveTimer.current); await save(latestContent.current) }
    await updateStatus('review')
    setSubmitting(false)
  }

  async function approveDoc() {
    setApproving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/approve`, { method: 'POST' })
      if (res.ok) { setDocStatus('approved'); loadComments() }
    } finally { setApproving(false) }
  }

  async function requestChanges() {
    if (!changeReason.trim()) return
    const res = await fetch(`/api/projects/${projectId}/documents/${docId}/request-changes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: changeReason }),
    })
    if (res.ok) {
      setDocStatus('inprogress'); setChangeReason(''); setShowRequestChanges(false)
      if (showComments) loadComments()
      else setShowComments(true)
    }
  }

  async function reviseDoc() {
    if (!confirm('Create a new revision? The approved version will be preserved and a new draft created.')) return
    setRevising(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/revise`, { method: 'POST' })
      if (res.ok) { const d = await res.json(); router.push(`/dashboard/projects/${projectId}/documents/${d.id}`) }
    } finally { setRevising(false) }
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  async function exportDoc() {
    setExporting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/export?format=docx`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'document.docx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { alert('Export failed: ' + e.message) }
    finally { setExporting(false) }
  }

  // ── Insert ToC ──────────────────────────────────────────────────────────────
  function insertToc() {
    if (!editor || tocItems.length === 0) return
    const lines = tocItems.map(item => {
      const cls = item.level === 1 ? '' : item.level === 2 ? ' class="toc-h2"' : ' class="toc-h3"'
      return `<li${cls}>${item.itemIndex ? item.itemIndex + '. ' : ''}${item.textContent}</li>`
    }).join('')
    editor.chain().focus().insertContent(`<div class="toc-block"><h4>Table of Contents</h4><ol>${lines}</ol></div>`).run()
  }

  // ── Editors ─────────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: makeExtensions('Start writing…', setTocItems),
    content: '',
    editorProps: { attributes: { style: 'outline: none;' } },
    onUpdate: ({ editor }) => {
      const content = editor.getJSON()
      latestContent.current = content
      setSaveState('unsaved')
      setWordCount(editor.storage.characterCount?.words() ?? 0)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(content), 2000)
    },
  })

  useEffect(() => {
    if (!editor || !doc) return
    if (doc.content && Object.keys(doc.content).length > 0) {
      editor.commands.setContent(doc.content)
      setWordCount(editor.storage.characterCount?.words() ?? 0)
    }
  }, [editor, doc])

  const refEditor = useEditor({
    extensions: makeExtensions('', () => {}),
    content: '', editable: false,
    editorProps: { attributes: { style: 'outline: none;' } },
  })

  useEffect(() => {
    if (!refEditor || !doc) return
    const ex = doc.example_content
    if (ex && typeof ex === 'object' && Object.keys(ex).length > 0) refEditor.commands.setContent(ex)
  }, [refEditor, doc])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (latestContent.current) { if (saveTimer.current) clearTimeout(saveTimer.current); save(latestContent.current) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [save])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#8a96a2', fontSize: 13 }}>Loading…</div>
  if (!doc) return null

  const st = DOC_STATUS[docStatus] || DOC_STATUS.draft
  const isClient = userRole === 'client'
  const isApproved = docStatus === 'approved'
  const isReview = docStatus === 'review'
  const isAdmin = userRole === 'admin'
  const isConsultant = userRole === 'consultant'
  const backHref = isClient ? `/dashboard/client/projects/${projectId}` : `/dashboard/projects/${projectId}`
  const unresolvedComments = comments.filter(c => !c.resolved).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', background: '#f5f2ee' }}>
      <style>{buildEditorStyles(sizes)}</style>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 48, flexShrink: 0, borderBottom: '1px solid #e0ddd8', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8a96a2', minWidth: 0 }}>
          <Link href={isClient ? '/dashboard/client' : '/dashboard/projects'} style={{ color: '#8a96a2', textDecoration: 'none' }}>{isClient ? 'My Projects' : 'Projects'}</Link>
          <span>›</span>
          <Link href={backHref} style={{ color: '#8a96a2', textDecoration: 'none', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{doc.project_name}</Link>
          <span>›</span>
          <span style={{ color: '#1a1f24', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{doc.name}{doc.revision && doc.revision > 1 ? ` (rev.${doc.revision})` : ''}</span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: saveState === 'saved' ? '#3a7a5a' : saveState === 'saving' ? '#8a6020' : saveState === 'error' ? '#943030' : '#8a96a2' }}>
            {saveState === 'saved' ? '✓ Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? '⚠ Error' : '● Unsaved'}
          </span>

          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, border: `0.5px solid ${st.border}`, fontWeight: 500 }}>{st.label}</span>

          {/* Admin/consultant status dropdown */}
          {(isAdmin || isConsultant) && (
            <select value={docStatus} onChange={e => updateStatus(e.target.value)} style={{ height: 28, padding: '0 8px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, background: '#fff', color: '#2e3640', cursor: 'pointer' }}>
              <option value="draft">Draft</option>
              <option value="inprogress">In progress</option>
              <option value="review">In review</option>
              <option value="approved">Approved</option>
            </select>
          )}

          {/* Client: submit */}
          {isClient && !isApproved && !isReview && (
            <button onClick={submitForReview} disabled={submitting} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: '#4e8c8c', border: 'none', borderRadius: 6, color: '#fff', opacity: submitting ? 0.7 : 1, fontWeight: 500 }}>
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
          )}
          {isClient && isReview && <span style={{ fontSize: 12, color: '#8a6020', fontWeight: 500 }}>⏳ Awaiting review</span>}
          {isClient && isApproved && <span style={{ fontSize: 12, color: '#3a7a5a', fontWeight: 500 }}>✓ Approved</span>}

          {/* Consultant/admin: approve or request changes */}
          {(isAdmin || isConsultant) && isReview && (
            <>
              <button onClick={approveDoc} disabled={approving} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: '#3a7a5a', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 500, opacity: approving ? 0.7 : 1 }}>
                {approving ? 'Approving…' : '✓ Approve'}
              </button>
              <button onClick={() => setShowRequestChanges(v => !v)} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: showRequestChanges ? 'rgba(148,48,48,0.1)' : 'transparent', border: '0.5px solid rgba(148,48,48,0.35)', borderRadius: 6, color: '#943030', fontWeight: 500 }}>
                Request changes
              </button>
            </>
          )}

          {/* Admin: new revision from approved */}
          {isAdmin && isApproved && (
            <button onClick={reviseDoc} disabled={revising} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', opacity: revising ? 0.7 : 1 }}>
              {revising ? 'Creating…' : '↻ New revision'}
            </button>
          )}

          {/* Comments toggle */}
          <button onClick={() => setShowComments(v => !v)} style={{ height: 28, padding: '0 10px', fontSize: 12, cursor: 'pointer', background: showComments ? 'rgba(200,169,110,0.12)' : 'transparent', border: showComments ? '0.5px solid rgba(200,169,110,0.4)' : '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: showComments ? '#8a6020' : '#5a6472', display: 'flex', alignItems: 'center', gap: 5 }}>
            <I.Comment />
            {unresolvedComments > 0 ? `${unresolvedComments}` : 'Comments'}
          </button>

          {/* Example toggle */}
          <button onClick={() => setShowReference(v => !v)} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: showReference ? 'rgba(78,140,140,0.1)' : 'transparent', border: showReference ? '0.5px solid rgba(78,140,140,0.4)' : '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: showReference ? '#2e5f5f' : '#5a6472', fontWeight: 500 }}>
            {showReference ? 'Hide example' : 'Show example'}
          </button>

          {/* Export */}
          <button onClick={exportDoc} disabled={exporting} style={{ height: 28, padding: '0 10px', fontSize: 12, cursor: exporting ? 'default' : 'pointer', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', display: 'flex', alignItems: 'center', gap: 5, opacity: exporting ? 0.6 : 1 }}>
            <I.Download />{exporting ? 'Exporting…' : 'DOCX'}
          </button>
        </div>
      </div>

      {/* ── Meta strip ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 16px', flexShrink: 0, borderBottom: '1px solid #e0ddd8', background: '#fff', fontSize: 11, color: '#8a96a2' }}>
        <span style={{ fontWeight: 500, color: '#5a6472' }}>{doc.annex}</span>
        <span>·</span><span style={{ fontFamily: 'monospace' }}>{doc.code}</span>
        {doc.template_name && <><span>·</span><span>Template: {doc.template_name} {doc.template_version}</span></>}
        <span>·</span><span>{doc.device_name}</span>
        <span style={{ marginLeft: 'auto' }}>{wordCount} words</span>
      </div>

      {/* ── Approved banner ── */}
      {isClient && isApproved && (
        <div style={{ padding: '8px 16px', flexShrink: 0, background: 'rgba(58,122,90,0.08)', borderBottom: '1px solid rgba(58,122,90,0.2)', fontSize: 12, color: '#3a7a5a' }}>
          ✓ This record has been approved and is read-only.
        </div>
      )}

      {/* ── Request changes panel ── */}
      {showRequestChanges && (
        <div style={{ padding: '12px 16px', flexShrink: 0, background: 'rgba(148,48,48,0.05)', borderBottom: '1px solid rgba(148,48,48,0.15)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#943030', marginBottom: 6 }}>Reason for requesting changes</div>
            <textarea value={changeReason} onChange={e => setChangeReason(e.target.value)} placeholder="Explain what needs to be changed…" autoFocus
              style={{ width: '100%', height: 70, padding: '8px 10px', fontSize: 12, border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 6, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 22 }}>
            <button onClick={requestChanges} disabled={!changeReason.trim()} style={{ height: 28, padding: '0 12px', fontSize: 12, background: '#943030', border: 'none', borderRadius: 6, color: '#fff', cursor: changeReason.trim() ? 'pointer' : 'default', opacity: changeReason.trim() ? 1 : 0.5 }}>Send</button>
            <button onClick={() => { setShowRequestChanges(false); setChangeReason('') }} style={{ height: 28, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Split pane ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* Left — editable */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: showReference ? '1px solid #d8d4ce' : 'none' }}>
          {!(isClient && isApproved) && (
            <Toolbar editor={editor} sizes={sizes} onSizeChange={(k, v) => setSizes(p => ({ ...p, [k]: v }))}
              showOutline={showOutline} onToggleOutline={() => setShowOutline(v => !v)} onInsertToc={insertToc} />
          )}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            {showOutline && <OutlinePanel items={tocItems} onClose={() => setShowOutline(false)} />}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', background: '#f5f2ee' }}>
              <div style={{ maxWidth: 780, margin: '0 auto', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)', borderRadius: 2, padding: '60px 72px', minHeight: 900 }}>
                <EditorContent editor={isClient && isApproved ? refEditor : editor} />
              </div>
              <div style={{ height: 48 }} />
            </div>
          </div>
        </div>

        {/* Right — example */}
        {showReference && (
          <div style={{ width: '40%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ede9e3', borderRight: showComments ? '1px solid #d8d4ce' : 'none' }}>
            <div style={{ padding: '8px 16px', flexShrink: 0, borderBottom: '1px solid #d8d4ce', background: '#e8e3dc', fontSize: 11, fontWeight: 600, color: '#5a6472', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
              <span>Example</span>
              {doc.template_name && <span style={{ fontWeight: 400, color: '#8a96a2', textTransform: 'none' as const, letterSpacing: 0 }}>— {doc.template_name}</span>}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
              {hasExample ? (
                <div style={{ maxWidth: 780, margin: '0 auto', background: '#fff', opacity: 0.92, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderRadius: 2, padding: '60px 72px', minHeight: 900 }}>
                  <EditorContent editor={refEditor} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, opacity: 0.2 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#5a6472' }}>No example available</div>
                  <div style={{ fontSize: 12, color: '#8a96a2', maxWidth: 240, lineHeight: 1.7 }}>Ask your consultant to provide an example.</div>
                </div>
              )}
              <div style={{ height: 48 }} />
            </div>
          </div>
        )}

        {/* Comments panel */}
        {showComments && (
          <CommentsPanel
            comments={comments} commentsLoading={commentsLoading}
            newComment={newComment} setNewComment={setNewComment}
            replyTo={replyTo} setReplyTo={setReplyTo}
            postingComment={postingComment} postComment={postComment}
            resolveComment={resolveComment} onClose={() => setShowComments(false)}
          />
        )}
      </div>
    </div>
  )
}
