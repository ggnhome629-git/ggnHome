/**
 * Server-side LocationIQ address lookups for the partner listing form:
 *   - reverseGeocode(lat, lon): phone GPS -> address, sector, pincode
 *   - suggestAddresses(q):      typed text -> up to 6 Gurugram address suggestions
 *
 * The API key stays on the server. Results are cached in small bounded maps to
 * stay inside the LocationIQ free tier.
 */
const axios = require("axios");
const { providerConfig, haversineMeters } = require("./nearbyPlaces.service");

// Box around Gurugram (left, top, right, bottom) so suggestions stay in the city.
const GURUGRAM_VIEWBOX = "76.75,28.62,77.25,28.20";
const GURUGRAM_CENTER = { lat: 28.4595, lon: 77.0266 };
const SERVICE_RADIUS_M = 40000;

const CACHE_MAX = 400;
const reverseCache = new Map();
const suggestCache = new Map();
const cacheGet = (map, key) => {
  const hit = map.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    map.delete(key);
    return null;
  }
  return hit.value;
};
const cacheSet = (map, key, value, ttlMs) => {
  if (map.size >= CACHE_MAX) map.delete(map.keys().next().value);
  map.set(key, { value, expires: Date.now() + ttlMs });
};

const notConfigured = () => {
  const err = new Error("Location lookup is not configured. Please type the address.");
  err.status = 503;
  return err;
};

const DROP_PARTS = /^(india|haryana|gurugram district|gurgaon district|gurugram division|gurgaon division)$/i;

// "A, B, Sector 57, Gurugram, Haryana, 122003, India" -> "A, B, Sector 57, Gurugram"
function shortLabel(displayName) {
  return String(displayName || "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !DROP_PARTS.test(part) && !/^\d{6}$/.test(part))
    .slice(0, 6)
    .join(", ")
    .slice(0, 300);
}

// Gurugram addresses are organised by sector: pull "Sector 57" (or "DLF Phase 3") out of the address.
function deriveSector(addr = {}, displayName = "") {
  const hay = [addr.suburb, addr.neighbourhood, addr.residential, addr.city_district, addr.road, addr.name, displayName]
    .filter(Boolean)
    .join(", ");
  const sector = hay.match(/\bsector[\s-]*(\d{1,3})([A-Za-z])?(?![A-Za-z0-9])/i);
  if (sector) return `Sector ${sector[1]}${sector[2] ? sector[2].toUpperCase() : ""}`;
  const phase = hay.match(/\bDLF\s+Phase[\s-]*(\d)/i);
  if (phase) return `DLF Phase ${phase[1]}`;
  return String(addr.suburb || addr.neighbourhood || addr.residential || addr.city_district || "").trim().slice(0, 80);
}

const inServiceArea = (lat, lon) => haversineMeters(lat, lon, GURUGRAM_CENTER.lat, GURUGRAM_CENTER.lon) <= SERVICE_RADIUS_M;

async function reverseGeocode(latitude, longitude) {
  const provider = providerConfig();
  if (!provider) throw notConfigured();

  const lat = Number(latitude);
  const lon = Number(longitude);
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = cacheGet(reverseCache, cacheKey);
  if (cached) return cached;

  let data;
  try {
    ({ data } = await axios.get(`${provider.base}/reverse.php`, {
      params: { key: provider.key, lat, lon, format: "json", addressdetails: 1, zoom: 18, normalizeaddress: 1, "accept-language": "en" },
      timeout: 6000,
    }));
  } catch (err) {
    if (err.response && err.response.status === 404) {
      const notFound = new Error("We could not find an address for this location. Please type the address.");
      notFound.status = 404;
      throw notFound;
    }
    throw err;
  }

  const addr = data.address || {};
  const result = {
    address: shortLabel(data.display_name),
    sector: deriveSector(addr, data.display_name),
    city: String(addr.city || addr.town || addr.state_district || "").slice(0, 80),
    pincode: String(addr.postcode || "").slice(0, 10),
    latitude: lat,
    longitude: lon,
    inServiceArea: inServiceArea(lat, lon),
  };
  cacheSet(reverseCache, cacheKey, result, 24 * 60 * 60 * 1000);
  return result;
}

async function suggestAddresses(query) {
  const provider = providerConfig();
  if (!provider) throw notConfigured();

  const q = String(query || "").trim().slice(0, 120);
  if (q.length < 3) return [];
  const cacheKey = q.toLowerCase();
  const cached = cacheGet(suggestCache, cacheKey);
  if (cached) return cached;

  let data;
  try {
    ({ data } = await axios.get(`${provider.base}/autocomplete.php`, {
      params: { key: provider.key, q, limit: 6, countrycodes: "in", viewbox: GURUGRAM_VIEWBOX, bounded: 1, dedupe: 1, normalizecity: 1, "accept-language": "en" },
      timeout: 5000,
    }));
  } catch (err) {
    if (err.response && err.response.status === 404) return []; // LocationIQ answers 404 for "no matches"
    throw err;
  }

  const suggestions = (Array.isArray(data) ? data : [])
    .map((item) => ({
      label: shortLabel(item.display_name),
      sector: deriveSector(item.address, item.display_name),
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    }))
    .filter((s) => s.label && Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
  cacheSet(suggestCache, cacheKey, suggestions, 60 * 60 * 1000);
  return suggestions;
}

module.exports = { reverseGeocode, suggestAddresses, deriveSector, shortLabel };
