import React, { useState } from "react";
import { Alert, Button, Dialog, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { CalendarCheck, X } from "lucide-react";
import { radii } from "../../../theme/theme";

const TIME_SLOTS = [
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
  "6:00 PM - 8:00 PM",
];

const today = () => new Date().toISOString().split("T")[0];

/**
 * Site-visit booking. There is no dedicated visit endpoint on the backend
 * yet, so the request is submitted through the existing enquiry API with the
 * chosen slot composed into the message — a real request the team receives,
 * rather than a form that goes nowhere.
 */
export default function ScheduleVisitDialog({ open, onClose, property, onEvent }) {
  const [form, setForm] = useState({ name: "", phone: "", date: "", time: TIME_SLOTS[0], visitors: 1 });
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
      `Visitors: ${form.visitors}`,
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
      if (!res.ok) throw new Error(data.message || "Could not schedule your visit.");

      setStatus({ state: "success", message: "Visit requested. Our team will confirm your slot shortly." });
      onEvent?.("schedule_visit_completed");
    } catch (err) {
      setStatus({ state: "error", message: err.message || "Something went wrong. Please try again." });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: `${radii.lg}px` } } }}>
      <Stack component="form" onSubmit={submit} spacing={5} sx={{ p: { xs: 5, md: 7 } }}>
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
          <>
            <Alert severity="success" sx={{ borderRadius: `${radii.sm}px` }}>
              {status.message}
            </Alert>
            <Button variant="contained" onClick={onClose}>
              Done
            </Button>
          </>
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
            <TextField label="Preferred time" size="small" select value={form.time} onChange={set("time")} fullWidth>
              {TIME_SLOTS.map((slot) => (
                <MenuItem key={slot} value={slot}>
                  {slot}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Number of visitors"
              size="small"
              type="number"
              value={form.visitors}
              onChange={set("visitors")}
              inputProps={{ min: 1, max: 10 }}
              fullWidth
            />

            {status.state === "error" && (
              <Alert severity="error" sx={{ borderRadius: `${radii.sm}px` }}>
                {status.message}
              </Alert>
            )}

            <Button type="submit" variant="contained" size="large">
              {status.state === "loading" ? "Requesting…" : "Confirm site visit"}
            </Button>
          </>
        )}
      </Stack>
    </Dialog>
  );
}
