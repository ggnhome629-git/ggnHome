/**
 * Riya's on-device voice inside the GgnHome Android app: the phone's own
 * text-to-speech and speech-recognition engines (Capacitor plugins bundled in the
 * app). Runs locally on each phone, plays as normal media (speaker or earphones)
 * and never opens a WebRTC call, so the phone stays out of call mode.
 *
 * On the website, or in an older app build without the plugins, every check
 * here reports "unavailable" and the caller uses another voice.
 */

const cap = () => (typeof window !== "undefined" ? window.Capacitor : null);
const plugin = (name) => {
  const c = cap();
  if (!c || !c.isNativePlatform?.() || !c.isPluginAvailable?.(name)) return null;
  return c.Plugins?.[name] || null;
};

export async function nativeCapabilities() {
  const tts = Boolean(plugin("TextToSpeech"));
  let stt = false;
  const rec = plugin("SpeechRecognition");
  if (rec) {
    try {
      stt = Boolean((await rec.available())?.available);
    } catch (_) {
      stt = false;
    }
  }
  return { tts, stt };
}

/** Ask for the microphone for on-device recognition. Resolves true when allowed. */
export async function nativeRequestMic() {
  const rec = plugin("SpeechRecognition");
  if (!rec) return false;
  try {
    const current = await rec.checkPermissions();
    if (current?.speechRecognition === "granted") return true;
    const asked = await rec.requestPermissions();
    return asked?.speechRecognition === "granted";
  } catch (_) {
    return false;
  }
}

/** Speak and resolve when finished. Rejects if the phone has no usable voice. */
export function nativeSay(text, lang) {
  const tts = plugin("TextToSpeech");
  if (!tts) return Promise.reject(new Error("unavailable"));
  return tts.speak({ text, lang, rate: 1.0, pitch: 1.05, volume: 1.0, category: "playback", queueStrategy: 0 });
}

export function nativeStopSaying() {
  plugin("TextToSpeech")?.stop().catch(() => {});
}

/** Listen for one sentence; resolves with what was said ("" for silence). */
export async function nativeListenOnce(lang) {
  const rec = plugin("SpeechRecognition");
  if (!rec) return "";
  try {
    const result = await rec.start({ language: lang, maxResults: 1, partialResults: false, popup: false });
    return String(result?.matches?.[0] || "").trim();
  } catch (_) {
    // "No match" / timeout: nothing was said
    return "";
  }
}

export function nativeStopListening() {
  plugin("SpeechRecognition")?.stop().catch(() => {});
}
