import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CheckCircle, Inbox, Mail, RotateCcw, Send, Sparkles } from "lucide-react";
import { EmptyState, PageHeader } from "./shell/adminUi";
import "./admin.css";

/** Shared card chrome from the admin design tokens, applied via sx (never inline style objects). */
const CARD = {
  borderRadius: "12px",
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 2px 8px rgba(0,51,102,0.05)",
};

export default function AdminRewardsSection() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    "Congratulations! You have unlocked a special reward from GGNHome. Our team appreciates your engagement and support!"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [distributedList, setDistributedList] = useState([]);

  // Snackbar is presentation-only: it mirrors the result of the last
  // distribute attempt and stays visible until it times out or is dismissed,
  // so the outcome is never lost while the form clears itself.
  const [snack, setSnack] = useState(null);

  const adminId = (() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      return user?._id || null;
    } catch (e) {
      return null;
    }
  })();

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [email, message]);

  useEffect(() => {
    if (error) setSnack({ severity: "error", message: error });
    else if (success) setSnack({ severity: "success", message: success });
  }, [error, success]);

  const validate = () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleDistribute = async () => {
    setError(null);
    setSuccess(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        message: message ? message.trim() : undefined,
        adminId: adminId || undefined,
      };

      const accessToken = localStorage.getItem("accessToken");

      const res = await fetch(process.env.REACT_APP_ADMIN_DISTRIBUTE_REWARD_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data?.success) {
        setSuccess(data.message || "Reward distributed");
        const entry = data.reward || { email: payload.email, message: payload.message, distributedAt: new Date().toISOString() };
        setDistributedList((prev) => [entry, ...prev]);
        setEmail("");
        setMessage("");
      } else {
        setError(data?.message || "Unexpected response from server");
      }
    } catch (err) {
      console.error("Distribute error", err);
      const serverMsg = err.message || "Server error";
      setError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmail("");
    setMessage("");
    setError(null);
    setSuccess(null);
  };

  const closeSnack = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack(null);
  };

  return (
    <>
      <PageHeader title="Rewards Dashboard" description="Distribute rewards to your valued users" />

      <Grid container spacing={3}>
        {/* Distribute form */}
        <Grid item xs={12} lg={7}>
          <Card sx={CARD}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    background: "linear-gradient(135deg, #00A79D 0%, #22D3EE 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={22} color="#FFFFFF" />
                </Box>
                <Typography variant="h2" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
                  Distribute New Reward
                </Typography>
              </Stack>

              <Stack spacing={3}>
                <TextField
                  fullWidth
                  type="email"
                  label="Recipient Email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Mail size={18} color="#00A79D" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  label="Reward Message (optional)"
                  placeholder="Add a personalized message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                  helperText={`${message.length} characters`}
                  inputProps={{ maxLength: 500 }}
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Send size={16} />}
                    onClick={handleDistribute}
                    disabled={loading}
                    sx={{
                      minHeight: 44,
                      fontWeight: 700,
                      background: "linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)",
                      "&:hover": { background: "linear-gradient(90deg, #008f85 0%, #1CBBD4 100%)" },
                    }}
                  >
                    {loading ? "Distributing…" : "Distribute Reward"}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<RotateCcw size={16} />}
                    onClick={handleReset}
                    disabled={loading}
                    sx={{ minHeight: 44, fontWeight: 700, borderColor: "divider", color: "primary.main" }}
                  >
                    Reset
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Recently distributed (memory-only list, kept from the original page) */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ ...CARD, height: "100%" }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    background: "linear-gradient(135deg, #003366 0%, #00A79D 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle size={22} color="#FFFFFF" />
                </Box>
                <Typography variant="h2" sx={{ fontWeight: 700, fontSize: "1.1rem", flex: 1 }}>
                  Recently Distributed
                </Typography>
                <Chip
                  label={distributedList.length}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    borderRadius: "999px",
                    background: "linear-gradient(90deg, #00A79D 0%, #22D3EE 100%)",
                    color: "#FFFFFF",
                  }}
                />
              </Stack>

              {loading && <Skeleton variant="rounded" height={92} sx={{ borderRadius: "12px", mb: 2 }} />}

              {distributedList.length === 0 && !loading ? (
                <EmptyState
                  icon={Inbox}
                  title="No rewards distributed yet"
                  description="Rewards you send from this page are listed here for the rest of this session."
                />
              ) : (
                distributedList.map((r, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                      p: 3,
                      mb: 2,
                      borderRadius: "12px",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "#F4F7F9",
                      transition: "border-color .15s ease, box-shadow .15s ease",
                      "&:hover": { borderColor: "#00A79D", boxShadow: "0 8px 24px rgba(0,167,157,0.15)" },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Mail size={14} color="#00A79D" />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.email || r.userId || (r.user && r.user.email)}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                        {r.message || "No message"}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 600,
                        bgcolor: "background.paper",
                        px: 1.5,
                        py: 1,
                        borderRadius: "8px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {r.distributedAt ? new Date(r.distributedAt).toLocaleString() : "Just now"}
                    </Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Result snackbar: success auto-hides, errors stay until dismissed */}
      <Snackbar open={Boolean(snack)} autoHideDuration={snack?.severity === "error" ? null : 6000} onClose={closeSnack} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack?.severity || "success"} variant="filled" onClose={closeSnack} sx={{ width: "100%" }}>
          {snack?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
