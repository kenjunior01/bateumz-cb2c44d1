import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import bateuLogo from "@/assets/bateu-logo.png";
import { sfx } from "@/lib/sound-engine";

const SHAPES = ["\u25C6", "\u25C7", "\u25B2", "\u25B3", "\u25CF", "\u25CB", "\u25A0", "\u25A1"] as const;
const COLORS = ["#009140", "#FFD700", "#D7263D", "#6366f1", "#06b6d4", "#f59e0b"];

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  shape: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
}

function useParticles(count: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(0);

  const spawnParticle = useCallback((x: number, y: number) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 1.5;
    particlesRef.current.push({
      id: Math.random(),
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      size: 2 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0.6 + Math.random() * 0.4,
      shape: Math.floor(Math.random() * SHAPES.length),
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 4,
      life: 0,
      maxLife: 80 + Math.random() * 120,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      for (let i = 0; i < 3; i++) spawnParticle(e.clientX, e.clientY);
    };
    window.addEventListener("mousemove", handleMouse);

    let autoSpawnTimer = 0;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      autoSpawnTimer++;
      if (autoSpawnTimer % 8 === 0) {
        spawnParticle(Math.random() * canvas.width, canvas.height);
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      if (autoSpawnTimer % 12 === 0) {
        const angle = autoSpawnTimer * 0.05;
        const radius = 100 + Math.sin(autoSpawnTimer * 0.02) * 50;
        spawnParticle(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.005;
        p.rotation += p.rotSpeed;

        const lifeRatio = p.life / p.maxLife;
        const alpha = p.alpha * (1 - lifeRatio);

        if (p.life >= p.maxLife || alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        const s = p.size * (1 - lifeRatio * 0.5);
        ctx.font = `${s * 2}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(SHAPES[p.shape], 0, 0);

        ctx.beginPath();
        ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      if (mx > 0 && my > 0) {
        const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, 150);
        gradient.addColorStop(0, `rgba(${hexToRgb("#009140")},0.08)`);
        gradient.addColorStop(0.5, `rgba(${hexToRgb("#FFD700")},0.04)`);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, [spawnParticle]);

  return canvasRef;
}

const GridOverlay = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
      <defs>
        <pattern id="loadingGrid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#loadingGrid)" />
    </svg>
    <motion.div
      className="absolute inset-0"
      style={{
        background: "radial-gradient(ellipse at center, transparent 30%, hsl(var(--background)) 80%)",
      }}
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

const OrbitRing = ({ radius, duration, delay, color, width }: {
  radius: number; duration: number; delay: number; color: string; width: number;
}) => (
  <motion.div
    className="absolute rounded-full border"
      style={{
        width: radius * 2,
        height: radius * 2,
        borderColor: color,
        borderWidth: width,
        top: "50%",
        left: "50%",
        marginTop: -radius,
        marginLeft: -radius,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    />
);

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const [tipIndex] = useState(Math.floor(Math.random() * 6));
  const canvasRef = useParticles(60);
  const progressMotion = useMotionValue(0);
  const progressWidth = useTransform(progressMotion, [0, 100], ["0%", "100%"]);

  const TIPS = [
    "Preparando os jogos...",
    "Carregando 68+ jogos interativos...",
    "Conectando ao servidor...",
    "Preparando sua experiencia...",
    "Quase pronto...",
    "Iniciando o motor de jogos...",
  ];

  // Energy burst effect when near completion
  const burstCanvasRef = useRef<HTMLCanvasElement>(null);
  const burstActiveRef = useRef(false);
  const burstParticlesRef = useRef<Array<{x:number;y:number;vx:number;vy:number;size:number;color:string;life:number;maxLife:number}>>([]);

  const triggerBurst = useCallback(() => {
    if (burstActiveRef.current) return;
    burstActiveRef.current = true;
    try { sfx.levelUp(); } catch {}

    const canvas = burstCanvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 3 + Math.random() * 8;
      burstParticlesRef.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0,
        maxLife: 40 + Math.random() * 40,
      });
    }

    const burstLoop = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pts = burstParticlesRef.current;
      let alive = false;
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        const ratio = 1 - p.life / p.maxLife;
        if (ratio <= 0) { pts.splice(i, 1); continue; }
        alive = true;
        ctx.save();
        ctx.globalAlpha = ratio;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * ratio, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (alive) requestAnimationFrame(burstLoop);
      else burstActiveRef.current = false;
    };
    requestAnimationFrame(burstLoop);
  }, []);

  useEffect(() => {
    if (progress >= 98 && !burstActiveRef.current) {
      triggerBurst();
    }
  }, [progress, triggerBurst]);

  // Resize burst canvas
  useEffect(() => {
    const canvas = burstCanvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);


  useEffect(() => {
    const phaseTimer = setTimeout(() => setPhase(1), 800);
    return () => clearTimeout(phaseTimer);
  }, []);

  useEffect(() => {
    if (phase === 0) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + 2 + Math.random() * 8, 100);
        progressMotion.set(next);
        return next;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [phase, progressMotion]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />
      <canvas ref={burstCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 8 }} />

      <GridOverlay />

      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
        <motion.div
          className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,145,64,0.12) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.4, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 70%)" }}
          animate={{ scale: [1.2, 0.8, 1.2], x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(circle, rgba(215,38,61,0.06) 0%, transparent 70%)" }}
          animate={{ scale: [0.8, 1.5, 0.8], rotate: [0, 180, 360] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 3 }}>
        <div className="relative" style={{ width: 280, height: 280 }}>
          <OrbitRing radius={120} duration={20} delay={0} color="rgba(0,145,64,0.15)" width={1} />
          <OrbitRing radius={95} duration={15} delay={-3} color="rgba(255,215,0,0.12)" width={1} />
          <OrbitRing radius={140} duration={25} delay={-7} color="rgba(99,102,241,0.1)" width={0.5} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i / 6) * Math.PI * 2;
            const r = 120;
            const x = Math.cos(angle) * r + 140 - 4;
            const y = Math.sin(angle) * r + 140 - 4;
            return (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{ left: x, top: y, background: COLORS[i % COLORS.length] }}
                animate={{
                  scale: [0.5, 1.5, 0.5],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          className="relative"
          initial={{ scale: 0, rotate: -270 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
        >
          {/* Pulsing glow ring */}
          <motion.div
            className="absolute -inset-8 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(0,145,64,0.15) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -inset-4 rounded-3xl"
            style={{ background: "conic-gradient(from 0deg, #009140, #FFD700, #D7263D, #6366f1, #009140)", filter: "blur(1px)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative rounded-2xl p-1" style={{ background: "hsl(var(--background))" }}>
            <motion.img
              src={bateuLogo}
              alt="Bateu"
              className="h-20 w-20 md:h-24 md:w-24"
              style={{ filter: "drop-shadow(0 0 24px rgba(0,145,64,0.4))" }}
              animate={{
                filter: [
                  "drop-shadow(0 0 24px rgba(0,145,64,0.4))",
                  "drop-shadow(0 0 32px rgba(255,215,0,0.4))",
                  "drop-shadow(0 0 24px rgba(0,145,64,0.4))",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 text-center"
        >
          <motion.h1
            className="font-display text-3xl md:text-5xl font-bold tracking-tight"
            animate={{ opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="bg-gradient-to-r from-[#009140] via-[#FFD700] to-[#D7263D] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
              Bateu
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-1 text-sm text-muted-foreground tracking-widest uppercase font-medium"
          >
            Plataforma de Jogos
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: phase === 1 ? 1 : 0, y: phase === 1 ? 0 : 10 }}
          transition={{ duration: 0.5 }}
          className="mt-10 w-64 md:w-80"
        >
          <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--secondary))" }}>
            {/* Glow underlay */}
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full blur-sm"
              style={{
                width: progressWidth,
                background: "linear-gradient(90deg, #009140, #FFD700, #D7263D)",
                backgroundSize: "200% 100%",
                opacity: 0.6,
              }}
              animate={{
                backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
              }}
              transition={{ backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" } }}
            />
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full relative"
              style={{
                width: progressWidth,
                background: "linear-gradient(90deg, #009140, #FFD700, #D7263D)",
                backgroundSize: "200% 100%",
              }}
              animate={{
                backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
              }}
              transition={{ width: { duration: 0.15 }, backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" } }}
            />
            {/* Shimmer effect on progress bar */}
            <motion.div
              className="absolute inset-y-0 w-16 rounded-full"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                left: progressWidth,
              }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-0 right-0 w-6 h-full"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4))",
                filter: "blur(2px)",
              }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <motion.p
              key={tipIndex}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[11px] text-muted-foreground"
            >
              {TIPS[tipIndex]}
            </motion.p>
            <motion.span
              key={Math.floor(progress)}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[11px] font-mono font-bold text-muted-foreground"
            >
              {Math.floor(progress)}%
            </motion.span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8 flex items-center gap-6"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center gap-2"
            >
              <div className="relative flex items-center justify-center w-12 h-12">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-dashed"
                  style={{ borderColor: "hsl(var(--muted))" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: i * 0.5 }}
                />
                <motion.span
                  className="text-xl"
                  animate={{ y: [0, -4, 0], scale: [1, 1.1, 1] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                >
                  {["\uD83C\uDFAE", "\u26BD", "\uD83C\uDFB2"][i]}
                </motion.span>
              </div>
              <motion.div
                className="w-1 h-1 rounded-full"
                style={{ background: COLORS[i * 2] }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ zIndex: 10 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: progress / 100 }}
        transition={{ duration: 0.2 }}
        >
        <div
          className="h-full"
          style={{
            background: "linear-gradient(90deg, #009140, #FFD700, #D7263D, #6366f1)",
            backgroundSize: "300% 100%",
            animation: "mesh-move 3s linear infinite",
          }}
        />
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;
