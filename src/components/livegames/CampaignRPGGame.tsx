"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Swords, Heart, Zap, Crown, RotateCcw, ChevronRight, Star, Lock, Skull, ShoppingBag, Map as MapIcon, Play, Pause, ArrowLeft, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

// ============================================================
// TYPES
// ============================================================

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface Stats {
  hp: number; maxHp: number;
  atk: number; def: number; spd: number;
  mp: number; maxMp: number;
}

interface Equipment {
  id: string; name: string; type: "weapon" | "armor" | "accessory";
  atk?: number; def?: number; spd?: number; hp?: number; mp?: number;
  price: number; icon: string;
}

interface Enemy {
  name: string; emoji: string; hp: number; maxHp: number;
  atk: number; def: number; spd: number; xpReward: number;
  goldReward: number; color: string;
}

interface Level {
  id: number; name: string; enemies: Enemy[];
  boss?: Enemy; stars: number[]; // damage thresholds for 3-star
}

interface World {
  name: string; emoji: string; color: string;
  levels: Level[];
}

interface PlayerState {
  name: string; classId: number; level: number; xp: number;
  gold: number; currentWorld: number; currentLevel: number;
  equipment: (Equipment | null)[]; // [weapon, armor, accessory]
  inventory: Equipment[];
  worldStars: number[][]; // stars per level per world
  totalStars: number;
}

// ============================================================
// DATA
// ============================================================

const CLASSES = [
  { name: "Guerreiro", emoji: "⚔️", desc: "Alto ataque e defesa", baseHp: 120, baseAtk: 18, baseDef: 14, baseSpd: 8, baseMp: 30, color: "#ef4444" },
  { name: "Mago", emoji: "🔮", desc: "Poder mag devastador", baseHp: 80, baseAtk: 22, baseDef: 6, baseSpd: 10, baseMp: 80, color: "#8b5cf6" },
  { name: "Arqueiro", emoji: "🏹", desc: "Ataques rapidos e precisos", baseHp: 90, baseAtk: 16, baseDef: 8, baseSpd: 18, baseMp: 40, color: "#22c55e" },
  { name: "Ladino", emoji: "🗡️", desc: "Criticos mortais", baseHp: 85, baseAtk: 14, baseDef: 7, baseSpd: 20, baseMp: 50, color: "#f59e0b" },
  { name: "Clerigo", emoji: "✨", desc: "Curandeiro e suporte", baseHp: 100, baseAtk: 10, baseDef: 10, baseSpd: 9, baseMp: 90, color: "#06b6d4" },
  { name: "Barbaro", emoji: "🪓", desc: "Furia bruta", baseHp: 150, baseAtk: 20, baseDef: 12, baseSpd: 6, baseMp: 20, color: "#dc2626" },
];

const SKILLS: Record<number, { name: string; emoji: string; mpCost: number; type: "damage" | "heal" | "buff"; power: number; desc: string }[]> = {
  0: [{ name: "Golpe Heroico", emoji: "⚔️", mpCost: 10, type: "damage", power: 1.8, desc: "Dano forte" }],
  1: [{ name: "Bola de Fogo", emoji: "🔥", mpCost: 15, type: "damage", power: 2.2, desc: "Dano magico" }, { name: "Gelo", emoji: "❄️", mpCost: 12, type: "damage", power: 1.6, desc: "Congela" }],
  2: [{ name: "Tiro Preciso", emoji: "🎯", mpCost: 8, type: "damage", power: 2.0, desc: "Critico" }],
  3: [{ name: "Golpe Sombrio", emoji: "🌑", mpCost: 12, type: "damage", power: 2.5, desc: "Critico mortal" }],
  4: [{ name: "Cura Divina", emoji: "💚", mpCost: 15, type: "heal", power: 0.4, desc: "Restaura HP" }, { name: "Escudo Santo", emoji: "🛡️", mpCost: 10, type: "buff", power: 1.5, desc: "Aumenta defesa" }],
  5: [{ name: "Furia", emoji: "💢", mpCost: 12, type: "buff", power: 1.8, desc: "Aumenta ataque" }, { name: "Terremoto", emoji: "🌋", mpCost: 18, type: "damage", power: 2.0, desc: "Dano em area" }],
};

const SHOP_ITEMS: Equipment[] = [
  { id: "w1", name: "Espada de Ferro", type: "weapon", atk: 5, price: 100, icon: "🗡️" },
  { id: "w2", name: "Espada de Aco", type: "weapon", atk: 10, price: 300, icon: "⚔️" },
  { id: "w3", name: "Cajado Arcano", type: "weapon", atk: 15, mp: 20, price: 500, icon: "🔮" },
  { id: "w4", name: "Arco Longo", type: "weapon", atk: 12, spd: 5, price: 400, icon: "🏹" },
  { id: "w5", name: "Adaga Fantasma", type: "weapon", atk: 8, spd: 10, price: 450, icon: "🗡️" },
  { id: "a1", name: "Armadura de Couro", type: "armor", def: 5, hp: 20, price: 120, icon: "🛡️" },
  { id: "a2", name: "Armadura de Ferro", type: "armor", def: 10, hp: 50, price: 350, icon: "🛡️" },
  { id: "a3", name: "Manto Magico", type: "armor", def: 4, mp: 30, price: 400, icon: "🧥" },
  { id: "a4", name: "Armadura do Dragao", type: "armor", def: 18, hp: 80, price: 800, icon: "🐉" },
  { id: "ac1", name: "Anel de Vida", type: "accessory", hp: 40, price: 200, icon: "💍" },
  { id: "ac2", name: "Amuleto de Mana", type: "accessory", mp: 40, price: 200, icon: "📿" },
  { id: "ac3", name: "Botas de Velocidade", type: "accessory", spd: 8, price: 250, icon: "👢" },
  { id: "ac4", name: "Coroa do Heroi", type: "accessory", atk: 5, def: 5, hp: 30, mp: 30, price: 1000, icon: "👑" },
];

