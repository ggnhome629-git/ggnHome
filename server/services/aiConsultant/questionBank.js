/**
 * Loads server/data/aiConsultant/questionBank.json once and precompiles the
 * regexes the parser and engine need. The JSON is the single source of truth
 * for wording, chips, vocabulary and intent patterns.
 */
const bank = require("../../data/aiConsultant/questionBank.json");

const LANGS = ["en", "hinglish", "hi"];
const DEVANAGARI = /[ऀ-ॿ]/;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Regex that matches any of `phrases` as a whole word/phrase. Latin phrases
 * get ASCII word boundaries; Devanagari phrases match as plain substrings
 * (JS \b does not understand Devanagari).
 */
function phraseRegex(phrases, flags = "giu") {
  const sorted = [...new Set(phrases.map((p) => String(p).toLowerCase().replace(/['’]/g, "").trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  const parts = sorted.map((p) => {
    const body = escapeRegex(p).replace(/\s+/g, "\\s+");
    return DEVANAGARI.test(p) ? body : `(?<![a-z0-9])${body}(?![a-z0-9])`;
  });
  return new RegExp(parts.join("|") || "(?!)", flags);
}

const compiled = {
  intents: Object.entries(bank.intents)
    .map(([id, def]) => ({ id, priority: def.priority || 0, setLanguage: def.setLanguage, patterns: def.patterns.map((p) => new RegExp(p, "iu")) }))
    .sort((a, b) => b.priority - a.priority),
  faq: bank.faq.map((f) => ({ id: f.id, patterns: f.patterns.map((p) => new RegExp(p, "iu")), answer: f.answer })),
  answers: Object.fromEntries(Object.entries(bank.answers).map(([k, v]) => [k, v.map((x) => x.toLowerCase().replace(/['’]/g, ""))])),
  modes: {
    rent: phraseRegex(bank.lexicon.modes.rent),
    sale: phraseRegex(bank.lexicon.modes.sale),
  },
  propertyTypes: Object.entries(bank.lexicon.propertyTypes).map(([value, words]) => ({ value, re: phraseRegex(words) })),
  furnishing: ["semi-furnished", "unfurnished", "furnished"].map((value) => ({ value, re: phraseRegex(bank.lexicon.furnishing[value]) })),
  occupancy: Object.entries(bank.lexicon.occupancy).map(([value, words]) => ({ value, re: phraseRegex(words) })),
  petsYes: phraseRegex(bank.lexicon.pets.yes),
  petsNo: phraseRegex(bank.lexicon.pets.no),
  possession: Object.entries(bank.lexicon.possession).map(([value, words]) => ({ value, re: phraseRegex(words) })),
  purpose: Object.entries(bank.lexicon.purpose).map(([value, words]) => ({ value, re: phraseRegex(words) })),
  moveIn: Object.entries(bank.lexicon.moveIn).map(([id, def]) => ({ id, days: def.days, re: phraseRegex(def.phrases) })),
  localities: bank.lexicon.localities
    .flatMap((l) => l.aliases.map((a) => ({ name: l.name, alias: a.toLowerCase() })))
    .sort((a, b) => b.alias.length - a.alias.length)
    .map((l) => ({ name: l.name, re: phraseRegex([l.alias], "iu") })),
  anywhere: phraseRegex(bank.answers.anywhere),
  parameters: Object.entries(bank.parameters)
    .filter(([, p]) => p.kind === "distance")
    .map(([key, p]) => ({ key, re: phraseRegex(p.synonyms) })),
  corner: Object.fromEntries(Object.entries(bank.parameters.corner.synonyms).map(([k, words]) => [k, phraseRegex(words)])),
  ordinals: Object.entries(bank.lexicon.ordinals).map(([k, words]) => ({ key: k, re: phraseRegex(words.filter((w) => !/^#?\d$/.test(w))) })),
};

/** Number words of every language, longest first, for budget/BHK parsing. */
const numberWords = Object.entries({ ...bank.lexicon.numberWords.en, ...bank.lexicon.numberWords.hinglish, ...bank.lexicon.numberWords.hi })
  .sort((a, b) => b[0].length - a[0].length);

/** Picks a template variant deterministically so replies rotate per turn. */
function pick(variants, lang, seed = 0) {
  if (!variants) return "";
  if (typeof variants === "string") return variants;
  const list = variants[lang] || variants.en || variants;
  if (typeof list === "string") return list;
  if (!Array.isArray(list) || !list.length) return "";
  return list[Math.abs(seed) % list.length];
}

/** Fills {placeholders}. Unknown placeholders are left out rather than shown raw. */
function fill(template, vars = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? "" : String(vars[k])));
}

function say(variants, lang, seed, vars) {
  return fill(pick(variants, lang, seed), vars);
}

/** Localises a chip list ({value,label:{en,…}}) for the client. */
function chips(list, lang, vars) {
  return (Array.isArray(list) ? list : []).map((c) => ({ value: fill(c.value, vars), label: fill((c.label && (c.label[lang] || c.label.en)) || c.value, vars) }));
}

module.exports = { bank, compiled, numberWords, LANGS, DEVANAGARI, phraseRegex, escapeRegex, pick, fill, say, chips };
