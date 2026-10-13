/**
 * AI Property Consultant — rule engine tests. No database or network needed:
 * the LLM is disabled and listing scoring runs on in-memory documents.
 */
process.env.AI_CONSULTANT_LLM = "off";

const { parseMessage } = require("../services/aiConsultant/parser");
const engine = require("../services/aiConsultant/engine");
const matcher = require("../services/aiConsultant/matcher");
const { validateExtraction, redact } = require("../services/aiConsultant/llm");
const groq = require("../services/aiConsultant/groqClient");
const { sanitizeNearbyAmenities, sanitizeCornerPosition } = require("../config/propertyParameters");
const bank = require("../data/aiConsultant/questionBank.json");

async function converse(messages, lang) {
  let r = await engine.handleTurn({ state: null, action: { type: "start", lang } });
  for (const message of messages) r = await engine.handleTurn({ state: JSON.parse(JSON.stringify(r.state)), message });
  return r;
}

describe("question bank", () => {
  test("covers all seven parameters and compiles every pattern", () => {
    expect(Object.keys(bank.parameters)).toEqual(["market", "metro", "hospital", "school", "park", "mall", "corner"]);
    for (const intent of Object.values(bank.intents)) intent.patterns.forEach((p) => expect(() => new RegExp(p, "iu")).not.toThrow());
    for (const slot of Object.values(bank.slots)) {
      // "distances" asks per parameter (parameters[*].distanceAsk) instead of one question.
      const ask = slot.perParameter ? slot.intro : slot.ask.rent || slot.ask;
      ["en", "hinglish", "hi"].forEach((l) => expect((ask[l] || []).length).toBeGreaterThan(0));
    }
  });
});

describe("parser", () => {
  test.each([
    ["2 bhk for rent in sector 57 under 30k near metro", { mode: "rent", bhk: [2], sectors: ["57"], budgetMax: 30000, priorities: { metro: null } }],
    ["20-25k", { budgetMin: 20000, budgetMax: 25000 }],
    ["70 lakh to 1 crore", { budgetMin: 7000000, budgetMax: 10000000 }],
    ["डेढ़ करोड़ तक", { budgetMax: 15000000 }],
    ["25 hazaar tak", { budgetMax: 25000 }],
    ["2 or 3 bhk in sector 49, 50 or 51", { bhk: [2, 3], sectors: ["49", "50", "51"] }],
    ["park facing corner plot for sale in sector 82", { mode: "sale", corner: "corner", priorities: { park: 100 }, propertyType: ["plot"] }],
    ["metro within 1 km and park within 500m, no mall", { priorities: { metro: 1000, park: 500 }, removedPriorities: ["mall"] }],
    ["family of 4 with a dog", { occupancy: "family", people: 4, pets: true }],
    ["at least 200 gaj", { minAreaSqft: 1800 }],
    ["mera naam Rahul hai", { name: "Rahul" }],
  ])("%s", (text, expected) => {
    expect(parseMessage(text, {})).toMatchObject(expected);
  });

  test("bare numbers depend on the open question", () => {
    expect(parseMessage("25", { slot: "budget", mode: "rent" }).budgetConfirm).toEqual({ value: 25000 });
    expect(parseMessage("57", { slot: "location" }).sectors).toEqual(["57"]);
    expect(parseMessage("2", { slot: "bhk" }).bhk).toEqual([2]);
  });

  test("a phone number is never read as a budget", () => {
    const p = parseMessage("98765 43210", { slot: "phone" });
    expect(p.phone).toBe("9876543210");
    expect(p.budgetMax).toBeUndefined();
  });

  test("parking and small do not trigger park or mall", () => {
    expect(parseMessage("I need parking and a small house", {}).priorities).toBeUndefined();
  });
});

