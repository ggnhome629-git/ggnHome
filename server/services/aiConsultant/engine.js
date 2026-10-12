/**
 * Rule-based conversation engine — the authoritative state manager for the
 * AI Property Consultant. Works end-to-end with the language model switched
 * off; the model (llm.js) is only consulted when the rule parser understood
 * nothing in a message, and its proposals are validated like any other input.
 *
 * Conversation state lives with the client between turns (no database write
 * per answer) and is fully re-validated by sanitizeState() on every request,
 * so a tampered state can never smuggle in fields, operators or other users'
 * data. A lead is only persisted when the user confirms the summary.
 */
const { bank, say, chips, pick, fill } = require("./questionBank");
const { parseMessage, DISTANCE_KEYS } = require("./parser");
const llm = require("./llm");
const matcher = require("./matcher");
const fmt = require("./format");

const LANGS = ["en", "hinglish", "hi"];
const COLLECT_SLOTS = ["mode", "location", "budget", "bhk", "propertyType", "furnishing", "moveIn", "occupancy", "area", "possession", "purpose", "priorities", "distances", "corner"];
const CONTACT_SLOTS = ["name", "phone", "email", "review"];
const REQUIRED = bank.flows.requiredBeforeSearch;
const FOLLOW_UPS = ["location.strict", "budget.strict", "bhk.familySize", "occupancy.pets"];
const MAX_SHOWN = 30;
const FOLLOW_UPS_ENABLED = false;

/* ------------------------------------------------------------- state */

function emptyState(lang = "en") {
  return {
    v: 1,
    lang,
    langLocked: false,
    phase: "collect",
    req: { priorities: {} },
    answered: [],
    skipped: [],
    asked: [],
    distanceAsked: [],
    slot: null,
    distanceParam: null,
    pending: null,
    strikes: 0,
    contact: {},
    shown: [],
    offset: 0,
    turn: 0,
    aiUsed: false,
    lastResultCount: null,
  };
}

const arr = (v, max = 20) => (Array.isArray(v) ? v.slice(0, max) : []);
const oneOf = (v, list) => (list.includes(v) ? v : undefined);
const posNum = (v, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n) : undefined;
};

function sanitizeReq(r = {}) {
  const req = { priorities: {} };
  req.mode = oneOf(r.mode, ["rent", "sale"]);
  req.sectors = arr(r.sectors, 6).map(String).filter((s) => /^\d{1,3}[A-D]?$/.test(s));
  const names = new Set(bank.lexicon.localities.map((l) => l.name));
  req.localities = arr(r.localities, 4).filter((x) => names.has(x));
  if (r.anywhere === true) req.anywhere = true;
  req.locationScope = oneOf(r.locationScope, ["strict", "nearby"]);
  req.budgetMax = posNum(r.budgetMax, 2e9);
  req.budgetMin = posNum(r.budgetMin, 2e9);
  if (req.budgetMin && req.budgetMax && req.budgetMin >= req.budgetMax) req.budgetMin = undefined;
  ["budgetApprox", "budgetFlexible", "budgetStretch", "bhkPlus", "bhkAny", "propertyTypeAny", "areaAny", "prioritiesNone"].forEach((k) => {
    if (r[k] === true) req[k] = true;
  });
  if (r.budgetStretch === false) req.budgetStretch = false;
  req.bhk = arr(r.bhk, 5).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 10);
  req.propertyType = arr(r.propertyType, 4).filter((t) => ["apartment", "builder-floor", "house", "villa", "studio", "1RK", "plot", "townhouse"].includes(t));
  req.furnishing = oneOf(r.furnishing, ["furnished", "semi-furnished", "unfurnished", "any"]);
  if (r.moveIn && typeof r.moveIn === "object") {
    const days = r.moveIn.days === null ? null : posNum(r.moveIn.days, 730) ?? (Number(r.moveIn.days) === 0 ? 0 : undefined);
    req.moveIn = { days: days === undefined ? null : days, key: String(r.moveIn.key || "").slice(0, 20), date: /^\d{4}-\d{2}-\d{2}$/.test(r.moveIn.date || "") ? r.moveIn.date : undefined };
  }
  req.occupancy = oneOf(r.occupancy, ["family", "bachelor", "bachelor_male", "bachelor_female", "couple", "professionals", "company", "students"]);
  req.people = posNum(r.people, 20);
  if (typeof r.pets === "boolean") req.pets = r.pets;
  req.minAreaSqft = posNum(r.minAreaSqft, 500000);
  req.possession = oneOf(r.possession, ["ready", "under-construction", "any"]);
  req.purpose = oneOf(r.purpose, ["self", "investment", "both"]);
  if (r.priorities && typeof r.priorities === "object") {
    for (const k of DISTANCE_KEYS) {
      if (!(k in r.priorities)) continue;
      const v = r.priorities[k];
      req.priorities[k] = v === null ? null : posNum(v, 20000) ?? null;
    }
  }
  req.corner = oneOf(r.corner, ["corner", "middle", "any"]);
  Object.keys(req).forEach((k) => (req[k] === undefined || (Array.isArray(req[k]) && !req[k].length && k !== "priorities")) && delete req[k]);
  return req;
}

function sanitizeState(input) {
  const s = emptyState();
  if (!input || typeof input !== "object") return s;
  s.lang = oneOf(input.lang, LANGS) || "en";
  s.langLocked = input.langLocked === true;
  s.phase = oneOf(input.phase, ["collect", "results", "contact", "review", "done"]) || "collect";
  s.req = sanitizeReq(input.req);
  const slotIds = [...COLLECT_SLOTS, ...CONTACT_SLOTS];
  s.answered = arr(input.answered, 30).filter((x) => slotIds.includes(x));
  s.skipped = arr(input.skipped, 30).filter((x) => slotIds.includes(x));
  s.asked = arr(input.asked, 40).filter((x) => slotIds.includes(x) || FOLLOW_UPS.includes(x));
  s.distanceAsked = arr(input.distanceAsked, 6).filter((x) => DISTANCE_KEYS.includes(x));
  s.slot = oneOf(input.slot, slotIds) || null;
  s.distanceParam = oneOf(input.distanceParam, DISTANCE_KEYS) || null;
  const p = input.pending;
  if (p && typeof p === "object") {
    if (p.type === "confirmBudget" && posNum(p.value, 2e9)) s.pending = { type: "confirmBudget", value: posNum(p.value, 2e9) };
    else if (p.type === "switchMode" && ["rent", "sale"].includes(p.to)) s.pending = { type: "switchMode", to: p.to, value: posNum(p.value, 2e9) };
    else if (p.type === "relax" && ["budget", "bhk", "location", "type"].includes(p.reason)) s.pending = { type: "relax", reason: p.reason, suggestion: posNum(p.suggestion, 2e9) };
    else if (p.type === "followUp" && FOLLOW_UPS.includes(p.id)) s.pending = { type: "followUp", id: p.id };
  }
  s.strikes = Math.min(5, posNum(input.strikes, 5) || 0);
  const c = input.contact || {};
  s.contact = {};
  if (typeof c.name === "string" && c.name.trim().length >= 2) s.contact.name = c.name.replace(/[^A-Za-zऀ-ॿ .'-]/g, "").trim().slice(0, 60);
  if (/^[6-9]\d{9}$/.test(String(c.phone || ""))) s.contact.phone = String(c.phone);
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(c.email || "")) && String(c.email).length <= 120) s.contact.email = String(c.email).toLowerCase();
  if (c.emailSkipped === true) s.contact.emailSkipped = true;
  s.shown = arr(input.shown, MAX_SHOWN)
    .filter((x) => x && /^[a-f0-9]{24}$/i.test(String(x.id)) && ["rental", "sale"].includes(x.listingType))
    .map((x) => ({ id: String(x.id), listingType: x.listingType }));
  s.offset = Math.min(150, Number.isInteger(input.offset) && input.offset >= 0 ? input.offset : 0);
  s.turn = Math.min(10000, Number.isInteger(input.turn) && input.turn >= 0 ? input.turn : 0);
  s.aiUsed = input.aiUsed === true;
  s.lastResultCount = Number.isInteger(input.lastResultCount) ? input.lastResultCount : null;
  return s;
}

