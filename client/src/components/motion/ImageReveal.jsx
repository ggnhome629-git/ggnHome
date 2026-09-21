import React, { useState } from "react";
import { motion } from "framer-motion";
import { Box, Skeleton } from "@mui/material";
import { motionDuration } from "../../theme/motion";
import { cloudinarySrcSet, cloudinaryUrl } from "../../utils/cloudinaryImage";

/**
 * Property/image loading with a skeleton placeholder (correct aspect ratio,
 * no layout shift) that crossfades into the real image once loaded, with an
 * optional very subtle zoom-in ("Ken Burns") for hero-style usage.
 *
 * Cloudinary sources are rewritten to deliver a correctly sized, auto-format
 * image rather than the original upload — see utils/cloudinaryImage.
 *
 * <ImageReveal src={url} alt="..." aspectRatio="4 / 3" width={600} kenBurns />
 */
export default function ImageReveal({
  src,
  alt = "",
  aspectRatio = "4 / 3",
  kenBurns = false,
  width = 800,
  widths,
  sizes,
  // Above-the-fold images (a detail-page hero) should not be lazy-loaded —
  // deferring them delays the largest paint the user is waiting on.
  priority = false,
  sx,
  imgSx,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const optimizedSrc = cloudinaryUrl(src, { width });
  const srcSet = cloudinarySrcSet(src, widths);

  return (
    <Box sx={{ position: "relative", overflow: "hidden", aspectRatio, ...sx }} {...rest}>
      {!loaded && (
        <Skeleton
          variant="rectangular"
          animation="wave"
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      )}
      <motion.img
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={srcSet ? sizes || "(max-width: 600px) 90vw, (max-width: 900px) 45vw, 25vw" : undefined}
        alt={alt}
        onLoad={() => setLoaded(true)}
        // A broken image should still clear the skeleton rather than leaving a
        // shimmering placeholder on the card forever.
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchpriority={priority ? "high" : undefined}
        initial={{ opacity: 0, scale: kenBurns ? 1.08 : 1 }}
        animate={
          loaded
            ? { opacity: failed ? 0 : 1, scale: kenBurns ? 1 : 1 }
            : { opacity: 0 }
        }
        transition={{ duration: kenBurns ? motionDuration.slow * 2 : motionDuration.normal }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          ...imgSx,
        }}
      />
    </Box>
  );
}
