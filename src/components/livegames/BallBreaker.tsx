import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Trophy, Heart, Zap, Gamepad2, Star } from "lucide-react";
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
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'rect' | 'spark';
}

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  color: string;
  vy: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
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
  scorePopups: ScorePopup[];
  wideTimer: number;
  slowTimer: number;
  launched: boolean;
  gameOver: boolean;
  won: boolean;
  hitFlash: number;
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
    scorePopups: [],
    wideTimer: 0,
    slowTimer: 0,
    launched: false,
    gameOver: false,
    won: false,
    hitFlash: 0,
  };
}

function spawnParticles(particles: Particle[], cx: number, cy: number, color: string, count: number) {
  // Debris chunks (rectangular)
  for (let i = 0; i < Math.ceil(count * 0.5); i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x: cx + (Math.random() - 0.5) * 10,
      y: cy + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      maxLife: 0.5 + Math.random() * 0.5,
      color,
      size: 2 + Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      shape: 'rect',
    });
  }
  // Bright sparks (small, fast)
  for (let i = 0; i < Math.ceil(count * 0.4); i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      life: 1,
      maxLife: 0.2 + Math.random() * 0.3,
      color: '#ffffff',
      size: 1 + Math.random() * 1.5,
      rotation: 0,
      rotationSpeed: 0,
      shape: 'spark',
    });
  }
  // Glowing circles
  for (let i = 0; i < Math.ceil(count * 0.3); i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2;
    particles.push({
      x: cx + (Math.random() - 0.5) * 8,
      y: cy + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      life: 1,
      maxLife: 0.4 + Math.random() * 0.4,
      color,
      size: 1.5 + Math.random() * 2.5,
      rotation: 0,
      rotationSpeed: 0,
      shape: 'circle',
    });
  }
}

