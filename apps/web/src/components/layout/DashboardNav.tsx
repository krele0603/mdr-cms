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
}

const allNavItems = [
  {
    label: 'Projects', href: '/dashboard/projects', roles: ['admin', 'consultant'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    label: 'Template library', href: '/dashboard/templates', roles: ['admin'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    label: 'TF Structures', href: '/dashboard/lists', roles: ['admin'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  },
  {
    label: 'Users', href: '/dashboard/users', roles: ['admin'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    label: 'My Projects', href: '/dashboard/client', roles: ['client'],
    icon: <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  },
]

interface Notification {
  id: string; type: string; message: string; read: boolean; created_at: string
  project_id: string | null; document_id: string | null
  project_name: string | null; document_name: string | null
}

export default function DashboardNav({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.client
  const navItems = allNavItems.filter(i => i.roles.includes(user.role))
  const initials = user.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const notifsRef = useRef<HTMLDivElement>(null)

  // Poll notifications every 30s
  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch {}
  }

  async function markAllRead() {
    await fetch('/api/notifications/read', { method: 'POST' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function handleNotifClick(n: Notification) {
    setShowNotifs(false)
    if (n.project_id && n.document_id) {
      router.push(`/dashboard/projects/${n.project_id}/documents/${n.document_id}`)
    } else if (n.project_id) {
      router.push(`/dashboard/projects/${n.project_id}`)
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <aside style={{ width: 220, background: '#1a1f24', borderRight: 'none', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#4e8c8c', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>TFbuilder</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2, letterSpacing: '0.03em' }}>EasyMed Consulting</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: active ? 500 : 400, color: active ? '#4e8c8c' : 'rgba(255,255,255,0.55)', background: active ? 'rgba(78,140,140,0.15)' : 'transparent', textDecoration: 'none', marginBottom: 2 }}>
              {item.icon}{item.label}
            </Link>
          )
        })}
      </nav>

      {/* Notifications bell */}
      <div ref={notifsRef} style={{ padding: '10px 14px', borderTop: '0.5px solid rgba(255,255,255,0.08)', position: 'relative' }}>
        <button
          onClick={() => { setShowNotifs(v => !v); if (!showNotifs && unreadCount > 0) markAllRead() }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: showNotifs ? 'rgba(78,140,140,0.15)' : 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 13, position: 'relative' }}
          onMouseEnter={e => { if (!showNotifs) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={e => { if (!showNotifs) e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <div style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#c8a96e', color: '#1a1f24', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </div>
          <span>Notifications</span>
        </button>

        {/* Notification dropdown */}
        {showNotifs && (
          <div style={{ position: 'absolute', bottom: '100%', left: 14, right: 14, marginBottom: 4, background: '#fff', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.2)', overflow: 'hidden', zIndex: 100, maxHeight: 360, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0ddd8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1f24' }}>Notifications</span>
              {notifications.some(n => !n.read) && (
                <button onClick={markAllRead} style={{ fontSize: 11, color: '#4e8c8c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Mark all read</button>
              )}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: '#8a96a2' }}>No notifications yet</div>
              ) : notifications.map(n => (
                <button key={n.id} onClick={() => handleNotifClick(n)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: n.read ? 'transparent' : 'rgba(78,140,140,0.06)', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(78,140,140,0.06)' }}
                >
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
            <div style={{ fontSize: 10, display: 'inline-block', marginTop: 1, background: roleStyle.bg, color: roleStyle.color, border: `0.5px solid ${roleStyle.border}`, padding: '0px 5px', borderRadius: 3 }}>{ROLE_LABELS[user.role]}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ width: '100%', height: 28, fontSize: 12, background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >
          <svg style={{width:12,height:12,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}
