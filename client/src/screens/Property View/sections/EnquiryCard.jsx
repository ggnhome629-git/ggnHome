import React, { useState } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, Radio, RadioGroup, Stack, TextField, Typography } from "@mui/material";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, CircleCheck, MessageCircle, Phone } from "lucide-react";
import { radii, elevationShadows } from "../../../theme/theme";
import { whatsappUrl } from "../../../utils/propertyModel";

const INTEREST_LEVELS = ["Just browsing", "Seriously interested", "Ready to buy/rent"];
const CONTACT_METHODS = [
  { value: "Call", label: "Call me" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Email", label: "Email" },
  { value: "SMS", label: "SMS" },
];

const STEPS = ["Interest", "Contact method", "Your details"];

const REASSURANCE = [
  "No brokerage charged upfront",
  "Verified listing, real photos",
  "Response typically within a few hours",
];

/** Success state: checkmark springs in, then the confirmation copy. */
function SuccessPanel({ message }) {
  return (
    <Stack spacing={4} alignItems="flex-start">
      <Box
        sx={{
          "@keyframes checkPop": {
            "0%": { transform: "scale(0)", opacity: 0 },
            "70%": { transform: "scale(1.15)", opacity: 1 },
            "100%": { transform: "scale(1)", opacity: 1 },
          },
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: "rgba(16,185,129,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "checkPop .45s ease-out both",
        }}
      >
        <CheckCircle2 size={30} color="#10B981" />
      </Box>
      <Box>
        <Typography variant="h4" sx={{ fontSize: "1.05rem", color: "primary.main", mb: 1 }}>
          {message}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Meanwhile, you can keep browsing similar homes below.
        </Typography>
      </Box>
    </Stack>
  );
}

/**
 * Section 10 of the upgrade guide — the page's detailed enquiry, now a
 * three-step flow (interest → contact method → your details) so each screen
 * asks one small question instead of a wall of inputs. Submits through the
 * existing `/api/enquiry` contract with the answers composed into the
 * message, so nothing is lost against the current backend.
 */
export default function EnquiryCard({ property, onEvent, onToast }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ interest: "", method: "Call", name: "", phone: "", consent: false, message: "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [touched, setTouched] = useState(false);

  const phoneValid = /^[0-9]{10}$/.test(form.phone.replace(/\D/g, ""));

  const markTouched = () => {
    if (!touched) {
      setTouched(true);
      onEvent?.("enquiry_started");
    }
  };

  const set = (key) => (e) => {
    markTouched();
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const stepValid = [Boolean(form.interest), Boolean(form.method), form.name.trim().length > 1 && phoneValid && form.consent];

  const next = () => {
    if (!stepValid[step]) {
      setStatus({
        state: "error",
        message:
          step === 0
            ? "Please pick how interested you are."
            : step === 1
            ? "Please pick how you'd like to be contacted."
            : "Please add your name, a valid 10-digit mobile number and consent.",
      });
      return;
    }
    setStatus({ state: "idle", message: "" });
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setStatus({ state: "idle", message: "" });
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!stepValid[2]) {
      setStatus({
        state: "error",
        message: "Please add your name, a valid 10-digit mobile number and consent.",
      });
      return;
    }
    if (status.state === "loading") return;
    setStatus({ state: "loading", message: "" });

    const composed = [
      "ENQUIRY",
      `Name: ${form.name}`,
      `Phone: ${form.phone}`,
      `Interest: ${form.interest}`,
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

      setStatus({ state: "success", message: "Thank you! Your enquiry has been sent. The owner will contact you soon." });
      onToast?.({ severity: "success", message: "Enquiry sent — the owner will contact you soon." });
      onEvent?.("enquiry_submitted");
    } catch (err) {
      // Network/CORS failures carry no useful copy — fall back to the guide's
      // error message rather than surfacing "Failed to fetch".
      const networkError = err instanceof TypeError || /failed to fetch|network/i.test(err?.message || "");
      const message = networkError ? "Failed to submit enquiry. Please try again." : err.message || "Something went wrong. Please try again.";
      setStatus({ state: "error", message });
      onToast?.({ severity: "error", message });
    }
  };

  const optionSx = (selected) => ({
    p: 3,
    borderRadius: `${radii.sm}px`,
    border: "1px solid",
    borderColor: selected ? "#00A79D" : "divider",
    backgroundColor: selected ? "rgba(0,167,157,0.08)" : "background.paper",
    "&:hover": { backgroundColor: selected ? "rgba(0,167,157,0.10)" : "background.default" },
  });

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
            <Typography variant="h2" sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" }, color: "#7FE9E1", mb: 2 }}>
              Ready to move forward?
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
              Three quick questions — we'll share availability, exact pricing and visit slots.
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            {STEPS.map((label, i) => (
              <Stack key={label} spacing={1} alignItems="center" sx={{ flex: 1 }}>
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    backgroundColor: i <= step ? "#00A79D" : "rgba(255,255,255,0.15)",
                    color: i <= step ? "#FFFFFF" : "rgba(255,255,255,0.7)",
                  }}
                >
                  {i < step ? <CheckCircle2 size={15} /> : i + 1}
                </Box>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", textAlign: "center", fontSize: "0.65rem" }}>
                  {label}
                </Typography>
              </Stack>
            ))}
          </Stack>

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
            <SuccessPanel message={status.message} />
          ) : (
            <Stack spacing={5}>
              {/* Step 1 — interest level */}
              {step === 0 && (
                <Box role="radiogroup" aria-label="How interested are you?">
                  <Typography variant="body1" sx={{ fontWeight: 700, color: "primary.main", mb: 3 }}>
                    How interested are you?
                  </Typography>
                  <RadioGroup value={form.interest} onChange={set("interest")} name="interest-level">
                    {INTEREST_LEVELS.map((level) => (
                      <FormControlLabel
                        key={level}
                        value={level}
                        control={
                          <Radio
                            icon={<Circle size={20} color="#9CA3AF" />}
                            checkedIcon={<CircleCheck size={20} color="#00A79D" />}
                            sx={{ p: 0, mr: 2, "& .MuiSvgIcon-root": { fontSize: 20 } }}
                          />
                        }
                        label={<Typography variant="body2">{level}</Typography>}
                        sx={{
                          ...optionSx(form.interest === level),
                          m: 0,
                          "& .MuiTypography-root": { fontWeight: form.interest === level ? 700 : 400, color: "text.primary" },
                        }}
                      />
                    ))}
                  </RadioGroup>
                </Box>
              )}

              {/* Step 2 — preferred contact method */}
              {step === 1 && (
                <Box role="radiogroup" aria-label="How would you like to be contacted?">
                  <Typography variant="body1" sx={{ fontWeight: 700, color: "primary.main", mb: 3 }}>
                    How would you like to be contacted?
                  </Typography>
                  <RadioGroup value={form.method} onChange={set("method")} name="contact-method">
                    <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
                      {CONTACT_METHODS.map((method) => (
                        <FormControlLabel
                          key={method.value}
                          value={method.value}
                          control={
                            <Radio
                              icon={<Circle size={20} color="#9CA3AF" />}
                              checkedIcon={<CircleCheck size={20} color="#00A79D" />}
                              sx={{ p: 0, mr: 2, "& .MuiSvgIcon-root": { fontSize: 20 } }}
                            />
                          }
                          label={<Typography variant="body2">{method.label}</Typography>}
                          sx={{
                            ...optionSx(form.method === method.value),
                            m: 0,
                            "& .MuiTypography-root": { fontWeight: form.method === method.value ? 700 : 400, color: "text.primary" },
                          }}
                        />
                      ))}
                    </Box>
                  </RadioGroup>
                </Box>
              )}

              {/* Step 3 — details */}
              {step === 2 && (
                <Stack spacing={4}>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: "primary.main" }}>
                    Your details
                  </Typography>
                  <TextField label="Name" size="small" value={form.name} onChange={set("name")} fullWidth autoFocus />
                  <TextField
                    label="Phone"
                    size="small"
                    value={form.phone}
                    onChange={set("phone")}
                    error={form.phone.length > 0 && !phoneValid}
                    helperText={form.phone.length > 0 && !phoneValid ? "Enter a 10-digit mobile number" : ""}
                    fullWidth
                  />
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
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.consent}
                        onChange={(e) => {
                          markTouched();
                          setForm((prev) => ({ ...prev, consent: e.target.checked }));
                        }}
                        sx={{ p: 0, mr: 2, color: "#00A79D", "&.Mui-checked": { color: "#00A79D" } }}
                        icon={<Circle size={18} color="#9CA3AF" />}
                        checkedIcon={<CircleCheck size={18} color="#00A79D" />}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        I agree to receive updates from property owners and agents
                      </Typography>
                    }
                    sx={{ m: 0, alignItems: "flex-start" }}
                  />
                </Stack>
              )}

              {status.state === "error" && (
                <Alert severity="error" sx={{ borderRadius: `${radii.sm}px` }}>
                  {status.message}
                </Alert>
              )}

              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={3}>
                <Button type="button" onClick={back} disabled={step === 0} startIcon={<ChevronLeft size={16} />} sx={{ color: "text.secondary" }}>
                  Back
                </Button>

                {step < STEPS.length - 1 ? (
                  <Button type="button" variant="contained" size="large" endIcon={<ChevronRight size={16} />} onClick={next} sx={{ px: 6 }}>
                    Continue
                  </Button>
                ) : (
                  <Button type="submit" variant="contained" size="large" sx={{ px: 6 }}>
                    {status.state === "loading" ? "Sending…" : "Submit enquiry"}
                  </Button>
                )}
              </Stack>

              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                We never share your number publicly.
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
