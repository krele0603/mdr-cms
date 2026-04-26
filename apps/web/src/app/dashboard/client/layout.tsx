import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()
  if (!user) redirect('/login')
  if (user.role !== 'client') redirect('/dashboard')
  return <>{children}</>
}
