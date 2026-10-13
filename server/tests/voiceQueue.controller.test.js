jest.mock("../services/voiceQueue.service", () => ({
  available: jest.fn(),
  join: jest.fn(),
  status: jest.fn(),
  heartbeat: jest.fn(),
  leave: jest.fn(),
}));

const queue = require("../services/voiceQueue.service");
const controller = require("../controllers/voiceQueue.controller");

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

describe("Redis voice queue controller", () => {
  const originalEnv = { LIVEKIT_URL: process.env.LIVEKIT_URL, LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY, LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LIVEKIT_URL = "wss://voice.example.com";
    process.env.LIVEKIT_API_KEY = "test-key";
    process.env.LIVEKIT_API_SECRET = "test-secret";
  });

  afterAll(() => {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  });

  test("fails closed when Redis is unavailable", async () => {
    queue.available.mockReturnValue(false);
    const res = response();
    await controller.join({}, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe("VOICE_QUEUE_UNAVAILABLE");
    expect(queue.join).not.toHaveBeenCalled();
  });

  test("issues an opaque ticket and returns FIFO position", async () => {
    queue.available.mockReturnValue(true);
    queue.join.mockImplementation(async (ticket) => ({
      available: true, state: "waiting", position: 2, waiting: 3, active: 3, maxActive: 3, ticketSeen: ticket.length,
    }));
    const res = response();
    await controller.join({}, res);
    expect(res.statusCode).toBe(201);
    expect(res.body.ticket).toMatch(/^[a-f0-9]{48}$/);
    expect(res.body).toMatchObject({ state: "waiting", position: 2, waiting: 3 });
  });

  test("rejects malformed tickets before touching Redis", async () => {
    const res = response();
    await controller.status({ query: { ticket: "not-a-ticket" } }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("INVALID_QUEUE_TICKET");
    expect(queue.status).not.toHaveBeenCalled();
  });

  test("reports expired session leases so the client can rejoin", async () => {
    queue.heartbeat.mockResolvedValue(false);
    const res = response();
    await controller.heartbeat({ body: { ticket: "a".repeat(48) } }, res);
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("VOICE_QUEUE_LEASE_EXPIRED");
  });

  test("leaves queue safely and idempotently", async () => {
    queue.leave.mockResolvedValue(true);
    const res = response();
    await controller.leave({ body: { ticket: "b".repeat(48) } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(queue.leave).toHaveBeenCalledWith("b".repeat(48));
  });
});
