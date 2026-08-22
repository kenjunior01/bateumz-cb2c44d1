import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  RotateCcw,
  Trophy,
  Users,
  Bot,
  Swords,
  Cpu,
  Gauge,
  ChevronRight,
} from "lucide-react";
import confetti from "canvas-confetti";

interface PongVSProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GamePhase = "idle" | "countdown" | "playing" | "paused" | "done";
type GameMode = "bot" | "vs";
type BotDifficulty = "facil" | "medio" | "dificil";

const CANVAS_W = 600;
const CANVAS_H = 400;
const PADDLE_W = 12;
const PADDLE_H = 80;
const BALL_R = 8;
const WIN_SCORE = 5;
const PADDLE_SPEED = 5;
const BALL_SPEED_INIT = 4;
const BALL_SPEED_INC = 0.3;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
}

interface Paddle {
  x: number;
  y: number;
  score: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

interface BotConfig {
  speed: number;
  reactionMs: number;
  noisePx: number;
  missChance: number;
  predictAhead: boolean;
  deadzonePx: number;
  label: string;
}

const BOT_CONFIGS: Record<BotDifficulty, BotConfig> = {
  facil: {
    speed: 0.35,
    reactionMs: 200,
    noisePx: 45,
    missChance: 0.22,
    predictAhead: false,
    deadzonePx: 28,
    label: "Fácil",
  },
  medio: {
    speed: 0.65,
    reactionMs: 80,
    noisePx: 18,
    missChance: 0.08,
    predictAhead: true,
    deadzonePx: 14,
    label: "Médio",
  },
  dificil: {
    speed: 0.92,
    reactionMs: 20,
    noisePx: 4,
    missChance: 0.02,
    predictAhead: true,
    deadzonePx: 6,
    label: "Difícil",
  },
};

const DIFFICULTY_STYLES: Record<
  BotDifficulty,
  { bg: string; border: string; icon: string; desc: string }
> = {
  facil: {
    bg: "from-emerald-500/20 to-emerald-600/10",
    border: "border-emerald-500/50",
    icon: "text-emerald-400",
    desc: "Lento, comete erros frequentemente",
  },
  medio: {
    bg: "from-amber-500/20 to-amber-600/10",
    border: "border-amber-500/50",
    icon: "text-amber-400",
    desc: "Reage bem, comete alguns erros",
  },
  dificil: {
    bg: "from-red-500/20 to-red-600/10",
    border: "border-red-500/50",
    icon: "text-red-400",
    desc: "Quase perfeito, raramente erra",
  },
};

/** Predict where the ball will be when it reaches targetX */
function predictBallY(ball: Ball, targetX: number): number {
  if (
    (targetX > ball.x && ball.vx <= 0) ||
    (targetX < ball.x && ball.vx >= 0)
  ) {
    return ball.y;
  }

  let x = ball.x;
  let y = ball.y;
  let vy = ball.vy;
  const step = Math.abs(ball.vx) || 1;
  const dir = ball.vx > 0 ? 1 : -1;

  for (let i = 0; i < 2000; i++) {
    x += dir * step;
    y += vy;

    if (y <= BALL_R) {
      y = BALL_R;
      vy = Math.abs(vy);
    }
    if (y >= CANVAS_H - BALL_R) {
      y = CANVAS_H - BALL_R;
      vy = -Math.abs(vy);
    }

    if ((dir > 0 && x >= targetX) || (dir < 0 && x <= targetX)) {
      return y;
    }
  }

  return ball.y;
}

const TRAIL_MAX = 18;

const PongVS = ({ onScore, liveCode }: PongVSProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [mode, setMode] = useState<GameMode>("bot");
  const [difficulty, setDifficulty] = useState<BotDifficulty>("medio");
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState("");
  const [p1Name, setP1Name] = useState("Jogador 1");
  const [p2Name, setP2Name] = useState("Jogador 2");
  const [shakeX, setShakeX] = useState(0);
  const [shakeY, setShakeY] = useState(0);
  const [scorePopP1, setScorePopP1] = useState(false);
  const [scorePopP2, setScorePopP2] = useState(false);

  const ballRef = useRef<Ball>({
    x: CANVAS_W / 2,
    y: CANVAS_H / 2,
    vx: BALL_SPEED_INIT,
    vy: 0,
    speed: BALL_SPEED_INIT,
  });
  const p1Ref = useRef<Paddle>({
    x: 20,
    y: CANVAS_H / 2 - PADDLE_H / 2,
    score: 0,
  });
  const p2Ref = useRef<Paddle>({
    x: CANVAS_W - 20 - PADDLE_W,
    y: CANVAS_H / 2 - PADDLE_H / 2,
    score: 0,
  });
  const keysRef = useRef<Set<string>>(new Set());
  const phaseRef = useRef<GamePhase>("idle");
  const modeRef = useRef<GameMode>("bot");
  const difficultyRef = useRef<BotDifficulty>("medio");
  const onScoreRef = useRef(onScore);
  const p1NameRef = useRef(p1Name);
  const p2NameRef = useRef(p2Name);

  // Bot AI refs
  const botTargetRef = useRef<number>(CANVAS_H / 2);
  const botLastUpdateRef = useRef<number>(0);
  const botMovingRef = useRef<boolean>(true);

  // Visual effect refs
  const trailRef = useRef<TrailPoint[]>([]);
  const p1FlashRef = useRef<number>(0);
  const p2FlashRef = useRef<number>(0);
  const shakeFramesRef = useRef<number>(0);
  const shakeActiveRef = useRef<boolean>(false);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { onScoreRef.current = onScore; }, [onScore]);
  useEffect(() => { p1NameRef.current = p1Name; }, [p1Name]);
  useEffect(() => { p2NameRef.current = p2Name; }, [p2Name]);

