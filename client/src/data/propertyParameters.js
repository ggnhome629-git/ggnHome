import { GraduationCap, HeartPulse, LayoutGrid, ShoppingBag, ShoppingBasket, TrainFront, Trees } from "lucide-react";

/**
 * The seven property parameters every listing carries and the AI Property
 * Consultant asks about: six nearby distances plus corner/middle position.
 * Keep in sync with server/config/propertyParameters.js.
 *
 * Distances are straight-line estimates (partner-entered or map lookup),
 * never road distances — always render them as "approx.".
 */
export const NEARBY_PARAMETERS = [
  { key: "market", label: "Nearest market", short: "Market", icon: ShoppingBasket, color: "#C98A1B", query: /market|supermarket|grocery|convenience|bazaar|mart/i },
  { key: "metro", label: "Metro station", short: "Metro", icon: TrainFront, color: "#1F6F8B", query: /metro|subway/i },
  { key: "hospital", label: "Hospital / clinic", short: "Hospital", icon: HeartPulse, color: "#B83A2B", query: /hospital|clinic|medical/i },
  { key: "school", label: "School", short: "School", icon: GraduationCap, color: "#2B4C7E", query: /school|college|university|academy/i },
  { key: "park", label: "Park / garden", short: "Park", icon: Trees, color: "#2F855A", query: /park|garden|playground/i },
  { key: "mall", label: "Shopping mall", short: "Mall", icon: ShoppingBag, color: "#8E4E6B", query: /mall|shopping cent|department store/i },
];

export const POSITION_PARAMETER = { key: "corner", label: "Corner or middle", short: "Position", icon: LayoutGrid, color: "#0F766E" };

export const PROPERTY_PARAMETERS = [...NEARBY_PARAMETERS, POSITION_PARAMETER];

export const CORNER_OPTIONS = [
  { value: "corner", label: "Corner" },
  { value: "middle", label: "Middle" },
  { value: "not_sure", label: "Not sure" },
];

export const emptyNearbyAmenities = () =>
  NEARBY_PARAMETERS.map((p) => ({ category: p.key, label: p.label, name: "", distance: "", source: "partner", edited: false }));

export function formatDistance(meters) {
  const m = Number(meters);
  if (!Number.isFinite(m)) return "";
  return m >= 1000 ? `${Math.round(m / 100) / 10} km` : `${Math.round(m)} m`;
}

/** Nearest stored distance per parameter from a listing's nearbyAmenities. */
export function nearestByCategory(nearbyAmenities) {
  const out = {};
  for (const row of Array.isArray(nearbyAmenities) ? nearbyAmenities : []) {
    const d = Number(row?.distanceMeters);
    if (!row || !Number.isFinite(d)) continue;
    if (!out[row.category] || d < out[row.category].distanceMeters) out[row.category] = row;
  }
  return out;
}
