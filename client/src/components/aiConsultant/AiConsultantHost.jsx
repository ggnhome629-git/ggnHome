import React, { createContext, lazy, Suspense, useCallback, useContext, useMemo, useRef, useState } from "react";
import { consultantApi } from "./consultantApi";

const AiConsultant = lazy(() => import("./AiConsultant"));

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
