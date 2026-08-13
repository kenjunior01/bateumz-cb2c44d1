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
}

interface Mountain {
  x: number;
  h: number;
  w: number;
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

const MEDALS: { min: number; name: string; color: string; emoji: string }[] = [
  { min: 40, name: 'Platina', color: '#00d4ff', emoji: '💎' },
  { min: 30, name: 'Ouro', color: '#ffd700', emoji: '🥇' },
  { min: 20, name: 'Prata', color: '#c0c0c0', emoji: '🥈' },
  { min: 10, name: 'Bronze', color: '#cd7f32', emoji: '🥉' },
];

// ===================== HELPERS =====================

function getMedal(score: number) {
  return MEDALS.find(m => score >= m.min) ?? null;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function getThemeColors(score: number) {
  const t = Math.min(score / 40, 1);
  return {
    skyTop: `rgb(${Math.round(lerp(135, 15, t))}, ${Math.round(lerp(206, 15, t))}, ${Math.round(lerp(235, 52, t))})`,
    skyBot: `rgb(${Math.round(lerp(250, 30, t))}, ${Math.round(lerp(250, 40, t))}, ${Math.round(lerp(255, 80, t))})`,
    ground: `rgb(${Math.round(lerp(134, 50, t))}, ${Math.round(lerp(193, 60, t))}, ${Math.round(lerp(90, 30, t))})`,
    groundDark: `rgb(${Math.round(lerp(100, 35, t))}, ${Math.round(lerp(155, 40, t))}, ${Math.round(lerp(65, 20, t))})`,
    pipeBody: `rgb(${Math.round(lerp(80, 30, t))}, ${Math.round(lerp(180, 80, t))}, ${Math.round(lerp(80, 60, t))})`,
    pipeEdge: `rgb(${Math.round(lerp(100, 40, t))}, ${Math.round(lerp(200, 100, t))}, ${Math.round(lerp(100, 80, t))})`,
    isDark: t > 0.5,
  };
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
  useEffect(() => { onScoreRef.current = onScore; }, [onScore]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Initialize background elements
  const initBackground = useCallback(() => {
    const clouds: Cloud[] = [];
    for (let i = 0; i < 5; i++) {
      clouds.push({ x: Math.random() * CANVAS_W, y: 20 + Math.random() * 100, w: 40 + Math.random() * 60, speed: 0.3 + Math.random() * 0.5 });
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

      // Collision detection
      const birdTop = bird.y - BIRD_SIZE / 2;
      const birdBot = bird.y + BIRD_SIZE / 2;
      const birdLeft = bird.x - BIRD_SIZE / 2;
      const birdRight = bird.x + BIRD_SIZE / 2;

      let dead = false;

      // Ground / ceiling
      if (birdBot >= CANVAS_H - 40 || birdTop <= 0) dead = true;

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

      // Update clouds
      for (const c of clouds) {
        c.x -= c.speed * speedMult * 0.3;
        if (c.x + c.w < 0) { c.x = CANVAS_W + 10; c.y = 20 + Math.random() * 100; }
      }

      // Update mountains
      for (const m of mountains) {
        m.x -= pipeSpeed * 0.3;
        if (m.x + m.w < -10) { m.x = CANVAS_W + 20; m.h = 40 + Math.random() * 60; }
      }

      // ===================== DRAW =====================
      const theme = getThemeColors(scoreRef.current);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      skyGrad.addColorStop(0, theme.skyTop);
      skyGrad.addColorStop(1, theme.skyBot);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Stars (night)
      if (theme.isDark) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 30; i++) {
          const sx = (i * 73 + frameRef.current * 0.02) % CANVAS_W;
          const sy = (i * 41) % 200;
          ctx.beginPath();
          ctx.arc(sx, sy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Mountains
      ctx.fillStyle = theme.isDark ? 'rgba(30,40,60,0.6)' : 'rgba(100,160,100,0.3)';
      for (const m of mountains) {
        ctx.beginPath();
        ctx.moveTo(m.x, CANVAS_H - 40);
        ctx.lineTo(m.x + m.w / 2, CANVAS_H - 40 - m.h);
        ctx.lineTo(m.x + m.w, CANVAS_H - 40);
        ctx.fill();
      }

      // Clouds
      ctx.fillStyle = theme.isDark ? 'rgba(200,200,220,0.15)' : 'rgba(255,255,255,0.7)';
      for (const c of clouds) {
        ctx.beginPath();
        ctx.ellipse(c.x + c.w / 2, c.y, c.w / 2, c.w / 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pipes
      for (const p of pipes) {
        // Top pipe
        const topH = p.gapY;
        ctx.fillStyle = theme.pipeBody;
        ctx.fillRect(p.x, 0, PIPE_W, topH);
        ctx.fillStyle = theme.pipeEdge;
        ctx.fillRect(p.x - 3, topH - 24, PIPE_W + 6, 24);
        ctx.fillRect(p.x + 3, 0, 4, topH - 24);

        // Bottom pipe
        const botY = p.gapY + p.gapH;
        ctx.fillStyle = theme.pipeBody;
        ctx.fillRect(p.x, botY, PIPE_W, CANVAS_H - 40 - botY);
        ctx.fillStyle = theme.pipeEdge;
        ctx.fillRect(p.x - 3, botY, PIPE_W + 6, 24);
        ctx.fillRect(p.x + 3, botY + 24, 4, CANVAS_H - 40 - botY - 24);
      }

      // Ground
      ctx.fillStyle = theme.ground;
      ctx.fillRect(0, CANVAS_H - 40, CANVAS_W, 40);
      ctx.fillStyle = theme.groundDark;
      ctx.fillRect(0, CANVAS_H - 40, CANVAS_W, 4);
      // Ground pattern
      ctx.strokeStyle = theme.groundDark;
      ctx.lineWidth = 1;
      const gOff = (frameRef.current * pipeSpeed) % 20;
      for (let gx = -gOff; gx < CANVAS_W; gx += 20) {
        ctx.beginPath();
        ctx.moveTo(gx, CANVAS_H - 36);
        ctx.lineTo(gx + 10, CANVAS_H - 30);
        ctx.stroke();
      }

      // Bird
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate((bird.rotation * Math.PI) / 180);
      // Body
      ctx.fillStyle = '#f7dc6f';
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2 * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d4a017';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Wing
      ctx.fillStyle = '#f0b429';
      const wingFlap = Math.sin(frameRef.current * 0.3) * 4;
      ctx.beginPath();
      ctx.ellipse(-4, wingFlap, 8, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Eye
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(6, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(7.5, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Beak
      ctx.fillStyle = '#e67e22';
      ctx.beginPath();
      ctx.moveTo(10, -1);
      ctx.lineTo(17, 2);
      ctx.lineTo(10, 5);
      ctx.fill();
      ctx.restore();

      // Particles
      for (const p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Score text
      ctx.save();
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 4;
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText(scoreRef.current.toString(), CANVAS_W / 2, 60);
      ctx.fillText(scoreRef.current.toString(), CANVAS_W / 2, 60);
      ctx.restore();

      if (!gameOverTriggered.current) {
        animRef.current = requestAnimationFrame(loop);
      } else {
        // Continue rendering a bit for death animation
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
          // Draw particles
          for (const p of particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          if (deathFrames < 30) requestAnimationFrame(deathLoop);
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
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 p-4">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: [0, -8, 0], opacity: 1 }}
          transition={{ y: { repeat: Infinity, duration: 1.5 }, opacity: { duration: 0.5 } }}
          className="text-6xl"
        >
          <Bird className="w-16 h-16 text-amber-400 mx-auto" />
        </motion.div>
        <h2 className="text-2xl font-bold">Flappy Bird</h2>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Toque, clique ou pressione Espaço para voar! Desvie dos canos e conquiste a maior pontuação.
        </p>
        <div className="flex items-center gap-3">
          <Button variant={botMode ? 'default' : 'outline'} size="sm" onClick={() => setBotMode(b => !b)} className="gap-2">
            <Bot className="w-4 h-4" /> {botMode ? 'Bot Ativado' : 'Modo Bot'}
          </Button>
        </div>
        <Button size="lg" onClick={startGame} className="gap-2">
          <Play className="w-5 h-5" /> Jogar
        </Button>
        {highScore > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="w-4 h-4" /> Recorde: {highScore}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">🥉 Bronze: 10+</Badge>
          <Badge variant="outline" className="text-xs">🥈 Prata: 20+</Badge>
          <Badge variant="outline" className="text-xs">🥇 Ouro: 30+</Badge>
          <Badge variant="outline" className="text-xs">💎 Platina: 40+</Badge>
        </div>
      </div>
    );
  }

  // ===================== RENDER: PLAYING / GAME OVER =====================
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="rounded-xl border-2 border-border shadow-xl cursor-pointer max-w-full"
        onClick={flap}
        onTouchStart={(e) => { e.preventDefault(); flap(); }}
        style={{ imageRendering: 'auto' }}
      />

      {phase === 'playing' && (
        <div className="flex items-center gap-3">
          {botMode && (
            <Badge variant="secondary" className="gap-1">
              <Bot className="w-3 h-3" /> Bot jogando
            </Badge>
          )}
          <p className="text-xs text-muted-foreground">Toque ou Espaço para voar</p>
        </div>
      )}

      <AnimatePresence>
        {phase === 'gameover' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-card border rounded-2xl p-6 w-72 text-center space-y-4 shadow-xl"
          >
            <div className="text-3xl">💀</div>
            <h3 className="text-xl font-bold">Fim de Jogo</h3>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold">{score}</div>
                <div className="text-xs text-muted-foreground">Pontuação</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold">{Math.max(highScore, score)}</div>
                <div className="text-xs text-muted-foreground">Recorde</div>
              </div>
            </div>

            {medal && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                transition={{ scale: { delay: 0.3 }, rotate: { delay: 0.5, duration: 0.5 } }}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-3xl">{medal.emoji}</span>
                <Badge style={{ backgroundColor: medal.color, color: '#000' }} className="gap-1">
                  <Medal className="w-3 h-3" /> {medal.name}
                </Badge>
              </motion.div>
            )}

            {score >= highScore && score > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-1 text-amber-500 text-sm font-medium"
              >
                <Zap className="w-4 h-4" /> Novo recorde!
              </motion.div>
            )}

            <div className="flex gap-3 justify-center">
              <Button onClick={startGame} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Jogar Novamente
              </Button>
              <Button variant="outline" onClick={() => setPhase('menu')}>
                Menu
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
