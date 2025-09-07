const CACHE_NAME = 'ls-cache-v1';
const STATIC_ASSETS = [
  '/',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Simple fetch strategy:
// - Cache-first for GET to static assets
// - Network-first for API calls
// - Queue POST to /api/learning/progress/* when offline and replay with Background Sync

// IndexedDB helper for queue
const DB_NAME = 'ls-progress-queue';
const DB_STORE = 'queue';
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbAdd(payload) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).add(payload);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGetAll() {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function idbDelete(id) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only GET requests are cached
  if (req.method !== 'GET') return;

  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/static/') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.woff2') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.svg')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }))
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    // Queue POST to progress endpoints when offline
    if (req.method === 'POST' && (url.pathname.startsWith('/api/learning/progress/'))) {
      event.respondWith((async () => {
        try {
          const res = await fetch(req.clone());
          return res;
        } catch (e) {
          try {
            const body = await req.clone().text();
            await idbAdd({ ts: Date.now(), url: req.url, method: req.method, headers: Array.from(req.headers.entries()), body });
            if ('sync' in self.registration) {
              try { await self.registration.sync.register('progress-sync'); } catch {}
            }
          } catch {}
          return new Response(JSON.stringify({ ok: true, queued: true, offline: true }), { status: 202, headers: { 'Content-Type': 'application/json' } });
        }
      })());
      return;
    }

    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        return res;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || new Response(JSON.stringify({ ok: false, offline: true }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }
});

// Background Sync handler to flush queued progress updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'progress-sync') {
    event.waitUntil((async () => {
      const items = await idbGetAll();
      for (const item of items) {
        try {
          const headers = new Headers(item.headers || []);
          await fetch(item.url, { method: item.method || 'POST', headers, body: item.body });
          await idbDelete(item.id);
        } catch (e) {
          // stop processing further to retry next sync
          break;
        }
      }
    })());
  }
});
