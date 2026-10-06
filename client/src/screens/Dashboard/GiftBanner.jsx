import React, { useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { Gift, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DISMISS_KEY = "giftBannerDismissed";

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch (e) {
    return false;
  }
}

/**
 * The very top of the dashboard: one headline, nothing else. Clicking it takes
 * the user to the rewards page; the close button hides it for the session.
 */
export default function GiftBanner() {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(wasDismissed);

  if (hidden) return null;

  const dismiss = (e) => {
    e.stopPropagation();
    setHidden(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch (err) {
      // storage unavailable — the banner simply returns on next visit
    }
  };

  return (
    <Box
      role="region"
      aria-label="Rewards offer"
      onClick={() => navigate("/rewards")}
      sx={{
        position: "relative",
        cursor: "pointer",
        overflow: "hidden",
        color: "#3B2A00",
        background:
          "linear-gradient(100deg, #F6C453 0%, #FFE08A 38%, #F6C453 62%, #F0B429 100%)",
        backgroundSize: "200% 100%",
        animation: "giftShimmer 9s ease-in-out infinite",
        "@keyframes giftShimmer": {
          "0%, 100%": { backgroundPosition: "0% 0" },
          "50%": { backgroundPosition: "100% 0" },
        },
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        px: { xs: 10, sm: 12 },
        py: { xs: 2.5, md: 3 },
        textAlign: "center",
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2.5,
          maxWidth: "100%",
        }}
      >
        <Gift size={18} aria-hidden style={{ flexShrink: 0 }} />
        <Typography
          component="p"
          sx={{
            m: 0,
            fontWeight: 700,
            letterSpacing: "0.01em",
            fontSize: { xs: "0.78rem", sm: "0.9rem", md: "0.98rem" },
            lineHeight: 1.3,
          }}
        >
          Register, deal with us &amp; get rewarded —{" "}
          <Box component="span" sx={{ whiteSpace: "nowrap" }}>
            gifts worth up to ₹1,000
          </Box>
        </Typography>
      </Box>

      <IconButton
        size="small"
        onClick={dismiss}
        aria-label="Dismiss offer banner"
        sx={{
          position: "absolute",
          right: { xs: 4, sm: 12 },
          top: "50%",
          transform: "translateY(-50%)",
          color: "inherit",
        }}
      >
        <X size={16} />
      </IconButton>
    </Box>
  );
}
