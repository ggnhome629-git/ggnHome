import React, { useState } from "react";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { Check, Eye, EyeOff, MessageCircle, Phone, ShieldCheck, UserRound, ExternalLink, Mail } from "lucide-react";
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
 * 
 * For affiliate properties: shows redirect button and fixed contact info.
 * For own uploads: shows owner/agent contact with number and WhatsApp.
 */
export default function ContactCard({ property, onMessage, onEvent }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasNumber = Boolean(property.contactNumber);
  const isAgent = property.ownerType === "Agent";
  const isAffiliate = property.isAffiliate;
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

  // For affiliate properties: show redirect to source portal
  if (isAffiliate) {
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
        <Stack spacing={4}>
          <Box>
            <Typography variant="h4" sx={{ fontSize: "1rem", color: "primary.main", mb: 1.5, fontWeight: 700 }}>
              This is an Affiliate Listing
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
              This property is sourced from an external portal. For the most up-to-date information and to contact the owner, please visit the original listing.
            </Typography>

            <Box
              sx={{
                p: 3,
                backgroundColor: "rgba(0,167,157,0.08)",
                borderRadius: `${radii.md}px`,
                border: "1px solid rgba(0,167,157,0.2)",
                mb: 3,
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2, fontWeight: 600 }}>
                Source Portal
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "8px",
                    backgroundColor: "#00A79D",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                  }}
                >
                  {property.sourcePortal === "nobroker" ? "NB" : "99"}
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {property.sourcePortal === "nobroker" ? "NoBroker" : "99acres"}
                </Typography>
              </Stack>
              {property.priceDisplay && (
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                  Listed Price: <strong>{property.priceDisplay}</strong>
                  {property.isRental && " per month"}
                </Typography>
              )}
            </Box>

            <Button
              fullWidth
              variant="contained"
              color="secondary"
              size="large"
              endIcon={<ExternalLink size={16} />}
              onClick={() => {
                onEvent?.("affiliate_redirect_clicked");
                window.open(property.sourceUrl, "_blank");
              }}
              sx={{ fontWeight: 700, mb: 2 }}
            >
              View Original Listing
            </Button>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h4" sx={{ fontSize: "0.95rem", color: "primary.main", mb: 2, fontWeight: 700 }}>
              Need Help?
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Phone size={16} color="#00A79D" />
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Call us
                  </Typography>
                  <Button
                    href="tel:+919654131789"
                    sx={{ p: 0, justifyContent: "flex-start", color: "primary.main", fontWeight: 700 }}
                  >
                    +91 96541 31789
                  </Button>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Mail size={16} color="#00A79D" />
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Email us
                  </Typography>
                  <Button
                    href="mailto:support@ggnhome.com"
                    sx={{ p: 0, justifyContent: "flex-start", color: "primary.main", fontWeight: 700 }}
                  >
                    support@ggnhome.com
                  </Button>
                </Box>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Box>
    );
  }

  // For own uploads: show owner/agent contact
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
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Phone size={15} />}
                href={`tel:${property.contactNumber}`}
                onClick={() => onEvent?.("call_clicked")}
                sx={{
                  borderColor: "divider",
                  color: "#00A79D",
                  "&:hover": { borderColor: "#00A79D", backgroundColor: "rgba(0,167,157,0.06)" },
                }}
              >
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

        <Button
          fullWidth
          variant="outlined"
          startIcon={<MessageCircle size={15} />}
          onClick={onMessage}
          sx={{ borderColor: "#00A79D", color: "#00A79D", "&:hover": { borderColor: "#00A79D", backgroundColor: "rgba(0,167,157,0.08)" } }}
        >
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
