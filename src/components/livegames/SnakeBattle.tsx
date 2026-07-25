"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RotateCcw, Coins, Cpu, Users, Swords } from "lucide-react";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GameState = "waiting" | "modeSelect" | "playing" | "gameOver";
type SpeedLevel = "slow" | "normal" | "fast";
type DifficultyLevel = "facil" | "medio" | "dificil";
type GameMode = "local" | "bot";
type Direction = "up" | "down" | "left" | "right";

interface Point {
  x: number;
  y: number;
}

interface Snake {
  body: Point[];
  direction: Direction;
  nextDirection: Direction;
  growing: boolean;
}

const GRID_SIZE = 20;

const SPEED_MAP: Record<SpeedLevel, number> = {
  slow: 200,
  normal: 130,
  fast: 75,
};

const BOT_CONFIG: Record<DifficultyLevel, { foodSeekChance: number; avoidWallChance: number; avoidSnakeChance: number; tickInterval: number; randomChance: number }> = {
  facil: { foodSeekChance: 0.3, avoidWallChance: 0.4, avoidSnakeChance: 0.2, tickInterval: 3, randomChance: 0.35 },
  medio: { foodSeekChance: 0.6, avoidWallChance: 0.8, avoidSnakeChance: 0.6, tickInterval: 2, randomChance: 0.12 },
  dificil: { foodSeekChance: 0.9, avoidWallChance: 0.98, avoidSnakeChance: 0.9, tickInterval: 1, randomChance: 0.03 },
};

const DIFF_LABEL: Record<DifficultyLevel, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
const DIFF_DESC: Record<DifficultyLevel, string> = {
  facil: 'Lento, comete erros frequentes',
  medio: 'Reage bem, comete alguns erros',
  dificil: 'Quase perfeito, raramente erra',
};
const DIFF_COLORS: Record<DifficultyLevel, string> = {
  facil: 'from-emerald-600/20 to-emerald-800/20 border-emerald-500/30',
  medio: 'from-amber-600/20 to-amber-800/20 border-amber-500/30',
  dificil: 'from-red-600/20 to-red-800/20 border-red-500/30',
};

const INITIAL_SNAKE_1: Snake = {
  body: [
    { x: 3, y: 10 },
    { x: 2, y: 10 },
    { x: 1, y: 10 },
  ],
  direction: "right",
  nextDirection: "right",
  growing: false,
};

