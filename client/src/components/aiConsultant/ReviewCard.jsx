import React, { useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

const CONFETTI_COLORS = ["#22d3ee", "#3b82f6", "#8b5cf6", "#34d399", "#fbbf24", "#f472b6"];

/** Summary → consent → submit, with an idempotent retry-safe submit and a success state. */
export default function ReviewCard({ summary, contact, consentText, onEdit, onEditContact, onSubmit, submitting, error, success }) {
  const [consent, setConsent] = useState(false);
  const confetti = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 7) * 0.08, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] })),
    []
  );

  if (success) {
    return (
      <section className="gai-review gai-success" aria-live="polite">
        <div className="gai-confetti" aria-hidden="true">
          {confetti.map((c, i) => (
            <i key={i} style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s` }} />
          ))}
        </div>
        <h3>
          <CheckCircle2 size={22} color="#34d399" /> Request submitted
        </h3>
        <p style={{ color: "var(--ai-muted)", margin: "6px 0 0" }}>A GgnHome expert will call you shortly. Keep this reference:</p>
        <span className="gai-ref">{success.leadRef}</span>
      </section>
    );
  }

  return (
    <section className="gai-review" aria-label="Review your request">
      <h3>
        <ShieldCheck size={18} color="#22d3ee" /> Review your request
      </h3>
      <dl>
        {summary.map((row) => (
          <React.Fragment key={row.slot}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
            <button type="button" className="gai-link" onClick={() => onEdit(row.slot)}>
              Edit
            </button>
          </React.Fragment>
        ))}
        <dt>Name</dt>
        <dd>{contact.name || "—"}</dd>
        <button type="button" className="gai-link" onClick={() => onEditContact("name")}>
          Edit
        </button>
        <dt>Mobile</dt>
        <dd>{contact.phone || "—"}</dd>
        <button type="button" className="gai-link" onClick={() => onEditContact("phone")}>
          Edit
        </button>
        {contact.email ? (
          <>
            <dt>Email</dt>
            <dd>{contact.email}</dd>
            <span />
          </>
        ) : null}
      </dl>
      <label className="gai-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{consentText}</span>
      </label>
      {error ? (
        <p role="alert" style={{ color: "#fca5a5", fontSize: 13, margin: "0 0 12px" }}>
          {error}
        </p>
      ) : null}
      <div className="gai-card-actions">
        <button type="button" className="gai-btn primary" disabled={!consent || submitting} onClick={() => onSubmit(consent)}>
          {submitting ? <Loader2 size={16} className="gai-spin" style={{ animation: "gai-spin 1s linear infinite" }} /> : <CheckCircle2 size={16} />}
          {submitting ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </section>
  );
}
