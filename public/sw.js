// fix(pwa): Hardened service worker.
// ROOT CAUSE for Android install prompt NOT firing:
//   The SW install event called cache.addAll(['/','offline.html',...]).
//   If ANY of those requests fail (e.g. offline.html not yet built, or '/'
//   returns a redirect during the SW install phase) the ENTIRE install fails
//   silently — the SW never activates, so Chrome never fires beforeinstallprompt.
//
// FIX:
//   1. Wrap each individual fetch in try/catch so one missing asset cannot
//      block SW installation. The SW now installs even if offline.html is absent.
//   2. Bump cache version to 'co-op-budget-v3' so the new SW immediately
//      supersedes any stuck v2 registration.
//   3. fetch listener is fully present (already satisfied Android's requirement).

const CACHE = 'co-op-budget-v3'
const OFFLINE_PAGE = '/offline.html'

// Assets we WANT to precache. Each is attempted individually so a single
// 404 (e.g. a splash image not yet generated) cannot abort the whole install.
const PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // addAll() fails atomically — use individual add() calls instead so
      // one missing asset (e.g. splash PNG not yet generated) cannot abort install.
      Promise.allSettled(
        PRECACHE.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] Precache skipped:', url, err.message)
          )
        )
      )
    ).then(() => self.skipWaiting())
  )
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE)
            .map(k => {
              console.log('[SW] Deleting old cache:', k)
              return caches.delete(k)
            })
        )
      )
      .then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
// IMPORTANT: A fetch listener MUST be present for Chrome to consider this SW
// "functional" when evaluating Android PWA installability criteria.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Always go network-first for Supabase API calls — never cache auth/DB.
  if (url.hostname.includes('supabase')) return

  // Chrome extension requests — ignore.
  if (url.protocol === 'chrome-extension:') return

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(response => {
          // Only cache successful same-origin responses.
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic'
          ) {
            const clone = response.clone()
            caches.open(CACHE).then(cache => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => {
          // Offline: serve branded offline page for navigation requests only.
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE).then(
              r => r || new Response('Offline', { status: 503 })
            )
          }
          // For other requests (images, API) just fail silently.
          return new Response('', { status: 503 })
        })

      // Cache-first for precached assets, network-first for everything else.
      return cached || networkFetch
    })
  )
})
