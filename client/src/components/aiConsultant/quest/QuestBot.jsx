import React, { useId } from "react";

/**
 * GgnBot, the friendly robot that asks the questions. Pure SVG + CSS:
 * it floats, blinks, its antenna glows, and `mood` changes its face —
 * "idle", "think" (eyes up, fast antenna), "happy" (smiling eyes, waving arm).
 */
export default function QuestBot({ mood = "idle", size = 140 }) {
  const uid = useId().replace(/:/g, "");
  const id = (name) => `qb-${name}-${uid}`;
  return (
    <svg className={`qbot qbot-${mood}`} width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="GgnBot">
      <defs>
        <linearGradient id={id("body")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9e9f2" />
        </linearGradient>
        <linearGradient id={id("visor")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#123a5a" />
          <stop offset="1" stopColor="#0a1f33" />
        </linearGradient>
        <radialGradient id={id("glow")}>
          <stop offset="0" stopColor="#fff7c2" />
          <stop offset="1" stopColor="#ffb703" />
        </radialGradient>
      </defs>
      <ellipse className="qbot-shadow" cx="100" cy="190" rx="38" ry="6" fill="rgba(0,0,0,0.18)" />
      <g className="qbot-float">
        {/* antenna */}
        <line x1="100" y1="34" x2="100" y2="16" stroke="#7b8ea3" strokeWidth="4" strokeLinecap="round" />
        <circle className="qbot-bulb" cx="100" cy="13" r="7" fill={`url(#${id("glow")})`} />
        {/* ears */}
        <rect x="34" y="62" width="12" height="30" rx="6" fill="#00a79d" />
        <rect x="154" y="62" width="12" height="30" rx="6" fill="#00a79d" />
        {/* head */}
        <rect x="44" y="32" width="112" height="88" rx="30" fill={`url(#${id("body")})`} stroke="#b9cfdc" strokeWidth="2" />
        <rect x="56" y="46" width="88" height="58" rx="22" fill={`url(#${id("visor")})`} />
        {/* eyes */}
        <g className="qbot-eyes">
          <g className="qbot-eye-open">
            <rect x="74" y="62" width="14" height="20" rx="7" fill="#5ef2e0" />
            <rect x="112" y="62" width="14" height="20" rx="7" fill="#5ef2e0" />
            <circle cx="84" cy="67" r="2.5" fill="#fff" />
            <circle cx="122" cy="67" r="2.5" fill="#fff" />
          </g>
          <g className="qbot-eye-happy" fill="none" stroke="#5ef2e0" strokeWidth="5" strokeLinecap="round">
            <path d="M73 76 Q81 64 89 76" />
            <path d="M111 76 Q119 64 127 76" />
          </g>
        </g>
        {/* mouth */}
        <path className="qbot-mouth" d="M88 92 Q100 100 112 92" fill="none" stroke="#5ef2e0" strokeWidth="4" strokeLinecap="round" />
        <circle cx="66" cy="94" r="5" fill="#ff8fab" opacity="0.55" />
        <circle cx="134" cy="94" r="5" fill="#ff8fab" opacity="0.55" />
        {/* body */}
        <rect x="64" y="124" width="72" height="50" rx="20" fill={`url(#${id("body")})`} stroke="#b9cfdc" strokeWidth="2" />
        <circle cx="100" cy="146" r="11" fill="#003366" />
        <path d="M94 147 L100 141 L106 147 V152 H94 Z" fill="#ffb703" />
        {/* arms */}
        <rect x="46" y="128" width="16" height="36" rx="8" fill="#00a79d" />
        <g className="qbot-wave">
          <rect x="138" y="128" width="16" height="36" rx="8" fill="#00a79d" />
        </g>
      </g>
    </svg>
  );
}
