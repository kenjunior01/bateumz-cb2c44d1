// =============================================================
// NEON BORDER - Animated rotating gradient border with glow
// OPTIMIZED: Uses CSS animation instead of setState per frame
// =============================================================

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface NeonBorderProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  speed?: number; // seconds per rotation
  borderWidth?: number;
  glowIntensity?: number;
  borderRadius?: string;
  enabled?: boolean;
  pulse?: boolean;
  onClick?: () => void;
}

export default function NeonBorder({
  children,
  className = '',
  colors = ['#00d4ff', '#7b2ff7', '#a855f7', '#fbbf24'],
  speed = 4,
  borderWidth = 2,
  glowIntensity = 0.6,
  borderRadius = '1rem',
  enabled = true,
  pulse = false,
  onClick,
}: NeonBorderProps) {
  const { disableHeavyFx } = useReducedMotion();

  // On low-end or reduced motion, show a simple static border
  if (disableHeavyFx || !enabled) {
    return (
      <div
        className={`relative ${onClick ? 'cursor-pointer' : ''} ${className}`}
        style={{ borderRadius, padding: borderWidth }}
        onClick={onClick}
      >
        {enabled && (
          <div
            className="absolute inset-0"
            style={{
              borderRadius,
              background: `linear-gradient(135deg, ${colors[0]}40, ${colors[1] || colors[0]}20)`,
              opacity: glowIntensity * 0.7,
            }}
          />
        )}
        <div className="relative z-10" style={{ borderRadius, background: 'hsl(var(--background))' }}>
          {children}
        </div>
      </div>
    );
  }

  const colorStops = colors.join(', ');

  return (
    <motion.div
      className={`neon-border-container relative ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ 
        borderRadius, 
        padding: borderWidth,
        '--nb-speed': `${speed}s`,
        '--nb-colors': colorStops,
        '--nb-glow-intensity': glowIntensity,
        '--nb-color-0': colors[0] || '#00d4ff',
        '--nb-color-1': colors[1] || colors[0] || '#00d4ff',
        '--nb-glow-color-0': colors[0] || '#00d4ff',
        '--nb-glow-color-1': colors[1] || colors[0] || '#00d4ff',
        '--nb-border-width': borderWidth,
      } as React.CSSProperties}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {/* Rotating gradient border — CSS-only animation */}
      <div
        className="absolute inset-0 neon-border-rotate"
        style={{
          borderRadius,
          background: `conic-gradient(from var(--nb-angle, 0deg), ${colorStops}, ${colors[0]})`,
          opacity: glowIntensity,
          animation: `neon-border-spin ${speed}s linear infinite`,
        }}
      />

      {/* Inner background */}
      <div
        className="relative z-10"
        style={{
          borderRadius,
          background: 'hsl(var(--background))',
        }}
      >
        {children}
      </div>

      {/* Glow effect */}
      <div
        className="absolute inset-0 pointer-events-none neon-border-glow"
        style={{
          borderRadius,
          boxShadow: `0 0 ${15 * glowIntensity}px ${colors[0]}${Math.round(glowIntensity * 50).toString(16).padStart(2, '0')}, 
                      inset 0 0 ${10 * glowIntensity}px ${colors[1] || colors[0]}${Math.round(glowIntensity * 30).toString(16).padStart(2, '0')}`,
        }}
      />
    </motion.div>
  );
}
