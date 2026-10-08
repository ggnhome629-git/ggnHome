import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { radii } from "../../../theme/theme";

const CONTACT_PHONE = "+91 96541 31789";
const CONTACT_PHONE_TEL = "+919654131789";
const CONTACT_EMAIL = "support@ggnhome.com";

/**
 * Simple contact card for every listing (own or sourced): shows the ggnHome
 * number and email, plus an "Enquire now" button that jumps to the enquiry
 * form, which sends the lead to admin.
 */
export default function ContactCard({ property, onMessage, onEvent }) {
  return (
    <Box
      sx={{
        borderRadius: `${radii.lg}px`,
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 1px 3px rgba(0,51,102,0.06)",
        p: 5,
      }}
    >
      <Typography variant="overline" sx={{ display: "block", color: "text.secondary", fontWeight: 700, letterSpacing: "0.08em", mb: 3 }}>
        Contact us
      </Typography>
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Phone size={16} color="#00A79D" />
          <Button href={`tel:${CONTACT_PHONE_TEL}`} onClick={() => onEvent?.("call_clicked")} sx={{ p: 0, color: "primary.main", fontWeight: 700 }}>
            {CONTACT_PHONE}
          </Button>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <Mail size={16} color="#00A79D" />
          <Button href={`mailto:${CONTACT_EMAIL}`} sx={{ p: 0, color: "primary.main", fontWeight: 700, textTransform: "none" }}>
            {CONTACT_EMAIL}
          </Button>
        </Stack>
      </Stack>
      <Button
        fullWidth
        variant="contained"
        color="secondary"
        size="large"
        startIcon={<MessageSquare size={16} />}
        onClick={onMessage}
        sx={{ fontWeight: 700 }}
      >
        Enquire now
      </Button>
    </Box>
  );
}