describe("engine", () => {
  test("one sentence fills several answers and only missing questions are asked", async () => {
    const r = await converse(["2 bhk for rent in sector 57 under 30k near metro"]);
    expect(r.state.req).toMatchObject({ mode: "rent", sectors: ["57"], budgetMax: 30000, bhk: [2] });
    expect(r.state.answered).toEqual(expect.arrayContaining(["mode", "location", "budget", "bhk", "priorities"]));
  });

  test("corrections update one answer and keep the rest", async () => {
    const r = await converse(["rent", "sohna road", "25k", "nahi 30k kar do"]);
    expect(r.state.req.budgetMax).toBe(30000);
    expect(r.state.req.localities).toEqual(["Sohna Road"]);
  });

  test("an ambiguous bare budget is confirmed, not guessed", async () => {
    let r = await converse(["rent", "sector 46", "25"]);
    expect(r.state.pending).toMatchObject({ type: "confirmBudget", value: 25000 });
    expect(r.state.req.budgetMax).toBeUndefined();
    r = await engine.handleTurn({ state: r.state, message: "yes" });
    expect(r.state.req.budgetMax).toBe(25000);
  });

  test("a rental budget in crores asks whether the user wants to buy", async () => {
    let r = await converse(["rent", "dlf phase 4", "2 crore"]);
    expect(r.state.pending).toMatchObject({ type: "switchMode", to: "sale" });
    r = await engine.handleTurn({ state: r.state, message: "yes" });
    expect(r.state.req).toMatchObject({ mode: "sale", budgetMax: 20000000 });
  });

  test("show results waits for the required answers", async () => {
    let r = await converse(["rent", "show results"]);
    expect(r.next).toBeNull();
    r = await converse(["rent in sector 57 under 40k", "show results"]);
    expect(r.next).toBe("search");
  });

  test("one sentence goes straight to search", async () => {
    const r = await converse(["2 bhk for rent in sector 57 under 30k near metro"]);
    expect(r.next).toBe("search");
  });

  test("step-by-step takes at most five questions and captures the 7 parameters", async () => {
    let r = await engine.handleTurn({ state: null, action: { type: "start" } });
    let questions = r.messages.filter((m) => m.kind === "question").length;
    for (const message of ["rent", "Sector 57", "under 40k", "2 BHK", "metro and park and corner"]) {
      r = await engine.handleTurn({ state: JSON.parse(JSON.stringify(r.state)), message });
      questions += r.messages.filter((m) => m.kind === "question").length;
    }
    expect(questions).toBeLessThanOrEqual(5);
    expect(r.next).toBe("search");
    expect(Object.keys(r.state.req.priorities).sort()).toEqual(["metro", "park"]);
    expect(r.state.req.corner).toBe("corner");
  });

  test("details mentioned in passing are still applied without being asked", async () => {
    const r = await converse(["rent a fully furnished 2 bhk in sector 57 under 40k for a family, moving next month, near a school"]);
    expect(r.state.req).toMatchObject({ furnishing: "furnished", occupancy: "family", priorities: { school: null } });
    expect(r.state.req.moveIn.days).toBe(30);
    expect(r.next).toBe("search");
  });

  test("Hindi conversation replies in Hindi", async () => {
    const r = await converse(["मुझे घर ख़रीदना है"]);
    expect(r.state.req.mode).toBe("sale");
    expect(r.messages[r.messages.length - 1].text).toMatch(/[ऀ-ॿ]/);
  });

  test("contact flow validates the phone number and reaches review", async () => {
    let r = await converse(["call me", "Rahul", "12345"]);
    expect(r.state.contact.phone).toBeUndefined();
    r = await engine.handleTurn({ state: r.state, message: "9876543210" });
    r = await engine.handleTurn({ state: r.state, message: "skip" });
    expect(r.next).toBe("review");
    expect(r.ui.contact.phone).toBe("98••••••10");
  });

  test("restart clears requirements", async () => {
    const r = await converse(["rent in sector 57", "start over"]);
    expect(r.state.req.mode).toBeUndefined();
    expect(r.state.answered).toEqual([]);
  });

  test("tampered client state is sanitised", () => {
    const s = engine.sanitizeState({
      phase: "admin",
      req: { mode: "rent", $where: "1", sectors: ["57", { $gt: "" }, "999999"], budgetMax: "1e99", localities: ["Nowhere"], priorities: { metro: 500, evil: 1 } },
      shown: [{ id: "x", listingType: "rental" }],
      contact: { phone: "123" },
    });
    expect(s.phase).toBe("collect");
    expect(s.req).toEqual({ mode: "rent", sectors: ["57"], priorities: { metro: 500 } });
    expect(s.shown).toEqual([]);
    expect(s.contact).toEqual({});
  });
});

