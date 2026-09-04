import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";

const BHK_OPTIONS = ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "4+ BHK"];
const BATHROOM_OPTIONS = ["1", "2", "3", "4"];

const EMPTY_FILTERS = {
  bedroomsFilter: "",
  bathroomsFilter: "",
  minPriceFilter: "",
  maxPriceFilter: "",
  minAreaFilter: "",
  maxAreaFilter: "",
  moveInDateFilter: "",
  parkingFilter: "",
};

function ChipGroup({ label, options, value, onChange }) {
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
              label={option}
              onClick={() => onChange(active ? "" : option)}
              sx={{
                fontWeight: 600,
                backgroundColor: active ? "primary.main" : "background.default",
                color: active ? "common.white" : "text.secondary",
                "&:hover": { backgroundColor: active ? "primary.dark" : "divider" },
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}

/**
 * Refinement filters that apply on top of the server-side query + type.
 * Rebuilt as a right-hand sheet (the brief explicitly calls for drawers over
 * centered dialogs) — and, unlike the filters panel it replaces, every field
 * here is one a user can actually reach a matching result for: pet/smoking
 * policy and amenities were dropped because the add-property form never
 * collects them, so those filters could only ever return zero results.
 */
export default function FilterDrawer({ open, onClose, onApply, filters }) {
  const [local, setLocal] = useState(filters);

  useEffect(() => {
    if (open) setLocal(filters);
  }, [open, filters]);

  const set = (key) => (value) => setLocal((prev) => ({ ...prev, [key]: value }));

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 380 }, height: "100%", display: "flex", flexDirection: "column" }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ p: 5, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Typography variant="h3" sx={{ fontSize: "1.15rem", color: "primary.main" }}>
            Refine results
          </Typography>
          <IconButton onClick={onClose} aria-label="Close filters">
            <X size={20} />
          </IconButton>
        </Stack>

        <Stack spacing={7} sx={{ p: 5, flex: 1, overflowY: "auto" }}>
          <ChipGroup
            label="Bedrooms"
            options={BHK_OPTIONS}
            value={local.bedroomsFilter}
            onChange={set("bedroomsFilter")}
          />
          <ChipGroup
            label="Bathrooms"
            options={BATHROOM_OPTIONS}
            value={local.bathroomsFilter}
            onChange={set("bathroomsFilter")}
          />
          <ChipGroup
            label="Parking"
            options={["Yes", "No"]}
            value={local.parkingFilter}
            onChange={set("parkingFilter")}
          />

          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 3 }}>
              Monthly rent (₹)
            </Typography>
            <Stack direction="row" spacing={3}>
              <TextField
                type="number"
                placeholder="Min"
                size="small"
                fullWidth
                value={local.minPriceFilter}
                onChange={(e) => set("minPriceFilter")(e.target.value)}
              />
              <TextField
                type="number"
                placeholder="Max"
                size="small"
                fullWidth
                value={local.maxPriceFilter}
                onChange={(e) => set("maxPriceFilter")(e.target.value)}
              />
            </Stack>
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 3 }}>
              Area (sqft)
            </Typography>
            <Stack direction="row" spacing={3}>
              <TextField
                type="number"
                placeholder="Min"
                size="small"
                fullWidth
                value={local.minAreaFilter}
                onChange={(e) => set("minAreaFilter")(e.target.value)}
              />
              <TextField
                type="number"
                placeholder="Max"
                size="small"
                fullWidth
                value={local.maxAreaFilter}
                onChange={(e) => set("maxAreaFilter")(e.target.value)}
              />
            </Stack>
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary", display: "block", mb: 3 }}>
              Move in by
            </Typography>
            <TextField
              type="date"
              size="small"
              fullWidth
              value={local.moveInDateFilter}
              onChange={(e) => set("moveInDateFilter")(e.target.value)}
            />
          </Box>
        </Stack>

        <Stack direction="row" spacing={3} sx={{ p: 5, borderTop: "1px solid", borderColor: "divider" }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setLocal(EMPTY_FILTERS)}
            sx={{ borderColor: "divider", color: "text.secondary" }}
          >
            Reset
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            onClick={() => {
              onApply(local);
              onClose();
            }}
          >
            Apply filters
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
