import Link from 'next/link'

export default function DashboardPage() {
  const stats = [
    { label: 'Active projects', value: '3', color: '#185FA5', href: '/dashboard/projects' },
    { label: 'Templates', value: '10', color: '#3B6D11', href: '/dashboard/templates' },
    { label: 'Pending review', value: '2', color: '#854F0B', href: '/dashboard/projects' },
    { label: 'Approved docs', value: '18', color: '#3B6D11', href: '/dashboard/projects' },
  ]

  const recent = [
    { project: 'WoundCare Pro Documentation', doc: 'Risk Management File', action: 'Submitted for review', who: 'Jana K.', time: 'Today 09:14', color: '#854F0B' },
    { project: 'CardioMonitor Pro MDR TF', doc: 'Software Development Plan', action: 'Comment added', who: 'M. Petrović', time: 'Today 08:55', color: '#185FA5' },
    { project: 'SkinScan AI Technical File', doc: 'Declaration of Conformity', action: 'Approved', who: 'You', time: 'Yesterday', color: '#3B6D11' },
    { project: 'NeuroStim IIb TF', doc: 'Intended Purpose', action: 'Variable suggestion', who: 'R. Costa', time: 'Yesterday', color: '#534AB7' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: '#6b6a64' }}>Welcome back. Here's what needs your attention.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
        {stats.map(s => (
          <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff',
              border: '0.5px solid rgba(0,0,0,0.1)',
              borderRadius: 12,
              padding: '14px 18px',
              cursor: 'pointer',
            }}>
              <div style={{ fontSize: 12, color: '#6b6a64', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 500, color: s.color }}>{s.value}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{
        background: '#fff',
        border: '0.5px solid rgba(0,0,0,0.1)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 18px',
          borderBottom: '0.5px solid rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Recent activity</div>
          <Link href="/dashboard/projects" style={{ fontSize: 12, color: '#185FA5', textDecoration: 'none' }}>
            View all projects →
          </Link>
        </div>
        {recent.map((r, i) => (
          <div key={i} style={{
            padding: '12px 18px',
            borderBottom: i < recent.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: r.color, flexShrink: 0,
            }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 500 }}>{r.doc}</span>
                <span style={{ color: '#6b6a64' }}> — {r.action}</span>
              </div>
              <div style={{ fontSize: 11, color: '#9b9991', marginTop: 1 }}>
                {r.project} · {r.who}
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#9b9991', flexShrink: 0 }}>{r.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
