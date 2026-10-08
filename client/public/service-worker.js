/* eslint-disable no-restricted-globals */
/**
 * GgnHome service worker (v2) — makes the site and the Android app usable on
 * slow or no network.
 *
 *  - App shell + hashed static files: cache-first.
 *  - Page navigations: network-first (4s), falling back to the cached shell so
 *    the React app boots offline.
 *  - Property/listing/saved/recommendation API reads: network-first (6s),
 *    falling back to the last good copy. Capped, and cleared on logout.
 *  - Images: stale-while-revalidate, capped.
 *  - Anything that writes, authenticates or handles money is never cached.
 */
const VERSION = "v2";
const SHELL = `ggn-shell-${VERSION}`;
const STATIC = `ggn-static-${VERSION}`;
const API = `ggn-api-${VERSION}`;
const IMG = `ggn-img-${VERSION}`;
const KEEP = [SHELL, STATIC, API, IMG];

const SHELL_FILES = ["/", "/index.html", "/offline.html", "/manifest.json", "/Logo2.jpg", "/default-property.jpg"];
const NEVER_CACHE = /\/(admin|payment|payments|otp|login|logout|register|cron|upload|sms)(\/|\?|$)|\/api\/(admin|payment|enquiry|request-callback|chatbot)/i;
const CACHEABLE_API = /\/(api\/(activeproperties|getRentalproperties|getSaleproperties|search-properties|search-areas|get-sector-suggestions|propertyAanalysis\/savedProperties|app\/recommendations|recommendations|news|promos?|similar)|auth\/me|api\/user\/dashboard)/i;
const LIMITS = { [API]: 120, [IMG]: 160 };

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => Promise.all(SHELL_FILES.map((f) => c.add(f).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ggn") && !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-user-cache") event.waitUntil(caches.delete(API));
  if (event.data === "skip-waiting") self.skipWaiting();
});

async function trim(name) {
  const max = LIMITS[name];
  if (!max) return;
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function networkFirst(request, cacheName, ms, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await withTimeout(fetch(request), ms);
    if (res && res.ok) {
      cache.put(request, res.clone()).then(() => trim(cacheName));
    }
    return res;
  } catch (err) {
    const hit = await cache.match(request, { ignoreVary: true });
    if (hit) return hit;
    if (fallbackUrl) {
      const shell = await caches.match(fallbackUrl);
      if (shell) return shell;
    }
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone()).then(() => trim(cacheName));
      return res;
    })
    .catch(() => null);
  return hit || (await refresh) || Response.error();
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!/^https?:$/.test(url.protocol) || NEVER_CACHE.test(url.pathname + url.search)) return;

  // 1) Page loads -> cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      withTimeout(fetch(request), 4000).catch(async () => (await caches.match("/index.html")) || (await caches.match("/offline.html")) || Response.error())
    );
    return;
  }

  // 2) Built, hashed assets.
  if (url.origin === self.location.origin && /^\/static\//.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }

  // 3) Listing / saved / recommendation reads.
  if (CACHEABLE_API.test(url.pathname)) {
    event.respondWith(networkFirst(request, API, 6000));
    return;
  }

  // 4) Images.
  if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request, IMG));
    return;
  }

  // 5) Other same-origin files (manifest, fonts, icons).
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, SHELL));
  }
});

// ---- Web push (browser). The Android app uses native FCM instead. ----
self.addEventListener("push", (event) => {
  const data = (event.data && event.data.json && event.data.json()) || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "GgnHome", {
      body: data.body || "New update from GgnHome",
      icon: "/Logo2.jpg",
      badge: "/Logo2.jpg",
      tag: "ggnhome-notification",
      data: { link: data.link || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(link);
          return c.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(link) : undefined;
    })
  );
});
