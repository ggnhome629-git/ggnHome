import React from "react";
import { Mic, MicOff, PhoneOff, RotateCcw, Square, Volume2 } from "lucide-react";
import VoiceOrb from "./VoiceOrb";
import { phaseLabel } from "./phases";

/**
 * Live voice status during a session: orb, what's happening, the live caption
 * and the only controls voice needs — mute, stop talking, end, retry.
 */
export default function VoiceBar({ voice, onStart, compact = false }) {
  const { phase, muted, caption, notice, error, needsAudioUnlock } = voice;
  const off = phase === "off";
  const failed = phase === "error";
  const speaking = phase === "speaking" || phase === "greeting";

  if (off && !voice.supported) return null;

  const orbClick = off ? onStart : failed ? voice.retry : speaking ? voice.interrupt : voice.toggleMute;
  const orbLabel = off ? "Start talking" : failed ? "Retry voice" : speaking ? "Stop speaking" : muted ? "Unmute microphone" : "Mute microphone";

  return (
    <div className={`gvb${compact ? " gvb-compact" : ""} gvb-${phase}`} role="region" aria-label="Voice assistant">
      <VoiceOrb size={compact ? "sm" : "md"} phase={phase} muted={muted} levelsRef={voice.levelsRef} onClick={orbClick} label={orbLabel} showStop={speaking && phase !== "greeting"} />
      <div className="gvb-text">
        <strong aria-live="polite">{failed ? error?.message || "Voice stopped" : off ? "Voice is off" : phaseLabel(voice)}</strong>
        {caption && !off && !failed ? (
          <span className={`gvb-caption ${caption.who}${caption.interim ? " interim" : ""}`}>
            {caption.who === "user" ? "You: " : ""}
            {caption.text}
          </span>
        ) : notice ? (
          <span className="gvb-caption notice">{notice}</span>
        ) : off ? (
          <span className="gvb-caption">Tap the mic to talk instead of typing.</span>
        ) : null}
      </div>
      <div className="gvb-actions">
        {needsAudioUnlock ? (
          <button type="button" className="gvb-btn primary" onClick={voice.unlockAudio}>
            <Volume2 size={15} /> Tap to hear
          </button>
        ) : null}
        {off ? (
          <button type="button" className="gvb-btn primary" onClick={onStart} disabled={!voice.supported}>
            <Mic size={15} /> {compact ? "Talk" : "Start talking"}
          </button>
        ) : failed ? (
          <>
            <button type="button" className="gvb-btn primary" onClick={voice.retry}>
              <RotateCcw size={15} /> Retry
            </button>
            <button type="button" className="gvb-btn" onClick={() => voice.end()} aria-label="Turn voice off">
              <PhoneOff size={15} />
            </button>
          </>
        ) : (
          <>
            {speaking && phase !== "greeting" ? (
              <button type="button" className="gvb-btn" onClick={voice.interrupt}>
                <Square size={13} /> {compact ? "" : "Stop"}
              </button>
            ) : null}
            <button type="button" className={`gvb-btn${muted ? " on" : ""}`} onClick={voice.toggleMute} aria-pressed={muted} aria-label={muted ? "Unmute microphone" : "Mute microphone"}>
              {muted ? <MicOff size={15} /> : <Mic size={15} />} {compact ? "" : muted ? "Unmute" : "Mute"}
            </button>
            <button type="button" className="gvb-btn end" onClick={() => voice.end()} aria-label="End voice">
              <PhoneOff size={15} /> {compact ? "" : "End"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
