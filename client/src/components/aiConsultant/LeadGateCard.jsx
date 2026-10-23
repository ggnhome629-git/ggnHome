import React from "react";
import { CheckCircle2, Loader2, Pencil, Phone } from "lucide-react";

const fmtPhone = (p) => (p ? `${p.slice(0, 5)} ${p.slice(5)}` : "");

/**
 * Guests share a mobile number before the first property search: type or speak it,
 * confirm it back, optionally edit the number and add a name. Saved as a lead.
 */
export default function LeadGateCard({ gate, onChange, onContinue, onConfirm, onEdit, onSave }) {
  const { stage, phone, name, error, saving } = gate;
  const consent = "By continuing you agree that GgnHome may contact you about matching properties.";

  if (stage === "ask") {
    return (
      <section className="gai-review" aria-label="Your mobile number">
        <h3>
          <Phone size={18} color="#0f766e" /> One last step — your mobile number
        </h3>
        <p style={{ color: "var(--ai-muted)", margin: "4px 0 12px", fontSize: 14 }}>Tell me or type your number so an expert can help if you like a property. Then I'll find your homes.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onContinue();
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 700 }}>+91</span>
            <input className="gai-input" style={{ flex: 1, border: "1px solid #e6ded2", borderRadius: 12, padding: "10px 12px" }} value={phone} onChange={(e) => onChange({ phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} inputMode="tel" autoComplete="tel-national" placeholder="10-digit mobile number" aria-label="Mobile number" maxLength={10} />
          </div>
          {error ? (
            <p role="alert" style={{ color: "#b83a2b", fontSize: 13, margin: "8px 0 0" }}>
              {error}
            </p>
          ) : null}
          <div className="gai-card-actions">
            <button type="submit" className="gai-btn primary" disabled={phone.length !== 10 || name.trim().length < 2}>
              Continue
            </button>
          </div>
        </form>
      </section>
    );
  }

  if (stage === "edit") {
    return (
      <section className="gai-review" aria-label="Edit your details">
        <h3>
          <Pencil size={16} color="#0f766e" /> Edit your details
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          style={{ display: "grid", gap: 10, marginTop: 8 }}
        >
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Mobile number
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>+91</span>
              <input className="gai-input" style={{ flex: 1, border: "1px solid #e6ded2", borderRadius: 12, padding: "10px 12px" }} value={phone} onChange={(e) => onChange({ phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} inputMode="tel" maxLength={10} />
            </div>
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Your name
            <input className="gai-input" style={{ border: "1px solid #e6ded2", borderRadius: 12, padding: "10px 12px" }} value={name} onChange={(e) => onChange({ name: e.target.value.slice(0, 60) })} autoComplete="name" maxLength={60} />
          </label>
          {error ? (
            <p role="alert" style={{ color: "#b83a2b", fontSize: 13, margin: 0 }}>
              {error}
            </p>
          ) : null}
          <div className="gai-card-actions">
            <button type="submit" className="gai-btn primary" disabled={phone.length !== 10}>
              Save
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="gai-review" aria-label="Confirm your mobile number">
      <h3>
        <Phone size={18} color="#0f766e" /> Is this number correct?
      </h3>
      <p style={{ fontSize: 24, fontWeight: 800, margin: "8px 0 2px", letterSpacing: 0.5 }}>+91 {fmtPhone(phone)}</p>
      <p style={{ color: "var(--ai-muted)", margin: "0 0 4px", fontSize: 14 }}>{name ? `Name: ${name}` : "Name missing"}</p>
      <p style={{ color: "var(--ai-muted)", margin: "0 0 8px", fontSize: 12 }}>{consent}</p>
      {error ? (
        <p role="alert" style={{ color: "#b83a2b", fontSize: 13, margin: "0 0 8px" }}>
          {error}
        </p>
      ) : null}
      <div className="gai-card-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="gai-btn primary" disabled={saving} onClick={onConfirm}>
          {saving ? <Loader2 size={16} style={{ animation: "gai-spin 1s linear infinite" }} /> : <CheckCircle2 size={16} />}
          {saving ? "Saving…" : "Yes, find my homes"}
        </button>
        <button type="button" className="gai-btn" disabled={saving} onClick={onEdit}>
          <Pencil size={14} /> Edit number / name
        </button>
      </div>
    </section>
  );
}
