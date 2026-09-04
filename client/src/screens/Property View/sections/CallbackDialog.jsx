import React, { useState } from "react";
import { Alert, Box, Button, Dialog, IconButton, Stack, TextField, Typography } from "@mui/material";
import { PhoneCall, X } from "lucide-react";
import { radii } from "../../../theme/theme";

/**
 * Two fields. That's the whole point — a callback request should cost the
 * visitor five seconds, not a full contact profile. Anything more detailed
 * belongs in the enquiry section further down the page.
 */
export default function CallbackDialog({ open, onClose, property, onEvent }) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const phoneValid = /^[0-9]{10}$/.test(form.phone.replace(/\D/g, ""));
  const isValid = form.name.trim().length > 1 && phoneValid;

  const submit = async (e) => {
    e.preventDefault();
    if (!isValid) {
      setStatus({ state: "error", message: "Please add your name and a valid 10-digit mobile number." });
      return;
    }
    if (status.state === "loading") return;
    setStatus({ state: "loading", message: "" });

    const message = [
      "CALLBACK REQUEST",
      `Name: ${form.name}`,
      `Phone: ${form.phone}`,
      `Property: ${property.title}${property.sector ? ` — ${property.sector}` : ""}`,
    ].join("\n");

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(process.env.REACT_APP_CREATE_ENQUIRY_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ propertyId: property.id, message, brokerage: 1499 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not send your request.");

      setStatus({ state: "success", message: "Done — we'll call you back shortly." });
      onEvent?.("enquiry_submitted");
    } catch (err) {
      setStatus({ state: "error", message: err.message || "Something went wrong. Please try again." });
    }
  };

  const close = () => {
    onClose();
    // Reset a moment later so the dialog doesn't visibly flip back mid-close.
    setTimeout(() => {
      setForm({ name: "", phone: "" });
      setStatus({ state: "idle", message: "" });
    }, 250);
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: `${radii.lg}px` } } }}>
      <Box component="form" onSubmit={submit} sx={{ p: { xs: 5, md: 6 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 4 }}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                backgroundColor: "rgba(0,167,157,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PhoneCall size={17} color="#00A79D" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontSize: "1.05rem", color: "primary.main" }}>
                Request a callback
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Our team will call you about this property.
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={close} size="small" aria-label="Close">
            <X size={18} />
          </IconButton>
        </Stack>

        {status.state === "success" ? (
          <Stack spacing={4}>
            <Alert severity="success" sx={{ borderRadius: `${radii.sm}px` }}>
              {status.message}
            </Alert>
            <Button variant="contained" onClick={close} fullWidth>
              Done
            </Button>
          </Stack>
        ) : (
          <Stack spacing={4}>
            <TextField label="Your name" size="small" required value={form.name} onChange={set("name")} autoFocus fullWidth />
            <TextField
              label="Mobile number"
              size="small"
              required
              value={form.phone}
              onChange={set("phone")}
              error={form.phone.length > 0 && !phoneValid}
              helperText={form.phone.length > 0 && !phoneValid ? "Enter a 10-digit mobile number" : ""}
              fullWidth
            />

            {status.state === "error" && (
              <Alert severity="error" sx={{ borderRadius: `${radii.sm}px` }}>
                {status.message}
              </Alert>
            )}

            <Button type="submit" variant="contained" size="large" fullWidth>
              {status.state === "loading" ? "Sending…" : "Request callback"}
            </Button>
          </Stack>
        )}
      </Box>
    </Dialog>
  );
}
