'use client'
import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return }
      router.push(from)
      router.refresh()
    } catch {
      setError('Connection error — please try again')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#A32D2D', marginBottom: 16 }}>
          {error}
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#6b6a64', marginBottom: 5 }}>Email address</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="you@example.com"
          style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', background: '#fff', color: '#1a1a18' }} />
      </div>
      <div style={{ marginBottom: 22 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#6b6a64', marginBottom: 5 }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
          style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: 8, outline: 'none', background: '#fff', color: '#1a1a18' }} />
      </div>
      <button type="submit" disabled={loading}
        style={{ width: '100%', height: 40, fontSize: 13, fontWeight: 500, background: loading ? '#B5D4F4' : '#185FA5', border: 'none', borderRadius: 8, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1efe8', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#185FA5', marginBottom: 4 }}>MDR CMS</div>
          <div style={{ fontSize: 13, color: '#9b9991' }}>Technical file management system</div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 16, padding: '32px 28px' }}>
          <h1 style={{ fontSize: 16, fontWeight: 500, marginBottom: 24, color: '#1a1a18' }}>Sign in to your account</h1>
          <Suspense fallback={<div style={{ fontSize: 13, color: '#9b9991' }}>Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#9b9991' }}>
          Access is by invitation only. Contact your administrator.
        </div>
      </div>
    </div>
  )
}
