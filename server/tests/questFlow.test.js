/**
 * The GgnBot quest (client/src/data/questFlow.json) offers ready-made answers.
 * Every one of them must be understood by the consultant's parser, otherwise a
 * tap would be met with "sorry, I didn't get that".
 */
const path = require("path");
const parser = require("../services/aiConsultant/parser");

const flow = require(path.join(__dirname, "../../client/src/data/questFlow.json"));
const mission = (slot) => flow.missions.find((m) => m.slot === slot);
const parsed = (text, slot, mode) => parser.parseMessage(text, { slot, mode });

describe("quest answer options", () => {
  test("asks exactly the server's five pre-search questions, in order", () => {
    expect(flow.missions.map((m) => m.slot)).toEqual(["mode", "location", "budget", "bhk", "priorities"]);
  });

  test("rent / buy", () => {
    expect(parsed("rent", "mode").mode).toBe("rent");
    expect(parsed("buy", "mode").mode).toBe("sale");
  });

  test("every area option resolves to a sector or a known locality", () => {
    const options = mission("location").zones.flatMap((z) => z.options);
    expect(options.length).toBeGreaterThan(150);
    for (const o of options) {
      const r = parsed(o.value, "location");
      expect([o.value, (r.sectors || []).length + (r.localities || []).length]).toEqual([o.value, 1]);
    }
    expect(parsed(mission("location").anywhere.value, "location").anywhere).toBe(true);
    for (const list of Object.values(mission("location").popular)) {
      for (const v of list) expect(options.map((o) => o.value)).toContain(v);
    }
  });

  test("every zone has coordinates inside Gurgaon for 'near me'", () => {
    for (const z of mission("location").zones) {
      expect(z.lat).toBeGreaterThan(28.2);
      expect(z.lat).toBeLessThan(28.6);
      expect(z.lng).toBeGreaterThan(76.8);
      expect(z.lng).toBeLessThan(77.2);
    }
  });

  test("every budget option sets a budget for its mode", () => {
    for (const [mode, options] of Object.entries(mission("budget").options)) {
      for (const o of options) {
        const r = parsed(o.value, "budget", mode === "buy" ? "sale" : "rent");
        expect([o.value, Boolean(r.budgetMax || r.budgetMin || r.budgetFlexible)]).toEqual([o.value, true]);
      }
    }
  });

  test("every BHK option", () => {
    for (const o of mission("bhk").options) {
      const r = parsed(o.value, "bhk");
      expect([o.value, Boolean((r.bhk && r.bhk.length) || r.bhkAny)]).toEqual([o.value, true]);
    }
  });

  test("every nearby-priority option, and the finish button", () => {
    for (const o of mission("priorities").options) {
      const r = parsed(o.value, "priorities");
      expect([o.value, Boolean((r.priorities && Object.keys(r.priorities).length) || r.corner)]).toEqual([o.value, true]);
    }
    expect(parsed(mission("priorities").done.value, "priorities").prioritiesNone).toBe(true);
  });

  test("every mission has its words in all three languages", () => {
    for (const m of flow.missions) {
      for (const key of ["label", "ask"]) expect(Object.keys(m[key]).sort()).toEqual(["en", "hi", "hinglish"]);
      expect(Object.keys(m.achievement.text).sort()).toEqual(["en", "hi", "hinglish"]);
    }
  });

  test("every quick pick fills rent/buy, area, budget and BHK in one tap", () => {
    expect(flow.quickPicks.length).toBeGreaterThanOrEqual(4);
    for (const q of flow.quickPicks) {
      const r = parsed(q.value, "mode");
      expect([q.value, Boolean(r.mode), Boolean((r.sectors || []).length || (r.localities || []).length), Boolean(r.budgetMax), Boolean((r.bhk || []).length)]).toEqual([q.value, true, true, true, true]);
    }
  });
});