function makeEnemy(name: string, emoji: string, hp: number, atk: number, def: number, spd: number, xp: number, gold: number, color: string): Enemy {
  return { name, emoji, hp, maxHp: hp, atk, def, spd, xpReward: xp, goldReward: gold, color };
}

const WORLDS: World[] = [
  {
    name: "Floresta Escura", emoji: "🌲", color: "#22c55e",
    levels: [
      { id: 1, name: "Encontro Inicial", enemies: [makeEnemy("Goblin", "👺", 40, 8, 3, 5, 15, 20, "#4ade80")], stars: [30, 15, 0] },
      { id: 2, name: "A Emboscada", enemies: [makeEnemy("Goblin", "👺", 45, 9, 3, 5, 18, 22, "#4ade80"), makeEnemy("Lobo", "🐺", 35, 10, 2, 8, 20, 25, "#94a3b8")], stars: [30, 15, 0] },
      { id: 3, name: "Cova dos Lobos", enemies: [makeEnemy("Lobo", "🐺", 40, 11, 3, 8, 22, 28, "#94a3b8"), makeEnemy("Lobo Alfa", "🐺", 60, 13, 4, 7, 30, 35, "#64748b")], stars: [25, 12, 0] },
      { id: 4, name: "O Sentinela", enemies: [makeEnemy("Goblin Guerreiro", "👺", 55, 12, 5, 6, 25, 30, "#166534"), makeEnemy("Lobo", "🐺", 40, 10, 2, 8, 18, 22, "#94a3b8")], stars: [25, 12, 0] },
      { id: 5, name: "Chefe: Aranha Rainha", enemies: [makeEnemy("Aranha", "🕷️", 30, 8, 2, 10, 12, 15, "#a855f7")], boss: makeEnemy("Aranha Rainha", "🕷️", 120, 15, 6, 8, 60, 100, "#7c3aed"), stars: [25, 10, 0] },
    ],
  },
  {
    name: "Catacumbas", emoji: "💀", color: "#a855f7",
    levels: [
      { id: 6, name: "Corredor Sombrio", enemies: [makeEnemy("Esqueleto", "💀", 60, 12, 6, 7, 25, 30, "#c084fc")], stars: [30, 15, 0] },
      { id: 7, name: "Armadilha Mortal", enemies: [makeEnemy("Esqueleto", "💀", 65, 13, 6, 7, 28, 32, "#c084fc"), makeEnemy("Zumbi", "🧟", 80, 10, 8, 4, 30, 35, "#65a30d")], stars: [25, 12, 0] },
      { id: 8, name: "Sala dos Mortos", enemies: [makeEnemy("Zumbi", "🧟", 85, 11, 8, 4, 32, 38, "#65a30d"), makeEnemy("Fantasma", "👻", 50, 16, 3, 12, 35, 40, "#e2e8f0")], stars: [25, 12, 0] },
      { id: 9, name: "O Necromante", enemies: [makeEnemy("Esqueleto Mago", "💀", 55, 18, 4, 9, 38, 42, "#9333ea"), makeEnemy("Fantasma", "👻", 50, 14, 3, 12, 30, 35, "#e2e8f0")], stars: [20, 10, 0] },
      { id: 10, name: "Chefe: Lorde Morto", enemies: [makeEnemy("Esqueleto", "💀", 50, 12, 5, 7, 22, 28, "#c084fc")], boss: makeEnemy("Lorde Morto", "☠️", 200, 20, 10, 10, 100, 200, "#581c87"), stars: [25, 10, 0] },
    ],
  },
  {
    name: "Vulcao Ardente", emoji: "🌋", color: "#ef4444",
    levels: [
      { id: 11, name: "Rio de Lava", enemies: [makeEnemy("Salamandra", "🦎", 90, 16, 8, 10, 40, 45, "#f97316")], stars: [30, 15, 0] },
      { id: 12, name: "Ponte de Pedra", enemies: [makeEnemy("Salamandra", "🦎", 95, 17, 8, 10, 42, 48, "#f97316"), makeEnemy("Golem de Fogo", "🔥", 110, 14, 12, 5, 45, 50, "#dc2626")], stars: [25, 12, 0] },
      { id: 13, name: "Caverna de Magma", enemies: [makeEnemy("Golem de Fogo", "🔥", 120, 15, 12, 5, 48, 52, "#dc2626"), makeEnemy("Magma Slime", "🔴", 80, 20, 4, 8, 42, 46, "#b91c1c")], stars: [25, 12, 0] },
      { id: 14, name: "A Forja", enemies: [makeEnemy("Ferreiro Demonio", "👿", 130, 18, 10, 9, 52, 58, "#991b1b"), makeEnemy("Golem", "🔥", 100, 14, 14, 5, 45, 50, "#dc2626")], stars: [20, 10, 0] },
      { id: 15, name: "Chefe: Dragao de Fogo", enemies: [makeEnemy("Golem", "🔥", 80, 14, 10, 5, 35, 40, "#dc2626")], boss: makeEnemy("Dragao de Fogo", "🐉", 300, 25, 14, 12, 150, 350, "#7f1d1d"), stars: [25, 10, 0] },
    ],
  },
  {
    name: "Oceano Profundo", emoji: "🌊", color: "#3b82f6",
    levels: [
      { id: 16, name: "Recifes de Corais", enemies: [makeEnemy("Piranha", "🐟", 100, 18, 8, 12, 50, 55, "#38bdf8")], stars: [30, 15, 0] },
      { id: 17, name: "Caverna Submersa", enemies: [makeEnemy("Piranha", "🐟", 105, 19, 8, 12, 52, 58, "#38bdf8"), makeEnemy("Medusa", "🪼", 90, 22, 5, 10, 55, 60, "#c084fc")], stars: [25, 12, 0] },
      { id: 18, name: "Cidade Subaquatica", enemies: [makeEnemy("Tritao", "🧜", 120, 20, 10, 11, 58, 65, "#0ea5e9"), makeEnemy("Medusa", "🪼", 95, 22, 5, 10, 52, 58, "#c084fc")], stars: [25, 12, 0] },
      { id: 19, name: "Abismo", enemies: [makeEnemy("Anguia Gigante", "🐍", 140, 22, 12, 13, 62, 70, "#1d4ed8"), makeEnemy("Tritao", "🧜", 110, 20, 10, 11, 52, 58, "#0ea5e9")], stars: [20, 10, 0] },
      { id: 20, name: "Chefe: Kraken", enemies: [makeEnemy("Tritao", "🧜", 90, 18, 8, 10, 45, 50, "#0ea5e9")], boss: makeEnemy("Kraken", "🐙", 400, 28, 16, 14, 200, 500, "#1e3a5f"), stars: [25, 10, 0] },
    ],
  },
  {
    name: "Castelo do Demonio", emoji: "🏰", color: "#dc2626",
    levels: [
      { id: 21, name: "Portoes do Castelo", enemies: [makeEnemy("Demone Menor", "👿", 150, 24, 12, 12, 70, 75, "#f43f5e")], stars: [30, 15, 0] },
      { id: 22, name: "Salao do Trono", enemies: [makeEnemy("Demone Menor", "👿", 155, 25, 12, 12, 72, 78, "#f43f5e"), makeEnemy("Cavaleiro Negro", "🛡️", 180, 22, 18, 8, 78, 85, "#1e293b")], stars: [25, 12, 0] },
      { id: 23, name: "Torre Negra", enemies: [makeEnemy("Cavaleiro Negro", "🛡️", 190, 24, 18, 8, 82, 90, "#1e293b"), makeEnemy("Necromante", "🧙", 130, 30, 8, 14, 85, 95, "#6b21a8")], stars: [25, 12, 0] },
      { id: 24, name: "Camera do Senhor", enemies: [makeEnemy("Demone Elite", "👹", 200, 28, 15, 13, 90, 100, "#be123c"), makeEnemy("Cavaleiro Negro", "🛡️", 170, 24, 18, 8, 78, 85, "#1e293b")], stars: [20, 10, 0] },
      { id: 25, name: "Chefe: Senhor Demoniaco", enemies: [makeEnemy("Demone Elite", "👹", 150, 26, 14, 12, 70, 80, "#be123c")], boss: makeEnemy("Senhor Demoniaco", "😈", 550, 35, 20, 15, 300, 800, "#450a0a"), stars: [25, 10, 0] },
    ],
  },
];

