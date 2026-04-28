'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Variable {
  id: string; tag: string; name: string; value: string; status: string
  suggested_value: string | null; approved_at: string | null
  approved_by_name: string | null; suggested_by_name: string | null; updated_at: string
}

interface ProjectInfo { device_name: string; manufacturer_name: string; name: string }

interface LayoutCell {
  row: number; col: number
  content: string
  align: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'center' | 'bottom'
  customText?: string
  fontSize?: number
  bold?: boolean
  italic?: boolean
}

interface Layout {
  rows: number; cols: number; cells: LayoutCell[]
  borderTop?: boolean; borderBottom?: boolean; showCellBorders?: boolean
  colWidths?: number[] // percentages, must sum to 100
  rowHeight?: number // pixels, default 40
}

const CONTENT_OPTIONS = [
  { value: 'empty',             label: 'Empty' },
  { value: 'logo',              label: 'Project logo' },
  { value: 'document_name',     label: 'Document name' },
  { value: 'document_code',     label: 'Document code' },
  { value: 'version',           label: 'Version' },
  { value: 'date',              label: 'Date' },
  { value: 'page_number',       label: 'Page number (X of Y)' },
  { value: 'device_name',       label: 'Device name ($device_name)' },
  { value: 'manufacturer_name', label: 'Manufacturer ($manufacturer_name)' },
  { value: 'custom',            label: 'Custom text…' },
]

const DEFAULT_HEADER: Layout = {
  rows: 1, cols: 3, borderTop: false, borderBottom: true,
  cells: [
    { row: 0, col: 0, content: 'logo', align: 'left' },
    { row: 0, col: 1, content: 'document_name', align: 'center' },
    { row: 0, col: 2, content: 'document_code', align: 'right' },
  ],
}

const DEFAULT_FOOTER: Layout = {
  rows: 1, cols: 3, borderTop: true, borderBottom: false,
  cells: [
    { row: 0, col: 0, content: 'version', align: 'left' },
    { row: 0, col: 1, content: 'date', align: 'center' },
    { row: 0, col: 2, content: 'page_number', align: 'right' },
  ],
}

type PageTab = 'variables' | 'layout'

// ── Layout helpers ────────────────────────────────────────────────────────────

function getColWidths(layout: Layout): number[] {
  if (layout.colWidths && layout.colWidths.length === layout.cols) return layout.colWidths
  const pct = Math.floor(100 / layout.cols)
  const widths = Array(layout.cols).fill(pct)
  widths[widths.length - 1] = 100 - pct * (layout.cols - 1)
  return widths
}

function getCell(layout: Layout, row: number, col: number): LayoutCell {
  return layout.cells.find(c => c.row === row && c.col === col) || { row, col, content: 'empty', align: 'left' }
}

function setCell(layout: Layout, cell: LayoutCell): Layout {
  const cells = layout.cells.filter(c => !(c.row === cell.row && c.col === cell.col))
  return { ...layout, cells: [...cells, cell] }
}

function buildGrid(layout: Layout): LayoutCell[][] {
  return Array.from({ length: layout.rows }, (_, r) =>
    Array.from({ length: layout.cols }, (_, c) => getCell(layout, r, c))
  )
}

function contentLabel(content: string, customText?: string): string {
  if (content === 'custom') return customText || 'Custom text'
  return CONTENT_OPTIONS.find(o => o.value === content)?.label || content
}

function contentPreview(content: string, customText?: string, logo?: string | null, cell?: LayoutCell): React.ReactNode {
  const style: React.CSSProperties = {
    fontSize: cell?.fontSize || 11,
    fontWeight: cell?.bold ? 700 : 400,
    fontStyle: cell?.italic ? 'italic' : 'normal',
  }
  if (content === 'empty') return <span style={{ color: '#d0ccc7', fontStyle: 'italic', fontSize: 11 }}>empty</span>
  if (content === 'logo' && logo) return <img src={logo} alt="Logo" style={{ maxHeight: 28, maxWidth: 80, objectFit: 'contain' }} />
  if (content === 'logo') return <span style={{ ...style, color: '#4e8c8c' }}>LOGO</span>
  if (content === 'page_number') return <span style={{ ...style, color: '#5a6472' }}>Page 1 of 12</span>
  if (content === 'date') return <span style={{ ...style, color: '#5a6472' }}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
  if (content === 'custom') return <span style={{ ...style, color: '#5a6472' }}>{customText || '…'}</span>
  return <span style={{ ...style, color: '#5a6472' }}>{contentLabel(content)}</span>
}

