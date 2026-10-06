import React from "react";
import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { Heart, ImageIcon, MapPin, Phone, Share2 } from "lucide-react";
import CardPhotos from "./CardPhotos";
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
  const n = Number(amount);
  if (isRentalProperty(property)) return `₹${n.toLocaleString("en-IN")}/mo`;
  // Sale prices read the way Indian buyers say them: lakh and crore.
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
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
  // ₹3 Cr+: in Gurgaon most resale homes clear ₹50 L, so a lower bar tags nearly everything.
  if (price >= 30000000 || avgRating >= 4.6) {
    return { type: "premium", label: "Premium" };
  }
  if (match >= 60) {
    return { type: "recommended", label: "Recommended" };
  }
  return null;
}

function listedAgo(date) {
  if (!date) return null;
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (Number.isNaN(days) || days < 0) return null;
  if (days === 0) return "Listed today";
  if (days === 1) return "Listed yesterday";
  if (days < 30) return `Listed ${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Listed ${months} month${months === 1 ? "" : "s"} ago`;
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
  // List endpoints send one image plus the real total (`imageCount`); detail
  // payloads carry the whole array and no count.
  const imageCount = property?.imageCount ?? property?.images?.length ?? 0;
  const isList = layout === "list";
  const badgeTone = badge ? BADGE_TONES[badge.type] || { bg: "primary.main" } : null;

  const config = property?.totalArea?.configuration;
  const sqft = property?.totalArea?.sqft ? Math.round(property.totalArea.sqft) : null;
  const facts = [
    config || (property?.bedrooms != null ? `${property.bedrooms} Beds` : null),
    property?.bathrooms != null ? `${property.bathrooms} Bath${property.bathrooms === 1 ? "" : "s"}` : null,
    sqft ? `${sqft.toLocaleString("en-IN")} sqft` : null,
  ].filter(Boolean);
  const listedLabel = listedAgo(property?.createdAt);
  const isNew = property?.createdAt && Date.now() - new Date(property.createdAt).getTime() < 3 * 86400000;
  // "By owner / agent / ggnHome" label — hidden for now; restore with the JSX below.
  // const postedBy =
  //   property?.ownerType === "Admin" ? "ggnHome" : property?.ownerType === "Agent" ? "Agent" : property?.ownerType === "Owner" ? "Owner" : null;
  const rental = isRentalProperty(property);

  const overlayButton = {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.94)",
    boxShadow: elevationShadows[1],
    "&:hover": { backgroundColor: "common.white", transform: "scale(1.06)" },
    transition: "transform .15s ease",
  };

  return (
    <Box
      component={motion.div}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${property?.title || "Property"}, ${price}`}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) onClick();
      }}
      whileHover={{ y: -4 }}
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
        transition: "box-shadow .25s ease, border-color .25s ease",
        "&:hover": { boxShadow: elevationShadows[3], borderColor: "transparent" },
        "&:hover .property-card-image img": { transform: "scale(1.05)" },
        "&:focus-visible": { outline: "3px solid", outlineColor: "secondary.main", outlineOffset: 2 },
      }}
    >
      <Box
        className="property-card-image"
        sx={{
          position: "relative",
          flexShrink: 0,
          width: isList ? { xs: "100%", sm: 300 } : "100%",
          "& img": { transition: "transform .6s ease" },
        }}
      >
        <CardPhotos
          images={property?.images}
          alt={property?.title || property?.type || "Property"}
          aspectRatio={isList ? "4 / 3" : `4 / ${imageHeight > 200 ? 3 : 2.4}`}
          // Cards never render wider than a quarter of a desktop viewport, so
          // there is no reason to fetch anything bigger.
          width={isList ? 600 : 640}
          widths={[320, 480, 640, 960]}
          sizes={
            isList
              ? "(max-width: 600px) 92vw, 300px"
              : "(max-width: 600px) 92vw, (max-width: 900px) 46vw, (max-width: 1200px) 31vw, 23vw"
          }
          fill={isList}
        />

        {/* Soft scrim so overlay chips read on bright photos. */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.32) 100%)",
            pointerEvents: "none",
          }}
        />

        <Stack direction="row" spacing={1.5} sx={{ position: "absolute", top: 12, left: 12 }}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{
              px: 2.5,
              py: 1,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.94)",
              color: "primary.main",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: rental ? "secondary.main" : "#F0B429",
              }}
            />
            <span>{rental ? "For rent" : "For sale"}</span>
          </Stack>
          {isNew && (
            <Box
              sx={{
                px: 2.5,
                py: 1,
                borderRadius: 999,
                backgroundColor: "#16A34A",
                color: "common.white",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              New
            </Box>
          )}
          {badge && !isNew && (
            <Box
              sx={{
                px: 2.5,
                py: 1,
                borderRadius: 999,
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
          <Stack direction="row" spacing={1.5} sx={{ position: "absolute", top: 10, right: 10 }}>
            {onShare && (
              <Tooltip title="Share">
                <IconButton
                  size="small"
                  aria-label="Share property"
                  onClick={(e) => stop(e, () => onShare(property))}
                  sx={overlayButton}
                >
                  <Share2 size={15} color="#003366" />
                </IconButton>
              </Tooltip>
            )}
            {onSave && (
              <Tooltip title={isSaved ? "Remove from saved" : "Save"}>
                <IconButton
                  size="small"
                  aria-label={isSaved ? "Remove from saved" : "Save property"}
                  aria-pressed={isSaved}
                  onClick={(e) => stop(e, () => onSave(property._id, e))}
                  sx={overlayButton}
                >
                  <motion.span
                    key={isSaved ? "saved" : "unsaved"}
                    initial={{ scale: isSaved ? 0.4 : 1 }}
                    animate={{ scale: isSaved ? [0.4, 1.35, 1] : 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{ display: "inline-flex" }}
                  >
                    <Heart
                      size={16}
                      fill={isSaved ? "#E11D48" : "none"}
                      color={isSaved ? "#E11D48" : "#003366"}
                    />
                  </motion.span>
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}

        <Stack direction="row" spacing={1.5} sx={{ position: "absolute", bottom: 10, left: 12 }}>
          {imageCount > 0 && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ px: 2, py: 0.75, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.6)", color: "common.white" }}
            >
              <ImageIcon size={12} />
              <Typography variant="caption" sx={{ color: "inherit", fontWeight: 600, lineHeight: 1 }}>
                {imageCount}
              </Typography>
            </Stack>
          )}
          {views > 0 && (
            <Box sx={{ px: 2, py: 0.75, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.6)", color: "common.white" }}>
              <Typography variant="caption" sx={{ color: "inherit", fontWeight: 600, lineHeight: 1 }}>
                {views} views
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>

      <Stack sx={{ p: { xs: 4, md: 5 }, flex: 1, minWidth: 0 }} spacing={2}>
        <Stack direction="row" spacing={2} alignItems="baseline" justifyContent="space-between">
          <Typography
            sx={{
              fontSize: { xs: "1.25rem", md: "1.35rem" },
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: "primary.main",
              lineHeight: 1.2,
            }}
          >
            {price}
          </Typography>
          {rating != null && (
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", flexShrink: 0 }}>
              ★ {rating}
            </Typography>
          )}
        </Stack>

        {facts.length > 0 && (
          <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }} noWrap>
            {facts.join("  ·  ")}
          </Typography>
        )}

        <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
          {property?.title || property?.type || "Property"}
        </Typography>

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <MapPin size={14} color="#00A79D" style={{ flexShrink: 0 }} />
          <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
            {[property?.Sector, "Gurgaon"].filter(Boolean).join(", ")}
          </Typography>
        </Stack>

        {(listedLabel || onContact) && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: "auto", pt: 3, borderTop: "1px solid", borderColor: "divider" }}
          >
            <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
              {/* Posted-by label, hidden for now:
              {postedBy && (
                <Box component="span" sx={{ fontWeight: 700, color: postedBy === "ggnHome" ? "secondary.main" : "text.primary" }}>
                  {postedBy === "ggnHome" ? "By ggnHome" : `By ${postedBy.toLowerCase()}`}
                </Box>
              )}
              {postedBy && listedLabel ? " · " : ""}
              */}
              {listedLabel || ""}
            </Typography>
            {onContact && (
              <Button
                size="small"
                startIcon={<Phone size={13} />}
                onClick={(e) => stop(e, () => onContact(property))}
                sx={{
                  color: "secondary.main",
                  fontWeight: 700,
                  px: 2,
                  py: 0.5,
                  minWidth: 0,
                  "&:hover": { backgroundColor: "rgba(0,167,157,0.08)" },
                }}
              >
                Contact
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
