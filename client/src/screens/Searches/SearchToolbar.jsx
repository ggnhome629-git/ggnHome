import React, { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ChevronDown, Grid as GridIcon, List as ListIcon, SlidersHorizontal } from "lucide-react";
import { BHK_OPTIONS, SORT_OPTIONS, formatINR } from "./searchParams";
import { radii } from "../../theme/theme";

const RENT_PRESETS = [
  { label: "Under ₹20K", max: 20000 },
  { label: "₹20K – ₹40K", min: 20000, max: 40000 },
  { label: "₹40K – ₹75K", min: 40000, max: 75000 },
  { label: "₹75K+", min: 75000 },
];
const SALE_PRESETS = [
  { label: "Under ₹50 L", max: 5000000 },
  { label: "₹50 L – ₹1 Cr", min: 5000000, max: 10000000 },
  { label: "₹1 – 2 Cr", min: 10000000, max: 20000000 },
  { label: "₹2 Cr+", min: 20000000 },
];

const pillSx = (active) => ({
  height: 38,
  px: 4,
  flexShrink: 0,
  borderRadius: 999,
  fontWeight: 600,
  fontSize: 14,
  textTransform: "none",
  whiteSpace: "nowrap",
  border: "1px solid",
  borderColor: active ? "primary.main" : "divider",
  color: active ? "common.white" : "text.primary",
  backgroundColor: active ? "primary.main" : "background.paper",
  "&:hover": {
    borderColor: "primary.main",
    backgroundColor: active ? "primary.dark" : "background.default",
  },
});

function BudgetButton({ type, minPrice, maxPrice, onApply }) {
  const [anchor, setAnchor] = useState(null);
  const [min, setMin] = useState(minPrice);
  const [max, setMax] = useState(maxPrice);
  useEffect(() => {
    setMin(minPrice);
    setMax(maxPrice);
  }, [minPrice, maxPrice, anchor]);

  const active = Boolean(minPrice || maxPrice);
  const label = active
    ? `${minPrice ? formatINR(minPrice) : "Any"} – ${maxPrice ? formatINR(maxPrice) : "Any"}`
    : "Budget";
  const presets = type === "sale" ? SALE_PRESETS : RENT_PRESETS;

  const apply = (nextMin, nextMax) => {
    onApply({ minPrice: nextMin ? String(nextMin) : "", maxPrice: nextMax ? String(nextMax) : "" });
    setAnchor(null);
  };

  return (
    <>
      <Button
        onClick={(e) => setAnchor(e.currentTarget)}
        endIcon={<ChevronDown size={16} />}
        aria-haspopup="dialog"
        sx={pillSx(active)}
      >
        {label}
      </Button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{ sx: { mt: 2, p: 5, width: 320, borderRadius: `${radii.lg}px` } }}
      >
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          {type === "sale" ? "Price" : type === "rent" ? "Monthly rent" : "Budget"} (₹)
        </Typography>
        <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ my: 3 }}>
          {presets.map((p) => (
            <Chip key={p.label} label={p.label} onClick={() => apply(p.min, p.max)} sx={{ fontWeight: 600 }} />
          ))}
        </Stack>
        <Stack direction="row" spacing={3}>
          <TextField
            size="small"
            type="number"
            label="Min"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            inputProps={{ min: 0 }}
          />
          <TextField
            size="small"
            type="number"
            label="Max"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            inputProps={{ min: 0 }}
          />
        </Stack>
        <Stack direction="row" spacing={3} sx={{ mt: 4 }}>
          <Button fullWidth onClick={() => apply("", "")} sx={{ color: "text.secondary" }}>
            Clear
          </Button>
          <Button fullWidth variant="contained" onClick={() => apply(min, max)}>
            Apply
          </Button>
        </Stack>
      </Popover>
    </>
  );
}

/**
 * Sticky refinement bar: BHK pills, budget, the "more filters" sheet, sort
 * and grid/list. Everything here writes to the URL, so results, the back
 * button and shared links all agree.
 */
export default function SearchToolbar({
  type,
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
  onOpenFilters,
  moreFilterCount,
  viewMode,
  onViewModeChange,
  top = 64,
}) {
  const totalActive = Object.values(filters).filter(Boolean).length;
  return (
    <Box
      sx={{
        position: "sticky",
        top,
        zIndex: 20,
        backgroundColor: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid",
        borderColor: "divider",
        boxShadow: "0 4px 16px rgba(0,31,63,0.06)",
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 } }}>
        <Stack direction="row" alignItems="center" spacing={3} sx={{ py: 3 }}>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{
              flex: 1,
              minWidth: 0,
              overflowX: "auto",
              py: 0.5,
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
            }}
          >
            {/* On phones the sheet holds everything, so its button leads the row. */}
            <Badge
              badgeContent={totalActive}
              color="secondary"
              invisible={!totalActive}
              sx={{ flexShrink: 0, display: { xs: "inline-flex", sm: "none" } }}
            >
              <Button onClick={onOpenFilters} startIcon={<SlidersHorizontal size={16} />} sx={pillSx(Boolean(totalActive))}>
                Filters
              </Button>
            </Badge>

            {BHK_OPTIONS.map((opt) => {
              const active = filters.bhk === opt;
              return (
                <Button
                  key={opt}
                  aria-pressed={active}
                  onClick={() => onFilterChange({ bhk: active ? "" : opt })}
                  sx={pillSx(active)}
                >
                  {opt}
                </Button>
              );
            })}

            <Box sx={{ width: "1px", height: 24, backgroundColor: "divider", flexShrink: 0, mx: 1 }} />

            <BudgetButton
              type={type}
              minPrice={filters.minPrice}
              maxPrice={filters.maxPrice}
              onApply={onFilterChange}
            />

            <Badge
              badgeContent={moreFilterCount}
              color="secondary"
              overlap="rectangular"
              invisible={!moreFilterCount}
              sx={{ flexShrink: 0, display: { xs: "none", sm: "inline-flex" } }}
            >
              <Button
                onClick={onOpenFilters}
                startIcon={<SlidersHorizontal size={16} />}
                sx={pillSx(false)}
              >
                More filters
              </Button>
            </Badge>
          </Stack>

          <Select
            size="small"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            SelectDisplayProps={{ "aria-label": "Sort results" }}
            sx={{
              flexShrink: 0,
              display: { xs: "none", md: "inline-flex" },
              minWidth: 190,
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 999,
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              display: { xs: "none", md: "flex" },
              flexShrink: 0,
              p: 1,
              borderRadius: 999,
              backgroundColor: "background.default",
            }}
          >
            {[
              { mode: "grid", icon: GridIcon, label: "Grid view" },
              { mode: "list", icon: ListIcon, label: "List view" },
            ].map(({ mode, icon: Icon, label }) => (
              <Tooltip key={mode} title={label}>
                <IconButton
                  size="small"
                  aria-label={label}
                  aria-pressed={viewMode === mode}
                  onClick={() => onViewModeChange(mode)}
                  sx={{
                    backgroundColor: viewMode === mode ? "background.paper" : "transparent",
                    color: viewMode === mode ? "primary.main" : "text.secondary",
                    boxShadow: viewMode === mode ? 1 : 0,
                  }}
                >
                  <Icon size={16} />
                </IconButton>
              </Tooltip>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
