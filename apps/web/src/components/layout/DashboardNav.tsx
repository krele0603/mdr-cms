'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { SessionUser, ROLE_LABELS } from '@/lib/auth-types'

interface Props { user: SessionUser }

const ROLE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  admin:      { bg: 'rgba(78,140,140,0.15)',   color: '#2e5f5f', border: 'rgba(78,140,140,0.4)' },
  consultant: { bg: 'rgba(200,169,110,0.15)',  color: '#7a5a10', border: 'rgba(200,169,110,0.5)' },
  client:     { bg: 'rgba(90,100,114,0.1)',    color: '#5a6472', border: 'rgba(90,100,114,0.3)' },
  'client-MR':{ bg: 'rgba(120,80,160,0.15)',  color: '#5a2d82', border: 'rgba(120,80,160,0.4)' },
}

const tfbuilderItems = [
  { label: 'Projects', href: '/dashboard/projects', roles: ['admin', 'consultant'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
  { label: 'Template library', href: '/dashboard/templates', roles: ['admin'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { label: 'TF Structures', href: '/dashboard/lists', roles: ['admin'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  { label: 'QMS Templates', href: '/dashboard/qms-templates', roles: ['admin', 'consultant'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="12" y1="9" x2="8" y2="9"/></svg> },
  { label: 'Audit Trail', href: '/dashboard/audit', roles: ['admin'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
  { label: 'Users', href: '/dashboard/users', roles: ['admin'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
]

// Companies link for admin/consultant
const companiesItem = {
  label: 'Companies', href: '/dashboard/companies', roles: ['admin', 'consultant'],
  icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}

// eQMS level links for client/client-MR only
const eqmsItems = [
  { label: 'Policies',          href: '/dashboard/eqms/1', roles: ['client', 'client-MR'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  { label: 'Procedures',        href: '/dashboard/eqms/2', roles: ['client', 'client-MR'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { label: 'Work Instructions', href: '/dashboard/eqms/3', roles: ['client', 'client-MR'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  { label: 'Forms & Templates', href: '/dashboard/eqms/4', roles: ['client', 'client-MR'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
  { label: 'Records',           href: '/dashboard/eqms/5', roles: ['client', 'client-MR'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M9 12l2 2 4-4"/></svg> },
]

interface Notification { id: string; type: string; message: string; read: boolean; created_at: string; project_id: string | null; document_id: string | null }
interface Conversation { project_id: string; other_id: string; other_name: string; other_role: string; project_name: string; last_content: string; last_at: string; unread_count: number }
interface Message { id: string; content: string; read: boolean; created_at: string; sender_id: string; sender_name: string; sender_role: string }

export default function DashboardNav({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.client
  const visibleTFItems = tfbuilderItems.filter(i => i.roles.includes(user.role))
  const visibleEQMSItems = eqmsItems.filter(i => i.roles.includes(user.role))
  const showCompanies = ['admin', 'consultant', 'client', 'client-MR'].includes(user.role)
  const initials = user.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const notifsRef = useRef<HTMLDivElement>(null)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [showMessages, setShowMessages] = useState(false)
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [thread, setThread] = useState<Message[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewConv, setShowNewConv] = useState(false)
  const [projectMembers, setProjectMembers] = useState<any[]>([])
  const [availableProjects, setAvailableProjects] = useState<any[]>([])
  const [newConvProject, setNewConvProject] = useState('')
  const [newConvRecipient, setNewConvRecipient] = useState('')
  const threadEndRef = useRef<HTMLDivElement>(null)

  // Client nav state
  const isClientRole = user.role === 'client' || user.role === 'client-MR'
  const [clientCompanies, setClientCompanies] = useState<any[]>([])
  const [clientProjects, setClientProjects] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')

  useEffect(() => {
    loadNotifications()
    loadConversations()
    if (user.role === 'client' || user.role === 'client-MR' || user.role === 'consultant') {
      Promise.all([
        fetch('/api/companies').then(r => r.ok ? r.json() : []),
        fetch('/api/projects').then(r => r.ok ? r.json() : { projects: [] }),
      ]).then(([comps, projs]) => {
        const companies = Array.isArray(comps) ? comps : []
        setClientCompanies(companies)
        setClientProjects(projs.projects || [])
        if (companies.length > 0) {
          const saved = localStorage.getItem('selectedCompanyId')
          const validSaved = saved && companies.some((c) => c.id === saved)
          const id = validSaved ? saved : companies[0].id
          setSelectedCompanyId(id)
          if (!validSaved) localStorage.setItem('selectedCompanyId', id)
        }
      })
    }
    const interval = setInterval(() => { loadNotifications(); loadConversations() }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (threadEndRef.current) threadEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) { const d = await res.json(); setNotifications(d.notifications); setUnreadNotifs(d.unreadCount) }
    } catch {}
  }

  async function loadConversations() {
    try {
      const res = await fetch('/api/messages')
      if (res.ok) { const d = await res.json(); setConversations(d.conversations || []); setUnreadMessages(d.unreadTotal || 0) }
    } catch {}
  }

  async function markNotifsRead() {
    await fetch('/api/notifications/read', { method: 'POST' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadNotifs(0)
  }

  async function openConversation(conv: Conversation) {
    setActiveConv(conv)
    setShowNewConv(false)
    setThreadLoading(true)
    try {
      const res = await fetch(`/api/messages/read?project_id=${conv.project_id}&other_id=${conv.other_id}`)
      if (res.ok) {
        const msgs = await res.json()
        setThread(msgs)
        setUnreadMessages(prev => Math.max(0, prev - Number(conv.unread_count || 0)))
        setConversations(prev => prev.map(c =>
          c.project_id === conv.project_id && c.other_id === conv.other_id
            ? { ...c, unread_count: 0 } : c
        ))
      }
    } finally { setThreadLoading(false) }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !activeConv) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: activeConv.project_id, recipient_id: activeConv.other_id, content: newMessage }),
      })
      if (res.ok) {
        const msg = await res.json()
        setThread(prev => [...prev, { ...msg, sender_name: user.name, sender_role: user.role }])
        setNewMessage('')
        loadConversations()
      }
    } finally { setSending(false) }
  }

  async function startNewConversation() {
    if (!newConvProject || !newConvRecipient || !newMessage.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: newConvProject, recipient_id: newConvRecipient, content: newMessage }),
      })
      if (res.ok) {
        setNewMessage(''); setShowNewConv(false)
        await loadConversations()
        const member = projectMembers.find(m => m.user_id === newConvRecipient)
        const proj = availableProjects.find(p => p.id === newConvProject)
        if (member && proj) {
          const conv: Conversation = { project_id: newConvProject, other_id: newConvRecipient, other_name: member.name, other_role: member.user_role, project_name: proj.name, last_content: newMessage, last_at: new Date().toISOString(), unread_count: 0 }
          openConversation(conv)
        }
      }
    } finally { setSending(false) }
  }

  async function loadProjectsAndMembers(projectId?: string) {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        const projects = data.projects || data
        setAvailableProjects(projects)
        if (projectId || (projects.length > 0 && !newConvProject)) {
          const pid = projectId || projects[0].id
          setNewConvProject(pid)
          const mRes = await fetch(`/api/projects/${pid}/members`)
          if (mRes.ok) {
            const members = await mRes.json()
            setProjectMembers(members.filter((m: any) => m.user_id !== user.id))
          }
        }
      }
    } catch {}
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function NavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    const active = pathname.startsWith(href)
    return (
      <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: active ? 500 : 400, color: active ? '#4e8c8c' : 'rgba(255,255,255,0.55)', background: active ? 'rgba(78,140,140,0.15)' : 'transparent', textDecoration: 'none', marginBottom: 2 }}>
        {icon}{label}
      </Link>
    )
  }

  return (
    <>
      {/* Messages slide-in panel */}
      {showMessages && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 400 }} onClick={() => setShowMessages(false)} />
          <div style={{ position: 'fixed', left: 220, top: 0, bottom: 0, width: 580, background: '#fff', zIndex: 401, display: 'flex', boxShadow: '4px 0 24px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 220, borderRight: '1px solid #e0ddd8', display: 'flex', flexDirection: 'column', background: '#faf9f7' }}>
              <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #e0ddd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f5f2ee' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1f24' }}>Messages</span>
                <button onClick={() => { setShowNewConv(true); setActiveConv(null); loadProjectsAndMembers() }}
                  style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#4e8c8c', color: '#fff', cursor: 'pointer', fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {conversations.length === 0 ? (
                  <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: '#8a96a2', lineHeight: 1.6 }}>No messages yet.<br />Click + to start a conversation.</div>
                ) : conversations.map((c, i) => {
                  const isActive = activeConv?.project_id === c.project_id && activeConv?.other_id === c.other_id
                  return (
                    <button key={i} onClick={() => openConversation(c)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: isActive ? 'rgba(78,140,140,0.08)' : 'transparent', cursor: 'pointer', borderLeft: isActive ? '3px solid #4e8c8c' : '3px solid transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1f24' }}>{c.other_name}</span>
                        <span style={{ fontSize: 10, color: '#8a96a2' }}>{timeAgo(c.last_at)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#4e8c8c', marginBottom: 3, fontWeight: 500 }}>{c.project_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 11, color: '#8a96a2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{c.last_content}</div>
                        {Number(c.unread_count) > 0 && (
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#4e8c8c', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.unread_count}</div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {showNewConv ? (
                <>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #e0ddd8', background: '#f5f2ee', fontSize: 13, fontWeight: 600, color: '#1a1f24' }}>New conversation</div>
                  <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, fontWeight: 500, color: '#5a6472', marginBottom: 4, display: 'block' }}>Project</label>
                      <select value={newConvProject} onChange={async e => {
                        setNewConvProject(e.target.value); setNewConvRecipient('')
                        const mRes = await fetch(`/api/projects/${e.target.value}/members`)
                        if (mRes.ok) { const m = await mRes.json(); setProjectMembers(m.filter((m: any) => m.user_id !== user.id)) }
                      }} style={{ width: '100%', height: 34, padding: '0 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', background: '#fff' }}>
                        <option value="">Select project…</option>
                        {availableProjects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, fontWeight: 500, color: '#5a6472', marginBottom: 4, display: 'block' }}>Recipient</label>
                      <select value={newConvRecipient} onChange={e => setNewConvRecipient(e.target.value)} style={{ width: '100%', height: 34, padding: '0 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', background: '#fff' }}>
                        <option value="">Select person…</option>
                        {projectMembers.map((m: any) => <option key={m.user_id} value={m.user_id}>{m.name} ({m.user_role})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: '#5a6472', marginBottom: 4, display: 'block' }}>Message</label>
                      <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Write your message…" rows={4}
                        style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                    </div>
                    <button onClick={startNewConversation} disabled={!newConvProject || !newConvRecipient || !newMessage.trim() || sending}
                      style={{ marginTop: 10, width: '100%', height: 34, fontSize: 12, background: '#4e8c8c', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', opacity: !newConvProject || !newConvRecipient || !newMessage.trim() ? 0.5 : 1, fontWeight: 500 }}>
                      {sending ? 'Sending…' : 'Send message'}
                    </button>
                  </div>
                </>
              ) : activeConv ? (
                <>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e0ddd8', background: '#f5f2ee' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f24' }}>{activeConv.other_name}</div>
                    <div style={{ fontSize: 11, color: '#4e8c8c', marginTop: 1 }}>{activeConv.project_name}</div>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    {threadLoading ? (
                      <div style={{ textAlign: 'center', color: '#8a96a2', fontSize: 12, padding: 20 }}>Loading…</div>
                    ) : thread.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#8a96a2', fontSize: 12, padding: 20 }}>No messages yet. Say hello!</div>
                    ) : (
                      <>
                        {thread.map(msg => {
                          const isMe = msg.sender_id === user.id
                          return (
                            <div key={msg.id} style={{ marginBottom: 12, display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
                              {!isMe && (
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(78,140,140,0.15)', color: '#2e5f5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                  {msg.sender_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                              )}
                              <div style={{ maxWidth: '72%' }}>
                                <div style={{ fontSize: 11, color: '#8a96a2', marginBottom: 3, textAlign: isMe ? 'right' : 'left' }}>
                                  {!isMe && <span style={{ fontWeight: 500, color: '#5a6472' }}>{msg.sender_name} · </span>}
                                  {new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div style={{ padding: '8px 12px', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: isMe ? '#4e8c8c' : '#f5f2ee', color: isMe ? '#fff' : '#1a1f24', fontSize: 12, lineHeight: 1.6, wordBreak: 'break-word' as const }}>
                                  {msg.content}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={threadEndRef} />
                      </>
                    )}
                  </div>
                  <div style={{ padding: '10px 16px', borderTop: '1px solid #e0ddd8', background: '#fff', display: 'flex', gap: 8 }}>
                    <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                      placeholder="Write a message… (Enter to send)" rows={2}
                      style={{ flex: 1, padding: '8px 10px', fontSize: 12, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 6, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                    <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                      style={{ width: 36, alignSelf: 'flex-end', height: 36, background: '#4e8c8c', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', opacity: !newMessage.trim() ? 0.5 : 1, fontSize: 16 }}>↑</button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10, color: '#8a96a2' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <div style={{ fontSize: 13 }}>Select a conversation or start a new one</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <aside style={{ width: 220, background: '#1a1f24', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4e8c8c', letterSpacing: '0.05em' }}>EasyQMS</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <Link href='/dashboard' title='Home'
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: pathname === '/dashboard' ? 'rgba(78,140,140,0.2)' : 'rgba(255,255,255,0.05)', color: pathname === '/dashboard' ? '#4e8c8c' : 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(78,140,140,0.2)'; (e.currentTarget as HTMLElement).style.color = '#4e8c8c' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = pathname === '/dashboard' ? 'rgba(78,140,140,0.2)' : 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = pathname === '/dashboard' ? '#4e8c8c' : 'rgba(255,255,255,0.4)' }}>
              <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' strokeLinecap='round' strokeLinejoin='round'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/></svg>
            </Link>
            <Link href='/dashboard/help' title='Help'
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: pathname === '/dashboard/help' ? 'rgba(78,140,140,0.2)' : 'rgba(255,255,255,0.05)', color: pathname === '/dashboard/help' ? '#4e8c8c' : 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(78,140,140,0.2)'; (e.currentTarget as HTMLElement).style.color = '#4e8c8c' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = pathname === '/dashboard/help' ? 'rgba(78,140,140,0.2)' : 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = pathname === '/dashboard/help' ? '#4e8c8c' : 'rgba(255,255,255,0.4)' }}>
              <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>
            </Link>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' as const }}>

          {isClientRole ? (
            <>
              {clientCompanies.length >= 1 && (
                <div style={{ padding: '4px 8px 8px', position: 'relative' as const }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '4px 4px 6px' }}>Company</div>
                  {clientCompanies.length === 1 ? (
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', padding: '2px 4px' }}>{clientCompanies[0].name}</div>
                  ) : (
                    <div style={{ position: 'relative' as const }}>
                      <div onClick={() => { const el = document.getElementById('company-dd'); if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none' }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.8)', userSelect: 'none' as const }}>
                        <span>{clientCompanies.find(c => c.id === selectedCompanyId)?.name || 'Select…'}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                      <div id="company-dd" style={{ display: 'none', position: 'absolute' as const, top: '100%', left: 0, right: 0, marginTop: 2, background: '#2c3138', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, overflow: 'hidden', zIndex: 200 }}>
                        {clientCompanies.map(c => (
                          <div key={c.id} onClick={() => { setSelectedCompanyId(c.id); localStorage.setItem('selectedCompanyId', c.id); const el = document.getElementById('company-dd'); if (el) el.style.display = 'none' }}
                            style={{ padding: '8px 10px', fontSize: 12, cursor: 'pointer', color: c.id === selectedCompanyId ? '#4e8c8c' : 'rgba(255,255,255,0.65)', background: c.id === selectedCompanyId ? 'rgba(78,140,140,0.15)' : 'transparent', fontWeight: c.id === selectedCompanyId ? 500 : 400 }}
                            onMouseEnter={e => { if (c.id !== selectedCompanyId) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                            onMouseLeave={e => { if (c.id !== selectedCompanyId) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                            {c.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {selectedCompanyId && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '4px 12px 6px' }}>eQMS</div>
                  {[{label:'Policies',level:1},{label:'Procedures',level:2},{label:'Work Instructions',level:3},{label:'Forms & Templates',level:4}].map(({label,level}) => {
                    const href = `/dashboard/companies/${selectedCompanyId}/eqms/${level}`
                    const active = pathname.startsWith(href)
                    return (
                      <a key={level} href={href} style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 12px', borderRadius:8, fontSize:13, fontWeight:active?500:400, color:active?'#4e8c8c':'rgba(255,255,255,0.55)', background:active?'rgba(78,140,140,0.15)':'transparent', textDecoration:'none', marginBottom:2 }}>
                        <span style={{fontSize:11,opacity:0.5}}>L{level}</span>{label}
                      </a>
                    )
                  })}
                  {/* QMS Implementation placeholder */}
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '10px 12px 6px' }}>QMS Implementation</div>
                  <div style={{ padding: '4px 12px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' style={{opacity:0.3}}><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Coming soon</span>
                  </div>
                  {(() => {
                    const companyName = clientCompanies.find(c => c.id === selectedCompanyId)?.name
                    const compProjects = clientProjects.filter((p:any) => p.company_name === companyName)
                    if (!compProjects.length) return null
                    return (
                      <>
                        <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.25)', letterSpacing:'0.08em', textTransform:'uppercase' as const, padding:'10px 12px 6px' }}>Technical Files</div>
                        {compProjects.map((p:any) => {
                          const href = `/dashboard/projects/${p.id}`
                          const active = pathname.startsWith(href)
                          return (
                            <a key={p.id} href={href} style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 12px', borderRadius:8, fontSize:13, fontWeight:active?500:400, color:active?'#4e8c8c':'rgba(255,255,255,0.55)', background:active?'rgba(78,140,140,0.15)':'transparent', textDecoration:'none', marginBottom:2, overflow:'hidden' }}>
                              <svg style={{width:14,height:14,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,flexShrink:0}} viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.name}</span>
                            </a>
                          )
                        })}
                      </>
                    )
                  })()}
                </>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '4px 12px 6px' }}>eQMS</div>
              {showCompanies && <NavItem {...companiesItem} />}
              {visibleTFItems.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '12px 12px 6px' }}>TFBuilder</div>
                  {visibleTFItems.map(item => <NavItem key={item.href} {...item} />)}
                </>
              )}
            </>
          )}
        </nav>

        {/* Messages button */}
        <div style={{ padding: '0 8px 2px' }}>
          <button onClick={() => { setShowMessages(v => !v); if (!showMessages) { setActiveConv(null); setShowNewConv(false) } }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, background: showMessages ? 'rgba(78,140,140,0.15)' : 'transparent', border: 'none', cursor: 'pointer', color: showMessages ? '#4e8c8c' : 'rgba(255,255,255,0.55)', fontSize: 13, position: 'relative' as const }}
            onMouseEnter={e => { if (!showMessages) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if (!showMessages) e.currentTarget.style.background = 'transparent' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {unreadMessages > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#4e8c8c', color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </div>
              )}
            </div>
            <span>Messages</span>
          </button>
        </div>

        {/* Notifications */}
        <div ref={notifsRef} style={{ padding: '2px 8px 10px', position: 'relative' as const }}>
          <button onClick={() => { setShowNotifs(v => !v); if (!showNotifs && unreadNotifs > 0) markNotifsRead() }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, background: showNotifs ? 'rgba(78,140,140,0.15)' : 'transparent', border: 'none', cursor: 'pointer', color: showNotifs ? '#4e8c8c' : 'rgba(255,255,255,0.55)', fontSize: 13 }}
            onMouseEnter={e => { if (!showNotifs) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if (!showNotifs) e.currentTarget.style.background = 'transparent' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadNotifs > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#c8a96e', color: '#1a1f24', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </div>
              )}
            </div>
            <span>Notifications</span>
          </button>

          {showNotifs && (
            <div style={{ position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 4, background: '#fff', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.2)', overflow: 'hidden', zIndex: 100, maxHeight: 360, display: 'flex', flexDirection: 'column' as const }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0ddd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1f24' }}>Notifications</span>
                {notifications.some(n => !n.read) && <button onClick={markNotifsRead} style={{ fontSize: 11, color: '#4e8c8c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Mark all read</button>}
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: '#8a96a2' }}>No notifications yet</div>
                ) : notifications.map(n => (
                  <button key={n.id} onClick={() => { setShowNotifs(false); if (n.project_id && n.document_id) router.push(`/dashboard/projects/${n.project_id}/documents/${n.document_id}`) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: n.read ? 'transparent' : 'rgba(78,140,140,0.06)', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(78,140,140,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4e8c8c', marginTop: 4, flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#1a1f24', lineHeight: 1.5, marginBottom: 3 }}>{n.message}</div>
                        <div style={{ fontSize: 10, color: '#8a96a2' }}>{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User + logout */}
        <div style={{ padding: '12px 14px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: roleStyle.bg, color: roleStyle.color, border: `0.5px solid ${roleStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: 10, display: 'inline-block', marginTop: 1, background: roleStyle.bg, color: roleStyle.color, border: `0.5px solid ${roleStyle.border}`, padding: '0px 5px', borderRadius: 3 }}>{ROLE_LABELS[user.role] || user.role}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ width: '100%', height: 28, fontSize: 12, background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}>
            <svg style={{width:12,height:12,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
