// Tiny stale-while-revalidate helper: screens paint the last response
// straight away, then replace it once the fresh one arrives.
const PREFIX = "ggn:swr:";

export function readCache(key, maxAgeMs = 10 * 60 * 1000) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    return Date.now() - t <= maxAgeMs ? v : null;
  } catch {
    return null;
  }
}

export function writeCache(key, value) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    /* storage full or blocked: the cache is only an optimisation */
  }
}
