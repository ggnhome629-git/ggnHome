import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { isNativeApp } from "../../utils/nativeApp";

/**
 * Animated launch screen: brand mark draws in over a drifting aurora with
 * expanding ripple rings, then the whole layer lifts away to reveal the app.
 * Plays on every cold start inside the Android app and once per browser
 * session on the website. Skipped for users who prefer reduced motion.
 */
const SEEN_KEY = "ggn:introSeen";
const DURATION_MS = 1900;

const shouldPlay = () => {
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    if (window.location.pathname.startsWith("/admin")) return false;
    if (sessionStorage.getItem(SEEN_KEY)) return false;
    sessionStorage.setItem(SEEN_KEY, "1");
    return isNativeApp() || window.location.pathname === "/";
  } catch {
    return false;
  }
};

export default function AppLaunchIntro() {
  const [show, setShow] = useState(shouldPlay);

  useEffect(() => {
    if (!show) return undefined;
    const t = setTimeout(() => setShow(false), DURATION_MS);
    return () => clearTimeout(t);
  }, [show]);

  const word = "GgnHome".split("");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          onClick={() => setShow(false)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06, filter: "blur(6px)" }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background: "radial-gradient(120% 90% at 50% 40%, #0B5C7A 0%, #003366 55%, #001B36 100%)",
          }}
        >
          {/* Drifting aurora blobs */}
          {[
            { c: "#00A79D", x: "-30%", y: "-25%", d: 0 },
            { c: "#22D3EE", x: "35%", y: "30%", d: 0.2 },
            { c: "#8B5CF6", x: "25%", y: "-35%", d: 0.4 },
          ].map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.45, scale: 1.1, x: [0, 30, -20], y: [0, -20, 15] }}
              transition={{ duration: 2.4, delay: b.d, ease: "easeInOut" }}
              style={{ position: "absolute", left: "50%", top: "50%", width: 360, height: 360, marginLeft: -180, marginTop: -180, translate: `${b.x} ${b.y}`, borderRadius: "50%", background: b.c, filter: "blur(80px)" }}
            />
          ))}

          {/* Ripple rings */}
          {[0, 0.35, 0.7].map((d) => (
            <motion.span
              key={d}
              initial={{ scale: 0.4, opacity: 0.7 }}
              animate={{ scale: 3.2, opacity: 0 }}
              transition={{ duration: 1.6, delay: 0.25 + d, ease: "easeOut" }}
              style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", border: "2px solid rgba(34,211,238,0.6)" }}
            />
          ))}

          {/* Logo mark: house outline draws itself */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
            style={{ position: "relative", width: 96, height: 96, borderRadius: 26, background: "linear-gradient(135deg,#00A79D,#22D3EE)", boxShadow: "0 18px 50px rgba(34,211,238,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <motion.path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: 0.35, ease: "easeInOut" }} />
            </svg>
          </motion.div>

          {/* Wordmark, letter by letter */}
          <div style={{ display: "flex", marginTop: 22, position: "relative" }}>
            {word.map((ch, i) => (
              <motion.span
                key={i}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.55 + i * 0.05, type: "spring", stiffness: 300, damping: 20 }}
                style={{ color: "#fff", fontSize: 34, fontWeight: 800, letterSpacing: "0.01em", fontFamily: "inherit" }}
              >
                {ch}
              </motion.span>
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.85, y: 0 }}
            transition={{ delay: 1.0, duration: 0.4 }}
            style={{ color: "#BDEFF5", margin: "6px 0 0", fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase", position: "relative" }}
          >
            Find your home in Gurgaon
          </motion.p>

          {/* Progress shimmer */}
          <div style={{ position: "absolute", bottom: "calc(48px + env(safe-area-inset-bottom))", width: 140, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: DURATION_MS / 1000 - 0.2, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%", background: "linear-gradient(90deg,#00A79D,#22D3EE)" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
