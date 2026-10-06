import { useEffect, useState } from "react";
import { weightedShuffle } from "./promoData";

const cache = new Map();
const SHOWN_KEY = "promosShownOnDashboard";

export function rememberDashboardPromos(ids) {
  try {
    sessionStorage.setItem(SHOWN_KEY, JSON.stringify(ids));
  } catch (e) {
    // storage unavailable — search may repeat a dashboard promo
  }
}

export function dashboardPromoIds() {
  try {
    return JSON.parse(sessionStorage.getItem(SHOWN_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

/**
 * Admin promos for a placement ("dashboard" | "search" | "banner") in a fresh
 * weighted-random order on every page load. Promos come only from the admin:
 * with none created, this returns an empty list and nothing is shown.
 */
export default function usePromos(placement, type = "") {
  const audience = type === "rent" || type === "sale" ? type : "";
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const key = `${placement}|${audience}`;
    const load = cache.has(key)
      ? Promise.resolve(cache.get(key))
      : fetch(`${process.env.REACT_APP_Base_API}/api/promos?placement=${placement}${audience ? `&type=${audience}` : ""}`)
          .then((res) => (res.ok ? res.json() : []))
          .then((list) => {
            const safe = Array.isArray(list) ? list : [];
            cache.set(key, safe);
            return safe;
          });

    load
      .then((list) => {
        if (!cancelled) setPromos(weightedShuffle(list));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [placement, audience]);

  return { promos };
}
