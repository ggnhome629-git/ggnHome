import React, { useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Bath,
  Bed,
  Building,
  Bus,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  Layers,
  Leaf,
  MapPin,
  Maximize2,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Trees,
  TrendingUp,
  UserRound,
  Wifi,
  Zap,
} from "lucide-react";
import { radii, elevationShadows } from "../../../theme/theme";
import { directionsUrl, displayAmount, formatCurrency, locationLine } from "../../../utils/propertyModel";

export function SectionCard({ title, action, children, id, sx }) {
  return (
    <Box
      id={id}
      component="section"
      sx={{
        p: { xs: 5, md: 7 },
        borderRadius: `${radii.lg}px`,
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: elevationShadows[1],
        ...sx,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={4} sx={{ mb: 5 }}>
        <Typography variant="h2" component="h2" sx={{ fontSize: { xs: "1.15rem", md: "1.4rem" }, color: "primary.main" }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

/** Fade-in + slide-up used by the animated tiles and highlight cards. */
function Reveal({ delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.3, ease: "easeOut", delay }}
      style={{ height: "100%" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Counts 0 → target the first time the tile scrolls into view (0.8s,
 * easeInOutQuad) so the stat reads as a measured value rather than a label.
 * Honours prefers-reduced-motion and anything non-numeric renders as-is.
 */
function useCountUp(target, duration = 800) {
  const ref = React.useRef(null);
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    const to = Number(target);
    const node = ref.current;
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!Number.isFinite(to) || !node || typeof IntersectionObserver === "undefined" || reduced) {
      setValue(Number.isFinite(to) ? to : 0);
      return undefined;
    }
    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          setValue(Math.round(to * eased));
          if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration]);

  return [ref, value];
}

function StatTile({ icon: Icon, label, caption, badge, animateTo, format, delay = 0 }) {
  const [ref, count] = useCountUp(animateTo ?? 0);
  const display = animateTo != null ? format(count) : format;

  return (
    <Reveal delay={delay}>
      <Box
        ref={ref}
        sx={{
          height: "100%",
          borderRadius: `${radii.lg}px`,
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 2px 8px rgba(0,51,102,0.04)",
          p: 5,
          transition: "transform .2s ease, box-shadow .2s ease",
          "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 20px rgba(0,51,102,0.10)" },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "rgba(0,167,157,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={18} color="#00A79D" />
          </Box>
          {badge}
        </Stack>

        <Typography variant="h3" sx={{ fontSize: "1.35rem", color: "primary.main", mb: 1 }}>
          {display}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {label}
        </Typography>
        {caption && (
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 1 }}>
            {caption}
          </Typography>
        )}
      </Box>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ overview */

function ageMeta(age) {
  if (age === null || age === undefined || age === "") return null;
  const years = parseFloat(String(age));
  if (!Number.isFinite(years)) return { display: String(age), badge: null };
  const display = years < 1 ? "Under 1 year" : `${Math.round(years)} year${Math.round(years) > 1 ? "s" : ""} old`;
  const badge = years < 2 ? { label: "New", color: "#10B981" } : years < 12 ? { label: "Good", color: "#F59E0B" } : { label: "Old", color: "#6B7280" };
  return { display, badge };
}

export function OverviewSection({ property }) {
  const age = ageMeta(property.age);
  const hasFloor = property.floor != null && property.totalFloors;

  const tiles = [
    property.builtUpArea && {
      icon: Maximize2,
      label: "Built-up area",
      animateTo: Number(property.builtUpArea),
      format: (n) => `${n.toLocaleString("en-IN")} sq.ft.`,
    },
    property.pricePerSqFt && {
      icon: TrendingUp,
      label: "Price per sq.ft.",
      animateTo: Number(property.pricePerSqFt),
      format: (n) => `₹${n.toLocaleString("en-IN")}`,
      caption: property.isRental ? "of monthly rent" : "of sale price",
    },
    age && {
      icon: Clock,
      label: "Age / condition",
      format: age.display,
      badge: age.badge && (
        <Chip
          size="small"
          label={age.badge.label}
          sx={{ backgroundColor: `${age.badge.color}1F`, color: age.badge.color, fontWeight: 700, fontSize: "0.7rem" }}
        />
      ),
    },
    (hasFloor || property.totalFloors) && {
      icon: Layers,
      label: "Floor number",
      format: hasFloor ? `${property.floor} of ${property.totalFloors}` : `${property.totalFloors} floors`,
      caption: hasFloor ? `building of ${property.totalFloors} floors` : null,
    },
  ].filter(Boolean);

  const specs = [
    { icon: Home, label: "Property type", value: property.propertyType },
    { icon: Layers, label: "Configuration", value: property.configuration },
    { icon: Bed, label: "Bedrooms", value: property.bedrooms },
    { icon: Bath, label: "Bathrooms", value: property.bathrooms },
    { icon: Car, label: "Parking", value: property.parking },
    { icon: Calendar, label: "Possession", value: property.possession },
    { icon: Compass, label: "Listed by", value: property.ownership },
    { icon: Tag, label: "Property ID", value: property.id ? `#${String(property.id).slice(-8).toUpperCase()}` : null },
    { icon: Building, label: "RERA", value: property.reraNumber },
  ].filter((s) => s.value !== null && s.value !== undefined && s.value !== "");

  if (tiles.length === 0 && specs.length === 0) return null;

  return (
    <SectionCard title="Property overview">
      {tiles.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gap: 6,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: `repeat(${Math.min(tiles.length, 4)}, 1fr)` },
            mb: specs.length ? 6 : 0,
          }}
        >
          {tiles.map((tile, i) => (
            <StatTile key={tile.label} {...tile} delay={i * 0.1} />
          ))}
        </Box>
      )}

      {specs.length > 0 && (
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" } }}>
          {specs.map(({ icon: Icon, label, value }) => (
            <Stack key={label} spacing={2} sx={{ p: 4, borderRadius: `${radii.sm}px`, backgroundColor: "background.default" }}>
              <Icon size={18} color="#00A79D" />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", textTransform: "capitalize" }}>
                {value}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}
    </SectionCard>
  );
}

/* --------------------------------------------------------------------- price */

export function PriceSection({ property, onOpenEmi }) {
  const rows = [
    { label: property.priceLabel, value: property.priceExact, emphasis: true },
    property.pricePerSqFt && { label: "Price per sq.ft.", value: formatCurrency(property.pricePerSqFt) },
    property.securityDeposit && { label: "Security deposit", value: displayAmount(property.securityDeposit) },
    property.maintenance && { label: "Maintenance", value: property.maintenance },
    property.otherFees && { label: "Other charges", value: property.otherFees },
    property.leaseTerm && { label: "Lease term", value: property.leaseTerm },
    property.commission && {
      label: "Commission",
      value: `${formatCurrency(property.commission)}${property.commissionNote ? ` (${property.commissionNote})` : ""}`,
    },
  ].filter(Boolean);

  return (
    <SectionCard
      title="Pricing"
      action={
        !property.isRental && property.price ? (
          <Button size="small" variant="outlined" onClick={onOpenEmi} sx={{ borderColor: "divider", color: "primary.main" }}>
            Calculate EMI
          </Button>
        ) : null
      }
    >
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
        {rows.map((row) => (
          <Stack
            key={row.label}
            spacing={1}
            sx={{
              p: 4,
              borderRadius: `${radii.sm}px`,
              backgroundColor: row.emphasis ? "primary.main" : "background.default",
            }}
          >
            <Typography variant="caption" sx={{ color: row.emphasis ? "rgba(255,255,255,0.75)" : "text.secondary" }}>
              {row.label}
            </Typography>
            <Typography variant="h4" sx={{ fontSize: "1.15rem", color: row.emphasis ? "common.white" : "primary.main" }}>
              {row.value}
            </Typography>
          </Stack>
        ))}
      </Box>
    </SectionCard>
  );
}

/* --------------------------------------------------------------- description */

export function DescriptionSection({ description }) {
  const [expanded, setExpanded] = useState(false);
  if (!description) return null;

  const paragraphs = description.split(/\r?\n\r?\n|\r?\n/).map((p) => p.trim()).filter(Boolean);
  const isLong = description.length > 340;
  const visible = expanded || !isLong ? paragraphs : [`${description.slice(0, 340).trim()}…`];

  return (
    <SectionCard title="About this property">
      <Stack spacing={3}>
        {visible.map((para, i) => (
          <Typography key={i} variant="body1" sx={{ color: "text.secondary", lineHeight: 1.8 }}>
            {para}
          </Typography>
        ))}
      </Stack>
      {isLong && (
        <Button onClick={() => setExpanded((v) => !v)} sx={{ mt: 3, px: 0, color: "secondary.main" }}>
          {expanded ? "Read less" : "Read more"}
        </Button>
      )}
    </SectionCard>
  );
}

/* ---------------------------------------------------------------- highlights */

// Icon + colour by what the highlight actually says, per the guide's
// "premium → Star, new → Zap, safe → CheckCircle, green → Leaf, parking → Car"
// mapping (with a neutral Sparkles fallback).
function highlightMeta(text) {
  const t = text.toLowerCase();
  if (/premium|luxury|high[- ]?end|suite|designer/.test(t)) return { Icon: Star, color: "#F5B301" };
  if (/secure|safe|guard|cctv|gated|24.?7|alarm/.test(t)) return { Icon: CheckCircle2, color: "#10B981" };
  if (/solar|rain|eco|green|sustainab|water.?sav/.test(t)) return { Icon: Leaf, color: "#10B981" };
  if (/park|garage|vehicle|driveway/.test(t)) return { Icon: Car, color: "#00A79D" };
  if (/garden|terrace|balcony|outdoor|open space|tree|parkway/.test(t)) return { Icon: Trees, color: "#10B981" };
  if (/wifi|wi-?fi|smart|fiber|fibre/.test(t)) return { Icon: Wifi, color: "#2563EB" };
  if (/new|modern|renovat|recent|brand|furnished/.test(t)) return { Icon: Zap, color: "#2563EB" };
  if (/view|scenic|facing|corner|light/.test(t)) return { Icon: Sparkles, color: "#E11D48" };
  return { Icon: Sparkles, color: "#00A79D" };
}

export function HighlightsSection({ highlights }) {
  if (!highlights || highlights.length === 0) return null;
  return (
    <SectionCard title="Key highlights">
      <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
        {highlights.map((item, i) => {
          const { Icon, color } = highlightMeta(item);
          return (
            <Reveal key={item} delay={(i % 4) * 0.1}>
              <Box
                sx={{
                  height: "100%",
                  borderRadius: `${radii.lg}px`,
                  backgroundColor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "0 2px 8px rgba(0,51,102,0.04)",
                  p: 4,
                  transition: "transform .2s ease, box-shadow .2s ease",
                  "&:hover": { transform: "translateY(-2px) scale(1.02)", boxShadow: "0 8px 20px rgba(0,51,102,0.10)" },
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Icon size={20} color={color} />
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                    {item.length > 44 ? `${item.slice(0, 44)}…` : item}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                  {item}
                </Typography>
              </Box>
            </Reveal>
          );
        })}
      </Box>
    </SectionCard>
  );
}

/* ----------------------------------------------------------------- amenities */

const AMENITY_GROUPS = [
  { label: "Common Areas", test: /wifi|wi-?fi|gym|fitness|garden|parking|club|pool|swimming|playground|community|lounge|party|sports/i },
  { label: "Utilities", test: /water|electric|power|backup|solar|gas|lift|elevator|internet|broadband|air.?cond|storage/i },
  { label: "Safety & Security", test: /security|guard|cctv|camera|intercom|gate|fire|alarm|visitor/i },
];

export function AmenitiesSection({ amenities }) {
  const [showAll, setShowAll] = useState(false);
  if (!amenities || amenities.length === 0) return null;

  const grouped = AMENITY_GROUPS.map((group) => ({
    ...group,
    items: amenities.filter((a) => group.test.test(a)),
  }));
  const used = new Set(grouped.flatMap((g) => g.items));
  grouped.push({ label: null, items: amenities.filter((a) => !used.has(a)) });
  const nonEmpty = grouped.filter((g) => g.items.length > 0);
  const hasLabels = nonEmpty.some((g) => g.label);

  const VISIBLE = 8;
  const remaining = amenities.length - VISIBLE;
  const visibleCount = showAll ? amenities.length : Math.min(VISIBLE, amenities.length);
  // Count the pills actually rendered so "Show N more" never promises more
  // than the collapsed view is hiding.
  let rendered = 0;

  const pillSx = {
    backgroundColor: "rgba(0,167,157,0.08)",
    border: "1px solid",
    borderColor: "rgba(0,167,157,0.2)",
    color: "#00A79D",
    fontWeight: 600,
    fontSize: "0.875rem",
    borderRadius: "20px",
    "& .MuiChip-icon": { color: "#00A79D" },
    "&:hover": { backgroundColor: "rgba(0,167,157,0.15)", borderColor: "rgba(0,167,157,0.45)" },
  };

  return (
    <SectionCard title="Amenities & features">
      <Stack spacing={4}>
        {nonEmpty.map((group) => {
          const room = visibleCount - rendered;
          const shown = showAll ? group.items : group.items.slice(0, Math.max(0, room));
          rendered += shown.length;
          if (shown.length === 0) return null;
          return (
            <Box key={group.label || "other"}>
              {hasLabels && group.label && (
                <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 2 }}>
                  {group.label}
                </Typography>
              )}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {shown.map((amenity) => (
                  <Chip key={amenity} icon={<Check size={13} />} label={amenity} sx={pillSx} />
                ))}
              </Box>
            </Box>
          );
        })}
        {!showAll && remaining > 0 && (
          <Button size="small" onClick={() => setShowAll(true)} sx={{ alignSelf: "flex-start", color: "secondary.main", fontWeight: 700, px: 0 }}>
            Show {remaining} more
          </Button>
        )}
      </Stack>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ location */

export function LocationSection({ property, mapSlot, onDirections, hasConnectivity }) {
  const advantages = [
    property.transportation && { icon: "🚇", label: "Transportation", value: property.transportation },
    property.localAmenities && { icon: "🏪", label: "What's nearby", value: property.localAmenities },
    property.neighbourhood && { icon: "🏘️", label: "Neighbourhood", value: property.neighbourhood },
  ].filter(Boolean);

  return (
    <SectionCard
      id="property-location"
      title="Location & nearby"
      action={
        <Stack direction="row" spacing={2} alignItems="center">
          {hasConnectivity && (
            <Chip
              icon={<CheckCircle2 size={13} />}
              label="Excellent connectivity"
              size="small"
              sx={{ backgroundColor: "rgba(16,185,129,0.12)", color: "#10B981", fontWeight: 700, "& .MuiChip-icon": { color: "#10B981" } }}
            />
          )}
          <Button
            size="small"
            variant="outlined"
            endIcon={<ArrowUpRight size={14} />}
            href={directionsUrl(property)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onDirections}
            sx={{ borderColor: "divider", color: "primary.main" }}
          >
            Get directions
          </Button>
        </Stack>
      }
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
        <MapPin size={16} color="#00A79D" />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {locationLine(property)}
        </Typography>
      </Stack>

      <Box sx={{ height: { xs: 300, md: 400 }, borderRadius: `${radii.lg}px`, overflow: "hidden", mb: advantages.length ? 5 : 0 }}>
        {mapSlot}
      </Box>

      {advantages.length > 0 && (
        <Stack spacing={3}>
          {advantages.map((item) => (
            <Stack key={item.label} spacing={1} sx={{ p: 4, borderRadius: `${radii.sm}px`, backgroundColor: "background.default" }}>
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                {item.icon} {item.label}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.primary", whiteSpace: "pre-line" }}>
                {item.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

/* ---------------------------------------------------- nearby / connectivity */

const PLACE_CATEGORIES = [
  { label: "Healthcare", icon: HeartPulse, color: "#EF4444", test: /hospital|clinic|health|medical|doctor|dental|pharma|nursing|diagnostic/i },
  { label: "Education", icon: GraduationCap, color: "#2563EB", test: /school|college|academy|universit|kindergarten|daycare|education|institute/i },
  { label: "Shopping", icon: ShoppingBag, color: "#F59E0B", test: /mall|market|shop|store|retail|supermarket|grocery|bazaar|showroom/i },
  { label: "Transport", icon: Bus, color: "#10B981", test: /metro|bus|rail|station|airport|highway|isbt|transit|pickup/i },
  { label: "Parks & green", icon: Trees, color: "#10B981", test: /park|garden|green|lake|forest/i },
  { label: "Nearby", icon: MapPin, color: "#00A79D", test: /.*/i },
];

const mapsSearchUrl = (name) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} Gurgaon`)}`;

export function NearbyPlacesSection({ places }) {
  if (!places || places.length === 0) return null;

  const categories = PLACE_CATEGORIES.map((category) => ({
    ...category,
    items: places.filter((place) => category.test.test(String(place.category || place.name || ""))),
  })).filter((category) => category.items.length > 0);

  return (
    <SectionCard title="What's nearby">
      <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" } }}>
        {categories.map(({ label, icon: Icon, color, items }) => (
          <Box
            key={label}
            sx={{
              borderRadius: `${radii.lg}px`,
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 2px 8px rgba(0,51,102,0.04)",
              p: 4,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3, pb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: `${color}1A`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={16} color={color} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                {label}
              </Typography>
            </Stack>

            <Stack spacing={3}>
              {items.map((place, i) => (
                <Box key={`${place.name}-${i}`}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", flex: 1 }}>
                      {place.name}
                    </Typography>
                    {place.distance && (
                      <Chip label={place.distance} size="small" sx={{ backgroundColor: "background.default", color: "text.secondary", fontWeight: 600, fontSize: "0.7rem" }} />
                    )}
                  </Stack>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                    {place.rating != null && place.rating !== "" && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Star size={12} color="#FFB800" fill="#FFB800" />
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {place.rating}
                        </Typography>
                      </Stack>
                    )}
                    <Button
                      size="small"
                      href={mapsSearchUrl(place.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: "#00A79D", px: 0, py: 0, minWidth: 0, fontSize: "0.7rem", "&:hover": { backgroundColor: "transparent", textDecoration: "underline" } }}
                    >
                      Show on map
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
    </SectionCard>
  );
}

export function ConnectivitySection({ connectivity }) {
  if (!connectivity || connectivity.length === 0) return null;
  return (
    <SectionCard title="Connectivity">
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {connectivity.map((item, i) => (
          <Chip
            key={i}
            icon={<Bus size={13} />}
            label={item.time || item.distance ? `${item.name} · ${item.time || item.distance}` : item.name}
            sx={{
              backgroundColor: "rgba(0,167,157,0.08)",
              border: "1px solid",
              borderColor: "rgba(0,167,157,0.2)",
              color: "#00A79D",
              fontWeight: 600,
              fontSize: "0.875rem",
              borderRadius: "20px",
              "& .MuiChip-icon": { color: "#00A79D" },
            }}
          />
        ))}
      </Box>
    </SectionCard>
  );
}

/* ----------------------------------------------------------------- listed by */

export function ListedBySection({ property, onCall, onWhatsapp, onEnquire, whatsappHref }) {
  return (
    <SectionCard title="Listed by">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={5} alignItems={{ sm: "center" }} justifyContent="space-between">
        <Stack direction="row" spacing={4} alignItems="center">
          <Box
            sx={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              backgroundColor: "primary.main",
              color: "common.white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <UserRound size={24} />
          </Box>
          <Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h4" sx={{ fontSize: "1rem", color: "primary.main" }}>
                {property.ownerType === "Agent" ? "Verified agent" : property.ownerType === "Admin" ? "GgnHome team" : "Property owner"}
              </Typography>
              <CheckCircle2 size={15} color="#00A79D" />
            </Stack>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {property.contactNumber ? "Responds to enquiries directly" : "Enquire and our team will connect you"}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2}>
          {property.contactNumber && (
            <>
              <Button variant="outlined" href={`tel:${property.contactNumber}`} onClick={onCall} sx={{ borderColor: "divider", color: "primary.main" }}>
                Call
              </Button>
              <Button
                variant="outlined"
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onWhatsapp}
                sx={{ borderColor: "#25D366", color: "#128C4A" }}
              >
                WhatsApp
              </Button>
            </>
          )}
          <Button variant="contained" onClick={onEnquire}>
            Send enquiry
          </Button>
        </Stack>
      </Stack>

      {property.verification.length > 0 && (
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 5, pt: 5, borderTop: "1px solid", borderColor: "divider" }}>
          {property.verification.map((badge) => (
            <Chip
              key={badge}
              icon={<Check size={13} />}
              label={badge}
              size="small"
              sx={{ backgroundColor: "background.default", color: "primary.main", fontWeight: 600, "& .MuiChip-icon": { color: "#00A79D" } }}
            />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

/* ----------------------------------------------------------------- documents */

const DOCUMENT_GROUPS = [
  { label: "Property documents", test: /deed|agreement|registry|noc|builder|sale|lease|allotment/i },
  { label: "Approvals", test: /occupancy|completion|approval|approved|rera|plan|licence|license/i },
  { label: "Other documents", test: /.*/i },
];

export function DocumentsSection({ documents, onDownload }) {
  const [showAll, setShowAll] = useState(false);
  if (!documents || documents.length === 0) return null;

  const COLLAPSED = 3;
  const visibleDocs = showAll ? documents : documents.slice(0, COLLAPSED);
  const hidden = documents.length - visibleDocs.length;

  const groups = DOCUMENT_GROUPS.map((group) => ({
    ...group,
    items: visibleDocs.filter((doc) => group.test.test(String(doc.name || ""))),
  })).filter((group) => group.items.length > 0);

  return (
    <SectionCard
      title="Property documents"
      action={
        documents.length > COLLAPSED ? (
          <Button size="small" onClick={() => setShowAll((v) => !v)} sx={{ color: "secondary.main" }}>
            {showAll ? "Show less" : `More documents (${documents.length - COLLAPSED})`}
          </Button>
        ) : null
      }
    >
      <Stack spacing={5}>
        {groups.map((group) => (
          <Box key={group.label}>
            {groups.length > 1 && (
              <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 2 }}>
                {group.label}
              </Typography>
            )}
            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
              {group.items.map((doc, i) => (
                <Stack
                  key={`${doc.name}-${i}`}
                  direction="row"
                  spacing={3}
                  alignItems="center"
                  sx={{ p: 4, borderRadius: `${radii.lg}px`, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider" }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "rgba(0,167,157,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={18} color="#00A79D" />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: "wrap" }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                        {doc.name}
                      </Typography>
                      {doc.verified && <CheckCircle2 size={14} color="#10B981" />}
                    </Stack>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {doc.size || (doc.verified ? "Verified" : "")}
                    </Typography>
                  </Box>
                  <Button size="small" href={doc.url} target="_blank" rel="noopener noreferrer" onClick={() => onDownload?.(doc)} sx={{ color: "#00A79D" }}>
                    Download
                  </Button>
                </Stack>
              ))}
            </Box>
          </Box>
        ))}
        {!showAll && hidden > 0 && (
          <Button size="small" onClick={() => setShowAll(true)} sx={{ alignSelf: "flex-start", color: "secondary.main", px: 0 }}>
            More documents ({hidden})
          </Button>
        )}
      </Stack>
    </SectionCard>
  );
}
