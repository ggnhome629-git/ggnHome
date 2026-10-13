/**
 * Small, bounded Redis-backed admission queue for real-time voice sessions.
 * Stores random opaque tickets only (no names, phones, chat or property data).
 * ZSET scores provide FIFO order and expiring session leases without per-user keys.
 */
const redisCache = require("../utils/redisCache");

const intEnv = (name, fallback, min, max) => {
  const n = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
const settings = () => ({
  enabled: process.env.VOICE_QUEUE_ENABLED !== "false" && Boolean(process.env.REDIS_URL),
  maxActive: intEnv("VOICE_QUEUE_MAX_ACTIVE", 3, 1, 10),
  maxWaiting: intEnv("VOICE_QUEUE_MAX_WAITING", 50, 1, 100),
  leaseSeconds: intEnv("VOICE_QUEUE_LEASE_SECONDS", 90, 60, 300),
  waitTtlSeconds: intEnv("VOICE_QUEUE_WAIT_TTL_SECONDS", 900, 120, 3600),
  prefix: String(process.env.VOICE_QUEUE_KEY_PREFIX || "ggnhome:voice:v1").replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 80),
});
const keys = () => {
  const s = settings();
  return { ...s, queueKey: `${s.prefix}:waiting`, activeKey: `${s.prefix}:active` };
};
const client = () => {
  if (!settings().enabled || !redisCache.isConnected()) return null;
  return redisCache.getClient();
};

const JOIN_SCRIPT = `
  local now = tonumber(ARGV[1])
  local ticket = ARGV[2]
  local maxWaiting = tonumber(ARGV[3])
  redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)
  if redis.call('ZSCORE', KEYS[1], ticket) or redis.call('ZSCORE', KEYS[2], ticket) then
    return {1, redis.call('ZCARD', KEYS[1]), redis.call('ZCARD', KEYS[2])}
  end
  if redis.call('ZCARD', KEYS[1]) >= maxWaiting then return {0, redis.call('ZCARD', KEYS[1]), redis.call('ZCARD', KEYS[2])} end
  redis.call('ZADD', KEYS[1], now, ticket)
  redis.call('EXPIRE', KEYS[1], 86400)
  redis.call('EXPIRE', KEYS[2], 86400)
  return {1, redis.call('ZCARD', KEYS[1]), redis.call('ZCARD', KEYS[2])}
`;
const STATUS_SCRIPT = `
  local now = tonumber(ARGV[1])
  local ticket = ARGV[2]
  local maxActive = tonumber(ARGV[3])
  local leaseUntil = now + tonumber(ARGV[4])
  local waitingCutoff = now - tonumber(ARGV[5]) * 1000
  redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', waitingCutoff)
  redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)
  while redis.call('ZCARD', KEYS[2]) < maxActive and redis.call('ZCARD', KEYS[1]) > 0 do
    local first = redis.call('ZRANGE', KEYS[1], 0, 0)
    if #first == 0 then break end
    redis.call('ZREM', KEYS[1], first[1])
    redis.call('ZADD', KEYS[2], leaseUntil, first[1])
  end
  redis.call('EXPIRE', KEYS[1], 86400)
  redis.call('EXPIRE', KEYS[2], 86400)
  local active = redis.call('ZSCORE', KEYS[2], ticket)
  local rank = redis.call('ZRANK', KEYS[1], ticket)
  return {active and 1 or 0, rank and (rank + 1) or 0, redis.call('ZCARD', KEYS[1]), redis.call('ZCARD', KEYS[2])}
`;
const CLAIM_SCRIPT = `
  local now = tonumber(ARGV[1])
  local ticket = ARGV[2]
  local score = redis.call("ZSCORE", KEYS[1], ticket)
  if not score or tonumber(score) <= now then return 0 end
  return redis.call("SET", KEYS[2], "1", "EX", ARGV[3], "NX") and 1 or 0
`;
const HEARTBEAT_SCRIPT = `
  local now = tonumber(ARGV[1])
  local ticket = ARGV[2]
  local expiry = now + tonumber(ARGV[3])
  local score = redis.call('ZSCORE', KEYS[1], ticket)
  if not score or tonumber(score) <= now then
    redis.call('ZREM', KEYS[1], ticket)
    return 0
  end
  redis.call('ZADD', KEYS[1], expiry, ticket)
  redis.call('EXPIRE', KEYS[1], 86400)
  redis.call('EXPIRE', KEYS[2], math.ceil(tonumber(ARGV[3]) / 1000))
  return 1
`;
const LEAVE_SCRIPT = `
  local a = redis.call('ZREM', KEYS[1], ARGV[1])
  local b = redis.call('ZREM', KEYS[2], ARGV[1])
  redis.call('DEL', KEYS[3])
  return a + b
`;

function available() {
  return Boolean(client());
}
async function join(ticket) {
  const c = client();
  if (!c) return { available: false };
  const s = keys();
  const result = await c.eval(JOIN_SCRIPT, 2, s.queueKey, s.activeKey, Date.now(), ticket, s.maxWaiting);
  if (Number(result[0]) !== 1) return { available: true, full: true, waiting: Number(result[1]) };
  return status(ticket);
}
async function status(ticket) {
  const c = client();
  if (!c) return { available: false };
  const s = keys();
  const result = await c.eval(STATUS_SCRIPT, 2, s.queueKey, s.activeKey, Date.now(), ticket, s.maxActive, s.leaseSeconds * 1000, s.waitTtlSeconds);
  const active = Number(result[0]) === 1;
  const rank = Number(result[1]);
  return {
    available: true,
    state: active ? "ready" : rank > 0 ? "waiting" : "expired",
    position: rank,
    waiting: Number(result[2]),
    active: Number(result[3]),
    maxActive: s.maxActive,
    leaseSeconds: s.leaseSeconds,
  };
}
async function isActive(ticket) {
  const c = client();
  if (!c) return false;
  const s = keys();
  const score = await c.zscore(s.activeKey, ticket);
  return score !== null && Number(score) > Date.now();
}
async function claimToken(ticket) {
  const c = client();
  if (!c) return false;
  const s = keys();
  const claimKey = s.prefix + ":issued:" + ticket;
  return Number(await c.eval(CLAIM_SCRIPT, 2, s.activeKey, claimKey, Date.now(), ticket, s.leaseSeconds)) === 1;
}
async function heartbeat(ticket) {
  const c = client();
  if (!c) return false;
  const s = keys();
  const claimKey = s.prefix + ":issued:" + ticket;
  return Number(await c.eval(HEARTBEAT_SCRIPT, 2, s.activeKey, claimKey, Date.now(), ticket, s.leaseSeconds * 1000)) === 1;
}
async function leave(ticket) {
  const c = client();
  if (!c) return false;
  const s = keys();
  const claimKey = s.prefix + ":issued:" + ticket;
  await c.eval(LEAVE_SCRIPT, 3, s.activeKey, s.queueKey, claimKey, ticket);
  return true;
}
module.exports = { available, join, status, isActive, claimToken, heartbeat, leave, settings };
