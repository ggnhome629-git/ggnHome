import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, useMediaQuery } from "@mui/material";
import { Minimize2, RotateCcw, Search, SendHorizontal, Sparkles, X } from "lucide-react";
import "./aiConsultant.css";
import { consultantApi, newIdempotencyKey } from "./consultantApi";
import SearchScanner from "./SearchScanner";
import FloatingConsultant from "./FloatingConsultant";
import QuestStage, { QUEST_SLOTS } from "./quest/QuestStage";
import QuestBot from "./quest/QuestBot";
import questFlow from "../../data/questFlow.json";
import "./quest/quest.css";
import ResultCard from "./ResultCard";
import ReviewCard from "./ReviewCard";
import LeadGateCard from "./LeadGateCard";
import { useAuth } from "../../Context/AuthContext";
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
  en: "Or type anything — e.g. “2 BHK near metro in Sector 57 under 30k”",
  hinglish: "Ya kuch bhi likhiye — jaise “Sector 57 mein 30k tak 2 BHK, metro ke paas”",
  hi: "या कुछ भी लिखिए — जैसे “सेक्टर 57 में 30 हज़ार तक 2 BHK, मेट्रो के पास”",
};
const PREVIEW_CACHE = new Map(); // requirement set -> shortlist, for this visit

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



