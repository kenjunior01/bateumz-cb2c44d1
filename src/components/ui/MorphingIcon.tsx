// =============================================================
// MORPHING ICON - Smoothly morphs between Lucide icon states
// =============================================================

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';

interface MorphingIconProps {
  icons: LucideIcon[];
  currentIndex: number;
  size?: number;
  className?: string;
  color?: string;
}

export default function MorphingIcon({
  icons,
  currentIndex,
  size = 24,
  className = '',
  color,
}: MorphingIconProps) {
  const safeIndex = Math.min(currentIndex, icons.length - 1);
  const Icon = icons[safeIndex];

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={safeIndex}
          initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{ color }}
        >
          <Icon size={size} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// =============================================================
// BOUNCING DOT LOADER - 3 dots with staggered bounce
// =============================================================

export function BouncingDots({ className = '', color = 'currentColor', size = 8 }: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{ width: size, height: size, backgroundColor: color }}
          animate={{ y: [0, -size * 1.5, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// =============================================================
// TYPING INDICATOR - Chat-style typing dots
// =============================================================

export function TypingIndicator({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 bg-gray-400 rounded-full"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
