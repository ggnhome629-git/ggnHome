import React, { useEffect, useState } from "react";
import { Box, Button, Chip, Drawer, IconButton, Stack, TextField, Typography } from "@mui/material";
import { X } from "lucide-react";
import { BHK_OPTIONS, FILTER_KEYS } from "./searchParams";

const BATHROOM_OPTIONS = ["1", "2", "3", "4"];

const EMPTY = FILTER_KEYS.reduce((acc, k) => ({ ...acc, [k]: "" }), {});

function ChipGroup({ label, options, value, onChange, format = (o) => o }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 3 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {options.map((option) => {
          const active = value === option;
          return (
            <Chip
              key={option}
              label={format(option)}
              aria-pressed={active}
              onClick={() => onChange(active ? "" : option)}
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
