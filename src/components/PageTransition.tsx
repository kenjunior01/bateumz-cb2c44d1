import { motion } from "framer-motion";
import { ReactNode } from "react";

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.97, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 260, damping: 28, mass: 0.8 } },
  exit: { opacity: 0, y: -12, scale: 0.98, filter: "blur(6px)", transition: { type: "tween", ease: "easeInOut", duration: 0.18 } },
};

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants as any}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
