/** Human-readable labels (₹ amounts, distances, BHK, types) in en / hinglish / hi. */
const { bank } = require("./questionBank");

const PER_MONTH = { en: "/month", hinglish: "/mahina", hi: "/माह" };
const AROUND = { en: "around", hinglish: "lagbhag", hi: "लगभग" };
const ABOVE = { en: "above", hinglish: "se upar", hi: "से ऊपर" };
const FLEX = { en: "Flexible", hinglish: "Flexible", hi: "लचीला" };
const ANYWHERE = { en: "Anywhere in Gurgaon", hinglish: "Gurgaon mein kahin bhi", hi: "गुड़गाँव में कहीं भी" };

function rupees(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 10000000) return `₹${trim(v / 10000000)} Cr`;
  if (v >= 100000) return `₹${trim(v / 100000)} L`;
  if (v >= 1000 && v % 1000 === 0) return `₹${v / 1000}k`;
  return `₹${v.toLocaleString("en-IN")}`;
}
const trim = (x) => String(Math.round(x * 100) / 100);

function formatBudget(b, mode, lang = "en", { plain = false } = {}) {
  if (!b) return "";
  if (b.budgetFlexible) return FLEX[lang] || FLEX.en;
  const suffix = mode === "rent" || mode === "rental" ? PER_MONTH[lang] || PER_MONTH.en : "";
  const max = Number(b.budgetMax) || 0;
  const min = Number(b.budgetMin) || 0;
  if (min && max) return `${rupees(min)}–${rupees(max).replace("₹", "")}${suffix}`;
  if (max) {
    const text = `${rupees(max)}${suffix}`;
    if (plain || !b.budgetApprox) return text;
    return lang === "en" ? `${AROUND.en} ${text}` : `${AROUND[lang]} ${text}`;
  }
  if (min) return lang === "en" ? `${ABOVE.en} ${rupees(min)}${suffix}` : `${rupees(min)}${suffix} ${ABOVE[lang]}`;
  return "";
}

function formatMeters(m, lang = "en") {
  const v = Number(m);
  if (!Number.isFinite(v)) return "";
  if (v >= 1000) return `${trim(v / 1000)} ${lang === "hi" ? "किमी" : "km"}`;
  return `${Math.round(v)} ${lang === "hi" ? "मी" : "m"}`;
}

function formatBhk(values, plus, lang = "en") {
  const list = (values || []).filter((n) => Number.isInteger(n));
  if (!list.length) return "";
  const parts = list.sort((a, b) => a - b).map((n) => (n === 0 ? "1 RK" : `${n}${plus && n === Math.max(...list) ? "+" : ""} BHK`));
  const or = lang === "en" ? " or " : lang === "hi" ? " या " : " ya ";
  return parts.join(or);
}

const TYPE_LABELS = {
  apartment: { en: "Apartment", hinglish: "Apartment", hi: "अपार्टमेंट" },
  condo: { en: "Apartment", hinglish: "Apartment", hi: "अपार्टमेंट" },
  "builder-floor": { en: "Builder floor", hinglish: "Builder floor", hi: "बिल्डर फ़्लोर" },
  house: { en: "Independent house", hinglish: "Kothi / house", hi: "स्वतंत्र मकान" },
  villa: { en: "Villa", hinglish: "Villa", hi: "विला" },
  studio: { en: "Studio", hinglish: "Studio", hi: "स्टूडियो" },
  "1RK": { en: "1 RK", hinglish: "1 RK", hi: "1 RK" },
  plot: { en: "Plot", hinglish: "Plot", hi: "प्लॉट" },
  townhouse: { en: "Townhouse", hinglish: "Townhouse", hi: "टाउनहाउस" },
};
const typeLabel = (t, lang = "en") => (TYPE_LABELS[t] ? TYPE_LABELS[t][lang] || TYPE_LABELS[t].en : t || "");

const FURNISHING_LABELS = {
  furnished: { en: "Fully furnished", hinglish: "Fully furnished", hi: "पूरा फ़र्निश्ड" },
  "semi-furnished": { en: "Semi-furnished", hinglish: "Semi-furnished", hi: "सेमी-फ़र्निश्ड" },
  unfurnished: { en: "Unfurnished", hinglish: "Unfurnished", hi: "अनफ़र्निश्ड" },
  any: { en: "Any furnishing", hinglish: "Koi bhi furnishing", hi: "कोई भी फ़र्निशिंग" },
};
const furnishingLabel = (f, lang = "en") => (FURNISHING_LABELS[f] ? FURNISHING_LABELS[f][lang] || FURNISHING_LABELS[f].en : f || "");

const paramLabel = (key, lang = "en") => {
  const p = bank.parameters[key];
  return p ? p.label[lang] || p.label.en : key;
};

