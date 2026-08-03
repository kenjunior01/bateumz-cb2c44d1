import { memo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const floatAnimation = (delay: number, duration: number) => ({
  y: [0, -15, 0],
  transition: { duration, delay, repeat: Infinity, ease: "easeInOut" as const },
});

const floatRotate = (delay: number, duration: number) => ({
  y: [0, -12, 0],
  rotate: [0, 5, -5, 0],
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
  type: number;
}

const PARTICLE_COUNT_DESKTOP = 55;
const PARTICLE_COUNT_MOBILE = 18;
const CONNECTION_DISTANCE = 130;

type EaseValue = "easeInOut";

function getParticleColor(alpha: number): string {
  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue("--primary").trim();
  const accent = style.getPropertyValue("--accent").trim();
  return alpha > 0.5
    ? `hsla(${primary}, ${alpha * 0.4})`
    : `hsla(${accent}, ${alpha * 0.3})`;
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.7, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s * 0.7, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawController(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.fillStyle = color;
  const r = s * 0.45;
  const bw = r * 1.8;
  const bh = r * 1.0;
  ctx.beginPath();
  ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, r * 0.3);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - bw * 0.25, y, r * 0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + bw * 0.25, y, r * 0.2, 0, Math.PI * 2);
  ctx.stroke();
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

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.fillStyle = color.replace(/[,\s][\d.]+\)$/, ", 0.3)");
  ctx.beginPath();
  ctx.arc(x, y, s * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `bold ${s * 0.5}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", x, y + 1);
  ctx.restore();
}

function drawDice(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.fillStyle = color.replace(/[,\s][\d.]+\)$/, ", 0.2)");
  const hs = s * 0.4;
  ctx.beginPath();
  ctx.roundRect(x - hs, y - hs, hs * 2, hs * 2, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  const dots = [[-0.4, -0.4], [0.4, 0.4], [-0.4, 0.4], [0.4, -0.4]];
  for (const [dx, dy] of dots) {
    ctx.beginPath();
    ctx.arc(x + dx * hs, y + dy * hs, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const isMobileRef = useRef(false);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  const initParticles = useCallback((w: number, h: number) => {
    const count = isMobileRef.current ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 2 + Math.random() * 3,
        alpha: Math.random(),
        alphaDir: (Math.random() - 0.5) * 0.008,
        type: Math.floor(Math.random() * 6),
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

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });

    const animate = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      const connDist = isMobileRef.current ? CONNECTION_DISTANCE * 0.6 : CONNECTION_DISTANCE;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const dmx = p.x - mx;
        const dmy = p.y - my;
        const distMouse = Math.sqrt(dmx * dmx + dmy * dmy);
        if (distMouse < 150 && distMouse > 0) {
          const force = (150 - distMouse) / 150 * 0.4;
          p.vx += (dmx / distMouse) * force;
          p.vy += (dmy / distMouse) * force;
        }

        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.alphaDir;
        if (p.alpha > 1) { p.alpha = 1; p.alphaDir *= -1; }
        if (p.alpha < 0.1) { p.alpha = 0.1; p.alphaDir *= -1; }
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const color = getParticleColor(p.alpha);
        if (p.type === 0) drawDiamond(ctx, p.x, p.y, p.size, color);
        else if (p.type === 1) drawCircle(ctx, p.x, p.y, p.size, color);
        else if (p.type === 2) drawController(ctx, p.x, p.y, p.size * 2, color);
        else if (p.type === 3) drawStar(ctx, p.x, p.y, p.size, color);
        else if (p.type === 4) drawCoin(ctx, p.x, p.y, p.size * 2, color);
        else drawDice(ctx, p.x, p.y, p.size * 2, color);

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connDist) {
            const lineAlpha = (1 - dist / connDist) * 0.1;
            ctx.save();
            ctx.strokeStyle = `hsla(220 70% 18%, ${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
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

interface FloatingIcon {
  icon: string;
  top: string;
  left: string;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
  rotateRange: number[];
  yRange: number[];
}

const floatingIcons: FloatingIcon[] = [
  { icon: "\uD83C\uDFB2", top: "8%", left: "15%", size: 30, opacity: 0.04, delay: 0, duration: 8, rotateRange: [-5, 5], yRange: [0, -10] },
  { icon: "\uD83C\uDFC6", top: "18%", left: "78%", size: 32, opacity: 0.05, delay: 1.2, duration: 9, rotateRange: [-3, 3], yRange: [0, -14] },
  { icon: "\uD83C\uDFAF", top: "45%", left: "6%", size: 28, opacity: 0.03, delay: 0.5, duration: 7, rotateRange: [-8, 8], yRange: [0, -8] },
  { icon: "\uD83C\uDFAE", top: "65%", left: "88%", size: 36, opacity: 0.04, delay: 2, duration: 10, rotateRange: [-4, 4], yRange: [0, -12] },
  { icon: "\u2B50", top: "30%", left: "42%", size: 28, opacity: 0.03, delay: 3, duration: 8.5, rotateRange: [-6, 6], yRange: [0, -16] },
  { icon: "\uD83D\uDC51", top: "75%", left: "22%", size: 34, opacity: 0.05, delay: 1.5, duration: 9.5, rotateRange: [-2, 2], yRange: [0, -10] },
  { icon: "\uD83D\uDD25", top: "52%", left: "68%", size: 30, opacity: 0.04, delay: 0.8, duration: 7.5, rotateRange: [-7, 7], yRange: [0, -14] },
  { icon: "\u26A1", top: "85%", left: "52%", size: 28, opacity: 0.03, delay: 2.5, duration: 8, rotateRange: [-10, 10], yRange: [0, -18] },
  { icon: "\uD83C\uDFB2", top: "12%", left: "55%", size: 30, opacity: 0.03, delay: 4, duration: 11, rotateRange: [-4, 4], yRange: [0, -12] },
  { icon: "\uD83C\uDFC6", top: "90%", left: "38%", size: 32, opacity: 0.04, delay: 1.8, duration: 9, rotateRange: [-3, 3], yRange: [0, -10] },
  { icon: "\uD83C\uDFB0", top: "5%", left: "65%", size: 26, opacity: 0.03, delay: 3.2, duration: 8.8, rotateRange: [-6, 6], yRange: [0, -11] },
  { icon: "\uD83C\uDFAE", top: "38%", left: "92%", size: 30, opacity: 0.035, delay: 0.3, duration: 9.3, rotateRange: [-5, 5], yRange: [0, -13] },
  { icon: "\uD83D\uDCA0", top: "72%", left: "45%", size: 28, opacity: 0.03, delay: 2.1, duration: 7.8, rotateRange: [-4, 4], yRange: [0, -9] },
  { icon: "\uD83C\uDFAF", top: "22%", left: "30%", size: 24, opacity: 0.025, delay: 1.7, duration: 10.2, rotateRange: [-3, 3], yRange: [0, -15] },
  { icon: "\u2728", top: "55%", left: "15%", size: 26, opacity: 0.035, delay: 0.9, duration: 8.2, rotateRange: [-8, 8], yRange: [0, -10] },
];

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
    top: "10%", left: "20%", size: 320, blur: 130,
    color: "color-mix(in srgb, hsl(var(--primary)) 0.08, transparent)",
    xRange: [0, 35], yRange: [0, 25], scaleRange: [1, 1.2], delay: 0, duration: 22,
  },
  {
    top: "60%", left: "70%", size: 280, blur: 140,
    color: "color-mix(in srgb, hsl(var(--accent)) 0.06, transparent)",
    xRange: [0, -30], yRange: [0, -20], scaleRange: [1, 1.15], delay: -7, duration: 25,
  },
  {
    top: "40%", left: "40%", size: 350, blur: 160,
    color: "color-mix(in srgb, hsl(var(--primary)) 0.05, transparent)",
    xRange: [0, 25], yRange: [0, -30], scaleRange: [1, 1.25], delay: -12, duration: 28,
  },
  {
    top: "80%", left: "10%", size: 260, blur: 120,
    color: "color-mix(in srgb, hsl(var(--accent)) 0.07, transparent)",
    xRange: [0, 20], yRange: [0, 15], scaleRange: [1, 1.15], delay: -4, duration: 20,
  },
  {
    top: "15%", left: "85%", size: 200, blur: 110,
    color: "color-mix(in srgb, hsl(270 60% 55%) 0.05, transparent)",
    xRange: [0, -15], yRange: [0, 20], scaleRange: [1, 1.1], delay: -9, duration: 18,
  },
  {
    top: "70%", left: "50%", size: 240, blur: 100,
    color: "color-mix(in srgb, hsl(42 95% 52%) 0.04, transparent)",
    xRange: [0, 18], yRange: [0, -12], scaleRange: [1, 1.18], delay: -15, duration: 24,
  },
];

type FloatAnimConfig = {
  y: number[];
  rotate: number[];
  scale: number[];
  transition: {
    duration: number;
    delay: number;
    repeat: number;
    ease: EaseValue;
  };
};

const makeIconAnim = (icon: FloatingIcon): FloatAnimConfig => ({
  y: icon.yRange,
  rotate: icon.rotateRange,
  scale: [1, 1.08, 1],
  transition: {
    duration: icon.duration,
    delay: icon.delay,
    repeat: Infinity,
    ease: "easeInOut",
  },
});

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

    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(hsl(var(--border) / 0.2) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.2) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        opacity: 0.25,
      }}
    />

    <div className="scanline-overlay" />

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

    <div className="absolute top-[8%] left-[5%] h-96 w-96 rounded-full blur-[130px] morph-blob" style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 0.07, transparent)" }} />
    <div className="absolute bottom-[15%] right-[8%] h-80 w-80 rounded-full blur-[110px] morph-blob" style={{ background: "color-mix(in srgb, var(--region-secondary, hsl(var(--accent))) 0.06, transparent)", animationDelay: "-5s" }} />
    <div className="absolute top-[45%] left-[55%] h-96 w-96 rounded-full blur-[140px] morph-blob" style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 0.05, transparent)", animationDelay: "-10s" }} />
    <div className="absolute top-[75%] left-[25%] h-72 w-72 rounded-full blur-[100px] morph-blob-slow" style={{ background: "color-mix(in srgb, hsl(270 60% 55%) 0.04, transparent)", animationDelay: "-8s" }} />

    <div className="aurora-beam aurora-beam-1" />
    <div className="aurora-beam aurora-beam-2" />
    <div className="aurora-beam aurora-beam-3" />

    <div className="vignette-overlay" />

    {floatingIcons.map((item, i) => (
      <motion.span
        key={`ficon-${i}`}
        animate={makeIconAnim(item)}
        className="absolute select-none"
        style={{
          top: item.top,
          left: item.left,
          fontSize: item.size,
          opacity: item.opacity,
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {item.icon}
      </motion.span>
    ))}

    <motion.svg animate={floatRotate(0, 7)} className="absolute top-[6%] left-[4%] w-24 h-24 text-primary opacity-[0.06] dark:opacity-[0.08]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6" y="16" width="52" height="32" rx="4" />
      <path d="M22 16v32" strokeDasharray="4 3" />
      <circle cx="42" cy="32" r="5" />
    </motion.svg>

    <motion.svg animate={floatRotate(1, 8)} className="absolute top-[12%] right-[8%] w-20 h-20 text-accent opacity-[0.06] dark:opacity-[0.08]" viewBox="0 0 64 64" fill="currentColor">
      <path d="M32 4l7.5 18.5H60l-15 12 5.5 19L32 42l-18.5 11.5 5.5-19-15-12h20.5z" />
    </motion.svg>

    <motion.svg animate={floatRotate(2, 9)} className="absolute top-[35%] left-[2%] w-20 h-20 text-primary opacity-[0.05] dark:opacity-[0.07]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="10" y="26" width="44" height="30" rx="3" />
      <rect x="8" y="18" width="48" height="10" rx="3" />
      <line x1="32" y1="18" x2="32" y2="56" />
      <path d="M32 18c-4-8-14-8-14 0" />
      <path d="M32 18c4-8 14-8 14 0" />
    </motion.svg>

    <motion.svg animate={floatRotate(0.5, 7.5)} className="absolute top-[50%] right-[5%] w-22 h-22 text-accent opacity-[0.05] dark:opacity-[0.07]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 10h24v20c0 8-5 14-12 14s-12-6-12-14z" />
      <path d="M20 16h-8c0 10 6 14 8 14" />
      <path d="M44 16h8c0 10-6 14-8 14" />
      <line x1="26" y1="44" x2="38" y2="44" />
      <rect x="24" y="48" width="16" height="4" rx="1" />
    </motion.svg>

    <motion.svg animate={floatRotate(3, 10)} className="absolute top-[72%] left-[10%] w-16 h-16 text-primary opacity-[0.05] dark:opacity-[0.06]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="10" y="10" width="44" height="44" rx="8" />
      <circle cx="24" cy="24" r="3" fill="currentColor" />
      <circle cx="40" cy="24" r="3" fill="currentColor" />
      <circle cx="24" cy="40" r="3" fill="currentColor" />
      <circle cx="40" cy="40" r="3" fill="currentColor" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </motion.svg>

    <motion.svg animate={floatRotate(1.5, 6)} className="absolute top-[20%] left-[48%] w-14 h-14 text-accent opacity-[0.05] dark:opacity-[0.06]" viewBox="0 0 64 64" fill="currentColor">
      <path d="M32 0l4 28L64 32l-28 4L32 64l-4-28L0 32l28-4z" />
    </motion.svg>

    <motion.svg animate={floatRotate(2.5, 8.5)} className="absolute top-[82%] right-[28%] w-18 h-18 text-accent opacity-[0.04] dark:opacity-[0.06]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="32" cy="32" rx="20" ry="22" />
      <ellipse cx="32" cy="32" rx="14" ry="16" />
      <text x="32" y="38" textAnchor="middle" fontSize="16" fill="currentColor" fontWeight="bold">$</text>
    </motion.svg>

    <motion.svg animate={floatRotate(4, 9)} className="absolute top-[62%] left-[58%] w-14 h-14 text-primary opacity-[0.04] dark:opacity-[0.05]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="16" width="52" height="32" rx="4" />
      <path d="M22 16v32" strokeDasharray="4 3" />
    </motion.svg>

    <motion.svg animate={floatRotate(1, 10)} className="absolute top-[28%] right-[22%] w-16 h-16 text-primary opacity-[0.04] dark:opacity-[0.05]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="20" width="22" height="24" rx="6" />
      <rect x="38" y="20" width="22" height="24" rx="6" />
      <line x1="26" y1="32" x2="38" y2="32" />
    </motion.svg>

    <motion.svg animate={floatRotate(3.5, 8)} className="absolute top-[42%] right-[42%] w-14 h-14 text-accent opacity-[0.04] dark:opacity-[0.05]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 44l8-28 12 14 4-18 4 18 12-14 8 28z" />
      <rect x="8" y="44" width="48" height="8" rx="2" />
    </motion.svg>

    <motion.svg animate={floatRotate(2, 7)} className="absolute top-[88%] left-[35%] w-12 h-12 text-accent opacity-[0.04] dark:opacity-[0.05]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M32 4l24 28-24 28-24-28z" />
      <path d="M16 32h32" strokeDasharray="3 3" />
    </motion.svg>

    <motion.svg animate={floatRotate(0.8, 11)} className="absolute top-[3%] left-[88%] w-16 h-16 text-primary opacity-[0.04] dark:opacity-[0.05]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="32" cy="32" r="20" />
      <path d="M32 12v40M12 32h40" />
      <circle cx="32" cy="32" r="8" fill="currentColor" opacity="0.3" />
    </motion.svg>

    <motion.svg animate={floatRotate(1.3, 9.5)} className="absolute top-[95%] left-[8%] w-14 h-14 text-accent opacity-[0.035] dark:opacity-[0.05]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16 48V20l16-8 16 8v28" />
      <rect x="24" y="32" width="16" height="16" rx="1" />
      <path d="M28 32v-8h8v8" />
    </motion.svg>

    <motion.svg animate={floatRotate(2.8, 8.3)} className="absolute top-[48%] left-[75%] w-12 h-12 text-primary opacity-[0.035] dark:opacity-[0.045]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="32,4 58,20 58,44 32,60 6,44 6,20" />
      <polygon points="32,14 48,24 48,40 32,50 16,40 16,24" />
    </motion.svg>

    <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{
      backgroundImage: "radial-gradient(hsl(var(--primary)) 0.5px, transparent 0.5px)",
      backgroundSize: "32px 32px",
    }} />

    <div className="shimmer-floor" />
  </div>
));

BackgroundDecorations.displayName = "BackgroundDecorations";
export default BackgroundDecorations;
