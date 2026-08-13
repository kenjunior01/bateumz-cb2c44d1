// =============================================================
// CONFETTI BURST - Lightweight canvas-based celebration particles
// =============================================================

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle' | 'star';
  life: number;
  maxLife: number;
}

interface ConfettiBurstProps {
  active: boolean;
  colors?: string[];
  particleCount?: number;
  spread?: number;
  originX?: number; // 0-1
  originY?: number; // 0-1
  className?: string;
  onComplete?: () => void;
}

const DEFAULT_COLORS = [
  '#00d4ff', '#7b2ff7', '#a855f7', '#fbbf24', '#2ea043', '#58a6ff',
  '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4',
];

export default function ConfettiBurst({
  active,
  colors = DEFAULT_COLORS,
  particleCount = 80,
  spread = 360,
  originX = 0.5,
  originY = 0.5,
  className = '',
  onComplete,
}: ConfettiBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const triggeredRef = useRef(false);

  const createParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w * originX;
    const cy = h * originY;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 6;
      const life = 60 + Math.random() * 80;

      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed * (spread / 360),
        vy: Math.sin(angle) * speed * (spread / 360) - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        opacity: 1,
        shape: (['rect', 'circle', 'star'] as const)[Math.floor(Math.random() * 3)],
        life,
        maxLife: life,
      });
    }

    particlesRef.current = particles;
  }, [colors, originX, originY, particleCount, spread]);

  useEffect(() => {
    if (!active) {
      triggeredRef.current = false;
      return;
    }
    if (triggeredRef.current) return;
    triggeredRef.current = true;

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
    createParticles();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;

      for (const p of particlesRef.current) {
        p.life--;
        if (p.life <= 0) continue;
        alive++;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.min(1, p.life / (p.maxLife * 0.3));

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        const s = p.size * (0.5 + (p.life / p.maxLife) * 0.5);

        if (p.shape === 'rect') {
          ctx.fillRect(-s / 2, -s / 4, s, s / 2);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // star
          drawStar(ctx, 0, 0, 5, s / 2, s / 4);
          ctx.fill();
        }

        ctx.restore();
      }

      if (alive > 0) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onComplete?.();
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [active, createParticles, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 50 }}
    />
  );
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
}