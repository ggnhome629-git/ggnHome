import React from "react";
import { Box, Button, Stack, Tooltip, Typography } from "@mui/material";
import { Heart, MapPin, MessageCircle, Phone, Share2 } from "lucide-react";
import { radii } from "../../../theme/theme";
import { directionsUrl, whatsappUrl } from "../../../utils/propertyModel";

/** Desktop/tablet quick-action row that sits directly under the gallery. */
export function QuickActionsBar({ property, saved, onSave, onShare, onEvent }) {
  const actions = [
    {
      key: "save",
      label: saved ? "Saved" : "Save",
      icon: <Heart size={16} fill={saved ? "#00A79D" : "none"} color={saved ? "#00A79D" : "#4A6A8A"} />,
      onClick: onSave,
    },
    { key: "share", label: "Share", icon: <Share2 size={16} color="#4A6A8A" />, onClick: onShare },
    property.contactNumber && {
      key: "call",
      label: "Call",
      icon: <Phone size={16} color="#4A6A8A" />,
      href: `tel:${property.contactNumber}`,
      onClick: () => onEvent?.("call_clicked"),
    },
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
 * Mobile bottom bar — always reachable, and the page reserves padding for it
 * so it never covers the last section.
 */
export function StickyActionBar({ property, saved, onSave, onScheduleVisit, onEvent }) {
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
        px: 3,
        py: 3,
        backgroundColor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        boxShadow: "0 -8px 24px rgba(0,20,45,0.10)",
      }}
    >
      <Box sx={{ minWidth: 0, mr: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 800, color: "secondary.main", lineHeight: 1.2 }} noWrap>
          {property.priceDisplay || "On request"}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
          {property.priceLabel}
        </Typography>
      </Box>

      <Tooltip title={saved ? "Saved" : "Save"}>
        <Button
          onClick={onSave}
          aria-label={saved ? "Unsave property" : "Save property"}
          sx={{ minWidth: 44, px: 0, border: "1px solid", borderColor: "divider", color: "text.secondary" }}
        >
          <Heart size={17} fill={saved ? "#00A79D" : "none"} color={saved ? "#00A79D" : "#4A6A8A"} />
        </Button>
      </Tooltip>

      {property.contactNumber && (
        <Button
          href={`tel:${property.contactNumber}`}
          onClick={() => onEvent?.("call_clicked")}
          aria-label="Call"
          sx={{ minWidth: 44, px: 0, border: "1px solid", borderColor: "divider", color: "primary.main" }}
        >
          <Phone size={17} />
        </Button>
      )}

      {property.contactNumber && (
        <Button
          href={whatsappUrl(property, property.contactNumber)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onEvent?.("whatsapp_clicked")}
          aria-label="WhatsApp"
          sx={{ minWidth: 44, px: 0, backgroundColor: "#25D366", color: "common.white", "&:hover": { backgroundColor: "#1fb959" } }}
        >
          <MessageCircle size={17} />
        </Button>
      )}

      <Button variant="contained" onClick={onScheduleVisit} sx={{ flex: 1, whiteSpace: "nowrap" }}>
        Book visit
      </Button>
    </Stack>
  );
}
