import React, { useEffect, useState } from "react";
import { Box, Button, Chip, Drawer, FormControlLabel, IconButton, Stack, Switch, TextField, Typography } from "@mui/material";
import { X } from "lucide-react";
import {
  BHK_OPTIONS,
  FILTER_KEYS,
  LISTED_WITHIN_OPTIONS,
  POSTED_BY_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from "./searchParams";

const BATHROOM_OPTIONS = ["1", "2", "3", "4"];

const EMPTY = FILTER_KEYS.reduce((acc, k) => ({ ...acc, [k]: "" }), {});

function ChipGroup({ label, options, value, onChange, format = (o) => o }) {
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: format(o) } : o));
  return (
    <Box>
      <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 3 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {items.map((option) => {
          const active = value === option.value;
          return (
            <Chip
              key={option.value}
              label={option.label}
              aria-pressed={active}
              onClick={() => onChange(active ? "" : option.value)}
              sx={{
                height: 36,
                px: 1,
                fontWeight: 600,
                border: "1px solid",
                borderColor: active ? "primary.main" : "divider",
                backgroundColor: active ? "primary.main" : "background.paper",
                color: active ? "common.white" : "text.primary",
                "&:hover": { backgroundColor: active ? "primary.dark" : "background.default" },
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}

function RangeFields({ label, minValue, maxValue, onMin, onMax }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 3 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={3}>
        <TextField type="number" label="Min" size="small" fullWidth value={minValue} onChange={(e) => onMin(e.target.value)} inputProps={{ min: 0 }} />
        <TextField type="number" label="Max" size="small" fullWidth value={maxValue} onChange={(e) => onMax(e.target.value)} inputProps={{ min: 0 }} />
      </Stack>
    </Box>
  );
}

/** Full refinement sheet; changes apply together on "Show results". */
export default function FilterDrawer({ open, onClose, onApply, filters, type }) {
  const [local, setLocal] = useState(filters);

  useEffect(() => {
    if (open) setLocal(filters);
  }, [open, filters]);

  const set = (key) => (value) => setLocal((prev) => ({ ...prev, [key]: value }));

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 400 }, height: "100%", display: "flex", flexDirection: "column" }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 6, py: 4, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Typography variant="h3" sx={{ fontSize: "1.2rem", color: "primary.main" }}>
            Filters
          </Typography>
          <IconButton onClick={onClose} aria-label="Close filters">
            <X size={20} />
          </IconButton>
        </Stack>

        <Stack spacing={7} sx={{ px: 6, py: 5, flex: 1, overflowY: "auto" }}>
          <ChipGroup label="Bedrooms" options={BHK_OPTIONS} value={local.bhk} onChange={set("bhk")} />
          {type !== "sale" && (
            <ChipGroup
              label="Property type"
              options={PROPERTY_TYPE_OPTIONS}
              value={local.propertyType}
              onChange={set("propertyType")}
            />
          )}
          <RangeFields
            label={`${type === "sale" ? "Price" : type === "rent" ? "Monthly rent" : "Budget"} (₹)`}
            minValue={local.minPrice}
            maxValue={local.maxPrice}
            onMin={set("minPrice")}
            onMax={set("maxPrice")}
          />
          <ChipGroup
            label="Bathrooms"
            options={BATHROOM_OPTIONS}
            value={local.bathrooms}
            onChange={set("bathrooms")}
            format={(o) => `${o} bath${o === "1" ? "" : "s"}`}
          />
          <RangeFields
            label="Area (sqft)"
            minValue={local.minArea}
            maxValue={local.maxArea}
            onMin={set("minArea")}
            onMax={set("maxArea")}
          />
          <ChipGroup label="Posted by" options={POSTED_BY_OPTIONS} value={local.postedBy} onChange={set("postedBy")} />
          <ChipGroup
            label="Listed"
            options={LISTED_WITHIN_OPTIONS}
            value={local.listedWithin}
            onChange={set("listedWithin")}
          />
          <FormControlLabel
            control={
              <Switch
                checked={local.withPhotos === "1"}
                onChange={(e) => set("withPhotos")(e.target.checked ? "1" : "")}
                color="secondary"
              />
            }
            label={<Typography sx={{ fontWeight: 600, fontSize: 14 }}>Only show homes with photos</Typography>}
            sx={{ ml: 0, justifyContent: "space-between", flexDirection: "row-reverse" }}
          />
          {type !== "sale" && (
            <>
              <ChipGroup label="Parking" options={["Yes", "No"]} value={local.parking} onChange={set("parking")} />
              <Box>
                <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 3 }}>
                  Move in by
                </Typography>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={local.moveInBy}
                  onChange={(e) => set("moveInBy")(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </>
          )}
        </Stack>

        <Stack direction="row" spacing={3} sx={{ px: 6, py: 4, borderTop: "1px solid", borderColor: "divider" }}>
          <Button fullWidth variant="outlined" onClick={() => setLocal(EMPTY)} sx={{ borderColor: "divider", color: "text.secondary" }}>
            Clear all
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={() => {
              onApply(local);
              onClose();
            }}
          >
            Show results
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
