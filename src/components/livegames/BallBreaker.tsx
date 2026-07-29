import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Trophy, Heart, Zap, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ──────────────────────── interface ──────────────────────── */

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

/* ──────────────────────── constants ──────────────────────── */

const CW = 700;
const CH = 450;
const HALF = CW / 2; // 350
const PADDLE_H = 10;
const PADDLE_BASE_W = 60;
const PADDLE_WIDE_W = 95;
const BALL_R = 5;
const BALL_BASE_SPEED = 4;
const BALL_SLOW_SPEED = 2.5;
const BRICK_ROWS = 5;
const BRICK_COLS = 7;
const BRICK_H = 14;
const BRICK_PAD = 3;
const BRICK_TOP = 35;

const ROW_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4"];
const ROW_POINTS = [50, 40, 30, 20, 10];
const ROW_NAMES = ["Vermelho", "Laranja", "Amarelo", "Verde", "Ciano"];

const P1_COLOR = "#06b6d4"; // cyan
const P2_COLOR = "#ec4899"; // pink
const P1_NAME = "Jogador 1";
const P2_NAME = "Jogador 2";

type PowerUpType = "wide" | "multi" | "slow";
const PU_COLORS: Record<PowerUpType, string> = {
  wide: "#22c55e",
  multi: "#3b82f6",
  slow: "#eab308",
};

/* ──────────────────────── types ──────────────────────── */

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  points: number;
  alive: boolean;
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

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  color: string;
  vy: number;
}

interface PlayerField {
  score: number;
  lives: number;
  paddleX: number;
  paddleW: number;
  balls: Ball[];
  bricks: Brick[];
  particles: Particle[];
  powerUps: PowerUp[];
  wideTimer: number;
  slowTimer: number;
  launched: boolean;
  gameOver: boolean;
  won: boolean;
}

/* ──────────────────────── helpers ──────────────────────── */

function makeBricks(offsetX: number): Brick[] {
  const bricks: Brick[] = [];
  const usable = HALF - 12;
  const brickW = (usable - BRICK_PAD * (BRICK_COLS - 1)) / BRICK_COLS;
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: offsetX + 6 + c * (brickW + BRICK_PAD),
        y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
        w: brickW,
        h: BRICK_H,
        color: ROW_COLORS[r],
        points: ROW_POINTS[r],
        alive: true,
      });
    }
  }
  return bricks;
}

function makeBall(px: number, offset: number): Ball {
  return {
    x: px,
    y: CH - 30 - PADDLE_H - BALL_R - 2,
    vx: 0,
    vy: 0,
    trail: [],
  };
}

function initField(offset: number): PlayerField {
  const paddleX = offset + HALF / 2 - PADDLE_BASE_W / 2;
  return {
    score: 0,
    lives: 3,
    paddleX,
    paddleW: PADDLE_BASE_W,
    balls: [makeBall(paddleX + PADDLE_BASE_W / 2, offset)],
    bricks: makeBricks(offset),
    particles: [],
    powerUps: [],
    wideTimer: 0,
    slowTimer: 0,
    launched: false,
    gameOver: false,
    won: false,
  };
}

