import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Property Preference Form — collects a lead's requirements and posts them to
 * /api/userpreferenceform. Same fields and payload as before; the UI is now
 * card-based in GgnHome brand colours, with tap-friendly chips on phones and
 * a live progress bar. Every section is always visible (no scroll-triggered
 * reveals that left blank gaps).
 */

const EMPTY = {
  userName: "",
  mobileNumber: "",
  preferredLocation: "",
  budgetRange: "",
  bhkSize: "",
  propertyType: "",
  furnishingLevel: "",
  moveInDate: "",
  brokerageAmount: 1499,
};

const BHK = [
  { value: "1BHK", label: "1 BHK" },
  { value: "2BHK", label: "2 BHK" },
  { value: "3BHK", label: "3 BHK" },
  { value: "4BHK", label: "4 BHK" },
  { value: "4BHK+", label: "4+ BHK" },
];
const FURNISHING = [
  { value: "fully-furnished", label: "Fully furnished" },
  { value: "semi-furnished", label: "Semi furnished" },
  { value: "unfurnished", label: "Unfurnished" },
];
const PROPERTY_TYPES = ["Apartment", "Builder Floor", "Independent House", "Villa", "Studio", "PG / Co-living"];
const BUDGETS = ["Under ₹20k", "₹20k – 40k", "₹40k – 70k", "₹70k+", "Under ₹1 Cr", "₹1 – 2 Cr", "₹2 Cr+"];
const TIMELINE = [
  { key: "immediate", label: "Immediately" },
  { key: "15", label: "Within 15 days" },
  { key: "30", label: "Within 30 days" },
  { key: "flexible", label: "Flexible" },
];
const MIN_FEE = 1499;
const MAX_FEE = 5999;

