"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RotateCcw, Wind, Crosshair, Zap, Heart, Trophy } from "lucide-react";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface PlayerState {
  x: number;
  health: number;
  roundsWon: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number; alpha: number }[];
  active: boolean;
}

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface Explosion {
  x: number;
  y: number;
  frame: number;
  maxFrames: number;
  particles: ExplosionParticle[];
  shockwaveRadius: number;
}

interface WindStreak {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

interface GameState {
  terrain: number[];
  currentPlayer: 1 | 2;
  players: [PlayerState, PlayerState];
  wind: number;
  projectile: Projectile | null;
  explosion: Explosion | null;
  phase: "aiming" | "firing" | "exploding" | "gameOver";
  winner: 1 | 2 | null;
  hitMessage: string | null;
  turnCount: number;
}

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.12;
const HIT_RADIUS = 22;
const CRATER_RADIUS = 25;
const DAMAGE_AMOUNT = 34;

function generateTerrain(width: number, height: number): number[] {
  const terrain: number[] = [];
  const freq1 = 0.008 + Math.random() * 0.012;
  const freq2 = 0.02 + Math.random() * 0.03;
  const freq3 = 0.003 + Math.random() * 0.005;
  const amp1 = 30 + Math.random() * 40;
  const amp2 = 10 + Math.random() * 20;
  const amp3 = 20 + Math.random() * 30;
  const baseY = height * 0.65;
  const phase1 = Math.random() * Math.PI * 2;
  const phase2 = Math.random() * Math.PI * 2;
  const phase3 = Math.random() * Math.PI * 2;

  for (let x = 0; x < width; x++) {
    const y =
      baseY +
      Math.sin(x * freq1 + phase1) * amp1 +
      Math.sin(x * freq2 + phase2) * amp2 +
      Math.sin(x * freq3 + phase3) * amp3;
    terrain.push(Math.min(Math.max(y, height * 0.35), height * 0.9));
  }
  return terrain;
}

function generateWind(): number {
  return (Math.random() - 0.5) * 6;
}

function createExplosion(x: number, y: number): Explosion {
  const particles: ExplosionParticle[] = [];
  const fireColors = ["#ff6600", "#ff9900", "#ffcc00", "#ff3300", "ffffff"];
  const smokeColors = ["#666666", "#888888", "#555555", "#777777"];

  // Fire/spark particles (30)
  for (let i = 0; i < 30; i++) {
    const ang = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 5;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed - 2.5,
      size: 2 + Math.random() * 4,
      alpha: 1,
      color: fireColors[Math.floor(Math.random() * fireColors.length)],
    });
  }

  // Smoke particles (12)
  for (let i = 0; i < 12; i++) {
    const ang = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 1.5;
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(ang) * speed,
      vy: -0.5 - Math.random() * 1.5,
      size: 4 + Math.random() * 7,
      alpha: 0.7,
      color: smokeColors[Math.floor(Math.random() * smokeColors.length)],
    });
  }

  // Debris particles (8)
  for (let i = 0; i < 8; i++) {
    const ang = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      size: 1.5 + Math.random() * 2.5,
      alpha: 1,
      color: Math.random() > 0.5 ? "#8B6914" : "#6B4F12",
    });
  }

  return { x, y, frame: 0, maxFrames: 50, particles, shockwaveRadius: 0 };
}

function createProjectile(
  x: number,
  y: number,
  angleDeg: number,
  power: number
): Projectile {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x,
    y,
    vx: power * Math.cos(rad) * 0.15,
    vy: -power * Math.sin(rad) * 0.15,
    trail: [],
    active: true,
  };
}

function initGameState(): GameState {
  const terrain = generateTerrain(CANVAS_WIDTH, CANVAS_HEIGHT);
  const p1X = Math.floor(CANVAS_WIDTH * 0.15);
  const p2X = Math.floor(CANVAS_WIDTH * 0.85);
  return {
    terrain,
    currentPlayer: 1,
    players: [
      { x: p1X, health: 100, roundsWon: 0 },
      { x: p2X, health: 100, roundsWon: 0 },
    ],
    wind: generateWind(),
    projectile: null,
    explosion: null,
    phase: "aiming",
    winner: null,
    hitMessage: null,
    turnCount: 1,
  };
}

function initWindStreaks(): WindStreak[] {
  const streaks: WindStreak[] = [];
  for (let i = 0; i < 20; i++) {
    streaks.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT * 0.45,
      length: 10 + Math.random() * 25,
      speed: 0.5 + Math.random() * 1.5,
      alpha: 0.03 + Math.random() * 0.07,
    });
  }
  return streaks;
}

