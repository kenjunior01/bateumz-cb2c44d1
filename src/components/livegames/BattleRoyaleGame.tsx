import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, Heart, Shield, RotateCcw, Target, Clock, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type WeaponType = "pistol" | "shotgun" | "rifle";
type LootType = "pistol" | "shotgun" | "rifle" | "health" | "shield" | "ammo";
type Difficulty = "facil" | "normal" | "dificil";
type GameStatus = "idle" | "playing" | "over";

interface WeaponDef {
  name: string;
  damage: number;
  fireRate: number;
  spread: number;
  bulletSpeed: number;
  range: number;
  color: string;
  bulletsPerShot: number;
}

const WEAPONS: Record<WeaponType, WeaponDef> = {
  pistol: { name: "Pistola", damage: 10, fireRate: 8, spread: 0.05, bulletSpeed: 10, range: 300, color: "#a1a1aa", bulletsPerShot: 1 },
  shotgun: { name: "Escopeta", damage: 15, fireRate: 30, spread: 0.3, bulletSpeed: 8, range: 180, color: "#f97316", bulletsPerShot: 5 },
  rifle: { name: "Rifle", damage: 18, fireRate: 14, spread: 0.02, bulletSpeed: 14, range: 450, color: "#22d3ee", bulletsPerShot: 1 },
};

const BOT_NAMES = ["Shadow","Ninja","Fury","Storm","Blaze","Hawk","Wolf","Viper","Ghost","Titan","Raven","Cobra","Bolt","Ace","Fang","Spike","Drake","Lynx","Fox","Rex","Frost","Ember","Skull","Claw","Thorn","Ridge","Flare","Onyx","Dusk","Neon","Zinc","Rust","Ash","Sage","Jade","Opal","Quartz","Beryl","Topaz","Garnet"];

const WORLD = 3000;
const CANVAS_W = 800;
const CANVAS_H = 600;
const PLAYER_RADIUS = 14;
const BOT_COUNT = 40;
const LOOT_COUNT = 60;
const BOT_NAMES_LEN = BOT_NAMES.length;

interface Entity {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shield: number;
  weapon: WeaponType;
  ammo: number;
  angle: number;
  fireCooldown: number;
  alive: boolean;
  radius: number;
  color: string;
  name: string;
  damageDealt: number;
  kills: number;
  vx: number;
  vy: number;
  targetAngle: number;
  isPlayer: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  ownerIdx: number;
  life: number;
  color: string;
}

interface Loot {
  x: number;
  y: number;
  type: LootType;
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

interface SupplyDrop {
  x: number;
  y: number;
  loot: LootType[];
  landed: boolean;
  fallY: number;
  timer: number;
}

interface KillFeedEntry {
  killer: string;
  victim: string;
  time: number;
}

interface ZoneState {
  cx: number;
  cy: number;
  radius: number;
  targetRadius: number;
  targetCx: number;
  targetCy: number;
  shrinkSpeed: number;
  phase: number;
  phaseTimer: number;
  damage: number;
}

interface GameState {
  entities: Entity[];
  bullets: Bullet[];
  loot: Loot[];
  particles: Particle[];
  supplyDrops: SupplyDrop[];
  killFeed: KillFeedEntry[];
  zone: ZoneState;
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  frame: number;
  running: boolean;
  animId: number;
  difficulty: Difficulty;
  startTime: number;
  aliveCount: number;
  playerIdx: number;
}

const DIFF_STATS: Record<Difficulty, { botAcc: number; botAggro: number; label: string; color: string }> = {
  facil: { botAcc: 0.25, botAggro: 0.3, label: "Facil", color: "text-green-400" },
  normal: { botAcc: 0.45, botAggro: 0.55, label: "Normal", color: "text-amber-400" },
  dificil: { botAcc: 0.7, botAggro: 0.8, label: "Dificil", color: "text-red-400" },
};

const randomInRange = (min: number, max: number) => min + Math.random() * (max - min);
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
const angleTo = (from: { x: number; y: number }, to: { x: number; y: number }) => Math.atan2(to.y - from.y, to.x - from.x);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const createEntity = (x: number, y: number, name: string, color: string, isPlayer: boolean): Entity => ({
  x, y, hp: 100, maxHp: 100, shield: 0, weapon: "pistol", ammo: 30,
  angle: 0, fireCooldown: 0, alive: true, radius: PLAYER_RADIUS, color, name,
  damageDealt: 0, kills: 0, vx: 0, vy: 0, targetAngle: 0, isPlayer,
});

const createLoot = (): Loot => ({
  x: 100 + Math.random() * (WORLD - 200),
  y: 100 + Math.random() * (WORLD - 200),
  type: (Math.random() < 0.15 ? "shotgun" : Math.random() < 0.15 ? "rifle" : Math.random() < 0.15 ? "pistol" : Math.random() < 0.3 ? "health" : Math.random() < 0.5 ? "shield" : "ammo") as LootType,
  alive: true,
});

const createExplosion = (x: number, y: number, color: string, count: number): Particle[] =>
  Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 3;
    return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 15 + Math.random() * 20, maxLife: 35, color, size: 1.5 + Math.random() * 2.5 };
  });

