import React from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { Building2, Camera, Castle, Home, LayoutGrid, Sparkles, User, Warehouse } from "lucide-react";

// Each pick is a one-tap filter: `patch` is written to the URL; active when
// every key in it already matches.
const PICKS = [
  { label: "All homes", icon: LayoutGrid, patch: { propertyType: "", postedBy: "", listedWithin: "", withPhotos: "" }, all: true },
  { label: "Apartments", icon: Building2, patch: { propertyType: "apartment" }, rentOnly: true },
  { label: "Villas", icon: Castle, patch: { propertyType: "villa" }, rentOnly: true },
  { label: "Independent", icon: Home, patch: { propertyType: "house" }, rentOnly: true },
  { label: "Townhouses", icon: Warehouse, patch: { propertyType: "townhouse" }, rentOnly: true },
  { label: "New this week", icon: Sparkles, patch: { listedWithin: "7" } },
  { label: "By owner", icon: User, patch: { postedBy: "Owner" } },
  { label: "With photos", icon: Camera, patch: { withPhotos: "1" } },
];

/** Flipkart-style icon strip of the most common refinements. */
export default function QuickPicks({ filters, type, onPick }) {
  const picks = PICKS.filter((p) => !(p.rentOnly && type === "sale"));
  const anyActive = ["propertyType", "postedBy", "listedWithin", "withPhotos"].some((k) => filters[k]);

  return (
    <Stack
      direction="row"
      spacing={{ xs: 2, md: 3 }}
      sx={{
        overflowX: "auto",
        pb: 1,
        mb: { xs: 6, md: 8 },
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {picks.map(({ label, icon: Icon, patch, all }) => {
        const active = all ? !anyActive : Object.entries(patch).every(([k, v]) => filters[k] === v);
        return (
          <ButtonBase
            key={label}
            aria-pressed={active}
            onClick={() => {
              if (all || !active) onPick(patch);
              else onPick(Object.fromEntries(Object.keys(patch).map((k) => [k, ""])));
            }}
            sx={{
              flexShrink: 0,
              flexDirection: "column",
              gap: 2,
              width: { xs: 84, md: 100 },
              py: 3,
              borderRadius: "16px",
              transition: "background-color .2s ease, transform .2s ease",
              "&:hover": { backgroundColor: "background.paper", transform: "translateY(-2px)" },
              "&:hover .pick-icon": { boxShadow: "0 8px 20px rgba(0,51,102,0.18)" },
            }}
          >
            <Box
              className="pick-icon"
              sx={{
                width: { xs: 48, md: 56 },
                height: { xs: 48, md: 56 },
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                color: active ? "common.white" : "primary.main",
                background: active
                  ? "linear-gradient(135deg, #003366 0%, #00A79D 100%)"
                  : "linear-gradient(135deg, rgba(0,51,102,0.08) 0%, rgba(0,167,157,0.12) 100%)",
                border: "2px solid",
                borderColor: active ? "transparent" : "rgba(0,51,102,0.06)",
                transition: "box-shadow .2s ease, background .2s ease",
              }}
            >
              <Icon size={22} aria-hidden />
            </Box>
            <Typography
              sx={{
                fontSize: { xs: 12, md: 13 },
                fontWeight: active ? 700 : 600,
                color: active ? "primary.main" : "text.secondary",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {label}
            </Typography>
          </ButtonBase>
        );
      })}
    </Stack>
  );
}
