// =============================================================
// CARD TILT - Enhanced 3D perspective tilt with glare and spring
// Fixed: useTransform API compatibility with framer-motion
// =============================================================

import { ReactNode, useRef, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface CardTiltProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  glareOpacity?: number;
  scaleOnHover?: number;
  springConfig?: { stiffness: number; damping: number };
  borderGlow?: string;
}

export default function CardTilt({
  children,
  className = '',
  maxTilt = 15,
  glareOpacity = 0.15,
  scaleOnHover = 1.03,
  springConfig = { stiffness: 300, damping: 30 },
  borderGlow,
}: CardTiltProps) {
  const ref = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [maxTilt, -maxTilt]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-maxTilt, maxTilt]), springConfig);

  const glareX = useTransform(mouseX, [0, 1], [0, 100]);
  const glareY = useTransform(mouseY, [0, 1], [0, 100]);

  // Distance from center for opacity falloff
  const distFromCenter = useTransform([mouseX, mouseY], ([cx, cy]) => {
    return Math.sqrt((cx - 0.5) ** 2 + (cy - 0.5) ** 2);
  });
  const glareOpacityVal = useTransform(distFromCenter, [0, 0.33], [1, 0]);

  // Combine glare position into a single motion value using CSS custom properties
  const glareBackground = useTransform([glareX, glareY], ([gx, gy]) =>
    `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,${glareOpacity}) 0%, transparent 60%)`
  );

  // Border glow intensity
  const glowIntensity = useTransform(distFromCenter, [0, 0.4], [1, 0]);
  const glowBoxShadow = useTransform(glowIntensity, (i) => {
    if (!borderGlow || i <= 0) return 'none';
    return `0 0 ${20 * i}px ${borderGlow}40, inset 0 0 ${10 * i}px ${borderGlow}20`;
  });

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    },
    [mouseX, mouseY]
  );

  const handleLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        perspective: 1000,
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{ scale: scaleOnHover }}
      className={`relative ${className}`}
    >
      {children}
      {/* Glare overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: glareBackground,
          opacity: glareOpacityVal,
        }}
      />
      {/* Optional border glow */}
      {borderGlow && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-[inherit]"
          style={{ boxShadow: glowBoxShadow }}
        />
      )}
    </motion.div>
  );
}
