import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Globe, Heart, Laptop, Share2, Smartphone, Sparkles, X, Zap } from "lucide-react";
import { isNativeApp, nativePlugin } from "../../utils/nativeApp";

/**
 * Website <-> app cross-promotion. Links come from Admin → Settings →
 * "App & Website Links" (GET /api/app-links):
 *   - on the website, a Play Store link shows "Get the GgnHome app";
 *   - inside the app, a website link shows "GgnHome on the web".
 * Nothing renders until the matching link is set.
 *
 *   <CrossPromo variant="section" />  full-width marketing band
 *   <CrossPromo variant="strip" />    slim dismissible strip (phones only)
 */
const CACHE_KEY = "ggn:appLinks";
const STRIP_DISMISS_KEY = "ggn:appStripDismissedAt";
const STRIP_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

let inflight = null;
function loadLinks() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (cached) return Promise.resolve(cached);
  } catch {
    /* ignore */
  }
  if (!inflight) {
    inflight = fetch(`${process.env.REACT_APP_Base_API || ""}/api/app-links`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        const v = { playStoreUrl: d.playStoreUrl || "", websiteUrl: d.websiteUrl || "" };
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(v));
        } catch {
          /* ignore */
        }
        return v;
      })
      .catch(() => ({ playStoreUrl: "", websiteUrl: "" }));
  }
  return inflight;
}

function useLinks() {
  const [links, setLinks] = useState(null);
  useEffect(() => {
    let alive = true;
    loadLinks().then((v) => alive && setLinks(v));
    return () => {
      alive = false;
    };
  }, []);
  return links;
}

