import React from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { radii } from "../../theme/theme";

/**
 * Split-screen auth page: brand panel with benefits (hidden on phones,
 * shown as a compact header instead) + the form card.
 */
export default function AuthShell({ eyebrow, title, subtitle, points = [], children, footer, wide = false }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1.05fr)" }, backgroundColor: "#F4F7F9" }}>
      <Box sx={{ position: "relative", overflow: "hidden", color: "#fff", background: "linear-gradient(150deg, #001F3F 0%, #003366 55%, #0B5C7A 100%)", px: { xs: 5, md: 10 }, py: { xs: 6, md: 10 }, display: "flex", flexDirection: "column" }}>
        <Box aria-hidden sx={{ position: "absolute", right: -100, bottom: -100, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,167,157,0.35), transparent 70%)" }} />
        <ButtonBase onClick={() => navigate("/")} sx={{ alignSelf: "flex-start", gap: 2, borderRadius: 2 }} aria-label="ggnHome home">
          <Box component="img" src={`${process.env.PUBLIC_URL}/Logo2.jpg`} alt="" sx={{ width: 40, height: 40, borderRadius: "10px", backgroundColor: "#fff", p: 0.5 }} onError={(e) => (e.currentTarget.style.display = "none")} />
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ fontWeight: 800, fontSize: 20, lineHeight: 1 }}>ggnHome</Typography>
            <Typography sx={{ fontSize: 11, color: "#F6C453", fontWeight: 600 }}>Get Space. Get Rewarded.</Typography>
          </Box>
        </ButtonBase>
        <Box sx={{ mt: { xs: 5, md: "auto" }, mb: { md: "auto" }, position: "relative" }}>
          {eyebrow && (
            <Typography variant="overline" sx={{ color: "#F6C453", fontWeight: 800, letterSpacing: 1.4 }}>
              {eyebrow}
            </Typography>
          )}
          <Typography component="h1" sx={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: { xs: "1.8rem", md: "2.8rem" }, lineHeight: 1.12 }}>
            {title}
          </Typography>
          {subtitle && <Typography sx={{ mt: 2, color: "rgba(255,255,255,0.8)", maxWidth: 460 }}>{subtitle}</Typography>}
          <Stack spacing={3} sx={{ mt: 6, display: { xs: "none", md: "flex" } }}>
            {points.map(({ icon: Icon, title: t, text }, i) => (
              <Stack key={t} component={motion.div} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }} direction="row" spacing={3} alignItems="flex-start">
                <Box sx={{ width: 40, height: 40, borderRadius: "12px", display: "grid", placeItems: "center", backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }}>
                  <Icon size={18} color="#F6C453" />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{t}</Typography>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>
                    {text}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>
      <Box sx={{ display: "flex", alignItems: { md: "center" }, justifyContent: "center", px: { xs: 4, md: 8 }, py: { xs: 5, md: 8 }, mt: { xs: -4, md: 0 } }}>
        <Box component={motion.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} sx={{ width: "100%", maxWidth: wide ? 640 : 440, p: { xs: 5, sm: 7 }, borderRadius: `${radii.xl}px`, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider", boxShadow: "0 20px 50px rgba(0,51,102,0.10)", position: "relative" }}>
          {children}
          {footer && <Box sx={{ mt: 6, pt: 4, borderTop: "1px solid", borderColor: "divider" }}>{footer}</Box>}
        </Box>
      </Box>
    </Box>
  );
}