// ── Layout editor component ───────────────────────────────────────────────────

function LayoutEditor({ layout, onChange, logo, title }: {
  layout: Layout; onChange: (l: Layout) => void; logo?: string | null; title: string
}) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingDivider = useRef<number | null>(null)
  const dragStartX = useRef(0)
  const dragStartWidths = useRef<number[]>([])

  const grid = buildGrid(layout)
  const colWidths = getColWidths(layout)
  const sel = selectedCell ? getCell(layout, selectedCell.row, selectedCell.col) : null

  function updateGrid(rows: number, cols: number) {
    const newCells = layout.cells.filter(c => c.row < rows && c.col < cols)
    const pct = Math.floor(100 / cols)
    const newWidths = Array(cols).fill(pct)
    newWidths[newWidths.length - 1] = 100 - pct * (cols - 1)
    onChange({ ...layout, rows, cols, cells: newCells, colWidths: newWidths })
    setSelectedCell(null)
  }

  function updateSelectedCell(updates: Partial<LayoutCell>) {
    if (!selectedCell) return
    const cell = { ...getCell(layout, selectedCell.row, selectedCell.col), ...updates }
    onChange(setCell(layout, cell))
  }

  function startDividerDrag(dividerIdx: number, e: React.MouseEvent) {
    e.preventDefault()
    draggingDivider.current = dividerIdx
    dragStartX.current = e.clientX
    dragStartWidths.current = [...colWidths]
    document.addEventListener('mousemove', onDividerDrag)
    document.addEventListener('mouseup', stopDividerDrag)
  }

  function onDividerDrag(e: MouseEvent) {
    if (draggingDivider.current === null || !containerRef.current) return
    const containerW = containerRef.current.getBoundingClientRect().width
    const dx = e.clientX - dragStartX.current
    const dPct = (dx / containerW) * 100
    const idx = draggingDivider.current
    const newWidths = [...dragStartWidths.current]
    const minW = 10
    newWidths[idx] = Math.max(minW, Math.min(newWidths[idx] + dPct, newWidths[idx] + newWidths[idx + 1] - minW))
    newWidths[idx + 1] = dragStartWidths.current[idx] + dragStartWidths.current[idx + 1] - newWidths[idx]
    onChange({ ...layout, colWidths: newWidths })
  }

  function stopDividerDrag() {
    draggingDivider.current = null
    document.removeEventListener('mousemove', onDividerDrag)
    document.removeEventListener('mouseup', stopDividerDrag)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f24', marginBottom: 12 }}>{title}</div>

      {/* Grid size picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' as const }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#5a6472' }}>Rows:</span>
          {[1, 2, 3].map(r => (
            <button key={r} onClick={() => updateGrid(r, layout.cols)}
              style={{ width: 28, height: 28, borderRadius: 6, border: layout.rows === r ? '1.5px solid #4e8c8c' : '0.5px solid rgba(0,0,0,0.2)', background: layout.rows === r ? 'rgba(78,140,140,0.1)' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: layout.rows === r ? 600 : 400, color: layout.rows === r ? '#2e5f5f' : '#5a6472' }}>
              {r}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#5a6472' }}>Columns:</span>
          {[1, 2, 3, 4].map(c => (
            <button key={c} onClick={() => updateGrid(layout.rows, c)}
              style={{ width: 28, height: 28, borderRadius: 6, border: layout.cols === c ? '1.5px solid #4e8c8c' : '0.5px solid rgba(0,0,0,0.2)', background: layout.cols === c ? 'rgba(78,140,140,0.1)' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: layout.cols === c ? 600 : 400, color: layout.cols === c ? '#2e5f5f' : '#5a6472' }}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#5a6472' }}>Height:</span>
          <button onClick={() => onChange({ ...layout, rowHeight: Math.max(24, (layout.rowHeight || 40) - 4) })} style={{ width: 22, height: 22, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13 }}>−</button>
          <span style={{ minWidth: 32, textAlign: 'center', fontSize: 12, color: '#1a1f24' }}>{layout.rowHeight || 40}px</span>
          <button onClick={() => onChange({ ...layout, rowHeight: Math.min(120, (layout.rowHeight || 40) + 4) })} style={{ width: 22, height: 22, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13 }}>+</button>
        </div>
        {[['borderTop', 'Border top'], ['borderBottom', 'Border bottom'], ['showCellBorders', 'Cell borders']].map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#5a6472', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!(layout as any)[key]} onChange={e => onChange({ ...layout, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Grid preview + editor */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Visual grid with draggable dividers */}
        <div style={{ flex: 1 }} ref={containerRef}>
          <div style={{ fontSize: 11, color: '#8a96a2', marginBottom: 6 }}>Click cell to edit · Drag dividers to resize columns</div>
          {layout.borderTop && <div style={{ height: 2, background: '#d8d4ce', marginBottom: 3, borderRadius: 1 }} />}
          {grid.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', alignItems: 'stretch', marginBottom: ri < layout.rows - 1 ? 3 : 0 }}>
              {row.map((cell, ci) => (
                <>
                  <button key={`${ri}-${ci}`} onClick={() => setSelectedCell({ row: ri, col: ci })}
                    style={{ width: `${colWidths[ci]}%`, minHeight: layout.rowHeight || 52, padding: '8px 10px', border: (selectedCell?.row === ri && selectedCell?.col === ci) ? '2px solid #4e8c8c' : '1px solid #e0ddd8', borderRadius: 6, background: (selectedCell?.row === ri && selectedCell?.col === ci) ? 'rgba(78,140,140,0.06)' : '#faf9f7', cursor: 'pointer', display: 'flex', alignItems: cell.verticalAlign === 'top' ? 'flex-start' : cell.verticalAlign === 'bottom' ? 'flex-end' : 'center', justifyContent: cell.align === 'center' ? 'center' : cell.align === 'right' ? 'flex-end' : 'flex-start', flexShrink: 0, boxSizing: 'border-box' as const }}>
                    {contentPreview(cell.content, cell.customText, logo, cell)}
                  </button>
                  {ci < layout.cols - 1 && (
                    <div
                      onMouseDown={e => startDividerDrag(ci, e)}
                      title="Drag to resize"
                      style={{ width: 6, flexShrink: 0, cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d8d4ce', fontSize: 10 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#4e8c8c' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#d8d4ce' }}
                    >⋮</div>
                  )}
                </>
              ))}
            </div>
          ))}
          {layout.borderBottom && <div style={{ height: 2, background: '#d8d4ce', marginTop: 3, borderRadius: 1 }} />}
          {layout.colWidths && (
            <div style={{ display: 'flex', marginTop: 6, gap: 6 }}>
              {colWidths.map((w, i) => (
                <div key={i} style={{ width: `${w}%`, textAlign: 'center', fontSize: 10, color: '#8a96a2' }}>{Math.round(w)}%</div>
              ))}
            </div>
          )}
        </div>

        {/* Cell editor */}
        {sel && (
          <div style={{ width: 220, flexShrink: 0, background: '#f5f2ee', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cell ({sel.row + 1},{sel.col + 1})
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#5a6472', display: 'block', marginBottom: 4 }}>Content</label>
              <select value={sel.content} onChange={e => updateSelectedCell({ content: e.target.value })}
                style={{ width: '100%', height: 32, padding: '0 8px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, background: '#fff', outline: 'none' }}>
                {CONTENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {sel.content === 'custom' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: '#5a6472', display: 'block', marginBottom: 4 }}>Custom text</label>
                <input value={sel.customText || ''} onChange={e => updateSelectedCell({ customText: e.target.value })}
                  placeholder="Enter text…"
                  style={{ width: '100%', height: 32, padding: '0 8px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}
            {/* Horizontal alignment */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#5a6472', display: 'block', marginBottom: 4 }}>Horizontal align</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['left', 'center', 'right'] as const).map(a => (
                  <button key={a} onClick={() => updateSelectedCell({ align: a })}
                    style={{ flex: 1, height: 28, fontSize: 11, border: sel.align === a ? '1.5px solid #4e8c8c' : '0.5px solid rgba(0,0,0,0.2)', borderRadius: 5, background: sel.align === a ? 'rgba(78,140,140,0.1)' : '#fff', cursor: 'pointer', color: sel.align === a ? '#2e5f5f' : '#5a6472', fontWeight: sel.align === a ? 600 : 400 }}>
                    {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                  </button>
                ))}
              </div>
            </div>
            {/* Vertical alignment */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#5a6472', display: 'block', marginBottom: 4 }}>Vertical align</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['top', 'center', 'bottom'] as const).map(a => (
                  <button key={a} onClick={() => updateSelectedCell({ verticalAlign: a })}
                    style={{ flex: 1, height: 28, fontSize: 11, border: (sel.verticalAlign || 'center') === a ? '1.5px solid #4e8c8c' : '0.5px solid rgba(0,0,0,0.2)', borderRadius: 5, background: (sel.verticalAlign || 'center') === a ? 'rgba(78,140,140,0.1)' : '#fff', cursor: 'pointer', color: (sel.verticalAlign || 'center') === a ? '#2e5f5f' : '#5a6472', fontWeight: (sel.verticalAlign || 'center') === a ? 600 : 400 }}>
                    {a === 'top' ? '⬆' : a === 'center' ? '↕' : '⬇'}
                  </button>
                ))}
              </div>
            </div>
            {/* Font size */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#5a6472', display: 'block', marginBottom: 4 }}>Font size</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => updateSelectedCell({ fontSize: Math.max(6, (sel.fontSize || 11) - 1) })} style={{ width: 24, height: 24, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 14 }}>−</button>
                <input type="number" value={sel.fontSize || 11} min={6} max={36} onChange={e => updateSelectedCell({ fontSize: Math.max(6, Math.min(36, parseInt(e.target.value) || 11)) })}
                  style={{ width: 44, height: 24, textAlign: 'center', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: 12, outline: 'none' }} />
                <button onClick={() => updateSelectedCell({ fontSize: Math.min(36, (sel.fontSize || 11) + 1) })} style={{ width: 24, height: 24, border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 14 }}>+</button>
              </div>
            </div>
            {/* Bold / Italic */}
            <div>
              <label style={{ fontSize: 11, color: '#5a6472', display: 'block', marginBottom: 4 }}>Style</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => updateSelectedCell({ bold: !sel.bold })}
                  style={{ height: 28, padding: '0 12px', fontSize: 13, fontWeight: 700, border: sel.bold ? '1.5px solid #4e8c8c' : '0.5px solid rgba(0,0,0,0.2)', borderRadius: 5, background: sel.bold ? 'rgba(78,140,140,0.1)' : '#fff', cursor: 'pointer', color: sel.bold ? '#2e5f5f' : '#5a6472' }}>B</button>
                <button onClick={() => updateSelectedCell({ italic: !sel.italic })}
                  style={{ height: 28, padding: '0 12px', fontSize: 13, fontStyle: 'italic', border: sel.italic ? '1.5px solid #4e8c8c' : '0.5px solid rgba(0,0,0,0.2)', borderRadius: 5, background: sel.italic ? 'rgba(78,140,140,0.1)' : '#fff', cursor: 'pointer', color: sel.italic ? '#2e5f5f' : '#5a6472' }}>I</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProjectVariablesPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [variables, setVariables] = useState<Variable[]>([])
  const [logo, setLogo] = useState<string | null>(null)
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [requestValues, setRequestValues] = useState<Record<string, string>>({})
  const [showRequest, setShowRequest] = useState<Record<string, boolean>>({})
  const [logoUploading, setLogoUploading] = useState(false)
  const [pageTab, setPageTab] = useState<PageTab>('variables')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Layout state
  const [headerLayout, setHeaderLayout] = useState<Layout>(DEFAULT_HEADER)
  const [footerLayout, setFooterLayout] = useState<Layout>(DEFAULT_FOOTER)
  const [layoutSaving, setLayoutSaving] = useState(false)
  const [layoutSaved, setLayoutSaved] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.ok ? r.json() : null).then(d => { if (d?.user) setUserRole(d.user.role) })
  }, [])

  async function load() {
    try {
      const res = await fetch(`/api/projects/${projectId}/variables`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setVariables(data.variables || [])
      setLogo(data.logo)
      setProject(data.project)
      const vals: Record<string, string> = {}
      for (const v of data.variables || []) vals[v.tag] = v.value || ''
      setEditValues(vals)
      setLoading(false)
    } catch { router.push(`/dashboard/projects/${projectId}`) }
  }

  async function loadLayout() {
    const res = await fetch(`/api/projects/${projectId}/layout`)
    if (res.ok) {
      const data = await res.json()
      if (data.header_layout) setHeaderLayout(data.header_layout)
      if (data.footer_layout) setFooterLayout(data.footer_layout)
    }
  }

  useEffect(() => { load() }, [projectId])
  useEffect(() => { if (pageTab === 'layout') loadLayout() }, [pageTab])

  const isAdminOrConsultant = userRole === 'admin' || userRole === 'consultant'
  const isClient = userRole === 'client'

  async function saveVariable(tag: string, value: string) {
    setSaving(tag)
    try {
      await fetch(`/api/projects/${projectId}/variables`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag, value }),
      })
      await load()
    } finally { setSaving(null) }
  }

  async function approveVariable(tag: string) {
    setSaving(tag)
    try {
      await fetch(`/api/projects/${projectId}/variables`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag, action: 'approve' }),
      })
      await load()
    } finally { setSaving(null) }
  }

  async function requestEdit(tag: string) {
    const value = requestValues[tag]
    if (!value?.trim()) return
    setSaving(tag)
    try {
      await fetch(`/api/projects/${projectId}/variables`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag, value, action: 'request_edit' }),
      })
      setShowRequest(p => ({ ...p, [tag]: false }))
      setRequestValues(p => ({ ...p, [tag]: '' }))
      await load()
    } finally { setSaving(null) }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return }
    if (file.size > 500000) { alert('Logo must be under 500KB'); return }
    setLogoUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string
        const res = await fetch(`/api/projects/${projectId}/logo`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logo: base64 }),
        })
        if (res.ok) setLogo(base64)
        else alert('Failed to upload logo')
        setLogoUploading(false)
      }
      reader.readAsDataURL(file)
    } catch { setLogoUploading(false) }
  }

  async function removeLogo() {
    if (!confirm('Remove logo?')) return
    await fetch(`/api/projects/${projectId}/logo`, { method: 'DELETE' })
    setLogo(null)
  }

  async function saveLayout() {
    setLayoutSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/layout`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ header_layout: headerLayout, footer_layout: footerLayout }),
      })
      if (res.ok) { setLayoutSaved(true); setTimeout(() => setLayoutSaved(false), 2000) }
    } finally { setLayoutSaving(false) }
  }

  const statusStyle = (status: string) => {
    if (status === 'approved') return { bg: 'rgba(58,122,90,0.1)', color: '#3a7a5a', border: 'rgba(58,122,90,0.3)', label: 'Approved' }
    if (status === 'draft') return { bg: 'rgba(200,169,110,0.12)', color: '#8a6020', border: 'rgba(200,169,110,0.4)', label: 'Draft' }
    return { bg: '#f5f2ee', color: '#8a96a2', border: 'rgba(0,0,0,0.1)', label: 'Not set' }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#8a96a2', fontSize: 13 }}>Loading…</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8a96a2', marginBottom: 12 }}>
          <Link href="/dashboard/projects" style={{ color: '#8a96a2', textDecoration: 'none' }}>Projects</Link>
          <span>›</span>
          <Link href={`/dashboard/projects/${projectId}`} style={{ color: '#8a96a2', textDecoration: 'none' }}>{project?.device_name || 'Project'}</Link>
          <span>›</span>
          <span style={{ color: '#1a1f24' }}>Project data</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1f24', margin: 0, fontFamily: 'Cormorant Garamond, serif' }}>Project data</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0ddd8', marginBottom: 24 }}>
        {([['variables', 'Variables & Logo'], ['layout', 'Header & Footer Layout']] as [PageTab, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setPageTab(tab)}
            style={{ height: 36, padding: '0 16px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', borderBottom: pageTab === tab ? '2px solid #4e8c8c' : '2px solid transparent', color: pageTab === tab ? '#2e5f5f' : '#5a6472', fontWeight: pageTab === tab ? 500 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Variables & Logo tab ── */}
      {pageTab === 'variables' && (
        <>
          {/* Logo section */}
          <div style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f24', marginBottom: 4 }}>Project logo</div>
            <div style={{ fontSize: 12, color: '#8a96a2', marginBottom: 16 }}>Used in document headers on export. PNG/SVG recommended, max 500KB.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {logo ? (
                <>
                  <img src={logo} alt="Project logo" style={{ height: 56, maxWidth: 200, objectFit: 'contain', border: '1px solid #e0ddd8', borderRadius: 6, padding: 6, background: '#faf9f7' }} />
                  {isAdminOrConsultant && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => fileInputRef.current?.click()} style={{ height: 30, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, cursor: 'pointer', color: '#5a6472' }}>Replace</button>
                      <button onClick={removeLogo} style={{ height: 30, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 6, cursor: 'pointer', color: '#943030' }}>Remove</button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 80, height: 48, border: '1px dashed #d8d4ce', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a96a2', fontSize: 11 }}>No logo</div>
                  {isAdminOrConsultant && (
                    <button onClick={() => fileInputRef.current?.click()} disabled={logoUploading}
                      style={{ height: 32, padding: '0 14px', fontSize: 12, background: '#4e8c8c', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', opacity: logoUploading ? 0.7 : 1 }}>
                      {logoUploading ? 'Uploading…' : '+ Upload logo'}
                    </button>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </div>
          </div>

          {/* Variables */}
          <div style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e0ddd8', background: '#f5f2ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f24' }}>Project variables</div>
              <div style={{ fontSize: 11, color: '#8a96a2' }}>{variables.filter(v => v.value).length} of {variables.length} defined</div>
            </div>
            {variables.map((v, idx) => {
              const st = statusStyle(v.value ? v.status : 'undefined')
              const isApproved = v.status === 'approved'
              const canEdit = isAdminOrConsultant || !isApproved
              const isSaving = saving === v.tag
              const currentEdit = editValues[v.tag] ?? v.value ?? ''
              return (
                <div key={v.id} style={{ padding: '16px 20px', borderBottom: idx < variables.length - 1 ? '1px solid #f0ede9' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ width: 200, flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1f24', marginBottom: 2 }}>{v.name}</div>
                      <code style={{ fontSize: 11, color: '#4e8c8c', background: 'rgba(78,140,140,0.08)', padding: '1px 6px', borderRadius: 3 }}>{v.tag}</code>
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: st.bg, color: st.color, border: `0.5px solid ${st.border}`, fontWeight: 500 }}>{st.label}</span>
                      </div>
                      {v.approved_by_name && <div style={{ fontSize: 10, color: '#8a96a2', marginTop: 4 }}>by {v.approved_by_name}</div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      {v.suggested_value && isAdminOrConsultant && (
                        <div style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(200,169,110,0.1)', border: '0.5px solid rgba(200,169,110,0.4)', borderRadius: 6, fontSize: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: '#8a6020', marginBottom: 4 }}>{v.suggested_by_name} suggested:</div>
                          <div style={{ color: '#2e3640', fontStyle: 'italic', marginBottom: 8 }}>"{v.suggested_value}"</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => approveVariable(v.tag)} disabled={isSaving} style={{ height: 26, padding: '0 10px', fontSize: 11, background: '#3a7a5a', border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer' }}>Accept</button>
                            <button onClick={() => saveVariable(v.tag, v.value)} disabled={isSaving} style={{ height: 26, padding: '0 10px', fontSize: 11, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 5, color: '#5a6472', cursor: 'pointer' }}>Reject</button>
                          </div>
                        </div>
                      )}
                      {canEdit ? (
                        <div>
                          <textarea value={currentEdit} onChange={e => setEditValues(p => ({ ...p, [v.tag]: e.target.value }))} placeholder={`Enter ${v.name.toLowerCase()}…`} rows={currentEdit.length > 100 ? 4 : 2}
                            style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6, color: '#1a1f24' }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                            <button onClick={() => saveVariable(v.tag, currentEdit)} disabled={isSaving || currentEdit === v.value}
                              style={{ height: 28, padding: '0 14px', fontSize: 12, background: currentEdit !== v.value ? '#4e8c8c' : '#f5f2ee', border: 'none', borderRadius: 6, color: currentEdit !== v.value ? '#fff' : '#8a96a2', cursor: currentEdit !== v.value ? 'pointer' : 'default', fontWeight: 500 }}>
                              {isSaving ? 'Saving…' : 'Save'}
                            </button>
                            {isAdminOrConsultant && v.value && v.status !== 'approved' && (
                              <button onClick={() => approveVariable(v.tag)} disabled={isSaving}
                                style={{ height: 28, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(58,122,90,0.4)', borderRadius: 6, color: '#3a7a5a', cursor: 'pointer' }}>
                                ✓ Approve
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ padding: '8px 10px', background: '#faf9f7', border: '0.5px solid #e0ddd8', borderRadius: 6, fontSize: 13, color: '#1a1f24', lineHeight: 1.6, minHeight: 36, whiteSpace: 'pre-wrap' }}>
                            {v.value || <span style={{ color: '#8a96a2', fontStyle: 'italic' }}>Not defined yet</span>}
                          </div>
                          {isClient && isApproved && !showRequest[v.tag] && (
                            <button onClick={() => setShowRequest(p => ({ ...p, [v.tag]: true }))}
                              style={{ marginTop: 6, height: 26, padding: '0 10px', fontSize: 11, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 5, color: '#5a6472', cursor: 'pointer' }}>
                              Request edit
                            </button>
                          )}
                          {isClient && showRequest[v.tag] && (
                            <div style={{ marginTop: 8 }}>
                              <textarea value={requestValues[v.tag] || ''} onChange={e => setRequestValues(p => ({ ...p, [v.tag]: e.target.value }))} placeholder={`Suggest new value…`} rows={2} autoFocus
                                style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                <button onClick={() => requestEdit(v.tag)} disabled={!requestValues[v.tag]?.trim() || isSaving}
                                  style={{ height: 26, padding: '0 12px', fontSize: 11, background: '#4e8c8c', border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', opacity: !requestValues[v.tag]?.trim() ? 0.5 : 1 }}>
                                  Send request
                                </button>
                                <button onClick={() => setShowRequest(p => ({ ...p, [v.tag]: false }))}
                                  style={{ height: 26, padding: '0 10px', fontSize: 11, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 5, color: '#5a6472', cursor: 'pointer' }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Header & Footer Layout tab ── */}
      {pageTab === 'layout' && (
        <div>
          {!isAdminOrConsultant && (
            <div style={{ padding: '12px 16px', background: 'rgba(90,100,114,0.06)', border: '0.5px solid rgba(90,100,114,0.2)', borderRadius: 8, fontSize: 12, color: '#5a6472', marginBottom: 16 }}>
              Header and footer layout is managed by your consultant.
            </div>
          )}
          <LayoutEditor
            layout={headerLayout}
            onChange={isAdminOrConsultant ? setHeaderLayout : () => {}}
            logo={logo}
            title="Document header (top of each page)"
          />
          <LayoutEditor
            layout={footerLayout}
            onChange={isAdminOrConsultant ? setFooterLayout : () => {}}
            logo={logo}
            title="Document footer (bottom of each page)"
          />
          {isAdminOrConsultant && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={saveLayout} disabled={layoutSaving}
                style={{ height: 34, padding: '0 20px', fontSize: 13, background: '#4e8c8c', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 500, opacity: layoutSaving ? 0.7 : 1 }}>
                {layoutSaving ? 'Saving…' : 'Save layout'}
              </button>
              {layoutSaved && <span style={{ fontSize: 12, color: '#3a7a5a' }}>✓ Saved</span>}
              <button onClick={() => { setHeaderLayout(DEFAULT_HEADER); setFooterLayout(DEFAULT_FOOTER) }}
                style={{ height: 34, padding: '0 14px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, color: '#5a6472', cursor: 'pointer' }}>
                Reset to defaults
              </button>
            </div>
          )}
          <div style={{ height: 48 }} />
        </div>
      )}
      <div style={{ height: 48 }} />
    </div>
  )
}
