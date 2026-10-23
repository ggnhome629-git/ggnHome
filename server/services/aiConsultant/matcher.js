/**
 * Deterministic property matching for the AI Property Consultant.
 *
 *   1. Hard filters in MongoDB (mode, live/approved, location, budget, BHK).
 *   2. Transparent scoring in JS using the PRD's initial weights:
 *        budget 30 · location 25 · configuration 15 · type+furnishing 10
 *        verified amenities (6 nearby params + corner) 10 · quality+freshness 10
 *   3. Explanations built only from the listing document and the score —
 *      never from a language model.
 *
 * Missing listing data never scores high; unverified distances score zero
 * and are reported as "not verified".
 */
const RentalProperty = require("../../models/Rentalproperty.model");
const SaleProperty = require("../../models/SaleProperty.model");
const { nearestByCategory, NEARBY_PARAMETERS } = require("../../config/propertyParameters");
const { bank, escapeRegex } = require("./questionBank");
const { rupees, formatBudget, formatMeters, formatBhk, typeLabel, furnishingLabel, paramLabel } = require("./format");

const WEIGHTS = { budget: 30, location: 25, config: 15, typeFurnishing: 10, amenity: 10, quality: 10 };
const CANDIDATE_LIMIT = 150;
const PAGE_SIZE = 6;
const STRETCH = 1.1;
const DEFAULT_METERS = Object.fromEntries(NEARBY_PARAMETERS.map((p) => [p.key, p.defaultMeters]));

// Lean projections: one cover image per candidate keeps a 150-listing scan to a
// few hundred KB, comfortable on a 512 MB instance.
const projection = (fields) => ({
  ...Object.fromEntries(fields.split(" ").map((f) => [f, 1])),
  images: { $slice: 1 },
  imageCategories: { $slice: 1 },
});
const RENTAL_FIELDS = projection("title Sector address bedrooms bathrooms totalArea propertyType furnishing monthlyRent tenantRequirements petPolicy moveInDate nearbyAmenities cornerPosition ranking.score createdAt partnerAgentId ownerType");
const SALE_FIELDS = projection("title Sector address location bedrooms bathrooms totalArea propertyType furnishing price possessionStatus nearbyAmenities cornerPosition ranking.score createdAt partnerAgentId ownerType");

const modelFor = (mode) => (mode === "sale" ? SaleProperty : RentalProperty);
const priceField = (mode) => (mode === "sale" ? "price" : "monthlyRent");

const sectorRegex = (id) => {
  const m = String(id).match(/^(\d{1,3})([A-Z])?$/i);
  if (!m) return null;
  const suffix = m[2] ? `\\s*-?\\s*${m[2]}(?![a-z])` : "(?![\\d])";
  return new RegExp(`(^|[^\\d])sector\\s*[-_.]?\\s*0*${m[1]}${suffix}`, "i");
};

function baseFilter() {
  return { isActive: true, "ranking.status": { $nin: ["REJECTED", "QUARANTINED"] } };
}

function locationClause(req) {
  if (req.anywhere) return null;
  const ors = [];
  for (const s of req.sectors || []) {
    const re = sectorRegex(s);
    if (re) ors.push({ Sector: re });
  }
  for (const name of req.localities || []) {
    const re = new RegExp(escapeRegex(name).replace(/\s+/g, "\\s*-?\\s*"), "i");
    ors.push({ Sector: re }, { address: re }, { location: re });
  }
  return ors.length ? { $or: ors } : null;
}

function budgetClause(req) {
  if (req.budgetFlexible) return null;
  const field = priceField(req.mode);
  const cond = {};
  if (Number(req.budgetMax) > 0) cond.$lte = Math.round(req.budgetMax * (req.budgetApprox || req.budgetStretch ? STRETCH : 1));
  if (Number(req.budgetMin) > 0) cond.$gte = Math.round(req.budgetMin * (req.budgetApprox ? 0.9 : 1));
  return Object.keys(cond).length ? { [field]: cond } : null;
}

