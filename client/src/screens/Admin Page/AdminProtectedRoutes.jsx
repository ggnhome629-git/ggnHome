import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../Context/AuthContext";

/**
 * Gate for every /admin/* route (spec S1). Instead of a silent redirect —
 * which reads as "the page vanished" — a non-admin gets a friendly
 * explanation with the two things they can actually do next.
 */
const AdminProtectedRoute = ({ element }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Box sx={{ py: 8 }}>
        <Skeleton width={220} height={30} />
        <Skeleton width="60%" height={70} sx={{ mt: 3 }} />
        <Skeleton variant="rounded" height={260} sx={{ mt: 4, borderRadius: "12px" }} />
        <Typography variant="caption" sx={{ display: "block", mt: 3, color: "text.secondary" }}>
          Checking access…
        </Typography>
      </Box>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <Stack spacing={3} alignItems="center" sx={{ py: 12, textAlign: "center" }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            backgroundColor: "rgba(0,167,157,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShieldAlert size={28} color="#00A79D" />
        </Box>
        <Typography variant="h2" sx={{ fontSize: "1.35rem", fontWeight: 700, color: "primary.main" }}>
          You need admin access
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
          This console is limited to GgnHome administrators. Sign in with an admin account, or head back to the site.
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={() => navigate("/login")}>
            Sign in
          </Button>
          <Button variant="outlined" onClick={() => navigate("/")} sx={{ borderColor: "divider", color: "text.secondary" }}>
            Go home
          </Button>
        </Stack>
      </Stack>
    );
  }

  return element;
};

export default AdminProtectedRoute;
