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
import { CalendarCheck, Clock, Gift, MapPin, Search, ShieldCheck, X } from "lucide-react";
import { motionDuration } from "../../theme/motion";
import { radii } from "../../theme/theme";

const TRUST = [
  { icon: ShieldCheck, label: "Verified listings only" },
  { icon: Gift, label: "Gifts up to ₹1,000" },
  { icon: CalendarCheck, label: "Visits in 24 hours" },
];

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
  headingPrefix,
  place,
  total,
  overline = "Gurgaon · Verified homes",
  types = TYPES,
  trust = TRUST,
  placeholder = "Sector, locality or “2 BHK in Sector 46”",
  noun = ["home", "homes"],
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
        backgroundColor: "#001F3F",
        pt: { xs: 7, md: 11 },
        pb: { xs: 9, md: 13 },
      }}
    >
      {/* Photo with a slow, continuous zoom for a premium, living feel. */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/Dashboard.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center 35%",
          animation: "searchHeroZoom 24s ease-in-out infinite alternate",
          "@keyframes searchHeroZoom": {
            from: { transform: "scale(1.04)" },
            to: { transform: "scale(1.14) translate3d(-1%, -1%, 0)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none", transform: "scale(1.04)" },
        }}
      />
      {/* Navy wash: dense on the left where the text sits, lighter on the right to let the photo show. */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background: {
            xs: "linear-gradient(180deg, rgba(0,20,45,0.86) 0%, rgba(0,31,63,0.82) 100%)",
            md: "linear-gradient(95deg, rgba(0,20,45,0.94) 0%, rgba(0,31,63,0.84) 42%, rgba(0,51,102,0.45) 100%)",
          },
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(40% 60% at 85% 10%, rgba(246,196,83,0.22) 0%, rgba(246,196,83,0) 70%), radial-gradient(35% 55% at 0% 100%, rgba(0,167,157,0.25) 0%, rgba(0,167,157,0) 70%)",
        }}
      />
      {/* Thin gold rule along the bottom edge, echoing the dashboard tagline. */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          background: "linear-gradient(90deg, rgba(246,196,83,0) 0%, #F6C453 30%, #FFE08A 50%, #F6C453 70%, rgba(246,196,83,0) 100%)",
          opacity: 0.85,
        }}
      />

      <Container maxWidth="xl" sx={{ position: "relative", px: { xs: 4, sm: 6, md: 8 } }}>
        <Breadcrumbs
          separator="/"
          sx={{ mb: { xs: 4, md: 6 }, fontSize: 13, "& .MuiBreadcrumbs-separator": { color: "rgba(255,255,255,0.4)" } }}
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

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
        >
          <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: { xs: 3, md: 4 } }}>
            <Box sx={{ width: 28, height: "1px", backgroundColor: "rgba(246,196,83,0.8)" }} />
            <Typography variant="overline" sx={{ color: "#F6D58A", letterSpacing: "0.22em", fontSize: { xs: 10, md: 12 } }}>
              {overline}
            </Typography>
          </Stack>

          <Typography
            component="h1"
            sx={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontWeight: 700,
              fontSize: { xs: "2rem", sm: "2.75rem", md: "3.6rem" },
              lineHeight: 1.08,
              letterSpacing: "-0.01em",
              textShadow: "0 4px 24px rgba(0,0,0,0.35)",
            }}
          >
            {headingPrefix}{" "}
            <Box
              component="span"
              sx={{
                fontStyle: "italic",
                background: "linear-gradient(90deg, #F6D58A 0%, #F0B429 55%, #FFE7A8 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {place}
            </Box>
          </Typography>

          <Stack
            direction="row"
            useFlexGap
            flexWrap="wrap"
            alignItems="center"
            columnGap={{ xs: 4, md: 6 }}
            rowGap={2}
            sx={{ mt: { xs: 4, md: 5 }, mb: { xs: 6, md: 8 } }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                px: 3,
                py: 1.25,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(8px)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#3FC2B8",
                  boxShadow: "0 0 0 0 rgba(63,194,184,0.7)",
                  animation: "liveDot 2s ease-out infinite",
                  "@keyframes liveDot": {
                    "0%": { boxShadow: "0 0 0 0 rgba(63,194,184,0.7)" },
                    "100%": { boxShadow: "0 0 0 8px rgba(63,194,184,0)" },
                  },
                  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                }}
              />
              {total === undefined
                ? "Searching listings…"
                : total === null
                ? "Live verified listings"
                : `${total.toLocaleString("en-IN")} ${total === 1 ? noun[0] : noun[1]} available`}
            </Box>
            {trust.map(({ icon: Icon, label }, ti) => (
              <Stack key={label} direction="row" spacing={1.5} alignItems="center" sx={{ display: { xs: ti >= 2 ? "none" : "flex", sm: "flex" } }}>
                <Icon size={15} color="#3FC2B8" aria-hidden />
                <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.78)" }}>{label}</Typography>
              </Stack>
            ))}
          </Stack>
        </motion.div>

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
                  placeholder={placeholder}
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
            {types.map((t) => (
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
