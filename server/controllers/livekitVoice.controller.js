const crypto = require("crypto");

const TOKEN_TTL_SECONDS = 10 * 60;

function livekitSettings() {
  const url = String(process.env.LIVEKIT_URL || "").trim();
  const apiKey = String(process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = String(process.env.LIVEKIT_API_SECRET || "").trim();
  return { url, apiKey, apiSecret, enabled: Boolean(url && apiKey && apiSecret) };
}

exports.getConfig = (_req, res) => {
  const { url, enabled } = livekitSettings();
  res.set("Cache-Control", "no-store");
  res.json({
    success: true,
    enabled,
    url: enabled ? url : null,
    provider: "self-hosted",
    message: enabled ? "Self-hosted LiveKit is configured." : "Self-hosted LiveKit has not been configured on this server yet.",
  });
};

exports.createToken = async (req, res) => {
  if (req.body?.accepted !== true) {
    return res.status(400).json({ success: false, code: "VOICE_CONSENT_REQUIRED", message: "Confirm that you want to start a microphone session first." });
  }

  const { url, apiKey, apiSecret, enabled } = livekitSettings();
  if (!enabled) {
    return res.status(503).json({
      success: false,
      code: "LIVEKIT_NOT_CONFIGURED",
      message: "Self-hosted voice is not configured yet. You can continue with text or browser voice.",
    });
  }

  try {
    // Keep the API secret on the server. Visitors receive a short-lived token
    // scoped to one randomly generated room, with no administrative grants.
    const { AccessToken, LiveKitAPI } = require("livekit-server-sdk");
    const identity = `visitor_${crypto.randomBytes(10).toString("hex")}`;
    const roomName = `ggnhome-ai-${crypto.randomBytes(10).toString("hex")}`;
    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: `${TOKEN_TTL_SECONDS}s`,
      metadata: JSON.stringify({ app: "ggnhome", role: "visitor" }),
    });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const jwt = await token.toJwt();

    // Explicit dispatch is required because this worker uses a named agent.
    // The room name is random per session, preventing room reuse across visitors.
    const livekitApi = new LiveKitAPI(url, apiKey, apiSecret);
    try {
      await livekitApi.agentDispatch.createDispatch(roomName, "ggnhome-property-voice", {
        metadata: JSON.stringify({ app: "ggnhome", role: "visitor" }),
      });
    } finally {
      await livekitApi.close?.();
    }

    res.set("Cache-Control", "no-store");
    return res.json({
      success: true,
      url,
      token: jwt,
      identity,
      roomName,
      expiresIn: TOKEN_TTL_SECONDS,
    });
  } catch (error) {
    console.error("LiveKit token creation failed:", error?.message || "unknown error");
    return res.status(503).json({
      success: false,
      code: "LIVEKIT_TOKEN_UNAVAILABLE",
      message: "The voice session could not be started. Please use text chat or browser voice instead.",
    });
  }
};
