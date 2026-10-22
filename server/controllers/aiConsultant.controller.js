/**
 * AI Property Consultant — HTTP layer.
 *
 * Public:  config, turn, search, enquiry, metric
 * Admin:   leads list/update, partner list, usage
 * Partner: leads list (requirements for all active partners; contact details
 *          only for partners assigned to the lead), claim, status update
 */
const crypto = require("crypto");
const mongoose = require("mongoose");
const AiConsultantLead = require("../models/AiConsultantLead.model");
const AiConsultantMetric = require("../models/AiConsultantMetric.model");
const Agent = require("../models/Agent.model");
const RentalProperty = require("../models/Rentalproperty.model");
const SaleProperty = require("../models/SaleProperty.model");
const engine = require("../services/aiConsultant/engine");
const groq = require("../services/aiConsultant/groqClient");
const { bank, say, chips: localChips } = require("../services/aiConsultant/questionBank");

function submittedReply(lang, leadRef, duplicate) {
  const l = ["en", "hinglish", "hi"].includes(lang) ? lang : "en";
  return {
    message: `${say(bank.responses[duplicate ? "submittedDuplicate" : "submitted"], l, 0, { leadRef })} ${say(bank.responses.afterSubmit, l, 0)}`,
    chips: localChips(bank.responses.refineChips.concat(bank.responses.afterResultsChips.filter((c) => c.value === "start over")), l),
  };
}
const { findNearbyParameters, listNearbyPlaces } = require("../services/nearbyPlaces.service");
const { parseMessage } = require("../services/aiConsultant/parser");

const MAX_PARTNERS = AiConsultantLead.MAX_PARTNERS;
const PARTNER_STATUSES = ["contacted", "viewing_scheduled", "converted", "lost"];
const METRIC_NAMES = new Set([
  "opened_auto",
  "opened_manual",
  "closed_manual_search",
  "voice_input_used",
  "speech_failed",
  "speech_unsupported",
  "speech_denied",
  "tts_used",
  "result_clicked",
  "voice_session_started",
  "voice_session_failed",
  "voice_greeting_played",
  "voice_turn",
  "voice_browser_fallback",
  "voice_audio_blocked",
]);

/**
 * What the voice assistant should say for a set of engine messages: the
 * conversational lines only (no listing dumps), at most two of them, so a
 * spoken reply stays short while the full answer stays on screen.
 */
function spokenSummary(messages) {
  const lines = (messages || [])
    .filter((m) => m && typeof m.text === "string" && m.text.trim() && m.kind !== "listing")
    .map((m) => m.text.trim());
  if (!lines.length) return "";
  const picked = lines.length > 2 ? [lines[0], lines[lines.length - 1]] : lines;
  return picked.join(" ").replace(/\s+/g, " ").slice(0, 600);
}
exports._spokenSummary = spokenSummary;

/* ------------------------------------------------------------ metrics */

function bump(names) {
  const list = (Array.isArray(names) ? names : [names]).filter(Boolean);
  if (!list.length || mongoose.connection.readyState !== 1) return;
  const day = new Date().toISOString().slice(0, 10);
  const inc = Object.fromEntries(list.map((n) => [`counters.${n}`, 1]));
  AiConsultantMetric.updateOne(
    { day },
    { $inc: inc, $setOnInsert: { expiresAt: new Date(Date.now() + 400 * 86400000) } },
    { upsert: true }
  ).catch(() => {});
}

const bad = (res, status, message, code) => res.status(status).json({ success: false, code: code || "ERROR", message });

/* ------------------------------------------------------------- public */

exports.getConfig = (req, res) => {
  res.set("Cache-Control", "public, max-age=600");
  res.json({
    success: true,
    version: bank.version,
    languages: bank.languages,
    parameters: Object.fromEntries(
      Object.entries(bank.parameters).map(([k, p]) => [k, { kind: p.kind, icon: p.icon, color: p.color, label: p.label, longLabel: p.longLabel, defaultMeters: p.defaultMeters || null }])
    ),
    distanceDisclaimer: bank.responses.distanceDisclaimer,
    voice: bank.responses.voice,
    aiAvailable: groq.isAvailable(),
  });
};

