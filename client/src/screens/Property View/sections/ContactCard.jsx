import React from "react";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { CalendarCheck, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { radii, elevationShadows } from "../../../theme/theme";
import { whatsappUrl } from "../../../utils/propertyModel";

/**
 * The hero's conversion card. Deliberately *not* a form — a visitor who has
 * just landed shouldn't be asked for five fields before they've decided
 * anything. This shows the price, the two actions that actually convert
 * (book a visit / get a callback) and the direct channels, then earns the
 * longer form further down the page.
 */
export default function ContactCard({
  property,
  onScheduleVisit,
  onRequestCallback,
  onEvent,
}) {
  const hasNumber = Boolean(property.contactNumber);

  return (
    <Box
      sx={{
        borderRadius: `${radii.lg}px`,
        overflow: "hidden",
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: elevationShadows[2],
      }}
    >
      {/* Price band */}
      <Box sx={{ px: 6, py: 5, backgroundColor: "primary.main", color: "common.white" }}>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
          {property.priceLabel}
        </Typography>
        <Typography variant="h2" sx={{ fontSize: { xs: "1.6rem", md: "1.9rem" }, color: "common.white", lineHeight: 1.15 }}>
          {property.priceDisplay || "Price on request"}
        </Typography>
        {property.pricePerSqFt && (
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
            ₹{property.pricePerSqFt.toLocaleString("en-IN")} per sq.ft.
          </Typography>
        )}
      </Box>

      <Stack spacing={3} sx={{ p: 6 }}>
        <Button variant="contained" size="large" startIcon={<CalendarCheck size={18} />} onClick={onScheduleVisit} fullWidth>
          Schedule site visit
        </Button>

        <Button
          variant="outlined"
          size="large"
          onClick={onRequestCallback}
          fullWidth
          sx={{ borderColor: "divider", color: "primary.main", "&:hover": { borderColor: "primary.main" } }}
        >
          Request a callback
        </Button>

        {hasNumber && (
          <>
            <Divider sx={{ my: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                or reach out directly
              </Typography>
            </Divider>

            <Stack direction="row" spacing={3}>
              <Button
                fullWidth
                startIcon={<Phone size={16} />}
                href={`tel:${property.contactNumber}`}
                onClick={() => onEvent?.("call_clicked")}
                sx={{
                  py: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                  color: "primary.main",
                  "&:hover": { backgroundColor: "background.default" },
                }}
              >
                Call
              </Button>
              <Button
                fullWidth
                startIcon={<MessageCircle size={16} />}
                href={whatsappUrl(property, property.contactNumber)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onEvent?.("whatsapp_clicked")}
                sx={{
                  py: 2.5,
                  backgroundColor: "#25D366",
                  color: "common.white",
                  "&:hover": { backgroundColor: "#1fb959" },
                }}
              >
                WhatsApp
              </Button>
            </Stack>
          </>
        )}

        {property.verification.length > 0 && (
          <Stack spacing={2} sx={{ pt: 3, mt: 1, borderTop: "1px solid", borderColor: "divider" }}>
            {property.verification.slice(0, 3).map((badge) => (
              <Stack key={badge} direction="row" spacing={2} alignItems="center">
                <ShieldCheck size={14} color="#00A79D" style={{ flexShrink: 0 }} />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {badge}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
