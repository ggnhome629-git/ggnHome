/** Dashboard search: strict sector matching and free-text fields. */
process.env.DISABLE_CRON = "true";
const { _internals: s } = require("../controllers/Searchproperties.controller");

/** Evaluates a sector clause the way MongoDB would, on a plain listing object. */
function matches(doc, clause) {
  if (clause.$or) return clause.$or.some((c) => matches(doc, c));
  if (clause.$and) return clause.$and.every((c) => matches(doc, c));
  return Object.entries(clause).every(([field, cond]) => {
    const value = String(doc[field] || "");
    if (cond instanceof RegExp) return cond.test(value);
    if (cond.$not) return !cond.$not.test(value);
    throw new Error("unsupported condition");
  });
}
const sectorFilter = (query) => {
  const parsed = s.parseSearchQuery(query);
  return s.buildFilterObject({ parsed }).$and[0];
};

describe("strict sector search", () => {
  const inSector57 = ["Sector-57", "Sector 57", "sector57", "SECTOR - 57", "Sec. 57", "Sec 57, Gurgaon", "S-57", "57", "Sector 057", "Sector 57 (Golf Course Ext.)"];
  const notSector57 = ["Sector-157", "Sector 5", "Sector 571", "Sector 57A", "Sector-56", "Sector 58, near Sector 57 market", "157", "DLF Phase 5"];

  test.each(["sector 57", "sec-57", "s57", "57", "2 bhk in sector 57"])("“%s” matches every spelling of Sector 57", (q) => {
    const clause = sectorFilter(q);
    inSector57.forEach((Sector) => expect({ Sector, ok: matches({ Sector }, clause) }).toEqual({ Sector, ok: true }));
  });

  test("neighbouring and lettered sectors are excluded", () => {
    const clause = sectorFilter("sector 57");
    notSector57.forEach((Sector) => expect({ Sector, ok: matches({ Sector }, clause) }).toEqual({ Sector, ok: false }));
  });

  test("lettered sectors match only when asked for", () => {
    const clause = sectorFilter("sector 37c");
    expect(matches({ Sector: "Sector 37C" }, clause)).toBe(true);
    expect(matches({ Sector: "Sector-37 C" }, clause)).toBe(true);
    expect(matches({ Sector: "Sector 37" }, clause)).toBe(false);
    expect(matches({ Sector: "Sector 37D" }, clause)).toBe(false);
  });

  test("address is used only when the Sector field has no sector number", () => {
    const clause = sectorFilter("sector 49");
    expect(matches({ Sector: "Sohna Road", address: "Tower B, Sector 49, Sohna Road" }, clause)).toBe(true);
    expect(matches({ Sector: "Sohna Road", location: "Plot 12, Sec-49" }, clause)).toBe(true);
    // Filed under another sector: an address mention must not pull it in.
    expect(matches({ Sector: "Sector-50", address: "Opposite Sector 49 market" }, clause)).toBe(false);
    expect(matches({ Sector: "Sohna Road", address: "Near Sector 149" }, clause)).toBe(false);
  });

  test("several sectors are an either/or", () => {
    const clause = sectorFilter("sector 49 or 50");
    expect(s.parseSearchQuery("sector 49 or 50").sectors).toEqual(["49", "50"]);
    expect(s.parseSearchQuery("2 bhk in sectors 49, 50 and 51").sectors).toEqual(["49", "50", "51"]);
    expect(matches({ Sector: "Sector 50" }, clause)).toBe(true);
    const multi = s.buildFilterObject({ parsed: { sectors: ["49", "50"], bhk: null, text: "" } }).$and[0];
    expect(matches({ Sector: "Sector 50" }, multi)).toBe(true);
    expect(matches({ Sector: "Sector 51" }, multi)).toBe(false);
    expect(clause).toBeTruthy();
  });
});

describe("free-text search fields", () => {
  test("title, Sector, address, location and description are all searched", () => {
    const f = s.buildFilterObject({ parsed: s.parseSearchQuery("sohna road") });
    const fields = f.$and[0].$or.map((c) => Object.keys(c)[0]);
    expect(fields).toEqual(["title", "Sector", "address", "location", "description"]);
  });
});
