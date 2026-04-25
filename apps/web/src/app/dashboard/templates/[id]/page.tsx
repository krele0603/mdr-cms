'use client'

import { useEffect, useState, useRef } from 'react'
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface TemplateVersion {
  id: string
  version: string
  is_current: boolean
  change_note: string | null
  created_at: string
  created_by_name: string | null
}

interface TemplateData {
  id: string
  name: string
  tag_code: string
  status: string
  created_by_name: string | null
  versions: TemplateVersion[]
  content?: any
  example_content?: any
  version_id?: string
  version?: string
}

type Tab = 'template' | 'example'
type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  active:   { bg: 'rgba(58,122,90,0.1)',   color: '#3a7a5a', border: 'rgba(58,122,90,0.3)' },
  draft:    { bg: '#f5f2ee',               color: '#5a6472', border: 'rgba(90,100,114,0.3)' },
  archived: { bg: 'rgba(148,48,48,0.08)',  color: '#943030', border: 'rgba(148,48,48,0.25)' },
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
  HRule:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>,
  Undo:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
  Redo:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>,
  ChevDown:    () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
}

// ── Shared button ─────────────────────────────────────────────────────────────

function Btn({ active, disabled, onClick, title, children, danger }: {
  active?: boolean; disabled?: boolean; onClick: () => void
  title: string; children: React.ReactNode; danger?: boolean
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); if (!disabled) onClick() }}
      disabled={disabled} title={title}
      style={{
        height: 30, minWidth: 30, padding: '0 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
        border: 'none', borderRadius: 5,
        background: active ? 'rgba(78,140,140,0.15)' : 'transparent',
        color: active ? '#2e5f5f' : disabled ? '#ccc' : danger ? '#943030' : '#2e3640',
        cursor: disabled ? 'default' : 'pointer', fontSize: 12,
      }}
      onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = 'rgba(0,0,0,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >{children}</button>
  )
}

function Sep() {
  return <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.12)', margin: '0 3px', flexShrink: 0 }} />
}

// ── Table submenu ─────────────────────────────────────────────────────────────

