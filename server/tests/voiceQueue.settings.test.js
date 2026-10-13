const { settings } = require("../services/voiceQueue.service");

describe("free-tier voice queue bounds", () => {
  const names = [
    "REDIS_URL",
    "VOICE_QUEUE_ENABLED",
    "VOICE_QUEUE_MAX_ACTIVE",
    "VOICE_QUEUE_MAX_WAITING",
    "VOICE_QUEUE_LEASE_SECONDS",
    "VOICE_QUEUE_WAIT_TTL_SECONDS",
    "VOICE_QUEUE_KEY_PREFIX",
  ];
  let previous;

  beforeEach(() => {
    previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  });

  afterEach(() => {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });

  test("environment variables cannot raise free-tier queue caps", () => {
    process.env.REDIS_URL = "rediss://test.invalid";
    process.env.VOICE_QUEUE_MAX_ACTIVE = "10";
    process.env.VOICE_QUEUE_MAX_WAITING = "100";
    process.env.VOICE_QUEUE_LEASE_SECONDS = "60";

    expect(settings()).toMatchObject({
      enabled: true,
      maxActive: 2,
      maxWaiting: 2,
      leaseSeconds: 180,
    });
  });

  test("queue is disabled without Redis and uses bounded defaults", () => {
    delete process.env.REDIS_URL;
    delete process.env.VOICE_QUEUE_ENABLED;
    delete process.env.VOICE_QUEUE_MAX_ACTIVE;
    delete process.env.VOICE_QUEUE_MAX_WAITING;
    delete process.env.VOICE_QUEUE_LEASE_SECONDS;

    expect(settings()).toMatchObject({
      enabled: false,
      maxActive: 2,
      maxWaiting: 2,
      leaseSeconds: 180,
      waitTtlSeconds: 900,
    });
  });
});
