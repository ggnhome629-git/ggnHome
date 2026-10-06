import React from "react";
import { Avatar, Box, Stack, Typography } from "@mui/material";
import { BadgeCheck, Eye, PencilLine, ShieldCheck, Wallet } from "lucide-react";
import { radii } from "../../theme/theme";

const DEFAULT_POINTS = [
  { icon: Wallet, title: "100% Free To Post", text: "No listing fee, no hidden charges." },
  { icon: ShieldCheck, title: "Reviewed Before Going Live", text: "Our team checks every listing to keep the site genuine." },
  { icon: PencilLine, title: "Edit Or Pause Anytime", text: "Manage everything from your listings page." },
  { icon: Eye, title: "Contact Details Stay Private", text: "We keep phone numbers and emails out of listing text." },
];

function maskPhone(n) {
  const s = String(n || "").replace(/\D/g, "");
  if (s.length < 4) return "";
  return `•••••• ${s.slice(-4)}`;
}

/** Who is posting + the factual promises the site makes to posters. */
export default function TrustPanel({ user, roleLabel, points = DEFAULT_POINTS }) {
  const name = user?.name || user?.fullName || (user?.email ? user.email.split("@")[0] : "");
  const phone = maskPhone(user?.mobileNumber);
  return (
    <Box sx={{ p: 5, borderRadius: `${radii.lg}px`, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider" }}>
      {user && (
        <Stack direction="row" spacing={3} alignItems="center" sx={{ pb: 4, mb: 4, borderBottom: "1px solid", borderColor: "divider" }}>
          <Avatar sx={{ bgcolor: "primary.main", width: 44, height: 44, fontWeight: 700 }}>{(name || "U").charAt(0).toUpperCase()}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Posting as {roleLabel || "Owner"}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontWeight: 700, color: "primary.main" }} noWrap>
                {name || "You"}
              </Typography>
              {user.isVerified && <BadgeCheck size={16} color="#00A79D" aria-label="Verified account" />}
            </Stack>
            <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
              {[phone, user.isVerified ? "Verified account" : null].filter(Boolean).join(" · ")}
            </Typography>
          </Box>
        </Stack>
      )}
      <Typography sx={{ fontWeight: 800, color: "primary.main", mb: 3 }}>Why Post On ggnHome</Typography>
      <Stack spacing={3}>
        {points.map(({ icon: Icon, title, text }) => (
          <Stack key={title} direction="row" spacing={3} alignItems="flex-start">
            <Box sx={{ width: 32, height: 32, borderRadius: "10px", backgroundColor: "rgba(0,167,157,0.1)", color: "secondary.main", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon size={16} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                {title}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {text}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
