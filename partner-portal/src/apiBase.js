// Where the ggnHome server lives. Stashr is the ONLY source (project "ggnhome" Server URLs): there is no env value and
// no fallback address.
// The Stashr address comes from the build env (VITE_STASHR_SERVER_URL, written by Stashr when its main server
// changes). The old address is only the default when that variable is not set.
const REGISTRY_HOST = String(import.meta.env.VITE_STASHR_SERVER_URL || "https://password-manager-server-xxdr.onrender.com").trim().replace(/\/+$/, "");
const APP = "ggnhome";
const CACHE_KEY = "stashr.server." + APP;
// Used as the address when Stashr has none (switched off, or never reached): every request then fails at once.
export const NO_SERVER = "https://stashr-no-server.invalid";
const clean = (url) => String(url || "").trim().replace(/\/+$/, "");

// The last answer Stashr gave: { url } or { url: "" } when everything was switched off. Never an env value.
const readCache = () => { try { const v = JSON.parse(localStorage.getItem(CACHE_KEY)); return v && typeof v.url === "string" ? v : null; } catch { return null; } };
const writeCache = (url) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ url })); } catch { /* private mode */ } };

/** Stashr's answer: { url } (empty = switched off), or null when Stashr cannot be reached. */
async function fetchFromStashr(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${REGISTRY_HOST}/registry/${APP}`, { signal: controller.signal });
    if (!res.ok) return null;
    const body = await res.json();
    const url = clean((body.urls || [])[0]);
    return { url: /^https?:\/\//i.test(url) ? url : "" };
  } catch { return null; } finally { clearTimeout(timer); }
}

export let API_BASE = (() => { const c = readCache(); return c ? c.url || NO_SERVER : NO_SERVER; })();

/** Called once before the app loads: instant with a saved answer (refreshed in the background), else waits for Stashr. */
export async function resolveApiBase() {
  const cached = readCache();
  if (cached) {
    API_BASE = cached.url || NO_SERVER;
    fetchFromStashr(60000).then((answer) => { if (answer) writeCache(answer.url); });
    return API_BASE;
  }
  const answer = await fetchFromStashr(30000);
  if (answer) { writeCache(answer.url); API_BASE = answer.url || NO_SERVER; }
  return API_BASE;
}
