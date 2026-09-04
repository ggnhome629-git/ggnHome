import React, { useState } from "react";
import { motion } from "framer-motion";
import { Box, Skeleton } from "@mui/material";
import { motionDuration } from "../../theme/motion";

/**
 * Property/image loading with a skeleton placeholder (correct aspect ratio,
 * no layout shift) that crossfades into the real image once loaded, with an
 * optional very subtle zoom-in ("Ken Burns") for hero-style usage.
 *
 * <ImageReveal src={url} alt="..." aspectRatio="4 / 3" kenBurns />
 */
export default function ImageReveal({
  src,
  alt = "",
  aspectRatio = "4 / 3",
  kenBurns = false,
  sx,
  imgSx,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);

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
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        initial={{ opacity: 0, scale: kenBurns ? 1.08 : 1 }}
        animate={
          loaded
            ? { opacity: 1, scale: kenBurns ? 1 : 1 }
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
