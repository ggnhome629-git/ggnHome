import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Award, Building2, Check, Shield, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { radii, elevationShadows } from "../../theme/theme";

const TRUST_POINTS = [
  "100% verified listings",
  "Zero brokerage fees",
  "Expert consultation",
  "Legal assistance",
];

function SidebarCard({ icon: Icon, iconColor, title, description, action, sx }) {
  return (
    <Box
      sx={{
        p: 6,
        mb: 5,
        borderRadius: `${radii.md}px`,
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: elevationShadows[1],
        textAlign: "center",
        ...sx,
      }}
    >
      <Icon size={36} color={iconColor} style={{ margin: "0 auto 12px" }} />
      <Typography variant="h4" sx={{ color: "primary.main", mb: 2, fontSize: "1rem" }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 5 }}>
        {description}
      </Typography>
      {action}
    </Box>
  );
}

/** Desktop-only rail beside search results. */
export default function SearchSidebar({ user }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ position: "sticky", top: 96 }}>
      <SidebarCard
        icon={Building2}
        iconColor="#003366"
        title="List your property"
        description="Connect with thousands of verified buyers and renters instantly."
        action={
          <Button
            fullWidth
            variant="contained"
            onClick={() => navigate(user ? "/add-property" : "/login")}
          >
            Post property free
          </Button>
        }
      />

      <SidebarCard
        icon={Sparkles}
        iconColor="#00A79D"
        title="Home services"
        description="Book AC repair, home cleaning, plumbing & more trusted services."
        action={
          <Button fullWidth variant="contained" color="secondary" onClick={() => navigate("/servicesCreate")}>
            Book a service
          </Button>
        }
      />

      <Box
        sx={{
          p: 6,
          mb: 5,
          borderRadius: `${radii.md}px`,
          backgroundColor: "background.default",
          border: "2px solid",
          borderColor: "primary.main",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <Shield size={22} color="#003366" />
          <Typography variant="h4" sx={{ color: "primary.main", fontSize: "0.95rem" }}>
            Why choose us?
          </Typography>
        </Stack>
        <Stack spacing={3}>
          {TRUST_POINTS.map((point) => (
            <Stack key={point} direction="row" spacing={2} alignItems="center">
              <Check size={14} color="#00A79D" strokeWidth={3} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {point}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <SidebarCard
        icon={Award}
        iconColor="#00A79D"
        title="Need assistance?"
        description="Our property experts are here to help you."
        sx={{ backgroundColor: "rgba(0,167,157,0.06)", borderColor: "secondary.main", mb: 0 }}
        action={
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            onClick={() => navigate(user ? "/support" : "/login")}
          >
            Contact us now
          </Button>
        }
      />
    </Box>
  );
}