const CSS = `
.xp-band{position:relative;overflow:hidden;margin:32px auto;max-width:1200px;border-radius:24px;color:#fff;
  background:linear-gradient(125deg,#002244 0%,#003366 40%,#0B5C7A 70%,#00A79D 100%);box-shadow:0 18px 44px rgba(0,51,102,.22)}
.xp-band::before{content:"";position:absolute;width:380px;height:380px;border-radius:50%;right:-120px;top:-140px;
  background:radial-gradient(closest-side,rgba(34,211,238,.45),transparent);animation:xpFloat 10s ease-in-out infinite alternate;pointer-events:none}
.xp-band::after{content:"";position:absolute;width:300px;height:300px;border-radius:50%;left:-120px;bottom:-160px;
  background:radial-gradient(closest-side,rgba(139,92,246,.4),transparent);animation:xpFloat 12s ease-in-out infinite alternate-reverse;pointer-events:none}
@keyframes xpFloat{to{transform:translate3d(30px,24px,0) scale(1.1)}}
.xp-inner{position:relative;z-index:1;display:grid;grid-template-columns:1.25fr .75fr;gap:24px;align-items:center;padding:36px 40px}
@media (max-width:860px){.xp-inner{grid-template-columns:1fr;padding:28px 20px;text-align:left}.xp-art{display:none}}
.xp-kicker{display:inline-flex;align-items:center;gap:6px;font-size:.72rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#A5F3FC;background:rgba(255,255,255,.1);padding:6px 10px;border-radius:999px}
.xp-title{margin:12px 0 8px;font-size:clamp(1.5rem,3.6vw,2.2rem);font-weight:800;line-height:1.15}
.xp-title em{font-style:normal;background:linear-gradient(90deg,#22D3EE,#A5F3FC);-webkit-background-clip:text;background-clip:text;color:transparent}
.xp-sub{margin:0 0 18px;opacity:.88;max-width:540px;line-height:1.55}
.xp-feats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 18px;margin:0 0 22px;padding:0;list-style:none}
.xp-feats li{display:flex;align-items:center;gap:10px;font-size:.92rem;font-weight:600}
.xp-feats li span{width:30px;height:30px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.12);flex-shrink:0}
@media (max-width:420px){.xp-feats{grid-template-columns:1fr}}
.xp-actions{display:flex;flex-wrap:wrap;gap:10px}
.xp-btn{display:inline-flex;align-items:center;gap:10px;height:50px;padding:0 20px;border-radius:14px;font-weight:800;font-size:.95rem;text-decoration:none;border:none;cursor:pointer;transition:transform .15s,box-shadow .15s}
.xp-btn:active{transform:scale(.97)}
.xp-btn.primary{background:#fff;color:#003366;box-shadow:0 10px 24px rgba(0,0,0,.2)}
.xp-btn.primary:hover{transform:translateY(-2px)}
.xp-btn.ghost{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.35)}
.xp-gp small{display:block;font-size:.62rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.7;line-height:1}
.xp-gp b{display:block;font-size:1.02rem;line-height:1.1}
.xp-art{display:flex;justify-content:center}
.xp-phone{width:190px;height:360px;border-radius:32px;background:#0B1B2E;padding:10px;box-shadow:0 30px 60px rgba(0,0,0,.35),inset 0 0 0 2px rgba(255,255,255,.12);animation:xpBob 5s ease-in-out infinite}
@keyframes xpBob{50%{transform:translateY(-10px) rotate(-1.5deg)}}
.xp-screen{height:100%;border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#F4F7F9,#fff);display:flex;flex-direction:column}
.xp-screen .top{background:linear-gradient(120deg,#003366,#00A79D);color:#fff;padding:18px 12px 14px;font-weight:800;font-size:.95rem}
.xp-screen .card{margin:8px 10px 0;height:58px;border-radius:12px;background:#fff;box-shadow:0 4px 10px rgba(0,51,102,.08);display:flex;gap:8px;padding:8px}
.xp-screen .card i{width:42px;border-radius:8px;background:linear-gradient(135deg,#9ADBD5,#C7E9F5)}
.xp-screen .card u{flex:1;display:flex;flex-direction:column;gap:6px;text-decoration:none}
.xp-screen .card u::before,.xp-screen .card u::after{content:"";height:8px;border-radius:4px;background:#E2EAF0}
.xp-screen .card u::after{width:60%;background:#BFE9E5}
.xp-strip{display:flex;align-items:center;gap:12px;padding:10px 12px;background:linear-gradient(90deg,#003366,#0B5C7A);color:#fff}
.xp-strip .ic{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#00A79D,#22D3EE);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.xp-strip .tx{flex:1;min-width:0;line-height:1.25}
.xp-strip .tx b{display:block;font-size:.9rem}
.xp-strip .tx span{font-size:.75rem;opacity:.8}
.xp-strip a{background:#fff;color:#003366;font-weight:800;font-size:.82rem;border-radius:999px;padding:8px 14px;text-decoration:none;white-space:nowrap}
.xp-strip button{background:none;border:none;color:#fff;opacity:.7;padding:4px;cursor:pointer;display:flex}
@media (max-width:860px){.xp-art{display:none}}
@media (prefers-reduced-motion:reduce){.xp-band::before,.xp-band::after,.xp-phone{animation:none}}
`;

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

function GooglePlayMark() {
  return (
    <svg width="22" height="24" viewBox="0 0 24 26" aria-hidden="true">
      <path d="M1 1.5 13.5 13 1 24.5A2 2 0 0 1 0 23V3a2 2 0 0 1 1-1.5z" fill="#00A79D" />
      <path d="M17.6 9.2 13.5 13 1 1.5c.3-.2.8-.2 1.2 0z" fill="#22D3EE" />
      <path d="M17.6 16.8 2.2 26c-.4.2-.9.2-1.2 0L13.5 13z" fill="#8B5CF6" />
      <path d="m17.6 9.2 4.7 2.7c.9.6.9 1.6 0 2.2l-4.7 2.7-4.1-3.8z" fill="#F59E0B" />
    </svg>
  );
}

