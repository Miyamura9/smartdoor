const CACHE_NAME = 'smart-door-lock-v4';
const APP_SHELL = ['/', '/manifest.json'];


self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/') || event.request.url.includes('socket.io')) return;
  // Never cache Next.js JS/CSS chunks — they have hash in filename but stale
  // chunks from a previous build will cause ChunkLoadError on re-deploy
  if (event.request.url.includes('/_next/static/chunks/')) return;
  if (event.request.url.includes('/_next/static/css/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return new Response(
            `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offline — Smart Door Lock</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #080810;
      color: #ffffff;
      font-family: 'Space Grotesk', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 2rem;
    }
    .icon { font-size: 4rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.5rem; color: #00d4ff; margin-bottom: 0.75rem; }
    p { color: rgba(255,255,255,0.6); font-size: 0.95rem; line-height: 1.6; }
    .btn {
      margin-top: 2rem;
      padding: 0.75rem 2rem;
      background: rgba(0,212,255,0.12);
      border: 1px solid rgba(0,212,255,0.3);
      border-radius: 12px;
      color: #00d4ff;
      font-size: 0.95rem;
      cursor: pointer;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="icon">🔒</div>
  <h1>You're Offline</h1>
  <p>Smart Door Lock requires an internet connection to communicate with your device.</p>
  <a class="btn" href="/">Try Again</a>
</body>
</html>`,
            {
              headers: { 'Content-Type': 'text/html' },
            }
          );
        });
    })
  );
});
