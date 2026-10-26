import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Dialog, IconButton, Stack, TextField, Typography } from "@mui/material";
import { PhoneCall, X } from "lucide-react";
import { radii } from "../../theme/theme";

/** Imported listings carry the portal they came from; own listings do not. */
export const isScrapedProperty = (property) => Boolean(property?.sourcePortal);

/**
 * Contact popup for scraped (imported) listings. Their detail pages are not
 * shown; every card opens this instead.
 * Name and mobile come from the signed-in account, so the visitor only taps
 * Submit; they stay editable (and are asked for) if the account lacks them.
 * Posts to the same /api/enquiry contract as the property page, so the lead
 * lands with the admin team exactly like any other enquiry.
 */
export function ScrapedContactDialog({ open, onClose, property, user }) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });

  // Re-fill each time the popup opens, from whoever is signed in right now.
  useEffect(() => {
    if (!open) return;
    setForm({
      name: String(user?.name || user?.fullName || "").trim(),
      phone: String(user?.mobileNumber || "").replace(/\D/g, "").slice(-10),
    });
    setStatus({ state: "idle", message: "" });
  }, [open, user]);

  const phoneValid = /^[6-9]\d{9}$/.test(form.phone);
  const nameValid = form.name.trim().length > 1;
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const title = property?.title || property?.type || "this property";
  const where = [property?.Sector, "Gurgaon"].filter(Boolean).join(", ");

  const submit = async (e) => {
    e.preventDefault();
    if (status.state === "loading") return;
    if (!nameValid || !phoneValid) {
      setStatus({ state: "error", message: "Please add your name and a valid 10-digit mobile number." });
      return;
    }
    setStatus({ state: "loading", message: "" });
    const message = [
      "CALLBACK REQUEST (search results)",
      `Name: ${form.name.trim()}`,
      `Phone: ${form.phone}`,
      `Property: ${title}${where ? ` — ${where}` : ""}`,
    ].join("\n");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(process.env.REACT_APP_CREATE_ENQUIRY_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          propertyId: property._id,
          message,
          brokerage: 1499,
          customerName: form.name.trim(),
          customerMobile: form.phone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not send your request.");
      setStatus({ state: "success", message: "Request sent. Our team will contact you about this property." });
    } catch (err) {
      const network = err instanceof TypeError || /failed to fetch|network/i.test(err?.message || "");
      setStatus({ state: "error", message: network ? "Could not reach the server. Please try again." : err.message || "Something went wrong. Please try again." });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: `${radii.lg}px`, m: 2 } } }}>
      <Box component="form" onSubmit={submit} noValidate sx={{ p: { xs: 5, md: 6 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 4 }}>
          <Stack direction="row" spacing={3} alignItems="center" sx={{ minWidth: 0 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "rgba(0,167,157,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <PhoneCall size={17} color="#00A79D" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h2" variant="h4" sx={{ fontSize: "1.05rem", color: "primary.main" }}>
                Contact about this property
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }} noWrap>
                {title}
                {where ? ` · ${where}` : ""}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} aria-label="Close" sx={{ width: 44, height: 44 }}>
            <X size={18} />
          </IconButton>
        </Stack>

        {status.state === "success" ? (
          <Stack spacing={4}>
            <Alert severity="success" sx={{ borderRadius: `${radii.sm}px` }}>
              {status.message}
            </Alert>
            <Button variant="contained" onClick={onClose} fullWidth sx={{ minHeight: 44 }}>
              Done
            </Button>
          </Stack>
        ) : (
          <Stack spacing={4}>
            <TextField
              label="Your name"
              value={form.name}
              onChange={set("name")}
              required
              fullWidth
              autoComplete="name"
              error={status.state === "error" && !nameValid}
            />
            <TextField
              label="Mobile number"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
              required
              fullWidth
              type="tel"
              autoComplete="tel-national"
              slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 10 } }}
              error={form.phone.length > 0 && !phoneValid}
              helperText={form.phone.length > 0 && !phoneValid ? "Enter a valid 10-digit mobile number" : "We will only use this to contact you about this property."}
            />
            {status.state === "error" && (
              <Alert severity="error" sx={{ borderRadius: `${radii.sm}px` }}>
                {status.message}
              </Alert>
            )}
            <Button type="submit" variant="contained" size="large" fullWidth disabled={status.state === "loading"} sx={{ minHeight: 48 }}>
              {status.state === "loading" ? "Sending…" : "Submit"}
            </Button>
          </Stack>
        )}
      </Box>
    </Dialog>
  );
}

export default ScrapedContactDialog;

/**
 * Shared wiring for screens that list properties:
 *   const { contactScraped, contactDialog } = useScrapedContact({ user, onLogin });
 *   if (isScrapedProperty(p)) return contactScraped(p);   // instead of opening details
 *   ...render {contactDialog}
 * Guests are sent to sign in first (onLogin), then come back to the list.
 */
export function useScrapedContact({ user, onLogin }) {
  const [property, setProperty] = useState(null);
  const contactScraped = (p) => {
    if (!user) return onLogin?.();
    setProperty(p);
  };
  const contactDialog = <ScrapedContactDialog open={Boolean(property)} onClose={() => setProperty(null)} property={property} user={user} />;
  return { contactScraped, contactDialog };
}