/** Website: "Get the app". */
function AppSection({ url }) {
  return (
    <motion.section className="xp-band" {...reveal} aria-label="Get the GgnHome app">
      <div className="xp-inner">
        <div>
          <span className="xp-kicker"><Smartphone size={14} /> Now on Android</span>
          <h2 className="xp-title">Your next home, <em>one tap away</em></h2>
          <p className="xp-sub">Get the GgnHome app for instant alerts on new listings, saved searches that follow you, and faster browsing — even on a slow connection.</p>
          <ul className="xp-feats">
            <li><span><Bell size={16} /></span>Instant new-listing alerts</li>
            <li><span><Sparkles size={16} /></span>Homes picked for you</li>
            <li><span><Heart size={16} /></span>Save & compare anywhere</li>
            <li><span><Zap size={16} /></span>Fast, works offline</li>
          </ul>
          <div className="xp-actions">
            <a className="xp-btn primary xp-gp" href={url} target="_blank" rel="noopener noreferrer">
              <GooglePlayMark />
              <span><small>Get it on</small><b>Google Play</b></span>
            </a>
          </div>
        </div>
        <div className="xp-art" aria-hidden="true">
          <div className="xp-phone">
            <div className="xp-screen">
              <div className="top">GgnHome</div>
              <div className="card"><i /><u /></div>
              <div className="card"><i /><u /></div>
              <div className="card"><i /><u /></div>
              <div className="card"><i /><u /></div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/** App: "GgnHome on the web" — open it or share it with friends. */
function WebSection({ url }) {
  const host = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const share = () => {
    const Share = nativePlugin("Share");
    const payload = { title: "GgnHome", text: "Find verified homes in Gurgaon on GgnHome", url, dialogTitle: "Share GgnHome" };
    if (Share?.share) Share.share(payload).catch(() => {});
    else if (navigator.share) navigator.share(payload).catch(() => {});
  };
  return (
    <motion.section className="xp-band" {...reveal} aria-label="GgnHome on the web">
      <div className="xp-inner" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <span className="xp-kicker"><Globe size={14} /> Also on the web</span>
          <h2 className="xp-title">Browse on the big screen at <em>{host}</em></h2>
          <p className="xp-sub">Compare homes side by side on your laptop, use the full map and tools, and share listings with family. Your saved homes sync when you sign in.</p>
          <ul className="xp-feats">
            <li><span><Laptop size={16} /></span>Bigger photos & maps</li>
            <li><span><Heart size={16} /></span>Same account, same saves</li>
          </ul>
          <div className="xp-actions">
            <a className="xp-btn primary" href={url} target="_blank" rel="noopener noreferrer"><Globe size={18} /> Open website</a>
            <button type="button" className="xp-btn ghost" onClick={share}><Share2 size={18} /> Share with friends</button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/** Website on Android phones only: slim "Open in app" strip, snoozed for 7 days on close. */
function AppStrip({ url }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return Date.now() - Number(localStorage.getItem(STRIP_DISMISS_KEY) || 0) < STRIP_SNOOZE_MS;
    } catch {
      return false;
    }
  });
  if (hidden || !/Android/i.test(navigator.userAgent || "")) return null;
  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(STRIP_DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="xp-strip" role="region" aria-label="Get the app">
      <button type="button" aria-label="Dismiss" onClick={close}><X size={16} /></button>
      <div className="ic"><Smartphone size={20} /></div>
      <div className="tx"><b>GgnHome app</b><span>Faster, with instant listing alerts</span></div>
      <a href={url} target="_blank" rel="noopener noreferrer">Get app</a>
    </div>
  );
}

export default function CrossPromo({ variant = "section" }) {
  const links = useLinks();
  if (!links) return null;
  const native = isNativeApp();
  let body = null;
  if (variant === "strip") body = !native && links.playStoreUrl ? <AppStrip url={links.playStoreUrl} /> : null;
  else if (native) body = links.websiteUrl ? <WebSection url={links.websiteUrl} /> : null;
  else body = links.playStoreUrl ? <AppSection url={links.playStoreUrl} /> : null;
  if (!body) return null;
  return (
    <>
      <style>{CSS}</style>
      <div style={variant === "section" ? { padding: "0 16px" } : undefined}>{body}</div>
    </>
  );
}
