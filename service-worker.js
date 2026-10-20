// Service workers (and therefore installability/offline support) only run under HTTPS or
// http://localhost - if you drop these files on a plain-HTTP server, the browser will silently
// skip registration and the app will behave like a normal online-only page.

const CACHE_VERSION = 'v1';
const CACHE_NAME = `t182t-shell-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Hosts whose requests must always go straight to the network - live METAR data must never
// be served from the app-shell cache or it could get stuck stale forever. Offline/stale
// handling for weather is done in index.html via localStorage, not here.
const BYPASS_HOSTS = ['aviationweather.gov', 'allorigins.win', 'corsfix.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (BYPASS_HOSTS.some((host) => url.hostname.endsWith(host))) {
    // Let the browser handle it natively - no SW interception at all.
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return undefined;
        });
    })
  );
});