/** Digits from typed or spoken text ("98765 43210", "nine eight seven…", "double five"). */
const DIGIT_WORDS = { zero: 0, oh: 0, o: 0, shunya: 0, one: 1, ek: 1, two: 2, do: 2, three: 3, teen: 3, four: 4, char: 4, chaar: 4, five: 5, paanch: 5, panch: 5, six: 6, chhe: 6, che: 6, seven: 7, saat: 7, eight: 8, aath: 8, nine: 9, nau: 9 };
function spokenDigits(text) {
  const words = String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  let out = "";
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (/^\d+$/.test(w)) out += w;
    else if ((w === "double" || w === "triple") && words[i + 1] in DIGIT_WORDS) {
      out += String(DIGIT_WORDS[words[i + 1]]).repeat(w === "double" ? 2 : 3);
      i += 1;
    } else if (w in DIGIT_WORDS && w !== "o" && w !== "do") out += DIGIT_WORDS[w];
    else if ((w === "do" || w === "o") && /^(do|o)$/.test(w) && (/\d/.test(words[i - 1] || "") || words[i - 1] in DIGIT_WORDS)) out += DIGIT_WORDS[w];
  }
  return out.replace(/^(91|0)(?=\d{10}$)/, "");
}
const YES_RE = /^(yes|yeah|yep|correct|right|sahi|theek|thik|haan|han|ha|ok|okay|confirm|that'?s (right|correct))\b/i;
const NO_RE = /^(no|nope|nah|wrong|galat|nahi|edit|change)\b/i;

function criteriaLine(summary) {
  return (summary || [])
    .filter((s) => s.slot !== "mode")
    .slice(0, 5)
    .map((s) => s.value)
    .join(", ");
}

/**
 * GgnHome AI Property Consultant, quest edition: GgnBot asks a few questions one at a
 * time over an animated Gurgaon scene; every answer earns a reward and grows a live
 * shortlist. Text and taps only: no sound, microphone or voice anywhere.
 * (A copy of AiConsultant.jsx, which keeps the voice version.)
 * Props: open (full view), minimized (floating chat on the right),
 * onClose(reason) — "manual" when the user wants manual search — onMinimize, onExpand.
 */
export default function AiConsultantQuest({ open, minimized = false, onClose, onMinimize, onExpand }) {
  const compact = useMediaQuery("(max-width:599px)");
  const persisted = useMemo(() => loadStore(), []);
  const [convState, setConvState] = useState(persisted?.state || null);
  const [items, setItems] = useState(persisted?.items || []);
  const [ui, setUi] = useState(persisted?.ui || null);
  const [chips, setChips] = useState(persisted?.chips || null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  // The quest (one question at a time) is the main view; the full chat is one tap away.
  const [questView, setQuestView] = useState(true);
  const [celebrate, setCelebrate] = useState(0);
  const [achievement, setAchievement] = useState(null);
  const [shortlist, setShortlist] = useState({ state: "idle", total: 0, results: [] });
  const busyRef = useRef(false);
  const sendRef = useRef(null);
  const gateAnswerRef = useRef(null);
  const [aiAvailable, setAiAvailable] = useState(null);
  const [basicMode, setBasicMode] = useState(Boolean(persisted?.basicMode));
  const [review, setReview] = useState({ submitting: false, error: "", success: persisted?.success || null });
  const idemRef = useRef(persisted?.idem || null);
  const { user, loading: authLoading } = useAuth() || {};
  const [leadCaptured, setLeadCaptured] = useState(Boolean(persisted?.leadCaptured));
  const [gate, setGate] = useState(null);
  const gateRef = useRef(null);
  gateRef.current = gate;
  const guestRef = useRef(true);
  guestRef.current = !user && !authLoading;
  const capturedRef = useRef(leadCaptured);
  capturedRef.current = leadCaptured;
  const stateRef = useRef(convState);
  stateRef.current = convState;
  const streamRef = useRef(null);
  const inputRef = useRef(null);
  const startedRef = useRef(false);
  const autoSendRef = useRef(null);



  const lang = ui?.lang || convState?.lang || "en";
  busyRef.current = busy;



  // Persist the conversation so closing and reopening continues it.
  useEffect(() => {
    if (!convState) return;
    saveStore({
      state: convState,
      ui,
      chips,
      idem: idemRef.current,
      success: review.success,
      basicMode,
      leadCaptured,
      items: items.filter((it) => it.type !== "typing" && it.type !== "scanner" && it.type !== "leadgate").slice(-MAX_ITEMS),
    });
  }, [convState, items, ui, chips, review.success, basicMode, leadCaptured]);

  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [items, chips]);

  const pushItems = useCallback((...list) => setItems((prev) => [...prev, ...list].slice(-MAX_ITEMS)), []);
  const replaceItem = useCallback((id, next) => setItems((prev) => prev.map((it) => (it.id === id ? (typeof next === "function" ? next(it) : next) : it))), []);
  const removeTyping = useCallback(() => setItems((prev) => prev.filter((it) => it.type !== "typing")), []);


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
      if (r.next === "search" && guestRef.current && !capturedRef.current) {
        // Guests share a mobile number before the first search.
        setGate({ stage: "ask", phone: "", name: r.state?.contact?.name || "", error: "", saving: false, state: r.state });
        pushItems({ id: uid(), type: "leadgate" });
        return;
      }
      if (r.next === "search" || r.next === "searchMore") runSearchRef.current && runSearchRef.current(r.state, r.next === "searchMore");
      if (r.next === "review") {
        if (!idemRef.current) idemRef.current = newIdempotencyKey();
        setReview((v) => ({ ...v, error: "", success: null }));
        setItems((prev) => [...prev.filter((it) => it.type !== "review"), { id: uid(), type: "review", consentText: (r.messages || []).find((m) => m.consentText)?.consentText || "" }]);
      }
    },
    [pushItems]
  );

  const callTurn = useCallback(
    async (message, action, options = {}) => {
      setBusy(true);
      pushItems({ id: uid(), type: "typing" });
      try {
        const r = await consultantApi.turn(stateRef.current, message, action, options.disableLLM === true || basicMode);
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
      searchingRef.current = false;
      setBusy(false);
    },
    []
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
        pushItems({ id: uid(), type: "user", text: display || text });
      setInput("");
      setChips(null);
      if (gateRef.current && gateRef.current.stage !== "saving") {
        gateAnswerRef.current && gateAnswerRef.current(text);
        return;
      }
      callTurn(text, undefined, options);
    },
    [busy, callTurn, pushItems]
  );
  sendRef.current = send;


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
    setBasicMode(false);
    idemRef.current = null;
    setLeadCaptured(false);
    setGate(null);
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

  const patchGate = useCallback((patch) => setGate((g) => (g ? { ...g, error: "", ...patch } : g)), []);
  const showBot = useCallback((text) => pushItems({ id: uid(), type: "bot", text, kind: "question" }), [pushItems]);

  const gateToConfirm = (phone) => {
    patchGate({ stage: "confirm", phone });
    showBot(`I have ${phone.slice(0, 5)} ${phone.slice(5)}. Is that correct?`);
  };

  const continuePhone = () => {
    const g = gateRef.current;
    if (!g) return;
    if (!/^[6-9]\d{9}$/.test(g.phone)) return patchGate({ error: "Enter a valid 10-digit Indian mobile number." });
    gateToConfirm(g.phone);
  };

  // Typed or spoken replies while the number card is open stay local to the card.
  gateAnswerRef.current = (text) => {
    const g = gateRef.current;
    if (!g) return;
    const digits = spokenDigits(text);
    if (digits.length >= 6) {
      if (/^[6-9]\d{9}$/.test(digits)) return gateToConfirm(digits);
      const msg = "That doesn't look like a 10-digit mobile number. Please type it again.";
      patchGate({ error: msg, stage: g.stage === "confirm" ? "ask" : g.stage });
      showBot(msg);
      return undefined;
    }
    if (g.stage === "confirm" || g.stage === "edit") {
      if (YES_RE.test(text.trim()) && g.stage === "confirm") return void confirmGateRef.current && confirmGateRef.current();
      if (NO_RE.test(text.trim())) {
        patchGate({ stage: "edit" });
        const msg = "Sure — type the correct number, or edit it on the card. You can also add your name.";
        showBot(msg);
        return undefined;
      }
      const nm = text.replace(/^(my name is|i am|i'm|name is|mera naam)\s+/i, "").replace(/[^A-Za-zऀ-ॿ .'-]/g, "").trim();
      if (nm.length >= 2) {
        patchGate({ name: nm.slice(0, 60), stage: "confirm" });
        const msg = `Thanks ${nm.split(" ")[0]}. Is the number ${g.phone.slice(0, 5)} ${g.phone.slice(5)} correct?`;
        showBot(msg);
        return undefined;
      }
    }
    const msg = "Please type your 10-digit mobile number.";
    showBot(msg);
  };

  const confirmGate = async () => {
    const g = gateRef.current;
    if (!g || g.saving) return;
    patchGate({ saving: true });
    if (!idemRef.current) idemRef.current = newIdempotencyKey();
    const contact = { phone: g.phone, ...(g.name.trim() ? { name: g.name.trim() } : {}) };
    const next = { ...(g.state || stateRef.current || {}), contact };
    try {
      await consultantApi.lead({ state: next, contact, consent: true, idempotencyKey: idemRef.current });
    } catch (err) {
      patchGate({ saving: false, error: err.message });
      return;
    }
    setLeadCaptured(true);
    capturedRef.current = true;
    setGate(null);
    setItems((prev) => prev.filter((it) => it.type !== "leadgate"));
    setConvState(next);
    stateRef.current = next;
    pushItems({ id: uid(), type: "bot", text: `Thanks! Saved +91 ${g.phone}. Finding your properties now…`, kind: "info" });
    runSearch(next, false);
  };
  const confirmGateRef = useRef(null);
  confirmGateRef.current = confirmGate;

  const saveGateEdit = () => {
    const g = gateRef.current;
    if (!g) return;
    if (!/^[6-9]\d{9}$/.test(g.phone)) return patchGate({ error: "Enter a valid 10-digit Indian mobile number." });
    patchGate({ stage: "confirm" });
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

  const persistConversation = useCallback(() => {
    if (!convState) return;
    saveStore({ state: convState, ui, chips, idem: idemRef.current, success: review.success, basicMode, leadCaptured, items: items.filter((it) => it.type !== "typing" && it.type !== "scanner" && it.type !== "leadgate").slice(-MAX_ITEMS) });
  }, [convState, ui, chips, review.success, basicMode, leadCaptured, items]);

  const close = (reason) => {
    persistConversation();
    clearTimeout(autoSendRef.current);
    onClose && onClose(reason);
  };

  const minimize = () => {
    persistConversation();
    clearTimeout(autoSendRef.current);
    onMinimize && onMinimize();
  };

  useEffect(() => {
    if (open && !minimized) return;
    persistConversation();
  }, [open, minimized, persistConversation]);

  // Results, the number card and the review form live in the chat. The quest ends on a
  // results reveal with a "See my matches" button; a follow-up question after the
  // results (refinements, the review form) opens the chat directly.
  const lastItemType = items.length ? items[items.length - 1].type : null;
  useEffect(() => {
    if (lastItemType === "review") setQuestView(false);
  }, [lastItemType]);

  /* ------------------------------------------------------------- quest */

  // Each newly answered quest question earns sprinkles and an achievement.
  const answeredKey = (convState?.answered || []).filter((x) => QUEST_SLOTS.includes(x)).join(",");
  const seenAnsweredRef = useRef(null);
  useEffect(() => {
    const now = answeredKey ? answeredKey.split(",") : [];
    const before = seenAnsweredRef.current;
    seenAnsweredRef.current = now;
    if (!before) return undefined; // first render or a restored conversation: no fireworks
    const fresh = now.filter((x) => !before.includes(x));
    if (!fresh.length) return undefined;
    const m = questFlow.missions.find((x) => x.slot === fresh[fresh.length - 1]);
    setCelebrate((n) => n + 1);
    setAchievement({ id: Date.now(), icon: m.achievement.icon, text: m.achievement.text });
    const t = setTimeout(() => setAchievement(null), 2600);
    return () => clearTimeout(t);
  }, [answeredKey]);

  // The shortlist follows every answer: same requirements are served from this visit's cache.
  const reqKey = JSON.stringify([convState?.lang || "en", convState?.req || {}]);
  useEffect(() => {
    if (!answeredKey) return undefined;
    const cached = PREVIEW_CACHE.get(reqKey);
    if (cached) {
      setShortlist({ state: "ready", ...cached });
      return undefined;
    }
    let cancelled = false;
    setShortlist((s) => ({ ...s, state: "loading" }));
    const t = setTimeout(async () => {
      try {
        const r = await consultantApi.preview(stateRef.current);
        const data = { total: r.total || 0, results: r.results || [] };
        PREVIEW_CACHE.set(reqKey, data);
        if (PREVIEW_CACHE.size > 60) PREVIEW_CACHE.delete(PREVIEW_CACHE.keys().next().value);
        if (!cancelled) setShortlist({ state: "ready", ...data });
      } catch (_) {
        if (!cancelled) setShortlist((s) => ({ ...s, state: s.results.length ? "ready" : "error" }));
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [reqKey, answeredKey]);

  const questAnswer = (value, label) => send(value, label);
  const questBack = (slot) => edit(slot);

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

  const currentQuestion = lastBotIndex >= 0 ? items[lastBotIndex].text : "";
  const answeredNow = convState?.answered || [];
  const missions = questFlow.missions.map((m) => {
    const row = summary.find((r) => r.slot === m.slot || (m.slot === "priorities" && r.slot === "distances"));
    return { slot: m.slot, label: m.label, icon: m.icon, done: answeredNow.includes(m.slot) || (convState?.skipped || []).includes(m.slot), value: row ? row.value : "✓" };
  });

  const floating = minimized ? (
    <FloatingConsultant
      items={items}
      chips={chips}
      busy={busy}
      input={input}
      onInput={(value) => {
        setInput(value);
      }}
      onSubmit={() => send(input)}
      onChip={onChip}
      onAsk={(n) => send(`tell me about #${n}`, `Tell me about #${n}`)}
      onExpand={onExpand}
      onClose={() => close("dismiss")}
      avatar={<QuestBot size={30} mood={busy ? "think" : "idle"} />}
      title="GgnBot · AI property finder"
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
          <button type="button" className="gai-riya-btn" onClick={() => setQuestView(true)} aria-label="Back to the quick questions" title="Back to the quick questions">
            <QuestBot size={42} mood={busy ? "think" : "idle"} />
          </button>
          <div className="gai-title">
            <strong id="gai-title">GgnBot · AI property finder</strong>
            <small>
              <span className={`gai-live-dot${aiAvailable === false ? " offline" : ""}`} />
              {basicMode || aiAvailable === false ? "Basic rule-based mode · live listings" : "Rule engine + AI · live Gurgaon listings"}
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
            <button type="button" className="gai-icon-btn" onClick={minimize} aria-label="Minimise and keep chatting while you browse" title="Keep chatting while you browse">
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

        {questView ? (
          <QuestStage
            question={currentQuestion}
            slot={convState?.slot || null}
            mode={convState?.req?.mode}
            lang={lang}
            serverChips={chips}
            onAnswer={questAnswer}
            onBack={questBack}
            busy={busy}
            input={input}
            onInput={(value) => {
              clearTimeout(autoSendRef.current);
              setInput(value);
            }}
            onSend={() => send(input)}
            placeholder={PLACEHOLDER[lang] || PLACEHOLDER.en}
            missions={missions}
            celebrate={celebrate}
            achievement={achievement}
            shortlist={shortlist}
            onShowChat={() => setQuestView(false)}
          />
        ) : (
        <>
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
              <button type="button" className="gai-quest-back" onClick={() => setQuestView(true)}>
                <Sparkles size={15} /> Back to GgnBot's quick questions
              </button>
              {items.map((it, i) => {
                if (it.type === "user")
                  return (
                    <div key={it.id} className="gai-row user">
                      <div className="gai-bubble user">
                        {it.text}
                      </div>
                    </div>
                  );
                if (it.type === "typing")
                  return (
                    <div key={it.id} className="gai-row">
                      <div className="gai-avatar riya" aria-hidden="true">
                        <QuestBot size={32} />
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
                if (it.type === "leadgate")
                  return gate ? <LeadGateCard key={it.id} gate={gate} onChange={patchGate} onContinue={continuePhone} onConfirm={confirmGate} onEdit={() => patchGate({ stage: "edit" })} onSave={saveGateEdit} /> : null;
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
                    <div className="gai-avatar riya" aria-hidden="true">
                      <QuestBot size={32} />
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
            <div className="gai-input-wrap">
              <input
                ref={inputRef}
                className="gai-input"
                value={input}
                onChange={(e) => {
                  clearTimeout(autoSendRef.current);
                  setInput(e.target.value);
                }}
                placeholder={PLACEHOLDER[lang] || PLACEHOLDER.en}
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
            <span>Type in English, हिन्दी or Hinglish · change any answer anytime</span>
            <span>Real listings only — never invented</span>
          </div>
        </footer>
        </>
        )}
      </div>
    </Dialog>
    </>
  );
}
