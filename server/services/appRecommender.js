/**
 * "For You" recommender for the GgnHome Android app.
 *
 * Signals (strongest first): enquiries, saves, views, search history, and —
 * for guests — a list of recently viewed ids the app sends along. Each signal
 * is weighted by recency (30-day half-life) and distilled into a taste
 * profile: sector affinity, budget band per listing type, bedrooms,
 * property type, furnishing and rent-vs-buy lean.
 *
 * Candidates are the active listings the public site shows. Each is scored on sector,
 * budget fit, bedrooms, type/furnishing, quality (ranking.score), freshness
 * and popularity. A diversity pass keeps one sector/type from flooding the
 * list. Cold-start users (no signals) get quality + popularity + freshness.
 */
const NodeCache = require("node-cache");
const mongoose = require("mongoose");
const Rentalproperty = require("../models/Rentalproperty.model");
const SaleProperty = require("../models/SaleProperty.model");
const PropertyAnalysis = require("../models/PropertyAnalysis.model");
const Enquiry = require("../models/EnquirySchema.model");
const SearchHistory = require("../models/SearchHistory.model");

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120, useClones: false });

const DAY = 24 * 60 * 60 * 1000;
const HALF_LIFE_DAYS = 30;
const SIGNAL_WEIGHT = { enquiry: 4, save: 3, view: 1, search: 1.5, recent: 1.2 };
const LIST_FIELDS =
  "title Sector location bedrooms bathrooms images price monthlyRent totalArea propertyType furnishing ranking createdAt isActive";

const MODELS = { rental: Rentalproperty, sale: SaleProperty };
const priceOf = (type, p) => (type === "rental" ? p.monthlyRent : p.price) || 0;
const isId = (v) => mongoose.Types.ObjectId.isValid(String(v));
const decay = (date) => {
  const ageDays = Math.max(0, (Date.now() - new Date(date || Date.now()).getTime()) / DAY);
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
};
const sectorKey = (s) => String(s || "").trim().toLowerCase();

function formatPrice(type, value) {
  if (!value) return "On request";
  if (type === "rental") return `₹${Math.round(value).toLocaleString("en-IN")}/mo`;
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1).replace(/\.0$/, "")} L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function shape(type, p, extra = {}) {
  const price = priceOf(type, p);
  return {
    id: String(p._id),
    type,
    path: `/${type === "rental" ? "Rentaldetails" : "Saledetails"}/${p._id}`,
    title: p.title,
    sector: p.Sector,
    location: p.location,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    areaSqft: p.totalArea?.sqft,
    configuration: p.totalArea?.configuration,
    image: Array.isArray(p.images) ? p.images[0] : undefined,
    price,
    priceLabel: formatPrice(type, price),
    furnishing: p.furnishing,
    createdAt: p.createdAt,
    ...extra,
  };
}

/** Pull every interaction we know about into plain events. */
async function collectEvents(userId, recent) {
  const events = [];
  const since = new Date(Date.now() - 120 * DAY);

  if (userId && isId(userId)) {
    const uid = new mongoose.Types.ObjectId(String(userId));
    const [analyses, enquiries, searches] = await Promise.all([
      PropertyAnalysis.find({ $or: [{ "saves.user": uid }, { "views.user": uid }] })
        .select("property views saves")
        .sort({ updatedAt: -1 })
        .limit(150)
        .lean(),
      Enquiry.find({ userId: uid }).select("propertyId propertyType createdAt").sort({ createdAt: -1 }).limit(60).lean(),
      SearchHistory.find({ user: uid, createdAt: { $gte: since } }).select("query createdAt").sort({ createdAt: -1 }).limit(40).lean(),
    ]);

    analyses.forEach((a) => {
      (a.saves || []).filter((s) => String(s.user) === String(uid)).forEach((s) =>
        events.push({ id: String(a.property), kind: "save", at: s.savedAt })
      );
      (a.views || []).filter((v) => String(v.user) === String(uid)).slice(-3).forEach((v) =>
        events.push({ id: String(a.property), kind: "view", at: v.viewedAt })
      );
    });
    enquiries.forEach((e) =>
      events.push({ id: String(e.propertyId), type: e.propertyType, kind: "enquiry", at: e.createdAt })
    );
    searches.forEach((s) => events.push({ kind: "search", query: s.query, at: s.createdAt }));
  }

  (recent || []).slice(0, 25).forEach((r, i) =>
    events.push({ id: r.id, type: r.type, kind: "recent", at: new Date(Date.now() - i * 3600e3) })
  );
  return events;
}

