/**
 * Groq Cloud adapter for the AI Property Consultant (server-side only).
 *
 *   - Up to five API keys: GROQ_API_KEY_1 … GROQ_API_KEY_5, or a comma-separated
 *     GROQ_API_KEYS, or a single GROQ_API_KEY.
 *   - Groq rate limits apply to the ORGANIZATION, not the key. Keys are rotated
 *     for resilience (a revoked or failing key is skipped), never to multiply
 *     quota: a 429 puts every key on the same cooldown.
 *   - A local ledger keeps usage under configurable ceilings that default to
 *     just below the free-plan limits for openai/gpt-oss-120b
 *     (30 RPM · 1,000 RPD · 8,000 TPM · 200,000 TPD). Local numbers are
 *     estimates; provider headers and 429s are authoritative.
 *   - Bounded: one request + at most one retry on a different key, with a
 *     timeout. Nothing here can enable paid usage.
 *   - AI_CONSULTANT_LLM=off disables the model entirely.
 *
 * Keys never leave this module: not in logs, errors or responses.
 */

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
const LIMITS = {
  rpm: num(process.env.GROQ_RPM_LIMIT, 25),
  rpd: num(process.env.GROQ_RPD_LIMIT, 900),
  tpm: num(process.env.GROQ_TPM_LIMIT, 7000),
  tpd: num(process.env.GROQ_TPD_LIMIT, 180000),
};
const TIMEOUT_MS = num(process.env.GROQ_TIMEOUT_MS, 5000);
const KEY_COOLDOWN_MS = 30 * 1000;

function loadKeys() {
  const list = [];
  for (let i = 1; i <= 5; i += 1) if (process.env[`GROQ_API_KEY_${i}`]) list.push(process.env[`GROQ_API_KEY_${i}`]);
  if (process.env.GROQ_API_KEYS) list.push(...process.env.GROQ_API_KEYS.split(","));
  if (process.env.GROQ_API_KEY) list.push(process.env.GROQ_API_KEY);
  return [...new Set(list.map((k) => k.trim()).filter(Boolean))].slice(0, 5).map((key, i) => ({
    id: `key${i + 1}`,
    key,
    status: "active",
    cooldownUntil: 0,
    failures: 0,
    requests: 0,
    lastError: null,
  }));
}

const state = {
  keys: loadKeys(),
  cursor: 0,
  orgCooldownUntil: 0,
  minute: [], // [{at, tokens}]
  day: { date: "", requests: 0, tokens: 0 },
  provider: { remainingRequests: null, remainingTokens: null, updatedAt: null },
  optionalParams: { service_tier: process.env.GROQ_SERVICE_TIER || "on_demand", reasoning_effort: "low" },
  stats: { calls: 0, ok: 0, fallbacks: {}, latencyMsTotal: 0, invalidOutput: 0 },
};

const enabled = () => String(process.env.AI_CONSULTANT_LLM || "on").toLowerCase() !== "off" && state.keys.length > 0;
const today = () => new Date().toISOString().slice(0, 10);

function rollWindows(now) {
  state.minute = state.minute.filter((e) => now - e.at < 60000);
  if (state.day.date !== today()) state.day = { date: today(), requests: 0, tokens: 0 };
}

function quotaAllows(estimatedTokens, now) {
  rollWindows(now);
  const minuteTokens = state.minute.reduce((s, e) => s + e.tokens, 0);
  if (state.minute.length + 1 > LIMITS.rpm) return "local_rpm";
  if (minuteTokens + estimatedTokens > LIMITS.tpm) return "local_tpm";
  if (state.day.requests + 1 > LIMITS.rpd) return "local_rpd";
  if (state.day.tokens + estimatedTokens > LIMITS.tpd) return "local_tpd";
  if (state.provider.remainingRequests === 0 || (state.provider.remainingTokens !== null && state.provider.remainingTokens < estimatedTokens)) {
    if (now - (state.provider.updatedAt || 0) < 60000) return "provider_quota";
  }
  return null;
}

function eligibleKeys(now) {
  return state.keys.filter((k) => k.status !== "invalid" && k.cooldownUntil <= now);
}

function nextKey(now, exclude) {
  const list = eligibleKeys(now).filter((k) => !exclude.has(k.id));
  if (!list.length) return null;
  const k = list[state.cursor % list.length];
  state.cursor += 1;
  return k;
}

function recordFallback(reason) {
  state.stats.fallbacks[reason] = (state.stats.fallbacks[reason] || 0) + 1;
}

function isAvailable() {
  const now = Date.now();
  return enabled() && state.orgCooldownUntil <= now && eligibleKeys(now).length > 0 && !quotaAllows(200, now);
}

async function callOnce(k, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${k.key}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    return { res, data };
  } finally {
    clearTimeout(timer);
  }
}

function readHeaders(res) {
  const h = (n) => res.headers.get(n);
  const rr = h("x-ratelimit-remaining-requests");
  const rt = h("x-ratelimit-remaining-tokens");
  if (rr !== null || rt !== null) {
    state.provider = {
      remainingRequests: rr !== null ? Number(rr) : state.provider.remainingRequests,
      remainingTokens: rt !== null ? Number(rt) : state.provider.remainingTokens,
      updatedAt: Date.now(),
    };
  }
}

