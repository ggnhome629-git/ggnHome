const speech = require("../controllers/speech.controller");

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) { if (typeof name === "object") Object.assign(this.headers, name); else this.headers[name] = value; return this; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; },
  };
}

describe("server speech for Riya", () => {
  const original = { key: process.env.GROQ_SPEECH_API_KEY, fetch: speech._fetch };
  beforeEach(() => { process.env.GROQ_SPEECH_API_KEY = "test-key"; });
  afterAll(() => {
    if (original.key === undefined) delete process.env.GROQ_SPEECH_API_KEY;
    else process.env.GROQ_SPEECH_API_KEY = original.key;
    speech._fetch = original.fetch;
  });

  test("reports what is available without exposing the key", () => {
    const res = mockResponse();
    speech.config({}, res);
    expect(res.body).toMatchObject({ success: true, tts: true, stt: true });
    expect(JSON.stringify(res.body)).not.toContain("test-key");
  });

  test("speaks a sentence and caches the audio", async () => {
    let calls = 0;
    speech._fetch = async () => { calls += 1; return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }; };
    const a = mockResponse();
    await speech.tts({ body: { text: "Which sector do you prefer for the cache test?" } }, a);
    const b = mockResponse();
    await speech.tts({ body: { text: "Which sector do you prefer for the cache test?" } }, b);
    expect(a.headers["Content-Type"]).toBe("audio/wav");
    expect(Buffer.isBuffer(b.body)).toBe(true);
    expect(calls).toBe(1);
  });

  test("hands Devanagari back to the device voice", async () => {
    const res = mockResponse();
    await speech.tts({ body: { text: "नमस्ते" } }, res);
    expect(res.statusCode).toBe(415);
  });

  test("drops silence hallucinations and low-confidence segments", async () => {
    speech._fetch = async () => ({ ok: true, json: async () => ({ segments: [{ text: " Thank you.", no_speech_prob: 0.2, avg_logprob: -0.3 }] }) });
    const res = mockResponse();
    await speech.stt({ body: Buffer.alloc(4000), headers: { "content-type": "audio/webm" }, query: {} }, res);
    expect(res.body).toEqual({ success: true, text: "" });

    speech._fetch = async () => ({ ok: true, json: async () => ({ segments: [{ text: " 2 BHK in Sector 57", no_speech_prob: 0.05, avg_logprob: -0.2 }, { text: " hmm", no_speech_prob: 0.9, avg_logprob: -0.2 }] }) });
    const ok = mockResponse();
    await speech.stt({ body: Buffer.alloc(4000), headers: { "content-type": "audio/webm" }, query: {} }, ok);
    expect(ok.body).toEqual({ success: true, text: "2 BHK in Sector 57" });
  });
});
