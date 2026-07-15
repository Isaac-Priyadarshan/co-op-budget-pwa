import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DataProvider } from './context/DataContext'
// ─── FIX (Issue 2 — Android install prompt) ──────────────────────────────────
// Import usePWAInstall purely to trigger the module-level `beforeinstallprompt`
// listener registration at the earliest possible moment — before any React
// rendering begins. The event fires once and must be captured synchronously.
// Components that want to show an install button should call usePWAInstall()
// themselves; this import here is ONLY to guarantee early registration.
import './hooks/usePWAInstall'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err))
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </StrictMode>,
)
