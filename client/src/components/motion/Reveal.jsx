import React from "react";
import { motion } from "framer-motion";
import { fadeInVariants, slideUpVariants, scaleInVariants } from "../../theme/motion";

const VARIANT_MAP = {
  fade: fadeInVariants,
  slideUp: slideUpVariants,
  scale: scaleInVariants,
};

/**
 * Generic scroll-triggered reveal. Animates once when it enters the
 * viewport and never replays, per the "don't continuously replay scroll
 * animations" rule.
 *
 * <Reveal type="slideUp" delay={0.1}>...</Reveal>
 */
export default function Reveal({
  children,
  type = "slideUp",
  delay = 0,
  amount = 0.2,
  as = "div",
  ...rest
}) {
  const variants = VARIANT_MAP[type] || slideUpVariants;
  const MotionTag = motion[as] || motion.div;

  return (
    <MotionTag
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={{
        hidden: variants.hidden,
        visible: {
          ...variants.visible,
          transition: { ...variants.visible.transition, delay },
        },
      }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

// Thin named wrappers for readability at call sites, matching the spec's
// naming (FadeIn / SlideUp / ScaleIn) while sharing one implementation.
export const FadeIn = (props) => <Reveal type="fade" {...props} />;
export const SlideUp = (props) => <Reveal type="slideUp" {...props} />;
export const ScaleIn = (props) => <Reveal type="scale" {...props} />;
