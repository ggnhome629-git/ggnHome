/**
 * Data and geometry for the quest's 3D map world: Gurgaon's sectors and
 * localities (geocoded once by server/scripts/geocodeGurgaonSectors.js), the
 * "lane" a sector's homes are lined up on, and the answer text the consultant's
 * parser understands.
 */
export const GURGAON = { lng: 77.05, lat: 28.44 };
export const HQ = { lng: 77.0886, lat: 28.4949, label: "GgnHome HQ" }; // Cyber City
export const BOUNDS = [
  [76.78, 28.22],
  [77.25, 28.6],
];
export const MAX_PICKS = 3;
export const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/liberty";
export const ZONE_COLOURS = { old: "#a1887f", dlf: "#3a86ff", central: "#00a79d", gcr: "#ff5d8f", sohna: "#fb8500", gcer: "#8338ec", new: "#2ec4b6", dwarka: "#06a77d", outer: "#e0a100" };

export const AMENITY_ICONS = { metro: "🚇", hospital: "🏥", school: "🏫", park: "🌳", market: "🛒", mall: "🛍️" };

let areasPromise = null;
/** The geocoded areas, loaded on demand so the quest's first screen stays light. */
export function loadAreas() {
  if (!areasPromise) {
    areasPromise = import("../../../../data/gurgaonSectors.json").then((m) => {
      const data = m.default || m;
      return data.areas.map((a, i) => ({
        ...a,
        id: i + 1,
        short: a.kind === "sector" ? a.value.replace(/^Sector\s+/i, "") : a.label,
      }));
    });
  }
  return areasPromise;
}

export const kmBetween = (a, b) => {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/** Moves a point `east` and `north` metres. */
export const offsetMeters = (p, east, north) => ({
  lng: p.lng + east / (111320 * Math.cos((p.lat * Math.PI) / 180)),
  lat: p.lat + north / 110540,
});

/** A unit step for a compass bearing (degrees clockwise from north), as [east, north]. */
const heading = (deg) => [Math.sin((deg * Math.PI) / 180), Math.cos((deg * Math.PI) / 180)];

/**
 * Where the homes stand on a sector's lane. The camera looks along `bearing`,
 * so the lane runs across the screen: the cheaper half lines the near side of
 * the road and the rest the far side, each row left to right by price.
 */
export function lanePlots(center, bearing, count, spacing = 52) {
  const across = heading(bearing + 90);
  const ahead = heading(bearing);
  const front = Math.ceil(count / 2);
  return Array.from({ length: count }).map((_, i) => {
    const row = i < front ? 0 : 1;
    const inRow = row === 0 ? i : i - front;
    const rowSize = row === 0 ? front : count - front;
    const along = (inRow - (rowSize - 1) / 2) * spacing;
    const side = row === 0 ? -34 : 34;
    return offsetMeters(center, across[0] * along + ahead[0] * side, across[1] * along + ahead[1] * side);
  });
}

/** The road itself, as a GeoJSON line across the screen through the sector centre. */
export function laneRoad(center, bearing, halfLength = 190) {
  const across = heading(bearing + 90);
  const a = offsetMeters(center, -across[0] * halfLength, -across[1] * halfLength);
  const b = offsetMeters(center, across[0] * halfLength, across[1] * halfLength);
  return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[a.lng, a.lat], [b.lng, b.lat]] } };
}

/** "under 33k", "under 85 lakh", "under 1.25 cr" — rounded up so the house you pointed at is included. */
export function budgetPhrase(price, mode) {
  if (mode === "sale") {
    if (price >= 1e7) return `under ${(Math.ceil(price / 5e5) / 20).toFixed(2).replace(/\.?0+$/, "")} cr`;
    return `under ${Math.ceil(price / 1e5)} lakh`;
  }
  return `under ${Math.ceil(price / 1000)}k`;
}

/** Areas the consultant already knows (from its state), mapped onto the geocoded list. */
export function areasFromReq(req, areas) {
  if (!req || !areas?.length) return [];
  const byValue = new Map(areas.map((a) => [a.value.toLowerCase(), a]));
  const out = [];
  for (const s of req.sectors || []) {
    const a = byValue.get(`sector ${String(s).toLowerCase()}`);
    if (a) out.push(a);
  }
  for (const l of req.localities || []) {
    const a = byValue.get(String(l).toLowerCase());
    if (a) out.push(a);
  }
  return out.slice(0, MAX_PICKS);
}

