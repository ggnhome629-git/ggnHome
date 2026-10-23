import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Keyboard, MessagesSquare, SendHorizontal } from "lucide-react";
import QuestBot from "./QuestBot";
import QuestScene from "./QuestScene";
import AreaPicker from "./AreaPicker";
import HomePicker from "./HomePlan";
import flow from "../../../data/questFlow.json";
import { cloudinaryUrl } from "../../../utils/cloudinaryImage";
import PropertyDrive from "./PropertyDrive";

// the 3D map world (MapLibre) is only downloaded once someone reaches it
const QuestWorld = lazy(() => import("./world/QuestWorld"));
const WORLD_SLOTS = ["location", "budget", "bhk", "priorities"];
export const QUEST_SLOTS = flow.missions.map((m) => m.slot);
const word = (value, lang) => (value && typeof value === "object" ? value[lang] || value.en : value);
const SPARK_COLOURS = ["#ffb703", "#fb8500", "#00a79d", "#2ec4b6", "#ff5d8f", "#8338ec", "#3a86ff", "#06d6a0"];

/** Smoothly counts from the last number shown to the new one. */
function CountUp({ value }) {
  const [shown, setShown] = useState(value || 0);
  const fromRef = useRef(value || 0);
  useEffect(() => {
    const from = fromRef.current;
    const to = value || 0;
    if (from === to) return undefined;
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 700);
      const eased = 1 - (1 - p) ** 3;
      setShown(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      fromRef.current = to;
    };
  }, [value]);
  return <>{shown.toLocaleString("en-IN")}</>;
}

/** A burst of sprinkles; every new `burst` value fires a fresh one. */
function Sparkles({ burst }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => {
        const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 90 + Math.random() * 170;
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 60, r: Math.random() * 600 - 300, c: SPARK_COLOURS[i % SPARK_COLOURS.length], round: i % 3 === 0, d: Math.random() * 0.12 };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burst]
  );
  if (!burst) return null;
  return (
    <div className="qsparks" key={burst} aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} className={p.round ? "round" : ""} style={{ "--x": `${p.x}px`, "--y": `${p.y}px`, "--r": `${p.r}deg`, background: p.c, animationDelay: `${p.d}s` }} />
      ))}
    </div>
  );
}

/** Types the robot's line out quickly; a tap shows all of it. */
function TypedLine({ text }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (!text) return undefined;
    const step = Math.max(1, Math.round(text.length / 40));
    const t = setInterval(() => setShown((n) => (n >= text.length ? n : n + step)), 20);
    return () => clearInterval(t);
  }, [text]);
  return (
    <p className="qline" onClick={() => setShown(text.length)}>
      <span aria-hidden="true">{text.slice(0, shown)}</span>
      <span className="qsr">{text}</span>
    </p>
  );
}

/** Budget as a slider that snaps to sensible steps, with a big readout. */
function BudgetSlider({ mission, mode, lang, onPick }) {
  const key = mode === "sale" ? "buy" : "rent";
  const steps = mission.options[key];
  const [i, setI] = useState(Math.min(3, steps.length - 1));
  const unit = word(mission.slider[key].unit, lang);
  const label = steps[i].label.replace(/^Under\s*/, "");
  return (
    <div className="qbudget">
      <p className="qbudget-value">
        <small>Up to</small>
        <strong>{label}</strong>
        {unit ? <em>{unit}</em> : null}
      </p>
      <input
        type="range"
        min="0"
        max={steps.length - 1}
        step="1"
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        style={{ "--fill": `${(i / (steps.length - 1)) * 100}%` }}
        aria-label="Budget"
        aria-valuetext={steps[i].label}
      />
      <div className="qbudget-ends">
        <span>{steps[0].label.replace(/^Under\s*/, "")}</span>
        <span>{steps[steps.length - 1].label.replace(/^Under\s*/, "")}+</span>
      </div>
      <div className="qbudget-actions">
        <button type="button" className="qpill soft" onClick={() => onPick(mission.flexible.value, word(mission.flexible.label, lang))}>
          {word(mission.flexible.label, lang)}
        </button>
        <button type="button" className="qcta" onClick={() => onPick(steps[i].value, steps[i].label)}>
          Continue
        </button>
      </div>
    </div>
  );
}

