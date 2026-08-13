// =============================================================
// ANIMATION UTILITIES - Shared Framer Motion variants & configs
// Used across Esports, Sorteios, and Jogos areas
// =============================================================

import { Variants, Transition } from 'framer-motion';

// ---- Shared Transitions ----
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
};

export const springBouncy: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 15,
};

export const springGentle: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
};

export const easeSmooth: Transition = {
  duration: 0.4,
  ease: [0.25, 0.1, 0.25, 1],
};

export const easeOutExpo: Transition = {
  duration: 0.5,
  ease: [0.16, 1, 0.3, 1],
};

// ---- Fade Variants ----
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeSmooth },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: easeOutExpo },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: easeOutExpo },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: easeOutExpo },
  exit: { opacity: 0, x: -15, transition: { duration: 0.2 } },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: easeOutExpo },
  exit: { opacity: 0, x: 15, transition: { duration: 0.2 } },
};

// ---- Scale Variants ----
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: springSnappy },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1, transition: springBouncy },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } },
};

export const popOut: Variants = {
  hidden: { opacity: 0, scale: 1.2 },
  visible: { opacity: 1, scale: 1, transition: springSnappy },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
};

// ---- Slide Variants ----
export const slideInFromBottom: Variants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: springSnappy },
  exit: { y: '100%', transition: { duration: 0.25 } },
};

export const slideInFromRight: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: easeOutExpo },
  exit: { x: '100%', transition: { duration: 0.2 } },
};

// ---- Special Effect Variants ----
export const glitchText: Variants = {
  hidden: { opacity: 0, x: 0 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
  hover: {
    x: [0, -2, 2, -1, 1, 0],
    transition: { duration: 0.3 },
  },
};

export const neonPulse: Variants = {
  hidden: { opacity: 0, filter: 'brightness(0)' },
  visible: {
    opacity: 1,
    filter: 'brightness(1)',
    transition: { duration: 0.5 },
  },
  pulse: {
    filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'],
    transition: { duration: 2, repeat: Infinity },
  },
};

export const float: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: [0, -6, 0],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const shake: Variants = {
  shake: {
    x: [0, -4, 4, -4, 4, -2, 2, 0],
    transition: { duration: 0.5 },
  },
};

export const numberPop: Variants = {
  pop: {
    scale: [1, 1.2, 1],
    transition: { duration: 0.3 },
  },
};

// ---- Stagger Container ----
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

// ---- Card Hover Effect ----
export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: springSnappy,
  },
};

// ---- List item variants ----
export const listItem: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: easeSmooth },
};

// ---- Tab indicator ----
export const tabIndicator = {
  inactive: { scaleX: 0, opacity: 0 },
  active: { scaleX: 1, opacity: 1, transition: springSnappy },
};

// ---- Countdown pulse ----
export const countdownPulse: Variants = {
  pulse: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.5 },
  },
};

// ---- Skeleton shimmer ----
export const skeletonShimmer: Variants = {
  shimmer: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const microShake: Variants = {
  shake: {
    x: [0, -1.5, 1.5, -0.5, 0.5, 0],
    rotate: [0, -0.5, 0.5, -0.2, 0.2, 0],
    transition: { duration: 0.4 },
  },
};

// ---- Viewport trigger defaults ----
export const viewportOnce = { once: true, margin: '-50px' };
export const viewportRepeat = { margin: '-50px' };
