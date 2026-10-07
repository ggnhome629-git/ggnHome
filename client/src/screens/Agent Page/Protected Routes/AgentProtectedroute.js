import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { openAgentSessionFromUser } from "../../../utils/agentSso";
import { useAgentAuth } from "../../../Context/AgentAuthContext";


export default function AgentProtectedRoute({ redirectTo = "/agent/login" }) {
  const { agent, loading: contextLoading, fetchAgent } = useAgentAuth();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const BASE_API = process.env.REACT_APP_Base_API || "";
  const AGENT_ME_API =
    process.env.REACT_APP_AGENT_ME_API ||
    (BASE_API
      ? `${String(BASE_API).replace(/\/$/, "")}/agent/me`
      : "/agent/me");

  useEffect(() => {
    let cancelled = false;

    const verifyAgent = async () => {
      // If context already has agent, trust it
      if (agent) {
        if (!cancelled) {
          setAuthorized(true);
          setChecking(false);
        }
        return;
      }

      try {
        const agentToken = localStorage.getItem("agentAccessToken");

        const res = await fetch(AGENT_ME_API, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...(agentToken ? { Authorization: `Bearer ${agentToken}` } : {}),
          },
        });

        if (res.ok) {
          if (!cancelled) setAuthorized(true);
          return;
        }
        // Signed in on the main site? One login covers the agent area too.
        const sso = localStorage.getItem("accessToken") ? await openAgentSessionFromUser() : { ok: false };
        if (sso.ok) await fetchAgent?.({ force: true });
        if (!cancelled) setAuthorized(sso.ok);
      } catch (e) {
        if (!cancelled) setAuthorized(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    // wait for context to finish its initial loading
    if (!contextLoading) {
      verifyAgent();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, contextLoading, AGENT_ME_API]);

  // ⏳ Still checking authentication
  if (checking || contextLoading) {
    return (
      <div style={{ padding: "80px 16px", textAlign: "center", color: "#4A6A8A", fontFamily: "Inter, sans-serif" }}>Checking your agent session…</div>
    );
  }

  // ❌ Not authorized → message + redirect
  if (!authorized) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ message: "Please log in to continue", from: location.pathname }}
      />
    );
  }

  // ✅ Authorized
  return <Outlet />;
}