import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================
// CONFETTI PARTICLES BURST
// ============================================================

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  shape: 'rect' | 'circle';
}

const CONFETTI_COLORS = ['#00d4ff', '#7b2ff7', '#fbbf24', '#2ea043', '#ff4655', '#ff6b35', '#58a6ff', '#f97316'];

export function ConfettiBurst({ trigger, x = 50, y = 50, count = 50 }: {
  trigger: number;
  x?: number;
  y?: number;
  count?: number;
}) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const newParticles: ConfettiParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const velocity = 3 + Math.random() * 5;
      newParticles.push({
        id: i,
        x: 0,
        y: 0,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.8,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        velocityX: Math.cos(angle) * velocity,
        velocityY: Math.sin(angle) * velocity - 2,
        rotationSpeed: (Math.random() - 0.5) * 15,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(timer);
  }, [trigger, count]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200]" style={{ overflow: 'hidden' }}>
      <div
        className="absolute"
        style={{ left: `${x}%`, top: `${y}%` }}
      >
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: p.scale }}
              animate={{
                x: p.velocityX * 60,
                y: p.velocityY * 60 + 200,
                rotate: p.rotation + p.rotationSpeed * 20,
                opacity: 0,
                scale: p.scale * 0.3,
              }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              exit={{ opacity: 0 }}
              className="absolute"
              style={{
                width: p.shape === 'rect' ? 8 : 6,
                height: p.shape === 'rect' ? 12 : 6,
                borderRadius: p.shape === 'circle' ? '50%' : 2,
                backgroundColor: p.color,
                transformOrigin: 'center',
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================
// COIN RAIN EFFECT (for wins)
// ============================================================

interface Coin {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

export function CoinRain({ trigger, count = 20 }: { trigger: number; count?: number }) {
  const [coins, setCoins] = useState<Coin[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const newCoins: Coin[] = [];
    for (let i = 0; i < count; i++) {
      newCoins.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 2 + Math.random() * 2,
        size: 12 + Math.random() * 12,
        rotation: Math.random() * 360,
      });
    }
    setCoins(newCoins);
    const timer = setTimeout(() => setCoins([]), 5000);
    return () => clearTimeout(timer);
  }, [trigger, count]);

  if (coins.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200]" style={{ overflow: 'hidden' }}>
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          initial={{ y: -30, opacity: 0, rotate: 0 }}
          animate={{
            y: window.innerHeight + 30,
            opacity: [0, 1, 1, 0.5, 0],
            rotate: coin.rotation + 720,
            x: [0, (Math.random() - 0.5) * 40, 0],
          }}
          transition={{
            duration: coin.duration,
            delay: coin.delay,
            ease: 'easeIn',
          }}
          className="absolute p2p-coin-falling"
          style={{ left: `${coin.x}%` }}
        >
          <div
            className="rounded-full flex items-center justify-center font-black text-[#1a1a00]"
            style={{
              width: coin.size,
              height: coin.size,
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24)',
              boxShadow: '0 0 10px rgba(251,191,36,0.4), inset 0 1px 2px rgba(255,255,255,0.4)',
              fontSize: coin.size * 0.45,
            }}
          >
            $
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================
// SCREEN SHAKE
// ============================================================

export function ScreenShake({ trigger, intensity = 'medium' as 'light' | 'medium' | 'heavy' }) {
  const [shaking, setShaking] = useState(false);
  const intensityMap = { light: 3, medium: 6, heavy: 12 };

  useEffect(() => {
    if (!trigger) return;
    setShaking(true);
    const timer = setTimeout(() => setShaking(false), 400);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!shaking) return null;

  const distance = intensityMap[intensity];
  return (
    <style>{`
      .p2p-shake-active {
        animation: p2p-screen-shake 0.4s ease-out;
      }
      @keyframes p2p-screen-shake {
        0% { transform: translate(0, 0); }
        10% { transform: translate(-${distance}px, ${distance / 2}px); }
        20% { transform: translate(${distance}px, -${distance / 2}px); }
        30% { transform: translate(-${distance / 2}px, ${distance}px); }
        40% { transform: translate(${distance / 2}px, -${distance}px); }
        50% { transform: translate(-${distance}px, 0); }
        60% { transform: translate(${distance}px, 0); }
        70% { transform: translate(0, -${distance / 2}px); }
        80% { transform: translate(0, ${distance / 2}px); }
        90% { transform: translate(-${distance / 3}px, 0); }
        100% { transform: translate(0, 0); }
      }
    `}</style>
  );
}

// ============================================================
// FLOATING VS PARTICLES (ambient background)
// ============================================================

export function ArenaParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string; life: number;
    }> = [];

    const colors = ['rgba(0,212,255,', 'rgba(123,47,247,', 'rgba(255,70,85,', 'rgba(251,191,36,'];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const createParticle = () => {
      const colorBase = colors[Math.floor(Math.random() * colors.length)];
      return {
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.3 - Math.random() * 0.8,
        size: 1 + Math.random() * 2.5,
        opacity: 0.1 + Math.random() * 0.3,
        color: colorBase,
        life: 0,
        maxLife: 200 + Math.random() * 300,
      };
    };

    for (let i = 0; i < 40; i++) {
      const p = createParticle();
      p.y = Math.random() * canvas.height;
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const lifeRatio = p.life / p.maxLife;
        const alpha = p.opacity * (lifeRatio < 0.1 ? lifeRatio / 0.1 : lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1);

        if (p.life >= p.maxLife || p.y < -10) {
          particles[i] = createParticle();
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${alpha})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${alpha * 0.15})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}

