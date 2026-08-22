import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Coins } from "lucide-react";
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
}

interface Bullet {
  x: number;
  y: number;
  speed: number;
  owner: 1 | 2;
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
}

const CANVAS_W = 600;
const CANVAS_H = 500;
const SHIP_SIZE = 18;
const BULLET_SPEED = 7;
const BULLET_COOLDOWN = 12;
const PLAYER_SPEED = 5;
const STAR_COUNT = 120;
const INITIAL_ENEMY_INTERVAL = 60;
const MIN_ENEMY_INTERVAL = 15;
const INITIAL_ENEMY_SPEED = 1.5;
const MAX_ENEMY_SPEED = 4.5;
const BONUS_CHANCE = 0.08;
const WAVE_DURATION = 900;
const POINTS_NORMAL = 10;
const POINTS_BONUS = 30;

const createStars = (): Star[] =>
  Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * CANVAS_W,
    y: Math.random() * CANVAS_H,
    speed: 0.2 + Math.random() * 1.2,
    size: 0.5 + Math.random() * 1.8,
    brightness: 0.3 + Math.random() * 0.7,
  }));

interface FloatingText {
  x: number; y: number; text: string; color: string; life: number; maxLife: number; vy: number; }

const createExplosion = (x: number, y: number, color: string, isBonus: boolean = false): Particle[] => {
  const count = isBonus ? 30 : 14;
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = (isBonus ? 2 : 1) + Math.random() * (isBonus ? 5 : 3.5);
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: (isBonus ? 30 : 20) + Math.random() * 20,
      maxLife: isBonus ? 50 : 40,
      color: isBonus ? (Math.random() < 0.5 ? '#fbbf24' : '#fef08a') : color,
      size: (isBonus ? 2 : 1.5) + Math.random() * (isBonus ? 4 : 2.5),
    };
  });
};

const createScoreText = (x: number, y: number, points: number, isBonus: boolean): FloatingText => ({
  x, y, text: `+${points}`, color: isBonus ? '#fbbf24' : '#ffffff', life: 40, maxLife: 40, vy: -1.5,
});

interface GameState {
  players: PlayerState[];
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  stars: Star[];
  keys: Set<string>;
  frame: number;
  wave: number;
  waveFrame: number;
  running: boolean;
  screenFlash: number;
  killStreaks: [number, number];
  animId: number;
}

