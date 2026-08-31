import { useEffect, useState } from 'react'
import { useT } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'

// Cloud mode only: local mode is fully functional offline, no banner needed (§6 P2)
export default function OfflineBanner() {
  const t = useT()
  const authStatus = useAuth((s) => s.status)
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (authStatus === 'disabled' || !offline) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[60] bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white">
      {t('offline.banner')}
    </div>
  )
}