function bhkClause(req) {
  const values = Array.isArray(req.bhk) ? req.bhk.filter((n) => Number.isInteger(n)) : [];
  if (req.bhkAny || !values.length) return null;
  const ors = [];
  if (values.includes(0)) ors.push({ "totalArea.configuration": /\b1\s*-?\s*RK\b/i }, { propertyType: { $in: ["1RK", "studio"] } });
  const rooms = values.filter((n) => n > 0);
  if (rooms.length) {
    if (req.bhkPlus) {
      const min = Math.min(...rooms);
      ors.push({ bedrooms: { $gte: min } });
      ors.push({ "totalArea.configuration": new RegExp(`\\b0*([${min}-9]|\\d{2})\\s*-?\\s*BHK`, "i") });
    } else {
      ors.push({ bedrooms: { $in: rooms } });
      ors.push({ "totalArea.configuration": new RegExp(`\\b0*(${rooms.join("|")})\\s*-?\\s*BHK`, "i") });
    }
  }
  return ors.length ? { $or: ors } : null;
}

function buildQuery(req, { skip = [] } = {}) {
  const and = [];
  if (!skip.includes("location")) {
    const c = locationClause(req);
    if (c && req.locationScope !== "nearby") and.push(c);
  }
  if (!skip.includes("budget")) {
    const c = budgetClause(req);
    if (c) and.push(c);
  }
  if (!skip.includes("bhk")) {
    const c = bhkClause(req);
    if (c) and.push(c);
  }
  // Explicit property type and furnishing selections are must-haves, not ranking hints.
  if (!skip.includes("type") && !req.propertyTypeAny && Array.isArray(req.propertyType) && req.propertyType.length) {
    const types = req.propertyType.map((t) => t === "apartment" ? ["apartment", "condo"] : [t]).flat();
    and.push({ propertyType: { $in: types } });
  }
  if (!skip.includes("furnishing") && req.mode === "rent" && req.furnishing && req.furnishing !== "any") {
    const accepted = req.furnishing === "semi-furnished" ? ["semi-furnished"] : [req.furnishing];
    and.push({ furnishing: { $in: accepted } });
  }
  if (!skip.includes("position") && ["corner", "middle"].includes(req.corner)) {
    and.push({ cornerPosition: req.corner });
  }
  const filter = baseFilter();
  if (and.length) filter.$and = and;
  return filter;
}

/* ------------------------------------------------------------------ scoring */

const listingPrice = (doc, mode) => Number(mode === "sale" ? doc.price : doc.monthlyRent) || 0;

function listingBedrooms(doc) {
  if (Number.isFinite(Number(doc.bedrooms)) && Number(doc.bedrooms) > 0) return Number(doc.bedrooms);
  const m = String(doc.totalArea?.configuration || "").match(/(\d+)\s*-?\s*BHK/i);
  if (m) return Number(m[1]);
  if (/RK/i.test(String(doc.totalArea?.configuration || "")) || ["1RK", "studio"].includes(doc.propertyType)) return 0;
  return null;
}

function inLocation(doc, req) {
  const hay = `${doc.Sector || ""} ${doc.address || ""} ${doc.location || ""}`;
  for (const s of req.sectors || []) {
    const re = sectorRegex(s);
    if (re && re.test(String(doc.Sector || ""))) return true;
  }
  for (const name of req.localities || []) {
    if (new RegExp(escapeRegex(name).replace(/\s+/g, "\\s*-?\\s*"), "i").test(hay)) return true;
  }
  return false;
}

