'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { SessionUser, ROLE_LABELS, ROLE_COLORS } from '@/lib/auth-types'

interface Props {
  user: SessionUser
}

const allNavItems = [
  {
    label: 'Projects',
    href: '/dashboard/projects',
    roles: ['admin', 'consultant'],
    icon: (
      <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    label: 'Template library',
    href: '/dashboard/templates',
    roles: ['admin'],
    icon: (
      <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    label: 'TF Structures',
    href: '/dashboard/lists',
    roles: ['admin'],
    icon: (
      <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    label: 'Users',
    href: '/dashboard/users',
    roles: ['admin'],
    icon: (
      <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  // Client-only nav
  {
    label: 'My Projects',
    href: '/dashboard/client',
    roles: ['client'],
    icon: (
      <svg style={{width:15,height:15,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
]

export default function DashboardNav({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const roleStyle = ROLE_COLORS[user.role]

  const navItems = allNavItems.filter(item => item.roles.includes(user.role))

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside style={{
      width: 220,
      background: '#fff',
      borderRight: '0.5px solid rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#185FA5' }}>MDR CMS</div>
        <div style={{ fontSize: 11, color: '#9b9991', marginTop: 1 }}>Technical file manager</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px' }}>
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? '#185FA5' : '#6b6a64',
                background: active ? '#E6F1FB' : 'transparent',
                textDecoration: 'none',
                marginBottom: 2,
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div style={{
        padding: '12px 14px',
        borderTop: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: roleStyle.bg, color: roleStyle.color,
            border: `0.5px solid ${roleStyle.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 500, flexShrink: 0,
          }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div style={{
              fontSize: 10, display: 'inline-block', marginTop: 1,
              background: roleStyle.bg, color: roleStyle.color,
              border: `0.5px solid ${roleStyle.border}`,
              padding: '0px 5px', borderRadius: 3,
            }}>
              {ROLE_LABELS[user.role]}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', height: 28, fontSize: 12,
            background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)',
            borderRadius: 6, color: '#6b6a64', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <svg style={{width:12,height:12,stroke:'currentColor',fill:'none',strokeWidth:1.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}} viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}