const LOOT_COLORS: Record<LootType, string> = {
  pistol: "#a1a1aa", shotgun: "#f97316", rifle: "#22d3ee", health: "#22c55e", shield: "#818cf8", ammo: "#fbbf24",
};
const LOOT_LABELS: Record<LootType, string> = {
  pistol: "P", shotgun: "E", rifle: "R", health: "+", shield: "S", ammo: "A",
};

const BattleRoyaleGame = ({ onScore, liveCode }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);

  const [gameStatus, setGameStatus] = useState<GameStatus>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [hudData, setHudData] = useState({ hp: 100, shield: 0, weapon: "pistol" as WeaponType, ammo: 30, kills: 0, alive: 40, placement: 1 });
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [resultData, setResultData] = useState({ placement: 1, kills: 0, damage: 0, time: 0 });

  const updateHUD = useCallback((g: GameState) => {
    const p = g.entities[g.playerIdx];
    if (!p) return;
    setHudData({ hp: p.hp, shield: p.shield, weapon: p.weapon, ammo: p.ammo, kills: p.kills, alive: g.aliveCount, placement: p.alive ? g.aliveCount : 0 });
    setKillFeed(g.killFeed.slice(-5));
  }, []);

  const endGame = useCallback((g: GameState) => {
    g.running = false;
    const p = g.entities[g.playerIdx];
    const placement = p.alive ? 1 : g.aliveCount + 1;
    const survivalTime = Math.floor((Date.now() - g.startTime) / 1000);
    setResultData({ placement, kills: p.kills, damage: p.damageDealt, time: survivalTime });
    setGameStatus("over");
    const score = p.kills * 100 + p.damageDealt + (placement === 1 ? 500 : Math.max(0, (50 - placement) * 10));
    onScore?.("Jogador", score);
  }, [onScore]);

  const shoot = useCallback((shooter: Entity, sIdx: number, g: GameState, angle: number) => {
    if (shooter.fireCooldown > 0 || shooter.ammo <= 0) return;
    const w = WEAPONS[shooter.weapon];
    shooter.fireCooldown = w.fireRate;
    shooter.ammo -= 1;
    for (let i = 0; i < w.bulletsPerShot; i++) {
      const spread = (Math.random() - 0.5) * w.spread;
      const a = angle + spread;
      g.bullets.push({
        x: shooter.x + Math.cos(a) * (shooter.radius + 4),
        y: shooter.y + Math.sin(a) * (shooter.radius + 4),
        vx: Math.cos(a) * w.bulletSpeed, vy: Math.sin(a) * w.bulletSpeed,
        damage: w.damage, ownerIdx: sIdx, life: w.range / w.bulletSpeed, color: w.color,
      });
    }
  }, []);

  const updateBots = useCallback((g: GameState) => {
    const diff = DIFF_STATS[g.difficulty];
    for (let i = 0; i < g.entities.length; i++) {
      const bot = g.entities[i];
      if (!bot.alive || bot.isPlayer) continue;
      if (bot.fireCooldown > 0) bot.fireCooldown--;

      let closestDist = Infinity;
      let closestIdx = -1;
      for (let j = 0; j < g.entities.length; j++) {
        if (i === j || !g.entities[j].alive) continue;
        const d = dist(bot, g.entities[j]);
        if (d < closestDist) { closestDist = d; closestIdx = j; }
      }

      if (closestIdx >= 0 && closestDist < 350) {
        const target = g.entities[closestIdx];
        bot.targetAngle = angleTo(bot, target);
        bot.angle += (bot.targetAngle - bot.angle) * 0.15;

        if (closestDist > 120) {
          bot.vx = Math.cos(bot.angle) * 2.2;
          bot.vy = Math.sin(bot.angle) * 2.2;
        } else if (closestDist < 70) {
          bot.vx = -Math.cos(bot.angle) * 1.5;
          bot.vy = -Math.sin(bot.angle) * 1.5;
        } else {
          const strafe = bot.angle + Math.PI / 2 * (Math.sin(g.frame * 0.03 + i) > 0 ? 1 : -1);
          bot.vx = Math.cos(strafe) * 1.2;
          bot.vy = Math.sin(strafe) * 1.2;
        }

        if (Math.random() < diff.botAggro * 0.5 && closestDist < 300) {
          const aimAngle = bot.targetAngle + (Math.random() - 0.5) * (1 - diff.botAcc) * 0.8;
          shoot(bot, i, g, aimAngle);
        }
      } else {
        const zAngle = angleTo(bot, { x: g.zone.cx, y: g.zone.cy });
        const zDist = dist(bot, { x: g.zone.cx, y: g.zone.cy });
        if (zDist > g.zone.radius * 0.7) {
          bot.vx = Math.cos(zAngle) * 2;
          bot.vy = Math.sin(zAngle) * 2;
        } else {
          if (g.frame % 120 === i % 120) {
            bot.targetAngle = Math.random() * Math.PI * 2;
          }
          bot.vx = Math.cos(bot.targetAngle) * 1.5;
          bot.vy = Math.sin(bot.targetAngle) * 1.5;
        }
        bot.angle += (bot.targetAngle - bot.angle) * 0.08;

        for (const l of g.loot) {
          if (!l.alive) continue;
          if (dist(bot, l) < 200 && Math.random() < 0.02) {
            bot.targetAngle = angleTo(bot, l);
            break;
          }
        }
      }

      bot.x += bot.vx;
      bot.y += bot.vy;
      bot.x = clamp(bot.x, bot.radius, WORLD - bot.radius);
      bot.y = clamp(bot.y, bot.radius, WORLD - bot.radius);
      bot.vx *= 0.92;
      bot.vy *= 0.92;
    }
  }, [shoot]);

  const gameLoop = useCallback((g: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas || !g.running) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    g.frame++;

    const player = g.entities[g.playerIdx];

    // Zone shrinking
    g.zone.phaseTimer++;
    const phaseDuration = 600 - g.zone.phase * 60;
    if (g.zone.phaseTimer > phaseDuration && g.zone.phase < 6) {
      g.zone.phase++;
      g.zone.phaseTimer = 0;
      g.zone.targetRadius = Math.max(100, g.zone.radius * 0.55);
      const offset = g.zone.targetRadius * 0.3;
      g.zone.targetCx = clamp(g.zone.cx + (Math.random() - 0.5) * offset, g.zone.targetRadius + 50, WORLD - g.zone.targetRadius - 50);
      g.zone.targetCy = clamp(g.zone.cy + (Math.random() - 0.5) * offset, g.zone.targetRadius + 50, WORLD - g.zone.targetRadius - 50);
      g.zone.damage = 1 + g.zone.phase * 0.5;
    }
    g.zone.cx += (g.zone.targetCx - g.zone.cx) * 0.003;
    g.zone.cy += (g.zone.targetCy - g.zone.cy) * 0.003;
    g.zone.radius += (g.zone.targetRadius - g.zone.radius) * 0.005;

    // Supply drops
    if (g.frame % 900 === 450 && g.zone.phase < 5) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * g.zone.radius * 0.6;
      g.supplyDrops.push({
        x: clamp(g.zone.cx + Math.cos(angle) * r, 100, WORLD - 100),
        y: clamp(g.zone.cy + Math.sin(angle) * r, 100, WORLD - 100),
        loot: [(Math.random() < 0.5 ? "rifle" : "shotgun") as LootType, "health" as LootType, "shield" as LootType],
        landed: false, fallY: -100, timer: 600,
      });
    }
    g.supplyDrops = g.supplyDrops.filter((sd) => {
      if (!sd.landed) { sd.fallY += 6; if (sd.fallY >= sd.y) { sd.landed = true; sd.y = sd.fallY; } sd.timer--; return sd.timer > 0; }
      sd.timer--;
      return sd.timer > 0;
    });

    // Player input
    if (player.alive) {
      const speed = 3.2;
      if (player.fireCooldown > 0) player.fireCooldown--;
      if (g.keys.has("w") || g.keys.has("W")) player.y -= speed;
      if (g.keys.has("s") || g.keys.has("S")) player.y += speed;
      if (g.keys.has("a") || g.keys.has("A")) player.x -= speed;
      if (g.keys.has("d") || g.keys.has("D")) player.x += speed;
      player.x = clamp(player.x, player.radius, WORLD - player.radius);
      player.y = clamp(player.y, player.radius, WORLD - player.radius);

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const worldMouseX = g.mouseX * scaleX + (player.x - CANVAS_W / 2);
      const worldMouseY = g.mouseY * scaleY + (player.y - CANVAS_H / 2);
      player.angle = angleTo(player, { x: worldMouseX, y: worldMouseY });

      if (g.mouseDown) shoot(player, g.playerIdx, g, player.angle);
    }

    updateBots(g);

    // Bullets update
    g.bullets = g.bullets.filter((b) => {
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      if (b.life <= 0 || b.x < 0 || b.x > WORLD || b.y < 0 || b.y > WORLD) return false;
      for (let i = 0; i < g.entities.length; i++) {
        const e = g.entities[i];
        if (!e.alive || i === b.ownerIdx) continue;
        if (dist(b, e) < e.radius + 3) {
          let dmg = b.damage;
          if (e.shield > 0) { const absorbed = Math.min(e.shield, dmg); e.shield -= absorbed; dmg -= absorbed; }
          e.hp -= dmg;
          g.entities[b.ownerIdx].damageDealt += b.damage;
          g.particles.push(...createExplosion(b.x, b.y, e.color, 4));
          if (e.hp <= 0) {
            e.alive = false;
            g.aliveCount--;
            g.entities[b.ownerIdx].kills++;
            g.particles.push(...createExplosion(e.x, e.y, e.color, 12));
            g.killFeed.push({ killer: g.entities[b.ownerIdx].name, victim: e.name, time: g.frame });
            if (g.killFeed.length > 20) g.killFeed.shift();
            if (e.isPlayer) { endGame(g); return false; }
            if (g.aliveCount <= 1 && g.entities[g.playerIdx].alive) { endGame(g); return false; }
          }
          return false;
        }
      }
      return true;
    });

    // Zone damage
    for (const e of g.entities) {
      if (!e.alive) continue;
      const d = dist(e, { x: g.zone.cx, y: g.zone.cy });
      if (d > g.zone.radius && g.frame % 30 === 0) {
        e.hp -= g.zone.damage;
        if (e.hp <= 0) {
          e.alive = false;
          g.aliveCount--;
          g.particles.push(...createExplosion(e.x, e.y, "#ef4444", 8));
          g.killFeed.push({ killer: "Zona", victim: e.name, time: g.frame });
          if (e.isPlayer) { endGame(g); }
        }
      }
    }

    // Loot pickup
    for (const l of g.loot) {
      if (!l.alive) continue;
      for (const e of g.entities) {
        if (!e.alive) continue;
        if (dist(e, l) < e.radius + 12) {
          if (l.type === "health") { e.hp = Math.min(e.maxHp, e.hp + 30); }
          else if (l.type === "shield") { e.shield = Math.min(50, e.shield + 25); }
          else if (l.type === "ammo") { e.ammo = Math.min(99, e.ammo + 15); }
          else { e.weapon = l.type as WeaponType; e.ammo = Math.min(99, e.ammo + 20); }
          l.alive = false;
          g.particles.push(...createExplosion(l.x, l.y, LOOT_COLORS[l.type], 5));
        }
      }
    }

    // Supply drop loot pickup
    for (const sd of g.supplyDrops) {
      if (!sd.landed) continue;
      for (let li = sd.loot.length - 1; li >= 0; li--) {
        for (const e of g.entities) {
          if (!e.alive) continue;
          if (dist(e, sd) < e.radius + 20) {
            const lt = sd.loot[li];
            if (lt === "health") e.hp = Math.min(e.maxHp, e.hp + 50);
            else if (lt === "shield") e.shield = Math.min(50, e.shield + 50);
            else { e.weapon = lt as WeaponType; e.ammo = Math.min(99, e.ammo + 30); }
            sd.loot.splice(li, 1);
            g.particles.push(...createExplosion(sd.x, sd.y, "#fbbf24", 8));
            break;
          }
        }
      }
    }

    // Particles
    g.particles = g.particles.filter((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--; return p.life > 0; });

    if (g.frame % 10 === 0) updateHUD(g);

    // ---- RENDER ----
    const camX = player.x - CANVAS_W / 2;
    const camY = player.y - CANVAS_H / 2;

    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    const gridSize = 80;
    const startGX = Math.floor(camX / gridSize) * gridSize;
    const startGY = Math.floor(camY / gridSize) * gridSize;
    for (let gx = startGX; gx < camX + CANVAS_W + gridSize; gx += gridSize) {
      const sx = gx - camX;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, CANVAS_H); ctx.stroke();
    }
    for (let gy = startGY; gy < camY + CANVAS_H + gridSize; gy += gridSize) {
      const sy = gy - camY;
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(CANVAS_W, sy); ctx.stroke();
    }

    // World border
    ctx.strokeStyle = "rgba(239,68,68,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(-camX, -camY, WORLD, WORLD);

    // Zone circle (outside = danger)
    const zScreenX = g.zone.cx - camX;
    const zScreenY = g.zone.cy - camY;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_W, CANVAS_H);
    ctx.arc(zScreenX, zScreenY, g.zone.radius, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(239,68,68,0.12)";
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(59,130,246,0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.arc(zScreenX, zScreenY, g.zone.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Target zone
    if (Math.abs(g.zone.radius - g.zone.targetRadius) > 5) {
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.arc(g.zone.targetCx - camX, g.zone.targetCy - camY, g.zone.targetRadius, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Loot
    for (const l of g.loot) {
      if (!l.alive) continue;
      const sx = l.x - camX;
      const sy = l.y - camY;
      if (sx < -20 || sx > CANVAS_W + 20 || sy < -20 || sy > CANVAS_H + 20) continue;
      const col = LOOT_COLORS[l.type];
      ctx.fillStyle = col + "40";
      ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(LOOT_LABELS[l.type], sx, sy);
    }

    // Supply drops
    for (const sd of g.supplyDrops) {
      const sx = sd.x - camX;
      const baseY = sd.landed ? sd.y - camY : sd.fallY - camY;
      if (sx < -30 || sx > CANVAS_W + 30 || baseY < -30 || baseY > CANVAS_H + 30) continue;
      const glow = 0.4 + 0.3 * Math.sin(g.frame * 0.08);
      ctx.fillStyle = `rgba(251,191,36,${glow})`;
      ctx.beginPath(); ctx.arc(sx, baseY, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(sx - 8, baseY - 10, 16, 20);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx - 8, baseY - 10, 16, 20);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("\u2605", sx, baseY + 4);
      if (!sd.landed) {
        ctx.strokeStyle = "rgba(251,191,36,0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(sd.x - camX, 0); ctx.lineTo(sx, baseY); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Entities
    for (let i = 0; i < g.entities.length; i++) {
      const e = g.entities[i];
      if (!e.alive) continue;
      const sx = e.x - camX;
      const sy = e.y - camY;
      if (sx < -40 || sx > CANVAS_W + 40 || sy < -40 || sy > CANVAS_H + 40) continue;

      // Body shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.arc(sx + 2, sy + 2, e.radius, 0, Math.PI * 2); ctx.fill();

      // Body
      const bodyGrad = ctx.createRadialGradient(sx - 3, sy - 3, 0, sx, sy, e.radius);
      bodyGrad.addColorStop(0, e.color);
      bodyGrad.addColorStop(1, e.color + "aa");
      ctx.fillStyle = bodyGrad;
      ctx.beginPath(); ctx.arc(sx, sy, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = e.isPlayer ? "#fff" : "rgba(255,255,255,0.3)";
      ctx.lineWidth = e.isPlayer ? 2 : 1;
      ctx.stroke();

      // Weapon direction
      ctx.strokeStyle = WEAPONS[e.weapon].color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(e.angle) * e.radius * 0.5, sy + Math.sin(e.angle) * e.radius * 0.5);
      ctx.lineTo(sx + Math.cos(e.angle) * (e.radius + 8), sy + Math.sin(e.angle) * (e.radius + 8));
      ctx.stroke();

      // Health bar (above entity)
      if (e.shield > 0) {
        ctx.fillStyle = "#818cf8";
        ctx.fillRect(sx - 16, sy - e.radius - 10, 32 * (e.shield / 50), 3);
      }
      ctx.fillStyle = e.hp > 50 ? "#22c55e" : e.hp > 25 ? "#fbbf24" : "#ef4444";
      ctx.fillRect(sx - 16, sy - e.radius - 6, 32 * (e.hp / e.maxHp), 3);

      // Name
      if (!e.isPlayer && dist(e, player) < 250) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(e.name, sx, sy - e.radius - 14);
      }
      if (e.isPlayer) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Voce", sx, sy - e.radius - 14);
      }
    }

    // Bullets
    for (const b of g.bullets) {
      const sx = b.x - camX;
      const sy = b.y - camY;
      if (sx < -5 || sx > CANVAS_W + 5 || sy < -5 || sy > CANVAS_H + 5) continue;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = b.color + "40";
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
    }

    // Particles
    for (const p of g.particles) {
      const sx = p.x - camX;
      const sy = p.y - camY;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(sx, sy, p.size * alpha, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Minimap
    const mmSize = 130;
    const mmX = CANVAS_W - mmSize - 10;
    const mmY = 10;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(mmX, mmY, mmSize, mmSize);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX, mmY, mmSize, mmSize);

    const mmScale = mmSize / WORLD;
    // Zone on minimap
    ctx.strokeStyle = "rgba(59,130,246,0.5)";
    ctx.beginPath();
    ctx.arc(mmX + g.zone.cx * mmScale, mmY + g.zone.cy * mmScale, g.zone.radius * mmScale, 0, Math.PI * 2);
    ctx.stroke();

    // Bots on minimap
    for (const e of g.entities) {
      if (!e.alive || e.isPlayer) continue;
      const d = dist(e, player);
      if (d > 400) continue;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.arc(mmX + e.x * mmScale, mmY + e.y * mmScale, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // Player on minimap
    ctx.fillStyle = "#22c55e";
    ctx.beginPath(); ctx.arc(mmX + player.x * mmScale, mmY + player.y * mmScale, 3, 0, Math.PI * 2); ctx.fill();

    // Supply drops on minimap
    for (const sd of g.supplyDrops) {
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(mmX + sd.x * mmScale, mmY + sd.y * mmScale, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Zone warning vignette when outside
    const playerDistToZone = dist(player, { x: g.zone.cx, y: g.zone.cy });
    if (playerDistToZone > g.zone.radius) {
      const intensity = Math.min(0.3, (playerDistToZone - g.zone.radius) / 200);
      const vig = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.3, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.7);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, `rgba(239,68,68,${intensity})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    g.animId = requestAnimationFrame(() => gameLoop(g));
  }, [updateBots, shoot, updateHUD, endGame]);

  const initGame = useCallback((diff: Difficulty) => {
    const entities: Entity[] = [];
    const usedNames = new Set<number>();
    entities.push(createEntity(WORLD / 2 + (Math.random() - 0.5) * 400, WORLD / 2 + (Math.random() - 0.5) * 400, "Voce", "#22c55e", true));
    const botColors = ["#ef4444","#f97316","#eab308","#a855f7","#ec4899","#14b8a6","#6366f1","#f43f5e","#84cc16","#06b6d4"];
    for (let i = 0; i < BOT_COUNT; i++) {
      let nameIdx: number;
      do { nameIdx = Math.floor(Math.random() * BOT_NAMES_LEN); } while (usedNames.has(nameIdx));
      usedNames.add(nameIdx);
      const bx = 100 + Math.random() * (WORLD - 200);
      const by = 100 + Math.random() * (WORLD - 200);
      const bot = createEntity(bx, by, BOT_NAMES[nameIdx], botColors[i % botColors.length], false);
      const r = Math.random();
      if (r < 0.3) { bot.weapon = "shotgun"; bot.ammo = 15; }
      else if (r < 0.6) { bot.weapon = "rifle"; bot.ammo = 20; }
      entities.push(bot);
    }
    const loot: Loot[] = Array.from({ length: LOOT_COUNT }, () => createLoot());
    const g: GameState = {
      entities, bullets: [], loot, particles: [], supplyDrops: [], killFeed: [],
      zone: { cx: WORLD / 2, cy: WORLD / 2, radius: WORLD * 0.45, targetRadius: WORLD * 0.45, targetCx: WORLD / 2, targetCy: WORLD / 2, shrinkSpeed: 0, phase: 0, phaseTimer: 0, damage: 1 },
      keys: new Set(), mouseX: 0, mouseY: 0, mouseDown: false, frame: 0, running: true, animId: 0,
      difficulty: diff, startTime: Date.now(), aliveCount: BOT_COUNT + 1, playerIdx: 0,
    };
    gameRef.current = g;
    setGameStatus("playing");
    setHudData({ hp: 100, shield: 0, weapon: "pistol", ammo: 30, kills: 0, alive: BOT_COUNT + 1, placement: 1 });
    setKillFeed([]);
    return g;
  }, []);

  const startGame = useCallback(() => {
    if (gameRef.current) cancelAnimationFrame(gameRef.current.animId);
    const g = initGame(difficulty);
    g.animId = requestAnimationFrame(() => gameLoop(g));
  }, [initGame, gameLoop, difficulty]);

  const resetAll = useCallback(() => {
    if (gameRef.current) { cancelAnimationFrame(gameRef.current.animId); gameRef.current = null; }
    setGameStatus("idle");
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (gameRef.current) gameRef.current.keys.add(e.key); if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault(); };
    const up = (e: KeyboardEvent) => { if (gameRef.current) gameRef.current.keys.delete(e.key); };
    const mouseMove = (e: MouseEvent) => { if (gameRef.current && canvasRef.current) { const r = canvasRef.current.getBoundingClientRect(); gameRef.current.mouseX = e.clientX - r.left; gameRef.current.mouseY = e.clientY - r.top; } };
    const mouseDown = () => { if (gameRef.current) gameRef.current.mouseDown = true; };
    const mouseUp = () => { if (gameRef.current) gameRef.current.mouseDown = false; };
    const ctxMenu = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mousedown", mouseDown);
    window.addEventListener("mouseup", mouseUp);
    const canvas = canvasRef.current;
    canvas?.addEventListener("contextmenu", ctxMenu);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mouseup", mouseUp);
      canvas?.removeEventListener("contextmenu", ctxMenu);
    };
  }, []);

  useEffect(() => { return () => { if (gameRef.current) cancelAnimationFrame(gameRef.current.animId); }; }, []);

  void liveCode;

  const diffKeys: Difficulty[] = ["facil", "normal", "dificil"];

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[820px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-900/30 to-red-900/30 border border-emerald-500/20 p-3"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-emerald-400" />
            <span className="text-white font-bold tracking-wide">Battle Royale</span>
          </div>
          {gameStatus === "playing" && (
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-xs bg-emerald-500/10">
                <Users className="w-3 h-3 mr-1" />{hudData.alive} vivos
              </Badge>
              <Badge variant="outline" className="border-red-500/40 text-red-400 text-xs bg-red-500/10">
                <Target className="w-3 h-3 mr-1" />{hudData.kills} abates
              </Badge>
              <Badge variant="outline" className={cn("border-amber-500/40 text-xs bg-amber-500/10", DIFF_STATS[difficulty].color)}>
                {DIFF_STATS[difficulty].label}
              </Badge>
            </div>
          )}
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
          className="w-full h-auto block cursor-crosshair"
          style={{ imageRendering: "auto" }}
        />

        <AnimatePresence>
          {gameStatus === "playing" && (
            <motion.div
              key="hud-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <div className="w-32 h-2.5 bg-black/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-500 rounded-full"
                      animate={{ width: `${hudData.shield * 2}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <span className="text-indigo-300 text-[10px] font-mono w-6">{hudData.shield}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-red-400" />
                  <div className="w-32 h-2.5 bg-black/50 rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", hudData.hp > 50 ? "bg-green-500" : hudData.hp > 25 ? "bg-amber-500" : "bg-red-500")}
                      animate={{ width: `${hudData.hp}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                    <span className={cn("text-[10px] font-mono w-6", hudData.hp > 50 ? "text-green-300" : hudData.hp > 25 ? "text-amber-300" : "text-red-300")}>{hudData.hp}</span>
                </div>
              </div>

              <div className="absolute bottom-3 right-3 bg-black/60 rounded-lg px-3 py-2 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: WEAPONS[hudData.weapon].color }} />
                  <span className="text-white text-sm font-bold">{WEAPONS[hudData.weapon].name}</span>
                </div>
                <div className="text-zinc-400 text-xs font-mono mt-0.5">Municao: {hudData.ammo}</div>
              </div>

              <div className="absolute top-3 right-[150px] flex flex-col gap-0.5 max-h-40 overflow-hidden">
                {killFeed.map((kf, i) => (
                  <motion.div
                    key={kf.time + "-" + i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-black/50 rounded px-2 py-0.5 text-[10px] flex items-center gap-1 whitespace-nowrap"
                  >
                    <span className={cn("font-bold", kf.killer === "Voce" ? "text-emerald-400" : kf.killer === "Zona" ? "text-red-400" : "text-zinc-300")}>{kf.killer}</span>
                    <Crosshair className="w-2.5 h-2.5 text-zinc-500" />
                    <span className={cn("font-bold", kf.victim === "Voce" ? "text-red-400" : "text-zinc-400")}>{kf.victim}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                className="mb-3"
              >
                <span className="text-5xl">\uD83C\uDFC6</span>
              </motion.div>
              <h2 className="text-white text-2xl font-bold mb-1">Battle Royale</h2>
              <p className="text-zinc-400 text-sm mb-4 text-center px-4">
                Seja o ultimo sobrevivente! Colete armas, elimine inimigos e sobreviva a zona!
              </p>

              <Card className="bg-black/40 border-zinc-700 mb-4 mx-4 w-full max-w-xs">
                <CardContent className="p-3 text-xs text-zinc-300 space-y-1.5">
                  <p className="text-white font-bold text-sm mb-1">Controles</p>
                  <p><span className="text-emerald-400 font-mono">WASD</span> — Mover personagem</p>
                  <p><span className="text-emerald-400 font-mono">Mouse</span> — Mirar</p>
                  <p><span className="text-emerald-400 font-mono">Clique</span> — Atirar</p>
                  <p className="text-zinc-500 pt-1">Passe por itens para coletar. Cuidado com a zona!</p>
                </CardContent>
              </Card>

              <div className="flex gap-2 mb-4">
                {diffKeys.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-sm font-bold border transition-all",
                      difficulty === d
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : "bg-black/40 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    )}
                  >
                    {DIFF_STATS[d].label}
                  </button>
                ))}
              </div>

              <Button
                onClick={startGame}
                className="bg-gradient-to-r from-emerald-600 to-red-600 hover:from-emerald-500 hover:to-red-500 text-white font-bold px-8"
              >
                Iniciar Partida
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
                <span className="text-4xl">{resultData.placement === 1 ? "\uD83C\uDFC6" : "\u2620\uFE0F"}</span>
              </motion.div>
              <h2 className="text-white text-2xl font-bold mb-1">
                {resultData.placement === 1 ? "Vitoria Royale!" : "Eliminado"}
              </h2>
              <p className={cn("text-lg font-bold mb-4", resultData.placement === 1 ? "text-amber-400" : "text-zinc-400")}>
                {resultData.placement === 1 ? "Voce e o ultimo sobrevivente!" : `Colocacao: #${resultData.placement}`}
              </p>
              <div className="flex gap-5 mb-5">
                <div className="text-center">
                  <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <p className="text-zinc-400 text-xs">Abates</p>
                  <p className="text-white text-xl font-mono font-bold">{resultData.kills}</p>
                </div>
                <div className="text-center">
                  <Crosshair className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <p className="text-zinc-400 text-xs">Dano</p>
                  <p className="text-white text-xl font-mono font-bold">{resultData.damage}</p>
                </div>
                <div className="text-center">
                  <Clock className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <p className="text-zinc-400 text-xs">Tempo</p>
                  <p className="text-white text-xl font-mono font-bold">{resultData.time}s</p>
                </div>
              </div>
              <Button onClick={resetAll} variant="outline" className="border-zinc-600 text-zinc-400 hover:bg-zinc-700">
                <RotateCcw className="w-4 h-4 mr-1" />Jogar Novamente
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {gameStatus === "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-zinc-500 text-xs space-y-1 mt-1"
          >
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <p><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: WEAPONS.pistol.color }} />Pistola — Rapida, pouco dano</p>
              <p><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: WEAPONS.shotgun.color }} />Escopeta — Lenta, alto dano</p>
              <p><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: WEAPONS.rifle.color }} />Rifle — Media, precisa</p>
            </div>
            <p className="text-zinc-600 pt-1">Armas e suprimentos dropam pelo mapa. Drops especiais caem periodicamente!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BattleRoyaleGame;