function scoreListing(doc, req, lang, now) {
  const r = bank.responses.matchReasons;
  const t = (key, vars) => (r[key] ? (r[key][lang] || r[key].en).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : "")) : "");
  // Reasons are grouped so the card leads with what differentiates listings:
  // must-haves first, then verified nearby places/position, then the rest.
  const core = [];
  const near = [];
  const extra = [];
  const caveats = [];
  const parts = {};

  // Budget
  const price = listingPrice(doc, req.mode);
  if (req.budgetFlexible || !(Number(req.budgetMax) > 0)) {
    parts.budget = 0.6;
    if (req.budgetFlexible) core.push(t("budgetFlexible"));
  } else if (price > 0 && price <= req.budgetMax) {
    const ratio = price / req.budgetMax;
    parts.budget = ratio >= 0.6 ? 1 : 0.85;
    core.push(t("budgetWithin", { budget: formatBudget({ budgetMax: req.budgetMax }, req.mode, lang) }));
  } else if (price > 0) {
    parts.budget = 0.55;
    caveats.push(t("budgetSlightlyAbove", { value: rupees(price - req.budgetMax) }));
  } else {
    parts.budget = 0;
  }

  // Location
  if (req.anywhere || (!(req.sectors || []).length && !(req.localities || []).length)) {
    parts.location = 0.7;
    core.push(t("locationAny"));
  } else if (inLocation(doc, req)) {
    parts.location = 1;
    core.push(t("locationExact", { location: doc.Sector || (req.localities || [])[0] || "" }));
  } else {
    parts.location = 0.3;
    caveats.push(t("locationOther", { location: doc.Sector || doc.address || "" }));
  }

  // Configuration
  const beds = listingBedrooms(doc);
  const wanted = (req.bhk || []).filter((n) => Number.isInteger(n));
  if (req.bhkAny || !wanted.length) parts.config = 0.6;
  else if (beds === null) parts.config = 0;
  else if (wanted.includes(beds) || (req.bhkPlus && beds >= Math.min(...wanted))) {
    parts.config = 1;
    core.push(t("bhkExact", { bhk: formatBhk([beds], false, lang) }));
  } else parts.config = 0.2;

  // Type + furnishing
  let tf = 0;
  const types = Array.isArray(req.propertyType) ? req.propertyType : [];
  if (req.propertyTypeAny || !types.length) tf += 0.3;
  else if (doc.propertyType && (types.includes(doc.propertyType) || (types.includes("apartment") && doc.propertyType === "condo"))) {
    tf += 0.5;
    extra.push(t("typeMatch", { type: typeLabel(doc.propertyType, lang) }));
  }
  if (req.mode === "rent") {
    if (!req.furnishing || req.furnishing === "any") tf += 0.3;
    else if (doc.furnishing === req.furnishing) {
      tf += 0.5;
      extra.push(t("furnishingMatch", { value: furnishingLabel(doc.furnishing, lang) }));
    } else if (req.furnishing === "semi-furnished" && doc.furnishing === "furnished") tf += 0.35;
  } else {
    if (!req.possession || req.possession === "any") tf += 0.3;
    else if (doc.possessionStatus === req.possession) tf += 0.5;
  }
  parts.typeFurnishing = Math.min(1, tf);

  // Verified amenities (six nearby parameters) + corner/middle
  const nearest = nearestByCategory(doc.nearbyAmenities);
  const wantedParams = Object.entries(req.priorities || {});
  const amenityScores = [];
  for (const [key, maxMeters] of wantedParams) {
    const limit = Number(maxMeters) > 0 ? Number(maxMeters) : DEFAULT_METERS[key] || 2000;
    const d = nearest[key];
    const label = paramLabel(key, lang);
    if (d === undefined) {
      amenityScores.push(0);
      caveats.push(t("amenityUnverified", { param: label }));
    } else if (d <= limit) {
      amenityScores.push(1);
      near.push(t("amenityVerified", { param: label, distance: formatMeters(d, lang) }));
    } else if (d <= limit * 1.5) {
      amenityScores.push(0.5);
      caveats.push(t("amenityTooFar", { param: label, distance: formatMeters(d, lang) }));
    } else {
      amenityScores.push(0);
      caveats.push(t("amenityTooFar", { param: label, distance: formatMeters(d, lang) }));
    }
  }
  if (req.corner === "corner" || req.corner === "middle") {
    if (doc.cornerPosition === req.corner) {
      amenityScores.push(1);
      near.push(t(req.corner === "corner" ? "cornerMatch" : "middleMatch"));
    } else {
      amenityScores.push(0);
      if (!doc.cornerPosition || doc.cornerPosition === "not_sure") caveats.push(t("positionUnverified"));
    }
  }
  parts.amenity = amenityScores.length ? amenityScores.reduce((a, b) => a + b, 0) / amenityScores.length : 0.5;

  // Listing quality and freshness
  const rank = Math.max(0, Math.min(100, Number(doc.ranking?.score) || 0)) / 100;
  const ageDays = doc.createdAt ? (now - new Date(doc.createdAt).getTime()) / 86400000 : 999;
  const fresh = ageDays <= 30 ? 1 : ageDays <= 90 ? 0.6 : ageDays <= 180 ? 0.3 : 0.1;
  parts.quality = 0.6 * rank + 0.4 * fresh;
  if (ageDays <= 14) extra.push(t("fresh"));
  const reasons = [...core, ...near, ...extra];

  const score = Math.round(Object.entries(WEIGHTS).reduce((sum, [k, w]) => sum + w * (parts[k] || 0), 0));
  return { score, parts, reasons: reasons.filter(Boolean), caveats: [...new Set(caveats.filter(Boolean))].slice(0, 4), nearest };
}

