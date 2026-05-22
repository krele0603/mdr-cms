'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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

// TODO: Add more fonts — consider adding:
// - Roboto, Open Sans (common professional sans-serif)
// - Calibri (default Word font — important for QMS docs)
// - Garamond, Palatino (traditional document fonts)
// - Source Sans Pro, Lato (modern clean options)
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
  ArrowLeft:   () => <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><path d='M19 12H5'/><polyline points='12 19 5 12 12 5'/></svg>,
}

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
      <Btn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><I.Undo /></Btn>
      <Btn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><I.Redo /></Btn>
      <Sep />
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
      <div ref={fontRef}>
        <Btn title="Font sizes" active={showFont} onClick={() => { setFontPos(getPos(fontRef)); closeAll(); setShowFont(v => !v) }}>
          <span style={{ fontSize: 11, fontWeight: 600 }}>Aa</span><I.ChevDown />
        </Btn>
      </div>
      {showFont && (<><Overlay onClose={() => setShowFont(false)} /><FontPanel sizes={sizes} onChange={onSizeChange} onClose={() => setShowFont(false)} pos={fontPos} /></>)}
      <Sep />
      <Btn title="Bold"          active={editor.isActive('bold')}      onClick={() => editor.chain().focus().toggleBold().run()}><I.Bold /></Btn>
      <Btn title="Italic"        active={editor.isActive('italic')}    onClick={() => editor.chain().focus().toggleItalic().run()}><I.Italic /></Btn>
      <Btn title="Underline"     active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><I.Underline /></Btn>
      <Btn title="Strikethrough" active={editor.isActive('strike')}    onClick={() => editor.chain().focus().toggleStrike().run()}><I.Strike /></Btn>
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
      <Btn title="Bullet list"   active={editor.isActive('bulletList')}  onClick={() => editor.chain().focus().toggleBulletList().run()}><I.BulletList /></Btn>
      <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><I.OrderedList /></Btn>
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
      <Btn title="Align left"   active={editor.isActive({ textAlign: 'left' })}    onClick={() => editor.chain().focus().setTextAlign('left').run()}><I.AlignLeft /></Btn>
      <Btn title="Align center" active={editor.isActive({ textAlign: 'center' })}  onClick={() => editor.chain().focus().setTextAlign('center').run()}><I.AlignCenter /></Btn>
      <Btn title="Align right"  active={editor.isActive({ textAlign: 'right' })}   onClick={() => editor.chain().focus().setTextAlign('right').run()}><I.AlignRight /></Btn>
      <Btn title="Justify"      active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><I.AlignJust /></Btn>
      <Sep />
      <Btn title="Insert image" onClick={onInsertImage}><I.Image /></Btn>
    </div>
  )
}

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

export default function QmsTemplateEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [level, setLevel] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [sizes, setSizes] = useState(DEFAULT_SIZES)

  const editor = useEditor({
    extensions: makeExtensions(),
    editable: true,
  })

  useEffect(() => {
    fetch(`/api/qms-templates/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setName(data.name || '')
        setLevel(data.level || 0)
        if (editor && data.content && data.content.type === 'doc') {
          editor.commands.setContent(data.content)
        }
        setLoading(false)
      })
  }, [params.id, editor])

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
      const res = await fetch(`/api/qms-templates/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), content: editor.getJSON() }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally { setSaving(false) }
  }

  const lv = LEVELS.find(l => l.level === level)
  const wordCount = editor?.storage.characterCount?.words() ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f2ee' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 48, background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.1)', flexShrink: 0 }}>
        <button onClick={() => router.push('/dashboard/qms-templates')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: '#5a6472' }}>
          <I.ArrowLeft /> Back
        </button>

        {lv && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: lv.bg, color: lv.color, border: `0.5px solid ${lv.border}`, fontWeight: 500, whiteSpace: 'nowrap' as const }}>
            Level {level} — {lv.label}
          </span>
        )}

        <input value={name} onChange={e => setName(e.target.value)}
          style={{ flex: 1, fontSize: 15, fontWeight: 600, border: 'none', outline: 'none', color: '#1a1f24', background: 'transparent' }} />

        <span style={{ fontSize: 11, color: '#9b9991', flexShrink: 0 }}>{wordCount} words</span>

        {saved && (
          <span style={{ fontSize: 12, color: '#27500A', background: '#EAF3DE', padding: '3px 10px', borderRadius: 6, flexShrink: 0 }}>Saved ✓</span>
        )}

        <button onClick={handleSave} disabled={saving || !name.trim()}
          style={{ height: 32, padding: '0 20px', fontSize: 13, background: '#185FA5', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontWeight: 500, opacity: saving ? 0.7 : 1, flexShrink: 0 }}>
          {saving ? 'Saving…' : 'Save template'}
        </button>
      </div>

      {/* Toolbar */}
      <FullToolbar
        editor={editor}
        sizes={sizes}
        onSizeChange={(k, v) => setSizes(p => ({ ...p, [k]: v }))}
        onInsertImage={insertImage}
      />

      {/* Editor body — full width */}
      <div style={{ flex: 1, overflow: 'auto', padding: '32px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#9b9991', padding: 40, fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ maxWidth: 1100, margin: '0 auto', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 2, padding: '48px 72px', minHeight: 600 }}>
            <style>{`
              .ProseMirror { outline: none; font-size: ${sizes.p}px; line-height: 1.8; color: #1a1f24; min-height: 500px; }
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
    </div>
  )
}
