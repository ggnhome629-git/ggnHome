import React from "react";
import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { Bath, Bed, Car, Heart, Home, ImageIcon, MapPin, Maximize, Phone, Share2 } from "lucide-react";
import ImageReveal from "../motion/ImageReveal";
import { radii, elevationShadows } from "../../theme/theme";

/**
 * True shape of the data: RentalProperty carries `monthlyRent`, SaleProperty
 * carries `price` — both carry `totalArea: { configuration, sqft }`. Any
 * dashboard property list can mix both types, so every price/area read goes
 * through here rather than assuming one shape.
 */
export function isRentalProperty(property) {
  const kind = (
    property?.defaultpropertytype ||
    property?.defaultPropertyType ||
    property?.propertyCategory ||
    property?.type ||
    ""
  ).toLowerCase();
  return kind.includes("rent");
}

export function propertyDetailPath(property) {
  const id = property?._id || property?.id;
  return isRentalProperty(property) ? `/Rentaldetails/${id}` : `/Saledetails/${id}`;
}

function formatPrice(property) {
  const amount = property?.monthlyRent ?? property?.price;
  if (!amount && amount !== 0) return "Price on request";
  const formatted = Number(amount).toLocaleString("en-IN");
  return isRentalProperty(property) ? `₹${formatted}/mo` : `₹${formatted}`;
}

function formatArea(property) {
  if (property?.totalArea) {
    const { configuration, sqft } = property.totalArea;
    const roundedSqft = sqft ? Math.round(sqft) : null;
    return `${configuration || ""}${configuration ? " · " : ""}${roundedSqft ? `${roundedSqft.toLocaleString("en-IN")} sqft` : "N/A"}`.trim();
  }
  if (property?.area) return property.area;
  return "N/A";
}

const BADGE_TONES = {
  trending: { bg: "#EF4444" },
  verified: { bg: "secondary.main" },
  premium: { bg: "#F59E0B" },
  recommended: { bg: "#10B981" },
};

/**
 * Deterministic "why this card stands out" badge, scored from signals a
 * caller already has on hand (match score, view analytics, ratings, price,
 * recency). Pure function — callers own the analytics fetch, if any; the
 * card itself never fetches.
 */
export function getPropertyBadge(property, analytics) {
  const match = Number(property?.matchPercentage || 0);
  const viewCount = Number(analytics?.views?.length || analytics?.views || 0);
  const ratings = analytics?.ratings;
  let avgRating = 0;
  if (Array.isArray(ratings) && ratings.length > 0) {
    avgRating = ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0) / ratings.length;
  } else if (typeof ratings === "number") {
    avgRating = ratings;
  }
  const price = Number(property?.monthlyRent || property?.price || 0);
  const daysSinceAdded = property?.createdAt
    ? (Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  if ((match >= 85 && viewCount >= 50) || viewCount >= 200 || (daysSinceAdded <= 7 && viewCount >= 30)) {
    return { type: "trending", label: "Trending" };
  }
  if (match >= 70 && avgRating >= 4) {
    return { type: "verified", label: "Verified" };
  }
  if (price >= 5000000 || avgRating >= 4.6) {
    return { type: "premium", label: "Premium" };
  }
  if (match >= 60) {
    return { type: "recommended", label: "Recommended" };
  }
  return null;
}

function stop(e, fn) {
  e.stopPropagation();
  e.preventDefault();
  fn?.(e);
}

/**
 * The one property card used across the dashboard, search, saved properties
 * and see-all. Everything beyond the base display fields (save, share,
 * contact, badge, rating) is opt-in via props — a caller that doesn't pass
 * `onSave` simply gets no save button, so the dashboard's lighter usage stays
 * exactly as lean as before.
 *
 * <PropertyCard property={p} onClick={...} layout="list"
 *   onSave={fn} isSaved={bool} onShare={fn} onContact={fn}
 *   badge={{ label, type }} rating={4.3} views={128} />
 */
