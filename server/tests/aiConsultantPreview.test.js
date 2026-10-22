const controller = require("../controllers/aiConsultant.controller");

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

describe("live shortlist preview", () => {
  const original = controller._matcher;
  afterAll(() => { controller._matcher = original; });

  test("returns a small shortlist from the first answer and serves repeats from cache", async () => {
    let calls = 0;
    controller._matcher = () => ({
      search: async (req, opts) => {
        calls += 1;
        expect(opts.pageSize).toBe(6);
        return {
          total: 42,
          results: [{ id: "a1", url: "/Rentaldetails/a1", title: "Sunny 2 BHK", sector: "Sector 57", priceLabel: "₹30k/month", bhkLabel: "2 BHK", image: null, score: 88, reasons: ["secret"], params: {} }],
        };
      },
    });
    controller._previewCache.clear();
    const state = { req: { mode: "rent" }, answered: ["mode"] };
    const first = mockResponse();
    await controller.preview({ body: { state } }, first);
    expect(first.body).toMatchObject({ success: true, cached: false, total: 42, mode: "rent" });
    expect(first.body.results[0]).toEqual({ id: "a1", url: "/Rentaldetails/a1", title: "Sunny 2 BHK", sector: "Sector 57", priceLabel: "₹30k/month", bhkLabel: "2 BHK", image: null, score: 88 });

    const again = mockResponse();
    await controller.preview({ body: { state } }, again);
    expect(again.body.cached).toBe(true);
    expect(calls).toBe(1);
  });

  test("fails softly", async () => {
    controller._matcher = () => ({ search: async () => { throw new Error("db down"); } });
    controller._previewCache.clear();
    const res = mockResponse();
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    await controller.preview({ body: { state: { req: { mode: "sale" } } } }, res);
    spy.mockRestore();
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe("near me areas", () => {
  const original = controller._listingCoords;
  afterAll(() => { controller._listingCoords = original; });

  test("lists the closest areas with live homes, nearest first, and caches by cell", async () => {
    let calls = 0;
    controller._listingCoords = async () => {
      calls += 1;
      return [
        { Sector: "Sector-57", latitude: 28.4225, longitude: 77.0731 },
        { Sector: "57", latitude: 28.4230, longitude: 77.0740 },
        { Sector: "Sector 56", latitude: 28.4300, longitude: 77.1000 },
        { Sector: "Sushant Lok 1", latitude: 28.4650, longitude: 77.0700 },
      ];
    };
    controller._nearCache.clear();
    const res = mockResponse();
    await controller.nearbyAreas({ query: { lat: "28.4226", lng: "77.0733" } }, res);
    expect(res.body.areas.map((a) => [a.value, a.homes])).toEqual([["Sector 57", 2], ["Sector 56", 1], ["Sushant Lok 1", 1]]);
    expect(res.body.areas[0].km).toBeLessThan(0.2);
    const again = mockResponse();
    await controller.nearbyAreas({ query: { lat: "28.4229", lng: "77.0735" } }, again);
    expect(calls).toBe(1);
  });

  test("says when the visitor is far from Gurgaon, and rejects bad input", async () => {
    const far = mockResponse();
    await controller.nearbyAreas({ query: { lat: "19.07", lng: "72.87" } }, far);
    expect(far.body).toEqual({ success: true, outside: true, areas: [] });
    const badInput = mockResponse();
    await controller.nearbyAreas({ query: { lat: "abc", lng: "1" } }, badInput);
    expect(badInput.statusCode).toBe(400);
  });
});
