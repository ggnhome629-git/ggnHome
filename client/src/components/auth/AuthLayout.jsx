import React from "react";
import { Box, Container, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { brand, radii, elevationShadows } from "../../theme/theme";

const MotionBox = motion(Box);

/**
 * The shell every auth screen sits in: a brand panel alongside a form card.
 *
 * The panel carries the reassurance work (who this is, why it's safe) so the
 * card itself only ever holds the fields. Below `md` the panel collapses to a
 * compact header rather than eating the fold on a phone.
 *
 * <AuthLayout
 *   eyebrow="Agent access"
 *   heading="Welcome back"
 *   subheading="..."
 *   benefits={["...", "..."]}
 *   footer={<...>}
 * >
 *   {form}
 * </AuthLayout>
 */
export default function AuthLayout({
  eyebrow,
  heading,
  subheading,
  benefits = [],
  icon,
  children,
  footer,
  maxWidth = "lg",
  // Multi-column forms (agent registration) need more room than a single
  // column of fields.
  cardWidth = 460,
}) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        // A single wash behind both columns, so the card reads as sitting on
        // the brand rather than floating over an unrelated backdrop.
        background: `linear-gradient(135deg, ${brand.prussianBlue} 0%, ${brand.slateBlue} 55%, ${brand.teal} 100%)`,
        py: { xs: 8, md: 12 },
        px: { xs: 4, sm: 6 },
      }}
    >
      {/* Ambient depth. Pointer-events off so it can never swallow a click. */}
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          "&::before, &::after": {
            content: '""',
            position: "absolute",
            borderRadius: "50%",
            filter: "blur(90px)",
          },
          "&::before": {
            width: 360,
            height: 360,
            top: "-6%",
            left: "-4%",
            background: "rgba(34, 211, 238, 0.18)",
          },
          "&::after": {
            width: 300,
            height: 300,
            bottom: "-8%",
            right: "-4%",
            background: "rgba(0, 167, 157, 0.22)",
          },
        }}
      />

      <Container maxWidth={maxWidth} sx={{ position: "relative" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 6, md: 10 }}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="center"
        >
          {/* ---------------------------------------------- brand panel -- */}
          <Stack
            spacing={5}
            sx={{
              flex: { md: "0 1 420px" },
              color: brand.white,
              textAlign: { xs: "center", md: "left" },
              alignItems: { xs: "center", md: "flex-start" },
            }}
          >
            {icon && (
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: `${radii.lg}px`,
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: "blur(10px)",
                }}
              >
                {icon}
              </Box>
            )}

            {eyebrow && (
              <Typography variant="overline" sx={{ color: brand.cyan, letterSpacing: "0.12em" }}>
                {eyebrow}
              </Typography>
            )}

            <Typography variant="h1" sx={{ color: "inherit", fontSize: { xs: "2rem", md: "3rem" } }}>
              {heading}
            </Typography>

            {subheading && (
              <Typography
                variant="subtitle1"
                sx={{ color: "rgba(255,255,255,0.86)", maxWidth: 420 }}
              >
                {subheading}
              </Typography>
            )}

            {/* Reassurance is desktop-only: on a phone the form should be the
                first thing in reach, not a list of selling points. */}
            {benefits.length > 0 && (
              <Stack spacing={3} sx={{ display: { xs: "none", md: "flex" }, pt: 2 }}>
                {benefits.map((benefit) => (
                  <Stack key={benefit} direction="row" spacing={3} alignItems="center">
                    <Box
                      sx={{
                        width: 22,
                        height: 22,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.16)",
                      }}
                    >
                      <Check size={13} color={brand.cyan} />
                    </Box>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>
                      {benefit}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>

          {/* ------------------------------------------------ form card -- */}
          <MotionBox
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            sx={{
              flex: { md: `0 1 ${cardWidth}px` },
              width: "100%",
              // Below md the card is the only column, and a tablet's container
              // is wide enough that an unconstrained card stretches the fields
              // into a single uncomfortable line. Cap it at the same width it
              // gets beside the brand panel and centre it.
              maxWidth: cardWidth,
              // alignSelf rather than `mx: auto`: the parent stretches its
              // items below md, which wins over auto margins and pins the
              // capped card to the left edge.
              alignSelf: "center",
              backgroundColor: "background.paper",
              borderRadius: `${radii.xl}px`,
              boxShadow: elevationShadows[3],
              p: { xs: 6, sm: 8 },
            }}
          >
            {children}
            {footer && <Box sx={{ mt: 6 }}>{footer}</Box>}
          </MotionBox>
        </Stack>
      </Container>
    </Box>
  );
}
