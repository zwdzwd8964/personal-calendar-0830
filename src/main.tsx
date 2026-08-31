import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AuthGate from '@/components/auth/AuthGate'
import OfflineBanner from '@/components/common/OfflineBanner'
import App from '@/App'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <OfflineBanner />
      <App />
    </AuthGate>
  </StrictMode>,
)

// PWA (§13 P2): hand-rolled service worker, production builds only
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
