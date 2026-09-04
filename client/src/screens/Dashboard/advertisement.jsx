import React, { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Check } from "lucide-react";
import { radii, elevationShadows } from "../../theme/theme";

const BRANDS = [
  { name: "Godrej Properties", domain: "godrejproperties.com" },
  { name: "DLF", domain: "dlf.in" },
  { name: "Brigade Group", domain: "brigadegroup.com" },
  { name: "Prestige Estates", domain: "prestigeconstructions.com" },
  { name: "Sobha", domain: "sobha.com" },
  { name: "Lodha Group", domain: "lodhagroup.com" },
  { name: "Puravankara", domain: "puravankara.com" },
  { name: "Mahindra Lifespace", domain: "mahindralifespaces.com" },
  { name: "Salarpuria", domain: "salarpuria.com" },
  { name: "Kolte-Patil", domain: "koltepatil.com" },
  { name: "Phoenix Mills", domain: "phoenixmills.com" },
  { name: "Oberoi Realty", domain: "oberoirealty.com" },
  { name: "Hiranandani", domain: "hiranandani.com" },
  { name: "Tata Housing", domain: "tataproperties.com" },
  { name: "Ansal API", domain: "ansalapi.com" },
  { name: "Raheja Developers", domain: "raheja.com" },
  { name: "Adani Realty", domain: "adanirealty.com" },
  { name: "Piramal Realty", domain: "piramalrealty.com" },
  { name: "Runwal Group", domain: "runwalgroup.com" },
  { name: "Kalpataru", domain: "kalpataru.com" },
];

const FEATURES = [
  {
    plain: "Compare & choose from ",
    highlight: "300+ top verified property developers",
    trailing: "",
  },
  {
    plain: "",
    highlight: "Calculate your property investment cost instantly",
    trailing: " with our advanced estimator",
  },
];

// Clearbit's free public Logo API (logo.clearbit.com) was discontinued after
// HubSpot's acquisition, so every brand logo below now fails to resolve.
// Degrade gracefully to a styled initials badge instead of a broken image.
function BrandLogo({ name, domain }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (failed) {
    return (
      <Box
        title={name}
        sx={{
          height: { xs: 40, md: 50 },
          px: 4,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: `${radii.sm}px`,
          background: "linear-gradient(135deg, #003366 0%, #4A6A8A 100%)",
          color: "common.white",
          fontWeight: 700,
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        {initials || name}
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={`https://logo.clearbit.com/${domain}`}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      sx={{
        height: { xs: 40, md: 50 },
        flexShrink: 0,
        borderRadius: `${radii.sm}px`,
        border: "1px solid",
        borderColor: "divider",
        objectFit: "contain",
      }}
    />
  );
}

export default function LandingPage() {
  return (
    <Box sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 8, md: 12 } }}>
      {/* Top banner */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems="center"
        spacing={6}
        sx={{
          p: { xs: 6, md: 8 },
          mb: { xs: 6, md: 8 },
          borderRadius: `${radii.lg}px`,
          backgroundColor: "info.main",
          textAlign: { xs: "center", md: "left" },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Typography
            variant="h3"
            sx={{ color: "primary.main", fontSize: { xs: "1.15rem", md: "1.75rem" }, mb: 3 }}
          >
            Plan hassle-free Site Visits & Evaluate Projects with{" "}
            <Box component="span" sx={{ color: "primary.main", fontWeight: 800 }}>
              ggnHome
            </Box>
          </Typography>
          <Typography
            variant="body1"
            sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "center", md: "flex-start" }, gap: 2 }}
          >
            Get <strong>&nbsp;Free Cab&nbsp;</strong> for every site visit! 🚕
          </Typography>
        </Box>
        <Button
          variant="contained"
          sx={{ backgroundColor: "primary.main", flexShrink: 0, px: 8 }}
        >
          Find out how
        </Button>
      </Stack>

      {/* Main split section */}
      <Box
        sx={{
          borderRadius: `${radii.xl}px`,
          overflow: "hidden",
          background: "linear-gradient(135deg, #4A6A8A 0%, #003366 100%)",
          boxShadow: elevationShadows[3],
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        }}
      >
        {/* Left: brand moment */}
        <Stack
          spacing={5}
          alignItems={{ xs: "center", md: "flex-start" }}
          sx={{ p: { xs: 7, md: 10 }, textAlign: { xs: "center", md: "left" } }}
        >
          <Box>
            <Typography variant="h2" sx={{ color: "secondary.light", fontSize: { xs: "1.5rem", md: "2.25rem" } }}>
              Upgrade to your dream home with
            </Typography>
            <Typography
              variant="h1"
              sx={{ color: "common.white", fontWeight: 300, fontSize: { xs: "1.5rem", md: "2.25rem" }, mt: 1 }}
            >
              ggnHome
            </Typography>
          </Box>
          <Box
            component="img"
            src="https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=800"
            alt="Modern real estate property"
            sx={{ width: "100%", maxWidth: 420, height: { xs: 180, md: 280 }, objectFit: "cover", borderRadius: `${radii.lg}px` }}
          />
        </Stack>

        {/* Right: value proposition, on a white plane */}
        <Stack
          justifyContent="space-between"
          spacing={6}
          sx={{
            backgroundColor: "background.paper",
            p: { xs: 6, md: 8 },
            m: { xs: 0, md: 6 },
            mb: { xs: 0, md: 6 },
            borderRadius: `${radii.lg}px`,
          }}
        >
          <Box>
            <Typography
              variant="h3"
              sx={{ color: "primary.main", mb: 6, textAlign: { xs: "center", md: "left" } }}
            >
              Why choose us?
            </Typography>

            <Stack spacing={4} sx={{ mb: 8 }}>
              {FEATURES.map((f, i) => (
                <Stack key={i} direction="row" spacing={3} alignItems="flex-start">
                  <Check size={20} color="#00A79D" style={{ flexShrink: 0, marginTop: 3 }} />
                  <Typography variant="body1" sx={{ color: "text.primary" }}>
                    {f.plain}
                    <Box component="span" sx={{ color: "secondary.main", fontWeight: 600 }}>
                      {f.highlight}
                    </Box>
                    {f.trailing}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Typography
              variant="overline"
              sx={{ display: "block", color: "text.secondary", mb: 3, textAlign: { xs: "center", md: "left" } }}
            >
              Top real estate brands
            </Typography>
            <Box
              sx={{
                overflow: "hidden",
                maskImage: { md: "linear-gradient(90deg, transparent, black 5%, black 95%, transparent)" },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: 4,
                  width: "max-content",
                  animation: { xs: "none", md: "ggnhome-brand-marquee 40s linear infinite" },
                  overflowX: { xs: "auto", md: "visible" },
                  "&::-webkit-scrollbar": { display: "none" },
                  "@keyframes ggnhome-brand-marquee": {
                    "0%": { transform: "translateX(0)" },
                    "100%": { transform: "translateX(-50%)" },
                  },
                  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                }}
              >
                {[...BRANDS, ...BRANDS].map((brand, index) => (
                  <BrandLogo key={`${brand.domain}-${index}`} name={brand.name} domain={brand.domain} />
                ))}
              </Box>
            </Box>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={4}>
            <Button variant="contained" fullWidth sx={{ backgroundColor: "primary.main" }}>
              Explore brands
            </Button>
            <Button variant="outlined" fullWidth sx={{ borderColor: "primary.main", color: "primary.main" }}>
              Get instant quote
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