  const resetBall = useCallback((direction: 1 | -1) => {
    const b = ballRef.current;
    b.x = CANVAS_W / 2;
    b.y = CANVAS_H / 2;
    b.speed = BALL_SPEED_INIT;
    const angle = Math.random() * (Math.PI / 3) - Math.PI / 6;
    b.vx = Math.cos(angle) * b.speed * direction;
    b.vy = Math.sin(angle) * b.speed;
    trailRef.current = [];
  }, []);

  const botAI = useCallback(() => {
    const p = p2Ref.current;
    const b = ballRef.current;
    const cfg = BOT_CONFIGS[difficultyRef.current];
    const now = performance.now();

    // Only recalculate target at reaction interval
    if (now - botLastUpdateRef.current >= cfg.reactionMs) {
      botLastUpdateRef.current = now;

      // Decide whether to "miss" this update cycle
      const shouldMiss = Math.random() < cfg.missChance;
      if (shouldMiss) {
        botMovingRef.current = false;
        return;
      }
      botMovingRef.current = true;

      // Calculate target y position
      let targetY: number;
      if (cfg.predictAhead) {
        targetY = predictBallY(b, p.x);
      } else {
        // Only track when ball is heading toward the bot
        if (b.vx > 0) {
          targetY = b.y;
        } else {
          // Ball going away, drift toward center slowly
          targetY = CANVAS_H / 2;
        }
      }

      // Add noise
      const noise = (Math.random() - 0.5) * 2 * cfg.noisePx;
      botTargetRef.current = Math.max(
        PADDLE_H / 2,
        Math.min(CANVAS_H - PADDLE_H / 2, targetY + noise)
      );
    }

    // Move paddle toward target
    if (!botMovingRef.current) return;

    const center = p.y + PADDLE_H / 2;
    const diff = botTargetRef.current - center;

    if (Math.abs(diff) > cfg.deadzonePx) {
      const moveAmount = Math.min(
        Math.abs(diff),
        cfg.speed * PADDLE_SPEED
      );
      p.y += diff > 0 ? moveAmount : -moveAmount;
    }

    p.y = Math.max(0, Math.min(CANVAS_H - PADDLE_H, p.y));
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const b = ballRef.current;
    const p1 = p1Ref.current;
    const p2 = p2Ref.current;
    const trail = trailRef.current;
    const p1Flash = p1FlashRef.current;
    const p2Flash = p2FlashRef.current;

    // -- Background: dark gradient with subtle radial glow at center --
    const bgGrad = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, 0,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.7
    );
    bgGrad.addColorStop(0, "#111833");
    bgGrad.addColorStop(1, "#070b1a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // -- Grid pattern --
    ctx.strokeStyle = "rgba(100, 140, 255, 0.04)";
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let gx = gridSize; gx < CANVAS_W; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, CANVAS_H);
      ctx.stroke();
    }
    for (let gy = gridSize; gy < CANVAS_H; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(CANVAS_W, gy);
      ctx.stroke();
    }

