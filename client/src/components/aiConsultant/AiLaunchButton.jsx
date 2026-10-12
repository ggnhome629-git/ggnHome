import React from "react";
import { Bot } from "lucide-react";
import "./aiConsultant.css";

/** Gradient-ringed launcher with the animated AI orb. `floating` pins it bottom-left. */
export default function AiLaunchButton({ onClick, label = "Ask AI Consultant", floating = false, style }) {
  const button = (
    <button type="button" className="gai-launch" onClick={onClick} aria-label="Open the GgnHome AI property consultant" style={style}>
      <span className="gai-orb" aria-hidden="true">
        <i>
          <Bot size={17} />
        </i>
      </span>
      <span className={floating ? "gai-fab-label" : undefined}>
        <em>{label}</em>
      </span>
    </button>
  );
  return floating ? <div className="gai-fab">{button}</div> : button;
}
