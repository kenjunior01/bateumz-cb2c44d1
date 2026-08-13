// =============================================================
// SHIMMER TEXT - Animated gradient text shimmer effect
// Usage: headings, special labels, featured numbers
// =============================================================

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ShimmerTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  speed?: number;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'p' | 'div';
}

export default function ShimmerText({
  children,
  className = '',
  colors = ['#00d4ff', '#7b2ff7', '#a855f7', '#fbbf24', '#00d4ff'],
  speed = 4,
  as: Tag = 'span',
}: ShimmerTextProps) {
  const gradient = colors.join(', ');

  return (
    <motion.span
      className={`bg-clip-text text-transparent inline-block ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${gradient})`,
        backgroundSize: '200% 100%',
      }}
      animate={{
        backgroundPosition: ['0% 50%', '200% 50%', '0% 50%'],
      }}
      transition={{
        duration: speed,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  );
}