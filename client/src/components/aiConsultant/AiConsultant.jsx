import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, useMediaQuery } from "@mui/material";
import { Bot, Mic, MicOff, RotateCcw, Search, SendHorizontal, Volume2, VolumeX, X } from "lucide-react";
import "./aiConsultant.css";
import { consultantApi, newIdempotencyKey } from "./consultantApi";
import { useSpeechRecognition, useSpeechSynthesis } from "./useSpeech";
import SearchScanner from "./SearchScanner";
import ResultCard from "./ResultCard";
import ReviewCard from "./ReviewCard";
import { NEARBY_PARAMETERS, POSITION_PARAMETER, formatDistance } from "../../data/propertyParameters";

const PositionIcon = POSITION_PARAMETER.icon;

const STORE_KEY = "ggn_ai_consultant_v1";
const MAX_ITEMS = 90;
const LANGS = [
  { id: "en", label: "EN" },
  { id: "hi", label: "हिं" },
  { id: "hinglish", label: "Hinglish" },
];
const VOICE_COPY = {
  unsupported: "Voice input isn't supported in this browser — typing works just as well.",
  denied: "Microphone access was blocked. Allow it in your browser settings, or just type.",
  noSpeech: "I didn't hear anything — tap the mic and try again.",
  network: "Voice recognition needs a connection right now — please type instead.",
  failed: "Voice input stopped unexpectedly — please try again or type.",
};
const PLACEHOLDER = {
  en: "Type or speak — e.g. “2 BHK near metro in Sector 57 under 30k”",
  hinglish: "Likhiye ya boliye — jaise “Sector 57 mein 30k tak 2 BHK, metro ke paas”",
  hi: "लिखिए या बोलिए — जैसे “सेक्टर 57 में 30 हज़ार तक 2 BHK, मेट्रो के पास”",
};

let seq = 0;
const uid = () => `i${Date.now().toString(36)}${(seq += 1)}`;

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}
function saveStore(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (_) {
    // storage full or blocked — the conversation still works in memory
  }
}
function clearStore() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch (_) {
    // ignore
  }
}

function criteriaLine(summary) {
  return (summary || [])
    .filter((s) => s.slot !== "mode")
    .slice(0, 5)
    .map((s) => s.value)
    .join(", ");
}

/**
 * GgnHome AI Property Consultant — full-screen conversational property search.
 * Props: open, onClose(reason) — reason is "manual" when the user wants to
 * switch to manual search.
 */
