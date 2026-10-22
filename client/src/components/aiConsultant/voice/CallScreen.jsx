import React, { useEffect, useRef, useState } from "react";
import { Keyboard, Mic, MicOff, RotateCcw, Volume2, X } from "lucide-react";
import { toneOf } from "./phases";

export const PERSONA = { name: "Riya", role: "GgnHome property advisor", initial: "R" };

const STATUS = {
  off: "",
  requesting: "Allow the microphone to start…",
  connecting: `${PERSONA.name} is joining…`,
  reconnecting: "Reconnecting…",
  greeting: `${PERSONA.name} is speaking`,
  speaking: `${PERSONA.name} is speaking · tap her to interrupt`,
  listening: "Your turn — just speak",
  hearing: "Listening…",
  thinking: `${PERSONA.name} is checking live listings…`,
  error: "Voice stopped",
};

/** Reveals the assistant's line word by word while she is saying it, like live captions. */
function SpokenLine({ text, live }) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const [shown, setShown] = useState(live ? 0 : words.length);
  useEffect(() => {
    if (!live) {
      setShown(words.length);
      return undefined;
    }
    setShown(1);
    const t = setInterval(() => setShown((n) => (n >= words.length ? n : n + 1)), 290);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, live]);
  return (
    <p className="gcs-line" aria-live="polite">
      {words.map((w, i) => (
        <span key={`${i}-${w}`} className={i < shown ? "on" : ""}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}

/**
 * Voice conversation with the consultant: she asks one question at a time and
 * the visitor simply answers, as if talking to a person. Typing, results and forms
 * live in the chat view, one tap away.
 */
export default function CallScreen({ voice, question, lastAnswer, chips, busy, summary = [], progress, onChip, onShowChat, onRetry }) {
  const { phase, muted, caption, notice, error, needsAudioUnlock } = voice;
  const tone = toneOf(phase);
  const failed = phase === "error";
  const speaking = phase === "speaking" || phase === "greeting";
  const listening = (phase === "listening" || phase === "hearing") && !muted;
  const avatarRef = useRef(null);

  // Live audio level drives the halo around the avatar (no React re-render).
  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    const tick = () => {
      const levels = voice.levelsRef?.current ? voice.levelsRef.current() : { mic: 0, agent: 0 };
      const target = speaking ? levels.agent : listening ? levels.mic : 0;
      smooth = smooth * 0.7 + Math.min(1, target * 2.4) * 0.3;
      if (avatarRef.current) avatarRef.current.style.setProperty("--lvl", smooth.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [voice.levelsRef, speaking, listening]);

  const assistantLine = caption?.who === "assistant" ? caption.text : question;
  const userLine = caption?.who === "user" ? caption.text : lastAnswer;
  const userInterim = caption?.who === "user" && caption.interim;
  const status = muted && !speaking && !failed ? "You're muted — tap the mic to answer" : STATUS[phase] || "";
  const pct = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section className={`gcs gcs-${tone}`} aria-label={`Talking with ${PERSONA.name}`}>
      <div className="gcs-top">
        <span className={`gcs-dot${failed ? " off" : ""}`} aria-hidden="true" />
        <span>{failed ? "Voice stopped" : ["connecting", "requesting"].includes(phase) ? "Getting ready" : "Live conversation"}</span>
        {voice.voiceSource ? (
          <span className="gcs-src" title={voice.voiceSource.reason || undefined}>
            {voice.voiceSource.kind === "livekit" ? "HD voice" : "Device voice"}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        ref={avatarRef}
        className={`gcs-avatar gcs-${tone}`}
        onClick={speaking && phase !== "greeting" ? voice.interrupt : undefined}
        aria-label={speaking ? `Interrupt ${PERSONA.name}` : PERSONA.name}
      >
        <span className="gcs-halo h1" aria-hidden="true" />
        <span className="gcs-halo h2" aria-hidden="true" />
        <span className="gcs-face" aria-hidden="true">
          {PERSONA.initial}
          <i className="gcs-mouth">
            <b />
            <b />
            <b />
            <b />
          </i>
        </span>
      </button>
      <h2 className="gcs-name">{PERSONA.name}</h2>
      <p className="gcs-role">{PERSONA.role}</p>
      <p className={`gcs-status${listening ? " you" : ""}`} aria-live="polite">
        {status}
      </p>

      <div className="gcs-talk">
        {failed ? (
          <p className="gcs-line err" role="alert">
            {error?.message || "The call stopped."}
          </p>
        ) : assistantLine ? (
          <SpokenLine text={assistantLine} live={speaking} />
        ) : null}
        {!failed && userLine ? (
          <p className={`gcs-you${userInterim ? " interim" : ""}`}>
            <em>You</em> {userLine}
          </p>
        ) : null}
        {notice && !failed ? <p className="gcs-notice">{notice}</p> : null}
      </div>

      {chips?.list?.length && !busy && !failed ? (
        <div className="gcs-chips" role="group" aria-label="Or tap an answer">
          {chips.list.slice(0, 6).map((c) => (
            <button key={`${c.value}-${c.label}`} type="button" onClick={() => onChip(c)}>
              {c.label}
            </button>
          ))}
        </div>
      ) : null}

      {summary.length ? (
        <div className="gcs-known" aria-label={`What ${PERSONA.name} knows so far`}>
          <div className="gcs-known-head">
            <span>{PERSONA.name} has noted</span>
            <span className="gcs-bar" style={{ "--p": `${pct}%` }} aria-label={`${pct}% of your brief`} />
          </div>
          <div className="gcs-known-list">
            {summary.slice(0, 8).map((row) => (
              <span key={row.slot} title={row.label}>
                {row.value}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="gcs-controls">
        {needsAudioUnlock ? (
          <button type="button" className="gcs-btn hear" onClick={voice.unlockAudio}>
            <Volume2 size={22} />
            <small>Tap to hear</small>
          </button>
        ) : null}
        {failed ? (
          <button type="button" className="gcs-btn" onClick={onRetry}>
            <RotateCcw size={22} />
            <small>Try again</small>
          </button>
        ) : (
          <button type="button" className={`gcs-btn${muted ? " on" : ""}`} onClick={voice.toggleMute} aria-pressed={muted}>
            {muted ? <MicOff size={22} /> : <Mic size={22} />}
            <small>{muted ? "Unmute" : "Mute"}</small>
          </button>
        )}
        <button type="button" className="gcs-btn end" onClick={() => voice.end()} aria-label="Stop voice">
          <X size={24} />
          <small>Stop voice</small>
        </button>
        <button type="button" className="gcs-btn" onClick={onShowChat}>
          <Keyboard size={22} />
          <small>Chat</small>
        </button>
      </div>
    </section>
  );
}
