/**
 * Lead-tracking for the property detail page.
 *
 * Two real endpoints already exist (view count and engagement time) and are
 * called directly. Everything else in the event list has no backend yet, so
 * events are buffered on `window.__ggnHomeEvents` and forwarded to
 * REACT_APP_ANALYTICS_EVENT_API when that variable is configured — the page
 * never breaks because an analytics sink is missing.
 */

export const EVENTS = {
  PROPERTY_VIEW: "property_view",
  GALLERY_OPEN: "gallery_open",
  IMAGE_VIEW: "image_view",
  VIDEO_PLAY: "video_play",
  VIRTUAL_TOUR_OPEN: "virtual_tour_open",
  SAVE_PROPERTY: "save_property",
  SHARE_PROPERTY: "share_property",
  CALL_CLICKED: "call_clicked",
  WHATSAPP_CLICKED: "whatsapp_clicked",
  ENQUIRY_STARTED: "enquiry_started",
  ENQUIRY_SUBMITTED: "enquiry_submitted",
  SCHEDULE_VISIT_STARTED: "schedule_visit_started",
  SCHEDULE_VISIT_COMPLETED: "schedule_visit_completed",
  BROCHURE_DOWNLOAD: "brochure_download",
  FLOOR_PLAN_VIEW: "floor_plan_view",
  DIRECTIONS_CLICKED: "directions_clicked",
};

const SESSION_KEY = "ggnhome_session_id";

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch (e) {
    return "s_unavailable";
  }
}

const authHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function trackEvent(event, { propertyId, userId, source, ...rest } = {}) {
  const payload = {
    event,
    property_id: propertyId || null,
    user_id: userId || null,
    session_id: sessionId(),
    timestamp: new Date().toISOString(),
    source: source || (typeof document !== "undefined" ? document.referrer || "direct" : "direct"),
    ...rest,
  };

  // Always keep a client-side buffer so events are inspectable in dev even
  // without a sink configured.
  if (typeof window !== "undefined") {
    window.__ggnHomeEvents = window.__ggnHomeEvents || [];
    window.__ggnHomeEvents.push(payload);
  }

  const endpoint = process.env.REACT_APP_ANALYTICS_EVENT_API;
  if (!endpoint) return;

  try {
    fetch(endpoint, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (e) {
    // analytics must never break the page
  }
}

/** Existing backend: increments the property's view counter. */
export async function recordPropertyView(propertyId) {
  if (!propertyId || !process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_VIEW) return;
  try {
    await fetch(process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_VIEW, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ propertyId }),
    });
  } catch (err) {
    console.error("Error recording property view:", err);
  }
}

/** Existing backend: records how long the visitor stayed on the listing. */
export async function recordEngagementTime(propertyId, seconds) {
  if (!propertyId || !seconds || !process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_ENGAGEMENT) return;
  try {
    await fetch(process.env.REACT_APP_PROPERTY_ANALYSIS_ADD_ENGAGEMENT, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ propertyId, seconds }),
    });
  } catch (err) {
    console.error("Error recording engagement time:", err);
  }
}

const RECENT_KEY = "ggnhome_recently_viewed";

export function pushRecentlyViewed(property) {
  if (!property?.id) return;
  try {
    const existing = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    const entry = {
      id: property.id,
      type: property.type,
      title: property.title,
      sector: property.sector,
      price: property.price,
      image: property.images?.[0] || null,
      configuration: property.configuration,
      builtUpArea: property.builtUpArea,
      viewedAt: Date.now(),
    };
    const next = [entry, ...existing.filter((p) => p.id !== property.id)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch (e) {
    // storage unavailable — recently viewed simply won't show
  }
}

export function getRecentlyViewed(excludeId) {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return list.filter((p) => p.id !== excludeId);
  } catch (e) {
    return [];
  }
}
