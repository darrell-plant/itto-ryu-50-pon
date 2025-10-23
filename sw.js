const CACHE_NAME = "odachi50-v7";
// Expose a simple version endpoint for the app shell to read
const VERSION_ENDPOINT = 'version.txt';
const VERSION_PATHNAME = new URL(VERSION_ENDPOINT, self.registration.scope).pathname;
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  // styles are inline, but keep future css/js here if added
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Serve a plain-text version string from the SW (uses CACHE_NAME)
  try {
    const url = new URL(event.request.url);
    if (url.origin === location.origin && url.pathname === VERSION_PATHNAME) {
      event.respondWith(new Response(CACHE_NAME, {
        status: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store'
        }
      }));
      return;
    }
  } catch (_) {}

  // Always try network first for navigations/HTML so index.html is never stale
  const isHTML =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Optionally cache the fresh HTML (not required, but fine)
          const okFull = res.ok && res.status === 200 && res.type === "basic";
          if (okFull) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, resClone));
          }
          return res;
        })
        .catch(() => {
          // Fallback to cache (./ or cached index.html) when offline
          return caches.match(request).then((hit) => hit || caches.match("./"));
        })
    );
    return;
  }

  // Cache-first for video clips (assets/clips/*.mp4)
  if (request.url.includes("/assets/clips/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const isPartial = res.status === 206 || res.headers.has('Content-Range');
          const canCache = res.ok && !isPartial && request.method === 'GET' && res.type === 'basic';
          if (canCache) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, resClone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Cache-first for app icons (icons/*)
  if (request.url.includes('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const isPartial = res.status === 206 || res.headers.has('Content-Range');
          const canCache = res.ok && !isPartial && request.method === 'GET' && res.type === 'basic';
          if (canCache) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, resClone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Cache-first for the PWA manifest
  if (request.url.endsWith('manifest.webmanifest')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const isPartial = res.status === 206 || res.headers.has('Content-Range');
          const canCache = res.ok && !isPartial && request.method === 'GET' && res.type === 'basic';
          if (canCache) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, resClone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(request)
      .then((res) => {
        const isPartial = res.status === 206 || res.headers.has('Content-Range');
        const canCache = res.ok && !isPartial && request.method === 'GET' && res.type === 'basic';
        if (canCache) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});