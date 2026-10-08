/* ══════════════════════════════════════════════
   Service Worker — mdhasibuzzaman.com
   Strategy:
     • Shell (HTML + local assets) → Cache First
     • Google Fonts / CDN              → Stale-While-Revalidate
     • Everything else                 → Network First
   ══════════════════════════════════════════════ */

const CACHE = 'mhb-v2';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.jpg',
  '/PHOTO.jpeg',
  '/Picture1.jpg',
  '/egf_table.png',
];

/* ── Install: pre-cache shell ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

/* ── Activate: delete old caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: tiered strategy ── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Google Fonts → stale-while-revalidate */
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  /* Same-origin HTML/images/assets → cache first, fallback network */
  if (url.origin === self.location.origin) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  /* External (CDN, APIs) → network first */
  e.respondWith(networkFirst(e.request));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    return res;
  } catch {
    const cached = await caches.match(req);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}