function TableMenu({ editor, onClose }: { editor: any; onClose: () => void }) {
  const inTable = editor.can().addColumnAfter()
  const Section = ({ title }: { title: string }) => (
    <div style={{ fontSize: 10, fontWeight: 600, color: '#8a96a2', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px 4px' }}>{title}</div>
  )
  const Item = ({ label, onClick, danger, disabled }: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) => (
    <button
      onMouseDown={e => { e.preventDefault(); if (!disabled) { onClick(); onClose() } }}
      disabled={disabled}
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: 12, border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer', color: disabled ? '#ccc' : danger ? '#943030' : '#1a1f24', borderRadius: 4 }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >{label}</button>
  )
  return (
    <div style={{ position: 'fixed', zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.14)', minWidth: 200, padding: '6px 0' }}>
      <Section title="Insert" />
      <Item label="Insert table (3×3)" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
      <Item label="Insert table (5×3)" onClick={() => editor.chain().focus().insertTable({ rows: 5, cols: 3, withHeaderRow: true }).run()} />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
      <Section title="Columns" />
      <Item label="Add column before" disabled={!inTable} onClick={() => editor.chain().focus().addColumnBefore().run()} />
      <Item label="Add column after"  disabled={!inTable} onClick={() => editor.chain().focus().addColumnAfter().run()} />
      <Item label="Delete column"     disabled={!inTable} danger onClick={() => editor.chain().focus().deleteColumn().run()} />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
      <Section title="Rows" />
      <Item label="Add row before" disabled={!inTable} onClick={() => editor.chain().focus().addRowBefore().run()} />
      <Item label="Add row after"  disabled={!inTable} onClick={() => editor.chain().focus().addRowAfter().run()} />
      <Item label="Delete row"     disabled={!inTable} danger onClick={() => editor.chain().focus().deleteRow().run()} />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
      <Section title="Table" />
      <Item label="Toggle header row" disabled={!inTable} onClick={() => editor.chain().focus().toggleHeaderRow().run()} />
      <Item label="Delete table" disabled={!inTable} danger onClick={() => editor.chain().focus().deleteTable().run()} />
    </div>
  )
}

// ── Font size panel ───────────────────────────────────────────────────────────

function FontPanel({ sizes, onChange, onClose }: {
  sizes: typeof DEFAULT_SIZES
  onChange: (key: keyof typeof DEFAULT_SIZES, val: number) => void
  onClose: () => void
}) {
  const rows: { key: keyof typeof DEFAULT_SIZES; label: string; style: React.CSSProperties }[] = [
    { key: 'p',  label: 'Normal text', style: { fontSize: sizes.p } },
    { key: 'h1', label: 'Heading 1',   style: { fontSize: Math.min(sizes.h1, 26), fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 } },
    { key: 'h2', label: 'Heading 2',   style: { fontSize: Math.min(sizes.h2, 22), fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 } },
    { key: 'h3', label: 'Heading 3',   style: { fontSize: Math.min(sizes.h3, 16), fontWeight: 600 } },
    { key: 'h4', label: 'Heading 4',   style: { fontSize: sizes.h4, fontWeight: 600, color: '#5a6472' } },
  ]
  return (
    <div style={{ position: 'fixed', zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', padding: 16, width: 310 }}>
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

// ── Toolbar ───────────────────────────────────────────────────────────────────

function Toolbar({ editor, sizes, onSizeChange }: {
  editor: any
  sizes: typeof DEFAULT_SIZES
  onSizeChange: (key: keyof typeof DEFAULT_SIZES, val: number) => void
}) {
  const [showTable, setShowTable] = useState(false)
  const [showFont, setShowFont] = useState(false)
  const tableBtnRef = useRef<HTMLDivElement>(null)
  const fontBtnRef = useRef<HTMLDivElement>(null)
  const [tablePos, setTablePos] = useState({ top: 0, left: 0 })
  const [fontPos, setFontPos] = useState({ top: 0, left: 0 })

  if (!editor) return null

  const headingValue = editor.isActive('heading', { level: 1 }) ? '1'
    : editor.isActive('heading', { level: 2 }) ? '2'
    : editor.isActive('heading', { level: 3 }) ? '3'
    : editor.isActive('heading', { level: 4 }) ? '4' : '0'

  const currentFont = FONTS.find(f => editor.isActive('textStyle', { fontFamily: f.value }))?.value || FONTS[0].value

  function openTable() {
    if (tableBtnRef.current) {
      const r = tableBtnRef.current.getBoundingClientRect()
      setTablePos({ top: r.bottom + 4, left: r.left })
    }
    setShowTable(v => !v)
    setShowFont(false)
  }

  function openFont() {
    if (fontBtnRef.current) {
      const r = fontBtnRef.current.getBoundingClientRect()
      setFontPos({ top: r.bottom + 4, left: r.left })
    }
    setShowFont(v => !v)
    setShowTable(false)
  }

  const Overlay = ({ onClose }: { onClose: () => void }) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={onClose} />
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, padding: '4px 10px', borderBottom: '1px solid #e0ddd8', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <Btn title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><I.Undo /></Btn>
      <Btn title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><I.Redo /></Btn>
      <Sep />

      <select value={headingValue} onChange={e => { const v = e.target.value; if (v === '0') editor.chain().focus().setParagraph().run(); else editor.chain().focus().toggleHeading({ level: parseInt(v) as 1|2|3|4 }).run() }}
        style={{ height: 28, padding: '0 6px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#2e3640' }}>
        <option value="0">Normal text</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="4">Heading 4</option>
      </select>

      <select value={currentFont} onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
        style={{ height: 28, padding: '0 6px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#2e3640', maxWidth: 160, marginLeft: 4 }}>
        {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      <div ref={fontBtnRef}>
        <Btn title="Font sizes" active={showFont} onClick={openFont}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Aa</span>
          <I.ChevDown />
        </Btn>
      </div>
      {showFont && (
        <>
          <Overlay onClose={() => setShowFont(false)} />
          <div style={{ position: 'fixed', top: fontPos.top, left: fontPos.left, zIndex: 9999 }}>
            <FontPanel sizes={sizes} onChange={onSizeChange} onClose={() => setShowFont(false)} />
          </div>
        </>
      )}

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

      <div ref={tableBtnRef}>
        <Btn title="Table" active={showTable} onClick={openTable}>
          <I.Table />
          <I.ChevDown />
        </Btn>
      </div>
      {showTable && (
        <>
          <Overlay onClose={() => setShowTable(false)} />
          <div style={{ position: 'fixed', top: tablePos.top, left: tablePos.left, zIndex: 9999 }}>
            <TableMenu editor={editor} onClose={() => setShowTable(false)} />
          </div>
        </>
      )}

      <Sep />
      <Btn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}><I.HRule /></Btn>
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
    .tableWrapper { overflow-x: auto; }
    .column-resize-handle { background-color: #4e8c8c; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }
  `
}

// ── Extensions ────────────────────────────────────────────────────────────────

function makeExtensions(placeholder: string) {
  return [
    StarterKit, TextStyle, FontFamily, Underline,
    Highlight.configure({ multicolor: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: true }),
    TableRow, TableHeader, TableCell,
    Placeholder.configure({ placeholder }),
    CharacterCount,
  ]
}

// ── Save modal ────────────────────────────────────────────────────────────────

function SaveModal({ onClose, onSave, currentVersion }: {
  onClose: () => void
  onSave: (mode: 'update' | 'new', newVersion: string, changeNote: string) => Promise<void>
  currentVersion: string
}) {
  const [mode, setMode] = useState<'update' | 'new'>('update')
  const [newVersion, setNewVersion] = useState(() => {
    const m = currentVersion?.match(/^v(\d+)$/)
    return m ? `v${parseInt(m[1]) + 1}` : `${currentVersion}-2`
  })
  const [changeNote, setChangeNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (mode === 'new' && !newVersion.trim()) { setError('Version label is required'); return }
    setSaving(true); setError(null)
    try { await onSave(mode, newVersion.trim(), changeNote.trim()); onClose() }
    catch (e: any) { setError(e.message); setSaving(false) }
  }

  const inp: React.CSSProperties = { width: '100%', height: 34, padding: '0 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, outline: 'none', boxSizing: 'border-box', background: '#fafaf8' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 440, border: '0.5px solid rgba(0,0,0,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>Save template</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {(['update', 'new'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, height: 36, fontSize: 13, cursor: 'pointer', borderRadius: 8, border: mode === m ? '0.5px solid rgba(78,140,140,0.4)' : '0.5px solid rgba(0,0,0,0.15)', background: mode === m ? 'rgba(78,140,140,0.1)' : '#fafaf8', color: mode === m ? '#2e5f5f' : '#5a6472', fontWeight: mode === m ? 500 : 400 }}>
              {m === 'update' ? `Update ${currentVersion}` : 'Save as new version'}
            </button>
          ))}
        </div>
        {mode === 'new' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: '#5a6472', marginBottom: 4, display: 'block' }}>New version label</label>
            <input style={{ ...inp, fontFamily: 'monospace' }} value={newVersion} onChange={e => setNewVersion(e.target.value)} autoFocus />
          </div>
        )}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#5a6472', marginBottom: 4, display: 'block' }}>Change note <span style={{ fontWeight: 400, color: '#8a96a2' }}>(optional)</span></label>
          <input style={inp} value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="What changed?" autoFocus={mode === 'update'} />
        </div>
        {error && <div style={{ fontSize: 12, color: '#943030', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ height: 32, padding: '0 14px', fontSize: 13, cursor: 'pointer', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, color: '#5a6472' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ height: 32, padding: '0 14px', fontSize: 13, cursor: 'pointer', background: '#4e8c8c', border: 'none', borderRadius: 8, color: '#fff', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TemplateEditorPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('template')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [sizes, setSizes] = useState(DEFAULT_SIZES)
  const [wordCount, setWordCount] = useState(0)

  const latestTemplateContent = useRef<any>(null)
  const latestExampleContent = useRef<any>(null)

  function handleSizeChange(key: keyof typeof DEFAULT_SIZES, val: number) {
    setSizes(prev => ({ ...prev, [key]: val }))
  }

  async function load() {
    try {
      const res = await fetch(`/api/templates/${templateId}`)
      if (!res.ok) throw new Error()
      const data: TemplateData = await res.json()
      const currentVer = data.versions?.find(v => v.is_current) ?? data.versions?.[0]
      if (currentVer) {
        const vRes = await fetch(`/api/templates/${templateId}/versions/${currentVer.id}`)
        if (vRes.ok) {
          const vData = await vRes.json()
          data.content = vData.content
          data.example_content = vData.example_content
          data.version_id = currentVer.id
          data.version = currentVer.version
        }
      }
      setTemplate(data)
      setLoading(false)
    } catch { router.push('/dashboard/templates') }
  }

  useEffect(() => { load() }, [templateId])

  const templateEditor = useEditor({
    extensions: makeExtensions('Write the template structure here — headings, checklists, tables…'),
    content: '',
    editorProps: { attributes: { style: 'outline: none;' } },
    onUpdate: ({ editor }) => {
      latestTemplateContent.current = editor.getJSON()
      setSaveState('unsaved')
      setWordCount(editor.storage.characterCount?.words() ?? 0)
    },
  })

  useEffect(() => {
    if (!templateEditor || !template?.content) return
    if (Object.keys(template.content).length > 0) {
      templateEditor.commands.setContent(template.content)
      latestTemplateContent.current = template.content
      setWordCount(templateEditor.storage.characterCount?.words() ?? 0)
    }
  }, [templateEditor, template])

  const exampleEditor = useEditor({
    extensions: makeExtensions('Write the ACME example here — show users how this template should be filled…'),
    content: '',
    editorProps: { attributes: { style: 'outline: none;' } },
    onUpdate: ({ editor }) => {
      latestExampleContent.current = editor.getJSON()
      setSaveState('unsaved')
    },
  })

  useEffect(() => {
    if (!exampleEditor || !template?.example_content) return
    if (Object.keys(template.example_content).length > 0) {
      exampleEditor.commands.setContent(template.example_content)
      latestExampleContent.current = template.example_content
    }
  }, [exampleEditor, template])

  async function handleSave(mode: 'update' | 'new', newVersionLabel: string, changeNote: string) {
    if (!template) return
    setSaveState('saving')
    const content = latestTemplateContent.current ?? template.content ?? {}
    const example_content = latestExampleContent.current ?? template.example_content ?? {}

    if (mode === 'update' && template.version_id) {
      const res = await fetch(`/api/templates/${templateId}/versions/${template.version_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, example_content, change_note: changeNote }),
      })
      if (!res.ok) { setSaveState('error'); throw new Error('Failed to update version') }
    } else {
      const res = await fetch(`/api/templates/${templateId}/versions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: newVersionLabel, content, example_content, change_note: changeNote, set_current: true }),
      })
      if (!res.ok) { const err = await res.json(); setSaveState('error'); throw new Error(err.error || 'Failed') }
    }
    setSaveState('saved')
    await load()
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (saveState === 'unsaved') setShowSaveModal(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveState])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#8a96a2', fontSize: 13 }}>Loading template…</div>
  if (!template) return null

  const st = STATUS_STYLES[template.status] || STATUS_STYLES.draft
  const activeEditor = activeTab === 'template' ? templateEditor : exampleEditor

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', background: '#f5f2ee' }}>
      <style>{buildEditorStyles(sizes)}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 48, flexShrink: 0, borderBottom: '1px solid #e0ddd8', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8a96a2' }}>
          <Link href="/dashboard/templates" style={{ color: '#8a96a2', textDecoration: 'none' }}>Templates</Link>
          <span>›</span>
          <span style={{ color: '#1a1f24', fontWeight: 500 }}>{template.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: saveState === 'saved' ? '#3a7a5a' : saveState === 'saving' ? '#8a6020' : saveState === 'error' ? '#943030' : '#8a96a2' }}>
            {saveState === 'saved' ? '✓ Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? '⚠ Save failed' : '● Unsaved changes'}
          </span>
          <span style={{ fontSize: 11, color: '#8a96a2' }}>{wordCount} words</span>
          <button onClick={() => setShowHistory(v => !v)} style={{ height: 28, padding: '0 10px', fontSize: 12, cursor: 'pointer', background: showHistory ? 'rgba(78,140,140,0.1)' : 'transparent', border: showHistory ? '0.5px solid rgba(78,140,140,0.3)' : '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: showHistory ? '#2e5f5f' : '#5a6472' }}>
            ⏱ History
          </button>
          <button onClick={() => setShowSaveModal(true)} disabled={saveState === 'saved'} style={{ height: 28, padding: '0 14px', fontSize: 12, cursor: saveState === 'saved' ? 'default' : 'pointer', background: saveState === 'saved' ? '#f5f2ee' : '#4e8c8c', border: 'none', borderRadius: 6, color: saveState === 'saved' ? '#8a96a2' : '#fff', fontWeight: 500 }}>
            Save
          </button>
        </div>
      </div>

      {/* Tabs + meta strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, borderBottom: '1px solid #e0ddd8', background: '#fff' }}>
        <div style={{ display: 'flex' }}>
          {(['template', 'example'] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ height: 38, padding: '0 16px', fontSize: 13, cursor: 'pointer', background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid #4e8c8c' : '2px solid transparent', color: activeTab === tab ? '#2e5f5f' : '#5a6472', fontWeight: activeTab === tab ? 500 : 400 }}>
              {tab === 'template' ? 'Template' : 'Example'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#8a96a2' }}>
          <span style={{ fontFamily: 'monospace' }}>${template.tag_code}</span>
          <span>·</span>
          <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 11, background: st.bg, color: st.color, border: `0.5px solid ${st.border}` }}>{template.status}</span>
          {template.version && <><span>·</span><span style={{ fontFamily: 'monospace' }}>{template.version}</span></>}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Editor column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: showHistory ? '1px solid #d8d4ce' : 'none' }}>
          <Toolbar editor={activeEditor} sizes={sizes} onSizeChange={handleSizeChange} />
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', background: '#f5f2ee' }}>
            <div style={{ maxWidth: 780, margin: '0 auto', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)', borderRadius: 2, padding: '60px 72px', minHeight: 900 }}>
              <div style={{ display: activeTab === 'template' ? 'block' : 'none' }}>
                <EditorContent editor={templateEditor} />
              </div>
              <div style={{ display: activeTab === 'example' ? 'block' : 'none' }}>
                <EditorContent editor={exampleEditor} />
              </div>
            </div>
            <div style={{ height: 48 }} />
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#faf9f7', borderLeft: '1px solid #d8d4ce' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e0ddd8', fontSize: 11, fontWeight: 600, color: '#5a6472', background: '#f5f2ee', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Version history</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {template.versions.length === 0 ? (
                <div style={{ padding: 20, fontSize: 12, color: '#8a96a2', textAlign: 'center' }}>No versions yet</div>
              ) : template.versions.map(v => (
                <div key={v.id} style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: v.is_current ? 'rgba(78,140,140,0.08)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: v.is_current ? '#2e5f5f' : '#1a1f24' }}>{v.version}</span>
                    {v.is_current && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(78,140,140,0.15)', color: '#2e5f5f' }}>current</span>}
                  </div>
                  {v.change_note && <div style={{ fontSize: 11, color: '#5a6472', marginBottom: 3 }}>{v.change_note}</div>}
                  <div style={{ fontSize: 10, color: '#8a96a2' }}>
                    {v.created_by_name ?? 'Unknown'} · {new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSaveModal && template.version && (
        <SaveModal currentVersion={template.version} onClose={() => setShowSaveModal(false)} onSave={handleSave} />
      )}
    </div>
  )
}
