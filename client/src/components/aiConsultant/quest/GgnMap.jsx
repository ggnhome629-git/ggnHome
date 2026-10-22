import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Home, Minus, Plus, Search, X } from "lucide-react";
import { WORLD } from "./gurgaonMap";

const FIT = { x: 190, y: 50, w: 1220, h: 1010 };
const HQ = { x: 700, y: 1000 };
const ZONE_COLOURS = ["#8d6e63", "#3a86ff", "#00a79d", "#ff5d8f", "#fb8500", "#8338ec", "#2ec4b6", "#06a77d", "#ffb703"];
const LABEL_ZOOM = 1.45; // pin names appear from here
const PIN_ZOOM = 1.15; // below this a tap on a pin opens its district instead
const MAX_ZOOM = 4;

// the same orientation roads as the old schematic, mapped into world units
const ROADS = [
  [[20, 18], [320, 210]],
  [[262, 40], [292, 108], [270, 170]],
  [[78, 42], [160, 62], [262, 40]],
  [[214, 104], [184, 160], [104, 200]],
].map((pts) => pts.map(([x, y]) => `${x * 4.2 + 30} ${y * 4.2 + 40}`)).map((p) => `M${p.join(" L")}`);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const SCAN_HOUSES = [
  [-30, -10], [26, -18], [-14, 22], [32, 14], [0, -34], [-38, 14],
];

/** GgnHome's agent: a smiling pilot in a little plane. Faces right; the caller flips and tilts it. */
function Agent() {
  return (
    <g className="gm-agent-body">
      <ellipse cx="2" cy="20" rx="16" ry="3.5" className="gm-shadow" />
      <path d="M-22 4 L-34 -4 L-34 8 Z" className="gm-tail" />
      <path d="M-24 8 Q-26 -4 -8 -6 L18 -6 Q34 -4 34 4 Q34 12 18 12 L-12 12 Q-22 12 -24 8 Z" className="gm-hull" />
      <path d="M-6 6 L-16 22 L-6 22 L10 6 Z" className="gm-wing" />
      <circle cx="12" cy="-6" r="9.5" className="gm-head" />
      <path d="M3 -9 Q12 -22 21 -9 Z" className="gm-cap" />
      <circle cx="9" cy="-6" r="1.4" className="gm-eye" />
      <circle cx="15.5" cy="-6" r="1.4" className="gm-eye" />
      <path d="M8.5 -2 Q12 1 16 -2" className="gm-smile" />
      <g className="gm-prop">
        <rect x="32" y="-9" width="3" height="20" rx="1.5" />
      </g>
    </g>
  );
}

/**
 * The game map: all of Gurgaon as a pannable, zoomable world of districts and
 * sector pins. Tap a district to zoom in, tap a house to pick it (or search),
 * and GgnHome's agent flies there and scouts the sector before we ask the next
 * question. Pan/zoom/flight write straight to the SVG so it stays smooth.
 */
