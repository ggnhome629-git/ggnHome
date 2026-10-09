import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { isNativeApp, nativePlugin } from "../../utils/nativeApp";

/**
 * Launch screen: the brand mark settles in, the wordmark rises letter by
 * letter, and a status line says we're curating listings while the first
 * screen loads. It holds for a comfortable minimum so it is actually seen,
 * then lifts away once the page has loaded (capped so it never blocks).
 *
 * Low-power phones (few CPU cores, <=4 GB RAM, or Data Saver) get a static
 * gradient instead of animated blobs. Only transform/opacity are animated,
 * which the GPU handles cheaply; no blur filters are used.
 */
const SEEN_KEY = "ggn:introSeen";
const MIN_MS = 3200; // long enough to read the status line
const MAX_MS = 5000; // never hold the user longer than this

const STATUS_LINES = [
  "Curating properties near you",
  "Finding homes that fit your budget",
  "Checking the latest listings",
];

const isLowPower = () => {
  try {
    const cores = navigator.hardwareConcurrency || 8;
    const mem = navigator.deviceMemory || 8;
    return cores <= 4 || mem <= 4 || navigator.connection?.saveData === true;
  } catch {
    return false;
  }
};

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
  const [line, setLine] = useState(0);
  const lowPower = useMemo(isLowPower, []);

  // Hand over from the static boot screen (index.html) and the native splash
  // as soon as React is up, so the animation is seen from its first frame
  // instead of playing behind the 2s native splash.
  useEffect(() => {
    document.getElementById("ggn-boot")?.remove();
    try {
      nativePlugin("SplashScreen")?.hide({ fadeOutDuration: 250 });
    } catch {
      /* web or older app build */
    }
  }, []);

  // Hide once the page has loaded and the minimum time has passed (or at the cap).
  useEffect(() => {
    if (!show) return undefined;
    const start = Date.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_MS - (Date.now() - start));
      setTimeout(() => setShow(false), wait);
    };
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    const cap = setTimeout(() => setShow(false), MAX_MS);
    return () => {
      window.removeEventListener("load", finish);
      clearTimeout(cap);
    };
  }, [show]);

  // Rotate the status line gently while we wait.
  useEffect(() => {
    if (!show) return undefined;
    const t = setInterval(() => setLine((i) => (i + 1) % STATUS_LINES.length), 1100);
    return () => clearInterval(t);
  }, [show]);

  const word = "GgnHome".split("");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          onClick={() => setShow(false)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            overflow: "hidden",
            background: "linear-gradient(160deg, #0B5C7A 0%, #003366 55%, #001B36 100%)",
            willChange: "opacity",
          }}
        >
          {/* Soft aurora: animated only on capable phones */}
          {!lowPower &&
            [0, 1].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.22, scale: 1.05, x: i ? [0, -24, 0] : [0, 24, 0], y: i ? [0, 18, 0] : [0, -18, 0] }}
                transition={{ opacity: { duration: 1.2 }, scale: { duration: 1.6, ease: "easeOut" }, x: { duration: 9, repeat: Infinity, ease: "easeInOut" }, y: { duration: 9, repeat: Infinity, ease: "easeInOut" } }}
                style={{
                  position: "absolute",
                  width: 420,
                  height: 420,
                  left: i ? "45%" : "-20%",
                  top: i ? "40%" : "-15%",
                  borderRadius: "50%",
                  background: i ? "radial-gradient(circle, #22D3EE 0%, transparent 65%)" : "radial-gradient(circle, #00A79D 0%, transparent 65%)",
                  pointerEvents: "none",
                }}
              />
            ))}

          {/* Logo tile: fades and scales in, then holds still */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "relative", width: 104, height: 104, borderRadius: 28, background: "linear-gradient(135deg,#00A79D,#22D3EE)", boxShadow: "0 16px 40px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <motion.path
                d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.5, ease: "easeInOut" }}
              />
            </svg>
          </motion.div>

          {/* Wordmark rises in */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.9 } } }}
            style={{ display: "flex", marginTop: 24, position: "relative" }}
          >
            {word.map((ch, i) => (
              <motion.span
                key={i}
                variants={{ hidden: { y: 18, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
                style={{ color: "#fff", fontSize: 34, fontWeight: 800, letterSpacing: "0.01em" }}
              >
                {ch}
              </motion.span>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            style={{ color: "#BDEFF5", margin: "8px 0 0", fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", position: "relative" }}
          >
            Find your home in Gurgaon
          </motion.p>

          {/* Loading status: rotating message + indeterminate bar */}
          <div style={{ position: "absolute", bottom: "calc(56px + env(safe-area-inset-bottom))", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "0 24px" }}>
            <motion.div
              key={line}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ color: "#E6FBFD", fontSize: 14, fontWeight: 600, textAlign: "center" }}
            >
              {STATUS_LINES[line]}…
            </motion.div>
            <div style={{ width: 160, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: "100%", height: "100%", background: "linear-gradient(90deg,#00A79D,#22D3EE)" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