const INITIAL_SNAKE_2: Snake = {
  body: [
    { x: 16, y: 10 },
    { x: 17, y: 10 },
    { x: 18, y: 10 },
  ],
  direction: "left",
  nextDirection: "left",
  growing: false,
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const DIRECTION_DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function randomFood(snake1: Snake, snake2: Snake): Point {
  const occupied = new Set<string>();
  for (const p of snake1.body) occupied.add(`${p.x},${p.y}`);
  for (const p of snake2.body) occupied.add(`${p.x},${p.y}`);
  let pt: Point;
  do {
    pt = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (occupied.has(`${pt.x},${pt.y}`));
  return pt;
}

function cloneSnake(s: Snake): Snake {
  return {
    body: s.body.map((p) => ({ ...p })),
    direction: s.direction,
    nextDirection: s.nextDirection,
    growing: s.growing,
  };
}

function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export default function SnakeBattle({ onScore, liveCode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const [gameState, setGameState] = useState<GameState>("modeSelect");
  const [speed, setSpeed] = useState<SpeedLevel>("normal");
  const [gameMode, setGameMode] = useState<GameMode>("local");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medio");
  const [round, setRound] = useState(1);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [length1, setLength1] = useState(3);
  const [length2, setLength2] = useState(3);
  const [winner, setWinner] = useState<"Jogador 1" | "Jogador 2" | "IA Bot" | "empate" | null>(null);
  const [canvasSize, setCanvasSize] = useState(500);
  const [flashScore, setFlashScore] = useState<1 | 2 | null>(null);

  const snake1Ref = useRef<Snake>(cloneSnake(INITIAL_SNAKE_1));
  const snake2Ref = useRef<Snake>(cloneSnake(INITIAL_SNAKE_2));
  const foodRef = useRef<Point>({ x: 10, y: 5 });
  const gameStateRef = useRef<GameState>("modeSelect");
  const speedRef = useRef<SpeedLevel>("normal");
  const gameModeRef = useRef<GameMode>("local");
  const difficultyRef = useRef<DifficultyLevel>("medio");
  const botTickCounterRef = useRef<number>(0);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  const resizeCanvas = useCallback(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const size = Math.min(w, 500);
    setCanvasSize(size);
    if (canvasRef.current) {
      canvasRef.current.width = size;
      canvasRef.current.height = size;
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const resetRound = useCallback(() => {
    snake1Ref.current = cloneSnake(INITIAL_SNAKE_1);
    snake2Ref.current = cloneSnake(INITIAL_SNAKE_2);
    foodRef.current = randomFood(snake1Ref.current, snake2Ref.current);
    setLength1(3);
    setLength2(3);
    setWinner(null);
    setGameState("waiting");
  }, []);

  const resetAll = useCallback(() => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    setRound(1);
    setScore1(0);
    setScore2(0);
    resetRound();
  }, [resetRound]);

  const endRound = useCallback(
    (w: "Jogador 1" | "Jogador 2" | "IA Bot" | "empate") => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      setWinner(w);
      setGameState("gameOver");

      if (w === "Jogador 1") {
        const newScore = score1 + 10 + length1;
        setScore1(newScore);
        onScore?.("Jogador 1", newScore);
      } else if (w === "Jogador 2" || w === "IA Bot") {
        const label = gameModeRef.current === "bot" ? "IA Bot" : "Jogador 2";
        const newScore = score2 + 10 + length2;
        setScore2(newScore);
        onScore?.(label, newScore);
      }
    },
    [onScore, score1, score2, length1, length2]
  );

  const botAI = useCallback(() => {
    const s2 = snake2Ref.current;
    const food = foodRef.current;
    const s1 = snake1Ref.current;
    const cfg = BOT_CONFIG[difficultyRef.current];
    const head = s2.body[0];

    botTickCounterRef.current++;
    if (botTickCounterRef.current % cfg.tickInterval !== 0) return;

    // Random move sometimes
    if (Math.random() < cfg.randomChance) {
      const dirs: Direction[] = ["up", "down", "left", "right"];
      const safe = dirs.filter(d => {
        if (d === OPPOSITE[s2.direction]) return false;
        const delta = DIRECTION_DELTA[d];
        const nx = head.x + delta.x;
        const ny = head.y + delta.y;
        return nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE;
      });
      if (safe.length > 0) {
        s2.nextDirection = safe[Math.floor(Math.random() * safe.length)];
      }
      return;
    }

    // Calculate safe directions
    const allDirs: Direction[] = ["up", "down", "left", "right"];
    const safeDirs = allDirs.filter(d => {
      if (d === OPPOSITE[s2.direction]) return false;
      const delta = DIRECTION_DELTA[d];
      const nx = head.x + delta.x;
      const ny = head.y + delta.y;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return false;
      // Check collision with both snakes
      for (const seg of s1.body) if (seg.x === nx && seg.y === ny) return false;
      for (let i = 0; i < s2.body.length - 1; i++) if (s2.body[i].x === nx && s2.body[i].y === ny) return false;
      return true;
    });

    if (safeDirs.length === 0) {
      // No safe direction, just go straight
      return;
    }

    // Avoid walls
    if (Math.random() < cfg.avoidWallChance) {
      const dangerous = head.x <= 2 || head.x >= GRID_SIZE - 3 || head.y <= 2 || head.y >= GRID_SIZE - 3;
      if (dangerous) {
        const safe = safeDirs.filter(d => {
          const delta = DIRECTION_DELTA[d];
          const nx = head.x + delta.x;
          const ny = head.y + delta.y;
          return nx > 1 && nx < GRID_SIZE - 2 && ny > 1 && ny < GRID_SIZE - 2;
        });
        if (safe.length > 0) {
          s2.nextDirection = safe[Math.floor(Math.random() * safe.length)];
          return;
        }
      }
    }

    // Seek food
    if (Math.random() < cfg.foodSeekChance) {
      const dx = food.x - head.x;
      const dy = food.y - head.y;
      let preferred: Direction[] = [];
      if (Math.abs(dx) >= Math.abs(dy)) {
        preferred.push(dx > 0 ? "right" : "left");
        if (dy !== 0) preferred.push(dy > 0 ? "down" : "up");
      } else {
        preferred.push(dy > 0 ? "down" : "up");
        if (dx !== 0) preferred.push(dx > 0 ? "right" : "left");
      }
      for (const d of preferred) {
        if (d !== OPPOSITE[s2.direction] && safeDirs.includes(d)) {
          s2.nextDirection = d;
          return;
        }
      }
    }

    // Avoid other snake
    if (Math.random() < cfg.avoidSnakeChance) {
      const s1Head = s1.body[0];
      const dist = Math.abs(head.x - s1Head.x) + Math.abs(head.y - s1Head.y);
      if (dist < 5) {
        const awayDirs = safeDirs.filter(d => {
          const delta = DIRECTION_DELTA[d];
          const nx = head.x + delta.x;
          const ny = head.y + delta.y;
          const newDist = Math.abs(nx - s1Head.x) + Math.abs(ny - s1Head.y);
          return newDist > dist;
        });
        if (awayDirs.length > 0) {
          s2.nextDirection = awayDirs[Math.floor(Math.random() * awayDirs.length)];
          return;
        }
      }
    }

    // Default: pick a random safe direction
    s2.nextDirection = safeDirs[Math.floor(Math.random() * safeDirs.length)];
  }, []);

  const tick = useCallback(() => {
    const s1 = snake1Ref.current;
    const s2 = snake2Ref.current;
    const food = foodRef.current;

    s1.direction = s1.nextDirection;
    s2.direction = s2.nextDirection;

    // Run bot AI before moving
    if (gameModeRef.current === "bot") {
      botAI();
      s2.direction = s2.nextDirection;
    }

    const d1 = DIRECTION_DELTA[s1.direction];
    const d2 = DIRECTION_DELTA[s2.direction];

    const newHead1: Point = {
      x: s1.body[0].x + d1.x,
      y: s1.body[0].y + d1.y,
    };
    const newHead2: Point = {
      x: s2.body[0].x + d2.x,
      y: s2.body[0].y + d2.y,
    };

    const hitWall1 =
      newHead1.x < 0 || newHead1.x >= GRID_SIZE || newHead1.y < 0 || newHead1.y >= GRID_SIZE;
    const hitWall2 =
      newHead2.x < 0 || newHead2.x >= GRID_SIZE || newHead2.y < 0 || newHead2.y >= GRID_SIZE;

    const hitSelf1 = s1.body.some((p) => pointsEqual(p, newHead1));
    const hitSelf2 = s2.body.some((p) => pointsEqual(p, newHead2));

    const hitOther1 = s2.body.some((p) => pointsEqual(p, newHead1));
    const hitOther2 = s1.body.some((p) => pointsEqual(p, newHead2));

    const headCollision = pointsEqual(newHead1, newHead2);

    const dead1 = hitWall1 || hitSelf1 || hitOther1;
    const dead2 = hitWall2 || hitSelf2 || hitOther2;

    if (dead1 && dead2) {
      endRound("empate");
      return;
    }
    if (dead1) {
      endRound(gameModeRef.current === "bot" ? "IA Bot" : "Jogador 2");
      return;
    }
    if (dead2) {
      endRound("Jogador 1");
      return;
    }
    if (headCollision) {
      endRound("empate");
      return;
    }

    s1.body.unshift(newHead1);
    s2.body.unshift(newHead2);

    const ate1 = pointsEqual(newHead1, food);
    const ate2 = pointsEqual(newHead2, food);

    if (ate1) {
      setLength1((l) => l + 1);
      setFlashScore(1);
      setTimeout(() => setFlashScore(null), 400);
      foodRef.current = randomFood(s1, s2);
    } else {
      s1.body.pop();
    }

    if (ate2) {
      setLength2((l) => l + 1);
      setFlashScore(2);
      setTimeout(() => setFlashScore(null), 400);
      foodRef.current = randomFood(s1, s2);
    } else {
      s2.body.pop();
    }
  }, [endRound, botAI]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cell = w / GRID_SIZE;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.06)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * cell;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(w, pos);
      ctx.stroke();
    }

    const food = foodRef.current;
    const fx = food.x * cell + cell / 2;
    const fy = food.y * cell + cell / 2;
    const foodRadius = cell * 0.35;

    const glowRadius = cell * 0.9;
    const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, glowRadius);
    glow.addColorStop(0, "rgba(251, 191, 36, 0.35)");
    glow.addColorStop(1, "rgba(251, 191, 36, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(fx, fy, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const foodGrad = ctx.createRadialGradient(
      fx - foodRadius * 0.3,
      fy - foodRadius * 0.3,
      0,
      fx,
      fy,
      foodRadius
    );
    foodGrad.addColorStop(0, "#fde68a");
    foodGrad.addColorStop(0.6, "#fbbf24");
    foodGrad.addColorStop(1, "#d97706");
    ctx.fillStyle = foodGrad;
    ctx.beginPath();
    ctx.arc(fx, fy, foodRadius, 0, Math.PI * 2);
    ctx.fill();

    const drawSnake = (
      snake: Snake,
      color1: string,
      color2: string,
      glowColor: string
    ) => {
      const body = snake.body;
      for (let i = body.length - 1; i >= 0; i--) {
        const seg = body[i];
        const t = i / Math.max(body.length - 1, 1);
        const cx = seg.x * cell + cell / 2;
        const cy = seg.y * cell + cell / 2;

        const isHead = i === 0;
        const segSize = isHead ? cell * 0.45 : cell * 0.38 - t * cell * 0.08;

        if (isHead) {
          const headGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.7);
          headGlow.addColorStop(0, glowColor);
          headGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = headGlow;
          ctx.beginPath();
          ctx.arc(cx, cy, cell * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }

        const segGrad = ctx.createRadialGradient(
          cx - segSize * 0.3,
          cy - segSize * 0.3,
          0,
          cx,
          cy,
          segSize
        );
        segGrad.addColorStop(0, color1);
        segGrad.addColorStop(1, color2);
        ctx.fillStyle = segGrad;

        ctx.beginPath();
        ctx.roundRect(
          seg.x * cell + (cell - segSize * 2) / 2,
          seg.y * cell + (cell - segSize * 2) / 2,
          segSize * 2,
          segSize * 2,
          isHead ? segSize * 0.4 : segSize * 0.35
        );
        ctx.fill();

        if (isHead) {
          const dir = snake.direction;
          const eyeOffset = cell * 0.14;
          const eyeRadius = cell * 0.07;
          const pupilRadius = cell * 0.04;

          let e1: Point, e2: Point;
          if (dir === "right") {
            e1 = { x: cx + eyeOffset * 0.5, y: cy - eyeOffset };
            e2 = { x: cx + eyeOffset * 0.5, y: cy + eyeOffset };
          } else if (dir === "left") {
            e1 = { x: cx - eyeOffset * 0.5, y: cy - eyeOffset };
            e2 = { x: cx - eyeOffset * 0.5, y: cy + eyeOffset };
          } else if (dir === "up") {
            e1 = { x: cx - eyeOffset, y: cy - eyeOffset * 0.5 };
            e2 = { x: cx + eyeOffset, y: cy - eyeOffset * 0.5 };
          } else {
            e1 = { x: cx - eyeOffset, y: cy + eyeOffset * 0.5 };
            e2 = { x: cx + eyeOffset, y: cy + eyeOffset * 0.5 };
          }

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(e1.x, e1.y, eyeRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(e2.x, e2.y, eyeRadius, 0, Math.PI * 2);
          ctx.fill();

          const pupilShift = cell * 0.03;
          const pd = DIRECTION_DELTA[dir];
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(e1.x + pd.x * pupilShift, e1.y + pd.y * pupilShift, pupilRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(e2.x + pd.x * pupilShift, e2.y + pd.y * pupilShift, pupilRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    drawSnake(
      snake1Ref.current,
      "#22d3ee",
      "#0891b2",
      "rgba(34, 211, 238, 0.2)"
    );
    drawSnake(
      snake2Ref.current,
      "#f472b6",
      "#c026d3",
      "rgba(244, 114, 182, 0.2)"
    );
  }, []);

  const gameLoop = useCallback(() => {
    const now = performance.now();
    const interval = SPEED_MAP[speedRef.current];
    if (now - lastTickRef.current >= interval) {
      lastTickRef.current = now;
      if (gameStateRef.current === "playing") {
        tick();
      }
    }
    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [tick, draw]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameLoop]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameStateRef.current !== "playing") return;

      const s1 = snake1Ref.current;
      const s2 = snake2Ref.current;

      switch (e.key.toLowerCase()) {
        case "w":
          if (s1.direction !== "down") s1.nextDirection = "up";
          e.preventDefault();
          break;
        case "s":
          if (s1.direction !== "up") s1.nextDirection = "down";
          e.preventDefault();
          break;
        case "a":
          if (s1.direction !== "right") s1.nextDirection = "left";
          e.preventDefault();
          break;
        case "d":
          if (s1.direction !== "left") s1.nextDirection = "right";
          e.preventDefault();
          break;
        case "arrowup":
          if (gameModeRef.current !== "bot" && s2.direction !== "down") s2.nextDirection = "up";
          e.preventDefault();
          break;
        case "arrowdown":
          if (gameModeRef.current !== "bot" && s2.direction !== "up") s2.nextDirection = "down";
          e.preventDefault();
          break;
        case "arrowleft":
          if (gameModeRef.current !== "bot" && s2.direction !== "right") s2.nextDirection = "left";
          e.preventDefault();
          break;
        case "arrowright":
          if (gameModeRef.current !== "bot" && s2.direction !== "left") s2.nextDirection = "right";
          e.preventDefault();
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const startGame = useCallback(() => {
    resetRound();
    botTickCounterRef.current = 0;
    setGameState("playing");
    lastTickRef.current = performance.now();
  }, [resetRound]);

  const nextRound = useCallback(() => {
    const nextR = round + 1;
    setRound(nextR);
    resetRound();
    setGameState("playing");
    lastTickRef.current = performance.now();
  }, [round, resetRound]);

  const setDirection = useCallback((player: 1 | 2, dir: Direction) => {
    if (gameStateRef.current !== "playing") return;
    const snake = player === 1 ? snake1Ref.current : snake2Ref.current;
    if (OPPOSITE[dir] !== snake.direction) {
      snake.nextDirection = dir;
    }
  }, []);

  const speedLabel: Record<SpeedLevel, string> = {
    slow: "Lento",
    normal: "Normal",
    fast: "Rápido",
  };

  const p2Label = gameMode === 'bot' ? `IA (${DIFF_LABEL[difficulty]})` : 'Jogador 2';

  const modeSelectScreen = (
    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center gap-6 z-10">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
        <Swords className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-white mb-1">Cobra Batalha</h2>
        <p className="text-sm text-slate-400">Escolhe o modo de jogo</p>
      </motion.div>
      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => { setGameMode('local'); setGameState('waiting'); }}
          className="flex flex-col items-center gap-3 p-6 rounded-xl bg-slate-800/80 border border-slate-600/50 hover:border-cyan-500/50 transition-colors w-40"
        >
          <Users className="w-8 h-8 text-cyan-400" />
          <span className="text-sm font-bold text-white">Contra Amigo</span>
          <span className="text-[10px] text-slate-400">Dois jogadores local</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setGameMode('bot')}
          className="flex flex-col items-center gap-3 p-6 rounded-xl bg-slate-800/80 border border-slate-600/50 hover:border-pink-500/50 transition-colors w-40"
        >
          <Cpu className="w-8 h-8 text-pink-400" />
          <span className="text-sm font-bold text-white">Contra IA</span>
          <span className="text-[10px] text-slate-400">Joga contra o bot</span>
        </motion.button>
      </div>
      <AnimatePresence>
        {gameMode === 'bot' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <p className="text-xs text-slate-400">Dificuldade:</p>
            <div className="flex gap-2">
              {(['facil', 'medio', 'dificil'] as DifficultyLevel[]).map(d => (
                <motion.button
                  key={d}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { setDifficulty(d); setGameState('waiting'); }}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all w-28 bg-gradient-to-b',
                    DIFF_COLORS[d],
                    difficulty === d ? 'ring-2 ring-white/30' : 'opacity-70'
                  )}
                >
                  <span className="text-sm font-bold text-white">{DIFF_LABEL[d]}</span>
                  <span className="text-[9px] text-slate-300">{DIFF_DESC[d]}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[520px] mx-auto select-none">
      <div className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-xl p-3 w-full">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <span className="text-xs text-cyan-300 font-semibold tracking-wide uppercase">
              Jogador 1
            </span>
            <motion.div key={length1} initial={{ scale: 1.4, color: '#22d3ee' }} animate={{ scale: 1, color: '#94a3b8' }} transition={{ duration: 0.3 }} className="text-xl font-bold">
              {length1}
            </motion.div>
            <motion.span key={`cum1-${score1}`} initial={{ scale: flashScore === 1 ? 1.5 : 1 }} animate={{ scale: 1 }} className="text-[10px] text-slate-400">
              Total: {score1}
            </motion.span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px] bg-amber-500/5">
              <Coins className="w-3 h-3 mr-1" /> Round {round}
            </Badge>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] text-slate-500">Velocidade:</span>
              <div className="flex gap-1">
                {(Object.keys(SPEED_MAP) as SpeedLevel[]).map((s) => (
                  <button key={s} onClick={() => gameState === 'waiting' && setSpeed(s)} disabled={gameState !== 'waiting'} className={cn('text-[10px] px-1.5 py-0.5 rounded transition-colors', speed === s ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300')}>
                    {speedLabel[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <span className="text-xs text-pink-300 font-semibold tracking-wide uppercase">
              {p2Label}
            </span>
            <motion.div key={length2} initial={{ scale: 1.4, color: '#f472b6' }} animate={{ scale: 1, color: '#94a3b8' }} transition={{ duration: 0.3 }} className="text-xl font-bold">
              {length2}
            </motion.div>
            <motion.span key={`cum2-${score2}`} initial={{ scale: flashScore === 2 ? 1.5 : 1 }} animate={{ scale: 1 }} className="text-[10px] text-slate-400">
              Total: {score2}
            </motion.span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="relative w-full rounded-xl overflow-hidden border border-slate-700/50 shadow-lg shadow-black/30">
        <canvas ref={canvasRef} width={canvasSize} height={canvasSize} className="w-full h-auto block" style={{ aspectRatio: '1/1' }} />

        <AnimatePresence>
          {gameState === 'modeSelect' && modeSelectScreen}

          {gameState === 'waiting' && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-1">Cobra Batalha</h2>
                <p className="text-sm text-slate-400">Jogador 1: W A S D</p>
                {gameMode === 'local' && <p className="text-sm text-slate-400">Jogador 2: Arrow Keys</p>}
                {gameMode === 'bot' && <p className="text-sm text-pink-400">IA: {DIFF_LABEL[difficulty]}</p>}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setGameState('modeSelect')} className="border-slate-600 text-slate-300 hover:bg-slate-800">
                  Voltar
                </Button>
                <Button onClick={startGame} className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-semibold px-6">
                  Iniciar Jogo
                </Button>
              </div>
            </motion.div>
          )}

          {gameState === 'gameOver' && winner && (
            <motion.div key="gameover" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.4, type: 'spring' }} className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="text-center">
                <motion.h2 className={cn('text-3xl font-extrabold mb-1', winner === 'Jogador 1' ? 'text-cyan-400' : winner === 'IA Bot' || winner === 'Jogador 2' ? 'text-pink-400' : 'text-amber-400')} animate={{ scale: [1, 1.1, 1], rotate: winner === 'empate' ? [0, 5, -5, 0] : 0 }} transition={{ duration: 0.6, repeat: winner === 'empate' ? 2 : 1, repeatDelay: 0.3 }}>
                  {winner === 'empate' ? 'Empate!' : `${winner} Venceu!`}
                </motion.h2>
                <p className="text-sm text-slate-400">Round {round}</p>
              </motion.div>
              <div className="flex gap-3">
                <Button onClick={nextRound} className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-semibold">Proximo Round</Button>
                <Button onClick={resetAll} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                  <RotateCcw className="w-4 h-4 mr-1" /> Reiniciar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={cn('flex gap-6 w-full', gameMode === 'bot' && 'justify-center')}>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-cyan-400 font-medium">P1</span>
          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-[120px] h-[120px]">
            <div />
            <button onTouchStart={() => setDirection(1, 'up')} onMouseDown={() => setDirection(1, 'up')} className="bg-slate-800 border border-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400 active:bg-cyan-900/40 transition-colors text-lg font-bold">W</button>
            <div />
            <button onTouchStart={() => setDirection(1, 'left')} onMouseDown={() => setDirection(1, 'left')} className="bg-slate-800 border border-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400 active:bg-cyan-900/40 transition-colors text-lg font-bold">A</button>
            <button onTouchStart={() => setDirection(1, 'down')} onMouseDown={() => setDirection(1, 'down')} className="bg-slate-800 border border-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400 active:bg-cyan-900/40 transition-colors text-lg font-bold">S</button>
            <button onTouchStart={() => setDirection(1, 'right')} onMouseDown={() => setDirection(1, 'right')} className="bg-slate-800 border border-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400 active:bg-cyan-900/40 transition-colors text-lg font-bold">D</button>
          </div>
        </div>

        {gameMode === 'local' && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-pink-400 font-medium">P2</span>
            <div className="grid grid-cols-3 grid-rows-3 gap-1 w-[120px] h-[120px]">
              <div />
              <button onTouchStart={() => setDirection(2, 'up')} onMouseDown={() => setDirection(2, 'up')} className="bg-slate-800 border border-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 active:bg-pink-900/40 transition-colors text-lg font-bold">↑</button>
              <div />
              <button onTouchStart={() => setDirection(2, 'left')} onMouseDown={() => setDirection(2, 'left')} className="bg-slate-800 border border-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 active:bg-pink-900/40 transition-colors text-lg font-bold">←</button>
              <button onTouchStart={() => setDirection(2, 'down')} onMouseDown={() => setDirection(2, 'down')} className="bg-slate-800 border border-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 active:bg-pink-900/40 transition-colors text-lg font-bold">↓</button>
              <button onTouchStart={() => setDirection(2, 'right')} onMouseDown={() => setDirection(2, 'right')} className="bg-slate-800 border border-pink-500/20 rounded-lg flex items-center justify-center text-pink-400 active:bg-pink-900/40 transition-colors text-lg font-bold">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
