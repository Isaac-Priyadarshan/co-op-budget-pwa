const CACHE = 'ij-budget-v1'
const OFFLINE_URL = '/'

const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icons/favicon.svg',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)

  // Skip Supabase API calls — always go network
  if (url.hostname.includes('supabase')) return

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, clone))
        }
        return response
      }).catch(() => {
        // Offline fallback: return cached index.html for navigation
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL)
        }
      })
      return cached || networkFetch
    })
  )
})
