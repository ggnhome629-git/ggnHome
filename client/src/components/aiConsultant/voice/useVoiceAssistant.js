import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

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
const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
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
  const pendingRef = useRef(new Map()); // id -> { resolve, timer }
  const lastTranscriptRef = useRef({ text: "", at: 0 });
  const thinkingTimerRef = useRef(null);
  const helloTimerRef = useRef(null);
  const queueHeartbeatRef = useRef(null);
  const queueTicketRef = useRef(null);
  const readyRef = useRef(null);
  const greetingRef = useRef("");
  const endedByUserRef = useRef(false);
  const levelsRef = useRef(() => ({ mic: 0, agent: 0 }));
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
    const browserOk = Boolean(Recognition) && synthesisSupported;
    // A sleeping free-tier server can take ~50s to answer. Offer browser voice
    // meanwhile, and switch to real-time voice once the server reports in.
    const provisional = setTimeout(() => {
      if (!cancelled) setEngine((e) => (e === "checking" ? (browserOk ? "browser" : "none") : e));
    }, 6000);
    fetchJson("/api/ai-consultant/livekit/config", { credentials: "omit", timeoutMs: 70000 })
      .then(({ ok, data }) => {
        if (cancelled) return;
        const next = ok && data.enabled === true ? "livekit" : browserOk ? "browser" : "none";
        if (!activeRef.current) setEngine(next);
      })
      .catch(() => !cancelled && setEngine((e) => (e === "checking" ? (browserOk ? "browser" : "none") : e)))
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
      if (!text) return;
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
    const canListen = (phase === "listening" || phase === "hearing") && !holdRef.current && !muted;
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
  }, [activeEngine, phase, muted, loopTick, ensureRecognition, stopRecognition]);

  const browserSpeak = useCallback(
    (text, { greeting = false } = {}) =>
      new Promise((resolve) => {
        const clean = browserSpeechText(text);
        if (!synthesisSupported || !clean) {
          resolve({ spoken: false });
          return;
        }
        stopRecognition();
        const id = newId();
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = cbRef.current.speechLang || "en-IN";
        utterance.rate = 1.03;
        const voices = window.speechSynthesis.getVoices();
        const prefix = utterance.lang.split("-")[0];
        const voice =
          voices.find((v) => v.lang === utterance.lang && /natural|neural|google|online/i.test(v.name)) ||
          voices.find((v) => v.lang === utterance.lang) ||
          voices.find((v) => v.lang?.startsWith(prefix));
        if (voice) utterance.voice = voice;
        const timer = setTimeout(() => settle(id, { spoken: true, timeout: true }), Math.min(30000, 2500 + clean.length * 85));
        pendingRef.current.set(id, { resolve, timer });
        utterance.onstart = () => {
          if (activeRef.current) setPhase(greeting ? "greeting" : "speaking");
        };
        utterance.onend = () => {
          settle(id, { spoken: true });
          afterSpeech();
        };
        utterance.onerror = () => {
          settle(id, { spoken: false });
          afterSpeech();
        };
        setPhase(greeting ? "greeting" : "speaking");
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }),
    [afterSpeech, setPhase, settle, stopRecognition]
  );

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
        const id = newId();
        const timer = setTimeout(() => {
          settle(id, { spoken: true, timeout: true });
          afterSpeech();
        }, Math.min(45000, 6000 + clean.length * 90));
        pendingRef.current.set(id, { resolve, timer });
        setPhase(greeting ? "greeting" : "speaking");
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
    document.querySelectorAll("audio[data-ggn-voice]").forEach((el) => el.remove());
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
      if (synthesisSupported) window.speechSynthesis.cancel();
      await teardownRoom();
      if (queueTicketRef.current) {
        const ticket = queueTicketRef.current;
        queueTicketRef.current = null;
        fetch(`${API_BASE}/api/ai-consultant/voice-queue/leave`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket }), keepalive: true }).catch(() => {});
      }
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

  const startBrowser = useCallback(
    async (fallbackNote) => {
      if (!Recognition || !synthesisSupported) {
        activeRef.current = false;
        setError({ code: "unsupported", message: VOICE_ERRORS.unsupported });
        setPhase("error");
        return;
      }
      setActiveEngine("browser");
      levelsRef.current = () => ({ mic: 0, agent: 0 });
      if (fallbackNote) setNotice(fallbackNote);
      await greetThenListen(browserSpeak);
    },
    [browserSpeak, greetThenListen, setPhase]
  );

  const handleAgentMessage = useCallback(
    (message) => {
      if (!message || typeof message !== "object") return;
      switch (message.type) {
        case "voice_status":
          if (message.status === "ready") readyRef.current?.();
          else if (message.status === "tts_error") setNotice("The assistant's voice hiccupped — the reply is shown in the chat.");
          else if (message.status === "stt_error") setNotice("I couldn't catch that — please say it again.");
          break;
        case "user_state":
          if (message.state === "speaking" && phaseRef.current === "listening") setPhase("hearing");
          if (message.state === "listening" && phaseRef.current === "hearing") setPhase("listening");
          break;
        case "agent_state":
          if (message.state === "speaking" && !["greeting", "speaking"].includes(phaseRef.current) && pendingRef.current.size) setPhase("speaking");
          break;
        case "user_transcript":
          if (typeof message.text === "string") deliverTranscript(message.text);
          break;
        case "speech_done":
          settle(String(message.id || ""), { spoken: true, interrupted: Boolean(message.interrupted) });
          afterSpeech();
          break;
        default:
          break;
      }
    },
    [afterSpeech, deliverTranscript, setPhase, settle]
  );

  const startLiveKit = useCallback(async () => {
    setActiveEngine("livekit");
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
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
      if (queueTicketRef.current) {
        const ticket = queueTicketRef.current; queueTicketRef.current = null;
        fetch(`${API_BASE}/api/ai-consultant/voice-queue/leave`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket }), keepalive: true }).catch(() => {});
      }
      metric("voice_browser_fallback");
      await startBrowser("Real-time voice is busy right now, so I'm using your browser's voice instead.");
      return;
    }

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
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    [engine, metric, setPhase, startBrowser, startLiveKit]
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
      return activeEngine === "livekit" ? livekitSpeak(clean) : browserSpeak(clean);
    },
    [activeEngine, afterSpeech, browserSpeak, livekitSpeak]
  );

  /** Stop the assistant mid-sentence so the visitor can talk. */
  const interrupt = useCallback(() => {
    if (activeEngine === "livekit") publish({ type: "stop_speaking" });
    if (synthesisSupported) window.speechSynthesis.cancel();
    settleAll({ spoken: true, interrupted: true });
    if (activeRef.current) setPhase("listening");
  }, [activeEngine, publish, setPhase, settleAll]);

  const applyMic = useCallback(() => {
    const room = roomRef.current;
    const enabled = !mutedRef.current && !holdRef.current;
    if (room?.localParticipant) room.localParticipant.setMicrophoneEnabled(enabled).catch(() => {});
    if (!enabled) stopRecognition();
    setLoopTick((n) => n + 1);
  }, [stopRecognition]);

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
    roomRef.current?.startAudio().then(() => setNeedsAudioUnlock(false)).catch(() => {});
    document.querySelectorAll("audio[data-ggn-voice]").forEach((el) => el.play?.().catch(() => {}));
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
  };
}
