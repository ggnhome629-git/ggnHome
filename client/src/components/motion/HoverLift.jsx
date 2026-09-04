import React from "react";
import { motion } from "framer-motion";
import { hoverLiftTransition } from "../../theme/motion";

/**
 * Subtle lift + shadow used on property cards and other clickable surfaces.
 * Deliberately restrained (scale 1.02, small -y) — see redesign brief:
 * "do not exaggerate the effect."
 */
export default function HoverLift({ children, scale = 1.02, lift = 4, style, ...rest }) {
  return (
    <motion.div
      whileHover={{ scale, y: -lift }}
      whileTap={{ scale: 0.99 }}
      transition={hoverLiftTransition}
      style={{ willChange: "transform", ...style }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