/** Which picked area a listing belongs to, from its free-text sector field. */
export function areaForListing(listing, picks) {
  const text = String(listing.sector || "").toLowerCase();
  const num = (text.match(/(?:sector|sec)?\s*[-.]?\s*(\d{1,3}[a-z]?)\b/i) || [])[1];
  return (
    picks.find((p) => p.kind === "sector" && num && p.short.toLowerCase() === num) ||
    picks.find((p) => p.kind !== "sector" && text.includes(p.value.toLowerCase())) ||
    picks[0] ||
    null
  );
}

/** A GeoJSON collection of the areas that have a boundary, for the 3D sector blocks. */
export function outlineCollection(areas) {
  return {
    type: "FeatureCollection",
    features: areas
      .filter((a) => a.outline)
      .map((a) => ({ type: "Feature", id: a.id, properties: { value: a.value, colour: ZONE_COLOURS[a.zone] || "#00a79d" }, geometry: a.outline })),
  };
}

/* ---------------------------------------------------- a real street */

// road classes (OpenMapTiles schema) that are a street you could stand in, best first
const STREET_PENALTY = { residential: 0, minor: 0, street: 0, living_street: 0, tertiary: 8, secondary: 18, service: 26, primary: 34 };
const M_LAT = 110540;
const mLng = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);
const metres = (a, b) => Math.hypot((b[0] - a[0]) * mLng(a[1]), (b[1] - a[1]) * M_LAT);
const bearingOf = (a, b) => ((Math.atan2((b[0] - a[0]) * mLng(a[1]), (b[1] - a[1]) * M_LAT) * 180) / Math.PI + 360) % 360;

/** A polyline you can walk: position and heading at any distance along it. */
function walkable(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i += 1) cum.push(cum[i - 1] + metres(points[i - 1], points[i]));
  const length = cum[cum.length - 1];
  const at = (d) => {
    const t = Math.min(Math.max(d, 0), length);
    let i = 1;
    while (i < cum.length - 1 && cum[i] < t) i += 1;
    const span = cum[i] - cum[i - 1] || 1;
    const f = (t - cum[i - 1]) / span;
    const a = points[i - 1];
    const b = points[i];
    return { lng: a[0] + (b[0] - a[0]) * f, lat: a[1] + (b[1] - a[1]) * f, bearing: bearingOf(a, b) };
  };
  return { length, at };
}

const linesOf = (g) => (g?.type === "LineString" ? [g.coordinates] : g?.type === "MultiLineString" ? g.coordinates : []);

/**
 * From the road features the map is drawing around `center`, picks the nearest
 * real street that runs far enough to line homes along, and returns it as a
 * walkable stretch heading away from the centre. null when there is none.
 */
export function pickStreet(features, center, maxLength = 340, minLength = 120) {
  const here = [center.lng, center.lat];
  const candidates = [];
  for (const f of features || []) {
    const penalty = STREET_PENALTY[f.properties?.class];
    if (penalty === undefined) continue;
    for (const line of linesOf(f.geometry)) {
      if (line.length < 2) continue;
      let best = { d: Infinity, k: 0 };
      line.forEach((pt, k) => {
        const d = metres(here, pt);
        if (d < best.d) best = { d, k };
      });
      candidates.push({ line, k: best.k, score: best.d + penalty });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  for (const c of candidates.slice(0, 12)) {
    const forward = walkable(c.line.slice(c.k));
    const backward = walkable(c.line.slice(0, c.k + 1).reverse());
    const pick = forward.length >= backward.length ? forward : backward;
    if (pick.length >= minLength) return { at: pick.at, length: Math.min(pick.length, maxLength) };
  }
  return null;
}

/** Homes in pairs down the street (one each side), cheapest nearest the camera. */
export function streetPlots(street, count, offset = 23) {
  const pairs = Math.ceil(count / 2);
  const gap = pairs > 1 ? Math.min(38, (street.length - 46) / (pairs - 1)) : 0;
  return Array.from({ length: count }).map((_, i) => {
    const pair = Math.floor(i / 2);
    const side = i % 2 === 0 ? -1 : 1;
    const p = street.at(30 + pair * gap);
    const east = Math.sin(((p.bearing + 90 * side) * Math.PI) / 180) * offset;
    const north = Math.cos(((p.bearing + 90 * side) * Math.PI) / 180) * offset;
    return { ...offsetMeters(p, east, north), depth: pair, pairs };
  });
}