/* ------------------------------------------------------------- helpers */

const has = (s, slot) => s.answered.includes(slot) || s.skipped.includes(slot);
const markAnswered = (s, slot) => {
  if (!s.answered.includes(slot)) s.answered.push(slot);
  s.skipped = s.skipped.filter((x) => x !== slot);
};
const markSkipped = (s, slot) => {
  if (!s.skipped.includes(slot) && !s.answered.includes(slot)) s.skipped.push(slot);
};
const flowFor = (s) => (s.req.mode === "sale" ? bank.flows.sale : bank.flows.rent);
const slotDef = (slot) => bank.slots[slot];

function slotApplies(s, slot) {
  const def = slotDef(slot);
  if (!def) return false;
  if (def.appliesTo && s.req.mode && !def.appliesTo.includes(s.req.mode)) return false;
  if (slot === "bhk" && (s.req.propertyType || []).length === 1 && s.req.propertyType[0] === "plot") return false;
  if (slot === "furnishing" && (s.req.propertyType || []).includes("plot")) return false;
  if (slot === "distances") return pendingDistanceParams(s).length > 0;
  return true;
}

function pendingDistanceParams(s) {
  return Object.entries(s.req.priorities || {})
    .filter(([k, v]) => v === null && !s.distanceAsked.includes(k))
    .map(([k]) => k);
}

function requiredMissing(s) {
  return REQUIRED.filter((slot) => !s.answered.includes(slot));
}

function nextCollectSlot(s) {
  for (const slot of flowFor(s)) {
    if (slot === "distances") {
      if (pendingDistanceParams(s).length) return slot;
      continue;
    }
    if (!slotApplies(s, slot)) continue;
    if (!has(s, slot)) return slot;
  }
  return null;
}

function nextContactSlot(s) {
  if (!s.contact.name) return "name";
  if (!s.contact.phone) return "phone";
  if (!s.contact.email && !s.contact.emailSkipped) return "email";
  return "review";
}

function locationLabel(s) {
  return fmt.formatLocation(s.req, s.lang);
}

function vars(s, extra = {}) {
  return {
    location: locationLabel(s),
    budget: fmt.formatBudget(s.req, s.req.mode, s.lang),
    bhk: fmt.formatBhk(s.req.bhk, s.req.bhkPlus, s.lang),
    type: (s.req.propertyType || []).map((t) => fmt.typeLabel(t, s.lang)).join(", "),
    name: s.contact.name || "",
    ...extra,
  };
}

/* --------------------------------------------------- questions & chips */

const skipChip = (lang) => ({ value: "skip", label: { en: "Skip", hinglish: "Skip", hi: "छोड़ें" }[lang] });
const showNowChip = (lang) => ({ value: "show results", label: { en: "⚡ Show results now", hinglish: "⚡ Abhi results dikhao", hi: "⚡ अभी नतीजे दिखाओ" }[lang] });

function questionFor(s, slot) {
  const def = slotDef(slot);
  const lang = s.lang;
  const mode = s.req.mode || "rent";
  const v = vars(s);
  if (slot === "distances") {
    const param = pendingDistanceParams(s)[0];
    s.distanceParam = param;
    const p = bank.parameters[param];
    const intro = !s.asked.includes("distances") ? `${say(def.intro, lang, s.turn)} ` : "";
    const list = p.distanceChips.map((c) => ({ value: `${c.meters} m`, label: c.label[lang] || c.label.en }));
    list.push({ value: "skip", label: { en: "Any distance", hinglish: "Koi bhi distance", hi: "कोई भी दूरी" }[lang] });
    return {
      text: `${intro}${say(p.distanceAsk, lang, s.turn)}`,
      chips: list,
      hint: p.why[lang] || p.why.en,
      slot,
      param,
    };
  }
  const ask = def.ask && (def.ask.rent || def.ask.sale) ? def.ask[mode] : def.ask;
  const chipList = def.chips ? (Array.isArray(def.chips) ? def.chips : def.chips[mode] || def.chips.rent) : [];
  const out = { text: say(ask, lang, s.turn, v), chips: chips(chipList, lang, v), slot };
  if (def.multiSelect) out.multi = true;
  const hint = def.hint && (def.hint.rent || def.hint.sale) ? def.hint[mode] : def.hint;
  if (hint) out.hint = pick(hint, lang, 0);
  if (!def.required && slot !== "email" && !def.chips?.some?.((c) => c.value === "skip")) {
    if (!out.chips.some((c) => c.value === "skip" || /^any|none|no preference|budget is flexible/.test(c.value))) out.chips.push(skipChip(lang));
  }
  if (s.phase === "collect" && !requiredMissing(s).length && !["mode", "location", "budget", "priorities"].includes(slot)) out.chips.push(showNowChip(lang));
  if (slot === "phone") out.inputType = "tel";
  if (slot === "email") out.inputType = "email";
  return out;
}

function followUpQuestion(s, id) {
  const [slot] = id.split(".");
  const fu = (slotDef(slot).followUps || []).find((f) => f.id === id);
  if (!fu) return null;
  const v = vars(s);
  return { text: say(fu.ask, s.lang, s.turn, v), chips: chips(fu.chips || [], s.lang, v).concat(fu.chips ? [] : [{ value: "yes", label: { en: "Yes", hinglish: "Haan", hi: "हाँ" }[s.lang] }, { value: "no", label: { en: "No", hinglish: "Nahi", hi: "नहीं" }[s.lang] }]), slot, followUp: id };
}