describe("matcher scoring", () => {
  const req = { mode: "rent", sectors: ["57"], budgetMax: 30000, bhk: [2], priorities: { metro: 1000 }, corner: "corner" };
  const base = { _id: "a".repeat(24), title: "Home", Sector: "Sector-57", monthlyRent: 28000, bedrooms: 2, createdAt: new Date() };

  test("verified distances and corner position raise the score", () => {
    const verified = matcher.scoreListing({ ...base, cornerPosition: "corner", nearbyAmenities: [{ category: "metro", distanceMeters: 600 }] }, req, "en", Date.now());
    const unverified = matcher.scoreListing({ ...base, cornerPosition: "not_sure" }, req, "en", Date.now());
    expect(verified.score).toBeGreaterThan(unverified.score);
    expect(unverified.caveats.join(" ")).toMatch(/not verified/);
    expect(verified.reasons.join(" ")).toMatch(/Metro ~600 m/);
  });

  test("hard filters include location, budget and BHK", () => {
    const q = matcher.buildQuery(req);
    expect(q.isActive).toBe(true);
    expect(JSON.stringify(q.$and)).toContain("monthlyRent");
    expect(q.$and).toHaveLength(3);
  });
});

describe("LLM guard rails", () => {
  test("model output is whitelisted field by field", () => {
    const v = validateExtraction({ intent: "provide_info", confidence: 0.9, fields: { mode: "rent", sectors: [57, 500, "x"], localities: ["Atlantis"], budgetMax: 25000, propertyType: "castle", priorities: { metro: 800, spaceport: 1 }, $where: "1" } }, "rent");
    expect(v.fields).toEqual({ mode: "rent", sectors: ["57"], budgetMax: 25000, priorities: { metro: 800 } });
  });

  test("contact details are redacted before reaching the model", () => {
    expect(redact("call 9876543210 or a@b.com")).toBe("call [phone] or [email]");
  });

  test("with no keys the model is unavailable and nothing is sent", async () => {
    expect(groq.isAvailable()).toBe(false);
    expect(await groq.complete({ messages: [{ role: "user", content: "hi" }] })).toEqual({ ok: false, reason: "disabled" });
  });
});

describe("listing parameters", () => {
  test("nearby amenities are cleaned and limited to the six categories", () => {
    const rows = sanitizeNearbyAmenities(JSON.stringify([{ category: "Metro", name: "HUDA", distance: "650" }, { category: "airport", name: "IGI", distance: 9000 }, { category: "park", name: "" }]));
    expect(rows).toEqual([expect.objectContaining({ category: "metro", name: "HUDA", distanceMeters: 650, source: "partner" })]);
    expect(sanitizeCornerPosition("Corner")).toBe("corner");
    expect(sanitizeCornerPosition("junk")).toBe("not_sure");
  });
});

