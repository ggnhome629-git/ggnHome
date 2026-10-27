import { API_BASE } from "./apiBase";
import { cacheManager } from "./cacheManager";

// Site-wide cache refresh. An admin cache clear bumps a version number on the
// server; each browser compares it with the one it last saw and, when it
// differs, wipes its own caches (service worker + cache storage) so the next
// load is fresh. Logins (cookies, localStorage) are never touched.

const API = (API_BASE || "").replace(/\/+$/, "");
const KEY = "ggn:cacheVersion";

const readStored = () => {
  try {
    return localStorage.getItem(KEY);
  } catch (_) {
    return null;
  }
};
const writeStored = (value) => {
  try {
    localStorage.setItem(KEY, String(value));
  } catch (_) {
    // Blocked storage: the check simply never reports a change.
  }
};

export async function fetchServerVersion() {
  const res = await fetch(`${API}/api/cache-version?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data && data.version != null ? String(data.version) : null;
}

/** Deletes cached listings, every Cache Storage entry and service workers. Never throws. */
export async function clearBrowserCaches() {
  try {
    await cacheManager.clearListings();
  } catch (_) {
    // Listing caches are an optimisation; failing to clear them is not fatal.
  }
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  } catch (_) {
    // Nothing to clear, or the browser blocked it.
  }
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (_) {
    // Same: best effort.
  }
}

/**
 * Compares the server's version with this browser's last seen one.
 * Returns "first" (nothing to clear yet), "same", "changed" (caches were just
 * cleared) or "unknown" (offline, or storage is blocked).
 */
export async function checkCacheVersion() {
  let server;
  try {
    server = await fetchServerVersion();
  } catch (_) {
    return "unknown";
  }
  if (!server) return "unknown";

  const stored = readStored();
  if (stored === null) {
    writeStored(server);
    return readStored() === server ? "first" : "unknown";
  }
  if (stored === server) return "same";

  await clearBrowserCaches();
  writeStored(server);
  // If the new version could not be remembered, do not report a change:
  // the caller would reload and find the "same" mismatch forever.
  return readStored() === server ? "changed" : "unknown";
}
