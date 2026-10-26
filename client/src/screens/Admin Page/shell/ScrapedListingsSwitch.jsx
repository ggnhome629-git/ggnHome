import React, { useCallback, useEffect, useState } from "react";
import { Box, CircularProgress, Switch, Tooltip, Typography } from "@mui/material";
import { Globe } from "lucide-react";

const API = process.env.REACT_APP_Base_API || "";

/** Reads the switch state; other admin screens (Scraper Control) use it to lock themselves. */
export async function fetchScrapedListingsEnabled() {
  const response = await fetch(`${API}/api/admin/feature-toggles`, { credentials: "include" });
  if (!response.ok) throw new Error("Could not load feature settings.");
  const data = await response.json();
  return data.scrapedListings !== false;
}

/**
 * Landing-page switch for scraped (imported) properties. OFF hides every
 * scraped listing from the public site and locks the scraper, NoBroker sync
 * and property sync. Saving clears the server read cache, so visitors see
 * the change within a minute or two.
 */
export default function ScrapedListingsSwitch({ onDark = false }) {
  const [enabled, setEnabled] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchScrapedListingsEnabled()
      .then((value) => !cancelled && setEnabled(value))
      .catch(() => !cancelled && setProblem("Could not load the scraped properties switch."));
    return () => {
      cancelled = true;
    };
  }, []);

  const change = useCallback(
    async (event) => {
      if (enabled === null || busy) return;
      const next = event.target.checked;
      if (
        !next &&
        !window.confirm("Hide all scraped properties from the website and lock the scraper?")
      ) {
        return;
      }
      setBusy(true);
      setProblem("");
      try {
        const response = await fetch(`${API}/api/admin/feature-toggles/scraped-listings`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: next }),
        });
        if (!response.ok) throw new Error();
        setEnabled(next);
        window.dispatchEvent(new CustomEvent("featureTogglesUpdated", { detail: { scrapedListings: next } }));
      } catch {
        setProblem("Could not save. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [enabled, busy]
  );

  const on = enabled === true;
  return (
    <Tooltip
      title={
        problem ||
        (on
          ? "Scraped properties are shown on the website and the scraper is unlocked"
          : "Scraped properties are hidden from the website and the scraper is locked")
      }
    >
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: 0.25, borderRadius: 999, border: "1px solid", borderColor: problem ? "error.main" : onDark ? (on ? "#5EEAD4" : "rgba(255,255,255,.35)") : on ? "#00A79D" : "#E5E9EE", backgroundColor: onDark ? "rgba(255,255,255,.12)" : on ? "rgba(0,167,157,0.08)" : "transparent" }}>
        <Globe size={15} color={onDark ? (on ? "#5EEAD4" : "#fff") : on ? "#00A79D" : "#9AA7B4"} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: onDark ? "#fff" : on ? "#00796B" : "text.secondary" }}>
          {`Scraped properties: ${enabled === null ? "…" : on ? "ON" : "OFF"}`}
        </Typography>
        {busy ? (
          <CircularProgress size={18} sx={{ mx: 1 }} />
        ) : (
          <Switch size="small" checked={on} onChange={change} disabled={enabled === null} slotProps={{ input: { "aria-label": "Scraped properties on or off" } }} />
        )}
      </Box>
    </Tooltip>
  );
}