const OCCUPANCY_LABELS = {
  family: { en: "Family", hinglish: "Family", hi: "परिवार" },
  bachelor: { en: "Bachelors", hinglish: "Bachelors", hi: "बैचलर" },
  bachelor_male: { en: "Bachelors (men)", hinglish: "Bachelor ladke", hi: "बैचलर (पुरुष)" },
  bachelor_female: { en: "Bachelors (women)", hinglish: "Bachelor ladkiyan", hi: "बैचलर (महिला)" },
  couple: { en: "Couple", hinglish: "Couple", hi: "दंपत्ति" },
  professionals: { en: "Working professionals", hinglish: "Working professionals", hi: "कामकाजी" },
  company: { en: "Company lease", hinglish: "Company lease", hi: "कंपनी लीज़" },
  students: { en: "Students", hinglish: "Students", hi: "छात्र" },
};
const occupancyLabel = (o, lang = "en") => (OCCUPANCY_LABELS[o] ? OCCUPANCY_LABELS[o][lang] || OCCUPANCY_LABELS[o].en : o || "");

const MOVE_IN_LABELS = {
  immediate: { en: "Immediately", hinglish: "Turant", hi: "तुरंत" },
  week: { en: "Within a week", hinglish: "Ek hafte mein", hi: "एक हफ़्ते में" },
  fortnight: { en: "Within 15 days", hinglish: "15 din mein", hi: "15 दिन में" },
  month: { en: "Next month", hinglish: "Agle mahine", hi: "अगले महीने" },
  twoMonths: { en: "In 1–2 months", hinglish: "1-2 mahine mein", hi: "1-2 महीने में" },
  exploring: { en: "Just exploring", hinglish: "Abhi dekh rahe hain", hi: "अभी देख रहे हैं" },
};
function moveInLabel(m, lang = "en") {
  if (!m) return "";
  if (m.date) return m.date;
  if (MOVE_IN_LABELS[m.key]) return MOVE_IN_LABELS[m.key][lang] || MOVE_IN_LABELS[m.key].en;
  if (Number.isFinite(m.days)) return lang === "hi" ? `${m.days} दिन में` : lang === "hinglish" ? `${m.days} din mein` : `In ${m.days} days`;
  return "";
}

const POSSESSION_LABELS = {
  ready: { en: "Ready to move", hinglish: "Ready to move", hi: "रेडी-टू-मूव" },
  "under-construction": { en: "Under construction", hinglish: "Under construction", hi: "निर्माणाधीन" },
  any: { en: "Either", hinglish: "Dono chalenge", hi: "दोनों" },
};
const PURPOSE_LABELS = {
  self: { en: "To live in", hinglish: "Khud rehne ke liye", hi: "ख़ुद रहने के लिए" },
  investment: { en: "Investment", hinglish: "Investment", hi: "निवेश" },
  both: { en: "Living + investment", hinglish: "Rehna + investment", hi: "रहना + निवेश" },
};
const lookup = (table, k, lang) => (table[k] ? table[k][lang] || table[k].en : k || "");

function formatLocation(req, lang = "en") {
  if (req.anywhere) return ANYWHERE[lang] || ANYWHERE.en;
  const items = [...(req.sectors || []).map((s) => (lang === "hi" ? `सेक्टर ${s}` : `Sector ${s}`)), ...(req.localities || [])];
  const or = lang === "en" ? " or " : lang === "hi" ? " या " : " ya ";
  return items.length > 2 ? `${items.slice(0, -1).join(", ")}${or}${items[items.length - 1]}` : items.join(or);
}

function cornerLabel(c, lang = "en") {
  const v = bank.parameters.corner.values[c];
  return v ? v[lang] || v.en : "";
}

function formatPriorities(priorities, lang = "en") {
  return Object.entries(priorities || {})
    .map(([k, m]) => (Number(m) > 0 ? `${paramLabel(k, lang)} ≤ ${formatMeters(m, lang)}` : paramLabel(k, lang)))
    .join(", ");
}

const fieldName = (slot, lang = "en") => {
  const f = bank.responses.fieldNames[slot];
  return f ? f[lang] || f.en : slot;
};

module.exports = {
  rupees,
  formatBudget,
  formatMeters,
  formatBhk,
  typeLabel,
  furnishingLabel,
  paramLabel,
  occupancyLabel,
  moveInLabel,
  formatLocation,
  formatPriorities,
  cornerLabel,
  fieldName,
  possessionLabel: (k, lang) => lookup(POSSESSION_LABELS, k, lang),
  purposeLabel: (k, lang) => lookup(PURPOSE_LABELS, k, lang),
};
