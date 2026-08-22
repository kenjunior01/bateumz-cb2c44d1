import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Coins, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  brightness: number;
  layer: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  phase: number;
}

interface Bullet {
  x: number;
  y: number;
  speed: number;
  owner: 1 | 2;
  trail: Array<{ x: number; y: number }>;
}

interface Enemy {
  x: number;
  y: number;
  speed: number;
  size: number;
  type: "triangle" | "diamond";
  color: string;
  hp: number;
  bonus: boolean;
  rotation: number;
  rotSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  prevX: number;
  prevY: number;
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

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface PlayerState {
  x: number;
  y: number;
  score: number;
  lives: number;
  color: string;
  bulletColor: string;
  shootCooldown: number;
  invincible: number;
  name: string;
  damageFlash: number;
}

const CANVAS_W = 600;
const CANVAS_H = 500;
const SHIP_SIZE = 18;
const BULLET_SPEED = 7;
const BULLET_COOLDOWN = 12;
const PLAYER_SPEED = 5;
const STAR_COUNT = 180;
const INITIAL_ENEMY_INTERVAL = 60;
const MIN_ENEMY_INTERVAL = 15;
const INITIAL_ENEMY_SPEED = 1.5;
const MAX_ENEMY_SPEED = 4.5;
const BONUS_CHANCE = 0.08;
const WAVE_DURATION = 900;
const POINTS_NORMAL = 10;
const POINTS_BONUS = 30;

const createStars = (): Star[] => {
  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const layer = i < 60 ? 0 : i < 120 ? 1 : 2;
    stars.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      speed: (0.1 + Math.random() * 0.4) + layer * 0.5,
      size: 0.3 + layer * 0.5 + Math.random() * (0.5 + layer * 0.4),
      brightness: 0.2 + layer * 0.2 + Math.random() * (0.4 + layer * 0.15),
      layer,
    });
  }
  return stars;
};

const createNebulae = (): Nebula[] => [
  { x: CANVAS_W * 0.2, y: CANVAS_H * 0.3, radius: 120, color: "30, 64, 175", speed: 0.15, phase: 0 },
  { x: CANVAS_W * 0.75, y: CANVAS_H * 0.6, radius: 100, color: "147, 51, 234", speed: 0.1, phase: 2 },
  { x: CANVAS_W * 0.5, y: CANVAS_H * 0.15, radius: 80, color: "6, 182, 212", speed: 0.12, phase: 4 },
];

interface FloatingText {
  x: number; y: number; text: string; color: string; life: number; maxLife: number; vy: number; }

const createExplosion = (x: number, y: number, color: string, isBonus: boolean = false): Particle[] => {
  const count = isBonus ? 40 : 18;
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = (isBonus ? 2 : 1) + Math.random() * (isBonus ? 5 : 3.5);
    const isSpark = Math.random() < 0.3;
    return {
      x, y,
      vx: Math.cos(angle) * speed * (isSpark ? 1.5 : 1),
      vy: Math.sin(angle) * speed * (isSpark ? 1.5 : 1),
      life: (isBonus ? 35 : 20) + Math.random() * 25,
      maxLife: isBonus ? 60 : 45,
      color: isBonus
        ? ["#fbbf24", "#fef08a", "#f59e0b", "#ffffff"][Math.floor(Math.random() * 4)]
        : isSpark
          ? "#ffffff"
          : color,
      size: isSpark ? 1 : (isBonus ? 2 : 1.5) + Math.random() * (isBonus ? 4 : 2.5),
    };
  });
};

const createShockwave = (x: number, y: number, color: string, isBonus: boolean): Shockwave => ({
  x, y,
  radius: 0,
  maxRadius: isBonus ? 60 : 35,
  life: isBonus ? 25 : 15,
  maxLife: isBonus ? 25 : 15,
  color,
});

const createScoreText = (x: number, y: number, points: number, isBonus: boolean): FloatingText => ({
  x, y, text: `+${points}`, color: isBonus ? '#fbbf24' : '#ffffff', life: 40, maxLife: 40, vy: -1.5,
});

interface GameState {
  players: PlayerState[];
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  shockwaves: Shockwave[];
  stars: Star[];
  nebulae: Nebula[];
  keys: Set<string>;
  frame: number;
  wave: number;
  waveFrame: number;
  running: boolean;
  screenFlash: number;
  killStreaks: [number, number];
  animId: number;
  shakeX: number;
  shakeY: number;
  shakeMagnitude: number;
  vignettePulse: number;
}