const CSS = `
.upf{min-height:100vh;background:linear-gradient(180deg,#F4F7F9 0%,#EAF4F6 100%);padding:0 0 calc(110px + env(safe-area-inset-bottom));font-family:inherit;color:#1F2D3D}
.upf-hero{position:relative;overflow:hidden;color:#fff;padding:36px 20px 72px;text-align:center;
  background:linear-gradient(125deg,#002244 0%,#003366 45%,#0B5C7A 75%,#00A79D 100%)}
.upf-hero::before,.upf-hero::after{content:"";position:absolute;width:320px;height:320px;border-radius:50%;pointer-events:none;
  background:radial-gradient(closest-side,rgba(34,211,238,.45),transparent);top:-120px;right:-80px;animation:upfFloat 9s ease-in-out infinite alternate}
.upf-hero::after{background:radial-gradient(closest-side,rgba(139,92,246,.35),transparent);top:auto;bottom:-160px;left:-100px;right:auto;animation-duration:11s}
@keyframes upfFloat{to{transform:translate3d(30px,24px,0) scale(1.1)}}
.upf-hero h1{position:relative;margin:0;font-size:clamp(1.6rem,4.5vw,2.3rem);font-weight:800;letter-spacing:-.01em}
.upf-hero p{position:relative;margin:10px auto 0;max-width:520px;opacity:.88;font-size:.98rem;line-height:1.5}
.upf-wrap{max-width:760px;margin:-48px auto 0;padding:0 16px;position:relative}
.upf-progress{background:#fff;border-radius:16px;padding:16px 18px;box-shadow:0 8px 24px rgba(0,51,102,.08);margin-bottom:16px}
.upf-steps{display:flex;justify-content:space-between;font-size:.78rem;font-weight:700;color:#7A8B9C;margin-bottom:10px}
.upf-steps span.on{color:#00857D}
.upf-bar{height:8px;border-radius:8px;background:#E5EEF2;overflow:hidden}
.upf-bar i{display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,#00A79D,#22D3EE);transition:width .45s cubic-bezier(.2,.8,.2,1)}
.upf-card{background:#fff;border-radius:18px;padding:20px;margin-bottom:16px;box-shadow:0 8px 24px rgba(0,51,102,.06);border:1px solid #E6EEF2}
.upf-card h2{display:flex;align-items:center;gap:10px;margin:0 0 4px;font-size:1.08rem;font-weight:800;color:#003366}
.upf-card h2 .n{width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.8rem;color:#fff;background:linear-gradient(135deg,#00A79D,#22D3EE);flex-shrink:0}
.upf-card h2 .n.done{background:#10B981}
.upf-card .sub{margin:0 0 16px 38px;font-size:.85rem;color:#6B7C8D}
.upf-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:600px){.upf-grid{grid-template-columns:1fr}}
.upf-field label{display:block;font-size:.8rem;font-weight:700;color:#4A6A8A;margin:0 0 6px}
.upf-field input{width:100%;box-sizing:border-box;height:48px;padding:0 14px;border-radius:12px;border:1.5px solid #D8E3EA;background:#F9FBFC;font-size:16px;color:#1F2D3D;outline:none;transition:border-color .2s,box-shadow .2s,background .2s}
.upf-field input:focus{border-color:#00A79D;background:#fff;box-shadow:0 0 0 4px rgba(0,167,157,.14)}
.upf-field input.ok{border-color:#9ADBD5}
.upf-field .hint{font-size:.75rem;color:#C0392B;margin-top:4px}
.upf-chips{display:flex;flex-wrap:wrap;gap:8px}
.upf-chip{border:1.5px solid #D8E3EA;background:#fff;color:#38506A;border-radius:999px;padding:9px 14px;font-size:.88rem;font-weight:600;cursor:pointer;transition:all .18s ease;-webkit-tap-highlight-color:transparent}
.upf-chip:hover{border-color:#00A79D;color:#00857D}
.upf-chip:active{transform:scale(.96)}
.upf-chip.on{background:linear-gradient(135deg,#00A79D,#0FB5C9);border-color:transparent;color:#fff;box-shadow:0 6px 14px rgba(0,167,157,.28)}
.upf-block{margin-top:16px}
.upf-block > label{display:block;font-size:.8rem;font-weight:700;color:#4A6A8A;margin:0 0 8px}
.upf-fee{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px 0 12px}
.upf-fee b{font-size:1.6rem;color:#003366}
.upf-step{width:40px;height:40px;border-radius:50%;border:1.5px solid #D8E3EA;background:#fff;font-size:1.2rem;color:#003366;cursor:pointer}
.upf-range{width:100%;accent-color:#00A79D;height:28px}
.upf-scale{display:flex;justify-content:space-between;font-size:.75rem;color:#7A8B9C}
.upf-perk{margin-top:12px;padding:10px 12px;border-radius:12px;background:#F0FBFA;color:#0B6E66;font-size:.83rem}
.upf-link{border:none;background:none;color:#00857D;font-weight:700;cursor:pointer;font-size:.82rem;padding:0;margin-left:auto}
.upf-submit{position:fixed;left:0;right:0;bottom:0;z-index:30;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border-top:1px solid #E6EEF2}
.upf-submit button{display:block;width:100%;max-width:728px;margin:0 auto;height:54px;border:none;border-radius:14px;font-size:1rem;font-weight:800;color:#fff;cursor:pointer;
  background:linear-gradient(120deg,#003366,#0B5C7A 55%,#00A79D);box-shadow:0 10px 24px rgba(0,51,102,.25);transition:transform .15s,opacity .2s}
.upf-submit button:active{transform:scale(.98)}
.upf-submit button:disabled{opacity:.45;box-shadow:none;cursor:not-allowed}
.upf-err{max-width:728px;margin:0 auto 8px;color:#B42318;font-size:.85rem;text-align:center}
.upf-modal{position:fixed;inset:0;z-index:1500;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,27,54,.55)}
.upf-modal > div{background:#fff;border-radius:20px;padding:26px 22px;max-width:420px;width:100%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.25)}
.upf-modal h3{margin:12px 0 8px;color:#003366;font-size:1.3rem}
.upf-modal p{color:#4A6A8A;font-size:.92rem;line-height:1.55;margin:0 0 18px}
.upf-modal ul{text-align:left;color:#4A6A8A;font-size:.9rem;line-height:1.7;margin:0 0 18px;padding-left:20px}
.upf-modal .btn{display:inline-block;border:none;border-radius:12px;padding:12px 22px;font-weight:800;color:#fff;background:linear-gradient(120deg,#003366,#00A79D);cursor:pointer;text-decoration:none}
.upf-badge{width:68px;height:68px;margin:0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#fff;background:linear-gradient(135deg,#10B981,#22D3EE)}
.upf-spin{display:inline-block;width:18px;height:18px;border-radius:50%;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;animation:upfSpin .8s linear infinite;vertical-align:-3px;margin-right:10px}
@keyframes upfSpin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.upf-hero::before,.upf-hero::after{animation:none}}
`;

const rise = (i) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] },
});

const dateFromKey = (key) => {
  if (key === "immediate") return "Immediate";
  if (key === "flexible") return "Flexible";
  const d = new Date();
  d.setDate(d.getDate() + parseInt(key, 10));
  return d.toISOString().split("T")[0];
};

