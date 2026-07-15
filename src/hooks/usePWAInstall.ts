/**
 * usePWAInstall
 * ─────────────────────────────────────────────────────────────────────────────
 * FIX (Issue 2 — Android install prompt)
 *
 * The `beforeinstallprompt` event fires exactly ONCE per browser session,
 * before any user gesture. If it is not captured synchronously at that moment
 * it is gone forever — you cannot re-request it.
 *
 * This hook:
 *  1. Registers a window listener for `beforeinstallprompt` at module load.
 *  2. Stores the deferred prompt event in a module-level variable so it
 *     survives React re-renders and StrictMode double-invocations.
 *  3. Exposes `canInstall` (boolean) and `promptInstall` (async function)
 *     so any component can trigger the native install sheet.
 *  4. Listens for `appinstalled` to clear state after a successful install.
 *
 * Usage:
 *   const { canInstall, promptInstall } = usePWAInstall()
 *   <button onClick={promptInstall} style={{ display: canInstall ? 'flex' : 'none' }}>
 *     Install App
 *   </button>
 */

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

// Module-level: survives React re-renders and StrictMode double-mount.
let _deferredPrompt: BeforeInstallPromptEvent | null = null
let _listenerRegistered = false

function registerPromptListener() {
  if (_listenerRegistered) return
  _listenerRegistered = true

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome from showing the mini-infobar automatically
    e.preventDefault()
    _deferredPrompt = e as BeforeInstallPromptEvent
    // Notify all mounted hook instances that install is now possible
    window.dispatchEvent(new CustomEvent('pwa-prompt-ready'))
  })

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null
    window.dispatchEvent(new CustomEvent('pwa-installed'))
  })
}

// Register immediately when the module is imported (not inside React lifecycle)
registerPromptListener()

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState<boolean>(() => _deferredPrompt !== null)

  useEffect(() => {
    const onReady = () => setCanInstall(true)
    const onInstalled = () => setCanInstall(false)

    window.addEventListener('pwa-prompt-ready', onReady)
    window.addEventListener('pwa-installed', onInstalled)

    return () => {
      window.removeEventListener('pwa-prompt-ready', onReady)
      window.removeEventListener('pwa-installed', onInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!_deferredPrompt) return 'unavailable'
    await _deferredPrompt.prompt()
    const { outcome } = await _deferredPrompt.userChoice
    _deferredPrompt = null
    setCanInstall(false)
    return outcome
  }

  return { canInstall, promptInstall }
}
