import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

const AgentAuthContext = createContext();

export function AgentAuthProvider({ children }) {
  const [agent, setAgent] = useState(() => {
    try {
      const raw = sessionStorage.getItem("agent");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  // console.log("[AgentAuthContext] initial agent from sessionStorage =", agent);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  // env or fallback
  const BASE_API = process.env.REACT_APP_Base_API || "";
  const AGENT_ME_API =
    process.env.REACT_APP_AGENT_ME_API ||
    (BASE_API ? `${String(BASE_API).replace(/\/$/, "")}/agent/me` : "/agent/me");
  const AGENT_LOGOUT_API =
    process.env.REACT_APP_AGENT_LOGOUT_API ||
    (BASE_API ? `${String(BASE_API).replace(/\/$/, "")}/agent/logout` : "/agent/logout");
  const REVALIDATE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  const fetchAgent = useCallback(
    async (opts = { force: false }) => {
      if (!opts.force && agent) {
        // we'll still background revalidate
      }
      if (isFetchingRef.current) {
        return agent;
      }
      if (mountedRef.current) setError(null);
      try {
        isFetchingRef.current = true;
        // console.log("[AgentAuthContext] fetchAgent() calling /agent/me");
        const agentToken = localStorage.getItem("agentAccessToken");
        const res = await fetch(AGENT_ME_API, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
          },
          cache: "no-store",
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            console.warn("[AgentAuthContext] fetchAgent unauthorized", res.status);

            if (mountedRef.current) setAgent(null);

            try { sessionStorage.removeItem("agent"); } catch (e) {}
            try { localStorage.removeItem("agentAccessToken"); } catch (e) {}
            try { localStorage.removeItem("agentRefreshToken"); } catch (e) {}

            // 🔔 notify entire app (top nav, user context, etc.)
            try {
              window.dispatchEvent(new Event("auth:logout"));
            } catch (e) {}

            if (mountedRef.current) {
              setAuthChecked(true);
            }

            isFetchingRef.current = false;
            return null;
          }
          const text = await res.text();
          throw new Error(`Agent fetch error ${res.status}: ${text}`);
        }

        const data = await res.json();
        const payload = data && data.agent ? data.agent : data;

        if (payload) {
          // console.log("[AgentAuthContext] fetchAgent success, payload =", payload);
          if (mountedRef.current) setAgent(payload);
          try { sessionStorage.setItem("agent", JSON.stringify(payload)); } catch (e) {}
        } else {
          // console.log("[AgentAuthContext] fetchAgent returned NO payload");
          if (mountedRef.current) setAgent(null);
          try { sessionStorage.removeItem("agent"); } catch (e) {}
        }

        isFetchingRef.current = false;
        if (mountedRef.current) setAuthChecked(true);
        return payload;
      } catch (err) {
        if (mountedRef.current) setError(err);
        isFetchingRef.current = false;
        return null;
      }
    },
    [AGENT_ME_API, agent]
  );

  // --- Patch sessionStorage.setItem once so same-tab writers can be detected ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.__patchedSessionStorageSetItem) {
      try {
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          const oldValue = this.getItem(key);
          originalSetItem.apply(this, [key, value]);
          try {
            const detail = { key, oldValue, newValue: String(value) };
            window.dispatchEvent(new CustomEvent("sessionstorage", { detail }));
          } catch (e) {
            // ignore
          }
        };
        window.__patchedSessionStorageSetItem = true;
      } catch (e) {
        // patch failed, continue without it
        // console.warn('Could not patch sessionStorage.setItem', e);
      }
    }

    // Expose helper for non-react login flows to update agent in this tab
    if (!window.__agent_set_agent) {
      window.__agent_set_agent = (a) => {
        try {
          if (a) sessionStorage.setItem("agent", JSON.stringify(a));
          else sessionStorage.removeItem("agent");
        } catch (e) {}
        // schedule state update to avoid possible update while rendering
        setTimeout(() => {
          if (mountedRef.current) setAgent(a);
        }, 0);
      };
    }
  }, [setAgent]);

  // Initial fetch + periodic revalidation (using schedule to avoid overlap)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await fetchAgent({ force: true });
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) {
          setLoading(false);
          setAuthChecked(true);
          // console.log("[AgentAuthContext] initial loading complete");
        }
      }
    })();

    let timerId = null;

    const scheduleNext = (delayMs) => {
      if (cancelled) return;
      timerId = setTimeout(async () => {
        if (cancelled) return;
        try {
          await fetchAgent({ force: true });
        } catch (e) {
          /* ignore */
        }
        scheduleNext(REVALIDATE_INTERVAL_MS);
      }, delayMs);
    };

    scheduleNext(REVALIDATE_INTERVAL_MS);

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [fetchAgent]);

  // Keep in-sync with other tabs / same-tab sessionStorage writes / custom agent events
  useEffect(() => {
    const handleSessionStorageChange = (key, newValue) => {
      if (key !== "agent") return;
      try {
        const newAgent = newValue ? JSON.parse(newValue) : null;
        if (mountedRef.current) setAgent(newAgent);
      } catch (err) {
        // ignore parse error
      }
    };

    const onStorage = (e) => {
      if (e.key === "agent") {
        handleSessionStorageChange(e.key, e.newValue);
      }
    };

    const onSessionStorage = (e) => {
      try {
        const { key, newValue } = e.detail || {};
        if (key === "agent") {
          handleSessionStorageChange(key, newValue);
        }
      } catch (err) {}
    };

    const onAgentLogin = (e) => {
      const payload = e?.detail ?? null;
      if (payload) {
        if (mountedRef.current) {
          setAgent(payload);
          try { sessionStorage.setItem("agent", JSON.stringify(payload)); } catch (e) {}
        }
      } else {
        // fallback to revalidate from server
        fetchAgent({ force: true }).catch(() => {});
      }
    };

    const onAgentLogout = () => {
      if (mountedRef.current) {
        setAgent(null);
        try { sessionStorage.removeItem("agent"); } catch (e) {}
      }
    };

    const onAuthLogout = () => {
      // console.log("[AgentAuthContext] auth:logout received");
      if (mountedRef.current) {
        setAgent(null);
        try {
          sessionStorage.removeItem("agent");
        } catch (e) {}
      }
    };

    const onAuthLogin = async (e) => {
      // console.log("[AgentAuthContext] auth:login received", e?.detail);

      if (e?.detail?.type !== "agent") return;

      try {
        await fetchAgent({ force: true });
      } catch (err) {
        console.error("[AgentAuthContext] auth:login fetchAgent failed", err);
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("sessionstorage", onSessionStorage);
    window.addEventListener("agent:login", onAgentLogin);
    window.addEventListener("agent:logout", onAgentLogout);
    window.addEventListener("auth:logout", onAuthLogout);
    window.addEventListener("auth:login", onAuthLogin);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sessionstorage", onSessionStorage);
      window.removeEventListener("agent:login", onAgentLogin);
      window.removeEventListener("agent:logout", onAgentLogout);
      window.removeEventListener("auth:logout", onAuthLogout);
      window.removeEventListener("auth:login", onAuthLogin);
    };
  }, [fetchAgent]);

  useEffect(() => {
    // console.log("[AgentAuthContext] agent state changed:", agent);
  }, [agent]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${process.env.REACT_APP_LOGOUT_API}`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.warn("Logout call failed:", e);
    }

    // clear agent state
    setAgent(null);
    try {
      sessionStorage.removeItem("agent");
    } catch (e) {}
    try {
      localStorage.removeItem("agentAccessToken");
    } catch (e) {}
    try {
      localStorage.removeItem("agentRefreshToken");
    } catch (e) {}

    // shared global logout event (UserAuthContext listens to this)
    try {
      window.dispatchEvent(new Event("auth:logout"));
    } catch (e) {}

    // backward compatibility
    try {
      window.dispatchEvent(new Event("agent:logout"));
    } catch (e) {}
  }, []);

  return authChecked ? (
    <AgentAuthContext.Provider value={{ agent, setAgent, loading, error, fetchAgent, logout }}>
      {children}
    </AgentAuthContext.Provider>
  ) : null;
}

export function useAgentAuth() {
  return useContext(AgentAuthContext);
}