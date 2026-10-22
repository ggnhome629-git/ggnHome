import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { startServerListener } from "./serverListener";
import { nativeCapabilities, nativeListenOnce, nativeRequestMic, nativeSay, nativeStopListening, nativeStopSaying } from "./nativeSpeech";

/**
 * One voice controller for the AI Consultant.
 *
 * Engines
 *   livekit  real-time voice through the GgnHome LiveKit server and voice worker
 *            (preferred whenever the server reports it is configured).
 *   browser  the browser's own speech recognition + synthesis. Used automatically
 *            when LiveKit is not configured or cannot be reached.
 *
 * The controller never decides what to say. It turns speech into transcripts
 * (onTranscript) and speaks whatever text the consultant hands to speak().
 *
 * Phases
 *   off · requesting · connecting · greeting · listening · hearing · thinking ·
 *   speaking · reconnecting · error
 */

const API_BASE = process.env.REACT_APP_Base_API || "";
const VOICE_TOPIC = "ggnhome-voice";
const HELLO_INTERVAL_MS = 1000;
const AGENT_READY_TIMEOUT_MS = 12000;
const THINKING_TIMEOUT_MS = 30000;
const DUPLICATE_WINDOW_MS = 3500;
// Browser voice has no server to hang up, so it applies the same quiet-time rule:
// warn, then pause so the mic doesn't stay open for someone who has walked away.
const IDLE_WARN_MS = 120000;
const IDLE_END_MS = 150000;
const IDLE_MESSAGE = "Voice paused after a quiet while — tap the mic to talk again.";
const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
// Ask the microphone for echo cancellation, noise suppression and level control, mono, so room noise
// and the assistant's own voice from the speaker are not picked up as speech.
const MIC_CONSTRAINTS = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } };
// Phones switch into "call mode" while an echo-cancelled mic is open: other media is ducked and the
// assistant plays quietly through the earpiece. Voice here is half-duplex (the mic is released while
// the assistant talks), so phones can skip the platform echo canceller and keep normal media volume.
// The GgnHome Android app (a WebView) has no browser speech engine, and WebRTC there runs in call mode.
const IS_APP = typeof navigator !== "undefined" && /GgnHomeApp/i.test(navigator.userAgent || "");
const recorderSupported = typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && Boolean(window.AudioContext || window.webkitAudioContext);
const IS_PHONE = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
const LIVEKIT_CAPTURE = { echoCancellation: !IS_PHONE, noiseSuppression: true, autoGainControl: true, voiceIsolation: !IS_PHONE, channelCount: 1 };
const synthesisSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export const VOICE_ERRORS = {
  denied: "Microphone access is blocked. Allow it from the lock icon in your address bar, then try again.",
  noDevice: "No microphone was found. Plug one in or check your device settings, then try again.",
  busy: "Your microphone is being used by another app. Close it there and try again.",
  insecure: "Voice needs a secure (https) page. You can still type below.",
  unsupported: "Voice isn't supported in this browser. You can keep going by typing.",
  network: "We lost the connection to the voice service. Check your internet and tap retry.",
  agent: "The voice assistant didn't pick up. Tap retry, or keep typing.",
  failed: "Voice stopped unexpectedly. Tap retry, or keep typing.",
};

function micErrorCode(error) {
  const name = error?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") return "noDevice";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "busy";
  return "failed";
}

