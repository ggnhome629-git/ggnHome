import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessagesSquare, SendHorizontal } from "lucide-react";
import QuestBot from "./QuestBot";
import QuestScene from "./QuestScene";
import AreaPicker from "./AreaPicker";
import flow from "../../../data/questFlow.json";
import { cloudinaryUrl } from "../../../utils/cloudinaryImage";

const CONFETTI_COLOURS = ["#ffb703", "#fb8500", "#00a79d", "#5ef2e0", "#ff5d8f", "#8338ec", "#3a86ff", "#06d6a0"];

/** A burst of sprinkles from the middle of the screen; a new `burst` value fires a new one. */
function Confetti({ burst }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 42 }).map((_, i) => {
        const angle = (i / 42) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 120 + Math.random() * 200;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 80,
          r: Math.random() * 720 - 360,
          c: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
          d: Math.random() * 0.15,
          round: i % 3 === 0,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burst]
  );
  if (!burst) return null;
  return (
    <div className="qst-confetti" key={burst} aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} className={p.round ? "round" : ""} style={{ "--x": `${p.x}px`, "--y": `${p.y}px`, "--r": `${p.r}deg`, background: p.c, animationDelay: `${p.d}s` }} />
      ))}
    </div>
  );
}

/** Types the robot's line out letter by letter; a tap shows it all at once. */
function TypedLine({ text }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (!text) return undefined;
    const step = Math.max(1, Math.round(text.length / 45));
    const t = setInterval(() => setShown((n) => (n >= text.length ? n : n + step)), 22);
    return () => clearInterval(t);
  }, [text]);
  const done = shown >= text.length;
  return (
    <p className="qst-line" onClick={() => setShown(text.length)}>
      {text.slice(0, shown)}
      {!done ? <span className="qst-caret" aria-hidden="true" /> : null}
      <span className="qst-sr">{text}</span>
    </p>
  );
}

/**
 * The quest: GgnBot floats over a living Gurgaon scene and asks a handful of
 * short questions one at a time. Each answer earns a star, sprinkles and an
 * achievement, and the shortlist of matching homes fills in as you go.
 * Text and taps only: no sound, no microphone.
 */
export const QUEST_SLOTS = flow.missions.map((m) => m.slot);
const word = (value, lang) => (value && typeof value === "object" ? value[lang] || value.en : value);