function dueFollowUp(s, justAnswered) {
  // Kept deliberately quiet: the five-question flow never stops to ask
  // follow-ups. Strictness and distances use sensible defaults, and the
  // no-match diagnosis offers to relax anything that empties the results.
  if (FOLLOW_UPS_ENABLED !== true) return null;
  const r = s.req;
  const candidates = [];
  if (justAnswered.includes("location") && (r.sectors || []).length + (r.localities || []).length === 1 && !r.anywhere && !r.locationScope) candidates.push("location.strict");
  if (justAnswered.includes("budget") && r.budgetMax && !r.budgetApprox && !r.budgetFlexible && r.budgetStretch === undefined) candidates.push("budget.strict");
  if (justAnswered.includes("bhk") && r.mode === "rent" && Math.min(...(r.bhk || [0])) >= 3 && !r.occupancy) candidates.push("bhk.familySize");
  if (justAnswered.includes("occupancy") && r.mode === "rent" && r.pets === undefined && r.occupancy) candidates.push("occupancy.pets");
  return candidates.find((id) => !s.asked.includes(id)) || null;
}

/* ------------------------------------------------------ applying fields */

function describeSlot(s, slot) {
  const r = s.req;
  const lang = s.lang;
  switch (slot) {
    case "mode": return r.mode === "sale" ? { en: "Buy", hinglish: "Buy", hi: "ख़रीद" }[lang] : { en: "Rent", hinglish: "Rent", hi: "किराया" }[lang];
    case "location": return locationLabel(s);
    case "budget": return fmt.formatBudget(r, r.mode, lang);
    case "bhk": return r.bhkAny ? { en: "Any BHK", hinglish: "Koi bhi BHK", hi: "कोई भी BHK" }[lang] : fmt.formatBhk(r.bhk, r.bhkPlus, lang);
    case "propertyType": return r.propertyTypeAny ? { en: "Any type", hinglish: "Koi bhi type", hi: "कोई भी प्रकार" }[lang] : (r.propertyType || []).map((t) => fmt.typeLabel(t, lang)).join(", ");
    case "furnishing": return fmt.furnishingLabel(r.furnishing, lang);
    case "moveIn": return fmt.moveInLabel(r.moveIn, lang);
    case "occupancy": {
      const base = fmt.occupancyLabel(r.occupancy, lang);
      const extra = [r.people ? `${r.people} ${lang === "hi" ? "लोग" : lang === "hinglish" ? "log" : "people"}` : "", r.pets === true ? "🐾" : ""].filter(Boolean).join(" · ");
      return [base, extra].filter(Boolean).join(" · ");
    }
    case "area": return r.areaAny ? { en: "Any size", hinglish: "Koi bhi size", hi: "कोई भी साइज़" }[lang] : r.minAreaSqft ? `${r.minAreaSqft.toLocaleString("en-IN")}+ sq ft` : "";
    case "possession": return fmt.possessionLabel(r.possession, lang);
    case "purpose": return fmt.purposeLabel(r.purpose, lang);
    case "priorities": return r.prioritiesNone ? { en: "None", hinglish: "Kuch nahi", hi: "कुछ नहीं" }[lang] : fmt.formatPriorities(r.priorities, lang);
    case "corner": return fmt.cornerLabel(r.corner, lang);
    default: return "";
  }
}

/**
 * Merges parsed fields into the state. Returns the list of slots touched and
 * whether each was a correction of an earlier answer.
 */
function applyFields(s, f, { message = "" } = {}) {
  const r = s.req;
  const touched = [];
  const touch = (slot) => {
    const corrected = s.answered.includes(slot);
    markAnswered(s, slot);
    touched.push({ slot, corrected });
  };
  const additive = /(?<![a-z])(also|add|plus|bhi|aur bhi|as well)(?![a-z])/i.test(message);

  if (f.mode && f.mode !== r.mode) {
    const switching = Boolean(r.mode);
    r.mode = f.mode;
    if (switching) {
      ["budgetMax", "budgetMin", "budgetApprox", "budgetStretch", "budgetFlexible"].forEach((k) => delete r[k]);
      s.answered = s.answered.filter((x) => x !== "budget");
      s.asked = s.asked.filter((x) => x !== "budget" && x !== "budget.strict");
    }
    touch("mode");
  } else if (f.mode && !s.answered.includes("mode")) touch("mode");
  else if (f.modeGuess && !r.mode) {
    r.mode = f.modeGuess;
    touch("mode");
  }

  if ((f.sectors && f.sectors.length) || (f.localities && f.localities.length)) {
    if (additive && s.answered.includes("location")) {
      r.sectors = [...new Set([...(r.sectors || []), ...(f.sectors || [])])].slice(0, 6);
      r.localities = [...new Set([...(r.localities || []), ...(f.localities || [])])].slice(0, 4);
    } else {
      r.sectors = (f.sectors || []).slice(0, 6);
      r.localities = (f.localities || []).slice(0, 4);
    }
    delete r.anywhere;
    touch("location");
  } else if (f.anywhere) {
    r.anywhere = true;
    r.sectors = [];
    r.localities = [];
    touch("location");
  }
  if (f.locationScope) r.locationScope = f.locationScope;

  if (f.budgetFlexible && !f.budgetMax && !f.budgetMin) {
    ["budgetMax", "budgetMin", "budgetApprox"].forEach((k) => delete r[k]);
    r.budgetFlexible = true;
    touch("budget");
  } else if (f.budgetMax || f.budgetMin) {
    const mode = r.mode;
    const value = f.budgetMax || f.budgetMin;
    if (mode === "rent" && value > 500000) {
      s.pending = { type: "switchMode", to: "sale", value };
    } else if (mode === "sale" && value < 500000) {
      s.pending = { type: "switchMode", to: "rent", value };
    }
    r.budgetMax = f.budgetMax || undefined;
    r.budgetMin = f.budgetMin || undefined;
    if (!r.budgetMax) delete r.budgetMax;
    if (!r.budgetMin) delete r.budgetMin;
    if (f.budgetApprox) r.budgetApprox = true;
    else delete r.budgetApprox;
    delete r.budgetFlexible;
    if (f.budgetStrictHint) {
      r.budgetStretch = false;
      if (!s.asked.includes("budget.strict")) s.asked.push("budget.strict");
    }
    touch("budget");
  } else if (f.budgetConfirm && s.slot === "budget") {
    s.pending = { type: "confirmBudget", value: f.budgetConfirm.value };
  }

  if (f.bhkAny) {
    r.bhk = [];
    r.bhkAny = true;
    delete r.bhkPlus;
    touch("bhk");
  } else if (f.bhk && f.bhk.length) {
    r.bhk = f.bhk;
    delete r.bhkAny;
    if (f.bhkPlus) r.bhkPlus = true;
    else delete r.bhkPlus;
    touch("bhk");
  }

  if (f.propertyTypeAny) {
    r.propertyType = [];
    r.propertyTypeAny = true;
    touch("propertyType");
  } else if (f.propertyType && f.propertyType.length) {
    r.propertyType = f.propertyType;
    delete r.propertyTypeAny;
    touch("propertyType");
    if (f.propertyType.includes("plot") && f.propertyType.length === 1) markSkipped(s, "bhk");
  }

  if (f.furnishing) {
    r.furnishing = f.furnishing;
    touch("furnishing");
  }
  if (f.moveIn) {
    r.moveIn = f.moveIn;
    touch("moveIn");
  }
  if (f.occupancy) {
    r.occupancy = f.occupancy;
    touch("occupancy");
  }
  if (f.people) r.people = f.people;
  if (typeof f.pets === "boolean") {
    r.pets = f.pets;
    if (!s.asked.includes("occupancy.pets")) s.asked.push("occupancy.pets");
  }
  if (f.minAreaSqft) {
    r.minAreaSqft = f.minAreaSqft;
    delete r.areaAny;
    touch("area");
  } else if (f.areaAny) {
    r.areaAny = true;
    delete r.minAreaSqft;
    touch("area");
  }
  if (f.possession) {
    r.possession = f.possession;
    touch("possession");
  }
  if (f.purpose) {
    r.purpose = f.purpose;
    touch("purpose");
  }

  if (f.prioritiesNone && !f.priorities) {
    r.priorities = {};
    r.prioritiesNone = true;
    touch("priorities");
  } else if (f.priorities || f.removedPriorities) {
    const next = { ...(r.priorities || {}) };
    for (const [k, v] of Object.entries(f.priorities || {})) {
      if (v === null && Number(next[k]) > 0 && !(s.slot === "distances" && s.distanceParam === k)) continue;
      next[k] = v;
      if (v !== null && !s.distanceAsked.includes(k)) s.distanceAsked.push(k);
    }
    if (s.slot === "distances" && s.distanceParam && f.priorities && s.distanceParam in f.priorities && !s.distanceAsked.includes(s.distanceParam)) s.distanceAsked.push(s.distanceParam);
    for (const k of f.removedPriorities || []) delete next[k];
    r.priorities = next;
    delete r.prioritiesNone;
    touch("priorities");
  }

  if (f.corner) {
    r.corner = f.corner;
    touch("corner");
  }

  // Contact
  if (f.name && (s.slot === "name" || /my name is|mera naam|मेरा नाम/i.test(message))) s.contact.name = f.name;
  if (f.phone) {
    if (/^[6-9]\d{9}$/.test(f.phone)) s.contact.phone = f.phone;
  }
  if (f.email) {
    s.contact.email = f.email.toLowerCase();
    delete s.contact.emailSkipped;
  }

  s.req = sanitizeReq(r);
  return touched;
}

