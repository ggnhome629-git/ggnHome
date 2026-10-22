/**
 * Server-side speech for the AI Property Consultant: Riya's voice (text to
 * speech) and listening (speech to text) through Groq's hosted audio models.
 *
 * The Android app's WebView has no browser speech engine at all, so without
 * this the assistant could neither speak nor listen there. Audio comes back as
 * an ordinary file the page plays like any media, so it follows the phone's
 * normal output (speaker, wired or Bluetooth earphones) and never puts the
 * phone into call mode.
 *
 * Public:  config, tts, stt. The key never leaves this module.
 */

const TTS_ENDPOINT = "https://api.groq.com/openai/v1/audio/speech";
const STT_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";
const TTS_MODEL = process.env.GROQ_TTS_MODEL || "canopylabs/orpheus-v1-english";
const TTS_VOICE = process.env.GROQ_TTS_VOICE || "autumn";
const STT_MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";
// Orpheus reads at most 200 characters per request; the page sends sentence-sized pieces.
const MAX_TTS_CHARS = 200;
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 12000;
const CACHE_SIZE = 120;
const STT_PROMPT = "Indian real estate in Gurgaon (Gurugram). Terms: 2 BHK, 3 BHK, flat, sector, DLF, Golf Course Road, crore, lakh, rent, buy.";
// Phrases Whisper invents from silence or room noise; never a real answer on their own.
const HALLUCINATIONS = new Set([
  "thank you", "thank you very much", "thank you so much", "thanks", "thanks a lot", "thank you for watching",
  "thanks for watching", "thank you for listening", "please subscribe", "like and subscribe", "subscribe", "bye",
  "bye bye", "goodbye", "you", "the end", "so", "okay thank you", "ok thank you", "see you next time",
  "धन्यवाद", "शुक्रिया", "सब्सक्राइब", "थैंक यू", "बाय",
]);

const speechKey = () => String(process.env.GROQ_SPEECH_API_KEY || process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY || "").trim();
const enabled = () => String(process.env.AI_CONSULTANT_SPEECH || "on").toLowerCase() !== "off" && Boolean(speechKey());
const normalise = (text) => String(text || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const isHallucination = (text) => HALLUCINATIONS.has(normalise(text)) || /^(thank you ?)+$/.test(normalise(text));

// The same lines (greeting, common questions) are spoken again and again: keep their audio.
const cache = new Map();
function remember(key, value) {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
}

/** Overridable in tests. */
exports._fetch = (...args) => fetch(...args);

async function timed(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await exports._fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

exports.config = (_req, res) => {
  res.set("Cache-Control", "no-store");
  const on = enabled();
  return res.json({ success: true, tts: on, stt: on, voice: on ? "Riya" : null, maxChars: MAX_TTS_CHARS });
};

exports.tts = async (req, res) => {
  if (!enabled()) return res.status(503).json({ success: false, code: "SPEECH_NOT_CONFIGURED", message: "Server voice isn't set up." });
  const text = String(req.body?.text || "").replace(/\s+/g, " ").trim().slice(0, MAX_TTS_CHARS);
  if (!text) return res.status(400).json({ success: false, code: "EMPTY_TEXT", message: "Nothing to say." });
  // The voice model reads Latin script only; Devanagari falls back to the device voice.
  if (/[ऀ-ॿ]/.test(text)) return res.status(415).json({ success: false, code: "SCRIPT_UNSUPPORTED", message: "This voice reads English and Hinglish only." });

  const hit = cache.get(text);
  if (hit) {
    remember(text, hit);
    res.set({ "Content-Type": "audio/wav", "Cache-Control": "private, max-age=86400" });
    return res.send(hit);
  }
  try {
    const upstream = await timed(TTS_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${speechKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: TTS_MODEL, voice: TTS_VOICE, input: text, response_format: "wav" }),
    });
    if (!upstream.ok) {
      // Groq explains the refusal (e.g. the model's terms not yet accepted in the console); log it, never the key.
      const reason = await upstream.text().catch(() => "");
      console.error("[speech] tts failed:", upstream.status, reason.slice(0, 240));
      return res.status(502).json({ success: false, code: "TTS_FAILED", message: "The voice couldn't speak that." });
    }
    const audio = Buffer.from(await upstream.arrayBuffer());
    remember(text, audio);
    res.set({ "Content-Type": "audio/wav", "Cache-Control": "private, max-age=86400" });
    return res.send(audio);
  } catch (error) {
    console.error("[speech] tts error:", error?.name || "error");
    return res.status(502).json({ success: false, code: "TTS_FAILED", message: "The voice couldn't speak that." });
  }
};

exports.stt = async (req, res) => {
  if (!enabled()) return res.status(503).json({ success: false, code: "SPEECH_NOT_CONFIGURED", message: "Server listening isn't set up." });
  const audio = req.body;
  if (!Buffer.isBuffer(audio) || audio.length < 800) return res.json({ success: true, text: "" });
  if (audio.length > MAX_AUDIO_BYTES) return res.status(413).json({ success: false, code: "AUDIO_TOO_LONG", message: "Please say it in a shorter sentence." });
  const type = String(req.headers["content-type"] || "audio/webm").split(";")[0];
  const ext = type.includes("mp4") || type.includes("m4a") || type.includes("aac") ? "m4a" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
  const lang = req.query?.lang === "hi" ? "hi" : req.query?.lang === "hinglish" ? null : "en";

  const form = new FormData();
  form.append("file", new Blob([audio], { type }), `speech.${ext}`);
  form.append("model", STT_MODEL);
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  form.append("prompt", STT_PROMPT);
  if (lang) form.append("language", lang);
  try {
    const upstream = await timed(STT_ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${speechKey()}` }, body: form });
    if (!upstream.ok) {
      const reason = await upstream.text().catch(() => "");
      console.error("[speech] stt failed:", upstream.status, reason.slice(0, 240));
      return res.status(502).json({ success: false, code: "STT_FAILED", message: "I couldn't catch that." });
    }
    const data = await upstream.json();
    // Keep only segments the model is confident contain speech.
    const segments = Array.isArray(data.segments) ? data.segments : null;
    const text = (segments ? segments.filter((s) => !(s.no_speech_prob > 0.6) && !(s.avg_logprob < -1.2)).map((s) => s.text).join(" ") : String(data.text || ""))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 600);
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, text: !text || isHallucination(text) ? "" : text });
  } catch (error) {
    console.error("[speech] stt error:", error?.name || "error");
    return res.status(502).json({ success: false, code: "STT_FAILED", message: "I couldn't catch that." });
  }
};

exports._isHallucination = isHallucination;
