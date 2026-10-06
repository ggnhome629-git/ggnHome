import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Stack, TextField, useMediaQuery } from "@mui/material";
import { ChoiceChips, FormSection } from "../../components/postForm/ChoiceChips";
import { todayISO } from "../../components/postForm/scoring";
import { AMENITIES, CONTACT, FURNISHED, GENDERS, OCCUPANTS, SPOTS, STEP, validateStep } from "./flatmateFormConfig";

const toForm = (l) => ({
  preferredGender: l.preferredGender || "any",
  occupancyWanted: String(Math.min(4, Number(l.occupancyWanted) || 1)),
  currentOccupants: l.currentOccupants == null ? "" : String(Math.min(5, Number(l.currentOccupants))),
  furnished: l.furnished ? "yes" : "no",
  area: l.area || "",
  minRent: l.budget?.min ? String(l.budget.min) : "",
  maxRent: l.budget?.max && l.budget.max !== l.budget.min ? String(l.budget.max) : "",
  moveInDate: l.moveInDate ? new Date(l.moveInDate).toISOString().slice(0, 10) : "",
  amenities: (l.amenities || []).filter((a) => AMENITIES.includes(a)),
  contact: [l.contactMethods?.phone && "phone", l.contactMethods?.email && "email"].filter(Boolean),
  title: l.title || "",
  description: l.description || "",
});

/**
 * Edit a flatmate listing in place (photos are managed separately). Uses the
 * same checks as the post form; saving sends the listing back for review.
 */
export default function EditFlatmateDialog({ listing, onClose, onSaved, token }) {
  const fullScreen = useMediaQuery("(max-width:600px)");
  const [f, setF] = useState(() => toForm(listing));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setF(toForm(listing)), [listing]);

  const set = (k) => (v) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const onInput = (k) => (e) => set(k)(e.target.value);

  const save = async () => {
    const errs = [STEP.room, STEP.location, STEP.rent, STEP.details].reduce((acc, s) => ({ ...acc, ...validateStep(s, f) }), {});
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    setError("");
    const lo = Number(f.minRent);
    try {
      const res = await fetch(`${process.env.REACT_APP_Base_API}/api/flatmates/listings/${listing._id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          title: f.title.trim(),
          description: f.description.trim(),
          area: f.area.trim(),
          moveInDate: f.moveInDate,
          budget: { min: lo, max: f.maxRent === "" ? lo : Number(f.maxRent) },
          preferredGender: f.preferredGender,
          occupancyWanted: Number(f.occupancyWanted) || 1,
          currentOccupants: Number(f.currentOccupants) || 0,
          furnished: f.furnished === "yes",
          amenities: f.amenities,
          contactMethods: { phone: f.contact.includes("phone"), email: f.contact.includes("email") },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't save your changes.");
      onSaved(data.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const err = (k) => errors[k];
  return (
    <Dialog open onClose={() => !saving && onClose()} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ fontWeight: 800, color: "primary.main" }}>Edit Listing</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 5 }}>
          Saved changes go to our team for review. The listing is offline until they're approved.
        </Alert>
        <FormSection title="Who Can Apply?">
          <ChoiceChips ariaLabel="Who can apply" options={GENDERS.map(({ value, label }) => ({ value, label }))} value={f.preferredGender} onChange={set("preferredGender")} />
        </FormSection>
        <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 0, md: 6 }}>
          <FormSection title="Spots Open">
            <ChoiceChips ariaLabel="Spots open" options={SPOTS} value={f.occupancyWanted} onChange={set("occupancyWanted")} />
          </FormSection>
          <FormSection title="Living There Now">
            <ChoiceChips ariaLabel="Living there now" options={OCCUPANTS} value={f.currentOccupants} onChange={set("currentOccupants")} size="sm" />
          </FormSection>
        </Stack>
        <FormSection title="Furnishing">
          <ChoiceChips ariaLabel="Furnishing" options={FURNISHED} value={f.furnished} onChange={set("furnished")} />
        </FormSection>
        <FormSection title="Sector / Locality">
          <TextField fullWidth value={f.area} onChange={onInput("area")} error={Boolean(err("area"))} helperText={err("area") || " "} />
        </FormSection>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
          <TextField label="Rent" type="number" value={f.minRent} onChange={onInput("minRent")} error={Boolean(err("minRent"))} helperText={err("minRent") || " "} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} fullWidth />
          <TextField label="Up to (optional)" type="number" value={f.maxRent} onChange={onInput("maxRent")} error={Boolean(err("maxRent"))} helperText={err("maxRent") || " "} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} fullWidth />
          <TextField label="Available from" type="date" value={f.moveInDate} onChange={onInput("moveInDate")} error={Boolean(err("moveInDate"))} helperText={err("moveInDate") || " "} InputLabelProps={{ shrink: true }} inputProps={{ min: todayISO() }} fullWidth />
        </Stack>
        <FormSection title="Amenities">
          <ChoiceChips multiple size="sm" ariaLabel="Amenities" options={AMENITIES} value={f.amenities} onChange={set("amenities")} />
        </FormSection>
        <FormSection title="Contact By">
          <ChoiceChips multiple ariaLabel="Contact by" options={CONTACT} value={f.contact} onChange={set("contact")} />
        </FormSection>
        <Box sx={{ display: "grid", gap: 3 }}>
          <TextField label="Title" value={f.title} onChange={onInput("title")} error={Boolean(err("title"))} helperText={err("title") || `${f.title.length}/100`} inputProps={{ maxLength: 100 }} fullWidth />
          <TextField label="About the room & household" multiline minRows={4} value={f.description} onChange={onInput("description")} error={Boolean(err("description"))} helperText={err("description") || `${f.description.length}/2000`} inputProps={{ maxLength: 2000 }} fullWidth />
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 4 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 5, py: 3 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" color="secondary" onClick={save} disabled={saving} sx={{ fontWeight: 800, borderRadius: 999, px: 5 }}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
