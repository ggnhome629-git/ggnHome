import React, { useState } from "react";
import { Alert, Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { CheckCircle2, MessageCircle, Phone } from "lucide-react";
import { radii, elevationShadows } from "../../../theme/theme";
import { whatsappUrl } from "../../../utils/propertyModel";

const CONTACT_METHODS = ["Phone", "WhatsApp", "Email"];

const REASSURANCE = [
  "No brokerage charged upfront",
  "Verified listing, real photos",
  "Response typically within a few hours",
];

/**
 * The page's detailed enquiry, placed low on the page where a visitor has
 * already seen the property and is choosing to reach out. Laid out as a
 * two-column block — context on the left, fields on the right — so it reads
 * as a considered section rather than a column of grey inputs.
 *
 * Submits through the existing enquiry API (`/api/enquiry`), which accepts
 * `{ propertyId, message, brokerage }`; the visitor's details are composed
 * into that message so nothing is lost against the current contract.
 */
export default function EnquiryCard({ property, onEvent }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", method: "Phone", message: "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [touched, setTouched] = useState(false);

  const set = (key) => (e) => {
    if (!touched) {
      setTouched(true);
      onEvent?.("enquiry_started");
    }
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const phoneValid = /^[0-9]{10}$/.test(form.phone.replace(/\D/g, ""));
  const isValid = form.name.trim().length > 1 && phoneValid;

  const submit = async (e) => {
    e.preventDefault();
    // The button stays active and explains what's missing — a greyed-out
    // primary CTA reads as broken and kills conversion.
    if (!isValid) {
      setTouched(true);
      setStatus({ state: "error", message: "Please add your name and a valid 10-digit mobile number." });
      return;
    }
    if (status.state === "loading") return;
    setStatus({ state: "loading", message: "" });

    const composed = [
      `Name: ${form.name}`,
      `Phone: ${form.phone}`,
      form.email && `Email: ${form.email}`,
      `Preferred contact: ${form.method}`,
      form.message && `Message: ${form.message}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(process.env.REACT_APP_CREATE_ENQUIRY_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ propertyId: property.id, message: composed, brokerage: 1499 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not send your enquiry.");

      setStatus({ state: "success", message: "Enquiry sent. Our team will get in touch shortly." });
      setForm({ name: "", phone: "", email: "", method: "Phone", message: "" });
      onEvent?.("enquiry_submitted");
    } catch (err) {
      setStatus({ state: "error", message: err.message || "Something went wrong. Please try again." });
    }
  };

  return (
    <Box
      id="enquiry"
      component="section"
      sx={{
        borderRadius: `${radii.lg}px`,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: elevationShadows[1],
        backgroundColor: "background.paper",
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }}>
        {/* Context panel */}
        <Stack
          spacing={5}
          justifyContent="center"
          sx={{
            width: { xs: "100%", md: 320 },
            flexShrink: 0,
            p: { xs: 6, md: 7 },
            backgroundColor: "primary.main",
            color: "common.white",
          }}
        >
          <Box>
            <Typography variant="h2" sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" }, color: "common.white", mb: 2 }}>
              Interested in this property?
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
              Send an enquiry and we'll share availability, exact pricing and visit slots.
            </Typography>
          </Box>

          <Stack spacing={3}>
            {REASSURANCE.map((point) => (
              <Stack key={point} direction="row" spacing={2} alignItems="flex-start">
                <CheckCircle2 size={15} color="#3FC2B8" style={{ flexShrink: 0, marginTop: 2 }} />
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
                  {point}
                </Typography>
              </Stack>
            ))}
          </Stack>

          {property.contactNumber && (
            <Stack direction="row" spacing={2}>
              <Button
                size="small"
                startIcon={<Phone size={14} />}
                href={`tel:${property.contactNumber}`}
                onClick={() => onEvent?.("call_clicked")}
                sx={{ color: "common.white", border: "1px solid rgba(255,255,255,0.3)", flex: 1 }}
              >
                Call
              </Button>
              <Button
                size="small"
                startIcon={<MessageCircle size={14} />}
                href={whatsappUrl(property, property.contactNumber)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onEvent?.("whatsapp_clicked")}
                sx={{ backgroundColor: "#25D366", color: "common.white", flex: 1, "&:hover": { backgroundColor: "#1fb959" } }}
              >
                WhatsApp
              </Button>
            </Stack>
          )}
        </Stack>

        {/* Form */}
        <Box component="form" onSubmit={submit} sx={{ flex: 1, p: { xs: 6, md: 7 } }}>
          {status.state === "success" ? (
            <Stack spacing={4} alignItems="flex-start">
              <Alert severity="success" sx={{ borderRadius: `${radii.sm}px`, width: "100%" }}>
                {status.message}
              </Alert>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Meanwhile, you can keep browsing similar homes below.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={4}>
              <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                <TextField label="Full name" size="small" required value={form.name} onChange={set("name")} />
                <TextField
                  label="Mobile number"
                  size="small"
                  required
                  value={form.phone}
                  onChange={set("phone")}
                  error={form.phone.length > 0 && !phoneValid}
                  helperText={form.phone.length > 0 && !phoneValid ? "Enter a 10-digit mobile number" : ""}
                />
              </Box>

              <TextField label="Email (optional)" size="small" type="email" value={form.email} onChange={set("email")} fullWidth />

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                  Preferred contact method
                </Typography>
                <Stack direction="row" spacing={2}>
                  {CONTACT_METHODS.map((method) => (
                    <Chip
                      key={method}
                      label={method}
                      onClick={() => setForm((prev) => ({ ...prev, method }))}
                      sx={{
                        fontWeight: 600,
                        backgroundColor: form.method === method ? "primary.main" : "background.default",
                        color: form.method === method ? "common.white" : "text.secondary",
                        "&:hover": { backgroundColor: form.method === method ? "primary.dark" : "divider" },
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <TextField
                label="Message (optional)"
                size="small"
                multiline
                rows={3}
                placeholder="e.g. Is it available from next month? Can I visit this weekend?"
                value={form.message}
                onChange={set("message")}
                fullWidth
              />

              {status.state === "error" && (
                <Alert severity="error" sx={{ borderRadius: `${radii.sm}px` }}>
                  {status.message}
                </Alert>
              )}

              <Stack direction="row" spacing={3} alignItems="center">
                <Button type="submit" variant="contained" size="large" sx={{ px: 8 }}>
                  {status.state === "loading" ? "Sending…" : "Send enquiry"}
                </Button>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  We never share your number publicly.
                </Typography>
              </Stack>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
