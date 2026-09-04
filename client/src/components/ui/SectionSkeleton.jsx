import React from "react";
import { Box, Container, Skeleton, Stack } from "@mui/material";
import { radii } from "../../theme/theme";

/**
 * Suspense fallbacks that hold the same shape as the content they stand in for,
 * so a lazily-loaded section fades in without shifting the page. Never render
 * `null` while a section loads — the user should always see structure.
 */
export default function SectionSkeleton({ variant = "cards", count = 4, height = 280 }) {
  if (variant === "band") {
    return (
      <Skeleton
        variant="rectangular"
        height={height}
        sx={{ borderRadius: 0 }}
        animation="wave"
      />
    );
  }

  if (variant === "row") {
    return (
      <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 8, md: 12 } }}>
        <Skeleton variant="text" width={220} height={40} sx={{ mb: 6 }} />
        <Stack direction="row" spacing={4} sx={{ overflow: "hidden" }}>
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              animation="wave"
              sx={{
                borderRadius: `${radii.lg}px`,
                height,
                flex: 1,
                minWidth: { xs: "80%", sm: "45%", md: 0 },
              }}
            />
          ))}
        </Stack>
      </Container>
    );
  }

  // "cards" — a responsive grid of card placeholders.
  return (
    <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 8, md: 12 } }}>
      <Box
        sx={{
          display: "grid",
          gap: 4,
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            md: `repeat(${Math.min(count, 4)}, 1fr)`,
          },
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            animation="wave"
            height={height}
            sx={{ borderRadius: `${radii.lg}px` }}
          />
        ))}
      </Box>
    </Container>
  );
}
