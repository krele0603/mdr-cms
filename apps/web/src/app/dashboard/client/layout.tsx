import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import DashboardNav from '@/components/layout/DashboardNav'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()
  if (!user) redirect('/login')

  // Only clients here — admins/consultants go back to main dashboard
  if (user.role !== 'client') redirect('/dashboard')

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <DashboardNav user={user} />
      <main style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        {children}
      </main>
    </div>
  )
}