/** Resolve property documents (either model) for event ids. */
async function hydrate(events) {
  const ids = [...new Set(events.filter((e) => e.id && isId(e.id)).map((e) => e.id))];
  if (!ids.length) return new Map();
  const [rentals, sales] = await Promise.all([
    Rentalproperty.find({ _id: { $in: ids } }).select(LIST_FIELDS).lean(),
    SaleProperty.find({ _id: { $in: ids } }).select(LIST_FIELDS).lean(),
  ]);
  const map = new Map();
  rentals.forEach((p) => map.set(String(p._id), { type: "rental", doc: p }));
  sales.forEach((p) => map.set(String(p._id), { type: "sale", doc: p }));
  return map;
}

function weightedMedian(pairs) {
  if (!pairs.length) return null;
  const sorted = [...pairs].sort((a, b) => a.v - b.v);
  const total = sorted.reduce((s, p) => s + p.w, 0);
  let acc = 0;
  for (const p of sorted) {
    acc += p.w;
    if (acc >= total / 2) return p.v;
  }
  return sorted[sorted.length - 1].v;
}

async function buildProfile(events) {
  const map = await hydrate(events);
  const sectors = {};
  const beds = {};
  const kinds = {};
  const furn = {};
  const prices = { rental: [], sale: [] };
  const typeWeight = { rental: 0, sale: 0 };
  const seen = new Set();
  const saved = new Set();
  let total = 0;

  events.forEach((e) => {
    const w = (SIGNAL_WEIGHT[e.kind] || 1) * decay(e.at);
    if (e.kind === "search") {
      const m = String(e.query || "").toLowerCase().match(/sector\s*-?\s*(\d+[a-z]?)/);
      if (m) {
        sectors[`sector ${m[1]}`] = (sectors[`sector ${m[1]}`] || 0) + w;
        total += w;
      }
      return;
    }
    const hit = map.get(String(e.id));
    if (!hit) return;
    const { type, doc } = hit;
    seen.add(String(doc._id));
    if (e.kind === "save") saved.add(String(doc._id));
    total += w;
    typeWeight[type] += w;
    if (doc.Sector) sectors[sectorKey(doc.Sector)] = (sectors[sectorKey(doc.Sector)] || 0) + w;
    if (doc.bedrooms != null) beds[doc.bedrooms] = (beds[doc.bedrooms] || 0) + w;
    if (doc.propertyType) kinds[doc.propertyType] = (kinds[doc.propertyType] || 0) + w;
    if (doc.furnishing) furn[doc.furnishing] = (furn[doc.furnishing] || 0) + w;
    const price = priceOf(type, doc);
    if (price) prices[type].push({ v: price, w });
  });

  const norm = (obj) => {
    const max = Math.max(0, ...Object.values(obj));
    const out = {};
    Object.entries(obj).forEach(([k, v]) => (out[k] = max ? v / max : 0));
    return out;
  };
  const tw = typeWeight.rental + typeWeight.sale;

  return {
    warm: total > 0.5,
    sectors: norm(sectors),
    beds: norm(beds),
    kinds: norm(kinds),
    furn: norm(furn),
    medianPrice: { rental: weightedMedian(prices.rental), sale: weightedMedian(prices.sale) },
    typeLean: tw ? typeWeight.rental / tw : 0.5,
    seen,
    saved,
  };
}

