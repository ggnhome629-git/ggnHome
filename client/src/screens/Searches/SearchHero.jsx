import React from "react";
import { Box, Chip, ClickAwayListener, Container, InputBase, Stack, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, MapPin, Search } from "lucide-react";
import { motionDuration } from "../../theme/motion";
import { radii } from "../../theme/theme";

const BHK_QUICK_FILTERS = [
  { label: "1 BHK", value: "1" },
  { label: "2 BHK", value: "2" },
  { label: "3 BHK", value: "3" },
  { label: "4 BHK", value: "4" },
];

/**
 * The search page's own hero: title + one search field, with recent
 * searches and live area suggestions underneath. Kept visually consistent
 * with the dashboard hero but without the segmented type toggle — that
 * lives in the sticky toolbar below, next to sort and view mode.
 */
export default function SearchHero({
  query,
  onQueryChange,
  onSearch,
  showSuggestions,
  onFocus,
  onBlur,
  recentSearches,
  areaSuggestions,
  onPickSuggestion,
  onQuickFilter,
  activeBhk,
}) {
  const hasDropdown = showSuggestions && (recentSearches.length > 0 || areaSuggestions.length > 0);

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: "primary.dark",
        pt: { xs: 8, md: 10 },
        pb: { xs: 8, md: 10 },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(60% 60% at 15% 20%, rgba(34,211,238,0.14) 0%, rgba(34,211,238,0) 60%), radial-gradient(50% 50% at 85% 80%, rgba(0,167,157,0.14) 0%, rgba(0,167,157,0) 60%)",
        }}
      />

      <Container maxWidth="md" sx={{ position: "relative", textAlign: "center" }}>
        <Typography variant="h1" sx={{ color: "common.white", fontSize: { xs: "1.9rem", md: "2.6rem" }, mb: 3 }}>
          Find your dream home
        </Typography>
        <Typography variant="subtitle1" sx={{ color: "rgba(255,255,255,0.72)", mb: 8 }}>
          Discover perfect homes that match your lifestyle and budget
        </Typography>

        <ClickAwayListener onClickAway={onBlur}>
          <Box sx={{ position: "relative", maxWidth: 640, mx: "auto" }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={3}
              sx={{
                px: 5,
                height: 60,
                borderRadius: `${radii.md}px`,
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(16px)",
              }}
            >
              <Search size={20} color="#FFFFFF" style={{ flexShrink: 0, opacity: 0.85 }} />
              <InputBase
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onFocus={onFocus}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) onSearch(query);
                }}
                placeholder="Search by location, BHK, sqft, or project…"
                sx={{
                  flex: 1,
                  color: "common.white",
                  fontSize: 15,
                  "& input::placeholder": { color: "rgba(255,255,255,0.6)", opacity: 1 },
                }}
              />
            </Stack>

            <AnimatePresence>
              {hasDropdown && (
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
                    backgroundColor: "background.paper",
                    boxShadow: "0 20px 48px rgba(0,20,45,0.28)",
                    overflow: "hidden",
                    textAlign: "left",
                  }}
                >
                  {recentSearches.length > 0 && (
                    <Box sx={{ py: 2 }}>
                      <Typography variant="overline" sx={{ display: "block", px: 4, pt: 2, color: "text.secondary" }}>
                        Recent searches
                      </Typography>
                      {recentSearches.map((search, idx) => (
                        <Stack
                          key={`recent-${idx}`}
                          direction="row"
                          spacing={3}
                          alignItems="center"
                          onMouseDown={() => onPickSuggestion(search)}
                          sx={{ px: 4, py: 3, cursor: "pointer", "&:hover": { backgroundColor: "background.default" } }}
                        >
                          <Clock size={15} color="#00A79D" />
                          <Typography variant="body2">{search}</Typography>
                        </Stack>
                      ))}
                    </Box>
                  )}

                  {areaSuggestions.length > 0 && (
                    <Box sx={{ py: 2 }}>
                      <Typography variant="overline" sx={{ display: "block", px: 4, pt: 2, color: "text.secondary" }}>
                        Matching locations
                      </Typography>
                      {areaSuggestions.map((suggestion, idx) => (
                        <Stack
                          key={`area-${idx}`}
                          direction="row"
                          spacing={3}
                          alignItems="center"
                          onMouseDown={() => onPickSuggestion(suggestion)}
                          sx={{ px: 4, py: 3, cursor: "pointer", "&:hover": { backgroundColor: "background.default" } }}
                        >
                          <MapPin size={15} color="#00A79D" />
                          <Typography variant="body2">{suggestion}</Typography>
                        </Stack>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </AnimatePresence>
          </Box>
        </ClickAwayListener>

        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mt: 6 }}>
          {BHK_QUICK_FILTERS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              onClick={() => onQuickFilter(f.value)}
              sx={{
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.28)",
                backgroundColor: activeBhk === f.value ? "secondary.main" : "rgba(255,255,255,0.1)",
                color: "common.white",
                "&:hover": { backgroundColor: "secondary.main" },
              }}
            />
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
