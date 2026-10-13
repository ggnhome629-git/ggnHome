const livekitVoice = require("../controllers/livekitVoice.controller");

function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(value) { this.body = value; return this; },
  };
  return res;
}

describe("self-hosted LiveKit voice controller", () => {
  const original = {
    LIVEKIT_URL: process.env.LIVEKIT_URL,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
  };

  beforeEach(() => {
    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
  });

  afterAll(() => {
    Object.entries(original).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  });

  test("reports disabled without server-side credentials", () => {
    const res = mockResponse();
    livekitVoice.getConfig({}, res);
    expect(res.body).toMatchObject({ success: true, enabled: false, provider: "self-hosted" });
    expect(res.body.url).toBeNull();
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });

  test("requires explicit microphone-session consent before creating a token", async () => {
    const res = mockResponse();
    await livekitVoice.createToken({ body: { accepted: false } }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("VOICE_CONSENT_REQUIRED");
  });

  test("does not create a token when the server is not configured", async () => {
    const res = mockResponse();
    await livekitVoice.createToken({ body: { accepted: true } }, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe("LIVEKIT_NOT_CONFIGURED");
  });
});
