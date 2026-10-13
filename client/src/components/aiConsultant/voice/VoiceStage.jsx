import React from "react";
import { Keyboard, Mic, RotateCcw, ShieldCheck, Clock, Users } from "lucide-react";
import VoiceOrb from "./VoiceOrb";

/**
 * First-run consultant screen. Real-time voice uses a bounded Redis FIFO queue;
 * the rule-based/text consultant remains available without waiting.
 */
export default function VoiceStage({ voice, onStart, onJoinQueue, onStartQueued, onLeaveQueue, onUseBasic, onTypeInstead, queue = { state: "idle" } }) {
  const { engine, permission, phase, error } = voice;
  const checking = engine === "checking";
  const unsupported = engine === "none";
  const needsPermission = permission !== "granted";
  const requesting = phase === "requesting";
  const starting = ["connecting", "requesting"].includes(phase) && !needsPermission;
  const joining = queue.state === "joining";
  const queued = queue.state === "waiting";
  const ready = queue.state === "ready";
  const queueError = queue.state === "error";
  const realTime = engine === "livekit";

  let title = "Talk to your property consultant";
  let body = "Tell me what you're looking for. I'll use GgnHome's live property data and keep your requirements as you refine them.";
  let action = null;

  if (checking) {
    title = "Getting voice ready…";
    body = "Checking the available voice service.";
  } else if (unsupported) {
    title = "Voice isn't available in this browser";
    body = "You can type instead and keep using the property consultant.";
  } else if (needsPermission) {
    title = permission === "denied" ? "Microphone is blocked" : "First, allow your microphone";
    body = permission === "denied"
      ? "Allow the microphone from the lock icon in your browser's address bar, then try again."
      : "Your browser will ask for permission. Nothing listens until you choose to start, and you can stop anytime.";
    action = { label: requesting ? "Waiting for permission…" : permission === "denied" ? "Try again" : "Allow microphone", onClick: () => voice.requestPermission(), disabled: requesting };
  } else if (realTime && joining) {
    title = "Joining the voice queue…";
    body = "Reserving your place in the queue."; 
    action = { label: "Joining queue…", onClick: onJoinQueue, disabled: true };
  } else if (realTime && ready) {
    title = "You're at the front of the queue";
    body = "Your real-time voice slot is reserved. Tap start now to connect.";
    action = { label: starting ? "Connecting…" : "Start real-time voice", onClick: onStartQueued, disabled: starting };
  } else if (realTime && queued) {
    title = "You're in the voice queue";
    body = "We'll reserve a real-time voice slot in order. You can leave the queue or continue with the standard consultant at any time.";
    action = { label: `Waiting · position ${queue.position || "…"}`, onClick: () => {}, disabled: true };
  } else if (realTime) {
    title = queueError ? "Real-time queue unavailable" : "Real-time voice";
    body = queue.message || (queueError
      ? "You can retry the queue or continue with the standard consultant."
      : "Join the fair-use queue for a real-time voice session. If all slots are busy, your place is held in Redis until your turn.");
    action = { label: queueError ? "Try queue again" : "Join voice queue", onClick: onJoinQueue, disabled: starting };
  } else {
    title = starting ? "Connecting…" : "You're all set";
    body = starting ? "Getting your browser voice ready." : "Use your browser's voice now, or continue by typing.";
    action = { label: starting ? "Connecting…" : "Start browser voice", onClick: onStart, disabled: starting };
  }

  return (
    <section className="gvs" aria-labelledby="gvs-title">
      <div className="gvs-orb">
        <VoiceOrb size="lg" phase={checking || starting || requesting ? "connecting" : error ? "error" : "off"} levelsRef={voice.levelsRef} onClick={action?.onClick} disabled={!action || action.disabled} label={action?.label || title} />
      </div>
      <p className="gvs-eyebrow">{realTime ? "REAL-TIME VOICE · FAIR QUEUE" : engine === "browser" ? "BROWSER VOICE" : "AI CONSULTANT"}</p>
      <h2 id="gvs-title">{title}</h2>
      <p className="gvs-body">{body}</p>
      {action ? <button type="button" className="gvs-primary" onClick={action.onClick} disabled={action.disabled}>{queued ? <Clock size={19} /> : <Mic size={19} />} {action.label}</button> : null}
      {queued || ready ? (
        <p className="gvs-body" aria-live="polite"><Users size={15} style={{ display: "inline", verticalAlign: "middle" }} /> {ready ? "A voice slot is ready for you." : `${queue.waiting ?? "Several"} visitor(s) are waiting. Position: ${queue.position}.`}</p>
      ) : null}
      {queued || ready ? <button type="button" className="gvs-link" onClick={onLeaveQueue}>Leave voice queue</button> : null}
      {error ? <p className="gvs-error" role="alert">{error.message}</p> : null}
      {!unsupported && !checking ? (
        <ol className="gvs-steps" aria-label="How it works">
          <li className={needsPermission ? "now" : "done"}>Allow mic</li>
          <li className={needsPermission ? "" : "now"}>{realTime ? "Wait your turn" : "Hear hello"}</li>
          <li>Talk naturally</li>
        </ol>
      ) : null}
      <button type="button" className="gvs-link" onClick={onUseBasic}>Use basic consultant (no wait; may be less flexible)</button>
      <button type="button" className="gvs-link" onClick={onTypeInstead}><Keyboard size={15} /> I'd rather type with AI assistance</button>
      <p className="gvs-foot"><ShieldCheck size={13} /> Real listings only — the consultant must not invent properties, prices or contacts.</p>
    </section>
  );
}