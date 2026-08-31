import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import LoginScreen from './LoginScreen'

// §8.6 login gate, mounted in main.tsx (bootstrap layer):
// no env -> pass through unchanged; env + signed out -> login screen
export default function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status)
  const init = useAuth((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  if (status === 'disabled' || status === 'signedIn') return <>{children}</>
  if (status === 'loading') return <div className="min-h-screen bg-gray-50" />
  return <LoginScreen />
}
