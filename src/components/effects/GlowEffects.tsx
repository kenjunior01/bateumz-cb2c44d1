import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  color?: string;
  intensity?: number;
  glowSize?: number;
  className?: string;
  onClick?: () => void;
}

export function GlowCard({
  children,
  color = '#8b5cf6',
  intensity = 0.5,
  glowSize = 20,
  className = '',
  onClick,
}: GlowCardProps) {
  return (
    <motion.div
      className={`relative rounded-2xl ${className}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : undefined,
        boxShadow:
          intensity > 0
            ? `0 0 ${glowSize * intensity}px ${color}40, 0 0 ${glowSize * 2 * intensity}px ${color}20`
            : 'none',
        transition: 'box-shadow 0.3s ease',
      }}
      whileHover={intensity > 0 ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {children}
    </motion.div>
  );
}

interface ShimmerTextProps {
  text: string;
  className?: string;
  speed?: number;
}

export function ShimmerText({ text, className = '', speed = 3 }: ShimmerTextProps) {
  return (
    <span
      className={`animate-shimmer bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
        backgroundSize: '200% auto',
        animationDuration: `${speed}s`,
      }}
    >
      {text}
    </span>
  );
}

interface PulseRingProps {
  children: ReactNode;
  color?: string;
  className?: string;
}

export function PulseRing({ children, color = '#8b5cf6', className = '' }: PulseRingProps) {
  return (
    <div className={`relative inline-flex ${className}`}>
      {children}
      <span
        className="absolute inset-0 rounded-full animate-ping opacity-20"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

interface FloatAnimationProps {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
  className?: string;
}

export function FloatAnimation({
  children,
  amplitude = 10,
  duration = 3,
  className = '',
}: FloatAnimationProps) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -amplitude, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}
