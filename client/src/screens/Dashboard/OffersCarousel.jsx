import React, { useEffect, useMemo } from "react";
import { Box, Container, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PromoCard from "../../components/promo/PromoCard";
import usePromos, { rememberDashboardPromos } from "../../components/promo/usePromos";
import { openLink } from "../../components/promo/openLink";

const MAX_ON_DASHBOARD = 3;

/**
 * "Offers for you": up to three admin promos, picked at random on each visit.
 * Side by side on larger screens, a swipeable row on phones. Hidden entirely
 * until the admin has created at least one promo.
 */
export default function OffersCarousel() {
  const navigate = useNavigate();
  const { promos } = usePromos("dashboard");
  const shown = useMemo(() => promos.slice(0, MAX_ON_DASHBOARD), [promos]);

  // The search page uses this to show different promos from the dashboard.
  useEffect(() => {
    if (shown.length) rememberDashboardPromos(shown.map((p) => p._id));
  }, [shown]);

  if (!shown.length) return null;

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 10, md: 14 } }}>
      <Typography variant="overline" sx={{ color: "secondary.main", display: "block", mb: 1 }}>
        Offers for you
      </Typography>
      <Typography variant="h2" sx={{ color: "primary.main", mb: { xs: 5, md: 7 } }}>
        Deals & perks this week
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: "20px",
          gridAutoFlow: { xs: "column", sm: "row" },
          gridAutoColumns: { xs: "86%", sm: "auto" },
          gridTemplateColumns: {
            sm: `repeat(${Math.min(shown.length, 2)}, minmax(0, 1fr))`,
            lg: `repeat(${shown.length}, minmax(0, 1fr))`,
          },
          overflowX: { xs: "auto", sm: "visible" },
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          "& > *": { scrollSnapAlign: "start" },
        }}
      >
        {shown.map((promo) => (
          <PromoCard key={promo._id} promo={promo} minHeight={260} onClick={() => openLink(navigate, promo.link)} />
        ))}
      </Box>
    </Container>
  );
}
