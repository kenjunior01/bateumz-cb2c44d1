// =============================================================
// PARTICLE FIELD - Interactive background particles that react to mouse
// Signature visual effect for BATEU platform
// =============================================================

import { useEffect, useRef, useCallback } from 'react';

interface ParticleFieldProps {
  className?: string;
  colors?: string[];
  count?: number;
  connectionDistance?: number;
  mouseInfluenceRadius?: number;
  speed?: number;
  enableConnections?: boolean;
  enableMouseRepel?: boolean;
  particleSize?: number;
}

const DEFAULT_COLORS = ['#00d4ff', '#7b2ff7', '#a855f7', '#fbbf24'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  baseX: number;
  baseY: number;
  pulse: number;
  pulseSpeed: number;
}

export default function ParticleField({
  className = '',
  colors = DEFAULT_COLORS,
  count = 60,
  connectionDistance = 120,
  mouseInfluenceRadius = 150,
  speed = 0.3,
  enableConnections = true,
  enableMouseRepel = true,
  particleSize = 2,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animRef = useRef<number>(0);

  const initParticles = useCallback((w: number, h: number) => {
    particlesRef.current = Array.from({ length: count }, () => {
      const x = Math.random() * w;
      const y = Math.random() * h;
      return {
        x, y,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: particleSize * (0.5 + Math.random() * 0.8),
        color: colors[Math.floor(Math.random() * colors.length)],
        baseX: x,
        baseY: y,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
      };
    });
  }, [colors, count, speed, particleSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      if (particlesRef.current.length === 0) {
        initParticles(parent.clientWidth, parent.clientHeight);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseLeave = () => { mouseRef.current = { x: -1000, y: -1000 }; };
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const particles = particlesRef.current;

      // Update particles
      for (const p of particles) {
        p.pulse += p.pulseSpeed;

        // Mouse repel
        if (enableMouseRepel && mx > 0) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseInfluenceRadius && dist > 0) {
            const force = (mouseInfluenceRadius - dist) / mouseInfluenceRadius;
            p.vx += (dx / dist) * force * 0.5;
            p.vy += (dy / dist) * force * 0.5;
          }
        }

        // Damping
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }

      // Draw connections
      if (enableConnections) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < connectionDistance) {
              const alpha = (1 - dist / connectionDistance) * 0.15;
              ctx.strokeStyle = `${particles[i].color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      // Draw mouse connection lines
      if (mx > 0) {
        for (const p of particles) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouseInfluenceRadius) {
            const alpha = (1 - dist / mouseInfluenceRadius) * 0.25;
            ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        const pulseFactor = 1 + Math.sin(p.pulse) * 0.3;
        const drawSize = p.size * pulseFactor;

        // Glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, drawSize * 3);
        glow.addColorStop(0, `${p.color}30`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawSize * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.8 + Math.sin(p.pulse) * 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [initParticles, connectionDistance, enableConnections, enableMouseRepel, mouseInfluenceRadius]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
    />
  );
}