const SpaceShooter = ({ onScore, liveCode }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const touchRef = useRef<Record<string, boolean>>({});

  const [gameStatus, setGameStatus] = useState<"idle" | "playing" | "over">("idle");
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [lives, setLives] = useState({ p1: 3, p2: 3 });
  const [wave, setWave] = useState(1);
  const [winner, setWinner] = useState<string | null>(null);
  const [forceTick, setForceTick] = useState(0);

  const triggerUI = () => setForceTick((t) => t + 1);

  const endGame = useCallback(
    (p1Score: number, p2Score: number) => {
      setGameStatus("over");
      setScores({ p1: p1Score, p2: p2Score });
      const w = p1Score > p2Score ? "Jogador 1" : p2Score > p1Score ? "Jogador 2" : null;
      setWinner(w);
      onScore?.("Jogador 1", p1Score);
      onScore?.("Jogador 2", p2Score);
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
        g.bullets.push({ x: p1.x, y: p1.y - SHIP_SIZE, speed: BULLET_SPEED, owner: 1 });
        p1.shootCooldown = BULLET_COOLDOWN;
      }
      if (p1.invincible > 0) p1.invincible--;

      if (keys.has("ArrowLeft")) p2.x = Math.max(SHIP_SIZE, p2.x - PLAYER_SPEED);
      if (keys.has("ArrowRight")) p2.x = Math.min(CANVAS_W - SHIP_SIZE, p2.x + PLAYER_SPEED);
      if (p2.shootCooldown > 0) p2.shootCooldown--;
      if (
        (keys.has("ArrowUp") || keys.has("p2shoot")) &&
        p2.shootCooldown <= 0 &&
        p2.lives > 0
      ) {
        g.bullets.push({ x: p2.x, y: p2.y - SHIP_SIZE, speed: BULLET_SPEED, owner: 2 });
        p2.shootCooldown = BULLET_COOLDOWN;
      }
      if (p2.invincible > 0) p2.invincible--;

      g.bullets = g.bullets.filter((b) => {
        b.y -= b.speed;
        return b.y > -10;
      });

      g.enemies = g.enemies.filter((e) => {
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
              setLives({ p1: p1.lives, p2: p2.lives });
            }
          } else {
            if (p2.lives > 0 && p2.invincible <= 0) {
              p2.lives--;
              p2.invincible = 60;
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
              g.floatingTexts.push(createScoreText(e.x, e.y - 10, totalPts, isBonus));
              if (isBonus) g.screenFlash = 8;
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

      g.floatingTexts = g.floatingTexts.filter((ft) => {
        ft.y += ft.vy;
        ft.life--;
        return ft.life > 0;
      });

      if (g.screenFlash > 0) g.screenFlash--;

      g.stars.forEach((s) => {
        s.y += s.speed;
        if (s.y > CANVAS_H) {
          s.y = 0;
          s.x = Math.random() * CANVAS_W;
        }
      });

      if (p1.lives <= 0 && p2.lives <= 0) {
        g.running = false;
        endGame(p1.score, p2.score);
        return;
      }

      ctx.fillStyle = "#05080f";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Screen flash
      if (g.screenFlash > 0) {
        ctx.fillStyle = `rgba(251, 191, 36, ${g.screenFlash * 0.03})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      g.stars.forEach((s) => {
        const twinkle = 0.6 + 0.4 * Math.sin(g.frame * 0.03 + s.x);
        const alpha = s.brightness * twinkle;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2, 0);
      ctx.lineTo(CANVAS_W / 2, CANVAS_H);
      ctx.stroke();
      ctx.setLineDash([]);

      g.enemies.forEach((e) => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rotation);

        if (e.bonus) {
          const glowSize = e.size + 6 + Math.sin(g.frame * 0.1) * 3;
          const glow = ctx.createRadialGradient(0, 0, e.size * 0.3, 0, 0, glowSize);
          glow.addColorStop(0, "rgba(251, 191, 36, 0.4)");
          glow.addColorStop(1, "rgba(251, 191, 36, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
          ctx.fill();

          const sparkleAngle = g.frame * 0.15;
          for (let i = 0; i < 4; i++) {
            const a = sparkleAngle + (i * Math.PI) / 2;
            const sx = Math.cos(a) * (e.size + 8);
            const sy = Math.sin(a) * (e.size + 8);
            ctx.fillStyle = "rgba(255, 255, 200, 0.8)";
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = e.color;
        ctx.strokeStyle = e.bonus ? "#fef08a" : "#fca5a5";
        ctx.lineWidth = 1.5;

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

        ctx.restore();
      });

      g.bullets.forEach((b) => {
        const player = b.owner === 1 ? p1 : p2;
        const bGlow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 6);
        bGlow.addColorStop(0, player.bulletColor);
        bGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = bGlow;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = player.bulletColor;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(b.x, b.y + 4, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      const drawShip = (p: PlayerState) => {
        if (p.lives <= 0) return;
        if (p.invincible > 0 && Math.floor(p.invincible / 4) % 2 === 0) return;

        ctx.save();
        ctx.translate(p.x, p.y);

        const engineGlow = ctx.createRadialGradient(0, SHIP_SIZE * 0.6, 0, 0, SHIP_SIZE * 0.6, SHIP_SIZE);
        engineGlow.addColorStop(0, p.color + "60");
        engineGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = engineGlow;
        ctx.beginPath();
        ctx.arc(0, SHIP_SIZE * 0.6, SHIP_SIZE, 0, Math.PI * 2);
        ctx.fill();

        const flameH = 8 + Math.sin(g.frame * 0.4) * 4;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-5, SHIP_SIZE * 0.4);
        ctx.lineTo(0, SHIP_SIZE * 0.4 + flameH);
        ctx.lineTo(5, SHIP_SIZE * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = p.color;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -SHIP_SIZE);
        ctx.lineTo(-SHIP_SIZE * 0.8, SHIP_SIZE * 0.5);
        ctx.lineTo(-SHIP_SIZE * 0.3, SHIP_SIZE * 0.3);
        ctx.lineTo(0, SHIP_SIZE * 0.45);
        ctx.lineTo(SHIP_SIZE * 0.3, SHIP_SIZE * 0.3);
        ctx.lineTo(SHIP_SIZE * 0.8, SHIP_SIZE * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.arc(0, -SHIP_SIZE * 0.15, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      drawShip(p1);
      drawShip(p2);

      g.particles.forEach((pt) => {
        const alpha = pt.life / pt.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        // Glow for larger particles
        if (pt.size > 3) {
          ctx.globalAlpha = alpha * 0.3;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size * alpha * 2, 0, Math.PI * 2);
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
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      const drawDangerZone = (leftX: number, rightX: number, color: string) => {
        const grad = ctx.createLinearGradient(leftX, CANVAS_H - 30, leftX, CANVAS_H);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, color + "15");
        ctx.fillStyle = grad;
        ctx.fillRect(leftX, CANVAS_H - 30, rightX - leftX, 30);
      };
      drawDangerZone(0, CANVAS_W / 2, "#22d3ee");
      drawDangerZone(CANVAS_W / 2, CANVAS_W, "#f472b6");

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
          },
        ],
        bullets: [],
        enemies: [],
        particles: [],
        floatingTexts: [],
        stars: createStars(),
        keys: new Set<string>(),
        frame: 0,
        wave: startWave,
        waveFrame: 0,
        running: true,
        screenFlash: 0,
        killStreaks: [0, 0],
        animId: 0,
      };
      gameRef.current = g;
      setLives({ p1: 3, p2: 3 });
      setWave(startWave);
      setGameStatus("playing");
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

  const renderLives = (count: number, color: string) =>
    Array.from({ length: 3 }, (_, i) => (
      <span
        key={i}
        className={cn(
          "inline-block w-3 h-3 rounded-full border transition-all",
          i < count
            ? cn(
                "border-transparent",
                color === "cyan"
                  ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                  : "bg-pink-400 shadow-[0_0_6px_rgba(244,114,182,0.6)]"
              )
            : "border-zinc-600 bg-transparent"
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 p-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-1 flex-1">
            <span className="text-cyan-400 text-sm font-bold tracking-wide">Jogador 1</span>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-300 text-xl font-mono font-bold">{scores.p1}</span>
            </div>
            <div className="flex gap-1">{renderLives(lives.p1, "cyan")}</div>
            <span className="text-[10px] text-zinc-500">A/D mover · W atirar</span>
          </div>

          <div className="flex flex-col items-center gap-1 px-3">
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-400 text-xs bg-amber-500/10"
            >
              Onda {wave}
            </Badge>
            <div className="w-16 h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: WAVE_DURATION / 60, ease: "linear", repeat: Infinity }}
                style={{ width: "50%" }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 flex-1">
            <span className="text-pink-400 text-sm font-bold tracking-wide">Jogador 2</span>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-pink-400" />
              <span className="text-pink-300 text-xl font-mono font-bold">{scores.p2}</span>
            </div>
            <div className="flex gap-1">{renderLives(lives.p2, "pink")}</div>
            <span className="text-[10px] text-zinc-500">
              ← → mover · ↑ atirar
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative rounded-xl overflow-hidden border border-zinc-800 shadow-lg shadow-black/50"
        style={{ maxWidth: CANVAS_W, width: "100%" }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full h-auto block"
          style={{ imageRendering: "auto" }}
        />

        <AnimatePresence>
          {gameStatus === "idle" && (
            <motion.div
              key="idle-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="mb-4"
              >
                <span className="text-5xl">🚀</span>
              </motion.div>
              <h2 className="text-white text-xl font-bold mb-2">Space Shooter</h2>
              <p className="text-zinc-400 text-sm mb-6 text-center px-4">
                Destrua os inimigos e acumule pontos!
                <br />
                Inimigos dourados valem mais!
              </p>
              <Button
                onClick={startGame}
                className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold px-8"
              >
                Iniciar Jogo
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {gameStatus === "over" && (
            <motion.div
              key="over-overlay"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -5, 5, 0] }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-2"
              >
                <span className="text-4xl">🏆</span>
              </motion.div>
              <h2 className="text-white text-2xl font-bold mb-1">Fim de Jogo!</h2>
              {winner && (
                <p
                  className={cn(
                    "text-lg font-bold mb-3",
                    winner === "Jogador 1" ? "text-cyan-400" : "text-pink-400"
                  )}
                >
                  {winner} venceu!
                </p>
              )}
              {!winner && <p className="text-amber-400 text-lg font-bold mb-3">Empate!</p>}
              <div className="flex gap-6 mb-5">
                <div className="text-center">
                  <p className="text-cyan-400 text-sm">Jogador 1</p>
                  <p className="text-white text-2xl font-mono font-bold">{scores.p1}</p>
                </div>
                <div className="text-zinc-600 text-2xl font-light">vs</div>
                <div className="text-center">
                  <p className="text-pink-400 text-sm">Jogador 2</p>
                  <p className="text-white text-2xl font-mono font-bold">{scores.p2}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={nextRound}
                  variant="outline"
                  className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
                >
                  Próximo Round
                </Button>
                <Button
                  onClick={resetAll}
                  variant="outline"
                  className="border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reiniciar Tudo
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {gameStatus === "playing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-[620px] grid grid-cols-2 gap-4 mt-1"
          >
            <div className="flex items-center justify-center gap-2">
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("a", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("a", false); }}
                onMouseDown={() => handleTouch("a", true)}
                onMouseUp={() => handleTouch("a", false)}
                onMouseLeave={() => handleTouch("a", false)}
                className="w-14 h-14 rounded-xl bg-cyan-900/40 border border-cyan-500/30 text-cyan-400 text-xl font-bold active:bg-cyan-800/50 select-none touch-none"
              >
                ◀
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("p1shoot", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("p1shoot", false); }}
                onMouseDown={() => handleTouch("p1shoot", true)}
                onMouseUp={() => handleTouch("p1shoot", false)}
                onMouseLeave={() => handleTouch("p1shoot", false)}
                className="w-14 h-14 rounded-xl bg-cyan-900/40 border border-cyan-500/30 text-cyan-400 text-xl font-bold active:bg-cyan-800/50 select-none touch-none"
              >
                🔫
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("d", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("d", false); }}
                onMouseDown={() => handleTouch("d", true)}
                onMouseUp={() => handleTouch("d", false)}
                onMouseLeave={() => handleTouch("d", false)}
                className="w-14 h-14 rounded-xl bg-cyan-900/40 border border-cyan-500/30 text-cyan-400 text-xl font-bold active:bg-cyan-800/50 select-none touch-none"
              >
                ▶
              </button>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("ArrowLeft", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("ArrowLeft", false); }}
                onMouseDown={() => handleTouch("ArrowLeft", true)}
                onMouseUp={() => handleTouch("ArrowLeft", false)}
                onMouseLeave={() => handleTouch("ArrowLeft", false)}
                className="w-14 h-14 rounded-xl bg-pink-900/40 border border-pink-500/30 text-pink-400 text-xl font-bold active:bg-pink-800/50 select-none touch-none"
              >
                ◀
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("p2shoot", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("p2shoot", false); }}
                onMouseDown={() => handleTouch("p2shoot", true)}
                onMouseUp={() => handleTouch("p2shoot", false)}
                onMouseLeave={() => handleTouch("p2shoot", false)}
                className="w-14 h-14 rounded-xl bg-pink-900/40 border border-pink-500/30 text-pink-400 text-xl font-bold active:bg-pink-800/50 select-none touch-none"
              >
                🔫
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("ArrowRight", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("ArrowRight", false); }}
                onMouseDown={() => handleTouch("ArrowRight", true)}
                onMouseUp={() => handleTouch("ArrowRight", false)}
                onMouseLeave={() => handleTouch("ArrowRight", false)}
                className="w-14 h-14 rounded-xl bg-pink-900/40 border border-pink-500/30 text-pink-400 text-xl font-bold active:bg-pink-800/50 select-none touch-none"
              >
                ▶
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameStatus === "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-zinc-500 text-xs space-y-1 mt-1"
          >
            <p>
              <span className="inline-block w-2.5 h-2.5 bg-cyan-400 rounded-sm mr-1" />
              Triângulos / Diamantes = {POINTS_NORMAL} pts
            </p>
            <p>
              <span className="inline-block w-2.5 h-2.5 bg-amber-400 rounded-sm mr-1" />
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

export default SpaceShooter;
