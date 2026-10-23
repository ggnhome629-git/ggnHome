import React, { useEffect, useRef } from "react";
import { ArrowLeft, Check, MessagesSquare, SendHorizontal, Sparkles } from "lucide-react";
import QuestBot from "./QuestBot";
import QuestScene from "./QuestScene";

/**
 * In-quest chat handoff. Keeps text, chips, results, lead capture, and review
 * inside the game UI instead of switching to the older assistant layout.
 */
export default function QuestHandoff({
  items = [],
  renderItem,
  chips,
  selected = [],
  onChip,
  onSendSelected,
  busy = false,
  input = "",
  onInput,
  onSend,
  placeholder,
  onBack,
}) {
  const tailRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    tailRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [items.length, busy, chips]);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const hasChips = Boolean(chips?.list?.length) && !busy;

  return (
    <section className="qst qhandoff" aria-label="Continue chatting with GgnBot">
      <QuestScene />
      <div className="qhandoff-frame">
        <header className="qhandoff-head">
          <button type="button" className="qhandoff-back" onClick={onBack} aria-label="Back to the home quest">
            <ArrowLeft size={19} />
          </button>
          <QuestBot mood={busy ? "think" : "idle"} size={46} />
          <div className="qhandoff-heading">
            <strong>Chat with GgnBot</strong>
            <span><i className={busy ? "busy" : ""} /> {busy ? "Working on your request…" : "Same conversation · Gurgaon homes"}</span>
          </div>
          <div className="qhandoff-mode"><MessagesSquare size={14} /> FREE CHAT</div>
        </header>

        <div className="qhandoff-helper">
          <Sparkles size={17} />
          <span><b>Keep your home quest going.</b> Ask a question, explain a preference, or refine your matches.</span>
        </div>

        <div className="qhandoff-thread" role="log" aria-live="polite" aria-relevant="additions text">
          {items.length ? items.map((item, index) => renderItem(item, index)) : (
            <div className="qhandoff-empty">
              <QuestBot mood="happy" size={66} />
              <strong>What would you like to know?</strong>
              <span>Your answers and property search stay in this conversation.</span>
            </div>
          )}
          <div ref={tailRef} />
        </div>

        {hasChips ? (
          <div className="qhandoff-answers" role="group" aria-label={chips.multi ? "Choose one or more answers" : "Suggested answers"}>
            {chips.list.map((chip) => {
              const active = selected.includes(chip.value);
              return (
                <button
                  key={chip.value + "-" + chip.label}
                  type="button"
                  className={"qpill" + (active ? " use" : "")}
                  aria-pressed={chips.multi ? active : undefined}
                  onClick={() => onChip(chip)}
                >
                  {active ? <Check size={14} /> : null}
                  {chip.label}
                </button>
              );
            })}
            {chips.multi && selected.length ? (
              <button type="button" className="qcta" onClick={onSendSelected}>Continue with {selected.length} →</button>
            ) : null}
          </div>
        ) : null}

        <form
          className="qhandoff-composer"
          onSubmit={(event) => {
            event.preventDefault();
            onSend();
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => onInput(event.target.value)}
            placeholder={placeholder || "Ask anything about Gurgaon properties…"}
            aria-label="Message GgnBot"
            maxLength={600}
            autoComplete="off"
            enterKeyHint="send"
          />
          <button type="submit" className="qcta" disabled={!input.trim() || busy} aria-label="Send message">
            <SendHorizontal size={18} />
            <span>Send</span>
          </button>
        </form>
        <p className="qhandoff-foot">Your home preferences carry over from the quest. Switch back to quick questions anytime.</p>
      </div>
    </section>
  );
}
