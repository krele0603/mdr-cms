export type UserRole = 'admin' | 'consultant' | 'client'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  consultant: 'Consultant',
  client: 'Client',
}

export const ROLE_COLORS: Record<UserRole, { bg: string; color: string; border: string }> = {
  admin: { bg: '#EEEDFE', color: '#3C3489', border: '#AFA9EC' },
  consultant: { bg: '#E6F1FB', color: '#0C447C', border: '#85B7EB' },
  client: { bg: '#EAF3DE', color: '#27500A', border: '#97C459' },
}

export function requireRole(user: SessionUser | null, roles: UserRole[]): boolean {
  if (!user) return false
  return roles.includes(user.role)
}
