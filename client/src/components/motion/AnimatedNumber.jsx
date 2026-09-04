import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useInView } from "framer-motion";

/**
 * Count-up number for dashboard/admin stat tiles. Starts counting once it
 * scrolls into view (not on mount), and only once.
 *
 * <AnimatedNumber value={1284} prefix="₹" suffix="/mo" />
 */
export default function AnimatedNumber({
  value = 0,
  duration = 1.1,
  prefix = "",
  suffix = "",
  decimals = 0,
  ...rest
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, value, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      setDisplay(
        latest.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      );
    });
    return unsubscribe;
  }, [spring, decimals]);

  return (
    <motion.span ref={ref} {...rest}>
      {prefix}
      {display}
      {suffix}
    </motion.span>
  );
}