// ============================================================
// HELPERS
// ============================================================

const SAVE_KEY = "bateu_rpg_save";

function loadSave(): PlayerState | null {
  try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

function persistSave(s: PlayerState) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {}
}

function calcStats(p: PlayerState): Stats {
  const c = CLASSES[p.classId];
  const lvl = p.level;
  let hp = c.baseHp + lvl * 12;
  let maxHp = hp;
  let atk = c.baseAtk + lvl * 2;
  let def = c.baseDef + lvl * 1;
  let spd = c.baseSpd + lvl * 1;
  let mp = c.baseMp + lvl * 5;
  let maxMp = mp;
  for (const eq of p.equipment) {
    if (!eq) continue;
    hp += eq.hp || 0; maxHp += eq.hp || 0;
    atk += eq.atk || 0;
    def += eq.def || 0;
    spd += eq.spd || 0;
    mp += eq.mp || 0; maxMp += eq.mp || 0;
  }
  return { hp, maxHp, atk, def, spd, mp, maxMp };
}

// ============================================================
// COMPONENT
// ============================================================

type Screen = "classSelect" | "worldMap" | "battle" | "shop" | "inventory" | "victory" | "gameOver" | "levelComplete";

export default function CampaignRPGGame({ onScore, liveCode }: Props) {
  // ---- Core State ----
  const [screen, setScreen] = useState<Screen>("classSelect");
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [stats, setStats] = useState<Stats>({ hp: 100, maxHp: 100, atk: 10, def: 5, spd: 8, mp: 30, maxMp: 30 });

  // ---- Battle State ----
  const [battleEnemies, setBattleEnemies] = useState<Enemy[]>([]);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [battleOver, setBattleOver] = useState(false);
  const [battleWon, setBattleWon] = useState(false);
  const [damageTaken, setDamageTaken] = useState(0);
  const [animatingHit, setAnimatingHit] = useState(-1); // -1=none, 0=player, 1+=enemy idx
  const [defBuff, setDefBuff] = useState(1);
  const [atkBuff, setAtkBuff] = useState(1);

  // ---- Level Complete ----
  const [earnedStars, setEarnedStars] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [earnedGold, setEarnedGold] = useState(0);

  // ---- Canvas Refs ----
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[]>([]);
  const shakeRef = useRef(0);

  const addLog = useCallback((msg: string) => {
    setBattleLog(prev => [...prev.slice(-6), msg]);
  }, []);

  const recalcStats = useCallback((p: PlayerState) => {
    setStats(calcStats(p));
  }, []);

  // ---- Load save ----
  useEffect(() => {
    const save = loadSave();
    if (save) {
      setPlayer(save);
      recalcStats(save);
      setScreen("worldMap");
    }
  }, []);

  // ---- Canvas animation loop ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const shake = shakeRef.current;
      const ox = (Math.random() - 0.5) * shake * 4;
      const oy = (Math.random() - 0.5) * shake * 4;
      if (shake > 0) shakeRef.current = Math.max(0, shake - 0.5);

      if (screen === "battle" && player) {
        const cl = CLASSES[player.classId];
        const sx = shake > 0 ? ox : 0;
        const sy = shake > 0 ? oy : 0;

        // Draw player
        const playerHit = animatingHit === 0;
        const px = cx - 120 + sx;
        const py = cy + 40 + sy;
        ctx.save();
        if (playerHit) ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.font = `${playerHit ? 64 : 56}px serif`;
        ctx.textAlign = "center";
        ctx.fillText(cl.emoji, px, py);
        ctx.restore();

        // Player HP bar
        const hpPct = stats.hp / stats.maxHp;
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(px - 50, py + 10, 100, 8);
        ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#f59e0b" : "#ef4444";
        ctx.fillRect(px - 50, py + 10, 100 * hpPct, 8);
        ctx.fillStyle = "#e5e7eb";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(`${Math.ceil(stats.hp)}/${stats.maxHp}`, px, py + 36);

        // Player MP bar
        const mpPct = stats.mp / stats.maxMp;
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(px - 50, py + 40, 100, 6);
        ctx.fillStyle = "#6366f1";
        ctx.fillRect(px - 50, py + 40, 100 * mpPct, 6);

        // Draw enemies
        battleEnemies.forEach((e, i) => {
          if (e.hp <= 0) return;
          const hit = animatingHit === i + 1;
          const ex = cx + 120 + (i > 0 ? i * 60 : 0) + (hit ? (Math.random()-0.5)*16 : 0);
          const ey = cy - 20 + (i > 0 ? i * -30 : 0);
          ctx.save();
          if (hit) ctx.globalAlpha = 0.4 + Math.random() * 0.6;
          ctx.font = `${e.name.includes("Chefe") || e.name.includes("Dragao") || e.name.includes("Kraken") || e.name.includes("Senhor") || e.name.includes("Lorde") || e.name.includes("Aranha Rainha") ? 64 : 48}px serif`;
          ctx.textAlign = "center";
          ctx.fillText(e.emoji, ex, ey);
          ctx.restore();

          // Enemy HP bar
          const ehp = e.hp / e.maxHp;
          ctx.fillStyle = "#1f2937";
          ctx.fillRect(ex - 40, ey + 8, 80, 6);
          ctx.fillStyle = e.color || "#ef4444";
          ctx.fillRect(ex - 40, ey + 8, 80 * ehp, 6);
          ctx.fillStyle = "#9ca3af";
          ctx.font = "12px sans-serif";
          ctx.fillText(`${Math.ceil(e.hp)}/${e.maxHp}`, ex, ey + 28);
        });
      }

      // Draw particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.02;
        if (p.life <= 0) return false;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, [screen, player, stats, battleEnemies, animatingHit]);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: cx + x, y: cy + y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 3,
        life: 0.6 + Math.random() * 0.4,
        color,
        size: 3 + Math.random() * 5,
      });
    }
  }, []);

  // ---- Battle Logic ----
  const startLevel = useCallback((worldIdx: number, levelIdx: number) => {
    if (!player) return;
    const world = WORLDS[worldIdx];
    const level = world.levels[levelIdx];
    const allEnemies = [...level.enemies];
    if (level.boss) allEnemies.push(level.boss);

    setBattleEnemies(allEnemies.map(e => ({ ...e })));
    setIsPlayerTurn(true);
    setBattleOver(false);
    setBattleWon(false);
    setBattleLog([`Entraste em: ${level.name}`]);
    setDamageTaken(0);
    setDefBuff(1);
    setAtkBuff(1);

    // Restore HP/MP for battle
    const newP = { ...player };
    const s = calcStats(newP);
 setStats({ ...s, hp: s.maxHp, mp: s.maxMp });
    setPlayer(newP);
    setScreen("battle");
  }, [player]);

  const playerAttack = useCallback((targetIdx: number) => {
    if (!player || !isPlayerTurn || battleOver) return;
    const enemy = battleEnemies[targetIdx];
    if (!enemy || enemy.hp <= 0) return;

    setIsPlayerTurn(false);
    const s = calcStats(player);
    const rawDmg = Math.max(1, s.atk * atkBuff - enemy.def * 0.5);
    const dmg = Math.round(rawDmg * (0.9 + Math.random() * 0.2));

    setBattleEnemies(prev => {
      const next = [...prev];
      next[targetIdx] = { ...next[targetIdx], hp: Math.max(0, next[targetIdx].hp - dmg) };
      return next;
    });
    setAnimatingHit(targetIdx + 1);
    setTimeout(() => setAnimatingHit(-1), 200);
    spawnParticles(120 + targetIdx * 60, -20, CLASSES[player.classId].color, 8);
    addLog(`${CLASSES[player.classId].emoji} Atacas ${enemy.emoji} ${enemy.name} por ${dmg}!`);

    // Check if enemy died
    if (enemy.hp - dmg <= 0) {
      spawnParticles(120 + targetIdx * 60, -20, enemy.color, 15);
      addLog(`${enemy.emoji} ${enemy.name} foi derrotado!`);
    }

    // Enemy turn after delay
    setTimeout(() => enemyTurn(player, targetIdx), 800);
  }, [player, isPlayerTurn, battleOver, battleEnemies, atkBuff, spawnParticles, addLog]);

  const useSkill = useCallback((skillIdx: number) => {
    if (!player || !isPlayerTurn || battleOver) return;
    const skills = SKILLS[player.classId];
    if (!skills || !skills[skillIdx]) return;
    const skill = skills[skillIdx];
    if (stats.mp < skill.mpCost) { addLog("MP insuficiente!"); return; }

    setIsPlayerTurn(false);
    setStats(prev => ({ ...prev, mp: prev.mp - skill.mpCost }));

    if (skill.type === "damage") {
      // Damage all enemies
      const s = calcStats(player);
 battleEnemies.forEach((enemy, i) => {
        if (enemy.hp <= 0) return;
        const dmg = Math.round(Math.max(1, s.atk * skill.power - enemy.def * 0.3) * (0.9 + Math.random() * 0.2));
        setBattleEnemies(prev => {
          const next = [...prev];
          next[i] = { ...next[i], hp: Math.max(0, next[i].hp - dmg) };
          return next;
        });
        setAnimatingHit(i + 1);
        setTimeout(() => setAnimatingHit(-1), 200);
        spawnParticles(120 + i * 60, -20, "#f59e0b", 10);
        addLog(`${skill.emoji} ${skill.name}! ${dmg} dano a ${enemy.emoji}`);
      });
    } else if (skill.type === "heal") {
      const heal = Math.round(stats.maxHp * skill.power);
      setStats(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + heal) }));
      spawnParticles(-120, 40, "#22c55e", 12);
      addLog(`${skill.emoji} ${skill.name}! +${heal} HP`);
    } else if (skill.type === "buff") {
      if (player.classId === 4) { // Clerigo - def buff
        setDefBuff(prev => prev * skill.power);
        addLog(`${skill.emoji} ${skill.name}! Defesa aumentada!`);
      } else {
        setAtkBuff(prev => prev * skill.power);
        addLog(`${skill.emoji} ${skill.name}! Ataque aumentado!`);
      }
      spawnParticles(-120, 40, "#f59e0b", 8);
    }

    setTimeout(() => enemyTurn(player, -1), 800);
  }, [player, isPlayerTurn, battleOver, battleEnemies, stats, spawnParticles, addLog]);

  const enemyTurn = useCallback((p: PlayerState, _lastTarget: number) => {
    if (!p) return;
    const alive = battleEnemies.filter(e => e.hp > 0);
    if (alive.length === 0) return;

    setStats(prev => {
      let newHp = prev.hp;
      let newMp = Math.min(prev.maxMp, prev.mp + 3); // regen 3 MP per turn

      alive.forEach(enemy => {
        const rawDmg = Math.max(1, enemy.atk - (prev.def * defBuff) * 0.5);
        const dmg = Math.round(rawDmg * (0.85 + Math.random() * 0.3));
        newHp = Math.max(0, newHp - dmg);
        setDamageTaken(prev => prev + dmg);
        shakeRef.current = 4;
        setAnimatingHit(0);
        setTimeout(() => setAnimatingHit(-1), 200);
        spawnParticles(-120, 40, "#ef4444", 5);
        addLog(`${enemy.emoji} ${enemy.name} ataca por ${dmg}!`);
      });

      if (newHp <= 0) {
        setBattleOver(true);
        setBattleWon(false);
        addLog("Foste derrotado...");
        setTimeout(() => setScreen("gameOver"), 1000);
      }

      return { ...prev, hp: newHp, mp: newMp };
    });

    // Check if all enemies dead
    const allDead = battleEnemies.every(e => e.hp <= 0);
    if (allDead) {
      setBattleOver(true);
      setBattleWon(true);
      addLog("Vitoria!");
      confetti({ particleCount: 80, spread: 60 });

      // Calculate rewards
      let totalXp = 0, totalGold = 0;
      battleEnemies.forEach(e => { totalXp += e.xpReward; totalGold += e.goldReward; });
      setEarnedXp(totalXp);
      setEarnedGold(totalGold);

      // Calculate stars
      if (p.currentWorld < WORLDS.length && p.currentLevel < WORLDS[p.currentWorld].levels.length) {
        const levelData = WORLDS[p.currentWorld].levels[p.currentLevel];
        let stars = 0;
        if (damageTaken <= (levelData.stars[0] || 999)) stars = 3;
        else if (damageTaken <= (levelData.stars[1] || 999)) stars = 2;
        else stars = 1;
        setEarnedStars(stars);

        // Update player
        const newP = { ...p };
        if (!newP.worldStars[p.currentWorld]) newP.worldStars[p.currentWorld] = [];
        newP.worldStars[p.currentWorld][p.currentLevel] = Math.max(
          newP.worldStars[p.currentWorld]?.[p.currentLevel] || 0, stars
        );
        newP.totalStars = Object.values(newP.worldStars).flat().reduce((a, b) => a + (b || 0), 0);
        newP.xp += totalXp;
        newP.gold += totalGold;

        // Level up check
        const xpNeeded = newP.level * 50 + 50;
        while (newP.xp >= xpNeeded) {
          newP.xp -= xpNeeded;
          newP.level++;
          addLog(`⬆️ Nivel ${newP.level}!`);
        }

        // Advance to next level
        if (p.currentLevel + 1 < WORLDS[p.currentWorld].levels.length) {
          newP.currentLevel++;
        } else if (p.currentWorld + 1 < WORLDS.length) {
          newP.currentWorld++;
          newP.currentLevel = 0;
        }

        setPlayer(newP);
        recalcStats(newP);
        persistSave(newP);
        onScore?.(CLASSES[newP.classId].name, totalXp + totalGold);
      }

      setTimeout(() => setScreen("levelComplete"), 1200);
    } else {
      setIsPlayerTurn(true);
    }
  }, [battleEnemies, defBuff, damageTaken, spawnParticles, addLog, recalcStats, onScore]);

  // ---- Class Selection ----
  const selectClass = useCallback((classId: number) => {
    const newPlayer: PlayerState = {
      name: CLASSES[classId].name,
      classId,
      level: 1, xp: 0, gold: 50,
      currentWorld: 0, currentLevel: 0,
      equipment: [null, null, null],
      inventory: [],
      worldStars: [],
      totalStars: 0,
    };
    setPlayer(newPlayer);
    recalcStats(newPlayer);
    persistSave(newPlayer);
    setScreen("worldMap");
  }, [recalcStats]);

  // ---- Shop ----
  const buyItem = useCallback((item: Equipment) => {
    if (!player || player.gold < item.price) return;
    const newP = { ...player, gold: player.gold - item.price, inventory: [...player.inventory, { ...item }] };
    setPlayer(newP);
    persistSave(newP);
  }, [player]);

  const equipItem = useCallback((invIdx: number) => {
    if (!player) return;
    const item = player.inventory[invIdx];
    if (!item) return;
    const slot = item.type === "weapon" ? 0 : item.type === "armor" ? 1 : 2;
    const newInv = [...player.inventory];
    newInv.splice(invIdx, 1);
    const oldItem = player.equipment[slot];
    if (oldItem) newInv.push(oldItem);
    const newEq = [...player.equipment];
    newEq[slot] = item;
    const newP = { ...player, inventory: newInv, equipment: newEq };
    setPlayer(newP);
    recalcStats(newP);
    persistSave(newP);
  }, [player, recalcStats]);

  const resetGame = useCallback(() => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setPlayer(null);
    setScreen("classSelect");
  }, []);

  // ---- PVP Simulation ----
  const simulatePVP = useCallback(() => {
    if (!player) return;
    const s = calcStats(player);
    const enemyClass = CLASSES[Math.floor(Math.random() * CLASSES.length)];
    const enemyLvl = Math.max(1, player.level + Math.floor(Math.random() * 3) - 1);
    const enemyStats = {
      hp: enemyClass.baseHp + enemyLvl * 12,
      maxHp: enemyClass.baseHp + enemyLvl * 12,
      atk: enemyClass.baseAtk + enemyLvl * 2 + 5,
      def: enemyClass.baseDef + enemyLvl * 1 + 3,
      spd: enemyClass.baseSpd + enemyLvl,
      mp: enemyClass.baseMp + enemyLvl * 5,
      maxMp: enemyClass.baseMp + enemyLvl * 5,
    };

    let pHp = s.maxHp, eHp = enemyStats.maxHp;
    let turn = 0;
    while (pHp > 0 && eHp > 0 && turn < 50) {
      turn++;
      const pDmg = Math.max(1, s.atk - enemyStats.def * 0.4 + Math.random() * 5);
      eHp -= pDmg;
      if (eHp <= 0) break;
      const eDmg = Math.max(1, enemyStats.atk - s.def * 0.4 + Math.random() * 5);
      pHp -= eDmg;
    }
    const won = eHp <= 0;
    const reward = won ? 50 + player.level * 10 : 0;
    if (won) {
      const newP = { ...player, gold: player.gold + reward, xp: player.xp + 30 };
      const xpNeeded = newP.level * 50 + 50;
      if (newP.xp >= xpNeeded) { newP.xp -= xpNeeded; newP.level++; }
      setPlayer(newP);
      recalcStats(newP);
      persistSave(newP);
      onScore?.(CLASSES[player.classId].name + " PVP", reward + 30);
      confetti({ particleCount: 60, spread: 50 });
    }
    return { won, enemy: enemyClass, enemyLvl, reward };
  }, [player, recalcStats, onScore]);

  // ============================================================
  // RENDER
  // ============================================================

  // ---- Class Select Screen ----
  if (screen === "classSelect") {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="text-center mb-6">
        <Sparkles className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
        <h3 className="font-display text-xl font-bold text-foreground">Campanha RPG</h3>
        <p className="text-xs text-muted-foreground">Escolhe a tua classe e conquista 5 mundos!</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CLASSES.map((c, i) => (
          <motion.button
            key={i} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => selectClass(i)}
            className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/50 transition-all"
          >
            <span className="text-3xl">{c.emoji}</span>
            <p className="font-bold text-sm mt-1" style={{ color: c.color }}>{c.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{c.desc}</p>
            <div className="flex gap-2 mt-2 text-[9px] text-muted-foreground">
              <span>❤️{c.baseHp}</span><span>⚔️{c.baseAtk}</span><span>🛡️{c.baseDef}</span><span>💨{c.baseSpd}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
    );
  }

  if (!player) return null;
  const cl = CLASSES[player.classId];
  const skills = SKILLS[player.classId] || [];

  // ---- World Map Screen ----
  if (screen === "worldMap") {
    return (
      <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cl.emoji}</span>
          <div>
            <p className="font-bold text-sm" style={{ color: cl.color }}>{player.name}</p>
            <p className="text-[10px] text-muted-foreground">Nv.{player.level} | ⭐{player.totalStars} | 💰{player.gold}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setScreen("shop")}
            className="p-2 rounded-lg bg-card border border-border hover:border-primary/50">
            <ShoppingBag className="h-4 w-4 text-yellow-500" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setScreen("inventory")}
            className="p-2 rounded-lg bg-card border border-border hover:border-primary/50">
            <Shield className="h-4 w-4 text-blue-400" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => {
            const result = simulatePVP();
            if (result) {
              const msg = result.won
                ? `Venceste ${result.enemy.emoji} ${result.enemy.name} Nv.${result.enemyLvl}! +${result.reward}💰`
                : `Perdeste para ${result.enemy.emoji} ${result.enemy.name} Nv.${result.enemyLvl}`;
              alert(msg);
            }
          }}
            className="p-2 rounded-lg bg-card border border-border hover:border-primary/50">
            <Swords className="h-4 w-4 text-red-400" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={resetGame}
            className="p-2 rounded-lg bg-card border border-border hover:border-red-500/50">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-2 mb-4 text-[10px]">
        <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400">❤️ {stats.maxHp}</span>
        <span className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-400">⚔️ {stats.atk}</span>
        <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400">🛡️ {stats.def}</span>
        <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400">💨 {stats.spd}</span>
        <span className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400">🔮 {stats.maxMp}</span>
      </div>

      {/* Worlds */}
      <div className="space-y-4">
        {WORLDS.map((world, wi) => {
          const unlocked = wi <= player.currentWorld;
          const isCurrent = wi === player.currentWorld;
          return (
            <div key={wi}>
              <div className={`flex items-center gap-2 mb-2 ${unlocked ? "" : "opacity-40"}`}>
                <span className="text-lg">{world.emoji}</span>
                <span className="font-bold text-sm" style={{ color: world.color }}>{world.name}</span>
                {!unlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {player.worldStars[wi]?.filter(Boolean).length || 0}/{world.levels.length} ⭐
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {world.levels.map((level, li) => {
                  const isPlayable = isCurrent && li <= player.currentLevel;
                  const isCompleted = (player.worldStars[wi]?.[li] || 0) > 0;
                  const stars = player.worldStars[wi]?.[li] || 0;
                  return (
                    <motion.button
                      key={li} whileTap={isPlayable ? { scale: 0.9 } : undefined}
                      onClick={() => isPlayable && startLevel(wi, li)}
                      disabled={!isPlayable}
                      className={`relative rounded-xl border p-2 text-center transition-all ${
                        isPlayable
                          ? "border-primary/40 bg-primary/5 hover:bg-primary/10 cursor-pointer"
                          : isCompleted
                          ? "border-border bg-card"
                          : "border-border/50 bg-muted/20"
                      }`}
                    >
                      {level.boss ? (
                        <Skull className={`h-4 w-4 mx-auto mb-1 ${isPlayable ? "text-red-400" : "text-muted-foreground"}`} />
                      ) : (
                        <span className={`text-xs ${isPlayable ? "" : "text-muted-foreground"}`}>{level.emoji || "⚔️"}</span>
                      )}
                      <p className="text-[9px] font-medium truncate">{li + 1}</p>
                      {isCompleted && (
                        <div className="flex justify-center gap-0.5 mt-0.5">
                          {[0,1,2].map(s => (
                            <Star key={s} className={`h-2 w-2 ${s < stars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                      )}
                      {isPlayable && !isCompleted && (
                        <Play className="h-3 w-3 text-primary mx-auto mt-0.5" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    );
  }

  // ---- Battle Screen ----
  if (screen === "battle") {
    return (
      <div className="max-w-lg mx-auto">
        <canvas ref={canvasRef} className="w-full h-48 rounded-xl bg-black/20 mb-3" />

        {/* Battle Log */}
        <div className="h-20 overflow-y-auto rounded-lg bg-card border border-border p-2 mb-3 text-[11px] text-muted-foreground space-y-0.5">
          {battleLog.map((log, i) => <p key={i}>{log}</p>)}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* Attack buttons for each alive enemy */}
          <div className="flex gap-2 flex-wrap">
            {battleEnemies.map((enemy, i) => (
              enemy.hp > 0 && (
                <motion.button
                  key={i} whileTap={{ scale: 0.95 }}
                  disabled={!isPlayerTurn || battleOver}
                  onClick={() => playerAttack(i)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium disabled:opacity-30 hover:bg-red-500/20 transition"
                >
                  <span>{enemy.emoji}</span>
                  <span>{enemy.name}</span>
                  <span className="text-[9px] opacity-60">{Math.ceil(enemy.hp)}HP</span>
                </motion.button>
              )
            ))}
          </div>

          {/* Skill buttons */}
          <div className="flex gap-2 flex-wrap">
            {skills.map((skill, i) => (
              <motion.button
                key={i} whileTap={{ scale: 0.95 }}
                disabled={!isPlayerTurn || battleOver || stats.mp < skill.mpCost}
                onClick={() => useSkill(i)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-medium disabled:opacity-30 hover:bg-indigo-500/20 transition"
              >
                <span>{skill.emoji}</span>
                <span>{skill.name}</span>
                <span className="text-[9px] opacity-60">{skill.mpCost}MP</span>
              </motion.button>
            ))}
          </div>

          {/* MP/HP display */}
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span>❤️ {Math.ceil(stats.hp)}/{stats.maxHp}</span>
            <span>🔮 {Math.ceil(stats.mp)}/{stats.maxMp}</span>
            {defBuff > 1 && <span className="text-blue-400">🛡️ x{defBuff.toFixed(1)}</span>}
            {atkBuff > 1 && <span className="text-orange-400">⚔️ x{atkBuff.toFixed(1)}</span>}
          </div>
        </div>
      </div>
    );
  }

  // ---- Shop Screen ----
  if (screen === "shop") {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setScreen("worldMap")} className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
          <h3 className="font-display text-lg font-bold">Loja</h3>
          <span className="ml-auto text-sm font-bold text-yellow-400">💰 {player.gold}</span>
        </div>
        <div className="grid gap-2">
          {SHOP_ITEMS.map(item => {
            const owned = player.inventory.some(i => i.id === item.id) || player.equipment.some(e => e?.id === item.id);
            return (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.atk ? `⚔️+${item.atk} ` : ""}
                    {item.def ? `🛡️+${item.def} ` : ""}
                    {item.spd ? `💨+${item.spd} ` : ""}
                    {item.hp ? `❤️+${item.hp} ` : ""}
                    {item.mp ? `🔮+${item.mp} ` : ""}
                  </p>
                </div>
                <motion.button whileTap={{ scale: 0.9 }}
                  disabled={owned || player.gold < item.price}
                  onClick={() => buyItem(item)}
                  className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold disabled:opacity-30"
                >
                  {owned ? "Comprado" : `💰${item.price}`}
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- Inventory Screen ----
  if (screen === "inventory") {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setScreen("worldMap")} className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
          <h3 className="font-display text-lg font-bold">Inventario</h3>
        </div>

        {/* Equipped */}
        <p className="text-xs text-muted-foreground mb-2 font-medium">Equipado:</p>
        <div className="flex gap-2 mb-4">
          {player.equipment.map((eq, i) => (
            <div key={i} className="flex-1 p-2 rounded-lg bg-primary/5 border border-primary/20 text-center">
              <p className="text-[9px] text-muted-foreground">{["Arma", "Armadura", "Acessorio"][i]}</p>
              {eq ? <><span className="text-xl">{eq.icon}</span><p className="text-[10px] font-medium truncate">{eq.name}</p></> : <span className="text-muted-foreground text-xs">Vazio</span>}
            </div>
          ))}
        </div>

        {/* Bag */}
        <p className="text-xs text-muted-foreground mb-2 font-medium">Mochila ({player.inventory.length}):</p>
        <div className="grid gap-2">
          {player.inventory.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Mochila vazia. Visita a loja!</p>}
          {player.inventory.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">{item.atk ? `⚔️+${item.atk} ` : ""}{item.def ? `🛡️+${item.def} ` : ""}{item.spd ? `💨+${item.spd} ` : ""}{item.hp ? `❤️+${item.hp} ` : ""}{item.mp ? `🔮+${item.mp}` : ""}</p>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => equipItem(i)}
                className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold">
                Equipar
              </motion.button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Level Complete Screen ----
  if (screen === "levelComplete") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm mx-auto p-6 text-center">
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <span className="text-6xl">🏆</span>
        </motion.div>
        <h3 className="font-display text-xl font-bold mt-4">Nivel Completo!</h3>
        <div className="flex justify-center gap-1 mt-2">
          {[0,1,2].map(s => (
            <Star key={s} className={`h-6 w-6 ${s < earnedStars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <span className="text-blue-400">+{earnedXp} XP</span>
          <span className="text-yellow-400">+{earnedGold} 💰</span>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setScreen("worldMap")}
          className="mt-6 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm">
          Continuar <ChevronRight className="h-4 w-4 inline" />
        </motion.button>
      </motion.div>
    );
  }

  // ---- Game Over Screen ----
  if (screen === "gameOver") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="max-w-sm mx-auto p-6 text-center">
        <span className="text-6xl">💀</span>
        <h3 className="font-display text-xl font-bold mt-4">Derrotado!</h3>
        <p className="text-sm text-muted-foreground mt-2">Melhora o teu equipamento e tenta novamente.</p>
        <div className="flex gap-3 justify-center mt-6">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setScreen("worldMap")}
            className="px-5 py-2.5 rounded-full bg-card border border-border font-medium text-sm">
            Mapa
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => {
            if (player) {
              const s = calcStats(player);
              setStats({ ...s, hp: s.maxHp, mp: s.maxMp });
              startLevel(player.currentWorld, player.currentLevel);
            }
          }}
            className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium text-sm">
            Tentar Outra Vez
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return null;
}