/**
 * GgnBot's quest: a few questions, one screen at a time, Duolingo-style. Big
 * tappable cards, a live count of matching homes after every answer, sprinkles
 * and a small reward per answer, and a results reveal at the end. Text and taps
 * only: no sound, no microphone.
 */
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
  req,
}) {
  const total = missions.length;
  const doneCount = missions.filter((m) => m.done).length;
  const complete = doneCount >= total;
  const [started, setStarted] = useState(doneCount > 0);
  const [typing, setTyping] = useState(false);
  const [picked, setPicked] = useState([]);
  const [chosen, setChosen] = useState(null); // the card just tapped, while the answer is sent
  const [reaction, setReaction] = useState("");
  const [worldFailed, setWorldFailed] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [collectionIds, setCollectionIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showDrive, setShowDrive] = useState(false);
  // warm the 3D map's code while the title screen is up, so "Let's go" lands in the game
  useEffect(() => {
    if (!started) import("./world/QuestWorld").catch(() => {});
  }, [started]);
  const onWorldFail = useCallback(() => setWorldFailed(true), []);
  useEffect(() => {
    setPicked([]);
    setChosen(null);
  }, [slot]);
  useEffect(() => {
    if (!celebrate) return undefined;
    const list = flow.reactions[lang] || flow.reactions.en;
    setReaction(list[celebrate % list.length]);
    const t = setTimeout(() => setReaction(""), 1600);
    return () => clearTimeout(t);
  }, [celebrate, lang]);

  const mission = flow.missions.find((m) => m.slot === slot);
  const step = Math.min(total, doneCount + 1);
  const previous = [...missions].reverse().find((m) => m.done && m.slot !== slot);
  const canSkip = flow.skip.slots.includes(slot);
  const answer = (value, label) => {
    setChosen(value);
    onAnswer(value, label);
  };

  const cards = mission?.slot === "bhk"
    ? []
    : !mission
    ? (serverChips?.list || []).map((c) => ({ value: c.value, label: c.label }))
    : Array.isArray(mission.options)
      ? mission.options.map((o) => ({ value: o.value, icon: o.icon, label: word(o.label, lang), sub: word(o.sub, lang) }))
      : [];
  const multi = mission ? Boolean(mission.multi) : Boolean(serverChips?.multi);
  const finishMulti = () => {
    if (!picked.length) return answer(mission?.done?.value || "none of these", word(mission?.done?.label, lang) || "Show homes");
    const labels = cards.filter((c) => picked.includes(c.value)).map((c) => c.label);
    return answer(picked.join(" and "), labels.join(", "));
  };

  const matchCount = shortlist.total || 0;
  const thumbs = (shortlist.results || []).filter((r) => r.image).slice(0, 3);

  /* ------------------------------------------------------------- intro */
  if (!started && !doneCount) {
    return (
      <section className="qst qst-intro" aria-label="Find your home">
        <QuestScene />
        <div className="qintro">
          <span className="qintro-v2-tag">✨ GGNHOME QUEST V2</span>
          <div className="qintro-bot">
            <QuestBot mood="happy" size={150} />
          </div>
          <h2>{word(flow.intro.title, lang)}</h2>
          <p>{word(flow.intro.sub, lang)}</p>
          <button type="button" className="qcta big" onClick={() => setStarted(true)}>
            {word(flow.intro.start, lang)} →
          </button>
          {flow.quickPicks?.length ? (
            <div className="qintro-quick">
              <span>or start from a popular search</span>
              <div className="qpills">
                {flow.quickPicks.map((q, i) => (
                  <button
                    key={q.value}
                    type="button"
                    className="qpill"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => {
                      setStarted(true);
                      answer(q.value, q.label);
                    }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  /* ------------------------------------------------------------ reveal */
  const filterEntries = Object.entries(req || {}).filter(([key, value]) => value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && !value.length) && typeof value !== "object");
  const filtersLabel = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).replace(/_/g, " ");

  const revealBody = (
    <>
      <p className="qreveal-kicker">🏆 GURGAON HOME QUEST · MISSION COMPLETE</p>
      <h2>
        {matchCount ? (
          <>
            <span className="qreveal-num">
              <CountUp value={matchCount} />
            </span>{" "}
            {matchCount === 1 ? "home matches you" : "homes match you"}
          </>
        ) : busy || shortlist.state === "loading" ? (
          "Finding your best homes…"
        ) : (
          "Your search is ready"
        )}
      </h2>
      {shortlist.results?.length ? (
        <div className="qreveal-fan">
          {shortlist.results.slice(0, 3).map((c, i) => (
            <a key={c.id} className={`qreveal-card c${i}`} href={c.url} target="_blank" rel="noopener noreferrer">
              <span className="img">{c.image ? <img src={cloudinaryUrl(c.image, { width: 360 })} alt="" loading="lazy" /> : <span>🏡</span>}</span>
              <b>{c.priceLabel}</b>
              <small>{[c.bhkLabel, c.sector].filter(Boolean).join(" · ")}</small>
            </a>
          ))}
        </div>
      ) : null}
      <button type="button" className="qcta big" onClick={() => setShowMatches(true)}>
        Open Quest Journal →
      </button>
    </>
  );

  if (complete && showMatches) {
    return (
      <section className="qst qst-reveal qst-match-results" aria-label="Matching properties">
        <div className="qreveal-panel">
          <p className="qreveal-kicker">📖 QUEST JOURNAL · YOUR DISCOVERED HOMES</p>
          <h2>{shortlist.results?.length || 0} homes discovered</h2>
          <p>Your collection of homes matching this quest. Explore a home, compare your finalists, and refine your mission with Riya.</p>
          {filterEntries.length ? (
            <div className="qmatch-filters">
              {filterEntries.map(([key, value]) => (
                <span className="qmatch-filter" key={key}><b>{filtersLabel(key)}:</b> {Array.isArray(value) ? value.join(", ") : String(value)}</span>
              ))}
            </div>
          ) : null}
          {shortlist.results?.length ? (
            <>
              <div className="qjournal-intro"><b>Quest Journal</b><span>Collect homes you like, then compare your finalists.</span></div>
              <div className="qdrive-launch-row"><span><b>🚘 Property Drive</b><small>Let Riya show you each matching home in sequence.</small></span><button type="button" className="qcta" onClick={() => setShowDrive((v) => !v)}>{showDrive ? "Close drive" : "Start property drive →"}</button></div>
              {showDrive ? <PropertyDrive listings={shortlist.results} onClose={() => setShowDrive(false)} onRefine={onShowChat} /> : null}
              <div className="qmatch-list">
                {shortlist.results.map((c, i) => {
                  const homeId = String(c.id || c.url || i);
                  const collected = collectionIds.includes(homeId);
                  return (
                    <article key={homeId} className={"qmatch-listing" + (collected ? " collected" : "")}>
                      <span className="qmatch-image">{c.image ? <img src={cloudinaryUrl(c.image, { width: 520 })} alt="" loading="lazy" /> : <span>🏡</span>}</span>
                      <span className="qmatch-info"><b>{c.priceLabel || "Price on request"}</b><strong>{[c.bhkLabel, c.propertyType, c.sector].filter(Boolean).join(" · ")}</strong><small>{[c.areaSqft ? c.areaSqft + " sq ft" : null, c.furnishing].filter(Boolean).join(" · ")}</small><a className="qmatch-open" href={c.url} target="_blank" rel="noopener noreferrer">Explore home ↗</a></span>
                      <button type="button" className="qmatch-collect" aria-pressed={collected} onClick={() => setCollectionIds((ids) => collected ? ids.filter((id) => id !== homeId) : [...ids, homeId])}>{collected ? "✓ Collected" : "+ Collect"}</button>
                    </article>
                  );
                })}
              </div>
              {collectionIds.length >= 2 ? (
                <div className="qcompare-launch"><span><b>{collectionIds.length} homes in your collection</b><small>Ready for your final face-off</small></span><button type="button" className="qcta" onClick={() => setShowCompare((value) => !value)}>{showCompare ? "Hide comparison" : "Compare homes →"}</button></div>
              ) : <p className="qcompare-hint">Collect at least 2 homes to unlock your final face-off.</p>}
              {showCompare ? (
                <div className="qcompare-table-wrap">
                  <h3>🏁 Your Home Face-Off</h3>
                  <div className="qcompare-table">
                    <div className="qcompare-row qcompare-head"><b>Details</b>{shortlist.results.filter((c, i) => collectionIds.includes(String(c.id || c.url || i))).slice(0, 3).map((c, i) => <b key={c.id || c.url || i}>{[c.bhkLabel, c.sector].filter(Boolean).join(" · ") || "Home " + (i + 1)}</b>)}</div>
                    {[
                      ["Price", (c) => c.priceLabel || "Not listed"],
                      ["Type", (c) => c.propertyType || c.bhkLabel || "Not listed"],
                      ["Area", (c) => c.areaSqft ? c.areaSqft + " sq ft" : "Not listed"],
                      ["Furnishing", (c) => c.furnishing || "Not listed"]
                    ].map(([label, getValue]) => <div className="qcompare-row" key={label}><b>{label}</b>{shortlist.results.filter((c, i) => collectionIds.includes(String(c.id || c.url || i))).slice(0, 3).map((c, i) => <span key={c.id || c.url || i}>{getValue(c)}</span>)}</div>)}
                  </div>
                  <p>Riya compares available listing details. Missing information is shown as “Not listed” rather than guessed.</p>
                </div>
              ) : null}
            </>
          ) : <p>{shortlist.state === "loading" ? "Searching listings…" : "No exact matches found for these preferences yet."}</p>}
          <button type="button" className="qcta big" onClick={onShowChat}>Refine filters in chat →</button>
          <button type="button" className="qcta" onClick={() => setShowMatches(false)}>← Back to overview</button>
        </div>
      </section>
    );
  }

  if (complete && !worldFailed) {
    return (
      <section className="qst qst-world qst-finale" aria-label="Your matches">
        <Suspense
          fallback={
            <div className="qw-loading">
              <span className="qw-globe">🗺️</span>
              Loading the map of Gurgaon…
            </div>
          }
        >
          <QuestWorld slot={null} finale mode={mode} lang={lang} req={req} busy={busy} onAnswer={answer} onFail={onWorldFail} />
        </Suspense>
        <Sparkles burst={celebrate} />
        <div className="qw-finale">
          <QuestBot mood={busy ? "think" : "happy"} size={72} />
          {revealBody}
        </div>
      </section>
    );
  }

  if (complete) {
    return (
      <section className="qst qst-reveal" aria-label="Your matches">
        <QuestScene />
        <Sparkles burst={celebrate} />
        <div className="qreveal">
          <QuestBot mood={busy ? "think" : "happy"} size={120} />
          {revealBody}
        </div>
      </section>
    );
  }

  /* ---------------------------------------------------------- question */
  const header = (
    <header className="qhead">
      <button type="button" className="qicon" onClick={() => previous && onBack(previous.slot)} disabled={!previous || busy} aria-label="Back to the previous question">
        <ArrowLeft size={20} />
      </button>
      <ol className="qprogress" aria-label={`${doneCount} of ${total} answered`}>
        {missions.map((m) => (
          <li key={m.slot} className={m.done ? "done" : m.slot === slot ? "now" : ""}>
            <span />
          </li>
        ))}
      </ol>
      <span className="qstep">
        {step}/{total}
      </span>
    </header>
  );

  const matchLine = (
    <span>
      {shortlist.state === "loading" && !matchCount ? (
        "Counting homes…"
      ) : matchCount ? (
        <>
          <strong>
            <CountUp value={matchCount} />
          </strong>{" "}
          {matchCount === 1 ? "home matches" : "homes match"} so far
        </>
      ) : (
        "Your matches appear here as you answer"
      )}
    </span>
  );

  const bubble = (
    <div className="qbubble" aria-live="polite">
      {reaction ? (
        <p className="qline qreact">{reaction}</p>
      ) : busy ? (
        <p className="qline qdots">
          <span />
          <span />
          <span />
        </p>
      ) : (
        <TypedLine text={question || word(mission?.ask, lang) || ""} />
      )}
    </div>
  );

  const cardGrid = cards.length ? (
    <div className={`qcards${cards.some((c) => c.sub) ? "" : " compact"}${cards.length === 2 ? " two" : ""}`} role="group" aria-label={multi ? "Pick one or more" : "Pick one"}>
      {cards.map((c, i) => {
        const on = multi ? picked.includes(c.value) : chosen === c.value;
        return (
          <button
            key={`${c.value}-${c.label}`}
            type="button"
            className={`qcard${on ? " on" : ""}`}
            style={{ animationDelay: `${i * 45}ms` }}
            aria-pressed={multi ? on : undefined}
            disabled={busy}
            onClick={() => (multi ? setPicked((p) => (p.includes(c.value) ? p.filter((v) => v !== c.value) : [...p, c.value])) : answer(c.value, c.label))}
          >
            {on ? (
              <span className="qcard-check" aria-hidden="true">
                <Check size={14} strokeWidth={3} />
              </span>
            ) : null}
            {c.icon ? <span className="qcard-icon">{c.icon}</span> : null}
            <span className="qcard-title">{c.label}</span>
            {c.sub ? <span className="qcard-sub">{c.sub}</span> : null}
          </button>
        );
      })}
    </div>
  ) : null;

  const typeForm = typing ? (
    <form
      className="qtype"
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
    >
      <input autoFocus value={input} onChange={(e) => onInput(e.target.value)} placeholder={placeholder} aria-label="Type your answer" maxLength={600} enterKeyHint="send" />
      <button type="submit" disabled={!input.trim() || busy} aria-label="Send">
        <SendHorizontal size={18} />
      </button>
    </form>
  ) : null;

  const links = (
    <div className="qlinks">
      {!typing ? (
        <button type="button" onClick={() => setTyping(true)}>
          <Keyboard size={15} /> Type instead
        </button>
      ) : null}
      {canSkip && !busy ? (
        <button type="button" onClick={() => answer(flow.skip.value, word(flow.skip.label, lang))}>
          {word(flow.skip.label, lang)}
        </button>
      ) : null}
      <button type="button" onClick={onShowChat}>
        <MessagesSquare size={15} /> Chat
      </button>
    </div>
  );

  const toast = achievement ? (
    <div className="qtoast" key={achievement.id} role="status">
      <span>{achievement.icon}</span>
      <strong>{word(achievement.text, lang)}</strong>
    </div>
  ) : null;

  /* ------------------------------------------- the 3D map world (after rent/buy) */
  if (!worldFailed) {
    const inWorldSlot = WORLD_SLOTS.includes(slot);
    return (
      <section className="qst qst-world" aria-label={`Question ${step} of ${total}`}>
        <Suspense
          fallback={
            <div className="qw-loading">
              <span className="qw-globe">🗺️</span>
              Loading the map of Gurgaon…
            </div>
          }
        >
          <QuestWorld slot={slot} mode={mode} lang={lang} req={req} busy={busy} onAnswer={answer} onFail={onWorldFail} />
        </Suspense>
        <Sparkles burst={celebrate} />

        <div className="qw-top">
          {header}
          <div className="qw-ask" key={slot || "free"}>
            <div className="qask-bot">
              <QuestBot mood={busy ? "think" : reaction ? "happy" : "idle"} size={52} />
            </div>
            {bubble}
          </div>
          <div className="qw-meta">
            <span className="qw-count">🏠 {matchLine}</span>
            {links}
          </div>
          {typeForm}
        </div>

        {!inWorldSlot && !busy && (cardGrid || multi) ? (
          <div className="qw-panel qw-sheet" key={slot || "free"}>
            {cardGrid}
            {multi ? (
              <button type="button" className="qcta wide" onClick={finishMulti}>
                {picked.length ? `Continue with ${picked.length} →` : word(mission?.done?.label, lang) || "Continue →"}
              </button>
            ) : null}
          </div>
        ) : null}
        {toast}
      </section>
    );
  }

  return (
    <section className="qst" aria-label={`Question ${step} of ${total}`}>
      <QuestScene />
      <Sparkles burst={celebrate} />

      {header}

      <div className="qmatch" aria-live="polite">
        {thumbs.length ? (
          <span className="qmatch-thumbs" aria-hidden="true">
            {thumbs.map((t) => (
              <img key={t.id} src={cloudinaryUrl(t.image, { width: 80 })} alt="" />
            ))}
          </span>
        ) : (
          <span className="qmatch-icon" aria-hidden="true">🏠</span>
        )}
        {matchLine}
      </div>

      <div className="qbody" key={slot || "free"}>
        <div className="qask">
          <div className="qask-bot">
            <QuestBot mood={busy ? "think" : reaction ? "happy" : "idle"} size={84} />
          </div>
          {bubble}
        </div>

        {!busy && mission?.slot === "location" ? <AreaPicker mission={mission} mode={mode} lang={lang} onPick={answer} disabled={busy} /> : null}
        {!busy && mission?.slot === "bhk" ? <HomePicker mission={mission} lang={lang} onPick={answer} /> : null}
        {!busy && mission?.slot === "budget" ? <BudgetSlider mission={mission} mode={mode} lang={lang} onPick={answer} /> : null}

        {cardGrid}
      </div>

      <footer className="qfoot">
        {multi && !busy ? (
          <button type="button" className="qcta wide" onClick={finishMulti}>
            {picked.length ? `Continue with ${picked.length} →` : word(mission?.done?.label, lang) || "Continue →"}
          </button>
        ) : null}
        {typeForm}
        {links}
      </footer>

      {toast}
    </section>
  );
}
