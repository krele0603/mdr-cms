export type UserRole = 'admin' | 'consultant' | 'client' | 'client-MR'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  company_id: string | null       // primary company (first one, for backwards compat)
  company_name: string | null     // primary company name
  company_ids: string[]           // all companies user belongs to
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  consultant: 'Consultant',
  client: 'Client',
  'client-MR': 'Management Rep.',
}

export const ROLE_COLORS: Record<UserRole, { bg: string; color: string; border: string }> = {
  admin:      { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC' },
  consultant: { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB' },
  client:     { bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
  'client-MR':{ bg: '#FEF0E0', color: '#7A3B00', border: '#F5B97A' },
}

export function requireRole(user: SessionUser | null, roles: UserRole[]): boolean {
  if (!user) return false
  return roles.includes(user.role)
}