describe("personalise more", () => {
  test("after results, the optional questions are offered, asked once each, then search again", async () => {
    let r = await converse(["2 bhk for rent in sector 57 under 30k near metro"]);
    expect(r.next).toBe("search");
    r = { ...r, state: { ...r.state, phase: "results" } };
    const offered = await engine.handleTurn({ state: r.state, message: "tell me about #1" });
    expect(offered.messages.flatMap((m) => m.chips || []).some((c) => c.value === "personalise more")).toBe(true);
    let t = await engine.handleTurn({ state: r.state, message: "personalise more" });
    expect(t.state.deep).toBe(true);
    expect(t.state.slot).toBe("propertyType");
    const asked = [];
    for (const message of ["apartment", "skip", "skip", "skip", "skip", "skip", "skip"]) {
      asked.push(t.state.slot);
      t = await engine.handleTurn({ state: JSON.parse(JSON.stringify(t.state)), message });
      if (t.next === "search") break;
    }
    expect(t.next).toBe("search");
    expect(new Set(asked).size).toBe(asked.length); // never the same question twice
    expect(asked).toEqual(expect.arrayContaining(["propertyType", "furnishing", "moveIn", "occupancy"]));
    const again = await engine.handleTurn({ state: { ...t.state, phase: "results" }, message: "personalise more" });
    expect(again.state.slot).not.toBe("propertyType");
  });

  test("show results now works in the middle of the optional round", async () => {
    let r = await converse(["buy 3 bhk in sector 65 under 2 crore", "none of these"]);
    r = await engine.handleTurn({ state: { ...r.state, phase: "results" }, message: "personalise more" });
    r = await engine.handleTurn({ state: r.state, message: "show results" });
    expect(r.next).toBe("search");
  });
});

describe("robustness", () => {
  const junk = [
    "", " ", "?????", "🙂🙂🙂", "asdfghjkl", "x".repeat(600), "<script>alert(1)</script>", "{$gt: ''}", "sector 999", "₹₹₹",
    "0", "-5", "1e99", "null", "undefined", "DROP TABLE users;", "मुझे", "haan nahi", "yes no", "sector", "bhk", "near", "show more",
    "tell me about #9", "what is near the first one", "change budget", "refine", "start over", "call me", "हिंदी में", "in english",
    "budget 0", "under 0k", "2 crore per month", "1 rk", "plot", "corner", "skip", "skip", "skip", "show results",
  ];

  test("random and hostile messages never crash and always get a reply", async () => {
    let state = null;
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 400; i += 1) {
      const message = junk[Math.floor(rnd() * junk.length)];
      const r = await engine.handleTurn({ state, message });
      expect(Array.isArray(r.messages)).toBe(true);
      expect(r.messages.length).toBeGreaterThan(0);
      r.messages.forEach((m) => expect(typeof m.text).toBe("string"));
      expect(JSON.stringify(r.state).length).toBeLessThan(20000);
      // occasionally simulate a client that mangles its state
      state = rnd() < 0.1 ? { ...r.state, req: { mode: "x", sectors: "57", budgetMax: -1 }, slot: "nope", turn: "a" } : r.state;
    }
  });

  test("actions with bad input are ignored safely", async () => {
    for (const action of [{ type: "edit", slot: "__proto__" }, { type: "setLanguage", lang: "fr" }, { type: "nope" }, null, "start"]) {
      const r = await engine.handleTurn({ state: null, action, message: "rent" });
      expect(r.messages.length).toBeGreaterThan(0);
    }
  });
  test("explicit disableLLM opt-out bypasses fallback; default transcript path permits it", async () => {
    const llm = require("../services/aiConsultant/llm");
    const extractSpy = jest.spyOn(llm, "extract");
    const answerSpy = jest.spyOn(llm, "answerGeneral");
    try {
      await engine.handleTurn({ state: engine.emptyState("en"), message: "qzxv blorpt", disableLLM: true });
      expect(extractSpy).not.toHaveBeenCalled();
      expect(answerSpy).not.toHaveBeenCalled();

      await engine.handleTurn({ state: engine.emptyState("en"), message: "qzxv blorpt" });
      expect(extractSpy).toHaveBeenCalled();
    } finally {
      extractSpy.mockRestore();
      answerSpy.mockRestore();
    }
  });

});
