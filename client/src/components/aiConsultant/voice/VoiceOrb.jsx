import React, { useEffect, useRef } from "react";
import { Loader2, Mic, MicOff, Square, Volume2, AlertTriangle } from "lucide-react";
import { toneOf } from "./phases";

const ICONS = { idle: Mic, listen: Mic, hear: Mic, busy: Loader2, speak: Volume2, error: AlertTriangle };

/**
 * The voice orb. Rings follow the live microphone / assistant audio level
 * (LiveKit) or a gentle animation per phase (browser voice). Level updates
 * write a CSS variable directly, so they never re-render React.
 */
export default function VoiceOrb({ phase = "off", levelsRef, size = "lg", muted = false, onClick, label, disabled, showStop = false }) {
  const ref = useRef(null);
  const tone = toneOf(phase);

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    const tick = () => {
      const levels = levelsRef?.current ? levelsRef.current() : { mic: 0, agent: 0 };
      const target = tone === "speak" ? levels.agent : tone === "listen" || tone === "hear" ? levels.mic : 0;
      smooth = smooth * 0.75 + Math.min(1, target * 2.2) * 0.25;
      if (ref.current) ref.current.style.setProperty("--lvl", smooth.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [levelsRef, tone]);

  const Icon = showStop ? Square : muted ? MicOff : ICONS[tone] || Mic;
  return (
    <button
      type="button"
      ref={ref}
      className={`gvo gvo-${size} gvo-${tone}${muted ? " gvo-muted" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <span className="gvo-ring gvo-ring-1" aria-hidden="true" />
      <span className="gvo-ring gvo-ring-2" aria-hidden="true" />
      <span className="gvo-core" aria-hidden="true">
        <Icon size={size === "lg" ? 38 : size === "md" ? 24 : 18} className={tone === "busy" ? "gvo-spin" : undefined} />
      </span>
    </button>
  );
}
