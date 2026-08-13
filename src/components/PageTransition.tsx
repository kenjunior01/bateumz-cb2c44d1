import { motion } from "framer-motion";
import { ReactNode } from "react";

export type PageTransitionVariant =
  | 'default'
  | 'fade'
  | 'slideUp'
  | 'slideLeft'
  | 'scale'
  | 'glitch'
  | 'hero';

interface PageTransitionProps {
  children: ReactNode;
  variant?: PageTransitionVariant;
  className?: string;
  delay?: number;
}

const variants: Record<PageTransitionVariant, any> = {
  default: {
    initial: { opacity: 0, y: 20, scale: 0.97, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 260, damping: 28, mass: 0.8 } },
    exit: { opacity: 0, y: -12, scale: 0.98, filter: 'blur(6px)', transition: { type: 'tween', ease: 'easeInOut', duration: 0.18 } },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },
  slideUp: {
    initial: { opacity: 0, y: 40, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 200, damping: 25 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.15 } },
  },
  slideLeft: {
    initial: { opacity: 0, x: 60, filter: 'blur(4px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 200, damping: 25 } },
    exit: { opacity: 0, x: -40, transition: { duration: 0.15 } },
  },
  scale: {
    initial: { opacity: 0, scale: 0.85, filter: 'blur(8px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
  },
  glitch: {
    initial: { opacity: 0, x: 0, skewX: 0 },
    animate: {
      opacity: 1, x: 0, skewX: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
    exit: { opacity: 0, transition: { duration: 0.1 } },
  },
  hero: {
    initial: { opacity: 0, y: 60, scale: 0.9, filter: 'blur(10px)' },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 180, damping: 22, mass: 1 } },
    exit: { opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.25 } },
  },
};

export default function PageTransition({ children, variant = 'default', className = '', delay = 0 }: PageTransitionProps) {
  const v = variants[variant];
  return (
    <motion.div
      variants={v}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </motion.div>
  );
}

// =============================================================
// STAGGER CONTAINER - Children animate in sequence
// =============================================================

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  delay?: number;
}

export function StaggerContainer({ children, className = '', staggerDelay = 0.08, delay = 0 }: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: { transition: { staggerChildren: staggerDelay, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 300, damping: 30 } },
      }}
    >
      {children}
    </motion.div>
  );
}