export default function QuestStage({
  question,
  slot,
  mode,
  lang = "en",
  serverChips,
  onAnswer,
  onBack,
  busy,
  input,
  onInput,
  onSend,
  placeholder,
  missions,
  celebrate,
  achievement,
  shortlist,
  onShowChat,
}) {
  const doneCount = missions.filter((m) => m.done).length;
  const total = missions.length;
  const complete = doneCount >= total;
  const [happy, setHappy] = useState(false);

  // Game score: 100 XP an answer, plus a combo bonus for answering quickly (within 12 s).
  const [score, setScore] = useState({ xp: 0, combo: 0, pop: null });
  const askedAtRef = useRef(Date.now());
  useEffect(() => {
    askedAtRef.current = Date.now();
  }, [slot]);
  useEffect(() => {
    if (!celebrate) return undefined;
    setHappy(true);
    const quick = Date.now() - askedAtRef.current < 12000;
    setScore((s) => {
      const combo = quick ? s.combo + 1 : 1;
      const gain = 100 + (combo > 1 ? (combo - 1) * 25 : 0);
      return { xp: s.xp + gain, combo, pop: { id: celebrate, gain, combo } };
    });
    const t = setTimeout(() => setHappy(false), 1800);
    return () => clearTimeout(t);
  }, [celebrate]);
  const mood = busy ? "think" : happy || complete ? "happy" : "idle";
  const xp = Math.max(score.xp, doneCount * 100);
  const level = Math.min(total, doneCount + 1);
  const current = missions.find((m) => m.slot === slot) || missions.find((m) => !m.done);

  // Answers come from questFlow.json for the five quest questions, else from the server's own chips.
  const mission = flow.missions.find((m) => m.slot === slot);
  const [picked, setPicked] = useState([]);
  useEffect(() => setPicked([]), [slot]);
  const options = !mission
    ? (serverChips?.list || []).map((c) => ({ value: c.value, label: c.label }))
    : mission.slot === "budget"
      ? mission.options[mode === "sale" ? "buy" : "rent"]
      : mission.slot === "location"
        ? []
        : mission.options.map((o) => ({ value: o.value, label: word(o.label, lang) }));
  const multi = mission ? Boolean(mission.multi) : Boolean(serverChips?.multi);
  const canSkip = flow.skip.slots.includes(slot);
  const previous = [...missions].reverse().find((m) => m.done && m.slot !== slot);
  const firstQuestion = slot === "mode" && doneCount === 0;
  const tap = (o) => {
    if (multi) {
      setPicked((p) => (p.includes(o.value) ? p.filter((v) => v !== o.value) : [...p, o.value]));
      return;
    }
    onAnswer(o.value, o.label);
  };
  const finishMulti = () => {
    if (!picked.length) {
      onAnswer(mission?.done?.value || "none of these", word(mission?.done?.label, lang) || "Show homes");
      return;
    }
    const labels = options.filter((o) => picked.includes(o.value)).map((o) => o.label);
    onAnswer(picked.join(" and "), labels.join(", "));
  };

  return (
    <section className="qst" aria-label="Find your home in a few quick questions">
      <QuestScene celebrate={celebrate} />
      <div className="qst-scroll">
        <div className="qst-hud">
          <ol className="qst-stars" aria-label={`${doneCount} of ${missions.length} answered`}>
            {missions.map((m) => (
              <li key={m.slot} className={m.done ? "on" : m.slot === slot ? "now" : ""} title={m.done ? `${word(m.label, lang)}: ${m.value}` : word(m.label, lang)}>
                <span className="qst-star" aria-hidden="true">{m.done ? "★" : m.icon}</span>
                <small>{m.done ? m.value : word(m.label, lang)}</small>
              </li>
            ))}
          </ol>
          <span className="qst-xp" aria-label={`${xp} points`}>
            ⚡ {xp} XP
            {score.combo > 1 ? <b className="qst-combo">🔥 x{score.combo}</b> : null}
            {score.pop ? (
              <em className="qst-pop" key={score.pop.id} aria-hidden="true">
                +{score.pop.gain}
              </em>
            ) : null}
          </span>
        </div>

        <div className="qst-journey" aria-hidden="true">
          <div className="qst-track">
            <span className="qst-track-fill" style={{ width: `${(doneCount / total) * 100}%` }} />
            {missions.map((m, i) => (
              <span key={m.slot} className={`qst-stop${m.done ? " on" : ""}`} style={{ left: `${(i / total) * 100}%` }}>
                {m.icon}
              </span>
            ))}
            <span className="qst-goal" style={{ left: "100%" }}>🏠</span>
            <span className="qst-runner" style={{ left: `${(doneCount / total) * 100}%` }}>🚗</span>
          </div>
          <p className="qst-level">
            {complete ? "🏆 Quest complete!" : `Level ${level} of ${total}${current ? ` · ${word(current.label, lang)}` : ""}`}
          </p>
        </div>

        <div className="qst-botrow">
          <div className="qst-bot">
            <QuestBot mood={mood} size={128} />
          </div>
          <div className="qst-bubble" aria-live="polite">
            {busy ? (
              <p className="qst-line qst-thinking">
                <span />
                <span />
                <span />
              </p>
            ) : (
              <TypedLine text={question || word(mission?.ask, lang) || "Let's find your home in Gurgaon!"} />
            )}
          </div>
        </div>

        {complete ? (
          <div className="qst-trophy" role="status">
            <span>🏆</span>
            <div>
              <strong>Quest complete — {xp} XP!</strong>
              <small>{busy ? "Unlocking your best homes…" : "Your matches are ready below and in the full chat."}</small>
            </div>
          </div>
        ) : null}

        {!busy && mission?.slot === "location" ? <AreaPicker mission={mission} mode={mode} lang={lang} onPick={onAnswer} disabled={busy} /> : null}

        {!busy && options.length ? (
          <div className="qst-answers" role="group" aria-label={multi ? "Pick one or more" : "Pick an answer"}>
            {options.map((o, i) => (
              <button
                key={`${o.value}-${o.label}`}
                type="button"
                className={`qst-answer${picked.includes(o.value) ? " picked" : ""}`}
                style={{ "--hue": `${(i * 47) % 360}`, animationDelay: `${i * 50}ms` }}
                aria-pressed={multi ? picked.includes(o.value) : undefined}
                onClick={() => tap(o)}
              >
                {o.label}
              </button>
            ))}
            {multi ? (
              <button type="button" className="qst-answer go" onClick={finishMulti}>
                {picked.length ? `Done (${picked.length}) 🚀` : word(mission?.done?.label, lang) || "Show homes now →"}
              </button>
            ) : null}
          </div>
        ) : null}

        {!busy && firstQuestion && flow.quickPicks?.length ? (
          <div className="qst-quick">
            <p>⚡ Or one tap for everything:</p>
            <div className="qst-answers" role="group" aria-label="Quick picks">
              {flow.quickPicks.map((q, i) => (
                <button key={q.value} type="button" className="qst-answer quick" style={{ "--hue": `${(i * 61 + 180) % 360}` }} onClick={() => onAnswer(q.value, q.label)}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!busy && (canSkip || previous) ? (
          <div className="qst-nav">
            {previous ? (
              <button type="button" onClick={() => onBack(previous.slot)}>
                <ArrowLeft size={14} /> Back: change {word(previous.label, lang).toLowerCase()}
              </button>
            ) : <span />}
            {canSkip ? (
              <button type="button" onClick={() => onAnswer(flow.skip.value, word(flow.skip.label, lang))}>
                {word(flow.skip.label, lang)}
              </button>
            ) : null}
          </div>
        ) : null}

        <form
          className="qst-type"
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
        >
          <input
            value={input}
            onChange={(e) => onInput(e.target.value)}
            placeholder={placeholder}
            aria-label="Type your answer"
            maxLength={600}
            enterKeyHint="send"
          />
          <button type="submit" disabled={!input.trim() || busy} aria-label="Send">
            <SendHorizontal size={18} />
          </button>
        </form>

        <div className="qst-shortlist" aria-live="polite">
          <div className="qst-shortlist-head">
            <strong>🏠 Your shortlist</strong>
            <span>
              {shortlist.state === "loading"
                ? "Updating…"
                : shortlist.total
                  ? `${shortlist.total.toLocaleString("en-IN")} ${shortlist.total === 1 ? "match" : "matches"} so far`
                  : doneCount
                    ? "Looking…"
                    : "Answer to start it"}
            </span>
          </div>
          <div className="qst-cards">
            {shortlist.results?.length
              ? shortlist.results.map((card, i) => (
                  <a key={card.id} className="qst-card" href={card.url} target="_blank" rel="noopener noreferrer" style={{ animationDelay: `${i * 70}ms` }}>
                    <span className="qst-card-img">
                      {card.image ? <img src={cloudinaryUrl(card.image, { width: 320 })} alt="" loading="lazy" decoding="async" /> : <span>🏡</span>}
                      <b>{card.priceLabel}</b>
                    </span>
                    <span className="qst-card-body">
                      <strong>{card.title || "Home"}</strong>
                      <small>{[card.bhkLabel, card.sector].filter(Boolean).join(" · ")}</small>
                    </span>
                  </a>
                ))
              : Array.from({ length: 3 }).map((_, i) => <span key={i} className={`qst-card ghost${shortlist.state === "loading" ? " pulse" : ""}`} />)}
          </div>
        </div>

        <button type="button" className="qst-chat" onClick={onShowChat}>
          <MessagesSquare size={15} /> Open full chat
        </button>
      </div>

      <Confetti burst={celebrate} />
      {achievement ? (
        <div className="qst-toast" key={achievement.id} role="status">
          <span className="qst-toast-icon">{achievement.icon}</span>
          <span>
            <small>Achievement unlocked</small>
            <strong>{word(achievement.text, lang)}</strong>
          </span>
        </div>
      ) : null}
    </section>
  );
}
