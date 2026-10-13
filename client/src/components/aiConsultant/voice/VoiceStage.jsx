import React from "react";
import { Keyboard, Mic, RotateCcw, ShieldCheck } from "lucide-react";
import VoiceOrb from "./VoiceOrb";

/**
 * Centered first-run screen: allow the microphone, then start the voice
 * consultant. Nothing listens or plays until the visitor taps.
 */
export default function VoiceStage({ voice, onStart, onTypeInstead }) {
  const { engine, permission, phase, error } = voice;
  const checking = engine === "checking";
  const unsupported = engine === "none";
  const needsPermission = permission !== "granted";
  const requesting = phase === "requesting";
  const starting = ["connecting", "requesting"].includes(phase) && !needsPermission;

  let title = "Talk to your property consultant";
  let body = "Tell me what you're looking for, like you'd tell a friend. I'll search real GgnHome listings and talk you through them.";
  let action = null;

  if (checking) {
    title = "Getting voice ready…";
    body = "One moment.";
  } else if (unsupported) {
    title = "Voice isn't available in this browser";
    body = "No problem — type below and I'll help you the same way. Chrome, Edge and Safari support voice.";
  } else if (needsPermission) {
    title = permission === "denied" ? "Microphone is blocked" : "First, allow your microphone";
    body =
      permission === "denied"
        ? "Allow the microphone from the lock icon in your browser's address bar, then tap try again."
        : "Your browser will ask for permission. I only listen after you tap start, and you can mute or stop anytime.";
    action = {
      label: requesting ? "Waiting for permission…" : permission === "denied" ? "Try again" : "Allow microphone",
      onClick: () => voice.requestPermission(),
      disabled: requesting,
    };
  } else {
    title = starting ? "Connecting…" : "You're all set";
    body = starting ? "Getting your consultant on the line." : "Tap the button and I'll say hello first. Then just talk — no need to press anything between questions.";
    action = { label: starting ? "Connecting…" : "Start talking", onClick: onStart, disabled: starting };
  }

  return (
    <section className="gvs" aria-labelledby="gvs-title">
      <div className="gvs-orb">
        <VoiceOrb
          size="lg"
          phase={checking || starting || requesting ? "connecting" : error ? "error" : "off"}
          levelsRef={voice.levelsRef}
          onClick={action?.onClick}
          disabled={!action || action.disabled}
          label={action?.label || title}
        />
      </div>
      <p className="gvs-eyebrow">{engine === "livekit" ? "REAL-TIME VOICE" : engine === "browser" ? "VOICE ASSISTANT" : "AI CONSULTANT"}</p>
      <h2 id="gvs-title">{title}</h2>
      <p className="gvs-body">{body}</p>
      {action ? (
        <button type="button" className="gvs-primary" onClick={action.onClick} disabled={action.disabled}>
          {permission === "denied" ? <RotateCcw size={19} /> : <Mic size={19} />} {action.label}
        </button>
      ) : null}
      {error ? (
        <p className="gvs-error" role="alert">
          {error.message}
        </p>
      ) : null}
      {!unsupported && !checking ? (
        <ol className="gvs-steps" aria-label="How it works">
          <li className={needsPermission ? "now" : "done"}>Allow mic</li>
          <li className={needsPermission ? "" : "now"}>Hear hello</li>
          <li>Just talk</li>
        </ol>
      ) : null}
      <button type="button" className="gvs-link" onClick={onTypeInstead}>
        <Keyboard size={15} /> I'd rather type
      </button>
      <p className="gvs-foot">
        <ShieldCheck size={13} /> Real listings only — I never make up properties, prices or contacts.
      </p>
    </section>
  );
}