    // -- Center line with glow --
    // Outer glow pass
    ctx.save();
    ctx.shadowColor = "rgba(100, 160, 255, 0.5)";
    ctx.shadowBlur = 16;
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "rgba(100, 160, 255, 0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2, 0);
    ctx.lineTo(CANVAS_W / 2, CANVAS_H);
    ctx.stroke();
    ctx.restore();
    // Inner bright pass
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "rgba(140, 180, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2, 0);
    ctx.lineTo(CANVAS_W / 2, CANVAS_H);
    ctx.stroke();
    ctx.setLineDash([]);

    // -- Center circle with glow --
    ctx.save();
    ctx.shadowColor = "rgba(100, 160, 255, 0.35)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(CANVAS_W / 2, CANVAS_H / 2, 45, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(100, 160, 255, 0.1)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // -- Ball trail --
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      const ratio = 1 - i / trail.length;
      const alpha = ratio * 0.45;
      const r = Math.max(1, BALL_R * ratio * 0.8);
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 200, 255, ${alpha})`;
      ctx.fill();
    }
    // Trail connecting line (subtle)
    if (trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      for (let i = 0; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.strokeStyle = "rgba(160, 190, 255, 0.08)";
      ctx.lineWidth = BALL_R * 1.2;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // -- Ball: multi-layer glow --
    // Outer glow
    ctx.save();
    const ballSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    const glowIntensity = Math.min(1, ballSpeed / 8);
    ctx.shadowColor = `rgba(150, 180, 255, ${0.6 + glowIntensity * 0.4})`;
    ctx.shadowBlur = 20 + glowIntensity * 15;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R + 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180, 200, 255, ${0.15 + glowIntensity * 0.15})`;
    ctx.fill();
    ctx.restore();
    // Core
    ctx.save();
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 12;
    const ballGrad = ctx.createRadialGradient(
      b.x - 2, b.y - 2, 0,
      b.x, b.y, BALL_R
    );
    ballGrad.addColorStop(0, "#ffffff");
    ballGrad.addColorStop(0.7, "#c8d8ff");
    ballGrad.addColorStop(1, "#8098cc");
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // -- Paddles with flash effect --
    // Paddle 1
    ctx.save();
    if (p1Flash > 0) {
      const flashAlpha = p1Flash / 12;
      ctx.shadowColor = `rgba(100, 160, 255, ${flashAlpha})`;
      ctx.shadowBlur = 25 * flashAlpha;
      const flashGrad = ctx.createLinearGradient(p1.x, p1.y, p1.x + PADDLE_W, p1.y);
      flashGrad.addColorStop(0, `rgba(200, 220, 255, ${flashAlpha * 0.9})`);
      flashGrad.addColorStop(1, `rgba(180, 200, 255, ${flashAlpha * 0.9})`);
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.roundRect(p1.x - 3, p1.y - 3, PADDLE_W + 6, PADDLE_H + 6, 9);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    const grad1 = ctx.createLinearGradient(p1.x, p1.y, p1.x + PADDLE_W, p1.y);
    grad1.addColorStop(0, "#3b82f6");
    grad1.addColorStop(1, "#6366f1");
    ctx.fillStyle = grad1;
    ctx.beginPath();
    ctx.roundRect(p1.x, p1.y, PADDLE_W, PADDLE_H, 6);
    ctx.fill();
    ctx.restore();

    // Paddle 2
    ctx.save();
    if (p2Flash > 0) {
      const flashAlpha = p2Flash / 12;
      ctx.shadowColor = `rgba(255, 160, 60, ${flashAlpha})`;
      ctx.shadowBlur = 25 * flashAlpha;
      const flashGrad = ctx.createLinearGradient(p2.x, p2.y, p2.x + PADDLE_W, p2.y);
      flashGrad.addColorStop(0, `rgba(255, 220, 180, ${flashAlpha * 0.9})`);
      flashGrad.addColorStop(1, `rgba(255, 200, 160, ${flashAlpha * 0.9})`);
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.roundRect(p2.x - 3, p2.y - 3, PADDLE_W + 6, PADDLE_H + 6, 9);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    const grad2 = ctx.createLinearGradient(p2.x, p2.y, p2.x + PADDLE_W, p2.y);
    grad2.addColorStop(0, "#f59e0b");
    grad2.addColorStop(1, "#ef4444");
    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.roundRect(p2.x, p2.y, PADDLE_W, PADDLE_H, 6);
    ctx.fill();
    ctx.restore();

    // -- Scores with glow --
    ctx.save();
    ctx.font = "bold 48px monospace";
    ctx.textAlign = "center";
    // P1 score glow
    ctx.shadowColor = "rgba(59, 130, 246, 0.6)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(59, 130, 246, 0.25)";
    ctx.fillText(String(p1.score), CANVAS_W / 4, 60);
    ctx.shadowBlur = 0;
    // P2 score glow
    ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(245, 158, 11, 0.25)";
    ctx.fillText(String(p2.score), (CANVAS_W * 3) / 4, 60);
    ctx.restore();

    // -- Vignette overlay --
    const vigGrad = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.35,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.72
    );
    vigGrad.addColorStop(0, "rgba(0,0,0,0)");
    vigGrad.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }, []);

  const update = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    const b = ballRef.current;
    const p1 = p1Ref.current;
    const p2 = p2Ref.current;
    const keys = keysRef.current;

    // Decay visual effects
    if (p1FlashRef.current > 0) p1FlashRef.current -= 1;
    if (p2FlashRef.current > 0) p2FlashRef.current -= 1;
    if (shakeFramesRef.current > 0) {
      shakeFramesRef.current -= 1;
      const intensity = shakeFramesRef.current * 0.8;
      setShakeX((Math.random() - 0.5) * intensity);
      setShakeY((Math.random() - 0.5) * intensity);
      shakeActiveRef.current = true;
    } else if (shakeActiveRef.current) {
      shakeActiveRef.current = false;
      setShakeX(0);
      setShakeY(0);
    }

    // Player 1 controls: W/S or ArrowUp/ArrowDown (only in bot mode)
    if (modeRef.current === "bot") {
      if (keys.has("w") || keys.has("W") || keys.has("ArrowUp"))
        p1.y -= PADDLE_SPEED;
      if (keys.has("s") || keys.has("S") || keys.has("ArrowDown"))
        p1.y += PADDLE_SPEED;
    } else {
      // VS mode: P1 uses W/S
      if (keys.has("w") || keys.has("W")) p1.y -= PADDLE_SPEED;
      if (keys.has("s") || keys.has("S")) p1.y += PADDLE_SPEED;
    }
    p1.y = Math.max(0, Math.min(CANVAS_H - PADDLE_H, p1.y));

    // Player 2 or bot
    if (modeRef.current === "bot") {
      botAI();
    } else {
      if (keys.has("ArrowUp")) p2.y -= PADDLE_SPEED;
      if (keys.has("ArrowDown")) p2.y += PADDLE_SPEED;
      p2.y = Math.max(0, Math.min(CANVAS_H - PADDLE_H, p2.y));
    }

    // Ball movement
    b.x += b.vx;
    b.y += b.vy;

    // Update trail
    trailRef.current.unshift({ x: b.x, y: b.y, age: 0 });
    if (trailRef.current.length > TRAIL_MAX) {
      trailRef.current.length = TRAIL_MAX;
    }

    // Top/bottom bounce
    if (b.y - BALL_R <= 0) {
      b.y = BALL_R;
      b.vy = Math.abs(b.vy);
    }
    if (b.y + BALL_R >= CANVAS_H) {
      b.y = CANVAS_H - BALL_R;
      b.vy = -Math.abs(b.vy);
    }

    // Paddle 1 collision (left)
    if (
      b.vx < 0 &&
      b.x - BALL_R <= p1.x + PADDLE_W &&
      b.x - BALL_R >= p1.x &&
      b.y >= p1.y &&
      b.y <= p1.y + PADDLE_H
    ) {
      b.x = p1.x + PADDLE_W + BALL_R;
      const relY = (b.y - (p1.y + PADDLE_H / 2)) / (PADDLE_H / 2);
      const angle = relY * (Math.PI / 3);
      b.speed = Math.min(b.speed + BALL_SPEED_INC, 10);
      b.vx = Math.cos(angle) * b.speed;
      b.vy = Math.sin(angle) * b.speed;
      p1FlashRef.current = 12;
    }

    // Paddle 2 collision (right)
    if (
      b.vx > 0 &&
      b.x + BALL_R >= p2.x &&
      b.x + BALL_R <= p2.x + PADDLE_W &&
      b.y >= p2.y &&
      b.y <= p2.y + PADDLE_H
    ) {
      b.x = p2.x - BALL_R;
      const relY = (b.y - (p2.y + PADDLE_H / 2)) / (PADDLE_H / 2);
      const angle = relY * (Math.PI / 3);
      b.speed = Math.min(b.speed + BALL_SPEED_INC, 10);
      b.vx = -Math.cos(angle) * b.speed;
      b.vy = Math.sin(angle) * b.speed;
      p2FlashRef.current = 12;
    }

    // Score detection
    if (b.x < -BALL_R * 2) {
      p2.score++;
      setP2Score(p2.score);
      shakeFramesRef.current = 10;
      setScorePopP2(true);
      setTimeout(() => setScorePopP2(false), 400);
      if (p2.score >= WIN_SCORE) {
        const w = modeRef.current === "bot" ? "Adversário IA" : p2NameRef.current;
        setWinner(w);
        setPhase("done");
        onScoreRef.current?.(w, p2.score);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.7, y: 0.5 },
        });
      } else {
        resetBall(1);
      }
    }
    if (b.x > CANVAS_W + BALL_R * 2) {
      p1.score++;
      setP1Score(p1.score);
      shakeFramesRef.current = 10;
      setScorePopP1(true);
      setTimeout(() => setScorePopP1(false), 400);
      if (p1.score >= WIN_SCORE) {
        const n = p1NameRef.current;
        setWinner(n);
        setPhase("done");
        onScoreRef.current?.(n, p1.score);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.3, y: 0.5 },
        });
      } else {
        resetBall(-1);
      }
    }
  }, [botAI, resetBall]);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    update();
    draw(ctx);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  // Key handlers
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(
          e.key
        )
      )
        e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Game loop
  useEffect(() => {
    if (phase === "playing") {
      rafRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, gameLoop]);

  // Draw idle/paused states
  useEffect(() => {
    if (phase === "idle" || phase === "done") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      draw(ctx);
    }
  }, [phase, draw]);

  const startGame = () => {
    p1Ref.current = {
      x: 20,
      y: CANVAS_H / 2 - PADDLE_H / 2,
      score: 0,
    };
    p2Ref.current = {
      x: CANVAS_W - 20 - PADDLE_W,
      y: CANVAS_H / 2 - PADDLE_H / 2,
      score: 0,
    };
    resetBall(Math.random() > 0.5 ? 1 : -1);
    setP1Score(0);
    setP2Score(0);
    setWinner("");
    // Reset bot state
    botTargetRef.current = CANVAS_H / 2;
    botLastUpdateRef.current = 0;
    botMovingRef.current = true;
    // Reset visual effects
    trailRef.current = [];
    p1FlashRef.current = 0;
    p2FlashRef.current = 0;
    shakeFramesRef.current = 0;
    shakeActiveRef.current = false;
    setShakeX(0);
    setShakeY(0);
    setScorePopP1(false);
    setScorePopP2(false);
    setPhase("countdown");
    setCountdown(3);
  };

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
      {phase === "idle" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full flex flex-col gap-4"
        >
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-lg font-bold text-foreground flex items-center justify-center gap-2"
            >
              <Swords className="h-5 w-5 text-primary" />
              Escolha o Modo de Jogo
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-xs text-muted-foreground mt-1"
            >
              Selecione como deseja jogar
            </motion.p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode("bot")}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                mode === "bot"
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div
                className={`p-3 rounded-xl transition-colors ${
                  mode === "bot" ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <Cpu
                  className={`h-6 w-6 transition-colors ${
                    mode === "bot" ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <span
                className={`text-sm font-bold transition-colors ${
                  mode === "bot" ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                Contra IA
              </span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Jogue contra o computador
              </span>
              {mode === "bot" && (
                <motion.div
                  layoutId="mode-indicator"
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <ChevronRight className="h-3 w-3 text-primary-foreground" />
                </motion.div>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode("vs")}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                mode === "vs"
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div
                className={`p-3 rounded-xl transition-colors ${
                  mode === "vs" ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <Users
                  className={`h-6 w-6 transition-colors ${
                    mode === "vs" ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <span
                className={`text-sm font-bold transition-colors ${
                  mode === "vs" ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                Contra Amigo
              </span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Dois jogadores no mesmo dispositivo
              </span>
              {mode === "vs" && (
                <motion.div
                  layoutId="mode-indicator"
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <ChevronRight className="h-3 w-3 text-primary-foreground" />
                </motion.div>
              )}
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {mode === "bot" && (
              <motion.div
                key="difficulty-panel"
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Dificuldade
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["facil", "medio", "dificil"] as BotDifficulty[]).map(
                    (d) => {
                      const style = DIFFICULTY_STYLES[d];
                      const cfg = BOT_CONFIGS[d];
                      return (
                        <motion.button
                          key={d}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setDifficulty(d)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                            difficulty === d
                              ? `border-current bg-gradient-to-br ${style.bg} shadow-md`
                              : "border-border bg-card hover:border-border/80"
                          }`}
                        >
                          <span
                            className={`text-sm font-bold ${
                              difficulty === d
                                ? style.icon
                                : "text-muted-foreground"
                            }`}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-[9px] text-muted-foreground text-center leading-tight">
                            {style.desc}
                          </span>
                        </motion.button>
                      );
                    }
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-2 w-full"
          >
            <input
              value={p1Name}
              onChange={(e) => setP1Name(e.target.value)}
              placeholder="Jogador 1"
              className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-center focus:border-primary/50 focus:outline-none transition-colors"
            />
            {mode === "vs" ? (
              <input
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                placeholder="Jogador 2"
                className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-center focus:border-primary/50 focus:outline-none transition-colors"
              />
            ) : (
              <div className="px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-center text-muted-foreground flex items-center justify-center gap-1.5">
                <Bot className="h-3.5 w-3.5" />
                <span>
                  IA — {BOT_CONFIGS[difficulty].label}
                </span>
              </div>
            )}
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={startGame}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:shadow-xl transition-shadow cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" /> Começar Jogo
          </motion.button>

          <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
              Controles
            </p>
            <p className="text-xs text-muted-foreground">
              {mode === "vs"
                ? "Jogador 1: W/S  •  Jogador 2: ↑/↓"
                : "W/S ou ↑/↓ para mover a raquete"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Primeiro a {WIN_SCORE} pontos vence!
            </p>
          </div>
        </motion.div>
      )}

      {phase !== "idle" && (
        <div className="w-full flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <span className="text-xs font-bold text-muted-foreground">
              {p1Name}
            </span>
            <motion.span
              key={p1Score}
              initial={scorePopP1 ? { scale: 1.8, color: "#60a5fa" } : false}
              animate={{ scale: 1, color: "inherit" }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="font-display text-xl font-bold text-foreground inline-block"
            >
              {p1Score}
            </motion.span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            vs
          </span>
          <div className="flex items-center gap-2">
            <motion.span
              key={p2Score}
              initial={scorePopP2 ? { scale: 1.8, color: "#fbbf24" } : false}
              animate={{ scale: 1, color: "inherit" }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="font-display text-xl font-bold text-foreground inline-block"
            >
              {p2Score}
            </motion.span>
            <span className="text-xs font-bold text-muted-foreground">
              {mode === "bot" ? `IA (${BOT_CONFIGS[difficulty].label})` : p2Name}
            </span>
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-red-500" />
          </div>
        </div>
      )}

      <div
        className="relative w-full"
        style={{
          maxWidth: CANVAS_W,
          transform: `translate(${shakeX}px, ${shakeY}px)`,
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full rounded-2xl border-2 border-blue-500/20 shadow-xl shadow-blue-500/5"
          tabIndex={0}
        />

        <AnimatePresence>
          {phase === "countdown" && (
            <motion.div
              key={countdown}
              initial={{ scale: 2.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl backdrop-blur-sm"
            >
              <span className="font-display text-7xl font-bold text-white drop-shadow-[0_0_20px_rgba(100,160,255,0.6)]">
                {countdown > 0 ? countdown : "GO!"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "done" && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(6px)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-2xl gap-4"
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                className="relative"
              >
                <div className="absolute inset-0 blur-xl bg-yellow-400/40 rounded-full" />
                <Trophy className="h-14 w-14 text-yellow-400 relative drop-shadow-[0_0_16px_rgba(250,204,21,0.5)]" />
              </motion.div>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="font-display text-2xl font-bold text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
              >
                {winner} venceu!
              </motion.p>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 20 }}
                className="flex items-center gap-3 text-lg font-bold"
              >
                <span className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">{p1Score}</span>
                <span className="text-white/40 text-sm">-</span>
                <span className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">{p2Score}</span>
              </motion.div>
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.35 }}
                className="flex flex-col items-center gap-2 mt-1"
              >
                <button
                  onClick={startGame}
                  className="px-7 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" /> Jogar Novamente
                </button>
                <button
                  onClick={() => setPhase("idle")}
                  className="px-4 py-2 rounded-full bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 transition cursor-pointer"
                >
                  Voltar ao Menu
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === "playing" && (
        <p className="text-[10px] text-muted-foreground text-center">
          {mode === "vs"
            ? "P1: W/S  •  P2: ↑/↓"
            : "W/S ou ↑/↓ para mover"}{" "}
          | Clique no canvas para focar
        </p>
      )}
    </div>
  );
};

export default PongVS;
