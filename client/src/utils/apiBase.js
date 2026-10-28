// Where the ggnHome server lives. Stashr is the ONLY source (project "ggnhome" Server URLs): there is no env value and
// no fallback address. Switch the servers off there and this site stops reaching any server.
// The Stashr address comes from the build env (REACT_APP_STASHR_SERVER_URL, written by Stashr when its main server
// changes). The old address is only the default when that variable is not set.
const REGISTRY_HOST = String(process.env.REACT_APP_STASHR_SERVER_URL || "https://password-manager-server-xxdr.onrender.com").trim().replace(/\/+$/, "");
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

// A live binding: modules that import it after resolveApiBase() has finished see the Stashr address.
export let API_BASE = (() => { const c = readCache(); return c ? c.url || NO_SERVER : NO_SERVER; })();

/**
 * Called once before the app loads. With a saved answer from the last visit it returns at once and refreshes in the
 * background; the first ever visit waits for Stashr (a sleeping free server can take a while to wake up).
 */
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

// ── Endpoint variables ────────────────────────────────────────────────────────────────────────────────────────
// Many screens call an endpoint through its own build-time variable (REACT_APP_USER_ME_API, ...) that holds a full URL.
// srv() moves such a URL to the Stashr server: its host is replaced and its path kept. Only addresses that point at
// the main server are touched (the one most endpoint variables share, or the REACT_APP_Base_API host); anything else,
// and plain paths, pass through unchanged. The env values are used only to recognise those addresses.
const ENDPOINT_VARS = [
  process.env.REACT_APP_ADD_RENT_PROPERTY_API,
  process.env.REACT_APP_ADD_SALE_PROPERTY_API,
  process.env.REACT_APP_ADMIN_APPROVED_PAYMENTS_API,
  process.env.REACT_APP_ADMIN_CALLBACK_REQUESTS_API,
  process.env.REACT_APP_ADMIN_DISTRIBUTE_REWARD_API,
  process.env.REACT_APP_ADMIN_GET_USERS_API,
  process.env.REACT_APP_ADMIN_PENDING_PAYMENTS_API,
  process.env.REACT_APP_ADMIN_UPDATE_PAYMENT_STATUS_API,
  process.env.REACT_APP_AGENT_LOGOUT_API,
  process.env.REACT_APP_AGENT_ME_API,
  process.env.REACT_APP_AI_ASSISTANT_PAGE,
  process.env.REACT_APP_ANALYTICS_API,
  process.env.REACT_APP_ANALYTICS_EVENT_API,
  process.env.REACT_APP_CHATBOT_API,
  process.env.REACT_APP_CHECK_ELIGIBILITY_API,
  process.env.REACT_APP_CREATE_ENQUIRY_API,
  process.env.REACT_APP_FETCHING_SAVED_PROPERTIES,
  process.env.REACT_APP_LOGIN_PAGE,
  process.env.REACT_APP_LOGOUT_API,
  process.env.REACT_APP_PAYMENT_API,
  process.env.REACT_APP_PRICE_PREDICTOR_PAGE,
  process.env.REACT_APP_PRICE_PREDICT_API,
  process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_ENGAGEMENT,
  process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_RATING,
  process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_SAVE,
  process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_VIEW,
  process.env.REACT_APP_PROPERTY_ANALYSIS_GET_CONVERSION,
  process.env.REACT_APP_PROPERTY_ANALYSIS_GET_METRICS,
  process.env.REACT_APP_RENTAL_PROPERTY_DETAIL_API,
  process.env.REACT_APP_RENTAL_PROPERTY_PREFERENCE_ARIA,
  process.env.REACT_APP_REQUEST_CALLBACK_API,
  process.env.REACT_APP_REVERSE_GEOCODE_API,
  process.env.REACT_APP_SALE_PROPERTY_DETAIL_API,
  process.env.REACT_APP_SALE_PROPERTY_PREFERENCE_ARIA,
  process.env.REACT_APP_SEARCH_AREAS_API,
  process.env.REACT_APP_SEARCH_HISTORY_API,
  process.env.REACT_APP_SEARCH_PROPERTIES_API,
  process.env.REACT_APP_SEARCH_PROPERTIES_BY_LOCATION_API,
  process.env.REACT_APP_SUPPORT_ENQUIRY_API,
  process.env.REACT_APP_USER_DASHBOARD_API,
  process.env.REACT_APP_USER_ME_API,
];
const originOf = (url) => { try { return new URL(url).origin; } catch { return ""; } };
const BUILD_ORIGIN = originOf(process.env.REACT_APP_Base_API || process.env.REACT_APP_BASE_API);
const MAIN_ORIGINS = (() => {
  const counts = new Map();
  ENDPOINT_VARS.forEach((v) => { const o = originOf(v); if (o) counts.set(o, (counts.get(o) || 0) + 1); });
  const top = [...counts].sort((a, b) => b[1] - a[1])[0];
  return new Set([BUILD_ORIGIN, top && top[1] >= 3 ? top[0] : ""].filter(Boolean));
})();

export function srv(url) {
  if (!url || typeof url !== "string") return url;
  const o = originOf(url);
  if (!o || !MAIN_ORIGINS.has(o)) return url;
  try { const u = new URL(url); return API_BASE + u.pathname + u.search + u.hash; } catch { return url; }
}
