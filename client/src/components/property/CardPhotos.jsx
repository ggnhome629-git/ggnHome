import React, { useRef, useState } from "react";
import { Box, IconButton } from "@mui/material";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ImageReveal from "../motion/ImageReveal";
import { cloudinaryUrl } from "../../utils/cloudinaryImage";

const MAX_PHOTOS = 6;

const arrowSx = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 2,
  width: 32,
  height: 32,
  backgroundColor: "rgba(255,255,255,0.92)",
  color: "primary.main",
  opacity: 0,
  transition: "opacity .2s ease",
  "&:hover": { backgroundColor: "common.white" },
  "@media (hover: none)": { display: "none" },
};

/**
 * Card photo strip: swipe on touch, arrows on hover, dots for position.
 * The first photo uses ImageReveal (skeleton + fade); the rest lazy-load only
 * when scrolled into view, so a card costs one image until someone browses it.
 */
export default function CardPhotos({ images, alt, aspectRatio, width, widths, sizes, fill }) {
  const photos = (images || []).filter(Boolean).slice(0, MAX_PHOTOS);
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);

  if (photos.length <= 1) {
    return (
      <ImageReveal
        src={photos[0] || "/default-property.jpg"}
        alt={alt}
        aspectRatio={aspectRatio}
        width={width}
        widths={widths}
        sizes={sizes}
        sx={fill ? { height: "100%" } : undefined}
      />
    );
  }

  const go = (e, dir) => {
    e.stopPropagation();
    e.preventDefault();
    const el = trackRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(photos.length - 1, index + dir));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  return (
    <Box
      sx={{
        position: "relative",
        aspectRatio,
        height: fill ? "100%" : undefined,
        "&:hover .card-photo-arrow": { opacity: 1 },
      }}
    >
      <Box
        ref={trackRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        sx={{
          display: "flex",
          height: "100%",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {photos.map((src, i) => (
          <Box key={`${src}-${i}`} sx={{ flex: "0 0 100%", height: "100%", scrollSnapAlign: "start", overflow: "hidden" }}>
            {i === 0 ? (
              <ImageReveal src={src} alt={alt} aspectRatio={aspectRatio} width={width} widths={widths} sizes={sizes} sx={{ height: "100%" }} />
            ) : (
              <Box
                component="img"
                src={cloudinaryUrl(src, { width })}
                alt=""
                loading="lazy"
                decoding="async"
                sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", backgroundColor: "background.default" }}
              />
            )}
          </Box>
        ))}
      </Box>

      {index > 0 && (
        <IconButton className="card-photo-arrow" size="small" aria-label="Previous photo" onClick={(e) => go(e, -1)} sx={{ ...arrowSx, left: 8 }}>
          <ChevronLeft size={18} />
        </IconButton>
      )}
      {index < photos.length - 1 && (
        <IconButton className="card-photo-arrow" size="small" aria-label="Next photo" onClick={(e) => go(e, 1)} sx={{ ...arrowSx, right: 8 }}>
          <ChevronRight size={18} />
        </IconButton>
      )}

      <Box
        aria-hidden
        sx={{
          position: "absolute",
          bottom: 14,
          right: 12,
          zIndex: 2,
          display: "flex",
          gap: "5px",
        }}
      >
        {photos.map((_, i) => (
          <Box
            key={i}
            sx={{
              width: i === index ? 16 : 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: i === index ? "common.white" : "rgba(255,255,255,0.6)",
              transition: "width .25s ease, background-color .25s ease",
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
