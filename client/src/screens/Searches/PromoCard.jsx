import React from "react";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { ArrowRight, Calculator, Car, Gift, Home, ListChecks, X } from "lucide-react";
import { radii } from "../../theme/theme";

const VARIANTS = {
  rewards: {
    icon: Gift,
    overline: "ggnHome Rewards",
    title: "Close your deal, get gifts up to ₹1,000",
    text: "Register, finalise your home through ggnHome and we'll send a thank-you hamper.",
    cta: "See how it works",
    background: "linear-gradient(150deg, #3B2A00 0%, #7A5300 45%, #C68A0C 100%)",
    accent: "#FFE08A",
    buttonColor: "#3B2A00",
    buttonBg: "linear-gradient(90deg, #FFE08A 0%, #F0B429 100%)",
  },
  post: {
    icon: Home,
    overline: "Own a home here?",
    title: "List it free and reach verified tenants & buyers",
    text: "Free to post. Enquiries from interested tenants and buyers come straight to you.",
    cta: "Post property free",
    background: "linear-gradient(150deg, #001F3F 0%, #003366 55%, #00857D 100%)",
    accent: "#3FC2B8",
    buttonColor: "#003366",
    buttonBg: "#FFFFFF",
  },
  preferences: {
    icon: ListChecks,
    overline: "Personal shortlist",
    title: "Tell us what you need, we'll shortlist homes for you",
    text: "Share your budget, BHK and preferred sectors once — we match new listings to you.",
    cta: "Share my preferences",
    background: "linear-gradient(150deg, #0B4A6F 0%, #00857D 60%, #00A79D 100%)",
    accent: "#B8F2EC",
    buttonColor: "#00594F",
    buttonBg: "#FFFFFF",
  },
  price: {
    icon: Calculator,
    overline: "Price check",
    title: "Is this the right price? Check in seconds",
    text: "Our price predictor estimates a fair value from area, size and sector.",
    cta: "Try price predictor",
    background: "linear-gradient(150deg, #1E1B4B 0%, #3730A3 55%, #4A6A8A 100%)",
    accent: "#C7D2FE",
    buttonColor: "#1E1B4B",
    buttonBg: "#FFFFFF",
  },
  visits: {
    icon: Car,
    overline: "Site visits",
    title: "Plan your visits — free cab for every site visit",
    text: "Pick the homes you like and our team schedules the visits for you.",
    cta: "Plan a visit",
    background: "linear-gradient(150deg, #0E7490 0%, #0891B2 55%, #22D3EE 100%)",
    accent: "#E0F7FF",
    buttonColor: "#0E4D63",
    buttonBg: "#FFFFFF",
  },
};

/** A promo tile that sits in the results grid between listings. */
export default function PromoCard({ variant = "rewards", onClick, onDismiss }) {
  const v = VARIANTS[variant];
  const Icon = v.icon;
  return (
    <Box
      component="aside"
      sx={{
        position: "relative",
        overflow: "hidden",
        height: "100%",
        minHeight: 300,
        p: { xs: 6, md: 7 },
        borderRadius: `${radii.lg}px`,
        color: "common.white",
        background: v.background,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 6,
      }}
    >
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
              borderRadius: "12px",
              display: "grid",
              placeItems: "center",
              backgroundColor: "rgba(255,255,255,0.14)",
              color: v.accent,
              animation: "promoFloat 3s ease-in-out infinite",
              "@keyframes promoFloat": { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } },
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          >
            <Icon size={20} aria-hidden />
          </Box>
          <Typography variant="overline" sx={{ color: v.accent, letterSpacing: "0.16em" }}>
            {v.overline}
          </Typography>
        </Stack>
        <Typography sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: { xs: "1.45rem", md: "1.6rem" }, lineHeight: 1.2 }}>
          {v.title}
        </Typography>
        <Typography variant="body2" sx={{ mt: 3, color: "rgba(255,255,255,0.82)" }}>
          {v.text}
        </Typography>
      </Box>
      <Button
        onClick={onClick}
        endIcon={<ArrowRight size={16} />}
        sx={{
          position: "relative",
          alignSelf: "flex-start",
          px: 5,
          fontWeight: 700,
          color: v.buttonColor,
          background: v.buttonBg,
          "&:hover": { background: v.buttonBg, filter: "brightness(1.05)" },
        }}
      >
        {v.cta}
      </Button>
    </Box>
  );
}
