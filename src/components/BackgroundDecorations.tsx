import { memo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  alphaDir: number;
  type: number;
}

const PARTICLE_COUNT_DESKTOP = 35;
const PARTICLE_COUNT_MOBILE = 12;
const CONNECTION_DISTANCE = 120;

function getParticleColors() {
  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue("--primary").trim();
  const accent = style.getPropertyValue("--accent").trim();
  return { primary, accent };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function hslToRgbStr(hsl: string): [number, number, number] {
  const canvas = document.createElement("canvas");
  canvas.width = 1; canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [99, 102, 241];
  ctx.fillStyle = hsl;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

function drawGlowDot(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, r: number, g: number, b: number, a: number) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, s);
  grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
  grad.addColorStop(0.4, `rgba(${r},${g},${b},${a * 0.4})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.fill();
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const isMobileRef = useRef(false);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const scrollRef = useRef(0);
  const colorsRef = useRef<[number,number,number][]>([[99,102,241],[236,72,153]]);

  const initParticles = useCallback((w: number, h: number) => {
    const count = isMobileRef.current ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: 1.5 + Math.random() * 3,
        alpha: 0.15 + Math.random() * 0.45,
        alphaDir: (Math.random() - 0.5) * 0.004,
        type: Math.random() > 0.8 ? 1 : Math.random() > 0.5 ? 2 : 0,
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

    const updateColors = () => {
      try {
        const { primary, accent } = getParticleColors();
        const pColor = primary.startsWith("#") ? hexToRgb(primary) : hslToRgbStr(primary);
        const aColor = accent.startsWith("#") ? hexToRgb(accent) : hslToRgbStr(accent);
        colorsRef.current = [pColor, aColor];
      } catch {}
    };
    updateColors();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      isMobileRef.current = window.innerWidth < 768;
      initParticles(window.innerWidth, window.innerHeight);
      updateColors();
    };

    const onMouse = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onTouch = (e: TouchEvent) => { if (e.touches[0]) mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const onScroll = () => { scrollRef.current = window.scrollY; };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    let lastTime = 0;
    const frameInterval = 1000 / 30;

    const animate = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(animate);
      const delta = timestamp - lastTime;
      if (delta < frameInterval) return;
      lastTime = timestamp - (delta % frameInterval);

      const scrollFade = Math.max(0, 1 - scrollRef.current / 700);
      if (scrollFade < 0.02) { ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); return; }

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = scrollFade;

      const particles = particlesRef.current;
      const connDist = isMobileRef.current ? CONNECTION_DISTANCE * 0.5 : CONNECTION_DISTANCE;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const [c1, c2] = colorsRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const dmx = p.x - mx;
        const dmy = p.y - my;
        const distMouse = Math.sqrt(dmx * dmx + dmy * dmy);
        if (distMouse < 140 && distMouse > 0) {
          const force = (140 - distMouse) / 140 * 0.2;
          p.vx += (dmx / distMouse) * force;
          p.vy += (dmy / distMouse) * force;
        }

        p.vx *= 0.993;
        p.vy *= 0.993;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.alphaDir;
        if (p.alpha > 0.6) { p.alpha = 0.6; p.alphaDir *= -1; }
        if (p.alpha < 0.08) { p.alpha = 0.08; p.alphaDir *= -1; }
        if (p.x < -30) p.x = w + 30;
        if (p.x > w + 30) p.x = -30;
        if (p.y < -30) p.y = h + 30;
        if (p.y > h + 30) p.y = -30;

        const col = p.type === 1 ? c2 : c1;

        if (p.type === 2) {
          ctx.save();
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${p.alpha * 0.5})`;
          ctx.lineWidth = 0.6;
          const s = p.size * 0.8;
          ctx.strokeRect(p.x - s, p.y - s, s * 2, s * 2);
          ctx.restore();
        } else {
          drawGlowDot(ctx, p.x, p.y, p.size * 2.5, col[0], col[1], col[2], p.alpha * 0.3);
        }

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connDist) {
            const lineAlpha = (1 - dist / connDist) * 0.08 * scrollFade;
            const mixCol = p.type === 1 ? c2 : c1;
            ctx.save();
            ctx.strokeStyle = `rgba(${mixCol[0]},${mixCol[1]},${mixCol[2]},${lineAlpha})`;
            ctx.lineWidth = 0.5;
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
      style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: -5 }}
    />
  );
}

const floatRotate = (delay: number, duration: number) => ({
  y: [0, -12, 0],
  rotate: [0, 5, -5, 0],
  transition: { duration, delay, repeat: Infinity, ease: "easeInOut" as const },
});

const orbPulse = (delay: number, dur: number, xR: number[], yR: number[], sR: number[]) => ({
  x: xR, y: yR, scale: sR,
  transition: { duration: dur, delay, repeat: Infinity, ease: "easeInOut" as const },
});

