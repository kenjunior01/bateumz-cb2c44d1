import { memo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const floatRotate = (delay: number, duration: number) => ({
  y: [0, -10, 0],
  rotate: [0, 3, -3, 0],
  transition: { duration, delay, repeat: Infinity, ease: "easeInOut" as const },
});

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  alphaDir: number;
}

const PARTICLE_COUNT_DESKTOP = 28;
const PARTICLE_COUNT_MOBILE = 10;
const CONNECTION_DISTANCE = 110;

function getParticleColor(alpha: number): string {
  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue("--primary").trim();
  const accent = style.getPropertyValue("--accent").trim();
  return alpha > 0.5
    ? `hsla(${primary}, ${alpha * 0.25})`
    : `hsla(${accent}, ${alpha * 0.18})`;
}

function drawSoftDot(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, 0, x, y, s);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(angle) * s * 0.5;
    const py = y + Math.sin(angle) * s * 0.5;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const isMobileRef = useRef(false);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const scrollRef = useRef(0);

  const initParticles = useCallback((w: number, h: number) => {
    const count = isMobileRef.current ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.15 + Math.random() * 0.4,
        alphaDir: (Math.random() - 0.5) * 0.003,
        type: Math.random() > 0.85 ? 1 : 0,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isMobileRef.current = window.innerWidth < 768;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      isMobileRef.current = window.innerWidth < 768;
      initParticles(window.innerWidth, window.innerHeight);
    };

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onScroll = () => {
      scrollRef.current = window.scrollY;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    let lastTime = 0;
    const targetFps = 30;
    const frameInterval = 1000 / targetFps;

    const animate = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(animate);
      const delta = timestamp - lastTime;
      if (delta < frameInterval) return;
      lastTime = timestamp - (delta % frameInterval);

      const scrollFade = Math.max(0, 1 - scrollRef.current / 600);
      if (scrollFade < 0.02) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        return;
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = scrollFade;

      const particles = particlesRef.current;
      const connDist = isMobileRef.current ? CONNECTION_DISTANCE * 0.5 : CONNECTION_DISTANCE;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i] as Particle & { type: number };

        const dmx = p.x - mx;
        const dmy = p.y - my;
        const distMouse = Math.sqrt(dmx * dmx + dmy * dmy);
        if (distMouse < 120 && distMouse > 0) {
          const force = (120 - distMouse) / 120 * 0.15;
          p.vx += (dmx / distMouse) * force;
          p.vy += (dmy / distMouse) * force;
        }

        p.vx *= 0.995;
        p.vy *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.alphaDir;
        if (p.alpha > 0.6) { p.alpha = 0.6; p.alphaDir *= -1; }
        if (p.alpha < 0.1) { p.alpha = 0.1; p.alphaDir *= -1; }
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        const color = getParticleColor(p.alpha);
        if (p.type === 1) {
          drawStar(ctx, p.x, p.y, p.size * 1.2, color);
        } else {
          drawSoftDot(ctx, p.x, p.y, p.size * 2, color);
        }

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j] as Particle;
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connDist) {
            const lineAlpha = (1 - dist / connDist) * 0.06 * scrollFade;
            ctx.save();
            ctx.strokeStyle = `hsla(220 70% 50%, ${lineAlpha})`;
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      ctx.globalAlpha = 1;
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: -5,
      }}
    />
  );
}

interface GradientOrb {
  top: string;
  left: string;
  size: number;
  blur: number;
  color: string;
  xRange: number[];
  yRange: number[];
  scaleRange: number[];
  delay: number;
  duration: number;
}

const gradientOrbs: GradientOrb[] = [
  {
    top: "15%", left: "25%", size: 400, blur: 160,
    color: "color-mix(in srgb, hsl(var(--primary)) 0.05, transparent)",
    xRange: [0, 30], yRange: [0, 20], scaleRange: [1, 1.15], delay: 0, duration: 30,
  },
  {
    top: "55%", left: "65%", size: 350, blur: 150,
    color: "color-mix(in srgb, hsl(var(--accent)) 0.04, transparent)",
    xRange: [0, -25], yRange: [0, -15], scaleRange: [1, 1.1], delay: -10, duration: 35,
  },
  {
    top: "35%", left: "45%", size: 450, blur: 180,
    color: "color-mix(in srgb, hsl(var(--primary)) 0.03, transparent)",
    xRange: [0, 20], yRange: [0, -25], scaleRange: [1, 1.2], delay: -18, duration: 40,
  },
  {
    top: "75%", left: "15%", size: 300, blur: 140,
    color: "color-mix(in srgb, hsl(var(--accent)) 0.035, transparent)",
    xRange: [0, 15], yRange: [0, 12], scaleRange: [1, 1.1], delay: -6, duration: 28,
  },
];