function spawnScorePopup(popups: ScorePopup[], x: number, y: number, text: string, color: string) {
  popups.push({ x, y, text, color, life: 1, maxLife: 0.8 });
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const r = clamp(((num >> 16) & 0xff) + percent, 0, 255);
  const g = clamp(((num >> 8) & 0xff) + percent, 0, 255);
  const b = clamp((num & 0xff) + percent, 0, 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
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
  const shakeRef = useRef<{ x: number; y: number; intensity: number }>({ x: 0, y: 0, intensity: 0 });
  const gameTimeRef = useRef<number>(0);
  const [displayScores, setDisplayScores] = useState({ p1: 0, p2: 0 });

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
          field.hitFlash = 0.15;
          spawnParticles(field.particles, brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 12);
          spawnScorePopup(field.scorePopups, brick.x + brick.w / 2, brick.y, `+${brick.points}`, brick.color);
          // trigger screen shake
          shakeRef.current.intensity = Math.min(shakeRef.current.intensity + 3, 8);

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
      p.vy += 0.06; // gravity
      p.rotation += p.rotationSpeed;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        field.particles.splice(i, 1);
      }
    }

    // update score popups
    for (let i = field.scorePopups.length - 1; i >= 0; i--) {
      const sp = field.scorePopups[i];
      sp.y -= 0.8;
      sp.life -= dt / sp.maxLife;
      if (sp.life <= 0) {
        field.scorePopups.splice(i, 1);
      }
    }

    // decay hit flash
    if (field.hitFlash > 0) {
      field.hitFlash -= dt;
      if (field.hitFlash < 0) field.hitFlash = 0;
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

  /* ── helper: draw heart shape ── */
  function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    // top left curve
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    // bottom left curve
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 1.5, x, y + size);
    // bottom right curve
    ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 1.5, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    // top right curve
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.closePath();
    ctx.fill();
  }

  /* ── render ── */
  function renderField(ctx: CanvasRenderingContext2D, field: PlayerField, offset: number, playerColor: string, playerName: string) {
    const cx = offset + HALF / 2;
    const t = gameTimeRef.current;

    // field background vignette
    ctx.save();
    const vigGrad = ctx.createRadialGradient(cx, CH / 2, 40, cx, CH / 2, HALF);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(offset, 0, HALF, CH);
    ctx.restore();

    // player label at top with glow
    ctx.save();
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = playerColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = playerColor;
    ctx.globalAlpha = 0.9;
    ctx.fillText(playerName, cx, 14);
    ctx.restore();

    // lives as heart shapes
    for (let i = 0; i < field.lives; i++) {
      ctx.save();
      const hx = cx - 10 + i * 13;
      const hy = 19;
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 4;
      drawHeart(ctx, hx, hy, 8);
      ctx.restore();
    }

    // score with glow
    ctx.save();
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.8;
    ctx.textAlign = "right";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 4;
    ctx.fillText(`${field.score} pts`, offset + HALF - 8, 14);
    ctx.restore();

    // active power-up indicators with progress bars
    let puY = 26;
    ctx.save();
    ctx.font = "bold 8px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.globalAlpha = 0.9;
    if (field.wideTimer > 0) {
      // progress bar background
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(offset + 4, puY - 6, 50, 4);
      // progress bar fill
      ctx.fillStyle = PU_COLORS.wide;
      ctx.shadowColor = PU_COLORS.wide;
      ctx.shadowBlur = 3;
      ctx.fillRect(offset + 4, puY - 6, 50 * (field.wideTimer / 8), 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = PU_COLORS.wide;
      ctx.fillText(`WIDE ${Math.ceil(field.wideTimer)}s`, offset + 6, puY + 3);
      puY += 12;
    }
    if (field.slowTimer > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(offset + 4, puY - 6, 50, 4);
      ctx.fillStyle = PU_COLORS.slow;
      ctx.shadowColor = PU_COLORS.slow;
      ctx.shadowBlur = 3;
      ctx.fillRect(offset + 4, puY - 6, 50 * (field.slowTimer / 6), 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = PU_COLORS.slow;
      ctx.fillText(`SLOW ${Math.ceil(field.slowTimer)}s`, offset + 6, puY + 3);
      puY += 12;
    }
    if (field.balls.length > 1) {
      ctx.fillStyle = PU_COLORS.multi;
      ctx.shadowColor = PU_COLORS.multi;
      ctx.shadowBlur = 3;
      ctx.fillText(`x${field.balls.length} MULTI`, offset + 6, puY);
    }
    ctx.restore();

    // bricks with 3D gradient effect
    for (const brick of field.bricks) {
      if (!brick.alive) continue;
      ctx.save();

      // Brick body with gradient
      const bGrad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h);
      bGrad.addColorStop(0, brick.color);
      bGrad.addColorStop(1, shadeColor(brick.color, -30));
      ctx.fillStyle = bGrad;
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = 6;
      const r = 3;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.w, brick.h, r);
      ctx.fill();

      // Top highlight stripe
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.roundRect(brick.x + 1, brick.y + 1, brick.w - 2, brick.h * 0.35, [r, r, 0, 0]);
      ctx.fill();

      // Bottom edge shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.roundRect(brick.x + 1, brick.y + brick.h - 2, brick.w - 2, 2, [0, 0, r, r]);
      ctx.fill();

      // Subtle inner border
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(brick.x + 0.5, brick.y + 0.5, brick.w - 1, brick.h - 1, r);
      ctx.stroke();

      ctx.restore();
    }

    // paddle with gradient and glow
    const paddleY = CH - 30;
    ctx.save();
    const pGrad = ctx.createLinearGradient(field.paddleX, paddleY, field.paddleX + field.paddleW, paddleY);
    pGrad.addColorStop(0, shadeColor(playerColor, -20));
    pGrad.addColorStop(0.5, playerColor);
    pGrad.addColorStop(1, shadeColor(playerColor, -20));
    ctx.fillStyle = pGrad;
    ctx.shadowColor = playerColor;
    ctx.shadowBlur = field.wideTimer > 0 ? 18 : 12;
    ctx.beginPath();
    ctx.roundRect(field.paddleX, paddleY, field.paddleW, PADDLE_H, 5);
    ctx.fill();

    // Paddle top highlight
    ctx.shadowBlur = 0;
    const pHighlight = ctx.createLinearGradient(field.paddleX, paddleY, field.paddleX, paddleY + PADDLE_H);
    pHighlight.addColorStop(0, "rgba(255,255,255,0.35)");
    pHighlight.addColorStop(0.4, "rgba(255,255,255,0.05)");
    pHighlight.addColorStop(1, "rgba(0,0,0,0.1)");
    ctx.fillStyle = pHighlight;
    ctx.beginPath();
    ctx.roundRect(field.paddleX, paddleY, field.paddleW, PADDLE_H, 5);
    ctx.fill();

    // Paddle edge glow dots
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(field.paddleX + 4, paddleY + PADDLE_H / 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(field.paddleX + field.paddleW - 4, paddleY + PADDLE_H / 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ball trails and balls
    for (const ball of field.balls) {
      // Enhanced trail with gradient size
      for (let ti = 0; ti < ball.trail.length; ti++) {
        const t = ball.trail[ti];
        const progress = ti / ball.trail.length;
        ctx.save();
        ctx.globalAlpha = t.alpha * 0.5;
        ctx.fillStyle = playerColor;
        ctx.shadowColor = playerColor;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(t.x, t.y, BALL_R * (0.3 + progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Ball with radial gradient and pulsing glow
      ctx.save();
      const pulse = 1 + 0.15 * Math.sin(t * 6);
      ctx.shadowColor = playerColor;
      ctx.shadowBlur = 16 * pulse;

      // Outer glow ring
      ctx.strokeStyle = playerColor;
      ctx.globalAlpha = 0.3 * pulse;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R + 3 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Ball body with radial gradient
      ctx.globalAlpha = 1;
      const ballGrad = ctx.createRadialGradient(ball.x - 1, ball.y - 1, 0, ball.x, ball.y, BALL_R);
      ballGrad.addColorStop(0, "#ffffff");
      ballGrad.addColorStop(0.6, playerColor + "cc");
      ballGrad.addColorStop(1, playerColor);
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();

      // Ball specular highlight
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(ball.x - 1.5, ball.y - 1.5, BALL_R * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // power-ups with pulsing and rotating ring
    for (const pu of field.powerUps) {
      ctx.save();
      const puPulse = 1 + 0.2 * Math.sin(t * 5);
      const puSize = 7 * puPulse;

      // Rotating dashed ring
      ctx.strokeStyle = pu.color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, puSize + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Outer glow
      ctx.globalAlpha = 0.3;
      ctx.shadowColor = pu.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = pu.color;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, puSize + 2, 0, Math.PI * 2);
      ctx.fill();

      // Core orb
      ctx.globalAlpha = 1;
      const puGrad = ctx.createRadialGradient(pu.x - 1, pu.y - 1, 0, pu.x, pu.y, puSize);
      puGrad.addColorStop(0, "#ffffff");
      puGrad.addColorStop(0.5, pu.color);
      puGrad.addColorStop(1, shadeColor(pu.color, -30));
      ctx.fillStyle = puGrad;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, puSize, 0, Math.PI * 2);
      ctx.fill();

      // Icon label
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#000";
      ctx.font = "bold 8px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = pu.type === "wide" ? "W" : pu.type === "multi" ? "M" : "S";
      ctx.fillText(label, pu.x, pu.y + 0.5);
      ctx.restore();
    }

    // particles with varied shapes
    for (const p of field.particles) {
      ctx.save();
      const alpha = Math.max(0, p.life);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'spark') {
        // Bright spark with glow
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'rect') {
        // Rotating debris chunk
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size * p.life / 2, -p.size * p.life * 0.6 / 2, p.size * p.life, p.size * p.life * 0.6);
      } else {
        // Glowing circle
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // score popups
    for (const sp of field.scorePopups) {
      ctx.save();
      const alpha = Math.max(0, sp.life);
      ctx.globalAlpha = alpha;
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillStyle = sp.color;
      ctx.shadowColor = sp.color;
      ctx.shadowBlur = 4;
      ctx.textAlign = "center";
      ctx.fillText(sp.text, sp.x, sp.y);
      ctx.restore();
    }

    // not launched hint with animated glow
    if (!field.launched && !field.gameOver && !field.won) {
      ctx.save();
      const hintPulse = 0.5 + 0.3 * Math.sin(t * 4);
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = hintPulse;
      ctx.shadowColor = playerColor;
      ctx.shadowBlur = 8;
      ctx.textAlign = "center";
      ctx.fillText("Pressione ESPA\u00C7O", cx, CH - 55);

      // Arrow indicator bouncing
      const arrowY = CH - 42 + 3 * Math.sin(t * 5);
      ctx.globalAlpha = hintPulse * 0.6;
      ctx.font = "14px system-ui";
      ctx.fillText("\u25B2", cx, arrowY);
      ctx.restore();
    }

    // hit flash overlay
    if (field.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = field.hitFlash * 3;
      ctx.fillStyle = playerColor;
      ctx.fillRect(offset, 0, HALF, CH);
      ctx.restore();
    }

    // game over overlay with animated vignette
    if (field.gameOver) {
      ctx.save();
      const goAlpha = Math.min(0.7, 0.4 + 0.1 * Math.sin(t * 2));
      ctx.fillStyle = `rgba(15,0,0,${goAlpha})`;
      ctx.fillRect(offset, 0, HALF, CH);

      // Red vignette
      const goVig = ctx.createRadialGradient(cx, CH / 2, 30, cx, CH / 2, HALF * 0.8);
      goVig.addColorStop(0, "rgba(239,68,68,0)");
      goVig.addColorStop(1, "rgba(239,68,68,0.15)");
      ctx.fillStyle = goVig;
      ctx.fillRect(offset, 0, HALF, CH);

      // Animated scan lines
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = "#ef4444";
      for (let sy = 0; sy < CH; sy += 3) {
        ctx.fillRect(offset, sy, HALF, 1);
      }

      ctx.globalAlpha = 1;
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 12 + 4 * Math.sin(t * 3);
      ctx.fillText("FIM", cx, CH / 2 - 14);
      ctx.shadowBlur = 0;
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(`${field.score} pontos`, cx, CH / 2 + 14);
      ctx.restore();
    }

    // won overlay with celebration effects
    if (field.won) {
      ctx.save();
      const winAlpha = Math.min(0.6, 0.3 + 0.1 * Math.sin(t * 2.5));
      ctx.fillStyle = `rgba(0,15,0,${winAlpha})`;
      ctx.fillRect(offset, 0, HALF, CH);

      // Green glow vignette
      const winVig = ctx.createRadialGradient(cx, CH / 2, 30, cx, CH / 2, HALF * 0.8);
      winVig.addColorStop(0, "rgba(34,197,94,0)");
      winVig.addColorStop(1, "rgba(34,197,94,0.12)");
      ctx.fillStyle = winVig;
      ctx.fillRect(offset, 0, HALF, CH);

      // Sparkle dots
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6);
      ctx.fillStyle = "#22c55e";
      for (let si = 0; si < 6; si++) {
        const sx = offset + 20 + si * (HALF - 40) / 5;
        const sy = CH / 2 + 30 * Math.sin(t * 3 + si * 1.2);
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.fillStyle = "#22c55e";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 14 + 5 * Math.sin(t * 4);
      const winScale = 1 + 0.03 * Math.sin(t * 3);
      ctx.save();
      ctx.translate(cx, CH / 2 - 14);
      ctx.scale(winScale, winScale);
      ctx.fillText("VIT\u00D3RIA!", 0, 0);
      ctx.restore();
      ctx.shadowBlur = 0;
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(`${field.score} pontos`, cx, CH / 2 + 16);
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
    gameTimeRef.current += dt;

    // input
    const keys = keysRef.current;
    const p1Left = keys.has("a") || keys.has("a");
    const p1Right = keys.has("d") || keys.has("d");
    const p2Left = keys.has("arrowleft");
    const p2Right = keys.has("arrowright");

    // update
    updateField(p1Ref.current, 0, dt, p1Left, p1Right);
    updateField(p2Ref.current, HALF, dt, p2Left, p2Right);

    // update screen shake
    const shake = shakeRef.current;
    if (shake.intensity > 0) {
      shake.x = (Math.random() - 0.5) * shake.intensity * 2;
      shake.y = (Math.random() - 0.5) * shake.intensity * 2;
      shake.intensity *= 0.85;
      if (shake.intensity < 0.3) {
        shake.intensity = 0;
        shake.x = 0;
        shake.y = 0;
      }
    }

    // apply screen shake transform
    ctx.save();
    ctx.translate(shake.x, shake.y);

    // clear with gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CH);
    bgGrad.addColorStop(0, "#08080e");
    bgGrad.addColorStop(0.5, "#0a0a14");
    bgGrad.addColorStop(1, "#0a0a0f");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-10, -10, CW + 20, CH + 20);

    // draw subtle grid with slight animation
    const t = gameTimeRef.current;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
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

    // enhanced center divider with glow
    ctx.save();
    // wide glow band
    const divGrad = ctx.createLinearGradient(HALF - 15, 0, HALF + 15, 0);
    divGrad.addColorStop(0, "rgba(255,255,255,0)");
    divGrad.addColorStop(0.5, "rgba(255,255,255,0.03)");
    divGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = divGrad;
    ctx.fillRect(HALF - 15, 0, 30, CH);
    // dashed line
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -t * 20;
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(HALF, 0);
    ctx.lineTo(HALF, CH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // render fields
    renderField(ctx, p1Ref.current, 0, P1_COLOR, P1_NAME);
    renderField(ctx, p2Ref.current, HALF, P2_COLOR, P2_NAME);

    ctx.restore(); // end screen shake transform

    // sync display scores periodically (not every frame to avoid re-renders)
    if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) {
      setDisplayScores({ p1: p1Ref.current.score, p2: p2Ref.current.score });
    }

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
    gameTimeRef.current = 0;
    shakeRef.current = { x: 0, y: 0, intensity: 0 };
    setDisplayScores({ p1: 0, p2: 0 });
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
  const canvasBorderGlow = phase === "playing"
    ? `shadow-[0_0_20px_-5px_rgba(6,182,212,0.3),0_0_20px_-5px_rgba(236,72,153,0.3)]`
    : "shadow-2xl shadow-black/50";

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
          animate={{ scale: 1, rotate: [0, -2, 2, 0] }}
          transition={{ scale: { type: "spring", damping: 12 }, rotate: { delay: 0.5, duration: 0.6 } }}
          className="text-center"
        >
          <h2 className="text-lg font-bold text-white tracking-tight">
            {"\u26A1"} Quebra-Tijolos
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
          animate={{ scale: displayScores.p1 > 0 ? [1, 1.06, 1] : 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <motion.span
            key={displayScores.p1}
            initial={{ y: -4, opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-cyan-400 font-bold text-sm tabular-nums"
          >
            {displayScores.p1}
          </motion.span>
          <div className="flex gap-0.5">
            {Array.from({ length: p1Ref.current.lives }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              </motion.div>
            ))}
          </div>
          <span className="text-[10px] text-zinc-500 ml-1">A / D</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] text-zinc-600 font-mono"
        >
          {phase === "playing" && `VS ${liveCode || ""}`}
        </motion.div>

        <motion.div
          animate={{ scale: displayScores.p2 > 0 ? [1, 1.06, 1] : 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <span className="text-[10px] text-zinc-500 mr-1">{"\u2190"} {"\u2192"}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: p2Ref.current.lives }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              </motion.div>
            ))}
          </div>
          <motion.span
            key={displayScores.p2}
            initial={{ y: -4, opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-pink-400 font-bold text-sm tabular-nums"
          >
            {displayScores.p2}
          </motion.span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className={cn("relative rounded-xl overflow-hidden border border-zinc-800", canvasBorderGlow)}
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
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm gap-4"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12 }}
                className="text-5xl"
              >
                {"\u{1F9F1}"}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-center"
              >
                <h3 className="text-xl font-bold text-white">Quebra-Tijolos</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-[260px]">
                  Destrua todos os tijolos! Primeiro a limpar ou com mais pontos vence.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex gap-6 mt-1"
              >
                <div className="text-center">
                  <div className="text-cyan-400 text-[11px] font-bold">{P1_NAME}</div>
                  <div className="text-zinc-500 text-[10px]">A / D + Espa\u00E7o</div>
                </div>
                <div className="text-center">
                  <div className="text-pink-400 text-[11px] font-bold">{P2_NAME}</div>
                  <div className="text-zinc-500 text-[10px]">{"\u2190"} / {"\u2192"} + Espa\u00E7o</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="flex gap-4 mt-2"
              >
                {(["wide", "multi", "slow"] as const).map((puType) => (
                  <motion.div
                    key={puType}
                    whileHover={{ scale: 1.15 }}
                    className="flex items-center gap-1.5 text-[10px]"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: puType === "wide" ? 0 : puType === "multi" ? 0.3 : 0.6 }}
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: PU_COLORS[puType], boxShadow: `0 0 8px ${PU_COLORS[puType]}66` }}
                    />
                    <span className="text-zinc-400">
                      {puType === "wide" ? "Largo" : puType === "multi" ? "Multi" : "Lento"}
                    </span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
              >
                <Button
                  onClick={startGame}
                  className="mt-2 px-8 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white font-bold text-sm rounded-full shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-shadow"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Iniciar Jogo
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "done" && winner && (
            <motion.div
              key="done"
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(6px)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm gap-3"
            >
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10, stiffness: 200 }}
              >
                <div className="relative">
                  <Trophy className="w-14 h-14 text-yellow-400" style={{ filter: "drop-shadow(0 0 12px rgba(250,204,21,0.5))" }} />
                  <motion.div
                    animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0"
                  >
                    <Star className="w-3 h-3 text-yellow-300 -top-1 -right-1 absolute" fill="currentColor" />
                    <Star className="w-2 h-2 text-yellow-300 -bottom-0 -left-1 absolute" fill="currentColor" />
                  </motion.div>
                </div>
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 12 }}
                className={cn(
                  "text-2xl font-black",
                  winner === P1_NAME ? "text-cyan-400" : "text-pink-400"
                )}
                style={{ textShadow: winner === P1_NAME ? "0 0 20px rgba(6,182,212,0.5)" : "0 0 20px rgba(236,72,153,0.5)" }}
              >
                {"\u{1F3C6}"} {winner} Venceu!
              </motion.h3>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex gap-8 text-sm"
              >
                <div className="text-center">
                  <div className="text-cyan-400 font-bold text-xs">{P1_NAME}</div>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-white font-bold text-lg tabular-nums"
                  >
                    {p1Ref.current.score} <span className="text-zinc-500 text-xs font-normal">pts</span>
                  </motion.div>
                </div>
                <div className="w-px h-10 bg-zinc-700" />
                <div className="text-center">
                  <div className="text-pink-400 font-bold text-xs">{P2_NAME}</div>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-white font-bold text-lg tabular-nums"
                  >
                    {p2Ref.current.score} <span className="text-zinc-500 text-xs font-normal">pts</span>
                  </motion.div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex gap-2 mt-3"
              >
                <Button
                  onClick={startGame}
                  className="px-6 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white font-bold text-sm rounded-full shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Jogar Novamente
                </Button>
                <Button
                  variant="outline"
                  onClick={resetGame}
                  className="text-zinc-400 rounded-full hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                >
                  Menu
                </Button>
              </motion.div>
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
        <p>{"\u{1F9F1}"} Vermelho 50 {"\u00B7"} {"\u{1F7E7}"} Laranja 40 {"\u00B7"} {"\u{1F7E8}"} Amarelo 30 {"\u00B7"} {"\u{1F7E9}"} Verde 20 {"\u00B7"} {"\u{1F7E6}"} Ciano 10</p>
        <p>{"\u2764\uFE0F"} 3 vidas cada {"\u00B7"} +100 pts por vida restante ao vencer</p>
      </motion.div>
    </div>
  );
}
