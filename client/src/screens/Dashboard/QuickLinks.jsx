import React from "react";
import { Box, ButtonBase, Container, Stack, Typography } from "@mui/material";
import { Building2, Castle, Heart, IndianRupee, KeyRound, PlusSquare, Sparkles, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LINKS = [
  { label: "Flats for rent", icon: KeyRound, to: "/search?type=rent&propertyType=apartment" },
  { label: "Under ₹25K", icon: IndianRupee, to: "/search?type=rent&maxPrice=25000" },
  { label: "2 BHK homes", icon: Building2, to: "/search?bhk=2+BHK" },
  { label: "Villas", icon: Castle, to: "/search?type=rent&propertyType=villa" },
  { label: "New this week", icon: Sparkles, to: "/search?listedWithin=7&sort=newest" },
  { label: "By owner", icon: User, to: "/search?postedBy=Owner" },
  { label: "Saved homes", icon: Heart, to: "/savedproperties" },
  { label: "Post property", icon: PlusSquare, to: "/add-property" },
];

/** Flipkart-style one-tap shortcuts straight into the most common searches. */
export default function QuickLinks() {
  const navigate = useNavigate();
  return (
    <Box sx={{ backgroundColor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 6, md: 8 } }}>
        <Stack
          component="nav"
          aria-label="Quick links"
          direction="row"
          justifyContent={{ lg: "space-between" }}
          spacing={{ xs: 1, md: 2 }}
          sx={{ overflowX: "auto", py: { xs: 4, md: 5 }, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
        >
          {LINKS.map(({ label, icon: Icon, to }) => (
            <ButtonBase
              key={label}
              onClick={() => navigate(to)}
              sx={{
                flexShrink: 0,
                flexDirection: "column",
                gap: 2,
                width: { xs: 80, md: 108 },
                py: 2,
                borderRadius: "16px",
                transition: "transform .2s ease",
                "&:hover": { transform: "translateY(-3px)" },
                "&:hover .ql-icon": {
                  color: "common.white",
                  background: "linear-gradient(135deg, #003366 0%, #00A79D 100%)",
                  boxShadow: "0 10px 22px rgba(0,51,102,0.22)",
                },
              }}
            >
              <Box
                className="ql-icon"
                sx={{
                  width: { xs: 50, md: 58 },
                  height: { xs: 50, md: 58 },
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "primary.main",
                  background: "linear-gradient(135deg, rgba(0,51,102,0.07) 0%, rgba(0,167,157,0.14) 100%)",
                  transition: "background .2s ease, color .2s ease, box-shadow .2s ease",
                }}
              >
                <Icon size={22} aria-hidden />
              </Box>
              <Typography sx={{ fontSize: { xs: 12, md: 13 }, fontWeight: 600, color: "text.primary", textAlign: "center", lineHeight: 1.25 }}>
                {label}
              </Typography>
            </ButtonBase>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
