import React from "react";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { CalendarDays, Heart, MapPin, Sofa, Users } from "lucide-react";
import CardPhotos from "../../components/property/CardPhotos";
import { radii, elevationShadows } from "../../theme/theme";

const GENDER_LABEL = { female: "Female only", male: "Male only", any: "Anyone" };
const GENDER_DOT = { female: "#E11D48", male: "#2563EB", any: "#00A79D" };

export function formatBudget(budget) {
  const min = Number(budget?.min) || 0;
  const max = Number(budget?.max) || 0;
  const fmt = (n) => `₹${n.toLocaleString("en-IN")}`;
  if (!min && !max) return "Rent on request";
  if (!max || min === max) return `${fmt(min || max)}/mo`;
  if (!min) return `Up to ${fmt(max)}/mo`;
  return `${fmt(min)} – ${fmt(max)}/mo`;
}

function moveInLabel(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getTime() <= Date.now()) return "Move in now";
  return `Move in ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

/** A room/flatmate listing in the same visual language as PropertyCard. */
export default function FlatmateCard({ listing, onClick, isSaved, onToggleSave }) {
  const photos = (listing.photos || []).map((p) => (typeof p === "string" ? p : p?.url)).filter(Boolean);
  const gender = listing.preferredGender || "any";
  const isNew = listing.createdAt && Date.now() - new Date(listing.createdAt).getTime() < 3 * 86400000;
  const sharing = Number(listing.occupancyWanted) || 1;
  const facts = [
    moveInLabel(listing.moveInDate),
    `${sharing} ${sharing === 1 ? "spot" : "spots"} open`,
    listing.furnished ? "Furnished" : null,
  ].filter(Boolean);

  return (
    <Box
      component={motion.div}
      role="button"
      tabIndex={0}
      aria-label={`${listing.title}, ${formatBudget(listing.budget)}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        borderRadius: `${radii.lg}px`,
        overflow: "hidden",
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: elevationShadows[1],
        transition: "box-shadow .25s ease",
        "&:hover": { boxShadow: elevationShadows[3] },
        "&:focus-visible": { outline: "3px solid", outlineColor: "secondary.main", outlineOffset: 2 },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <CardPhotos images={photos} alt={listing.title} aspectRatio="4 / 3" width={640} widths={[320, 480, 640, 960]} />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.3) 100%)",
          }}
        />
        <Stack direction="row" spacing={1.5} sx={{ position: "absolute", top: 12, left: 12 }}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ px: 2.5, py: 1, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.94)", color: "primary.main", fontSize: 11, fontWeight: 700 }}
          >
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: GENDER_DOT[gender] || GENDER_DOT.any }} />
            <span>{GENDER_LABEL[gender] || GENDER_LABEL.any}</span>
          </Stack>
          {isNew && (
            <Box sx={{ px: 2.5, py: 1, borderRadius: 999, backgroundColor: "#16A34A", color: "common.white", fontSize: 11, fontWeight: 700 }}>
              New
            </Box>
          )}
        </Stack>
        {onToggleSave && (
          <Tooltip title={isSaved ? "Remove from saved" : "Save"}>
            <IconButton
              size="small"
              aria-label={isSaved ? "Remove from saved" : "Save listing"}
              aria-pressed={isSaved}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(listing._id);
              }}
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 36,
                height: 36,
                backgroundColor: "rgba(255,255,255,0.94)",
                "&:hover": { backgroundColor: "common.white" },
              }}
            >
              <motion.span
                key={isSaved ? "on" : "off"}
                initial={{ scale: isSaved ? 0.4 : 1 }}
                animate={{ scale: isSaved ? [0.4, 1.35, 1] : 1 }}
                transition={{ duration: 0.4 }}
                style={{ display: "inline-flex" }}
              >
                <Heart size={16} fill={isSaved ? "#E11D48" : "none"} color={isSaved ? "#E11D48" : "#003366"} />
              </motion.span>
            </IconButton>
          </Tooltip>
        )}
        {listing.views > 0 && (
          <Box sx={{ position: "absolute", bottom: 10, left: 12, px: 2, py: 0.75, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.6)", color: "common.white", fontSize: 12, fontWeight: 600 }}>
            {listing.views} views
          </Box>
        )}
      </Box>

      <Stack spacing={2} sx={{ p: { xs: 4, md: 5 }, flex: 1 }}>
        <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" }, fontWeight: 800, color: "primary.main", lineHeight: 1.2 }}>
          {formatBudget(listing.budget)}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }} noWrap>
          {listing.title}
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <MapPin size={14} color="#00A79D" style={{ flexShrink: 0 }} />
          <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
            {[listing.area, listing.city].filter(Boolean).join(", ")}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={3} useFlexGap flexWrap="wrap" sx={{ mt: "auto", pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
          {facts.map((f, i) => {
            const Icon = i === 0 && f.startsWith("Move") ? CalendarDays : f === "Furnished" ? Sofa : Users;
            return (
              <Stack key={f} direction="row" spacing={1} alignItems="center">
                <Icon size={13} color="#4A6A8A" aria-hidden />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {f}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}
