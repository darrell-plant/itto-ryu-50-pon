const CACHE_NAME = "odachi50-v16";
const MEDIA_CACHE = "odachi50-media"; // persistent across shell versions
// Debug + busy guard for media prefetch
const DEBUG_PREFETCH = true; // set to false to silence debug messages
let prefetchBusy = false;    // prevents concurrent PREFETCH_MEDIA runs
// Expose a simple version endpoint for the app shell to read
const VERSION_ENDPOINT = 'version.txt';
const VERSION_PATHNAME = new URL(VERSION_ENDPOINT, self.registration.scope).pathname;
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/qr-50pon.png",
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
        keys.map((k) =>(k === CACHE_NAME || k === MEDIA_CACHE) ? null : caches.delete(k)
        )
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

  // Cache-first for video clips (range-aware)
  if (request.url.includes('/assets/clips/')) {
    // If it's a Range request and we have a full cached copy, synthesize 206; otherwise network and background-cache full
    if (request.headers.get('range')) {
      event.respondWith(serveRangeFromCacheOrNetwork(event, request));
      return;
    }
    return cacheFirstMedia(event, new Request(request.url));
  }

  // Cache-first for full originals (range-aware)
  if (request.url.includes('/assets/originals/')) {
    if (request.headers.get('range')) {
      event.respondWith(serveRangeFromCacheOrNetwork(event, request));
      return;
    }
    return cacheFirstMedia(event, new Request(request.url));
  }

  // Cache-first for app icons
  if (request.url.includes('/icons/')) {
    return cacheFirst(event, request);
  }

  // Cache-first for the PWA manifest
  if (request.url.endsWith('manifest.webmanifest')) {
    return cacheFirst(event, request);
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

self.addEventListener('message', async (event) => {
  const data = event.data || {};

  // ---- Status check: how many URLs are already cached? ----
  if (data.type === 'CHECK_MEDIA' && Array.isArray(data.urls)) {
    const cache = await caches.open(MEDIA_CACHE);
    let hits = 0;
    for (const url of data.urls) {
      const resp = await cache.match(new Request(url));
      if (resp && resp.ok) hits++;
    }
    if (DEBUG_PREFETCH) {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) client.postMessage({ type: 'PREFETCH_DEBUG', msg: `check: cached=${hits}/${data.urls.length}` });
    }
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) client.postMessage({ type: 'CHECK_MEDIA_RESULT', total: data.urls.length, cached: hits });
    return;
  }

  // ---- Prefetch media: skip cached, guard against duplicates, optional force ----
  if (data.type === 'PREFETCH_MEDIA' && Array.isArray(data.urls)) {
    if (prefetchBusy) {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) client.postMessage({ type: 'PREFETCH_IGNORED_BUSY' });
      if (DEBUG_PREFETCH) {
        for (const client of clientsList) client.postMessage({ type: 'PREFETCH_DEBUG', msg: 'ignored duplicate request: busy' });
      }
      return;
    }
    prefetchBusy = true;

    const urls = data.urls;
    const force = !!data.force;
    const cache = await caches.open(MEDIA_CACHE);
    let done = 0;
    const total = urls.length;

    const notify = async (type, payload = {}) => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) client.postMessage({ type, ...payload });
    };

    if (DEBUG_PREFETCH) await notify('PREFETCH_DEBUG', { msg: `start prefetch: total=${total}, force=${force}` });

    for (const url of urls) {
      try {
        const key = new Request(url);
        const existing = await cache.match(key);
        if (existing && existing.ok && !force) {
          done++;
          if (DEBUG_PREFETCH) await notify('PREFETCH_DEBUG', { msg: `skip cached: ${url}` });
          await notify('PREFETCH_PROGRESS', { done, total, url, skipped: true });
          continue;
        }
        if (DEBUG_PREFETCH) await notify('PREFETCH_DEBUG', { msg: `fetch: ${url}` });
        const resp = await fetch(key, { cache: 'no-store' });
        const isPartial = resp.status === 206 || resp.headers.has('Content-Range');
        const canCache = resp.ok && !isPartial && resp.type === 'basic';
        if (canCache) await cache.put(key, resp.clone());
      } catch (e) {
        if (DEBUG_PREFETCH) await notify('PREFETCH_DEBUG', { msg: `error: ${url}: ${e && e.message}` });
      }
      done++;
      await notify('PREFETCH_PROGRESS', { done, total, url });
    }

    await notify('PREFETCH_DONE', { total });
    if (DEBUG_PREFETCH) await notify('PREFETCH_DEBUG', { msg: 'end prefetch' });
    prefetchBusy = false;
    return;
  }
});

async function serveRangeFromCacheOrNetwork(event, request) {
  const rangeHeader = request.headers.get('range');
  const url = request.url;
  const cache = await caches.open(MEDIA_CACHE);

  // Always look up the FULL object by a range-less Request key
  const fullReq = new Request(url);
  const cachedFull = await cache.match(fullReq);

  // If we already have the full object cached, synthesize a 206 slice
  if (rangeHeader && cachedFull) {
    const size = Number(cachedFull.headers.get('Content-Length')) || undefined;
    const m = /bytes\s*=\s*(\d+)-(\d+)?/i.exec(rangeHeader);
    if (m) {
      const start = Number(m[1]);
      const end = m[2] ? Number(m[2]) : (size ? size - 1 : undefined);
      const buf = await cachedFull.arrayBuffer();
      const last = (end !== undefined) ? end : (buf.byteLength - 1);
      const chunk = buf.slice(start, last + 1);
      const headers = new Headers(cachedFull.headers);
      headers.set('Content-Range', `bytes ${start}-${last}/${buf.byteLength}`);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Content-Length', String(chunk.byteLength));
      // Ensure content-type is preserved (fallback to mp4)
      if (!headers.get('Content-Type')) headers.set('Content-Type', 'video/mp4');
      return new Response(chunk, { status: 206, headers });
    }
  }

  // Otherwise, go to network for this request (may be 206). In the background, try to cache a full 200 copy.
  const netResp = await fetch(request);

  // Kick off a background fetch for the FULL file (no Range) to prime cache, if we don't have it yet.
  if (!cachedFull) {
    event.waitUntil((async () => {
      try {
        const fullResp = await fetch(fullReq, { cache: 'no-store' });
        const isPartial = fullResp.status === 206 || fullResp.headers.has('Content-Range');
        const canCache = fullResp.ok && !isPartial && fullResp.type === 'basic';
        if (canCache) {
          await cache.put(fullReq, fullResp.clone());
        }
      } catch (_) { /* ignore */ }
    })());
  }

  return netResp;
}

function cacheFirst(event, request) {
  event.respondWith(
    caches.match(new Request(request.url)).then((cached) => {
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

function cacheFirstMedia(event, request) {
  event.respondWith(
    caches.match(new Request(request.url)).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        const isPartial = res.status === 206 || res.headers.has('Content-Range');
        const canCache = res.ok && !isPartial && request.method === 'GET' && res.type === 'basic';
        if (canCache) {
          const resClone = res.clone();
          caches.open(MEDIA_CACHE).then((c) => c.put(request, resClone));
        }
        return res;
      });
    })
  );
  return;
}