const BackgroundDecorations = memo(() => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
    <ParticleCanvas />

    <div className="bg-noise-overlay" />

    <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.04]" />

    <motion.div
      animate={orbPulse(0, 25, [0, 40], [0, 25], [1, 1.2])}
      className="absolute rounded-full"
      style={{ top: "5%", left: "15%", width: 500, height: 500, background: "radial-gradient(circle, color-mix(in srgb, hsl(var(--primary)) 0.08, transparent) 0%, transparent 70%)", filter: "blur(60px)" }}
    />
    <motion.div
      animate={orbPulse(-8, 30, [0, -35], [0, -20], [1, 1.15])}
      className="absolute rounded-full shadow-[0_0_80px_hsl(var(--accent)/0.05)]"
      style={{ top: "40%", left: "60%", width: 450, height: 450, background: "radial-gradient(circle, color-mix(in srgb, hsl(var(--accent)) 0.06, transparent) 0%, transparent 70%)", filter: "blur(50px)" }}
    />
    <motion.div
      animate={orbPulse(-15, 35, [0, 25], [0, -30], [1, 1.25])}
      className="absolute rounded-full"
      style={{ top: "65%", left: "25%", width: 400, height: 400, background: "radial-gradient(circle, color-mix(in srgb, hsl(var(--primary)) 0.05, transparent) 0%, transparent 70%)", filter: "blur(55px)" }}
    />
    <motion.div
      animate={orbPulse(-5, 28, [0, -20], [0, 15], [1, 1.1])}
      className="absolute rounded-full"
      style={{ top: "20%", left: "75%", width: 350, height: 350, background: "radial-gradient(circle, color-mix(in srgb, hsl(var(--accent)) 0.05, transparent) 0%, transparent 70%)", filter: "blur(45px)" }}
    />

    <div
      className="absolute top-[10%] left-[5%] h-96 w-96 rounded-full blur-[100px] morph-blob-slow"
      style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 0.04, transparent)" }}
    />
    <div
      className="absolute bottom-[15%] right-[8%] h-80 w-80 rounded-full blur-[90px] morph-blob-slow"
      style={{ background: "color-mix(in srgb, var(--region-secondary, hsl(var(--accent))) 0.035, transparent)", animationDelay: "-10s" }}
    />

    <div className="aurora-beam aurora-beam-1" />
    <div className="aurora-beam aurora-beam-2" />

    <div className="vignette-overlay" />

    <motion.svg animate={floatRotate(0, 14)} className="absolute top-[6%] left-[4%] w-20 h-20 text-primary/[0.04] dark:text-primary/[0.07] shadow-[0_0_30px_hsl(var(--primary)/0.03)]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1">
      <circle cx="32" cy="32" r="28" strokeDasharray="4 6" />
      <path d="M20 20l24 24M44 20L20 44" />
    </motion.svg>

    <motion.svg animate={floatRotate(2, 16)} className="absolute top-[12%] right-[8%] w-16 h-16 text-accent/[0.05] dark:text-accent/[0.08]" viewBox="0 0 64 64" fill="currentColor">
      <path d="M32 4l7.5 18.5H60l-15 12 5.5 19L32 42l-18.5 11.5 5.5-19-15-12h20.5z" />
    </motion.svg>

    <motion.svg animate={floatRotate(5, 18)} className="absolute top-[40%] left-[2%] w-14 h-14 text-primary/[0.03] dark:text-primary/[0.05]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="32,4 60,48 4,48" strokeDasharray="3 4" />
      <circle cx="32" cy="34" r="8" />
    </motion.svg>

    <motion.svg animate={floatRotate(1, 15)} className="absolute top-[60%] right-[5%] w-16 h-16 text-accent/[0.04] dark:text-accent/[0.06]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="12" y="12" width="40" height="40" rx="8" transform="rotate(15 32 32)" />
      <circle cx="32" cy="32" r="10" strokeDasharray="2 3" />
    </motion.svg>

    <motion.svg animate={floatRotate(3, 20)} className="absolute top-[80%] left-[35%] w-12 h-12 text-primary/[0.03] dark:text-primary/[0.05]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M8 32h48M32 8v48" />
      <circle cx="32" cy="32" r="16" strokeDasharray="3 5" />
    </motion.svg>

    <motion.svg animate={floatRotate(7, 22)} className="absolute top-[25%] left-[45%] w-10 h-10 text-accent/[0.03] dark:text-accent/[0.04]" viewBox="0 0 64 64" fill="currentColor">
      <path d="M32 0l4 28L64 32l-28 4L32 64l-4-28L0 32l28-4z" />
    </motion.svg>

    <motion.svg animate={floatRotate(4, 17)} className="absolute top-[70%] left-[70%] w-14 h-14 text-primary/[0.025] dark:text-primary/[0.04]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16 16l32 32M48 16L16 48" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
      <circle cx="48" cy="16" r="4" fill="currentColor" />
      <circle cx="16" cy="48" r="4" fill="currentColor" />
      <circle cx="48" cy="48" r="4" fill="currentColor" />
    </motion.svg>

    <div
      className="absolute inset-0 opacity-[0.012] dark:opacity-[0.02]"
      style={{ backgroundImage: "radial-gradient(hsl(var(--primary)) 0.4px, transparent 0.4px)", backgroundSize: "48px 48px" }}
    />
  </div>
));

BackgroundDecorations.displayName = "BackgroundDecorations";
export default BackgroundDecorations;
