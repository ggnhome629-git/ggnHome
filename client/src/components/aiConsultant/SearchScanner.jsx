import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrainCircuit, Check, Filter, MapPinned, Radar, Sparkles } from "lucide-react";

const ICONS = { BrainCircuit, Radar, Filter, MapPinned, Sparkles };

// Shown until the server's localized stage list arrives with the results.
const FALLBACK_STAGES = [
  { id: "understand", icon: "BrainCircuit", durationMs: 700, label: "Understanding your requirements" },
  { id: "scan", icon: "Radar", durationMs: 900, label: "Scanning live Gurgaon listings" },
  { id: "filter", icon: "Filter", durationMs: 800, label: "Applying your must-haves" },
  { id: "amenities", icon: "MapPinned", durationMs: 900, label: "Measuring market, metro, hospital, school, park & mall" },
  { id: "rank", icon: "Sparkles", durationMs: 800, label: "Scoring and ranking the best fits" },
];
const FAST_STEP_MS = 420;

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target)) return undefined;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/**
 * Multi-stage "AI at work" view. It animates while the search request is in
 * flight, then reveals the real pipeline numbers returned by the server and
 * calls onDone once every stage has completed.
 */
export default function SearchScanner({ response, criteria, tips = [], onDone }) {
  const stages = response?.stages?.length ? response.stages : FALLBACK_STAGES;
  const [active, setActive] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const doneRef = useRef(false);
  const responseRef = useRef(response);
  responseRef.current = response;

  // Advance through stages; the last one waits for the server.
  useEffect(() => {
    if (active >= stages.length) {
      if (!doneRef.current && responseRef.current) {
        doneRef.current = true;
        const t = setTimeout(() => onDone && onDone(), 350);
        return () => clearTimeout(t);
      }
      return undefined;
    }
    const isLast = active === stages.length - 1;
    if (isLast && !responseRef.current) return undefined; // hold on "ranking" until data lands
    const base = stages[active].durationMs || 800;
    const t = setTimeout(() => setActive((a) => a + 1), response ? Math.min(base, FAST_STEP_MS + 200) : base);
    return () => clearTimeout(t);
  }, [active, stages, response, onDone]);

  useEffect(() => {
    if (!tips.length) return undefined;
    const t = setInterval(() => setTipIndex((i) => (i + 1) % tips.length), 2600);
    return () => clearInterval(t);
  }, [tips.length]);

  const scanned = response?.stats?.scanned;
  const shown = useCountUp(Number.isFinite(scanned) ? scanned : NaN, 1100);
  const pct = Math.round((Math.min(active, stages.length) / stages.length) * 100);
  const blips = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i * 137.5 * Math.PI) / 180;
        const r = 18 + ((i * 29) % 30);
        return { left: 50 + r * Math.cos(angle), top: 50 + r * Math.sin(angle), delay: (i * 0.37) % 2.2 };
      }),
    []
  );
  const hits = Math.min(blips.length, response?.results?.length || 0);

  return (
    <div className="gai-scanner" role="status" aria-live="polite" aria-label="Searching for matching properties">
      <div className="gai-radar" aria-hidden="true">
        <div className="gai-sweep" />
        {blips.map((b, i) => (
          <span key={i} className={`gai-blip${i < hits && active >= stages.length - 1 ? " hit" : ""}`} style={{ left: `${b.left}%`, top: `${b.top}%`, animationDelay: `${b.delay}s` }} />
        ))}
        <div className="gai-radar-core">
          <div>
            <b>{Number.isFinite(scanned) ? shown.toLocaleString("en-IN") : "···"}</b>
            <small>listings scanned</small>
          </div>
        </div>
      </div>

      <div className="gai-stages">
        <h3>
          <Sparkles size={16} color="#22d3ee" /> AI is finding your best matches
        </h3>
        {criteria ? <div className="gai-code">› match({criteria})</div> : null}
        <div className="gai-bar" aria-hidden="true">
          <i style={{ width: `${Math.max(6, pct)}%` }} />
        </div>
        {stages.map((st, i) => {
          const Icon = ICONS[st.icon] || Sparkles;
          const state = i < active ? "done" : i === active ? "active" : "";
          return (
            <div key={st.id} className={`gai-stage ${state}`}>
              <span className="gai-stage-icon">{state === "done" ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}</span>
              <span className="gai-stage-text">
                <strong>{st.label}</strong>
                <small>{state === "done" && st.detail ? st.detail : state === "active" ? "working…" : " "}</small>
              </span>
            </div>
          );
        })}
        {tips.length ? (
          <div className="gai-tip" key={tipIndex}>
            💡 {(() => {
              const t = tips[tipIndex].replace(/^(Tip|सुझाव):\s*/, "");
              return t.charAt(0).toUpperCase() + t.slice(1);
            })()}
          </div>
        ) : null}
      </div>
    </div>
  );
}
