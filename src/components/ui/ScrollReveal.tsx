import { useMemo, Children, type ReactNode, useEffect, useRef } from 'react';
import { motion, type Variants, type Transition } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { sfx } from '@/lib/sound-engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MotionTag = 'div' | 'section' | 'article' | 'aside' | 'nav';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

export interface ScrollRevealProps {
  children: ReactNode;
  /** Direction the element slides in from. @default 'up' */
  direction?: Direction;
  /** Distance in px to translate from. @default 24 */
  distance?: number;
  /** Override animation duration in ms. When set, uses tween instead of spring. */
  duration?: number;
  /** Delay before the element reveals, in ms. @default 0 */
  delay?: number;
  className?: string;
  /** IntersectionObserver threshold. @default 0.15 */
  threshold?: number;
  /** Only trigger once. @default true */
  once?: boolean;
  /** Initial scale (1 = no scale). @default 1 */
  scale?: number;
  /** Initial blur in px (0 = no blur). @default 0 */
  blur?: number;
  /** Stagger delay in ms between children. Enables stagger mode. */
  stagger?: number;
  /** HTML element to render. @default 'div' */
  as?: MotionTag;
}

export interface ScrollRevealGroupProps {
  children: ReactNode;
  /** Delay in ms between each direct child's entrance. @default 100 */
  stagger?: number;
  className?: string;
  threshold?: number;
  once?: boolean;
  /** HTML element to render. @default 'div' */
  as?: MotionTag;
  /** Direction children slide in from. @default 'up' */
  direction?: Direction;
  /** Distance in px children translate from. @default 24 */
  distance?: number;
}

// ---------------------------------------------------------------------------
// Motion tag map — keeps TypeScript happy with dynamic tags
// ---------------------------------------------------------------------------

const motionMap = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  aside: motion.aside,
  nav: motion.nav,
} as const;

// ---------------------------------------------------------------------------
// Shared transition presets
// ---------------------------------------------------------------------------

const ENTER_SPRING: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
};

const EXIT_TWEEN: Transition = {
  duration: 0.15,
  ease: 'easeOut',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOffset(direction: Direction, distance: number): { x: number; y: number } {
  switch (direction) {
    case 'up':
      return { x: 0, y: distance };
    case 'down':
      return { x: 0, y: -distance };
    case 'left':
      return { x: distance, y: 0 };
    case 'right':
      return { x: -distance, y: 0 };
    case 'none':
    default:
      return { x: 0, y: 0 };
  }
}

function buildVariants(options: {
  direction: Direction;
  distance: number;
  scale: number;
  blur: number;
  duration?: number;
}): Variants {
  const { direction, distance, scale, blur, duration } = options;
  const offset = getOffset(direction, distance);

  const hidden: Record<string, unknown> = {
    opacity: 0,
    x: offset.x,
    y: offset.y,
    transition: EXIT_TWEEN,
  };

  const visible: Record<string, unknown> = {
    opacity: 1,
    x: 0,
    y: 0,
    transition: duration ? { duration: duration / 1000, ease: 'easeOut' } : ENTER_SPRING,
  };

  if (scale !== 1) {
    hidden.scale = scale;
    visible.scale = 1;
  }

  if (blur > 0) {
    hidden.filter = `blur(${blur}px)`;
    visible.filter = 'blur(0px)';
  }

  return { hidden, visible } as Variants;
}

// ---------------------------------------------------------------------------
// ScrollReveal (default export)
// ---------------------------------------------------------------------------

export default function ScrollReveal({
  children,
  direction = 'up',
  distance = 24,
  duration,
  delay: delayProp = 0,
  className,
  threshold = 0.15,
  once = true,
  scale = 1,
  blur = 0,
  stagger,
  as = 'div',
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal({
    threshold,
    triggerOnce: once,
    delay: delayProp,
  });

  // Play subtle reveal sound when first becoming visible
  const soundPlayed = useRef(false);
  useEffect(() => {
    if (isVisible && !soundPlayed.current) {
      soundPlayed.current = true;
      try { sfx.sectionReveal(); } catch {}
    }
  }, [isVisible]);

  const Tag = motionMap[as];

  // ---- Stagger mode -----------------------------------------------------
  if (stagger != null) {
    const containerVariants: Variants = {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: stagger / 1000,
        },
      },
    };

    const itemVariants: Variants = {
      hidden: {
        opacity: 0,
        y: distance,
        transition: EXIT_TWEEN,
      },
      visible: {
        opacity: 1,
        y: 0,
        transition: duration
          ? { duration: duration / 1000, ease: 'easeOut' }
          : ENTER_SPRING,
      },
    };

    return (
      <Tag ref={ref} className={className}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
        >
          {Children.map(children, (child) => (
            <motion.div variants={itemVariants}>{child}</motion.div>
          ))}
        </motion.div>
      </Tag>
    );
  }

  // ---- Single-element reveal mode ---------------------------------------
  const variants = useMemo(
    () => buildVariants({ direction, distance, scale, blur, duration }),
    [direction, distance, scale, blur, duration],
  );

  return (
    <Tag
      ref={ref}
      className={className}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={variants}
    >
      {children}
    </Tag>
  );
}

// ---------------------------------------------------------------------------
// ScrollRevealGroup (named export)
// ---------------------------------------------------------------------------

export function ScrollRevealGroup({
  children,
  stagger = 100,
  className,
  threshold = 0.15,
  once = true,
  as = 'div',
  direction = 'up',
  distance = 24,
}: ScrollRevealGroupProps) {
  const { ref, isVisible } = useScrollReveal({
    threshold,
    triggerOnce: once,
  });

  const Tag = motionMap[as];
  const offset = getOffset(direction, distance);

  const containerVariants: Variants = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: stagger / 1000,
        },
      },
    }),
    [stagger],
  );

  const itemVariants: Variants = useMemo(
    () => ({
      hidden: {
        opacity: 0,
        x: offset.x,
        y: offset.y,
        transition: EXIT_TWEEN,
      },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: ENTER_SPRING,
      },
    }),
    [offset.x, offset.y],
  );

  return (
    <Tag ref={ref} className={className}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
      >
        {Children.map(children, (child) => (
          <motion.div variants={itemVariants}>{child}</motion.div>
        ))}
      </motion.div>
    </Tag>
  );
}
