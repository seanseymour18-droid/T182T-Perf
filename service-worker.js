/* Cache-first for this app folder only. Weather requests stay on the network. */
const CACHE = "t182t-perf-v3";

function asset(path) {
  return new URL(path, self.location).href;
}

const SHELL = [
  asset("./index.html"),
  asset("./manifest.json"),
  asset("./icon-192.png"),
  asset("./icon-512.png")
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/service-worker.js")) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const path = url.pathname;
    const isAppPage = request.mode === "navigate" && (path.endsWith("/") || path.endsWith("/index.html"));
    if (isAppPage) {
      const page = await caches.match(asset("./index.html"));
      if (page) return page;
    }

    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === "navigate") {
        const page = await caches.match(asset("./index.html"));
        if (page) return page;
      }
      throw error;
    }
  })());
});
