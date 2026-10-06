import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { Home } from "lucide-react";

/** Shown while a lazily loaded page's code downloads. */
export default function PageLoader() {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
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
          animation: "pagePulse 1.4s ease-in-out infinite",
          "@keyframes pagePulse": {
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
        Loading…
      </Typography>
    </Box>
  );
}
