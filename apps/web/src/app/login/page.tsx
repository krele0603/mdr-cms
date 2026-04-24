'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      // Role-based redirect
      if (data.role === 'client') {
        router.push('/dashboard/client')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch {
      setError('Server error, please try again')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 38, padding: '0 12px',
    fontSize: 13, border: '0.5px solid rgba(0,0,0,0.18)',
    borderRadius: 8, outline: 'none', boxSizing: 'border-box',
    background: '#fafaf8',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f4f3f0',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '36px 32px', width: 360,
        border: '0.5px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#185FA5', marginBottom: 4 }}>MDR CMS</div>
          <div style={{ fontSize: 13, color: '#9b9991' }}>Sign in to your account</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: '#5F5E5A', marginBottom: 4, display: 'block' }}>
              Email
            </label>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: '#5F5E5A', marginBottom: 4, display: 'block' }}>
              Password
            </label>
            <input
              style={inputStyle}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12, color: '#7C1C0C', marginBottom: 14,
              padding: '8px 10px', background: '#FDECEA',
              border: '0.5px solid #EB8585', borderRadius: 6,
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', height: 38, fontSize: 13, fontWeight: 500,
              background: '#185FA5', border: 'none', borderRadius: 8,
              color: '#fff', cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
