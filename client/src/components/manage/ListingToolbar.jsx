import React from "react";
import { Box, InputAdornment, MenuItem, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Search } from "lucide-react";
import { radii } from "../../theme/theme";

/**
 * Status tabs (with counts) + optional type toggle + search + sort.
 * tabs: [{ value, label, count }], types: [{ value, label }], sorts: [{ value, label }]
 */
export default function ListingToolbar({ tabs, tab, onTab, types, type, onType, query, onQuery, sorts, sort, onSort, placeholder = "Search your listings" }) {
  return (
    <Box sx={{ mb: 5, borderRadius: `${radii.lg}px`, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider" }}>
      <Tabs
        value={tab}
        onChange={(e, v) => onTab(v)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ px: { xs: 1, md: 3 }, borderBottom: "1px solid", borderColor: "divider", "& .MuiTab-root": { fontWeight: 700, textTransform: "none", minHeight: 52 } }}
        TabIndicatorProps={{ sx: { height: 3, borderRadius: 2, backgroundColor: "secondary.main" } }}
      >
        {tabs.map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            label={
              <Stack direction="row" spacing={1.5} alignItems="center">
                <span>{t.label}</span>
                <Box component="span" sx={{ px: 1.75, py: 0.25, borderRadius: 999, fontSize: 12, fontWeight: 800, backgroundColor: tab === t.value ? "secondary.main" : "#EEF3F8", color: tab === t.value ? "#fff" : "text.secondary" }}>
                  {t.count}
                </Box>
              </Stack>
            }
          />
        ))}
      </Tabs>
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ p: { xs: 3, md: 4 } }} alignItems={{ md: "center" }}>
        <TextField
          size="small"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          inputProps={{ "aria-label": placeholder }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }}
          sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 999 } }}
        />
        <Stack direction="row" spacing={3} alignItems="center" sx={{ overflowX: "auto" }}>
          {types && (
            <ToggleButtonGroup exclusive size="small" value={type} onChange={(e, v) => v && onType(v)} aria-label="Listing type" sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700, px: 3, borderRadius: 999 } }}>
              {types.map((t) => (
                <ToggleButton key={t.value} value={t.value}>
                  {t.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          {sorts && (
            <TextField select size="small" value={sort} onChange={(e) => onSort(e.target.value)} SelectProps={{ SelectDisplayProps: { "aria-label": "Sort listings" } }} sx={{ minWidth: 170, "& .MuiOutlinedInput-root": { borderRadius: 999 } }}>
              {sorts.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
