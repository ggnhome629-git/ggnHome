import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  ClickAwayListener,
  Container,
  IconButton,
  InputBase,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, MapPin, Mic, Search } from "lucide-react";
import useVoiceSearch from "./useVoiceSearch";
import { radii } from "../../theme/theme";

const TYPES = [
  { value: "All", label: "All" },
  { value: "Rent", label: "Rent" },
  { value: "Sale", label: "Buy" },
];

/**
 * Compact search that stays pinned under the navbar once the hero search has
 * scrolled out of view, so searching is one tap away anywhere on the page.
 * Renders a 1px sentinel in flow; the bar itself is fixed-position.
 */
export default function StickySearchBar({
  query,
  onQueryChange,
  onSearch,
  type,
  onTypeChange,
  recentSearches = [],
  suggestions = [],
  searching = false,
}) {
  const sentinelRef = useRef(null);
  const [pinned, setPinned] = useState(false);
  const [navHeight, setNavHeight] = useState(64);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const { listening, start, supported } = useVoiceSearch((spoken) => {
    onQueryChange(spoken);
    onSearch(spoken);
  });

  // Show once the sentinel (placed right after the hero) is above the viewport.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setPinned(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Sit directly under the (sticky) navbar whatever height it currently has.
  useEffect(() => {
    const nav = document.querySelector("nav");
    if (!nav || typeof ResizeObserver === "undefined") return undefined;
    const update = () => setNavHeight(nav.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  const hasQuery = Boolean(query.trim());
  const options = useMemo(
    () =>
      hasQuery
        ? suggestions.map((s, i) => ({ key: s.id || s.name || i, label: s.name, kind: "sector" }))
        : recentSearches.map((s, i) => ({ key: s._id || i, label: s.query, kind: "recent" })),
    [hasQuery, suggestions, recentSearches]
  );
  const showDropdown = pinned && open && options.length > 0;

  useEffect(() => setHighlighted(-1), [query]);

  const pick = (option) => {
    onQueryChange(option.label);
    setOpen(false);
    if (option.kind === "recent") onSearch(option.label);
  };

  const submit = () => {
    setOpen(false);
    onSearch(query);
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
      if (showDropdown && highlighted >= 0) return pick(options[highlighted]);
      submit();
    }
  };

  return (
    <>
      <Box ref={sentinelRef} aria-hidden sx={{ height: "1px", mt: "-1px" }} />
      <AnimatePresence>
        {pinned && (
          <Box
            component={motion.div}
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.2 }}
            sx={{
              position: "fixed",
              top: navHeight,
              left: 0,
              right: 0,
              zIndex: 999,
              py: { xs: 2, md: 2.5 },
              backgroundColor: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(10px)",
              borderBottom: "1px solid",
              borderColor: "divider",
              boxShadow: "0 6px 20px rgba(0,31,63,0.10)",
            }}
          >
            <Container maxWidth="xl" sx={{ px: { xs: 3, sm: 6, md: 8 } }}>
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <Stack direction="row" spacing={{ xs: 2, md: 3 }} alignItems="center">
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={type}
                    onChange={(_, v) => v && onTypeChange(v)}
                    aria-label="Property type"
                    sx={{
                      display: { xs: "none", sm: "inline-flex" },
                      flexShrink: 0,
                      "& .MuiToggleButton-root": {
                        px: 4,
                        textTransform: "none",
                        fontWeight: 600,
                      },
                    }}
                  >
                    {TYPES.map((t) => (
                      <ToggleButton key={t.value} value={t.value}>
                        {t.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>

                  <Box sx={{ position: "relative", flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      sx={{
                        px: 3,
                        height: 44,
                        borderRadius: `${radii.md}px`,
                        border: "1px solid",
                        borderColor: open ? "secondary.main" : "divider",
                        backgroundColor: "background.default",
                      }}
                    >
                      <Search size={18} color="#4A6A8A" aria-hidden />
                      <InputBase
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        onFocus={() => setOpen(true)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search by sector, BHK or budget"
                        inputProps={{ "aria-label": "Search properties" }}
                        sx={{ flex: 1, fontSize: 14 }}
                      />
                      {supported && (
                        <IconButton
                          size="small"
                          onClick={start}
                          aria-label={listening ? "Stop listening" : "Search by voice"}
                          sx={{ color: listening ? "error.main" : "secondary.main" }}
                        >
                          <Mic size={18} />
                        </IconButton>
                      )}
                    </Stack>

                    {showDropdown && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          left: 0,
                          right: 0,
                          borderRadius: `${radii.md}px`,
                          border: "1px solid",
                          borderColor: "divider",
                          backgroundColor: "background.paper",
                          boxShadow: "0 16px 40px rgba(0,20,45,0.18)",
                          maxHeight: 260,
                          overflowY: "auto",
                          py: 1,
                        }}
                      >
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
                                pick(option);
                              }}
                              sx={{
                                px: 4,
                                py: 2.5,
                                cursor: "pointer",
                                backgroundColor:
                                  highlighted === idx ? "background.default" : "transparent",
                              }}
                            >
                              <Icon size={15} color="#4A6A8A" aria-hidden />
                              <Typography variant="body2">{option.label}</Typography>
                            </Stack>
                          );
                        })}
                      </Box>
                    )}
                  </Box>

                  <Box
                    component="button"
                    type="button"
                    onClick={submit}
                    disabled={searching}
                    aria-label="Search"
                    sx={{
                      flexShrink: 0,
                      height: 44,
                      px: { xs: 4, md: 8 },
                      border: 0,
                      borderRadius: `${radii.md}px`,
                      cursor: "pointer",
                      font: "inherit",
                      fontWeight: 600,
                      color: "common.white",
                      backgroundColor: "primary.main",
                      "&:hover": { backgroundColor: "primary.dark" },
                      "&:disabled": { opacity: 0.7, cursor: "default" },
                    }}
                  >
                    <Search size={18} style={{ verticalAlign: "middle" }} aria-hidden />
                    <Box component="span" sx={{ ml: 2, display: { xs: "none", sm: "inline" } }}>
                      {searching ? "Searching" : "Search"}
                    </Box>
                  </Box>
                </Stack>
              </ClickAwayListener>
            </Container>
          </Box>
        )}
      </AnimatePresence>
    </>
  );
}
