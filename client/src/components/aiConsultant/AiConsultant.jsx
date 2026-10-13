import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, useMediaQuery } from "@mui/material";
import { Bot, Mic, MicOff, Minimize2, RotateCcw, Search, SendHorizontal, X } from "lucide-react";
import "./aiConsultant.css";
import { consultantApi, newIdempotencyKey } from "./consultantApi";
import SearchScanner from "./SearchScanner";
import FloatingConsultant from "./FloatingConsultant";
import { useVoiceAssistant } from "./voice/useVoiceAssistant";
import VoiceStage from "./voice/VoiceStage";
import VoiceBar from "./voice/VoiceBar";
import "./voice/voice.css";
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

/** The spoken part of a reply: conversational lines only, never listing dumps. */
function speechFor(r) {
  if (r && typeof r.speech === "string" && r.speech.trim()) return r.speech.trim();
  const lines = ((r && r.messages) || []).filter((m) => m && m.text && m.kind !== "listing").map((m) => m.text);
  return (lines.length > 2 ? [lines[0], lines[lines.length - 1]] : lines).join(" ");
}

function criteriaLine(summary) {
  return (summary || [])
    .filter((s) => s.slot !== "mode")
    .slice(0, 5)
    .map((s) => s.value)
    .join(", ");
}

/**
 * GgnHome AI Property Consultant — conversational property search by voice or text.
 * Props: open (full view), minimized (floating chat on the right),
 * onClose(reason) — "manual" when the user wants manual search — onMinimize, onExpand.
 */
