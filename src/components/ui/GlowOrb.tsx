// =============================================================
// GLOW ORB - Floating animated energy orb with trail
// Unique visual signature for BATEU - no other platform has this
// =============================================================

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface GlowOrbProps {
  className?: string;
  color?: string;
  secondaryColor?: string;
  size?: number;
  speed?: number;
  intensity?: number;
  pulseSpeed?: number;
  orbitRadius?: number;
  enableTrail?: boolean;
}

export default function GlowOrb({
  className = '',
  color = '#00d4ff',
  secondaryColor = '#7b2ff7',
  size = 120,
  speed = 8,
  intensity = 0.7,
  pulseSpeed = 2,
  orbitRadius = 0,
  enableTrail = true,
}: GlowOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const trail: { x: number; y: number; alpha: number; size: number }[] = [];
    const maxTrail = 25;
    let time = 0;
    let animId: number;

    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      time += 0.016;

      const cx = size / 2;
      const cy = size / 2;
      const ox = Math.sin(time * (6.28 / speed)) * orbitRadius;
      const oy = Math.cos(time * (6.28 / speed) * 0.7) * orbitRadius * 0.6;
      const x = cx + ox;
      const y = cy + oy;
      const pulse = 1 + Math.sin(time * (6.28 / pulseSpeed)) * 0.15;
      const baseRadius = (size * 0.25) * pulse;

      // Trail
      if (enableTrail) {
        trail.push({ x, y, alpha: 0.6, size: baseRadius * 0.4 });
        if (trail.length > maxTrail) trail.shift();

        for (let i = 0; i < trail.length; i++) {
          const t = trail[i];
          t.alpha *= 0.92;
          const trailSize = t.size * (i / trail.length);
          const gradient = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, trailSize);
          gradient.addColorStop(0, `${secondaryColor}${Math.round(t.alpha * 60).toString(16).padStart(2, '0')}`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(t.x, t.y, trailSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Outer glow
      const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, baseRadius * 2.5);
      outerGlow.addColorStop(0, `${color}${Math.round(intensity * 40).toString(16).padStart(2, '0')}`);
      outerGlow.addColorStop(0.5, `${secondaryColor}${Math.round(intensity * 20).toString(16).padStart(2, '0')}`);
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(x, y, baseRadius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow
      const innerGlow = ctx.createRadialGradient(x, y, 0, x, y, baseRadius);
      innerGlow.addColorStop(0, `rgba(255,255,255,${intensity * 0.9})`);
      innerGlow.addColorStop(0.3, color);
      innerGlow.addColorStop(0.7, secondaryColor);
      innerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Core
      const coreGlow = ctx.createRadialGradient(x, y, 0, x, y, baseRadius * 0.3);
      coreGlow.addColorStop(0, `rgba(255,255,255,${intensity})`);
      coreGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(x, y, baseRadius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting particles
      for (let i = 0; i < 6; i++) {
        const angle = time * (6.28 / 3) + (i * Math.PI * 2) / 6;
        const dist = baseRadius * 1.5 + Math.sin(time * 2 + i) * 5;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        const pSize = 2 + Math.sin(time * 3 + i * 2) * 1;
        ctx.fillStyle = i % 2 === 0 ? color : secondaryColor;
        ctx.globalAlpha = 0.6 + Math.sin(time * 4 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animId);
  }, [color, secondaryColor, size, speed, intensity, pulseSpeed, orbitRadius, enableTrail]);

  return (
    <motion.div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: 'easeOut' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="pointer-events-none"
      />
    </motion.div>
  );
}
