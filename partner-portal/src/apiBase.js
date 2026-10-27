// Where the ggnHome server lives. Kept on Stashr (project "ggnhome" Server URLs), so moving the server needs no
// rebuild. VITE_API_BASE stays as the fallback if Stashr cannot be reached.
const REGISTRY_HOSTS = ["https://password-manager-server-xxdr.onrender.com", "https://password-manager-server-8gvj.onrender.com"];
const APP = "ggnhome";
const CACHE_KEY = "stashr.server." + APP;
const clean = (url) => String(url || "").trim().replace(/\/+$/, "");
const readCache = () => { try { return clean(localStorage.getItem(CACHE_KEY)); } catch { return ""; } };
const writeCache = (url) => { try { localStorage.setItem(CACHE_KEY, url); } catch { /* private mode */ } };

export let API_BASE = readCache() || clean(import.meta.env.VITE_API_BASE);

async function fetchFromStashr(timeoutMs) {
  for (const host of REGISTRY_HOSTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${host}/registry/${APP}`, { signal: controller.signal });
      if (!res.ok) continue;
      const url = clean(((await res.json()).urls || [])[0]);
      if (/^https?:\/\//i.test(url)) return url;
    } catch { /* try the next Stashr server */ }
    finally { clearTimeout(timer); }
  }
  return "";
}

/** Called once before the app loads: instant with a saved address (refreshed in the background), else waits a few seconds. */
export async function resolveApiBase() {
  const cached = readCache();
  if (cached) { API_BASE = cached; fetchFromStashr(60000).then((url) => { if (url) writeCache(url); }); return API_BASE; }
  const url = await fetchFromStashr(6000);
  if (url) { API_BASE = url; writeCache(url); }
  return API_BASE;
}
