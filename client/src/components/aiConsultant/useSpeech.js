import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser speech recognition + synthesis with every failure mode surfaced as a
 * state the UI can explain. Text input always keeps working; nothing here is
 * required for the consultant to function.
 *
 * Note: browser speech services may send audio to the browser vendor and are
 * not guaranteed to work offline.
 */
const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export function useSpeechRecognition({ lang = "en-IN", onFinal, onError } = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const recRef = useRef(null);
  const finalRef = useRef("");
  const audioRef = useRef({ ctx: null, stream: null, raf: 0 });
  const supported = Boolean(Recognition);

  const stopMeter = useCallback(() => {
    const a = audioRef.current;
    cancelAnimationFrame(a.raf);
    if (a.stream) a.stream.getTracks().forEach((t) => t.stop());
    if (a.ctx) a.ctx.close().catch(() => {});
    audioRef.current = { ctx: null, stream: null, raf: 0 };
    setLevel(0);
  }, []);

  // A lightweight input-level meter so the waveform reacts to the user's voice.
  const startMeter = useCallback(async () => {
    try {
      // Mobile browsers can't share the mic between recognition and a meter.
      if (!navigator.mediaDevices?.getUserMedia || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const ctx = new AC();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) sum += data[i];
        setLevel(Math.min(1, sum / data.length / 90));
        audioRef.current.raf = requestAnimationFrame(tick);
      };
      audioRef.current = { ctx, stream, raf: requestAnimationFrame(tick) };
    } catch (_) {
      // Meter is decorative; recognition reports real permission errors.
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current && recRef.current.stop();
    } catch (_) {
      // already stopped
    }
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      onError && onError("unsupported");
      return;
    }
    if (listening) {
      stop();
      return;
    }
    try {
      window.speechSynthesis && window.speechSynthesis.cancel();
    } catch (_) {
      // ignore
    }
    const rec = new Recognition();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    finalRef.current = "";
    rec.onstart = () => {
      setListening(true);
      setInterim("");
      startMeter();
    };
    rec.onresult = (event) => {
      let text = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else text += r[0].transcript;
      }
      if (final) finalRef.current += final;
      setInterim((finalRef.current + text).trim());
    };
    rec.onerror = (event) => {
      const map = { "not-allowed": "denied", "service-not-allowed": "denied", "no-speech": "noSpeech", network: "network", "audio-capture": "denied", aborted: null };
      const code = map[event.error] !== undefined ? map[event.error] : "failed";
      if (code && onError) onError(code);
    };
    rec.onend = () => {
      setListening(false);
      stopMeter();
      const text = finalRef.current.trim();
      if (text && onFinal) onFinal(text);
      finalRef.current = "";
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch (_) {
      onError && onError("failed");
    }
  }, [supported, listening, lang, onFinal, onError, startMeter, stopMeter, stop]);

  useEffect(
    () => () => {
      try {
        recRef.current && recRef.current.abort();
      } catch (_) {
        // ignore
      }
      stopMeter();
    },
    [stopMeter]
  );

  return { supported, listening, interim, level, start, stop, setInterim };
}

export function useSpeechSynthesis() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text, lang = "en-IN") => {
      if (!supported || !text) return;
      const clean = String(text)
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
        .replace(/₹/g, "rupees ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 320);
      if (!clean) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = lang;
      u.rate = 1.03;
      u.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      const prefix = lang.split("-")[0];
      const voice = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang && v.lang.startsWith(prefix));
      if (voice) u.voice = voice;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [supported]
  );

  useEffect(() => () => supported && window.speechSynthesis.cancel(), [supported]);

  return { supported, speaking, speak, cancel };
}
