import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AuthGate from '@/components/auth/AuthGate'
import App from '@/App'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>,
)