/** True when what the mic heard is mostly the assistant's own voice coming back through the speakers. */
function isEcho(heard, spoken) {
  const h = normalise(heard).split(" ").filter(Boolean);
  if (!h.length) return true;
  const pool = new Set(normalise(spoken).split(" "));
  return h.filter((w) => pool.has(w)).length / h.length >= 0.6;
}
// Phrases speech-to-text invents from silence or room noise; never a real answer on their own.
const HALLUCINATIONS = new Set(["thank you", "thank you very much", "thank you so much", "thanks", "thanks for watching", "thank you for watching", "please subscribe", "bye", "bye bye", "you", "the end", "so", "धन्यवाद", "शुक्रिया"]);
const isHallucination = (text) => HALLUCINATIONS.has(normalise(text)) || /^(thank you ?)+$/.test(normalise(text));
const normalise = (text) => String(text || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const newId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function decode(payload) {
  try {
    const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (_) {
    return null;
  }
}

/** Text for the browser's own voice: no symbols that get read out literally. */
function browserSpeechText(text) {
  return String(text || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/₹\s?/g, "rupees ")
    .replace(/\/\s?month/gi, " per month")
    .replace(/\bBHK\b/g, "B H K")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);
}

/** Split speech into sentence-sized pieces (max ~180 chars) for the browser's voice. */
function sentenceChunks(text, max = 180) {
  const parts = String(text).match(/[^.!?।]+[.!?।]*\s*/g) || [String(text)];
  const out = [];
  parts.forEach((p) => {
    const last = out[out.length - 1];
    if (last && last.length + p.length <= max) out[out.length - 1] = last + p;
    else if (p.length <= max) out.push(p);
    else {
      // A very long sentence: split at commas or spaces.
      let rest = p;
      while (rest.length > max) {
        const cut = Math.max(rest.lastIndexOf(", ", max), rest.lastIndexOf(" ", max));
        out.push(rest.slice(0, cut > 40 ? cut + 1 : max));
        rest = rest.slice(cut > 40 ? cut + 1 : max);
      }
      if (rest.trim()) out.push(rest);
    }
  });
  return out.map((p) => p.trim()).filter(Boolean);
}

/** Best voice for the language: neural "Natural" voices first, then Google/online ones; female where named. */
function pickVoice(lang) {
  if (!synthesisSupported) return null;
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang.split("-")[0];
  const sameLang = voices.filter((v) => v.lang === lang || v.lang?.replace("_", "-") === lang);
  const pool = sameLang.length ? sameLang : voices.filter((v) => v.lang?.startsWith(prefix));
  const female = /female|woman|neerja|swara|heera|kalpana|aditi|raveena|veena|lekha|samantha|zira|aria|jenny|google/i;
  return (
    pool.find((v) => /natural|neural/i.test(v.name) && female.test(v.name)) ||
    pool.find((v) => /natural|neural/i.test(v.name)) ||
    pool.find((v) => /google|online/i.test(v.name)) ||
    pool.find((v) => female.test(v.name)) ||
    pool.find((v) => !v.localService) ||
    pool[0] ||
    null
  );
}

/** A short silent WAV, played inside the starting tap so later clips may play on their own. */
function silentWav() {
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + samples * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

function ensurePlayer(ref) {
  if (!ref.current && typeof Audio !== "undefined") {
    const el = new Audio();
    el.preload = "auto";
    el.setAttribute("playsinline", "true");
    ref.current = el;
  }
  return ref.current;
}

/** Unlock media playback for the server voice; must run inside a tap. */
function primePlayer(ref) {
  const el = ensurePlayer(ref);
  if (!el) return;
  try {
    el.src = silentWav();
    el.play().catch(() => {});
  } catch (_) {
    // the first real clip will ask for a tap if needed
  }
}

/** Mobile browsers only let speech play if it first starts inside a tap: say nothing, now. */
function primeSynthesis() {
  if (!synthesisSupported) return;
  try {
    window.speechSynthesis.getVoices();
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch (_) {
    // speech will try again on the first real reply
  }
}

/** Play text with the server voice, clip by clip; resolves when done or cancelled. */
async function playCloudClips(text, player, lang, isCancelled) {
  const parts = sentenceChunks(text, 190);
  const fetchClip = (part) =>
    fetch(`${API_BASE}/api/ai-consultant/speech/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: part, lang }),
    }).then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))));
  let next = fetchClip(parts[0]);
  for (let i = 0; i < parts.length; i += 1) {
    const blob = await next;
    if (isCancelled()) return;
    next = parts[i + 1] ? fetchClip(parts[i + 1]) : null;
    next?.catch(() => {});
    const url = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      player.onended = resolve;
      player.onerror = resolve;
      player.src = url;
      player.play().catch(reject);
    }).finally(() => URL.revokeObjectURL(url));
    if (isCancelled()) return;
  }
}

/** Speak with the browser's own voice; resolves when finished. */
function synthSayAll(text, lang) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const chunks = sentenceChunks(text);
    const voice = pickVoice(lang);
    const say = (i) => {
      if (i >= chunks.length) return resolve();
      const u = new SpeechSynthesisUtterance(chunks[i]);
      u.lang = lang;
      u.pitch = 1.04;
      if (voice) u.voice = voice;
      u.onend = () => say(i + 1);
      u.onerror = () => resolve();
      synth.speak(u);
      return undefined;
    };
    say(0);
  });
}

async function fetchJson(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

export function useVoiceAssistant({ speechLang = "en-IN", lang = "en", onTranscript, onMetric } = {}) {
  const [engine, setEngine] = useState("checking"); // checking | livekit | browser | none
  // Which voice is actually speaking, shown on screen so a test shows the source at a glance.
  const [voiceSource, setVoiceSource] = useState(null); // { kind: "livekit" | "browser", name, reason }
  const fallbackReasonRef = useRef("");
  const [phase, setPhaseState] = useState("off");
  const [error, setError] = useState(null); // { code, message }
  const [notice, setNotice] = useState("");
  const [permission, setPermission] = useState("unknown"); // unknown | granted | denied | unavailable
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState(null); // { who, text, interim }
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [activeEngine, setActiveEngine] = useState(null);

  const phaseRef = useRef("off");
  const activeRef = useRef(false);
  const holdRef = useRef(false);
  const mutedRef = useRef(false);
  const roomRef = useRef(null);
  const agentRef = useRef(null);
  const recRef = useRef(null);
  const recActiveRef = useRef(false);
  const spokenRef = useRef("");
  const interruptRef = useRef(null);
  const pendingRef = useRef(new Map()); // id -> { resolve, timer }
  const lastTranscriptRef = useRef({ text: "", at: 0 });
  const thinkingTimerRef = useRef(null);
  const helloTimerRef = useRef(null);
  const queueHeartbeatRef = useRef(null);
  const queueTicketRef = useRef(null);
  const roomNameRef = useRef(null);
  const readyRef = useRef(null);
  const endRef = useRef(null);
  const greetingRef = useRef("");
  const endedByUserRef = useRef(false);
  const levelsRef = useRef(() => ({ mic: 0, agent: 0 }));
  const applyMicRef = useRef(null);
  const cloudRef = useRef({ tts: false, stt: false });
  const nativeRef = useRef({ tts: false, stt: false });
  const cloudDownUntilRef = useRef(0);
  const playerRef = useRef(null); // one shared <audio>, unlocked inside the tap that starts voice
  const listenerRef = useRef(null); // server listening: { stop }
  const micLevelRef = useRef(0);
  const aloudRef = useRef(null);
  const [aloud, setAloud] = useState(false);
  const micOnRef = useRef(null);
  const micWantedRef = useRef(null);
  const cbRef = useRef({ onTranscript, onMetric, speechLang, lang });
  cbRef.current = { onTranscript, onMetric, speechLang, lang };

  const setPhase = useCallback((next) => {
    phaseRef.current = next;
    setPhaseState(next);
    clearTimeout(thinkingTimerRef.current);
    if (next === "thinking") {
      // Never leave the visitor waiting in silence if a reply never arrives.
      thinkingTimerRef.current = setTimeout(() => {
        if (phaseRef.current === "thinking" && activeRef.current) {
          setNotice("That took too long — please say it again or type it.");
          phaseRef.current = "listening";
          setPhaseState("listening");
        }
      }, THINKING_TIMEOUT_MS);
    }
  }, []);

  const metric = useCallback((name) => cbRef.current.onMetric?.(name), []);

  /* ------------------------------------------------------- capabilities */

  useEffect(() => {
    let cancelled = false;
    const deviceOk = Boolean(Recognition) && synthesisSupported;
    // A sleeping free-tier server can take ~50s to answer. Offer device voice
    // meanwhile, and switch once the server reports in.
    const provisional = setTimeout(() => {
      if (!cancelled) setEngine((e) => (e === "checking" ? (deviceOk ? "browser" : "none") : e));
    }, 6000);
    Promise.allSettled([
      fetchJson("/api/ai-consultant/livekit/config", { credentials: "omit", timeoutMs: 70000 }),
      fetchJson("/api/ai-consultant/speech/config", { credentials: "omit", timeoutMs: 70000 }),
      nativeCapabilities(),
    ])
      .then(([lk, sp, nat]) => {
        if (cancelled) return;
        const livekitOn = lk.status === "fulfilled" && lk.value.ok && lk.value.data.enabled === true;
        const speech = sp.status === "fulfilled" && sp.value.ok ? sp.value.data : {};
        cloudRef.current = { tts: speech.tts === true, stt: speech.stt === true && recorderSupported };
        nativeRef.current = nat.status === "fulfilled" ? nat.value : { tts: false, stt: false };
        const cloud = cloudRef.current;
        const native = nativeRef.current;
        const canSpeak = native.tts || cloud.tts || synthesisSupported;
        const canHear = native.stt || cloud.stt || Boolean(Recognition);
        const browserOk = canSpeak && canHear;
        // In the app, Riya uses the phone's own voice (or the server voice): plain media playback,
        // no WebRTC call mode, works in earphones.
        const appVoice = IS_APP && (native.tts || cloud.tts) && (native.stt || cloud.stt);
        const next = appVoice ? "browser" : livekitOn ? "livekit" : browserOk ? "browser" : "none";
        if (!activeRef.current) setEngine(next);
      })
      .finally(() => clearTimeout(provisional));
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" })
        .then((status) => {
          if (cancelled) return;
          const map = (s) => (s === "granted" ? "granted" : s === "denied" ? "denied" : "unknown");
          setPermission(map(status.state));
          status.onchange = () => setPermission(map(status.state));
        })
        .catch(() => {});
    }
    if (!navigator.mediaDevices?.getUserMedia) setPermission("unavailable");
    return () => {
      cancelled = true;
      clearTimeout(provisional);
    };
  }, []);

  /* ----------------------------------------------------- speech promises */

  const settle = useCallback((id, result) => {
    const entry = pendingRef.current.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pendingRef.current.delete(id);
    entry.resolve(result);
  }, []);

  const settleAll = useCallback((result) => {
    [...pendingRef.current.keys()].forEach((id) => settle(id, result));
  }, [settle]);

  const afterSpeech = useCallback(() => {
    if (!activeRef.current) return;
    if (pendingRef.current.size === 0 && ["speaking", "greeting"].includes(phaseRef.current)) setPhase("listening");
  }, [setPhase]);

  /* --------------------------------------------------------- browser engine */

  const stopRecognition = useCallback(() => {
    if (!recRef.current || !recActiveRef.current) return;
    try {
      recRef.current.abort();
    } catch (_) {
      // already stopped
    }
  }, []);

  const deliverTranscript = useCallback(
    (raw) => {
      const text = String(raw || "").trim().slice(0, 600);
      // Nothing is taken while the mic is off, on hold, or while the assistant itself is talking.
      if (!text || !activeRef.current || mutedRef.current || holdRef.current) return;
      if (["speaking", "greeting"].includes(phaseRef.current) || isHallucination(text)) return;
      const norm = normalise(text);
      const last = lastTranscriptRef.current;
      if (norm && norm === last.text && Date.now() - last.at < DUPLICATE_WINDOW_MS) return;
      lastTranscriptRef.current = { text: norm, at: Date.now() };
      setCaption({ who: "user", text });
      setNotice("");
      setPhase("thinking");
      metric("voice_turn");
      cbRef.current.onTranscript?.(text);
    },
    [metric, setPhase]
  );

  const ensureRecognition = useCallback(() => {
    if (recRef.current || !Recognition) return recRef.current;
    const rec = new Recognition();
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      recActiveRef.current = true;
    };
    rec.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      // The visitor talks over the assistant: ignore our own voice, otherwise stop speaking and listen.
      if (phaseRef.current === "speaking") {
        const heard = (final || interim).trim();
        if (!heard || isEcho(heard, spokenRef.current)) return;
        interruptRef.current && interruptRef.current();
      }
      if (final.trim()) {
        try {
          rec.stop();
        } catch (_) {
          // stopping
        }
        deliverTranscript(final);
        return;
      }
      if (interim.trim()) {
        setCaption({ who: "user", text: interim.trim(), interim: true });
        if (phaseRef.current === "listening") setPhase("hearing");
      }
    };
    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        activeRef.current = false;
        setPermission("denied");
        setError({ code: "denied", message: VOICE_ERRORS.denied });
        setPhase("error");
      } else if (event.error === "audio-capture") {
        activeRef.current = false;
        setError({ code: "noDevice", message: VOICE_ERRORS.noDevice });
        setPhase("error");
      } else if (event.error === "network") {
        setNotice("Speech recognition needs a connection — retrying…");
      }
    };
    rec.onend = () => {
      recActiveRef.current = false;
      if (phaseRef.current === "hearing") setPhase("listening");
    };
    recRef.current = rec;
    return rec;
  }, [deliverTranscript, setPhase]);

  // Hands-free loop for the browser engine: the mic reopens whenever we are
  // listening and nothing else (speech, typing, review form, mute) holds it.
  const [loopTick, setLoopTick] = useState(0);
  useEffect(() => {
    if (activeEngine !== "browser" || !activeRef.current) return undefined;
    // Not while the assistant is speaking: the microphone would hear its own voice and answer itself.
    const canListen = (phase === "listening" || phase === "hearing") && !holdRef.current && !muted;
    if (nativeRef.current.stt) {
      // The phone's own speech recognition: one sentence per turn, then the loop listens again.
      if (!canListen) {
        if (listenerRef.current) nativeStopListening();
        listenerRef.current?.stop();
        listenerRef.current = null;
        return undefined;
      }
      if (listenerRef.current) return undefined;
      const session = { cancelled: false, stop() { this.cancelled = true; } };
      listenerRef.current = session;
      nativeListenOnce(cbRef.current.speechLang || "en-IN").then((text) => {
        if (listenerRef.current === session) listenerRef.current = null;
        if (session.cancelled || !activeRef.current) return;
        if (text) deliverTranscript(text);
        else setTimeout(() => setLoopTick((n) => n + 1), 250);
      });
      return undefined;
    }
    if (!Recognition && cloudRef.current.stt) {
      // No browser speech engine (the app): record the visitor's turn and transcribe it on the server.
      if (!canListen) {
        listenerRef.current?.stop();
        listenerRef.current = null;
        micLevelRef.current = 0;
        return undefined;
      }
      if (listenerRef.current) return undefined;
      const session = { stop() { this.cancelled = true; } };
      listenerRef.current = session;
      startServerListener({
        constraints: { echoCancellation: !IS_PHONE, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        onLevel: (level) => { micLevelRef.current = level; },
        onSpeechStart: () => {
          setCaption({ who: "user", text: "…", interim: true });
          if (phaseRef.current === "listening") setPhase("hearing");
        },
        onError: (error) => {
          listenerRef.current = null;
          const code = micErrorCode(error);
          if (code === "denied") setPermission("denied");
          setError({ code, message: VOICE_ERRORS[code] || VOICE_ERRORS.failed });
          activeRef.current = false;
          setPhase("error");
        },
        onClip: async (blob) => {
          if (listenerRef.current !== session) return;
          setCaption({ who: "user", text: "…", interim: true });
          setPhase("thinking");
          let text = "";
          try {
            const res = await fetch(`${API_BASE}/api/ai-consultant/speech/stt?lang=${encodeURIComponent(cbRef.current.lang || "en")}`, {
              method: "POST",
              headers: { "Content-Type": (blob.type || "audio/webm").split(";")[0] },
              body: blob,
            });
            const data = await res.json().catch(() => ({}));
            text = res.ok ? String(data.text || "").trim() : "";
          } catch (_) {
            setNotice("I couldn't catch that — please say it again.");
          }
          if (listenerRef.current === session) listenerRef.current = null;
          if (!activeRef.current) return;
          if (text) {
            deliverTranscript(text);
          } else {
            setCaption(null);
            setPhase("listening");
            setLoopTick((n) => n + 1);
          }
        },
      }).then((handle) => {
        // Muted, typed or ended while the mic was opening: release it straight away.
        if (session.cancelled || listenerRef.current !== session) handle.stop();
        else session.stop = () => { session.cancelled = true; handle.stop(); };
      });
      return undefined;
    }
    if (!canListen) {
      stopRecognition();
      return undefined;
    }
    if (recActiveRef.current) return undefined;
    const t = setTimeout(() => {
      const rec = ensureRecognition();
      if (!rec || recActiveRef.current || !activeRef.current) return;
      rec.lang = cbRef.current.speechLang || "en-IN";
      try {
        rec.start();
      } catch (_) {
        // InvalidStateError while the last session winds down
      }
      // Recognition ends after silence; poll to reopen it.
      setTimeout(() => setLoopTick((n) => n + 1), 1200);
    }, 180);
    return () => clearTimeout(t);
  }, [activeEngine, phase, muted, loopTick, deliverTranscript, ensureRecognition, setPhase, stopRecognition]);

  const browserSpeak = useCallback(
    (text, { greeting = false } = {}) =>
      new Promise((resolve) => {
        const clean = browserSpeechText(text);
        if (!synthesisSupported || !clean) {
          resolve({ spoken: false });
          return;
        }
        spokenRef.current = clean;
        const id = newId();
        const lang = cbRef.current.speechLang || "en-IN";
        const voice = pickVoice(lang);
        setVoiceSource({ kind: "browser", name: voice?.name || "browser default", reason: fallbackReasonRef.current });
        const timer = setTimeout(() => {
          settle(id, { spoken: true, timeout: true });
          afterSpeech();
        }, Math.min(45000, 3000 + clean.length * 85));
        pendingRef.current.set(id, { resolve, timer });
        setPhase(greeting ? "greeting" : "speaking");
        // Chrome silently stops utterances longer than ~15s, so speak sentence by sentence.
        const chunks = sentenceChunks(clean);
        const synth = window.speechSynthesis;
        const speakChunk = (i) => {
          if (!pendingRef.current.has(id)) return;
          if (i >= chunks.length) {
            settle(id, { spoken: true });
            afterSpeech();
            return;
          }
          const utterance = new SpeechSynthesisUtterance(chunks[i]);
          utterance.lang = lang;
          utterance.rate = 1;
          utterance.pitch = 1.04;
          utterance.volume = 1;
          if (voice) utterance.voice = voice;
          utterance.onend = () => speakChunk(i + 1);
          utterance.onerror = (event) => {
            if (event?.error === "interrupted" || event?.error === "canceled") return;
            speakChunk(i + 1);
          };
          synth.speak(utterance);
        };
        // Cancelling and speaking in the same tick drops the new utterance on Android Chrome.
        const busy = synth.speaking || synth.pending;
        if (busy) synth.cancel();
        synth.resume();
        setTimeout(() => speakChunk(0), busy ? 80 : 0);
      }),
    [afterSpeech, setPhase, settle]
  );

  /** Riya's server voice: sentence clips fetched ahead and played as ordinary media. */
  const cloudSpeak = useCallback(
    (text, { greeting = false } = {}) =>
      new Promise((resolve) => {
        const clean = browserSpeechText(text);
        if (!clean) {
          resolve({ spoken: false });
          return;
        }
        spokenRef.current = clean;
        const id = newId();
        const player = ensurePlayer(playerRef);
        setVoiceSource({ kind: "cloud", name: "Riya", reason: "" });
        const timer = setTimeout(() => {
          player.pause();
          settle(id, { spoken: true, timeout: true });
          afterSpeech();
        }, Math.min(60000, 8000 + clean.length * 110));
        pendingRef.current.set(id, { resolve, timer, text: clean, heard: true });
        setPhase(greeting ? "greeting" : "speaking");
        const clips = sentenceChunks(clean, 190).map((part) => ({ part, audio: null }));
        const load = (i) => {
          if (!clips[i] || clips[i].audio) return clips[i]?.audio;
          clips[i].audio = fetch(`${API_BASE}/api/ai-consultant/speech/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: clips[i].part, lang: cbRef.current.lang }),
          }).then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))));
          return clips[i].audio;
        };
        const finish = (result) => {
          if (!pendingRef.current.has(id)) return;
          settle(id, result);
          afterSpeech();
        };
        const play = async (i) => {
          if (!pendingRef.current.has(id)) return;
          if (i >= clips.length) return finish({ spoken: true });
          let blob;
          try {
            blob = await load(i);
            load(i + 1); // fetch the next sentence while this one plays
          } catch (_) {
            // The server voice failed (quota, outage): skip it for a few minutes and use the device voice.
            cloudDownUntilRef.current = Date.now() + 5 * 60 * 1000;
            const rest = clips.slice(i).map((c) => c.part).join(" ");
            pendingRef.current.delete(id);
            clearTimeout(timer);
            if (synthesisSupported && !IS_APP) {
              fallbackReasonRef.current = "the server voice failed";
              browserSpeakRef.current(rest, { greeting }).then(resolve);
            } else {
              resolve({ spoken: false });
              afterSpeech();
            }
            return undefined;
          }
          if (!pendingRef.current.has(id)) return undefined;
          const url = URL.createObjectURL(blob);
          player.onended = () => {
            URL.revokeObjectURL(url);
            play(i + 1);
          };
          player.onerror = () => {
            URL.revokeObjectURL(url);
            play(i + 1);
          };
          player.src = url;
          player.play().catch(() => {
            setNeedsAudioUnlock(true);
            finish({ spoken: false });
          });
          return undefined;
        };
        play(0);
      }),
    [afterSpeech, setPhase, settle]
  );

  /** The phone's own voice (Android app): runs locally, plays as normal media. */
  const nativeSpeak = useCallback(
    (text, { greeting = false } = {}) =>
      new Promise((resolve) => {
        const clean = browserSpeechText(text);
        if (!clean) {
          resolve({ spoken: false });
          return;
        }
        spokenRef.current = clean;
        const id = newId();
        setVoiceSource({ kind: "native", name: "Riya (on this phone)", reason: "" });
        const timer = setTimeout(() => {
          nativeStopSaying();
          settle(id, { spoken: true, timeout: true });
          afterSpeech();
        }, Math.min(60000, 8000 + clean.length * 110));
        pendingRef.current.set(id, { resolve, timer, text: clean, heard: true });
        setPhase(greeting ? "greeting" : "speaking");
        nativeSay(clean, cbRef.current.speechLang || "en-IN")
          .then(() => {
            settle(id, { spoken: true });
            afterSpeech();
          })
          .catch(() => {
            if (!pendingRef.current.has(id)) return;
            // No usable voice on this phone: use the server voice for this and later replies.
            clearTimeout(timer);
            pendingRef.current.delete(id);
            nativeRef.current = { ...nativeRef.current, tts: false };
            if (cloudRef.current.tts) cloudSpeakRef.current(clean, { greeting }).then(resolve);
            else {
              resolve({ spoken: false });
              afterSpeech();
            }
          });
      }),
    [afterSpeech, setPhase, settle]
  );

  /** Speak with the best voice available outside LiveKit: on-device, then server, then browser. */
  const deviceSpeak = useCallback(
    (text, options) => {
      if (nativeRef.current.tts) return nativeSpeak(text, options);
      const devanagari = /[\u0900-\u097F]/.test(String(text || ""));
      if (cloudRef.current.tts && Date.now() > cloudDownUntilRef.current && !(devanagari && synthesisSupported)) return cloudSpeak(text, options);
      if (synthesisSupported) return browserSpeak(text, options);
      return cloudSpeak(text, options);
    },
    [browserSpeak, cloudSpeak, nativeSpeak]
  );
  const cloudSpeakRef = useRef(cloudSpeak);
  cloudSpeakRef.current = cloudSpeak;
  const browserSpeakRef = useRef(browserSpeak);
  browserSpeakRef.current = browserSpeak;

  /* --------------------------------------------------------- LiveKit engine */

  const publish = useCallback((message) => {
    const room = roomRef.current;
    if (!room || room.state !== "connected") return false;
    room.localParticipant
      .publishData(new TextEncoder().encode(JSON.stringify(message)), { reliable: true, topic: VOICE_TOPIC })
      .catch(() => {});
    return true;
  }, []);

  const livekitSpeak = useCallback(
    (text, { greeting = false } = {}) =>
      new Promise((resolve) => {
        const clean = String(text || "").trim();
        if (!clean) {
          resolve({ spoken: false });
          return;
        }
        spokenRef.current = clean;
        const id = newId();
        const timer = setTimeout(() => {
          settle(id, { spoken: true, timeout: true });
          afterSpeech();
        }, Math.min(45000, 6000 + clean.length * 90));
        pendingRef.current.set(id, { resolve, timer, text: clean, heard: false });
        setPhase(greeting ? "greeting" : "speaking");
        applyMicRef.current?.();
        const sent = publish({
          type: "speak_text",
          id,
          text: clean.slice(0, 1800),
          lang: cbRef.current.lang,
          kind: greeting ? "greeting" : "reply",
          interruptible: !greeting,
        });
        if (!sent) {
          settle(id, { spoken: false });
          afterSpeech();
        }
      }),
    [afterSpeech, publish, setPhase, settle]
  );

  const teardownRoom = useCallback(async () => {
    clearInterval(helloTimerRef.current);
    clearInterval(queueHeartbeatRef.current);
    queueHeartbeatRef.current = null;
    const room = roomRef.current;
    roomRef.current = null;
    agentRef.current = null;
    levelsRef.current = () => ({ mic: 0, agent: 0 });
    micOnRef.current = null;
    micWantedRef.current = null;
    document.querySelectorAll("audio[data-ggn-voice]").forEach((el) => el.remove());
    // Tell the server first (keepalive requests survive the page closing), then hang up locally.
    const ticket = queueTicketRef.current;
    queueTicketRef.current = null;
    const roomName = roomNameRef.current;
    roomNameRef.current = null;
    if (roomName) {
      // Closes the room on the server too, so the voice worker stops immediately.
      fetch(`${API_BASE}/api/ai-consultant/livekit/end`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, queueTicket: ticket }), keepalive: true,
      }).catch(() => {});
    } else if (ticket) {
      fetch(`${API_BASE}/api/ai-consultant/voice-queue/leave`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }), keepalive: true,
      }).catch(() => {});
    }
    if (room) {
      try {
        await room.disconnect();
      } catch (_) {
        // already gone
      }
    }
  }, []);

  /* --------------------------------------------------------------- session */

  const end = useCallback(
    async ({ silent = false } = {}) => {
      endedByUserRef.current = true;
      activeRef.current = false;
      clearTimeout(thinkingTimerRef.current);
      settleAll({ spoken: false, cancelled: true });
      stopRecognition();
      if (listenerRef.current && nativeRef.current.stt) nativeStopListening();
      listenerRef.current?.stop(true);
      listenerRef.current = null;
      playerRef.current?.pause();
      nativeStopSaying();
      if (synthesisSupported) window.speechSynthesis.cancel();
      await teardownRoom();
      setActiveEngine(null);
      setMuted(false);
      mutedRef.current = false;
      setNeedsAudioUnlock(false);
      setCaption(null);
      if (!silent) setNotice("");
      setPhase("off");
    },
    [setPhase, settleAll, stopRecognition, teardownRoom]
  );

  endRef.current = end;

  const greetThenListen = useCallback(
    async (speakFn) => {
      const greeting = greetingRef.current;
      if (greeting) {
        setCaption({ who: "assistant", text: greeting });
        await speakFn(greeting, { greeting: true });
        metric("voice_greeting_played");
      }
      if (activeRef.current) {
        setCaption(null);
        setPhase("listening");
      }
    },
    [metric, setPhase]
  );

  // Browser voice: same quiet-time rule as the voice service.
  useEffect(() => {
    if (activeEngine !== "browser" || phase !== "listening") return undefined;
    const warn = setTimeout(() => setNotice("Still there? I'll pause voice in about 30 seconds — just say something to keep going."), IDLE_WARN_MS);
    const stop = setTimeout(() => {
      endRef.current?.({ silent: true }).then(() => setNotice(IDLE_MESSAGE));
    }, IDLE_END_MS);
    return () => {
      clearTimeout(warn);
      clearTimeout(stop);
    };
  }, [activeEngine, phase]);

  const startBrowser = useCallback(
    async (fallbackNote) => {
      const cloud = cloudRef.current;
      if (!(Recognition || cloud.stt) || !(synthesisSupported || cloud.tts)) {
        activeRef.current = false;
        setError({ code: "unsupported", message: VOICE_ERRORS.unsupported });
        setPhase("error");
        return;
      }
      if (nativeRef.current.stt && !(await nativeRequestMic())) {
        activeRef.current = false;
        setPermission("denied");
        setError({ code: "denied", message: VOICE_ERRORS.denied });
        setPhase("error");
        return;
      }
      setActiveEngine("browser");
      levelsRef.current = () => ({ mic: micLevelRef.current, agent: 0 });
      fallbackReasonRef.current = fallbackNote || "";
      if (fallbackNote) setNotice(fallbackNote);
      await greetThenListen(deviceSpeak);
    },
    [deviceSpeak, greetThenListen, setPhase]
  );

  const handleAgentMessage = useCallback(
    (message) => {
      if (!message || typeof message !== "object") return;
      switch (message.type) {
        case "voice_status":
          if (message.status === "ready") {
            if (typeof message.tts === "string") setVoiceSource({ kind: "livekit", name: message.tts, reason: "" });
            readyRef.current?.();
          }
          else if (message.status === "tts_error") {
            // No visible error: Riya's reply is simply said with the server/device voice instead.
            fallbackReasonRef.current = "the real-time voice (TTS) failed for this reply";
            // Keep replies audible even if the cloud TTS provider/key/model fails.
            // No id means the error came from the pipeline itself: re-speak the newest pending reply.
            const failedId = String(message.id || "") || [...pendingRef.current.keys()].pop() || "";
            const pending = pendingRef.current.get(failedId);
            if (pending?.text) {
              clearTimeout(pending.timer);
              pendingRef.current.delete(failedId);
              deviceSpeak(pending.text).then(pending.resolve).catch(() => pending.resolve({ spoken: false }));
            }
          } else if (message.status === "stt_error") setNotice("I couldn't catch that — please say it again.");
          break;
        case "user_state":
          if (message.state === "speaking" && phaseRef.current === "speaking") interruptRef.current && interruptRef.current();
          if (message.state === "speaking" && phaseRef.current === "listening") setPhase("hearing");
          if (message.state === "listening" && phaseRef.current === "hearing") setPhase("listening");
          break;
        case "agent_state":
          if (message.state === "speaking") pendingRef.current.forEach((entry) => { entry.heard = true; });
          if (message.state === "speaking" && !["greeting", "speaking"].includes(phaseRef.current) && pendingRef.current.size) setPhase("speaking");
          break;
        case "user_transcript":
          if (typeof message.text === "string") deliverTranscript(message.text);
          break;
        case "idle_warning":
          setNotice("Still there? I'll pause voice in about 30 seconds — just say something to keep going.");
          break;
        case "idle_end":
          // The voice service hung up on purpose to free its slot: not an error.
          endedByUserRef.current = true;
          endRef.current?.({ silent: true }).then(() => setNotice(IDLE_MESSAGE));
          break;
        case "speech_done": {
          const doneId = String(message.id || "");
          const entry = pendingRef.current.get(doneId);
          // The worker finished without ever producing audio (TTS key/model/quota problem):
          // say it with the browser's voice so the visitor is never left in silence.
          if (entry && !entry.heard && !message.interrupted && entry.text) {
            clearTimeout(entry.timer);
            pendingRef.current.delete(doneId);
            fallbackReasonRef.current = "the real-time voice produced no audio";
            deviceSpeak(entry.text).then(entry.resolve).catch(() => entry.resolve({ spoken: false }));
            break;
          }
          settle(doneId, { spoken: true, interrupted: Boolean(message.interrupted) });
          afterSpeech();
          break;
        }
        default:
          break;
      }
    },
    [afterSpeech, deviceSpeak, deliverTranscript, setPhase, settle]
  );

  const startLiveKit = useCallback(async () => {
    setActiveEngine("livekit");
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: LIVEKIT_CAPTURE,
      // Muting releases the microphone completely: nothing is captured and the phone leaves call mode.
      publishDefaults: { stopMicTrackOnMute: true },
    });
    roomRef.current = room;
    // Called inside the tap that started voice, so browsers allow playback.
    room.startAudio().catch(() => {});

    let tokenResult;
    const wakeNote = setTimeout(() => {
      if (activeRef.current && phaseRef.current === "connecting") setNotice("Waking up the voice service — the first call can take up to a minute.");
    }, 5000);
    try {
      tokenResult = await fetchJson("/api/ai-consultant/livekit/token", {
        timeoutMs: 70000,
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, lang: cbRef.current.lang, queueTicket: queueTicketRef.current }),
      });
    } catch (_) {
      tokenResult = { ok: false, data: {} };
    }
    clearTimeout(wakeNote);
    setNotice("");
    if (!activeRef.current) return;
    if (!tokenResult.ok || !tokenResult.data?.token) {
      await teardownRoom();
      metric("voice_browser_fallback");
      await startBrowser("Real-time voice is busy right now, so I'm using your browser's voice instead.");
      return;
    }

    roomNameRef.current = tokenResult.data.roomName || null;
    if (queueTicketRef.current) {
      const ticket = queueTicketRef.current;
      queueHeartbeatRef.current = setInterval(() => {
        fetch(`${API_BASE}/api/ai-consultant/voice-queue/heartbeat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket }) }).catch(() => {});
      }, 25000);
    }

    room
      .on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
        if (track.kind !== Track.Kind.Audio) return;
        const el = track.attach();
        el.dataset.ggnVoice = participant.identity;
        el.setAttribute("playsinline", "true");
        el.autoplay = true;
        el.volume = 1;
        el.style.display = "none";
        document.body.appendChild(el);
        el.play?.().catch(() => setNeedsAudioUnlock(true));
      })
      .on(RoomEvent.TrackUnsubscribed, (track) => track.detach().forEach((el) => el.remove()))
      .on(RoomEvent.AudioPlaybackStatusChanged, () => {
        const blocked = !room.canPlaybackAudio;
        setNeedsAudioUnlock(blocked);
        if (blocked) metric("voice_audio_blocked");
      })
      .on(RoomEvent.ParticipantConnected, (participant) => {
        if (participant.isAgent) agentRef.current = participant;
      })
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        if (participant.isAgent && activeRef.current) {
          agentRef.current = null;
          setError({ code: "agent", message: "The voice assistant disconnected. Tap retry to reconnect." });
          setPhase("error");
        }
      })
      .on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
        if (topic && topic !== VOICE_TOPIC) return;
        handleAgentMessage(decode(payload));
      })
      .on(RoomEvent.Reconnecting, () => activeRef.current && setPhase("reconnecting"))
      .on(RoomEvent.Reconnected, () => activeRef.current && setPhase("listening"))
      .on(RoomEvent.Disconnected, () => {
        if (roomRef.current !== room) return;
        roomRef.current = null;
        if (activeRef.current && !endedByUserRef.current) {
          activeRef.current = false;
          settleAll({ spoken: false });
          setError({ code: "network", message: VOICE_ERRORS.network });
          setPhase("error");
        }
      });

    try {
      await room.connect(tokenResult.data.url, tokenResult.data.token);
    } catch (_) {
      if (!activeRef.current) return;
      await teardownRoom();
      metric("voice_browser_fallback");
      await startBrowser("Couldn't reach the voice server, so I'm using your browser's voice instead.");
      return;
    }
    if (!activeRef.current) {
      await teardownRoom();
      return;
    }
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (micError) {
      const code = micErrorCode(micError);
      activeRef.current = false;
      await teardownRoom();
      if (code === "denied") setPermission("denied");
      setError({ code, message: VOICE_ERRORS[code] || VOICE_ERRORS.failed });
      setPhase("error");
      return;
    }
    setPermission("granted");
    micOnRef.current = true;
    micWantedRef.current = true;
    room.remoteParticipants.forEach((p) => {
      if (p.isAgent) agentRef.current = p;
    });
    levelsRef.current = () => ({
      mic: mutedRef.current || holdRef.current ? 0 : room.localParticipant?.audioLevel || 0,
      agent: agentRef.current?.audioLevel || 0,
    });

    // Wait for the voice worker before greeting; a greeting sent too early is lost.
    const ready = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), AGENT_READY_TIMEOUT_MS);
      readyRef.current = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      publish({ type: "hello" });
      helloTimerRef.current = setInterval(() => publish({ type: "hello" }), HELLO_INTERVAL_MS);
    });
    clearInterval(helloTimerRef.current);
    readyRef.current = null;
    if (!activeRef.current) return;
    if (!ready) {
      await teardownRoom();
      metric("voice_browser_fallback");
      await startBrowser("The real-time voice assistant didn't answer, so I'm using your browser's voice instead.");
      return;
    }
    publish({ type: "set_language", lang: cbRef.current.lang });
    await greetThenListen(livekitSpeak);
  }, [greetThenListen, handleAgentMessage, livekitSpeak, metric, publish, setPhase, settleAll, startBrowser, teardownRoom]);

  /** Stop a reply Riya is reading out while voice chat is off. */
  const stopAloud = useCallback(() => {
    if (!aloudRef.current) return;
    aloudRef.current = null;
    setAloud(false);
    playerRef.current?.pause();
    nativeStopSaying();
    if (synthesisSupported) window.speechSynthesis.cancel();
  }, []);

  /**
   * Read a reply out loud while voice chat is off (the visitor typed or tapped):
   * Riya still talks, but the microphone stays closed.
   */
  const sayAloud = useCallback(
    async (text) => {
      if (activeRef.current) return;
      stopAloud();
      const clean = browserSpeechText(text);
      if (!clean) return;
      const token = {};
      aloudRef.current = token;
      setAloud(true);
      const cancelled = () => aloudRef.current !== token;
      const lang = cbRef.current.speechLang || "en-IN";
      const devanagari = /[\u0900-\u097F]/.test(clean);
      try {
        if (nativeRef.current.tts) await nativeSay(clean, lang);
        else if (cloudRef.current.tts && Date.now() > cloudDownUntilRef.current && !devanagari) {
          try {
            await playCloudClips(clean, ensurePlayer(playerRef), cbRef.current.lang, cancelled);
          } catch (error) {
            // Autoplay blocked (no tap yet) is not a voice failure: just stay quiet this time.
            if (error?.name === "NotAllowedError") throw error;
            cloudDownUntilRef.current = Date.now() + 5 * 60 * 1000;
            if (synthesisSupported && !cancelled()) await synthSayAll(clean, lang);
          }
        } else if (synthesisSupported) await synthSayAll(clean, lang);
      } catch (_) {
        // no voice available for this reply; the text is on screen
      }
      if (!cancelled()) {
        aloudRef.current = null;
        setAloud(false);
      }
    },
    [stopAloud]
  );

  /** Call from a tap: lets later replies play out loud on phones. */
  const prime = useCallback(() => {
    primeSynthesis();
    primePlayer(playerRef);
  }, []);

  /** Step one, from a tap: ask for the microphone without starting anything. */
  const requestPermission = useCallback(async () => {
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setError({ code: "insecure", message: VOICE_ERRORS.insecure });
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission("unavailable");
      setError({ code: "unsupported", message: VOICE_ERRORS.unsupported });
      return false;
    }
    setError(null);
    primeSynthesis();
    primePlayer(playerRef);
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      stream.getTracks().forEach((t) => t.stop());
      setPermission("granted");
      setPhase("off");
      return true;
    } catch (micError) {
      const code = micErrorCode(micError);
      if (code === "denied") setPermission("denied");
      setError({ code, message: VOICE_ERRORS[code] || VOICE_ERRORS.failed });
      setPhase("off");
      return false;
    }
  }, [setPhase]);

  /** Must be called from a click/tap: it may prompt for the microphone. */
  const start = useCallback(
    async (greeting, queueTicket = null) => {
      if (activeRef.current) return;
      if (typeof window !== "undefined" && window.isSecureContext === false) {
        setError({ code: "insecure", message: VOICE_ERRORS.insecure });
        setPhase("error");
        return;
      }
      stopAloud();
      primeSynthesis();
      primePlayer(playerRef);
      greetingRef.current = String(greeting || "").trim();
      queueTicketRef.current = queueTicket;
      endedByUserRef.current = false;
      activeRef.current = true;
      setError(null);
      setNotice("");
      setCaption(null);
      metric("voice_session_started");
      if (engine === "livekit") {
        if (!queueTicketRef.current) {
          activeRef.current = false;
          setError({ code: "agent", message: "Join the real-time voice queue before starting." });
          setPhase("error");
          return;
        }
        setPhase("connecting");
        await startLiveKit();
        return;
      }
      // Browser engine: ask for the microphone first so the greeting never
      // competes with a permission prompt.
      setPhase("requesting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
        stream.getTracks().forEach((t) => t.stop());
        setPermission("granted");
      } catch (micError) {
        const code = navigator.mediaDevices ? micErrorCode(micError) : "insecure";
        activeRef.current = false;
        if (code === "denied") setPermission("denied");
        setError({ code, message: VOICE_ERRORS[code] || VOICE_ERRORS.failed });
        setPhase("error");
        metric("voice_session_failed");
        return;
      }
      if (!activeRef.current) return;
      await startBrowser("");
    },
    [engine, metric, setPhase, startBrowser, startLiveKit, stopAloud]
  );

  const retry = useCallback(async () => {
    await end({ silent: true });
    await start(greetingRef.current);
  }, [end, start]);

  /** Speak a consultant reply. Resolves when it has been heard (or skipped). */
  const speak = useCallback(
    (text) => {
      if (!activeRef.current) return Promise.resolve({ spoken: false });
      const clean = String(text || "").trim();
      if (!clean) {
        afterSpeech();
        return Promise.resolve({ spoken: false });
      }
      setCaption({ who: "assistant", text: clean });
      return activeEngine === "livekit" ? livekitSpeak(clean) : deviceSpeak(clean);
    },
    [activeEngine, afterSpeech, deviceSpeak, livekitSpeak]
  );

  /** Stop the assistant mid-sentence so the visitor can talk. */
  const interrupt = useCallback(() => {
    if (activeEngine === "livekit") publish({ type: "stop_speaking" });
    if (synthesisSupported) window.speechSynthesis.cancel();
    playerRef.current?.pause();
    nativeStopSaying();
    settleAll({ spoken: true, interrupted: true });
    if (activeRef.current) setPhase("listening");
  }, [activeEngine, publish, setPhase, settleAll]);

  interruptRef.current = interrupt;

  // Half-duplex: the mic is open only while it is the visitor's turn. While the assistant talks
  // the mic is released, so it can't hear itself and the phone plays the voice at full volume.
  const applyMic = useCallback(() => {
    const room = roomRef.current;
    const wanted = !mutedRef.current && !holdRef.current;
    const assistantTalking = ["speaking", "greeting"].includes(phaseRef.current) || pendingRef.current.size > 0;
    const enabled = wanted && !assistantTalking;
    if (room?.localParticipant && room.state === "connected") {
      if (micOnRef.current !== enabled) {
        micOnRef.current = enabled;
        room.localParticipant.setMicrophoneEnabled(enabled).catch(() => {});
      }
      if (micWantedRef.current !== wanted) {
        micWantedRef.current = wanted;
        publish({ type: "mic", enabled: wanted });
      }
    }
    if (!enabled) {
      stopRecognition();
      if (listenerRef.current && nativeRef.current.stt) nativeStopListening();
      listenerRef.current?.stop();
      listenerRef.current = null;
    }
    setLoopTick((n) => n + 1);
  }, [publish, stopRecognition]);
  applyMicRef.current = applyMic;

  // Reopen (or release) the real-time mic whenever whose turn it is changes.
  useEffect(() => {
    if (activeEngine === "livekit") applyMicRef.current?.();
  }, [activeEngine, phase]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    applyMic();
  }, [applyMic]);

  /** Temporarily stop listening (typing, filling the contact form). */
  const setHold = useCallback(
    (hold) => {
      if (holdRef.current === Boolean(hold)) return;
      holdRef.current = Boolean(hold);
      applyMic();
    },
    [applyMic]
  );

  /** Marks the consultant as working on a typed or spoken message. */
  const setThinking = useCallback(
    (thinking) => {
      if (!activeRef.current) return;
      if (thinking && ["listening", "hearing"].includes(phaseRef.current)) setPhase("thinking");
      if (!thinking && phaseRef.current === "thinking" && pendingRef.current.size === 0) setPhase("listening");
    },
    [setPhase]
  );

  const unlockAudio = useCallback(() => {
    primeSynthesis();
    playerRef.current?.play().then(() => setNeedsAudioUnlock(false)).catch(() => {});
    roomRef.current?.startAudio().then(() => setNeedsAudioUnlock(false)).catch(() => {});
    document.querySelectorAll("audio[data-ggn-voice]").forEach((el) => el.play?.().catch(() => {}));
  }, []);

  // Voice never keeps running in the background: closing the app, switching away from it
  // or locking the phone ends the session and releases the microphone at once.
  useEffect(() => {
    const stop = () => {
      if (activeRef.current || phaseRef.current !== "off") endRef.current?.({ silent: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", stop);
    window.addEventListener("ggn-app-pause", stop); // sent by the Android app when it goes to the background
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", stop);
      window.removeEventListener("ggn-app-pause", stop);
    };
  }, []);

  // Keep the worker's language in sync with the consultant's.
  useEffect(() => {
    if (activeEngine === "livekit") publish({ type: "set_language", lang });
  }, [activeEngine, lang, publish]);

  useEffect(
    () => () => {
      activeRef.current = false;
      clearInterval(helloTimerRef.current);
      clearTimeout(thinkingTimerRef.current);
      try {
        recRef.current?.abort();
      } catch (_) {
        // ignore
      }
      if (synthesisSupported) window.speechSynthesis.cancel();
      roomRef.current?.disconnect().catch(() => {});
    },
    []
  );

  const active = !["off", "error"].includes(phase);
  return {
    engine,
    activeEngine,
    voiceSource,
    supported: engine === "livekit" || engine === "browser",
    phase,
    active,
    error,
    notice,
    permission,
    muted,
    caption,
    needsAudioUnlock,
    levelsRef,
    requestPermission,
    start,
    end,
    retry,
    speak,
    interrupt,
    toggleMute,
    setHold,
    setThinking,
    unlockAudio,
    clearNotice: () => setNotice(""),
    aloud,
    sayAloud,
    stopAloud,
    prime,
  };
}