export default function CannonBattle({ onScore, liveCode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(initGameState());
  const animFrameRef = useRef<number>(0);
  const shakeRef = useRef(0);
  const windStreaksRef = useRef<WindStreak[]>([]);
  const displayHealthRef = useRef({ p1: 100, p2: 100 });
  const damageFlashRef = useRef({ p1: 0, p2: 0 });
  const muzzleFlashRef = useRef<{ x: number; y: number; alpha: number } | null>(null);
  const frameCountRef = useRef(0);
  const gameOverSparklesRef = useRef<
    { x: number; y: number; vx: number; vy: number; alpha: number; size: number }[]
  >([]);
  const gameOverInitedRef = useRef(false);

  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(50);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [wind, setWind] = useState(0);
  const [healthP1, setHealthP1] = useState(100);
  const [healthP2, setHealthP2] = useState(100);
  const [phase, setPhase] = useState<GameState["phase"]>("aiming");
  const [hitMessage, setHitMessage] = useState<string | null>(null);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [turnCount, setTurnCount] = useState(1);

  const syncUI = useCallback((gs: GameState) => {
    setCurrentPlayer(gs.currentPlayer);
    setWind(gs.wind);
    setHealthP1(gs.players[0].health);
    setHealthP2(gs.players[1].health);
    setPhase(gs.phase);
    setHitMessage(gs.hitMessage);
    setWinner(gs.winner);
    setTurnCount(gs.turnCount);
  }, []);

  const fire = useCallback(() => {
    const gs = gameStateRef.current;
    if (gs.phase !== "aiming") return;

    const pi = gs.currentPlayer === 1 ? 0 : 1;
    const player = gs.players[pi];
    const playerX = player.x;
    const terrainY =
      gs.terrain[Math.floor(Math.max(0, Math.min(playerX, CANVAS_WIDTH - 1)))];
    const startY = terrainY - 16;

    const fireAngle = gs.currentPlayer === 1 ? angle : 180 - angle;
    const proj = createProjectile(playerX, startY, fireAngle, power);

    // Muzzle flash setup
    const rad = (fireAngle * Math.PI) / 180;
    const dir = gs.currentPlayer === 1 ? 1 : -1;
    const barrelLen = 18;
    muzzleFlashRef.current = {
      x: playerX + Math.cos(rad) * barrelLen * dir,
      y: startY - Math.sin(rad) * barrelLen,
      alpha: 1,
    };

    // Small recoil shake
    shakeRef.current = 3;

    gs.projectile = proj;
    gs.phase = "firing";
    gs.hitMessage = null;
    syncUI(gs);
  }, [angle, power, syncUI]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const gs = gameStateRef.current;
      if (gs.phase !== "aiming") return;

      switch (e.key) {
        case "a":
        case "A":
          setAngle((prev) => Math.max(0, prev - 2));
          break;
        case "d":
        case "D":
          setAngle((prev) => Math.min(180, prev + 2));
          break;
        case "w":
        case "W":
          setPower((prev) => Math.min(100, prev + 2));
          break;
        case "s":
        case "S":
          setPower((prev) => Math.max(10, prev - 2));
          break;
        case " ":
          e.preventDefault();
          fire();
          break;
      }
    },
    [fire]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize wind streaks
    if (windStreaksRef.current.length === 0) {
      windStreaksRef.current = initWindStreaks();
    }

    const drawRoundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const drawSky = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, "#05051e");
      grad.addColorStop(0.4, "#0f0a30");
      grad.addColorStop(0.7, "#1a1040");
      grad.addColorStop(1, "#0d1b2a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Stars with twinkling
      for (let i = 0; i < 70; i++) {
        const sx = (i * 137 + 42 * 31) % CANVAS_WIDTH;
        const sy = (i * 89 + 42 * 17) % Math.floor(CANVAS_HEIGHT * 0.55);
        const twinkle =
          0.3 +
          (i % 5) * 0.12 +
          Math.sin(frameCountRef.current * 0.03 + i * 2.1) * 0.15;
        const brightness = Math.max(0.1, Math.min(1, twinkle));
        ctx.fillStyle = `rgba(255,255,255,${brightness})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5 + (i % 3) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Moon with glow
      ctx.save();
      const moonGrad = ctx.createRadialGradient(590, 45, 0, 590, 45, 40);
      moonGrad.addColorStop(0, "rgba(200,215,255,0.15)");
      moonGrad.addColorStop(0.3, "rgba(150,180,230,0.06)");
      moonGrad.addColorStop(1, "rgba(100,130,200,0)");
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(590, 45, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = "rgba(200,220,255,0.6)";
      ctx.shadowBlur = 20;
      const moonFace = ctx.createRadialGradient(588, 43, 0, 590, 45, 12);
      moonFace.addColorStop(0, "rgba(240,245,255,0.95)");
      moonFace.addColorStop(0.6, "rgba(200,215,240,0.7)");
      moonFace.addColorStop(1, "rgba(160,190,220,0.3)");
      ctx.fillStyle = moonFace;
      ctx.beginPath();
      ctx.arc(590, 45, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawWindStreaks = (windVal: number) => {
      if (Math.abs(windVal) < 0.3) return;
      const dir = windVal > 0 ? 1 : -1;
      const streaks = windStreaksRef.current;

      for (const s of streaks) {
        s.x += s.speed * dir * Math.abs(windVal) * 0.4;
        if (dir > 0 && s.x > CANVAS_WIDTH + 40) {
          s.x = -40;
          s.y = Math.random() * CANVAS_HEIGHT * 0.45;
        } else if (dir < 0 && s.x < -40) {
          s.x = CANVAS_WIDTH + 40;
          s.y = Math.random() * CANVAS_HEIGHT * 0.45;
        }

        ctx.strokeStyle = `rgba(180,210,255,${s.alpha * Math.min(1, Math.abs(windVal) * 0.4)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.length * dir, s.y);
        ctx.stroke();
      }
    };

    const drawTerrain = (terrain: number[]) => {
      const grad = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.35, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, "#2d5016");
      grad.addColorStop(0.15, "#3a6b1e");
      grad.addColorStop(0.4, "#3d5a20");
      grad.addColorStop(0.7, "#4a3728");
      grad.addColorStop(1, "#2a1f14");

      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT);
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        ctx.lineTo(x, terrain[x]);
      }
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Grass edge glow
      ctx.save();
      ctx.shadowColor = "rgba(100,200,50,0.3)";
      ctx.shadowBlur = 4;
      ctx.strokeStyle = "#5aaa3a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        if (x === 0) ctx.moveTo(x, terrain[x]);
        else ctx.lineTo(x, terrain[x]);
      }
      ctx.stroke();
      ctx.restore();
    };

    const drawTrajectoryPreview = (gs: GameState) => {
      if (gs.phase !== "aiming") return;

      const pi = gs.currentPlayer === 1 ? 0 : 1;
      const player = gs.players[pi];
      const playerX = player.x;
      const terrainY =
        gs.terrain[
          Math.floor(Math.max(0, Math.min(playerX, CANVAS_WIDTH - 1)))
        ];
      const startY = terrainY - 16;

      const fireAngle = gs.currentPlayer === 1 ? angle : 180 - angle;
      const rad = (fireAngle * Math.PI) / 180;
      const vx = power * Math.cos(rad) * 0.15;
      const vy = -power * Math.sin(rad) * 0.15;

      let px = playerX;
      let py = startY;
      let pvx = vx;
      let pvy = vy;

      const isP1 = gs.currentPlayer === 1;
      const rgb = isP1 ? "34,211,238" : "244,114,182";
      const steps = 60;

      for (let i = 0; i < steps; i++) {
        px += pvx + gs.wind * 0.03;
        pvy += GRAVITY;
        py += pvy;

        if (px < 0 || px >= CANVAS_WIDTH || py > CANVAS_HEIGHT) break;

        const terrainAtX =
          gs.terrain[
            Math.floor(Math.max(0, Math.min(px, CANVAS_WIDTH - 1)))
          ];
        if (py >= terrainAtX) break;

        if (i % 3 === 0) {
          const progress = i / steps;
          const alpha = 0.35 * (1 - progress);
          const sz = 1.8 * (1 - progress * 0.6);

          // Glow around dot
          ctx.fillStyle = `rgba(${rgb},${alpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(px, py, sz * 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Dot
          ctx.fillStyle = `rgba(${rgb},${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, sz, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawCannon = (
      playerX: number,
      terrainY: number,
      cannonAngle: number,
      color: string,
      isP1: boolean,
      isActive: boolean
    ) => {
      const bodyW = 24;
      const bodyH = 10;
      const bodyX = playerX - bodyW / 2;
      const bodyY = terrainY - bodyH;
      const glowIntensity = isActive ? 14 : 5;
      const pulseGlow = isActive
        ? 10 + Math.sin(frameCountRef.current * 0.08) * 5
        : 0;

      // Body with glow
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = glowIntensity + pulseGlow;
      ctx.fillStyle = color;
      drawRoundRect(bodyX, bodyY, bodyW, bodyH, 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Body highlight stripe
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(bodyX + 2, bodyY + 1, bodyW - 4, 3);

      // Wheels
      const wheelR = 5;
      ctx.fillStyle = "#444";
      ctx.beginPath();
      ctx.arc(bodyX + 5, terrainY, wheelR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bodyX + bodyW - 5, terrainY, wheelR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#777";
      ctx.beginPath();
      ctx.arc(bodyX + 5, terrainY, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bodyX + bodyW - 5, terrainY, 2, 0, Math.PI * 2);
      ctx.fill();

      // Barrel with glow
      const barrelLen = 18;
      const barrelW = 4;
      const pivotX = playerX;
      const pivotY = bodyY;
      const bRad = (cannonAngle * Math.PI) / 180;
      const dir = isP1 ? 1 : -1;
      const endX = pivotX + Math.cos(bRad) * barrelLen * dir;
      const endY = pivotY - Math.sin(bRad) * barrelLen;

      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(-bRad * dir);

      // Barrel shadow/glow
      ctx.shadowColor = color;
      ctx.shadowBlur = isActive ? 10 : 3;

      // Tapered barrel
      ctx.beginPath();
      ctx.moveTo(0, -barrelW / 2);
      ctx.lineTo(barrelLen * dir, -barrelW / 2 * 0.65);
      ctx.lineTo(barrelLen * dir, barrelW / 2 * 0.65);
      ctx.lineTo(0, barrelW / 2);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Barrel highlight
      ctx.beginPath();
      ctx.moveTo(2 * dir, -barrelW / 2 * 0.7);
      ctx.lineTo((barrelLen - 3) * dir, -barrelW / 2 * 0.4);
      ctx.lineTo((barrelLen - 3) * dir, -barrelW / 2 * 0.1);
      ctx.lineTo(2 * dir, -barrelW / 2 * 0.4);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fill();

      ctx.restore();

      // Barrel tip glow (active player only)
      if (isActive) {
        ctx.save();
        const tipGlow = ctx.createRadialGradient(
          endX,
          endY,
          0,
          endX,
          endY,
          10
        );
        tipGlow.addColorStop(0, `rgba(255,255,255,${0.3 + Math.sin(frameCountRef.current * 0.1) * 0.15})`);
        tipGlow.addColorStop(0.4, color.replace(")", ",0.15)").replace("rgb", "rgba"));
        tipGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = tipGlow;
        ctx.beginPath();
        ctx.arc(endX, endY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Barrel tip bright dot
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(endX, endY, 2, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawMuzzleFlash = () => {
      const mf = muzzleFlashRef.current;
      if (!mf || mf.alpha < 0.01) return;

      ctx.save();
      const flashGrad = ctx.createRadialGradient(mf.x, mf.y, 0, mf.x, mf.y, 20);
      flashGrad.addColorStop(0, `rgba(255,255,200,${mf.alpha * 0.9})`);
      flashGrad.addColorStop(0.2, `rgba(255,200,50,${mf.alpha * 0.6})`);
      flashGrad.addColorStop(0.5, `rgba(255,100,0,${mf.alpha * 0.2})`);
      flashGrad.addColorStop(1, "rgba(255,50,0,0)");
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(mf.x, mf.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawHealthBar = (
      x: number,
      y: number,
      displayHealth: number,
      playerIdx: number
    ) => {
      const barW = 44;
      const barH = 6;
      const bx = x - barW / 2;
      const healthPct = Math.max(0, Math.min(1, displayHealth / 100));
      const flash = playerIdx === 0 ? damageFlashRef.current.p1 : damageFlashRef.current.p2;

      // Background
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      drawRoundRect(bx - 1, y - 1, barW + 2, barH + 2, 3);
      ctx.fill();

      ctx.fillStyle = "#1a1a2e";
      drawRoundRect(bx, y, barW, barH, 2);
      ctx.fill();

      // Health fill with gradient
      if (healthPct > 0.01) {
        const hColor1 =
          healthPct > 0.5
            ? "#22c55e"
            : healthPct > 0.25
              ? "#eab308"
              : "#ef4444";
        const hColor2 =
          healthPct > 0.5
            ? "#16a34a"
            : healthPct > 0.25
              ? "#ca8a04"
              : "#dc2626";

        const fillW = barW * healthPct;
        const hGrad = ctx.createLinearGradient(bx, y, bx, y + barH);
        hGrad.addColorStop(0, hColor1);
        hGrad.addColorStop(1, hColor2);
        ctx.fillStyle = hGrad;
        drawRoundRect(bx, y, fillW, barH, 2);
        ctx.fill();

        // Shine on health bar
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        drawRoundRect(bx + 1, y, fillW - 2, barH * 0.45, 1);
        ctx.fill();
      }

      // Damage flash overlay
      if (flash > 0.02) {
        ctx.fillStyle = `rgba(255,255,255,${flash * 0.5})`;
        drawRoundRect(bx, y, barW * healthPct, barH, 2);
        ctx.fill();
      }

      // Low health pulsing glow
      if (healthPct > 0 && healthPct < 0.3) {
        ctx.save();
        const glowAlpha =
          0.4 + Math.sin(frameCountRef.current * 0.12) * 0.25;
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 6 + Math.sin(frameCountRef.current * 0.12) * 3;
        ctx.strokeStyle = `rgba(239,68,68,${glowAlpha})`;
        ctx.lineWidth = 1;
        drawRoundRect(bx - 1, y - 1, barW + 2, barH + 2, 3);
        ctx.stroke();
        ctx.restore();
      }

      // Border
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 0.5;
      drawRoundRect(bx, y, barW, barH, 2);
      ctx.stroke();
    };

    const drawWindIndicator = (windVal: number) => {
      const cx = CANVAS_WIDTH / 2;
      const cy = 22;
      const pillW = 100;
      const pillH = 22;

      // Background pill
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      drawRoundRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, 11);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      drawRoundRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, 11);
      ctx.stroke();

      // Label
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("VENTO", cx - pillW / 2 + 10, cy);

      // Arrow with glow
      const arrowLen = Math.min(Math.abs(windVal) * 8, 35);
      const dir = windVal > 0 ? 1 : -1;
      const arrowStartX = cx + 2;
      const arrowEndX = arrowStartX + arrowLen * dir;

      if (Math.abs(windVal) > 0.2) {
        ctx.save();
        ctx.shadowColor = "rgba(150,200,255,0.5)";
        ctx.shadowBlur = 4;
        ctx.strokeStyle = `rgba(150,200,255,${0.5 + Math.abs(windVal) * 0.08})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(arrowStartX, cy);
        ctx.lineTo(arrowEndX, cy);
        ctx.stroke();

        if (arrowLen > 4) {
          ctx.beginPath();
          ctx.moveTo(arrowEndX, cy);
          ctx.lineTo(arrowEndX - 5 * dir, cy - 3.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(arrowEndX, cy);
          ctx.lineTo(arrowEndX - 5 * dir, cy + 3.5);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Strength text
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "8px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(Math.abs(windVal).toFixed(1), cx + pillW / 2 - 8, cy);
      ctx.textBaseline = "alphabetic";
    };

    const drawProjectile = (proj: Projectile) => {
      // Enhanced trail
      for (let i = 0; i < proj.trail.length; i++) {
        const t = proj.trail[i];
        const progress = i / proj.trail.length;
        const alpha = t.alpha * progress * 0.7;
        const sz = 1 + progress * 3;

        // Outer trail glow
        ctx.fillStyle = `rgba(255,150,0,${alpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, sz * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner trail
        ctx.fillStyle = `rgba(255,220,100,${alpha})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, sz, 0, Math.PI * 2);
        ctx.fill();
      }

      // Outer pulsing glow
      const pulseSize = 14 + Math.sin(frameCountRef.current * 0.3) * 3;
      const glowGrad = ctx.createRadialGradient(
        proj.x,
        proj.y,
        0,
        proj.x,
        proj.y,
        pulseSize
      );
      glowGrad.addColorStop(0, "rgba(255,200,50,0.35)");
      glowGrad.addColorStop(0.4, "rgba(255,100,0,0.12)");
      glowGrad.addColorStop(1, "rgba(255,50,0,0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, pulseSize, 0, Math.PI * 2);
      ctx.fill();

      // Main ball with radial gradient
      ctx.save();
      ctx.shadowColor = "#ff8800";
      ctx.shadowBlur = 12;
      const ballGrad = ctx.createRadialGradient(
        proj.x - 1,
        proj.y - 1,
        0,
        proj.x,
        proj.y,
        5
      );
      ballGrad.addColorStop(0, "#ffffff");
      ballGrad.addColorStop(0.25, "#ffe88a");
      ballGrad.addColorStop(0.6, "#ff9900");
      ballGrad.addColorStop(1, "#cc4400");
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Bright core
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(proj.x - 1, proj.y - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawExplosion = (exp: Explosion) => {
      const progress = exp.frame / exp.maxFrames;

      // Shockwave ring
      if (exp.shockwaveRadius > 2) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,200,100,${(1 - progress) * 0.35})`;
        ctx.lineWidth = 2.5 - progress * 2;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.shockwaveRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner shockwave
        ctx.strokeStyle = `rgba(255,255,220,${(1 - progress) * 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.shockwaveRadius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Bright flash (early frames)
      if (progress < 0.15) {
        const flashProgress = progress / 0.15;
        const flashAlpha = (1 - flashProgress) * 0.7;
        const flashRadius = 35 * flashProgress;
        const flashGrad = ctx.createRadialGradient(
          exp.x,
          exp.y,
          0,
          exp.x,
          exp.y,
          flashRadius
        );
        flashGrad.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
        flashGrad.addColorStop(0.4, `rgba(255,220,100,${flashAlpha * 0.5})`);
        flashGrad.addColorStop(1, "rgba(255,100,0,0)");
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, flashRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Base fire glow
      const baseRadius = 5 + progress * 28;
      const grad = ctx.createRadialGradient(
        exp.x,
        exp.y,
        0,
        exp.x,
        exp.y,
        baseRadius
      );
      grad.addColorStop(0, `rgba(255,255,200,${0.9 - progress * 0.9})`);
      grad.addColorStop(0.3, `rgba(255,150,0,${0.6 - progress * 0.6})`);
      grad.addColorStop(0.6, `rgba(255,50,0,${0.4 - progress * 0.4})`);
      grad.addColorStop(1, "rgba(100,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Particles
      for (const p of exp.particles) {
        if (p.alpha < 0.01) continue;
        let r = 255,
          g = 255,
          b = 255;
        if (p.color.startsWith("#")) {
          r = parseInt(p.color.slice(1, 3), 16);
          g = parseInt(p.color.slice(3, 5), 16);
          b = parseInt(p.color.slice(5, 7), 16);
        }
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * Math.max(0.3, p.alpha), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawHitMessage = (msg: string, playerColor: string) => {
      if (!msg) return;

      // Background pill
      const textWidth = ctx.measureText(msg).width;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      drawRoundRect(
        CANVAS_WIDTH / 2 - textWidth / 2 - 16,
        CANVAS_HEIGHT * 0.4 - 16,
        textWidth + 32,
        32,
        16
      );
      ctx.fill();

      ctx.save();
      ctx.fillStyle = playerColor;
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = playerColor;
      ctx.shadowBlur = 10;
      ctx.fillText(msg, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.4);
      ctx.restore();
    };

    const drawGameOver = (winnerNum: 1 | 2) => {
      // Dark vignette overlay
      const vigGrad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2,
        CANVAS_WIDTH * 0.2,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2,
        CANVAS_WIDTH * 0.6
      );
      vigGrad.addColorStop(0, "rgba(0,0,0,0.4)");
      vigGrad.addColorStop(1, "rgba(0,0,0,0.75)");
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Light beams
      const color = winnerNum === 1 ? "34,211,238" : "244,114,182";
      const beamCount = 12;
      for (let i = 0; i < beamCount; i++) {
        const angle = (i / beamCount) * Math.PI * 2 + frameCountRef.current * 0.005;
        const len = 200 + Math.sin(frameCountRef.current * 0.02 + i) * 50;
        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
        ctx.rotate(angle);
        const beamGrad = ctx.createLinearGradient(0, 0, len, 0);
        beamGrad.addColorStop(0, `rgba(${color},0.08)`);
        beamGrad.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(len, -15);
        ctx.lineTo(len, 15);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Sparkle particles
      const sparkles = gameOverSparklesRef.current;
      for (const sp of sparkles) {
        if (sp.alpha < 0.01) continue;
        ctx.fillStyle = `rgba(${color},${sp.alpha})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Title text
      ctx.save();
      ctx.fillStyle = `rgba(${color},0.95)`;
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = `rgba(${color},0.8)`;
      ctx.shadowBlur = 20;
      ctx.fillText(
        `VITORIA!`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 20
      );
      ctx.restore();

      // Subtitle
      ctx.fillStyle = `rgba(${color},0.7)`;
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `Jogador ${winnerNum}`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 15
      );

      // Decorative line
      const lineW = 120;
      const lineGrad = ctx.createLinearGradient(
        CANVAS_WIDTH / 2 - lineW / 2,
        0,
        CANVAS_WIDTH / 2 + lineW / 2,
        0
      );
      lineGrad.addColorStop(0, `rgba(${color},0)`);
      lineGrad.addColorStop(0.5, `rgba(${color},0.5)`);
      lineGrad.addColorStop(1, `rgba(${color},0)`);
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2 - lineW / 2, CANVAS_HEIGHT / 2 + 35);
      ctx.lineTo(CANVAS_WIDTH / 2 + lineW / 2, CANVAS_HEIGHT / 2 + 35);
      ctx.stroke();

      // Restart hint
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "12px sans-serif";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(
        'Clique em "Reiniciar Tudo" para jogar novamente',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 55
      );
    };

    const applyCrater = (
      terrain: number[],
      cx: number,
      radius: number
    ) => {
      const r2 = radius * radius;
      for (
        let x = Math.floor(cx - radius);
        x <= Math.ceil(cx + radius);
        x++
      ) {
        if (x < 0 || x >= CANVAS_WIDTH) continue;
        const dx = x - cx;
        const depth = Math.sqrt(Math.max(0, r2 - dx * dx));
        terrain[x] = Math.min(CANVAS_HEIGHT - 5, terrain[x] + depth * 0.6);
      }
    };

    const gameLoop = () => {
      frameCountRef.current++;
      const gs = gameStateRef.current;

      // Decay visual effects
      shakeRef.current *= 0.9;
      if (shakeRef.current < 0.1) shakeRef.current = 0;
      damageFlashRef.current.p1 *= 0.93;
      damageFlashRef.current.p2 *= 0.93;
      if (muzzleFlashRef.current) {
        muzzleFlashRef.current.alpha *= 0.82;
        if (muzzleFlashRef.current.alpha < 0.01) {
          muzzleFlashRef.current = null;
        }
      }

      if (gs.phase === "firing" && gs.projectile) {
        const proj = gs.projectile;
        proj.trail.push({ x: proj.x, y: proj.y, alpha: 1 });
        if (proj.trail.length > 30) proj.trail.shift();

        proj.x += proj.vx + gs.wind * 0.03;
        proj.vy += GRAVITY;
        proj.y += proj.vy;

        for (const t of proj.trail) {
          t.alpha *= 0.94;
        }

        const oppIdx = gs.currentPlayer === 1 ? 1 : 0;
        const opp = gs.players[oppIdx];
        const dx = proj.x - opp.x;
        const oppY =
          gs.terrain[
            Math.floor(Math.max(0, Math.min(opp.x, CANVAS_WIDTH - 1)))
          ];
        const dy = proj.y - (oppY - 10);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < HIT_RADIUS) {
          opp.health = Math.max(0, opp.health - DAMAGE_AMOUNT);
          gs.explosion = createExplosion(proj.x, proj.y);
          gs.projectile = null;
          gs.hitMessage = "Acertou!";

          // Visual effects for hit
          shakeRef.current = 10;
          if (oppIdx === 0) {
            damageFlashRef.current.p1 = 1;
          } else {
            damageFlashRef.current.p2 = 1;
          }

          if (opp.health <= 0) {
            gs.phase = "gameOver";
            gs.winner = gs.currentPlayer;
            gs.players[gs.currentPlayer - 1].roundsWon += 1;
            const winnerP = gs.players[gs.currentPlayer - 1];
            const score = winnerP.health * 10 + winnerP.roundsWon * 50;
            onScore?.(`Jogador ${gs.currentPlayer}`, score);
            // Init game over sparkles
            gameOverInitedRef.current = false;
          } else {
            gs.phase = "exploding";
          }
          syncUI(gs);
        } else if (
          proj.y >=
            gs.terrain[
              Math.floor(
                Math.max(0, Math.min(proj.x, CANVAS_WIDTH - 1))
              )
            ] ||
          proj.x < -10 ||
          proj.x > CANVAS_WIDTH + 10 ||
          proj.y > CANVAS_HEIGHT + 10
        ) {
          const clampedX = Math.floor(
            Math.max(0, Math.min(proj.x, CANVAS_WIDTH - 1))
          );
          if (proj.x >= 0 && proj.x < CANVAS_WIDTH) {
            applyCrater(gs.terrain, clampedX, CRATER_RADIUS);
          }
          gs.explosion = createExplosion(
            Math.max(0, Math.min(proj.x, CANVAS_WIDTH - 1)),
            Math.min(proj.y, CANVAS_HEIGHT - 5)
          );
          gs.projectile = null;
          gs.hitMessage = "Errou!";
          gs.phase = "exploding";
          shakeRef.current = 5;
          syncUI(gs);
        }
      }

      if (gs.phase === "exploding" && gs.explosion) {
        const exp = gs.explosion;
        exp.frame++;
        exp.shockwaveRadius += 3.5;
        for (const p of exp.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08;
          p.alpha *= 0.95;
          p.vx *= 0.99;
        }
        if (exp.frame >= exp.maxFrames) {
          gs.explosion = null;
          gs.currentPlayer = gs.currentPlayer === 1 ? 2 : 1;
          gs.wind = generateWind();
          gs.turnCount++;
          gs.phase = "aiming";
          setTimeout(() => {
            gs.hitMessage = null;
            syncUI(gs);
          }, 800);
          syncUI(gs);
        }
      }

      // Game over sparkle init & update
      if (gs.phase === "gameOver" && !gameOverInitedRef.current) {
        gameOverInitedRef.current = true;
        gameOverSparklesRef.current = [];
        for (let i = 0; i < 30; i++) {
          gameOverSparklesRef.current.push({
            x: CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 250,
            y: CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 150,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.3 - Math.random() * 0.7,
            alpha: 0.5 + Math.random() * 0.5,
            size: 1 + Math.random() * 2.5,
          });
        }
      }
      for (const sp of gameOverSparklesRef.current) {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.alpha *= 0.997;
        sp.alpha += Math.sin(frameCountRef.current * 0.05 + sp.x * 0.1) * 0.01;
        sp.alpha = Math.max(0, Math.min(1, sp.alpha));
      }

      // Smooth health interpolation
      displayHealthRef.current.p1 +=
        (gs.players[0].health - displayHealthRef.current.p1) * 0.12;
      displayHealthRef.current.p2 +=
        (gs.players[1].health - displayHealthRef.current.p2) * 0.12;

      // ---- DRAWING ----
      const p1 = gs.players[0];
      const p2 = gs.players[1];
      const p1TerrainY =
        gs.terrain[
          Math.floor(Math.max(0, Math.min(p1.x, CANVAS_WIDTH - 1)))
        ];
      const p2TerrainY =
        gs.terrain[
          Math.floor(Math.max(0, Math.min(p2.x, CANVAS_WIDTH - 1)))
        ];

      const p1CannonAngle =
        gs.currentPlayer === 1 && gs.phase === "aiming" ? angle : 45;
      const p2CannonAngle =
        gs.currentPlayer === 2 && gs.phase === "aiming" ? angle : 45;

      // Apply screen shake
      ctx.save();
      if (shakeRef.current > 0.1) {
        const shakeX = (Math.random() - 0.5) * shakeRef.current * 2;
        const shakeY = (Math.random() - 0.5) * shakeRef.current * 2;
        ctx.translate(shakeX, shakeY);
      }

      ctx.clearRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20);
      drawSky();
      drawWindStreaks(gs.wind);
      drawTerrain(gs.terrain);
      drawTrajectoryPreview(gs);

      const p1Active = gs.currentPlayer === 1 && gs.phase === "aiming";
      const p2Active = gs.currentPlayer === 2 && gs.phase === "aiming";
      drawCannon(p1.x, p1TerrainY, p1CannonAngle, "#22d3ee", true, p1Active);
      drawCannon(p2.x, p2TerrainY, p2CannonAngle, "#f472b6", false, p2Active);

      drawMuzzleFlash();

      drawHealthBar(p1.x, p1TerrainY - 30, displayHealthRef.current.p1, 0);
      drawHealthBar(p2.x, p2TerrainY - 30, displayHealthRef.current.p2, 1);

      if (p1Active) {
        ctx.fillStyle = "rgba(34,211,238,0.7)";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("J1", p1.x, p1TerrainY - 36);
      } else if (p2Active) {
        ctx.fillStyle = "rgba(244,114,182,0.7)";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("J2", p2.x, p2TerrainY - 36);
      }

      if (gs.projectile) {
        drawProjectile(gs.projectile);
      }

      if (gs.explosion) {
        drawExplosion(gs.explosion);
      }

      ctx.restore(); // End screen shake

      // HUD elements (not shaken)
      drawWindIndicator(gs.wind);

      if (gs.hitMessage && gs.phase !== "gameOver") {
        const msgColor =
          gs.hitMessage === "Acertou!"
            ? gs.currentPlayer === 1
              ? "#22d3ee"
              : "#f472b6"
            : "#ef4444";
        drawHitMessage(gs.hitMessage, msgColor);
      }

      if (gs.phase === "gameOver" && gs.winner) {
        drawGameOver(gs.winner);
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [angle, power, onScore, syncUI]);

  const resetGame = useCallback(() => {
    gameStateRef.current = initGameState();
    setAngle(45);
    setPower(50);
    shakeRef.current = 0;
    damageFlashRef.current = { p1: 0, p2: 0 };
    muzzleFlashRef.current = null;
    displayHealthRef.current = { p1: 100, p2: 100 };
    gameOverSparklesRef.current = [];
    gameOverInitedRef.current = false;
    windStreaksRef.current = initWindStreaks();
    const gs = gameStateRef.current;
    syncUI(gs);
  }, [syncUI]);

  const heartsP1 = Math.ceil(healthP1 / 34);
  const heartsP2 = Math.ceil(healthP2 / 34);
  const maxHearts = 3;

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[700px] mx-auto select-none">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold text-sm">Jogador 1</span>
          <div className="flex gap-0.5">
            {Array.from({ length: maxHearts }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ scale: i < heartsP1 ? [1, 1.25, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                <Heart
                  className={cn(
                    "w-3.5 h-3.5",
                    i < heartsP1
                      ? "text-red-500 fill-red-500"
                      : "text-gray-600"
                  )}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <h2 className="text-white font-bold text-base tracking-wider">
          BATALHA DE CANHÕES
        </h2>

        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: maxHearts }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ scale: i < heartsP2 ? [1, 1.25, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                <Heart
                  className={cn(
                    "w-3.5 h-3.5",
                    i < heartsP2
                      ? "text-red-500 fill-red-500"
                      : "text-gray-600"
                  )}
                />
              </motion.div>
            ))}
          </div>
          <span className="text-pink-400 font-bold text-sm">Jogador 2</span>
        </div>
      </motion.div>

      <div className="w-full flex items-center justify-between px-2">
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-semibold px-3 py-1 transition-colors",
            currentPlayer === 1
              ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10"
              : "border-pink-500/50 text-pink-400 bg-pink-500/10"
          )}
        >
          Turno: Jogador {currentPlayer}
        </Badge>
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 text-xs border-white/20 text-white/70 bg-white/5"
        >
          <Wind className="w-3 h-3" />
          Vento: {wind > 0 ? "→" : "←"}
          {Math.abs(wind) > 1.5 ? (wind > 0 ? "→" : "←") : ""}{" "}
          {Math.abs(wind).toFixed(1)}
        </Badge>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full relative rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
        style={{ maxWidth: CANVAS_WIDTH }}
      >
        <div
          className="w-full"
          style={{ paddingBottom: `${(CANVAS_HEIGHT / CANVAS_WIDTH) * 100}%` }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {hitMessage && phase !== "gameOver" && (
          <motion.div
            key={hitMessage}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className={cn(
              "text-lg font-bold px-4 py-1 rounded-full",
              hitMessage === "Acertou!"
                ? currentPlayer === 1
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            )}
          >
            {hitMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "aiming" && (
          <motion.div
            key={`controls-${currentPlayer}`}
            initial={{
              opacity: 0,
              x: currentPlayer === 1 ? -20 : 20,
            }}
            animate={{ opacity: 1, x: 0 }}
            exit={{
              opacity: 0,
              x: currentPlayer === 1 ? 20 : -20,
            }}
            className="w-full flex flex-col gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="flex items-center gap-3">
              <Crosshair
                className={cn(
                  "w-4 h-4 shrink-0",
                  currentPlayer === 1
                    ? "text-cyan-400"
                    : "text-pink-400"
                )}
              />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white/70 text-xs font-medium">
                    Ângulo
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      currentPlayer === 1
                        ? "text-cyan-400"
                        : "text-pink-400"
                    )}
                  >
                    {angle}°
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={180}
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  disabled={phase !== "aiming"}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  style={{
                    background: `linear-gradient(to right, ${currentPlayer === 1 ? "#22d3ee" : "#f472b6"} 0%, ${currentPlayer === 1 ? "#22d3ee" : "#f472b6"} ${(angle / 180) * 100}%, #333 ${(angle / 180) * 100}%, #333 100%)`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Zap
                className={cn(
                  "w-4 h-4 shrink-0",
                  currentPlayer === 1
                    ? "text-cyan-400"
                    : "text-pink-400"
                )}
              />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white/70 text-xs font-medium">
                    Força
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      currentPlayer === 1
                        ? "text-cyan-400"
                        : "text-pink-400"
                    )}
                  >
                    {power}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={power}
                  onChange={(e) => setPower(Number(e.target.value))}
                  disabled={phase !== "aiming"}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  style={{
                    background: `linear-gradient(to right, #f97316 0%, #f97316 ${((power - 10) / 90) * 100}%, #333 ${((power - 10) / 90) * 100}%, #333 100%)`,
                  }}
                />
              </div>
            </div>

            <motion.div whileTap={{ scale: 0.95 }} className="w-full">
              <Button
                onClick={fire}
                disabled={phase !== "aiming"}
                className={cn(
                  "w-full h-12 text-lg font-bold rounded-xl transition-all",
                  currentPlayer === 1
                    ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                    : "bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/25"
                )}
              >
                <Zap className="w-5 h-5 mr-2" />
                FOGO!
              </Button>
            </motion.div>

            <p className="text-white/30 text-[10px] text-center">
              Teclas: A/D = Ângulo | W/S = Força | Espaço = Fogo!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "gameOver" && winner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <motion.div
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className={cn(
                "text-center py-5 rounded-xl font-bold mb-3 relative overflow-hidden",
                winner === 1
                  ? "bg-gradient-to-br from-cyan-500/20 to-cyan-900/30 text-cyan-400 border border-cyan-500/30"
                  : "bg-gradient-to-br from-pink-500/20 to-pink-900/30 text-pink-400 border border-pink-500/30"
              )}
            >
              <motion.div
                initial={{ rotate: -15, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="flex justify-center mb-2"
              >
                <Trophy
                  className={cn(
                    "w-8 h-8",
                    winner === 1
                      ? "text-cyan-400"
                      : "text-pink-400"
                  )}
                />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl block"
              >
                Jogador {winner} Venceu!
              </motion.span>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5 }}
                className={cn(
                  "h-px w-24 mx-auto mt-2",
                  winner === 1 ? "bg-cyan-500/40" : "bg-pink-500/40"
                )}
              />
            </motion.div>
            <Button
              onClick={resetGame}
              variant="outline"
              className="w-full border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reiniciar Tudo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {(phase === "firing" || phase === "exploding") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white/40 text-xs"
        >
          Aguardando...
        </motion.div>
      )}

      {phase !== "gameOver" && (
        <Button
          onClick={resetGame}
          variant="ghost"
          size="sm"
          className="text-white/30 hover:text-white/60 hover:bg-white/5"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reiniciar Tudo
        </Button>
      )}

      <span className="text-white/10 text-[10px]">
        Vida: {Math.round(healthP1)}% vs {Math.round(healthP2)}% | Turno #{turnCount}
      </span>
    </div>
  );
}
