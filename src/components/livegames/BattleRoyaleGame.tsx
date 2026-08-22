import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, Heart, Shield, RotateCcw, Target, Clock, Trophy, Users, Swords, Zap, AlertTriangle } from "lucide-react";
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
  lastDamageFrame: number;
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
  trail: { x: number; y: number }[];
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

interface DamageNumber {
  x: number;
  y: number;
  damage: number;
  life: number;
  maxLife: number;
  color: string;
  isHeal: boolean;
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
  weapon: string;
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
  warningPulse: number;
}

interface GameState {
  entities: Entity[];
  bullets: Bullet[];
  loot: Loot[];
  particles: Particle[];
  damageNumbers: DamageNumber[];
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
  shakeIntensity: number;
  lastPlayerDamageFrame: number;
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
  damageDealt: 0, kills: 0, vx: 0, vy: 0, targetAngle: 0, isPlayer, lastDamageFrame: 0,
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

const createDamageNumber = (x: number, y: number, damage: number, color: string, isHeal: boolean): DamageNumber => ({
  x: x + (Math.random() - 0.5) * 16,
  y: y - 10,
  damage,
  life: 45,
  maxLife: 45,
  color,
  isHeal,
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
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameStatus, setGameStatus] = useState<GameStatus>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [hudData, setHudData] = useState({ hp: 100, shield: 0, weapon: "pistol" as WeaponType, ammo: 30, kills: 0, alive: 40, placement: 1, fireCooldown: 0, fireRate: 8 });
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [resultData, setResultData] = useState({ placement: 1, kills: 0, damage: 0, time: 0 });
  const [playerTookDamage, setPlayerTookDamage] = useState(false);
  const [zoneWarning, setZoneWarning] = useState(false);
  const [fireCooldownPct, setFireCooldownPct] = useState(0);

  const updateHUD = useCallback((g: GameState) => {
    const p = g.entities[g.playerIdx];
    if (!p) return;
    const weaponDef = WEAPONS[p.weapon];
    const cdPct = p.fireCooldown > 0 ? (p.fireCooldown / weaponDef.fireRate) * 100 : 0;
    setFireCooldownPct(cdPct);
    setHudData({ hp: p.hp, shield: p.shield, weapon: p.weapon, ammo: p.ammo, kills: p.kills, alive: g.aliveCount, placement: p.alive ? g.aliveCount : 0, fireCooldown: p.fireCooldown, fireRate: weaponDef.fireRate });
    setKillFeed(g.killFeed.slice(-6));
    const playerDistToZone = dist(p, { x: g.zone.cx, y: g.zone.cy });
    setZoneWarning(playerDistToZone > g.zone.radius * 0.85);
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
        trail: [],
      });
    }
    // Muzzle flash particles
    g.particles.push(...createExplosion(
      shooter.x + Math.cos(angle) * (shooter.radius + 8),
      shooter.y + Math.sin(angle) * (shooter.radius + 8),
      w.color, 3
    ));
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

    // Decay screen shake
    g.shakeIntensity *= 0.85;
    if (g.shakeIntensity < 0.3) g.shakeIntensity = 0;

    // Zone shrinking
    g.zone.phaseTimer++;
    g.zone.warningPulse = (g.zone.warningPulse + 0.04) % (Math.PI * 2);
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

