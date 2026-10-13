/**
 * Rule-first answering with the Groq fallback, exercised end to end through
 * engine.handleTurn with a mocked network. Proves that:
 *   - messages the rules understand never reach Groq;
 *   - only messages the rules cannot interpret do, and model output is validated;
 *   - fabricated listing claims from the model are dropped;
 *   - timeouts, 429 quota errors and missing keys degrade to a normal reply.
 */
process.env.DISABLE_CRON = "true";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

function jsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name.toLowerCase() in headers ? String(headers[name.toLowerCase()]) : null) },
    json: async () => body,
  };
}

const chat = (content) => jsonResponse(200, { choices: [{ message: { content } }], usage: { total_tokens: 120 } });

/** Loads engine + groq with a fresh key ledger for each test. */
function load(env) {
  let mods;
  jest.isolateModules(() => {
    Object.keys(process.env).forEach((k) => {
      if (/^GROQ_|^AI_CONSULTANT_LLM$/.test(k)) delete process.env[k];
    });
    Object.assign(process.env, env);
    mods = {
      engine: require("../services/aiConsultant/engine"),
      groq: require("../services/aiConsultant/groqClient"),
    };
  });
  return mods;
}

const UNPARSEABLE = "qzxv blorpt flimflam";

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
});

describe("Groq fallback is used only when the rules cannot answer", () => {
  test("a message the rules understand never calls Groq", async () => {
    const { engine } = load({ GROQ_API_KEY_1: "test-key-1" });
    global.fetch = jest.fn();
    const r = await engine.handleTurn({ state: engine.emptyState("en"), message: "2 bhk for rent in sector 57 under 30k near metro" });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(r.state.req).toMatchObject({ mode: "rent", sectors: ["57"], budgetMax: 30000, bhk: [2] });
    expect(r.state.aiUsed).toBeFalsy();
  });

  test("an unparseable message goes to Groq, and only validated fields are applied", async () => {
    const { engine } = load({ GROQ_API_KEY_1: "test-key-1" });
    global.fetch = jest.fn().mockResolvedValue(
      chat(JSON.stringify({ intent: "provide_info", confidence: 0.9, fields: { mode: "rent", sectors: [57, 999], propertyType: "castle" } }))
    );
    const r = await engine.handleTurn({ state: engine.emptyState("en"), message: UNPARSEABLE });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer test-key-1");
    expect(r.state.aiUsed).toBe(true);
    expect(r.state.req.mode).toBe("rent");
    expect(r.state.req.sectors).toEqual(["57"]); // 999 rejected
    expect(r.state.req.propertyType).toBeUndefined(); // "castle" rejected
  });

  test("a general answer that claims listings or prices is discarded", async () => {
    const { engine } = load({ GROQ_API_KEY_1: "test-key-1" });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(chat(JSON.stringify({ intent: "general_question", confidence: 0.9, fields: {} })))
      .mockResolvedValueOnce(chat("Yes! A 3 BHK in Sector 57 is available for ₹25,000, call +919876543210."));
    const r = await engine.handleTurn({ state: engine.emptyState("en"), message: UNPARSEABLE });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const said = r.messages.map((m) => m.text).join(" ");
    expect(said).not.toMatch(/₹25,000|9876543210|is available/);
    expect(r.messages.length).toBeGreaterThan(0);
  });

  test("an explicit disableLLM turn never calls Groq", async () => {
    const { engine } = load({ GROQ_API_KEY_1: "test-key-1" });
    global.fetch = jest.fn();
    await engine.handleTurn({ state: engine.emptyState("en"), message: UNPARSEABLE, disableLLM: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("Groq failures degrade gracefully", () => {
  test("missing keys: Groq is unavailable, nothing is sent, the consultant still replies", async () => {
    const { engine, groq } = load({});
    global.fetch = jest.fn();
    expect(groq.isAvailable()).toBe(false);
    const r = await engine.handleTurn({ state: engine.emptyState("en"), message: UNPARSEABLE });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(r.messages.length).toBeGreaterThan(0);
  });

  test("AI_CONSULTANT_LLM=off disables Groq even with keys", async () => {
    const { groq } = load({ GROQ_API_KEY_1: "test-key-1", AI_CONSULTANT_LLM: "off" });
    expect(groq.isAvailable()).toBe(false);
  });

  test("429 quota: one call, organisation cooldown, later turns skip Groq", async () => {
    const { engine, groq } = load({ GROQ_API_KEY_1: "k1", GROQ_API_KEY_2: "k2" });
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(429, { error: { message: "rate limit" } }, { "retry-after": "30" }));
    const r = await engine.handleTurn({ state: engine.emptyState("en"), message: UNPARSEABLE });
    expect(global.fetch).toHaveBeenCalledTimes(1); // no key rotation on an org-wide 429
    expect(r.messages.length).toBeGreaterThan(0);
    expect(groq.usage().orgCooldownSeconds).toBeGreaterThan(0);
    expect(groq.isAvailable()).toBe(false);
    await engine.handleTurn({ state: engine.emptyState("en"), message: UNPARSEABLE });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("timeout: the request is aborted and the consultant still replies", async () => {
    const { engine, groq } = load({ GROQ_API_KEY_1: "k1", GROQ_TIMEOUT_MS: "40" });
    global.fetch = jest.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        })
    );
    const started = Date.now();
    const r = await engine.handleTurn({ state: engine.emptyState("en"), message: UNPARSEABLE });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(r.messages.length).toBeGreaterThan(0);
    expect(groq.usage().keys[0].lastError).toBe("timeout");
  });

  test("an invalid key is retired and never leaks into usage output", async () => {
    const { engine, groq } = load({ GROQ_API_KEY_1: "secret-bad-key" });
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(401, { error: { message: "invalid" } }));
    await engine.handleTurn({ state: engine.emptyState("en"), message: UNPARSEABLE });
    const usage = groq.usage();
    expect(usage.keys[0].status).toBe("invalid");
    expect(JSON.stringify(usage)).not.toContain("secret-bad-key");
  });
});
