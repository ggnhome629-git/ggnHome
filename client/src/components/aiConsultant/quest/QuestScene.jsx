import React from "react";

const TOWERS = [
  [10, 70, 34], [48, 46, 26], [78, 92, 30], [112, 58, 24], [140, 104, 34], [178, 66, 28], [210, 120, 36],
  [250, 78, 26], [280, 96, 30], [314, 54, 24], [342, 112, 34], [380, 72, 28], [412, 88, 30], [446, 60, 24],
  [474, 126, 36], [514, 70, 28], [546, 98, 32], [582, 56, 24], [610, 108, 34], [648, 74, 28], [680, 90, 30],
  [714, 62, 26], [744, 116, 36],
];
const TREES = [20, 64, 118, 170, 236, 300, 356, 420, 488, 552, 604, 668, 730, 780];

/**
 * A calm, living strip of Gurgaon along the bottom of the quest: planes and a
 * helicopter in the sky, the skyline with the Rapid Metro, trees with an
 * elephant, a peacock and a deer, and traffic both ways. Flat SVG in soft
 * colours so it never competes with the question. Decorative only.
 */
export default function QuestScene() {
  return (
    <div className="qsc" aria-hidden="true">
      <svg className="qsc-sky" viewBox="0 0 800 220" preserveAspectRatio="xMidYMin slice">
        <g className="qsc-cloud c1">
          <ellipse cx="0" cy="0" rx="34" ry="12" />
          <ellipse cx="22" cy="-8" rx="22" ry="12" />
          <ellipse cx="-20" cy="-4" rx="18" ry="9" />
        </g>
        <g className="qsc-cloud c2">
          <ellipse cx="0" cy="0" rx="28" ry="10" />
          <ellipse cx="18" cy="-7" rx="18" ry="10" />
        </g>
        <g className="qsc-plane">
          <path d="M0 0 L46 -4 Q56 -4 58 0 Q56 4 46 4 Z" />
          <path d="M22 -2 L10 -20 L18 -20 L34 -2 Z" />
          <path d="M22 2 L10 18 L18 18 L34 2 Z" />
          <path d="M2 -1 L-4 -12 L2 -12 L10 -1 Z" />
        </g>
        <g className="qsc-heli">
          <rect className="qsc-rotor" x="-26" y="-16" width="52" height="3" rx="1.5" />
          <rect x="-1.5" y="-14" width="3" height="6" />
          <ellipse cx="0" cy="0" rx="16" ry="9" />
          <rect x="12" y="-3" width="26" height="4" rx="2" />
          <path d="M36 -8 L40 -8 L40 6 L36 6 Z" />
          <path d="M-10 9 L-12 13 M10 9 L12 13 M-16 13 L16 13" strokeWidth="2" fill="none" />
        </g>
        <g className="qsc-birds">
          <path d="M0 0 q6 -6 12 0 q6 -6 12 0" />
          <path d="M30 10 q5 -5 10 0 q5 -5 10 0" />
          <path d="M18 22 q4 -4 8 0 q4 -4 8 0" />
        </g>
      </svg>

      <svg className="qsc-ground" viewBox="0 0 800 170" preserveAspectRatio="xMidYMax slice">
        {/* skyline */}
        <g className="qsc-city">
          {TOWERS.map(([x, h, w]) => (
            <g key={x}>
              <rect x={x} y={110 - h} width={w} height={h} rx="3" />
              {Array.from({ length: Math.floor(h / 16) }).map((_, r) => (
                <rect key={r} className={(r + x) % 4 === 0 ? "win lit" : "win"} x={x + 6} y={116 - h + r * 16} width={w - 12} height="4" rx="1" />
              ))}
            </g>
          ))}
        </g>
        {/* Rapid Metro on its viaduct */}
        <g className="qsc-viaduct">
          <rect x="0" y="96" width="800" height="5" />
          {[60, 200, 340, 480, 620, 760].map((x) => (
            <rect key={x} x={x} y="101" width="8" height="14" />
          ))}
        </g>
        <g className="qsc-train">
          <rect x="0" y="80" width="120" height="16" rx="6" />
          {[10, 34, 58, 82, 104].map((x) => (
            <rect key={x} className="win" x={x} y="84" width="12" height="6" rx="1.5" />
          ))}
        </g>
        {/* trees and animals */}
        <g className="qsc-trees">
          {TREES.map((x, i) => (
            <g key={x} className="qsc-tree" style={{ animationDelay: `${-i * 0.5}s` }}>
              <rect x={x - 2} y="118" width="4" height="14" />
              <circle cx={x} cy={i % 2 ? 112 : 110} r={i % 3 === 0 ? 14 : 11} />
            </g>
          ))}
        </g>
        <g className="qsc-elephant">
          <path d="M0 120 Q0 100 20 100 L42 100 Q56 100 56 114 L56 128 L50 128 L50 120 L44 120 L44 128 L38 128 L38 120 L14 120 L14 128 L8 128 L8 120 Z" />
          <path d="M50 104 Q66 104 64 122 L60 122 Q61 110 52 110 Z" />
          <circle cx="52" cy="106" r="1.6" className="eye" />
        </g>
        <g className="qsc-peacock">
          <path d="M-14 128 Q-20 104 2 98 Q18 104 12 128 Z" className="tail" />
          <circle cx="-6" cy="108" r="2.4" className="dot" />
          <circle cx="2" cy="104" r="2.4" className="dot" />
          <circle cx="8" cy="112" r="2.4" className="dot" />
          <path d="M0 128 Q-2 116 4 114 Q10 116 8 128 Z" className="body" />
          <path d="M5 114 Q6 106 10 104" strokeWidth="2.4" fill="none" className="neck" />
        </g>
        <g className="qsc-deer">
          <path d="M0 116 Q2 108 12 108 L26 108 Q32 108 32 114 L32 128 L29 128 L29 118 L6 118 L6 128 L3 128 Z" />
          <path d="M28 108 L32 98 L36 98 L34 106 Z" />
          <path d="M32 98 L30 92 M34 98 L38 92" strokeWidth="1.6" fill="none" />
        </g>
        {/* road */}
        <rect className="qsc-road" x="0" y="132" width="800" height="38" />
        <rect className="qsc-lane" x="0" y="150" width="800" height="2" />
        <g className="qsc-car a">
          <rect x="0" y="136" width="34" height="10" rx="4" />
          <rect x="7" y="130" width="18" height="8" rx="3" />
          <circle cx="8" cy="147" r="3" className="wheel" />
          <circle cx="26" cy="147" r="3" className="wheel" />
        </g>
        <g className="qsc-bus">
          <rect x="0" y="134" width="60" height="14" rx="3" />
          {[6, 18, 30, 42].map((x) => (
            <rect key={x} className="win" x={x} y="137" width="9" height="5" rx="1" />
          ))}
          <circle cx="12" cy="149" r="3" className="wheel" />
          <circle cx="48" cy="149" r="3" className="wheel" />
        </g>
        <g className="qsc-auto">
          <path d="M0 166 L0 156 Q2 150 10 150 L22 150 L26 158 L26 166 Z" />
          <circle cx="5" cy="167" r="2.6" className="wheel" />
          <circle cx="21" cy="167" r="2.6" className="wheel" />
        </g>
        <g className="qsc-car b">
          <rect x="0" y="154" width="32" height="10" rx="4" />
          <rect x="7" y="148" width="16" height="8" rx="3" />
          <circle cx="7" cy="165" r="3" className="wheel" />
          <circle cx="25" cy="165" r="3" className="wheel" />
        </g>
      </svg>
    </div>
  );
}