exports.turn = async (req, res) => {
  try {
    const { state, message, action, disableLLM } = req.body || {};
    if (message !== undefined && typeof message !== "string") return bad(res, 400, "message must be text");
    if (typeof message === "string" && message.length > 600) return bad(res, 413, "Message is too long — please keep it under 600 characters.");
    const out = await engine.handleTurn({ state, message, action, disableLLM: disableLLM === true });
    const metrics = [];
    if (action?.type === "start" && (!state || !state.turn)) metrics.push("conversations_started");
    if (typeof message === "string" && message.trim()) metrics.push("turns");
    if (out.state.aiUsed && !(state && state.aiUsed)) metrics.push("ai_assisted_conversations");
    if (out.next === "review" && !(state && state.phase === "review")) metrics.push("reached_review");
    bump(metrics);
    res.json({ success: true, ...out, speech: spokenSummary(out.messages), aiAvailable: groq.isAvailable() });
  } catch (err) {
    console.error("aiConsultant.turn failed:", err.message);
    bad(res, 500, "The assistant hit a snag. Please try again.");
  }
};

exports.search = async (req, res) => {
  try {
    const { state, more } = req.body || {};
    const out = await engine.handleSearch({ state, more: more === true });
    if (out.stats) bump(["searches", out.results.length ? "searches_with_results" : "searches_no_match", more ? "show_more" : null]);
    res.json({ success: true, ...out, speech: spokenSummary(out.messages) });
  } catch (err) {
    console.error("aiConsultant.search failed:", err.message);
    bad(res, 500, "Search is unavailable right now. Please try again in a moment.");
  }
};

/**
 * Live shortlist while the visitor is still answering: the best few homes for
 * whatever is known so far (works from the first answer on). Cached briefly per
 * requirement set, so the same answers never hit the database twice in a row.
 * The full ranked results and the lead step are unchanged.
 */
const PREVIEW_TTL_MS = 2 * 60 * 1000;
const PREVIEW_CACHE_SIZE = 300;
const previewCache = new Map();
exports._previewCache = previewCache;
exports._matcher = () => require("../services/aiConsultant/matcher");

exports.preview = async (req, res) => {
  try {
    const s = engine.sanitizeState(req.body?.state);
    const key = JSON.stringify([s.lang, s.req]);
    const hit = previewCache.get(key);
    if (hit && Date.now() - hit.at < PREVIEW_TTL_MS) {
      res.set("Cache-Control", "no-store");
      return res.json({ success: true, cached: true, ...hit.data });
    }
    const { results, total } = await exports._matcher().search(s.req, { lang: s.lang, offset: 0, pageSize: 6 });
    const data = {
      total,
      mode: s.req.mode === "sale" ? "sale" : "rent",
      results: results.map((c) => ({
        id: c.id,
        url: c.url,
        title: c.title,
        sector: c.sector,
        priceLabel: c.priceLabel,
        bhkLabel: c.bhkLabel,
        image: c.image,
        score: c.score,
      })),
    };
    previewCache.delete(key);
    previewCache.set(key, { at: Date.now(), data });
    if (previewCache.size > PREVIEW_CACHE_SIZE) previewCache.delete(previewCache.keys().next().value);
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, cached: false, ...data });
  } catch (err) {
    console.error("aiConsultant.preview failed:", err.message);
    return bad(res, 500, "Shortlist is unavailable right now.");
  }
};

/**
 * "Near me" for the area question: the sectors/areas with live listings closest
 * to the visitor's position, nearest first. Coordinates are only used for this
 * lookup (rounded, never stored). Cached per ~1 km cell.
 */
