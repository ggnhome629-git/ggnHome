/**
 * Helpers for features that exist only inside the GgnHome Android app.
 * The app's WebView appends "GgnHomeApp/<version>" to its user agent
 * (capacitor.config.json -> appendUserAgent), so the same web build can tell
 * the two apart. Native plugins are reached through window.Capacitor, which
 * the shell injects — the web bundle never imports Capacitor itself.
 */
export const isNativeApp = () =>
  typeof navigator !== "undefined" && /GgnHomeApp/i.test(navigator.userAgent || "");

export const appVersion = () => (navigator.userAgent.match(/GgnHomeApp\/([\d.]+)/i) || [])[1] || "";

export const nativePlugin = (name) => {
  try {
    return window.Capacitor?.Plugins?.[name] || null;
  } catch {
    return null;
  }
};

/** Tell the service worker to drop user-specific cached API data. */
export const clearUserCache = () => {
  try {
    navigator.serviceWorker?.controller?.postMessage("clear-user-cache");
    window.caches?.keys?.().then((keys) => keys.filter((k) => k.startsWith("ggn-api")).forEach((k) => window.caches.delete(k)));
  } catch {
    /* best effort */
  }
};

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
};

/** Small JSON snapshot store used for offline fallbacks (saved homes, feed). */
export const snapshot = { read, write };
