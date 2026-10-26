import React, { useEffect, useState } from "react";
import { Bot, X } from "lucide-react";
import "./aiConsultant.css";

const DISMISS_KEY = "ggn:aiBannerDismissed";

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Invites the visitor to the AI consultant without opening it. Tiny on phones
 * (a pill in the corner, hidden while the keyboard is up) so it never covers
 * the search bar.
 */
export default function AiBanner({ onOpen }) {
  const [hidden, setHidden] = useState(wasDismissed);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const onFocus = (e) => setTyping(/^(INPUT|TEXTAREA)$/.test(e.target?.tagName || ""));
    const onBlur = () => setTyping(false);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);

  if (hidden || typing) return null;

  const dismiss = (e) => {
    e.stopPropagation();
    setHidden(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* the banner simply returns next visit */
    }
  };

  return (
    <div className="gai-banner" role="complementary" aria-label="AI property consultant">
      <button type="button" className="gai-banner-main" onClick={onOpen} aria-label="Open the GgnHome AI property consultant">
        <span className="gai-banner-icon" aria-hidden="true">
          <Bot size={16} />
        </span>
        <span className="gai-banner-text">
          <strong>Ask AI</strong>
          <small>Find your home in 60 seconds</small>
        </span>
      </button>
      <button type="button" className="gai-banner-close" onClick={dismiss} aria-label="Dismiss AI banner">
        <X size={14} />
      </button>
    </div>
  );
}
