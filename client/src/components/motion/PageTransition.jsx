import React from "react";
import { motion } from "framer-motion";
import { pageTransitionVariants } from "../../theme/motion";

/**
 * Wraps a single route's element. Used together with <AnimatePresence
 * mode="wait"> keyed on location.pathname in App.js so navigating between
 * pages cross-fades instead of hard-cutting.
 */
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransitionVariants}
    >
      {children}
    </motion.div>
  );
}
