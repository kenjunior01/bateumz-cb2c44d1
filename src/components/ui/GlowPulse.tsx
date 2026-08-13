// =============================================================
// GLOW PULSE - Animated glow border/background effect
// Usage: wrap cards, badges, or any element that needs a living glow
// =============================================================

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface GlowPulseProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: number; // 0-1
  speed?: number; // seconds per cycle
  borderRadius?: string;
  as?: 'div' | 'span';
}

export default function GlowPulse({
  children,
  className = '',
  glowColor = '#00d4ff',
  intensity = 0.5,
  speed = 3,
  borderRadius = '0.75rem',
  as: Tag = 'div',
}: GlowPulseProps) {
  return (
    <Tag className={`relative ${className}`}>
      {/* Animated glow layer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ borderRadius }}
        animate={{
          boxShadow: [
            `0 0 ${10 * intensity}px ${glowColor}00, 0 0 ${20 * intensity}px ${glowColor}00`,
            `0 0 ${15 * intensity}px ${glowColor}30, 0 0 ${30 * intensity}px ${glowColor}15`,
            `0 0 ${10 * intensity}px ${glowColor}00, 0 0 ${20 * intensity}px ${glowColor}00`,
          ],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Border glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ borderRadius, border: `1px solid ${glowColor}` }}
        animate={{
          borderColor: [
            `${glowColor}00`,
            `${glowColor}${Math.round(intensity * 80).toString(16).padStart(2, '0')}`,
            `${glowColor}00`,
          ],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Content */}
      <div className="relative z-10" style={{ borderRadius }}>
        {children}
      </div>
    </Tag>
  );
}
