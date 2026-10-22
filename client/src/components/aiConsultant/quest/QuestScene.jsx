import React from "react";

// Fixed positions (not random) so the scene looks the same on every render and never reflows.
const STARS = [
  [6, 8], [14, 22], [22, 6], [31, 15], [38, 4], [47, 19], [55, 9], [63, 24], [71, 5],
  [79, 17], [86, 7], [93, 21], [10, 32], [42, 30], [67, 33], [90, 31], [27, 27], [58, 28],
];
const SKY = [
  { e: "✈️", cls: "plane", top: 10, dur: 26, delay: -4 },
  { e: "🚁", cls: "heli", top: 22, dur: 19, delay: -11 },
  { e: "✈️", cls: "plane far", top: 5, dur: 38, delay: -22 },
  { e: "🪁", cls: "kite", top: 30, dur: 30, delay: -8 },
  { e: "🕊️", cls: "bird", top: 16, dur: 22, delay: -15 },
];
const TREES = ["🌳", "🌴", "🌲", "🌳", "🌴", "🌳", "🌲", "🌴", "🌳", "🌲", "🌳", "🌴"];
const ANIMALS = [
  { e: "🦚", left: 12, cls: "peacock" },
  { e: "🐒", left: 38, cls: "monkey" },
  { e: "🦌", left: 63, cls: "deer" },
  { e: "🐘", left: 84, cls: "elephant" },
];
const LANE_A = [
  { e: "🚗", dur: 11, delay: 0 },
  { e: "🛺", dur: 14, delay: -5 },
  { e: "🚌", dur: 17, delay: -9 },
  { e: "🏍️", dur: 9, delay: -3 },
];
const LANE_B = [
  { e: "🚕", dur: 12, delay: -2 },
  { e: "🚙", dur: 15, delay: -8 },
  { e: "🛵", dur: 10, delay: -6 },
];

/** Gurgaon skyline: a few towers with lit windows (Cyber City style). */
function Skyline() {
  const towers = [
    [0, 70, 26], [28, 52, 22], [52, 84, 30], [84, 60, 20], [106, 96, 28], [136, 66, 24],
    [162, 110, 30], [194, 74, 22], [218, 88, 26], [246, 58, 20], [268, 100, 30], [300, 64, 24],
    [326, 80, 26], [354, 54, 20], [376, 92, 24],
  ];
  return (
    <svg className="qsc-skyline" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
      {towers.map(([x, h, w]) => (
        <g key={x}>
          <rect x={x} y={120 - h} width={w} height={h} rx="2" fill="#24405e" />
          {Array.from({ length: Math.floor(h / 14) }).map((_, r) =>
            [0, 1].map((c) => (
              <rect key={`${r}-${c}`} className={(r + c + x) % 3 === 0 ? "lit" : ""} x={x + 5 + c * (w / 2 - 2)} y={120 - h + 6 + r * 14} width={w / 2 - 8} height="5" fill="#3b5a7c" />
            ))
          )}
        </g>
      ))}
    </svg>
  );
}

/**
 * The living background behind the robot: twinkling stars, planes and a
 * helicopter crossing the sky, Gurgaon's skyline with the Rapid Metro, a strip
 * of jungle with animals, and traffic both ways. Decorative only; it never
 * takes taps, and it stops moving for visitors who prefer reduced motion.
 */
export default function QuestScene({ celebrate = 0 }) {
  return (
    <div className="qsc" aria-hidden="true" data-celebrate={celebrate % 2}>
      <div className="qsc-sky" />
      <div className="qsc-sun" />
      {STARS.map(([left, top], i) => (
        <span key={i} className="qsc-star" style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${-(i * 0.37) % 3}s` }}>
          ✦
        </span>
      ))}
      {SKY.map((s, i) => (
        <span key={i} className={`qsc-fly ${s.cls}`} style={{ top: `${s.top}%`, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}>
          <i>{s.e}</i>
        </span>
      ))}
      <div className="qsc-city">
        <Skyline />
        <div className="qsc-metro">
          <span className="qsc-train">🚝</span>
        </div>
      </div>
      <div className="qsc-jungle">
        {TREES.map((t, i) => (
          <span key={i} className="qsc-tree" style={{ left: `${(i / TREES.length) * 100 + 2}%`, fontSize: `${26 + ((i * 7) % 14)}px`, animationDelay: `${-i * 0.4}s` }}>
            {t}
          </span>
        ))}
        {ANIMALS.map((a) => (
          <span key={a.cls} className={`qsc-animal ${a.cls}`} style={{ left: `${a.left}%` }}>
            {a.e}
          </span>
        ))}
      </div>
      <div className="qsc-road">
        <div className="qsc-lane a">
          {LANE_A.map((v, i) => (
            <span key={i} className="qsc-car" style={{ animationDuration: `${v.dur}s`, animationDelay: `${v.delay}s` }}>
              <i>{v.e}</i>
            </span>
          ))}
        </div>
        <div className="qsc-lane b">
          {LANE_B.map((v, i) => (
            <span key={i} className="qsc-car" style={{ animationDuration: `${v.dur}s`, animationDelay: `${v.delay}s` }}>
              <i>{v.e}</i>
            </span>
          ))}
        </div>
        <span className="qsc-cow">🐄</span>
      </div>
    </div>
  );
}
