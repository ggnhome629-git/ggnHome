/**
 * Deterministic requirement extraction for the AI Property Consultant.
 *
 * parseMessage(text, ctx) turns one English / Hindi / Hinglish message into
 * candidate field values plus control signals (yes/no/skip, intents). It never
 * touches the database and never guesses: anything ambiguous comes back as a
 * clarification request for the engine to ask about.
 *
 * Extraction order matters — spans consumed by one extractor (a phone number,
 * "1 km", "200 gaj", "2 bhk", "sector 57") are blanked out so the budget
 * parser can't mistake them for money.
 */
const { bank, compiled, numberWords, DEVANAGARI } = require("./questionBank");

const SECTOR_MIN = 1;
const SECTOR_MAX = 115;
const DISTANCE_KEYS = compiled.parameters.map((p) => p.key);
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const HINGLISH_MARKERS = /(?<![a-z])(hai|hain|chahiye|chaiye|mujhe|humein|hume|kitna|kitni|kiraye|kiraya|mein|wala|wali|nahi|nahin|haan|karo|kar do|dikhao|batao|ghar|ke paas|tak|hazaar|hazar|lena|kharidna|khareedna|chalega|accha|achha|theek|thik|koi bhi|bhi|aur|ya|se|ka|ki|ke)(?![a-z])/g;

const MULTIPLIERS = [
  { value: 10000000, re: /^(crores?|crs?|karod|karor|करोड़|करोड)$/ },
  { value: 100000, re: /^(lakhs?|lacs?|lac|lak|l|लाख)$/ },
  { value: 1000, re: /^(k|thousands?|thou|hazaa?r|hajar|hazzar|हज़ार|हजार)$/ },
];
const MULT_WORD = "crores?|crs?|karod|karor|करोड़|करोड|lakhs?|lacs?|lac|lak|l|लाख|k|thousands?|thou|hazaa?r|hajar|hazzar|हज़ार|हजार";

function detectLanguage(text, fallback = "en") {
  const t = String(text || "");
  if (DEVANAGARI.test(t)) return "hi";
  const markers = (t.toLowerCase().match(HINGLISH_MARKERS) || []).length;
  const words = t.trim().split(/\s+/).filter(Boolean).length;
  if (markers >= 2 || (markers === 1 && words <= 4)) return "hinglish";
  if (/^[\x00-\x7F]*$/.test(t) && words >= 2) return "en";
  return fallback;
}