/**
 * @returns {Promise<{ok:true,text:string,usage:object}|{ok:false,reason:string}>}
 */
async function complete({ messages, maxTokens = 400, json = false, temperature = 0.1 }) {
  if (!enabled()) return { ok: false, reason: "disabled" };
  const now = Date.now();
  if (state.orgCooldownUntil > now) {
    recordFallback("rate_limited");
    return { ok: false, reason: "rate_limited" };
  }
  const promptChars = messages.reduce((s, m) => s + String(m.content || "").length, 0);
  const estimated = Math.ceil(promptChars / 3.5) + maxTokens;
  const blocked = quotaAllows(estimated, now);
  if (blocked) {
    recordFallback(blocked);
    return { ok: false, reason: blocked };
  }

  const tried = new Set();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const k = nextKey(Date.now(), tried);
    if (!k) break;
    tried.add(k.id);

    const body = { model: MODEL, messages, temperature, max_completion_tokens: maxTokens, stream: false };
    if (json) body.response_format = { type: "json_object" };
    Object.entries(state.optionalParams).forEach(([p, v]) => {
      if (v) body[p] = v;
    });

    const started = Date.now();
    state.stats.calls += 1;
    state.minute.push({ at: started, tokens: estimated });
    state.day.requests += 1;
    state.day.tokens += estimated;
    k.requests += 1;

    let res;
    let data;
    try {
      ({ res, data } = await callOnce(k, body));
    } catch (err) {
      k.cooldownUntil = Date.now() + KEY_COOLDOWN_MS;
      k.lastError = err.name === "AbortError" ? "timeout" : "network";
      continue;
    }
    readHeaders(res);

    if (res.ok) {
      const text = data?.choices?.[0]?.message?.content || "";
      const usage = data?.usage || {};
      // Replace the estimate with provider-reported usage where available.
      if (Number(usage.total_tokens) > 0) {
        state.day.tokens += Number(usage.total_tokens) - estimated;
        const last = state.minute[state.minute.length - 1];
        if (last) last.tokens = Number(usage.total_tokens);
      }
      k.failures = 0;
      k.lastError = null;
      state.stats.ok += 1;
      state.stats.latencyMsTotal += Date.now() - started;
      if (!text) return { ok: false, reason: "empty" };
      return { ok: true, text, usage };
    }

    const status = res.status;
    const message = String(data?.error?.message || "").slice(0, 200);
    if (status === 429) {
      // Organization-level limit: every key shares it. Do not rotate.
      const retryAfter = Number(res.headers.get("retry-after"));
      state.orgCooldownUntil = Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 60000);
      recordFallback("rate_limited");
      return { ok: false, reason: "rate_limited" };
    }
    if (status === 401 || status === 403) {
      k.status = "invalid";
      k.lastError = `auth_${status}`;
      continue;
    }
    if (status === 400 && /service_tier|reasoning_effort/i.test(message)) {
      // Optional parameter not supported for this account/model: drop it and retry on the same budget.
      if (/service_tier/i.test(message)) state.optionalParams.service_tier = null;
      if (/reasoning_effort/i.test(message)) state.optionalParams.reasoning_effort = null;
      tried.delete(k.id);
      continue;
    }
    if (status === 413 || status === 400 || status === 404) {
      recordFallback(`bad_request_${status}`);
      return { ok: false, reason: `bad_request_${status}` };
    }
    // 5xx / 498 / anything else transient: cool this key, try another once.
    k.failures += 1;
    k.cooldownUntil = Date.now() + KEY_COOLDOWN_MS * Math.min(4, k.failures);
    k.lastError = `http_${status}`;
  }
  recordFallback("unavailable");
  return { ok: false, reason: "unavailable" };
}

function noteInvalidOutput() {
  state.stats.invalidOutput += 1;
  recordFallback("invalid_output");
}

/** Admin-facing snapshot. Never includes key material. */
function usage() {
  const now = Date.now();
  rollWindows(now);
  return {
    enabled: enabled(),
    model: MODEL,
    keysConfigured: state.keys.length,
    keys: state.keys.map((k) => ({ id: k.id, status: k.status === "invalid" ? "invalid" : k.cooldownUntil > now ? "cooldown" : "active", requests: k.requests, lastError: k.lastError })),
    orgCooldownSeconds: Math.max(0, Math.ceil((state.orgCooldownUntil - now) / 1000)),
    limits: LIMITS,
    localEstimate: {
      lastMinuteRequests: state.minute.length,
      lastMinuteTokens: state.minute.reduce((s, e) => s + e.tokens, 0),
      todayRequests: state.day.requests,
      todayTokens: state.day.tokens,
      note: "Local estimates per server instance; Groq's own limits are authoritative.",
    },
    providerReported: state.provider,
    stats: {
      ...state.stats,
      avgLatencyMs: state.stats.ok ? Math.round(state.stats.latencyMsTotal / state.stats.ok) : null,
    },
    paidUsage: "never enabled by this application",
  };
}

module.exports = { complete, isAvailable, usage, noteInvalidOutput, enabled };
