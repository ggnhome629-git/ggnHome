import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { isNativeApp, nativePlugin } from "../../utils/nativeApp";

/**
 * Launch screen: bright brand colours flow across the screen while the
 * "GgnHome" wordmark sweeps in with a light shine, then the layer lifts away.
 * About 2 seconds in total, tap to skip.
 *
 * Cheap on slow phones: the colour field is CSS gradients moved with
 * transform only (GPU-composited), no blur filters, no JS animation loop.
 */
const SEEN_KEY = "ggn:introSeen";
const SHOW_MS = 2100;

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

const CSS = `
.ggn-intro-flow{position:absolute;inset:-50%;pointer-events:none;
  background:
    radial-gradient(closest-side at 30% 35%, rgba(0,167,157,.85), transparent 70%),
    radial-gradient(closest-side at 70% 30%, rgba(34,211,238,.75), transparent 70%),
    radial-gradient(closest-side at 60% 70%, rgba(139,92,246,.65), transparent 70%),
    radial-gradient(closest-side at 30% 75%, rgba(245,158,11,.45), transparent 70%);
  animation:ggnFlow 6s ease-in-out infinite alternate;will-change:transform}
.ggn-intro-flow.b{animation-duration:7.5s;animation-direction:alternate-reverse;opacity:.7;mix-blend-mode:screen}
@keyframes ggnFlow{0%{transform:translate3d(-6%,-4%,0) rotate(0deg) scale(1)}100%{transform:translate3d(6%,5%,0) rotate(25deg) scale(1.12)}}
.ggn-intro-word span{color:#fff;text-shadow:0 4px 24px rgba(34,211,238,.45);animation:ggnGlow 1s ease-in-out both}
@keyframes ggnGlow{0%,100%{color:#fff;text-shadow:0 4px 24px rgba(34,211,238,.45)}50%{color:#A5F3FC;text-shadow:0 0 28px rgba(165,243,252,.95)}}
`;

export default function AppLaunchIntro() {
  const [show, setShow] = useState(shouldPlay);

  // Take over from the static boot screen and the native splash right away.
  useEffect(() => {
    document.getElementById("ggn-boot")?.remove();
    try {
      nativePlugin("SplashScreen")?.hide({ fadeOutDuration: 200 });
    } catch {
      /* web or older app build */
    }
  }, []);

  useEffect(() => {
    if (!show) return undefined;
    const t = setTimeout(() => setShow(false), SHOW_MS);
    return () => clearTimeout(t);
  }, [show]);

  const letters = "GgnHome".split("");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          onClick={() => setShow(false)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background: "#002244",
          }}
        >
          <style>{CSS}</style>
          <div className="ggn-intro-flow" />
          <div className="ggn-intro-flow b" />
          {/* Soft vignette keeps the wordmark readable over the colours */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(0,34,68,.15) 0%, rgba(0,20,45,.55) 100%)" }} />

          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.05 }}
            style={{ position: "relative", width: 84, height: 84, borderRadius: 24, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.35)", boxShadow: "0 12px 36px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <motion.path
                d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeInOut" }}
              />
            </svg>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.3 } } }}
            className="ggn-intro-word"
            style={{ position: "relative", display: "flex", marginTop: 20, fontSize: 46, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.1 }}
          >
            {letters.map((ch, i) => (
              <motion.span
                key={i}
                variants={{ hidden: { y: 26, opacity: 0, rotateX: 60 }, show: { y: 0, opacity: 1, rotateX: 0, transition: { type: "spring", stiffness: 260, damping: 20 } } }}
                style={{ display: "inline-block", animationDelay: `${0.75 + i * 0.07}s` }}
              >
                {ch}
              </motion.span>
            ))}
          </motion.div>

          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "relative", marginTop: 12, width: 120, height: 3, borderRadius: 3, background: "linear-gradient(90deg,#00A79D,#22D3EE,#8B5CF6,#F59E0B)" }}
          />
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 0.9, y: 0 }}
            transition={{ delay: 1.0, duration: 0.4 }}
            style={{ position: "relative", color: "#E0F7FA", margin: "12px 0 0", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase" }}
          >
            Get Space · Get Rewarded
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
