import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Bot, Trophy, RotateCcw, Zap, Target, Bomb, Cherry, Flame } from 'lucide-react';

// ===================== TYPES =====================

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GamePhase = 'menu' | 'playing' | 'gameover';

interface Fruit {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: number;
  sliced: boolean;
  missed: boolean;
  rotation: number;
  rotSpeed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  kind: 'circle' | 'droplet' | 'spark';
}

interface SlicePoint {
  x: number;
  y: number;
  time: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface SplashRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  color: string;
}

interface BgStar {
  x: number;
  y: number;
  size: number;
  speed: number;
  offset: number;
}

// ===================== CONSTANTS =====================

const CANVAS_W = 360;
const CANVAS_H = 520;
const GRAVITY = 0.32;
const FRUIT_RADIUS = 28;
const BOMB_RADIUS = 26;
const SLICE_TRAIL_DURATION = 200;
const MAX_PARTICLES = 300;

const FRUIT_TYPES: { name: string; color: string; inner: string; points: number; emoji: string }[] = [
  { name: 'maca', color: '#ef4444', inner: '#fca5a5', points: 1, emoji: '\u{1F34E}' },
  { name: 'laranja', color: '#f97316', inner: '#fdba74', points: 2, emoji: '\u{1F34A}' },
  { name: 'melancia', color: '#22c55e', inner: '#86efac', points: 3, emoji: '\u{1F349}' },
  { name: 'uva', color: '#a855f7', inner: '#d8b4fe', points: 2, emoji: '\u{1F347}' },
  { name: 'banana', color: '#eab308', inner: '#fef08a', points: 1, emoji: '\u{1F34C}' },
  { name: 'abacaxi', color: '#d97706', inner: '#fde68a', points: 4, emoji: '\u{1F34D}' },
];

const BOMB_INFO = { color: '#1f2937', inner: '#6b7280', points: 0, emoji: '\u{1F4A3}' };

const SPAWN_INTERVAL_INITIAL = 1200;
const SPAWN_INTERVAL_MIN = 500;
const SPAWN_INTERVAL_DECAY = 8;
const BOMB_CHANCE = 0.12;

const BG_STARS: BgStar[] = Array.from({ length: 50 }, () => ({
  x: Math.random() * CANVAS_W,
  y: Math.random() * CANVAS_H,
  size: 0.5 + Math.random() * 1.5,
  speed: 0.5 + Math.random() * 2,
  offset: Math.random() * Math.PI * 2,
}));

// ===================== COMPONENT =====================

