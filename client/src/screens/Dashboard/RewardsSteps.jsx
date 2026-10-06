import React from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { ArrowRight, Gift, Handshake, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StaggerContainer, StaggerItem } from "../../components/motion";
import { radii } from "../../theme/theme";

const STEPS = [
  {
    icon: UserPlus,
    title: "Register with us",
    text: "Sign up free with your mobile number in under a minute.",
  },
  {
    icon: Handshake,
    title: "Deal with us",
    text: "Find your home on ggnHome and close the rent or purchase with us.",
  },
  {
    icon: Gift,
    title: "Get rewarded",
    text: "Receive gifts and goodies worth up to ₹1,000 once the deal is done.",
  },
];

/** Explains the ₹1,000 gift offer in three steps so the promise is concrete. */
export default function RewardsSteps({ user }) {
  const navigate = useNavigate();

  return (
    <Box
      component="section"
      aria-labelledby="rewards-steps-title"
      sx={{
        position: "relative",
        overflow: "hidden",
        py: { xs: 12, md: 18 },
        background: "linear-gradient(160deg, #001F3F 0%, #003366 60%, #0B4A6F 100%)",
        color: "common.white",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(40% 60% at 85% 10%, rgba(246,196,83,0.18) 0%, rgba(246,196,83,0) 70%)",
        }}
      />
      <Container maxWidth="lg" sx={{ position: "relative", px: { xs: 4, sm: 6, md: 8 } }}>
        <Stack spacing={3} alignItems="center" sx={{ textAlign: "center", mb: { xs: 10, md: 14 } }}>
          <Typography variant="overline" sx={{ color: "#F6D58A", letterSpacing: "0.2em" }}>
            ggnHome Rewards
          </Typography>
          <Typography
            id="rewards-steps-title"
            variant="h2"
            sx={{
              fontFamily: '"Playfair Display", Georgia, serif',
              color: "common.white",
              fontSize: { xs: "2rem", md: "2.75rem" },
            }}
          >
            Earn gifts worth up to{" "}
            <Box component="span" sx={{ color: "#F6C453", fontStyle: "italic" }}>
              ₹1,000
            </Box>
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.78)", maxWidth: 520 }}>
            Three simple steps. No coupons, no catches — just a thank-you for
            finding your home with us.
          </Typography>
        </Stack>

        <StaggerContainer
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          }}
        >
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <StaggerItem key={title}>
              <Box
                sx={{
                  height: "100%",
                  p: { xs: 6, md: 8 },
                  borderRadius: `${radii.lg}px`,
                  border: "1px solid rgba(255,255,255,0.14)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 4 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "14px",
                      display: "grid",
                      placeItems: "center",
                      color: "#3B2A00",
                      background: "linear-gradient(135deg, #FFE08A 0%, #F0B429 100%)",
                    }}
                  >
                    <Icon size={22} aria-hidden />
                  </Box>
                  <Typography sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 13 }}>
                    STEP {i + 1}
                  </Typography>
                </Stack>
                <Typography variant="h4" sx={{ color: "common.white", mb: 2 }}>
                  {title}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.74)" }}>
                  {text}
                </Typography>
              </Box>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={3}
          justifyContent="center"
          sx={{ mt: { xs: 10, md: 12 } }}
        >
          <Button
            size="large"
            endIcon={<ArrowRight size={18} />}
            onClick={() => navigate(user ? "/rewards" : "/login")}
            sx={{
              px: 8,
              py: 3,
              color: "#3B2A00",
              fontWeight: 700,
              background: "linear-gradient(90deg, #FFE08A 0%, #F0B429 100%)",
              "&:hover": { background: "linear-gradient(90deg, #FFE7A8 0%, #F6C453 100%)" },
            }}
          >
            {user ? "View my rewards" : "Register & start earning"}
          </Button>
        </Stack>
        <Typography
          variant="caption"
          sx={{ display: "block", textAlign: "center", mt: 4, color: "rgba(255,255,255,0.5)" }}
        >
          Terms apply. Reward is given on successful deal closure.
        </Typography>
      </Container>
    </Box>
  );
}
