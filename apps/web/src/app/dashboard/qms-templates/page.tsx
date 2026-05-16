'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import FontFamily from '@tiptap/extension-font-family'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import CharacterCount from '@tiptap/extension-character-count'
import { TableOfContents, getHierarchicalIndexes } from '@tiptap/extension-table-of-contents'

const LEVELS = [
  { level: 1, label: 'Policies',          color: '#3C3489', bg: '#EEEDFE', border: '#AFA9EC' },
  { level: 2, label: 'Procedures',        color: '#0C447C', bg: '#E6F1FB', border: '#85B7EB' },
  { level: 3, label: 'Work Instructions', color: '#27500A', bg: '#EAF3DE', border: '#97C459' },
  { level: 4, label: 'Forms & Templates', color: '#633806', bg: '#FAEEDA', border: '#FAC775' },
]

interface Template {
  id: string
  name: string
  level: number
  status: string
  created_at: string
  updated_at: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const FONTS = [
  { label: 'DM Sans',            value: "'DM Sans', sans-serif" },
  { label: 'Cormorant Garamond', value: "'Cormorant Garamond', serif" },
  { label: 'Georgia',            value: 'Georgia, serif' },
  { label: 'Times New Roman',    value: "'Times New Roman', serif" },
  { label: 'Arial',              value: 'Arial, sans-serif' },
  { label: 'Helvetica',          value: 'Helvetica, Arial, sans-serif' },
  { label: 'Courier New',        value: "'Courier New', monospace" },
]

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

const DEFAULT_SIZES = { p: 13, h1: 22, h2: 18, h3: 15, h4: 13 }

// ── Icons ────────────────────────────────────────────────────────────────────
const I = {
  Bold:        () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><path d='M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z'/><path d='M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z'/></svg>,
  Italic:      () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><line x1='19' y1='4' x2='10' y2='4'/><line x1='14' y1='20' x2='5' y2='20'/><line x1='15' y1='4' x2='9' y2='20'/></svg>,
  Underline:   () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><path d='M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3'/><line x1='4' y1='21' x2='20' y2='21'/></svg>,
  Strike:      () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='5' y1='12' x2='19' y2='12'/><path d='M16 6C16 6 14 4 12 4c-2.2 0-4 1.8-4 4 0 1.9 1.3 3 3 3.5'/><path d='M8 18s2 2 4 2c2.2 0 4-1.8 4-4 0-1.9-1.3-3-3-3.5'/></svg>,
  Highlight:   () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><path d='M12 20h9'/><path d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'/></svg>,
  BulletList:  () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='9' y1='6' x2='20' y2='6'/><line x1='9' y1='12' x2='20' y2='12'/><line x1='9' y1='18' x2='20' y2='18'/><circle cx='4' cy='6' r='1.5' fill='currentColor' stroke='none'/><circle cx='4' cy='12' r='1.5' fill='currentColor' stroke='none'/><circle cx='4' cy='18' r='1.5' fill='currentColor' stroke='none'/></svg>,
  OrderedList: () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='10' y1='6' x2='21' y2='6'/><line x1='10' y1='12' x2='21' y2='12'/><line x1='10' y1='18' x2='21' y2='18'/><path d='M4 6h1v4M4 10h2' strokeWidth='1.5'/><path d='M6 18H4c0-1 2-2 2-3s-1-1.5-2-1' strokeWidth='1.5'/></svg>,
  AlignLeft:   () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='3' y1='6' x2='21' y2='6'/><line x1='3' y1='12' x2='15' y2='12'/><line x1='3' y1='18' x2='18' y2='18'/></svg>,
  AlignCenter: () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='3' y1='6' x2='21' y2='6'/><line x1='6' y1='12' x2='18' y2='12'/><line x1='4' y1='18' x2='20' y2='18'/></svg>,
  AlignRight:  () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='3' y1='6' x2='21' y2='6'/><line x1='9' y1='12' x2='21' y2='12'/><line x1='6' y1='18' x2='21' y2='18'/></svg>,
  AlignJust:   () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='3' y1='6' x2='21' y2='6'/><line x1='3' y1='12' x2='21' y2='12'/><line x1='3' y1='18' x2='21' y2='18'/></svg>,
  Table:       () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><rect x='3' y='3' width='18' height='18' rx='2'/><line x1='3' y1='9' x2='21' y2='9'/><line x1='3' y1='15' x2='21' y2='15'/><line x1='9' y1='9' x2='9' y2='21'/><line x1='15' y1='9' x2='15' y2='21'/></svg>,
  Undo:        () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><path d='M3 7v6h6'/><path d='M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13'/></svg>,
  Redo:        () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><path d='M21 7v6h-6'/><path d='M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13'/></svg>,
  Image:       () => <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><rect x='3' y='3' width='18' height='18' rx='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-5-5L5 21'/></svg>,
  ChevDown:    () => <svg width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'><polyline points='6 9 12 15 18 9'/></svg>,
}

// ── Toolbar helpers ──────────────────────────────────────────────────────────

function Btn({ active, disabled, onClick, title, children }: {
  active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button onMouseDown={e => { e.preventDefault(); if (!disabled) onClick() }} disabled={disabled} title={title}
      style={{ height: 28, minWidth: 28, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, border: 'none', borderRadius: 4, background: active ? 'rgba(24,95,165,0.12)' : 'transparent', color: active ? '#185FA5' : disabled ? '#ccc' : '#2e3640', cursor: disabled ? 'default' : 'pointer', fontSize: 12 }}
      onMouseEnter={e => { if (!disabled && !active) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.05)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >{children}</button>
  )
}

function Sep() { return <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.12)', margin: '0 2px', flexShrink: 0 }} /> }
function Overlay({ onClose }: { onClose: () => void }) { return <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={onClose} /> }

// ── Font size panel ──────────────────────────────────────────────────────────

function FontPanel({ sizes, onChange, onClose, pos }: {
  sizes: typeof DEFAULT_SIZES
  onChange: (k: keyof typeof DEFAULT_SIZES, v: number) => void
  onClose: () => void
  pos: { top: number; left: number }
}) {
  const rows: { key: keyof typeof DEFAULT_SIZES; label: string }[] = [
    { key: 'p',  label: 'Normal text' },
    { key: 'h1', label: 'Heading 1' },
    { key: 'h2', label: 'Heading 2' },
    { key: 'h3', label: 'Heading 3' },
    { key: 'h4', label: 'Heading 4' },
  ]
  return (
    <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', padding: 14, width: 280 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10 }}>Font sizes</div>
      {rows.map(r => (
        <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, fontSize: 11, color: '#5a6472' }}>{r.label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            <button onClick={() => onChange(r.key, Math.max(8, sizes[r.key] - 1))} style={{ width: 22, height: 22, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 4, background: '#f5f2ee', cursor: 'pointer', fontSize: 14 }}>−</button>
            <input type="number" value={sizes[r.key]} onChange={e => onChange(r.key, Math.max(8, Math.min(72, parseInt(e.target.value) || sizes[r.key])))}
              style={{ width: 38, height: 22, textAlign: 'center' as const, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: 12, outline: 'none' }} />
            <button onClick={() => onChange(r.key, Math.min(72, sizes[r.key] + 1))} style={{ width: 22, height: 22, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 4, background: '#f5f2ee', cursor: 'pointer', fontSize: 14 }}>+</button>
          </div>
        </div>
      ))}
      <button onClick={onClose} style={{ width: '100%', height: 26, marginTop: 4, fontSize: 12, background: '#185FA5', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Done</button>
    </div>
  )
}

// ── Full Toolbar ─────────────────────────────────────────────────────────────

function FullToolbar({ editor, sizes, onSizeChange, onInsertImage }: {
  editor: any
  sizes: typeof DEFAULT_SIZES
  onSizeChange: (k: keyof typeof DEFAULT_SIZES, v: number) => void
  onInsertImage: () => void
}) {
  const [showFont, setShowFont] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [hoverCell, setHoverCell] = useState({ r: 0, c: 0 })
  const [showTextColor, setShowTextColor] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const fontRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const textColorRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const [fontPos, setFontPos] = useState({ top: 0, left: 0 })
  const [tablePos, setTablePos] = useState({ top: 0, left: 0 })
  const [textColorPos, setTextColorPos] = useState({ top: 0, left: 0 })
  const [highlightPos, setHighlightPos] = useState({ top: 0, left: 0 })

  if (!editor) return null

  const headingValue = editor.isActive('heading', { level: 1 }) ? '1'
    : editor.isActive('heading', { level: 2 }) ? '2'
    : editor.isActive('heading', { level: 3 }) ? '3'
    : editor.isActive('heading', { level: 4 }) ? '4' : '0'
  const currentFont = FONTS.find(f => editor.isActive('textStyle', { fontFamily: f.value }))?.value || FONTS[0].value
  const inTable = editor.can().addColumnAfter()

  function getPos(ref: React.RefObject<HTMLDivElement>) {
    if (!ref.current) return { top: 0, left: 0 }
    const r = ref.current.getBoundingClientRect()
    return { top: r.bottom + 4, left: r.left }
  }
  function closeAll() { setShowFont(false); setShowTable(false); setShowTextColor(false); setShowHighlight(false) }

  const tableOpts = [
    { label: 'Add column before', disabled: !inTable, onClick: () => editor.chain().focus().addColumnBefore().run() },
    { label: 'Add column after',  disabled: !inTable, onClick: () => editor.chain().focus().addColumnAfter().run() },
    { label: 'Delete column',     disabled: !inTable, danger: true, onClick: () => editor.chain().focus().deleteColumn().run() },
    { sep: true },
    { label: 'Add row before',    disabled: !inTable, onClick: () => editor.chain().focus().addRowBefore().run() },
    { label: 'Add row after',     disabled: !inTable, onClick: () => editor.chain().focus().addRowAfter().run() },
    { label: 'Delete row',        disabled: !inTable, danger: true, onClick: () => editor.chain().focus().deleteRow().run() },
    { sep: true },
    { label: 'Toggle header row', disabled: !inTable, onClick: () => editor.chain().focus().toggleHeaderRow().run() },
    { label: 'Delete table',      disabled: !inTable, danger: true, onClick: () => editor.chain().focus().deleteTable().run() },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 1, padding: '3px 8px', borderBottom: '0.5px solid rgba(0,0,0,0.1)', background: '#f8f7f4', overflowX: 'auto' }}>
      {/* Undo/Redo */}
      <Btn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><I.Undo /></Btn>
      <Btn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><I.Redo /></Btn>
      <Sep />

      {/* Heading + Font */}
      <select value={headingValue} onChange={e => {
        const v = e.target.value
        if (v === '0') editor.chain().focus().setParagraph().run()
        else editor.chain().focus().toggleHeading({ level: parseInt(v) as 1|2|3|4 }).run()
      }} style={{ height: 26, padding: '0 5px', fontSize: 11, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#2e3640' }}>
        <option value="0">Normal</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="4">Heading 4</option>
      </select>

      <select value={currentFont} onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
        style={{ height: 26, padding: '0 5px', fontSize: 11, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#2e3640', maxWidth: 130, marginLeft: 3 }}>
        {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      {/* Font sizes */}
      <div ref={fontRef}>
        <Btn title="Font sizes" active={showFont} onClick={() => { setFontPos(getPos(fontRef)); closeAll(); setShowFont(v => !v) }}>
          <span style={{ fontSize: 11, fontWeight: 600 }}>Aa</span><I.ChevDown />
        </Btn>
      </div>
      {showFont && (<><Overlay onClose={() => setShowFont(false)} /><FontPanel sizes={sizes} onChange={onSizeChange} onClose={() => setShowFont(false)} pos={fontPos} /></>)}

      <Sep />

      {/* Basic formatting */}
      <Btn title="Bold"          active={editor.isActive('bold')}      onClick={() => editor.chain().focus().toggleBold().run()}><I.Bold /></Btn>
      <Btn title="Italic"        active={editor.isActive('italic')}    onClick={() => editor.chain().focus().toggleItalic().run()}><I.Italic /></Btn>
      <Btn title="Underline"     active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><I.Underline /></Btn>
      <Btn title="Strikethrough" active={editor.isActive('strike')}    onClick={() => editor.chain().focus().toggleStrike().run()}><I.Strike /></Btn>

      {/* Text color */}
      <div ref={textColorRef}>
        <button onMouseDown={e => { e.preventDefault(); setTextColorPos(getPos(textColorRef)); closeAll(); setShowTextColor(v => !v) }}
          title="Text color" style={{ height: 28, minWidth: 28, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' as const, gap: 1, border: 'none', borderRadius: 4, background: showTextColor ? 'rgba(24,95,165,0.12)' : 'transparent', cursor: 'pointer' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: editor.getAttributes('textStyle').color || '#1a1f24', lineHeight: 1 }}>A</span>
          <div style={{ width: 13, height: 3, borderRadius: 1, background: editor.getAttributes('textStyle').color || '#1a1f24' }} />
        </button>
        {showTextColor && (
          <><Overlay onClose={() => setShowTextColor(false)} />
          <div style={{ position: 'fixed', top: textColorPos.top, left: textColorPos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 10, width: 168 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#8a96a2', marginBottom: 7, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Text color</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
              {TEXT_COLORS.map(c => (
                <button key={c.label} title={c.label} onMouseDown={e => {
                  e.preventDefault()
                  if (c.value) editor.chain().focus().setColor(c.value).run()
                  else editor.chain().focus().unsetColor().run()
                  setShowTextColor(false)
                }} style={{ width: 22, height: 22, borderRadius: 5, border: c.value === null ? '1px dashed #ccc' : '1px solid rgba(0,0,0,0.15)', background: c.value || '#fff', cursor: 'pointer', position: 'relative' as const, flexShrink: 0 }}>
                  {!c.value && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#8a96a2' }}>✕</span>}
                </button>
              ))}
            </div>
          </div></>
        )}
      </div>

      {/* Highlight */}
      <div ref={highlightRef}>
        <button onMouseDown={e => { e.preventDefault(); setHighlightPos(getPos(highlightRef)); closeAll(); setShowHighlight(v => !v) }}
          title="Highlight" style={{ height: 28, minWidth: 28, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' as const, gap: 1, border: 'none', borderRadius: 4, background: showHighlight ? 'rgba(24,95,165,0.12)' : 'transparent', cursor: 'pointer' }}>
          <I.Highlight />
          <div style={{ width: 13, height: 3, borderRadius: 1, background: '#fef08a', border: '0.5px solid #d4c030' }} />
        </button>
        {showHighlight && (
          <><Overlay onClose={() => setShowHighlight(false)} />
          <div style={{ position: 'fixed', top: highlightPos.top, left: highlightPos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 10, width: 136 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#8a96a2', marginBottom: 7, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Highlight</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c.label} title={c.label} onMouseDown={e => {
                  e.preventDefault()
                  if (c.value) editor.chain().focus().toggleHighlight({ color: c.value }).run()
                  else editor.chain().focus().unsetHighlight().run()
                  setShowHighlight(false)
                }} style={{ width: 22, height: 22, borderRadius: 5, border: c.value === null ? '1px dashed #ccc' : '1px solid rgba(0,0,0,0.15)', background: c.value || '#fff', cursor: 'pointer', position: 'relative' as const, flexShrink: 0 }}>
                  {!c.value && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#8a96a2' }}>✕</span>}
                </button>
              ))}
            </div>
          </div></>
        )}
      </div>

      <Sep />

      {/* Lists */}
      <Btn title="Bullet list"   active={editor.isActive('bulletList')}  onClick={() => editor.chain().focus().toggleBulletList().run()}><I.BulletList /></Btn>
      <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><I.OrderedList /></Btn>

      {/* Table with grid picker */}
      <div ref={tableRef}>
        <Btn title="Table" active={showTable} onClick={() => { setTablePos(getPos(tableRef)); closeAll(); setShowTable(v => !v) }}>
          <I.Table />
        </Btn>
        {showTable && (
          <><Overlay onClose={() => { setShowTable(false); setHoverCell({ r: 0, c: 0 }) }} />
          <div style={{ position: 'fixed', top: tablePos.top, left: tablePos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.14)', padding: '10px 10px 8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 16px)', gap: 2, marginBottom: 5 }}>
              {Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => (
                <div key={`${r}-${c}`}
                  onMouseEnter={() => setHoverCell({ r: r + 1, c: c + 1 })}
                  onMouseDown={e => { e.preventDefault(); editor.chain().focus().insertTable({ rows: r + 1, cols: c + 1, withHeaderRow: true }).run(); setShowTable(false); setHoverCell({ r: 0, c: 0 }) }}
                  style={{ width: 16, height: 16, borderRadius: 2, border: '1px solid', borderColor: (hoverCell.r > r && hoverCell.c > c) ? '#185FA5' : 'rgba(0,0,0,0.15)', background: (hoverCell.r > r && hoverCell.c > c) ? 'rgba(24,95,165,0.12)' : '#fff', cursor: 'pointer' }}
                />
              )))}
            </div>
            <div style={{ fontSize: 10, color: '#5a6472', textAlign: 'center' as const, marginBottom: 5 }}>
              {hoverCell.r > 0 ? `${hoverCell.r} × ${hoverCell.c}` : 'Hover to select'}
            </div>
            {inTable && (
              <div style={{ borderTop: '0.5px solid #e0ddd8', paddingTop: 5 }}>
                {tableOpts.map((item, i) => (item as any).sep ? (
                  <div key={i} style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />
                ) : (
                  <button key={i} onMouseDown={e => { e.preventDefault(); if (!(item as any).disabled) { (item as any).onClick(); setShowTable(false) } }}
                    disabled={(item as any).disabled}
                    style={{ display: 'block', width: '100%', textAlign: 'left' as const, padding: '4px 7px', fontSize: 11, border: 'none', background: 'transparent', cursor: (item as any).disabled ? 'default' : 'pointer', color: (item as any).disabled ? '#ccc' : (item as any).danger ? '#943030' : '#1a1f24', borderRadius: 3 }}
                    onMouseEnter={e => { if (!(item as any).disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    {(item as any).label}
                  </button>
                ))}
              </div>
            )}
          </div></>
        )}
      </div>

      <Sep />

      {/* Alignment */}
      <Btn title="Align left"   active={editor.isActive({ textAlign: 'left' })}    onClick={() => editor.chain().focus().setTextAlign('left').run()}><I.AlignLeft /></Btn>
      <Btn title="Align center" active={editor.isActive({ textAlign: 'center' })}  onClick={() => editor.chain().focus().setTextAlign('center').run()}><I.AlignCenter /></Btn>
      <Btn title="Align right"  active={editor.isActive({ textAlign: 'right' })}   onClick={() => editor.chain().focus().setTextAlign('right').run()}><I.AlignRight /></Btn>
      <Btn title="Justify"      active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><I.AlignJust /></Btn>

      <Sep />

      {/* Image */}
      <Btn title="Insert image" onClick={onInsertImage}><I.Image /></Btn>
    </div>
  )
}

// ── Editor extensions ────────────────────────────────────────────────────────

function makeExtensions() {
  return [
    StarterKit,
    TextStyle,
    FontFamily,
    Underline,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image.configure({ inline: false, allowBase64: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CharacterCount,
    Placeholder.configure({ placeholder: 'Template content…' }),
    TableOfContents.configure({ getIndex: getHierarchicalIndexes, onUpdate: () => {} }),
  ]
}

// ── Template editor modal ────────────────────────────────────────────────────

function TemplateEditorModal({ template, onClose, onSaved }: {
  template: Template & { content?: any }
  onClose: () => void
  onSaved: (t: Template) => void
}) {
  const [name, setName] = useState(template.name)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sizes, setSizes] = useState(DEFAULT_SIZES)
  const contentLoaded = useRef(false)

  const editor = useEditor({
    extensions: makeExtensions(),
    editable: true,
  })

  useEffect(() => {
    fetch(`/api/qms-templates/${template.id}`)
      .then(r => r.json())
      .then(data => {
        if (editor && data.content && data.content.type === 'doc') {
          editor.commands.setContent(data.content)
        }
        contentLoaded.current = true
        setLoading(false)
      })
  }, [template.id, editor])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

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

  async function handleSave() {
    if (!editor) return
    setSaving(true)
    try {
      const res = await fetch(`/api/qms-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), content: editor.getJSON() }),
      })
      if (res.ok) {
        const updated = await res.json()
        onSaved({ ...template, ...updated, name: name.trim() })
        onClose()
      }
    } finally { setSaving(false) }
  }

  const lv = LEVELS.find(l => l.level === template.level)!
  const wordCount = editor?.storage.characterCount?.words() ?? 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '94vw', maxWidth: 980, height: '92vh', display: 'flex', flexDirection: 'column' as const, boxShadow: '0 12px 48px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: lv.bg, color: lv.color, border: `0.5px solid ${lv.border}`, fontWeight: 500, whiteSpace: 'nowrap' as const }}>
            Level {template.level} — {lv.label}
          </span>
          <input value={name} onChange={e => setName(e.target.value)}
            style={{ flex: 1, fontSize: 15, fontWeight: 600, border: 'none', outline: 'none', color: '#1a1f24', background: 'transparent' }} />
          <span style={{ fontSize: 11, color: '#9b9991', flexShrink: 0 }}>{wordCount} words</span>
          <button type="button" onClick={onClose}
            style={{ width: 28, height: 28, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#5a6472', lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        {/* Full toolbar */}
        <FullToolbar
          editor={editor}
          sizes={sizes}
          onSizeChange={(k, v) => setSizes(p => ({ ...p, [k]: v }))}
          onInsertImage={insertImage}
        />

        {/* Editor body */}
        <div style={{ flex: 1, overflow: 'auto', background: '#f5f2ee', padding: '32px 0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9b9991', padding: 40, fontSize: 13 }}>Loading…</div>
          ) : (
            <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 2, padding: '48px 64px', minHeight: 500 }}>
              <style>{`
                .ProseMirror { outline: none; font-size: ${sizes.p}px; line-height: 1.8; color: #1a1f24; min-height: 400px; }
                .ProseMirror p { margin: 0 0 10px; }
                .ProseMirror h1 { font-family: 'Cormorant Garamond', serif; font-size: ${sizes.h1}px; font-weight: 700; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e0ddd8; }
                .ProseMirror h2 { font-family: 'Cormorant Garamond', serif; font-size: ${sizes.h2}px; font-weight: 600; margin: 20px 0 8px; }
                .ProseMirror h3 { font-size: ${sizes.h3}px; font-weight: 600; margin: 16px 0 6px; }
                .ProseMirror h4 { font-size: ${sizes.h4}px; font-weight: 600; margin: 12px 0 4px; color: #5a6472; }
                .ProseMirror ul { list-style-type: disc !important; padding-left: 22px; margin: 6px 0 10px; }
                .ProseMirror ol { list-style-type: decimal !important; padding-left: 22px; margin: 6px 0 10px; }
                .ProseMirror li { margin-bottom: 3px; }
                .ProseMirror li p { margin: 0; display: inline; }
                .ProseMirror table { border-collapse: collapse; width: 100%; margin: 14px 0; }
                .ProseMirror th { background: #f5f2ee; padding: 7px 11px; border: 1px solid #d8d4ce; font-weight: 600; font-size: ${sizes.p}px; }
                .ProseMirror td { padding: 7px 11px; border: 1px solid #d8d4ce; vertical-align: top; font-size: ${sizes.p}px; }
                .ProseMirror tr:nth-child(even) td { background: #faf9f7; }
                .ProseMirror .selectedCell { background: rgba(24,95,165,0.08) !important; }
                .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #8a96a2; pointer-events: none; height: 0; font-style: italic; }
                .ProseMirror img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; }
                .column-resize-handle { background-color: #185FA5; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }
              `}</style>
              <EditorContent editor={editor} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 18px', borderTop: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0, background: '#fff' }}>
          <button type="button" onClick={onClose}
            style={{ height: 32, padding: '0 16px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !name.trim()}
            style={{ height: 32, padding: '0 20px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Import DOCX modal ────────────────────────────────────────────────────────

function ImportModal({ defaultLevel, onClose, onImported }: {
  defaultLevel: number
  onClose: () => void
  onImported: (t: Template) => void
}) {
  const [level, setLevel] = useState(defaultLevel)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const previewEditor = useEditor({
    extensions: [StarterKit, Underline, TextAlign.configure({ types: ['heading', 'paragraph'] })],
    editable: false,
    content: preview?.content,
  })

  useEffect(() => {
    if (previewEditor && preview?.content) previewEditor.commands.setContent(preview.content)
  }, [preview, previewEditor])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith('.docx')) { setError('Only .docx files supported'); return }
    setFile(f)
    setName(f.name.replace(/\.docx$/i, '').replace(/[-_]/g, ' '))
    setPreview(null)
    setError('')
  }

  async function handlePreview() {
    if (!file || !name.trim()) { setError('Please select a file and enter a name'); return }
    setPreviewing(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file); fd.append('level', String(level)); fd.append('name', name.trim()); fd.append('preview', 'true')
      const res = await fetch('/api/qms-templates', { method: 'POST', body: fd })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Preview failed'); return }
      setPreview(await res.json())
    } catch (e: any) { setError(e.message) }
    finally { setPreviewing(false) }
  }

  async function handleSave() {
    if (!preview) return
    setSaving(true)
    try {
      const res = await fetch('/api/qms-templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), level, content: preview.content }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Save failed'); return }
      onImported(await res.json()); onClose()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '90vw', maxWidth: 780, maxHeight: '92vh', display: 'flex', flexDirection: 'column' as const, boxShadow: '0 12px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1f24' }}>Import DOCX template</div>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#5a6472' }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, color: '#5a6472', display: 'block', marginBottom: 6 }}>Template name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Document Control Procedure"
                style={{ width: '100%', height: 36, padding: '0 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#5a6472', display: 'block', marginBottom: 6 }}>Level</label>
              <select value={level} onChange={e => setLevel(Number(e.target.value))}
                style={{ width: '100%', height: 36, padding: '0 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none', background: '#fff', boxSizing: 'border-box' as const }}>
                {LEVELS.map(l => <option key={l.level} value={l.level}>{l.level}. {l.label}</option>)}
              </select>
            </div>
          </div>
          <div onClick={() => fileInputRef.current?.click()}
            style={{ border: `2px dashed ${file ? '#185FA5' : '#d8d4ce'}`, borderRadius: 8, padding: '20px', textAlign: 'center' as const, cursor: 'pointer', marginBottom: 16, background: file ? 'rgba(24,95,165,0.03)' : '#faf9f7' }}>
            <input ref={fileInputRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={handleFileChange} />
            {file ? (
              <div><div style={{ fontSize: 24, marginBottom: 4 }}>📄</div><div style={{ fontSize: 13, fontWeight: 600, color: '#185FA5' }}>{file.name}</div><div style={{ fontSize: 11, color: '#8a96a2', marginTop: 2 }}>{(file.size / 1024).toFixed(0)} KB — click to change</div></div>
            ) : (
              <div><div style={{ fontSize: 24, marginBottom: 4 }}>📁</div><div style={{ fontSize: 13, color: '#5a6472' }}>Click to select a .docx file</div><div style={{ fontSize: 11, color: '#8a96a2', marginTop: 2 }}>Word documents only</div></div>
            )}
          </div>
          {error && <div style={{ fontSize: 12, color: '#943030', marginBottom: 12, padding: '8px 12px', background: 'rgba(148,48,48,0.06)', borderRadius: 6 }}>{error}</div>}
          {preview && (
            <div style={{ border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: '#f5f2ee', borderBottom: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1f24' }}>Preview — {name}</div>
                {preview.warnings?.length > 0 && <div style={{ fontSize: 11, color: '#8a6020' }}>{preview.warnings.length} conversion warning(s)</div>}
              </div>
              <div style={{ padding: '16px 20px', maxHeight: 360, overflowY: 'auto' as const }}>
                <EditorContent editor={previewEditor} style={{ fontSize: 13, lineHeight: 1.8, color: '#1a1f24' }} />
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={onClose} style={{ height: 34, padding: '0 16px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>Cancel</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {!preview ? (
              <button type="button" onClick={handlePreview} disabled={!file || !name.trim() || previewing}
                style={{ height: 34, padding: '0 20px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, cursor: file && name.trim() ? 'pointer' : 'default', color: '#fff', fontWeight: 500, opacity: (!file || !name.trim() || previewing) ? 0.6 : 1 }}>
                {previewing ? 'Converting…' : 'Preview import'}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => setPreview(null)} style={{ height: 34, padding: '0 16px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>Re-select file</button>
                <button type="button" onClick={handleSave} disabled={saving} style={{ height: 34, padding: '0 20px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : 'Save template'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .ProseMirror { outline: none; }
        .ProseMirror h1 { font-size: 18px; font-weight: 700; margin: 12px 0 6px; }
        .ProseMirror h2 { font-size: 15px; font-weight: 600; margin: 10px 0 4px; }
        .ProseMirror h3 { font-size: 13px; font-weight: 600; margin: 8px 0 4px; }
        .ProseMirror p { margin: 0 0 6px; }
        .ProseMirror ul { list-style: disc; padding-left: 18px; margin: 4px 0; }
        .ProseMirror ol { list-style: decimal; padding-left: 18px; margin: 4px 0; }
        .ProseMirror table { border-collapse: collapse; width: 100%; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #e0ddd8; padding: 6px 10px; font-size: 12px; }
        .ProseMirror th { background: #f5f2ee; font-weight: 600; }
      `}</style>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function QmsTemplatesPage() {
  const [activeLevel, setActiveLevel] = useState(1)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => setUserRole(d?.user?.role || ''))
  }, [])

  useEffect(() => { loadTemplates() }, [activeLevel])

  async function loadTemplates() {
    setLoading(true)
    const res = await fetch(`/api/qms-templates?level=${activeLevel}`)
    if (res.ok) setTemplates(await res.json())
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Archive this template? It will no longer appear in the library.')) return
    setDeletingId(id)
    await fetch(`/api/qms-templates/${id}`, { method: 'DELETE' })
    setTemplates(prev => prev.filter(t => t.id !== id))
    setDeletingId(null)
  }

  const isAdmin = userRole === 'admin'
  const isAdminOrConsultant = ['admin', 'consultant'].includes(userRole)
  const lv = LEVELS.find(l => l.level === activeLevel)!

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8a96a2', marginBottom: 10 }}>
          <Link href="/dashboard" style={{ color: '#8a96a2', textDecoration: 'none' }}>Dashboard</Link>
          <span>›</span>
          <span style={{ color: '#1a1f24' }}>QMS Template Library</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1f24', margin: '0 0 4px' }}>QMS Template Library</h1>
            <div style={{ fontSize: 13, color: '#8a96a2' }}>Import and manage document templates for all QMS levels</div>
          </div>
          {isAdminOrConsultant && (
            <button type="button" onClick={() => setShowImport(true)}
              style={{ height: 36, padding: '0 18px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontWeight: 500 }}>
              + Import DOCX
            </button>
          )}
        </div>
      </div>

      {/* Level tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' as const }}>
        {LEVELS.map(l => (
          <button key={l.level} type="button" onClick={() => setActiveLevel(l.level)}
            style={{ height: 34, padding: '0 16px', fontSize: 13, border: activeLevel === l.level ? `1.5px solid ${l.color}` : '0.5px solid rgba(0,0,0,0.15)', borderRadius: 20, background: activeLevel === l.level ? l.bg : '#fff', color: activeLevel === l.level ? l.color : '#5a6472', cursor: 'pointer', fontWeight: activeLevel === l.level ? 600 : 400 }}>
            {l.level}. {l.label}
          </button>
        ))}
      </div>

      {/* Templates list */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: lv.bg, color: lv.color, border: `0.5px solid ${lv.border}`, fontWeight: 500 }}>Level {activeLevel}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1f24' }}>{lv.label}</span>
          </div>
          <span style={{ fontSize: 11, color: '#8a96a2' }}>{templates.length} template{templates.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' as const, color: '#9b9991', fontSize: 13 }}>Loading…</div>
        ) : templates.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14, color: '#5a6472', marginBottom: 4 }}>No templates yet</div>
            <div style={{ fontSize: 12, color: '#9b9991' }}>
              {isAdminOrConsultant ? 'Click "+ Import DOCX" to add templates for this level.' : 'No templates have been added for this level yet.'}
            </div>
          </div>
        ) : (
          templates.map((t, idx) => (
            <div key={t.id} style={{ padding: '14px 18px', borderBottom: idx < templates.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: lv.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f24', marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: '#8a96a2' }}>Updated {new Date(t.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
              {isAdminOrConsultant && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button type="button" onClick={() => setEditingTemplate(t)}
                    style={{ height: 30, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, cursor: 'pointer', color: '#5a6472' }}>
                    Edit
                  </button>
                  {isAdmin && (
                    <button type="button" onClick={() => handleDelete(t.id)} disabled={deletingId === t.id}
                      style={{ height: 30, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 6, cursor: 'pointer', color: '#943030', opacity: deletingId === t.id ? 0.5 : 1 }}>
                      Archive
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showImport && (
        <ImportModal defaultLevel={activeLevel} onClose={() => setShowImport(false)}
          onImported={(t) => { if (t.level === activeLevel) setTemplates(prev => [...prev, t]); setShowImport(false) }} />
      )}

      {editingTemplate && (
        <TemplateEditorModal template={editingTemplate} onClose={() => setEditingTemplate(null)}
          onSaved={(updated) => { setTemplates(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t)); setEditingTemplate(null) }} />
      )}
    </div>
  )
}
