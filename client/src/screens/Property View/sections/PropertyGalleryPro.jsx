import React, { useCallback, useEffect, useState } from "react";
import { Box, Chip, Dialog, IconButton, Stack, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, Video, X } from "lucide-react";
import { radii } from "../../../theme/theme";

const FALLBACK = "/default-property.jpg";

function GalleryImage({ src, alt, priority, sx, onClick }) {
  return (
    <Box
      component="img"
      src={src || FALLBACK}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding={priority ? "sync" : "async"}
      onClick={onClick}
      onError={(e) => {
        if (!e.currentTarget.src.endsWith(FALLBACK)) e.currentTarget.src = FALLBACK;
      }}
      sx={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
        cursor: "pointer",
        transition: "transform .5s ease",
        "&:hover": { transform: "scale(1.03)" },
        ...sx,
      }}
    />
  );
}

/**
 * Editorial gallery: one hero frame with a 2×2 support grid, a "+N photos"
 * affordance, and a full-screen lightbox with keyboard, thumbnail and swipe
 * navigation. Media tabs only appear for media the listing actually has.
 */
export default function PropertyGalleryPro({
  images = [],
  panoramas = [],
  videos = [],
  onOpenVirtualTour,
  onEvent,
}) {
  const gallery = images.length > 0 ? images : [FALLBACK];
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [tab, setTab] = useState("photos");
  const [touchStart, setTouchStart] = useState(null);

  const isOpen = lightboxIndex >= 0;

  const close = useCallback(() => setLightboxIndex(-1), []);
  const next = useCallback(() => setLightboxIndex((i) => (i + 1) % gallery.length), [gallery.length]);
  const prev = useCallback(() => setLightboxIndex((i) => (i - 1 + gallery.length) % gallery.length), [gallery.length]);

  const open = (index) => {
    setLightboxIndex(index);
    onEvent?.("gallery_open", { index });
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close, next, prev]);

  useEffect(() => {
    if (isOpen) onEvent?.("image_view", { index: lightboxIndex });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex]);

  const tabs = [
    { key: "photos", label: `Photos (${gallery.length})` },
    panoramas.length > 0 && { key: "tour", label: "360° tour" },
    videos.length > 0 && { key: "videos", label: "Videos" },
  ].filter(Boolean);

  const supportImages = gallery.slice(1, 5);
  const remaining = Math.max(0, gallery.length - 5);

  return (
    <Box>
      {tabs.length > 1 && (
        <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
          {tabs.map((t) => (
            <Chip
              key={t.key}
              label={t.label}
              onClick={() => {
                setTab(t.key);
                if (t.key === "tour") {
                  onOpenVirtualTour?.();
                  onEvent?.("virtual_tour_open");
                }
              }}
              sx={{
                fontWeight: 600,
                backgroundColor: tab === t.key ? "primary.main" : "background.paper",
                color: tab === t.key ? "common.white" : "text.secondary",
                border: "1px solid",
                borderColor: tab === t.key ? "primary.main" : "divider",
                "&:hover": { backgroundColor: tab === t.key ? "primary.dark" : "background.default" },
              }}
            />
          ))}
        </Stack>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: supportImages.length > 0 ? "2fr 1fr" : "1fr" },
          borderRadius: `${radii.lg}px`,
          overflow: "hidden",
        }}
      >
        <Box sx={{ position: "relative", height: { xs: 260, sm: 360, md: 460 }, overflow: "hidden" }}>
          <GalleryImage src={gallery[0]} alt="Property main view" priority onClick={() => open(0)} />
          {panoramas.length > 0 && (
            <Chip
              icon={<Video size={14} />}
              label="360° tour"
              onClick={() => {
                onOpenVirtualTour?.();
                onEvent?.("virtual_tour_open");
              }}
              sx={{
                position: "absolute",
                top: 16,
                left: 16,
                fontWeight: 700,
                backgroundColor: "rgba(0,20,45,0.82)",
                color: "common.white",
                backdropFilter: "blur(6px)",
                "& .MuiChip-icon": { color: "inherit" },
                "&:hover": { backgroundColor: "primary.main" },
              }}
            />
          )}
        </Box>

        {supportImages.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: "repeat(2, 1fr)",
              gridTemplateRows: "repeat(2, 1fr)",
              height: { xs: 180, sm: 240, md: 460 },
            }}
          >
            {supportImages.map((img, i) => {
              const isLast = i === supportImages.length - 1 && remaining > 0;
              return (
                <Box key={i} sx={{ position: "relative", overflow: "hidden" }}>
                  <GalleryImage src={img} alt={`Property view ${i + 2}`} onClick={() => open(i + 1)} />
                  {isLast && (
                    <Stack
                      onClick={() => open(i + 1)}
                      alignItems="center"
                      justifyContent="center"
                      spacing={1}
                      sx={{
                        position: "absolute",
                        inset: 0,
                        cursor: "pointer",
                        backgroundColor: "rgba(0,20,45,0.62)",
                        color: "common.white",
                      }}
                    >
                      <Expand size={20} />
                      <Typography variant="body2" sx={{ color: "inherit", fontWeight: 700 }}>
                        +{remaining} photos
                      </Typography>
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <Dialog fullScreen open={isOpen} onClose={close} slotProps={{ paper: { sx: { backgroundColor: "rgba(4,12,24,0.98)" } } }}>
        <Stack sx={{ height: "100%" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 4 }}>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
              {lightboxIndex + 1} / {gallery.length}
            </Typography>
            <IconButton onClick={close} aria-label="Close gallery" sx={{ color: "common.white" }}>
              <X size={22} />
            </IconButton>
          </Stack>

          <Box
            sx={{ flex: 1, position: "relative", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            onTouchStart={(e) => setTouchStart(e.changedTouches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStart === null) return;
              const delta = touchStart - e.changedTouches[0].clientX;
              if (delta > 50) next();
              if (delta < -50) prev();
              setTouchStart(null);
            }}
          >
            <AnimatePresence mode="wait">
              <Box
                component={motion.img}
                key={lightboxIndex}
                src={gallery[lightboxIndex] || FALLBACK}
                alt={`Property photo ${lightboxIndex + 1}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                sx={{ maxWidth: "94%", maxHeight: "100%", objectFit: "contain" }}
              />
            </AnimatePresence>

            {gallery.length > 1 && (
              <>
                <IconButton
                  onClick={prev}
                  aria-label="Previous photo"
                  sx={{ position: "absolute", left: 12, color: "common.white", backgroundColor: "rgba(255,255,255,0.12)" }}
                >
                  <ChevronLeft size={24} />
                </IconButton>
                <IconButton
                  onClick={next}
                  aria-label="Next photo"
                  sx={{ position: "absolute", right: 12, color: "common.white", backgroundColor: "rgba(255,255,255,0.12)" }}
                >
                  <ChevronRight size={24} />
                </IconButton>
              </>
            )}
          </Box>

          {gallery.length > 1 && (
            <Stack direction="row" spacing={2} sx={{ p: 4, overflowX: "auto" }}>
              {gallery.map((img, i) => (
                <Box
                  key={i}
                  component="img"
                  src={img}
                  alt={`Thumbnail ${i + 1}`}
                  loading="lazy"
                  onClick={() => setLightboxIndex(i)}
                  onError={(e) => {
                    if (!e.currentTarget.src.endsWith(FALLBACK)) e.currentTarget.src = FALLBACK;
                  }}
                  sx={{
                    width: 92,
                    height: 66,
                    flexShrink: 0,
                    objectFit: "cover",
                    borderRadius: `${radii.sm}px`,
                    cursor: "pointer",
                    opacity: i === lightboxIndex ? 1 : 0.45,
                    border: "2px solid",
                    borderColor: i === lightboxIndex ? "secondary.main" : "transparent",
                  }}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Dialog>
    </Box>
  );
}