function cardFor(doc, req, scored, lang) {
  const images = Array.isArray(doc.images) ? doc.images.filter((x) => typeof x === "string") : [];
  const image = images[0] || (Array.isArray(doc.imageCategories) && doc.imageCategories[0]?.url) || null;
  const params = {};
  for (const p of NEARBY_PARAMETERS) {
    const rows = (doc.nearbyAmenities || []).filter((a) => a.category === p.key && Number.isFinite(Number(a.distanceMeters)));
    const best = rows.sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
    params[p.key] = best ? { meters: Math.round(best.distanceMeters), name: best.name || "", source: best.source || "partner", approximate: true } : null;
  }
  const beds = listingBedrooms(doc);
  const listingType = req.mode === "sale" ? "sale" : "rental";
  return {
    id: String(doc._id),
    listingType,
    url: listingType === "sale" ? `/Saledetails/${doc._id}` : `/Rentaldetails/${doc._id}`,
    title: doc.title || "",
    sector: doc.Sector || "",
    address: (doc.address || doc.location || "").slice(0, 140),
    price: listingPrice(doc, req.mode),
    priceLabel: formatBudget({ budgetMax: listingPrice(doc, req.mode) }, req.mode, lang, { plain: true }),
    bhkLabel: beds === null ? "" : formatBhk([beds], false, lang),
    areaSqft: Number(doc.totalArea?.sqft) || null,
    furnishing: doc.furnishing || null,
    propertyType: doc.propertyType || null,
    image,
    score: scored.score,
    breakdown: Object.fromEntries(Object.entries(scored.parts).map(([k, v]) => [k, Math.round(v * WEIGHTS[k])])),
    reasons: scored.reasons.slice(0, 7),
    caveats: scored.caveats,
    params,
    corner: doc.cornerPosition || "not_sure",
    verifiedParams: Object.values(params).filter(Boolean).length,
    listedAt: doc.createdAt || null,
    partnerAgentId: doc.partnerAgentId ? String(doc.partnerAgentId) : null,
  };
}

/**
 * Runs the full search. Returns ranked cards for `offset`…`offset+PAGE_SIZE`,
 * pipeline statistics for the search animation, and — when nothing passes
 * the hard filters — which constraint is limiting.
 */
