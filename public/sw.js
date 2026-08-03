const CACHE = "planilha-v7";
const STATIC_ASSETS = [
  "/",
  "/app",
  "/manifest.webmanifest",
  "/pwa-icon.png",
  "/favicon.png",
  "/offline.html",
];
const ASSETS_PREFIXES = ["/assets/", "/_build/"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => {
      // Only cache what we can — don't fail the install if an asset 404s
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          fetch(url).then((r) => {
            if (r.ok) c.put(url, r);
          }).catch(() => {}),
        ),
      );
    }).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) =>
      Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { method } = e.request;
  if (method !== "GET") return;

  const url = new URL(e.request.url);

  // Skip non-GET and non-origin requests (analytics, CDN widgets, etc.)
  if (url.origin !== self.location.origin) return;

  // navigation requests — serve from network, fallback to cache, fallback to offline page
  if (e.request.mode === "navigate") {
    e.respondWith(navStrategy(e.request));
    return;
  }

  // API / data requests — network first
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(networkFirst(e.request, CACHE));
    return;
  }

  // Build assets (hashed filenames) — cache first
  if (ASSETS_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    e.respondWith(cacheFirst(e.request, CACHE));
    return;
  }

  // Static assets (manifest, icons, etc.)
  if (STATIC_ASSETS.includes(url.pathname)) {
    e.respondWith(cacheFirst(e.request, CACHE));
    return;
  }

  // Everything else (fonts, other static) — network first with cache fallback
  e.respondWith(networkFirst(e.request, CACHE));
});

/** Navigation: network first → cached HTML → offline page */
async function navStrategy(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }
    throw new Error("Navigation response not ok");
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    // If the offline page isn't cached either, fetch and cache it
    const offline = await caches.match("/offline.html");
    if (offline) return offline;
    return new Response("Você está offline.", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

async function cacheFirst(req, cacheName) {
  const hit = await caches.match(req);
  if (hit) return hit;
  try {
    return await fetchAndCache(req, cacheName);
  } catch {
    return new Response("", { status: 408 });
  }
}

async function networkFirst(req, cacheName) {
  try {
    return await fetchAndCache(req, cacheName);
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    if (req.destination === "image") return new Response("", { status: 204 });
    return new Response("Offline", { status: 503 });
  }
}

async function fetchAndCache(req, cacheName) {
  const res = await fetch(req);
  if (res.ok) {
    const copy = res.clone();
    caches.open(cacheName).then((c) => c.put(req, copy));
  }
  return res;
}

/* ── Web Push (notificações do admin) ── */
self.addEventListener("push", (e) => {
  let payload = { titulo: "planilhafuturo", corpo: "", tag: "evento" };
  try {
    const data = e.data ? e.data.json() : null;
    if (data && data.titulo) {
      payload = {
        titulo: data.titulo,
        corpo: typeof data.corpo === "string" ? data.corpo : "",
        tag: typeof data.tipo === "string" ? data.tipo : "evento",
      };
    }
  } catch {
    // payload não-JSON → usa o default
  }
  e.waitUntil(
    self.registration.showNotification(payload.titulo, {
      body: payload.corpo,
      icon: "/pwa-icon.png",
      badge: "/favicon.png",
      tag: payload.tag,
      renotify: true,
      data: { url: "/" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.focus();
          return;
        }
      }
      return clients.openWindow(url);
    }),
  );
});

/* ── Background Sync for offline mutations ── */
self.addEventListener("sync", (e) => {
  if (e.tag === "sync-mutations") {
    e.waitUntil(syncMutations());
  }
});

async function syncMutations() {
  try {
    const db = await openMutationQueue();
    const tx = db.transaction("mutations", "readonly");
    const all = await tx.store.getAll();
    for (const mut of all) {
      try {
        await fetch(mut.url, {
          method: mut.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mut.body),
        });
      } catch {
        // leave it in the queue for next attempt
        return;
      }
    }
    // All succeeded — clear queue
    const clearTx = db.transaction("mutations", "readwrite");
    await clearTx.store.clear();
  } catch {
    // IndexedDB may not be available
  }
}

function openMutationQueue() {
  return new Promise((resolve, reject) => {
    const rq = indexedDB.open("planilha-mutations", 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore("mutations", { keyPath: "id", autoIncrement: true });
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
}
