import React from "react";
import { Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import { ExternalLink, Heart, MapPin, MessageCircle, Phone, Share2 } from "lucide-react";
import { radii } from "../../../theme/theme";
import { directionsUrl, sourcePortalLabel, whatsappUrl } from "../../../utils/propertyModel";

const FALLBACK = "/default-property.jpg";

/** Desktop/tablet quick-action row that sits directly under the gallery. */
export function QuickActionsBar({ property, saved, onSave, onShare, onEvent }) {
  const actions = [
    property.isAffiliate && {
      key: "source",
      label: `View on ${sourcePortalLabel(property.sourcePortal)}`,
      icon: <ExternalLink size={16} color="#00A79D" />,
      href: property.sourceUrl,
      external: true,
      onClick: () => onEvent?.("source_cta_clicked", { portal: property.sourcePortal }),
    },
    {
      key: "save",
      label: saved ? "Saved" : "Save",
      icon: <Heart size={16} fill={saved ? "#00A79D" : "none"} color={saved ? "#00A79D" : "#4A6A8A"} />,
      onClick: onSave,
    },
    { key: "share", label: "Share", icon: <Share2 size={16} color="#4A6A8A" />, onClick: onShare },
    // Affiliate listings have no owner to call — every contact action is hidden.
    !property.isAffiliate &&
      property.contactNumber && {
        key: "call",
        label: "Call",
        icon: <Phone size={16} color="#4A6A8A" />,
        href: `tel:${property.contactNumber}`,
        onClick: () => onEvent?.("call_clicked"),
      },
    !property.isAffiliate &&
      property.contactNumber && {
        key: "whatsapp",
        label: "WhatsApp",
        icon: <MessageCircle size={16} color="#128C4A" />,
        href: whatsappUrl(property, property.contactNumber),
        external: true,
        onClick: () => onEvent?.("whatsapp_clicked"),
      },
    {
      key: "directions",
      label: "Directions",
      icon: <MapPin size={16} color="#4A6A8A" />,
      href: directionsUrl(property),
      external: true,
      onClick: () => onEvent?.("directions_clicked"),
    },
  ].filter(Boolean);

  return (
    <Stack
      direction="row"
      spacing={2}
      flexWrap="wrap"
      useFlexGap
      sx={{
        p: 2,
        borderRadius: `${radii.md}px`,
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {actions.map((action) => (
        <Button
          key={action.key}
          startIcon={action.icon}
          onClick={action.onClick}
          href={action.href}
          target={action.external ? "_blank" : undefined}
          rel={action.external ? "noopener noreferrer" : undefined}
          sx={{
            flex: { xs: "1 1 auto", sm: "0 0 auto" },
            color: "text.secondary",
            fontWeight: 600,
            "&:hover": { backgroundColor: "background.default", color: "primary.main" },
          }}
        >
          {action.label}
        </Button>
      ))}
    </Stack>
  );
}

/**
 * Mobile bottom bar (section 14) — always reachable, and the page reserves
 * padding for it so it never covers the last section. Affiliate listings get
 * the portal CTA instead of the conversion buttons, and no contact actions.
 */
export function StickyActionBar({ property, saved, onSave, onShare, onScheduleVisit, onEnquire, onEvent }) {
  const isAffiliate = property.isAffiliate;
  const thumb = property.images[0];

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      sx={{
        display: { xs: "flex", lg: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1150,
        px: 2.5,
        pt: 2.5,
        pb: "calc(10px + env(safe-area-inset-bottom, 0px))",
        minHeight: 68,
        backgroundColor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        boxShadow: "0 -4px 12px rgba(0,51,102,0.08)",
      }}
    >
      <Box
        component="img"
        src={thumb || FALLBACK}
        alt=""
        aria-hidden
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
        sx={{ width: 44, height: 44, borderRadius: "8px", objectFit: "cover", flexShrink: 0, display: { xs: "none", sm: "block" } }}
      />

      <Box sx={{ minWidth: 0, maxWidth: { xs: 96, sm: 200 }, mr: 0.5, flexShrink: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1.2 }} noWrap>
          {property.priceDisplay || "On request"}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", display: { xs: property.isRental ? "block" : "none", sm: "block" } }} noWrap>
          {property.isRental ? "per month" : property.title}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }} />

      <Tooltip title={saved ? "Saved" : "Save"}>
        <Button
          onClick={onSave}
          aria-label={saved ? "Unsave property" : "Save property"}
          sx={{ minWidth: 40, width: 40, height: 40, px: 0, flexShrink: 0, border: "1px solid", borderColor: "divider", color: saved ? "#00A79D" : "text.secondary" }}
        >
          <Heart size={17} fill={saved ? "#00A79D" : "none"} color={saved ? "#00A79D" : "#4A6A8A"} />
        </Button>
      </Tooltip>

      {isAffiliate ? (
        <>
          <Tooltip title="Share">
            <Button onClick={onShare} aria-label="Share property" sx={{ minWidth: 44, px: 0, border: "1px solid", borderColor: "divider", color: "text.secondary" }}>
              <Share2 size={17} />
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            href={property.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onEvent?.("source_cta_clicked", { portal: property.sourcePortal })}
            endIcon={<ExternalLink size={15} />}
            sx={{
              flex: 1,
              whiteSpace: "nowrap",
              backgroundImage: "linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)",
              color: "#FFFFFF",
              "&:hover": { backgroundImage: "linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)" },
            }}
          >
            View on {sourcePortalLabel(property.sourcePortal)}
          </Button>
        </>
      ) : (
        <>
          <Button variant="outlined" onClick={onEnquire} sx={{ whiteSpace: "nowrap", flexShrink: 0, px: 2, minWidth: 0, borderColor: "#00A79D", color: "#00A79D", "&:hover": { borderColor: "#00A79D", backgroundColor: "rgba(0,167,157,0.08)" } }}>
            Enquire
          </Button>
          <Button
            variant="contained"
            onClick={onScheduleVisit}
            sx={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              px: 2,
              minWidth: 0,
              backgroundImage: "linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)",
              color: "#FFFFFF",
              "&:hover": { backgroundImage: "linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)" },
            }}
          >
            Book visit
          </Button>
        </>
      )}
    </Stack>
  );
}
