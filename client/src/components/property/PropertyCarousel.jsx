import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Container, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { StaggerItem } from "../motion";
import { staggerContainerVariants } from "../../theme/motion";
import PropertyCard, { propertyDetailPath } from "./PropertyCard";
import { radii, elevationShadows } from "../../theme/theme";

const CARD_WIDTH = { xs: "82%", sm: "46%", md: "31%", lg: "23%" };
const MotionBox = motion(Box);

/**
 * Shared horizontal property carousel. Native scroll + snap (no transform
 * math, no wheel-hijacking) so touch/trackpad panning stays natural; arrows
 * are a convenience layered on top, not the only way to move.
 *
 * Used for both the main "Recommended for you" rail and "Properties in your
 * area" — the two previously-duplicated implementations in the Dashboard
 * folder.
 */
export default function PropertyCarousel({
  title,
  subtitle,
  properties = [],
  user,
  requireAuth = true,
  onPropertyClick,
  onSeeAll,
  autoScroll = false,
  emptyTitle = "No properties to show yet",
  emptyDescription = "Check back soon, or explore everything we have listed.",
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isMd = useMediaQuery(theme.breakpoints.between("md", "lg"));
  const itemsPerPage = isXs ? 1 : isSm ? 2 : isMd ? 3 : 4;

  const trackRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [hovered, setHovered] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, properties.length]);

  const scrollByPage = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  // Ambient auto-advance for the primary rail only; pauses on hover and loops
  // back to the start once it reaches the end.
  useEffect(() => {
    if (!autoScroll || hovered || properties.length <= itemsPerPage) return undefined;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: el.clientWidth / itemsPerPage, behavior: "smooth" });
      }
    }, 4000);
    return () => clearInterval(id);
  }, [autoScroll, hovered, itemsPerPage, properties.length]);

  const visibleProperties = useMemo(
    () => properties.filter((p) => p?.isActive !== false),
    [properties]
  );

  const goToProperty = (property) => {
    if (onPropertyClick) onPropertyClick(property._id);
    navigate(!requireAuth || user ? propertyDetailPath(property) : "/login");
  };

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 8, md: 12 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "flex-end" }}
        spacing={4}
        sx={{ mb: 8 }}
      >
        <Box>
          <Typography variant="h2" sx={{ color: "primary.main" }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" sx={{ color: "text.secondary", mt: 2 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {onSeeAll && visibleProperties.length > 0 && (
          <Button
            onClick={onSeeAll}
            endIcon={<ChevronRight size={18} />}
            sx={{
              color: "secondary.main",
              flexShrink: 0,
              px: 0,
              "&:hover": { background: "transparent", color: "primary.main" },
            }}
          >
            See all properties
          </Button>
        )}
      </Stack>

      {visibleProperties.length === 0 ? (
        <Stack
          alignItems="center"
          spacing={4}
          sx={{
            py: 12,
            px: 6,
            textAlign: "center",
            borderRadius: `${radii.lg}px`,
            border: "1px dashed",
            borderColor: "divider",
          }}
        >
          <SearchX size={28} color="#4A6A8A" />
          <Typography variant="h4" sx={{ color: "primary.main" }}>
            {emptyTitle}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 360 }}>
            {emptyDescription}
          </Typography>
        </Stack>
      ) : (
        <Box sx={{ position: "relative" }}>
          {canScrollPrev && (
            <IconButton
              onClick={() => scrollByPage(-1)}
              aria-label="Scroll left"
              sx={{
                display: { xs: "none", md: "flex" },
                position: "absolute",
                left: -22,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 2,
                width: 48,
                height: 48,
                backgroundColor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: elevationShadows[2],
                "&:hover": { backgroundColor: "primary.main", color: "common.white", borderColor: "primary.main" },
              }}
            >
              <ChevronLeft size={22} />
            </IconButton>
          )}

          <MotionBox
            ref={trackRef}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainerVariants}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            sx={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              pb: 1,
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {visibleProperties.map((property, idx) => (
              <Box
                key={property._id || property.id || idx}
                sx={{ flexShrink: 0, scrollSnapAlign: "start", width: CARD_WIDTH }}
              >
                <StaggerItem style={{ height: "100%" }}>
                  <PropertyCard property={property} onClick={() => goToProperty(property)} />
                </StaggerItem>
              </Box>
            ))}
          </MotionBox>

          {canScrollNext && (
            <IconButton
              onClick={() => scrollByPage(1)}
              aria-label="Scroll right"
              sx={{
                display: { xs: "none", md: "flex" },
                position: "absolute",
                right: -22,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 2,
                width: 48,
                height: 48,
                backgroundColor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: elevationShadows[2],
                "&:hover": { backgroundColor: "primary.main", color: "common.white", borderColor: "primary.main" },
              }}
            >
              <ChevronRight size={22} />
            </IconButton>
          )}
        </Box>
      )}
    </Container>
  );
}
