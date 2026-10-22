/** Human copy for every voice phase. `tone` drives the orb's colour/animation. */
export const PHASES = {
  off: { label: "Voice is off", tone: "idle" },
  requesting: { label: "Waiting for microphone permission…", tone: "busy" },
  connecting: { label: "Riya is joining…", tone: "busy" },
  greeting: { label: "Saying hello…", tone: "speak" },
  listening: { label: "Your turn — Riya is listening", tone: "listen" },
  hearing: { label: "Hearing you…", tone: "hear" },
  thinking: { label: "Riya is checking live listings…", tone: "busy" },
  speaking: { label: "Riya is speaking", tone: "speak" },
  reconnecting: { label: "Reconnecting…", tone: "busy" },
  error: { label: "Voice stopped", tone: "error" },
};

export function phaseLabel(voice) {
  const meta = PHASES[voice.phase] || PHASES.off;
  if (voice.phase === "speaking") return "Speaking — tap to interrupt";
  if (voice.muted && ["listening", "hearing"].includes(voice.phase)) return "Mic muted — tap unmute to talk";
  return meta.label;
}

export const toneOf = (phase) => (PHASES[phase] || PHASES.off).tone;