const NEAR_TTL_MS = 10 * 60 * 1000;
const nearCache = new Map();
exports._nearCache = nearCache;
exports._listingCoords = async (box) => {
  const filter = { isActive: true, latitude: { $gte: box.s, $lte: box.n }, longitude: { $gte: box.w, $lte: box.e } };
  const select = "Sector latitude longitude";
  const [rentals, sales] = await Promise.all([
    RentalProperty.find(filter).select(select).limit(3000).lean(),
    SaleProperty.find(filter).select(select).limit(3000).lean(),
  ]);
  return [...rentals, ...sales];
};

function kmBetween(aLat, aLng, bLat, bLng) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** "Sector-57", "57", "sector 57 A" -> "Sector 57"; other names are kept as written. */
function areaName(raw) {
  const text = String(raw || "").trim();
  const n = text.match(/^(?:sector|sec)?\s*[-.]?\s*(\d{1,3})\b/i);
  if (n && Number(n[1]) >= 1 && Number(n[1]) <= 115) return `Sector ${Number(n[1])}`;
  return text.slice(0, 60);
}

exports.nearbyAreas = async (req, res) => {
  const lat = Number(req.query?.lat);
  const lng = Number(req.query?.lng);
  res.set("Cache-Control", "no-store");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return bad(res, 400, "A valid location is needed.");
  // Far from Gurgaon: nothing to suggest (the page shows the area list instead).
  if (kmBetween(lat, lng, 28.4595, 77.0266) > 60) return res.json({ success: true, outside: true, areas: [] });
  const cell = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const hit = nearCache.get(cell);
  if (hit && Date.now() - hit.at < NEAR_TTL_MS) return res.json({ success: true, outside: false, areas: hit.areas });
  try {
    const box = { n: lat + 0.06, s: lat - 0.06, e: lng + 0.07, w: lng - 0.07 }; // about 6-7 km each way
    const docs = await exports._listingCoords(box);
    const byArea = new Map();
    for (const d of docs) {
      const name = areaName(d.Sector);
      if (!name || !Number.isFinite(d.latitude) || !Number.isFinite(d.longitude)) continue;
      const km = kmBetween(lat, lng, d.latitude, d.longitude);
      const cur = byArea.get(name) || { value: name, label: name, km: Infinity, homes: 0 };
      cur.km = Math.min(cur.km, km);
      cur.homes += 1;
      byArea.set(name, cur);
    }
    const areas = [...byArea.values()]
      .sort((a, b) => a.km - b.km)
      .slice(0, 8)
      .map((a) => ({ ...a, km: Math.round(a.km * 10) / 10 }));
    nearCache.set(cell, { at: Date.now(), areas });
    if (nearCache.size > 500) nearCache.delete(nearCache.keys().next().value);
    return res.json({ success: true, outside: false, areas });
  } catch (err) {
    console.error("aiConsultant.nearbyAreas failed:", err.message);
    return bad(res, 500, "Couldn't find nearby areas right now.");
  }
};

/* ----------------------------------------------- the quest's 3D map world */

/**
 * Which map style the quest's 3D map loads. LocationIQ's vector tiles need a
 * browser-side key, so only a separate public key (restricted to our domains in
 * the LocationIQ dashboard) is ever sent; without one, OpenFreeMap's keyless
 * tiles are used. The server-side LocationIQ key never leaves the server.
 */
exports.mapConfig = (req, res) => {
  const publicKey = (process.env.LOCATIONIQ_PUBLIC_KEY || "").trim();
  res.set("Cache-Control", "public, max-age=3600");
  res.json({
    success: true,
    provider: publicKey ? "locationiq" : "openfreemap",
    style: publicKey ? `https://tiles.locationiq.com/v3/streets/vector.json?key=${encodeURIComponent(publicKey)}` : "https://tiles.openfreemap.org/styles/liberty",
  });
};

/**
 * Homes for the "lane" scene: live listings in the picked areas with the picked
 * size, cheapest first, with the price spread so the visitor can choose a
 * budget by pointing at a house. `q` is the same text the quest sends
 * ("Sector 57 and Sector 49 3 BHK"), parsed by the consultant's parser.
 */