export default function PropertyCard({
  property,
  onClick,
  imageHeight = 220,
  layout = "grid",
  onSave,
  isSaved = false,
  onShare,
  onContact,
  badge,
  rating,
  views,
}) {
  const price = formatPrice(property);
  const area = formatArea(property);
  const imageCount = property?.images?.length || 0;
  const isList = layout === "list";
  const badgeTone = badge ? BADGE_TONES[badge.type] || { bg: "primary.main" } : null;

  const specs = [
    property?.bedrooms != null && { icon: Bed, label: `${property.bedrooms} Beds` },
    property?.bathrooms != null && { icon: Bath, label: `${property.bathrooms} Baths` },
    property?.parking && { icon: Car, label: property.parking },
  ].filter(Boolean);

  return (
    <Box
      component={motion.div}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) onClick();
      }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: isList ? { xs: "column", sm: "row" } : "column",
        cursor: "pointer",
        borderRadius: `${radii.lg}px`,
        overflow: "hidden",
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: elevationShadows[1],
        "&:hover": { boxShadow: elevationShadows[3] },
        "&:hover .property-card-image img": { transform: "scale(1.06)" },
      }}
    >
      <Box
        className="property-card-image"
        sx={{
          position: "relative",
          flexShrink: 0,
          width: isList ? { xs: "100%", sm: 280 } : "100%",
          "& img": { transition: "transform .5s ease" },
        }}
      >
        <ImageReveal
          src={property?.images?.[0] || "/default-property.jpg"}
          alt={property?.title || property?.type || "Property"}
          aspectRatio={isList ? "4 / 3" : `4 / ${imageHeight > 200 ? 3 : 2.4}`}
          sx={isList ? { height: "100%" } : undefined}
        />

        <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 12, left: 12 }}>
          <Box
            sx={{
              px: 2,
              py: 1,
              borderRadius: `${radii.sm}px`,
              backgroundColor: isRentalProperty(property) ? "secondary.main" : "primary.main",
              color: "common.white",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            {isRentalProperty(property) ? "RENT" : "SALE"}
          </Box>
          {badge && (
            <Box
              sx={{
                px: 2,
                py: 1,
                borderRadius: `${radii.sm}px`,
                backgroundColor: badgeTone.bg,
                color: "common.white",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {badge.label}
            </Box>
          )}
        </Stack>

        {(onSave || onShare) && (
          <Stack spacing={1} sx={{ position: "absolute", top: 12, right: 12 }}>
            {onSave && (
              <Tooltip title={isSaved ? "Unsave" : "Save"}>
                <IconButton
                  size="small"
                  onClick={(e) => stop(e, () => onSave(property._id, e))}
                  sx={{
                    width: 34,
                    height: 34,
                    backgroundColor: "background.paper",
                    boxShadow: elevationShadows[1],
                    "&:hover": { backgroundColor: "background.paper" },
                  }}
                >
                  <Heart size={15} fill={isSaved ? "#00A79D" : "none"} color={isSaved ? "#00A79D" : "#4A6A8A"} />
                </IconButton>
              </Tooltip>
            )}
            {onShare && (
              <Tooltip title="Share">
                <IconButton
                  size="small"
                  onClick={(e) => stop(e, () => onShare(property))}
                  sx={{
                    width: 34,
                    height: 34,
                    backgroundColor: "background.paper",
                    boxShadow: elevationShadows[1],
                    "&:hover": { backgroundColor: "background.paper" },
                  }}
                >
                  <Share2 size={14} color="#4A6A8A" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}

        <Stack
          direction="row"
          spacing={2}
          sx={{ position: "absolute", bottom: 12, left: 12 }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              px: 3,
              py: 1,
              borderRadius: `${radii.sm}px`,
              backgroundColor: "rgba(0,0,0,0.72)",
              color: "common.white",
              backdropFilter: "blur(4px)",
            }}
          >
            <ImageIcon size={13} />
            <Typography variant="caption" sx={{ color: "inherit", fontWeight: 600 }}>
              {imageCount}
            </Typography>
          </Stack>
          {views != null && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                px: 3,
                py: 1,
                borderRadius: `${radii.sm}px`,
                backgroundColor: "rgba(0,0,0,0.72)",
                color: "common.white",
                backdropFilter: "blur(4px)",
              }}
            >
              <Typography variant="caption" sx={{ color: "inherit", fontWeight: 600 }}>
                {views} views
              </Typography>
            </Stack>
          )}
        </Stack>
      </Box>

      <Stack sx={{ p: 5, flex: 1, minWidth: 0 }} spacing={3}>
        <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            <Home size={16} color="#003366" style={{ flexShrink: 0 }} />
            <Typography variant="h4" sx={{ fontSize: "1rem", color: "primary.main" }} noWrap>
              {property?.title || property?.type || "Property"}
            </Typography>
          </Stack>
          {rating != null && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ px: 2, py: 1, borderRadius: `${radii.sm}px`, backgroundColor: "background.default", flexShrink: 0 }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
                ★ {rating}
              </Typography>
            </Stack>
          )}
        </Stack>

        <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
          <Typography variant="h4" sx={{ color: "secondary.main", fontSize: "1.15rem" }}>
            {price}
          </Typography>
          <Box sx={{ width: "1px", height: 16, backgroundColor: "divider" }} />
          <Stack direction="row" spacing={1} alignItems="center">
            <Maximize size={13} color="#4A6A8A" />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {area}
            </Typography>
          </Stack>
        </Stack>

        {specs.length > 0 && (
          <Stack direction="row" spacing={4} flexWrap="wrap">
            {specs.map(({ icon: Icon, label }) => (
              <Stack key={label} direction="row" spacing={1} alignItems="center">
                <Icon size={13} color="#4A6A8A" />
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}

        <Stack direction="row" spacing={2} alignItems="center">
          <MapPin size={14} color="#00A79D" />
          <Typography variant="body2" sx={{ color: "text.primary" }} noWrap>
            {property?.Sector || "Location unavailable"}
          </Typography>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: "auto", pt: 3, borderTop: "1px solid", borderColor: "divider" }}
        >
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
            {property?.status || "Available"}
          </Typography>
          {onContact && (
            <Button
              size="small"
              startIcon={<Phone size={13} />}
              onClick={(e) => stop(e, () => onContact(property))}
              sx={{
                color: "common.white",
                backgroundColor: "secondary.main",
                px: 3,
                py: 1,
                minWidth: 0,
                "&:hover": { backgroundColor: "secondary.dark" },
              }}
            >
              Contact
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
