'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Variable {
  id: string; tag: string; name: string; value: string; status: string
  suggested_value: string | null; approved_at: string | null
  approved_by_name: string | null; suggested_by_name: string | null; updated_at: string
}

interface ProjectInfo {
  device_name: string; manufacturer_name: string
}

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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      // Init edit values
      const vals: Record<string, string> = {}
      for (const v of data.variables || []) vals[v.tag] = v.value || ''
      setEditValues(vals)
      setLoading(false)
    } catch { router.push(`/dashboard/projects/${projectId}`) }
  }

  useEffect(() => { load() }, [projectId])

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
        if (res.ok) { setLogo(base64) }
        else { alert('Failed to upload logo') }
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

  const statusStyle = (status: string) => {
    if (status === 'approved') return { bg: 'rgba(58,122,90,0.1)', color: '#3a7a5a', border: 'rgba(58,122,90,0.3)', label: 'Approved' }
    if (status === 'draft') return { bg: 'rgba(200,169,110,0.12)', color: '#8a6020', border: 'rgba(200,169,110,0.4)', label: 'Draft' }
    return { bg: '#f5f2ee', color: '#8a96a2', border: 'rgba(0,0,0,0.1)', label: 'Not set' }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#8a96a2', fontSize: 13 }}>Loading…</div>

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8a96a2', marginBottom: 12 }}>
          <Link href="/dashboard/projects" style={{ color: '#8a96a2', textDecoration: 'none' }}>Projects</Link>
          <span>›</span>
          <Link href={`/dashboard/projects/${projectId}`} style={{ color: '#8a96a2', textDecoration: 'none' }}>{project?.device_name || 'Project'}</Link>
          <span>›</span>
          <span style={{ color: '#1a1f24' }}>Project data</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1f24', margin: 0, fontFamily: 'Cormorant Garamond, serif' }}>Project data</h1>
            <p style={{ fontSize: 13, color: '#5a6472', marginTop: 6, lineHeight: 1.6 }}>
              Define global project variables. These are inserted automatically into documents using tags like <code style={{ background: '#f5f2ee', padding: '1px 5px', borderRadius: 3, fontSize: 12, color: '#4e8c8c' }}>$intended_use</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Logo section */}
      <div style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f24', marginBottom: 4 }}>Project logo</div>
        <div style={{ fontSize: 12, color: '#8a96a2', marginBottom: 16 }}>Used in document headers on export. Recommended: PNG/SVG, max 500KB, landscape orientation.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {logo ? (
            <>
              <img src={logo} alt="Project logo" style={{ height: 56, maxWidth: 200, objectFit: 'contain', border: '1px solid #e0ddd8', borderRadius: 6, padding: 6, background: '#faf9f7' }} />
              {isAdminOrConsultant && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => fileInputRef.current?.click()} style={{ height: 30, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, cursor: 'pointer', color: '#5a6472' }}>
                    Replace
                  </button>
                  <button onClick={removeLogo} style={{ height: 30, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 6, cursor: 'pointer', color: '#943030' }}>
                    Remove
                  </button>
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
                {/* Left — tag + label */}
                <div style={{ width: 200, flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1f24', marginBottom: 2 }}>{v.name}</div>
                  <code style={{ fontSize: 11, color: '#4e8c8c', background: 'rgba(78,140,140,0.08)', padding: '1px 6px', borderRadius: 3 }}>{v.tag}</code>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: st.bg, color: st.color, border: `0.5px solid ${st.border}`, fontWeight: 500 }}>{st.label}</span>
                  </div>
                  {v.approved_at && v.approved_by_name && (
                    <div style={{ fontSize: 10, color: '#8a96a2', marginTop: 4 }}>by {v.approved_by_name}</div>
                  )}
                </div>

                {/* Right — value editor */}
                <div style={{ flex: 1 }}>
                  {/* Suggested value banner */}
                  {v.suggested_value && isAdminOrConsultant && (
                    <div style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(200,169,110,0.1)', border: '0.5px solid rgba(200,169,110,0.4)', borderRadius: 6, fontSize: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#8a6020', marginBottom: 4 }}>
                        {v.suggested_by_name} suggested a change:
                      </div>
                      <div style={{ color: '#2e3640', fontStyle: 'italic', marginBottom: 8 }}>"{v.suggested_value}"</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => approveVariable(v.tag)} disabled={isSaving}
                          style={{ height: 26, padding: '0 10px', fontSize: 11, background: '#3a7a5a', border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer' }}>
                          Accept suggestion
                        </button>
                        <button onClick={() => saveVariable(v.tag, v.value)} disabled={isSaving}
                          style={{ height: 26, padding: '0 10px', fontSize: 11, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 5, color: '#5a6472', cursor: 'pointer' }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {canEdit ? (
                    <div>
                      <textarea
                        value={currentEdit}
                        onChange={e => setEditValues(p => ({ ...p, [v.tag]: e.target.value }))}
                        placeholder={`Enter ${v.name.toLowerCase()}…`}
                        rows={currentEdit.length > 100 ? 4 : 2}
                        style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6, color: '#1a1f24' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <button
                          onClick={() => saveVariable(v.tag, currentEdit)}
                          disabled={isSaving || currentEdit === v.value}
                          style={{ height: 28, padding: '0 14px', fontSize: 12, background: currentEdit !== v.value ? '#4e8c8c' : '#f5f2ee', border: 'none', borderRadius: 6, color: currentEdit !== v.value ? '#fff' : '#8a96a2', cursor: currentEdit !== v.value ? 'pointer' : 'default', fontWeight: 500 }}>
                          {isSaving ? 'Saving…' : 'Save'}
                        </button>
                        {isAdminOrConsultant && v.value && v.status !== 'approved' && (
                          <button onClick={() => approveVariable(v.tag)} disabled={isSaving}
                            style={{ height: 28, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(58,122,90,0.4)', borderRadius: 6, color: '#3a7a5a', cursor: 'pointer' }}>
                            ✓ Approve
                          </button>
                        )}
                        {isApproved && isAdminOrConsultant && (
                          <span style={{ fontSize: 11, color: '#8a96a2' }}>Editing will reset to draft</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Client view of approved variable */
                    <div>
                      <div style={{ padding: '8px 10px', background: '#faf9f7', border: '0.5px solid #e0ddd8', borderRadius: 6, fontSize: 13, color: '#1a1f24', lineHeight: 1.6, minHeight: 36, whiteSpace: 'pre-wrap' }}>
                        {v.value || <span style={{ color: '#8a96a2', fontStyle: 'italic' }}>Not defined yet</span>}
                      </div>
                      {/* Client request edit */}
                      {isClient && isApproved && !showRequest[v.tag] && (
                        <button onClick={() => setShowRequest(p => ({ ...p, [v.tag]: true }))}
                          style={{ marginTop: 6, height: 26, padding: '0 10px', fontSize: 11, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 5, color: '#5a6472', cursor: 'pointer' }}>
                          Request edit
                        </button>
                      )}
                      {isClient && showRequest[v.tag] && (
                        <div style={{ marginTop: 8 }}>
                          <textarea
                            value={requestValues[v.tag] || ''}
                            onChange={e => setRequestValues(p => ({ ...p, [v.tag]: e.target.value }))}
                            placeholder={`Suggest new value for ${v.name}…`}
                            rows={2} autoFocus
                            style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                          />
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

      <div style={{ height: 48 }} />
    </div>
  )
}