// ============================================================
// STREAK FIRE EFFECT
// ============================================================

export function StreakFire({ streak, active = true }: { streak: number; active?: boolean }) {
  if (!active || streak < 2) return null;

  const intensity = Math.min(streak, 10);
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < intensity * 3; i++) {
      arr.push({
        id: i,
        delay: Math.random() * 0.5,
        x: (Math.random() - 0.5) * 20,
        y: -10 - Math.random() * 15,
        size: 3 + Math.random() * 4,
        duration: 0.8 + Math.random() * 0.6,
      });
    }
    return arr;
  }, [intensity]);

  return (
    <div className="relative inline-flex">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{ left: `calc(50% + ${p.x}px)`, bottom: '100%' }}
          animate={{
            y: [-p.y, -p.y * 2.5],
            opacity: [0.8, 0],
            scale: [1, 0.3],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: p.size,
              height: p.size,
              background: `radial-gradient(circle, #fbbf24, #f97316, #ff4655, transparent)`,
              boxShadow: `0 0 ${p.size * 2}px rgba(249,115,22,0.6)`,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================
// GLOW PULSE RING (for active duels)
// ============================================================

export function GlowPulseRing({ color = '#00d4ff', size = 120 }: { color?: string; size?: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <motion.div
        className="absolute rounded-full"
        style={{ width: size, height: size, border: `2px solid ${color}40` }}
        animate={{
          scale: [1, 1.3, 1.5],
          opacity: [0.5, 0.2, 0],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: size, height: size, border: `1px solid ${color}30` }}
        animate={{
          scale: [1, 1.5, 1.8],
          opacity: [0.3, 0.1, 0],
        }}
        transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: 'easeOut' }}
      />
    </div>
  );
}

// ============================================================
// TYPING INDICATOR (for chat)
// ============================================================

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-zinc-500"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ============================================================
// ESCROW LOCK ANIMATION
// ============================================================

export function EscrowLockAnimation({ locked }: { locked: boolean }) {
  return (
    <motion.div
      className="flex items-center justify-center"
      animate={locked
        ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, -5, 0] }
        : { scale: 1, rotate: 0 }
      }
      transition={{ duration: 0.4 }}
    >
      <motion.div
        animate={locked ? { color: '#fbbf24' } : { color: '#71717a' }}
        className="text-lg"
      >
        {locked ? '\uD83D\uDD12' : '\uD83D\uDD13'}
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// PULSE DOT (online / live indicator)
// ============================================================