export default function AiConsultant({ open, minimized = false, onClose, onMinimize, onExpand }) {
  const compact = useMediaQuery("(max-width:599px)");
  const persisted = useMemo(() => loadStore(), []);
  const [convState, setConvState] = useState(persisted?.state || null);
  const [items, setItems] = useState(persisted?.items || []);
  const [ui, setUi] = useState(persisted?.ui || null);
  const [chips, setChips] = useState(persisted?.chips || null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  // The centered voice screen shows until the visitor starts voice, chooses to
  // type, or the conversation is under way.
  const [stageDismissed, setStageDismissed] = useState(Boolean(persisted?.items?.some((it) => it.type === "user")));
  const busyRef = useRef(false);
  const queuedTranscriptRef = useRef(null);
  const sendRef = useRef(null);
  const stageVisibleRef = useRef(false);
  const [aiAvailable, setAiAvailable] = useState(null);
  const [review, setReview] = useState({ submitting: false, error: "", success: persisted?.success || null });
  const idemRef = useRef(persisted?.idem || null);
  const stateRef = useRef(convState);
  stateRef.current = convState;
  const streamRef = useRef(null);
  const inputRef = useRef(null);
  const startedRef = useRef(false);
  const autoSendRef = useRef(null);

  const lang = ui?.lang || convState?.lang || "en";
  busyRef.current = busy;

  // Voice: transcripts go through exactly the same path as typed messages.
  const voice = useVoiceAssistant({
    lang,
    speechLang: ui?.speechLang || "en-IN",
    onMetric: consultantApi.metric,
    onTranscript: (text) => {
      if (busyRef.current) {
        // Still answering the last question: keep the newest thing they said.
        queuedTranscriptRef.current = text;
        return;
      }
      sendRef.current && sendRef.current(text, text, { voice: true });
    },
  });
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  // While the centered voice card is showing, keep it in view instead of
  // auto-scrolling past it to the newest message.
  const stageVisible = !stageDismissed && !voice.active;
  stageVisibleRef.current = stageVisible;
  useEffect(() => {
    if (stageVisible && streamRef.current) streamRef.current.scrollTo({ top: 0, behavior: "auto" });
  }, [stageVisible, items, chips]);

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
    if (el && !stageVisibleRef.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [items, chips]);

  const pushItems = useCallback((...list) => setItems((prev) => [...prev, ...list].slice(-MAX_ITEMS)), []);
  const replaceItem = useCallback((id, next) => setItems((prev) => prev.map((it) => (it.id === id ? (typeof next === "function" ? next(it) : next) : it))), []);
  const removeTyping = useCallback(() => setItems((prev) => prev.filter((it) => it.type !== "typing")), []);

  // Speak a reply when a voice session is running. The mic is managed by the
  // voice controller, so the assistant never hears itself.
  const speakReply = useCallback((r) => {
    const v = voiceRef.current;
    if (!v.active) return;
    v.speak(speechFor(r));
  }, []);

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
      speakReply(r);
      if (r.next === "search" || r.next === "searchMore") runSearchRef.current && runSearchRef.current(r.state, r.next === "searchMore");
      if (r.next === "review") {
        if (!idemRef.current) idemRef.current = newIdempotencyKey();
        setReview((v) => ({ ...v, error: "", success: null }));
        setItems((prev) => [...prev.filter((it) => it.type !== "review"), { id: uid(), type: "review", consentText: (r.messages || []).find((m) => m.consentText)?.consentText || "" }]);
      }
    },
    [pushItems, speakReply]
  );

  const callTurn = useCallback(
    async (message, action, options = {}) => {
      setBusy(true);
      pushItems({ id: uid(), type: "typing" });
      try {
        const r = await consultantApi.turn(stateRef.current, message, action, options.disableLLM === true);
        removeTyping();
        handleResponse(r);
      } catch (err) {
        removeTyping();
        pushItems({ id: uid(), type: "bot", kind: "error", text: err.message, retry: message ? { message } : action ? { action } : null });
        speakReply({ speech: "Sorry, I couldn't reach the server just now. Please try that again." });
      } finally {
        // A turn that kicked off a search stays busy until the results land.
        if (!searchingRef.current) setBusy(false);
      }
    },
    [handleResponse, pushItems, removeTyping, speakReply]
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
        speakReply({ speech: "Sorry, the search didn't go through. Please try again in a moment." });
        searchingRef.current = false;
        setBusy(false);
      }
    },
    [pushItems, replaceItem, ui, speakReply]
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
      speakReply(r);
      searchingRef.current = false;
      setBusy(false);
    },
    [speakReply]
  );

  // Greet on first open (or resume a saved conversation).
  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    if (!items.length) callTurn(undefined, { type: "start" });
  }, [open, items.length, callTurn]);

  useEffect(() => {
    if (open && !compact) setTimeout(() => inputRef.current && inputRef.current.focus({ preventScroll: true }), 250);
  }, [open, compact]);

  /* ------------------------------------------------------------ actions */

  const send = useCallback(
    (value, display, options = {}) => {
      const text = String(value || "").trim();
      if (!text || busy) return;
      clearTimeout(autoSendRef.current);
      setTyping(false);
      setStageDismissed(true);
      if (!options.voice && voiceRef.current.phase === "speaking") voiceRef.current.interrupt();
      pushItems({ id: uid(), type: "user", text: display || text, voice: Boolean(options.voice) });
      setInput("");
      setChips(null);
      callTurn(text, undefined, options);
    },
    [busy, callTurn, pushItems]
  );
  sendRef.current = send;

  // A transcript that arrived while the consultant was busy is answered next.
  useEffect(() => {
    if (busy || !queuedTranscriptRef.current) return;
    const text = queuedTranscriptRef.current;
    queuedTranscriptRef.current = null;
    send(text, text, { voice: true });
  }, [busy, send]);

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

  const reviewOpen = convState?.phase === "review";
  const { setThinking, setHold } = voice;
  useEffect(() => setThinking(busy), [busy, setThinking]);
  // Don't listen while the visitor is typing or filling in the contact form.
  useEffect(() => setHold((typing && input.trim().length > 0) || reviewOpen), [typing, input, reviewOpen, setHold]);

  const startVoice = useCallback(() => {
    setStageDismissed(true);
    const greeting = [...items].reverse().find((it) => it.type === "bot" && it.text && it.kind !== "error");
    voiceRef.current.start(greeting ? greeting.text : "");
  }, [items]);

  const toggleMic = () => {
    if (!voice.active) startVoice();
    else voice.toggleMute();
  };

  // Persist the current conversation before closing voice or hiding the UI.
  // Voice is ephemeral; visitor preferences and progress are not.
  const persistConversation = useCallback(() => {
    if (!convState) return;
    saveStore({
      state: convState,
      ui,
      chips,
      idem: idemRef.current,
      success: review.success,
      items: items.filter((it) => it.type !== "typing" && it.type !== "scanner").slice(-MAX_ITEMS),
    });
  }, [convState, ui, chips, review.success, items]);

  const close = (reason) => {
    persistConversation();
    clearTimeout(autoSendRef.current);
    // Disconnect immediately; do not wait for an idle timeout.
    void voice.end({ silent: true });
    onClose && onClose(reason);
  };

  const minimize = () => {
    persistConversation();
    clearTimeout(autoSendRef.current);
    // The full voice screen is closing. Keep the saved chat/preferences,
    // but release the live microphone and LiveKit session immediately.
    void voice.end({ silent: true });
    onMinimize && onMinimize();
  };

  // Also cover parent-driven close/unmount transitions, not only the X button.
  useEffect(() => {
    if (open && !minimized) return;
    persistConversation();
    if (voiceRef.current.active || voiceRef.current.phase !== "off") {
      void voiceRef.current.end({ silent: true });
    }
  }, [open, minimized, persistConversation]);

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

  const floating = minimized ? (
    <FloatingConsultant
      items={items}
      chips={chips}
      busy={busy}
      input={input}
      onInput={(value) => {
        setTyping(true);
        setInput(value);
      }}
      onSubmit={() => send(input)}
      onChip={onChip}
      onAsk={(n) => send(`tell me about #${n}`, `Tell me about #${n}`)}
      onExpand={onExpand}
      onClose={() => close("dismiss")}
      voice={voice}
      onStartVoice={startVoice}
      placeholder={PLACEHOLDER[lang] || PLACEHOLDER.en}
    />
  ) : null;

  return (
    <>
    {floating}
    <Dialog
      open={open && !minimized}
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
          {onMinimize ? (
            <button type="button" className="gai-icon-btn" onClick={minimize} aria-label="Minimise consultant and end voice session" title="Pause voice and keep chatting while you browse">
              <Minimize2 size={17} />
            </button>
          ) : null}
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
              {stageVisible ? (
                <VoiceStage voice={voice} onStart={startVoice} onTypeInstead={() => { setStageDismissed(true); setTimeout(() => inputRef.current && inputRef.current.focus(), 50); }} />
              ) : (
                <div className="gai-voicebar-slot">
                  <VoiceBar voice={voice} onStart={startVoice} />
                </div>
              )}
              {items.map((it, i) => {
                if (it.type === "user")
                  return (
                    <div key={it.id} className="gai-row user">
                      <div className="gai-bubble user">
                        {it.voice ? <Mic size={12} className="gai-voice-tag" aria-label="Said by voice" /> : null}
                        {it.text}
                      </div>
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
            <button type="button" className={`gai-mic${voice.active && !voice.muted ? " listening" : ""}${voice.supported ? "" : " unsupported"}`} onClick={toggleMic} disabled={!voice.supported} aria-pressed={voice.active && !voice.muted} aria-label={!voice.active ? "Talk instead of typing" : voice.muted ? "Unmute microphone" : "Mute microphone"} title={!voice.supported ? "Voice isn't available in this browser" : !voice.active ? "Talk instead of typing" : voice.muted ? "Unmute" : "Mute"}>
              {voice.active && !voice.muted ? <Mic size={22} /> : <MicOff size={20} />}
            </button>
            <div className="gai-input-wrap">
              {(voice.phase === "listening" || voice.phase === "hearing") && !voice.muted && !input ? (
                <div className="gai-wave" aria-hidden="true" style={{ opacity: voice.phase === "hearing" ? 1 : 0.55 }}>
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
                placeholder={voice.phase === "listening" || voice.phase === "hearing" ? "Listening… or type here" : PLACEHOLDER[lang] || PLACEHOLDER.en}
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
          <div className="gai-composer-foot">
            <span>{voice.active ? "Hands-free — just talk, I'll answer when you pause. Typing works too." : "Speak or type in English, हिन्दी or Hinglish · change any answer anytime"}</span>
            <span>Real listings only — never invented</span>
          </div>
        </footer>
      </div>
    </Dialog>
    </>
  );
}