async function search(req, { lang = "en", offset = 0, pageSize = PAGE_SIZE } = {}) {
  const started = Date.now();
  const Model = modelFor(req.mode);
  const filter = buildQuery(req);
  const fields = req.mode === "sale" ? SALE_FIELDS : RENTAL_FIELDS;

  const [scanned, docs] = await Promise.all([
    Model.countDocuments(baseFilter()),
    Model.find(filter).select(fields).sort({ "ranking.score": -1, createdAt: -1, _id: 1 }).limit(CANDIDATE_LIMIT).lean(),
  ]);

  const now = Date.now();
  const ranked = docs
    .map((doc) => ({ doc, scored: scoreListing(doc, req, lang, now) }))
    .sort((a, b) => b.scored.score - a.scored.score || String(a.doc._id).localeCompare(String(b.doc._id)));

  const page = ranked.slice(offset, offset + pageSize).map(({ doc, scored }) => cardFor(doc, req, scored, lang));
  const stats = {
    scanned,
    afterHardFilters: docs.length,
    capped: docs.length >= CANDIDATE_LIMIT,
    withVerifiedDistances: docs.filter((d) => Object.keys(nearestByCategory(d.nearbyAmenities)).length > 0).length,
    ranked: ranked.length,
    returned: page.length,
    offset,
    hasMore: offset + pageSize < ranked.length,
    tookMs: Date.now() - started,
  };

  let diagnosis = null;
  if (!docs.length) diagnosis = await diagnose(req);
  return { results: page, stats, diagnosis, total: ranked.length };
}

/** Finds which hard constraint empties the result set and what relaxing it would yield. */
async function diagnose(req) {
  const Model = modelFor(req.mode);
  const field = priceField(req.mode);
  const tries = [];
  if (budgetClause(req) && Number(req.budgetMax) > 0) {
    const withoutBudget = buildQuery(req, { skip: ["budget"] });
    const cheapest = await Model.find(withoutBudget).select(field).sort({ [field]: 1 }).limit(1).lean();
    if (cheapest.length) {
      const price = Number(cheapest[0][field]) || 0;
      const step = req.mode === "sale" ? 500000 : 1000;
      const suggestion = Math.ceil(price / step) * step;
      const count = await Model.countDocuments(buildQuery({ ...req, budgetMax: suggestion, budgetApprox: false, budgetStretch: false }));
      tries.push({ reason: "budget", count, suggestion });
    }
  }
  if (bhkClause(req)) {
    const count = await Model.countDocuments(buildQuery(req, { skip: ["bhk"] }));
    if (count) tries.push({ reason: "bhk", count });
  }
  if (locationClause(req) && req.locationScope !== "nearby") {
    const count = await Model.countDocuments(buildQuery(req, { skip: ["location"] }));
    if (count) tries.push({ reason: "location", count });
  }
  if (Array.isArray(req.propertyType) && req.propertyType[0] === "plot") {
    const count = await Model.countDocuments(buildQuery(req, { skip: ["type"] }));
    if (count) tries.push({ reason: "type", count });
  }
  const best = tries.filter((t) => t.count > 0).sort((a, b) => ["budget", "bhk", "type", "location"].indexOf(a.reason) - ["budget", "bhk", "type", "location"].indexOf(b.reason))[0];
  return best || { reason: "none", count: 0 };
}

async function findListing(id, listingType) {
  const Model = listingType === "sale" ? SaleProperty : RentalProperty;
  if (!/^[a-f0-9]{24}$/i.test(String(id))) return null;
  return Model.findOne({ _id: id, ...baseFilter() }).select(listingType === "sale" ? SALE_FIELDS : RENTAL_FIELDS).lean();
}

/** Average / typical price of live listings in the requested location (and BHK, when given). */
async function marketStats(req) {
  const mode = req.mode === "sale" ? "sale" : "rent";
  const field = priceField(mode);
  const match = { ...baseFilter(), [field]: { $gt: 0 } };
  const loc = locationClause(req);
  if (loc) Object.assign(match, loc);
  const bhk = bhkClause(req);
  if (bhk) Object.assign(match, bhk);
  const rows = await modelFor(mode).find(match).select(field).limit(2000).lean();
  const prices = rows.map((r) => Number(r[field])).filter((n) => n > 0).sort((a, b) => a - b);
  if (prices.length < 3) return { mode, count: prices.length };
  const at = (q) => prices[Math.min(prices.length - 1, Math.floor(q * prices.length))];
  return { mode, count: prices.length, avg: prices.reduce((a, b) => a + b, 0) / prices.length, min: at(0.1), max: at(0.9) };
}

module.exports = { marketStats, search, diagnose, buildQuery, scoreListing, cardFor, findListing, WEIGHTS, PAGE_SIZE };
