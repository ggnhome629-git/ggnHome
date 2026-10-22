import React, { useEffect, useId, useRef } from "react";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Riya, the consultant, drawn as a friendly illustrated young woman. `mood`
 * animates her: "speak" moves her lips syllable by syllable (following the real
 * voice level when `levelsRef` has one), with small head movements; "listen"
 * tilts her head; "think" glances up. She blinks at natural, uneven intervals.
 */
export default function RiyaAvatar({ mood = "idle", size = 160, levelsRef }) {
  const uid = useId().replace(/:/g, "");
  const id = (name) => `rya-${name}-${uid}`;
  const headRef = useRef(null);
  const mouthRef = useRef(null);
  const smileRef = useRef(null);
  const eyesRef = useRef(null);
  const browsRef = useRef(null);

  // Natural blinking: every 2.5–6 s, sometimes twice.
  useEffect(() => {
    if (reducedMotion()) return undefined;
    let timer;
    const blink = (again) => {
      const eyes = eyesRef.current;
      if (eyes) {
        eyes.classList.add("shut");
        setTimeout(() => eyes.classList.remove("shut"), 120);
      }
      timer = setTimeout(() => blink(Math.random() < 0.18), again ? 260 : 2500 + Math.random() * 3500);
    };
    timer = setTimeout(() => blink(false), 1200 + Math.random() * 2000);
    return () => clearTimeout(timer);
  }, []);

  // Lip movement while she talks.
  useEffect(() => {
    const head = headRef.current;
    const mouth = mouthRef.current;
    const smile = smileRef.current;
    const brows = browsRef.current;
    if (!head || !mouth || !smile) return undefined;
    const rest = () => {
      head.style.transform = "";
      mouth.style.transform = "scale(1, 0.05)";
      mouth.style.opacity = "0";
      smile.style.opacity = "1";
      if (brows) brows.style.transform = "";
    };
    if (mood !== "speak" || reducedMotion()) {
      rest();
      return undefined;
    }
    let raf = 0;
    let open = 0;
    let syllable = { start: performance.now(), dur: 160, amp: 0.8, width: 1, pause: false };
    let browUntil = 0;
    const nextSyllable = (now) => {
      // Short closed gaps between words, now and then a slightly longer breath.
      const pause = Math.random() < 0.16;
      syllable = {
        start: now,
        dur: pause ? 140 + Math.random() * 200 : 110 + Math.random() * 130,
        amp: pause ? 0 : 0.35 + Math.random() * 0.65,
        width: 0.8 + Math.random() * 0.35,
        pause,
      };
      if (!pause && Math.random() < 0.06) browUntil = now + 420; // a little emphasis
    };
    const tick = (now) => {
      if (now - syllable.start >= syllable.dur) nextSyllable(now);
      const level = levelsRef?.current ? levelsRef.current().agent || 0 : 0;
      const p = (now - syllable.start) / syllable.dur;
      // Follow the real voice when we can hear it; otherwise talk in syllables.
      const target = level > 0.02 ? Math.min(1, level * 3) : syllable.amp * Math.sin(Math.PI * Math.min(1, p));
      open += (target - open) * 0.45;
      mouth.style.opacity = open > 0.06 ? "1" : "0";
      smile.style.opacity = open > 0.06 ? "0" : "1";
      mouth.style.transform = `scale(${syllable.width.toFixed(2)}, ${Math.max(0.05, open).toFixed(3)})`;
      const t = now / 1000;
      head.style.transform = `rotate(${(Math.sin(t * 1.3) * 1.8 + Math.sin(t * 3.1) * 0.6).toFixed(2)}deg) translateY(${(open * 1.2 + Math.sin(t * 2.2) * 0.6).toFixed(2)}px)`;
      if (brows) brows.style.transform = now < browUntil ? "translateY(-2px)" : "";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      rest();
    };
  }, [mood, levelsRef]);

  return (
    <svg className={`rya rya-${mood}`} width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Riya">
      <defs>
        <clipPath id={id("clip")}>
          <circle cx="100" cy="100" r="98" />
        </clipPath>
        <linearGradient id={id("bg")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3f1ee" />
          <stop offset="1" stopColor="#cfe6e1" />
        </linearGradient>
        <linearGradient id={id("hair")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2219" />
          <stop offset="1" stopColor="#1f120d" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id("clip")})`}>
        <rect width="200" height="200" fill={`url(#${id("bg")})`} />
        <g className="rya-body">
          {/* neck and shoulders in a teal kurta */}
          <path d="M56 98 C46 30 154 30 144 98 C150 128 156 150 160 186 L40 186 C44 150 50 128 56 98 Z" fill={`url(#${id("hair")})`} />
          <path d="M88 126 h24 v22 c0 6 -24 6 -24 0 Z" fill="#c98a62" />
          <path d="M30 206 C34 166 64 148 100 148 C136 148 166 166 170 206 Z" fill="#0f766e" />
          <path d="M84 149 Q100 172 116 149 Q100 158 84 149 Z" fill="#c98a62" />
          <path d="M82 150 Q100 176 118 150" fill="none" stroke="#e0b25a" strokeWidth="2.4" />
        </g>
        <g className="rya-head" ref={headRef}>
          {/* ears and small gold earrings */}
          <ellipse cx="63" cy="96" rx="6" ry="9" fill="#d39a70" />
          <ellipse cx="137" cy="96" rx="6" ry="9" fill="#d39a70" />
          <circle cx="63" cy="110" r="3.6" fill="#e0b25a" />
          <circle cx="137" cy="110" r="3.6" fill="#e0b25a" />
          {/* face */}
          <ellipse cx="100" cy="92" rx="37" ry="43" fill="#dca27a" />
          {/* side-swept fringe */}
          <path d="M61 92 C56 52 84 38 108 42 C132 46 146 64 140 94 C134 76 122 62 100 58 C86 58 72 68 61 92 Z" fill={`url(#${id("hair")})`} />
          <path d="M100 58 C88 64 80 72 76 84 C74 70 82 60 100 58 Z" fill="#2a1912" />
          {/* bindi */}
          <circle cx="100" cy="74" r="2.2" fill="#b83a2b" />
          {/* eyebrows */}
          <g className="rya-brows" ref={browsRef} fill="none" stroke="#2a1912" strokeWidth="2.6" strokeLinecap="round">
            <path d="M77 80 Q86 75 94 79" />
            <path d="M106 79 Q114 75 123 80" />
          </g>
          {/* eyes */}
          <g className="rya-eyes" ref={eyesRef}>
            <g className="rya-eye">
              <ellipse cx="86" cy="90" rx="5.2" ry="5.8" fill="#fff" />
              <circle className="rya-iris" cx="86" cy="90.5" r="3.8" fill="#2b1810" />
              <circle cx="87.4" cy="88.8" r="1.2" fill="#fff" />
            </g>
            <g className="rya-eye">
              <ellipse cx="114" cy="90" rx="5.2" ry="5.8" fill="#fff" />
              <circle className="rya-iris" cx="114" cy="90.5" r="3.8" fill="#2b1810" />
              <circle cx="115.4" cy="88.8" r="1.2" fill="#fff" />
            </g>
            <path d="M80 85 Q86 82 92 85 M108 85 Q114 82 120 85" fill="none" stroke="#2a1912" strokeWidth="1.6" strokeLinecap="round" />
          </g>
          {/* nose and cheeks */}
          <path d="M100 95 Q97 104 101 107" fill="none" stroke="#b9805a" strokeWidth="2" strokeLinecap="round" />
          <circle cx="78" cy="106" r="7" fill="#e88a78" opacity="0.28" />
          <circle cx="122" cy="106" r="7" fill="#e88a78" opacity="0.28" />
          {/* lips: a smile at rest; open, with teeth and tongue, while she talks */}
          <path className="rya-smile" ref={smileRef} d="M89 115 Q100 123 111 115" fill="none" stroke="#9b3b3b" strokeWidth="2.8" strokeLinecap="round" />
          <g className="rya-mouth" ref={mouthRef} style={{ opacity: 0, transform: "scale(1, 0.05)" }}>
            <path d="M90 114 Q100 111 110 114 Q108 125 100 125 Q92 125 90 114 Z" fill="#6e2029" stroke="#9b3b3b" strokeWidth="1.6" />
            <path d="M92 114.5 Q100 112.5 108 114.5 L107.4 117 Q100 115.6 92.6 117 Z" fill="#fff" />
            <ellipse cx="100" cy="122" rx="5" ry="2.2" fill="#d76a6a" />
          </g>
        </g>
      </g>
    </svg>
  );
}
