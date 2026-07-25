"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RotateCcw, Wind, Crosshair } from "lucide-react";

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
  const colors = ["#ff6600", "#ff9900", "#ffcc00", "#ff3300", "#ffffff"];
  for (let i = 0; i < 20; i++) {
    const ang = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed - 2,
      size: 2 + Math.random() * 4,
      alpha: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  return { x, y, frame: 0, maxFrames: 40, particles };
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

export default function CannonBattle({ onScore, liveCode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>(initGameState());
  const animFrameRef = useRef<number>(0);

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

    const drawSky = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, "#0a0a2e");
      grad.addColorStop(0.5, "#1a1040");
      grad.addColorStop(1, "#0d1b2a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      for (let i = 0; i < 60; i++) {
        const sx = (i * 137 + 42 * 31) % CANVAS_WIDTH;
        const sy = (i * 89 + 42 * 17) % Math.floor(CANVAS_HEIGHT * 0.5);
        const brightness = 0.3 + (i % 5) * 0.15;
        ctx.fillStyle = `rgba(255,255,255,${brightness})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5 + (i % 3) * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawTerrain = (terrain: number[]) => {
      const grad = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.4, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, "#2d5016");
      grad.addColorStop(0.3, "#3a6b1e");
      grad.addColorStop(0.6, "#4a3728");
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

      ctx.strokeStyle = "#4a8a2a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        if (x === 0) ctx.moveTo(x, terrain[x]);
        else ctx.lineTo(x, terrain[x]);
      }
      ctx.stroke();
    };

    const drawCannon = (
      playerX: number,
      terrainY: number,
      cannonAngle: number,
      color: string,
      isP1: boolean
    ) => {
      const bodyW = 24;
      const bodyH = 10;
      const bodyX = playerX - bodyW / 2;
      const bodyY = terrainY - bodyH;

      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const r = 2;
      ctx.moveTo(bodyX + r, bodyY);
      ctx.lineTo(bodyX + bodyW - r, bodyY);
      ctx.quadraticCurveTo(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + r);
      ctx.lineTo(bodyX + bodyW, bodyY + bodyH - r);
      ctx.quadraticCurveTo(bodyX + bodyW, bodyY + bodyH, bodyX + bodyW - r, bodyY + bodyH);
      ctx.lineTo(bodyX + r, bodyY + bodyH);
      ctx.quadraticCurveTo(bodyX, bodyY + bodyH, bodyX, bodyY + bodyH - r);
      ctx.lineTo(bodyX, bodyY + r);
      ctx.quadraticCurveTo(bodyX, bodyY, bodyX + r, bodyY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const wheelR = 5;
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.arc(bodyX + 5, terrainY, wheelR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bodyX + bodyW - 5, terrainY, wheelR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#888";
      ctx.beginPath();
      ctx.arc(bodyX + 5, terrainY, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bodyX + bodyW - 5, terrainY, 2, 0, Math.PI * 2);
      ctx.fill();

      const barrelLen = 18;
      const barrelW = 4;
      const pivotX = playerX;
      const pivotY = bodyY;
      const rad = (cannonAngle * Math.PI) / 180;
      const dir = isP1 ? 1 : -1;
      const endX = pivotX + Math.cos(rad) * barrelLen * dir;
      const endY = pivotY - Math.sin(rad) * barrelLen;

      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(-rad * dir);
      ctx.fillStyle = color;
      ctx.fillRect(0, -barrelW / 2, barrelLen * dir, barrelW);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.strokeRect(0, -barrelW / 2, barrelLen * dir, barrelW);
      ctx.restore();

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(endX, endY, 2, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawHealthBar = (x: number, y: number, health: number) => {
      const barW = 40;
      const barH = 5;
      const bx = x - barW / 2;

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(bx - 1, y - 1, barW + 2, barH + 2);
      ctx.fillStyle = "#333";
      ctx.fillRect(bx, y, barW, barH);

      const healthPct = Math.max(0, health) / 100;
      const hColor =
        healthPct > 0.5 ? "#22c55e" : healthPct > 0.25 ? "#eab308" : "#ef4444";
      ctx.fillStyle = hColor;
      ctx.fillRect(bx, y, barW * healthPct, barH);

      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, y, barW, barH);
    };

    const drawWindIndicator = (windVal: number) => {
      const cx = CANVAS_WIDTH / 2;
      const cy = 25;

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VENTO", cx, cy - 8);

      const arrowLen = Math.abs(windVal) * 10;
      const dir = windVal > 0 ? 1 : -1;
      const startX = cx - (arrowLen / 2) * dir;
      const endX = cx + (arrowLen / 2) * dir;

      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, cy);
      ctx.lineTo(endX, cy);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(endX, cy);
      ctx.lineTo(endX - 6 * dir, cy - 4);
      ctx.moveTo(endX, cy);
      ctx.lineTo(endX - 6 * dir, cy + 4);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "10px sans-serif";
      ctx.fillText(windVal.toFixed(1), cx, cy + 14);
    };

    const drawProjectile = (proj: Projectile) => {
      for (let i = 0; i < proj.trail.length; i++) {
        const t = proj.trail[i];
        const alpha = t.alpha * (i / proj.trail.length) * 0.8;
        const sz = 1 + (i / proj.trail.length) * 2;
        ctx.fillStyle = `rgba(255,200,50,${alpha})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, sz, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#ffe066";
      ctx.shadowColor = "#ff8800";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawExplosion = (exp: Explosion) => {
      const progress = exp.frame / exp.maxFrames;
      const baseRadius = 5 + progress * 25;

      const grad = ctx.createRadialGradient(
        exp.x, exp.y, 0,
        exp.x, exp.y, baseRadius
      );
      grad.addColorStop(0, `rgba(255,255,200,${1 - progress})`);
      grad.addColorStop(0.4, `rgba(255,150,0,${0.7 - progress * 0.7})`);
      grad.addColorStop(0.7, `rgba(255,50,0,${0.5 - progress * 0.5})`);
      grad.addColorStop(1, "rgba(100,0,0,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      for (const p of exp.particles) {
        if (p.color.startsWith("#")) {
          const r = parseInt(p.color.slice(1, 3), 16);
          const g = parseInt(p.color.slice(3, 5), 16);
          const b = parseInt(p.color.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
        } else {
          ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawHitMessage = (msg: string, playerColor: string) => {
      if (!msg) return;
      ctx.fillStyle = playerColor;
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 6;
      ctx.fillText(msg, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.4);
      ctx.shadowBlur = 0;
    };

    const drawGameOver = (winnerNum: 1 | 2) => {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const color = winnerNum === 1 ? "#22d3ee" : "#f472b6";
      ctx.fillStyle = color;
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fillText(
        `🎉 Jogador ${winnerNum} Venceu! 🎉`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 10
      );
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "14px sans-serif";
      ctx.fillText(
        'Clique em "Reiniciar Tudo" para jogar novamente',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 20
      );
    };

    const applyCrater = (
      terrain: number[],
      cx: number,
      radius: number
    ) => {
      const r2 = radius * radius;
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        if (x < 0 || x >= CANVAS_WIDTH) continue;
        const dx = x - cx;
        const depth = Math.sqrt(Math.max(0, r2 - dx * dx));
        terrain[x] = Math.min(CANVAS_HEIGHT - 5, terrain[x] + depth * 0.6);
      }
    };

    const gameLoop = () => {
      const gs = gameStateRef.current;

      if (gs.phase === "firing" && gs.projectile) {
        const proj = gs.projectile;
        proj.trail.push({ x: proj.x, y: proj.y, alpha: 1 });
        if (proj.trail.length > 25) proj.trail.shift();

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

          if (opp.health <= 0) {
            gs.phase = "gameOver";
            gs.winner = gs.currentPlayer;
            gs.players[gs.currentPlayer - 1].roundsWon += 1;
            const winnerP = gs.players[gs.currentPlayer - 1];
            const score = winnerP.health * 10 + winnerP.roundsWon * 50;
            onScore?.(`Jogador ${gs.currentPlayer}`, score);
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
          syncUI(gs);
        }
      }

      if (gs.phase === "exploding" && gs.explosion) {
        const exp = gs.explosion;
        exp.frame++;
        for (const p of exp.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08;
          p.alpha *= 0.95;
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

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawSky();
      drawTerrain(gs.terrain);
      drawWindIndicator(gs.wind);

      drawCannon(p1.x, p1TerrainY, p1CannonAngle, "#22d3ee", true);
      drawCannon(p2.x, p2TerrainY, p2CannonAngle, "#f472b6", false);

      drawHealthBar(p1.x, p1TerrainY - 30, p1.health);
      drawHealthBar(p2.x, p2TerrainY - 30, p2.health);

      if (gs.currentPlayer === 1 && gs.phase === "aiming") {
        ctx.fillStyle = "rgba(34,211,238,0.6)";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("J1", p1.x, p1TerrainY - 36);
      } else if (gs.currentPlayer === 2 && gs.phase === "aiming") {
        ctx.fillStyle = "rgba(244,114,182,0.6)";
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
  }, [angle, onScore, syncUI]);

  const resetGame = useCallback(() => {
    gameStateRef.current = initGameState();
    setAngle(45);
    setPower(50);
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
              <motion.span
                key={i}
                animate={{ scale: i < heartsP1 ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
                className={i < heartsP1 ? "text-red-500" : "text-gray-600"}
              >
                {i < heartsP1 ? "\u2764\uFE0F" : "\u2661"}
              </motion.span>
            ))}
          </div>
        </div>

        <h2 className="text-white font-bold text-base tracking-wider">
          BATALHA DE CANH\u00D5ES
        </h2>

        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: maxHearts }).map((_, i) => (
              <motion.span
                key={i}
                animate={{ scale: i < heartsP2 ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
                className={i < heartsP2 ? "text-red-500" : "text-gray-600"}
              >
                {i < heartsP2 ? "\u2764\uFE0F" : "\u2661"}
              </motion.span>
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
          Vento: {wind > 0 ? "\u2192" : "\u2190"}
          {Math.abs(wind) > 1.5 ? (wind > 0 ? "\u2192" : "\u2190") : ""}{" "}
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
                    \u00C2ngulo
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      currentPlayer === 1
                        ? "text-cyan-400"
                        : "text-pink-400"
                    )}
                  >
                    {angle}\u00B0
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
              <span
                className={cn(
                  "text-sm shrink-0 w-4 text-center font-bold",
                  currentPlayer === 1
                    ? "text-cyan-400"
                    : "text-pink-400"
                )}
              >
                💥
              </span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white/70 text-xs font-medium">
                    For\u00E7a
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
                    ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                    : "bg-pink-600 hover:bg-pink-500 text-white"
                )}
              >
                🔥 FOGO!
              </Button>
            </motion.div>

            <p className="text-white/30 text-[10px] text-center">
              Teclas: A/D = \u00C2ngulo | W/S = For\u00E7a | Espa\u00E7o = Fogo!
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
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={cn(
                "text-center py-4 rounded-xl font-bold text-xl mb-3",
                winner === 1
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-pink-500/20 text-pink-400 border border-pink-500/30"
              )}
            >
              🏆 Jogador {winner} Venceu! 🏆
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
        Vida: {healthP1}% vs {healthP2}% | Turno #{turnCount}
      </span>
    </div>
  );
}
