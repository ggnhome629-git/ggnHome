// Where the ggnHome server lives. The address is kept on Stashr (its project "ggnhome" Server URLs), so moving the
// server needs no rebuild: set it there. REACT_APP_Base_API stays as the fallback if Stashr cannot be reached.
const REGISTRY_HOSTS = [
  "https://password-manager-server-xxdr.onrender.com",
  "https://password-manager-server-8gvj.onrender.com",
];
const APP = "ggnhome";
const CACHE_KEY = "stashr.server." + APP;
const FALLBACK = process.env.REACT_APP_Base_API || process.env.REACT_APP_BASE_API || "";

const clean = (url) => String(url || "").trim().replace(/\/+$/, "");
const readCache = () => { try { return clean(localStorage.getItem(CACHE_KEY)); } catch { return ""; } };
const writeCache = (url) => { try { localStorage.setItem(CACHE_KEY, url); } catch { /* private mode */ } };

// A live binding: modules that import it after resolveApiBase() has finished see the Stashr address.
export let API_BASE = readCache() || clean(FALLBACK);

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

/**
 * Called once before the app loads. With a saved address from the last visit it returns at once and refreshes in the
 * background; the first ever visit waits a few seconds for Stashr, then falls back to the build-time address.
 */
export async function resolveApiBase() {
  const cached = readCache();
  if (cached) {
    API_BASE = cached;
    fetchFromStashr(60000).then((url) => { if (url) writeCache(url); });
    return API_BASE;
  }
  const url = await fetchFromStashr(6000);
  if (url) { API_BASE = url; writeCache(url); }
  return API_BASE;
}
