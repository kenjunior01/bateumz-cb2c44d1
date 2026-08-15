// =============================================================
// NEON BORDER - Animated rotating gradient border with glow
// Signature BATEU component - no other platform has this
// =============================================================

import { ReactNode, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [gradientAngle, setGradientAngle] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let animId: number;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = (now - start) / 1000;
      const angle = (elapsed / speed) * 360;
      setGradientAngle(angle);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [enabled, speed]);

  const gradientAngleRad = (gradientAngle * Math.PI) / 180;
  const gradient = colors.map((c, i) => {
    const a = gradientAngleRad + (i * Math.PI * 2) / colors.length;
    return `${c} ${Math.round(((i / colors.length) * 100))}%`;
  }).join(', ');

  return (
    <motion.div
      ref={containerRef}
      className={`relative ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ borderRadius, padding: borderWidth }}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {/* Rotating gradient border */}
      {enabled && (
        <div
          className="absolute inset-0"
          style={{
            borderRadius,
            background: `conic-gradient(from ${gradientAngle}deg, ${colors.join(', ')}, ${colors[0]})`,
            opacity: glowIntensity,
            filter: `blur(${pulse ? 2 + Math.sin(gradientAngle * 0.1) * 1 : 0}px)`,
          }}
        />
      )}

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
      {enabled && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius,
            boxShadow: `0 0 ${15 * glowIntensity}px ${colors[0]}${Math.round(glowIntensity * 50).toString(16).padStart(2, '0')}, 
                        inset 0 0 ${10 * glowIntensity}px ${colors[1]}${Math.round(glowIntensity * 30).toString(16).padStart(2, '0')}`,
          }}
        />
      )}
    </motion.div>
  );
}