const SpaceShooter = ({ onScore, liveCode }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const touchRef = useRef<Record<string, boolean>>({});

  const [gameStatus, setGameStatus] = useState<"idle" | "playing" | "over">("idle");
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [lives, setLives] = useState({ p1: 3, p2: 3 });
  const [wave, setWave] = useState(1);
  const [winner, setWinner] = useState<string | null>(null);
  const [forceTick, setForceTick] = useState(0);
  const [shakeStyle, setShakeStyle] = useState({ x: 0, y: 0 });

  const triggerUI = () => setForceTick((t) => t + 1);

  const endGame = useCallback(
    (p1Score: number, p2Score: number) => {
      setGameStatus("over");
      setScores({ p1: p1Score, p2: p2Score });
      const w = p1Score > p2Score ? "Jogador 1" : p2Score > p1Score ? "Jogador 2" : null;
      setWinner(w);
      onScore?.("Jogador 1", p1Score);
      onScore?.("Jogador 2", p2Score);
      setShakeStyle({ x: 0, y: 0 });
    },
    [onScore]
  );

  const spawnEnemy = useCallback((g: GameState) => {
    const waveMultiplier = 1 + (g.wave - 1) * 0.15;
    const speed = Math.min(INITIAL_ENEMY_SPEED * waveMultiplier + Math.random() * 0.8, MAX_ENEMY_SPEED);
    const isBonus = Math.random() < BONUS_CHANCE + g.wave * 0.005;
    const type = Math.random() < 0.5 ? ("triangle" as const) : ("diamond" as const);

    g.enemies.push({
      x: 30 + Math.random() * (CANVAS_W - 60),
      y: -20,
      speed,
      size: isBonus ? 16 : 12 + Math.random() * 6,
      type,
      color: isBonus ? "#fbbf24" : Math.random() < 0.5 ? "#ef4444" : "#f97316",
      hp: 1,
      bonus: isBonus,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.06,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      prevX: 30 + Math.random() * (CANVAS_W - 60),
      prevY: -20,
    });
  }, []);

  const gameLoop = useCallback(
    (g: GameState) => {
      const canvas = canvasRef.current;
      if (!canvas || !g.running) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      g.frame++;
      g.waveFrame++;

      if (g.waveFrame >= WAVE_DURATION) {
        g.wave++;
        g.waveFrame = 0;
        setWave(g.wave);
      }

      const spawnInterval = Math.max(MIN_ENEMY_INTERVAL, INITIAL_ENEMY_INTERVAL - (g.wave - 1) * 5);
      if (g.frame % Math.round(spawnInterval) === 0) {
        const count = g.wave >= 5 ? 2 : 1;
        for (let i = 0; i < count; i++) spawnEnemy(g);
      }

      const keys = new Set(g.keys);
      for (const [k, v] of Object.entries(touchRef.current)) {
        if (v) keys.add(k);
      }

      const p1 = g.players[0];
      const p2 = g.players[1];

      if (keys.has("a") || keys.has("A")) p1.x = Math.max(SHIP_SIZE, p1.x - PLAYER_SPEED);
      if (keys.has("d") || keys.has("D")) p1.x = Math.min(CANVAS_W - SHIP_SIZE, p1.x + PLAYER_SPEED);
      if (p1.shootCooldown > 0) p1.shootCooldown--;
      if (
        (keys.has("w") || keys.has("W") || keys.has("p1shoot")) &&
        p1.shootCooldown <= 0 &&
        p1.lives > 0
      ) {
        g.bullets.push({ x: p1.x, y: p1.y - SHIP_SIZE, speed: BULLET_SPEED, owner: 1, trail: [] });
        p1.shootCooldown = BULLET_COOLDOWN;
      }
      if (p1.invincible > 0) p1.invincible--;
      if (p1.damageFlash > 0) p1.damageFlash--;

      if (keys.has("ArrowLeft")) p2.x = Math.max(SHIP_SIZE, p2.x - PLAYER_SPEED);
      if (keys.has("ArrowRight")) p2.x = Math.min(CANVAS_W - SHIP_SIZE, p2.x + PLAYER_SPEED);
      if (p2.shootCooldown > 0) p2.shootCooldown--;
      if (
        (keys.has("ArrowUp") || keys.has("p2shoot")) &&
        p2.shootCooldown <= 0 &&
        p2.lives > 0
      ) {
        g.bullets.push({ x: p2.x, y: p2.y - SHIP_SIZE, speed: BULLET_SPEED, owner: 2, trail: [] });
        p2.shootCooldown = BULLET_COOLDOWN;
      }
      if (p2.invincible > 0) p2.invincible--;
      if (p2.damageFlash > 0) p2.damageFlash--;

      // Screen shake decay
      if (g.shakeMagnitude > 0.3) {
        g.shakeX = (Math.random() - 0.5) * g.shakeMagnitude * 2;
        g.shakeY = (Math.random() - 0.5) * g.shakeMagnitude * 2;
        g.shakeMagnitude *= 0.88;
      } else {
        g.shakeX = 0;
        g.shakeY = 0;
        g.shakeMagnitude = 0;
      }
      if (g.shakeMagnitude > 0.5) {
        setShakeStyle({ x: g.shakeX, y: g.shakeY });
      }

      g.bullets = g.bullets.filter((b) => {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 5) b.trail.shift();
        b.y -= b.speed;
        return b.y > -10;
      });

      g.enemies = g.enemies.filter((e) => {
        e.prevX = e.x;
        e.prevY = e.y;
        e.y += e.speed;
        e.rotation += e.rotSpeed;
        e.wobble += e.wobbleSpeed;
        e.x += Math.sin(e.wobble) * 0.5;
        e.x = Math.max(e.size, Math.min(CANVAS_W - e.size, e.x));

        if (e.y > CANVAS_H + 10) {
          const midX = CANVAS_W / 2;
          if (e.x < midX) {
            if (p1.lives > 0 && p1.invincible <= 0) {
              p1.lives--;
              p1.invincible = 60;
              p1.damageFlash = 12;
              g.shakeMagnitude = 6;
              setLives({ p1: p1.lives, p2: p2.lives });
            }
          } else {
            if (p2.lives > 0 && p2.invincible <= 0) {
              p2.lives--;
              p2.invincible = 60;
              p2.damageFlash = 12;
              g.shakeMagnitude = 6;
              setLives({ p1: p1.lives, p2: p2.lives });
            }
          }
          return false;
        }
        return true;
      });

      const bulletsToRemove = new Set<number>();
      const enemiesToRemove = new Set<number>();
      let scoreChanged = false;

      for (let bi = 0; bi < g.bullets.length; bi++) {
        const b = g.bullets[bi];
        for (let ei = 0; ei < g.enemies.length; ei++) {
          if (enemiesToRemove.has(ei)) continue;
          const e = g.enemies[ei];
          const dx = b.x - e.x;
          const dy = b.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < e.size + 4) {
            e.hp--;
            bulletsToRemove.add(bi);
            if (e.hp <= 0) {
              enemiesToRemove.add(ei);
              const isBonus = e.bonus;
              const pts = isBonus ? POINTS_BONUS : POINTS_NORMAL;
              const streakIdx = b.owner === 1 ? 0 : 1;
              g.killStreaks[streakIdx]++;
              const streak = g.killStreaks[streakIdx];
              const streakBonus = streak >= 10 ? 3 : streak >= 5 ? 2 : 0;
              const totalPts = pts + streakBonus * 5;
              if (b.owner === 1) p1.score += totalPts;
              else p2.score += totalPts;
              g.particles.push(...createExplosion(e.x, e.y, e.color, isBonus));
              g.shockwaves.push(createShockwave(e.x, e.y, e.color, isBonus));
              g.floatingTexts.push(createScoreText(e.x, e.y - 10, totalPts, isBonus));
              if (isBonus) {
                g.screenFlash = 10;
                g.vignettePulse = 15;
              }
              scoreChanged = true;
            }
            break;
          }
        }
      }

      if (scoreChanged) {
        setScores({ p1: p1.score, p2: p2.score });
      }

      g.bullets = g.bullets.filter((_, i) => !bulletsToRemove.has(i));
      g.enemies = g.enemies.filter((_, i) => !enemiesToRemove.has(i));

      g.particles = g.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.vx *= 0.98;
        p.life--;
        return p.life > 0;
      });

      g.shockwaves = g.shockwaves.filter((sw) => {
        sw.radius += (sw.maxRadius - sw.radius) * 0.15;
        sw.life--;
        return sw.life > 0;
      });

      g.floatingTexts = g.floatingTexts.filter((ft) => {
        ft.y += ft.vy;
        ft.life--;
        return ft.life > 0;
      });

      if (g.screenFlash > 0) g.screenFlash--;
      if (g.vignettePulse > 0) g.vignettePulse--;

      g.stars.forEach((s) => {
        s.y += s.speed;
        if (s.y > CANVAS_H) {
          s.y = -2;
          s.x = Math.random() * CANVAS_W;
        }
      });

      g.nebulae.forEach((n) => {
        n.y += n.speed;
        n.phase += 0.005;
        if (n.y > CANVAS_H + n.radius) {
          n.y = -n.radius;
          n.x = Math.random() * CANVAS_W;
        }
      });

      if (p1.lives <= 0 && p2.lives <= 0) {
        g.running = false;
        endGame(p1.score, p2.score);
        return;
      }

      // === RENDERING ===
      ctx.save();
      ctx.translate(g.shakeX, g.shakeY);

      // Background
      ctx.fillStyle = "#030712";
      ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

      // Nebulae
      g.nebulae.forEach((n) => {
        const pulseFactor = 1 + Math.sin(n.phase) * 0.15;
        const r = n.radius * pulseFactor;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
        grad.addColorStop(0, `rgba(${n.color}, 0.06)`);
        grad.addColorStop(0.5, `rgba(${n.color}, 0.03)`);
        grad.addColorStop(1, `rgba(${n.color}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Stars with parallax layers
      const layerColors = ["#94a3b8", "#cbd5e1", "#ffffff"];
      g.stars.forEach((s) => {
        const twinkle = 0.6 + 0.4 * Math.sin(g.frame * 0.02 * (s.layer + 1) + s.x * 0.1);
        const alpha = s.brightness * twinkle;
        const col = layerColors[s.layer];
        ctx.fillStyle = col;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        // Star glow for brighter/larger stars
        if (s.size > 1.2 && s.layer === 2) {
          ctx.globalAlpha = alpha * 0.15;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Center divider
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.setLineDash([4, 12]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2, 0);
      ctx.lineTo(CANVAS_W / 2, CANVAS_H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Enemy afterimage trails + enemies
      g.enemies.forEach((e) => {
        ctx.save();
        // Afterimage trail
        ctx.globalAlpha = 0.12;
        ctx.translate(e.prevX, e.prevY);
        ctx.rotate(e.rotation);
        ctx.fillStyle = e.color;
        drawEnemyShape(ctx, e);
        ctx.restore();

        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rotation);

        if (e.bonus) {
          const glowSize = e.size + 8 + Math.sin(g.frame * 0.1) * 4;
          const glow = ctx.createRadialGradient(0, 0, e.size * 0.2, 0, 0, glowSize);
          glow.addColorStop(0, "rgba(251, 191, 36, 0.5)");
          glow.addColorStop(0.5, "rgba(251, 191, 36, 0.15)");
          glow.addColorStop(1, "rgba(251, 191, 36, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
          ctx.fill();

          // Rotating sparkle ring
          const sparkleAngle = g.frame * 0.15;
          for (let i = 0; i < 6; i++) {
            const a = sparkleAngle + (i * Math.PI) / 3;
            const dist = e.size + 10 + Math.sin(g.frame * 0.2 + i) * 3;
            const sx = Math.cos(a) * dist;
            const sy = Math.sin(a) * dist;
            const sparkSize = 1 + Math.sin(g.frame * 0.3 + i * 1.5) * 0.5;
            ctx.fillStyle = "rgba(255, 255, 200, 0.9)";
            ctx.beginPath();
            ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Subtle inner glow for normal enemies
          const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, e.size * 1.2);
          innerGlow.addColorStop(0, e.color + "30");
          innerGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = innerGlow;
          ctx.beginPath();
          ctx.arc(0, 0, e.size * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = e.color;
        ctx.strokeStyle = e.bonus ? "#fef08a" : "rgba(255,200,200,0.6)";
        ctx.lineWidth = 1.5;
        drawEnemyShape(ctx, e);

        // Inner highlight
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.arc(-e.size * 0.2, -e.size * 0.2, e.size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Shockwaves
      g.shockwaves.forEach((sw) => {
        const alpha = sw.life / sw.maxLife;
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = alpha * 0.6;
        ctx.lineWidth = 2 * alpha;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        // Inner ring
        ctx.globalAlpha = alpha * 0.2;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // Bullets with trails
      g.bullets.forEach((b) => {
        const player = b.owner === 1 ? p1 : p2;
        // Trail
        b.trail.forEach((t, i) => {
          const a = (i / b.trail.length) * 0.3;
          ctx.globalAlpha = a;
          ctx.fillStyle = player.bulletColor;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Outer glow
        const bGlow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 8);
        bGlow.addColorStop(0, player.bulletColor + "80");
        bGlow.addColorStop(0.5, player.bulletColor + "20");
        bGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = bGlow;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Elongated bullet core
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 1.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = player.bulletColor;
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 2.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      const drawShip = (p: PlayerState) => {
        if (p.lives <= 0) return;
        if (p.invincible > 0 && Math.floor(p.invincible / 3) % 2 === 0) return;

        ctx.save();
        ctx.translate(p.x, p.y);

        // Damage flash overlay
        const isFlashing = p.damageFlash > 0;

        // Shield bubble when invincible
        if (p.invincible > 0) {
          const shieldAlpha = 0.15 + Math.sin(g.frame * 0.3) * 0.1;
          const shieldGrad = ctx.createRadialGradient(0, 0, SHIP_SIZE * 0.5, 0, 0, SHIP_SIZE * 1.6);
          shieldGrad.addColorStop(0, p.color + "00");
          shieldGrad.addColorStop(0.7, p.color + "00");
          shieldGrad.addColorStop(0.85, p.color + Math.round(shieldAlpha * 255).toString(16).padStart(2, "0"));
          shieldGrad.addColorStop(1, p.color + "00");
          ctx.fillStyle = shieldGrad;
          ctx.beginPath();
          ctx.arc(0, 0, SHIP_SIZE * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Engine glow
        const engineGlow = ctx.createRadialGradient(0, SHIP_SIZE * 0.5, 0, 0, SHIP_SIZE * 0.5, SHIP_SIZE * 1.2);
        engineGlow.addColorStop(0, p.color + (isFlashing ? "a0" : "60"));
        engineGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = engineGlow;
        ctx.beginPath();
        ctx.arc(0, SHIP_SIZE * 0.5, SHIP_SIZE * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Dual engine flames
        const flameH1 = 10 + Math.sin(g.frame * 0.5) * 5;
        const flameH2 = 8 + Math.cos(g.frame * 0.6 + 1) * 4;
        [-4, 4].forEach((offsetX, idx) => {
          const fh = idx === 0 ? flameH1 : flameH2;
          // Outer flame
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.moveTo(offsetX - 3, SHIP_SIZE * 0.35);
          ctx.quadraticCurveTo(offsetX, SHIP_SIZE * 0.35 + fh * 1.1, offsetX + 3, SHIP_SIZE * 0.35);
          ctx.closePath();
          ctx.fill();
          // Inner flame (white-hot)
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(offsetX - 1.5, SHIP_SIZE * 0.35);
          ctx.quadraticCurveTo(offsetX, SHIP_SIZE * 0.35 + fh * 0.6, offsetX + 1.5, SHIP_SIZE * 0.35);
          ctx.closePath();
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Ship body
        ctx.fillStyle = isFlashing ? "#ff4444" : p.color;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -SHIP_SIZE);
        ctx.lineTo(-SHIP_SIZE * 0.85, SHIP_SIZE * 0.5);
        ctx.lineTo(-SHIP_SIZE * 0.3, SHIP_SIZE * 0.3);
        ctx.lineTo(0, SHIP_SIZE * 0.45);
        ctx.lineTo(SHIP_SIZE * 0.3, SHIP_SIZE * 0.3);
        ctx.lineTo(SHIP_SIZE * 0.85, SHIP_SIZE * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wing detail lines
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-SHIP_SIZE * 0.1, -SHIP_SIZE * 0.5);
        ctx.lineTo(-SHIP_SIZE * 0.6, SHIP_SIZE * 0.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(SHIP_SIZE * 0.1, -SHIP_SIZE * 0.5);
        ctx.lineTo(SHIP_SIZE * 0.6, SHIP_SIZE * 0.35);
        ctx.stroke();

        // Cockpit glow
        const cockpitGrad = ctx.createRadialGradient(0, -SHIP_SIZE * 0.2, 0, 0, -SHIP_SIZE * 0.2, 5);
        cockpitGrad.addColorStop(0, "rgba(255,255,255,0.8)");
        cockpitGrad.addColorStop(0.5, p.color + "aa");
        cockpitGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = cockpitGrad;
        ctx.beginPath();
        ctx.arc(0, -SHIP_SIZE * 0.2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Cockpit center
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(0, -SHIP_SIZE * 0.2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Wing tip lights
        const wingTipAlpha = 0.5 + Math.sin(g.frame * 0.15) * 0.5;
        ctx.fillStyle = `rgba(255,255,255,${wingTipAlpha})`;
        ctx.beginPath();
        ctx.arc(-SHIP_SIZE * 0.8, SHIP_SIZE * 0.45, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(SHIP_SIZE * 0.8, SHIP_SIZE * 0.45, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      drawShip(p1);
      drawShip(p2);

      // Particles with glow
      g.particles.forEach((pt) => {
        const alpha = pt.life / pt.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        const sz = pt.size * alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, sz, 0, Math.PI * 2);
        ctx.fill();
        // Glow for larger particles
        if (pt.size > 2.5) {
          ctx.globalAlpha = alpha * 0.25;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, sz * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Floating score texts
      g.floatingTexts.forEach((ft) => {
        const alpha = ft.life / ft.maxLife;
        const scale = 0.8 + (1 - alpha) * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.9)";
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // Danger zone indicators
      const drawDangerZone = (leftX: number, rightX: number, color: string, player: PlayerState) => {
        const grad = ctx.createLinearGradient(leftX, CANVAS_H - 40, leftX, CANVAS_H);
        const baseAlpha = player.lives <= 1 ? "25" : "12";
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, color + baseAlpha);
        ctx.fillStyle = grad;
        ctx.fillRect(leftX, CANVAS_H - 40, rightX - leftX, 40);
        // Critical warning pulse
        if (player.lives <= 1 && player.lives > 0) {
          const pulse = Math.sin(g.frame * 0.15) * 0.5 + 0.5;
          ctx.globalAlpha = pulse * 0.08;
          ctx.fillStyle = color;
          ctx.fillRect(leftX, 0, rightX - leftX, CANVAS_H);
          ctx.globalAlpha = 1;
        }
      };
      drawDangerZone(0, CANVAS_W / 2, "#22d3ee", p1);
      drawDangerZone(CANVAS_W / 2, CANVAS_W, "#f472b6", p2);

      // Screen flash
      if (g.screenFlash > 0) {
        ctx.fillStyle = `rgba(251, 191, 36, ${g.screenFlash * 0.025})`;
        ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);
      }

      // Vignette
      const vignetteIntensity = g.vignettePulse > 0 ? 0.4 + (g.vignettePulse / 15) * 0.3 : 0.3;
      const vignette = ctx.createRadialGradient(
        CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.3,
        CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.75
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, `rgba(0,0,0,${vignetteIntensity})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

      // Scanlines (subtle)
      ctx.globalAlpha = 0.015;
      ctx.fillStyle = "#000";
      for (let y = 0; y < CANVAS_H; y += 3) {
        ctx.fillRect(0, y, CANVAS_W, 1);
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      g.animId = requestAnimationFrame(() => gameLoop(g));
    },
    [endGame, spawnEnemy]
  );

  const initGame = useCallback(
    (carryScores: { p1: number; p2: number }, startWave: number) => {
      const g: GameState = {
        players: [
          {
            x: CANVAS_W * 0.3,
            y: CANVAS_H - 40,
            score: carryScores.p1,
            lives: 3,
            color: "#22d3ee",
            bulletColor: "#67e8f9",
            shootCooldown: 0,
            invincible: 0,
            name: "Jogador 1",
            damageFlash: 0,
          },
          {
            x: CANVAS_W * 0.7,
            y: CANVAS_H - 40,
            score: carryScores.p2,
            lives: 3,
            color: "#f472b6",
            bulletColor: "#f9a8d4",
            shootCooldown: 0,
            invincible: 0,
            name: "Jogador 2",
            damageFlash: 0,
          },
        ],
        bullets: [],
        enemies: [],
        particles: [],
        floatingTexts: [],
        shockwaves: [],
        stars: createStars(),
        nebulae: createNebulae(),
        keys: new Set<string>(),
        frame: 0,
        wave: startWave,
        waveFrame: 0,
        running: true,
        screenFlash: 0,
        killStreaks: [0, 0],
        animId: 0,
        shakeX: 0,
        shakeY: 0,
        shakeMagnitude: 0,
        vignettePulse: 0,
      };
      gameRef.current = g;
      setLives({ p1: 3, p2: 3 });
      setWave(startWave);
      setGameStatus("playing");
      setShakeStyle({ x: 0, y: 0 });
      return g;
    },
    []
  );

  const startGame = useCallback(() => {
    if (gameRef.current) cancelAnimationFrame(gameRef.current.animId);
    const g = initGame({ p1: 0, p2: 0 }, 1);
    g.animId = requestAnimationFrame(() => gameLoop(g));
  }, [initGame, gameLoop]);

  const nextRound = useCallback(() => {
    if (gameRef.current) cancelAnimationFrame(gameRef.current.animId);
    const newWave = wave + 1;
    const g = initGame({ p1: scores.p1, p2: scores.p2 }, newWave);
    g.animId = requestAnimationFrame(() => gameLoop(g));
  }, [initGame, gameLoop, wave, scores]);

  const resetAll = useCallback(() => {
    if (gameRef.current) {
      cancelAnimationFrame(gameRef.current.animId);
      gameRef.current = null;
    }
    setScores({ p1: 0, p2: 0 });
    setLives({ p1: 3, p2: 3 });
    setWave(1);
    setWinner(null);
    setGameStatus("idle");
    setShakeStyle({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (gameRef.current) gameRef.current.keys.add(e.key);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (gameRef.current) gameRef.current.keys.delete(e.key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (gameRef.current) cancelAnimationFrame(gameRef.current.animId);
    };
  }, []);

  const renderLives = (count: number, color: "cyan" | "pink") =>
    Array.from({ length: 3 }, (_, i) => (
      <motion.span
        key={i}
        initial={i < count ? { scale: 0 } : { scale: 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25, delay: i * 0.05 }}
        className={cn(
          "inline-block w-3.5 h-3.5 rounded-full border-2 transition-colors duration-300",
          i < count
            ? cn(
                "border-transparent",
                color === "cyan"
                  ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                  : "bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.7)]"
              )
            : "border-zinc-700 bg-zinc-900/50"
        )}
      />
    ));

  const handleTouch = (key: string, pressed: boolean) => {
    touchRef.current[key] = pressed;
    triggerUI();
  };

  void forceTick;
  void liveCode;

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[620px] mx-auto">
      {/* Score Panel */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full rounded-2xl bg-gradient-to-r from-cyan-950/50 via-zinc-900/80 to-pink-950/50 border border-white/[0.08] p-4 shadow-xl shadow-black/30 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          {/* Player 1 */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              <span className="text-cyan-400 text-sm font-bold tracking-wider uppercase">Jogador 1</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-cyan-400" />
              <motion.span
                key={scores.p1}
                initial={{ scale: 1.3, color: "#fff" }}
                animate={{ scale: 1, color: "#a5f3fc" }}
                transition={{ duration: 0.3 }}
                className="text-cyan-300 text-2xl font-mono font-bold tabular-nums"
              >
                {scores.p1}
              </motion.span>
            </div>
            <div className="flex gap-1.5 mt-0.5">{renderLives(lives.p1, "cyan")}</div>
            <span className="text-[10px] text-zinc-500 font-mono">A/D mover \u00B7 W atirar</span>
          </div>

          {/* Wave Center */}
          <div className="flex flex-col items-center gap-1.5 px-4">
            <motion.div
              key={wave}
              initial={{ scale: 1.4, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-400 text-xs bg-amber-500/10 px-3 py-0.5 font-bold tracking-wide"
              >
                <Zap className="w-3 h-3 mr-1" />
                Onda {wave}
              </Badge>
            </motion.div>
            <div className="w-20 h-1.5 bg-zinc-800/80 rounded-full mt-1 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: WAVE_DURATION / 60, ease: "linear", repeat: Infinity }}
                style={{ width: "50%" }}
              />
            </div>
            {gameStatus === "playing" && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1 text-[10px] text-zinc-500"
              >
                <Shield className="w-2.5 h-2.5" />
                Co-op
              </motion.div>
            )}
          </div>

          {/* Player 2 */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-pink-400 text-sm font-bold tracking-wider uppercase">Jogador 2</span>
              <div className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_6px_rgba(244,114,182,0.8)]" />
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                key={scores.p2}
                initial={{ scale: 1.3, color: "#fff" }}
                animate={{ scale: 1, color: "#f9a8d4" }}
                transition={{ duration: 0.3 }}
                className="text-pink-300 text-2xl font-mono font-bold tabular-nums"
              >
                {scores.p2}
              </motion.span>
              <Coins className="w-4 h-4 text-pink-400" />
            </div>
            <div className="flex gap-1.5 mt-0.5">{renderLives(lives.p2, "pink")}</div>
            <span className="text-[10px] text-zinc-500 font-mono">
              {"\u2190"}{"\u2192"} mover \u00B7 {"\u2191"} atirar
            </span>
          </div>
        </div>
      </motion.div>

      {/* Canvas Container */}
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          x: shakeStyle.x, 
          y: shakeStyle.y 
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
        className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl shadow-black/60"
        style={{ maxWidth: CANVAS_W, width: "100%" }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full h-auto block"
          style={{ imageRendering: "auto" }}
        />

        {/* Idle Overlay */}
        <AnimatePresence mode="wait">
          {gameStatus === "idle" && (
            <motion.div
              key="idle-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="mb-4 text-center"
                >
                  <span className="text-6xl">{"\uD83D\uDE80"}</span>
                </motion.div>
              </motion.div>
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, type: "spring", stiffness: 200 }}
                className="text-white text-2xl font-bold mb-1 tracking-tight"
              >
                Space Shooter
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
                className="text-zinc-400 text-sm mb-6 text-center px-8 leading-relaxed"
              >
                Destrua os inimigos e acumule pontos!{"\n"}
                Inimigos dourados valem mais!
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45, type: "spring", stiffness: 200 }}
              >
                <Button
                  onClick={startGame}
                  className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold px-10 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-shadow duration-300"
                >
                  Iniciar Jogo
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence mode="wait">
          {gameStatus === "over" && (
            <motion.div
              key="over-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg"
            >
              {/* Trophy */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 15 }}
                className="mb-3"
              >
                <span className="text-5xl">{"\uD83C\uDFC6"}</span>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 20 }}
                className="text-white text-3xl font-bold mb-2 tracking-tight"
              >
                Fim de Jogo!
              </motion.h2>

              {/* Winner text */}
              <AnimatePresence>
                {winner && (
                  <motion.p
                    initial={{ y: 20, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55, type: "spring", stiffness: 300 }}
                    className={cn(
                      "text-xl font-bold mb-4 px-4 py-1 rounded-full",
                      winner === "Jogador 1"
                        ? "text-cyan-300 bg-cyan-500/10 border border-cyan-500/20"
                        : "text-pink-300 bg-pink-500/10 border border-pink-500/20"
                    )}
                  >
                    {winner} venceu!
                  </motion.p>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {!winner && (
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.55 }}
                    className="text-amber-400 text-xl font-bold mb-4"
                  >
                    Empate!
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Score Cards */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 200, damping: 20 }}
                className="flex gap-4 mb-6"
              >
                <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-xl px-6 py-3 text-center min-w-[110px]">
                  <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">Jogador 1</p>
                  <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.9, type: "spring", stiffness: 400, damping: 15 }}
                    className="text-white text-3xl font-mono font-bold"
                  >
                    {scores.p1}
                  </motion.p>
                </div>

                <div className="flex items-center">
                  <span className="text-zinc-600 text-lg font-light italic">vs</span>
                </div>

                <div className="bg-pink-950/30 border border-pink-500/20 rounded-xl px-6 py-3 text-center min-w-[110px]">
                  <p className="text-pink-400 text-xs font-bold uppercase tracking-wider mb-1">Jogador 2</p>
                  <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.0, type: "spring", stiffness: 400, damping: 15 }}
                    className="text-white text-3xl font-mono font-bold"
                  >
                    {scores.p2}
                  </motion.p>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.1, type: "spring", stiffness: 200 }}
                className="flex gap-3"
              >
                <Button
                  onClick={nextRound}
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 rounded-xl px-5 transition-all duration-200"
                >
                  Pr\u00f3ximo Round
                </Button>
                <Button
                  onClick={resetAll}
                  variant="outline"
                  className="border-zinc-600/50 text-zinc-400 hover:bg-zinc-700/50 hover:border-zinc-500/50 rounded-xl px-5 transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Reiniciar Tudo
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Touch Controls */}
      <AnimatePresence>
        {gameStatus === "playing" && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="w-full max-w-[620px] grid grid-cols-2 gap-4 mt-1"
          >
            <div className="flex items-center justify-center gap-2.5">
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("a", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("a", false); }}
                onMouseDown={() => handleTouch("a", true)}
                onMouseUp={() => handleTouch("a", false)}
                onMouseLeave={() => handleTouch("a", false)}
                className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 text-xl font-bold active:bg-cyan-800/50 active:border-cyan-500/40 active:scale-95 select-none touch-none transition-all duration-100"
              >
                {"\u25C0"}
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("p1shoot", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("p1shoot", false); }}
                onMouseDown={() => handleTouch("p1shoot", true)}
                onMouseUp={() => handleTouch("p1shoot", false)}
                onMouseLeave={() => handleTouch("p1shoot", false)}
                className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 text-xl font-bold active:bg-cyan-800/50 active:border-cyan-500/40 active:scale-95 select-none touch-none transition-all duration-100"
              >
                {"\uD83D\uDD2B"}
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("d", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("d", false); }}
                onMouseDown={() => handleTouch("d", true)}
                onMouseUp={() => handleTouch("d", false)}
                onMouseLeave={() => handleTouch("d", false)}
                className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 text-xl font-bold active:bg-cyan-800/50 active:border-cyan-500/40 active:scale-95 select-none touch-none transition-all duration-100"
              >
                {"\u25B6"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2.5">
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("ArrowLeft", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("ArrowLeft", false); }}
                onMouseDown={() => handleTouch("ArrowLeft", true)}
                onMouseUp={() => handleTouch("ArrowLeft", false)}
                onMouseLeave={() => handleTouch("ArrowLeft", false)}
                className="w-14 h-14 rounded-2xl bg-pink-950/50 border border-pink-500/20 text-pink-400 text-xl font-bold active:bg-pink-800/50 active:border-pink-500/40 active:scale-95 select-none touch-none transition-all duration-100"
              >
                {"\u25C0"}
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("p2shoot", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("p2shoot", false); }}
                onMouseDown={() => handleTouch("p2shoot", true)}
                onMouseUp={() => handleTouch("p2shoot", false)}
                onMouseLeave={() => handleTouch("p2shoot", false)}
                className="w-14 h-14 rounded-2xl bg-pink-950/50 border border-pink-500/20 text-pink-400 text-xl font-bold active:bg-pink-800/50 active:border-pink-500/40 active:scale-95 select-none touch-none transition-all duration-100"
              >
                {"\uD83D\uDD2B"}
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("ArrowRight", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("ArrowRight", false); }}
                onMouseDown={() => handleTouch("ArrowRight", true)}
                onMouseUp={() => handleTouch("ArrowRight", false)}
                onMouseLeave={() => handleTouch("ArrowRight", false)}
                className="w-14 h-14 rounded-2xl bg-pink-950/50 border border-pink-500/20 text-pink-400 text-xl font-bold active:bg-pink-800/50 active:border-pink-500/40 active:scale-95 select-none touch-none transition-all duration-100"
              >
                {"\u25B6"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <AnimatePresence>
        {gameStatus === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center text-zinc-500 text-xs space-y-1.5 mt-1"
          >
            <p>
              <span className="inline-block w-2.5 h-2.5 bg-cyan-400 rounded-sm mr-1.5 opacity-70" />
              Tri\u00e2ngulos / Diamantes = {POINTS_NORMAL} pts
            </p>
            <p>
              <span className="inline-block w-2.5 h-2.5 bg-amber-400 rounded-sm mr-1.5 opacity-70" />
              Inimigo Dourado = {POINTS_BONUS} pts
            </p>
            <p className="text-zinc-600">
              Inimigos que passam roubam uma vida do jogador daquele lado
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function drawEnemyShape(ctx: CanvasRenderingContext2D, e: Enemy) {
  if (e.type === "triangle") {
    ctx.beginPath();
    ctx.moveTo(0, -e.size);
    ctx.lineTo(-e.size * 0.8, e.size * 0.7);
    ctx.lineTo(e.size * 0.8, e.size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -e.size);
    ctx.lineTo(e.size * 0.7, 0);
    ctx.lineTo(0, e.size);
    ctx.lineTo(-e.size * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export default SpaceShooter;
