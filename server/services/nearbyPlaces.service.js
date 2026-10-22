/**
 * Server-side LocationIQ lookup for the six nearby parameters. The API key
 * stays on the server (the old /api/locationqapi key endpoint is retired).
 *
 * Distances are straight-line (haversine) estimates, never road distances.
 * Results are cached in a small bounded in-memory map to stay well inside the
 * LocationIQ free tier and the 512 MB Render instance.
 */
const axios = require("axios");
const { NEARBY_PARAMETERS } = require("../config/propertyParameters");

const CACHE_MAX = 300;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map();

const cacheGet = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
};

const cacheSet = (key, value) => {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
};

const toRad = (n) => (n * Math.PI) / 180;
function haversineMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function providerConfig() {
  const key = process.env.LOCATIONIQ_KEY || process.env.LOCATIONIQ_API_KEY;
  const region = (process.env.LOCATIONIQ_REGION || "us1").toLowerCase() === "eu1" ? "eu1" : "us1";
  return key ? { key, base: `https://${region}.locationiq.com/v1` } : null;
}

/**
 * @param {{ address?: string, sector?: string, latitude?: number, longitude?: number }} input
 * @returns {Promise<{ latitude, longitude, amenities: Array, approximate: true }>}
 */
async function findNearbyParameters({ address, sector, latitude, longitude }) {
  const provider = providerConfig();
  if (!provider) {
    const err = new Error("Nearby lookup is not configured. Enter nearby places manually.");
    err.status = 503;
    throw err;
  }

  let lat = Number(latitude);
  let lon = Number(longitude);
  const query = [address, sector, "Gurugram, Haryana, India"].map((s) => String(s || "").trim()).filter(Boolean).join(", ").slice(0, 300);
  const cacheKey = Number.isFinite(lat) && Number.isFinite(lon) ? `ll:${lat.toFixed(4)},${lon.toFixed(4)}` : `q:${query.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const geo = await axios.get(`${provider.base}/search.php`, {
      params: { key: provider.key, q: query, format: "json", limit: 1, countrycodes: "in" },
      timeout: 6000,
    });
    if (!Array.isArray(geo.data) || !geo.data[0]) {
      const err = new Error("Address not found. Add a more complete address.");
      err.status = 404;
      throw err;
    }
    lat = Number(geo.data[0].lat);
    lon = Number(geo.data[0].lon);
  }

  const near = await axios.get(`${provider.base}/nearby.php`, {
    params: {
      key: provider.key,
      lat,
      lon,
      tag: "amenity,shop,leisure,railway,public_transport,healthcare,education",
      radius: 3000,
      format: "json",
    },
    timeout: 6000,
  });
  const places = Array.isArray(near.data) ? near.data : [];

  const amenities = NEARBY_PARAMETERS.map((param) => {
    const best = places
      .filter((p) => p && p.lat && p.lon && param.query.test(`${p.name || ""} ${p.type || ""} ${p.class || ""}`))
      .map((p) => ({ p, d: haversineMeters(lat, lon, Number(p.lat), Number(p.lon)) }))
      .sort((a, b) => a.d - b.d)[0];
    if (!best) return { category: param.key, label: param.label, name: "", distanceMeters: null, source: "locationiq", found: false };
    return {
      category: param.key,
      label: param.label,
      name: String(best.p.name || param.label).slice(0, 160),
      distanceMeters: best.d,
      latitude: Number(best.p.lat),
      longitude: Number(best.p.lon),
      source: "locationiq",
      found: true,
    };
  });

  const result = { latitude: lat, longitude: lon, amenities, approximate: true, distanceType: "straight_line" };
  cacheSet(cacheKey, result);
  return result;
}

/**
 * Every useful place around a point, grouped by the property parameters
 * (metro, hospital, school, …): up to `perCategory` per group, nearest first.
 * Used by the quest's map to draw amenities around the sectors a visitor picked.
 */
async function listNearbyPlaces({ latitude, longitude, radius = 2500, perCategory = 6 }) {
  const provider = providerConfig();
  if (!provider) {
    const err = new Error("Nearby lookup is not configured.");
    err.status = 503;
    throw err;
  }
  const lat = Number(latitude);
  const lon = Number(longitude);
  const cacheKey = `list:${lat.toFixed(3)},${lon.toFixed(3)}:${radius}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const nearby = async (tag, r, retried = false) => {
    try {
      const { data } = await axios.get(`${provider.base}/nearby.php`, { params: { key: provider.key, lat, lon, tag, radius: r, limit: 50, format: "json" }, timeout: 8000 });
      return (Array.isArray(data) ? data : []).filter((p) => p && p.lat && p.lon);
    } catch (err) {
      if (err.response?.status === 404) return []; // "No results found"
      if (err.response?.status === 429 && !retried) {
        await new Promise((res) => setTimeout(res, 1200));
        return nearby(tag, r, true);
      }
      throw err;
    }
  };
  // The general search fills up with shops and clinics within 50 results, so
  // stations get their own wider search (Gurgaon's metro stops are often named
  // just "Sector 55–56", hence no name test for them).
  // Parks get one too: a greengrocer's "green" otherwise passes for a park.
  // One after another, to stay inside LocationIQ's requests-per-second limit.
  const pause = () => new Promise((r) => setTimeout(r, 350));
  const general = await nearby("amenity,shop,healthcare,education", radius);
  await pause();
  const stations = await nearby("railway:station,railway:halt", Math.max(radius, 5000));
  await pause();
  const parks = await nearby("leisure:park,leisure:garden,leisure:playground", radius);
  const pool = { metro: stations, park: parks };
  const seen = new Set();
  const groups = NEARBY_PARAMETERS.map((param) => {
    const items = (pool[param.key] || general)
      .filter((p) => pool[param.key] || param.query.test(`${p.name || ""} ${p.type || ""} ${p.class || ""}`))
      .map((p) => ({
        name: String(p.name || param.short || param.label).slice(0, 120),
        latitude: Number(p.lat),
        longitude: Number(p.lon),
        distanceMeters: Math.round(haversineMeters(lat, lon, Number(p.lat), Number(p.lon))),
      }))
      .filter((p) => {
        const key = `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, perCategory);
    return { category: param.key, label: param.short || param.label, items };
  });
  const result = { latitude: lat, longitude: lon, radius, groups, distanceType: "straight_line" };
  cacheSet(cacheKey, result);
  return result;
}

module.exports = { findNearbyParameters, listNearbyPlaces, haversineMeters, providerConfig };
