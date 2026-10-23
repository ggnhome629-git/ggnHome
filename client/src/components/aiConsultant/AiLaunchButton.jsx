import React from "react";
import { Bot } from "lucide-react";
import "./aiConsultant.css";

/** Gradient-ringed launcher with the animated AI orb and the visible V2 marker. */
export default function AiLaunchButton({ onClick, label = "Ask AI Consultant", floating = false, style }) {
  const button = (
    <button type="button" className="gai-launch" onClick={onClick} aria-label="Open the GgnHome AI property consultant, version 2" style={style}>
      <span className="gai-orb" aria-hidden="true">
        <i>
          <Bot size={17} />
        </i>
      </span>
      <span className={floating ? "gai-fab-label gai-fab-label-v2" : "gai-launch-label"}>
        <em>{label}</em>
        <span className="gai-v2-pill" aria-label="Version 2">V2</span>
      </span>
    </button>
  );
  return floating ? <div className="gai-fab">{button}</div> : button;
}