export default function FruitNinjaGame({ onScore, liveCode }: Props) {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fruitninja-highscore');
      return stored ? parseInt(stored, 10) : 0;
    }
    return 0;
  });
  const [botMode, setBotMode] = useState(false);
  const [fruitsSliced, setFruitsSliced] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fruitsRef = useRef<Fruit[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const sliceTrailRef = useRef<SlicePoint[]>([]);
  const splashRingsRef = useRef<SplashRing[]>([]);
  const scorePopupsRef = useRef<ScorePopup[]>([]);
  const screenFlashRef = useRef<{ color: string; intensity: number }>({ color: '#ff4444', intensity: 0 });
  const screenShakeRef = useRef<{ intensity: number; life: number }>({ intensity: 0, life: 0 });
  const popupIdRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const multiplierRef = useRef(1);
  const maxComboRef = useRef(0);
  const slicedCountRef = useRef(0);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);
  const nextIdRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const spawnIntervalRef = useRef(SPAWN_INTERVAL_INITIAL);
  const gameOverTriggered = useRef(false);
  const isSlicingRef = useRef(false);
  const lastSliceTimeRef = useRef(0);
  const prevMouseRef = useRef<{ x: number; y: number } | null>(null);
  const phaseRef = useRef<GamePhase>('menu');
  const botIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onScoreRef = useRef(onScore);
  useEffect(() => { onScoreRef.current = onScore; }, [onScore]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ===================== SPAWN HELPERS =====================

  const spawnParticles = useCallback((x: number, y: number, count: number, color: string, kind: Particle['kind'] = 'circle') => {
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length >= MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = kind === 'spark' ? 3 + Math.random() * 6 : 2 + Math.random() * 8;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed * (kind === 'droplet' ? 1.4 : 1),
        vy: Math.sin(angle) * speed * (kind === 'droplet' ? 1.4 : 1) - (kind === 'spark' ? 4 : 2),
        life: 1,
        maxLife: kind === 'spark' ? 15 + Math.random() * 12 : 25 + Math.random() * 25,
        color,
        size: kind === 'spark' ? 1 + Math.random() * 2 : kind === 'droplet' ? 2 + Math.random() * 4 : 3 + Math.random() * 6,
        kind,
      });
    }
  }, []);

  const spawnSplashRing = useCallback((x: number, y: number, color: string, maxRadius: number = 50) => {
    splashRingsRef.current.push({ x, y, radius: 5, maxRadius, life: 1, color });
  }, []);

  const spawnScorePopup = useCallback((x: number, y: number, text: string, color: string) => {
    scorePopupsRef.current.push({ x, y, text, color, life: 1, maxLife: 50 });
  }, []);

  const spawnFruit = useCallback(() => {
    const id = nextIdRef.current++;
    const isBomb = Math.random() < BOMB_CHANCE;
    const margin = 60;
    const x = margin + Math.random() * (CANVAS_W - margin * 2);
    const targetHeight = 80 + Math.random() * 180;
    const vy = -Math.sqrt(2 * GRAVITY * targetHeight);
    const vx = (Math.random() - 0.5) * 4;
    const radius = isBomb ? BOMB_RADIUS : FRUIT_RADIUS;
    const type = isBomb ? -1 : Math.floor(Math.random() * FRUIT_TYPES.length);

    fruitsRef.current.push({
      id, x, y: CANVAS_H + radius, vx, vy, radius, type: type as number, sliced: false, missed: false,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.08,
    });
  }, []);

  // ===================== SLICE LOGIC =====================

  const sliceFruit = useCallback((fruit: Fruit) => {
    if (fruit.sliced) return;
    fruit.sliced = true;

    if (fruit.type === -1) {
      // Dramatic bomb explosion
      spawnParticles(fruit.x, fruit.y, 30, '#ff4444', 'circle');
      spawnParticles(fruit.x, fruit.y, 25, '#ff8800', 'droplet');
      spawnParticles(fruit.x, fruit.y, 20, '#ffcc00', 'spark');
      spawnParticles(fruit.x, fruit.y, 15, '#ffffff', 'spark');
      spawnSplashRing(fruit.x, fruit.y, '#ff4444', 90);
      spawnSplashRing(fruit.x, fruit.y, '#ff8800', 65);
      spawnSplashRing(fruit.x, fruit.y, '#ffcc00', 110);
      screenFlashRef.current = { color: '#ff4444', intensity: 0.9 };
      screenShakeRef.current = { intensity: 18, life: 1 };
      setShakeKey(k => k + 1);
      if (!gameOverTriggered.current) {
        gameOverTriggered.current = true;
        setTimeout(() => {
          if (phaseRef.current === 'playing') {
            setPhase('gameover');
          }
        }, 600);
      }
      return;
    }

    const ft = FRUIT_TYPES[fruit.type];

    // Juice splatter - main color droplets
    spawnParticles(fruit.x, fruit.y, 10, ft.color, 'droplet');
    // Inner juice - lighter circles
    spawnParticles(fruit.x, fruit.y, 8, ft.inner, 'circle');
    // White sparkle burst
    spawnParticles(fruit.x, fruit.y, 5, '#ffffff', 'spark');
    // Colored sparkles
    spawnParticles(fruit.x, fruit.y, 4, ft.color, 'spark');
    // Splash rings
    spawnSplashRing(fruit.x, fruit.y, ft.color, 35 + ft.points * 10);
    spawnSplashRing(fruit.x, fruit.y, ft.inner, 25 + ft.points * 8);

    slicedCountRef.current++;
    setFruitsSliced(slicedCountRef.current);

    // Combo logic
    const now = Date.now();
    if (now - lastSliceTimeRef.current < 600) {
      comboRef.current++;
    } else {
      comboRef.current = 1;
    }
    lastSliceTimeRef.current = now;

    if (comboRef.current > maxComboRef.current) {
      maxComboRef.current = comboRef.current;
      setMaxCombo(maxComboRef.current);
    }

    // Multiplier based on combo
    if (comboRef.current >= 5) {
      multiplierRef.current = 4;
    } else if (comboRef.current >= 3) {
      multiplierRef.current = 3;
    } else if (comboRef.current >= 2) {
      multiplierRef.current = 2;
    } else {
      multiplierRef.current = 1;
    }

    const points = ft.points * multiplierRef.current;
    scoreRef.current += points;
    setScore(scoreRef.current);
    setCombo(comboRef.current);
    setMultiplier(multiplierRef.current);

    // Score popup
    const popupText = multiplierRef.current > 1 ? `+${points} x${multiplierRef.current}` : `+${points}`;
    const popupColor = multiplierRef.current >= 4 ? '#ff6666' : multiplierRef.current >= 3 ? '#fbbf24' : multiplierRef.current >= 2 ? '#34d399' : '#ffffff';
    spawnScorePopup(fruit.x, fruit.y - 20, popupText, popupColor);
  }, [spawnParticles, spawnSplashRing, spawnScorePopup]);

  const checkSliceAt = useCallback((x: number, y: number) => {
    for (const fruit of fruitsRef.current) {
      if (fruit.sliced || fruit.missed) continue;
      const dx = x - fruit.x;
      const dy = y - fruit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < fruit.radius + 10) {
        sliceFruit(fruit);
      }
    }
  }, [sliceFruit]);

  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0] || (e as React.TouchEvent<HTMLCanvasElement>).changedTouches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  // Bot logic
  const botSlice = useCallback(() => {
    if (phaseRef.current !== 'playing' || !botMode) return;
    const fruits = fruitsRef.current.filter(f => !f.sliced && !f.missed && f.type !== -1 && f.y < CANVAS_H * 0.7);
    if (fruits.length > 0 && Math.random() < 0.9) {
      const target = fruits[Math.floor(Math.random() * fruits.length)];
      sliceFruit(target);
    }
  }, [botMode, sliceFruit]);

  useEffect(() => {
    if (botMode && phase === 'playing') {
      botIntervalRef.current = setInterval(botSlice, 150);
    }
    return () => {
      if (botIntervalRef.current) { clearInterval(botIntervalRef.current); botIntervalRef.current = null; }
    };
  }, [botMode, phase, botSlice]);

  // Save high score
  useEffect(() => {
    if (typeof window !== 'undefined' && score > highScore) {
      setHighScore(score);
      localStorage.setItem('fruitninja-highscore', score.toString());
    }
  }, [score, highScore]);

  // ===================== GAME LOOP =====================

  useEffect(() => {
    if (phase !== 'playing') {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    gameOverTriggered.current = false;
    fruitsRef.current = [];
    particlesRef.current = [];
    sliceTrailRef.current = [];
    splashRingsRef.current = [];
    scorePopupsRef.current = [];
    screenFlashRef.current = { color: '#ff4444', intensity: 0 };
    screenShakeRef.current = { intensity: 0, life: 0 };
    popupIdRef.current = 0;
    scoreRef.current = 0;
    livesRef.current = 3;
    comboRef.current = 0;
    multiplierRef.current = 1;
    maxComboRef.current = 0;
    slicedCountRef.current = 0;
    frameRef.current = 0;
    spawnTimerRef.current = 0;
    spawnIntervalRef.current = SPAWN_INTERVAL_INITIAL;
    isSlicingRef.current = false;
    lastSliceTimeRef.current = 0;
    prevMouseRef.current = null;
    setScore(0);
    setLives(3);
    setCombo(0);
    setMultiplier(1);
    setMaxCombo(0);
    setFruitsSliced(0);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const gameLoop = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.67, 2);
      lastTime = time;
      frameRef.current++;

      // Spawn fruits
      spawnTimerRef.current += dt * 16.67;
      if (spawnTimerRef.current >= spawnIntervalRef.current) {
        spawnTimerRef.current = 0;
        spawnFruit();
        spawnIntervalRef.current = Math.max(SPAWN_INTERVAL_MIN, spawnIntervalRef.current - SPAWN_INTERVAL_DECAY);
      }

      // Update fruits
      for (const f of fruitsRef.current) {
        if (f.sliced) continue;
        f.x += f.vx * dt;
        f.vy += GRAVITY * dt;
        f.y += f.vy * dt;
        f.rotation += f.rotSpeed * dt;

        if (f.y > CANVAS_H + f.radius + 10 && f.vy > 0 && !f.missed) {
          f.missed = true;
          if (f.type !== -1) {
            livesRef.current--;
            setLives(livesRef.current);
            if (livesRef.current <= 0 && !gameOverTriggered.current) {
              gameOverTriggered.current = true;
              screenShakeRef.current = { intensity: 10, life: 0.8 };
              setTimeout(() => {
                if (phaseRef.current === 'playing') setPhase('gameover');
              }, 300);
            }
          }
        }
      }

      // Clean old fruits
      fruitsRef.current = fruitsRef.current.filter(f => !(f.y > CANVAS_H + 100 && f.vy > 0));

      // Update particles
      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.kind === 'spark' ? 0.08 : 0.15) * dt;
        p.life -= (1 / p.maxLife) * dt;
      }
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // Update splash rings
      for (const ring of splashRingsRef.current) {
        ring.life -= 0.04 * dt;
      }
      splashRingsRef.current = splashRingsRef.current.filter(r => r.life > 0);

      // Update score popups
      for (const popup of scorePopupsRef.current) {
        popup.life -= (1 / popup.maxLife) * dt;
      }
      scorePopupsRef.current = scorePopupsRef.current.filter(p => p.life > 0);

      // Clean old slice trail
      const now = Date.now();
      sliceTrailRef.current = sliceTrailRef.current.filter(p => now - p.time < SLICE_TRAIL_DURATION);

      // Decay screen flash
      if (screenFlashRef.current.intensity > 0) {
        screenFlashRef.current.intensity *= Math.pow(0.88, dt);
        if (screenFlashRef.current.intensity < 0.01) screenFlashRef.current.intensity = 0;
      }

      // Decay screen shake
      if (screenShakeRef.current.life > 0) {
        screenShakeRef.current.life -= 0.035 * dt;
      }

      // ---- DRAW ----
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Background gradient with subtle animation
      const bgTime = frameRef.current * 0.005;
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      const rShift = Math.floor(Math.sin(bgTime) * 5);
      grad.addColorStop(0, `rgb(${15 + rShift}, 23, 42)`);
      grad.addColorStop(0.5, '#141a33');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Apply screen shake
      ctx.save();
      if (screenShakeRef.current.life > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current.intensity * screenShakeRef.current.life;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current.intensity * screenShakeRef.current.life;
        ctx.translate(shakeX, shakeY);
      }

      // Background stars (twinkling)
      for (const star of BG_STARS) {
        const twinkle = Math.sin(bgTime * star.speed * 3 + star.offset) * 0.5 + 0.5;
        ctx.globalAlpha = 0.08 + twinkle * 0.25;
        ctx.fillStyle = '#c4b5fd';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * (0.5 + twinkle * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Vignette overlay
      const vignette = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.25, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.85);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Subtle bottom glow
      const bottomGlow = ctx.createLinearGradient(0, CANVAS_H - 80, 0, CANVAS_H);
      bottomGlow.addColorStop(0, 'rgba(16,185,129,0)');
      bottomGlow.addColorStop(1, 'rgba(16,185,129,0.06)');
      ctx.fillStyle = bottomGlow;
      ctx.fillRect(0, CANVAS_H - 80, CANVAS_W, 80);

      // Draw splash rings
      for (const ring of splashRingsRef.current) {
        const progress = 1 - ring.life;
        const currentRadius = ring.maxRadius * Math.min(progress * 1.5, 1);
        ctx.globalAlpha = ring.life * 0.5;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = Math.max(1, 3 * ring.life);
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        // Inner fill glow
        ctx.globalAlpha = ring.life * 0.1;
        ctx.fillStyle = ring.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw fruits
      for (const f of fruitsRef.current) {
        if (f.sliced) continue;
        const info = f.type === -1 ? BOMB_INFO : FRUIT_TYPES[f.type];

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);

        // Shadow
        ctx.beginPath();
        ctx.arc(3, 3, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fill();

        // Main circle with radial gradient for 3D effect
        const fruitGrad = ctx.createRadialGradient(
          -f.radius * 0.25, -f.radius * 0.25, f.radius * 0.05,
          0, 0, f.radius
        );
        fruitGrad.addColorStop(0, info.inner);
        fruitGrad.addColorStop(0.55, info.color);
        fruitGrad.addColorStop(1, info.color);
        ctx.beginPath();
        ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = fruitGrad;
        ctx.fill();

        // Rim highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Top specular highlight
        ctx.beginPath();
        ctx.arc(-f.radius * 0.2, -f.radius * 0.3, f.radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fill();

        // Bomb: pulsing danger glow
        if (f.type === -1) {
          const bombPulse = Math.sin(frameRef.current * 0.12) * 0.3 + 0.6;
          const glowRadius = f.radius * (1.6 + bombPulse * 0.4);
          const bombGlow = ctx.createRadialGradient(0, 0, f.radius * 0.5, 0, 0, glowRadius);
          bombGlow.addColorStop(0, `rgba(255,68,68,${0.25 * bombPulse})`);
          bombGlow.addColorStop(1, 'rgba(255,68,68,0)');
          ctx.beginPath();
          ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = bombGlow;
          ctx.fill();
        }

        // Emoji
        ctx.font = `${f.radius * 1.1}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(info.emoji, 0, 1);

        ctx.restore();
      }

      // Draw particles
      for (const p of particlesRef.current) {
        ctx.globalAlpha = Math.max(0, p.life) * 0.9;
        ctx.fillStyle = p.color;

        if (p.kind === 'spark') {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (p.kind === 'droplet') {
          const angle = Math.atan2(p.vy, p.vx);
          const length = p.size * 2.2;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.ellipse(0, 0, length, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * Math.max(0.2, p.life), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Draw score popups
      for (const popup of scorePopupsRef.current) {
        const progress = 1 - popup.life;
        const y = popup.y - progress * 55;
        const scale = progress < 0.1 ? 0.5 + (progress / 0.1) * 0.5 : 1;
        const alpha = popup.life < 0.3 ? popup.life / 0.3 : 1;

        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.floor(15 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Text shadow
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(popup.text, popup.x + 1, y + 1);

        // Glow text
        ctx.shadowColor = popup.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = popup.color;
        ctx.fillText(popup.text, popup.x, y);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Draw slice trail (multi-layered glow blade)
      if (sliceTrailRef.current.length > 1) {
        for (let i = 1; i < sliceTrailRef.current.length; i++) {
          const p0 = sliceTrailRef.current[i - 1];
          const p1 = sliceTrailRef.current[i];
          const age = (now - p1.time) / SLICE_TRAIL_DURATION;
          const alpha = Math.max(0, 1 - age);
          const width = (1 - age) * 7 + 1.5;

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineCap = 'round';

          // Outer glow (wide, faint)
          ctx.strokeStyle = `rgba(0, 255, 200, ${alpha * 0.12})`;
          ctx.lineWidth = width + 16;
          ctx.stroke();

          // Mid glow
          ctx.strokeStyle = `rgba(100, 255, 220, ${alpha * 0.3})`;
          ctx.lineWidth = width + 6;
          ctx.stroke();

          // Core bright trail
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
          ctx.lineWidth = width;
          ctx.stroke();
        }

        // Sparkle particles along recent trail
        for (let i = 0; i < sliceTrailRef.current.length; i += 2) {
          const p = sliceTrailRef.current[i];
          const age = (now - p.time) / SLICE_TRAIL_DURATION;
          if (age < 0.25) {
            const sparkleAlpha = (1 - age / 0.25) * 0.7;
            ctx.globalAlpha = sparkleAlpha;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#00ffc8';
            ctx.shadowBlur = 5;
            const sparkSize = 1.2 * (1 - age / 0.25);
            const ox = (Math.sin(i * 7.3 + now * 0.01) * 6);
            const oy = (Math.cos(i * 5.1 + now * 0.01) * 6);
            ctx.beginPath();
            ctx.arc(p.x + ox, p.y + oy, sparkSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // Combo text in canvas
      if (multiplierRef.current > 1) {
        const comboPulse = 1 + Math.sin(frameRef.current * 0.12) * 0.08;
        const comboSize = Math.floor(20 * comboPulse);
        ctx.font = `bold ${comboSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const comboColor = multiplierRef.current >= 4 ? '#ff6666' : multiplierRef.current >= 3 ? '#fbbf24' : '#34d399';
        ctx.shadowColor = comboColor;
        ctx.shadowBlur = 12;
        ctx.fillStyle = comboColor;
        ctx.fillText(`x${multiplierRef.current} COMBO!`, CANVAS_W / 2, 28);
        ctx.shadowBlur = 0;
      }

      ctx.restore(); // End screen shake transform

      // Screen flash overlay (drawn outside shake transform)
      if (screenFlashRef.current.intensity > 0) {
        ctx.globalAlpha = screenFlashRef.current.intensity;
        ctx.fillStyle = screenFlashRef.current.color;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.globalAlpha = 1;
      }

      animRef.current = requestAnimationFrame(gameLoop);
    };

    animRef.current = requestAnimationFrame(gameLoop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase, spawnFruit]);

  // Report score on game over
  useEffect(() => {
    if (phase === 'gameover') {
      onScoreRef.current?.('Fruit Ninja', scoreRef.current);
    }
  }, [phase]);

  // ===================== INPUT HANDLERS =====================

  const handlePointerDown = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'playing') return;
    isSlicingRef.current = true;
    const pos = getCanvasPos(e);
    prevMouseRef.current = pos;
    sliceTrailRef.current.push({ x: pos.x, y: pos.y, time: Date.now() });
    checkSliceAt(pos.x, pos.y);
  }, [getCanvasPos, checkSliceAt]);

  const handlePointerMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isSlicingRef.current || phaseRef.current !== 'playing') return;
    const pos = getCanvasPos(e);
    sliceTrailRef.current.push({ x: pos.x, y: pos.y, time: Date.now() });

    if (prevMouseRef.current) {
      const dx = pos.x - prevMouseRef.current.x;
      const dy = pos.y - prevMouseRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(dist / 8));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        checkSliceAt(prevMouseRef.current.x + dx * t, prevMouseRef.current.y + dy * t);
      }
    }
    prevMouseRef.current = pos;
  }, [getCanvasPos, checkSliceAt]);

  const handlePointerUp = useCallback(() => {
    isSlicingRef.current = false;
    prevMouseRef.current = null;
  }, []);

  const startGame = useCallback(() => {
    setPhase('playing');
  }, []);

  // ===================== RENDER =====================

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {phase === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-b from-slate-900 to-slate-800 border border-slate-700 w-full relative overflow-hidden"
          >
            {/* Animated bg particles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div key={i}
                  animate={{ y: [0, -25, 0], opacity: [0.05, 0.2, 0.05], x: [0, Math.sin(i) * 15, 0] }}
                  transition={{ duration: 3 + i * 0.35, repeat: Infinity, delay: i * 0.25 }}
                  className={cn(
                    "absolute w-1 h-1 rounded-full",
                    i % 3 === 0 ? "bg-emerald-400/40" : i % 3 === 1 ? "bg-violet-400/30" : "bg-cyan-400/30"
                  )}
                  style={{ left: `${5 + (i * 8) % 90}%`, top: `${10 + (i * 12) % 75}%` }} />
              ))}
            </div>

            <div className="relative z-10 text-center">
              <motion.div animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
                <span className="text-6xl block mb-2 drop-shadow-lg">{'\u{1F349}'}</span>
              </motion.div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-300 via-green-400 to-lime-500 bg-clip-text text-transparent">Fruit Ninja</h2>
              <p className="text-sm text-slate-400 text-center mt-1">Corte as frutas e evite as bombas!</p>
              <div className="flex justify-center gap-3 mt-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">{'\u{1F525}'} Combos</span>
                <span className="flex items-center gap-1">{'\u{1F4A3}'} Bombas</span>
                <span className="flex items-center gap-1">{'\u{26A1}'} Multiplicador</span>
              </div>
            </div>

            {highScore > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                <Badge variant="outline" className="text-yellow-400 border-yellow-500 relative z-10">
                  <Trophy className="w-3 h-3 mr-1" />
                  Recorde: {highScore}
                </Badge>
              </motion.div>
            )}

            <div className="flex gap-2 w-full relative z-10">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
                <Button
                  onClick={() => { setBotMode(false); startGame(); }}
                  className={cn('w-full shadow-lg', !botMode ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-700')}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Jogar
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
                <Button
                  onClick={() => { setBotMode(true); startGame(); }}
                  className={cn('w-full shadow-lg', botMode ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/20' : 'bg-slate-700')}
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Bot
                </Button>
              </motion.div>
            </div>

            <div className="text-xs text-slate-500 text-center space-y-1 relative z-10">
              <p>Deslize para cortar frutas</p>
              <p>{'\u{2764}\u{FE0F}'} 3 vidas | {'\u{1F4A3}'} Bomba = fim</p>
              <p>{'\u{1F525}'} Combo rapido = multiplicador de pontos!</p>
            </div>
          </motion.div>
        )}

        {phase === 'playing' && (
          <motion.div
            key={`playing-${shakeKey}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="relative w-full"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <motion.div
                key={`score-${score}`}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              >
                <Badge variant="secondary" className="bg-emerald-600/90 text-white text-xs backdrop-blur-sm border border-emerald-500/30">
                  <Zap className="w-3 h-3 mr-1" />
                  {score}
                </Badge>
              </motion.div>

              {multiplier > 1 && (
                <motion.div
                  key={`mult-${multiplier}`}
                  initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 8, stiffness: 350 }}
                >
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-white text-xs backdrop-blur-sm border",
                      multiplier >= 4
                        ? "bg-gradient-to-r from-red-600 to-orange-500 border-red-400/50 shadow-lg shadow-red-500/30"
                        : multiplier >= 3
                          ? "bg-gradient-to-r from-yellow-600 to-amber-500 border-yellow-400/50 shadow-lg shadow-yellow-500/20"
                          : "bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-400/50"
                    )}
                  >
                    <Flame className="w-3 h-3 mr-1" />
                    x{multiplier}
                  </Badge>
                </motion.div>
              )}

              <Badge variant="secondary" className="bg-red-600/90 text-white text-xs backdrop-blur-sm border border-red-500/30">
                {Array.from({ length: 3 }, (_, i) => i < lives ? '\u{2764}\u{FE0F}' : '\u{1F5A4}').join(' ')}
              </Badge>
            </div>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="w-full rounded-lg cursor-crosshair touch-none"
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
            {botMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-10 left-1/2 -translate-x-1/2"
              >
                <Badge className="bg-violet-600 text-white text-xs backdrop-blur-sm border border-violet-400/30">
                  <Bot className="w-3 h-3 mr-1" />
                  Modo Bot
                </Badge>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === 'gameover' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-b from-slate-900 to-red-950 border border-red-800/60 w-full relative overflow-hidden"
          >
            {/* Animated red pulse background */}
            <motion.div
              className="absolute inset-0 bg-red-500/5 rounded-xl"
              animate={{ opacity: [0, 0.4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Radial glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />
            </div>

            {/* Explosion icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.15 }}
              className="text-5xl relative z-10"
            >
              {'\u{1F4A5}'}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-2xl font-bold text-white relative z-10"
            >
              Fim de Jogo!
            </motion.h2>

            <div className="grid grid-cols-2 gap-3 w-full text-center relative z-10">
              {[
                { label: 'Pontos', value: score, color: 'text-white', delay: 0.35 },
                { label: 'Frutas Cortadas', value: fruitsSliced, color: 'text-emerald-400', delay: 0.45 },
                { label: 'Maior Combo', value: maxCombo, color: 'text-yellow-400', delay: 0.55 },
                { label: 'Recorde', value: highScore, color: score >= highScore && score > 0 ? 'text-yellow-400' : 'text-slate-300', delay: 0.65 },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.7, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: stat.delay, type: 'spring', damping: 15, stiffness: 250 }}
                  className="bg-slate-800/60 rounded-lg p-3 backdrop-blur-sm border border-slate-700/30"
                >
                  <p className="text-xs text-slate-400">{stat.label}</p>
                  <motion.p
                    className={cn("text-2xl font-bold", stat.color)}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: stat.delay + 0.15, type: 'spring', damping: 10, stiffness: 300 }}
                  >
                    {stat.value}
                  </motion.p>
                </motion.div>
              ))}
            </div>

            {score >= highScore && score > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, type: 'spring', damping: 8, stiffness: 200 }}
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Badge className="bg-yellow-600 text-white border border-yellow-400/40 shadow-lg shadow-yellow-500/20">
                    <Trophy className="w-3 h-3 mr-1" />
                    Novo Recorde!
                  </Badge>
                </motion.div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05 }}
              className="flex gap-2 w-full relative z-10"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
                <Button onClick={startGame} className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Jogar Novamente
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button onClick={() => setPhase('menu')} variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
                  Menu
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}