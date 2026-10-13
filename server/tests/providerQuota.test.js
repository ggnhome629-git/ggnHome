jest.mock("../models/ProviderUsageCounter.model", () => ({
  findOneAndUpdate: jest.fn(),
}));

const mongoose = require("mongoose");
const ProviderUsageCounter = require("../models/ProviderUsageCounter.model");
const { reserveWindow } = require("../services/providerQuota");

describe("provider quota reservations", () => {
  let previousReadyState;

  beforeEach(() => {
    jest.clearAllMocks();
    previousReadyState = mongoose.connection.readyState;
    mongoose.connection.readyState = 1;
  });

  afterEach(() => {
    mongoose.connection.readyState = previousReadyState;
  });

  test("reserves shared quota atomically and returns remaining capacity", async () => {
    ProviderUsageCounter.findOneAndUpdate
      .mockResolvedValueOnce({ key: "provider-quota:test:1", count: 0 })
      .mockReturnValueOnce({ lean: () => Promise.resolve({ count: 3 }) });

    const result = await reserveWindow({
      provider: "test",
      windowMs: 60_000,
      limit: 10,
      amount: 3,
    });

    expect(result.allowed).toBe(true);
    expect(result.used).toBe(3);
    expect(result.remaining).toBe(7);
    expect(ProviderUsageCounter.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  test("denies reservations at the configured ceiling", async () => {
    ProviderUsageCounter.findOneAndUpdate
      .mockResolvedValueOnce({ key: "provider-quota:test:1", count: 10 })
      .mockReturnValueOnce({ lean: () => Promise.resolve(null) });

    const result = await reserveWindow({ provider: "test", windowMs: 60_000, limit: 10 });

    expect(result).toMatchObject({ allowed: false, reason: "quota_exceeded", limit: 10 });
  });

  test("fails closed when MongoDB is unavailable", async () => {
    mongoose.connection.readyState = 0;

    const result = await reserveWindow({ provider: "test", windowMs: 60_000, limit: 10 });

    expect(result).toEqual({ allowed: false, reason: "quota_store_unavailable" });
    expect(ProviderUsageCounter.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("rejects invalid or oversized reservations", async () => {
    const result = await reserveWindow({ provider: "test", windowMs: 60_000, limit: 10, amount: 11 });

    expect(result).toEqual({ allowed: false, reason: "invalid_quota_config" });
  });
});
