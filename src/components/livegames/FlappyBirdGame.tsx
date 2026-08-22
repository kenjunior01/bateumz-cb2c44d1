import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Play, Bot, Trophy, Medal, Bird, Zap } from 'lucide-react';

// ===================== TYPES =====================

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GamePhase = 'menu' | 'playing' | 'gameover';

interface Bird {
  x: number;
  y: number;
  vy: number;
  rotation: number;
}

interface Pipe {
  x: number;
  gapY: number;
  gapH: number;
  scored: boolean;
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
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
  opacity: number;
}

interface Mountain {
  x: number;
  h: number;
  w: number;
}

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  drift: number;
}

interface ThemeColors {
  skyTop: string;
  skyMid: string;
  skyBot: string;
  ground: string;
  groundDark: string;
  groundGrass: string;
  pipeBody: string;
  pipeEdge: string;
  pipeHighlight: string;
  pipeShadow: string;
  mountainColor: string;
  isDark: boolean;
}

// ===================== CONSTANTS =====================

const CANVAS_W = 320;
const CANVAS_H = 480;
const GRAVITY = 0.45;
const FLAP_FORCE = -7.5;
const BIRD_SIZE = 18;
const PIPE_W = 52;
const PIPE_GAP = 130;
const PIPE_SPEED_BASE = 2.5;
const PIPE_INTERVAL_BASE = 100;
const PIPE_CAP_H = 24;
const GROUND_H = 40;

const CONFETTI_COLORS = ['#ff6b6b', '#ffd700', '#00d4ff', '#4ade80', '#c084fc', '#fb923c', '#f472b6'];

const MEDALS: { min: number; name: string; color: string; emoji: string }[] = [
  { min: 40, name: 'Platina', color: '#00d4ff', emoji: '\u{1F48E}' },
  { min: 30, name: 'Ouro', color: '#ffd700', emoji: '\u{1F947}' },
  { min: 20, name: 'Prata', color: '#c0c0c0', emoji: '\u{1F948}' },
  { min: 10, name: 'Bronze', color: '#cd7f32', emoji: '\u{1F949}' },
];

// ===================== HELPERS =====================

