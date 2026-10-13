import React, { useEffect, useRef } from "react";
import { Bot, ExternalLink, Maximize2, SendHorizontal, X } from "lucide-react";
import VoiceBar from "./voice/VoiceBar";

/**
 * Compact, non-blocking chat docked on the right. The conversation and any
 * voice session keep running while the visitor scrolls or opens listings.
 */
export default function FloatingConsultant({ items, chips, busy, input, onInput, onSubmit, onChip, onAsk, onExpand, onClose, voice, onStartVoice, placeholder }) {
  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [items, chips]);

  const visible = items.slice(-40);

  return (
    <aside className="gaf" role="complementary" aria-label="GgnHome AI Consultant chat">
      <header className="gaf-head">
        <span className={`gaf-avatar${busy ? " busy" : ""}`} aria-hidden="true">
          <Bot size={16} />
        </span>
        <div className="gaf-title">
          <strong>AI Consultant</strong>
          <small>{busy ? "Working on it…" : "Live GgnHome listings"}</small>
        </div>
        <button type="button" className="gaf-icon" onClick={onExpand} aria-label="Open the full consultant" title="Open full view">
          <Maximize2 size={16} />
        </button>
        <button type="button" className="gaf-icon" onClick={onClose} aria-label="Close the consultant" title="Close">
          <X size={17} />
        </button>
      </header>

      <div className="gaf-list" ref={listRef} aria-live="polite" aria-relevant="additions">
        {visible.map((it) => {
          if (it.type === "user") return <div key={it.id} className="gaf-msg user">{it.text}</div>;
          if (it.type === "typing") return <div key={it.id} className="gaf-msg bot typing" aria-label="Assistant is typing"><span /><span /><span /></div>;
          if (it.type === "scanner") return <div key={it.id} className="gaf-msg bot note">Searching live listings…</div>;
          if (it.type === "review")
            return (
              <div key={it.id} className="gaf-msg bot note">
                Your request is ready to review.{" "}
                <button type="button" className="gaf-inline" onClick={onExpand}>Review & send</button>
              </div>
            );
          if (it.type === "results")
            return (
              <ol key={it.id} className="gaf-results" start={(it.startIndex || 0) + 1}>
                {it.results.map((card, k) => (
                  <li key={card.id}>
                    <div>
                      <b>{card.title}</b>
                      <small>{[card.priceLabel, card.bhkLabel, card.sector].filter(Boolean).join(" · ")}</small>
                    </div>
                    <span className="gaf-result-actions">
                      <button type="button" onClick={() => onAsk((it.startIndex || 0) + k + 1)} disabled={busy}>Ask</button>
                      <a href={card.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${card.title}`}>
                        <ExternalLink size={14} />
                      </a>
                    </span>
                  </li>
                ))}
              </ol>
            );
          return (
            <div key={it.id} className={`gaf-msg bot${it.kind === "error" ? " error" : ""}`}>
              {it.text}
              {it.listing ? (
                <a className="gaf-inline" href={it.listing.url} target="_blank" rel="noopener noreferrer">
                  Open listing ↗
                </a>
              ) : null}
            </div>
          );
        })}
        {chips && chips.list.length && !busy ? (
          <div className="gaf-chips">
            {chips.list.slice(0, 6).map((c) => (
              <button key={`${c.value}-${c.label}`} type="button" onClick={() => onChip(c)}>
                {c.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <VoiceBar voice={voice} onStart={onStartVoice} compact />

      <form
        className="gaf-composer"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input value={input} onChange={(e) => onInput(e.target.value)} placeholder={placeholder} aria-label="Message the AI consultant" maxLength={600} enterKeyHint="send" />
        <button type="submit" disabled={!input.trim() || busy} aria-label="Send">
          <SendHorizontal size={17} />
        </button>
      </form>
    </aside>
  );
}
