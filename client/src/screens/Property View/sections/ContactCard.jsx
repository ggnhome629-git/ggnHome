import React, { useState } from "react";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { Check, Eye, EyeOff, MessageCircle, Phone, ShieldCheck, UserRound } from "lucide-react";
import { radii } from "../../../theme/theme";
import { formatCurrency, whatsappUrl } from "../../../utils/propertyModel";

/** "+91 98765 •••••" — enough to recognise your own number, not enough to call it. */
function maskNumber(number) {
  const digits = String(number).replace(/\D/g, "");
  if (digits.length < 5) return "•••••";
  const prefix = digits.length === 10 ? "+91 " : "+";
  return `${prefix}${digits.slice(0, 5)} ${"•".repeat(Math.max(4, digits.length - 5))}`;
}

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

/**
 * Section 9 of the upgrade guide — the conversion card for normal listings.
 * The number is masked until the visitor asks for it (and copies to the
 * clipboard on click); everything here is rendered only from data the listing
 * actually carries, so an owner-listed property with no number still reads
 * cleanly as "message us and we'll connect you".
 */
export default function ContactCard({ property, onMessage, onEvent }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasNumber = Boolean(property.contactNumber);
  const isAgent = property.ownerType === "Agent";
  const commissionValue = property.commission
    ? `Commission: ${formatCurrency(property.commission)}${property.commissionNote ? ` (${property.commissionNote})` : ""}`
    : null;

  const copyNumber = () => {
    if (!hasNumber) return;
    const digits = String(property.contactNumber).replace(/\D/g, "");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(digits).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        },
        () => {}
      );
    }
    setRevealed(true);
  };

  return (
    <Box
      sx={{
        borderRadius: `${radii.lg}px`,
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 6px 20px rgba(0,51,102,0.06)",
        p: 5,
      }}
    >
      {/* Identity */}
      <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 4 }}>
        <Box sx={{ position: "relative", flexShrink: 0 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              border: "3px solid #00A79D",
              backgroundColor: "rgba(0,167,157,0.12)",
              color: "#00857D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "1.4rem",
              overflow: "hidden",
            }}
          >
            {property.listedByName ? initials(property.listedByName) : <UserRound size={30} />}
          </Box>
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#10B981",
              border: "2px solid #FFFFFF",
            }}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontSize: "1.1rem", color: "primary.main" }}>
            {property.listedByName || (isAgent ? "GgnHome agent" : "Property owner")}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1, flexWrap: "wrap" }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                backgroundColor: "#003366",
                color: "common.white",
                px: 1.5,
                py: 0.5,
                borderRadius: "4px",
                fontSize: "0.7rem",
                fontWeight: 700,
              }}
            >
              <Check size={11} strokeWidth={3} />
              {isAgent ? "Verified agent" : "Listed by owner"}
            </Box>
          </Stack>
        </Box>
      </Stack>

      <Divider sx={{ mb: 4 }} />

      {/* Contact channels */}
      <Stack spacing={3}>
        {hasNumber ? (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Button
                onClick={copyNumber}
                startIcon={revealed ? <Eye size={15} /> : <EyeOff size={15} />}
                sx={{ color: "text.primary", fontWeight: 700, px: 0, "&:hover": { backgroundColor: "transparent" } }}
              >
                {revealed ? `+${String(property.contactNumber).replace(/\D/g, "")}` : maskNumber(property.contactNumber)}
              </Button>
              <Typography variant="caption" sx={{ color: copied ? "success.main" : "text.secondary" }}>
                {copied ? "Copied" : revealed ? "Tap to copy" : ""}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button fullWidth variant="outlined" startIcon={<Phone size={15} />} href={`tel:${property.contactNumber}`} onClick={() => onEvent?.("call_clicked")} sx={{ borderColor: "divider", color: "#00A79D", "&:hover": { borderColor: "#00A79D", backgroundColor: "rgba(0,167,157,0.06)" } }}>
                Call
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<MessageCircle size={15} />}
                href={whatsappUrl(property, property.contactNumber)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onEvent?.("whatsapp_clicked")}
                sx={{ borderColor: "#25D366", color: "#128C4A", "&:hover": { borderColor: "#25D366", backgroundColor: "rgba(37,211,102,0.10)" } }}
              >
                WhatsApp
              </Button>
            </Stack>
          </>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No direct number listed — send a message and we'll connect you with the owner.
          </Typography>
        )}

        <Button fullWidth variant="outlined" startIcon={<MessageCircle size={15} />} onClick={onMessage} sx={{ borderColor: "#00A79D", color: "#00A79D", "&:hover": { borderColor: "#00A79D", backgroundColor: "rgba(0,167,157,0.08)" } }}>
          Send message
        </Button>
      </Stack>

      {(commissionValue || property.verification.length > 0) && (
        <Stack spacing={2} sx={{ mt: 5, pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
          {commissionValue && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {commissionValue}
            </Typography>
          )}
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
    </Box>
  );
}
