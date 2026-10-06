/**
 * Listing "visibility score": each item is worth some points when filled in.
 * Weights for a form add up to 100, so a fully filled listing scores 100 and
 * every field removed takes its points back off.
 *
 *   item = { key, label, points, step, done: (ctx) => boolean | number(0–1) }
 *
 * `done` may return a fraction for partial credit (e.g. 2 of 5 photos).
 */
export function computeScore(items, ctx) {
  let score = 0;
  const missing = [];
  items.forEach((item) => {
    const raw = item.done(ctx);
    const fraction = typeof raw === "number" ? Math.max(0, Math.min(1, raw)) : raw ? 1 : 0;
    const earned = item.points * fraction;
    score += earned;
    if (fraction < 1) missing.push({ ...item, gain: Math.round(item.points - earned) });
  });
  missing.sort((a, b) => b.gain - a.gain);
  return { score: Math.round(score), missing };
}

export function scoreTone(score) {
  if (score >= 90) return { label: "Excellent", color: "#16A34A" };
  if (score >= 70) return { label: "Good", color: "#00A79D" };
  if (score >= 40) return { label: "Fair", color: "#F59E0B" };
  return { label: "Low", color: "#EF4444" };
}

// Portals don't allow contact details inside listing text — enquiries go
// through the site. Catches 10-digit numbers (with spaces/dashes) and emails.
const PHONE = /(?:\+?91[\s-]*)?(?:\d[\s-]*){10}/;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
export function containsContactInfo(text) {
  const s = String(text || "");
  return PHONE.test(s) || EMAIL.test(s);
}

export function isPastDate(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/** ₹ in the way Indians say it: 85,000 / 12.5 Lakh / 2.1 Crore. */
export function rupeesInWords(value) {
  const n = Number(value);
  if (!value || !Number.isFinite(n) || n <= 0) return "";
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Crore`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} Lakh`;
  return `₹${n.toLocaleString("en-IN")}`;
}
