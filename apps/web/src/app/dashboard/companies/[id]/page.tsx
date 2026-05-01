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
  admin:      { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC' },
  consultant: { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB' },
  client:     { bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
  'client-MR':{ bg: '#FEF0E0', color: '#7A3B00', border: '#F5B97A' },
}

interface Member { id: string; name: string; email: string; role: string; added_at: string }
interface Project { id: string; name: string; device_name: string; status: string; updated_at: string; list_name: string; total_docs: number; approved_docs: number }
interface User { id: string; name: string; email: string; role: string }

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

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => setSessionRole(d?.user?.role || ''))
    load()
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

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/companies/${id}`)
    if (!res.ok) { router.push('/dashboard/companies'); return }
    const data = await res.json()
    setCompany(data.company)
    setMembers(data.members)
    setProjects(data.projects)
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
    if (!confirm('Remove this member from the company?')) return
    await fetch(`/api/companies/${id}/members?user_id=${userId}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>Loading…</div>
  if (!company) return null

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
        </div>
      </div>

      {/* eQMS Levels */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#1a1a18' }}>eQMS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {LEVEL_META.map(m => (
            <Link key={m.level} href={`/dashboard/companies/${id}/eqms/${m.level}`}
              style={{ background: '#fff', border: `0.5px solid ${m.border}`, borderRadius: 10, padding: '14px 16px', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontSize: 11, color: m.color, fontWeight: 600, marginBottom: 2 }}>Level {m.level}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a18' }}>{m.label}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* TF Projects */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>TFBuilder Projects</div>
          {sessionRole === 'admin' && (
            <Link href={`/dashboard/projects?company=${id}`}
              style={{ fontSize: 12, color: '#185FA5', textDecoration: 'none' }}>View all →</Link>
          )}
        </div>
        {projects.length === 0 ? (
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 30, textAlign: 'center', color: '#9b9991', fontSize: 13 }}>
            No TF projects yet.
          </div>
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

      {/* Members */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Members</div>
          {sessionRole === 'admin' && (
            <button onClick={() => setShowAddMember(v => !v)} style={{ height: 26, padding: '0 10px', fontSize: 11, background: '#4e8c8c', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>+ Add member</button>
          )}
        </div>
        {showAddMember && (
          <div style={{ marginBottom: 12, position: 'relative' }}>
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search consultants or clients…" autoFocus
              style={{ width: '100%', height: 32, padding: '0 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const }} />
            {searchingUsers && <div style={{ fontSize: 11, color: '#9b9991', padding: '6px 0' }}>Searching…</div>}
            {userResults.length > 0 && (
              <div style={{ position: 'absolute', top: 36, left: 0, right: 0, zIndex: 20, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
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
            {userSearch && !searchingUsers && userResults.length === 0 && <div style={{ fontSize: 11, color: '#9b9991', padding: '6px 0' }}>No users found.</div>}
          </div>
        )}
        {members.length === 0 ? (
          <div style={{ fontSize: 12, color: '#9b9991' }}>No members yet.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
            {members.map(m => {
              const rs = ROLE_STYLES[m.role] || ROLE_STYLES.client
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', borderRadius: 20, background: '#f8f7f4', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: rs.bg, color: rs.color, border: `0.5px solid ${rs.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600 }}>
                    {m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500 }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: '#9b9991' }}>{m.role}</div>
                  </div>
                  {sessionRole === 'admin' && (
                    <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', color: '#9b9991', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px', marginLeft: 2 }}>×</button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
