'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEditor, EditorContent } from '@tiptap/react'
import { Mark, mergeAttributes } from '@tiptap/core'
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
import { VariableNode, RiskMatrixNode, VARIABLE_STYLES, setProjectVariables, resolveVariablesInContent } from '@/lib/variable-node'

// ── CommentMark — invisible anchor stored in doc JSON ─────────────────────────
// Renders as a highlighted span with data-comment-id attribute
// Stripped on export, never shown in print

const CommentMark = Mark.create({
  name: 'commentMark',
  keepOnSplit: false,
  excludes: '',
  addAttributes() {
    return {
      commentId: { default: null, parseHTML: el => el.getAttribute('data-comment-id'), renderHTML: attrs => ({ 'data-comment-id': attrs.commentId }) },
      resolved: { default: false, parseHTML: el => el.getAttribute('data-resolved') === 'true', renderHTML: attrs => ({ 'data-resolved': attrs.resolved }) },
    }
  },
  parseHTML() { return [{ tag: 'span[data-comment-id]' }] },
  renderHTML({ HTMLAttributes }) {
    const resolved = HTMLAttributes['data-resolved'] === true || HTMLAttributes['data-resolved'] === 'true'
    return ['span', mergeAttributes(HTMLAttributes, {
      class: resolved ? 'comment-anchor comment-anchor--resolved' : 'comment-anchor',
      style: 'cursor: pointer;',
    }), 0]
  },
})

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocData {
  id: string; project_id: string; annex: string; name: string; code: string
  content: any; status: string; updated_at: string
  template_version_id: string | null; template_version: string | null
  example_content: any; template_name: string | null
  tag_code: string | null; project_name: string; device_name: string; revision?: number
}

interface Comment {
  id: string; parent_id: string | null; content: string
  anchor_text: string | null; anchor_id: string | null
  resolved: boolean; resolved_at: string | null; created_at: string
  author_id: string; author_name: string; author_role: string
}

interface Member { user_id: string; name: string; user_role: string }

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'
type CommentFilter = 'open' | 'resolved'
interface TocItem { id: string; textContent: string; level: number; itemIndex: number }

const DOC_STATUS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft:      { bg: '#f5f2ee',               color: '#5a6472', border: 'rgba(90,100,114,0.3)',   label: 'Draft' },
  inprogress: { bg: 'rgba(200,169,110,0.12)', color: '#8a6020', border: 'rgba(200,169,110,0.4)', label: 'In progress' },
  review:     { bg: 'rgba(78,140,140,0.1)',   color: '#2e5f5f', border: 'rgba(78,140,140,0.3)',  label: 'In review' },
  approved:   { bg: 'rgba(58,122,90,0.1)',    color: '#3a7a5a', border: 'rgba(58,122,90,0.3)',   label: 'Approved' },
  superseded: { bg: 'rgba(90,100,114,0.08)',  color: '#8a96a2', border: 'rgba(90,100,114,0.2)', label: 'Superseded' },
}

const DEFAULT_SIZES = { p: 14, h1: 26, h2: 20, h3: 15, h4: 14 }

const HIGHLIGHT_COLORS = [
  { label: 'Yellow',      value: '#fef08a' },
  { label: 'Orange',      value: '#fed7aa' },
  { label: 'Green',       value: '#bbf7d0' },
  { label: 'Blue',        value: '#bae6fd' },
  { label: 'Pink',        value: '#fecdd3' },
  { label: 'Purple',      value: '#e9d5ff' },
  { label: 'None',        value: null },
]