/** Lowercases, normalises digits/dashes/currency and converts number words that precede a unit. */
function normalize(raw) {
  let t = String(raw || "").slice(0, 600).toLowerCase().replace(/['’]/g, "");
  t = t.replace(/[०-९]/g, (d) => String("०१२३४५६७८९".indexOf(d)));
  t = t.replace(/[–—]/g, "-").replace(/₹\s*/g, "₹").replace(/\brs\.?\s*/g, "₹").replace(/\binr\s*/g, "₹");
  // Indian digit grouping: 1,20,000 / 25,000 -> 120000 / 25000
  t = t.replace(/(\d),(?=\d{2,3}(?:\D|$))/g, "$1").replace(/(\d),(?=\d)/g, "$1");
  // "saade teen lakh" -> 3.5 lakh
  t = t.replace(/(saade|साढ़े)\s+(\S+)/g, (m, _s, w) => {
    const hit = numberWords.find(([word]) => word === w);
    return hit ? String(hit[1] + 0.5) : m;
  });
  // Number words directly before a unit -> digits ("do bhk", "पच्चीस हज़ार", "twenty five thousand")
  const unit = `(?=\\s*(?:${MULT_WORD}|bhk|bhks|bed|bedroom|bedrooms|बेडरूम|km|kms|kilometer|kilometre|किमी|किलोमीटर|min|mins|minute|minutes|मिनट|log|people|lakh|crore)(?![a-z]))`;
  for (const [word, value] of numberWords) {
    const body = word.replace(/\s+/g, "\\s+");
    const re = DEVANAGARI.test(word) ? new RegExp(`${body}${unit}`, "g") : new RegExp(`(?<![a-z])${body}${unit}`, "g");
    t = t.replace(re, String(value));
  }
  return t.replace(/\s+/g, " ").trim();
}

/** Replaces [start,end) with spaces so later extractors ignore it. */
const blank = (s, start, end) => s.slice(0, start) + " ".repeat(end - start) + s.slice(end);

function consumeAll(work, re, onMatch) {
  let out = work;
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  let m;
  while ((m = g.exec(work)) !== null) {
    if (onMatch(m) !== false) out = blank(out, m.index, m.index + m[0].length);
    if (m[0].length === 0) g.lastIndex += 1;
  }
  return out;
}

function multiplierFor(word) {
  if (!word) return null;
  const w = word.trim().toLowerCase();
  const hit = MULTIPLIERS.find((m) => m.re.test(w));
  return hit ? hit.value : null;
}

function wholeMessageIn(text, list) {
  const t = text.replace(/[.!?,]+/g, " ").replace(/\s+/g, " ").trim();
  return list.includes(t);
}

function startsWithAny(text, list) {
  const t = text.replace(/[.!?,]+/g, " ").replace(/\s+/g, " ").trim();
  return list.some((w) => t === w || t.startsWith(`${w} `));
}

const FILLER = /(?<![a-z])(it|is|its|it's|fine|ok|okay|please|just|really|hai|bhi|sab|toh|to|yaar|ji|है|भी|तो)(?![a-z])/g;

/** True when the message is only skip words ("koi bhi chalega", "doesn't matter, skip"). */
function isSkipMessage(lower, skipWords) {
  const t = lower.replace(/[.!?,]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (skipWords.includes(t)) return true;
  let rest = ` ${t} `;
  for (const w of [...skipWords].sort((a, b) => b.length - a.length)) rest = rest.split(` ${w} `).join(" ");
  rest = rest.replace(FILLER, " ").replace(/\s+/g, " ").trim();
  return rest.length === 0 && t.split(" ").length <= 6;
}

const NEGATION = /(no|not|don'?t|dont|without|nahi|nahin|bina|zaroorat nahi|need nahi|नहीं|बिना)\s*(need\s*(of|for)?\s*|chahiye\s*)?$/;

function parseDistances(work, ctx, out) {
  const found = [];
  const add = (meters, index, length, explicitParam) => found.push({ meters: Math.round(meters), index, length, explicitParam });

  work = consumeAll(work, /(park[\s-]*facing|facing[\s-]*(?:the\s+)?park|पार्क[\s-]*फेसिंग)/, (m) => add(100, m.index, m[0].length, "park"));
  work = consumeAll(work, /(\d+(?:\.\d+)?)\s*(min|mins|minutes?|मिनट)\s*(walk(?:ing)?|paidal|पैदल|drive|driving|by car|gaadi|गाड़ी|by auto|auto)?/, (m) => {
    const n = Number(m[1]);
    const mode = m[3] || "walk";
    const perMin = /drive|car|gaadi|गाड़ी/.test(mode) ? 500 : /auto/.test(mode) ? 400 : 80;
    add(n * perMin, m.index, m[0].length);
  });
  work = consumeAll(work, /(\d+(?:\.\d+)?)\s*(kms?|kilomet(?:er|re)s?|kilo meters?|किमी|किलोमीटर)(?![a-z])/, (m) => add(Number(m[1]) * 1000, m.index, m[0].length));
  work = consumeAll(work, /(aadha|half|आधा)\s*(km|kilomet\w*|किमी|किलोमीटर)/, (m) => add(500, m.index, m[0].length));
  work = consumeAll(work, /(\d{2,5})\s*(m|mtrs?|meters?|metres?|मीटर|मी)(?![a-z])/, (m) => add(Number(m[1]), m.index, m[0].length));
  work = consumeAll(work, /(walking distance|walkable|paidal doori|पैदल दूरी)/, (m) => add(800, m.index, m[0].length));

  // Parameter mentions (market, metro, …) with negation handling.
  const mentions = [];
  for (const p of compiled.parameters) {
    const re = new RegExp(p.re.source, "giu");
    let m;
    while ((m = re.exec(ctx.lower)) !== null) {
      const before = ctx.lower.slice(Math.max(0, m.index - 22), m.index);
      mentions.push({ key: p.key, index: m.index, end: m.index + m[0].length, negated: NEGATION.test(before.trim()) || /\b(no|not)\s+\w*\s*$/.test(before) });
    }
  }

  const priorities = {};
  const removed = [];
  for (const mention of mentions) {
    if (mention.negated) {
      removed.push(mention.key);
      continue;
    }
    if (!(mention.key in priorities)) priorities[mention.key] = null;
  }
  // Attach each distance to the closest parameter mention (or to the explicit one, e.g. park-facing).
  for (const d of found) {
    if (d.explicitParam) {
      priorities[d.explicitParam] = d.meters;
      continue;
    }
    let best = null;
    for (const mention of mentions) {
      if (mention.negated) continue;
      const after = mention.index >= d.index + d.length;
      const between = after ? ctx.lower.slice(d.index + d.length, mention.index) : ctx.lower.slice(mention.end, d.index);
      // "metro within 1 km and park…" — a conjunction ends the clause.
      if (/(?<![a-z])(and|aur|or|also|plus|but)(?![a-z])|[,;]|और/.test(between)) continue;
      // Parameter-then-distance reads more naturally; prefer it on ties.
      const gap = between.length + (after ? 3 : 0);
      if (gap <= 30 && (!best || gap < best.gap)) best = { key: mention.key, gap };
    }
    if (best) priorities[best.key] = d.meters;
    else if (ctx.slot === "distances" && ctx.distanceParam) priorities[ctx.distanceParam] = d.meters;
    else if (ctx.slot === "area") {
      // a lone distance in the area slot is not an area; ignore
    } else out.looseDistance = d.meters;
  }

  if (Object.keys(priorities).length) out.priorities = priorities;
  if (removed.length) out.removedPriorities = [...new Set(removed)];
  return work;
}

function parseArea(work, ctx, out) {
  return consumeAll(work, /(\d+(?:\.\d+)?)\s*(sq\.?\s*ft|sqft|square\s*f(?:ee|oo)t|sft|sq\.?\s*y(?:ar)?ds?|sq\.?\s*yd|square\s*yards?|gaj|gaz|sqm|sq\.?\s*m(?![a-z])|square\s*met(?:er|re)s?|acres?|गज|एकड़|वर्ग\s*फ़ुट)/, (m) => {
    const n = Number(m[1]);
    const unit = m[2];
    let factor = 1;
    if (/y(ar)?d|gaj|gaz|गज/.test(unit)) factor = 9;
    else if (/sqm|sq\.?\s*m|met/.test(unit)) factor = 10.7639;
    else if (/acre|एकड़/.test(unit)) factor = 43560;
    out.minAreaSqft = Math.round(n * factor);
  });
}

function parseBhk(work, ctx, out) {
  const BHK = "(?:bhks?|b\\s*h\\s*k|bed\\s*rooms?|bedrooms?|beds?|बेडरूम|बीएचके)(?![a-z])";
  work = consumeAll(work, new RegExp(`(\\d{1,2})\\s*(?:or|ya|to|-|/|,|and|या|से)\\s*(\\d{1,2})\\s*${BHK}`), (m) => {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const values = [];
    for (let i = lo; i <= Math.min(hi, lo + 4); i += 1) values.push(i);
    out.bhk = values.filter((v) => v >= 1 && v <= 10);
  });
  work = consumeAll(work, new RegExp(`(\\d{1,2})\\s*(\\+|plus|or more|and above|se zyada|se upar)?\\s*${BHK}`), (m) => {
    const n = Number(m[1]);
    if (n < 1 || n > 10) return false;
    out.bhk = [...new Set([...(out.bhk || []), n])];
    if (m[2]) out.bhkPlus = true;
  });
  work = consumeAll(work, /(?<![a-z0-9])(1\s*rk|one\s*rk|single room|ek kamra|studio(?: apartment)?)(?![a-z])/, () => {
    out.bhk = [...new Set([...(out.bhk || []), 0])];
  });
  if (/(?<![a-z])any\s*(bhk|config|configuration|size flat)(?![a-z])/.test(ctx.lower) || (ctx.slot === "bhk" && ctx.isSkip)) out.bhkAny = true;
  if (ctx.slot === "bhk" && !out.bhk && !out.bhkAny) {
    const m = work.match(/^\s*(\d)\s*(\+)?\s*$/) || work.match(/^\s*(\d)\s*(?:or|ya|,|\/)\s*(\d)\s*$/);
    if (m) {
      if (m[2] && m[2] !== "+") out.bhk = [Number(m[1]), Number(m[2])].sort();
      else {
        out.bhk = [Number(m[1])];
        if (m[2] === "+") out.bhkPlus = true;
      }
      work = blank(work, 0, work.length);
    }
  }
  return work;
}

function addSector(out, num, letter) {
  const n = Number(num);
  if (!Number.isInteger(n) || n < SECTOR_MIN || n > SECTOR_MAX) {
    out.clarify.push({ code: "sectorOutOfRange", slot: "location" });
    return;
  }
  const id = `${n}${letter ? letter.toUpperCase() : ""}`;
  out.sectors = [...new Set([...(out.sectors || []), id])];
}

function parseSectors(work, ctx, out) {
  const tail = /^\s*(?:,|or|and|ya|aur|&|\/|या|और)\s*(?:sector|sec|s)?\s*-?\s*(\d{1,3})\s*([a-d])?(?![\da-z])/;
  const handle = (m, full) => {
    addSector(out, m[1], m[2]);
    let rest = full.slice(m.index + m[0].length);
    let consumed = 0;
    let t;
    while ((t = rest.match(tail))) {
      addSector(out, t[1], t[2]);
      consumed += t[0].length;
      rest = rest.slice(t[0].length);
    }
    return consumed;
  };
  const patterns = [
    /(?:sector|sectr|sectors|sec|सेक्टर)\s*[-.#]?\s*(\d{1,3})\s*([a-d])?(?![\da-z])/,
    /(?<![a-z0-9])s\s?-?(\d{1,3})\s*([a-d])?(?![\da-z])/,
    /(?<![\d.])(\d{1,3})\s*([a-d])?\s*(?:sector|सेक्टर)(?![a-z])/,
  ];
  for (const re of patterns) {
    const g = new RegExp(re.source, "g");
    let m;
    const source = work;
    while ((m = g.exec(source)) !== null) {
      const extra = handle(m, source);
      work = blank(work, m.index, m.index + m[0].length + extra);
    }
  }
  if (ctx.slot === "location" && !out.sectors) {
    const m = work.match(/^\s*(\d{1,3})\s*([a-d])?((?:\s*(?:,|or|and|ya|aur|&|\/|या|और)\s*\d{1,3}\s*[a-d]?)*)\s*$/);
    if (m) {
      addSector(out, m[1], m[2]);
      for (const extra of (m[3] || "").matchAll(/(\d{1,3})\s*([a-d])?/g)) addSector(out, extra[1], extra[2]);
      work = blank(work, 0, work.length);
    }
  }
  return work;
}

function parseLocalities(work, ctx, out) {
  for (const loc of compiled.localities) {
    const g = new RegExp(loc.re.source, "giu");
    work = consumeAll(work, g, () => {
      out.localities = [...new Set([...(out.localities || []), loc.name])];
    });
  }
  if (compiled.anywhere.test(ctx.lower) || (ctx.slot === "location" && ctx.isSkip)) out.anywhere = true;
  compiled.anywhere.lastIndex = 0;
  if (/(?<![a-z])(only (this|that|these)|strictly|sirf (yahi|isi)|only in)(?![a-z])/.test(ctx.lower)) out.locationScope = "strict";
  if (/(?<![a-z])(nearby (is )?fine|nearby areas?|nearby sectors?|aas ?paas|paas wale|around it|surrounding)(?![a-z])/.test(ctx.lower)) out.locationScope = "nearby";
  return work;
}

function moneyValue(numStr, multWord) {
  const n = Number(numStr);
  if (!Number.isFinite(n)) return null;
  const mult = multiplierFor(multWord);
  return mult ? Math.round(n * mult) : null;
}

function parseBudget(work, ctx, out) {
  const NUM = "(\\d+(?:\\.\\d+)?)";
  const MULT = `\\s*(${MULT_WORD})?(?![a-z])`;
  const money = `(₹)?\\s*${NUM}${MULT}`;
  let handled = false;
  const qualifierBefore = (index) => ctx.lower.slice(Math.max(0, index - 28), index);
  const qualifierAfter = (index) => work.slice(index, index + 14);
  const Q = bank.lexicon.budgetQualifiers;
  const has = (text, words) => words.some((w) => new RegExp(`(?<![a-z])${w.replace(/\s+/g, "\\s+")}(?![a-z])`, "i").test(text));

  if (has(ctx.lower, Q.flexible)) {
    out.budgetFlexible = true;
    handled = true;
  }

  // Ranges: "20-25k", "70 lakh to 1 crore", "between 20 and 30 thousand", "20 se 25 hazaar"
  work = consumeAll(work, new RegExp(`(?:between\\s+)?${money}\\s*(?:-|to|till|and|se|से|upto|up to)\\s*${money}`), (m) => {
    const [, rs1, n1, m1, rs2, n2, m2] = m;
    const mult2 = multiplierFor(m2);
    const mult1 = multiplierFor(m1) || mult2;
    if (!mult1 && !mult2 && !rs1 && !rs2 && Number(n1) < 1000 && Number(n2) < 1000) return false;
    const a = Math.round(Number(n1) * (mult1 || 1));
    const b = Math.round(Number(n2) * (mult2 || 1));
    out.budgetMin = Math.min(a, b);
    out.budgetMax = Math.max(a, b);
    if (a > b) out.clarify.push({ code: "rangeInverted", slot: "budget" });
    handled = true;
  });

  work = consumeAll(work, new RegExp(money), (m) => {
    if (handled && out.budgetMax) return false;
    const [, rupee, n, mult] = m;
    let value = moneyValue(n, mult);
    if (value === null) {
      if (rupee || Number(n) >= 1000) value = Math.round(Number(n));
      else return false;
    }
    if (value < 500) return false;
    const before = qualifierBefore(m.index);
    const after = qualifierAfter(m.index + m[0].length);
    if (has(before, Q.min) || /^\s*(se upar|se zyada|से ऊपर|से ज़्यादा|\+|plus|and above|or more)/.test(after)) {
      out.budgetMin = value;
    } else {
      out.budgetMax = value;
      if (has(before, Q.approx) || /^\s*(ke aas ?paas|ke kareeb|के आस-पास|के करीब)/.test(after)) out.budgetApprox = true;
      if (has(before, Q.max) || /^\s*(tak|तक)/.test(after)) out.budgetStrictHint = true;
    }
    handled = true;
  });

  // Bare numbers while the budget question is open: confirm before using.
  if (!handled && ctx.slot === "budget") {
    const m = work.match(/^\s*(?:around|about|max|under|upto|up to|lagbhag)?\s*(\d+(?:\.\d+)?)\s*(?:tak|max)?\s*$/);
    if (m) {
      const n = Number(m[1]);
      let value = null;
      if (ctx.mode === "sale") value = n <= 20 ? Math.round(n * 10000000) : n < 1000 ? Math.round(n * 100000) : Math.round(n);
      else value = n < 1000 ? Math.round(n * 1000) : Math.round(n);
      if (value >= 1000) out.budgetConfirm = { value };
      work = blank(work, 0, work.length);
    }
  }

  if (out.budgetMax && !out.mode && !ctx.mode) {
    if (out.budgetMax >= 1500000) out.modeGuess = "sale";
    else if (out.budgetMax <= 300000 && /(per month|monthly|\/month|\bpm\b|mahina|mahine|महीना)/.test(ctx.lower)) out.modeGuess = "rent";
  }
  return work;
}

function parseMoveIn(ctx, out) {
  for (const m of compiled.moveIn) {
    m.re.lastIndex = 0;
    if (m.re.test(ctx.lower)) {
      out.moveIn = { days: m.days, key: m.id };
      return;
    }
  }
  const dm = ctx.lower.match(/(?:by|from|on|after)?\s*(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s*)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/) ||
    ctx.lower.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{1,2})(?:st|nd|rd|th)?/);
  if (dm) {
    const day = Number(/\d/.test(dm[1]) ? dm[1] : dm[2]);
    const mon = MONTHS.indexOf(/\d/.test(dm[1]) ? dm[2] : dm[1]);
    const now = ctx.now || new Date();
    let date = new Date(Date.UTC(now.getUTCFullYear(), mon, Math.min(day, 28)));
    if (date < now) date = new Date(Date.UTC(now.getUTCFullYear() + 1, mon, Math.min(day, 28)));
    out.moveIn = { days: Math.max(0, Math.round((date - now) / 86400000)), date: date.toISOString().slice(0, 10), key: "date" };
    return;
  }
  const rel = ctx.lower.match(/(?:in|within|after)\s*(\d{1,2})\s*(days?|weeks?|months?|din|hafte|mahine)/);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    const days = /week|hafte/.test(unit) ? n * 7 : /month|mahine/.test(unit) ? n * 30 : n;
    out.moveIn = { days, key: "relative" };
  }
}

function parseOccupancy(ctx, out) {
  const order = ["bachelor_female", "bachelor_male", "company", "couple", "students", "family", "professionals", "bachelor"];
  for (const key of order) {
    const def = compiled.occupancy.find((o) => o.value === key);
    def.re.lastIndex = 0;
    if (def.re.test(ctx.lower)) {
      out.occupancy = key;
      break;
    }
  }
  const people = ctx.lower.match(/(?:family of|we are|hum|total)\s*(\d{1,2})/) || ctx.lower.match(/(\d{1,2})\s*(?:people|persons|members|log|boys|girls|ladke|ladkiyan|लोग)(?![a-z])/);
  if (people) {
    const n = Number(people[1]);
    if (n >= 1 && n <= 20) out.people = n;
  }
  compiled.petsNo.lastIndex = 0;
  compiled.petsYes.lastIndex = 0;
  if (compiled.petsNo.test(ctx.lower)) out.pets = false;
  else if (compiled.petsYes.test(ctx.lower)) out.pets = true;
}

function firstMatch(list, text) {
  for (const item of list) {
    item.re.lastIndex = 0;
    if (item.re.test(text)) return item.value;
  }
  return undefined;
}

function parseKeywords(work, ctx, out) {
  const t = ctx.lower;
  compiled.modes.sale.lastIndex = 0;
  compiled.modes.rent.lastIndex = 0;
  const sale = compiled.modes.sale.test(t);
  const rent = compiled.modes.rent.test(t);
  if (sale && !rent) out.mode = "sale";
  else if (rent && !sale) out.mode = "rent";
  else if (rent && sale) {
    // "rental income investment" -> sale; "buy ... on rent"? prefer explicit "for rent"/"for sale"
    if (/for sale|to buy|kharid|khareed|ख़रीद|खरीद/.test(t)) out.mode = "sale";
    else if (/for rent|on rent|kiraye|किराये/.test(t)) out.mode = "rent";
  }
  if (ctx.slot === "mode" && !out.mode) {
    if (/^\s*(1|first|pehla)\s*$/.test(t)) out.mode = "rent";
    if (/^\s*(2|second|doosra|dusra)\s*$/.test(t)) out.mode = "sale";
  }

  // Property type (several allowed)
  if (/(?<![a-z])any\s*(type|property|kind)(?![a-z])/.test(t) || (ctx.slot === "propertyType" && ctx.isSkip)) out.propertyTypeAny = true;
  else {
    const types = [];
    for (const pt of compiled.propertyTypes) {
      pt.re.lastIndex = 0;
      if (pt.re.test(t)) types.push(pt.value);
    }
    // "1rk"/"studio" also set bhk; keep type only if clearly stated
    if (types.length) out.propertyType = [...new Set(types)];
  }

  // Furnishing
  if (/(?<![a-z])any\s*(furnish\w*)|furnishing (doesn'?t|does not) matter|koi bhi furnish/.test(t) || (ctx.slot === "furnishing" && ctx.isSkip)) out.furnishing = "any";
  else {
    let f = t;
    for (const item of compiled.furnishing) {
      const g = new RegExp(item.re.source, "giu");
      if (g.test(f)) {
        out.furnishing = out.furnishing || item.value;
        f = f.replace(new RegExp(item.re.source, "giu"), " ");
      }
    }
  }

  parseMoveIn(ctx, out);
  if (ctx.slot === "moveIn" && ctx.isSkip && !out.moveIn) out.moveIn = { days: null, key: "exploring" };
  parseOccupancy(ctx, out);

  // Possession & purpose ("either"/"both" only count while that question is open)
  const possession = firstMatch(compiled.possession.filter((p) => p.value !== "any"), t);
  if (possession) out.possession = possession;
  else if (ctx.slot === "possession" && (firstMatch(compiled.possession, t) === "any" || ctx.isSkip)) out.possession = "any";
  const purpose = firstMatch(compiled.purpose.filter((p) => p.value !== "both"), t);
  if (purpose) out.purpose = purpose;
  else if (ctx.slot === "purpose" && firstMatch(compiled.purpose, t) === "both") out.purpose = "both";

  // Priorities: "all of them" / "none"
  if (ctx.slot === "priorities") {
    if (/(?<![a-z])(all|all of them|everything|sab|sabhi|sab kuch|सब|सभी)(?![a-z])/.test(t)) {
      out.priorities = Object.fromEntries(DISTANCE_KEYS.map((k) => [k, out.priorities && out.priorities[k] != null ? out.priorities[k] : null]));
    } else if (/(?<![a-z])(none|none of these|nothing|kuch nahi|zaroorat nahi|koi nahi|कुछ नहीं)(?![a-z])/.test(t) || ctx.isSkip) {
      out.prioritiesNone = true;
    }
  }

  // Corner / middle
  compiled.corner.corner.lastIndex = 0;
  compiled.corner.middle.lastIndex = 0;
  compiled.corner.any.lastIndex = 0;
  if (compiled.corner.corner.test(t) && !/(?<![a-z])(no|not|don'?t want|nahi)\s+(a\s+)?corner/.test(t)) out.corner = "corner";
  else if (compiled.corner.middle.test(t) && (ctx.slot === "corner" || /(middle|beech|bich|mid)\s*(wala|wali|house|plot|unit|flat|property|position|घर)/.test(t))) out.corner = "middle";
  else if (ctx.slot === "corner" && (compiled.corner.any.test(t) || ctx.isSkip)) out.corner = "any";

  if (ctx.slot === "area" && !out.minAreaSqft) {
    if (ctx.isSkip || /any size|koi bhi size/.test(t)) out.areaAny = true;
    else {
      const m = work.match(/(?:min(?:imum)?|at least|kam se kam)?\s*(\d{3,6})(?!\d)/);
      if (m) out.minAreaSqft = Number(m[1]);
    }
  }
}

function parseContact(work, ctx, out) {
  work = consumeAll(work, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/, (m) => {
    out.email = m[0].slice(0, 120);
  });
  work = consumeAll(work, /(?:\+?91[\s-]?|0)?([6-9]\d{2}[\s-]?\d{2}[\s-]?\d{5}|[6-9]\d{4}[\s-]?\d{5})(?!\d)/, (m) => {
    out.phone = m[1].replace(/\D/g, "");
  });
  if (ctx.slot === "phone" && !out.phone && /\d{5,}/.test(work)) out.clarify.push({ code: "badPhone", slot: "phone" });
  if (ctx.slot === "email" && !out.email && /@/.test(work)) out.clarify.push({ code: "badEmail", slot: "email" });

  const explicit = ctx.raw.match(/(?:my name is|mera naam|मेरा नाम|this is)\s+([A-Za-zऀ-ॿ][A-Za-zऀ-ॿ.' -]{1,40})/i);
  let name = explicit ? explicit[1] : null;
  if (!name && ctx.slot === "name" && !ctx.isSkip) {
    name = ctx.raw.replace(/^(hi|hello|hey)[,!\s]+/i, "").replace(/^(i am|i'm|im|main|मैं|naam|name)\s+/i, "");
  }
  if (name) {
    name = name
      .replace(/\s+(hai|hoon|hu|here|है|हूँ|हूं)\s*[.!]*$/i, "")
      .replace(/[^A-Za-zऀ-ॿ .'-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = name.split(" ").filter(Boolean);
    if (name.length >= 2 && name.length <= 60 && words.length <= 4 && !/\d/.test(name)) {
      out.name = words.map((w) => (DEVANAGARI.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(" ");
    } else if (ctx.slot === "name") out.clarify.push({ code: "badName", slot: "name" });
  }
  return work;
}

function parseSignals(ctx, out) {
  const t = ctx.lower.replace(/[.!?]+$/g, "").trim();
  const short = t.split(/\s+/).length <= 5;
  if (short && (wholeMessageIn(t, compiled.answers.yes) || startsWithAny(t, compiled.answers.yes.filter((w) => w.length > 2)))) out.yes = true;
  if (short && (wholeMessageIn(t, compiled.answers.no) || startsWithAny(t, compiled.answers.no.filter((w) => w.length > 2)))) out.no = true;
  if (out.yes && out.no) out.yes = false;
  if (short && wholeMessageIn(t, compiled.answers.skip)) out.skip = true;

  const intents = [];
  for (const intent of compiled.intents) {
    if (intent.patterns.some((p) => p.test(ctx.raw) || p.test(ctx.lower))) {
      intents.push(intent.id);
      if (intent.setLanguage) out.setLanguage = intent.setLanguage;
    }
  }
  out.intents = intents;

  const hash = ctx.lower.match(/(?:#|number|no\.?|property|option|card)\s*(\d)(?!\d)/);
  if (hash) out.ordinal = Number(hash[1]);
  else {
    for (const o of compiled.ordinals) {
      o.re.lastIndex = 0;
      if (o.re.test(ctx.lower)) {
        out.ordinal = o.key === "last" ? "last" : Number(o.key);
        break;
      }
    }
  }

  for (const f of compiled.faq) {
    if (f.patterns.some((p) => p.test(ctx.lower))) {
      out.faqId = f.id;
      break;
    }
  }
}

/**
 * @param {string} text   raw user message
 * @param {{slot?:string, mode?:string, distanceParam?:string, now?:Date}} context
 */
function parseMessage(text, context = {}) {
  const raw = String(text || "").slice(0, 600).trim();
  const lower = normalize(raw);
  const out = { clarify: [] };
  const skipWords = compiled.answers.skip;
  const isSkip = isSkipMessage(lower, skipWords);
  const ctx = { ...context, raw, lower, isSkip };

  parseSignals(ctx, out);

  let work = lower;
  work = parseContact(work, ctx, out);
  work = parseDistances(work, ctx, out);
  work = parseArea(work, ctx, out);
  work = parseBhk(work, ctx, out);
  work = parseSectors(work, ctx, out);
  work = parseLocalities(work, ctx, out);
  // Contact answers are never read as requirements (a phone number is not a budget).
  if (!["name", "phone", "email", "review"].includes(ctx.slot)) work = parseBudget(work, { ...ctx, mode: out.mode || context.mode }, out);
  parseKeywords(work, ctx, out);

  // A lone distance while a distance follow-up is open belongs to that parameter.
  if (ctx.slot === "distances" && ctx.distanceParam && out.looseDistance && !(out.priorities && out.priorities[ctx.distanceParam] != null)) {
    out.priorities = { ...(out.priorities || {}), [ctx.distanceParam]: out.looseDistance };
  }
  if (ctx.slot === "distances" && ctx.distanceParam && !out.priorities && /(?<![a-z])(near|close|paas|nearby|पास)(?![a-z])/.test(lower)) {
    out.priorities = { [ctx.distanceParam]: null };
    out.distanceDefault = true;
  }

  out.language = detectLanguage(raw, context.lang || "en");
  out.fieldCount = countFields(out);
  return out;
}

const FIELD_KEYS = ["mode", "sectors", "localities", "anywhere", "budgetMin", "budgetMax", "budgetFlexible", "budgetConfirm", "bhk", "bhkAny", "propertyType", "propertyTypeAny", "furnishing", "moveIn", "occupancy", "people", "pets", "minAreaSqft", "areaAny", "possession", "purpose", "priorities", "prioritiesNone", "removedPriorities", "corner", "name", "phone", "email", "locationScope"];

function countFields(out) {
  return FIELD_KEYS.filter((k) => out[k] !== undefined && out[k] !== null && !(Array.isArray(out[k]) && !out[k].length)).length;
}

module.exports = { parseMessage, detectLanguage, normalize, FIELD_KEYS, countFields, DISTANCE_KEYS };