export function PulseDot({ color = '#2ea043', size = 8 }: { color?: string; size?: number }) {
  return (
    <span className="relative flex" style={{ width: size, height: size }}>
      <motion.span
        className="absolute inline-flex rounded-full"
        style={{ width: size, height: size, backgroundColor: color }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.span
        className="absolute inline-flex rounded-full"
        style={{ width: size, height: size, backgroundColor: color }}
        animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </span>
  );
}

// ============================================================
// NUMBER TICKER (animated number change)
// ============================================================

export function NumberTicker({ value, className = '' }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current === value) return;
    setIsAnimating(true);
    const diff = value - prevValue.current;
    const steps = 20;
    const stepSize = diff / steps;
    let current = prevValue.current;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current += stepSize;
      setDisplayValue(Math.round(current));
      if (step >= steps) {
        setDisplayValue(value);
        setIsAnimating(false);
        clearInterval(interval);
      }
    }, 30);

    prevValue.current = value;
    return () => clearInterval(interval);
  }, [value]);

  return (
    <motion.span
      className={className + (isAnimating ? ' p2p-number-tick' : '')}
      animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.15 }}
    >
      {displayValue.toLocaleString()}
    </motion.span>
  );
}

// ============================================================
// TOAST NOTIFICATION WITH SOUND
// ============================================================

export function P2PToast({ message, icon, color, show }: {
  message: string;
  icon: string;
  color: string;
  show: boolean;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: 100, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 100, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-20 right-4 z-[150] flex items-center gap-3 px-4 py-3 rounded-xl max-w-sm"
          style={{
            background: 'rgba(15,15,25,0.95)',
            border: `1px solid ${color}40`,
            boxShadow: `0 0 30px ${color}20, 0 10px 40px rgba(0,0,0,0.5)`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <span className="text-2xl">{icon}</span>
          <span className="text-sm font-semibold text-white">{message}</span>
          <motion.div
            className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
            style={{ background: color }}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 3, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// HOLOGRAPHIC CARD BORDER (shimmer effect)
// ============================================================

export function HolographicBorder({ children, intensity = 1 }: {
  children: React.ReactNode;
  intensity?: number;
}) {
  return (
    <div className="relative group">
      <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `conic-gradient(
            from var(--p2p-holo-angle, 0deg),
            #00d4ff${intensity > 0.5 ? '' : '44'},
            #7b2ff7${intensity > 0.5 ? '' : '44'},
            #ff4655${intensity > 0.5 ? '' : '44'},
            #fbbf24${intensity > 0.5 ? '' : '44'},
            #00d4ff${intensity > 0.5 ? '' : '44'}
          )`,
          filter: `blur(${intensity > 0.5 ? 2 : 4}px)`,
        }}
      />
      <div className="relative rounded-2xl" style={{ background: '#0f0f19' }}>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// ENERGY WAVE (on accept/create)
// ============================================================

export function EnergyWave({ trigger, color = '#00d4ff' }: { trigger: number; color?: string }) {
  const [waves, setWaves] = useState<number[]>([]);

  useEffect(() => {
    if (!trigger) return;
    setWaves([0, 1, 2]);
    const timer = setTimeout(() => setWaves([]), 1500);
    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {waves.map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ border: `2px solid ${color}60` }}
          initial={{ width: 0, height: 0, opacity: 0.8 }}
          animate={{ width: 400, height: 400, opacity: 0 }}
          transition={{ duration: 1.2, delay: i * 0.2, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ============================================================
// VIBRATION (mobile haptic feedback)
// ============================================================

export function vibrate(pattern: number | number[] = 50) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (e) { /* ok */ }
  }
}

export const haptics = {
  light: () => vibrate(10),
  medium: () => vibrate(25),
  heavy: () => vibrate(50),
  success: () => vibrate([20, 50, 20]),
  error: () => vibrate([50, 30, 50, 30, 50]),
  notification: () => vibrate([30, 50, 30]),
};

// ============================================================
// MAGNETIC HOVER EFFECT (button follows cursor slightly)
// ============================================================

export function useMagneticHover(intensity: number = 0.3) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    ref.current.style.transform = `translate(${x * intensity}px, ${y * intensity}px)`;
  }, [intensity]);

  const handleMouseLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = 'translate(0, 0)';
  }, []);

  return { ref, handleMouseMove, handleMouseLeave };
}
