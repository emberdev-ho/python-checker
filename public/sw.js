// Service Worker: lưu app vào bộ nhớ trình duyệt để dùng offline.
// Khi sửa code và deploy bản mới, tăng số phiên bản để trình duyệt tải lại.
const CACHE = 'soat-loi-python-v2';

const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/py-worker.js',
  '/pyodide/pyodide.js',
  '/pyodide/pyodide.asm.js',
  '/pyodide/pyodide.asm.wasm',
  '/pyodide/python_stdlib.zip',
  '/pyodide/pyodide-lock.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_URLS') return;
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(event.data.urls.map((u) => c.match(u).then((hit) => hit || c.add(u).catch(() => {}))))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Trang HTML: ưu tiên bản mới trên mạng, mất mạng thì dùng bản đã lưu
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Tệp tĩnh (JS, CSS, phông chữ, Python): dùng bản đã lưu, chưa có thì tải và lưu lại
  event.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
    )
  );
});
