import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { Bath, Bed, Car, ExternalLink, MapPin, Maximize, ShieldCheck } from "lucide-react";
import { locationLine, sourcePortalLabel } from "../../../utils/propertyModel";

const TONE_COLORS = {
  success: { bg: "rgba(46,158,107,0.18)", fg: "#7CE0B4" },
  info: { bg: "rgba(34,211,238,0.18)", fg: "#8BE9FB" },
  accent: { bg: "rgba(0,167,157,0.22)", fg: "#7FE9E1" },
};

// Teal / cyan treatments for the affiliate "Sourced from …" badge — the two
// portals get visually distinct chips so a scraped listing reads as one at a
// glance (PART 1 of the upgrade guide).
const SOURCE_STYLES = {
  nobroker: { background: "#00A79D", color: "#FFFFFF" },
  "99acres": { background: "#22D3EE", color: "#003366" },
};

/**
 * The banner: navy gradient with the listing photo behind it, the identity
 * badges top-left, a floating price badge and the headline overlaid at the
 * bottom. Every badge shown is derived from data we actually have — the
 * affiliate variant swaps the verification row for the "Sourced from …" chip.
 */
export default function PropertyHero({ property }) {
  const tone = TONE_COLORS[property.status.tone] || TONE_COLORS.accent;
  const sourceStyle = SOURCE_STYLES[property.sourcePortal] || SOURCE_STYLES.nobroker;
  const cover = property.images[0];

  const specs = [
    property.configuration && { icon: Bed, value: property.configuration, label: "Configuration" },
    property.builtUpAreaDisplay && { icon: Maximize, value: property.builtUpAreaDisplay, label: "Built-up area" },
    property.bathrooms != null && { icon: Bath, value: property.bathrooms, label: "Bathrooms" },
    property.parking && { icon: Car, value: property.parking, label: "Parking" },
  ].filter(Boolean);

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "16px",
        backgroundImage: "linear-gradient(120deg, #002244 0%, #003366 45%, #0B5C7A 100%)",
        color: "common.white",
        "@keyframes heroPulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(34,211,238,0.55)" },
          "70%": { boxShadow: "0 0 0 10px rgba(34,211,238,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(34,211,238,0)" },
        },
      }}
    >
      {cover && (
        <Box
          component="img"
          src={cover}
          alt=""
          aria-hidden
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.55,
          }}
        />
      )}
      {/* Dark overlay keeps every badge and the headline legible over any photo. */}
      <Box sx={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,10,20,0.3)" }} />

      <Stack
        spacing={5}
        justifyContent="space-between"
        sx={{ position: "relative", p: { xs: 5, md: 7 }, minHeight: { xs: 260, md: 320 } }}
      >
        {/* Top row: identity badges left, floating price badge right */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={3} flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
            <Chip
              label={property.isRental ? "For rent" : "For sale"}
              size="small"
              sx={{
                backgroundColor: "rgba(255,255,255,0.14)",
                color: "common.white",
                fontWeight: 700,
                border: "1px solid rgba(255,255,255,0.25)",
                animation: "heroPulse 2.6s ease-out infinite",
              }}
            />
            <Chip
              label={property.status.label}
              size="small"
              sx={{ backgroundColor: tone.bg, color: tone.fg, fontWeight: 700 }}
            />
            {property.propertyType && (
              <Chip
                label={property.propertyType}
                size="small"
                sx={{
                  backgroundColor: "rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: 600,
                  textTransform: "capitalize",
                }}
              />
            )}
            {property.isAffiliate && (
              <Chip
                icon={<ExternalLink size={13} />}
                label={`Sourced from ${sourcePortalLabel(property.sourcePortal)}`}
                size="small"
                sx={{
                  backgroundColor: sourceStyle.background,
                  color: sourceStyle.color,
                  fontWeight: 700,
                  "& .MuiChip-icon": { color: "inherit" },
                }}
              />
            )}
          </Stack>

          {property.priceDisplay && (
            <Box
              sx={{
                backgroundColor: "#FFFFFF",
                color: "primary.main",
                borderRadius: "10px",
                px: 3,
                py: 2,
                boxShadow: "0 8px 24px rgba(0,10,25,0.28)",
                flexShrink: 0,
              }}
            >
              <Typography variant="h4" sx={{ fontSize: { xs: "1.05rem", md: "1.25rem" }, color: "primary.main", lineHeight: 1.2 }}>
                {property.priceDisplay}
              </Typography>
              {property.isRental && (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  per month
                </Typography>
              )}
            </Box>
          )}
        </Stack>

        {/* Headline block */}
        <Box>
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: "1.5rem", md: "2.35rem" },
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: "20ch",
              mb: 2,
              backgroundImage: "linear-gradient(90deg, #FFFFFF 0%, #A9F0EA 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            {property.title}
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
            <MapPin size={16} color="#7FE9E1" />
            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.85)" }}>
              {locationLine(property)}
            </Typography>
          </Stack>

          {!property.isAffiliate && property.verification.length > 0 && (
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {property.verification.slice(0, 4).map((badge) => (
                <Chip
                  key={badge}
                  icon={<ShieldCheck size={13} />}
                  label={badge}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 600,
                    border: "1px solid rgba(255,255,255,0.18)",
                    "& .MuiChip-icon": { color: "#7FE9E1" },
                  }}
                />
              ))}
            </Stack>
          )}
        </Box>

        {/* Qualifying specs along the bottom edge */}
        {specs.length > 0 && (
          <Stack
            direction="row"
            spacing={{ xs: 4, md: 8 }}
            flexWrap="wrap"
            useFlexGap
            alignItems="flex-end"
            sx={{ pt: 4, borderTop: "1px solid rgba(255,255,255,0.18)" }}
          >
            {specs.map(({ icon: Icon, value, label }) => (
              <Stack key={label} spacing={1}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Icon size={15} color="#7FE9E1" />
                  <Typography variant="h4" sx={{ fontSize: "1.05rem", color: "common.white" }}>
                    {value}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)" }}>
                  {label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
