/**
 * The only two jobs the language model is allowed to do:
 *
 *   extract()       — propose candidate field values for a message the rule
 *                     parser could not fully understand. Output is validated
 *                     field-by-field against whitelists and ranges; anything
 *                     else is dropped. The rule-based state stays authoritative.
 *   answerGeneral() — a short answer to a general real-estate *process*
 *                     question that no FAQ entry covered.
 *
 * Phone numbers, emails and long digit runs are redacted before anything is
 * sent. No conversation history, user IDs or listing data leave the server.
 */
const groq = require("./groqClient");
const { bank } = require("./questionBank");
const { DISTANCE_KEYS } = require("./parser");

const ENUMS = {
  mode: ["rent", "sale"],
  propertyType: ["apartment", "builder-floor", "house", "villa", "studio", "1RK", "plot"],
  furnishing: ["furnished", "semi-furnished", "unfurnished", "any"],
  occupancy: ["family", "bachelor", "bachelor_male", "bachelor_female", "couple", "professionals", "company", "students"],
  possession: ["ready", "under-construction", "any"],
  purpose: ["self", "investment", "both"],
  corner: ["corner", "middle", "any"],
  intent: ["provide_info", "show_results", "refine", "ask_property", "human", "restart", "general_question", "other"],
};
const LOCALITY_NAMES = new Set(bank.lexicon.localities.map((l) => l.name));

function redact(text) {
  return String(text || "")
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/(?:\+?91[\s-]?)?[6-9]\d{2}[\s-]?\d{2}[\s-]?\d{5}/g, "[phone]")
    .replace(/\d{9,}/g, "[number]")
    .slice(0, 400);
}

const inEnum = (v, list) => (list.includes(v) ? v : undefined);
const numIn = (v, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

/** Validates model JSON into the same shape the rule parser produces. */
function validateExtraction(obj, mode) {
  if (!obj || typeof obj !== "object" || typeof obj.fields !== "object" || obj.fields === null) return null;
  const f = obj.fields;
  const out = {};
  const m = inEnum(f.mode, ENUMS.mode);
  if (m) out.mode = m;
  if (Array.isArray(f.sectors)) {
    const s = f.sectors.map((x) => numIn(x, 1, 115)).filter((x) => Number.isInteger(x)).slice(0, 6).map(String);
    if (s.length) out.sectors = [...new Set(s)];
  }
  if (Array.isArray(f.localities)) {
    const l = f.localities.filter((x) => LOCALITY_NAMES.has(x)).slice(0, 4);
    if (l.length) out.localities = l;
  }
  if (f.anywhere === true) out.anywhere = true;
  const effectiveMode = out.mode || mode;
  const budgetCeil = effectiveMode === "rent" ? 2000000 : 2000000000;
  const bMax = numIn(f.budgetMax, 1000, budgetCeil);
  const bMin = numIn(f.budgetMin, 1000, budgetCeil);
  if (bMax) out.budgetMax = Math.round(bMax);
  if (bMin && (!bMax || bMin < bMax)) out.budgetMin = Math.round(bMin);
  if ((bMax || bMin) && f.budgetApprox === true) out.budgetApprox = true;
  if (Array.isArray(f.bhk)) {
    const b = f.bhk.map((x) => numIn(x, 0, 10)).filter((x) => Number.isInteger(x)).slice(0, 4);
    if (b.length) out.bhk = [...new Set(b)];
  }
  const pt = inEnum(f.propertyType, ENUMS.propertyType);
  if (pt) out.propertyType = [pt];
  const fu = inEnum(f.furnishing, ENUMS.furnishing);
  if (fu) out.furnishing = fu;
  const oc = inEnum(f.occupancy, ENUMS.occupancy);
  if (oc) out.occupancy = oc;
  if (typeof f.pets === "boolean") out.pets = f.pets;
  const mi = numIn(f.moveInDays, 0, 365);
  if (mi !== undefined) out.moveIn = { days: Math.round(mi), key: "relative" };
  const area = numIn(f.minAreaSqft, 100, 500000);
  if (area) out.minAreaSqft = Math.round(area);
  const po = inEnum(f.possession, ENUMS.possession);
  if (po) out.possession = po;
  const pu = inEnum(f.purpose, ENUMS.purpose);
  if (pu) out.purpose = pu;
  if (f.priorities && typeof f.priorities === "object" && !Array.isArray(f.priorities)) {
    const pr = {};
    for (const [k, v] of Object.entries(f.priorities)) {
      if (!DISTANCE_KEYS.includes(k)) continue;
      pr[k] = v === null ? null : numIn(v, 50, 20000) ?? null;
    }
    if (Object.keys(pr).length) out.priorities = pr;
  }
  const co = inEnum(f.corner, ENUMS.corner);
  if (co) out.corner = co;

  const intent = inEnum(obj.intent, ENUMS.intent) || "other";
  const confidence = numIn(obj.confidence, 0, 1) ?? 0.5;
  const clarify = typeof obj.clarify === "string" && obj.clarify.trim() ? obj.clarify.trim().slice(0, 160) : null;
  return { fields: out, intent, confidence, clarify };
}

async function extract(message, { slot, mode, lang }) {
  if (!groq.isAvailable()) return null;
  const schema = JSON.stringify(bank.llm.extractSchema);
  const res = await groq.complete({
    json: true,
    maxTokens: 350,
    messages: [
      { role: "system", content: `${bank.llm.extractSystemPrompt}\nReturn exactly: {"intent":…,"fields":{…},"clarify":…,"confidence":…}\nSchema: ${schema}` },
      { role: "user", content: JSON.stringify({ currentQuestion: slot || null, knownMode: mode || null, language: lang || "en", message: redact(message) }) },
    ],
  });
  if (!res.ok) return null;
  let parsed = null;
  try {
    parsed = JSON.parse(res.text);
  } catch (_) {
    const m = res.text.match(/\{[\s\S]*\}/);
    try {
      parsed = m ? JSON.parse(m[0]) : null;
    } catch (_) {
      parsed = null;
    }
  }
  const valid = validateExtraction(parsed, mode);
  if (!valid) groq.noteInvalidOutput();
  return valid;
}

async function answerGeneral(question, lang) {
  if (!groq.isAvailable()) return null;
  const style = lang === "hi" ? "Reply in Hindi (Devanagari)." : lang === "hinglish" ? "Reply in Hinglish (Hindi in Latin script)." : "Reply in English.";
  const res = await groq.complete({
    maxTokens: 220,
    temperature: 0.3,
    messages: [
      { role: "system", content: `${bank.llm.answerSystemPrompt} ${style}` },
      { role: "user", content: redact(question) },
    ],
  });
  if (!res.ok) return null;
  const text = res.text.replace(/\s+/g, " ").trim();
  // Refuse anything that looks like a fabricated listing claim.
  if (!text || text.length > 700 || /₹\s?\d|sector\s*\d+.*(available|listed)|call\s+\+?\d/i.test(text)) {
    groq.noteInvalidOutput();
    return null;
  }
  return text;
}

module.exports = { extract, answerGeneral, validateExtraction, redact };
