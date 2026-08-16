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

    // Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Center line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2, 0);
    ctx.lineTo(CANVAS_W / 2, CANVAS_H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.beginPath();
    ctx.arc(CANVAS_W / 2, CANVAS_H / 2, 40, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Paddles
    const grad1 = ctx.createLinearGradient(p1.x, p1.y, p1.x + PADDLE_W, p1.y);
    grad1.addColorStop(0, "#3b82f6");
    grad1.addColorStop(1, "#6366f1");
    ctx.fillStyle = grad1;
    ctx.beginPath();
    ctx.roundRect(p1.x, p1.y, PADDLE_W, PADDLE_H, 6);
    ctx.fill();

    const grad2 = ctx.createLinearGradient(p2.x, p2.y, p2.x + PADDLE_W, p2.y);
    grad2.addColorStop(0, "#f59e0b");
    grad2.addColorStop(1, "#ef4444");
    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.roundRect(p2.x, p2.y, PADDLE_W, PADDLE_H, 6);
    ctx.fill();

    // Ball glow
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Scores
    ctx.font = "bold 48px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(59,130,246,0.3)";
    ctx.fillText(String(p1.score), CANVAS_W / 4, 60);
    ctx.fillStyle = "rgba(245,158,11,0.3)";
    ctx.fillText(String(p2.score), (CANVAS_W * 3) / 4, 60);
  }, []);

  const update = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    const b = ballRef.current;
    const p1 = p1Ref.current;
    const p2 = p2Ref.current;
    const keys = keysRef.current;

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
    }

    // Score detection
    if (b.x < -BALL_R * 2) {
      p2.score++;
      setP2Score(p2.score);
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
            <span className="font-display text-xl font-bold text-foreground">
              {p1Score}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            vs
          </span>
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-foreground">
              {p2Score}
            </span>
            <span className="text-xs font-bold text-muted-foreground">
              {mode === "bot" ? `IA (${BOT_CONFIGS[difficulty].label})` : p2Name}
            </span>
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-red-500" />
          </div>
        </div>
      )}

      <div className="relative w-full" style={{ maxWidth: CANVAS_W }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full rounded-2xl border-2 border-border shadow-xl"
          tabIndex={0}
        />

        <AnimatePresence>
          {phase === "countdown" && (
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl"
            >
              <span className="font-display text-7xl font-bold text-white">
                {countdown > 0 ? countdown : "GO!"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "done" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-2xl gap-3"
            >
              <Trophy className="h-10 w-10 text-yellow-400" />
              <p className="font-display text-2xl font-bold text-white">
                {winner} venceu!
              </p>
              <p className="text-sm text-white/70">
                {p1Score} - {p2Score}
              </p>
              <button
                onClick={startGame}
                className="mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
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
