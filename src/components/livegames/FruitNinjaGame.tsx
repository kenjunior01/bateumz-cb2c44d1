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

interface SlicePoint {
  x: number;
  y: number;
  time: number;
}

// ===================== CONSTANTS =====================

const CANVAS_W = 360;
const CANVAS_H = 520;
const GRAVITY = 0.32;
const FRUIT_RADIUS = 28;
const BOMB_RADIUS = 26;
const SLICE_TRAIL_DURATION = 120;

const FRUIT_TYPES: { name: string; color: string; inner: string; points: number; emoji: string }[] = [
  { name: 'maca', color: '#ef4444', inner: '#fca5a5', points: 1, emoji: '🍎' },
  { name: 'laranja', color: '#f97316', inner: '#fdba74', points: 2, emoji: '🍊' },
  { name: 'melancia', color: '#22c55e', inner: '#86efac', points: 3, emoji: '🍉' },
  { name: 'uva', color: '#a855f7', inner: '#d8b4fe', points: 2, emoji: '🍇' },
  { name: 'banana', color: '#eab308', inner: '#fef08a', points: 1, emoji: '🍌' },
  { name: 'abacaxi', color: '#d97706', inner: '#fde68a', points: 4, emoji: '🍍' },
];

const BOMB_INFO = { color: '#1f2937', inner: '#6b7280', points: 0, emoji: '💣' };