function spawnParticles(particles: Particle[], cx: number, cy: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 0.4 + Math.random() * 0.4,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/* ──────────────────────── component ──────────────────────── */

export default function BallBreaker({ onScore, liveCode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [winner, setWinner] = useState<string | null>(null);
  const p1Ref = useRef<PlayerField>(initField(0));
  const p2Ref = useRef<PlayerField>(initField(HALF));
  const keysRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef<number>(0);
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /* ── keyboard ── */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === " " && phaseRef.current === "playing") {
        e.preventDefault();
        launchBalls(p1Ref.current, 0);
        launchBalls(p2Ref.current, HALF);
      }
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /* ── touch ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let touchSide: 1 | 2 | null = null;
    let touchX = 0;

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const tx = e.touches[0].clientX - rect.left;
      const ty = e.touches[0].clientY - rect.top;
      const scaleX = CW / rect.width;
      const scaleY = CH / rect.height;
      const cx = tx * scaleX;

      if (ty * scaleY > CH - 70) {
        // tap bottom to launch
        if (cx < HALF) launchBalls(p1Ref.current, 0);
        else launchBalls(p2Ref.current, HALF);
      }
      touchSide = cx < HALF ? 1 : 2;
      touchX = cx;
    };
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchSide) return;
      const rect = canvas.getBoundingClientRect();
      const tx = e.touches[0].clientX - rect.left;
      const cx = tx * (CW / rect.width);
      touchX = cx;
      if (touchSide === 1) {
        p1Ref.current.paddleX = clamp(
          cx - p1Ref.current.paddleW / 2,
          2,
          HALF - p1Ref.current.paddleW - 2
        );
      } else {
        p2Ref.current.paddleX = clamp(
          cx - p2Ref.current.paddleW / 2,
          HALF + 2,
          CW - p2Ref.current.paddleW - 2
        );
      }
    };
    const onEnd = () => {
      touchSide = null;
    };
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, []);

  /* ── launch balls ── */
  function launchBalls(field: PlayerField, _offset: number) {
    if (field.gameOver || field.won) return;
    if (!field.launched) {
      field.launched = true;
      field.balls.forEach((b) => {
        const angle = -Math.PI / 4 - Math.random() * Math.PI / 2;
        const speed = field.slowTimer > 0 ? BALL_SLOW_SPEED : BALL_BASE_SPEED;
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
      });
    }
  }

  /* ── update one field ── */
  function updateField(field: PlayerField, offset: number, dt: number, moveLeft: boolean, moveRight: boolean) {
    if (field.gameOver || field.won) return;

    // paddle movement
    const pSpeed = 6;
    if (moveLeft) field.paddleX -= pSpeed;
    if (moveRight) field.paddleX += pSpeed;
    field.paddleX = clamp(field.paddleX, offset + 2, offset + HALF - field.paddleW - 2);

    // timers
    if (field.wideTimer > 0) {
      field.wideTimer -= dt;
      if (field.wideTimer <= 0) {
        field.paddleW = PADDLE_BASE_W;
        field.wideTimer = 0;
      }
    }
    if (field.slowTimer > 0) {
      field.slowTimer -= dt;
      if (field.slowTimer <= 0) {
        field.slowTimer = 0;
        // restore speed
        field.balls.forEach((b) => {
          const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (spd > 0.1) {
            const ratio = BALL_BASE_SPEED / spd;
            b.vx *= ratio;
            b.vy *= ratio;
          }
        });
      }
    }

    // stick ball to paddle if not launched
    if (!field.launched && field.balls.length > 0) {
      field.balls[0].x = field.paddleX + field.paddleW / 2;
      field.balls[0].y = CH - 30 - PADDLE_H - BALL_R - 2;
    }

    const speed = field.slowTimer > 0 ? BALL_SLOW_SPEED : BALL_BASE_SPEED;

    // update balls
    const newBalls: Ball[] = [];
    for (const ball of field.balls) {
      if (!field.launched) {
        newBalls.push(ball);
        continue;
      }

      // trail
      ball.trail.push({ x: ball.x, y: ball.y, alpha: 1 });
      if (ball.trail.length > 12) ball.trail.shift();
      ball.trail.forEach((t) => (t.alpha *= 0.85));

      ball.x += ball.vx;
      ball.y += ball.vy;

      // wall bounces
      if (ball.x - BALL_R < offset) {
        ball.x = offset + BALL_R;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x + BALL_R > offset + HALF) {
        ball.x = offset + HALF - BALL_R;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y - BALL_R < 0) {
        ball.y = BALL_R;
        ball.vy = Math.abs(ball.vy);
      }

      // paddle bounce
      const paddleY = CH - 30;
      if (
        ball.vy > 0 &&
        ball.y + BALL_R >= paddleY &&
        ball.y + BALL_R <= paddleY + PADDLE_H + 4 &&
        ball.x >= field.paddleX - BALL_R &&
        ball.x <= field.paddleX + field.paddleW + BALL_R
      ) {
        ball.y = paddleY - BALL_R;
        const hitPos = (ball.x - field.paddleX) / field.paddleW; // 0..1
        const angle = -Math.PI / 6 - hitPos * (2 * Math.PI / 3); // -30 to -150 deg roughly
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        // ensure going up
        if (ball.vy > -1) ball.vy = -speed * 0.7;
      }

      // brick collisions
      for (const brick of field.bricks) {
        if (!brick.alive) continue;
        if (
          ball.x + BALL_R > brick.x &&
          ball.x - BALL_R < brick.x + brick.w &&
          ball.y + BALL_R > brick.y &&
          ball.y - BALL_R < brick.y + brick.h
        ) {
          brick.alive = false;
          field.score += brick.points;
          spawnParticles(field.particles, brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 8);

          // determine bounce direction
          const overlapL = ball.x + BALL_R - brick.x;
          const overlapR = brick.x + brick.w - (ball.x - BALL_R);
          const overlapT = ball.y + BALL_R - brick.y;
          const overlapB = brick.y + brick.h - (ball.y - BALL_R);
          const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);
          if (minOverlap === overlapT || minOverlap === overlapB) {
            ball.vy = -ball.vy;
          } else {
            ball.vx = -ball.vx;
          }

          // maybe spawn power-up (15% chance)
          if (Math.random() < 0.15) {
            const types: PowerUpType[] = ["wide", "multi", "slow"];
            const puType = types[Math.floor(Math.random() * types.length)];
            field.powerUps.push({
              x: brick.x + brick.w / 2,
              y: brick.y + brick.h / 2,
              type: puType,
              color: PU_COLORS[puType],
              vy: 1.5,
            });
          }

          break; // one brick per ball per frame
        }
      }

      // ball fell below
      if (ball.y - BALL_R > CH) {
        continue; // remove ball
      }

      newBalls.push(ball);
    }

    field.balls = newBalls;

    // lost all balls
    if (field.launched && field.balls.length === 0) {
      field.lives--;
      field.launched = false;
      if (field.lives <= 0) {
        field.gameOver = true;
      } else {
        field.balls = [makeBall(field.paddleX + field.paddleW / 2, offset)];
        field.paddleW = PADDLE_BASE_W;
        field.wideTimer = 0;
        field.slowTimer = 0;
      }
    }

    // check win
    if (field.bricks.every((b) => !b.alive) && !field.won) {
      field.won = true;
      field.score += field.lives * 100;
    }

    // update power-ups
    const newPU: PowerUp[] = [];
    for (const pu of field.powerUps) {
      pu.y += pu.vy;
      const paddleY = CH - 30;
      if (
        pu.y + 6 >= paddleY &&
        pu.y - 6 <= paddleY + PADDLE_H &&
        pu.x >= field.paddleX &&
        pu.x <= field.paddleX + field.paddleW
      ) {
        // collected
        applyPowerUp(field, pu.type, offset);
        spawnParticles(field.particles, pu.x, pu.y, pu.color, 10);
      } else if (pu.y < CH + 10) {
        newPU.push(pu);
      }
    }
    field.powerUps = newPU;

    // update particles
    for (let i = field.particles.length - 1; i >= 0; i--) {
      const p = field.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gravity
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        field.particles.splice(i, 1);
      }
    }
  }

  function applyPowerUp(field: PlayerField, type: PowerUpType, offset: number) {
    switch (type) {
      case "wide":
        field.paddleW = PADDLE_WIDE_W;
        field.wideTimer = 8;
        break;
      case "multi": {
        const currentBalls = [...field.balls];
        const extras: Ball[] = [];
        for (const b of currentBalls) {
          for (let i = 0; i < 2; i++) {
            const nb: Ball = {
              x: b.x,
              y: b.y,
              vx: b.vx * Math.cos(0.5 * (i === 0 ? 1 : -1)) - b.vy * Math.sin(0.5 * (i === 0 ? 1 : -1)),
              vy: b.vx * Math.sin(0.5 * (i === 0 ? 1 : -1)) + b.vy * Math.cos(0.5 * (i === 0 ? 1 : -1)),
              trail: [],
            };
            extras.push(nb);
          }
        }
        field.balls.push(...extras);
        break;
      }
      case "slow":
        field.slowTimer = 6;
        field.balls.forEach((b) => {
          const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (spd > 0.1) {
            const ratio = BALL_SLOW_SPEED / spd;
            b.vx *= ratio;
            b.vy *= ratio;
          }
        });
        break;
    }
  }

  /* ── render ── */
  function renderField(ctx: CanvasRenderingContext2D, field: PlayerField, offset: number, playerColor: string, playerName: string) {
    const cx = offset + HALF / 2;

    // player label at top
    ctx.save();
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillStyle = playerColor;
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.7;
    ctx.fillText(playerName, cx, 14);
    // lives
    for (let i = 0; i < field.lives; i++) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      const hx = cx - 15 + i * 14;
      const hy = 23;
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.arc(hx + 5, hy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // score
    ctx.save();
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.6;
    ctx.textAlign = "right";
    ctx.fillText(`${field.score} pts`, offset + HALF - 8, 14);
    ctx.restore();

    // active power-up indicators
    let puY = 24;
    ctx.save();
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.globalAlpha = 0.8;
    if (field.wideTimer > 0) {
      ctx.fillStyle = PU_COLORS.wide;
      ctx.fillText(`WIDE ${Math.ceil(field.wideTimer)}s`, offset + 6, puY);
      puY += 10;
    }
    if (field.slowTimer > 0) {
      ctx.fillStyle = PU_COLORS.slow;
      ctx.fillText(`SLOW ${Math.ceil(field.slowTimer)}s`, offset + 6, puY);
      puY += 10;
    }
    if (field.balls.length > 1) {
      ctx.fillStyle = PU_COLORS.multi;
      ctx.fillText(`x${field.balls.length}`, offset + 6, puY);
    }
    ctx.restore();

    // bricks
    for (const brick of field.bricks) {
      if (!brick.alive) continue;
      ctx.save();
      ctx.fillStyle = brick.color;
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = 4;
      const r = 3;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.w, brick.h, r);
      ctx.fill();
      // highlight
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(brick.x + 2, brick.y + 1, brick.w - 4, brick.h / 3);
      ctx.restore();
    }

    // paddle
    const paddleY = CH - 30;
    ctx.save();
    ctx.fillStyle = playerColor;
    ctx.shadowColor = playerColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(field.paddleX, paddleY, field.paddleW, PADDLE_H, 5);
    ctx.fill();
    ctx.restore();

    // ball trails and balls
    for (const ball of field.balls) {
      // trail
      for (const t of ball.trail) {
        ctx.save();
        ctx.globalAlpha = t.alpha * 0.4;
        ctx.fillStyle = playerColor;
        ctx.beginPath();
        ctx.arc(t.x, t.y, BALL_R * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ball
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = playerColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // power-ups
    for (const pu of field.powerUps) {
      ctx.save();
      ctx.fillStyle = pu.color;
      ctx.shadowColor = pu.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, 7, 0, Math.PI * 2);
      ctx.fill();
      // icon label
      ctx.fillStyle = "#000";
      ctx.font = "bold 9px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = pu.type === "wide" ? "W" : pu.type === "multi" ? "M" : "S";
      ctx.fillText(label, pu.x, pu.y + 1);
      ctx.restore();
    }

    // particles
    for (const p of field.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // not launched hint
    if (!field.launched && !field.gameOver && !field.won) {
      ctx.save();
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() / 300);
      ctx.textAlign = "center";
      ctx.fillText("Pressione ESPAÇO", cx, CH - 55);
      ctx.restore();
    }

    // game over overlay
    if (field.gameOver) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(offset, 0, HALF, CH);
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("FIM", cx, CH / 2 - 10);
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${field.score} pontos`, cx, CH / 2 + 18);
      ctx.restore();
    }

    // won overlay
    if (field.won) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(offset, 0, HALF, CH);
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillStyle = "#22c55e";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("VITÓRIA!", cx, CH / 2 - 10);
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${field.score} pontos`, cx, CH / 2 + 18);
      ctx.restore();
    }
  }

  /* ── game loop ── */
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = performance.now();
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = now;

    // input
    const keys = keysRef.current;
    const p1Left = keys.has("a") || keys.has("a");
    const p1Right = keys.has("d") || keys.has("d");
    const p2Left = keys.has("arrowleft");
    const p2Right = keys.has("arrowright");

    // update
    updateField(p1Ref.current, 0, dt, p1Left, p1Right);
    updateField(p2Ref.current, HALF, dt, p2Left, p2Right);

    // clear
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, CW, CH);

    // draw subtle grid
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < CW; gx += 30) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, CH);
      ctx.stroke();
    }
    for (let gy = 0; gy < CH; gy += 30) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(CW, gy);
      ctx.stroke();
    }
    ctx.restore();

    // dashed center divider
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(HALF, 0);
    ctx.lineTo(HALF, CH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // glow at center
    ctx.save();
    const cGrad = ctx.createRadialGradient(HALF, CH / 2, 0, HALF, CH / 2, 30);
    cGrad.addColorStop(0, "rgba(255,255,255,0.06)");
    cGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = cGrad;
    ctx.fillRect(HALF - 30, 0, 60, CH);
    ctx.restore();

    // render fields
    renderField(ctx, p1Ref.current, 0, P1_COLOR, P1_NAME);
    renderField(ctx, p2Ref.current, HALF, P2_COLOR, P2_NAME);

    // check end
    const p1Done = p1Ref.current.gameOver || p1Ref.current.won;
    const p2Done = p2Ref.current.gameOver || p2Ref.current.won;
    if (p1Done && p2Done && phaseRef.current === "playing") {
      phaseRef.current = "done";
      setPhase("done");

      const p1 = p1Ref.current;
      const p2 = p2Ref.current;

      // both won → higher score wins; if one won and other didn't, winner
      let winText: string;
      if (p1.won && p2.won) {
        if (p1.score >= p2.score) {
          winText = P1_NAME;
          onScore?.(P1_NAME, p1.score);
        } else {
          winText = P2_NAME;
          onScore?.(P2_NAME, p2.score);
        }
      } else if (p1.won) {
        winText = P1_NAME;
        onScore?.(P1_NAME, p1.score);
      } else if (p2.won) {
        winText = P2_NAME;
        onScore?.(P2_NAME, p2.score);
      } else {
        // both lost
        if (p1.score >= p2.score) {
          winText = P1_NAME;
          onScore?.(P1_NAME, p1.score);
        } else {
          winText = P2_NAME;
          onScore?.(P2_NAME, p2.score);
        }
      }
      setWinner(winText);

      // also report second place
      const otherName = winText === P1_NAME ? P2_NAME : P1_NAME;
      const otherScore = winText === P1_NAME ? p2.score : p1.score;
      onScore?.(otherName, otherScore);
    }

    if (phaseRef.current === "playing") {
      rafRef.current = requestAnimationFrame(gameLoop);
    }
  }, [onScore]);

  /* ── start / reset ── */
  const startGame = useCallback(() => {
    p1Ref.current = initField(0);
    p2Ref.current = initField(HALF);
    lastTimeRef.current = performance.now();
    setWinner(null);
    setPhase("playing");
    phaseRef.current = "playing";
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const resetGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase("idle");
    setWinner(null);
    p1Ref.current = initField(0);
    p2Ref.current = initField(HALF);
    // draw idle state
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0a0a0f";
        ctx.fillRect(0, 0, CW, CH);
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(HALF, 0);
        ctx.lineTo(HALF, CH);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // draw initial idle canvas once
  useEffect(() => {
    if (phase === "idle") {
      resetGame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ──────────────────────── JSX ──────────────────────── */
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[720px] mx-auto select-none">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 w-full"
      >
        <div className="flex-1 text-right">
          <Badge className="text-xs font-bold" style={{ backgroundColor: P1_COLOR + "22", color: P1_COLOR, borderColor: P1_COLOR }}>
            <Gamepad2 className="w-3 h-3 mr-1" />
            {P1_NAME}
          </Badge>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <h2 className="text-lg font-bold text-white tracking-tight">
            ⚡ Quebra-Tijolos
          </h2>
          <p className="text-[10px] text-zinc-500">Destrua todos os tijolos!</p>
        </motion.div>
        <div className="flex-1 text-left">
          <Badge className="text-xs font-bold" style={{ backgroundColor: P2_COLOR + "22", color: P2_COLOR, borderColor: P2_COLOR }}>
            <Gamepad2 className="w-3 h-3 mr-1" />
            {P2_NAME}
          </Badge>
        </div>
      </motion.div>

      <div className="flex items-center justify-between w-full max-w-[700px] px-1">
        <motion.div
          animate={{ scale: p1Ref.current.score > 0 ? [1, 1.05, 1] : 1 }}
          className="flex items-center gap-2"
        >
          <span className="text-cyan-400 font-bold text-sm">{p1Ref.current.score}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: p1Ref.current.lives }).map((_, i) => (
              <Heart key={i} className="w-3 h-3 text-red-500 fill-red-500" />
            ))}
          </div>
          <span className="text-[10px] text-zinc-500 ml-1">A / D</span>
        </motion.div>

        <div className="text-[10px] text-zinc-600 font-mono">
          {phase === "playing" && `VS ${liveCode || ""}`}
        </div>

        <motion.div
          animate={{ scale: p2Ref.current.score > 0 ? [1, 1.05, 1] : 1 }}
          className="flex items-center gap-2"
        >
          <span className="text-[10px] text-zinc-500 mr-1">← →</span>
          <div className="flex gap-0.5">
            {Array.from({ length: p2Ref.current.lives }).map((_, i) => (
              <Heart key={i} className="w-3 h-3 text-red-500 fill-red-500" />
            ))}
          </div>
          <span className="text-pink-400 font-bold text-sm">{p2Ref.current.score}</span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="relative rounded-xl overflow-hidden border border-zinc-800 shadow-2xl shadow-black/50"
      >
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="block w-full h-auto"
          style={{ imageRendering: "auto" }}
          onClick={() => {
            if (phase === "playing") {
              launchBalls(p1Ref.current, 0);
              launchBalls(p2Ref.current, HALF);
            }
          }}
        />

        <AnimatePresence>
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm gap-4"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12 }}
                className="text-5xl"
              >
                🧱
              </motion.div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">Quebra-Tijolos</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-[260px]">
                  Destrua todos os tijolos! Primeiro a limpar ou com mais pontos vence.
                </p>
              </div>

              <div className="flex gap-6 mt-1">
                <div className="text-center">
                  <div className="text-cyan-400 text-[11px] font-bold">{P1_NAME}</div>
                  <div className="text-zinc-500 text-[10px]">A / D + Espaço</div>
                </div>
                <div className="text-center">
                  <div className="text-pink-400 text-[11px] font-bold">{P2_NAME}</div>
                  <div className="text-zinc-500 text-[10px]">← / → + Espaço</div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <div className="flex items-center gap-1 text-[10px]">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PU_COLORS.wide }} />
                  <span className="text-zinc-400">Largo</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PU_COLORS.multi }} />
                  <span className="text-zinc-400">Multi</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PU_COLORS.slow }} />
                  <span className="text-zinc-400">Lento</span>
                </div>
              </div>

              <Button
                onClick={startGame}
                className="mt-2 px-8 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white font-bold text-sm rounded-full shadow-lg shadow-cyan-500/20"
              >
                <Zap className="w-4 h-4 mr-2" />
                Iniciar Jogo
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "done" && winner && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm gap-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10 }}
              >
                <Trophy className="w-12 h-12 text-yellow-400" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "text-2xl font-black",
                  winner === P1_NAME ? "text-cyan-400" : "text-pink-400"
                )}
              >
                🏆 {winner} Venceu!
              </motion.h3>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex gap-6 text-sm"
              >
                <div className="text-center">
                  <div className="text-cyan-400 font-bold">{P1_NAME}</div>
                  <div className="text-zinc-300">{p1Ref.current.score} pts</div>
                </div>
                <div className="text-center">
                  <div className="text-pink-400 font-bold">{P2_NAME}</div>
                  <div className="text-zinc-300">{p2Ref.current.score} pts</div>
                </div>
              </motion.div>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={startGame}
                  className="px-6 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white font-bold text-sm rounded-full"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Jogar Novamente
                </Button>
                <Button
                  variant="outline"
                  onClick={resetGame}
                  className="text-zinc-400 rounded-full"
                >
                  Menu
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-[10px] text-zinc-600 space-y-0.5"
      >
        <p>🧱 Vermelho 50 · 🟧 Laranja 40 · 🟨 Amarelo 30 · 🟩 Verde 20 · 🟦 Ciano 10</p>
        <p>❤️ 3 vidas cada · +100 pts por vida restante ao vencer</p>
      </motion.div>
    </div>
  );
}
