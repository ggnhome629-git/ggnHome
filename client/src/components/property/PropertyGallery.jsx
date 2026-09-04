import React, { useState } from "react";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageIcon, MapPin, ShieldCheck, Video } from "lucide-react";
import { radii, elevationShadows } from "../../theme/theme";

const TRUST_BADGES = ["Verified property", "Trusted listing", "Images verified"];

/**
 * The property detail hero: main image + thumbnail strip, virtual-tour and
 * location entry points, and a photo counter. Shared by both the rental and
 * sale detail pages (previously duplicated once per type, twice more for a
 * separate mobile layout each).
 */
export default function PropertyGallery({ images, hasPanoramas, onOpenVirtualTour, onOpenLocation }) {
  const [index, setIndex] = useState(0);
  const gallery = images.length > 0 ? images : ["/default-property.jpg"];

  const next = () => setIndex((i) => (i + 1) % gallery.length);
  const prev = () => setIndex((i) => (i - 1 + gallery.length) % gallery.length);

  return (
    <Box
      sx={{
        p: { xs: 3, md: 5 },
        borderRadius: `${radii.lg}px`,
        backgroundColor: "background.paper",
        boxShadow: elevationShadows[1],
      }}
    >
      <Box sx={{ position: "relative", borderRadius: `${radii.md}px`, overflow: "hidden", mb: 4 }}>
        <AnimatePresence mode="wait">
          <Box
            component={motion.img}
            key={index}
            src={gallery[index]}
            alt="Property"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onError={(e) => {
              if (e.currentTarget.src !== window.location.origin + "/default-property.jpg") {
                e.currentTarget.src = "/default-property.jpg";
              }
            }}
            sx={{ width: "100%", height: { xs: 260, sm: 380, md: 480 }, objectFit: "cover", display: "block" }}
          />
        </AnimatePresence>

        {hasPanoramas && (
          <Button
            onClick={onOpenVirtualTour}
            startIcon={<Video size={16} />}
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              backgroundColor: "rgba(0,20,45,0.8)",
              color: "common.white",
              px: 4,
              backdropFilter: "blur(6px)",
              "&:hover": { backgroundColor: "primary.dark" },
            }}
          >
            360° virtual tour
          </Button>
        )}

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            position: "absolute",
            bottom: 16,
            left: 16,
            px: 3,
            py: 1.5,
            borderRadius: `${radii.sm}px`,
            backgroundColor: "primary.main",
            color: "common.white",
          }}
        >
          <ImageIcon size={14} />
          <Typography variant="caption" sx={{ color: "inherit", fontWeight: 700 }}>
            {index + 1} / {gallery.length}
          </Typography>
        </Stack>

        <Button
          onClick={onOpenLocation}
          startIcon={<MapPin size={14} />}
          sx={{
            position: "absolute",
            bottom: 16,
            right: 16,
            backgroundColor: "rgba(0,0,0,0.72)",
            color: "common.white",
            px: 3,
            backdropFilter: "blur(6px)",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.85)" },
          }}
        >
          Location
        </Button>

        {gallery.length > 1 && (
          <>
            <IconButton
              onClick={prev}
              aria-label="Previous photo"
              sx={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                backgroundColor: "secondary.main",
                color: "common.white",
                "&:hover": { backgroundColor: "secondary.dark" },
              }}
            >
              <ChevronLeft size={22} />
            </IconButton>
            <IconButton
              onClick={next}
              aria-label="Next photo"
              sx={{
                position: "absolute",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
                backgroundColor: "secondary.main",
                color: "common.white",
                "&:hover": { backgroundColor: "secondary.dark" },
              }}
            >
              <ChevronRight size={22} />
            </IconButton>
          </>
        )}
      </Box>

      {gallery.length > 1 && (
        <Stack direction="row" spacing={3} sx={{ overflowX: "auto", pb: 1 }}>
          {gallery.map((img, i) => (
            <Box
              key={i}
              component="img"
              src={img}
              alt={`Thumbnail ${i + 1}`}
              onClick={() => setIndex(i)}
              onError={(e) => {
                e.currentTarget.src = "/default-property.jpg";
              }}
              sx={{
                width: 110,
                height: 82,
                objectFit: "cover",
                borderRadius: `${radii.sm}px`,
                cursor: "pointer",
                flexShrink: 0,
                border: "3px solid",
                borderColor: i === index ? "secondary.main" : "transparent",
                opacity: i === index ? 1 : 0.6,
                transition: "opacity .2s ease",
              }}
            />
          ))}
        </Stack>
      )}

      <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mt: 4 }}>
        {TRUST_BADGES.map((label) => (
          <Stack
            key={label}
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ px: 3, py: 1, borderRadius: 999, border: "1px solid", borderColor: "secondary.main" }}
          >
            <ShieldCheck size={13} color="#00A79D" />
            <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>
              {label}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Typography
        variant="caption"
        sx={{ display: "block", textAlign: "center", mt: 3, color: "text.secondary" }}
      >
        For privacy, front and back images are shared individually via WhatsApp upon enquiry.
      </Typography>
    </Box>
  );
}
