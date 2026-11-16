// Where the ggnHome server lives. Stashr is the ONLY source (project "ggnhome" Server URLs): there is no env value and
// no fallback address.
// The Stashr address comes from the build env (VITE_STASHR_SERVER_URL, written by Stashr when its main server
// changes). The old address is only the default when that variable is not set.
const DEFAULT_HOSTS = [
  "https://password-manager-server-xxdr.onrender.com",
  "https://stashr-home-automation.onrender.com",
  "https://stashr-home-automation-gk9p.onrender.com",
  "https://password-manager-server-10od.onrender.com",
  "https://password-manager-server-g305.onrender.com",
];
// The env value may be one address or a comma-separated list; the defaults follow it. Suspended servers just fail and are skipped.
const REGISTRY_HOSTS = [...new Set(String(import.meta.env.VITE_STASHR_SERVER_URL || "").split(",").concat(DEFAULT_HOSTS).map((h) => h.trim().replace(/\/+$/, "")).filter(Boolean))];
const APP = "ggnhome";
const CACHE_KEY = "stashr.server." + APP;
// Used as the address when Stashr has none (switched off, or never reached): every request then fails at once.
export const NO_SERVER = "https://stashr-no-server.invalid";
const clean = (url) => String(url || "").trim().replace(/\/+$/, "");

// The last answer Stashr gave: { url } or { url: "" } when everything was switched off. Never an env value.
const readCache = () => { try { const v = JSON.parse(localStorage.getItem(CACHE_KEY)); return v && typeof v.url === "string" ? v : null; } catch { return null; } };
const writeCache = (url) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ url })); } catch { /* private mode */ } };

// Stashr may list several server addresses (api.ggnhome.com, Render URLs, ...). Any of them is fine: the first one whose
// /health answers wins. If none answers (or only one is listed) the first listed address is used.
async function pickLive(urls, signal) {
  if (urls.length < 2) return urls[0] || "";
  const probe = async (u) => { const r = await fetch(u + "/health", { signal }); if (!r.ok) throw new Error("down"); return u; };
  try { return await Promise.any(urls.map(probe)); } catch { return urls[0]; }
}

/** Stashr's answer: { url } (empty = switched off), or null when Stashr cannot be reached. */
async function fetchFromStashr(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Ask every Stashr server at once; the first one that answers wins (a suspended one fails at once with no CORS headers).
  const ask = async (host) => {
    const res = await fetch(`${host}/registry/${APP}`, { signal: controller.signal });
    if (!res.ok) throw new Error("registry " + res.status);
    const body = await res.json();
    const urls = (body.urls || []).map(clean).filter((u) => /^https?:\/\//i.test(u));
    return { url: await pickLive(urls, controller.signal) };
  };
  try { return await Promise.any(REGISTRY_HOSTS.map(ask)); }
  catch { return null; } finally { clearTimeout(timer); controller.abort(); }
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