function ackFor(s, touched) {
  const lang = s.lang;
  const real = touched.filter((t) => t.slot !== "distances");
  if (!real.length) return "";
  if (real.length === 1) {
    const { slot, corrected } = real[0];
    const value = describeSlot(s, slot);
    if (corrected) return cap(say(bank.responses.updated, lang, s.turn, { field: fmt.fieldName(slot, lang), value }));
    if (slot === "mode") return say(bank.slots.mode.ack[s.req.mode], lang, s.turn);
    if (slot === "location" && s.req.anywhere) return say(bank.slots.location.anywhereAck, lang, s.turn);
    if (slot === "priorities" && s.req.prioritiesNone) return say(bank.responses.skipped, lang, s.turn);
    if (slot === "area" && s.req.areaAny) return say(bank.responses.skipped, lang, s.turn);
    const def = slotDef(slot);
    return def && def.ack ? cap(say(def.ack, lang, s.turn, vars(s, { value, type: value, bhk: value, location: slot === "location" ? value : locationLabel(s) }))) : "";
  }
  const summary = real.map((t) => describeSlot(s, t.slot)).filter(Boolean).join(" · ");
  return say(bank.responses.understoodMany, lang, s.turn, { value: summary });
}

const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

/* ------------------------------------------------------------- summary */

function summaryOf(s) {
  const slots = ["mode", "location", "budget", "bhk", "propertyType", "furnishing", "moveIn", "occupancy", "area", "possession", "purpose", "priorities", "corner"];
  return slots
    .filter((slot) => s.answered.includes(slot))
    .map((slot) => ({ slot, label: cap(fmt.fieldName(slot, s.lang)), value: describeSlot(s, slot) }))
    .filter((x) => x.value);
}

function progressOf(s) {
  const flow = flowFor(s).filter((x) => x !== "distances" && slotApplies(s, x));
  const done = flow.filter((x) => has(s, x)).length;
  return { done, total: flow.length };
}

function ui(s) {
  return {
    phase: s.phase,
    slot: s.slot,
    lang: s.lang,
    progress: progressOf(s),
    summary: summaryOf(s),
    contact: { name: s.contact.name || "", phone: s.contact.phone ? `${s.contact.phone.slice(0, 2)}••••••${s.contact.phone.slice(-2)}` : "", email: s.contact.email || "" },
    canSearch: requiredMissing(s).length === 0,
    speechLang: bank.languages[s.lang].speechLang,
  };
}

/* ----------------------------------------------------------- turn logic */

function askNext(s, messages, prefix = "") {
  if (s.phase === "contact" || s.phase === "review") {
    const slot = nextContactSlot(s);
    s.slot = slot;
    if (slot === "review") {
      s.phase = "review";
      messages.push({ text: [prefix, say(bank.slots.review.ask, s.lang, s.turn)].filter(Boolean).join(" "), kind: "review", consentText: bank.slots.review.consentText[s.lang] });
      return "review";
    }
    const q = questionFor(s, slot);
    if (!s.asked.includes(slot)) s.asked.push(slot);
    messages.push({ ...q, text: [prefix, q.text].filter(Boolean).join(" "), kind: "question" });
    return null;
  }
  const slot = nextCollectSlot(s);
  if (!slot) {
    s.slot = null;
    messages.push({ text: [prefix, say(bank.responses.readyToSearch, s.lang, s.turn)].filter(Boolean).join(" "), kind: "info" });
    return "search";
  }
  s.slot = slot;
  const q = questionFor(s, slot);
  if (!s.asked.includes(slot)) s.asked.push(slot);
  messages.push({ ...q, text: [prefix, q.text].filter(Boolean).join(" "), kind: "question" });
  return null;
}

function reAsk(s, messages, prefix) {
  if (s.phase === "results" || s.phase === "done") {
    const resultChips = bank.responses.afterResultsChips.filter((c) => c.value !== "show more" || (s.lastResultCount || 0) > s.shown.length);
    messages.push({ text: [prefix, say(bank.responses.afterResults, s.lang, s.turn)].filter(Boolean).join(" "), chips: chips(resultChips, s.lang), kind: "info" });
    return null;
  }
  if (s.pending && s.pending.type === "followUp") {
    const q = followUpQuestion(s, s.pending.id);
    if (q) {
      messages.push({ ...q, text: [prefix, q.text].filter(Boolean).join(" "), kind: "question" });
      return null;
    }
  }
  return askNext(s, messages, prefix);
}

function startContact(s, messages, prefix) {
  s.phase = "contact";
  s.pending = null;
  // One friendly line is enough before the first contact question.
  return askNext(s, messages, prefix || say(bank.responses.enquiryStart, s.lang, s.turn));
}