exports.lane = async (req, res) => {
  const mode = req.query?.mode === "sale" ? "sale" : "rent";
  const q = String(req.query?.q || "").slice(0, 300);
  res.set("Cache-Control", "no-store");
  try {
    const f = parseMessage(q, {});
    const r = { mode, sectors: f.sectors || [], localities: f.localities || [], bhk: f.bhk || [], bhkAny: !f.bhk?.length };
    if (!r.sectors.length && !r.localities.length) r.anywhere = true;
    const { results, total } = await exports._matcher().search(r, { lang: "en", offset: 0, pageSize: 24 });
    const homes = results
      .filter((c) => c.price > 0)
      .map((c) => ({ id: c.id, url: c.url, title: c.title, sector: c.sector, price: c.price, priceLabel: c.priceLabel, bhkLabel: c.bhkLabel, areaSqft: c.areaSqft, furnishing: c.furnishing, image: c.image }))
      .sort((a, b) => a.price - b.price);
    const prices = homes.map((h) => h.price);
    const stats = prices.length ? { min: prices[0], median: prices[Math.floor(prices.length / 2)], max: prices[prices.length - 1] } : null;
    return res.json({ success: true, mode, total, homes, stats });
  } catch (err) {
    console.error("aiConsultant.lane failed:", err.message);
    return bad(res, 500, "Couldn't load homes for this lane right now.");
  }
};

/** Amenities around one picked area, grouped like the "what matters nearby" question. */
exports.areaAmenities = async (req, res) => {
  const lat = Number(req.query?.lat);
  const lng = Number(req.query?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || kmBetween(lat, lng, 28.4595, 77.0266) > 60) return bad(res, 400, "A location in Gurgaon is needed.");
  try {
    const data = await listNearbyPlaces({ latitude: lat, longitude: lng, radius: 2500 });
    res.set("Cache-Control", "public, max-age=86400");
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error("aiConsultant.areaAmenities failed:", err.message);
    return bad(res, err.status === 503 ? 503 : 502, "Nearby places are unavailable right now.");
  }
};

async function matchesFor(shown) {
  const ids = { rental: [], sale: [] };
  for (const s of (shown || []).slice(0, 12)) ids[s.listingType].push(s.id);
  const select = "title Sector monthlyRent price partnerAgentId";
  const [rentals, sales] = await Promise.all([
    ids.rental.length ? RentalProperty.find({ _id: { $in: ids.rental }, isActive: true }).select(select).lean() : [],
    ids.sale.length ? SaleProperty.find({ _id: { $in: ids.sale }, isActive: true }).select(select).lean() : [],
  ]);
  const byId = new Map([...rentals.map((d) => [String(d._id), { d, t: "rental" }]), ...sales.map((d) => [String(d._id), { d, t: "sale" }])]);
  return (shown || [])
    .map((s, i) => {
      const hit = byId.get(s.id);
      if (!hit) return null;
      return {
        propertyId: hit.d._id,
        listingType: hit.t,
        score: Math.max(0, 100 - i * 5),
        title: String(hit.d.title || "").slice(0, 200),
        sector: String(hit.d.Sector || "").slice(0, 120),
        price: Number(hit.t === "sale" ? hit.d.price : hit.d.monthlyRent) || 0,
        partnerAgentId: hit.d.partnerAgentId || null,
      };
    })
    .filter(Boolean)
    .slice(0, 10);
}

