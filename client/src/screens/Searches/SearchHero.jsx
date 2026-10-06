import React, { useEffect, useState } from "react";
import {
  Box,
  Breadcrumbs,
  ClickAwayListener,
  Container,
  InputBase,
  Link as MuiLink,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, MapPin, Search, X } from "lucide-react";
import { motionDuration } from "../../theme/motion";
import { radii } from "../../theme/theme";

const TYPES = [
  { value: "", label: "All" },
  { value: "rent", label: "Rent" },
  { value: "sale", label: "Buy" },
];

/**
 * Compact navy band in the dashboard's visual language: breadcrumb, a serif
 * headline naming the area, one search field with suggestions, and the
 * Rent/Buy switch.
 */
export default function SearchHero({
  query,
  onQueryChange,
  onSearch,
  type,
  onTypeChange,
  recentSearches,
  areaSuggestions,
  onHome,
  heading,
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const options = query.trim()
    ? areaSuggestions.map((label) => ({ label, kind: "area" }))
    : recentSearches.map((label) => ({ label, kind: "recent" }));
  const showDropdown = open && options.length > 0;

  useEffect(() => setHighlighted(-1), [query]);

  const pick = (label) => {
    setOpen(false);
    onSearch(label);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") return setOpen(false);
    if (showDropdown && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setHighlighted((prev) => {
        const next = e.key === "ArrowDown" ? prev + 1 : prev - 1;
        if (next < 0) return options.length - 1;
        return next >= options.length ? 0 : next;
      });
      return;
    }
    if (e.key === "Enter") {
      if (showDropdown && highlighted >= 0) return pick(options[highlighted].label);
      setOpen(false);
      onSearch(query);
    }
  };

  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        overflow: "hidden",
        color: "common.white",
        background: "linear-gradient(160deg, #001F3F 0%, #003366 60%, #0B4A6F 100%)",
        pt: { xs: 6, md: 9 },
        pb: { xs: 7, md: 10 },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(45% 70% at 90% 0%, rgba(246,196,83,0.16) 0%, rgba(246,196,83,0) 70%), radial-gradient(40% 60% at 5% 100%, rgba(0,167,157,0.18) 0%, rgba(0,167,157,0) 70%)",
        }}
      />

      <Container maxWidth="xl" sx={{ position: "relative", px: { xs: 4, sm: 6, md: 8 } }}>
        <Breadcrumbs
          separator="/"
          sx={{ mb: { xs: 3, md: 4 }, fontSize: 13, "& .MuiBreadcrumbs-separator": { color: "rgba(255,255,255,0.4)" } }}
        >
          <MuiLink
            component="button"
            onClick={onHome}
            underline="hover"
            sx={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}
          >
            Home
          </MuiLink>
          <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: 13 }}>Search</Typography>
        </Breadcrumbs>

        <Typography
          component="h1"
          sx={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 700,
            fontSize: { xs: "1.85rem", sm: "2.4rem", md: "3rem" },
            lineHeight: 1.1,
            mb: { xs: 5, md: 7 },
          }}
        >
          {heading}
        </Typography>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 3, md: 4 }}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <ClickAwayListener onClickAway={() => setOpen(false)}>
            <Box sx={{ position: "relative", flex: 1, maxWidth: { md: 720 } }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={3}
                sx={{
                  pl: 5,
                  pr: 1.5,
                  height: 58,
                  borderRadius: `${radii.md}px`,
                  backgroundColor: "common.white",
                  boxShadow: "0 16px 40px rgba(0,10,30,0.28)",
                }}
              >
                <Search size={20} color="#4A6A8A" style={{ flexShrink: 0 }} aria-hidden />
                <InputBase
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  onFocus={() => setOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Sector, locality or “2 BHK in Sector 46”"
                  inputProps={{ "aria-label": "Search properties", role: "combobox", "aria-expanded": showDropdown }}
                  sx={{ flex: 1, fontSize: 15, color: "text.primary" }}
                />
                {query && (
                  <Box
                    component="button"
                    type="button"
                    aria-label="Clear search"
                    onClick={() => onQueryChange("")}
                    sx={{ border: 0, background: "none", cursor: "pointer", color: "text.secondary", display: "flex", p: 1 }}
                  >
                    <X size={18} />
                  </Box>
                )}
                <Box
                  component="button"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSearch(query);
                  }}
                  sx={{
                    height: 46,
                    px: { xs: 4, sm: 7 },
                    border: 0,
                    borderRadius: `${radii.sm}px`,
                    cursor: "pointer",
                    font: "inherit",
                    fontWeight: 700,
                    color: "common.white",
                    backgroundColor: "primary.main",
                    "&:hover": { backgroundColor: "primary.dark" },
                  }}
                >
                  Search
                </Box>
              </Stack>

              <AnimatePresence>
                {showDropdown && (
                  <Box
                    component={motion.div}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: motionDuration.fast }}
                    sx={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      borderRadius: `${radii.md}px`,
                      backgroundColor: "background.paper",
                      boxShadow: "0 20px 48px rgba(0,20,45,0.28)",
                      overflow: "hidden",
                      py: 2,
                    }}
                  >
                    <Typography variant="overline" sx={{ display: "block", px: 4, pt: 1, color: "text.secondary" }}>
                      {query.trim() ? "Matching locations" : "Recent searches"}
                    </Typography>
                    {options.map((option, idx) => {
                      const Icon = option.kind === "area" ? MapPin : Clock;
                      return (
                        <Stack
                          key={`${option.kind}-${option.label}`}
                          direction="row"
                          spacing={3}
                          alignItems="center"
                          role="option"
                          aria-selected={highlighted === idx}
                          onMouseEnter={() => setHighlighted(idx)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            pick(option.label);
                          }}
                          sx={{
                            px: 4,
                            py: 2.5,
                            cursor: "pointer",
                            color: "text.primary",
                            backgroundColor: highlighted === idx ? "background.default" : "transparent",
                          }}
                        >
                          <Icon size={15} color="#00A79D" aria-hidden />
                          <Typography variant="body2">{option.label}</Typography>
                        </Stack>
                      );
                    })}
                  </Box>
                )}
              </AnimatePresence>
            </Box>
          </ClickAwayListener>

          <ToggleButtonGroup
            exclusive
            value={type}
            onChange={(_, v) => v !== null && onTypeChange(v)}
            aria-label="Listing type"
            sx={{
              alignSelf: { xs: "flex-start", md: "center" },
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: `${radii.md}px`,
              p: 1,
              "& .MuiToggleButton-root": {
                border: 0,
                borderRadius: `${radii.sm}px !important`,
                px: { xs: 5, md: 6 },
                py: 2,
                color: "rgba(255,255,255,0.8)",
                textTransform: "none",
                fontWeight: 700,
                fontSize: 14,
                "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
                "&.Mui-selected, &.Mui-selected:hover": {
                  color: "primary.main",
                  backgroundColor: "common.white",
                },
              },
            }}
          >
            {TYPES.map((t) => (
              <ToggleButton key={t.label} value={t.value}>
                {t.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Container>
    </Box>
  );
}