async function describeListing(s, index, nearbyOnly) {
  const idx = index === "last" ? s.shown.length : Number(index);
  const ref = s.shown[idx - 1];
  if (!ref) {
    const key = s.shown.length ? "propertyNotFound" : s.phase === "collect" ? "noResultsYet" : "noHomesOnScreen";
    return { text: say(bank.responses[key], s.lang, s.turn, { index: idx }) };
  }
  const doc = await matcher.findListing(ref.id, ref.listingType);
  if (!doc) return { text: say(bank.responses.propertyNotFound, s.lang, s.turn, { index: idx }) };
  const card = matcher.cardFor(doc, { ...s.req, mode: ref.listingType === "sale" ? "sale" : "rent" }, matcher.scoreListing(doc, { ...s.req, mode: ref.listingType === "sale" ? "sale" : "rent" }, s.lang, Date.now()), s.lang);
  const lang = s.lang;
  const near = Object.entries(card.params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${fmt.paramLabel(k, lang)} ~${fmt.formatMeters(v.meters, lang)}${v.name ? ` (${v.name})` : ""}`);
  const cornerText = card.corner === "corner" || card.corner === "middle" ? fmt.cornerLabel(card.corner, lang) : null;
  const nearText = near.length ? `${near.join(" · ")}. ${bank.responses.distanceDisclaimer[lang]}` : say(bank.responses.nearbyUnverified, lang, s.turn);
  const head = `#${idx} ${card.title} — ${card.priceLabel}${card.bhkLabel ? ` · ${card.bhkLabel}` : ""}${card.sector ? ` · ${card.sector}` : ""}${card.areaSqft ? ` · ${card.areaSqft.toLocaleString("en-IN")} sq ft` : ""}${card.furnishing ? ` · ${fmt.furnishingLabel(card.furnishing, lang)}` : ""}.`;
  const text = nearbyOnly ? `${say(bank.intents.propertyNearby.reply, lang, s.turn)} ${nearText}${cornerText ? ` · ${cornerText}` : ""}` : `${head} ${nearText}${cornerText ? ` · ${fmt.paramLabel("corner", lang)}: ${cornerText}` : ""}`;
  return { text, listing: card };
}

/**
 * One conversational turn.
 * @param {{state:object, message?:string, action?:{type:string,slot?:string,lang?:string}}} input
 * @returns {Promise<{state, messages, next, ui}>}
 */
async function handleTurn({ state: rawState, message, action }) {
  let s = sanitizeState(rawState);
  const messages = [];
  let next = null;
  s.turn += 1;
  const text = typeof message === "string" ? message.trim().slice(0, 600) : "";

  // ---- structured actions from the UI
  if (action && typeof action === "object") {
    if (action.type === "start") {
      if (oneOf(action.lang, LANGS)) {
        s.lang = action.lang;
        s.langLocked = Boolean(action.langLocked);
      }
      const fresh = s.turn <= 1 || (!s.answered.length && s.phase === "collect");
      messages.push({ text: say(bank.responses[fresh ? "welcome" : "welcomeBack"], s.lang, 0), kind: "welcome" });
      if (s.phase === "results" || s.phase === "done") reAsk(s, messages, "");
      else next = askNext(s, messages, "");
      return { state: s, messages, next, ui: ui(s) };
    }
    if (action.type === "setLanguage" && oneOf(action.lang, LANGS)) {
      s.lang = action.lang;
      s.langLocked = true;
      const reply = { en: "Switched to English.", hinglish: "Theek hai, ab Hinglish mein baat karte hain.", hi: "अब मैं हिन्दी में बात करूँगा।" }[s.lang];
      next = reAsk(s, messages, reply);
      return { state: s, messages, next, ui: ui(s) };
    }
    if (action.type === "edit" && [...COLLECT_SLOTS].includes(action.slot)) {
      const slot = action.slot === "distances" ? "priorities" : action.slot;
      s.answered = s.answered.filter((x) => x !== slot);
      s.skipped = s.skipped.filter((x) => x !== slot);
      if (slot === "priorities") s.distanceAsked = [];
      if (s.phase !== "collect") s.phase = "collect";
      s.pending = null;
      s.slot = slot;
      const q = questionFor(s, slot);
      messages.push({ ...q, kind: "question" });
      return { state: s, messages, next: null, ui: ui(s) };
    }
    if (action.type === "contact") {
      next = startContact(s, messages, "");
      return { state: s, messages, next, ui: ui(s) };
    }
  }

  if (!text) {
    next = reAsk(s, messages, "");
    return { state: s, messages, next, ui: ui(s) };
  }

  // While an optional follow-up is open, read the message as an answer to the next real question.
  const parseSlot = s.pending && s.pending.type === "followUp" ? nextCollectSlot(s) : s.slot;
  if (parseSlot !== s.slot && parseSlot === "distances") pendingDistanceParams(s);
  const parsed = parseMessage(text, { slot: parseSlot, mode: s.req.mode, distanceParam: parseSlot === "distances" ? pendingDistanceParams(s)[0] : s.distanceParam, lang: s.lang });
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (parsed.setLanguage) {
    s.lang = parsed.setLanguage;
    s.langLocked = true;
  } else if (!s.langLocked && parsed.language !== s.lang) {
    // Switch only on clear evidence so "3 BHK" doesn't flip a Hindi chat to English.
    if (parsed.language === "hi" || (s.lang === "hi" ? wordCount >= 4 : wordCount >= 3)) s.lang = parsed.language;
  }
  const lang = s.lang;
  const intents = parsed.intents || [];
  const hasIntent = (id) => intents.includes(id);

  // ---- global intents
  if (hasIntent("restart")) {
    const keepLang = s.lang;
    const locked = s.langLocked;
    s = emptyState(keepLang);
    s.langLocked = locked;
    s.turn = 1;
    next = askNext(s, messages, say(bank.intents.restart.reply, keepLang, 0));
    return { state: s, messages, next, ui: ui(s) };
  }
  if (hasIntent("cancel") && parsed.fieldCount === 0) {
    messages.push({ text: say(bank.intents.cancel.reply, lang, s.turn), kind: "info" });
    return { state: s, messages, next: null, ui: ui(s) };
  }
  if (parsed.setLanguage && parsed.fieldCount === 0) {
    const id = intents.find((i) => i.startsWith("lang"));
    next = reAsk(s, messages, say(bank.intents[id].reply, lang, 0));
    return { state: s, messages, next, ui: ui(s) };
  }
  if (hasIntent("help") && parsed.fieldCount === 0) {
    next = reAsk(s, messages, say(bank.intents.help.reply, lang, s.turn));
    return { state: s, messages, next, ui: ui(s) };
  }

  // ---- pending confirmations
  const pending = s.pending;
  if (pending) {
    s.pending = null;
    if (pending.type === "confirmBudget") {
      if (parsed.yes) {
        s.req.budgetMax = pending.value;
        markAnswered(s, "budget");
        const ack = say(bank.slots.budget.ack, lang, s.turn, vars(s));
        next = continueCollect(s, messages, ack, ["budget"]);
        return { state: s, messages, next, ui: ui(s) };
      }
      if (parsed.no && !parsed.budgetMax) {
        s.slot = "budget";
        messages.push({ ...questionFor(s, "budget"), kind: "question" });
        return { state: s, messages, next: null, ui: ui(s) };
      }
    } else if (pending.type === "switchMode") {
      if (parsed.yes) {
        const value = pending.value;
        s.req.mode = pending.to;
        s.req.budgetMax = value;
        markAnswered(s, "mode");
        markAnswered(s, "budget");
        const ack = [say(bank.slots.mode.ack[pending.to], lang, s.turn), say(bank.slots.budget.ack, lang, s.turn, vars(s))].join(" ");
        next = continueCollect(s, messages, ack, ["budget"]);
        return { state: s, messages, next, ui: ui(s) };
      }
      if (parsed.no) {
        s.answered = s.answered.filter((x) => x !== "budget");
        delete s.req.budgetMax;
        delete s.req.budgetMin;
        s.slot = "budget";
        messages.push({ ...questionFor(s, "budget"), kind: "question" });
        return { state: s, messages, next: null, ui: ui(s) };
      }
    } else if (pending.type === "relax") {
      if (parsed.yes && !hasIntent("contactMe") && !/contact me/.test(text.toLowerCase())) {
        const field = applyRelax(s, pending);
        messages.push({ text: say(bank.responses.relaxed, lang, s.turn, { field: fmt.fieldName(field, lang) }), kind: "info" });
        return { state: s, messages, next: "search", ui: ui(s) };
      }
      if (parsed.no) {
        messages.push({ text: say(bank.responses.keptFilters, lang, s.turn), chips: chips(bank.responses.afterResultsChips.filter((c) => c.value !== "show more"), lang), kind: "info" });
        return { state: s, messages, next: null, ui: ui(s) };
      }
    } else if (pending.type === "followUp") {
      const handled = applyFollowUp(s, pending.id, parsed, text);
      if (handled) {
        const touched = applyFields(s, parsed, { message: text });
        next = continueCollect(s, messages, ackFor(s, touched), touched.map((t) => t.slot), { fromFollowUp: true });
        return { state: s, messages, next, ui: ui(s) };
      }
      // Not an answer to the optional follow-up: treat it as an answer to the next question.
      s.slot = parseSlot;
      if (parseSlot === "distances") s.distanceParam = pendingDistanceParams(s)[0] || null;
    }
  }

  // ---- contact / results intents
  const lower = text.toLowerCase();
  if (/^(yes )?contact me$|^arrange visits?$/.test(lower) || hasIntent("contactMe") || (hasIntent("human") && s.phase !== "contact" && s.phase !== "review")) {
    if (parsed.phone || parsed.name || parsed.email) applyFields(s, parsed, { message: text });
    const prefix = hasIntent("human") ? say(bank.intents.human.reply, lang, s.turn) : say(bank.intents.contactMe.reply, lang, s.turn);
    next = startContact(s, messages, prefix);
    return { state: s, messages, next, ui: ui(s) };
  }
  const changeMatch = lower.match(/^change (budget|location|bhk|nearby)$/);
  if (changeMatch) {
    const slot = { budget: "budget", location: "location", bhk: "bhk", nearby: "priorities" }[changeMatch[1]];
    return handleTurn({ state: s, action: { type: "edit", slot } });
  }
  if (lower === "refine") {
    const extra = s.req.mode === "sale" ? bank.responses.refineChipsSale : bank.responses.refineChipsRent;
    messages.push({ text: say(bank.responses.refinePrompt, lang, s.turn), chips: chips([...(extra || []), ...bank.responses.refineChips], lang), kind: "question" });
    return { state: s, messages, next: null, ui: ui(s) };
  }
  if ((hasIntent("propertyDetail") || hasIntent("propertyNearby")) && parsed.ordinal && parsed.fieldCount === 0) {
    const d = await describeListing(s, parsed.ordinal, hasIntent("propertyNearby") && !hasIntent("propertyDetail"));
    messages.push({ text: d.text, listing: d.listing, chips: chips(bank.responses.afterResultsChips, lang), kind: "listing" });
    return { state: s, messages, next: null, ui: ui(s) };
  }
  if (hasIntent("moreResults") && (s.phase === "results" || s.phase === "done") && parsed.fieldCount === 0) {
    s.offset += matcher.PAGE_SIZE;
    return { state: s, messages, next: "searchMore", ui: ui(s) };
  }

  // ---- fields
  const distanceParamBefore = s.slot === "distances" ? s.distanceParam : null;
  let touched = applyFields(s, parsed, { message: text });
  // "Corner home" is one of the nearby-question options, so it answers it.
  if (s.slot === "priorities" && touched.some((t) => t.slot === "corner") && !s.answered.includes("priorities")) markAnswered(s, "priorities");
  // Side details (pets, head-count, "nearby areas are fine") aren't questions of
  // their own but are still understood and saved.
  const sideInfo = Boolean(parsed.locationScope || typeof parsed.pets === "boolean" || parsed.people);
  let understood = touched.length > 0 || sideInfo || Boolean(s.pending) || Boolean(parsed.phone || parsed.email || (parsed.name && s.slot === "name"));

  // Optional model assistance when rules understood nothing.
  if (!understood && !parsed.yes && !parsed.no && !parsed.skip && !intents.length && text.length >= 4 && /[a-zऀ-ॿ]/i.test(text)) {
    let ai = null;
    try {
      ai = await llm.extract(text, { slot: s.slot, mode: s.req.mode, lang });
    } catch (_) {
      ai = null;
    }
    if (ai && ai.confidence >= 0.5 && Object.keys(ai.fields).length) {
      s.aiUsed = true;
      touched = applyFields(s, ai.fields, { message: text });
      understood = touched.length > 0;
    } else if (ai && ai.intent === "general_question" && !parsed.faqId) {
      const answer = await llm.answerGeneral(text, lang).catch(() => null);
      if (answer) {
        s.aiUsed = true;
        next = reAsk(s, messages, answer);
        return { state: s, messages, next, ui: ui(s) };
      }
    }
  }

  // FAQ / small talk (only when the message carried no requirements)
  if (!understood) {
    if (parsed.faqId) {
      const faq = bank.faq.find((f) => f.id === parsed.faqId);
      messages.push({ text: faq.answer[lang] || faq.answer.en, kind: "faq" });
      next = reAsk(s, messages, "");
      return { state: s, messages, next, ui: ui(s) };
    }
    for (const id of ["whoAreYou", "thanks", "greeting"]) {
      if (hasIntent(id)) {
        next = reAsk(s, messages, say(bank.intents[id].reply, lang, s.turn));
        return { state: s, messages, next, ui: ui(s) };
      }
    }
  }

  // Pending budget/mode confirmations raised while applying fields
  if (s.pending && (s.pending.type === "confirmBudget" || s.pending.type === "switchMode")) {
    const p = s.pending;
    const ack = ackFor(s, touched.filter((t) => t.slot !== "budget"));
    let q;
    if (p.type === "confirmBudget") {
      const key = s.req.mode === "sale" ? "bareNumberSale" : "bareNumberRent";
      q = say(bank.slots.budget.clarify[key], lang, s.turn, { value: Number(p.value).toLocaleString("en-IN") });
    } else {
      const key = p.to === "sale" ? "rentLooksLikeSale" : "saleLooksLikeRent";
      q = say(bank.slots.budget.clarify[key], lang, s.turn, { value: Number(p.value).toLocaleString("en-IN") });
      s.answered = s.answered.filter((x) => x !== "budget");
    }
    messages.push({ text: [ack, q].filter(Boolean).join(" "), chips: [{ value: "yes", label: { en: "Yes", hinglish: "Haan", hi: "हाँ" }[lang] }, { value: "no", label: { en: "No", hinglish: "Nahi", hi: "नहीं" }[lang] }], kind: "question" });
    return { state: s, messages, next: null, ui: ui(s) };
  }

  // Contact phase
  if (s.phase === "contact" || s.phase === "review") {
    const slot = s.slot;
    if (slot === "email" && (parsed.skip || parsed.no || /no email|nahi chahiye/i.test(lower)) && !s.contact.email) s.contact.emailSkipped = true;
    if (slot === "review" && parsed.yes) {
      messages.push({ text: say(bank.slots.review.typedConfirm, lang, s.turn), kind: "review", consentText: bank.slots.review.consentText[lang] });
      return { state: s, messages, next: "review", ui: ui(s) };
    }
    let prefix = "";
    if (slot === "name" && s.contact.name) prefix = say(bank.slots.name.ack, lang, s.turn, { name: s.contact.name });
    else if (slot === "phone" && !s.contact.phone) {
      messages.push({ ...questionFor(s, "phone"), text: say(bank.slots.phone.askAgain, lang, s.turn), kind: "question" });
      return { state: s, messages, next: null, ui: ui(s) };
    } else if (slot === "email" && /@/.test(text) && !s.contact.email) {
      messages.push({ ...questionFor(s, "email"), text: say(bank.slots.email.askAgain, lang, s.turn), kind: "question" });
      return { state: s, messages, next: null, ui: ui(s) };
    } else if (slot === "name" && !s.contact.name) {
      messages.push({ ...questionFor(s, "name"), text: say(bank.slots.name.askAgain, lang, s.turn), kind: "question" });
      return { state: s, messages, next: null, ui: ui(s) };
    }
    const ack = touched.length ? ackFor(s, touched) : "";
    next = askNext(s, messages, [ack, prefix].filter(Boolean).join(" "));
    return { state: s, messages, next, ui: ui(s) };
  }

  // Results phase: any change re-runs the search
  if (s.phase === "results" || s.phase === "done") {
    if (touched.length) {
      s.offset = 0;
      messages.push({ text: ackFor(s, touched), kind: "ack" });
      return { state: s, messages, next: "search", ui: ui(s) };
    }
    if (hasIntent("showResults")) return { state: s, messages, next: "search", ui: ui(s) };
  }

  // Show results on request
  if (hasIntent("showResults") || /^show results$/.test(lower)) {
    const missing = requiredMissing(s);
    const ack = ackFor(s, touched);
    if (!missing.length) {
      messages.push({ text: [ack, say(bank.intents.showResults.reply, lang, s.turn)].filter(Boolean).join(" "), kind: "info" });
      return { state: s, messages, next: "search", ui: ui(s) };
    }
    s.slot = missing[0];
    const q = questionFor(s, missing[0]);
    messages.push({ ...q, text: [ack, say(bank.responses.needMoreBeforeSearch, lang, s.turn, { field: fmt.fieldName(missing[0], lang) }), q.text].filter(Boolean).join(" "), kind: "question" });
    return { state: s, messages, next: null, ui: ui(s) };
  }

  // Skip the current question
  if (!understood && (parsed.skip || (parsed.no && s.slot && !slotDef(s.slot)?.required))) {
    if (s.slot === "distances" && s.distanceParam) {
      if (!s.distanceAsked.includes(s.distanceParam)) s.distanceAsked.push(s.distanceParam);
      const ack = say(bank.slots.distances.skipAck, lang, s.turn, { param: fmt.paramLabel(s.distanceParam, lang) });
      next = askNext(s, messages, ack);
      return { state: s, messages, next, ui: ui(s) };
    }
    if (s.slot && !slotDef(s.slot)?.required) {
      markSkipped(s, s.slot);
      next = askNext(s, messages, say(bank.responses.skipped, lang, s.turn));
      return { state: s, messages, next, ui: ui(s) };
    }
  }

  if (!understood && (s.phase === "results" || s.phase === "done" || !s.slot)) {
    // Nothing pending to re-ask: keep the next-step buttons on screen.
    next = reAsk(s, messages, say(bank.responses.notUnderstood, lang, s.turn));
    return { state: s, messages, next, ui: ui(s) };
  }

  if (!understood) {
    s.strikes += 1;
    const slot = s.slot;
    if (slot && !slotDef(slot)?.required && s.strikes >= 2) {
      s.strikes = 0;
      if (slot === "distances" && s.distanceParam) s.distanceAsked.push(s.distanceParam);
      else markSkipped(s, slot);
      next = askNext(s, messages, `${say(bank.responses.notUnderstood, lang, s.turn)} ${say(bank.responses.skipped, lang, s.turn)}`);
      return { state: s, messages, next, ui: ui(s) };
    }
    const def = slot ? slotDef(slot) : null;
    const again = def && def.askAgain ? say(def.askAgain, lang, s.turn) : say(bank.responses.notUnderstood, lang, s.turn);
    const q = slot ? questionFor(s, slot) : { chips: [] };
    messages.push({ ...q, text: `${again}${s.strikes >= 2 ? ` ${say(bank.responses.offerSkip, lang, s.turn)}` : ""}`, kind: "question" });
    return { state: s, messages, next: null, ui: ui(s) };
  }

  s.strikes = 0;
  let ack = ackFor(s, touched) || (sideInfo ? say(bank.responses.notedSide, lang, s.turn) : "");
  if (distanceParamBefore && touched.length === 1 && touched[0].slot === "priorities" && s.distanceAsked.includes(distanceParamBefore)) {
    const meters = s.req.priorities[distanceParamBefore];
    const param = fmt.paramLabel(distanceParamBefore, lang);
    ack = Number(meters) > 0 ? say(bank.slots.distances.ack, lang, s.turn, { param, distance: fmt.formatMeters(meters, lang) }) : say(bank.slots.distances.skipAck, lang, s.turn, { param });
  }
  next = continueCollect(s, messages, ack, touched.map((t) => t.slot));
  return { state: s, messages, next, ui: ui(s) };
}

function continueCollect(s, messages, ack, justAnswered, { fromFollowUp = false } = {}) {
  const fu = fromFollowUp ? dueFollowUp(s, justAnswered.filter((x) => x !== "location" && x !== "budget")) : dueFollowUp(s, justAnswered);
  if (fu) {
    s.asked.push(fu);
    s.pending = { type: "followUp", id: fu };
    const q = followUpQuestion(s, fu);
    if (q) {
      messages.push({ ...q, text: [ack, q.text].filter(Boolean).join(" "), kind: "question" });
      return null;
    }
  }
  return askNext(s, messages, ack);
}

function applyFollowUp(s, id, parsed, text) {
  const lower = text.toLowerCase();
  if (id === "location.strict") {
    if (/only|sirf|strict|yahi|सिर्फ़/.test(lower) || parsed.no) s.req.locationScope = "strict";
    else if (/nearby|paas|aas|around|आस/.test(lower) || parsed.yes) s.req.locationScope = "nearby";
    else return false;
    return true;
  }
  if (id === "budget.strict") {
    if (/slightly|10 ?%|stretch|thoda upar|above is ok|ऊपर चलेगा/.test(lower) || parsed.yes) s.req.budgetStretch = true;
    else if (/strict|hard|pakki|पक्की|fixed/.test(lower) || parsed.no) s.req.budgetStretch = false;
    else return false;
    return true;
  }
  if (id === "bhk.familySize") {
    if (parsed.yes) {
      s.req.occupancy = "family";
      markAnswered(s, "occupancy");
      return true;
    }
    return Boolean(parsed.no || parsed.occupancy);
  }
  if (id === "occupancy.pets") {
    if (typeof parsed.pets === "boolean") return true;
    if (parsed.no) {
      s.req.pets = false;
      return true;
    }
    if (parsed.yes) {
      s.req.pets = true;
      return true;
    }
    return false;
  }
  return false;
}

function applyRelax(s, pending) {
  const r = s.req;
  if (pending.reason === "budget" && pending.suggestion) {
    r.budgetMax = pending.suggestion;
    delete r.budgetApprox;
    return "budget";
  }
  if (pending.reason === "bhk") {
    r.bhk = [];
    r.bhkAny = true;
    return "bhk";
  }
  if (pending.reason === "location") {
    r.anywhere = true;
    r.sectors = [];
    r.localities = [];
    return "location";
  }
  if (pending.reason === "type") {
    r.propertyType = [];
    r.propertyTypeAny = true;
    return "propertyType";
  }
  return "budget";
}

/* --------------------------------------------------------------- search */

async function handleSearch({ state: rawState, more = false }) {
  const s = sanitizeState(rawState);
  const lang = s.lang;
  const messages = [];
  const missing = requiredMissing(s);
  if (missing.length) {
    s.slot = missing[0];
    const q = questionFor(s, missing[0]);
    messages.push({ ...q, text: `${say(bank.responses.needMoreBeforeSearch, lang, s.turn, { field: fmt.fieldName(missing[0], lang) })} ${q.text}`, kind: "question" });
    return { state: s, messages, results: [], stats: null, ui: ui(s) };
  }
  if (!more) s.offset = 0;
  const { results, stats, diagnosis, total } = await matcher.search(s.req, { lang, offset: s.offset });
  s.phase = s.phase === "done" ? "done" : "results";
  s.slot = null;
  s.lastResultCount = total;
  if (!more) s.shown = [];
  s.shown = [...s.shown, ...results.map((r) => ({ id: r.id, listingType: r.listingType }))].slice(-MAX_SHOWN);

  if (results.length) {
    if (!more) {
      const head = total === 1 ? say(bank.responses.resultsOne, lang, s.turn) : say(bank.responses.results, lang, s.turn, { count: total });
      messages.push({ text: head, kind: "results" });
    }
    messages.push({ text: say(bank.responses.afterResults, lang, s.turn), chips: chips(bank.responses.afterResultsChips.filter((c) => c.value !== "show more" || stats.hasMore), lang), kind: "info" });
  } else if (more) {
    messages.push({ text: say(bank.responses.noMoreResults, lang, s.turn), chips: chips(bank.responses.afterResultsChips.filter((c) => c.value !== "show more"), lang), kind: "info" });
  } else {
    const d = diagnosis || { reason: "none" };
    const homes = { en: d.count === 1 ? "1 home" : `${d.count} homes`, hinglish: `${d.count} ghar`, hi: `${d.count} घर` }[lang];
    const reasonText = say(bank.responses.noMatchReason[d.reason] || bank.responses.noMatchReason.none, lang, s.turn, {
      homes,
      count: d.count,
      value: d.suggestion ? fmt.formatBudget({ budgetMax: d.suggestion }, s.req.mode, lang) : "",
      location: locationLabel(s),
      bhk: fmt.formatBhk(s.req.bhk, s.req.bhkPlus, lang),
    });
    if (d.reason !== "none") s.pending = { type: "relax", reason: d.reason, suggestion: d.suggestion };
    messages.push({
      text: `${say(bank.responses.noMatch, lang, s.turn)} ${reasonText}`,
      chips: d.reason !== "none" ? chips(bank.responses.relaxChips, lang) : chips(bank.responses.afterResultsChips.filter((c) => c.value === "yes contact me" || c.value === "refine"), lang),
      kind: "noMatch",
    });
  }

  const stageCounts = {
    understand: summaryOf(s).map((x) => x.value).slice(0, 4).join(" · "),
    scan: stats.scanned,
    filter: stats.afterHardFilters,
    amenities: stats.withVerifiedDistances,
    rank: results.length,
  };
  const stages = bank.searchStages.map((st) => ({
    id: st.id,
    icon: st.icon,
    durationMs: st.durationMs,
    label: st.label[lang] || st.label.en,
    detail: fill(st.detail[lang] || st.detail.en, { count: stageCounts[st.id], value: stageCounts.understand }),
  }));
  return { state: s, messages, results, stats: { ...stats, total }, stages, tips: bank.loadingTips[lang] || bank.loadingTips.en, ui: ui(s) };
}

/* -------------------------------------------------------------- enquiry */

function buildLeadPayload(rawState) {
  const s = sanitizeState(rawState);
  const r = s.req;
  return {
    state: s,
    mode: r.mode,
    requirements: {
      sectors: r.sectors || [],
      localities: r.localities || [],
      anywhere: Boolean(r.anywhere),
      locationScope: r.locationScope || null,
      budgetMin: r.budgetMin || null,
      budgetMax: r.budgetMax || null,
      budgetApprox: Boolean(r.budgetApprox),
      budgetFlexible: Boolean(r.budgetFlexible),
      budgetStretch: r.budgetStretch === true,
      bhk: r.bhk || [],
      bhkPlus: Boolean(r.bhkPlus),
      propertyTypes: r.propertyType || [],
      furnishing: r.furnishing || null,
      moveInDays: r.moveIn && Number.isFinite(r.moveIn.days) ? r.moveIn.days : null,
      moveInLabel: fmt.moveInLabel(r.moveIn, "en") || null,
      occupancy: r.occupancy || null,
      people: r.people || null,
      pets: typeof r.pets === "boolean" ? r.pets : null,
      minAreaSqft: r.minAreaSqft || null,
      possession: r.possession || null,
      purpose: r.purpose || null,
      priorities: Object.entries(r.priorities || {}).map(([category, maxMeters]) => ({ category, maxMeters: maxMeters || null })),
      corner: r.corner || null,
    },
    summaryText: summaryOf({ ...s, lang: "en" }).map((x) => `${x.label}: ${x.value}`).join(" | "),
    contact: s.contact,
    shown: s.shown,
    language: s.lang,
    aiAssisted: s.aiUsed,
  };
}

module.exports = { handleTurn, handleSearch, buildLeadPayload, sanitizeState, emptyState, summaryOf, requiredMissing };
