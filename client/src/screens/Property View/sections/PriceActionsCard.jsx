import React from "react";
import { Box, Button, Chip, Divider, Stack, Typography } from "@mui/material";
import { CalendarCheck, ExternalLink, Heart, MessageCircle, PhoneCall, Share2 } from "lucide-react";
import { displayAmount, formatCurrency, sourcePortalLabel } from "../../../utils/propertyModel";
import { radii } from "../../../theme/theme";
import { ghostCtaSx, primaryCtaSx, secondaryCtaSx } from "./ctaStyles";

const SOURCE_STYLES = {
  nobroker: { background: "#00A79D", color: "#FFFFFF" },
  "99acres": { background: "#22D3EE", color: "#003366" },
};

function PriceRow({ label, value, muted }) {
  if (!value) return null;
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={3}>
      <Typography variant="body2" sx={{ color: muted ? "text.secondary" : "text.primary" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: muted ? "text.secondary" : "primary.main", textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * Section 2 of the upgrade guide — the sticky card under the hero that owns
 * the price and the primary CTA. Affiliate listings get "View on [portal]" as
 * the primary action and no conversion CTAs at all; normal listings get the
 * schedule / callback / message trio.
 */
export default function PriceActionsCard({
  property,
  saved,
  onSave,
  onShare,
  onScheduleVisit,
  onRequestCallback,
  onMessage,
  onEvent,
}) {
  const isAffiliate = property.isAffiliate;
  const sourceStyle = SOURCE_STYLES[property.sourcePortal] || SOURCE_STYLES.nobroker;
  const commissionValue = property.commission
    ? `${formatCurrency(property.commission)}${property.commissionNote ? ` (${property.commissionNote})` : ""}`
    : null;
  const hasDetailRows = Boolean(property.securityDeposit || property.leaseTerm || commissionValue);

  return (
    <Box
      sx={{
        borderRadius: `${radii.lg}px`,
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 6px 20px rgba(0,51,102,0.06)",
        overflow: "hidden",
      }}
    >
      <Stack sx={{ p: 6 }} spacing={4}>
        {/* Price block */}
        <Box>
          <Typography variant="h2" sx={{ fontSize: { xs: "1.5rem", md: "1.75rem" }, color: "primary.main", lineHeight: 1.2 }}>
            {property.priceDisplay || "Price on request"}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
            {property.priceLabel}
            {property.pricePerSqFt ? ` · Price per sq.ft. ${formatCurrency(property.pricePerSqFt)}` : ""}
          </Typography>
        </Box>

        {/* Detail rows — only when the listing actually carries them, so the
            card never shows empty rules between sections. */}
        {hasDetailRows && (
          <Stack spacing={2}>
            <PriceRow label="Security deposit" value={displayAmount(property.securityDeposit)} />
            <PriceRow label="Lease term" value={property.leaseTerm} />
            <PriceRow label="Commission" value={commissionValue} muted />
          </Stack>
        )}

        {isAffiliate && (
          <>
            <Divider />
            <Chip
              icon={<ExternalLink size={14} />}
              label={`Sourced from ${sourcePortalLabel(property.sourcePortal)}`}
              sx={{
                alignSelf: "flex-start",
                backgroundColor: sourceStyle.background,
                color: sourceStyle.color,
                fontWeight: 700,
                borderRadius: "20px",
                "& .MuiChip-icon": { color: "inherit" },
              }}
            />
          </>
        )}

        <Divider />

        {/* Actions */}
        <Stack spacing={3}>
          {isAffiliate ? (
            <>
              <Button
                variant="contained"
                size="large"
                endIcon={<ExternalLink size={16} />}
                href={property.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onEvent?.("source_cta_clicked", { portal: property.sourcePortal })}
                sx={primaryCtaSx}
              >
                View on {sourcePortalLabel(property.sourcePortal)}
              </Button>
              <Button variant="outlined" size="large" startIcon={<Share2 size={16} />} onClick={onShare} sx={secondaryCtaSx}>
                Share this property
              </Button>
              <Button variant="text" size="large" startIcon={<Heart size={16} fill={saved ? "#00A79D" : "none"} />} onClick={onSave} sx={ghostCtaSx}>
                {saved ? "Saved to favorites" : "Save to favorites"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="contained" size="large" startIcon={<CalendarCheck size={17} />} onClick={onScheduleVisit} sx={primaryCtaSx}>
                Schedule site visit
              </Button>
              <Button variant="outlined" size="large" startIcon={<PhoneCall size={16} />} onClick={onRequestCallback} sx={secondaryCtaSx}>
                Request callback
              </Button>
              <Button variant="text" size="large" startIcon={<MessageCircle size={16} />} onClick={onMessage} sx={ghostCtaSx}>
                Send message
              </Button>
              <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                <Button variant="outlined" size="small" startIcon={<Share2 size={15} />} onClick={onShare} sx={{ ...secondaryCtaSx, flex: 1, padding: "8px 10px" }}>
                  Share
                </Button>
                <Button variant="outlined" size="small" startIcon={<Heart size={15} fill={saved ? "#00A79D" : "none"} />} onClick={onSave} sx={{ ...secondaryCtaSx, flex: 1, padding: "8px 10px" }}>
                  {saved ? "Saved" : "Save"}
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