const TEXT_COLORS = [
  { label: 'Default',    value: null },
  { label: 'Black',      value: '#1a1f24' },
  { label: 'Dark grey',  value: '#5a6472' },
  { label: 'Grey',       value: '#8a96a2' },
  { label: 'Teal',       value: '#2e5f5f' },
  { label: 'Blue',       value: '#1d4ed8' },
  { label: 'Red',        value: '#dc2626' },
  { label: 'Orange',     value: '#ea580c' },
  { label: 'Green',      value: '#16a34a' },
  { label: 'Purple',     value: '#7c3aed' },
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
  Comment:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Download:    () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Btn({ active, disabled, onClick, title, children, danger }: {
  active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode; danger?: boolean
}) {
  return (
    <button onMouseDown={e => { e.preventDefault(); if (!disabled) onClick() }} disabled={disabled} title={title}
      style={{ height: 30, minWidth: 30, padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', borderRadius: 5, background: active ? 'rgba(78,140,140,0.15)' : 'transparent', color: active ? '#2e5f5f' : disabled ? '#ccc' : danger ? '#943030' : '#2e3640', cursor: disabled ? 'default' : 'pointer', fontSize: 12 }}
      onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = 'rgba(0,0,0,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >{children}</button>
  )
}

function Sep() { return <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.12)', margin: '0 3px', flexShrink: 0 }} /> }
function Overlay({ onClose }: { onClose: () => void }) { return <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={onClose} /> }

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

function CommentInput({ value, onChange, placeholder, members, style, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder: string
  members: Member[]; style?: React.CSSProperties; autoFocus?: boolean
}) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLTextAreaElement>(null)
  const filtered = mentionQuery !== null ? members.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5) : []
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value)
    const textBefore = e.target.value.slice(0, e.target.selectionStart)
    const match = textBefore.match(/@(\w*)$/)
    if (match) { setMentionQuery(match[1]); if (ref.current) { const r = ref.current.getBoundingClientRect(); setMentionPos({ top: r.bottom + 4, left: r.left }) } }
    else setMentionQuery(null)
  }
  function insertMention(name: string) {
    const cursor = ref.current?.selectionStart || 0
    const newText = value.slice(0, cursor).replace(/@\w*$/, `@${name} `) + value.slice(cursor)
    onChange(newText); setMentionQuery(null); setTimeout(() => ref.current?.focus(), 0)
  }
  return (
    <div style={{ position: 'relative' }}>
      <textarea ref={ref} value={value} onChange={handleChange} placeholder={placeholder} autoFocus={autoFocus}
        style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', ...style }} />
      {mentionQuery !== null && filtered.length > 0 && (
        <div style={{ position: 'fixed', top: mentionPos.top, left: mentionPos.left, zIndex: 9999, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 180, overflow: 'hidden' }}>
          {filtered.map(m => (
            <button key={m.user_id} onMouseDown={e => { e.preventDefault(); insertMention(m.name) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a1f24' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(78,140,140,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            ><span style={{ fontWeight: 500 }}>{m.name}</span><span style={{ fontSize: 10, color: '#8a96a2', marginLeft: 6 }}>{m.user_role}</span></button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Comments panel ────────────────────────────────────────────────────────────

function CommentsPanel({ comments, commentsLoading, members, newComment, setNewComment, replyTo, setReplyTo,
  postingComment, postComment, resolveComment, onClose, activeCommentId, setActiveCommentId,
  history, historyLoading, commentTab, setCommentTab }: {
  comments: Comment[]; commentsLoading: boolean; members: Member[]
  newComment: string; setNewComment: (v: string) => void
  replyTo: string | null; setReplyTo: (v: string | null) => void
  postingComment: boolean; postComment: (parentId?: string) => void
  resolveComment: (id: string, resolved: boolean) => void; onClose: () => void
  activeCommentId: string | null; setActiveCommentId: (id: string | null) => void
  history: any[]; historyLoading: boolean
  commentTab: 'comments' | 'history'; setCommentTab: (t: 'comments' | 'history') => void
}) {
  const [filter, setFilter] = useState<CommentFilter>('open')
  const activeRef = useRef<HTMLDivElement>(null)
  const topLevel = comments.filter(c => !c.parent_id)
  const filtered = topLevel.filter(c => filter === 'open' ? !c.resolved : c.resolved)
  const openCount = topLevel.filter(c => !c.resolved).length
  const resolvedCount = topLevel.filter(c => c.resolved).length

  useEffect(() => { if (activeCommentId && activeRef.current) activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [activeCommentId])
  useEffect(() => { if (activeCommentId) { const c = comments.find(c => c.id === activeCommentId); if (c) setFilter(c.resolved ? 'resolved' : 'open') } }, [activeCommentId])

  function avatar(name: string, warning: boolean) {
    return (
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: warning ? 'rgba(148,48,48,0.12)' : 'rgba(78,140,140,0.15)', color: warning ? '#943030' : '#2e5f5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
        {name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
      </div>
    )
  }

  const historyIcons: Record<string, string> = { submitted: '📤', approved: '✓', changes_requested: '↩', revised: '↻' }
  const historyLabels: Record<string, string> = { submitted: 'Submitted for review', approved: 'Approved', changes_requested: 'Changes requested', revised: 'New revision created' }
  const historyColors: Record<string, string> = { submitted: '#2e5f5f', approved: '#3a7a5a', changes_requested: '#943030', revised: '#5a6472' }

  return (
    <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid #d8d4ce', background: '#faf9f7' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0ddd8', background: '#f5f2ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document panel</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a96a2', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {/* Main tabs: Comments | History */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0ddd8', background: '#fff' }}>
        <button onClick={() => setCommentTab('comments')} style={{ flex: 1, height: 34, fontSize: 11, border: 'none', background: 'none', cursor: 'pointer', borderBottom: commentTab === 'comments' ? '2px solid #4e8c8c' : '2px solid transparent', color: commentTab === 'comments' ? '#2e5f5f' : '#8a96a2', fontWeight: commentTab === 'comments' ? 600 : 400 }}>
          Comments {openCount > 0 && `(${openCount})`}
        </button>
        <button onClick={() => setCommentTab('history')} style={{ flex: 1, height: 34, fontSize: 11, border: 'none', background: 'none', cursor: 'pointer', borderBottom: commentTab === 'history' ? '2px solid #4e8c8c' : '2px solid transparent', color: commentTab === 'history' ? '#2e5f5f' : '#8a96a2', fontWeight: commentTab === 'history' ? 600 : 400 }}>
          History {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      {/* ── History tab ── */}
      {commentTab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
          {historyLoading ? (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#8a96a2', padding: 20 }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#8a96a2', padding: 20, lineHeight: 1.6 }}>
              No history yet.<br />History is recorded on status changes.
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 11, top: 12, bottom: 0, width: 1, background: '#e0ddd8' }} />
              {history.map((h: any) => {
                const icon = historyIcons[h.action] || '•'
                const label = historyLabels[h.action] || h.action
                const color = historyColors[h.action] || '#5a6472'
                const bgColor = color === '#943030' ? 'rgba(148,48,48,0.1)' : color === '#3a7a5a' ? 'rgba(58,122,90,0.1)' : 'rgba(78,140,140,0.1)'
                const borderColor = color === '#943030' ? 'rgba(148,48,48,0.2)' : color === '#3a7a5a' ? 'rgba(58,122,90,0.2)' : 'rgba(78,140,140,0.2)'
                return (
                  <div key={h.id} style={{ display: 'flex', gap: 12, marginBottom: 16, position: 'relative' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: bgColor, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, zIndex: 1, border: `1px solid ${borderColor}` }}>{icon}</div>
                    <div style={{ flex: 1, paddingTop: 2 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 2 }}>{label}</div>
                      {h.user_name && <div style={{ fontSize: 11, color: '#5a6472', marginBottom: 2 }}>by {h.user_name}</div>}
                      {h.note && <div style={{ fontSize: 11, color: '#8a96a2', fontStyle: 'italic', background: '#f5f2ee', padding: '4px 8px', borderRadius: 4, marginTop: 4 }}>{h.note}</div>}
                      <div style={{ fontSize: 10, color: '#8a96a2', marginTop: 3 }}>{new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Comments tab ── */}
      {commentTab === 'comments' && (
        <>
          {/* Open/Resolved sub-tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e0ddd8', background: '#fff' }}>
            {(['open', 'resolved'] as CommentFilter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, height: 30, fontSize: 11, border: 'none', background: 'none', cursor: 'pointer', borderBottom: filter === f ? '2px solid #4e8c8c' : '2px solid transparent', color: filter === f ? '#2e5f5f' : '#8a96a2', fontWeight: filter === f ? 600 : 400 }}>
                {f === 'open' ? `Open (${openCount})` : `Resolved (${resolvedCount})`}
              </button>
            ))}
          </div>

          {/* Comment list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {commentsLoading ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#8a96a2' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: '#8a96a2', lineHeight: 1.6 }}>
                {filter === 'open' ? 'No open comments.' : 'No resolved comments.'}
              </div>
            ) : filtered.map(c => {
              const replies = comments.filter(r => r.parent_id === c.id)
              const isWarning = c.content.startsWith('⚠')
              const isActive = activeCommentId === c.id
              return (
                <div key={c.id} ref={isActive ? activeRef : null}
                  onClick={() => setActiveCommentId(isActive ? null : c.id)}
                  style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.06)', opacity: c.resolved ? 0.65 : 1, background: isActive ? 'rgba(78,140,140,0.06)' : 'transparent', borderLeft: isActive ? '3px solid #4e8c8c' : '3px solid transparent', cursor: 'pointer' }}>
                  {c.anchor_text && (
                    <div style={{ fontSize: 10, fontStyle: 'italic', color: '#5a6472', background: '#f5f2ee', padding: '3px 8px', borderRadius: 3, borderLeft: '2px solid #4e8c8c', marginBottom: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      "{c.anchor_text.slice(0, 60)}{c.anchor_text.length > 60 ? '…' : ''}"
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {avatar(c.author_name, isWarning)}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1f24' }}>{c.author_name}</div>
                        <div style={{ fontSize: 10, color: '#8a96a2' }}>{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); resolveComment(c.id, !c.resolved) }}
                      style={{ background: c.resolved ? 'rgba(58,122,90,0.1)' : 'transparent', border: c.resolved ? '0.5px solid rgba(58,122,90,0.3)' : '0.5px solid rgba(0,0,0,0.15)', borderRadius: 5, cursor: 'pointer', color: c.resolved ? '#3a7a5a' : '#8a96a2', fontSize: 11, padding: '3px 8px', fontWeight: 500 }}>
                      {c.resolved ? '✓ Resolved' : 'Resolve'}
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: isWarning ? '#943030' : '#2e3640', lineHeight: 1.6, background: isWarning ? 'rgba(148,48,48,0.06)' : 'transparent', padding: isWarning ? '6px 8px' : 0, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                    {c.content}
                  </div>
                  {replies.map(r => (
                    <div key={r.id} style={{ marginTop: 8, paddingLeft: 14, borderLeft: '2px solid #e0ddd8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(78,140,140,0.1)', color: '#2e5f5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>
                          {r.author_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#5a6472' }}>{r.author_name}</span>
                        <span style={{ fontSize: 10, color: '#8a96a2' }}>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#2e3640', lineHeight: 1.5 }}>{r.content}</div>
                    </div>
                  ))}
                  {!c.resolved && (
                    <button onClick={e => { e.stopPropagation(); setReplyTo(replyTo === c.id ? null : c.id) }}
                      style={{ marginTop: 7, background: 'none', border: 'none', fontSize: 11, color: '#4e8c8c', cursor: 'pointer', padding: 0 }}>
                      {replyTo === c.id ? 'Cancel reply' : '↩ Reply'}
                    </button>
                  )}
                  {replyTo === c.id && (
                    <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
                      <CommentInput value={newComment} onChange={setNewComment} members={members} placeholder="Write a reply… use @ to mention" style={{ height: 56 }} autoFocus />
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

          {/* New comment input */}
          {filter === 'open' && !replyTo && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid #e0ddd8', background: '#fff' }}>
              <div style={{ fontSize: 11, color: '#8a96a2', marginBottom: 6 }}>Select text in the document to attach a comment to it</div>
              <CommentInput value={newComment} onChange={setNewComment} placeholder="Add a comment… use @ to mention" members={members} style={{ height: 64 }} />
              <button onClick={() => postComment()} disabled={postingComment || !newComment.trim()}
                style={{ marginTop: 6, width: '100%', height: 30, fontSize: 12, background: '#4e8c8c', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', opacity: postingComment || !newComment.trim() ? 0.6 : 1, fontWeight: 500 }}>
                {postingComment ? 'Posting…' : 'Post comment'}
              </button>
            </div>
          )}
        </>
      )}
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
    /* Comment anchors */
    .comment-anchor {
      background: rgba(255, 220, 80, 0.3);
      border-bottom: 2px solid rgba(200, 160, 0, 0.6);
      border-radius: 2px;
      transition: background 0.15s;
    }
    .comment-anchor:hover {
      background: rgba(255, 220, 80, 0.55);
    }
    .comment-anchor--resolved {
      background: transparent;
      border-bottom: 2px solid rgba(90,100,114,0.25);
    }
    .comment-anchor--active {
      background: rgba(255, 200, 50, 0.5) !important;
      border-bottom-color: rgba(200, 140, 0, 0.8) !important;
    }
    .toc-block { background: #f5f2ee; border: 1px solid #e0ddd8; border-radius: 6px; padding: 16px 20px; margin: 16px 0; }
    .toc-block h4 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #8a96a2; margin: 0 0 10px; border: none; }
    .toc-block ol { margin: 0; padding-left: 18px; }
    .toc-block li { font-size: 13px; margin-bottom: 4px; color: #2e3640; }
    .tableWrapper { overflow-x: auto; }
    .ProseMirror img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; cursor: pointer; }
    .ProseMirror img.ProseMirror-selectednode { outline: 2px solid #4e8c8c; }
    .column-resize-handle { background-color: #4e8c8c; bottom: -2px; position: absolute; right: -2px; top: 0; width: 4px; pointer-events: none; }
    ${VARIABLE_STYLES}
  `
}

// ── Layout preview for editor header/footer ───────────────────────────────────

function LayoutPreview({ layout, logo, doc, isFooter }: {
  layout: any; logo: string | null; doc: any; isFooter: boolean
}) {
  if (!layout) return null
  const colWidths: number[] = (layout.colWidths && layout.colWidths.length === layout.cols)
    ? layout.colWidths
    : Array(layout.cols).fill(Math.floor(100 / layout.cols))
  const rowHeight = layout.rowHeight || 40
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  function cellContent(cell: any): React.ReactNode {
    const st: React.CSSProperties = {
      fontSize: cell.fontSize || 11,
      fontWeight: cell.bold ? 700 : 400,
      fontStyle: cell.italic ? 'italic' : 'normal',
      color: '#5a6472',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }
    switch (cell.content) {
      case 'empty': return null
      case 'logo': return logo
        ? <img src={logo} alt="Logo" style={{ maxHeight: rowHeight - 10, maxWidth: 100, objectFit: 'contain' }} />
        : <span style={{ ...st, color: '#4e8c8c', fontWeight: 600 }}>LOGO</span>
      case 'document_name': return <span style={st}>{doc?.name || 'Document name'}</span>
      case 'document_code': return <span style={st}>{doc?.code || 'DOC-001'}</span>
      case 'version': return <span style={st}>v1</span>
      case 'date': return <span style={st}>{today}</span>
      case 'page_number': return <span style={{ ...st, fontStyle: 'italic' }}>‹page›</span>
      case 'device_name': return <span style={st}>{doc?.device_name || '$$device_name'}</span>
      case 'manufacturer_name': return <span style={st}>{doc?.manufacturer_name || '$$manufacturer_name'}</span>
      case 'custom': return <span style={st}>{cell.customText || ''}</span>
      default: return null
    }
  }

  const borderTop = layout.borderTop ? '1px solid #d8d4ce' : 'none'
  const borderBottom = layout.borderBottom ? '1px solid #d8d4ce' : 'none'
  const cellBorder = layout.showCellBorders ? '1px solid #e8e4de' : 'none'

  return (
    <div style={{ borderTop, borderBottom, background: '#fff' }}>
      {Array.from({ length: layout.rows }, (_, ri) => (
        <div key={ri} style={{ display: 'flex', height: rowHeight }}>
          {Array.from({ length: layout.cols }, (_, ci) => {
            const cell = layout.cells?.find((c: any) => c.row === ri && c.col === ci) || { content: 'empty', align: 'left', verticalAlign: 'center' }
            const jc = cell.align === 'center' ? 'center' : cell.align === 'right' ? 'flex-end' : 'flex-start'
            const ai = cell.verticalAlign === 'top' ? 'flex-start' : cell.verticalAlign === 'bottom' ? 'flex-end' : 'center'
            return (
              <div key={ci} style={{
                width: `${colWidths[ci]}%`, flexShrink: 0, display: 'flex',
                alignItems: ai, justifyContent: jc, padding: '0 8px',
                borderRight: ci < layout.cols - 1 ? cellBorder : 'none',
                overflow: 'hidden',
              }}>
                {cellContent(cell)}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}


function makeExtensions(placeholder: string, onTocUpdate: (items: any[]) => void) {
  return [
    StarterKit, TextStyle, FontFamily, Underline, CommentMark, VariableNode, RiskMatrixNode, Color, Image.configure({ inline: false, allowBase64: true }),
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: true }),
    TableRow, TableHeader, TableCell,
    Placeholder.configure({ placeholder }),
    CharacterCount,
    TableOfContents.configure({ getIndex: getHierarchicalIndexes, onUpdate: (c: any) => onTocUpdate(c) }),
  ]
}

// ── Main ──────────────────────────────────────────────────────────────────────

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
  const [leftWidth, setLeftWidth] = useState(60) // percentage of split pane
  const [docStatus, setDocStatus] = useState('draft')
  const [hasExample, setHasExample] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [revising, setRevising] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [sizes, setSizes] = useState(DEFAULT_SIZES)
  const [zoom, setZoom] = useState(100)
  const [headerLayout, setHeaderLayout] = useState<any>(null)
  const [footerLayout, setFooterLayout] = useState<any>(null)
  const [projectLogo, setProjectLogo] = useState<string | null>(null)
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [variables, setVariables] = useState<any[]>([])

  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [postingComment, setPostingComment] = useState(false)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [commentTab, setCommentTab] = useState<'comments' | 'history'>('comments')


  // Assigned examples for this record
  const [assignedExamples, setAssignedExamples] = useState<any[]>([])
  const [availableExamples, setAvailableExamples] = useState<any[]>([])
  const [activeExampleIdx, setActiveExampleIdx] = useState(0)
  const [showManageExamples, setShowManageExamples] = useState(false)
  const [loadingExamples, setLoadingExamples] = useState(false)

  // Floating bubble for selection
  const [bubble, setBubble] = useState<{ x: number; y: number; text: string; from: number; to: number } | null>(null)

  // Template version upgrade
  const [templateVersions, setTemplateVersions] = useState<any[]>([])
  const [showVersionUpgrade, setShowVersionUpgrade] = useState(false)
  const [upgradingTemplate, setUpgradingTemplate] = useState(false)

  // Approval
  const [showRequestChanges, setShowRequestChanges] = useState(false)
  const [changeReason, setChangeReason] = useState('')
  const [approvingDoc, setApprovingDoc] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(60)
  const latestContent = useRef<any>(null)
  const contentLoaded = useRef<boolean>(false)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.ok ? r.json() : null).then(d => { if (d?.user) setUserRole(d.user.role) })
  }, [])

  useEffect(() => {
    fetch(`/api/projects/${projectId}/documents/${docId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: DocData) => {
        setDoc(data); setDocStatus(data.status); loadLayout()
        const ex = data.example_content
        setHasExample(!!(ex && typeof ex === 'object' && Object.keys(ex).length > 0))
        // will be updated when examples load
        setLoading(false)
        loadExamples()
        // Load available template versions for upgrade
        fetch(`/api/projects/${projectId}/documents/${data.id}/upgrade-template`)
            .then(r => r.ok ? r.json() : [])
            .then(setTemplateVersions)
            .catch(() => {})
      })
      .catch(() => router.push(`/dashboard/projects/${projectId}`))
  }, [projectId, docId])

  useEffect(() => {
    fetch(`/api/projects/${projectId}/members`).then(r => r.ok ? r.json() : []).then(setMembers)
    fetch(`/api/projects/${projectId}/variables`).then(r => r.ok ? r.json() : null).then(data => {
      if (data?.variables) {
        setVariables(data.variables)
        setProjectVariables(data.variables)
      }
    })
  }, [projectId])

  // Re-render variable chips when variable values load
  useEffect(() => {
    if (variables.length === 0) return
    const update = () => {
      document.querySelectorAll('[data-variable]').forEach((el: Element) => {
        const tag = el.getAttribute('data-variable')
        if (!tag) return
        // Skip block-level rich variable elements — addNodeView handles those via polling
        if (el.classList.contains('variable-block')) return
        const entry = (window as any).__projectVariables?.[tag] || null
        const isRich = entry?.type === 'rich_text'
        if (isRich) {
          // Rich chips just show tag name — block rendering done by addNodeView
          el.textContent = tag
          el.className = entry?.value ? 'variable-chip variable-chip--rich' : 'variable-chip variable-chip--empty'
          return
        }
        const value = (entry && typeof entry === 'object') ? entry.value : (entry || null)
        const hasValue = !!(value && typeof value === 'string' && value.length > 0)
        el.textContent = hasValue ? value : tag
        el.className = hasValue ? 'variable-chip' : 'variable-chip variable-chip--empty'
      })
    }
    update()
    const t = setTimeout(update, 400)
    return () => clearTimeout(t)
  }, [variables])

  useEffect(() => { if (showComments) { loadComments(); loadHistory() } }, [showComments])

  async function loadComments() {
    setCommentsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
        // Update resolved state on comment marks in editor
        if (editor) updateCommentMarkStates(data)
      }
    } finally { setCommentsLoading(false) }
  }

  function updateCommentMarkStates(commentList: Comment[]) {
    if (!editor) return
    const resolvedIds = new Set(commentList.filter(c => c.resolved).map(c => c.anchor_id).filter(Boolean))
    // Walk doc and update resolved attr on commentMark nodes
    const { doc: prosemirrorDoc, tr } = editor.state
    let changed = false
    prosemirrorDoc.descendants((node, pos) => {
      node.marks.forEach(mark => {
        if (mark.type.name === 'commentMark') {
          const shouldBeResolved = resolvedIds.has(mark.attrs.commentId)
          if (mark.attrs.resolved !== shouldBeResolved) {
            tr.addMark(pos, pos + node.nodeSize, mark.type.create({ ...mark.attrs, resolved: shouldBeResolved }))
            changed = true
          }
        }
      })
    })
    if (changed) editor.view.dispatch(tr)
  }


  async function loadExamples() {
    setLoadingExamples(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/examples`)
      if (res.ok) {
        const data = await res.json()
        setAssignedExamples(data.assigned || [])
        setAvailableExamples(data.available || [])
        setActiveExampleIdx(0)
      }
    } finally { setLoadingExamples(false) }
  }

  async function addExample(templateExampleId: string) {
    await fetch(`/api/projects/${projectId}/documents/${docId}/examples`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_example_id: templateExampleId }),
    })
    loadExamples()
  }

  async function removeExample(templateExampleId: string) {
    await fetch(`/api/projects/${projectId}/documents/${docId}/examples?template_example_id=${templateExampleId}`, {
      method: 'DELETE',
    })
    loadExamples()
  }

  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/history`)
      if (res.ok) setHistory(await res.json())
    } finally { setHistoryLoading(false) }
  }

  async function postComment(parentId?: string) {
    if (!newComment.trim()) return
    setPostingComment(true)

    let anchorId: string | null = null
    let anchorText: string | null = null

    // If there's a pending selection in the editor, wrap it in a CommentMark
    if (!parentId && bubble && editor) {
      anchorId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      anchorText = bubble.text
      editor.chain().focus()
        .setTextSelection({ from: bubble.from, to: bubble.to })
        .setMark('commentMark', { commentId: anchorId, resolved: false })
        .run()
      setBubble(null)
      // Save the content with the new mark
      const content = editor.getJSON()
      latestContent.current = content
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(content), 500)
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, parent_id: parentId || null, anchor_text: anchorText, anchor_id: anchorId }),
      })
      if (res.ok) {
        const newC = await res.json()
        setNewComment(''); setReplyTo(null)
        setActiveCommentId(newC.id)
        loadComments()
      }
    } finally { setPostingComment(false) }
  }

  async function resolveComment(commentId: string, resolved: boolean) {
    await fetch(`/api/projects/${projectId}/documents/${docId}/comments/${commentId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved }),
    })
    loadComments()
  }

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

  async function submitForReview() {
    setSubmitting(true)
    if (latestContent.current) { if (saveTimer.current) clearTimeout(saveTimer.current); await save(latestContent.current) }
    await fetch(`/api/projects/${projectId}/documents/${docId}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submitted' }),
    }).catch(() => {})
    await updateStatus('review'); setSubmitting(false)
  }

  async function approveDoc() {
    setApprovingDoc(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/approve`, { method: 'POST' })
      if (res.ok) { setDocStatus('approved'); if (showComments) loadComments() }
    } finally { setApprovingDoc(false) }
  }

  async function requestChanges() {
    if (!changeReason.trim()) return
    const res = await fetch(`/api/projects/${projectId}/documents/${docId}/request-changes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: changeReason }),
    })
    if (res.ok) { setDocStatus('inprogress'); setChangeReason(''); setShowRequestChanges(false); setShowComments(true); loadComments() }
  }

  async function upgradeTemplate(versionId: string, applyContent: boolean) {
    setUpgradingTemplate(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/upgrade-template`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_version_id: versionId, apply_content: applyContent }),
      })
      if (res.ok) {
        setShowVersionUpgrade(false)
        window.location.reload()
      }
    } finally { setUpgradingTemplate(false) }
  }

  async function reviseDoc() {
    if (!confirm('Create a new revision? The approved version will be preserved.')) return
    setRevising(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/revise`, { method: 'POST' })
      if (res.ok) { const d = await res.json(); router.push(`/dashboard/projects/${projectId}/documents/${d.id}`) }
    } finally { setRevising(false) }
  }

  async function exportDoc() {
    setExporting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}/export?format=docx`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'document.docx'
      a.click(); URL.revokeObjectURL(url)
    } catch (e: any) { alert('Export failed: ' + e.message) }
    finally { setExporting(false) }
  }

  function startDividerDrag(e: React.MouseEvent) {
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = leftWidth
    document.addEventListener('mousemove', onDividerDrag)
    document.addEventListener('mouseup', stopDividerDrag)
  }

  function onDividerDrag(e: MouseEvent) {
    if (!isDragging.current) return
    const containerWidth = window.innerWidth - 220 // minus nav
    const dx = e.clientX - dragStartX.current
    const newPct = dragStartWidth.current + (dx / containerWidth) * 100
    setLeftWidth(Math.max(25, Math.min(75, newPct)))
  }

  function stopDividerDrag() {
    isDragging.current = false
    document.removeEventListener('mousemove', onDividerDrag)
    document.removeEventListener('mouseup', stopDividerDrag)
  }

  function insertImage(editor: any) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    const maxKB = parseInt(process.env.NEXT_PUBLIC_MAX_IMAGE_SIZE_KB || '1024')
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      if (file.size > maxKB * 1024) {
        alert(`Image too large. Maximum size is ${maxKB}KB.`)
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        const src = ev.target?.result as string
        editor.chain().focus().setImage({ src }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  async function loadLayout() {
    const res = await fetch('/api/projects/' + projectId + '/layout')
    if (res.ok) {
      const data = await res.json()
      if (data.header_layout) setHeaderLayout(data.header_layout)
      if (data.footer_layout) setFooterLayout(data.footer_layout)
      if (data.logo) setProjectLogo(data.logo)
    }
  }

  function insertToc() {
    if (!editor || tocItems.length === 0) return
    const lines = tocItems.map(item => {
      const cls = item.level === 1 ? '' : item.level === 2 ? ' class="toc-h2"' : ' class="toc-h3"'
      return `<li${cls}>${item.itemIndex ? item.itemIndex + '. ' : ''}${item.textContent}</li>`
    }).join('')
    editor.chain().focus().insertContent(`<div class="toc-block"><h4>Table of Contents</h4><ol>${lines}</ol></div>`).run()
  }

  const editor = useEditor({
    extensions: makeExtensions('Start writing…', setTocItems),
    content: '',
    editorProps: {
      attributes: { style: 'outline: none;' },
      handleClick(view, pos, event) {
        // Check if click is on a comment anchor
        const target = event.target as HTMLElement
        const anchor = target.closest('[data-comment-id]') as HTMLElement | null
        if (anchor) {
          const commentId = anchor.getAttribute('data-comment-id')
          if (commentId) {
            // Find the comment with this anchor_id
            setShowComments(true)
            // Set active after comments load
            setTimeout(() => {
              const c = comments.find(c => c.anchor_id === commentId)
              if (c) setActiveCommentId(c.id)
            }, 100)
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      if (!contentLoaded.current) return // Don't save until doc content is loaded
      const content = editor.getJSON()
      latestContent.current = content
      setSaveState('unsaved')
      setWordCount(editor.storage.characterCount?.words() ?? 0)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(content), 2000)
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      if (from === to) { setBubble(null); return }
      const selectedText = editor.state.doc.textBetween(from, to, ' ').trim()
      if (!selectedText || selectedText.length < 3) { setBubble(null); return }
      // Check selection doesn't already have a comment mark
      const hasExistingMark = editor.isActive('commentMark')
      if (hasExistingMark) { setBubble(null); return }
      try {
        const coords = editor.view.coordsAtPos(to)
        setBubble({ x: coords.left, y: coords.top - 44, text: selectedText, from, to })
      } catch { setBubble(null) }
    },
  })

  useEffect(() => {
    if (!editor || !doc) return
    if (doc.content && Object.keys(doc.content).length > 0) {
      editor.commands.setContent(doc.content)
      setWordCount(editor.storage.characterCount?.words() ?? 0)
    }
    // Mark content as loaded so autosave can begin
    contentLoaded.current = true
  }, [editor, doc])

  // Set editor read-only for approved docs viewed by client
  useEffect(() => {
    if (!editor) return
    const shouldBeReadOnly = (userRole === 'client') && docStatus === 'approved'
    editor.setEditable(!shouldBeReadOnly)
  }, [editor, userRole, docStatus])

  // Update active comment highlight in document
  useEffect(() => {
    if (!editor) return
    // Remove active class from all, add to active
    document.querySelectorAll('.comment-anchor--active').forEach(el => el.classList.remove('comment-anchor--active'))
    if (activeCommentId) {
      const activeComment = comments.find(c => c.id === activeCommentId)
      if (activeComment?.anchor_id) {
        document.querySelectorAll(`[data-comment-id="${activeComment.anchor_id}"]`).forEach(el => el.classList.add('comment-anchor--active'))
      }
    }
  }, [activeCommentId, comments, editor])

  const refEditor = useEditor({
    extensions: makeExtensions('', () => {}),
    content: '', editable: false,
    editorProps: { attributes: { style: 'outline: none;' } },
  })

  useEffect(() => {
    if (!refEditor) return
    // Prefer assigned examples, fall back to legacy example_content
    if (assignedExamples.length > 0 && assignedExamples[activeExampleIdx]) {
      const ex = assignedExamples[activeExampleIdx].content
      if (ex && typeof ex === 'object' && Object.keys(ex).length > 0) {
        refEditor.commands.setContent(ex)
        return
      }
    }
    if (!doc) return
    const ex = doc.example_content
    if (ex && typeof ex === 'object' && Object.keys(ex).length > 0) refEditor.commands.setContent(ex)
  }, [refEditor, doc, assignedExamples, activeExampleIdx])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (latestContent.current) { if (saveTimer.current) clearTimeout(saveTimer.current); save(latestContent.current) }
      }
      if (e.key === 'Escape') setBubble(null)
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
  const isClientMR = userRole === 'client-MR'
  const backHref = isClient ? `/dashboard/client/projects/${projectId}` : `/dashboard/projects/${projectId}`
  const openComments = comments.filter(c => !c.resolved && !c.parent_id).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', background: '#f5f2ee' }}>
      <style>{buildEditorStyles(sizes)}</style>

      {/* Floating comment bubble */}
      {bubble && (
        <div style={{ position: 'fixed', left: bubble.x, top: bubble.y, zIndex: 500, display: 'flex', alignItems: 'center', gap: 6, background: '#1a1f24', borderRadius: 20, padding: '5px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.25)', pointerEvents: 'auto' }}>
          <button
            onMouseDown={e => {
              e.preventDefault()
              setShowComments(true)
              // Keep bubble open so postComment can use it
            }}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}
          >
            <I.Comment /> Add comment
          </button>
          <button onMouseDown={e => { e.preventDefault(); setBubble(null) }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 48, flexShrink: 0, borderBottom: '1px solid #e0ddd8', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8a96a2', minWidth: 0 }}>
          <Link href={isClient ? '/dashboard/client' : '/dashboard/projects'} style={{ color: '#8a96a2', textDecoration: 'none' }}>{isClient ? 'My Projects' : 'Projects'}</Link>
          <span>›</span>
          <Link href={backHref} style={{ color: '#8a96a2', textDecoration: 'none', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{doc.project_name}</Link>
          <span>›</span>
          <span style={{ color: '#1a1f24', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{doc.name}{doc.revision && doc.revision > 1 ? ` (rev.${doc.revision})` : ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: saveState === 'saved' ? '#3a7a5a' : saveState === 'saving' ? '#8a6020' : saveState === 'error' ? '#943030' : '#8a96a2' }}>
            {saveState === 'saved' ? '✓ Saved' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? '⚠ Error' : '● Unsaved'}
          </span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, border: `0.5px solid ${st.border}`, fontWeight: 500 }}>{st.label}</span>
          {(isAdmin || isConsultant) && (
            <select value={docStatus} onChange={e => updateStatus(e.target.value)} style={{ height: 28, padding: '0 8px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, background: '#fff', color: '#2e3640', cursor: 'pointer' }}>
              <option value="draft">Draft</option><option value="inprogress">In progress</option><option value="review">In review</option><option value="approved">Approved</option>
            </select>
          )}
          {isClient && !isApproved && !isReview && (
            <button onClick={submitForReview} disabled={submitting} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: '#4e8c8c', border: 'none', borderRadius: 6, color: '#fff', opacity: submitting ? 0.7 : 1, fontWeight: 500 }}>
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
          )}
          {isClient && isReview && <span style={{ fontSize: 12, color: '#8a6020', fontWeight: 500 }}>⏳ Awaiting review</span>}
          {isClient && isApproved && <span style={{ fontSize: 12, color: '#3a7a5a', fontWeight: 500 }}>✓ Approved</span>}
          {(isAdmin || isConsultant || isClientMR) && isReview && (
            <>
              <button onClick={approveDoc} disabled={approvingDoc} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: '#3a7a5a', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 500, opacity: approvingDoc ? 0.7 : 1 }}>{approvingDoc ? 'Approving…' : '✓ Approve'}</button>
              <button onClick={() => setShowRequestChanges(v => !v)} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: showRequestChanges ? 'rgba(148,48,48,0.1)' : 'transparent', border: '0.5px solid rgba(148,48,48,0.35)', borderRadius: 6, color: '#943030', fontWeight: 500 }}>Request changes</button>
            </>
          )}
          {isAdmin && isApproved && (
            <button onClick={reviseDoc} disabled={revising} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', opacity: revising ? 0.7 : 1 }}>{revising ? 'Creating…' : '↻ New revision'}</button>
          )}
          <button onClick={() => setShowComments(v => !v)} style={{ height: 28, padding: '0 10px', fontSize: 12, cursor: 'pointer', background: showComments ? 'rgba(200,169,110,0.12)' : 'transparent', border: showComments ? '0.5px solid rgba(200,169,110,0.4)' : '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: showComments ? '#8a6020' : '#5a6472', display: 'flex', alignItems: 'center', gap: 5 }}>
            <I.Comment />{openComments > 0 ? openComments : 'Comments'}
          </button>
          <button onClick={() => setShowReference(v => !v)} style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', background: showReference ? 'rgba(78,140,140,0.1)' : 'transparent', border: showReference ? '0.5px solid rgba(78,140,140,0.4)' : '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: showReference ? '#2e5f5f' : '#5a6472', fontWeight: 500 }}>
            {showReference ? 'Hide example' : 'Show example'}
          </button>
          <button onClick={exportDoc} disabled={exporting} style={{ height: 28, padding: '0 10px', fontSize: 12, cursor: exporting ? 'default' : 'pointer', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', display: 'flex', alignItems: 'center', gap: 5, opacity: exporting ? 0.6 : 1 }}>
            <I.Download />{exporting ? 'Exporting…' : 'DOCX'}
          </button>
        </div>
      </div>

      {/* Meta strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 16px', flexShrink: 0, borderBottom: '1px solid #e0ddd8', background: '#fff', fontSize: 11, color: '#8a96a2' }}>
        <span style={{ fontWeight: 500, color: '#5a6472' }}>{doc.annex}</span>
        <span>·</span><span style={{ fontFamily: 'monospace' }}>{doc.code}</span>
        {doc.template_name && (
          <>
            <span>·</span>
            <span>Template: {doc.template_name} {doc.template_version}</span>
            {(isAdmin || isConsultant) && templateVersions.length > 1 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowVersionUpgrade(v => !v)}
                  style={{ height: 18, padding: '0 6px', fontSize: 10, background: showVersionUpgrade ? 'rgba(78,140,140,0.15)' : 'rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 3, cursor: 'pointer', color: '#5a6472' }}>
                  ↑ Upgrade
                </button>
                {showVersionUpgrade && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 300, padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', marginBottom: 8 }}>Switch template version</div>
                    {templateVersions.map((tv: any) => {
                      const isCurrent = tv.id === tv.current_doc_version_id
                      return (
                        <div key={tv.id} style={{ padding: '8px 0', borderBottom: '0.5px solid #f0ede9', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>{tv.version}</span>
                              {isCurrent && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(78,140,140,0.1)', color: '#2e5f5f' }}>current</span>}
                              {tv.is_current && !isCurrent && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(200,169,110,0.1)', color: '#8a6020' }}>latest</span>}
                            </div>
                            {tv.change_note && <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 2 }}>{tv.change_note}</div>}
                            <div style={{ fontSize: 10, color: '#8a96a2' }}>{new Date(tv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          </div>
                          {!isCurrent && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <button onClick={() => upgradeTemplate(tv.id, false)} disabled={upgradingTemplate}
                                style={{ height: 24, padding: '0 8px', fontSize: 10, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 4, cursor: 'pointer', color: '#5a6472', whiteSpace: 'nowrap' }}>
                                Link only
                              </button>
                              <button onClick={() => upgradeTemplate(tv.id, true)} disabled={upgradingTemplate}
                                style={{ height: 24, padding: '0 8px', fontSize: 10, background: '#4e8c8c', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#fff', whiteSpace: 'nowrap' }}>
                                Apply content
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        <span>·</span><span>{doc.device_name}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{wordCount} words</span>
            <span style={{ width: 1, height: 12, background: 'rgba(0,0,0,0.15)', display: 'inline-block' }} />
            <button onClick={() => setZoom(z => Math.max(50, z - 10))} style={{ width: 20, height: 20, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 3, background: '#f5f2ee', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>−</button>
            <span style={{ minWidth: 38, textAlign: 'center', fontSize: 11, color: '#5a6472' }}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(200, z + 10))} style={{ width: 20, height: 20, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 3, background: '#f5f2ee', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
            <button onClick={() => setZoom(100)} style={{ height: 20, padding: '0 6px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 3, background: '#f5f2ee', cursor: 'pointer', fontSize: 10, color: '#5a6472' }}>Reset</button>
          </div>
      </div>

      {isClient && isApproved && (
        <div style={{ padding: '8px 16px', flexShrink: 0, background: 'rgba(58,122,90,0.08)', borderBottom: '1px solid rgba(58,122,90,0.2)', fontSize: 12, color: '#3a7a5a' }}>
          ✓ This record has been approved and is read-only.
        </div>
      )}

      {showRequestChanges && (
        <div style={{ padding: '12px 16px', flexShrink: 0, background: 'rgba(148,48,48,0.05)', borderBottom: '1px solid rgba(148,48,48,0.15)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#943030', marginBottom: 6 }}>Reason for requesting changes</div>
            <textarea value={changeReason} onChange={e => setChangeReason(e.target.value)} placeholder="Explain what needs to be changed…" autoFocus style={{ width: '100%', height: 70, padding: '8px 10px', fontSize: 12, border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 6, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 22 }}>
            <button onClick={requestChanges} disabled={!changeReason.trim()} style={{ height: 28, padding: '0 12px', fontSize: 12, background: '#943030', border: 'none', borderRadius: 6, color: '#fff', cursor: changeReason.trim() ? 'pointer' : 'default', opacity: changeReason.trim() ? 1 : 0.5 }}>Send</button>
            <button onClick={() => { setShowRequestChanges(false); setChangeReason('') }} style={{ height: 28, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, color: '#5a6472', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Split pane */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Left — editable */}
        <div style={{ width: showReference ? `${leftWidth}%` : '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          {!(isClient && isApproved) && (
            <Toolbar editor={editor} sizes={sizes} onSizeChange={(k, v) => setSizes(p => ({ ...p, [k]: v }))} showOutline={showOutline} onToggleOutline={() => setShowOutline(v => !v)} onInsertToc={insertToc} variables={variables} onInsertImage={() => insertImage(editor)} zoom={zoom} onZoomChange={setZoom} />
          )}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            {showOutline && <OutlinePanel items={tocItems} onClose={() => setShowOutline(false)} />}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', background: '#f5f2ee' }}>
              <div style={{ maxWidth: 780, margin: '0 auto', transformOrigin: 'top center', transform: `scale(${zoom / 100})`, marginBottom: zoom < 100 ? `${-(780 * (1 - zoom/100))}px` : 0 }}>
                <div style={{ background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                  {headerLayout && (
                    <div style={{ padding: '0 72px', borderBottom: '1px solid #f0ede9' }}>
                      <LayoutPreview layout={headerLayout} logo={projectLogo} doc={doc} isFooter={false} />
                    </div>
                  )}
                  <div style={{ padding: '60px 72px', minHeight: 900 }}>
                    <EditorContent editor={editor} />
                  </div>
                  {footerLayout && (
                    <div style={{ padding: '0 72px', borderTop: '1px solid #f0ede9' }}>
                      <LayoutPreview layout={footerLayout} logo={projectLogo} doc={doc} isFooter={true} />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ height: 48 }} />
            </div>
          </div>
        </div>

        {/* Drag divider */}
        {showReference && (
          <div
            onMouseDown={startDividerDrag}
            onDoubleClick={() => setLeftWidth(60)}
            title="Drag to resize · Double-click to reset"
            style={{ width: 6, flexShrink: 0, background: 'transparent', cursor: 'col-resize', borderLeft: '1px solid #d8d4ce', borderRight: '1px solid #d8d4ce', position: 'relative', zIndex: 10 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(78,140,140,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          />
        )}
        {/* Right — example */}
        {showReference && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ede9e3', borderRight: showComments ? '1px solid #d8d4ce' : 'none' }}>
            {/* Example header */}
            <div style={{ padding: '8px 16px', flexShrink: 0, borderBottom: '1px solid #d8d4ce', background: '#e8e3dc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase' as const, letterSpacing: '0.06em', flexShrink: 0 }}>Example</div>
              {/* Example switcher for multiple assigned examples */}
              {assignedExamples.length > 1 && (
                <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' as const }}>
                  {assignedExamples.map((ex: any, idx: number) => (
                    <button key={ex.id} onClick={() => setActiveExampleIdx(idx)}
                      style={{ height: 22, padding: '0 8px', fontSize: 10, borderRadius: 4, border: 'none', cursor: 'pointer', background: activeExampleIdx === idx ? '#4e8c8c' : 'rgba(0,0,0,0.1)', color: activeExampleIdx === idx ? '#fff' : '#5a6472', fontWeight: activeExampleIdx === idx ? 600 : 400 }}>
                      {ex.name}
                    </button>
                  ))}
                </div>
              )}
              {assignedExamples.length === 1 && (
                <span style={{ fontSize: 11, color: '#8a96a2' }}>{assignedExamples[0].name}</span>
              )}
              {/* Consultant: manage examples button */}
              {(isAdmin || isConsultant) && (
                <button onClick={() => setShowManageExamples(v => !v)}
                  style={{ marginLeft: 'auto', height: 24, padding: '0 8px', fontSize: 10, borderRadius: 4, border: showManageExamples ? '0.5px solid rgba(78,140,140,0.4)' : '0.5px solid rgba(0,0,0,0.2)', background: showManageExamples ? 'rgba(78,140,140,0.1)' : 'transparent', color: showManageExamples ? '#2e5f5f' : '#5a6472', cursor: 'pointer', flexShrink: 0, fontWeight: 500 }}>
                  Manage examples
                </button>
              )}
            </div>

            {/* Manage examples panel */}
            {showManageExamples && (isAdmin || isConsultant) && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #d8d4ce', background: '#e0dbd3', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', marginBottom: 8 }}>Assigned examples (visible to client)</div>
                {assignedExamples.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#8a96a2', marginBottom: 8 }}>No examples assigned yet.</div>
                ) : assignedExamples.map((ex: any) => (
                  <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1, fontSize: 12, color: '#1a1f24', fontWeight: 500 }}>{ex.name}</div>
                    {ex.description && <div style={{ fontSize: 11, color: '#8a96a2' }}>{ex.description}</div>}
                    <button onClick={() => removeExample(ex.template_example_id || ex.id)}
                      style={{ height: 22, padding: '0 8px', fontSize: 10, background: 'transparent', border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 4, color: '#943030', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                ))}
                {availableExamples.filter((av: any) => !assignedExamples.find((a: any) => (a.template_example_id || a.id) === av.id)).length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', marginTop: 10, marginBottom: 6 }}>Available from template</div>
                    {availableExamples.filter((av: any) => !assignedExamples.find((a: any) => (a.template_example_id || a.id) === av.id)).map((av: any) => (
                      <div key={av.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: '#1a1f24', fontWeight: 500 }}>{av.name}</div>
                          {av.description && <div style={{ fontSize: 10, color: '#8a96a2' }}>{av.description}</div>}
                        </div>
                        <button onClick={() => addExample(av.id)}
                          style={{ height: 22, padding: '0 8px', fontSize: 10, background: '#4e8c8c', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer' }}>
                          + Add
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {availableExamples.length === 0 && !loadingExamples && (
                  <div style={{ fontSize: 11, color: '#8a96a2', marginTop: 6 }}>No examples in template library yet. Add them in the Template editor.</div>
                )}
              </div>
            )}

            {/* Example content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
              {assignedExamples.length > 0 || hasExample ? (
                <div style={{ maxWidth: 780, margin: '0 auto', background: '#fff', opacity: 0.92, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderRadius: 2, padding: '60px 72px', minHeight: 900 }}>
                  <EditorContent editor={refEditor} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, opacity: 0.2 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#5a6472' }}>No example available</div>
                  <div style={{ fontSize: 12, color: '#8a96a2', maxWidth: 240, lineHeight: 1.7 }}>
                    {(isAdmin || isConsultant) ? 'Click "Manage examples" to assign examples from the template library.' : 'Ask your consultant to assign an example for this document.'}
                  </div>
                </div>
              )}
              <div style={{ height: 48 }} />
            </div>
          </div>
        )}

        {/* Comments panel */}
        {showComments && (
          <CommentsPanel
            comments={comments} commentsLoading={commentsLoading} members={members}
            newComment={newComment} setNewComment={setNewComment}
            replyTo={replyTo} setReplyTo={setReplyTo}
            postingComment={postingComment} postComment={postComment}
            resolveComment={resolveComment} onClose={() => setShowComments(false)}
            activeCommentId={activeCommentId} setActiveCommentId={setActiveCommentId}
            history={history} historyLoading={historyLoading}
            commentTab={commentTab} setCommentTab={setCommentTab}
          />
        )}
      </div>
    </div>
  )
}
