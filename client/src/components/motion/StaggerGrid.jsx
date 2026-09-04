import React from "react";
import { motion } from "framer-motion";
import { staggerContainerVariants, staggerItemVariants } from "../../theme/motion";

/**
 * Wrap a grid/list of cards so children reveal in a short natural sequence
 * instead of all popping in at once. Children should be <StaggerItem>.
 *
 * <StaggerContainer>
 *   {items.map(i => <StaggerItem key={i.id}><PropertyCard .../></StaggerItem>)}
 * </StaggerContainer>
 */
export const StaggerContainer = React.forwardRef(function StaggerContainer(
  { children, amount = 0.1, ...rest },
  ref
) {
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={staggerContainerVariants}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

export function StaggerItem({ children, ...rest }) {
  return (
    <motion.div variants={staggerItemVariants} {...rest}>
      {children}
    </motion.div>
  );
}
