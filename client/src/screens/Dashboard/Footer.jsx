import React from "react";
import { Box, Container, Divider, Stack, Typography } from "@mui/material";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/support" },
];

/**
 * Global site footer. Kept as a plain component (not a page section) since
 * it's reused outside the dashboard too — `isMobile`/`user` stay as the
 * existing prop contract for those callers.
 */
const Footer = ({ user }) => {
  return (
    <Box
      component="footer"
      sx={{
        background: "linear-gradient(135deg, #003366 0%, #004b6b 100%)",
        color: "common.white",
        py: { xs: 10, md: 14 },
      }}
    >
      <Container maxWidth="sm" sx={{ textAlign: "center" }}>
        <Typography variant="h3" sx={{ color: "common.white", mb: 3 }}>
          ggnHome — Find your dream home
        </Typography>

        <Typography variant="body2" sx={{ color: "rgba(209,231,255,0.9)", mb: 8, maxWidth: 480, mx: "auto" }}>
          Explore thousands of verified listings, connect directly with owners, and
          make your next move with confidence.
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 4, sm: 8 }}
          justifyContent="center"
          sx={{ mb: 8 }}
        >
          {LINKS.map((link) => (
            <Box
              key={link.label}
              component="a"
              href={link.href}
              sx={{ color: "common.white", textDecoration: "none", fontWeight: 600, fontSize: 14, "&:hover": { color: "secondary.light" } }}
            >
              {link.label}
            </Box>
          ))}
          <Box
            component="a"
            href={user ? "/add-property" : "/login"}
            sx={{ color: "common.white", textDecoration: "none", fontWeight: 600, fontSize: 14, "&:hover": { color: "secondary.light" } }}
          >
            Post property
          </Box>
        </Stack>

        <Stack spacing={2} sx={{ color: "rgba(209,231,255,0.9)", fontSize: 14, mb: 8 }}>
          <Typography variant="body2" sx={{ color: "inherit" }}>
            Phone:{" "}
            <Box component="a" href="tel:+919654131789" sx={{ color: "common.white", fontWeight: 700, textDecoration: "none" }}>
              +91 96541 31789
            </Box>
          </Typography>
          <Typography variant="body2" sx={{ color: "inherit" }}>
            Email:{" "}
            <Box component="a" href="mailto:support@ggnhome.com" sx={{ color: "common.white", fontWeight: 700, textDecoration: "none" }}>
              support@ggnhome.com
            </Box>
          </Typography>
        </Stack>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.15)", mb: 4 }} />
        <Typography variant="caption" sx={{ color: "rgba(176,196,222,0.9)" }}>
          © {new Date().getFullYear()} ggnHome. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
