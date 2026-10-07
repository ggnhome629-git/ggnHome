import React, { useState } from "react";
import { Alert, Box, Button, Dialog, IconButton, Stack, TextField, Typography } from "@mui/material";
import { CalendarCheck, CheckCircle2, Clock, X } from "lucide-react";
import { radii } from "../../../theme/theme";
import { primaryCtaSx } from "./ctaStyles";

const TIME_SLOTS = ["10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM", "06:00 PM"];

const today = () => new Date().toISOString().split("T")[0];

/**
 * Site-visit booking (section 11 of the upgrade guide): date picker, a grid
 * of time-slot buttons instead of a dropdown, an optional message and an
 * animated confirmation. There is no dedicated visit endpoint on the backend
 * yet, so the request goes through the existing enquiry API with the chosen
 * slot composed into the message — a real request the team receives, rather
 * than a form that goes nowhere.
 */
export default function ScheduleVisitDialog({ open, onClose, property, onEvent, onToast }) {
  const [form, setForm] = useState({ name: "", phone: "", date: "", time: TIME_SLOTS[0], message: "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const phoneValid = /^[0-9]{10}$/.test(form.phone.replace(/\D/g, ""));
  const isValid = form.name.trim().length > 1 && phoneValid && Boolean(form.date);

  const submit = async (e) => {
    e.preventDefault();
    if (!isValid) {
      setStatus({ state: "error", message: "Please add your name, a valid 10-digit number and a preferred date." });
      return;
    }
    if (status.state === "loading") return;
    setStatus({ state: "loading", message: "" });

    const message = [
      "SITE VISIT REQUEST",
      `Name: ${form.name}`,
      `Phone: ${form.phone}`,
      `Preferred date: ${form.date}`,
      `Preferred time: ${form.time}`,
      form.message && `Message: ${form.message}`,
      `Property: ${property.title}${property.sector ? ` — ${property.sector}` : ""}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(process.env.REACT_APP_CREATE_ENQUIRY_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ propertyId: property.id, message, brokerage: 1499 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not schedule your visit.");

      setStatus({ state: "success", message: "Visit Scheduled!" });
      onToast?.({ severity: "success", message: `Visit requested for ${form.date} at ${form.time}.` });
      onEvent?.("schedule_visit_completed");
    } catch (err) {
      const networkError = err instanceof TypeError || /failed to fetch|network/i.test(err?.message || "");
      const message = networkError ? "Failed to schedule your visit. Please try again." : err.message || "Something went wrong. Please try again.";
      setStatus({ state: "error", message });
      onToast?.({ severity: "error", message });
    }
  };

  const prettyDate = form.date
    ? new Date(`${form.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: `${radii.lg}px`, maxWidth: 500 } } }}>
      <Stack component="form" onSubmit={submit} spacing={4} sx={{ p: { xs: 5, md: 6 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={3} alignItems="center">
            <CalendarCheck size={20} color="#00A79D" />
            <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "primary.main" }}>
              Schedule a site visit
            </Typography>
          </Stack>
          <IconButton onClick={onClose} size="small" aria-label="Close">
            <X size={18} />
          </IconButton>
        </Stack>

        {status.state === "success" ? (
          <Stack spacing={4} alignItems="flex-start">
            <Stack direction="row" spacing={3} alignItems="center">
              <SuccessGlyph />
              <Box>
                <Typography variant="h4" sx={{ fontSize: "1.1rem", color: "primary.main" }}>
                  Visit Scheduled!
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
              Your site visit has been scheduled for {prettyDate} at {form.time}. The owner will confirm your visit shortly.
            </Typography>
            <Button variant="contained" onClick={onClose} fullWidth>
              Done
            </Button>
          </Stack>
        ) : (
          <>
            <TextField label="Full name" size="small" required value={form.name} onChange={set("name")} fullWidth />
            <TextField
              label="Mobile number"
              size="small"
              required
              value={form.phone}
              onChange={set("phone")}
              error={form.phone.length > 0 && !phoneValid}
              helperText={form.phone.length > 0 && !phoneValid ? "Enter a 10-digit mobile number" : " "}
              fullWidth
            />

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", mb: 2 }}>
                Select your preferred date
              </Typography>
              <TextField
                label="Preferred date"
                size="small"
                type="date"
                required
                value={form.date}
                onChange={set("date")}
                inputProps={{ min: today() }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", mb: 2 }}>
                Select time slot
              </Typography>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))" }}>
                {TIME_SLOTS.map((slot) => {
                  const selected = form.time === slot;
                  return (
                    <Button
                      key={slot}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, time: slot }))}
                      startIcon={<Clock size={13} />}
                      sx={{
                        flexDirection: "column",
                        gap: 0.5,
                        py: 2,
                        px: 1,
                        borderRadius: "8px",
                        border: "1px solid",
                        borderColor: selected ? "#00A79D" : "divider",
                        backgroundColor: selected ? "#00A79D" : "background.paper",
                        color: selected ? "#FFFFFF" : "text.secondary",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        "&:hover": { backgroundColor: selected ? "#00857D" : "rgba(0,167,157,0.08)", borderColor: "#00A79D" },
                      }}
                    >
                      {slot}
                    </Button>
                  );
                })}
              </Box>
            </Box>

            <TextField
              label="Add a message (optional)"
              size="small"
              multiline
              rows={3}
              placeholder="Let the owner know about preferred amenities"
              value={form.message}
              onChange={set("message")}
              fullWidth
              sx={{ "& .MuiInputBase-root": { maxHeight: 120 } }}
            />

            {status.state === "error" && (
              <Alert severity="error" sx={{ borderRadius: `${radii.sm}px` }}>
                {status.message}
              </Alert>
            )}

            <Stack direction="row" spacing={3}>
              <Button type="button" variant="outlined" onClick={onClose} sx={{ flex: 1, borderColor: "divider", color: "text.secondary", "&:hover": { borderColor: "divider", backgroundColor: "background.default" } }}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" size="large" sx={{ ...primaryCtaSx, flex: 2 }}>
                {status.state === "loading" ? "Requesting…" : "Schedule visit"}
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Dialog>
  );
}

/** The springy checkmark from the guide's success state. */
function SuccessGlyph() {
  return (
    <Box
      sx={{
        "@keyframes visitCheck": {
          "0%": { transform: "scale(0)", opacity: 0 },
          "70%": { transform: "scale(1.15)", opacity: 1 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        width: 48,
        height: 48,
        flexShrink: 0,
        borderRadius: "50%",
        backgroundColor: "rgba(16,185,129,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "visitCheck .45s ease-out both",
      }}
    >
      <CheckCircle2 size={26} color="#10B981" />
    </Box>
  );
}
