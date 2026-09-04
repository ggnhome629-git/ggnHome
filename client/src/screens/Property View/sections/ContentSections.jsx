import React, { useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import {
  ArrowUpRight,
  Bath,
  Bed,
  Building,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  Compass,
  Home,
  Layers,
  MapPin,
  Maximize,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
} from "lucide-react";
import { radii, elevationShadows } from "../../../theme/theme";
import { directionsUrl, formatCurrency, locationLine } from "../../../utils/propertyModel";

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

/* ------------------------------------------------------------------ overview */

export function OverviewSection({ property }) {
  const specs = [
    { icon: Home, label: "Property type", value: property.propertyType },
    { icon: Layers, label: "Configuration", value: property.configuration },
    { icon: Maximize, label: "Built-up area", value: property.builtUpAreaDisplay },
    { icon: Bed, label: "Bedrooms", value: property.bedrooms },
    { icon: Bath, label: "Bathrooms", value: property.bathrooms },
    { icon: Building, label: "Floor", value: property.floor != null && property.totalFloors ? `${property.floor} of ${property.totalFloors}` : property.totalFloors ? `${property.totalFloors} floors` : null },
    { icon: Car, label: "Parking", value: property.parking },
    { icon: Calendar, label: "Possession", value: property.possession },
    { icon: Compass, label: "Age of property", value: property.age },
    { icon: UserRound, label: "Listed by", value: property.ownership },
    { icon: Tag, label: "Property ID", value: property.id ? `#${String(property.id).slice(-8).toUpperCase()}` : null },
    { icon: ShieldCheck, label: "RERA", value: property.reraNumber },
  ].filter((s) => s.value !== null && s.value !== undefined && s.value !== "");

  if (specs.length === 0) return null;

  return (
    <SectionCard title="Property overview">
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
    </SectionCard>
  );
}

/* --------------------------------------------------------------------- price */

export function PriceSection({ property, onOpenEmi }) {
  const rows = [
    { label: property.priceLabel, value: property.priceExact, emphasis: true },
    property.pricePerSqFt && { label: "Price per sq.ft.", value: formatCurrency(property.pricePerSqFt) },
    property.securityDeposit && { label: "Security deposit", value: property.securityDeposit.startsWith("₹") ? property.securityDeposit : `₹${property.securityDeposit}` },
    property.maintenance && { label: "Maintenance", value: property.maintenance },
    property.otherFees && { label: "Other charges", value: property.otherFees },
    property.leaseTerm && { label: "Lease term", value: property.leaseTerm },
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

export function HighlightsSection({ highlights }) {
  if (!highlights || highlights.length === 0) return null;
  return (
    <SectionCard title="Property highlights">
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
        {highlights.map((item) => (
          <Stack key={item} direction="row" spacing={3} alignItems="flex-start" sx={{ p: 3, borderRadius: `${radii.sm}px`, backgroundColor: "background.default" }}>
            <Check size={16} color="#00A79D" style={{ flexShrink: 0, marginTop: 3 }} />
            <Typography variant="body2" sx={{ color: "text.primary" }}>
              {item}
            </Typography>
          </Stack>
        ))}
      </Box>
    </SectionCard>
  );
}

/* ----------------------------------------------------------------- amenities */

export function AmenitiesSection({ amenities }) {
  const [showAll, setShowAll] = useState(false);
  if (!amenities || amenities.length === 0) return null;

  const visible = showAll ? amenities : amenities.slice(0, 12);

  return (
    <SectionCard
      title="Amenities"
      action={
        amenities.length > 12 ? (
          <Button size="small" onClick={() => setShowAll((v) => !v)} sx={{ color: "secondary.main" }}>
            {showAll ? "Show less" : `View all ${amenities.length}`}
          </Button>
        ) : null
      }
    >
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" } }}>
        {visible.map((amenity) => (
          <Stack key={amenity} direction="row" spacing={2} alignItems="center" sx={{ p: 3, borderRadius: `${radii.sm}px`, backgroundColor: "background.default" }}>
            <Sparkles size={15} color="#00A79D" style={{ flexShrink: 0 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
              {amenity}
            </Typography>
          </Stack>
        ))}
      </Box>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ location */

export function LocationSection({ property, mapSlot, onDirections }) {
  const advantages = [
    property.transportation && { icon: "🚇", label: "Transportation", value: property.transportation },
    property.localAmenities && { icon: "🏪", label: "What's nearby", value: property.localAmenities },
    property.neighbourhood && { icon: "🏘️", label: "Neighbourhood", value: property.neighbourhood },
  ].filter(Boolean);

  return (
    <SectionCard
      id="property-location"
      title="Location"
      action={
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
      }
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
        <MapPin size={16} color="#00A79D" />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {locationLine(property)}
        </Typography>
      </Stack>

      <Box sx={{ height: { xs: 260, md: 360 }, borderRadius: `${radii.sm}px`, overflow: "hidden", mb: advantages.length ? 5 : 0 }}>
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

export function NearbyPlacesSection({ places }) {
  if (!places || places.length === 0) return null;
  return (
    <SectionCard title="What's nearby">
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
        {places.map((place, i) => (
          <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 4, borderRadius: `${radii.sm}px`, backgroundColor: "background.default" }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                {place.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {place.category}
              </Typography>
            </Box>
            {place.distance && (
              <Typography variant="body2" sx={{ fontWeight: 700, color: "secondary.main" }}>
                {place.distance}
              </Typography>
            )}
          </Stack>
        ))}
      </Box>
    </SectionCard>
  );
}

export function ConnectivitySection({ connectivity }) {
  if (!connectivity || connectivity.length === 0) return null;
  return (
    <SectionCard title="Connectivity">
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(3, 1fr)" } }}>
        {connectivity.map((item, i) => (
          <Stack key={i} spacing={1} sx={{ p: 4, borderRadius: `${radii.sm}px`, backgroundColor: "background.default" }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
              {item.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "secondary.main", fontWeight: 700 }}>
              {item.time || item.distance}
            </Typography>
          </Stack>
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
              icon={<ShieldCheck size={13} />}
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

export function DocumentsSection({ documents, onDownload }) {
  if (!documents || documents.length === 0) return null;
  return (
    <SectionCard title="Property documents">
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
        {documents.map((doc, i) => (
          <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 4, borderRadius: `${radii.sm}px`, backgroundColor: "background.default" }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }} noWrap>
                {doc.name}
              </Typography>
              {doc.size && (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {doc.size}
                </Typography>
              )}
            </Box>
            <Button size="small" href={doc.url} target="_blank" rel="noopener noreferrer" onClick={() => onDownload?.(doc)} sx={{ color: "secondary.main" }}>
              Download
            </Button>
          </Stack>
        ))}
      </Box>
    </SectionCard>
  );
}
