import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { Home } from "lucide-react";

/**
 * Full-screen cover shown while the dashboard's first screen settles. The
 * page keeps mounting behind it, so by the time it fades the content is there.
 */
export default function DashboardLoader({ visible }) {
  return (
    <Box
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        backgroundColor: "background.paper",
        opacity: visible ? 1 : 0,
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity .35s ease, visibility 0s linear " + (visible ? "0s" : ".35s"),
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "16px",
          display: "grid",
          placeItems: "center",
          color: "common.white",
          backgroundColor: "primary.main",
          animation: "dashLoaderPulse 1.4s ease-in-out infinite",
          "@keyframes dashLoaderPulse": {
            "0%, 100%": { transform: "scale(1)", opacity: 1 },
            "50%": { transform: "scale(0.92)", opacity: 0.75 },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        <Home size={26} aria-hidden />
      </Box>
      <Box sx={{ width: 160 }}>
        <LinearProgress color="secondary" sx={{ borderRadius: 2 }} />
      </Box>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Loading GgnHome…
      </Typography>
    </Box>
  );
}
