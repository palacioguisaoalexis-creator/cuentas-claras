/* Cuentas Claras — guarda la app para abrirla rápido y sin señal. Siempre intenta traer la versión nueva primero. */
const V = 'cc-v8';
const SHELL = ['./', './index.html', './app.js', './plataforma.js', './manifest.json', './icon-192.png', './icon-512.png', './privacidad.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});
