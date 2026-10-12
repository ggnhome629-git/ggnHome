import React from "react";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import { ArrowRight, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SectionShell from "../../components/ui/SectionShell";
import { priceLabel, useServiceCatalog } from "../../data/useServiceCatalog";

/**
 * Home services on the user dashboard. Shows only the services an admin has
 * switched on in Admin → Service Catalog; picking one opens the request form
 * with that service pre-selected (sign-in first for guests).
 */
export default function HomeServices({ user }) {
  const navigate = useNavigate();
  const { services, loading } = useServiceCatalog();

  const go = (to) => {
    if (!user) navigate("/login", { state: { from: to } });
    else navigate(to);
  };

  if (!loading && !services.length) return null;

  return (
    <SectionShell
      overline="Home services"
      title="Everything your home needs"
      description="Verified professionals for cleaning, repairs, painting, moving and more — book in a minute and track it here."
      py={{ xs: 10, md: 14 }}
    >
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))" } }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="rounded" height={132} />)
          : services.map((s) => (
              <Box
                key={s.key}
                component="button"
                type="button"
                onClick={() => go(`/servicesCreate?service=${encodeURIComponent(s.key)}`)}
                aria-label={`Book ${s.title}`}
                sx={{
                  appearance: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  p: 3,
                  borderRadius: "16px",
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  minHeight: 132,
                  transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
                  "&:hover": { transform: "translateY(-2px)", borderColor: s.color || "secondary.main", boxShadow: "0 10px 24px rgba(0,51,102,0.10)" },
                  "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: 2 },
                }}
              >
                <Box sx={{ width: 44, height: 44, borderRadius: "12px", display: "grid", placeItems: "center", fontSize: 24, backgroundColor: `${s.color || "#00A79D"}1A` }} aria-hidden>
                  {s.emoji || "🔧"}
                </Box>
                <Typography sx={{ fontWeight: 700, color: "primary.main", fontSize: 15 }}>{s.title}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {s.description}
                </Typography>
                <Typography variant="caption" sx={{ mt: "auto", fontWeight: 700, color: s.color || "secondary.main", display: "flex", alignItems: "center", gap: 0.5 }}>
                  {priceLabel(s)} <ArrowRight size={13} />
                </Typography>
              </Box>
            ))}
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 4 }}>
        <Button variant="contained" color="secondary" onClick={() => go("/servicesCreate")} endIcon={<ArrowRight size={16} />}>
          Book a service
        </Button>
        <Button variant="outlined" onClick={() => go("/services")} startIcon={<ClipboardList size={16} />}>
          Track my service requests
        </Button>
      </Stack>
    </SectionShell>
  );
}
