'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
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
      if (!res.ok) { setError(data.error || 'Login failed'); return }
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
    width: '100%', height: 40, padding: '0 12px',
    fontSize: 13, border: '0.5px solid rgba(0,0,0,0.15)',
    borderRadius: 8, outline: 'none', boxSizing: 'border-box',
    background: '#fff', color: '#1a1f24',
    fontFamily: "'DM Sans', sans-serif",
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#1a1f24',
    }}>
      {/* Left — brand panel */}
      <div style={{
        width: 380, flexShrink: 0,
        background: '#2e3640',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 40px',
        borderRight: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4e8c8c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            TFbuilder
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>
            EasyMed Consulting
          </div>
        </div>

        <div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 38, fontWeight: 600, lineHeight: 1.15,
            color: '#fff', marginBottom: 16,
          }}>
            Technical File<br /><em style={{ color: '#4e8c8c', fontStyle: 'italic' }}>Management</em>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontWeight: 300 }}>
            Structured MDR compliance documentation for medical device manufacturers.
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>
          © {new Date().getFullYear()} EasyMed Consulting
        </div>
      </div>

      {/* Right — login form */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40,
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 22, fontWeight: 600, color: '#fff',
              fontFamily: "'Cormorant Garamond', serif",
              marginBottom: 6,
            }}>Sign in</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Access your technical file workspace
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
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

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
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
                fontSize: 12, color: '#e8a0a0', marginBottom: 16,
                padding: '8px 12px',
                background: 'rgba(148,48,48,0.2)',
                border: '0.5px solid rgba(148,48,48,0.4)',
                borderRadius: 6,
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: 40, fontSize: 13, fontWeight: 500,
                background: loading ? '#2e5f5f' : '#4e8c8c',
                border: 'none', borderRadius: 8,
                color: '#fff', cursor: loading ? 'default' : 'pointer',
                letterSpacing: '0.04em',
                transition: 'background 0.2s',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </div>
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
