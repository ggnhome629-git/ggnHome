import React, { useEffect, useState } from "react";
import { Keyboard, ListChecks, Mic, MicOff, RotateCcw, SendHorizontal, Volume2, VolumeX, X } from "lucide-react";
import RiyaAvatar from "./RiyaAvatar";

export const PERSONA = { name: "Riya", role: "Your GgnHome property advisor" };

const STATUS = {
  requesting: "Allow the microphone to start…",
  connecting: `${PERSONA.name} is joining…`,
  reconnecting: "One moment…",
  greeting: `${PERSONA.name} is speaking`,
  speaking: `${PERSONA.name} is speaking — tap her to interrupt`,
  listening: "Your turn — just speak",
  hearing: "Listening…",
  thinking: `${PERSONA.name} is checking…`,
  error: "Voice stopped",
};

const moodOf = (phase, muted) => {
  if (phase === "speaking" || phase === "greeting") return "speak";
  if ((phase === "listening" || phase === "hearing") && !muted) return "listen";
  if (["thinking", "connecting", "requesting", "reconnecting"].includes(phase)) return "think";
  return "idle";
};

/** Reveals Riya's line word by word while she says it, like live captions. */
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
    <p className="grs-line" aria-live="polite">
      {words.map((w, i) => (
        <span key={`${i}-${w}`} className={i < shown ? "on" : ""}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}

/**
 * The consultant as a person: Riya asks one question at a time and the visitor
 * answers by voice, by tapping an answer, or by typing. The full chat (results,
 * forms, history) is one tap away.
 */
export default function RiyaScreen({
  voice,
  start, // { label, onClick, disabled, hint } for starting voice, or null while voice is on
  question,
  lastAnswer,
  chips,
  busy,
  summary = [],
  progress,
  input,
  onInput,
  onSend,
  onChip,
  onShowChat,
  onRetry,
  voiceOn = true,
  onToggleVoice,
  placeholder,
}) {
  const { phase, muted, caption, notice, error, needsAudioUnlock } = voice;
  const on = voice.active;
  const failed = phase === "error";
  const speaking = phase === "speaking" || phase === "greeting" || (!on && voice.aloud);
  const listening = (phase === "listening" || phase === "hearing") && !muted;
  const mood = busy && !speaking ? "think" : moodOf(phase, muted);

  const assistantLine = caption?.who === "assistant" ? caption.text : question;
  const userLine = caption?.who === "user" ? caption.text : lastAnswer;
  const userInterim = caption?.who === "user" && caption.interim;
  const status = failed
    ? error?.message || "Voice stopped."
    : on
      ? muted && !speaking
        ? "You're muted — tap the mic to answer"
        : STATUS[phase] || ""
      : voice.aloud
        ? `${PERSONA.name} is speaking — tap her to stop`
        : start?.hint || "Tap the mic and talk to me, or type below.";
  const pct = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section className={`grs grs-${mood}`} aria-label={`Talking with ${PERSONA.name}`}>
      <div className="grs-scroll">
        <button
          type="button"
          className="grs-avatar"
          onClick={!on && voice.aloud ? voice.stopAloud : speaking && phase !== "greeting" ? voice.interrupt : undefined}
          aria-label={speaking ? `Interrupt ${PERSONA.name}` : PERSONA.name}
        >
          <span className="grs-halo" aria-hidden="true" />
          <RiyaAvatar mood={mood} size={150} levelsRef={voice.levelsRef} />
        </button>
        <h2 className="grs-name">{PERSONA.name}</h2>
        <p className="grs-role">{PERSONA.role}</p>
        <p className={`grs-status${listening ? " you" : ""}${failed ? " err" : ""}`} aria-live="polite">
          {listening ? <span className="grs-live" aria-hidden="true" /> : null}
          {status}
        </p>

        <div className="grs-talk">
          {assistantLine ? <SpokenLine text={assistantLine} live={speaking} /> : null}
          {userLine ? (
            <p className={`grs-you${userInterim ? " interim" : ""}`}>
              <em>You</em> {userLine}
            </p>
          ) : null}
          {notice && !failed ? <p className="grs-notice">{notice}</p> : null}
        </div>

        {chips?.list?.length && !busy ? (
          <div className="grs-chips" role="group" aria-label="Tap an answer">
            {chips.list.slice(0, 8).map((c) => (
              <button key={`${c.value}-${c.label}`} type="button" onClick={() => onChip(c)}>
                {c.label}
              </button>
            ))}
          </div>
        ) : null}

        {summary.length ? (
          <button type="button" className="grs-known" onClick={onShowChat} aria-label={`What ${PERSONA.name} has noted — open details`}>
            <span className="grs-known-head">
              <ListChecks size={14} /> {PERSONA.name} has noted
              <span className="grs-bar" style={{ "--p": `${pct}%` }} />
            </span>
            <span className="grs-known-list">
              {summary.slice(0, 8).map((row) => (
                <span key={row.slot}>{row.value}</span>
              ))}
            </span>
          </button>
        ) : null}
      </div>

      <div className="grs-dock">
        {needsAudioUnlock ? (
          <button type="button" className="grs-hear" onClick={voice.unlockAudio}>
            <Volume2 size={16} /> Tap to hear {PERSONA.name}
          </button>
        ) : null}
        <form
          className="grs-compose"
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
        >
          <button
            type="button"
            className={`grs-mic${on && !muted ? " live" : ""}`}
            onClick={failed ? onRetry : on ? voice.toggleMute : start?.onClick}
            disabled={!on && !failed && (!start || start.disabled)}
            aria-pressed={on && !muted}
            aria-label={failed ? "Try voice again" : on ? (muted ? "Unmute" : "Mute") : start?.label || "Talk"}
            title={failed ? "Try voice again" : on ? (muted ? "Unmute" : "Mute") : start?.label}
          >
            {failed ? <RotateCcw size={22} /> : on && muted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          <input
            className="grs-input"
            value={input}
            onChange={(e) => onInput(e.target.value)}
            placeholder={listening ? "Listening… or type here" : placeholder}
            aria-label={`Message ${PERSONA.name}`}
            maxLength={600}
            enterKeyHint="send"
          />
          <button type="submit" className="grs-send" disabled={!input.trim() || busy} aria-label="Send">
            <SendHorizontal size={18} />
          </button>
        </form>
        <div className="grs-links">
          {!on && start?.label ? <span className="grs-start-label">{start.label}</span> : null}
          <button type="button" onClick={onShowChat}>
            <Keyboard size={14} /> Full chat &amp; results
          </button>
          {!on && onToggleVoice ? (
            <button type="button" onClick={onToggleVoice} aria-pressed={voiceOn}>
              {voiceOn ? <Volume2 size={14} /> : <VolumeX size={14} />} {voiceOn ? `${PERSONA.name}'s voice on` : `${PERSONA.name}'s voice off`}
            </button>
          ) : null}
          {on ? (
            <button type="button" onClick={() => voice.end()}>
              <X size={14} /> Stop voice
            </button>
          ) : null}
          {start?.extra || null}
        </div>
      </div>
    </section>
  );
}
