// =============================================================
// PARTICLE TRAIL - Mouse/touch sparkle trail effect
// Attaches to any container and spawns particles on mouse move
// =============================================================

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface ParticleTrailProps {
  className?: string;
  colors?: string[];
  particleSize?: number;
  lifetime?: number;
  spread?: number;
  enabled?: boolean;
  onHoverOnly?: boolean;
}

const DEFAULT_COLORS = ['#00d4ff', '#7b2ff7', '#a855f7', '#fbbf24'];

export default function ParticleTrail({
  className = '',
  colors = DEFAULT_COLORS,
  particleSize = 3,
  lifetime = 40,
  spread = 2,
  enabled = true,
  onHoverOnly = true,
}: ParticleTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const isHovering = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const spawnParticle = useCallback(
    (x: number, y: number) => {
      if (!enabled) return;
      if (onHoverOnly && !isHovering.current) return;

      // Throttle: only spawn if moved enough
      const dx = x - lastPos.current.x;
      const dy = y - lastPos.current.y;
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      lastPos.current = { x, y };

      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * spread,
          vy: (Math.random() - 0.5) * spread - 1,
          life: lifetime * (0.5 + Math.random() * 0.5),
          maxLife: lifetime,
          size: particleSize * (0.5 + Math.random() * 0.5),
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      // Cap particles
      if (particlesRef.current.length > 150) {
        particlesRef.current = particlesRef.current.slice(-100);
      }
    },
    [colors, enabled, lifetime, onHoverOnly, particleSize, spread]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life--;
        if (p.life <= 0) return false;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02; // slight gravity
        p.vx *= 0.98;

        const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
 const scale = 0.3 + (p.life / p.maxLife) * 0.7;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.size * scale) / 2, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{ zIndex: 40 }}
      />
      {enabled && (
        <div
          className="absolute inset-0"
          style={{ zIndex: 41 }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            spawnParticle(e.clientX - rect.left, e.clientY - rect.top);
          }}
          onTouchMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const touch = e.touches[0];
            spawnParticle(touch.clientX - rect.left, touch.clientY - rect.top);
          }}
          onMouseEnter={() => { isHovering.current = true; }}
          onMouseLeave={() => { isHovering.current = false; }}
        />
      )}
    </>
  );
}