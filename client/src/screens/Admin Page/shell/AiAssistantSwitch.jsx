import React, { useCallback, useEffect, useState } from "react";
import { Box, CircularProgress, Switch, Tooltip, Typography } from "@mui/material";
import { Sparkles } from "lucide-react";

const API = process.env.REACT_APP_Base_API || "";

/**
 * Top-bar switch for the AI assistant (chat + voice) on the public site.
 * It reads and saves through the same admin feature-toggle API as the Feature Toggles page,
 * sending the other two switches back unchanged.
 */
export default function AiAssistantSwitch({ onDark = false }) {
  const [toggles, setToggles] = useState(null); // { flatmates, agentPortal, aiAssistant }
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API}/api/admin/feature-toggles`, { credentials: "include" });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!cancelled) setToggles({ flatmates: data.flatmates === true, agentPortal: data.agentPortal === true, aiAssistant: data.aiAssistant === true });
      } catch {
        if (!cancelled) setProblem("Could not load the AI assistant switch.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const change = useCallback(
    async (event) => {
      if (!toggles || busy) return;
      const next = event.target.checked;
      setBusy(true);
      setProblem("");
      try {
        const response = await fetch(`${API}/api/admin/feature-toggles`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flatmates: toggles.flatmates, agentPortal: toggles.agentPortal, aiAssistant: next }),
        });
        if (!response.ok) throw new Error();
        setToggles({ ...toggles, aiAssistant: next });
        // Lets this browser's site tabs follow at once; other visitors pick it up within about 20 seconds.
        window.dispatchEvent(new CustomEvent("featureTogglesUpdated", { detail: { aiAssistant: next } }));
      } catch {
        setProblem("Could not save. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [toggles, busy]
  );

  const on = toggles?.aiAssistant === true;
  return (
    <Tooltip title={problem || (on ? "AI assistant is ON for visitors" : "AI assistant is OFF for visitors")}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.25, borderRadius: 999, border: "1px solid", borderColor: problem ? "error.main" : onDark ? (on ? "#5EEAD4" : "rgba(255,255,255,.35)") : on ? "#00A79D" : "#E5E9EE", backgroundColor: onDark ? "rgba(255,255,255,.12)" : on ? "rgba(0,167,157,0.08)" : "transparent" }}>
        <Sparkles size={15} color={onDark ? (on ? "#5EEAD4" : "#fff") : on ? "#00A79D" : "#9AA7B4"} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: onDark ? "#fff" : on ? "#00796B" : "text.secondary", display: onDark ? "inline" : { xs: "none", sm: "inline" } }}>
          {onDark ? `AI assistant for visitors: ${on ? "ON" : "OFF"}` : "AI assistant"}
        </Typography>
        {busy ? <CircularProgress size={18} sx={{ mx: 1 }} /> : <Switch size="small" checked={on} onChange={change} disabled={!toggles} slotProps={{ input: { "aria-label": "AI assistant on or off for visitors" } }} />}
      </Box>
    </Tooltip>
  );
}