export default function AiConsultant({ open, onClose }) {
  const compact = useMediaQuery("(max-width:599px)");
  const persisted = useMemo(() => loadStore(), []);
  const [convState, setConvState] = useState(persisted?.state || null);
  const [items, setItems] = useState(persisted?.items || []);
  const [ui, setUi] = useState(persisted?.ui || null);
  const [chips, setChips] = useState(persisted?.chips || null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  // Voice is deliberately opt-in: permission prompts must follow a clear user
  // action, and the first greeting must not compete with a browser permission dialog.
  const speechCapable = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const [handsFree, setHandsFree] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [audioPermission, setAudioPermission] = useState("idle");
  const [voiceSessionStarted, setVoiceSessionStarted] = useState(false);
  const [voiceSetupError, setVoiceSetupError] = useState("");
  const [speechPending, setSpeechPending] = useState(false);
  const [typing, setTyping] = useState(false);
  const silenceRef = useRef(0);
  const [aiAvailable, setAiAvailable] = useState(null);
  const [review, setReview] = useState({ submitting: false, error: "", success: persisted?.success || null });
  const idemRef = useRef(persisted?.idem || null);
  const stateRef = useRef(convState);
  stateRef.current = convState;
  const streamRef = useRef(null);
  const inputRef = useRef(null);
  const startedRef = useRef(false);
  const autoSendRef = useRef(null);
  const tts = useSpeechSynthesis();

  const lang = ui?.lang || convState?.lang || "en";

  // Persist the conversation so closing and reopening continues it.
  useEffect(() => {
    if (!convState) return;
    saveStore({
      state: convState,
      ui,
      chips,
      idem: idemRef.current,
      success: review.success,
      items: items.filter((it) => it.type !== "typing" && it.type !== "scanner").slice(-MAX_ITEMS),
    });
  }, [convState, items, ui, chips, review.success]);

  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [items, chips]);

  const pushItems = useCallback((...list) => setItems((prev) => [...prev, ...list].slice(-MAX_ITEMS)), []);
  const replaceItem = useCallback((id, next) => setItems((prev) => prev.map((it) => (it.id === id ? (typeof next === "function" ? next(it) : next) : it))), []);
  const removeTyping = useCallback(() => setItems((prev) => prev.filter((it) => it.type !== "typing")), []);

  const speakIfOn = useCallback(
    (messages, speechLang) => {
      if (!voiceOut || !messages?.length) return;
      const last = [...messages].reverse().find((m) => m.text && m.kind !== "listing");
      if (!last) return;
      // Hold the mic closed until the reply has been read out, so it never hears itself.
      setSpeechPending(true);
      const release = () => setSpeechPending(false);
      const safety = setTimeout(release, Math.min(14000, 1500 + String(last.text).length * 75));
      tts.speak(last.text, speechLang || "en-IN", () => {
        clearTimeout(safety);
        release();
      });
    },
    [voiceOut, tts]
  );

  /* -------------------------------------------------------- server I/O */

  const runSearchRef = useRef(null);
  const searchingRef = useRef(false);

  const handleResponse = useCallback(
    (r) => {
      if (!r) return;
      setConvState(r.state);
      setUi(r.ui);
      if (typeof r.aiAvailable === "boolean") setAiAvailable(r.aiAvailable);
      const bubbles = (r.messages || []).map((m) => ({ id: uid(), type: "bot", text: m.text, hint: m.hint, kind: m.kind, listing: m.listing || null }));
      if (bubbles.length) pushItems(...bubbles);
      const withChips = [...(r.messages || [])].reverse().find((m) => Array.isArray(m.chips));
      setChips(withChips && withChips.chips.length ? { list: withChips.chips, multi: Boolean(withChips.multi), inputType: withChips.inputType || null } : null);
      setSelected([]);
      speakIfOn(r.messages, r.ui?.speechLang);
      if (r.next === "search" || r.next === "searchMore") runSearchRef.current && runSearchRef.current(r.state, r.next === "searchMore");
      if (r.next === "review") {
        if (!idemRef.current) idemRef.current = newIdempotencyKey();
        setReview((v) => ({ ...v, error: "", success: null }));
        setItems((prev) => [...prev.filter((it) => it.type !== "review"), { id: uid(), type: "review", consentText: (r.messages || []).find((m) => m.consentText)?.consentText || "" }]);
      }
    },
    [pushItems, speakIfOn]
  );

  const callTurn = useCallback(
    async (message, action) => {
      setBusy(true);
      pushItems({ id: uid(), type: "typing" });
      try {
        const r = await consultantApi.turn(stateRef.current, message, action);
        removeTyping();
        handleResponse(r);
      } catch (err) {
        removeTyping();
        pushItems({ id: uid(), type: "bot", kind: "error", text: err.message, retry: message ? { message } : action ? { action } : null });
      } finally {
        // A turn that kicked off a search stays busy until the results land.
        if (!searchingRef.current) setBusy(false);
      }
    },
    [handleResponse, pushItems, removeTyping]
  );

  const runSearch = useCallback(
    async (state, more) => {
      const scanId = uid();
      setChips(null);
      pushItems({ id: scanId, type: "scanner", response: null, criteria: criteriaLine(ui?.summary), tips: [] });
      searchingRef.current = true;
      setBusy(true);
      try {
        const r = await consultantApi.search(state, more);
        replaceItem(scanId, (it) => ({ ...it, response: r, tips: r.tips || [] }));
      } catch (err) {
        setItems((prev) => prev.filter((it) => it.id !== scanId));
        pushItems({ id: uid(), type: "bot", kind: "error", text: err.message, retry: { search: true, more } });
        searchingRef.current = false;
        setBusy(false);
      }
    },
    [pushItems, replaceItem, ui]
  );
  runSearchRef.current = runSearch;

  const finishScan = useCallback(
    (scanItem) => {
      const r = scanItem.response;
      setItems((prev) => {
        const idx = prev.findIndex((it) => it.id === scanItem.id);
        const head = r.messages?.[0]?.kind === "results" || r.messages?.[0]?.kind === "noMatch" ? r.messages[0] : null;
        const blocks = [];
        if (head) blocks.push({ id: uid(), type: "bot", text: head.text, kind: head.kind });
        if (r.results?.length) blocks.push({ id: uid(), type: "results", results: r.results, stats: r.stats, startIndex: r.stats?.offset || 0 });
        (r.messages || []).slice(head ? 1 : 0).forEach((m) => blocks.push({ id: uid(), type: "bot", text: m.text, kind: m.kind }));
        const next = [...prev];
        next.splice(idx, 1, ...blocks);
        return next.slice(-MAX_ITEMS);
      });
      setConvState(r.state);
      setUi(r.ui);
      const withChips = [...(r.messages || [])].reverse().find((m) => Array.isArray(m.chips));
      setChips(withChips ? { list: withChips.chips, multi: false } : null);
      speakIfOn(r.messages, r.ui?.speechLang);
      searchingRef.current = false;
      setBusy(false);
    },
    [speakIfOn]
  );

  // Greet on first open (or resume a saved conversation).
  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    if (!items.length) callTurn(undefined, { type: "start" });
  }, [open, items.length, callTurn]);

  useEffect(() => {
    if (open && !compact) setTimeout(() => inputRef.current && inputRef.current.focus({ preventScroll: true }), 250);
    if (!open) tts.cancel();
  }, [open, compact]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------------------------------------ actions */

  const send = useCallback(
    (value, display) => {
      const text = String(value || "").trim();
      if (!text || busy) return;
      clearTimeout(autoSendRef.current);
      tts.cancel();
      setSpeechPending(false);
      setTyping(false);
      pushItems({ id: uid(), type: "user", text: display || text });
      setInput("");
      setChips(null);
      callTurn(text);
    },
    [busy, callTurn, pushItems, tts]
  );

  const onChip = (chip) => {
    if (chips?.multi && !["skip", "show results", "none of these"].includes(chip.value)) {
      setSelected((prev) => (prev.includes(chip.value) ? prev.filter((v) => v !== chip.value) : [...prev, chip.value]));
      return;
    }
    send(chip.value, chip.label);
  };

  const sendSelected = () => {
    const labels = chips.list.filter((c) => selected.includes(c.value)).map((c) => c.label);
    send(selected.join(" and "), labels.join(", "));
  };

  const edit = (slot) => {
    if (busy) return;
    setReview((v) => ({ ...v, error: "" }));
    callTurn(undefined, { type: "edit", slot });
  };

  const editContact = (field) => {
    if (busy) return;
    setConvState((s) => {
      const next = { ...s, contact: { ...(s?.contact || {}) }, phase: "contact" };
      delete next.contact[field];
      if (field === "phone") delete next.contact.phone;
      stateRef.current = next;
      return next;
    });
    setTimeout(() => callTurn(undefined, { type: "contact" }), 0);
  };

  const changeLang = (id) => {
    if (busy || id === lang) return;
    callTurn(undefined, { type: "setLanguage", lang: id });
  };

  const restart = () => {
    if (busy) return;
    clearStore();
    idemRef.current = null;
    setItems([]);
    setChips(null);
    setReview({ submitting: false, error: "", success: null });
    setConvState(null);
    stateRef.current = null;
    setUi(null);
    callTurn(undefined, { type: "start", lang, langLocked: true });
  };

  const retry = (r) => {
    if (r.search) runSearch(stateRef.current, r.more);
    else if (r.message) callTurn(r.message);
    else if (r.action) callTurn(undefined, r.action);
  };

  const submitEnquiry = async () => {
    if (review.submitting) return;
    if (!idemRef.current) idemRef.current = newIdempotencyKey();
    setReview({ submitting: true, error: "", success: null });
    const transcript = items
      .filter((it) => it.type === "bot" || it.type === "user")
      .slice(-40)
      .map((it) => ({ role: it.type === "user" ? "user" : "assistant", text: String(it.text || "").slice(0, 600) }));
    try {
      const r = await consultantApi.enquiry({ state: stateRef.current, consent: true, idempotencyKey: idemRef.current, transcript });
      setReview({ submitting: false, error: "", success: { leadRef: r.leadRef } });
      setConvState((s) => ({ ...s, phase: "done" }));
      if (r.message) pushItems({ id: uid(), type: "bot", text: r.message, kind: "info" });
      setChips(r.chips && r.chips.length ? { list: r.chips, multi: false } : null);
      idemRef.current = null;
    } catch (err) {
      setReview({ submitting: false, error: err.message, success: null });
    }
  };

  /* -------------------------------------------------------------- voice */

  const [voiceNote, setVoiceNote] = useState("");
  const recognition = useSpeechRecognition({
    lang: ui?.speechLang || "en-IN",
    onFinal: (text) => {
      // Sent the instant speech is final — no confirmation delay.
      silenceRef.current = 0;
      setVoiceNote("");
      consultantApi.metric("voice_input_used");
      send(text);
    },
    onError: (code) => {
      if (code === "noSpeech") {
        // Quietly reopen; after a few silent rounds, pause instead of listening forever.
        silenceRef.current += 1;
        if (silenceRef.current >= 3) {
          setHandsFree(false);
          setVoiceNote("Voice paused while you're away — tap the mic to keep talking.");
        }
        return;
      }
      setHandsFree(false);
      setVoiceNote(code === "denied" ? "Tap the mic once to allow voice, or just type." : VOICE_COPY[code] || VOICE_COPY.failed);
      consultantApi.metric(code === "unsupported" ? "speech_unsupported" : code === "denied" ? "speech_denied" : "speech_failed");
    },
  });

  // Mic on: whenever the assistant is idle, not speaking and the user isn't typing.
  const reviewOpen = convState?.phase === "review";
  const { start: micStart, stop: micStop, listening: micOn } = recognition;
  useEffect(() => {
    if (!open || !handsFree || busy || speechPending || tts.speaking || typing || reviewOpen || micOn) return undefined;
    const t = setTimeout(micStart, 60);
    return () => clearTimeout(t);
  }, [open, handsFree, busy, speechPending, tts.speaking, typing, reviewOpen, micOn, micStart]);

  // Mic off: the moment the assistant starts working or the user starts typing.
  useEffect(() => {
    if ((busy || typing || !open || !handsFree) && micOn) micStop();
  }, [busy, typing, open, handsFree, micOn, micStop]);

  const enableMicrophone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceSetupError("This browser can't request microphone access here. Use HTTPS or type your message instead.");
      return;
    }
    setAudioPermission("requesting");
    setVoiceSetupError("");
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach((track) => track.stop());
      setAudioPermission("granted");
    } catch (error) {
      setAudioPermission("denied");
      setVoiceSetupError(error?.name === "NotAllowedError"
        ? "Microphone access was blocked. Allow it in your browser's site settings, then try again."
        : "Couldn't access the microphone. Check that it's connected and not being used exclusively by another app.");
    }
  };

  const startVoiceSession = () => {
    if (audioPermission !== "granted" || !recognition.supported) return;
    setVoiceSessionStarted(true);
    setVoiceNote("");
    setVoiceOut(Boolean(tts.supported));
    setHandsFree(Boolean(recognition.supported));
    setTyping(false);
    setSpeechPending(Boolean(tts.supported));
    const greeting = [...items].reverse().find((item) => item.type === "bot" && item.text);
    const releaseMic = () => setSpeechPending(false);
    if (greeting && tts.supported) {
      tts.speak(greeting.text, ui?.speechLang || "en-IN", releaseMic);
    } else {
      releaseMic();
    }
    consultantApi.metric("voice_input_used");
  };

  const toggleMic = () => {
    if (!voiceSessionStarted) return;
    setVoiceNote("");
    if (!recognition.supported) {
      setVoiceNote(VOICE_COPY.unsupported);
      consultantApi.metric("speech_unsupported");
      return;
    }
    if (handsFree) {
      setHandsFree(false);
      recognition.stop();
      return;
    }
    silenceRef.current = 0;
    setTyping(false);
    setHandsFree(true);
    if (!voiceOut && tts.supported) setVoiceOut(true);
    tts.cancel();
    setSpeechPending(false);
    recognition.start(); // inside the tap, so the browser can ask for mic permission
  };

  useEffect(() => {
    if (recognition.listening) setInput(recognition.interim);
  }, [recognition.interim, recognition.listening]);

  const close = (reason) => {
    recognition.stop();
    tts.cancel();
    clearTimeout(autoSendRef.current);
    onClose && onClose(reason);
  };

  /* ------------------------------------------------------------ render */

  const summary = ui?.summary || [];
  const progress = ui?.progress || { done: 0, total: 10 };
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const priorities = convState?.req?.priorities || {};
  const wantCorner = convState?.req?.corner;

  const brief = (
    <aside className="gai-brief" aria-label="Your requirements">
      <div className="gai-brief-section">
        <h4>Your brief</h4>
        <div className="gai-progress">
          <div className="gai-ring" style={{ "--p": pct }}>
            <b>{pct}%</b>
          </div>
          <div style={{ fontSize: 13, color: "var(--ai-muted)" }}>
            {progress.done} of {progress.total} answered
            <br />
            <span style={{ fontSize: 11.5 }}>Tap any item to change it</span>
          </div>
        </div>
        {summary.length ? (
          summary.map((row) => (
            <button type="button" key={row.slot} className="gai-req" onClick={() => edit(row.slot)} disabled={busy}>
              <span>{row.label}</span>
              <b>{row.value}</b>
            </button>
          ))
        ) : (
          <p style={{ fontSize: 13, color: "var(--ai-dim)" }}>Your answers will appear here.</p>
        )}
      </div>
      <div className="gai-brief-section">
        <h4>7 property parameters</h4>
        <div className="gai-params">
          {NEARBY_PARAMETERS.map((p) => {
            const on = p.key in priorities;
            const Icon = p.icon;
            return (
              <div key={p.key} className={`gai-param${on ? " on" : ""}`} style={{ "--pc": p.color }}>
                <Icon size={16} color={on ? p.color : "#b5ab9d"} />
                <div>
                  {p.short}
                  <small>{on ? (priorities[p.key] ? `≤ ${formatDistance(priorities[p.key])}` : "nearby") : "—"}</small>
                </div>
              </div>
            );
          })}
          <div className={`gai-param${wantCorner && wantCorner !== "any" ? " on" : ""}`} style={{ "--pc": POSITION_PARAMETER.color }}>
            <PositionIcon size={16} color={wantCorner && wantCorner !== "any" ? POSITION_PARAMETER.color : "#b5ab9d"} />
            <div>
              Position
              <small>{wantCorner ? (wantCorner === "any" ? "any" : wantCorner) : "—"}</small>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );

  const lastBotIndex = (() => {
    for (let i = items.length - 1; i >= 0; i -= 1) if (items[i].type === "bot") return i;
    return -1;
  })();

  return (
    <Dialog
      open={open}
      onClose={() => close("dismiss")}
      fullScreen={compact}
      maxWidth={false}
      aria-labelledby="gai-title"
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(30,42,47,0.45)", backdropFilter: "blur(4px)" } },
        paper: {
          sx: {
            width: { sm: "min(1180px, 96vw)" },
            height: { xs: "100%", sm: "min(880px, 94vh)" },
            maxHeight: { xs: "100%", sm: "94vh" },
            m: { xs: 0, sm: 2 },
            borderRadius: { xs: 0, sm: "26px" },
            overflow: "hidden",
            backgroundColor: "#faf7f2",
            backgroundImage: "none",
            border: { sm: "1px solid #e6ded2" },
            boxShadow: "0 30px 80px rgba(30,42,47,0.28)",
          },
        },
      }}
    >
      <div className="gai-root">

        <header className="gai-header">
          <div className={`gai-orb${busy ? " thinking" : ""}`} aria-hidden="true">
            <i>
              <Bot size={18} />
            </i>
          </div>
          <div className="gai-title">
            <strong id="gai-title">GgnHome AI Consultant</strong>
            <small>
              <span className={`gai-live-dot${aiAvailable === false ? " offline" : ""}`} />
              {aiAvailable === false ? "Fast rule-based mode · live listings" : "Rule engine + AI · live Gurgaon listings"}
            </small>
          </div>
          <div className="gai-spacer" />
          {!compact && (
            <div className="gai-seg" role="group" aria-label="Language">
              {LANGS.map((l) => (
                <button key={l.id} type="button" aria-pressed={lang === l.id} onClick={() => changeLang(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          )}
          {tts.supported && (
            <button type="button" className={`gai-icon-btn${voiceOut ? " on" : ""}`} onClick={() => (voiceOut ? (tts.cancel(), setVoiceOut(false)) : setVoiceOut(true))} aria-pressed={voiceOut} aria-label={voiceOut ? "Mute spoken replies" : "Read replies aloud"} title={voiceOut ? "Mute spoken replies" : "Read replies aloud"}>
              {voiceOut ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
          <button type="button" className="gai-icon-btn" onClick={restart} aria-label="Start over" title="Start over" disabled={busy}>
            <RotateCcw size={17} />
          </button>
          <button type="button" className="gai-icon-btn gai-close" onClick={() => close("manual")} aria-label="Close the AI assistant and search manually" title="Close & search manually">
            <Search size={16} />
            <span>Manual search</span>
            <X size={18} />
          </button>
        </header>

        <nav className="gai-strip" aria-label="Your requirements">
          {compact && (
            <div className="gai-seg" role="group" aria-label="Language" style={{ flexShrink: 0 }}>
              {LANGS.map((l) => (
                <button key={l.id} type="button" aria-pressed={lang === l.id} onClick={() => changeLang(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          )}
          <span className="gai-pill progress">{pct}%</span>
          {summary.map((row) => (
            <button type="button" key={row.slot} className="gai-pill" onClick={() => edit(row.slot)} disabled={busy}>
              <em>{row.label}</em>
              {row.value}
            </button>
          ))}
        </nav>

        <div className="gai-body">
          <div className="gai-stream" ref={streamRef}>
            <div className="gai-stream-inner" aria-live="polite" aria-relevant="additions">
              {!voiceSessionStarted && (
                <section className="gai-voice-stage" aria-label="Set up voice assistant">
                  <div className="gai-voice-stage-orb"><Bot size={28} /></div>
                  <p className="gai-voice-eyebrow">VOICE PROPERTY ASSISTANT</p>
                  <h2>{audioPermission === "granted" ? "Ready when you are" : "Let's get your voice ready"}</h2>
                  <p className="gai-voice-description">
                    {audioPermission === "granted"
                      ? "Your microphone is ready. Start the conversation when you're comfortable — we'll speak the greeting first, then listen."
                      : "First allow microphone access. We won't start listening or speak over the browser permission prompt."}
                  </p>
                  {audioPermission !== "granted" ? (
                    <button type="button" className="gai-voice-primary" onClick={enableMicrophone} disabled={audioPermission === "requesting"}>
                      <Mic size={20} />
                      {audioPermission === "requesting" ? "Waiting for permission…" : "Enable microphone"}
                    </button>
                  ) : (
                    <button type="button" className="gai-voice-primary" onClick={startVoiceSession} disabled={!recognition.supported}>
                      <Mic size={20} />
                      Start voice conversation
                    </button>
                  )}
                  {!recognition.supported && (
                    <p className="gai-voice-error">Voice recognition isn't supported by this browser. You can still use the text chat below.</p>
                  )}
                  {voiceSetupError ? <p className="gai-voice-error" role="alert">{voiceSetupError}</p> : null}
                  <p className="gai-voice-footnote">Your microphone is used only after you choose to start. You can pause it anytime.</p>
                </section>
              )}
              {items.map((it, i) => {
                if (it.type === "user")
                  return (
                    <div key={it.id} className="gai-row user">
                      <div className="gai-bubble user">{it.text}</div>
                    </div>
                  );
                if (it.type === "typing")
                  return (
                    <div key={it.id} className="gai-row">
                      <div className="gai-avatar" aria-hidden="true">
                        <Bot size={16} />
                      </div>
                      <div className="gai-bubble bot gai-typing" aria-label="Assistant is typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  );
                if (it.type === "scanner")
                  return <SearchScanner key={it.id} response={it.response} criteria={it.criteria} tips={it.tips} onDone={() => finishScan(it)} />;
                if (it.type === "results")
                  return (
                    <React.Fragment key={it.id}>
                      {it.stats ? (
                        <div className="gai-stats">
                          <span>
                            scanned <b>{Number(it.stats.scanned || 0).toLocaleString("en-IN")}</b>
                          </span>
                          <span>
                            passed must-haves <b>{it.stats.afterHardFilters}</b>
                          </span>
                          <span>
                            verified distances <b>{it.stats.withVerifiedDistances}</b>
                          </span>
                          <span>
                            ranked in <b>{it.stats.tookMs} ms</b>
                          </span>
                        </div>
                      ) : null}
                      <div className="gai-results">
                        {it.results.map((card, k) => (
                          <ResultCard key={card.id} card={card} index={(it.startIndex || 0) + k} priorities={priorities} wantCorner={wantCorner} onAsk={(n) => send(`tell me about #${n}`, `Tell me about #${n}`)} onOpen={() => consultantApi.metric("result_clicked")} />
                        ))}
                      </div>
                      <div className="gai-disclaimer">Distances are approx. straight-line estimates from listing partners and map data — not road distances. “n/a” means not verified yet.</div>
                    </React.Fragment>
                  );
                if (it.type === "review")
                  return (
                    <ReviewCard
                      key={it.id}
                      summary={summary}
                      contact={ui?.contact || {}}
                      consentText={it.consentText}
                      onEdit={edit}
                      onEditContact={editContact}
                      onSubmit={submitEnquiry}
                      submitting={review.submitting}
                      error={review.error}
                      success={review.success}
                    />
                  );
                return (
                  <div key={it.id} className="gai-row">
                    <div className="gai-avatar" aria-hidden="true">
                      <Bot size={16} />
                    </div>
                    <div className={`gai-bubble bot${it.kind === "faq" ? " faq" : ""}${it.kind === "error" ? " error" : ""}`}>
                      {it.text}
                      {it.hint && i === lastBotIndex ? <span className="gai-hint">{it.hint}</span> : null}
                      {it.listing ? (
                        <span className="gai-hint">
                          <a href={it.listing.url} target="_blank" rel="noopener noreferrer" style={{ color: "#0f766e", fontWeight: 600 }}>
                            Open listing ↗
                          </a>
                        </span>
                      ) : null}
                      {it.retry && i === items.length - 1 ? (
                        <span className="gai-hint">
                          <button type="button" className="gai-chip" onClick={() => retry(it.retry)} disabled={busy}>
                            Try again
                          </button>
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {chips && chips.list.length && !busy ? (
                <div className="gai-chips" role="group" aria-label={chips.multi ? "Choose one or more" : "Quick answers"}>
                  {chips.list.map((c) => (
                    <button key={`${c.value}-${c.label}`} type="button" className={`gai-chip${selected.includes(c.value) ? " selected" : ""}${c.value === "show results" ? " ghost" : ""}`} aria-pressed={chips.multi ? selected.includes(c.value) : undefined} onClick={() => onChip(c)}>
                      {c.label}
                    </button>
                  ))}
                  {chips.multi && selected.length ? (
                    <button type="button" className="gai-chip primary" onClick={sendSelected}>
                      Done ({selected.length}) →
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          {brief}
        </div>

        <footer className="gai-composer">
          <form
            className="gai-composer-inner"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <button type="button" className={`gai-mic${recognition.listening ? " listening" : ""}${recognition.supported && handsFree ? "" : " unsupported"}`} onClick={toggleMic} disabled={!voiceSessionStarted} aria-pressed={handsFree} aria-label={handsFree ? "Pause hands-free voice" : "Turn on hands-free voice"} title={!voiceSessionStarted ? "Enable microphone and start the voice conversation above" : !recognition.supported ? "Voice not supported in this browser" : handsFree ? "Hands-free voice is on — tap to pause" : "Tap to talk hands-free"}>
              {recognition.supported && handsFree ? <Mic size={22} /> : <MicOff size={20} />}
            </button>
            <div className="gai-input-wrap">
              {recognition.listening && !input ? (
                <div className="gai-wave" aria-hidden="true" style={{ opacity: 0.4 + recognition.level * 0.6 }}>
                  {Array.from({ length: 14 }).map((_, k) => (
                    <i key={k} style={{ animationDelay: `${-k * 0.07}s` }} />
                  ))}
                </div>
              ) : null}
              <input
                ref={inputRef}
                className="gai-input"
                value={input}
                onChange={(e) => {
                  clearTimeout(autoSendRef.current);
                  setTyping(true);
                  setInput(e.target.value);
                }}
                onKeyDown={() => setTyping(true)}
                placeholder={recognition.listening ? "Listening…" : PLACEHOLDER[lang] || PLACEHOLDER.en}
                aria-label="Message the AI consultant"
                maxLength={600}
                type="text"
                inputMode={chips?.inputType === "tel" || ui?.slot === "phone" ? "tel" : ui?.slot === "email" ? "email" : "text"}
                autoComplete={ui?.slot === "phone" ? "tel" : ui?.slot === "email" ? "email" : ui?.slot === "name" ? "name" : "off"}
                enterKeyHint="send"
              />
              <button type="submit" className="gai-send" disabled={!input.trim() || busy} aria-label="Send">
                <SendHorizontal size={18} />
              </button>
            </div>
          </form>
          {voiceNote ? (
            <div role="alert" className="gai-composer-foot" style={{ color: "#8a5a12" }}>
              {voiceNote}
            </div>
          ) : null}
          <div className="gai-composer-foot">
            <span>{recognition.listening ? "Listening… just talk, I'll send it when you pause" : handsFree ? "Hands-free on — the mic opens by itself after each reply" : "Speak or type in English, हिन्दी or Hinglish · change any answer anytime"}</span>
            <span>Real listings only — never invented</span>
          </div>
        </footer>
      </div>
    </Dialog>
  );
}
