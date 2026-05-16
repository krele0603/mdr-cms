'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const LEVEL_META = [
  { level: 1, label: 'Policies',          color: '#3C3489', bg: '#EEEDFE', border: '#AFA9EC', icon: '🛡️' },
  { level: 2, label: 'Procedures',        color: '#0C447C', bg: '#E6F1FB', border: '#85B7EB', icon: '📄' },
  { level: 3, label: 'Work Instructions', color: '#27500A', bg: '#EAF3DE', border: '#97C459', icon: '📋' },
  { level: 4, label: 'Forms & Templates', color: '#633806', bg: '#FAEEDA', border: '#FAC775', icon: '📝' },
  { level: 5, label: 'Records',           color: '#5F5E5A', bg: '#F1EFE8', border: '#D3D1C7', icon: '🗂️' },
]

const DOC_STATUS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  draft:    { bg: '#F1EFE8', color: '#5F5E5A', border: '#D3D1C7', label: 'Draft' },
  active:   { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB', label: 'Active' },
  review:   { bg: '#FAEEDA', color: '#633806', border: '#FAC775', label: 'Under review' },
  approved: { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Approved' },
  archived: { bg: '#F1EFE8', color: '#888780', border: '#D3D1C7', label: 'Archived' },
}

const ROLE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  admin:       { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC' },
  consultant:  { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB' },
  client:      { bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
  'client-MR': { bg: '#FEF0E0', color: '#7A3B00', border: '#F5B97A' },
}

const ACCESS_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  view: { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB', label: 'View' },
  edit: { bg: '#EAF3DE', color: '#27500A', border: '#97C459', label: 'Edit' },
}

interface ProjectAssignment { project_id: string; project_name: string; access_level: string }
interface Member { id: string; name: string; email: string; role: string; added_at: string; project_assignments: ProjectAssignment[]; company_role?: string }
interface Project { id: string; name: string; device_name: string; status: string; updated_at: string; list_name: string; total_docs: number; approved_docs: number }
interface User { id: string; name: string; email: string; role: string }
interface DocList { id: string; name: string; doc_count: number }

export default function CompanyPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [company, setCompany] = useState<any>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionRole, setSessionRole] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<User[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [assigningProject, setAssigningProject] = useState<string | null>(null) // memberId
  const [savingAccess, setSavingAccess] = useState<string | null>(null)
  // New project modal
  const [showNewProject, setShowNewProject] = useState(false)
  const [companyVars, setCompanyVars] = useState<any[]>([])
  const [savingVar, setSavingVar] = useState<Record<string, boolean>>({})
  const [showAddVar, setShowAddVar] = useState(false)
  const [newVarTag, setNewVarTag] = useState('')
  const [newVarName, setNewVarName] = useState('')
  const [newVarValue, setNewVarValue] = useState('')
  const [addingVar, setAddingVar] = useState(false)
  const [editingVarId, setEditingVarId] = useState<string | null>(null)
  const [editingVarValue, setEditingVarValue] = useState('')
  const [lists, setLists] = useState<DocList[]>([])
  const [projectForm, setProjectForm] = useState({ name: '', device_name: '', list_id: '', description: '' })
  const [projectFormError, setProjectFormError] = useState('')
  const [savingProject, setSavingProject] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => setSessionRole(d?.user?.role || ''))
    load()
    loadVars()
    fetch('/api/lists').then(r => r.ok ? r.json() : { lists: [] }).then(d => setLists(d.lists || []))
  }, [id])

  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); return }
    const t = setTimeout(async () => {
      setSearchingUsers(true)
      const res = await fetch(`/api/users?search=${encodeURIComponent(userSearch)}`)
      if (res.ok) {
        const all = await res.json()
        const memberIds = new Set(members.map(m => m.id))
        setUserResults(all.filter((u: User) => !memberIds.has(u.id) && ['consultant', 'client', 'client-MR'].includes(u.role)))
      }
      setSearchingUsers(false)
    }, 300)
    return () => clearTimeout(t)
  }, [userSearch, members])

  async function loadVars() {
    const res = await fetch(`/api/companies/${id}/variables`)
    if (res.ok) setCompanyVars(await res.json())
  }

  async function patchVar(varId: string, value: string) {
    setSavingVar(s => ({ ...s, [varId]: true }))
    await fetch(`/api/companies/${id}/variables/${varId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
    setSavingVar(s => ({ ...s, [varId]: false }))
    setCompanyVars(prev => prev.map(v => v.id === varId ? { ...v, value } : v))
    setEditingVarId(null)
  }

  async function addVar() {
    if (!newVarTag.trim() || !newVarName.trim()) return
    setAddingVar(true)
    const tag = newVarTag.trim().startsWith('$') ? newVarTag.trim() : '$' + newVarTag.trim()
    const res = await fetch(`/api/companies/${id}/variables`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, name: newVarName.trim(), value: newVarValue }),
    })
    if (res.ok) {
      setShowAddVar(false); setNewVarTag(''); setNewVarName(''); setNewVarValue('')
      loadVars()
    }
    setAddingVar(false)
  }

  async function deleteVar(varId: string) {
    if (!confirm('Delete this variable?')) return
    await fetch(`/api/companies/${id}/variables/${varId}`, { method: 'DELETE' })
    loadVars()
  }

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/companies/${id}`)
    if (!res.ok) { router.push('/dashboard/companies'); return }
    const data = await res.json()
    setCompany(data.company)
    setMembers(data.members || [])
    setProjects(data.projects || [])
    setLoading(false)
  }

  async function addMember(user: User) {
    await fetch(`/api/companies/${id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })
    setUserSearch(''); setUserResults([]); setShowAddMember(false)
    load()
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this member from the company? This will also remove all their project assignments.')) return
    await fetch(`/api/companies/${id}/members?user_id=${userId}`, { method: 'DELETE' })
    // Also remove all project assignments
    const member = members.find(m => m.id === userId)
    if (member) {
      for (const a of member.project_assignments) {
        await fetch(`/api/companies/${id}/members/${userId}/projects?project_id=${a.project_id}`, { method: 'DELETE' })
      }
    }
    load()
  }

  async function deleteCompany() {
    if (!confirm(`Delete company "${company.name}"?\n\nThis will remove all members and eQMS documents. Projects will be unlinked but not deleted.`)) return
    if (!confirm(`CONFIRM: Permanently delete "${company.name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' })
    if (!res.ok) { alert('Failed to delete company'); return }
    router.push('/dashboard/companies')
  }

  async function toggleModule(mod: 'tfbuilder' | 'eqms', val: boolean) {
    const current = company?.modules || { tfbuilder: true, eqms: true }
    const updated = { ...current, [mod]: val }
    const res = await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules: updated }),
    })
    if (res.ok) setCompany((c: any) => ({ ...c, modules: updated }))
  }

  async function createProject() {
    setProjectFormError('')
    if (!projectForm.name.trim()) { setProjectFormError('Project name is required'); return }
    if (!projectForm.device_name.trim()) { setProjectFormError('Device name is required'); return }
    if (!projectForm.list_id) { setProjectFormError('Document list is required'); return }
    setSavingProject(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectForm.name,
          device_name: projectForm.device_name,
          manufacturer_name: company.name,
          manufacturer_country: company.country || '',
          manufacturer_contact: company.contact || '',
          manufacturer_email: company.email || '',
          list_id: projectForm.list_id,
          description: projectForm.description,
          company_id: id,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setProjectFormError(data.error || 'Failed to create project'); return }
      setShowNewProject(false)
      setProjectForm({ name: '', device_name: '', list_id: '', description: '' })
      load()
    } catch { setProjectFormError('Connection error') }
    finally { setSavingProject(false) }
  }

  async function assignProject(memberId: string, projectId: string, accessLevel: string) {
    setSavingAccess(memberId + projectId)
    await fetch(`/api/companies/${id}/members/${memberId}/projects`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, access_level: accessLevel }),
    })
    setSavingAccess(null)
    setAssigningProject(null)
    load()
  }

  async function changeRole(memberId: string, role: string) {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m))
    await fetch(`/api/companies/${id}/members`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: memberId, role }),
    })
  }

  async function removeProjectAssignment(memberId: string, projectId: string) {
    setSavingAccess(memberId + projectId)
    await fetch(`/api/companies/${id}/members/${memberId}/projects?project_id=${projectId}`, { method: 'DELETE' })
    setSavingAccess(null)
    load()
  }

  async function toggleAccessLevel(memberId: string, projectId: string, current: string) {
    const next = current === 'view' ? 'edit' : 'view'
    setSavingAccess(memberId + projectId)
    await fetch(`/api/companies/${id}/members/${memberId}/projects`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, access_level: next }),
    })
    setSavingAccess(null)
    load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
  if (!company) return null

  const isAdmin = sessionRole === 'admin'
  const canEdit = ['admin', 'consultant'].includes(sessionRole)

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#9b9991', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Link href="/dashboard/companies" style={{ color: '#9b9991', textDecoration: 'none' }}>Companies</Link>
        <span>›</span>
        <span style={{ color: '#1a1a18' }}>{company.name}</span>
      </div>

      {/* Company header */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{company.name}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b6a64' }}>
              {company.country && <span>🌍 {company.country}</span>}
              {company.contact && <span>👤 {company.contact}</span>}
              {company.email && <span>✉️ {company.email}</span>}
            </div>
          </div>
          {isAdmin && (
            <button onClick={deleteCompany}
              style={{ height: 28, padding: '0 12px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(148,48,48,0.3)', borderRadius: 6, color: '#943030', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(148,48,48,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              Delete company
            </button>
          )}
        </div>
      </div>

      {/* Module toggles — admin only */}
      {isAdmin && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '14px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>Licensed modules</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {([
              { key: 'tfbuilder', label: 'TFBuilder', sub: 'Technical file management', color: '#0C447C', bg: '#E6F1FB', border: '#85B7EB' },
              { key: 'eqms',     label: 'eQMS',      sub: 'Quality management system',  color: '#27500A', bg: '#EAF3DE', border: '#97C459' },
            ] as const).map(m => {
              const enabled = company?.modules?.[m.key] !== false
              return (
                <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderRadius: 10, border: `0.5px solid ${enabled ? m.border : 'rgba(0,0,0,0.1)'}`, background: enabled ? m.bg : '#f8f7f4', flex: 1 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: enabled ? m.color : '#8a96a2' }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: enabled ? m.color : '#9b9991', opacity: 0.8 }}>{m.sub}</div>
                  </div>
                  <div onClick={() => toggleModule(m.key, !enabled)}
                    style={{ width: 40, height: 22, borderRadius: 11, background: enabled ? m.color : '#d8d4ce', cursor: 'pointer', position: 'relative' as const, transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute' as const, top: 3, left: enabled ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: enabled ? m.color : '#9b9991', minWidth: 32 }}>{enabled ? 'On' : 'Off'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* eQMS Levels */}
      {company?.modules?.eqms !== false && (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#1a1a18' }}>eQMS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {LEVEL_META.map(m => (
            <Link key={m.level} href={`/dashboard/companies/${id}/eqms/${m.level}`}
              style={{ background: '#fff', border: `0.5px solid ${m.border}`, borderRadius: 10, padding: '14px 16px', textDecoration: 'none', display: 'block' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontSize: 11, color: m.color, fontWeight: 600, marginBottom: 2 }}>Level {m.level}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>{m.label}</div>
            </Link>
          ))}
        </div>
      </div>
      )}

      {/* TF Projects */}
      {company?.modules?.tfbuilder !== false && (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>TFBuilder Projects</div>
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href={`/dashboard/projects?company=${id}`} style={{ fontSize: 12, color: '#185FA5', textDecoration: 'none' }}>View all →</Link>
              <button onClick={() => { setProjectForm({ name: '', device_name: '', list_id: '', description: '' }); setProjectFormError(''); setShowNewProject(true) }}
                style={{ height: 28, padding: '0 12px', fontSize: 12, background: '#185FA5', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
                + New project
              </button>
            </div>
          )}
        </div>
        {projects.length === 0 ? (
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 30, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>No TF projects yet.</div>
        ) : (
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            {projects.map((p, i) => {
              const pct = p.total_docs > 0 ? Math.round((p.approved_docs / p.total_docs) * 100) : 0
              const ps = DOC_STATUS[p.status] || DOC_STATUS.draft
              return (
                <Link key={p.id} href={`/dashboard/projects/${p.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < projects.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', textDecoration: 'none', color: 'inherit', background: '#fff' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#fafaf8')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#fff')}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#9b9991', marginTop: 2 }}>{p.device_name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ width: 80 }}>
                      <div style={{ height: 4, background: '#f1efe8', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#3B6D11' : '#185FA5', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#9b9991', marginTop: 2, textAlign: 'right' }}>{pct}%</div>
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: ps.bg, color: ps.color, border: `0.5px solid ${ps.border}` }}>{ps.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* Members & Access Management */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Members & Project Access</div>
            {isAdmin && (
              <button onClick={() => setShowAddMember(v => !v)}
                style={{ height: 28, padding: '0 12px', fontSize: 11, background: '#4e8c8c', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
                + Add member
              </button>
            )}
          </div>
          {/* Column headers */}
          {members.length > 0 && isAdmin && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 120px 32px', padding: '4px 20px 8px', gap: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9b9991', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Member</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9b9991', textTransform: 'uppercase' as const, letterSpacing: '0.06em', textAlign: 'center' as const }}>Consultant</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9b9991', textTransform: 'uppercase' as const, letterSpacing: '0.06em', textAlign: 'center' as const }}>Client</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9b9991', textTransform: 'uppercase' as const, letterSpacing: '0.06em', textAlign: 'center' as const }}>MR</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9b9991', textTransform: 'uppercase' as const, letterSpacing: '0.06em', textAlign: 'center' as const }}>Projects</div>
              <div />
            </div>
          )}
        </div>

        {/* Add member search */}
        {showAddMember && isAdmin && (
          <div style={{ padding: '12px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf8', position: 'relative' }}>
            <div style={{ fontSize: 11, color: '#6b6a64', marginBottom: 6 }}>Search for a user to add to this company:</div>
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or email…" autoFocus
              style={{ width: '100%', height: 32, padding: '0 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }} />
            {searchingUsers && <div style={{ fontSize: 11, color: '#9b9991', padding: '6px 0' }}>Searching…</div>}
            {userResults.length > 0 && (
              <div style={{ position: 'absolute', top: 76, left: 20, right: 20, zIndex: 20, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                {userResults.map(u => {
                  const rs = ROLE_STYLES[u.role] || ROLE_STYLES.client
                  return (
                    <div key={u.id} onClick={() => addMember(u)}
                      style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f4')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: '#9b9991' }}>{u.email}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: rs.bg, color: rs.color, border: `0.5px solid ${rs.border}` }}>{u.role}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {userSearch && !searchingUsers && userResults.length === 0 && (
              <div style={{ fontSize: 11, color: '#9b9991', padding: '6px 0' }}>No users found.</div>
            )}
          </div>
        )}

        {/* Member list */}
        {members.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#9b9991' }}>No members yet. Add members to assign them to projects.</div>
        ) : (
          <div>
            {members.map((m, mi) => {
              const rs = ROLE_STYLES[m.role] || ROLE_STYLES.client
              const isExpanded = expandedMember === m.id
              const isClient = m.role === 'client' || m.role === 'client-MR'
              const assignedProjectIds = new Set(m.project_assignments.map(a => a.project_id))
              const unassignedProjects = projects.filter(p => !assignedProjectIds.has(p.id))

              return (
                <div key={m.id} style={{ borderBottom: mi < members.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                  {/* Member row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 120px 32px', alignItems: 'center', gap: 0, padding: '10px 20px', background: isExpanded ? '#fafaf8' : '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: rs.bg, color: rs.color, border: `0.5px solid ${rs.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        {m.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: '#9b9991', marginTop: 1 }}>{m.email}</div>
                      </div>
                    </div>
                    {/* Consultant */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input type='radio' name={`role-${m.id}`} value='consultant' checked={m.role === 'consultant'} onChange={() => changeRole(m.id, 'consultant')} style={{ accentColor: '#185FA5', cursor: 'pointer', width: 16, height: 16 }} />
                    </div>
                    {/* Client */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input type='radio' name={`role-${m.id}`} value='client' checked={m.role === 'client'} onChange={() => changeRole(m.id, 'client')} style={{ accentColor: '#185FA5', cursor: 'pointer', width: 16, height: 16 }} />
                    </div>
                    {/* MR */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input type='radio' name={`role-${m.id}`} value='client-MR' checked={m.role === 'client-MR'} onChange={() => changeRole(m.id, 'client-MR')} style={{ accentColor: '#185FA5', cursor: 'pointer', width: 16, height: 16 }} />
                    </div>
                    {/* Projects */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {(m.role === 'client' || m.role === 'client-MR') && (
                        <button onClick={() => setExpandedMember(isExpanded ? null : m.id)}
                          style={{ height: 24, padding: '0 10px', fontSize: 11, background: isExpanded ? '#185FA5' : 'transparent', border: `0.5px solid ${isExpanded ? '#185FA5' : 'rgba(0,0,0,0.2)'}`, borderRadius: 5, color: isExpanded ? '#fff' : '#5a6472', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                          {isExpanded ? 'Close' : 'Projects'}
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {isAdmin && (
                        <button onClick={() => removeMember(m.id)}
                          style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F09595' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#ccc' }}>
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded project access panel */}
                  {isExpanded && isClient && isAdmin && (
                    <div style={{ background: '#f5f3f0', borderTop: '0.5px solid rgba(0,0,0,0.06)', padding: '12px 20px 16px 64px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#5a6472', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10 }}>
                        Project access for {m.name}
                      </div>

                      {/* Assigned projects */}
                      {m.project_assignments.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#9b9991', fontStyle: 'italic', marginBottom: 10 }}>No projects assigned yet.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 12 }}>
                          {m.project_assignments.map(a => {
                            const acc = ACCESS_STYLES[a.access_level] || ACCESS_STYLES.view
                            const saving = savingAccess === m.id + a.project_id
                            return (
                              <div key={a.project_id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '8px 12px' }}>
                                <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{a.project_name}</div>
                                {/* Access level toggle */}
                                <button
                                  onClick={() => toggleAccessLevel(m.id, a.project_id, a.access_level)}
                                  disabled={!!saving}
                                  title="Click to toggle view/edit"
                                  style={{ height: 22, padding: '0 10px', fontSize: 11, background: acc.bg, border: `0.5px solid ${acc.border}`, borderRadius: 4, color: acc.color, cursor: 'pointer', fontWeight: 500, opacity: saving ? 0.6 : 1 }}>
                                  {saving ? '…' : acc.label}
                                </button>
                                <button onClick={() => removeProjectAssignment(m.id, a.project_id)} disabled={!!saving}
                                  style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F09595' }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#ccc' }}>
                                  ×
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Assign to new project */}
                      {unassignedProjects.length > 0 && (
                        <div>
                          {assigningProject === m.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                              <div style={{ fontSize: 11, color: '#6b6a64', marginBottom: 2 }}>Select a project to assign:</div>
                              {unassignedProjects.map(p => (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '8px 12px' }}>
                                  <div style={{ flex: 1, fontSize: 12 }}>{p.name}</div>
                                  <button onClick={() => assignProject(m.id, p.id, 'view')}
                                    style={{ height: 24, padding: '0 10px', fontSize: 11, background: ACCESS_STYLES.view.bg, border: `0.5px solid ${ACCESS_STYLES.view.border}`, borderRadius: 5, color: ACCESS_STYLES.view.color, cursor: 'pointer' }}>
                                    + View
                                  </button>
                                  <button onClick={() => assignProject(m.id, p.id, 'edit')}
                                    style={{ height: 24, padding: '0 10px', fontSize: 11, background: ACCESS_STYLES.edit.bg, border: `0.5px solid ${ACCESS_STYLES.edit.border}`, borderRadius: 5, color: ACCESS_STYLES.edit.color, cursor: 'pointer' }}>
                                    + Edit
                                  </button>
                                </div>
                              ))}
                              <button onClick={() => setAssigningProject(null)}
                                style={{ height: 24, padding: '0 10px', fontSize: 11, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 5, color: '#9b9991', cursor: 'pointer', alignSelf: 'flex-start' as const, marginTop: 2 }}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setAssigningProject(m.id)}
                              style={{ height: 26, padding: '0 12px', fontSize: 11, background: 'transparent', border: '0.5px solid rgba(24,95,165,0.4)', borderRadius: 6, color: '#185FA5', cursor: 'pointer' }}>
                              + Assign to project
                            </button>
                          )}
                        </div>
                      )}
                      {unassignedProjects.length === 0 && m.project_assignments.length > 0 && (
                        <div style={{ fontSize: 11, color: '#9b9991', fontStyle: 'italic' }}>All company projects are assigned.</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {/* Company Variables */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '12px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Company Variables</div>
          {canEdit && (
            <button onClick={() => { setShowAddVar(v => !v); setNewVarTag(''); setNewVarName(''); setNewVarValue('') }}
              style={{ height: 26, padding: '0 10px', fontSize: 11, background: '#185FA5', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
              + Add variable
            </button>
          )}
        </div>
        <div style={{ padding: '16px 20px' }}>
          {/* Global variables */}
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9b9991', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Global</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 20 }}>
            {companyVars.filter(v => v.is_global).map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#f8f7f4', border: '0.5px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#185FA5', background: '#E6F1FB', padding: '2px 8px', borderRadius: 4, border: '0.5px solid #85B7EB', flexShrink: 0, minWidth: 140 }}>{v.tag}</span>
                <span style={{ fontSize: 11, color: '#6b6a64', flexShrink: 0, width: 140 }}>{v.name}</span>
                {editingVarId === v.id ? (
                  <input value={editingVarValue} onChange={e => setEditingVarValue(e.target.value)} autoFocus
                    onBlur={() => patchVar(v.id, editingVarValue)}
                    onKeyDown={e => { if (e.key === 'Enter') patchVar(v.id, editingVarValue); if (e.key === 'Escape') setEditingVarId(null) }}
                    style={{ flex: 1, padding: '4px 8px', fontSize: 12, border: '1px solid #185FA5', borderRadius: 6, outline: 'none' }} />
                ) : (
                  <div onClick={() => canEdit ? (setEditingVarId(v.id), setEditingVarValue(v.value)) : null}
                    style={{ flex: 1, fontSize: 12, color: v.value ? '#1a1a18' : '#ccc', fontStyle: v.value ? 'normal' : 'italic', cursor: canEdit ? 'text' : 'default', padding: '4px 0' }}>
                    {v.value || (canEdit ? 'Click to set value…' : '—')}
                  </div>
                )}
                {savingVar[v.id] && <span style={{ fontSize: 10, color: '#c8a96e', flexShrink: 0 }}>Saving…</span>}
              </div>
            ))}
          </div>

          {/* Custom variables */}
          {companyVars.filter(v => !v.is_global).length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9b9991', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Custom</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 16 }}>
                {companyVars.filter(v => !v.is_global).map(v => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#f8f7f4', border: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#2e5f5f', background: 'rgba(78,140,140,0.1)', padding: '2px 8px', borderRadius: 4, border: '0.5px solid rgba(78,140,140,0.3)', flexShrink: 0, minWidth: 140 }}>{v.tag}</span>
                    <span style={{ fontSize: 11, color: '#6b6a64', flexShrink: 0, width: 140 }}>{v.name}</span>
                    {editingVarId === v.id ? (
                      <input value={editingVarValue} onChange={e => setEditingVarValue(e.target.value)} autoFocus
                        onBlur={() => patchVar(v.id, editingVarValue)}
                        onKeyDown={e => { if (e.key === 'Enter') patchVar(v.id, editingVarValue); if (e.key === 'Escape') setEditingVarId(null) }}
                        style={{ flex: 1, padding: '4px 8px', fontSize: 12, border: '1px solid #185FA5', borderRadius: 6, outline: 'none' }} />
                    ) : (
                      <div onClick={() => canEdit ? (setEditingVarId(v.id), setEditingVarValue(v.value)) : null}
                        style={{ flex: 1, fontSize: 12, color: v.value ? '#1a1a18' : '#ccc', fontStyle: v.value ? 'normal' : 'italic', cursor: canEdit ? 'text' : 'default', padding: '4px 0' }}>
                        {v.value || (canEdit ? 'Click to set value…' : '—')}
                      </div>
                    )}
                    {savingVar[v.id] && <span style={{ fontSize: 10, color: '#c8a96e', flexShrink: 0 }}>Saving…</span>}
                    {canEdit && (
                      <button onClick={() => deleteVar(v.id)} style={{ background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>×</button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Add variable form */}
          {showAddVar && canEdit && (
            <div style={{ padding: '14px', background: '#f0f7ff', borderRadius: 8, border: '0.5px solid #85B7EB', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#0C447C' }}>New company variable</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#6b6a64', marginBottom: 3 }}>Tag (starts with $)</label>
                  <input value={newVarTag} onChange={e => setNewVarTag(e.target.value)} placeholder="$my_variable" autoFocus
                    style={{ width: '100%', padding: '6px 8px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#6b6a64', marginBottom: 3 }}>Display name</label>
                  <input value={newVarName} onChange={e => setNewVarName(e.target.value)} placeholder="My Variable"
                    style={{ width: '100%', padding: '6px 8px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#6b6a64', marginBottom: 3 }}>Value</label>
                  <input value={newVarValue} onChange={e => setNewVarValue(e.target.value)} placeholder="Optional"
                    style={{ width: '100%', padding: '6px 8px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 6, outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addVar} disabled={addingVar || !newVarTag.trim() || !newVarName.trim()}
                  style={{ height: 28, padding: '0 14px', fontSize: 12, background: '#185FA5', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', opacity: !newVarTag.trim() || !newVarName.trim() ? 0.5 : 1 }}>
                  {addingVar ? 'Adding…' : 'Add'}
                </button>
                <button onClick={() => setShowAddVar(false)}
                  style={{ height: 28, padding: '0 10px', fontSize: 12, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, cursor: 'pointer', color: '#6b6a64' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New project modal */}
      {showNewProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
          onClick={() => setShowNewProject(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, border: '0.5px solid rgba(0,0,0,0.12)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>New project</div>
                <div style={{ fontSize: 11, color: '#9b9991', marginTop: 2 }}>Company: {company.name}</div>
              </div>
              <button onClick={() => setShowNewProject(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b6a64' }}>×</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
              {projectFormError && (
                <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#A32D2D' }}>{projectFormError}</div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b6a64', marginBottom: 4 }}>Device name *</label>
                <input value={projectForm.device_name} onChange={e => setProjectForm(f => ({ ...f, device_name: e.target.value }))} placeholder="e.g. CardioMonitor Pro" autoFocus
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b6a64', marginBottom: 4 }}>Project name *</label>
                <input value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. CardioMonitor MDR TF"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b6a64', marginBottom: 4 }}>Document list *</label>
                <select value={projectForm.list_id} onChange={e => setProjectForm(f => ({ ...f, list_id: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', background: '#fff', boxSizing: 'border-box' as const }}>
                  <option value="">Select a list…</option>
                  {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.doc_count} docs)</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b6a64', marginBottom: 4 }}>Description</label>
                <input value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief scope or notes"
                  style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div style={{ padding: '10px 12px', background: '#f8f7f4', borderRadius: 8, fontSize: 12, color: '#6b6a64' }}>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>Manufacturer (from company)</div>
                <div>{company.name}{company.country ? ` · ${company.country}` : ''}{company.contact ? ` · ${company.contact}` : ''}</div>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNewProject(false)} style={{ height: 32, padding: '0 14px', fontSize: 13, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, cursor: 'pointer', color: '#5a6472' }}>Cancel</button>
              <button onClick={createProject} disabled={savingProject}
                style={{ height: 32, padding: '0 14px', fontSize: 13, background: savingProject ? '#B5D4F4' : '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: savingProject ? 'not-allowed' : 'pointer' }}>
                {savingProject ? 'Creating…' : 'Create project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
