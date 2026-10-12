import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser speech recognition + synthesis for hands-free use.
 *
 * - One recognition object is created once and reused, so turning the mic on
 *   is instant (no re-creation, no second audio stream for a meter).
 * - The final transcript is delivered the moment the browser marks it final,
 *   instead of waiting for the end-of-session timeout.
 * - Every failure is reported as a code the UI can explain. Typing always
 *   keeps working; nothing here is required for the consultant to function.
 *
 * Note: browser speech services may send audio to the browser vendor and are
 * not guaranteed to work offline.
 */
const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export function useSpeechRecognition({ lang = "en-IN", onFinal, onError } = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef(null);
  const activeRef = useRef(false);
  const deliveredRef = useRef(false);
  const handlers = useRef({ onFinal, onError });
  handlers.current = { onFinal, onError };
  const supported = Boolean(Recognition);

  // Build the recognizer once.
  useEffect(() => {
    if (!supported) return undefined;
    const rec = new Recognition();
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      activeRef.current = true;
      deliveredRef.current = false;
      setListening(true);
      setInterim("");
    };
    rec.onresult = (event) => {
      let text = "";
      let final = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else text += r[0].transcript;
      }
      if (final.trim() && !deliveredRef.current) {
        // Deliver immediately and close the mic — no waiting for silence timeout.
        deliveredRef.current = true;
        setInterim(final.trim());
        try {
          rec.stop();
        } catch (_) {
          // already stopping
        }
        handlers.current.onFinal && handlers.current.onFinal(final.trim());
        return;
      }
      setInterim((final + text).trim());
    };
    rec.onerror = (event) => {
      const map = { "not-allowed": "denied", "service-not-allowed": "denied", "audio-capture": "denied", "no-speech": "noSpeech", network: "network", aborted: null };
      const code = map[event.error] !== undefined ? map[event.error] : "failed";
      if (code && handlers.current.onError) handlers.current.onError(code);
    };
    rec.onend = () => {
      activeRef.current = false;
      setListening(false);
    };
    recRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch (_) {
        // ignore
      }
      recRef.current = null;
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!recRef.current || !activeRef.current) return;
    try {
      recRef.current.abort();
    } catch (_) {
      // ignore
    }
  }, []);

  const start = useCallback(() => {
    if (!supported || !recRef.current) {
      handlers.current.onError && handlers.current.onError("unsupported");
      return false;
    }
    if (activeRef.current) return true;
    try {
      window.speechSynthesis && window.speechSynthesis.cancel();
    } catch (_) {
      // ignore
    }
    recRef.current.lang = lang;
    try {
      recRef.current.start();
      activeRef.current = true;
      return true;
    } catch (_) {
      // InvalidStateError: still shutting down from the last session — retry on the next tick.
      setTimeout(() => {
        try {
          recRef.current && recRef.current.start();
        } catch (__) {
          handlers.current.onError && handlers.current.onError("failed");
        }
      }, 120);
      return true;
    }
  }, [supported, lang]);

  return { supported, listening, interim, level: listening ? 0.6 : 0, start, stop, setInterim };
}

export function useSpeechSynthesis() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const doneRef = useRef(null);

  // Voices load asynchronously in Chrome; warm the list so the first reply isn't delayed.
  useEffect(() => {
    if (!supported) return undefined;
    window.speechSynthesis.getVoices();
    const warm = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", warm);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", warm);
  }, [supported]);

  const finish = useCallback(() => {
    setSpeaking(false);
    const cb = doneRef.current;
    doneRef.current = null;
    if (cb) cb();
  }, []);

  const cancel = useCallback(() => {
    if (!supported) return;
    doneRef.current = null;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  /** Speaks `text`; `onDone` runs when speech ends (or immediately if it can't speak). */
  const speak = useCallback(
    (text, lang = "en-IN", onDone) => {
      const clean = String(text || "")
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
        .replace(/₹/g, "rupees ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 320);
      if (!supported || !clean) {
        if (onDone) onDone();
        return;
      }
      window.speechSynthesis.cancel();
      doneRef.current = onDone || null;
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = lang;
      u.rate = 1.08;
      const voices = window.speechSynthesis.getVoices();
      const prefix = lang.split("-")[0];
      const voice = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang && v.lang.startsWith(prefix));
      if (voice) u.voice = voice;
      u.onstart = () => setSpeaking(true);
      u.onend = finish;
      u.onerror = finish;
      window.speechSynthesis.speak(u);
    },
    [supported, finish]
  );

  useEffect(() => () => supported && window.speechSynthesis.cancel(), [supported]);

  return { supported, speaking, speak, cancel };
}
