import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'
import { fetchAuthConfig } from '../../services/auth'

export function LoginPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [openSignup, setOpenSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchAuthConfig().then(c => setOpenSignup(Boolean(c.openSignup)))
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'register') {
        await register(email, name, password)
      } else {
        await login(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-400'

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true">
            <path d="M5 24 C 11 22, 16 16, 22 9" fill="none" stroke="#17191a" strokeWidth="3" strokeLinecap="round" />
            <circle cx="24.5" cy="7.5" r="3.2" fill="#d63a20" />
          </svg>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">Skylark</h1>
          <p className="text-sm text-slate-400">
            {mode === 'login' ? 'Sign in to your dashboard' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-700 bg-slate-950 p-6">
          {error && (
            <div className="rounded-md border border-red-500 bg-slate-950 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-sm text-slate-300">Name</label>
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required minLength={2} placeholder="Your name" />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-slate-300">Email</label>
            <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Password</label>
            <input className={inputCls} type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
          >
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          {openSignup && (
            <p className="text-center text-sm text-slate-400">
              {mode === 'login' ? (
                <>
                  No account?{' '}
                  <button type="button" onClick={() => { setMode('register'); setError(null) }} className="text-emerald-400 hover:text-emerald-300">
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setMode('login'); setError(null) }} className="text-emerald-400 hover:text-emerald-300">
                    Sign in
                  </button>
                </>
              )}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