function Chips({ options, value, onPick }) {
  return (
    <div className="upf-chips" role="radiogroup">
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        return (
          <button key={v} type="button" role="radio" aria-checked={value === v} className={`upf-chip${value === v ? " on" : ""}`} onClick={() => onPick(v)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function UserPreferenceForm() {
  const [form, setForm] = useState(EMPTY);
  const [timelineKey, setTimelineKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [feeInfo, setFeeInfo] = useState(false);

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const onInput = (e) => set(e.target.name, e.target.value);

  const phoneOk = /^[6-9]\d{9}$/.test(form.mobileNumber.replace(/\D/g, "").slice(-10));
  const personalDone = Boolean(form.userName.trim() && phoneOk);
  const prefsDone = Boolean(form.preferredLocation.trim() && form.budgetRange.trim() && form.bhkSize && form.propertyType.trim() && form.furnishingLevel);
  const timelineDone = Boolean(form.moveInDate);
  const valid = personalDone && prefsDone && timelineDone;

  const progress = useMemo(() => {
    const keys = ["userName", "mobileNumber", "preferredLocation", "budgetRange", "bhkSize", "propertyType", "furnishingLevel", "moveInDate"];
    return Math.round((keys.filter((k) => String(form[k]).trim()).length / keys.length) * 100);
  }, [form]);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${process.env.REACT_APP_Base_API}/api/userpreferenceform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, hasLoggedIn: false }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      setForm(EMPTY);
      setTimelineKey("");
    } catch {
      setError("Couldn't send your preferences. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const feePct = ((form.brokerageAmount - MIN_FEE) / (MAX_FEE - MIN_FEE)) * 100;

  return (
    <div className="upf">
      <style>{CSS}</style>

      <header className="upf-hero">
        <motion.h1 {...rise(0)}>Tell us what home you want</motion.h1>
        <motion.p {...rise(1)}>Share a few details and our team will hand-pick verified properties in Gurgaon that match you.</motion.p>
      </header>

      <form className="upf-wrap" onSubmit={submit} noValidate>
        <motion.div className="upf-progress" {...rise(1)}>
          <div className="upf-steps">
            <span className={personalDone ? "on" : ""}>1 · About you</span>
            <span className={prefsDone ? "on" : ""}>2 · Your home</span>
            <span className={timelineDone ? "on" : ""}>3 · Timeline</span>
          </div>
          <div className="upf-bar" aria-label={`${progress}% complete`}>
            <i style={{ width: `${Math.max(progress, 4)}%` }} />
          </div>
        </motion.div>

        {/* 1. About you */}
        <motion.section className="upf-card" {...rise(2)}>
          <h2><span className={`n${personalDone ? " done" : ""}`}>{personalDone ? "✓" : 1}</span>About you</h2>
          <p className="sub">So our property expert can reach you.</p>
          <div className="upf-grid">
            <div className="upf-field">
              <label htmlFor="upf-name">Full name</label>
              <input id="upf-name" name="userName" autoComplete="name" placeholder="e.g. Rahul Sharma" value={form.userName} onChange={onInput} className={form.userName.trim() ? "ok" : ""} />
            </div>
            <div className="upf-field">
              <label htmlFor="upf-phone">Mobile number</label>
              <input id="upf-phone" name="mobileNumber" type="tel" inputMode="numeric" autoComplete="tel" maxLength={13} placeholder="10-digit mobile" value={form.mobileNumber} onChange={onInput} className={phoneOk ? "ok" : ""} />
              {form.mobileNumber && !phoneOk && <div className="hint">Enter a valid 10-digit mobile number</div>}
            </div>
          </div>
        </motion.section>

        {/* 2. Your home */}
        <motion.section className="upf-card" {...rise(3)}>
          <h2><span className={`n${prefsDone ? " done" : ""}`}>{prefsDone ? "✓" : 2}</span>Your ideal home</h2>
          <p className="sub">Pick what fits — you can type your own too.</p>

          <div className="upf-field">
            <label htmlFor="upf-loc">Preferred location</label>
            <input id="upf-loc" name="preferredLocation" placeholder="Sector, society or area — e.g. Sector 56" value={form.preferredLocation} onChange={onInput} className={form.preferredLocation.trim() ? "ok" : ""} />
          </div>

          <div className="upf-block">
            <label>Size</label>
            <Chips options={BHK} value={form.bhkSize} onPick={(v) => set("bhkSize", v)} />
          </div>

          <div className="upf-block">
            <label>Budget</label>
            <Chips options={BUDGETS} value={form.budgetRange} onPick={(v) => set("budgetRange", v)} />
            <div className="upf-field" style={{ marginTop: 10 }}>
              <input name="budgetRange" aria-label="Budget" placeholder="Or type your budget, e.g. ₹35,000/month" value={form.budgetRange} onChange={onInput} className={form.budgetRange.trim() ? "ok" : ""} />
            </div>
          </div>

          <div className="upf-block">
            <label>Property type</label>
            <Chips options={PROPERTY_TYPES} value={form.propertyType} onPick={(v) => set("propertyType", v)} />
          </div>

          <div className="upf-block">
            <label>Furnishing</label>
            <Chips options={FURNISHING} value={form.furnishingLevel} onPick={(v) => set("furnishingLevel", v)} />
          </div>
        </motion.section>

        {/* 3. Timeline + brokerage */}
        <motion.section className="upf-card" {...rise(4)}>
          <h2><span className={`n${timelineDone ? " done" : ""}`}>{timelineDone ? "✓" : 3}</span>When do you want to move?</h2>
          <p className="sub">Helps us prioritise listings available on time.</p>
          <Chips
            options={TIMELINE.map((t) => ({ value: t.key, label: t.label }))}
            value={timelineKey}
            onPick={(k) => {
              setTimelineKey(k);
              set("moveInDate", dateFromKey(k));
            }}
          />
          <div className="upf-field upf-block">
            <label htmlFor="upf-date">Or pick a date</label>
            <input
              id="upf-date"
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={timelineKey === "custom" ? form.moveInDate : ""}
              onChange={(e) => {
                setTimelineKey(e.target.value ? "custom" : "");
                set("moveInDate", e.target.value);
              }}
            />
          </div>

          <div className="upf-block">
            <label style={{ display: "flex", alignItems: "center" }}>
              Service fee you're comfortable with
              <button type="button" className="upf-link" onClick={() => setFeeInfo(true)}>Why it matters</button>
            </label>
            <div className="upf-fee">
              <button type="button" className="upf-step" aria-label="Decrease" onClick={() => set("brokerageAmount", Math.max(MIN_FEE, form.brokerageAmount - 500))}>−</button>
              <b>₹{form.brokerageAmount.toLocaleString("en-IN")}</b>
              <button type="button" className="upf-step" aria-label="Increase" onClick={() => set("brokerageAmount", Math.min(MAX_FEE, form.brokerageAmount + 500))}>+</button>
            </div>
            <input
              className="upf-range"
              type="range"
              min={MIN_FEE}
              max={MAX_FEE}
              step={500}
              value={form.brokerageAmount}
              onChange={(e) => set("brokerageAmount", Number(e.target.value))}
              aria-label="Service fee"
            />
            <div className="upf-scale"><span>₹1,499</span><span>₹5,999</span></div>
            <div className="upf-perk">
              {feePct >= 66 ? "Priority matching with a dedicated relationship manager." : feePct >= 33 ? "Faster responses from owners and agents." : "Standard matching. Raise it for faster, priority support."}
            </div>
          </div>
        </motion.section>

        <div className="upf-submit">
          {error && <div className="upf-err">{error}</div>}
          <button type="submit" disabled={!valid || submitting}>
            {submitting ? (<><span className="upf-spin" />Sending your preferences…</>) : valid ? "Find my property matches" : `Complete the form · ${progress}%`}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {(done || feeInfo) && (
          <motion.div className="upf-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setDone(false); setFeeInfo(false); }}>
            <motion.div initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} onClick={(e) => e.stopPropagation()}>
              {done ? (
                <>
                  <div className="upf-badge">✓</div>
                  <h3>Preferences saved!</h3>
                  <p>Our team will match you with properties that fit your requirements and reach out shortly. Meanwhile, explore listings and save your favourites.</p>
                  <a className="btn" href="https://www.ggnhome.com">Explore properties</a>
                </>
              ) : (
                <>
                  <div className="upf-badge" style={{ background: "linear-gradient(135deg,#F59E0B,#FBBF24)" }}>💡</div>
                  <h3>Why the fee matters</h3>
                  <ul>
                    <li>Faster responses from owners and agents</li>
                    <li>Dedicated relationship manager support</li>
                    <li>More accurate options for your requirements</li>
                    <li>Priority property matching</li>
                  </ul>
                  <button type="button" className="btn" onClick={() => setFeeInfo(false)}>Got it</button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