function getMedal(score: number) {
  return MEDALS.find(m => score >= m.min) ?? null;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpColor(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, t: number) {
  return `rgb(${Math.round(lerp(r1, r2, t))}, ${Math.round(lerp(g1, g2, t))}, ${Math.round(lerp(b1, b2, t))})`;
}

function getThemeColors(score: number): ThemeColors {
  const t = Math.min(score / 40, 1);
  return {
    skyTop: lerpColor(100, 10, 180, 10, 240, 45, t),
    skyMid: lerpColor(160, 18, 210, 22, 245, 58, t),
    skyBot: lerpColor(250, 30, 245, 40, 255, 80, t),
    ground: lerpColor(134, 50, 193, 60, 90, 30, t),
    groundDark: lerpColor(100, 35, 155, 40, 65, 20, t),
    groundGrass: lerpColor(90, 35, 180, 55, 65, 28, t),
    pipeBody: lerpColor(80, 30, 180, 80, 80, 60, t),
    pipeEdge: lerpColor(100, 40, 200, 100, 100, 80, t),
    pipeHighlight: lerpColor(150, 70, 240, 140, 130, 110, t),
    pipeShadow: lerpColor(45, 12, 110, 35, 35, 25, t),
    mountainColor: t > 0.5 ? 'rgba(30,40,60,0.5)' : 'rgba(90,155,90,0.25)',
    isDark: t > 0.5,
  };
}

function drawFluffyCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, isDark: boolean, opacity: number) {
  ctx.globalAlpha = opacity;
  ctx.fillStyle = isDark ? '#b0b0cc' : '#ffffff';
  // Main body
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.5, w * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Left bump
  ctx.beginPath();
  ctx.ellipse(x - w * 0.28, y + w * 0.02, w * 0.28, w * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right bump
  ctx.beginPath();
  ctx.ellipse(x + w * 0.22, y - w * 0.04, w * 0.32, w * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();
  // Top center bump
  ctx.beginPath();
  ctx.ellipse(x + w * 0.02, y - w * 0.1, w * 0.22, w * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Subtle highlight
  if (!isDark) {
    ctx.globalAlpha = opacity * 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x - w * 0.05, y - w * 0.12, w * 0.15, w * 0.07, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ===================== COMPONENT =====================

export default function FlappyBirdGame({ onScore, liveCode }: Props) {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('flappy-highscore');
      return stored ? parseInt(stored, 10) : 0;
    }
    return 0;
  });
  const [botMode, setBotMode] = useState(false);
  const [showMedal, setShowMedal] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [displayedScore, setDisplayedScore] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const birdRef = useRef<Bird>({ x: 80, y: CANVAS_H / 2, vy: 0, rotation: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const mountainsRef = useRef<Mountain[]>([]);
  const scoreRef = useRef(0);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);
  const pipeTimerRef = useRef(0);
  const gameOverTriggered = useRef(false);
  const botIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<GamePhase>('menu');
  const onScoreRef = useRef(onScore);
  const scorePopRef = useRef(0);
  const trailTimerRef = useRef(0);

  useEffect(() => { onScoreRef.current = onScore; }, [onScore]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Initialize background elements with parallax layers
  const initBackground = useCallback(() => {
    const clouds: Cloud[] = [];
    for (let i = 0; i < 8; i++) {
      const isFar = i < 3;
      clouds.push({
        x: Math.random() * (CANVAS_W + 80) - 40,
        y: isFar ? 12 + Math.random() * 55 : 35 + Math.random() * 95,
        w: isFar ? 22 + Math.random() * 30 : 42 + Math.random() * 65,
        speed: isFar ? 0.12 + Math.random() * 0.18 : 0.35 + Math.random() * 0.5,
        opacity: isFar ? 0.25 + Math.random() * 0.15 : 0.55 + Math.random() * 0.35,
      });
    }
    cloudsRef.current = clouds;
    const mountains: Mountain[] = [];
    for (let i = 0; i < 8; i++) {
      mountains.push({ x: i * 60 - 30, h: 40 + Math.random() * 60, w: 50 + Math.random() * 40 });
    }
    mountainsRef.current = mountains;
  }, []);

  const spawnParticles = useCallback((x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        maxLife: 30 + Math.random() * 20,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }, []);

  const flap = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    birdRef.current.vy = FLAP_FORCE;
  }, []);

  const botFlap = useCallback(() => {
    if (phaseRef.current !== 'playing' || !botMode) return;
    const bird = birdRef.current;
    const pipes = pipesRef.current;
    let targetY = CANVAS_H / 2;
    for (const p of pipes) {
      if (p.x + PIPE_W > bird.x - 10) {
        targetY = p.gapY + Math.random() * 20 - 10;
        break;
      }
    }
    if (bird.y > targetY + 10) {
      bird.vy = FLAP_FORCE;
    }
  }, [botMode]);

  // Keyboard / click / touch handlers
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (phaseRef.current === 'playing') flap();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flap]);

  // Bot interval
  useEffect(() => {
    if (botMode && phase === 'playing') {
      botIntervalRef.current = setInterval(botFlap, 80);
    }
    return () => {
      if (botIntervalRef.current) { clearInterval(botIntervalRef.current); botIntervalRef.current = null; }
    };
  }, [botMode, phase, botFlap]);

  // Save high score
  useEffect(() => {
    if (typeof window !== 'undefined' && score > highScore) {
      setHighScore(score);
      localStorage.setItem('flappy-highscore', score.toString());
    }
  }, [score, highScore]);

  // Generate confetti on game over
  useEffect(() => {
    if (phase === 'gameover') {
      const pieces: ConfettiPiece[] = [];
      for (let i = 0; i < 45; i++) {
        pieces.push({
          id: i,
          x: Math.random() * 300,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: Math.random() * 0.6,
          size: 4 + Math.random() * 5,
          drift: (Math.random() - 0.5) * 60,
        });
      }
      setConfetti(pieces);
      // Animated score counter
      setDisplayedScore(0);
      if (score > 0) {
        const totalDuration = Math.min(score * 60, 1200);
        const steps = Math.min(score, 40);
        const interval = totalDuration / steps;
        let current = 0;
        const timer = setInterval(() => {
          current++;
          setDisplayedScore(current);
          if (current >= score) clearInterval(timer);
        }, interval);
        return () => clearInterval(timer);
      }
    } else {
      setConfetti([]);
    }
  }, [phase, score]);

  // Game loop
  useEffect(() => {
    if (phase !== 'playing') {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    gameOverTriggered.current = false;
    birdRef.current = { x: 80, y: CANVAS_H / 2, vy: 0, rotation: 0 };
    pipesRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    frameRef.current = 0;
    pipeTimerRef.current = 0;
    scorePopRef.current = 0;
    trailTimerRef.current = 0;
    setScore(0);
    initBackground();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastMilestone = 0;

    const loop = () => {
      if (phaseRef.current !== 'playing') return;

      const bird = birdRef.current;
      const pipes = pipesRef.current;
      const particles = particlesRef.current;
      const clouds = cloudsRef.current;
      const mountains = mountainsRef.current;

      frameRef.current++;

      // Speed increases gradually
      const speedMult = 1 + Math.min(scoreRef.current * 0.015, 0.6);
      const pipeSpeed = PIPE_SPEED_BASE * speedMult;

      // Bird physics
      bird.vy += GRAVITY;
      bird.y += bird.vy;
      bird.rotation = Math.min(bird.vy * 3, 70);

      // Spawn pipes
      pipeTimerRef.current++;
      const interval = Math.max(PIPE_INTERVAL_BASE - scoreRef.current, 65);
      if (pipeTimerRef.current >= interval) {
        pipeTimerRef.current = 0;
        const minGapY = 60;
        const maxGapY = CANVAS_H - 60 - PIPE_GAP;
        const gapY = minGapY + Math.random() * (maxGapY - minGapY);
        pipes.push({ x: CANVAS_W, gapY, gapH: PIPE_GAP, scored: false });
      }

      // Update pipes
      for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= pipeSpeed;

        // Score check
        if (!pipes[i].scored && pipes[i].x + PIPE_W < bird.x) {
          pipes[i].scored = true;
          scoreRef.current++;
          setScore(scoreRef.current);
          scorePopRef.current = 18;
          spawnParticles(bird.x, bird.y, 5, '#ffd700');

          // Milestone
          if (scoreRef.current > 0 && scoreRef.current % 10 === 0 && scoreRef.current !== lastMilestone) {
            lastMilestone = scoreRef.current;
            spawnParticles(bird.x, bird.y, 20, '#ff6b6b');
            spawnParticles(bird.x, bird.y, 20, '#ffd700');
          }
        }

        // Remove off-screen
        if (pipes[i].x < -PIPE_W - 10) {
          pipes.splice(i, 1);
        }
      }

      // Bird trail particles
      trailTimerRef.current++;
      if (trailTimerRef.current % 3 === 0) {
        particles.push({
          x: bird.x - 6,
          y: bird.y + 2,
          vx: -0.5 - Math.random() * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: 1,
          maxLife: 12 + Math.random() * 8,
          color: 'rgba(247,220,111,0.6)',
          size: 2 + Math.random() * 2,
        });
      }

      // Collision detection
      const birdTop = bird.y - BIRD_SIZE / 2;
      const birdBot = bird.y + BIRD_SIZE / 2;
      const birdLeft = bird.x - BIRD_SIZE / 2;
      const birdRight = bird.x + BIRD_SIZE / 2;

      let dead = false;

      // Ground / ceiling
      if (birdBot >= CANVAS_H - GROUND_H || birdTop <= 0) dead = true;

      // Pipes
      for (const p of pipes) {
        if (birdRight > p.x && birdLeft < p.x + PIPE_W) {
          if (birdTop < p.gapY || birdBot > p.gapY + p.gapH) {
            dead = true;
          }
        }
      }

      if (dead && !gameOverTriggered.current) {
        gameOverTriggered.current = true;
        spawnParticles(bird.x, bird.y, 30, '#ff4444');
        spawnParticles(bird.x, bird.y, 15, '#ffaa00');
        setTimeout(() => {
          if (phaseRef.current === 'playing') {
            setPhase('gameover');
            onScoreRef.current?.('Flappy Bird', scoreRef.current);
          }
        }, 600);
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Update clouds (parallax)
      for (const c of clouds) {
        c.x -= c.speed * speedMult * 0.3;
        if (c.x + c.w < -20) { c.x = CANVAS_W + 20 + Math.random() * 40; c.y = c.opacity < 0.4 ? 12 + Math.random() * 55 : 35 + Math.random() * 95; }
      }

      // Update mountains
      for (const m of mountains) {
        m.x -= pipeSpeed * 0.3;
        if (m.x + m.w < -10) { m.x = CANVAS_W + 20; m.h = 40 + Math.random() * 60; }
      }

      // ===================== DRAW =====================
      const theme = getThemeColors(scoreRef.current);

      // --- Sky gradient (3-stop) ---
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      skyGrad.addColorStop(0, theme.skyTop);
      skyGrad.addColorStop(0.5, theme.skyMid);
      skyGrad.addColorStop(1, theme.skyBot);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // --- Sun / Moon ---
      if (!theme.isDark) {
        // Sun glow (outer)
        const sunGrad2 = ctx.createRadialGradient(CANVAS_W - 45, 55, 8, CANVAS_W - 45, 55, 55);
        sunGrad2.addColorStop(0, 'rgba(255,255,200,0.3)');
        sunGrad2.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = sunGrad2;
        ctx.beginPath();
        ctx.arc(CANVAS_W - 45, 55, 55, 0, Math.PI * 2);
        ctx.fill();
        // Sun glow (inner)
        const sunGrad = ctx.createRadialGradient(CANVAS_W - 45, 55, 4, CANVAS_W - 45, 55, 25);
        sunGrad.addColorStop(0, 'rgba(255,255,230,0.9)');
        sunGrad.addColorStop(0.4, 'rgba(255,230,120,0.4)');
        sunGrad.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(CANVAS_W - 45, 55, 25, 0, Math.PI * 2);
        ctx.fill();
        // Sun core
        ctx.fillStyle = '#fffbe6';
        ctx.beginPath();
        ctx.arc(CANVAS_W - 45, 55, 11, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Moon glow
        const moonGlow = ctx.createRadialGradient(CANVAS_W - 48, 48, 6, CANVAS_W - 48, 48, 35);
        moonGlow.addColorStop(0, 'rgba(200,200,240,0.25)');
        moonGlow.addColorStop(1, 'rgba(200,200,240,0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(CANVAS_W - 48, 48, 35, 0, Math.PI * 2);
        ctx.fill();
        // Moon
        ctx.fillStyle = '#e0e0f0';
        ctx.beginPath();
        ctx.arc(CANVAS_W - 48, 48, 13, 0, Math.PI * 2);
        ctx.fill();
        // Moon crater shadow
        ctx.fillStyle = theme.skyTop;
        ctx.beginPath();
        ctx.arc(CANVAS_W - 42, 44, 11, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Stars (night, twinkling) ---
      if (theme.isDark) {
        for (let i = 0; i < 40; i++) {
          const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(frameRef.current * 0.03 + i * 2.7));
          ctx.globalAlpha = twinkle * 0.6;
          ctx.fillStyle = '#ffffff';
          const sx = (i * 73 + 11) % CANVAS_W;
          const sy = (i * 41 + 7) % (CANVAS_H * 0.4);
          const sr = (i % 3 === 0) ? 1.5 : 1;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // --- Far clouds (parallax layer 1) ---
      for (const c of clouds) {
        if (c.opacity >= 0.4) continue;
        drawFluffyCloud(ctx, c.x + c.w / 2, c.y, c.w, theme.isDark, c.opacity);
      }

      // --- Mountains with snow caps ---
      ctx.fillStyle = theme.mountainColor;
      for (const m of mountains) {
        ctx.beginPath();
        ctx.moveTo(m.x, CANVAS_H - GROUND_H);
        ctx.lineTo(m.x + m.w * 0.15, CANVAS_H - GROUND_H - m.h * 0.4);
        ctx.lineTo(m.x + m.w / 2, CANVAS_H - GROUND_H - m.h);
        ctx.lineTo(m.x + m.w * 0.85, CANVAS_H - GROUND_H - m.h * 0.4);
        ctx.lineTo(m.x + m.w, CANVAS_H - GROUND_H);
        ctx.fill();
        // Snow cap
        if (!theme.isDark && m.h > 50) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath();
          ctx.moveTo(m.x + m.w * 0.35, CANVAS_H - GROUND_H - m.h * 0.75);
          ctx.lineTo(m.x + m.w / 2, CANVAS_H - GROUND_H - m.h);
          ctx.lineTo(m.x + m.w * 0.65, CANVAS_H - GROUND_H - m.h * 0.75);
          ctx.fill();
          ctx.fillStyle = theme.mountainColor;
        }
      }

      // --- Near clouds (parallax layer 2) ---
      for (const c of clouds) {
        if (c.opacity < 0.4) continue;
        drawFluffyCloud(ctx, c.x + c.w / 2, c.y, c.w, theme.isDark, c.opacity);
      }

      // --- Pipes with 3D gradient effect ---
      for (const p of pipes) {
        // Top pipe body
        const topBodyH = p.gapY - PIPE_CAP_H;
        if (topBodyH > 0) {
          const pipeGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
          pipeGrad.addColorStop(0, theme.pipeShadow);
          pipeGrad.addColorStop(0.18, theme.pipeHighlight);
          pipeGrad.addColorStop(0.45, theme.pipeBody);
          pipeGrad.addColorStop(0.82, theme.pipeShadow);
          pipeGrad.addColorStop(1, theme.pipeEdge);
          ctx.fillStyle = pipeGrad;
          ctx.fillRect(p.x, 0, PIPE_W, topBodyH);
          // Subtle vertical highlight
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(p.x + PIPE_W * 0.22, 0, 3, topBodyH);
        }

        // Top pipe cap
        const topCapGrad = ctx.createLinearGradient(p.x - 3, 0, p.x + PIPE_W + 3, 0);
        topCapGrad.addColorStop(0, theme.pipeShadow);
        topCapGrad.addColorStop(0.15, theme.pipeHighlight);
        topCapGrad.addColorStop(0.4, theme.pipeEdge);
        topCapGrad.addColorStop(0.8, theme.pipeShadow);
        topCapGrad.addColorStop(1, theme.pipeEdge);
        ctx.fillStyle = topCapGrad;
        ctx.fillRect(p.x - 3, topBodyH, PIPE_W + 6, PIPE_CAP_H);
        // Cap border
        ctx.strokeStyle = theme.pipeShadow;
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - 3, topBodyH, PIPE_W + 6, PIPE_CAP_H);
        // Cap top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(p.x - 1, topBodyH + 2, PIPE_W + 2, 3);

        // Bottom pipe cap
        const botCapY = p.gapY + p.gapH;
        ctx.fillStyle = topCapGrad;
        ctx.fillRect(p.x - 3, botCapY, PIPE_W + 6, PIPE_CAP_H);
        ctx.strokeStyle = theme.pipeShadow;
        ctx.strokeRect(p.x - 3, botCapY, PIPE_W + 6, PIPE_CAP_H);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(p.x - 1, botCapY + 2, PIPE_W + 2, 3);

        // Bottom pipe body
        const botBodyTop = botCapY + PIPE_CAP_H;
        const botBodyH = CANVAS_H - GROUND_H - botBodyTop;
        if (botBodyH > 0) {
          const botGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
          botGrad.addColorStop(0, theme.pipeShadow);
          botGrad.addColorStop(0.18, theme.pipeHighlight);
          botGrad.addColorStop(0.45, theme.pipeBody);
          botGrad.addColorStop(0.82, theme.pipeShadow);
          botGrad.addColorStop(1, theme.pipeEdge);
          ctx.fillStyle = botGrad;
          ctx.fillRect(p.x, botBodyTop, PIPE_W, botBodyH);
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(p.x + PIPE_W * 0.22, botBodyTop, 3, botBodyH);
        }
      }

      // --- Ground with grass ---
      // Ground body
      const groundGrad = ctx.createLinearGradient(0, CANVAS_H - GROUND_H, 0, CANVAS_H);
      groundGrad.addColorStop(0, theme.ground);
      groundGrad.addColorStop(0.15, theme.groundDark);
      groundGrad.addColorStop(1, theme.groundDark);
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, CANVAS_H - GROUND_H, CANVAS_W, GROUND_H);

      // Grass edge (top strip)
      ctx.fillStyle = theme.groundGrass;
      ctx.fillRect(0, CANVAS_H - GROUND_H, CANVAS_W, 5);

      // Grass blades
      ctx.fillStyle = theme.groundGrass;
      const grassBaseY = CANVAS_H - GROUND_H;
      for (let gx = 0; gx < CANVAS_W; gx += 5) {
        const grassH = 4 + Math.sin(gx * 0.4 + frameRef.current * 0.06) * 2.5 + Math.sin(gx * 0.15) * 1.5;
        ctx.beginPath();
        ctx.moveTo(gx, grassBaseY);
        ctx.lineTo(gx + 2.5, grassBaseY - grassH);
        ctx.lineTo(gx + 5, grassBaseY);
        ctx.fill();
      }

      // Ground stripe pattern
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      const gOff = (frameRef.current * pipeSpeed) % 20;
      for (let gx = -gOff; gx < CANVAS_W; gx += 20) {
        ctx.beginPath();
        ctx.moveTo(gx, CANVAS_H - GROUND_H + 12);
        ctx.lineTo(gx + 10, CANVAS_H - GROUND_H + 18);
        ctx.stroke();
      }

      // --- Bird shadow ---
      const shadowY = Math.min(bird.y + 20, CANVAS_H - GROUND_H - 3);
      const shadowScale = 0.6 + 0.4 * ((CANVAS_H - GROUND_H - bird.y) / (CANVAS_H - GROUND_H));
      ctx.globalAlpha = 0.15 * shadowScale;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(bird.x + 3, shadowY, BIRD_SIZE * 0.5 * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // --- Bird trail ---
      for (const p of particles) {
        if (p.color.startsWith('rgba(247')) {
          ctx.globalAlpha = p.life * 0.5;
          ctx.fillStyle = '#f7dc6f';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // --- Bird (enhanced) ---
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate((bird.rotation * Math.PI) / 180);

      // Body with radial gradient
      const bodyGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, BIRD_SIZE / 2);
      bodyGrad.addColorStop(0, '#fff5c0');
      bodyGrad.addColorStop(0.5, '#f7dc6f');
      bodyGrad.addColorStop(1, '#d4a017');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2 * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body outline
      ctx.strokeStyle = '#c49515';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Tail feathers
      ctx.fillStyle = '#e6b422';
      ctx.beginPath();
      ctx.moveTo(-BIRD_SIZE / 2 + 2, -2);
      ctx.lineTo(-BIRD_SIZE / 2 - 5, -5);
      ctx.lineTo(-BIRD_SIZE / 2 + 1, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-BIRD_SIZE / 2 + 2, 2);
      ctx.lineTo(-BIRD_SIZE / 2 - 4, 5);
      ctx.lineTo(-BIRD_SIZE / 2 + 1, 1);
      ctx.fill();

      // Wing with dynamic flap
      const wingFlap = Math.sin(frameRef.current * 0.35) * 5;
      const wingGrad = ctx.createRadialGradient(-3, wingFlap, 1, -3, wingFlap, 9);
      wingGrad.addColorStop(0, '#f5c842');
      wingGrad.addColorStop(1, '#e6a817');
      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.ellipse(-3, wingFlap, 9, 5.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c49515';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Eye white
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(6, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Eye pupil
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(7.5, -4, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(8.5, -5.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Beak with gradient
      const beakGrad = ctx.createLinearGradient(10, -1, 18, 3);
      beakGrad.addColorStop(0, '#f39c12');
      beakGrad.addColorStop(1, '#d35400');
      ctx.fillStyle = beakGrad;
      ctx.beginPath();
      ctx.moveTo(10, -1);
      ctx.lineTo(18, 2);
      ctx.lineTo(10, 5);
      ctx.closePath();
      ctx.fill();
      // Beak line
      ctx.strokeStyle = '#c0770a';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(10, 2);
      ctx.lineTo(17, 2);
      ctx.stroke();

      // Cheek blush
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ff8888';
      ctx.beginPath();
      ctx.ellipse(3, 3, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();

      // --- Effect particles (non-trail) ---
      for (const p of particles) {
        if (p.color.startsWith('rgba(247')) continue; // skip trail particles
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // --- Score text with pop effect ---
      const popAmount = scorePopRef.current > 0 ? scorePopRef.current / 18 : 0;
      if (scorePopRef.current > 0) scorePopRef.current--;

      ctx.save();
      const scoreScale = 1 + popAmount * 0.35;
      ctx.translate(CANVAS_W / 2, 55);
      ctx.scale(scoreScale, scoreScale);
      // Glow
      if (popAmount > 0) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15 * popAmount;
      }
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 5;
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(scoreRef.current.toString(), 0, 0);
      ctx.fillText(scoreRef.current.toString(), 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();

      // --- Vignette ---
      const vigGrad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.35, CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.72);
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (!gameOverTriggered.current) {
        animRef.current = requestAnimationFrame(loop);
      } else {
        // Death animation
        let deathFrames = 0;
        const deathLoop = () => {
          deathFrames++;
          // Update particles
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.life -= 1 / p.maxLife;
            if (p.life <= 0) particles.splice(i, 1);
          }
          // Death flash
          if (deathFrames < 8) {
            ctx.globalAlpha = 0.4 * (1 - deathFrames / 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            ctx.globalAlpha = 1;
          }
          // Draw particles
          for (const p of particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          if (deathFrames < 35) requestAnimationFrame(deathLoop);
        };
        requestAnimationFrame(deathLoop);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase, spawnParticles, initBackground]);

  const startGame = useCallback(() => {
    setPhase('playing');
    setShowMedal(false);
  }, []);

  // Show medal on game over
  useEffect(() => {
    if (phase === 'gameover') {
      const m = getMedal(score);
      if (m) setShowMedal(true);
      else setShowMedal(false);
    }
  }, [phase, score]);

  const medal = getMedal(score);

  // ===================== RENDER: MENU =====================
  if (phase === 'menu') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="menu"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col items-center justify-center min-h-[500px] gap-6 p-4"
        >
          {/* Decorative glow behind bird */}
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ backgroundColor: 'rgba(251,191,36,0.2)', width: 80, height: 80, left: -8, top: -8 }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: [0, -10, 0], opacity: 1 }}
              transition={{ y: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }, opacity: { duration: 0.5 } }}
            >
              <Bird className="w-16 h-16 text-amber-400" style={{ filter: 'drop-shadow(0 4px 8px rgba(251,191,36,0.3))' }} />
            </motion.div>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-3xl font-extrabold tracking-tight"
          >
            Flappy Bird
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed"
          >
            Toque, clique ou pressione Espa\u00e7o para voar! Desvie dos canos e conquiste a maior pontua\u00e7\u00e3o.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <Button
              variant={botMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBotMode(b => !b)}
              className={cn("gap-2 transition-all", botMode && "shadow-lg shadow-amber-500/20")}
            >
              <Bot className="w-4 h-4" /> {botMode ? 'Bot Ativado' : 'Modo Bot'}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.4, type: 'spring', stiffness: 200 }}
          >
            <Button size="lg" onClick={startGame} className="gap-2 px-8 shadow-lg shadow-primary/20">
              <Play className="w-5 h-5" /> Jogar
            </Button>
          </motion.div>

          <AnimatePresence>
            {highScore > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Trophy className="w-4 h-4 text-amber-500" /> Recorde: {highScore}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="flex flex-wrap justify-center gap-2 mt-1"
          >
            {MEDALS.map(m => (
              <Badge
                key={m.name}
                variant="outline"
                className="text-xs border-border/60 bg-muted/30"
              >
                {m.emoji} {m.name}: {m.min}+
              </Badge>
            ))}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ===================== RENDER: PLAYING / GAME OVER =====================
  return (
    <div className="relative flex flex-col items-center gap-4 p-4">
      {/* Canvas with entrance animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 180, damping: 20 }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-2xl border-2 border-border/80 shadow-2xl cursor-pointer max-w-full"
          style={{
            imageRendering: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)',
          }}
          onClick={flap}
          onTouchStart={(e) => { e.preventDefault(); flap(); }}
        />
      </motion.div>

      {/* Playing indicator */}
      <AnimatePresence>
        {phase === 'playing' && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-3"
          >
            {botMode && (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Badge variant="secondary" className="gap-1 shadow-sm">
                  <Bot className="w-3 h-3" /> Bot jogando
                </Badge>
              </motion.div>
            )}
            <p className="text-xs text-muted-foreground">Toque ou Espa\u00e7o para voar</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confetti overlay */}
      <AnimatePresence>
        {phase === 'gameover' && confetti.length > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 40 }}>
            {confetti.map(piece => (
              <motion.div
                key={piece.id}
                initial={{ y: -15, opacity: 1, rotate: 0 }}
                animate={{
                  y: 520,
                  opacity: [1, 1, 0],
                  rotate: piece.id % 2 === 0 ? 360 : -360,
                  x: piece.x + piece.drift,
                }}
                transition={{
                  duration: 2.2 + Math.random() * 0.8,
                  delay: piece.delay,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="absolute rounded-sm"
                style={{
                  left: piece.x,
                  width: piece.size,
                  height: piece.size * 1.4,
                  backgroundColor: piece.color,
                  top: 0,
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Game Over Panel */}
      <AnimatePresence>
        {phase === 'gameover' && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.15 }}
            className="bg-card/95 backdrop-blur-sm border border-border/60 rounded-2xl p-6 w-80 text-center space-y-5 shadow-2xl"
            style={{
              boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            {/* Skull icon with pulse */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
              className="text-4xl"
            >
              {'\u{1F480}'}
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="text-xl font-extrabold tracking-tight"
            >
              Fim de Jogo
            </motion.h3>

            {/* Score cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.35 }}
              className="grid grid-cols-2 gap-3"
            >
              <div className="bg-gradient-to-br from-muted/80 to-muted/40 rounded-xl p-3 border border-border/30">
                <motion.div
                  className="text-3xl font-extrabold tabular-nums"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.55 }}
                >
                  {displayedScore}
                </motion.div>
                <div className="text-xs text-muted-foreground mt-1">Pontua\u00e7\u00e3o</div>
              </div>
              <div className="bg-gradient-to-br from-muted/80 to-muted/40 rounded-xl p-3 border border-border/30">
                <motion.div
                  className="text-3xl font-extrabold tabular-nums text-amber-500"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.65 }}
                >
                  {Math.max(highScore, score)}
                </motion.div>
                <div className="text-xs text-muted-foreground mt-1">Recorde</div>
              </div>
            </motion.div>

            {/* Medal */}
            {medal && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, rotate: [0, -12, 12, -6, 6, 0] }}
                transition={{
                  scale: { delay: 0.6, type: 'spring', stiffness: 350, damping: 12 },
                  rotate: { delay: 0.8, duration: 0.6 },
                }}
                className="flex flex-col items-center gap-1.5"
              >
                <span className="text-4xl drop-shadow-lg">{medal.emoji}</span>
                <Badge
                  style={{ backgroundColor: medal.color, color: '#000' }}
                  className="gap-1 shadow-sm font-semibold"
                >
                  <Medal className="w-3 h-3" /> {medal.name}
                </Badge>
              </motion.div>
            )}

            {/* New record flash */}
            {score >= highScore && score > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.3 }}
                className="flex items-center justify-center gap-1.5 text-amber-500 text-sm font-bold"
              >
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 1 }}
                >
                  <Zap className="w-4 h-4" />
                </motion.div>
                Novo recorde!
              </motion.div>
            )}

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.3 }}
              className="flex gap-3 justify-center pt-1"
            >
              <Button
                onClick={startGame}
                className="gap-2 shadow-md shadow-primary/15"
              >
                <RotateCcw className="w-4 h-4" /> Jogar Novamente
              </Button>
              <Button
                variant="outline"
                onClick={() => setPhase('menu')}
                className="transition-colors"
              >
                Menu
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}