// ICEPOS SI Service Worker — offline podpora za blagajno
// Cache-a app shell (HTML, CSS, JS) za delo brez interneta
// API GET klici: network-first, fallback na cache
// API POST/PUT/DELETE: queue v IndexedDB, retry preko Background Sync

const CACHE_NAME = "icepos-si-v2";
const QUEUE_DB = "icepos-offline-queue";
const QUEUE_STORE = "requests";
const APP_SHELL = ["/", "/manifest.json"];

// === Install ===
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// === Activate ===
self.addEventListener("activate", (event) => {
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

// === IndexedDB helper za offline queue ===
function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueRequest(request) {
  const db = await openQueueDB();
  const body = await request.clone().text();
  const entry = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: body,
    timestamp: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction([QUEUE_STORE], "readwrite");
    tx.objectStore(QUEUE_STORE).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getQueuedRequests() {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([QUEUE_STORE], "readonly");
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clearQueuedRequest(id) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([QUEUE_STORE], "readwrite");
    tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// === Fetch handler ===
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, non-API requests for caching
  if (!url.pathname.startsWith("/api/")) {
    // Static assets — cache-first
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // API requests
  if (request.method === "GET") {
    // Network-first za GET
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
  } else {
    // POST/PUT/PATCH/DELETE — queue if offline
    event.respondWith(
      fetch(request).catch(async () => {
        // Offline — queue the request
        try {
          await queueRequest(request);
          // Register background sync
          if (self.registration.sync) {
            await self.registration.sync.register("icepos-sync");
          }
          return new Response(
            JSON.stringify({ queued: true, message: "Zahtevek je v čakalni vrsti — poslan bo, ko bo povezava ponovno na voljo." }),
            { status: 202, headers: { "Content-Type": "application/json" } }
          );
        } catch (e) {
          return new Response(
            JSON.stringify({ error: "Offline in queue failed" }),
            { status: 503 }
          );
        }
      })
    );
  }
});

// === Background Sync — retry queued requests ===
self.addEventListener("sync", (event) => {
  if (event.tag === "icepos-sync") {
    event.waitUntil(replayQueue());
  }
});

async function replayQueue() {
  const queued = await getQueuedRequests();
  for (const entry of queued) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body,
      });
      if (response.ok) {
        await clearQueuedRequest(entry.id);
        // Notify clients
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({ type: "sync-success", url: entry.url });
        });
      }
    } catch (e) {
      // Will retry on next sync
      console.error("[SW] Replay failed:", e);
    }
  }
}

// === Message handler — manual sync trigger ===
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "manual-sync") {
    event.waitUntil(replayQueue());
  }
});
