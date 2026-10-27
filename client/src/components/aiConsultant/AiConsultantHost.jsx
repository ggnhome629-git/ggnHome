import { API_BASE } from "../../utils/apiBase";
import React, { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { consultantApi } from "./consultantApi";
import { useAiConsultantEnabled } from "./featureFlag";

// Live: the GgnBot quest (text and taps, no sound or mic). The voice version stays in
// ./AiConsultant — switch this import back to bring it live again.
const AiConsultant = lazy(() => import("./AiConsultantQuest"));

const AiConsultantContext = createContext({
  isOpen: false,
  isActive: false,
  open: () => {},
  onManualSearch: () => () => {},
});

/**
 * Mounts the AI Consultant once for the whole app, so a minimised (floating)
 * conversation and any voice session survive page navigation.
 */
export function AiConsultantProvider({ children }) {
  const aiEnabled = useAiConsultantEnabled();
  // Disabled build: render no consultant and no wake-up call. The default
  // context value (closed, open is a no-op) keeps every caller working.
  if (!aiEnabled) return children;
  return <AiConsultantSession>{children}</AiConsultantSession>;
}

function AiConsultantSession({ children }) {
  // Free-tier hosting sleeps when idle: wake the API as soon as the site loads,
  // so the consultant (and voice) answer quickly when the visitor opens it.
  useEffect(() => {
    const base = API_BASE || "";
    fetch(`${base}/api/ai-consultant/config`, { credentials: "omit" }).catch(() => {});
  }, []);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const manualListeners = useRef(new Set());

  const openConsultant = useCallback((source = "manual") => {
    setMounted(true);
    setMinimized(false);
    setOpen(true);
    consultantApi.metric(source === "auto" ? "opened_auto" : "opened_manual");
  }, []);

  const close = useCallback((reason) => {
    setOpen(false);
    setMinimized(false);
    if (reason === "manual") {
      consultantApi.metric("closed_manual_search");
      manualListeners.current.forEach((fn) => fn());
    }
  }, []);

  /** Pages can react when the visitor leaves the consultant for manual search. */
  const onManualSearch = useCallback((fn) => {
    manualListeners.current.add(fn);
    return () => manualListeners.current.delete(fn);
  }, []);

  const value = useMemo(
    () => ({ isOpen: open, isActive: open || minimized, open: openConsultant, onManualSearch }),
    [open, minimized, openConsultant, onManualSearch]
  );

  return (
    <AiConsultantContext.Provider value={value}>
      {children}
      {mounted ? (
        <Suspense fallback={null}>
          <AiConsultant
            open={open}
            minimized={minimized}
            onClose={close}
            onMinimize={() => {
              setOpen(false);
              setMinimized(true);
            }}
            onExpand={() => {
              setMinimized(false);
              setOpen(true);
            }}
          />
        </Suspense>
      ) : null}
    </AiConsultantContext.Provider>
  );
}

export const useAiConsultant = () => useContext(AiConsultantContext);