const SPAWN_INTERVAL_INITIAL = 1200;
const SPAWN_INTERVAL_MIN = 500;
const SPAWN_INTERVAL_DECAY = 8;
const BOMB_CHANCE = 0.12;

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fruitsRef = useRef<Fruit[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const sliceTrailRef = useRef<SlicePoint[]>([]);
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

  const spawnParticles = useCallback((x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 2,
        life: 1,
        maxLife: 25 + Math.random() * 20,
        color,
        size: 3 + Math.random() * 5,
      });
    }
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
    });
  }, []);

  const sliceFruit = useCallback((fruit: Fruit) => {
    if (fruit.sliced) return;
    fruit.sliced = true;

    if (fruit.type === -1) {
      // Bomb sliced - game over
      spawnParticles(fruit.x, fruit.y, 20, '#ff4444');
      spawnParticles(fruit.x, fruit.y, 15, '#ff8800');
      if (!gameOverTriggered.current) {
        gameOverTriggered.current = true;
        setTimeout(() => {
          if (phaseRef.current === 'playing') {
            setPhase('gameover');
          }
        }, 300);
      }
      return;
    }

    const ft = FRUIT_TYPES[fruit.type];
    spawnParticles(fruit.x, fruit.y, 12, ft.color);
    spawnParticles(fruit.x, fruit.y, 8, ft.inner);

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
  }, [spawnParticles]);

  const checkSliceAt = useCallback((x: number, y: number) => {
    for (const fruit of fruitsRef.current) {
      if (fruit.sliced || fruit.missed) continue;
      const dx = x - fruit.x;
      const dy = y - fruit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < fruit.radius + 8) {
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

  // Game loop
  useEffect(() => {
    if (phase !== 'playing') {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    gameOverTriggered.current = false;
    fruitsRef.current = [];
    particlesRef.current = [];
    sliceTrailRef.current = [];
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

        if (f.y > CANVAS_H + f.radius + 10 && f.vy > 0 && !f.missed) {
          f.missed = true;
          if (f.type !== -1) {
            livesRef.current--;
            setLives(livesRef.current);
            if (livesRef.current <= 0 && !gameOverTriggered.current) {
              gameOverTriggered.current = true;
              setTimeout(() => {
                if (phaseRef.current === 'playing') setPhase('gameover');
              }, 200);
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
        p.vy += 0.15 * dt;
        p.life -= (1 / p.maxLife) * dt;
      }
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // Clean old slice trail
      const now = Date.now();
      sliceTrailRef.current = sliceTrailRef.current.filter(p => now - p.time < SLICE_TRAIL_DURATION);

      // ---- DRAW ----
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw fruits
      for (const f of fruitsRef.current) {
        if (f.sliced) continue;
        const info = f.type === -1 ? BOMB_INFO : FRUIT_TYPES[f.type];

        // Shadow
        ctx.beginPath();
        ctx.arc(f.x + 2, f.y + 2, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        // Main circle
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = info.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner highlight
        ctx.beginPath();
        ctx.arc(f.x - f.radius * 0.2, f.y - f.radius * 0.2, f.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = info.inner;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Emoji
        ctx.font = `${f.radius * 1.1}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(info.emoji, f.x, f.y + 1);
      }

      // Draw particles
      for (const p of particlesRef.current) {
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw slice trail
      if (sliceTrailRef.current.length > 1) {
        for (let i = 1; i < sliceTrailRef.current.length; i++) {
          const p0 = sliceTrailRef.current[i - 1];
          const p1 = sliceTrailRef.current[i];
          const age = (now - p1.time) / SLICE_TRAIL_DURATION;
          const alpha = 1 - age;
          const width = (1 - age) * 6 + 2;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.stroke();
          // Glow
          ctx.strokeStyle = `rgba(0, 255, 200, ${alpha * 0.5})`;
          ctx.lineWidth = width + 4;
          ctx.stroke();
        }
      }

      // HUD
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Pontos: ${scoreRef.current}`, 12, 28);

      // Lives as hearts
      ctx.font = '20px serif';
      ctx.textAlign = 'right';
      let heartsStr = '';
      for (let i = 0; i < 3; i++) {
        heartsStr += i < livesRef.current ? '❤️' : '🖤';
      }
      ctx.fillText(heartsStr, CANVAS_W - 12, 28);

      // Combo
      if (multiplierRef.current > 1) {
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = multiplierRef.current >= 3 ? '#fbbf24' : '#34d399';
        ctx.fillText(`x${multiplierRef.current} COMBO!`, CANVAS_W / 2, 28);
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

  // Canvas mouse/touch handlers
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

    // Check intersections along the line from prevMouse to current
    if (prevMouseRef.current) {
      const dx = pos.x - prevMouseRef.current.x;
      const dy = pos.y - prevMouseRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(dist / 10));
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

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {phase === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-b from-slate-900 to-slate-800 border border-slate-700 w-full relative overflow-hidden"
          >
            {/* Animated bg particles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div key={i}
                  animate={{ y: [0, -20, 0], opacity: [0.1, 0.25, 0.1], x: [0, Math.sin(i) * 10, 0] }}
                  transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
                  className="absolute w-1 h-1 rounded-full bg-emerald-400/40"
                  style={{ left: `${10 + (i * 12) % 80}%`, top: `${15 + (i * 15) % 70}%` }} />
              ))}
            </div>

            <div className="relative z-10 text-center">
              <motion.div animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
                <span className="text-6xl block mb-2 drop-shadow-lg">🍉</span>
              </motion.div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-300 via-green-400 to-lime-500 bg-clip-text text-transparent">Fruit Ninja</h2>
              <p className="text-sm text-slate-400 text-center mt-1">Corte as frutas e evite as bombas!</p>
              <div className="flex justify-center gap-3 mt-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">🔥 Combos</span>
                <span className="flex items-center gap-1">💣 Bombas</span>
                <span className="flex items-center gap-1">⚡ Multiplicador</span>
              </div>
            </div>

            {highScore > 0 && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-500 relative z-10">
                <Trophy className="w-3 h-3 mr-1" />
                Recorde: {highScore}
              </Badge>
            )}

            <div className="flex gap-2 w-full relative z-10">
              <Button
                onClick={() => { setBotMode(false); startGame(); }}
                className={cn('flex-1 shadow-lg', !botMode ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-700')}
              >
                <Play className="w-4 h-4 mr-2" />
                Jogar
              </Button>
              <Button
                onClick={() => { setBotMode(true); startGame(); }}
                className={cn('flex-1 shadow-lg', botMode ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/20' : 'bg-slate-700')}
              >
                <Bot className="w-4 h-4 mr-2" />
                Bot
              </Button>
            </div>

            <div className="text-xs text-slate-500 text-center space-y-1 relative z-10">
              <p>Deslize para cortar frutas</p>
              <p>❤️ 3 vidas | 💣 Bomba = fim</p>
              <p>🔥 Combo rapido = multiplicador de pontos!</p>
            </div>
          </motion.div>
        )}

        {phase === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full"
          >
            <div className="flex items-center justify-between px-2 py-1">
              <Badge variant="secondary" className="bg-emerald-600 text-white text-xs">
                <Zap className="w-3 h-3 mr-1" />
                {score}
              </Badge>
              {multiplier > 1 && (
                <Badge variant="secondary" className="bg-yellow-600 text-white text-xs">
                  <Flame className="w-3 h-3 mr-1" />
                  x{multiplier}
                </Badge>
              )}
              <Badge variant="secondary" className="bg-red-600 text-white text-xs">
                {Array.from({ length: 3 }, (_, i) => i < lives ? '❤️' : '🖤').join(' ')}
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
              <div className="absolute top-2 left-1/2 -translate-x-1/2">
                <Badge className="bg-violet-600 text-white text-xs">
                  <Bot className="w-3 h-3 mr-1" />
                  Modo Bot
                </Badge>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'gameover' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-b from-slate-900 to-red-950 border border-red-800 w-full"
          >
            <div className="text-4xl">💥</div>
            <h2 className="text-2xl font-bold text-white">Fim de Jogo!</h2>

            <div className="grid grid-cols-2 gap-3 w-full text-center">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Pontos</p>
                <p className="text-2xl font-bold text-white">{score}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Frutas Cortadas</p>
                <p className="text-2xl font-bold text-emerald-400">{fruitsSliced}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Maior Combo</p>
                <p className="text-2xl font-bold text-yellow-400">{maxCombo}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-400">Recorde</p>
                <p className={cn("text-2xl font-bold", score >= highScore ? "text-yellow-400" : "text-slate-300")}>
                  {highScore}
                </p>
              </div>
            </div>

            {score >= highScore && score > 0 && (
              <Badge className="bg-yellow-600 text-white animate-pulse">
                <Trophy className="w-3 h-3 mr-1" />
                Novo Recorde!
              </Badge>
            )}

            <div className="flex gap-2 w-full">
              <Button onClick={startGame} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <RotateCcw className="w-4 h-4 mr-2" />
                Jogar Novamente
              </Button>
              <Button onClick={() => setPhase('menu')} variant="outline" className="border-slate-600 text-white">
                Menu
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
