/**
 * Builds client/src/data/gurgaonSectors.json: every sector of Gurgaon (1–115
 * and the lettered ones) plus every locality the quest knows, geocoded with
 * LocationIQ (OpenStreetMap data) — a centre point, a bounding box and, where
 * OSM has it, a simplified boundary outline. The quest's 3D map reads this file,
 * so the browser never geocodes anything.
 *
 * Usage (from server/): node scripts/geocodeGurgaonSectors.js
 * Needs LOCATIONIQ_KEY or LOCATIONIQ_API_KEY. Re-run whenever the list changes;
 * areas that are not found are reported and left out.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { providerConfig } = require("../services/nearbyPlaces.service");

const OUT = path.join(__dirname, "../../client/src/data/gurgaonSectors.json");
const FLOW = require("../../client/src/data/questFlow.json");
const VIEWBOX = "76.75,28.62,77.25,28.20";
const LETTERED = ["3A", "4A", "9A", "10A", "23A", "37C", "37D", "88A", "88B", "89A", "89B", "95A", "95B", "99A"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n) => Math.round(Number(n) * 1e5) / 1e5;

// degrees; ~3 km. Larger outlines (a town, a tehsil) are kept as a point only.
const MAX_OUTLINE_SPAN = 0.035;
// degrees; ~22 km. Anything bigger is a district-level match, not a locality.
const MAX_LOCALITY_SPAN = 0.2;
const bboxSpan = (x) => {
  const b = (x.boundingbox || []).map(Number);
  return b.length === 4 ? Math.max(b[1] - b[0], b[3] - b[2]) : 0;
};

const distance = (a, b) => Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((28.45 * Math.PI) / 180));

function roundGeometry(g) {
  if (!g || !["Polygon", "MultiPolygon"].includes(g.type)) return null;
  const ring = (r) => r.map(([x, y]) => [round(x), round(y)]);
  return g.type === "Polygon" ? { type: g.type, coordinates: g.coordinates.map(ring) } : { type: g.type, coordinates: g.coordinates.map((p) => p.map(ring)) };
}

async function geocode(provider, name, isSector) {
  for (const city of ["Gurugram", "Gurgaon"]) {
    const hit = await geocodeOnce(provider, name, isSector, city);
    if (hit) return hit;
    await sleep(550);
  }
  // a few old sectors are only mapped in parts ("Sector 15 Part 1")
  if (isSector) {
    for (const part of ["Part 1", "Part 2"]) {
      const hit = await geocodeOnce(provider, `${name} ${part}`, false, "Gurugram");
      if (hit && new RegExp(`\\b${name}\\s+${part}\\b`, "i").test(hit.display_name || "")) return hit;
      await sleep(550);
    }
  }
  return null;
}

async function geocodeOnce(provider, name, isSector, city) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { data } = await axios.get(`${provider.base}/search.php`, {
        params: { key: provider.key, q: `${name}, ${city}, Haryana`, format: "json", limit: 5, countrycodes: "in", viewbox: VIEWBOX, bounded: 1, polygon_geojson: 1, polygon_threshold: 0.0003 },
        timeout: 10000,
      });
      const list = Array.isArray(data) ? data : [];
      // a locality must not resolve to the whole district or tehsil
      if (!isSector) return list.find((x) => bboxSpan(x) < MAX_LOCALITY_SPAN) || null;
      // a sector must really be that sector: "Sector 5" must not land on "Sector 56"
      const n = name.replace(/^Sector\s*/i, "");
      const re = new RegExp(`\\bsector[\\s-]*0*${n}(?![0-9a-z])`, "i");
      // IMT Manesar numbers its own low sectors (1, 3, 15…); OSM files Gurgaon's
      // real sectors 76–86 under "Manesar" too. Prefer a match outside Manesar,
      // and take a "Manesar" one only for Gurgaon's high-numbered sectors.
      const hits = list.filter((x) => re.test(x.display_name || ""));
      const manesar = (x) => /manesar|\bimt\b/i.test(x.display_name || "");
      return hits.find((x) => !manesar(x)) || (parseInt(n, 10) >= 60 ? hits[0] : null) || null;
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) return null; // "Unable to geocode"
      if (status === 429 || !status) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  return null;
}

async function main() {
  const provider = providerConfig();
  if (!provider) throw new Error("Set LOCATIONIQ_KEY (or LOCATIONIQ_API_KEY) first.");
  const zones = FLOW.missions.find((m) => m.slot === "location").zones;

  const wanted = new Map(); // value -> { label, zone }
  for (let i = 1; i <= 115; i += 1) wanted.set(`Sector ${i}`, { label: `Sector ${i}`, zone: null });
  for (const s of LETTERED) wanted.set(`Sector ${s}`, { label: `Sector ${s}`, zone: null });
  for (const z of zones) for (const o of z.options) wanted.set(o.value, { label: o.label, zone: z.id });

  const areas = [];
  const missing = [];
  let done = 0;
  for (const [value, meta] of wanted) {
    const isSector = /^Sector\s+\d+[A-Z]?$/i.test(value);
    const hit = await geocode(provider, value, isSector);
    done += 1;
    if (hit) {
      const point = { lat: round(hit.lat), lng: round(hit.lon) };
      const zone = meta.zone || [...zones].sort((a, b) => distance(point, a) - distance(point, b))[0].id;
      const bb = (hit.boundingbox || []).map(round); // [south, north, west, east]
      areas.push({ value, label: meta.label, zone, kind: isSector ? "sector" : "locality", ...point, bbox: bb.length === 4 ? bb : null, outline: bboxSpan(hit) <= MAX_OUTLINE_SPAN ? roundGeometry(hit.geojson) : null });
    } else missing.push(value);
    process.stdout.write(`\r${done}/${wanted.size} geocoded, ${missing.length} not found`);
    await sleep(550); // LocationIQ free tier: 2 requests a second
  }
  process.stdout.write("\n");

  const sectorNo = (v) => Number((v.match(/^Sector\s+(\d+)/i) || [])[1]) || Infinity;
  areas.sort((a, b) => sectorNo(a.value) - sectorNo(b.value) || a.value.localeCompare(b.value));
  fs.writeFileSync(
    OUT,
    `${JSON.stringify({ version: 1, source: "LocationIQ geocoding of OpenStreetMap data", generatedAt: new Date().toISOString().slice(0, 10), areas })}\n`
  );
  console.log(`Wrote ${areas.length} areas (${areas.filter((a) => a.outline).length} with outlines) to ${path.relative(process.cwd(), OUT)}`);
  if (missing.length) console.log(`Not found: ${missing.join(", ")}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
