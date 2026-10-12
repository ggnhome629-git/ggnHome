/**
 * The seven property parameters GgnHome tracks for every listing and that the
 * AI Property Consultant asks about:
 *
 *   six "nearby" distances  — market, metro, hospital, school, park, mall
 *   one position             — corner or middle of the block/building
 *
 * Distances are straight-line estimates in metres (partner-entered or
 * suggested by LocationIQ). Nothing here is a road/walking distance, so the
 * UI must label them "approx.".
 *
 * Keep in sync with client/src/data/propertyParameters.js.
 */

const NEARBY_PARAMETERS = [
  { key: "market", label: "Nearest market", short: "Market", query: /market|supermarket|grocery|convenience|bazaar|mart/i, defaultMeters: 1000 },
  { key: "metro", label: "Metro station", short: "Metro", query: /metro|subway|rapid ?metro/i, defaultMeters: 1500 },
  { key: "hospital", label: "Hospital / clinic", short: "Hospital", query: /hospital|clinic|medical|health ?cent/i, defaultMeters: 2000 },
  { key: "school", label: "School", short: "School", query: /school|college|university|academy|vidyalaya/i, defaultMeters: 2000 },
  { key: "park", label: "Park / garden", short: "Park", query: /park|garden|playground|green/i, defaultMeters: 500 },
  { key: "mall", label: "Shopping mall", short: "Mall", query: /mall|shopping cent|department store|plaza/i, defaultMeters: 3000 },
];

const NEARBY_KEYS = NEARBY_PARAMETERS.map((p) => p.key);

const CORNER_POSITIONS = ["corner", "middle", "not_sure"];

const POSITION_PARAMETER = {
  key: "corner",
  label: "Corner or middle",
  short: "Position",
  values: CORNER_POSITIONS,
};

const PROPERTY_PARAMETERS = [...NEARBY_PARAMETERS, POSITION_PARAMETER];

const MAX_AMENITY_METERS = 50000;

const finiteOrUndefined = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

/** Normalises a corner/middle value from any form or API input. */
function sanitizeCornerPosition(value) {
  const v = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (v === "corner" || v === "middle") return v;
  if (v === "mid" || v === "center" || v === "centre") return "middle";
  return "not_sure";
}

/**
 * Accepts a JSON string or array of nearby amenities as posted by any listing
 * form and returns clean rows for the `nearbyAmenities` schema field. Unknown
 * categories are dropped so search and the AI consultant only ever see the six
 * known nearby parameters.
 */
function sanitizeNearbyAmenities(input) {
  let rows = input;
  if (typeof rows === "string") {
    try {
      rows = JSON.parse(rows);
    } catch (_) {
      return [];
    }
  }
  if (!Array.isArray(rows)) return [];

  const seen = new Set();
  const out = [];
  for (const item of rows.slice(0, 24)) {
    if (!item || typeof item !== "object") continue;
    const category = String(item.category || "").trim().toLowerCase();
    if (!NEARBY_KEYS.includes(category)) continue;
    const name = String(item.name || "").trim().slice(0, 160);
    const rawDistance = finiteOrUndefined(item.distanceMeters ?? item.distance);
    const distanceMeters = rawDistance === undefined ? undefined : Math.min(MAX_AMENITY_METERS, Math.max(0, Math.round(rawDistance)));
    if (!name && distanceMeters === undefined) continue;
    const key = `${category}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      category,
      name,
      distanceMeters,
      distanceUnit: "m",
      source: item.source === "locationiq" ? "locationiq" : "partner",
      edited: Boolean(item.edited),
      latitude: finiteOrUndefined(item.latitude),
      longitude: finiteOrUndefined(item.longitude),
    });
  }
  return out;
}

/** Nearest known distance per category, e.g. { metro: 650, park: 120 }. */
function nearestByCategory(nearbyAmenities) {
  const nearest = {};
  for (const row of Array.isArray(nearbyAmenities) ? nearbyAmenities : []) {
    if (!row || !NEARBY_KEYS.includes(row.category)) continue;
    const d = Number(row.distanceMeters);
    if (!Number.isFinite(d)) continue;
    if (nearest[row.category] === undefined || d < nearest[row.category]) nearest[row.category] = d;
  }
  return nearest;
}

/**
 * Pulls the seven parameters off a multipart/JSON listing body. Returns only
 * the keys that were supplied so updates don't wipe stored values.
 */
function parametersFromBody(body = {}) {
  const out = {};
  if (body.cornerPosition !== undefined) out.cornerPosition = sanitizeCornerPosition(body.cornerPosition);
  const amenities = body.nearbyAmenities !== undefined ? body.nearbyAmenities : body.amenities;
  if (amenities !== undefined) out.nearbyAmenities = sanitizeNearbyAmenities(amenities);
  const lat = finiteOrUndefined(body.latitude);
  const lng = finiteOrUndefined(body.longitude);
  if (lat !== undefined && lat >= -90 && lat <= 90) out.latitude = lat;
  if (lng !== undefined && lng >= -180 && lng <= 180) out.longitude = lng;
  return out;
}

module.exports = {
  NEARBY_PARAMETERS,
  NEARBY_KEYS,
  CORNER_POSITIONS,
  POSITION_PARAMETER,
  PROPERTY_PARAMETERS,
  sanitizeCornerPosition,
  sanitizeNearbyAmenities,
  nearestByCategory,
  parametersFromBody,
};