async function loadCandidates(type, profile) {
  const Model = MODELS[type];
  // The public site lists every isActive listing (ranking.status is set by the
  // scraper pipeline and is not used for visibility), so match that here.
  const base = { isActive: true };
  const topSectors = Object.entries(profile.sectors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => new RegExp(`^${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));

  const queries = [
    Model.find(base).select(LIST_FIELDS).sort({ "ranking.score": -1, createdAt: -1 }).limit(120).lean(),
    Model.find(base).select(LIST_FIELDS).sort({ createdAt: -1 }).limit(80).lean(),
  ];
  if (topSectors.length) {
    queries.push(Model.find({ ...base, Sector: { $in: topSectors } }).select(LIST_FIELDS).sort({ "ranking.score": -1 }).limit(150).lean());
  }
  const lists = await Promise.all(queries);
  const byId = new Map();
  lists.flat().forEach((p) => byId.set(String(p._id), p));
  return [...byId.values()];
}

async function popularityCounts(ids) {
  if (!ids.length) return new Map();
  const since = new Date(Date.now() - 14 * DAY);
  const rows = await PropertyAnalysis.aggregate([
    { $match: { property: { $in: ids.map((i) => new mongoose.Types.ObjectId(String(i))) } } },
    {
      $project: {
        property: 1,
        views: { $size: { $filter: { input: "$views", as: "v", cond: { $gte: ["$$v.viewedAt", since] } } } },
        saves: { $size: { $filter: { input: "$saves", as: "s", cond: { $gte: ["$$s.savedAt", since] } } } },
      },
    },
  ]);
  const map = new Map();
  rows.forEach((r) => map.set(String(r.property), r.views + r.saves * 3));
  return map;
}

function score(type, p, profile, pop, popMax) {
  const imgCount = Array.isArray(p.images) ? p.images.length : 0;
  const rankScore = (p.ranking?.score || 0) / 100;
  const quality = Math.min(1, rankScore > 0 ? rankScore : 0.25 + Math.min(imgCount, 6) * 0.1);
  const ageDays = (Date.now() - new Date(p.createdAt).getTime()) / DAY;
  const fresh = Math.pow(0.5, Math.max(0, ageDays) / 14);
  const popular = popMax ? Math.min(1, (pop || 0) / popMax) : 0;

  if (!profile.warm) {
    return {
      total: 0.5 * quality + 0.25 * fresh + 0.25 * popular,
      why: popular > 0.4 ? "Popular right now" : fresh > 0.7 ? "New on GgnHome" : "Top rated",
    };
  }

  const sector = profile.sectors[sectorKey(p.Sector)] || 0;
  const bed = p.bedrooms != null ? profile.beds[p.bedrooms] || 0 : 0;
  const kind = p.propertyType ? profile.kinds[p.propertyType] || 0 : 0;
  const furn = p.furnishing ? profile.furn[p.furnishing] || 0 : 0;
  const median = profile.medianPrice[type];
  const price = priceOf(type, p);
  const budget = median && price ? Math.max(0, 1 - Math.abs(price - median) / (median * 0.6)) : 0.4;
  const lean = type === "rental" ? profile.typeLean : 1 - profile.typeLean;
  const leanBoost = 0.6 + 0.4 * lean; // soft nudge, never hides the other type

  const raw = 0.3 * sector + 0.2 * budget + 0.12 * bed + 0.08 * (0.6 * kind + 0.4 * furn) + 0.12 * quality + 0.1 * fresh + 0.08 * popular;
  let total = raw * leanBoost;
  if (profile.seen.has(String(p._id))) total *= 0.55; // already looked at it
  if (profile.saved.has(String(p._id))) total = 0; // already saved

  let why = "Picked for you";
  if (sector > 0.6) why = `Because you like ${p.Sector}`;
  else if (budget > 0.75 && median) why = "Right in your budget";
  else if (bed > 0.7) why = `${p.bedrooms} BHK like ones you viewed`;
  else if (popular > 0.5) why = "Popular right now";
  else if (fresh > 0.7) why = "New on GgnHome";
  return { total, why };
}

/** Keep the list varied: <=3 per sector, no single type flooding the head. */
function diversify(items, limit) {
  const out = [];
  const perSector = {};
  const perType = {};
  const rest = [];
  const typeCap = Math.max(8, Math.ceil(limit * 0.7));
  for (const it of items) {
    const sk = sectorKey(it.sector);
    if ((perSector[sk] || 0) >= 3 || (perType[it.type] || 0) >= typeCap) {
      rest.push(it);
      continue;
    }
    perSector[sk] = (perSector[sk] || 0) + 1;
    perType[it.type] = (perType[it.type] || 0) + 1;
    out.push(it);
    if (out.length >= limit) return out;
  }
  return out.concat(rest).slice(0, limit);
}

async function getRecommendations({ userId, recent = [], type = "all", limit = 20 }) {
  const key = `rec:${userId || "guest"}:${type}:${limit}:${recent.map((r) => r.id).join(",")}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const events = await collectEvents(userId, recent);
  const profile = await buildProfile(events);
  const types = type === "all" ? ["rental", "sale"] : [type];

  const pools = await Promise.all(types.map((t) => loadCandidates(t, profile)));
  const pop = await popularityCounts(pools.flat().map((p) => p._id)).catch(() => new Map());
  const popMax = Math.max(0, ...pop.values());

  const scored = [];
  pools.forEach((list, i) => {
    const t = types[i];
    list.forEach((p) => {
      const s = score(t, p, profile, pop.get(String(p._id)), popMax);
      if (s.total > 0) scored.push(shape(t, p, { score: Number(s.total.toFixed(4)), reason: s.why }));
    });
  });
  scored.sort((a, b) => b.score - a.score);

  // Scrapers re-post the same flat; keep only the best-scored copy of each.
  const dupeSeen = new Set();
  for (let i = scored.length - 1; i >= 0; i--) {
    const it = scored[i];
    const k = `${it.type}|${sectorKey(it.sector)}|${it.bedrooms}|${it.price}|${it.areaSqft}`;
    if (dupeSeen.has(k)) scored.splice(i, 1);
    else dupeSeen.add(k);
  }

  const forYou = diversify(scored, limit);
  const forYouIds = new Set(forYou.map((p) => p.id));

  const trending = scored
    .filter((p) => !forYouIds.has(p.id))
    .map((p) => ({ ...p, _pop: pop.get(p.id) || 0 }))
    .sort((a, b) => b._pop - a._pop || b.score - a.score)
    .slice(0, 10)
    .map(({ _pop, ...p }) => ({ ...p, reason: "Popular right now" }));

  const fresh = [...scored]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map((p) => ({ ...p, reason: "New on GgnHome" }));

  const result = {
    personalised: profile.warm,
    sections: [
      { id: "for-you", title: profile.warm ? "Picked for you" : "Top picks", items: forYou },
      { id: "trending", title: "Popular right now", items: trending },
      { id: "new", title: "Just listed", items: fresh },
    ].filter((s) => s.items.length),
  };
  cache.set(key, result);
  return result;
}

/** Most-engaged listings of the last 7 days (views + 3x saves), for pushes. */
async function getPopularProperties(limit = 10) {
  const since = new Date(Date.now() - 7 * DAY);
  const rows = await PropertyAnalysis.aggregate([
    {
      $project: {
        property: 1,
        v: { $size: { $filter: { input: "$views", as: "v", cond: { $gte: ["$$v.viewedAt", since] } } } },
        s: { $size: { $filter: { input: "$saves", as: "s", cond: { $gte: ["$$s.savedAt", since] } } } },
      },
    },
    { $addFields: { heat: { $add: ["$v", { $multiply: ["$s", 3] }] } } },
    { $match: { heat: { $gt: 0 } } },
    { $sort: { heat: -1 } },
    { $limit: limit * 3 },
  ]);
  if (!rows.length) return [];
  const map = await hydrate(rows.map((r) => ({ id: String(r.property) })));
  const out = [];
  for (const r of rows) {
    const hit = map.get(String(r.property));
    if (!hit || !hit.doc.isActive) continue;
    out.push({ ...shape(hit.type, hit.doc), heat: r.heat });
    if (out.length >= limit) break;
  }
  return out;
}

module.exports = { getRecommendations, getPopularProperties, formatPrice };
