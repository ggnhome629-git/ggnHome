import React from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { Plus } from "lucide-react";
import { radii } from "../../theme/theme";

/** Gradient header + stat tiles + main column + optional sidebar. */
export default function ManageLayout({ nav, eyebrow, title, subtitle, action, stats = [], children, aside, footer }) {
  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#F4F7F9", pb: { xs: 12, md: 10 } }}>
      {nav}
      <Box sx={{ position: "relative", overflow: "hidden", color: "#fff", background: "linear-gradient(120deg, #002244 0%, #003366 45%, #0B5C7A 100%)", pt: { xs: 6, md: 9 }, pb: { xs: 16, md: 18 } }}>
        <Box aria-hidden sx={{ position: "absolute", right: -80, top: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,167,157,0.35), transparent 70%)" }} />
        <Container maxWidth="xl" sx={{ position: "relative" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-end" }} spacing={4}>
            <Box>
              {eyebrow && (
                <Typography variant="overline" sx={{ color: "#F6C453", fontWeight: 800, letterSpacing: 1.4 }}>
                  {eyebrow}
                </Typography>
              )}
              <Typography component="h1" sx={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: { xs: "1.9rem", md: "2.6rem" }, lineHeight: 1.15 }}>
                {title}
              </Typography>
              {subtitle && <Typography sx={{ mt: 1.5, color: "rgba(255,255,255,0.82)", maxWidth: 620 }}>{subtitle}</Typography>}
            </Box>
            {action && (
              <Button
                variant="contained"
                color="secondary"
                size="large"
                startIcon={<Plus size={18} />}
                onClick={action.onClick}
                sx={{ borderRadius: 999, fontWeight: 800, px: 6, flexShrink: 0, alignSelf: { xs: "flex-start", sm: "auto" }, boxShadow: "0 8px 20px rgba(0,167,157,0.35)" }}
              >
                {action.label}
              </Button>
            )}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: { xs: -11, md: -12 }, position: "relative" }}>
        {stats.length > 0 && (
          <Box sx={{ display: "grid", gap: { xs: 2.5, md: 4 }, gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", lg: `repeat(${stats.length}, 1fr)` }, mb: { xs: 5, md: 6 } }}>
            {stats.map(({ icon: Icon, label, value, tone = "#003366", onClick, active }) => (
              <Box
                key={label}
                component={onClick ? "button" : "div"}
                onClick={onClick}
                sx={{
                  textAlign: "left",
                  font: "inherit",
                  cursor: onClick ? "pointer" : "default",
                  p: { xs: 3.5, md: 4.5 },
                  borderRadius: `${radii.lg}px`,
                  backgroundColor: "background.paper",
                  border: "1.5px solid",
                  borderColor: active ? "secondary.main" : "divider",
                  boxShadow: "0 6px 20px rgba(0,51,102,0.06)",
                  transition: "all .15s ease",
                  "&:hover": onClick ? { borderColor: "secondary.main", transform: "translateY(-2px)" } : undefined,
                }}
              >
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Box sx={{ width: 36, height: 36, borderRadius: "10px", display: "grid", placeItems: "center", backgroundColor: `${tone}14`, color: tone, flexShrink: 0 }}>
                    <Icon size={18} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.25rem", md: "1.5rem" }, color: "primary.main", lineHeight: 1.1 }}>{value}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }} noWrap>
                      {label}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            ))}
          </Box>
        )}
        <Box sx={{ display: "grid", gap: { xs: 5, md: 6 }, alignItems: "start", gridTemplateColumns: { xs: "1fr", lg: aside ? "minmax(0,1fr) 320px" : "1fr" } }}>
          <Box sx={{ minWidth: 0 }}>{children}</Box>
          {aside && (
            <Box sx={{ position: { lg: "sticky" }, top: 96 }}>
              <Stack spacing={5}>{aside}</Stack>
            </Box>
          )}
        </Box>
      </Container>
      {footer}
    </Box>
  );
}

/** Small white card used in sidebars. */
export function SideCard({ title, children, sx }) {
  return (
    <Box sx={{ p: 5, borderRadius: `${radii.lg}px`, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider", ...sx }}>
      {title && <Typography sx={{ fontWeight: 800, color: "primary.main", mb: 3 }}>{title}</Typography>}
      {children}
    </Box>
  );
}
