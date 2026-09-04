import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAgentAuth } from "../../../Context/AgentAuthContext";


export default function AgentProtectedRoute({ redirectTo = "/agent/login" }) {
  const { agent, loading: contextLoading } = useAgentAuth();

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

        if (!cancelled && res.ok) {
          setAuthorized(true);
        } else if (!cancelled) {
          setAuthorized(false);
        }
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
  }, [agent, contextLoading, AGENT_ME_API]);

  // ⏳ Still checking authentication
  if (checking || contextLoading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h3>Checking agent session…</h3>
        <p>Please wait</p>
      </div>
    );
  }

  // ❌ Not authorized → message + redirect
  if (!authorized) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ message: "Please login to access this page" }}
      />
    );
  }

  // ✅ Authorized
  return <Outlet />;
}