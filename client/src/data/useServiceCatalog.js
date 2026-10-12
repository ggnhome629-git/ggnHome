import { useEffect, useState } from "react";

/**
 * Home services that admins have switched on (Admin → Service Catalog).
 * Cached for the page session; falls back to the built-in list if the API
 * is unreachable so the services pages never go blank.
 */
export const FALLBACK_SERVICES = [
  { key: "cleaning", title: "Cleaning", emoji: "🧹", color: "#00A79D", description: "Deep cleaning for homes, kitchens and bathrooms.", startsFrom: 0 },
  { key: "painting", title: "Painting", emoji: "🎨", color: "#8B5CF6", description: "Interior and exterior painting by trained painters.", startsFrom: 0 },
  { key: "termite", title: "Termite Control", emoji: "🐛", color: "#DC2626", description: "Anti-termite treatment for woodwork and walls.", startsFrom: 0 },
  { key: "plumbing", title: "Plumbing", emoji: "🚰", color: "#2563EB", description: "Leaks, taps, fittings, drainage and bathroom repairs.", startsFrom: 0 },
  { key: "acService", title: "AC Service", emoji: "❄️", color: "#06B6D4", description: "AC servicing, gas refill, installation and repair.", startsFrom: 0 },
  { key: "carpenter", title: "Carpenter", emoji: "🪚", color: "#D97706", description: "Furniture repair, fittings and custom woodwork.", startsFrom: 0 },
  { key: "electrical", title: "Electrical", emoji: "⚡", color: "#F59E0B", description: "Wiring, switches, lights, fans and appliance points.", startsFrom: 0 },
  { key: "moving", title: "Moving", emoji: "📦", color: "#10B981", description: "Packers and movers for shifting within Gurgaon and beyond.", startsFrom: 0 },
  { key: "pestControl", title: "Pest Control", emoji: "🦟", color: "#EF4444", description: "Cockroach, mosquito and general pest treatment.", startsFrom: 0 },
  { key: "other", title: "Other", emoji: "🔧", color: "#6B7280", description: "Anything else your home needs — tell us the details.", startsFrom: 0 },
];

let cache = null;
let inflight = null;

function load() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch(`${process.env.REACT_APP_Base_API || ""}/api/service-catalog`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("unavailable"))))
      .then((d) => {
        cache = Array.isArray(d.services) ? d.services : FALLBACK_SERVICES;
        return cache;
      })
      .catch(() => FALLBACK_SERVICES)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Forget the cached list (e.g. after an admin edits the catalogue). */
export function invalidateServiceCatalog() {
  cache = null;
}

export function useServiceCatalog() {
  const [services, setServices] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    let alive = true;
    load().then((list) => {
      if (!alive) return;
      setServices(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { services, loading };
}

export const priceLabel = (s) => (Number(s.startsFrom) > 0 ? `From ₹${Number(s.startsFrom).toLocaleString("en-IN")}` : "Price on inspection");