export default function GgnMap({ layout, target, focus, near, disabled, onFly, onArrive, onUseText }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const worldRef = useRef(null);
  const agentRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const cam = useRef({ x: 0, y: 0, k: 1 });
  const agentPos = useRef({ ...HQ, rot: 0, flip: 1 });
  const raf = useRef(0);
  const timers = useRef([]);
  const pointers = useRef(new Map());
  const gesture = useRef({ moved: false, startDist: 0, startK: 1 });
  const [phase, setPhase] = useState("idle"); // idle | flying | scanning | found
  const [flight, setFlight] = useState(null); // { pin, trail }
  const [selected, setSelected] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [zoomed, setZoomed] = useState(false);
  const arrivedRef = useRef(false);

  const { districts, pins } = layout;
  const colourOf = useMemo(() => Object.fromEntries(districts.map((d, i) => [d.id, ZONE_COLOURS[i % ZONE_COLOURS.length]])), [districts]);

  /* --------------------------------------------------------- camera */
  const fitCam = useCallback(() => {
    const k = Math.min(size.w / FIT.w, size.h / FIT.h);
    return { k, x: (size.w - FIT.w * k) / 2 - FIT.x * k, y: (size.h - FIT.h * k) / 2 - FIT.y * k };
  }, [size]);

  const writeAgent = useCallback(() => {
    const a = agentPos.current;
    const s = clamp(1.15 / Math.sqrt(cam.current.k), 0.8, 2.1);
    agentRef.current?.setAttribute("transform", `translate(${a.x} ${a.y}) rotate(${a.rot}) scale(${a.flip * s} ${s})`);
  }, []);

  const applyCam = useCallback(() => {
    const { x, y, k } = cam.current;
    worldRef.current?.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
    const svg = svgRef.current;
    if (svg) {
      svg.style.setProperty("--inv", String(1 / k));
      svg.style.setProperty("--pin", String(clamp(k ** -0.7, 0.75, 2)));
    }
    setZoomed(k >= LABEL_ZOOM);
    writeAgent();
  }, [writeAgent]);

  const keepInside = useCallback(
    (c) => {
      const slackX = size.w * 0.35;
      const slackY = size.h * 0.35;
      const minX = Math.min(0, size.w - WORLD.w * c.k) - slackX;
      const maxX = Math.max(0, size.w - WORLD.w * c.k) + slackX - 180 * c.k;
      const minY = Math.min(0, size.h - WORLD.h * c.k) - slackY;
      const maxY = Math.max(0, size.h - WORLD.h * c.k) + slackY;
      return { ...c, x: clamp(c.x, minX, Math.max(minX, maxX)), y: clamp(c.y, minY, Math.max(minY, maxY)) };
    },
    [size]
  );

  const stopMotion = useCallback(() => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const animateCam = useCallback(
    (to, ms) => {
      cancelAnimationFrame(raf.current);
      const from = { ...cam.current };
      if (reducedMotion() || ms <= 0) {
        cam.current = to;
        applyCam();
        return;
      }
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / ms);
        const e = ease(p);
        cam.current = { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), k: lerp(from.k, to.k, e) };
        applyCam();
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    },
    [applyCam]
  );

  const centerOn = useCallback((wx, wy, k) => ({ k, x: size.w / 2 - wx * k, y: size.h / 2 - wy * k }), [size]);

  const zoomBy = useCallback(
    (factor, cx = size.w / 2, cy = size.h / 2) => {
      const c = cam.current;
      const k = clamp(c.k * factor, fitCam().k * 0.9, MAX_ZOOM);
      const wx = (cx - c.x) / c.k;
      const wy = (cy - c.y) / c.k;
      cam.current = keepInside({ k, x: cx - wx * k, y: cy - wy * k });
      applyCam();
    },
    [size, fitCam, keepInside, applyCam]
  );

  const focusDistrict = useCallback(
    (id) => {
      const d = districts.find((x) => x.id === id);
      if (!d) return;
      const k = clamp(Math.min(size.w, size.h) / (d.radius * 2.3), 1.4, 3);
      animateCam(centerOn(d.x, d.y, k), 700);
    },
    [districts, size, animateCam, centerOn]
  );

  /* ---------------------------------------------------- measure + init */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size.w || !size.h) return;
    cam.current = fitCam();
    applyCam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h]);

  useEffect(() => () => stopMotion(), [stopMotion]);

  useEffect(() => {
    if (focus?.id && size.w) focusDistrict(focus.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  // the wheel needs a non-passive listener to stop the page scrolling under the map
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  /* ----------------------------------------------------------- flight */
  const arrive = useCallback(
    (pin) => {
      if (arrivedRef.current) return;
      arrivedRef.current = true;
      stopMotion();
      onArrive(pin.value, pin.label);
    },
    [onArrive, stopMotion]
  );

  useEffect(() => {
    if (!target?.pin || !size.w) return undefined;
    const pin = target.pin;
    stopMotion();
    arrivedRef.current = false;
    setSelected(null);
    setSearchOpen(false);

    const from = { x: agentPos.current.x, y: agentPos.current.y };
    const dx = pin.x - from.x;
    const dy = pin.y - from.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const bend = Math.min(190, dist * 0.34) * (dx >= 0 ? -1 : 1);
    const ctrl = { x: (from.x + pin.x) / 2 + (-dy / dist) * bend, y: (from.y + pin.y) / 2 + (dx / dist) * bend };
    const at = (t) => {
      const u = 1 - t;
      return { x: u * u * from.x + 2 * u * t * ctrl.x + t * t * pin.x, y: u * u * from.y + 2 * u * t * ctrl.y + t * t * pin.y };
    };
    setFlight({ pin, trail: `M${from.x} ${from.y} Q${ctrl.x} ${ctrl.y} ${pin.x} ${pin.y}` });

    const scout = () => {
      setPhase("scanning");
      timers.current.push(setTimeout(() => setPhase("found"), 1500));
      timers.current.push(setTimeout(() => arrive(pin), 2300));
    };

    if (reducedMotion()) {
      agentPos.current = { x: pin.x, y: pin.y, rot: 0, flip: 1 };
      cam.current = centerOn(pin.x, pin.y, 2.4);
      applyCam();
      setPhase("scanning");
      timers.current.push(setTimeout(() => arrive(pin), 900));
      return stopMotion;
    }

    setPhase("flying");
    const k0 = cam.current.k;
    const kMid = Math.max(k0, 1.05);
    const ms = clamp(1500 + dist * 2.4, 1700, 3400);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      const t = ease(p);
      const pos = at(t);
      const ahead = at(Math.min(1, t + 0.02));
      const tx = ahead.x - pos.x;
      const ty = ahead.y - pos.y;
      const flip = tx < 0 ? -1 : 1;
      const theta = (Math.atan2(ty, tx) * 180) / Math.PI;
      const rot = clamp(flip === 1 ? theta : ((theta + 360) % 360) - 180, -32, 32);
      agentPos.current = { x: pos.x, y: pos.y, rot: Number.isFinite(rot) ? rot : 0, flip };
      const k = p < 0.7 ? lerp(k0, kMid, ease(p / 0.7)) : lerp(kMid, 2.4, ease((p - 0.7) / 0.3));
      cam.current = centerOn(pos.x, pos.y, k);
      applyCam();
      if (p < 1) raf.current = requestAnimationFrame(step);
      else {
        agentPos.current = { ...agentPos.current, rot: 0 };
        writeAgent();
        scout();
      }
    };
    raf.current = requestAnimationFrame(step);
    return stopMotion;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.nonce, size.w > 0]);

  /* ------------------------------------------------------ interaction */
  const busy = disabled || phase === "flying" || phase === "scanning" || phase === "found";

  const onPointerDown = (e) => {
    if (busy || e.target.closest?.(".gm-ui")) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current.moved = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.startDist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.startK = cam.current.k;
    }
  };
  const onPointerMove = (e) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || busy) return;
    const now = { x: e.clientX, y: e.clientY };
    if (pointers.current.size === 2) {
      pointers.current.set(e.pointerId, now);
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = wrapRef.current.getBoundingClientRect();
      if (gesture.current.startDist) zoomBy((gesture.current.startK * d) / gesture.current.startDist / cam.current.k, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      gesture.current.moved = true;
      return;
    }
    const dx = now.x - prev.x;
    const dy = now.y - prev.y;
    if (!gesture.current.moved && Math.hypot(dx, dy) < 5) return;
    if (!gesture.current.moved) {
      gesture.current.moved = true;
      cancelAnimationFrame(raf.current);
      try {
        wrapRef.current.setPointerCapture(e.pointerId);
      } catch (_) {
        // not capturable (e.g. a synthetic event) — dragging still works while over the map
      }
    }
    pointers.current.set(e.pointerId, now);
    cam.current = keepInside({ ...cam.current, x: cam.current.x + dx, y: cam.current.y + dy });
    applyCam();
  };
  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.startDist = 0;
  };
  const tapped = () => !gesture.current.moved;

  const onPinTap = (pin) => {
    if (busy || !tapped()) return;
    if (cam.current.k < PIN_ZOOM) {
      focusDistrict(pin.zone);
      return;
    }
    setSelected(pin);
  };
  const onDistrictTap = (d) => {
    if (busy || !tapped()) return;
    setSelected(null);
    focusDistrict(d.id);
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^sec(tor)?\s*/, "");
    if (!q) return [];
    return pins.filter((p) => p.label.toLowerCase().includes(q)).slice(0, 7);
  }, [pins, query]);

  const pinFlight = (pin) => {
    setQuery("");
    onFly(pin);
  };

  const caption =
    phase === "flying"
      ? `Flying to ${flight?.pin.label}…`
      : phase === "scanning"
        ? `Scouting ${flight?.pin.label} for your perfect home…`
        : phase === "found"
          ? `Found homes in ${flight?.pin.label}!`
          : null;

  return (
    <div
      className={`gm${zoomed ? " zoomed" : ""}${busy ? " busy" : ""}`}
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg ref={svgRef} className="gm-svg" width={size.w || "100%"} height={size.h || "100%"} role="group" aria-label="Map of Gurgaon">
        <defs>
          <radialGradient id="gm-land" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#f3f8ec" />
            <stop offset="100%" stopColor="#dcebd2" />
          </radialGradient>
        </defs>
        <rect className="gm-sea" width="100%" height="100%" />
        <g ref={worldRef}>
          <rect className="gm-land" x={FIT.x - 30} y={FIT.y - 20} width={FIT.w + 60} height={FIT.h + 40} rx="120" fill="url(#gm-land)" />
          {ROADS.map((d) => (
            <path key={d} className="gm-road" d={d} />
          ))}
          <text className="gm-nh" x={1290} y={880}>NH-48</text>

          {districts.map((d) => (
            <g key={d.id} className={`gm-district${near?.zones?.has(d.id) ? " near" : ""}`} onClick={() => onDistrictTap(d)}>
              <circle cx={d.x} cy={d.y} r={d.radius} fill={colourOf[d.id]} />
              <text className="gm-dname" x={d.x} y={d.y - d.radius - 8}>
                {d.emoji} {d.short}
              </text>
            </g>
          ))}

          {flight && phase !== "idle" ? <path className="gm-trail" d={flight.trail} /> : null}

          <g className="gm-hq" transform={`translate(${HQ.x} ${HQ.y})`}>
            <g className="gm-pin-g">
              <path d="M-14 4 L0 -10 L14 4 V14 H-14 Z" />
              <text y="-16">GgnHome HQ</text>
            </g>
          </g>

          {pins.map((p) => {
            const on = selected?.value === p.value;
            const isNear = near?.values?.has(p.value.toLowerCase());
            return (
              <g key={`${p.zone}-${p.value}`} transform={`translate(${p.x} ${p.y})`} className={`gm-pin${on ? " on" : ""}${isNear ? " near" : ""}`} onClick={() => onPinTap(p)}>
                <g className="gm-pin-g" style={{ color: colourOf[p.zone] }}>
                  <circle className="gm-hit" r="13" />
                  <path className="gm-house" d="M-6 1.5 L0 -5.5 L6 1.5 V6.5 H-6 Z" />
                  <path className="gm-door" d="M-1.4 6.5 V2.5 H1.4 V6.5 Z" />
                  <text className="gm-pname" y="-9">{p.label}</text>
                </g>
              </g>
            );
          })}

          {flight && (phase === "scanning" || phase === "found") ? (
            <g transform={`translate(${flight.pin.x} ${flight.pin.y})`} className={`gm-scan ${phase}`}>
              <circle className="gm-ring r1" r="16" />
              <circle className="gm-ring r2" r="16" />
              {SCAN_HOUSES.map(([hx, hy], i) => (
                <text key={i} className="gm-pop" x={hx} y={hy} style={{ animationDelay: `${0.15 + i * 0.16}s` }}>
                  {i === 2 ? "🔎" : "🏠"}
                </text>
              ))}
              <text className="gm-found" y="-44">🎯</text>
            </g>
          ) : null}

          <g ref={agentRef} className={`gm-agent${phase === "flying" ? " flying" : ""}`}>
            <Agent />
          </g>
        </g>
      </svg>

      <div className="gm-ui gm-tools">
        <button type="button" onClick={() => setSearchOpen((o) => !o)} aria-label="Search for a sector" aria-expanded={searchOpen} className={searchOpen ? "on" : ""} disabled={busy}>
          <Search size={18} />
        </button>
        <button type="button" onClick={() => zoomBy(1.4)} aria-label="Zoom in" disabled={busy}>
          <Plus size={18} />
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out" disabled={busy}>
          <Minus size={18} />
        </button>
        <button type="button" onClick={() => animateCam(fitCam(), 600)} aria-label="Show all of Gurgaon" disabled={busy}>
          <Home size={18} />
        </button>
      </div>

      {searchOpen && !busy ? (
        <div className="gm-ui gm-search" role="search">
          <label>
            <Search size={16} aria-hidden="true" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a sector — e.g. 57, DLF, Sohna" aria-label="Search sector or area" />
            <button type="button" onClick={() => { setQuery(""); setSearchOpen(false); }} aria-label="Close search">
              <X size={16} />
            </button>
          </label>
          {query.trim() ? (
            <ul>
              {matches.map((p) => (
                <li key={`${p.zone}-${p.value}`}>
                  <button type="button" onClick={() => pinFlight(p)}>
                    <span>✈</span> {p.label}
                    <small>{districts.find((d) => d.id === p.zone)?.short}</small>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className="use" onClick={() => onUseText(query.trim())}>
                  Use “{query.trim()}” →
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="gm-ui gm-bar" aria-live="polite">
        {caption ? (
          <>
            <span className={`gm-cap ${phase}`}>{caption}</span>
            {flight ? (
              <button type="button" onClick={() => arrive(flight.pin)}>
                Skip ›
              </button>
            ) : null}
          </>
        ) : selected ? (
          <>
            <span className="gm-cap">
              <b>{selected.label}</b>
            </span>
            <button type="button" className="go" onClick={() => onFly(selected)}>
              ✈ Fly here
            </button>
            <button type="button" className="x" onClick={() => setSelected(null)} aria-label="Cancel">
              <X size={15} />
            </button>
          </>
        ) : (
          <span className="gm-hint">{zoomed ? "Tap a house, then fly there" : "Tap a district to zoom in · or use search"}</span>
        )}
      </div>
    </div>
  );
}