    // Bullets update with trail
    g.bullets = g.bullets.filter((b) => {
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 4) b.trail.shift();
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      if (b.life <= 0 || b.x < 0 || b.x > WORLD || b.y < 0 || b.y > WORLD) return false;
      for (let i = 0; i < g.entities.length; i++) {
        const e = g.entities[i];
        if (!e.alive || i === b.ownerIdx) continue;
        if (dist(b, e) < e.radius + 3) {
          let dmg = b.damage;
          let actualDmg = dmg;
          if (e.shield > 0) { const absorbed = Math.min(e.shield, dmg); e.shield -= absorbed; dmg -= absorbed; }
          e.hp -= dmg;
          e.lastDamageFrame = g.frame;
          g.entities[b.ownerIdx].damageDealt += b.damage;
          g.particles.push(...createExplosion(b.x, b.y, e.color, 4));
          // Damage number
          g.damageNumbers.push(createDamageNumber(e.x, e.y, actualDmg, b.color, false));
          // Screen shake if player hit
          if (e.isPlayer) {
            g.shakeIntensity = Math.min(12, g.shakeIntensity + 4 + actualDmg * 0.15);
            g.lastPlayerDamageFrame = g.frame;
          }
          if (e.hp <= 0) {
            e.alive = false;
            g.aliveCount--;
            g.entities[b.ownerIdx].kills++;
            g.particles.push(...createExplosion(e.x, e.y, e.color, 12));
            g.particles.push(...createExplosion(e.x, e.y, "#ffffff", 6));
            g.killFeed.push({ killer: g.entities[b.ownerIdx].name, victim: e.name, time: g.frame, weapon: g.entities[b.ownerIdx].weapon });
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
        e.lastDamageFrame = g.frame;
        g.damageNumbers.push(createDamageNumber(e.x, e.y, g.zone.damage, "#ef4444", false));
        if (e.isPlayer) {
          g.shakeIntensity = Math.min(8, g.shakeIntensity + 2);
          g.lastPlayerDamageFrame = g.frame;
        }
        if (e.hp <= 0) {
          e.alive = false;
          g.aliveCount--;
          g.particles.push(...createExplosion(e.x, e.y, "#ef4444", 8));
          g.killFeed.push({ killer: "Zona", victim: e.name, time: g.frame, weapon: "zone" });
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
          if (l.type === "health") { e.hp = Math.min(e.maxHp, e.hp + 30); g.damageNumbers.push(createDamageNumber(e.x, e.y, 30, "#22c55e", true)); }
          else if (l.type === "shield") { e.shield = Math.min(50, e.shield + 25); g.damageNumbers.push(createDamageNumber(e.x, e.y, 25, "#818cf8", true)); }
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
            if (lt === "health") { e.hp = Math.min(e.maxHp, e.hp + 50); g.damageNumbers.push(createDamageNumber(e.x, e.y, 50, "#22c55e", true)); }
            else if (lt === "shield") { e.shield = Math.min(50, e.shield + 50); g.damageNumbers.push(createDamageNumber(e.x, e.y, 50, "#818cf8", true)); }
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

    // Damage numbers
    g.damageNumbers = g.damageNumbers.filter((dn) => { dn.y -= 0.8; dn.life--; return dn.life > 0; });

    if (g.frame % 10 === 0) updateHUD(g);

    // Trigger damage flash for player
    if (g.frame - g.lastPlayerDamageFrame === 1) {
      setPlayerTookDamage(true);
      setTimeout(() => setPlayerTookDamage(false), 150);
    }

    // ---- RENDER ----
    // Screen shake offset
    const shakeX = g.shakeIntensity > 0 ? (Math.random() - 0.5) * g.shakeIntensity * 2 : 0;
    const shakeY = g.shakeIntensity > 0 ? (Math.random() - 0.5) * g.shakeIntensity * 2 : 0;

    const camX = player.x - CANVAS_W / 2 + shakeX;
    const camY = player.y - CANVAS_H / 2 + shakeY;

    // Background with subtle gradient
    ctx.fillStyle = "#080c12";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle radial gradient for depth
    const bgGrad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 0, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.7);
    bgGrad.addColorStop(0, "rgba(16,24,36,0.4)");
    bgGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
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

    // World border with glow
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "rgba(239,68,68,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-camX, -camY, WORLD, WORLD);
    ctx.shadowBlur = 0;

    // Zone circle (outside = danger) with animated edge
    const zScreenX = g.zone.cx - camX;
    const zScreenY = g.zone.cy - camY;

    // Danger zone fill with animated edge pulse
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_W, CANVAS_H);
    ctx.arc(zScreenX, zScreenY, g.zone.radius, 0, Math.PI * 2, true);
    const dangerAlpha = 0.1 + 0.04 * Math.sin(g.zone.warningPulse);
    ctx.fillStyle = `rgba(239,68,68,${dangerAlpha})`;
    ctx.fill();
    ctx.restore();

    // Animated electric zone border
    const pulseAlpha = 0.5 + 0.2 * Math.sin(g.zone.warningPulse * 2);
    ctx.shadowColor = "#3b82f6";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = `rgba(59,130,246,${pulseAlpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(zScreenX, zScreenY, g.zone.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner zone glow ring
    ctx.strokeStyle = `rgba(96,165,250,${0.15 + 0.1 * Math.sin(g.zone.warningPulse * 3)})`;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(zScreenX, zScreenY, g.zone.radius + 4, 0, Math.PI * 2); ctx.stroke();

    // Outer danger ring
    ctx.strokeStyle = `rgba(239,68,68,${0.2 + 0.15 * Math.sin(g.zone.warningPulse * 2.5)})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.beginPath(); ctx.arc(zScreenX, zScreenY, g.zone.radius - 6, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Target zone indicator
    if (Math.abs(g.zone.radius - g.zone.targetRadius) > 5) {
      const targetPulse = 0.1 + 0.08 * Math.sin(g.frame * 0.05);
      ctx.strokeStyle = `rgba(255,255,255,${targetPulse})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 10]);
      ctx.beginPath(); ctx.arc(g.zone.targetCx - camX, g.zone.targetCy - camY, g.zone.targetRadius, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      // Shrinking direction arrow
      const arrowAngle = Math.atan2(g.zone.targetCy - g.zone.cy, g.zone.targetCx - g.zone.cx);
      const arrowDist = g.zone.radius * 0.7;
      const arrowX = zScreenX + Math.cos(arrowAngle) * arrowDist;
      const arrowY = zScreenY + Math.sin(arrowAngle) * arrowDist;
      ctx.fillStyle = `rgba(255,255,255,${targetPulse + 0.05})`;
      ctx.beginPath();
      ctx.moveTo(arrowX + Math.cos(arrowAngle) * 8, arrowY + Math.sin(arrowAngle) * 8);
      ctx.lineTo(arrowX + Math.cos(arrowAngle + 2.5) * 6, arrowY + Math.sin(arrowAngle + 2.5) * 6);
      ctx.lineTo(arrowX + Math.cos(arrowAngle - 2.5) * 6, arrowY + Math.sin(arrowAngle - 2.5) * 6);
      ctx.closePath();
      ctx.fill();
    }

    // Loot with pulsing glow
    for (const l of g.loot) {
      if (!l.alive) continue;
      const sx = l.x - camX;
      const sy = l.y - camY;
      if (sx < -20 || sx > CANVAS_W + 20 || sy < -20 || sy > CANVAS_H + 20) continue;
      const col = LOOT_COLORS[l.type];
      const lootPulse = 0.3 + 0.2 * Math.sin(g.frame * 0.06 + l.x * 0.01);
      // Outer glow
      ctx.fillStyle = col + "15";
      ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();
      // Mid glow
      ctx.fillStyle = col + "30";
      ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
      // Inner solid
      const lootGrad = ctx.createRadialGradient(sx - 1, sy - 1, 0, sx, sy, 7);
      lootGrad.addColorStop(0, col);
      lootGrad.addColorStop(1, col + "aa");
      ctx.fillStyle = lootGrad;
      ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
      // Border
      ctx.strokeStyle = col + "80";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.stroke();
      // Label
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
      // Pulsing outer glow
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 15;
      ctx.fillStyle = `rgba(251,191,36,${glow * 0.3})`;
      ctx.beginPath(); ctx.arc(sx, baseY, 22, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
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
      if (sx < -40 || sx > CANVAS_W + 40 || sy < -50 || sy > CANVAS_H + 40) continue;

      // Damage flash ring
      const dmgFlash = g.frame - e.lastDamageFrame;
      if (dmgFlash < 10) {
        const flashAlpha = (1 - dmgFlash / 10) * 0.5;
        const flashRadius = e.radius + dmgFlash * 2;
        ctx.strokeStyle = `rgba(255,100,100,${flashAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, flashRadius, 0, Math.PI * 2); ctx.stroke();
      }

      // Body shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath(); ctx.arc(sx + 2, sy + 3, e.radius, 0, Math.PI * 2); ctx.fill();

      // Player outer glow ring
      if (e.isPlayer) {
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "rgba(34,197,94,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, e.radius + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Body with gradient
      const bodyGrad = ctx.createRadialGradient(sx - 3, sy - 3, 0, sx, sy, e.radius);
      bodyGrad.addColorStop(0, e.color);
      bodyGrad.addColorStop(1, e.color + "aa");
      ctx.fillStyle = bodyGrad;
      ctx.beginPath(); ctx.arc(sx, sy, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = e.isPlayer ? "#fff" : "rgba(255,255,255,0.3)";
      ctx.lineWidth = e.isPlayer ? 2.5 : 1;
      ctx.stroke();

      // Weapon direction with glow
      const wColor = WEAPONS[e.weapon].color;
      ctx.shadowColor = wColor;
      ctx.shadowBlur = 4;
      ctx.strokeStyle = wColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(e.angle) * e.radius * 0.5, sy + Math.sin(e.angle) * e.radius * 0.5);
      ctx.lineTo(sx + Math.cos(e.angle) * (e.radius + 10), sy + Math.sin(e.angle) * (e.radius + 10));
      ctx.stroke();
      // Muzzle tip
      ctx.fillStyle = wColor;
      ctx.beginPath();
      ctx.arc(sx + Math.cos(e.angle) * (e.radius + 10), sy + Math.sin(e.angle) * (e.radius + 10), 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Health bar background
      const barW = 36;
      const barH = 4;
      const barY = sy - e.radius - 12;
      const barX = sx - barW / 2;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
      ctx.fill();

      // Shield bar
      if (e.shield > 0) {
        const shieldW = (barW * (e.shield / 50));
        ctx.fillStyle = "#818cf8";
        ctx.shadowColor = "#818cf8";
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.roundRect(barX, barY - 4, shieldW, 3, 1.5);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // HP bar with color gradient
      const hpPct = e.hp / e.maxHp;
      const hpColor = e.hp > 60 ? "#22c55e" : e.hp > 30 ? "#eab308" : "#ef4444";
      ctx.fillStyle = hpColor;
      ctx.shadowColor = hpColor;
      ctx.shadowBlur = 2;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * hpPct, barH, 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Low health pulse
      if (e.hp <= 30 && e.isPlayer) {
        const lowPulse = 0.15 + 0.1 * Math.sin(g.frame * 0.15);
        ctx.strokeStyle = `rgba(239,68,68,${lowPulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, e.radius + 8, 0, Math.PI * 2); ctx.stroke();
      }

      // Name
      if (!e.isPlayer && dist(e, player) < 250) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(e.name, sx + 1, sy - e.radius - 17);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText(e.name, sx, sy - e.radius - 18);
      }
      if (e.isPlayer) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Voce", sx, sy - e.radius - 18);
      }
    }

    // Bullets with trails
    for (const b of g.bullets) {
      const sx = b.x - camX;
      const sy = b.y - camY;
      if (sx < -10 || sx > CANVAS_W + 10 || sy < -10 || sy > CANVAS_H + 10) continue;

      // Trail
      if (b.trail.length > 1) {
        ctx.strokeStyle = b.color + "30";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.trail[0].x - camX, b.trail[0].y - camY);
        for (let t = 1; t < b.trail.length; t++) {
          ctx.lineTo(b.trail[t].x - camX, b.trail[t].y - camY);
        }
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      // Bullet glow
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Particles
    for (const p of g.particles) {
      const sx = p.x - camX;
      const sy = p.y - camY;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 3;
      ctx.beginPath(); ctx.arc(sx, sy, p.size * alpha, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Damage numbers
    for (const dn of g.damageNumbers) {
      const sx = dn.x - camX;
      const sy = dn.y - camY;
      if (sx < -30 || sx > CANVAS_W + 30 || sy < -30 || sy > CANVAS_H + 30) continue;
      const alpha = dn.life / dn.maxLife;
      const scale = 0.8 + (1 - alpha) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.round(12 * scale)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Text outline
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 3;
      ctx.strokeText(dn.isHeal ? `+${dn.damage}` : `-${dn.damage}`, sx, sy);
      ctx.fillStyle = dn.color;
      ctx.shadowColor = dn.color;
      ctx.shadowBlur = 4;
      ctx.fillText(dn.isHeal ? `+${dn.damage}` : `-${dn.damage}`, sx, sy);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Minimap
    const mmSize = 140;
    const mmX = CANVAS_W - mmSize - 10;
    const mmY = 10;
    // Minimap background
    const mmGrad = ctx.createLinearGradient(mmX, mmY, mmX + mmSize, mmY + mmSize);
    mmGrad.addColorStop(0, "rgba(0,0,0,0.7)");
    mmGrad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = mmGrad;
    ctx.beginPath(); ctx.roundRect(mmX, mmY, mmSize, mmSize, 4); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(mmX, mmY, mmSize, mmSize, 4); ctx.stroke();

    const mmScale = mmSize / WORLD;
    // Zone on minimap
    ctx.strokeStyle = "rgba(59,130,246,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mmX + g.zone.cx * mmScale, mmY + g.zone.cy * mmScale, g.zone.radius * mmScale, 0, Math.PI * 2);
    ctx.stroke();
    // Target zone on minimap
    if (Math.abs(g.zone.radius - g.zone.targetRadius) > 5) {
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(mmX + g.zone.targetCx * mmScale, mmY + g.zone.targetCy * mmScale, g.zone.targetRadius * mmScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Bots on minimap
    for (const e of g.entities) {
      if (!e.alive || e.isPlayer) continue;
      const d = dist(e, player);
      if (d > 400) continue;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.arc(mmX + e.x * mmScale, mmY + e.y * mmScale, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // Player on minimap with direction
    ctx.fillStyle = "#22c55e";
    ctx.shadowColor = "#22c55e";
    ctx.shadowBlur = 3;
    ctx.beginPath(); ctx.arc(mmX + player.x * mmScale, mmY + player.y * mmScale, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Player direction on minimap
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mmX + player.x * mmScale, mmY + player.y * mmScale);
    ctx.lineTo(mmX + (player.x + Math.cos(player.angle) * 80) * mmScale, mmY + (player.y + Math.sin(player.angle) * 80) * mmScale);
    ctx.stroke();

    // Supply drops on minimap
    for (const sd of g.supplyDrops) {
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(mmX + sd.x * mmScale, mmY + sd.y * mmScale, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Zone warning vignette when outside
    const playerDistToZone = dist(player, { x: g.zone.cx, y: g.zone.cy });
    if (playerDistToZone > g.zone.radius) {
      const intensity = Math.min(0.35, (playerDistToZone - g.zone.radius) / 200);
      const vig = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.25, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.65);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      const pulseVig = intensity + 0.05 * Math.sin(g.frame * 0.12);
      vig.addColorStop(1, `rgba(239,68,68,${pulseVig})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Damage flash overlay
    if (g.frame - g.lastPlayerDamageFrame < 6) {
      const dmgOverlay = (1 - (g.frame - g.lastPlayerDamageFrame) / 6) * 0.15;
      ctx.fillStyle = `rgba(239,68,68,${dmgOverlay})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // Low health vignette
    if (player.hp <= 30 && player.alive) {
      const lowIntensity = 0.08 + 0.06 * Math.sin(g.frame * 0.1);
      const lowVig = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.3, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.65);
      lowVig.addColorStop(0, "rgba(0,0,0,0)");
      lowVig.addColorStop(1, `rgba(239,68,68,${lowIntensity})`);
      ctx.fillStyle = lowVig;
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
      entities, bullets: [], loot, particles: [], damageNumbers: [], supplyDrops: [], killFeed: [],
      zone: { cx: WORLD / 2, cy: WORLD / 2, radius: WORLD * 0.45, targetRadius: WORLD * 0.45, targetCx: WORLD / 2, targetCy: WORLD / 2, shrinkSpeed: 0, phase: 0, phaseTimer: 0, damage: 1, warningPulse: 0 },
      keys: new Set(), mouseX: 0, mouseY: 0, mouseDown: false, frame: 0, running: true, animId: 0,
      difficulty: diff, startTime: Date.now(), aliveCount: BOT_COUNT + 1, playerIdx: 0,
      shakeIntensity: 0, lastPlayerDamageFrame: -999,
    };
    gameRef.current = g;
    setGameStatus("playing");
    setPlayerTookDamage(false);
    setZoneWarning(false);
    setHudData({ hp: 100, shield: 0, weapon: "pistol", ammo: 30, kills: 0, alive: BOT_COUNT + 1, placement: 1, fireCooldown: 0, fireRate: 8 });
    setKillFeed([]);
    setFireCooldownPct(0);
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
  const weaponDef = WEAPONS[hudData.weapon];

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[820px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-900/30 via-zinc-900/40 to-red-900/30 border border-emerald-500/20 p-3"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-emerald-400" />
            <span className="text-white font-bold tracking-wide">Battle Royale</span>
          </div>
          {gameStatus === "playing" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 flex-wrap"
            >
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-xs bg-emerald-500/10">
                <Users className="w-3 h-3 mr-1" />{hudData.alive} vivos
              </Badge>
              <Badge variant="outline" className="border-red-500/40 text-red-400 text-xs bg-red-500/10">
                <Swords className="w-3 h-3 mr-1" />{hudData.kills} abates
              </Badge>
              <motion.div
                animate={{ scale: hudData.placement <= 5 ? [1, 1.1, 1] : 1 }}
                transition={{ repeat: hudData.placement <= 5 ? Infinity : 0, duration: 2 }}
              >
                <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-xs bg-amber-500/10">
                  <Trophy className="w-3 h-3 mr-1" />#{hudData.placement}
                </Badge>
              </motion.div>
              <Badge variant="outline" className={cn("border-amber-500/40 text-xs bg-amber-500/10", DIFF_STATS[difficulty].color)}>
                {DIFF_STATS[difficulty].label}
              </Badge>
            </motion.div>
          )}
        </div>
      </motion.div>

      <motion.div
        ref={containerRef}
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
              {/* Health & Shield Bars - Bottom Left */}
              <div className="absolute bottom-4 left-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <div className="w-36 h-3 bg-black/60 rounded-full overflow-hidden border border-indigo-500/20">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full relative"
                      animate={{ width: `${hudData.shield * 2}%` }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                    </motion.div>
                  </div>
                  <span className="text-indigo-300 text-[10px] font-mono w-6 text-right">{hudData.shield}</span>
                </div>
                <div className="flex items-center gap-2">
                  <motion.div animate={hudData.hp <= 30 ? { scale: [1, 1.15, 1] } : {}} transition={{ repeat: Infinity, duration: 0.8 }}>
                    <Heart className="w-4 h-4 text-red-400" />
                  </motion.div>
                  <div className="w-36 h-3 bg-black/60 rounded-full overflow-hidden border border-red-500/20">
                    <motion.div
                      className={cn("h-full rounded-full relative", hudData.hp > 60 ? "bg-gradient-to-r from-green-600 to-green-400" : hudData.hp > 30 ? "bg-gradient-to-r from-amber-600 to-amber-400" : "bg-gradient-to-r from-red-600 to-red-400")}
                      animate={{ width: `${hudData.hp}%` }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                    </motion.div>
                  </div>
                  <motion.span
                    className={cn("text-[10px] font-mono w-8 text-right font-bold", hudData.hp > 60 ? "text-green-300" : hudData.hp > 30 ? "text-amber-300" : "text-red-300")}
                    animate={hudData.hp <= 25 ? { opacity: [1, 0.5, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                  >{hudData.hp}</motion.span>
                </div>
              </div>

              {/* Weapon & Ammo - Bottom Right */}
              <div className="absolute bottom-4 right-4">
                <motion.div
                  className="bg-black/70 rounded-lg px-3 py-2.5 border border-white/10 backdrop-blur-sm"
                  layout
                >
                  <div className="flex items-center gap-2 mb-1">
                    <motion.div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: weaponDef.color, boxShadow: `0 0 8px ${weaponDef.color}60` }}
                      animate={{ scale: fireCooldownPct > 0 ? [1, 0.7, 1] : 1 }}
                      transition={{ duration: 0.1 }}
                    />
                    <span className="text-white text-sm font-bold tracking-wide">{weaponDef.name}</span>
                    <span className="text-zinc-500 text-[10px] ml-1">{weaponDef.bulletsPerShot > 1 ? `${weaponDef.bulletsPerShot}x` : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-zinc-500 text-[9px] uppercase tracking-wider">Municao</span>
                        <span className={cn("text-[10px] font-mono font-bold", hudData.ammo > 10 ? "text-zinc-300" : "text-red-400")}>{hudData.ammo}</span>
                      </div>
                      <div className="w-24 h-1.5 bg-black/50 rounded-full overflow-hidden">
                        <motion.div
                          className={cn("h-full rounded-full", hudData.ammo > 10 ? "bg-zinc-400" : "bg-red-500")}
                          animate={{ width: `${Math.min(100, (hudData.ammo / 99) * 100)}%` }}
                          transition={{ duration: 0.15 }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Fire rate cooldown bar */}
                  {fireCooldownPct > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-1.5"
                    >
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-orange-400/60 rounded-full"
                          animate={{ width: `${100 - fireCooldownPct}%` }}
                          transition={{ duration: 0.05 }}
                        />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* Placement - Top Center */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2">
                <motion.div
                  animate={{ scale: hudData.alive <= 10 ? [1, 1.05, 1] : 1 }}
                  transition={{ repeat: hudData.alive <= 10 ? Infinity : 0, duration: 1.5 }}
                >
                  <Badge className={cn(
                    "text-xs font-bold border backdrop-blur-sm",
                    hudData.placement <= 5
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : hudData.placement <= 15
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-zinc-500/15 border-zinc-500/30 text-zinc-300"
                  )}>
                    <Trophy className="w-3 h-3 mr-1" />#{hudData.placement} de {hudData.alive}
                  </Badge>
                </motion.div>
              </div>

              {/* Zone Warning */}
              <AnimatePresence>
                {zoneWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-12 left-1/2 -translate-x-1/2"
                  >
                    <Badge className="bg-red-500/20 border-red-500/40 text-red-300 text-xs animate-pulse">
                      <AlertTriangle className="w-3 h-3 mr-1" />Fora da zona!
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Kill Feed - Top Right */}
              <div className="absolute top-3 right-[160px] flex flex-col gap-0.5 max-h-48 overflow-hidden">
                <AnimatePresence mode="popLayout">
                  {killFeed.map((kf, i) => (
                    <motion.div
                      key={kf.time + "-" + i}
                      initial={{ opacity: 0, x: 30, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.9 }}
                      transition={{ type: "spring", damping: 20, stiffness: 300 }}
                      className="bg-black/60 rounded-md px-2.5 py-1 text-[10px] flex items-center gap-1.5 whitespace-nowrap border border-white/5 backdrop-blur-sm"
                    >
                      <span className={cn("font-bold", kf.killer === "Voce" ? "text-emerald-400" : kf.killer === "Zona" ? "text-red-400" : "text-zinc-300")}>{kf.killer}</span>
                      <Swords className="w-2.5 h-2.5 text-zinc-600" />
                      <span className={cn("font-bold", kf.victim === "Voce" ? "text-red-400" : "text-zinc-500")}>{kf.victim}</span>
                      {kf.killer === "Voce" && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-amber-400 font-bold ml-0.5"
                        >+100</motion.span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Damage Flash Overlay */}
              <AnimatePresence>
                {playerTookDamage && (
                  <motion.div
                    key="damage-flash"
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 pointer-events-none bg-red-600 rounded-xl"
                    style={{ mixBlendMode: "overlay" }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle Screen */}
        <AnimatePresence>
          {gameStatus === "idle" && (
            <motion.div
              key="idle-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                className="mb-2"
              >
                <span className="text-6xl">\uD83C\uDFC6</span>
              </motion.div>
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-white text-3xl font-bold mb-1 tracking-tight"
              >Battle Royale</motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-zinc-400 text-sm mb-5 text-center px-4"
              >
                Seja o ultimo sobrevivente! Colete armas, elimine inimigos e sobreviva a zona!
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <Card className="bg-black/40 border-zinc-700 mb-5 mx-4 w-full max-w-xs">
                  <CardContent className="p-3 text-xs text-zinc-300 space-y-1.5">
                    <p className="text-white font-bold text-sm mb-1">Controles</p>
                    <p><span className="text-emerald-400 font-mono bg-emerald-400/10 px-1.5 py-0.5 rounded">WASD</span> — Mover personagem</p>
                    <p><span className="text-emerald-400 font-mono bg-emerald-400/10 px-1.5 py-0.5 rounded">Mouse</span> — Mirar</p>
                    <p><span className="text-emerald-400 font-mono bg-emerald-400/10 px-1.5 py-0.5 rounded">Clique</span> — Atirar</p>
                    <p className="text-zinc-500 pt-1">Passe por itens para coletar. Cuidado com a zona!</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex gap-2 mb-5"
              >
                {diffKeys.map((d) => (
                  <motion.button
                    key={d}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-sm font-bold border transition-all",
                      difficulty === d
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                        : "bg-black/40 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    )}
                  >
                    {DIFF_STATS[d].label}
                  </motion.button>
                ))}
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", damping: 15 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={startGame}
                  className="bg-gradient-to-r from-emerald-600 to-red-600 hover:from-emerald-500 hover:to-red-500 text-white font-bold px-10 py-2.5 text-base shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow"
                >
                  Iniciar Partida
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Screen */}
        <AnimatePresence>
          {gameStatus === "over" && (
            <motion.div
              key="over-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
            >
              {resultData.placement === 1 ? (
                <>
                  {/* Victory Screen */}
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.2 }}
                    className="mb-3"
                  >
                    <span className="text-6xl">\uD83C\uDFC6</span>
                  </motion.div>
                  <motion.h2
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-amber-400 text-3xl font-extrabold mb-1 tracking-tight"
                  >
                    Vitoria Royale!
                  </motion.h2>
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-amber-200/70 text-sm mb-6"
                  >
                    Voce e o ultimo sobrevivente!
                  </motion.p>
                </>
              ) : (
                <>
                  {/* Defeat Screen */}
                  <motion.div
                    initial={{ scale: 0, rotate: 10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                    className="mb-3"
                  >
                    <span className="text-6xl">\u2620\uFE0F</span>
                  </motion.div>
                  <motion.h2
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-red-400 text-3xl font-extrabold mb-1 tracking-tight"
                  >
                    Eliminado
                  </motion.h2>
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-zinc-400 text-lg font-bold mb-6"
                  >
                    Colocacao: <span className="text-white">#{resultData.placement}</span>
                  </motion.p>
                </>
              )}

              {/* Stats Grid */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, staggerChildren: 0.1 }}
                className="flex gap-6 mb-7"
              >
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  className="text-center bg-black/40 rounded-xl px-5 py-3 border border-white/5"
                >
                  <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Abates</p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-white text-2xl font-mono font-bold"
                  >{resultData.kills}</motion.p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  className="text-center bg-black/40 rounded-xl px-5 py-3 border border-white/5"
                >
                  <Zap className="w-5 h-5 text-red-400 mx-auto mb-1.5" />
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Dano</p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="text-white text-2xl font-mono font-bold"
                  >{resultData.damage}</motion.p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  className="text-center bg-black/40 rounded-xl px-5 py-3 border border-white/5"
                >
                  <Clock className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Tempo</p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="text-white text-2xl font-mono font-bold"
                  >{resultData.time}s</motion.p>
                </motion.div>
              </motion.div>

              {/* Score summary */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="mb-5"
              >
                <p className="text-zinc-500 text-xs">
                  Pontuacao: <span className="text-amber-400 font-bold">{resultData.kills * 100 + resultData.damage + (resultData.placement === 1 ? 500 : Math.max(0, (50 - resultData.placement) * 10))}</span>
                </p>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, type: "spring", damping: 15 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button onClick={resetAll} variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white px-6 py-2.5 shadow-lg">
                  <RotateCcw className="w-4 h-4 mr-2" />Jogar Novamente
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Weapon Legend */}
      <AnimatePresence>
        {gameStatus === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.6 }}
            className="text-center text-zinc-500 text-xs space-y-1 mt-1"
          >
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: WEAPONS.pistol.color, boxShadow: `0 0 6px ${WEAPONS.pistol.color}60` }} />
                <span>Pistola — Rapida, pouco dano</span>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: WEAPONS.shotgun.color, boxShadow: `0 0 6px ${WEAPONS.shotgun.color}60` }} />
                <span>Escopeta — Lenta, alto dano</span>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: WEAPONS.rifle.color, boxShadow: `0 0 6px ${WEAPONS.rifle.color}60` }} />
                <span>Rifle — Media, precisa</span>
              </motion.div>
            </div>
            <p className="text-zinc-600 pt-1">Armas e suprimentos dropam pelo mapa. Drops especiais caem periodicamente!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BattleRoyaleGame;
