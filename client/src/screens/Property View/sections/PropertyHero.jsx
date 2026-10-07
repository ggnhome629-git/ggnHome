import React from "react";
import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { Bath, Bed, Car, ExternalLink, Layers, MapPin, Maximize, ShieldCheck, Sofa } from "lucide-react";
import { formatCurrency, locationLine, sourcePortalLabel } from "../../../utils/propertyModel";

const TONE_COLORS = {
  success: { bg: "rgba(46,158,107,0.10)", fg: "#1E7A50" },
  info: { bg: "rgba(37,99,235,0.08)", fg: "#1D4ED8" },
  accent: { bg: "rgba(0,167,157,0.10)", fg: "#00796F" },
};

const chipSx = { height: 26, fontWeight: 600, fontSize: "0.75rem", borderRadius: "6px" };

/**
 * Listing header: identity chips, title, location and price, then a strip of
 * the key specs. Plain surface and solid type so it reads like a listing, not
 * a banner; every value shown comes from data the listing actually carries.
 */
export default function PropertyHero({ property }) {
  const tone = TONE_COLORS[property.status.tone] || TONE_COLORS.accent;
  const isAffiliate = property.isAffiliate;

  const floor =
    property.floor != null && property.totalFloors
      ? `${property.floor} of ${property.totalFloors}`
      : property.totalFloors
      ? `${property.totalFloors} floors`
      : null;

  const specs = [
    property.configuration && { icon: Bed, value: property.configuration, label: "Configuration" },
    property.builtUpAreaDisplay && { icon: Maximize, value: property.builtUpAreaDisplay, label: "Built-up area" },
    property.bathrooms != null && { icon: Bath, value: property.bathrooms, label: "Bathrooms" },
    property.furnishing && { icon: Sofa, value: property.furnishing, label: "Furnishing" },
    floor && { icon: Layers, value: floor, label: "Floor" },
    property.parking && { icon: Car, value: property.parking, label: "Parking" },
  ].filter(Boolean);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        <Chip
          label={property.isRental ? "For Rent" : "For Sale"}
          size="small"
          sx={{ ...chipSx, backgroundColor: "primary.main", color: "common.white" }}
        />
        <Chip label={property.status.label} size="small" sx={{ ...chipSx, backgroundColor: tone.bg, color: tone.fg }} />
        {property.propertyType && (
          <Chip
            label={property.propertyType}
            size="small"
            variant="outlined"
            sx={{ ...chipSx, borderColor: "divider", color: "text.secondary", textTransform: "capitalize" }}
          />
        )}
        {isAffiliate && (
          <Chip
            icon={<ExternalLink size={12} />}
            label={`Sourced from ${sourcePortalLabel(property.sourcePortal)}`}
            size="small"
            variant="outlined"
            sx={{ ...chipSx, borderColor: "divider", color: "text.secondary", "& .MuiChip-icon": { color: "inherit" } }}
          />
        )}
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "flex-end" }}
        spacing={{ xs: 3, md: 6 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h1"
            component="h1"
            sx={{ fontSize: { xs: "1.5rem", md: "1.9rem" }, fontWeight: 700, lineHeight: 1.25, color: "primary.main" }}
          >
            {property.title}
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
            <MapPin size={15} color="#4A6A8A" style={{ flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {locationLine(property)}
            </Typography>
          </Stack>
        </Box>

        {property.priceDisplay && (
          <Box sx={{ textAlign: { md: "right" }, flexShrink: 0 }}>
            <Typography sx={{ fontSize: { xs: "1.5rem", md: "1.75rem" }, fontWeight: 800, color: "primary.main", lineHeight: 1.1 }}>
              {property.priceDisplay}
              {property.isRental && (
                <Typography component="span" sx={{ fontSize: "0.95rem", fontWeight: 500, color: "text.secondary", ml: 1 }}>
                  /month
                </Typography>
              )}
            </Typography>
            {property.pricePerSqFt && !property.isRental && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {formatCurrency(property.pricePerSqFt)} per sq.ft.
              </Typography>
            )}
          </Box>
        )}
      </Stack>

      {specs.length > 0 && (
        <Box
          sx={{
            mt: 5,
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: `repeat(${Math.min(specs.length, 3)}, 1fr)`, md: `repeat(${specs.length}, 1fr)` },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {specs.map(({ icon: Icon, value, label }) => (
            <Stack
              key={label}
              spacing={1}
              sx={{
                px: 4,
                py: 3,
                // Hairlines between cells regardless of how the grid wraps.
                boxShadow: (t) => `-1px -1px 0 0 ${t.palette.divider}`,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Icon size={15} color="#00A79D" />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {label}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", textTransform: "capitalize" }}>
                {value}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}

      {!isAffiliate && property.verification.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
            {property.verification.slice(0, 4).map((badge) => (
              <Stack key={badge} direction="row" spacing={1.5} alignItems="center">
                <ShieldCheck size={15} color="#00A79D" />
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                  {badge}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
