const CACHE_NAME = "jellynest-static-v15";
const ASSET_V = "15";
const CORE_ASSETS = [
  "./",
  "index.html",
  `styles.css?v=${ASSET_V}`,
  `app.js?v=${ASSET_V}`,
  `family-vault-config.js?v=${ASSET_V}`,
  `family-list-sync.js?v=${ASSET_V}`,
  `manifest.webmanifest?v=${ASSET_V}`,
  `icon.svg?v=${ASSET_V}`,
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  `data/coming-soon.json?v=${ASSET_V}`,
  `data/cards.json?v=${ASSET_V}`,
];

/** Network-first with offline fallback — keeps the gallery fresh after publishes. */
function networkFirst(request, fallbackUrl) {
  return fetch(request, { cache: "no-cache" })
    .then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() =>
      caches.match(request).then((cached) => cached || (fallbackUrl ? caches.match(fallbackUrl) : undefined))
    );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: "JELLYNEST_SW_UPDATED", cache: CACHE_NAME });
        }
      })
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || event.request.method !== "GET") return;

  const path = url.pathname;
  const isHtmlNav =
    event.request.mode === "navigate" || path.endsWith("/") || path.endsWith("/index.html");

  if (isHtmlNav) {
    event.respondWith(networkFirst(event.request, "index.html"));
    return;
  }

  if (path.endsWith("/cards.json") || path.endsWith("/coming-soon.json") || path.endsWith("/service-worker.js")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
