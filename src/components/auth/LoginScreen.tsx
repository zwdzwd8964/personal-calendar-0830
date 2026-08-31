import { useState } from 'react'
import type { FormEvent } from 'react'
import { useT } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'

// §8.6: single-account email + password sign-in (sign-ups are disabled on the Supabase side)
export default function LoginScreen() {
  const t = useT()
  const signIn = useAuth((s) => s.signIn)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setFailed(false)
    const ok = await signIn(email.trim(), password)
    if (!ok) {
      setFailed(true)
      setBusy(false)
    }
    // success: onAuthStateChange flips status and AuthGate unmounts this screen
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-6 text-center text-lg font-bold text-gray-900">{t('app.title')}</h1>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              {t('auth.email')}
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              {t('auth.password')}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </div>
          {failed && <p className="text-sm text-red-600">{t('auth.failed')}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </div>
      </form>
    </div>
  )
}
