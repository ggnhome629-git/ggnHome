import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { Bath, Bed, Car, MapPin, Maximize } from "lucide-react";
import { locationLine } from "../../../utils/propertyModel";

const TONE_COLORS = {
  success: { bg: "rgba(46,158,107,0.12)", fg: "#2E9E6B" },
  info: { bg: "rgba(34,211,238,0.14)", fg: "#0E7490" },
  accent: { bg: "rgba(0,167,157,0.12)", fg: "#00857D" },
};

/**
 * Answers "what is it, where is it, how much, what do I get" inside the
 * first screen — the ten-second test from the brief.
 */
export default function PropertyHero({ property }) {
  const tone = TONE_COLORS[property.status.tone] || TONE_COLORS.accent;

  const stats = [
    property.configuration && { icon: Bed, value: property.configuration, label: "Configuration" },
    property.builtUpAreaDisplay && { icon: Maximize, value: property.builtUpAreaDisplay, label: "Built-up area" },
    property.bathrooms != null && { icon: Bath, value: property.bathrooms, label: "Bathrooms" },
    property.parking && { icon: Car, value: property.parking, label: "Parking" },
  ].filter(Boolean);

  return (
    <Box>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        <Chip
          label={property.isRental ? "For rent" : "For sale"}
          size="small"
          sx={{ backgroundColor: "primary.main", color: "common.white", fontWeight: 700 }}
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
            sx={{ backgroundColor: "background.default", color: "text.secondary", fontWeight: 600, textTransform: "capitalize" }}
          />
        )}
      </Stack>

      <Typography variant="h1" component="h1" sx={{ fontSize: { xs: "1.6rem", md: "2.4rem" }, color: "primary.main", mb: 3 }}>
        {property.title}
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 5 }}>
        <MapPin size={16} color="#00A79D" />
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          {locationLine(property)}
        </Typography>
      </Stack>

      {/* Price deliberately lives in the contact card alongside the CTAs, so
          it isn't repeated here — these are the specs that qualify the price. */}
      <Stack
        direction="row"
        spacing={{ xs: 4, md: 8 }}
        flexWrap="wrap"
        useFlexGap
        alignItems="flex-end"
        sx={{ pt: 5, borderTop: "1px solid", borderColor: "divider" }}
      >
        {stats.map(({ icon: Icon, value, label }) => (
          <Stack key={label} spacing={1}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Icon size={15} color="#4A6A8A" />
              <Typography variant="h4" sx={{ fontSize: "1.05rem", color: "primary.main" }}>
                {value}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