const makeOrbAnim = (orb: GradientOrb) => ({
  x: orb.xRange,
  y: orb.yRange,
  scale: orb.scaleRange,
  transition: {
    duration: orb.duration,
    delay: orb.delay,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
});

const BackgroundDecorations = memo(() => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
    <ParticleCanvas />

    <div className="bg-noise-overlay" />

    {gradientOrbs.map((orb, i) => (
      <motion.div
        key={`orb-${i}`}
        animate={makeOrbAnim(orb)}
        className="absolute rounded-full"
        style={{
          top: orb.top,
          left: orb.left,
          width: orb.size,
          height: orb.size,
          background: orb.color,
          filter: `blur(${orb.blur}px)`,
        }}
      />
    ))}

    <div
      className="absolute top-[12%] left-[8%] h-80 w-80 rounded-full blur-[120px] morph-blob-slow"
      style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 0.04, transparent)" }}
    />
    <div
      className="absolute bottom-[20%] right-[12%] h-72 w-72 rounded-full blur-[110px] morph-blob-slow"
      style={{
        background: "color-mix(in srgb, var(--region-secondary, hsl(var(--accent))) 0.035, transparent)",
        animationDelay: "-8s",
      }}
    />

    <div className="aurora-beam aurora-beam-1" />
    <div className="aurora-beam aurora-beam-2" />

    <div className="vignette-overlay" />

    <motion.svg
      animate={floatRotate(0, 12)}
      className="absolute top-[8%] left-[5%] w-16 h-16 text-primary opacity-[0.04] dark:opacity-[0.06]"
      viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"
    >
      <rect x="6" y="16" width="52" height="32" rx="4" />
      <path d="M22 16v32" strokeDasharray="4 3" />
      <circle cx="42" cy="32" r="5" />
    </motion.svg>

    <motion.svg
      animate={floatRotate(2, 14)}
      className="absolute top-[15%] right-[10%] w-14 h-14 text-accent opacity-[0.04] dark:opacity-[0.06]"
      viewBox="0 0 64 64" fill="currentColor"
    >
      <path d="M32 4l7.5 18.5H60l-15 12 5.5 19L32 42l-18.5 11.5 5.5-19-15-12h20.5z" />
    </motion.svg>

    <motion.svg
      animate={floatRotate(4, 15)}
      className="absolute top-[45%] left-[3%] w-12 h-12 text-primary opacity-[0.03] dark:opacity-[0.05]"
      viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"
    >
      <path d="M32 4l24 28-24 28-24-28z" />
      <path d="M16 32h32" strokeDasharray="3 3" />
    </motion.svg>

    <motion.svg
      animate={floatRotate(1, 13)}
      className="absolute top-[70%] right-[6%] w-14 h-14 text-accent opacity-[0.035] dark:opacity-[0.05]"
      viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"
    >
      <rect x="10" y="10" width="44" height="44" rx="8" />
      <circle cx="24" cy="24" r="3" fill="currentColor" />
      <circle cx="40" cy="24" r="3" fill="currentColor" />
      <circle cx="24" cy="40" r="3" fill="currentColor" />
      <circle cx="40" cy="40" r="3" fill="currentColor" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </motion.svg>

    <motion.svg
      animate={floatRotate(3, 16)}
      className="absolute top-[85%] left-[40%] w-10 h-10 text-primary opacity-[0.03] dark:opacity-[0.04]"
      viewBox="0 0 64 64" fill="currentColor"
    >
      <path d="M32 0l4 28L64 32l-28 4L32 64l-4-28L0 32l28-4z" />
    </motion.svg>

    <div
      className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025]"
      style={{
        backgroundImage: "radial-gradient(hsl(var(--primary)) 0.5px, transparent 0.5px)",
        backgroundSize: "40px 40px",
      }}
    />
  </div>
));

BackgroundDecorations.displayName = "BackgroundDecorations";
export default BackgroundDecorations;