const newLeadRef = () => `GH-${Date.now().toString(36).toUpperCase().slice(-5)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

exports.createEnquiry = async (req, res) => {
  try {
    const { state, consent, idempotencyKey, transcript } = req.body || {};
    if (consent !== true) return bad(res, 400, "Please tick the consent box to submit.", "CONSENT_REQUIRED");
    if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey)) return bad(res, 400, "Invalid submission key.");

    const existing = await AiConsultantLead.findOne({ idempotencyKey }).select("leadRef status language stage").lean();
    if (existing && existing.stage !== "captured") return res.json({ success: true, duplicate: true, leadRef: existing.leadRef, status: existing.status, ...submittedReply(existing.language, existing.leadRef, true) });

    const payload = engine.buildLeadPayload(state);
    const contact = payload.contact;
    if (!contact.name || !contact.phone) return bad(res, 400, "Name and a valid 10-digit mobile number are required.", "CONTACT_REQUIRED");

    const matches = await matchesFor(payload.shown);
    const partnerIds = [...new Set(matches.map((m) => m.partnerAgentId && String(m.partnerAgentId)).filter(Boolean))];
    const activePartners = partnerIds.length
      ? await Agent.find({ _id: { $in: partnerIds }, status: "active" }).select("_id").limit(MAX_PARTNERS).lean()
      : [];
    const assigned = activePartners.map((a) => a._id);

    const lang = payload.language;
    const cleanTranscript = (Array.isArray(transcript) ? transcript : [])
      .slice(-40)
      .filter((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.text === "string")
      .map((t) => ({ role: t.role, text: t.text.slice(0, 600) }));

    const consentDoc = { given: true, text: bank.slots.review.consentText[lang] || bank.slots.review.consentText.en, at: new Date() };
    if (existing) {
      // Upgrade the lead captured before the search into the full reviewed request.
      const upgraded = await AiConsultantLead.findOneAndUpdate(
        { idempotencyKey, stage: "captured" },
        {
          $set: {
            stage: "enquiry",
            userId: req.user?._id || null,
            mode: payload.mode || null,
            requirements: payload.requirements,
            summaryText: payload.summaryText,
            contact: { name: contact.name, phone: contact.phone, email: contact.email || "" },
            consent: consentDoc,
            matches,
            language: lang,
            aiAssisted: payload.aiAssisted,
            transcript: cleanTranscript,
            status: assigned.length ? "assigned" : "pending_assignment",
            assignedPartners: assigned,
            assignment: assigned.length ? { by: "auto", at: new Date() } : { by: null, at: null },
          },
          $push: { followUps: { at: new Date(), byType: "system", status: assigned.length ? "assigned" : "pending_assignment", note: "Visitor reviewed and submitted the full request." } },
        },
        { new: true }
      ).lean();
      if (upgraded) {
        bump(["enquiries"]);
        return res.status(201).json({ success: true, leadRef: upgraded.leadRef, status: upgraded.status, matches: matches.length, ...submittedReply(lang, upgraded.leadRef, false) });
      }
    }

    let lead;
    try {
      lead = await AiConsultantLead.create({
        leadRef: newLeadRef(),
        idempotencyKey,
        userId: req.user?._id || null,
        mode: payload.mode || null,
        requirements: payload.requirements,
        summaryText: payload.summaryText,
        contact: { name: contact.name, phone: contact.phone, email: contact.email || "" },
        consent: { given: true, text: bank.slots.review.consentText[lang] || bank.slots.review.consentText.en, at: new Date() },
        matches,
        language: lang,
        aiAssisted: payload.aiAssisted,
        transcript: cleanTranscript,
        status: assigned.length ? "assigned" : "pending_assignment",
        assignedPartners: assigned,
        assignment: assigned.length ? { by: "auto", at: new Date() } : { by: null, at: null },
        followUps: [{ byType: "system", status: assigned.length ? "assigned" : "pending_assignment", note: assigned.length ? `Auto-assigned to ${assigned.length} partner(s) whose listings matched.` : "Waiting for assignment." }],
      });
    } catch (err) {
      if (err && err.code === 11000) {
        const dup = await AiConsultantLead.findOne({ idempotencyKey }).select("leadRef status language").lean();
        if (dup) return res.json({ success: true, duplicate: true, leadRef: dup.leadRef, status: dup.status, ...submittedReply(dup.language, dup.leadRef, true) });
      }
      throw err;
    }
    bump(["enquiries"]);
    res.status(201).json({ success: true, leadRef: lead.leadRef, status: lead.status, matches: matches.length, ...submittedReply(lang, lead.leadRef, false) });
  } catch (err) {
    console.error("aiConsultant.createEnquiry failed:", err.message);
    bad(res, 500, "We couldn't submit your request. Your details are still here — please try again.");
  }
};

/**
 * Guest phone capture: before the first property search the assistant confirms the
 * visitor's mobile number (and optional name) and saves it as a lead right away.
 * The same idempotency key is reused by the later full enquiry, which upgrades it.
 */
exports.captureLead = async (req, res) => {
  try {
    const { state, contact, idempotencyKey, consent } = req.body || {};
    if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey)) return bad(res, 400, "Invalid submission key.");
    const phone = String(contact?.phone || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    if (!/^[6-9]\d{9}$/.test(phone)) return bad(res, 400, "Please enter a valid 10-digit mobile number.", "PHONE_INVALID");
    const name = String(contact?.name || "").replace(/[^A-Za-zऀ-ॿ .'-]/g, "").trim().slice(0, 60);

    const existing = await AiConsultantLead.findOne({ idempotencyKey }).select("leadRef stage").lean();
    const payload = engine.buildLeadPayload({ ...(state || {}), contact: { name: name || "Guest", phone } });
    const lang = payload.language;
    const consentText = bank.slots.review.consentText[lang] || bank.slots.review.consentText.en;
    const fields = {
      userId: req.user?._id || null,
      mode: payload.mode || null,
      requirements: payload.requirements,
      summaryText: payload.summaryText,
      contact: { name: name || "Guest", phone, email: "" },
      language: lang,
      aiAssisted: payload.aiAssisted,
    };

    if (existing) {
      // Re-confirmation (e.g. the visitor edited the number): refresh the captured lead.
      if (existing.stage === "captured") await AiConsultantLead.updateOne({ idempotencyKey }, { $set: fields });
      else await AiConsultantLead.updateOne({ idempotencyKey }, { $set: { "contact.name": fields.contact.name, "contact.phone": phone } });
      return res.json({ success: true, leadRef: existing.leadRef });
    }

    const lead = await AiConsultantLead.create({
      leadRef: newLeadRef(),
      idempotencyKey,
      ...fields,
      stage: "captured",
      consent: { given: consent !== false, text: consentText, at: new Date() },
      status: "pending_assignment",
      followUps: [{ byType: "system", status: "pending_assignment", note: "Phone number confirmed by the visitor in the AI assistant before searching." }],
    });
    bump(["leads_captured"]);
    res.status(201).json({ success: true, leadRef: lead.leadRef });
  } catch (err) {
    if (err && err.code === 11000) return res.json({ success: true });
    console.error("aiConsultant.captureLead failed:", err.message);
    bad(res, 500, "We couldn't save your number just now. Please try again.");
  }
};

exports.metric = (req, res) => {
  const name = String(req.body?.name || "");
  if (METRIC_NAMES.has(name)) bump([name]);
  res.status(204).end();
};

/** Server-side nearby lookup for the listing forms (replaces the retired key endpoint). */
exports.nearbyParameters = async (req, res) => {
  try {
    const { address, sector, latitude, longitude } = req.body || {};
    if (!String(address || "").trim() && !String(sector || "").trim() && !(Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)))) {
      return bad(res, 400, "Enter a sector or address first.");
    }
    const out = await findNearbyParameters({ address: String(address || "").slice(0, 200), sector: String(sector || "").slice(0, 80), latitude, longitude });
    res.json({ success: true, ...out });
  } catch (err) {
    bad(res, err.status || 502, err.status ? err.message : "Nearby lookup failed. You can enter nearby places manually.");
  }
};

/* -------------------------------------------------------------- admin */

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function pageParams(q) {
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  return { limit, page, skip: (page - 1) * limit };
}

exports.adminListLeads = async (req, res) => {
  try {
    const { limit, page, skip } = pageParams(req.query);
    const filter = {};
    if (AiConsultantLead.STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (["rent", "sale"].includes(req.query.mode)) filter.mode = req.query.mode;
    const q = String(req.query.q || "").trim().slice(0, 60);
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ leadRef: re }, { "contact.name": re }, { "contact.phone": re }, { summaryText: re }];
    }
    const [items, total, counts] = await Promise.all([
      AiConsultantLead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("assignedPartners", "name mobileNumber agencyName agentCode").lean(),
      AiConsultantLead.countDocuments(filter),
      AiConsultantLead.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);
    res.json({
      success: true,
      data: items,
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    console.error("adminListLeads failed:", err.message);
    bad(res, 500, "Could not load AI consultant leads.");
  }
};

exports.adminUpdateLead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 400, "Invalid lead id");
    const lead = await AiConsultantLead.findById(req.params.id);
    if (!lead) return bad(res, 404, "Lead not found");
    const { status, assignedPartners, note } = req.body || {};
    const entry = { byType: "admin", byId: req.user._id, byName: req.user.name || "Admin" };

    if (Array.isArray(assignedPartners)) {
      const ids = [...new Set(assignedPartners.filter((id) => mongoose.isValidObjectId(id)).map(String))].slice(0, MAX_PARTNERS);
      const valid = ids.length ? await Agent.find({ _id: { $in: ids }, status: "active" }).select("_id").lean() : [];
      lead.assignedPartners = valid.map((a) => a._id);
      lead.assignment = { by: "admin", at: new Date() };
      if (valid.length && ["submitted", "pending_assignment"].includes(lead.status)) lead.status = "assigned";
      if (!valid.length && lead.status === "assigned") lead.status = "pending_assignment";
      entry.note = `Assigned to ${valid.length} partner(s).`;
      entry.status = lead.status;
    }
    if (status !== undefined) {
      if (!AiConsultantLead.STATUSES.includes(status)) return bad(res, 400, "Invalid status");
      lead.status = status;
      entry.status = status;
    }
    if (typeof note === "string" && note.trim()) entry.note = [entry.note, note.trim().slice(0, 1000)].filter(Boolean).join(" — ");
    if (entry.note || entry.status) lead.followUps.push(entry);
    await lead.save();
    const fresh = await AiConsultantLead.findById(lead._id).populate("assignedPartners", "name mobileNumber agencyName agentCode").lean();
    res.json({ success: true, data: fresh });
  } catch (err) {
    console.error("adminUpdateLead failed:", err.message);
    bad(res, 500, "Could not update the lead.");
  }
};

exports.adminListPartners = async (req, res) => {
  try {
    const partners = await Agent.find({ status: "active", roleType: "Partner" }).select("name mobileNumber agencyName agentCode preferredSectors sectorsCovered").sort({ name: 1 }).limit(500).lean();
    res.json({ success: true, data: partners });
  } catch (err) {
    bad(res, 500, "Could not load partners.");
  }
};

exports.adminUsage = async (req, res) => {
  try {
    const days = await AiConsultantMetric.find({}).sort({ day: -1 }).limit(14).lean();
    res.json({
      success: true,
      llm: groq.usage(),
      metrics: days.map((d) => ({ day: d.day, ...Object.fromEntries(Object.entries(d.counters || {})) })),
    });
  } catch (err) {
    bad(res, 500, "Could not load usage.");
  }
};

/* ------------------------------------------------------------ partner */

const maskPhone = (p) => (p ? `${String(p).slice(0, 2)}XXXXXX${String(p).slice(-2)}` : "");

function partnerView(lead, agentId) {
  const mine = (lead.assignedPartners || []).some((id) => String(id._id || id) === String(agentId));
  const firstName = String(lead.contact?.name || "").split(" ")[0];
  return {
    _id: lead._id,
    leadRef: lead.leadRef,
    mode: lead.mode,
    requirements: lead.requirements,
    summaryText: lead.summaryText,
    matches: lead.matches,
    language: lead.language,
    status: lead.status,
    stage: lead.stage,
    createdAt: lead.createdAt,
    assignedToMe: mine,
    slotsLeft: Math.max(0, MAX_PARTNERS - (lead.assignedPartners || []).length),
    contact: mine
      ? { name: lead.contact.name, phone: lead.contact.phone, email: lead.contact.email }
      : { name: firstName, phone: maskPhone(lead.contact?.phone), email: "" },
    followUps: mine ? (lead.followUps || []).slice(-10) : [],
  };
}

exports.partnerListLeads = async (req, res) => {
  try {
    const { limit, page, skip } = pageParams(req.query);
    const agentId = req.agent._id;
    const filter = { status: { $nin: ["closed", "lost"] } };
    if (req.query.scope === "mine") {
      filter.assignedPartners = agentId;
      delete filter.status;
    }
    if (["rent", "sale"].includes(req.query.mode)) filter.mode = req.query.mode;
    const [items, total] = await Promise.all([
      AiConsultantLead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-transcript -idempotencyKey -consent").lean(),
      AiConsultantLead.countDocuments(filter),
    ]);
    res.json({ success: true, data: items.map((l) => partnerView(l, agentId)), meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
  } catch (err) {
    console.error("partnerListLeads failed:", err.message);
    bad(res, 500, "Could not load AI Assistant leads.");
  }
};

exports.partnerClaimLead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 400, "Invalid lead id");
    const agentId = req.agent._id;
    const lead = await AiConsultantLead.findOneAndUpdate(
      {
        _id: req.params.id,
        status: { $nin: ["closed", "lost", "converted"] },
        assignedPartners: { $ne: agentId },
        $expr: { $lt: [{ $size: { $ifNull: ["$assignedPartners", []] } }, MAX_PARTNERS] },
      },
      {
        $push: {
          assignedPartners: agentId,
          followUps: { at: new Date(), byType: "partner", byId: agentId, byName: req.agent.name || "Partner", status: "assigned", note: "Claimed from PartnerHub." },
        },
        $set: { assignment: { by: "claim", at: new Date() } },
      },
      { new: true }
    ).lean();
    if (!lead) {
      const exists = await AiConsultantLead.findById(req.params.id).select("assignedPartners status").lean();
      if (!exists) return bad(res, 404, "Lead not found");
      if ((exists.assignedPartners || []).some((id) => String(id) === String(agentId))) {
        const full = await AiConsultantLead.findById(req.params.id).lean();
        return res.json({ success: true, data: partnerView(full, agentId) });
      }
      return bad(res, 409, "This lead already has the maximum number of partners or is closed.", "LEAD_FULL");
    }
    if (["submitted", "pending_assignment"].includes(lead.status)) {
      await AiConsultantLead.updateOne({ _id: lead._id }, { $set: { status: "assigned" } });
      lead.status = "assigned";
    }
    res.json({ success: true, data: partnerView(lead, agentId) });
  } catch (err) {
    console.error("partnerClaimLead failed:", err.message);
    bad(res, 500, "Could not claim the lead.");
  }
};

exports.partnerUpdateLead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 400, "Invalid lead id");
    const agentId = req.agent._id;
    const { status, note } = req.body || {};
    if (status !== undefined && !PARTNER_STATUSES.includes(status)) return bad(res, 400, "Invalid status");
    if (status === undefined && !(typeof note === "string" && note.trim())) return bad(res, 400, "Nothing to update");
    const entry = { at: new Date(), byType: "partner", byId: agentId, byName: req.agent.name || "Partner", status, note: typeof note === "string" ? note.trim().slice(0, 1000) : undefined };
    const update = { $push: { followUps: entry } };
    if (status) update.$set = { status };
    const lead = await AiConsultantLead.findOneAndUpdate({ _id: req.params.id, assignedPartners: agentId }, update, { new: true }).lean();
    if (!lead) return bad(res, 404, "Lead not found or not assigned to you");
    res.json({ success: true, data: partnerView(lead, agentId) });
  } catch (err) {
    console.error("partnerUpdateLead failed:", err.message);
    bad(res, 500, "Could not update the lead.");
  }
};
