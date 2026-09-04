import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  ClickAwayListener,
  Container,
  IconButton,
  InputBase,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Mic,
  MapPin,
  Clock,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  CalendarCheck,
} from "lucide-react";
import { motionDuration, motionEase } from "../../theme/motion";
import { radii } from "../../theme/theme";

const SEARCH_TYPES = [
  { value: "All", label: "All" },
  { value: "Rent", label: "Rent" },
  { value: "Sale", label: "Buy" },
];

const POPULAR_AREAS = [
  "Sector 46",
  "DLF Phase 3",
  "Sushant Lok",
  "Golf Course Road",
  "Sector 57",
];

const TRUST_MARKERS = [
  { icon: ShieldCheck, label: "Verified listings only" },
  { icon: Sparkles, label: "AI-matched to you" },
  { icon: CalendarCheck, label: "Visits in 24 hours" },
];

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The dashboard's primary action, given the whole top of the page: one calm
 * search surface over a cinematic band. Everything else on the dashboard is
 * discovery — this is the thing the user came to do.
 */
export default function HeroSearch({
  user,
  query,
  onQueryChange,
  onSearch,
  type,
  onTypeChange,
  recentSearches = [],
  suggestions = [],
  searching = false,
  onOpenPreferences,
}) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef(null);

  const hasQuery = Boolean(query.trim());

  // Recent searches while the field is empty, live sector matches once typing.
  const options = useMemo(() => {
    if (hasQuery) {
      return suggestions.map((s, i) => ({
        key: s.id || s.name || i,
        label: s.name,
        kind: "sector",
      }));
    }
    return recentSearches.map((s, i) => ({
      key: s._id || i,
      label: s.query,
      kind: "recent",
    }));
  }, [hasQuery, suggestions, recentSearches]);

  useEffect(() => setHighlighted(-1), [query]);

  const showDropdown = open && Boolean(user) && options.length > 0;

  const commit = useCallback(
    (value, { search = true } = {}) => {
      onQueryChange(value);
      setOpen(false);
      if (search) onSearch(value);
    },
    [onQueryChange, onSearch]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Escape") return setOpen(false);

    if (showDropdown && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setHighlighted((prev) => {
        const next = e.key === "ArrowDown" ? prev + 1 : prev - 1;
        if (next < 0) return options.length - 1;
        if (next >= options.length) return 0;
        return next;
      });
      return;
    }

    if (e.key === "Enter") {
      const picked = showDropdown && highlighted >= 0 ? options[highlighted] : null;
      if (picked) {
        // A sector suggestion fills the field; a past search runs immediately.
        commit(picked.label, { search: picked.kind === "recent" });
        return;
      }
      onSearch(query);
      setOpen(false);
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.start();
    setListening(true);
    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript;
      setListening(false);
      commit(spoken);
    };
    recognition.onerror = (event) => {
      setListening(false);
      console.error("Voice recognition error:", event.error);
    };
    recognition.onend = () => setListening(false);
  };

  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        overflow: "hidden",
        color: "common.white",
        backgroundColor: "primary.dark",
        pt: { xs: 14, md: 26 },
        pb: { xs: 12, md: 22 },
      }}
    >
      {/* Layered background: photo, brand wash, then a soft teal light source. */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/Dashboard.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.28,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(155deg, rgba(0,31,63,0.94) 0%, rgba(0,51,102,0.88) 48%, rgba(0,78,110,0.82) 100%)",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(60% 55% at 78% 12%, rgba(0,167,157,0.30) 0%, rgba(0,167,157,0) 70%)",
        }}
      />

      <Container
        maxWidth="xl"
        sx={{ position: "relative", px: { xs: 4, sm: 6, md: 8 } }}
      >
        <Box sx={{ maxWidth: 880 }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionDuration.normal, ease: motionEase.decelerate }}
          >
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 5 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "secondary.light",
                }}
              />
              <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.68)" }}>
                Gurgaon · Verified homes
              </Typography>
            </Stack>

            <Typography
              variant="subtitle1"
              sx={{ color: "rgba(255,255,255,0.72)", mb: 2 }}
            >
              {greetingFor()}
              {user?.name ? `, ${String(user.name).split(" ")[0]}` : ""}
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: motionDuration.slow,
              ease: motionEase.decelerate,
              delay: 0.08,
            }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: "clamp(2.5rem, 5.4vw, 4.75rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.03em",
                color: "common.white",
              }}
            >
              Find a place that
              <Box component="span" sx={{ display: "block", color: "secondary.light" }}>
                feels like home.
              </Box>
            </Typography>

            <Typography
              variant="subtitle1"
              sx={{
                mt: 6,
                maxWidth: 520,
                color: "rgba(255,255,255,0.74)",
              }}
            >
              Search every verified rental and resale listing across Gurgaon — by
              sector, budget, or simply how you want to live.
            </Typography>
          </motion.div>
        </Box>

        {/* ---------------- Search command surface ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: motionDuration.slow,
            ease: motionEase.decelerate,
            delay: 0.16,
          }}
        >
          <ClickAwayListener onClickAway={() => setOpen(false)}>
            <Paper
              elevation={0}
              sx={{
                mt: { xs: 8, md: 12 },
                p: { xs: 3, md: 4 },
                borderRadius: `${radii.lg}px`,
                backgroundColor: "rgba(255,255,255,0.97)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 24px 60px rgba(0, 20, 45, 0.32)",
                maxWidth: 1080,
              }}
            >
              <Stack
                direction="row"
                spacing={2}
                sx={{ mb: 3, overflowX: "auto", pb: 1 }}
              >
                {SEARCH_TYPES.map((t) => {
                  const active = String(type).toLowerCase() === t.value.toLowerCase();
                  return (
                    <Chip
                      key={t.value}
                      label={t.label}
                      onClick={() => onTypeChange(t.value)}
                      sx={{
                        px: 2,
                        height: 34,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: active ? "primary.main" : "divider",
                        backgroundColor: active ? "primary.main" : "transparent",
                        color: active ? "common.white" : "text.secondary",
                        transition: "all .2s ease",
                        "&:hover": {
                          backgroundColor: active ? "primary.dark" : "background.default",
                        },
                      }}
                    />
                  );
                })}
              </Stack>

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={3}
                alignItems={{ xs: "stretch", md: "center" }}
              >
                <Box sx={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{
                      px: 4,
                      height: 56,
                      borderRadius: `${radii.md}px`,
                      border: "1px solid",
                      borderColor: open ? "secondary.main" : "divider",
                      backgroundColor: "background.default",
                      transition: "border-color .2s ease, box-shadow .2s ease",
                      boxShadow: open ? "0 0 0 3px rgba(0,167,157,0.14)" : "none",
                    }}
                  >
                    <Search size={20} color="#4A6A8A" aria-hidden />
                    <InputBase
                      inputRef={inputRef}
                      value={query}
                      onChange={(e) => onQueryChange(e.target.value)}
                      onFocus={() => user && setOpen(true)}
                      onKeyDown={handleKeyDown}
                      placeholder='Try “3 BHK in Sector 46” or “under ₹40,000”'
                      inputProps={{
                        "aria-label": "Search properties",
                        "aria-expanded": showDropdown,
                        role: "combobox",
                      }}
                      sx={{ flex: 1, fontSize: 15 }}
                    />
                    <Tooltip title={listening ? "Listening…" : "Search by voice"}>
                      <IconButton
                        onClick={startVoiceSearch}
                        aria-label="Search by voice"
                        sx={{
                          width: 44,
                          height: 44,
                          color: listening ? "error.main" : "secondary.main",
                          position: "relative",
                        }}
                      >
                        {listening && (
                          <Box
                            component={motion.span}
                            aria-hidden
                            animate={{ scale: [1, 1.5], opacity: [0.45, 0] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                            sx={{
                              position: "absolute",
                              inset: 6,
                              borderRadius: "50%",
                              backgroundColor: "error.light",
                            }}
                          />
                        )}
                        <Mic size={20} />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  {/* Suggestions / recent searches */}
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
                          zIndex: 20,
                          borderRadius: `${radii.md}px`,
                          border: "1px solid",
                          borderColor: "divider",
                          backgroundColor: "background.paper",
                          boxShadow: "0 20px 48px rgba(0,20,45,0.18)",
                          overflow: "hidden",
                        }}
                      >
                        <Typography
                          variant="overline"
                          sx={{ display: "block", px: 4, pt: 3, color: "text.secondary" }}
                        >
                          {hasQuery ? "Matching areas" : "Recent searches"}
                        </Typography>
                        <Box sx={{ maxHeight: 280, overflowY: "auto", py: 2 }}>
                          {options.map((option, idx) => {
                            const Icon = option.kind === "sector" ? MapPin : Clock;
                            return (
                              <Stack
                                key={option.key}
                                direction="row"
                                spacing={3}
                                alignItems="center"
                                role="option"
                                aria-selected={highlighted === idx}
                                onMouseEnter={() => setHighlighted(idx)}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  commit(option.label, {
                                    search: option.kind === "recent",
                                  });
                                }}
                                sx={{
                                  px: 4,
                                  py: 3,
                                  cursor: "pointer",
                                  backgroundColor:
                                    highlighted === idx ? "background.default" : "transparent",
                                }}
                              >
                                <Icon size={16} color="#4A6A8A" aria-hidden />
                                <Typography variant="body2" sx={{ color: "text.primary" }}>
                                  {option.label}
                                </Typography>
                              </Stack>
                            );
                          })}
                        </Box>
                      </Box>
                    )}
                  </AnimatePresence>
                </Box>

                <Stack direction="row" spacing={3} sx={{ flexShrink: 0 }}>
                  <Button
                    variant="contained"
                    onClick={() => onSearch(query)}
                    disabled={searching}
                    startIcon={
                      searching ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Search size={18} />
                      )
                    }
                    sx={{
                      height: 56,
                      px: 10,
                      flex: { xs: 1, md: "0 0 auto" },
                      fontSize: 15,
                      transition: "transform .2s ease, box-shadow .2s ease",
                      "&:hover": { transform: "translateY(-1px)" },
                      "&:active": { transform: "translateY(0) scale(0.99)" },
                    }}
                  >
                    {searching ? "Searching" : "Search"}
                  </Button>

                  <Tooltip title="Tell us what you want — we'll match it">
                    <Button
                      variant="outlined"
                      onClick={onOpenPreferences}
                      startIcon={<SlidersHorizontal size={18} />}
                      sx={{
                        height: 56,
                        px: 5,
                        flexShrink: 0,
                        borderColor: "divider",
                        color: "primary.main",
                        display: { xs: "none", sm: "inline-flex" },
                        "&:hover": { borderColor: "primary.main", backgroundColor: "background.default" },
                      }}
                    >
                      Personalise
                    </Button>
                  </Tooltip>
                </Stack>
              </Stack>

              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ mt: 4, overflowX: "auto", pb: 1 }}
              >
                <Typography
                  variant="caption"
                  sx={{ flexShrink: 0, color: "text.secondary" }}
                >
                  Popular
                </Typography>
                {POPULAR_AREAS.map((area) => (
                  <Chip
                    key={area}
                    label={area}
                    size="small"
                    onClick={() => commit(area)}
                    sx={{
                      flexShrink: 0,
                      cursor: "pointer",
                      backgroundColor: "background.default",
                      color: "text.secondary",
                      "&:hover": { backgroundColor: "primary.main", color: "common.white" },
                    }}
                  />
                ))}
              </Stack>
            </Paper>
          </ClickAwayListener>
        </motion.div>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 3, sm: 10 }}
          sx={{ mt: { xs: 8, md: 10 } }}
        >
          {TRUST_MARKERS.map(({ icon: Icon, label }, i) => (
            <Stack
              key={label}
              component={motion.div}
              direction="row"
              spacing={2}
              alignItems="center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.08, duration: motionDuration.normal }}
            >
              <Icon size={16} color="#3FC2B8" aria-hidden />
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>
                {label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
