import { motionDuration, motionEase } from "./theme";

// Re-exported so components/motion/* can import all motion tokens (variants
// and raw duration/easing values) from this single module.
export { motionDuration, motionEase };

// Shared Framer Motion variants. Every reveal/transition component in
// src/components/motion pulls from here so timing and easing stay identical
// across the whole app instead of each page inventing its own numbers.

export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: motionDuration.normal, ease: motionEase.decelerate },
  },
};

export const slideUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDuration.normal, ease: motionEase.decelerate },
  },
};

export const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: motionDuration.normal, ease: motionEase.decelerate },
  },
};

export const staggerContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

// Used by <StaggerItem> children — reuses the same slide-up motion so a
// staggered grid looks like a natural extension of a single reveal, not a
// different effect.
export const staggerItemVariants = slideUpVariants;

// Applied to a route's outer wrapper via AnimatePresence in App.js.
export const pageTransitionVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDuration.normal, ease: motionEase.decelerate },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: motionDuration.fast, ease: motionEase.accelerate },
  },
};

export const hoverLiftTransition = {
  duration: motionDuration.fast,
  ease: motionEase.standard,
};
