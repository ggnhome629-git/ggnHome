import { API_BASE } from "../../../utils/apiBase";
import { useEffect, useState } from "react";

/**
 * Admin tools hidden ("locked") from the Home page. The same list hides them
 * from the left sidebar, the mobile drawer and the phone bottom tabs.
 *
 * The server copy (/api/admin/dashboard-tools) is the source of truth; this
 * module caches it in localStorage and broadcasts changes so the sidebar
 * updates the moment a tool is locked or unlocked on the Home page — in this
 * tab (custom event) and in other open tabs (storage event).
 */
export const HIDDEN_TOOLS_KEY = "ggn:adminHiddenTools";
const CHANGED_EVENT = "ggn:adminHiddenToolsChanged";
// Home is where tools are unlocked, so it can never be hidden.
export const NEVER_HIDDEN = ["/admin/Landingpage"];

export function readHiddenTools() {
  try {
    const v = JSON.parse(localStorage.getItem(HIDDEN_TOOLS_KEY) || "[]");
    return Array.isArray(v) ? v.filter((r) => typeof r === "string") : [];
  } catch (_) {
    return [];
  }
}

export function writeHiddenTools(list) {
  try {
    localStorage.setItem(HIDDEN_TOOLS_KEY, JSON.stringify(list));
  } catch (_) {
    // storage blocked — this tab still updates through the event below
  }
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: list }));
}

let serverSynced = false;

/** Current hidden routes; refreshes once from the server per page load. */
export function useHiddenTools() {
  const [hidden, setHidden] = useState(readHiddenTools);

  useEffect(() => {
    const onChange = (e) => setHidden(Array.isArray(e.detail) ? e.detail : readHiddenTools());
    const onStorage = (e) => {
      if (e.key === HIDDEN_TOOLS_KEY) setHidden(readHiddenTools());
    };
    window.addEventListener(CHANGED_EVENT, onChange);
    window.addEventListener("storage", onStorage);

    if (!serverSynced) {
      serverSynced = true;
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      fetch(`${API_BASE || ""}/api/admin/dashboard-tools`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.success && Array.isArray(data.hiddenRoutes)) writeHiddenTools(data.hiddenRoutes);
        })
        .catch(() => {
          serverSynced = false; // try again next time a nav mounts
        });
    }

    return () => {
      window.removeEventListener(CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return hidden;
}

/** ADMIN_NAV without hidden tools; sections left empty are dropped. */
export function visibleNav(nav, hidden) {
  const set = new Set(hidden.filter((r) => !NEVER_HIDDEN.includes(r)));
  return nav
    .map((section) => ({ ...section, items: section.items.filter((item) => !set.has(item.route)) }))
    .filter((section) => section.items.length > 0);
}
