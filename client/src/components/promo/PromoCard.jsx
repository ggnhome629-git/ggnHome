import React from "react";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { ArrowRight, X } from "lucide-react";
import { PROMO_ICONS, PROMO_THEMES } from "./promoData";
import { radii } from "../../theme/theme";

/**
 * One promo tile, rendered from admin data (or a built-in default). Used in
 * the search grid and the dashboard offers carousel.
 */
export default function PromoCard({ promo, onClick, onDismiss, minHeight = 300 }) {
  const theme = PROMO_THEMES[promo.theme] || PROMO_THEMES.navy;
  const Icon = PROMO_ICONS[promo.icon] || PROMO_ICONS.sparkles;

  return (
    <Box
      component="aside"
      aria-label={promo.title}
      sx={{
        position: "relative",
        overflow: "hidden",
        height: "100%",
        minHeight,
        p: { xs: 6, md: 7 },
        borderRadius: `${radii.lg}px`,
        color: "common.white",
        background: theme.background,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 6,
        transition: "transform .25s ease, box-shadow .25s ease",
        "&:hover": { transform: "translateY(-4px)", boxShadow: "0 18px 40px rgba(0,20,45,0.28)" },
      }}
    >
      {promo.imageUrl && (
        <>
          <Box
            aria-hidden
            component="img"
            src={promo.imageUrl}
            alt=""
            loading="lazy"
            sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <Box aria-hidden sx={{ position: "absolute", inset: 0, background: theme.background, opacity: 0.82 }} />
        </>
      )}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          width: 220,
          height: 220,
          right: -60,
          top: -60,
          borderRadius: "50%",
          border: "28px solid rgba(255,255,255,0.08)",
        }}
      />
      {onDismiss && (
        <IconButton
          size="small"
          aria-label="Hide this suggestion"
          onClick={onDismiss}
          sx={{ position: "absolute", top: 8, right: 8, zIndex: 1, color: "rgba(255,255,255,0.75)", "&:hover": { color: "common.white", backgroundColor: "rgba(255,255,255,0.12)" } }}
        >
          <X size={16} />
        </IconButton>
      )}
      <Box sx={{ position: "relative" }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4, pr: 6 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: "12px",
              display: "grid",
              placeItems: "center",
              backgroundColor: "rgba(255,255,255,0.14)",
              color: theme.accent,
              animation: "promoFloat 3s ease-in-out infinite",
              "@keyframes promoFloat": { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } },
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          >
            <Icon size={20} aria-hidden />
          </Box>
          {promo.overline && (
            <Typography variant="overline" sx={{ color: theme.accent, letterSpacing: "0.16em", lineHeight: 1.3 }}>
              {promo.overline}
            </Typography>
          )}
        </Stack>
        <Typography sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: { xs: "1.45rem", md: "1.6rem" }, lineHeight: 1.2 }}>
          {promo.title}
        </Typography>
        {promo.text && (
          <Typography variant="body2" sx={{ mt: 3, color: "rgba(255,255,255,0.85)" }}>
            {promo.text}
          </Typography>
        )}
      </Box>
      <Button
        onClick={onClick}
        endIcon={<ArrowRight size={16} />}
        sx={{
          position: "relative",
          alignSelf: "flex-start",
          px: 5,
          fontWeight: 700,
          color: theme.buttonColor,
          background: theme.buttonBg,
          "&:hover": { background: theme.buttonBg, filter: "brightness(1.05)" },
        }}
      >
        {promo.ctaLabel || "Know more"}
      </Button>
    </Box>
  );
}
