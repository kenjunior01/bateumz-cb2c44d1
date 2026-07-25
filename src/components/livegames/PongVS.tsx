import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Trophy, User, Bot } from "lucide-react";
import confetti from "canvas-confetti";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GamePhase = "idle" | "countdown" | "playing" | "paused" | "done";
type GameMode = "bot" | "vs";

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

const PongVS = ({ onScore, liveCode }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [mode, setMode] = useState<GameMode>("bot");
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState("");
  const [p1Name, setP1Name] = useState("Jogador 1");
  const [p2Name, setP2Name] = useState("Jogador 2");

  const ballRef = useRef<Ball>({ x: CANVAS_W / 2, y: CANVAS_H / 2, vx: BALL_SPEED_INIT, vy: 0, speed: BALL_SPEED_INIT });
  const p1Ref = useRef<Paddle>({ x: 20, y: CANVAS_H / 2 - PADDLE_H / 2, score: 0 });
  const p2Ref = useRef<Paddle>({ x: CANVAS_W - 20 - PADDLE_W, y: CANVAS_H / 2 - PADDLE_H / 2, score: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const phaseRef = useRef<GamePhase>("idle");
  const modeRef = useRef<GameMode>("bot");

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const resetBall = useCallback((direction: 1 | -1) => {
    const b = ballRef.current;
    b.x = CANVAS_W / 2;
    b.y = CANVAS_H / 2;
    b.speed = BALL_SPEED_INIT;
    const angle = (Math.random() * Math.PI / 3) - Math.PI / 6;
    b.vx = Math.cos(angle) * b.speed * direction;
    b.vy = Math.sin(angle) * b.speed;
  }, []);

  const botAI = useCallback(() => {
    const p = p2Ref.current;
    const b = ballRef.current;
    const center = p.y + PADDLE_H / 2;
    const diff = b.y - center;
    const botSpeed = PADDLE_SPEED * 0.7;
    if (Math.abs(diff) > 15) {
      p.y += diff > 0 ? botSpeed : -botSpeed;
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

    // Player 1 controls: W/S or ArrowUp/ArrowDown
    if (keys.has("w") || keys.has("W") || keys.has("ArrowUp")) p1.y -= PADDLE_SPEED;
    if (keys.has("s") || keys.has("S") || keys.has("ArrowDown")) p1.y += PADDLE_SPEED;
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
    if (b.y - BALL_R <= 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); }
    if (b.y + BALL_R >= CANVAS_H) { b.y = CANVAS_H - BALL_R; b.vy = -Math.abs(b.vy); }

    // Paddle 1 collision (left)
    if (b.vx < 0 && b.x - BALL_R <= p1.x + PADDLE_W && b.x - BALL_R >= p1.x && b.y >= p1.y && b.y <= p1.y + PADDLE_H) {
      b.x = p1.x + PADDLE_W + BALL_R;
      const relY = (b.y - (p1.y + PADDLE_H / 2)) / (PADDLE_H / 2);
      const angle = relY * (Math.PI / 3);
      b.speed = Math.min(b.speed + BALL_SPEED_INC, 10);
      b.vx = Math.cos(angle) * b.speed;
      b.vy = Math.sin(angle) * b.speed;
    }

    // Paddle 2 collision (right)
    if (b.vx > 0 && b.x + BALL_R >= p2.x && b.x + BALL_R <= p2.x + PADDLE_W && b.y >= p2.y && b.y <= p2.y + PADDLE_H) {
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
        const w = modeRef.current === "bot" ? "Adversário" : p2Name;
        setWinner(w);
        setPhase("done");
        onScore?.(w, p2.score);
        confetti({ particleCount: 100, spread: 70, origin: { x: 0.7, y: 0.5 } });
      } else {
        resetBall(1);
      }
    }
    if (b.x > CANVAS_W + BALL_R * 2) {
      p1.score++;
      setP1Score(p1.score);
      if (p1.score >= WIN_SCORE) {
        setWinner(p1Name);
        setPhase("done");
        onScore?.(p1Name, p1.score);
        confetti({ particleCount: 100, spread: 70, origin: { x: 0.3, y: 0.5 } });
      } else {
        resetBall(-1);
      }
    }
  }, [botAI, onScore, p1Name, p2Name, resetBall]);

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
      // Prevent scrolling with arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Game loop
  useEffect(() => {
    if (phase === "playing") {
      rafRef.current = requestAnimationFrame(gameLoop);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
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
    p1Ref.current = { x: 20, y: CANVAS_H / 2 - PADDLE_H / 2, score: 0 };
    p2Ref.current = { x: CANVAS_W - 20 - PADDLE_W, y: CANVAS_H / 2 - PADDLE_H / 2, score: 0 };
    resetBall(Math.random() > 0.5 ? 1 : -1);
    setP1Score(0);
    setP2Score(0);
    setWinner("");
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
      {/* Mode selector */}
      {phase === "idle" && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col gap-3">
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setMode("bot")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${mode === "bot" ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border hover:border-primary/40"}`}
            >
              <Bot className="h-4 w-4" /> vs Bot
            </button>
            <button
              onClick={() => setMode("vs")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${mode === "vs" ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border hover:border-primary/40"}`}
            >
              <User className="h-4 w-4" /> 2 Jogadores
            </button>
          </div>

          {mode === "vs" && (
            <div className="grid grid-cols-2 gap-2 w-full">
              <input
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                placeholder="Jogador 1"
                className="px-3 py-2 rounded-xl bg-card border border-border text-sm text-center"
              />
              <input
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                placeholder="Jogador 2"
                className="px-3 py-2 rounded-xl bg-card border border-border text-sm text-center"
              />
            </div>
          )}

          <button
            onClick={startGame}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:shadow-xl transition-shadow"
          >
            <Play className="h-4 w-4 fill-current" /> Começar Jogo
          </button>

          <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Controles</p>
            <p className="text-xs text-muted-foreground">{mode === "vs" ? "Jogador 1: W/S | Jogador 2: Arrow Up/Down" : "W/S ou Arrow Up/Down para mover"}</p>
            <p className="text-xs text-muted-foreground mt-1">Primeiro a {WIN_SCORE} pontos vence!</p>
          </div>
        </motion.div>
      )}

      {/* Score bar */}
      {phase !== "idle" && (
        <div className="w-full flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <span className="text-xs font-bold text-muted-foreground">{p1Name}</span>
            <span className="font-display text-xl font-bold text-foreground">{p1Score}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">vs</span>
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-foreground">{p2Score}</span>
            <span className="text-xs font-bold text-muted-foreground">{mode === "bot" ? "Bot" : p2Name}</span>
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-red-500" />
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="relative w-full" style={{ maxWidth: CANVAS_W }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full rounded-2xl border-2 border-border shadow-xl"
          tabIndex={0}
        />

        {/* Countdown overlay */}
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

        {/* Winner overlay */}
        <AnimatePresence>
          {phase === "done" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-2xl gap-3"
            >
              <Trophy className="h-10 w-10 text-yellow-400" />
              <p className="font-display text-2xl font-bold text-white">{winner} venceu!</p>
              <p className="text-sm text-white/70">{p1Score} - {p2Score}</p>
              <button
                onClick={startGame}
                className="mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
              >
                <RotateCcw className="h-4 w-4" /> Jogar Novamente
              </button>
              <button
                onClick={() => setPhase("idle")}
                className="px-4 py-2 rounded-full bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 transition"
              >
                Voltar ao Menu
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls hint during play */}
      {phase === "playing" && (
        <p className="text-[10px] text-muted-foreground text-center">
          {mode === "vs" ? "P1: W/S | P2: Arrow Up/Down" : "W/S ou Arrow Up/Down"} | Clique no canvas para focar
        </p>
      )}
    </div>
  );
};

export default PongVS;
