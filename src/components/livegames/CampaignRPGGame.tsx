"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Swords, Heart, Zap, Crown, RotateCcw, ChevronRight, Star, Lock,
  Skull, ShoppingBag, Map as MapIcon, Play, Pause, ArrowLeft, Sparkles,
  Flame, Target, Trophy, TrendingUp, Timer, Gem
} from "lucide-react";
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
  boss?: Enemy; stars: number[];
}

interface World {
  name: string; emoji: string; color: string;
  levels: Level[];
}

interface PlayerState {
  name: string; classId: number; level: number; xp: number;
  gold: number; currentWorld: number; currentLevel: number;
  equipment: (Equipment | null)[];
  inventory: Equipment[];
  worldStars: number[][];
  totalStars: number;
}

interface FloatingDamage {
  id: number;
  value: number;
  x: number;
  y: number;
  type: "player" | "enemy" | "heal" | "crit" | "buff";
}

// ============================================================
// DATA
// ============================================================

const CLASSES = [
  { name: "Guerreiro", emoji: "\u2694\uFE0F", desc: "Alto ataque e defesa", baseHp: 120, baseAtk: 18, baseDef: 14, baseSpd: 8, baseMp: 30, color: "#ef4444" },
  { name: "Mago", emoji: "\uD83D\uDD2E", desc: "Poder mag devastador", baseHp: 80, baseAtk: 22, baseDef: 6, baseSpd: 10, baseMp: 80, color: "#8b5cf6" },
  { name: "Arqueiro", emoji: "\uD83C\uDFF9", desc: "Ataques rapidos e precisos", baseHp: 90, baseAtk: 16, baseDef: 8, baseSpd: 18, baseMp: 40, color: "#22c55e" },
  { name: "Ladino", emoji: "\uD83D\uDDE1\uFE0F", desc: "Criticos mortais", baseHp: 85, baseAtk: 14, baseDef: 7, baseSpd: 20, baseMp: 50, color: "#f59e0b" },
  { name: "Clerigo", emoji: "\u2728", desc: "Curandeiro e suporte", baseHp: 100, baseAtk: 10, baseDef: 10, baseSpd: 9, baseMp: 90, color: "#06b6d4" },
  { name: "Barbaro", emoji: "\uD83E\uDE9A", desc: "Furia bruta", baseHp: 150, baseAtk: 20, baseDef: 12, baseSpd: 6, baseMp: 20, color: "#dc2626" },
];

const SKILLS: Record<number, { name: string; emoji: string; mpCost: number; type: "damage" | "heal" | "buff"; power: number; desc: string }[]> = {
  0: [{ name: "Golpe Heroico", emoji: "\u2694\uFE0F", mpCost: 10, type: "damage", power: 1.8, desc: "Dano forte" }],
  1: [{ name: "Bola de Fogo", emoji: "\uD83D\uDD25", mpCost: 15, type: "damage", power: 2.2, desc: "Dano magico" }, { name: "Gelo", emoji: "\u2744\uFE0F", mpCost: 12, type: "damage", power: 1.6, desc: "Congela" }],
  2: [{ name: "Tiro Preciso", emoji: "\uD83C\uDFAF", mpCost: 8, type: "damage", power: 2.0, desc: "Critico" }],
  3: [{ name: "Golpe Sombrio", emoji: "\uD83C\uDF11", mpCost: 12, type: "damage", power: 2.5, desc: "Critico mortal" }],
  4: [{ name: "Cura Divina", emoji: "\uD83D\uDC9A", mpCost: 15, type: "heal", power: 0.4, desc: "Restaura HP" }, { name: "Escudo Santo", emoji: "\uD83D\uDEE1\uFE0F", mpCost: 10, type: "buff", power: 1.5, desc: "Aumenta defesa" }],
  5: [{ name: "Furia", emoji: "\uD83D\uDEA2", mpCost: 12, type: "buff", power: 1.8, desc: "Aumenta ataque" }, { name: "Terremoto", emoji: "\uD83C\uDF0B", mpCost: 18, type: "damage", power: 2.0, desc: "Dano em area" }],
};

const SHOP_ITEMS: Equipment[] = [
  { id: "w1", name: "Espada de Ferro", type: "weapon", atk: 5, price: 100, icon: "\uD83D\uDDE1\uFE0F" },
  { id: "w2", name: "Espada de Aco", type: "weapon", atk: 10, price: 300, icon: "\u2694\uFE0F" },
  { id: "w3", name: "Cajado Arcano", type: "weapon", atk: 15, mp: 20, price: 500, icon: "\uD83D\uDD2E" },
  { id: "w4", name: "Arco Longo", type: "weapon", atk: 12, spd: 5, price: 400, icon: "\uD83C\uDFF9" },
  { id: "w5", name: "Adaga Fantasma", type: "weapon", atk: 8, spd: 10, price: 450, icon: "\uD83D\uDDE1\uFE0F" },
  { id: "a1", name: "Armadura de Couro", type: "armor", def: 5, hp: 20, price: 120, icon: "\uD83D\uDEE1\uFE0F" },
  { id: "a2", name: "Armadura de Ferro", type: "armor", def: 10, hp: 50, price: 350, icon: "\uD83D\uDEE1\uFE0F" },
  { id: "a3", name: "Manto Magico", type: "armor", def: 4, mp: 30, price: 400, icon: "\uD83E\uDDE5" },
  { id: "a4", name: "Armadura do Dragao", type: "armor", def: 18, hp: 80, price: 800, icon: "\uD83D\uDC09" },
  { id: "ac1", name: "Anel de Vida", type: "accessory", hp: 40, price: 200, icon: "\uD83D\uDC8D" },
  { id: "ac2", name: "Amuleto de Mana", type: "accessory", mp: 40, price: 200, icon: "\uD83D\uDCFF" },
  { id: "ac3", name: "Botas de Velocidade", type: "accessory", spd: 8, price: 250, icon: "\uD83D\uDC62" },
  { id: "ac4", name: "Coroa do Heroi", type: "accessory", atk: 5, def: 5, hp: 30, mp: 30, price: 1000, icon: "\uD83D\uDC51" },
];

function makeEnemy(name: string, emoji: string, hp: number, atk: number, def: number, spd: number, xp: number, gold: number, color: string): Enemy {
  return { name, emoji, hp, maxHp: hp, atk, def, spd, xpReward: xp, goldReward: gold, color };
}

const WORLDS: World[] = [
  {
    name: "Floresta Escura", emoji: "\uD83C\uDF32", color: "#22c55e",
    levels: [
      { id: 1, name: "Encontro Inicial", enemies: [makeEnemy("Goblin", "\uD83D\uDC7A", 40, 8, 3, 5, 15, 20, "#4ade80")], stars: [30, 15, 0] },
      { id: 2, name: "A Emboscada", enemies: [makeEnemy("Goblin", "\uD83D\uDC7A", 45, 9, 3, 5, 18, 22, "#4ade80"), makeEnemy("Lobo", "\uD83D\uDC3A", 35, 10, 2, 8, 20, 25, "#94a3b8")], stars: [30, 15, 0] },
      { id: 3, name: "Cova dos Lobos", enemies: [makeEnemy("Lobo", "\uD83D\uDC3A", 40, 11, 3, 8, 22, 28, "#94a3b8"), makeEnemy("Lobo Alfa", "\uD83D\uDC3A", 60, 13, 4, 7, 30, 35, "#64748b")], stars: [25, 12, 0] },
      { id: 4, name: "O Sentinela", enemies: [makeEnemy("Goblin Guerreiro", "\uD83D\uDC7A", 55, 12, 5, 6, 25, 30, "#166534"), makeEnemy("Lobo", "\uD83D\uDC3A", 40, 10, 2, 8, 18, 22, "#94a3b8")], stars: [25, 12, 0] },
      { id: 5, name: "Chefe: Aranha Rainha", enemies: [makeEnemy("Aranha", "\uD83D\uDD77\uFE0F", 30, 8, 2, 10, 12, 15, "#a855f7")], boss: makeEnemy("Aranha Rainha", "\uD83D\uDD77\uFE0F", 120, 15, 6, 8, 60, 100, "#7c3aed"), stars: [25, 10, 0] },
    ],
  },
  {
    name: "Catacumbas", emoji: "\uD83D\uDC80", color: "#a855f7",
    levels: [
      { id: 6, name: "Corredor Sombrio", enemies: [makeEnemy("Esqueleto", "\uD83D\uDC80", 60, 12, 6, 7, 25, 30, "#c084fc")], stars: [30, 15, 0] },
      { id: 7, name: "Armadilha Mortal", enemies: [makeEnemy("Esqueleto", "\uD83D\uDC80", 65, 13, 6, 7, 28, 32, "#c084fc"), makeEnemy("Zumbi", "\uD83E\uDDDF", 80, 10, 8, 4, 30, 35, "#65a30d")], stars: [25, 12, 0] },
      { id: 8, name: "Sala dos Mortos", enemies: [makeEnemy("Zumbi", "\uD83E\uDDDF", 85, 11, 8, 4, 32, 38, "#65a30d"), makeEnemy("Fantasma", "\uD83D\uDC7B", 50, 16, 3, 12, 35, 40, "#e2e8f0")], stars: [25, 12, 0] },
      { id: 9, name: "O Necromante", enemies: [makeEnemy("Esqueleto Mago", "\uD83D\uDC80", 55, 18, 4, 9, 38, 42, "#9333ea"), makeEnemy("Fantasma", "\uD83D\uDC7B", 50, 14, 3, 12, 30, 35, "#e2e8f0")], stars: [20, 10, 0] },
      { id: 10, name: "Chefe: Lorde Morto", enemies: [makeEnemy("Esqueleto", "\uD83D\uDC80", 50, 12, 5, 7, 22, 28, "#c084fc")], boss: makeEnemy("Lorde Morto", "\u2620\uFE0F", 200, 20, 10, 10, 100, 200, "#581c87"), stars: [25, 10, 0] },
    ],
  },
  {
    name: "Vulcao Ardente", emoji: "\uD83C\uDF0B", color: "#ef4444",
    levels: [
      { id: 11, name: "Rio de Lava", enemies: [makeEnemy("Salamandra", "\uD83E\uDD8E", 90, 16, 8, 10, 40, 45, "#f97316")], stars: [30, 15, 0] },
      { id: 12, name: "Ponte de Pedra", enemies: [makeEnemy("Salamandra", "\uD83E\uDD8E", 95, 17, 8, 10, 42, 48, "#f97316"), makeEnemy("Golem de Fogo", "\uD83D\uDD25", 110, 14, 12, 5, 45, 50, "#dc2626")], stars: [25, 12, 0] },
      { id: 13, name: "Caverna de Magma", enemies: [makeEnemy("Golem de Fogo", "\uD83D\uDD25", 120, 15, 12, 5, 48, 52, "#dc2626"), makeEnemy("Magma Slime", "\uD83D\uDD34", 80, 20, 4, 8, 42, 46, "#b91c1c")], stars: [25, 12, 0] },
      { id: 14, name: "A Forja", enemies: [makeEnemy("Ferreiro Demonio", "\uD83D\uDC7F", 130, 18, 10, 9, 52, 58, "#991b1b"), makeEnemy("Golem", "\uD83D\uDD25", 100, 14, 14, 5, 45, 50, "#dc2626")], stars: [20, 10, 0] },
      { id: 15, name: "Chefe: Dragao de Fogo", enemies: [makeEnemy("Golem", "\uD83D\uDD25", 80, 14, 10, 5, 35, 40, "#dc2626")], boss: makeEnemy("Dragao de Fogo", "\uD83D\uDC09", 300, 25, 14, 12, 150, 350, "#7f1d1d"), stars: [25, 10, 0] },
    ],
  },
  {
    name: "Oceano Profundo", emoji: "\uD83C\uDF0A", color: "#3b82f6",
    levels: [
      { id: 16, name: "Recifes de Corais", enemies: [makeEnemy("Piranha", "\uD83D\uDC1F", 100, 18, 8, 12, 50, 55, "#38bdf8")], stars: [30, 15, 0] },
      { id: 17, name: "Caverna Submersa", enemies: [makeEnemy("Piranha", "\uD83D\uDC1F", 105, 19, 8, 12, 52, 58, "#38bdf8"), makeEnemy("Medusa", "\uD83E\uDEBC", 90, 22, 5, 10, 55, 60, "#c084fc")], stars: [25, 12, 0] },
      { id: 18, name: "Cidade Subaquatica", enemies: [makeEnemy("Tritao", "\uD83E\uDDDC", 120, 20, 10, 11, 58, 65, "#0ea5e9"), makeEnemy("Medusa", "\uD83E\uDEBC", 95, 22, 5, 10, 52, 58, "#c084fc")], stars: [25, 12, 0] },
      { id: 19, name: "Abismo", enemies: [makeEnemy("Anguia Gigante", "\uD83D\uDC0D", 140, 22, 12, 13, 62, 70, "#1d4ed8"), makeEnemy("Tritao", "\uD83E\uDDDC", 110, 20, 10, 11, 52, 58, "#0ea5e9")], stars: [20, 10, 0] },
      { id: 20, name: "Chefe: Kraken", enemies: [makeEnemy("Tritao", "\uD83E\uDDDC", 90, 18, 8, 10, 45, 50, "#0ea5e9")], boss: makeEnemy("Kraken", "\uD83D\uDC19", 400, 28, 16, 14, 200, 500, "#1e3a5f"), stars: [25, 10, 0] },
    ],
  },
  {
    name: "Castelo do Demonio", emoji: "\uD83C\uDFF0", color: "#dc2626",
    levels: [
      { id: 21, name: "Portoes do Castelo", enemies: [makeEnemy("Demone Menor", "\uD83D\uDC7F", 150, 24, 12, 12, 70, 75, "#f43f5e")], stars: [30, 15, 0] },
      { id: 22, name: "Salao do Trono", enemies: [makeEnemy("Demone Menor", "\uD83D\uDC7F", 155, 25, 12, 12, 72, 78, "#f43f5e"), makeEnemy("Cavaleiro Negro", "\uD83D\uDEE1\uFE0F", 180, 22, 18, 8, 78, 85, "#1e293b")], stars: [25, 12, 0] },
      { id: 23, name: "Torre Negra", enemies: [makeEnemy("Cavaleiro Negro", "\uD83D\uDEE1\uFE0F", 190, 24, 18, 8, 82, 90, "#1e293b"), makeEnemy("Necromante", "\uD83E\uDDD9", 130, 30, 8, 14, 85, 95, "#6b21a8")], stars: [25, 12, 0] },
      { id: 24, name: "Camera do Senhor", enemies: [makeEnemy("Demone Elite", "\uD83D\uDC79", 200, 28, 15, 13, 90, 100, "#be123c"), makeEnemy("Cavaleiro Negro", "\uD83D\uDEE1\uFE0F", 170, 24, 18, 8, 78, 85, "#1e293b")], stars: [20, 10, 0] },
      { id: 25, name: "Chefe: Senhor Demoniaco", enemies: [makeEnemy("Demone Elite", "\uD83D\uDC79", 150, 26, 14, 12, 70, 80, "#be123c")], boss: makeEnemy("Senhor Demoniaco", "\uD83D\uDC7E", 550, 35, 20, 15, 300, 800, "#450a0a"), stars: [25, 10, 0] },
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

function getRarity(price: number): { name: string; color: string; glow: string; bg: string; border: string } {
  if (price >= 800) return { name: "Lendario", color: "#f59e0b", glow: "0 0 20px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.15)", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.5)" };
  if (price >= 500) return { name: "Epico", color: "#a855f7", glow: "0 0 16px rgba(168,85,247,0.35), 0 0 32px rgba(168,85,247,0.12)", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.45)" };
  if (price >= 300) return { name: "Raro", color: "#3b82f6", glow: "0 0 12px rgba(59,130,246,0.3), 0 0 24px rgba(59,130,246,0.1)", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.4)" };
  if (price >= 150) return { name: "Incomum", color: "#22c55e", glow: "0 0 8px rgba(34,197,94,0.25)", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.35)" };
  return { name: "Comum", color: "#94a3b8", glow: "none", bg: "rgba(148,163,184,0.04)", border: "rgba(148,163,184,0.2)" };
}

// ============================================================
// ANIMATION VARIANTS
// ============================================================

const fadeSlideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 15, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

const popIn = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

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
  const [animatingHit, setAnimatingHit] = useState(-1);
  const [defBuff, setDefBuff] = useState(1);
  const [atkBuff, setAtkBuff] = useState(1);
  const [criticalHit, setCriticalHit] = useState(false);

  // ---- Visual FX State ----
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [comboCount, setComboCount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [levelUpThisBattle, setLevelUpThisBattle] = useState(false);
  const [levelUpOldLevel, setLevelUpOldLevel] = useState(0);
  const [battleTurnCount, setBattleTurnCount] = useState(0);
  const [showLevelUpOverlay, setShowLevelUpOverlay] = useState(false);

  // ---- Level Complete ----
  const [earnedStars, setEarnedStars] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const [earnedGold, setEarnedGold] = useState(0);

  // ---- Refs ----
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[]>([]);
  const shakeRef = useRef(0);
  const damageIdRef = useRef(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((msg: string) => {
    setBattleLog(prev => [...prev.slice(-8), msg]);
  }, []);

  const recalcStats = useCallback((p: PlayerState) => {
    setStats(calcStats(p));
  }, []);

  // ---- Floating Damage Helper ----
  const addFloatingDamage = useCallback((value: number, x: number, y: number, type: FloatingDamage["type"]) => {
    const id = damageIdRef.current++;
    setFloatingDamages(prev => [...prev, { id, value, x, y, type }]);
    setTimeout(() => {
      setFloatingDamages(prev => prev.filter(d => d.id !== id));
    }, 1200);
  }, []);

  // ---- Screen Shake Helper ----
  const triggerShake = useCallback((intensity: number = 1) => {
    setIsShaking(true);
    shakeRef.current = 4 * intensity;
    setTimeout(() => setIsShaking(false), 300 * intensity);
  }, []);

  // ---- Combo Helper ----
  const incrementCombo = useCallback(() => {
    setComboCount(prev => {
      const next = prev + 1;
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => setComboCount(0), 4000);
      return next;
    });
  }, []);

  const resetCombo = useCallback(() => {
    setComboCount(0);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
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

        // ---- Draw arena background gradient ----
        const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, canvas.width * 0.5);
        grad.addColorStop(0, "rgba(30,27,75,0.3)");
        grad.addColorStop(0.6, "rgba(15,12,41,0.2)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ---- Draw ground line ----
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx * 0.3, cy + 60);
        ctx.lineTo(cx * 1.7, cy + 60);
        ctx.stroke();

        // Draw player
        const playerHit = animatingHit === 0;
        const px = cx - 120 + sx;
        const py = cy + 40 + sy;
        ctx.save();

        // Player glow
        if (!playerHit) {
          const playerGlow = ctx.createRadialGradient(px, py - 10, 10, px, py - 10, 60);
          playerGlow.addColorStop(0, cl.color + "18");
          playerGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = playerGlow;
          ctx.fillRect(px - 80, py - 80, 160, 160);
        }

        if (playerHit) ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.font = `${playerHit ? 68 : 60}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cl.emoji, px, py - 10);
        ctx.restore();

        // Player HP bar (enhanced with gradient)
        const hpPct = Math.max(0, stats.hp / stats.maxHp);
        const barW = 110;
        const barH = 10;
        const barX = px - barW / 2;
        const barY = py + 30;
        ctx.fillStyle = "rgba(15,15,30,0.8)";
        ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 5); ctx.fill();
        if (hpPct > 0) {
          const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW * hpPct, 0);
          if (hpPct > 0.5) { hpGrad.addColorStop(0, "#22c55e"); hpGrad.addColorStop(1, "#4ade80"); }
          else if (hpPct > 0.25) { hpGrad.addColorStop(0, "#f59e0b"); hpGrad.addColorStop(1, "#fbbf24"); }
          else { hpGrad.addColorStop(0, "#dc2626"); hpGrad.addColorStop(1, "#ef4444"); }
          ctx.fillStyle = hpGrad;
          ctx.beginPath(); ctx.roundRect(barX + 1, barY + 1, Math.max(0, (barW - 2) * hpPct), barH - 2, 4); ctx.fill();
          // Shine effect
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.beginPath(); ctx.roundRect(barX + 1, barY + 1, Math.max(0, (barW - 2) * hpPct), (barH - 2) / 2, [4, 4, 0, 0]); ctx.fill();
        }
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.ceil(stats.hp)}/${stats.maxHp}`, px, barY + barH + 16);

        // Player MP bar
        const mpPct = Math.max(0, stats.mp / stats.maxMp);
        const mpBarY = barY + barH + 22;
        ctx.fillStyle = "rgba(15,10,40,0.8)";
        ctx.beginPath(); ctx.roundRect(barX, mpBarY, barW, 6, 3); ctx.fill();
        if (mpPct > 0) {
          const mpGrad = ctx.createLinearGradient(barX, 0, barX + barW * mpPct, 0);
          mpGrad.addColorStop(0, "#6366f1"); mpGrad.addColorStop(1, "#818cf8");
          ctx.fillStyle = mpGrad;
          ctx.beginPath(); ctx.roundRect(barX + 1, mpBarY + 1, Math.max(0, (barW - 2) * mpPct), 4, 2); ctx.fill();
        }

        // Buff indicators
        let buffY = mpBarY + 14;
        if (defBuff > 1) {
          ctx.fillStyle = "#3b82f6";
          ctx.font = "bold 11px system-ui, sans-serif";
          ctx.fillText(`DEF x${defBuff.toFixed(1)}`, px, buffY);
          buffY += 14;
        }
        if (atkBuff > 1) {
          ctx.fillStyle = "#f97316";
          ctx.font = "bold 11px system-ui, sans-serif";
          ctx.fillText(`ATK x${atkBuff.toFixed(1)}`, px, buffY);
        }

        // Draw enemies
        const isBoss = (e: Enemy) => e.name.includes("Chefe") || e.name.includes("Dragao") || e.name.includes("Kraken") || e.name.includes("Senhor") || e.name.includes("Lorde") || e.name.includes("Aranha Rainha");
        battleEnemies.forEach((e, i) => {
          if (e.hp <= 0) return;
          const hit = animatingHit === i + 1;
          const ex = cx + 120 + (i > 0 ? i * 70 : 0) + (hit ? (Math.random() - 0.5) * 18 : 0);
          const ey = cy - 20 + (i > 0 ? i * -35 : 0);
          ctx.save();

          // Enemy glow for bosses
          if (isBoss(e) && !hit) {
            const bossGlow = ctx.createRadialGradient(ex, ey - 10, 10, ex, ey - 10, 70);
            bossGlow.addColorStop(0, e.color + "30");
            bossGlow.addColorStop(0.5, e.color + "10");
            bossGlow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = bossGlow;
            ctx.fillRect(ex - 90, ey - 90, 180, 180);
          }

          if (hit) ctx.globalAlpha = 0.4 + Math.random() * 0.6;
          const fontSize = isBoss(e) ? 68 : 50;
          ctx.font = `${hit ? fontSize + 6 : fontSize}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(e.emoji, ex, ey - 10);
          ctx.restore();

          // Enemy name
          ctx.fillStyle = e.color;
          ctx.font = "bold 11px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(e.name, ex, ey + 24);

          // Enemy HP bar
          const ehp = Math.max(0, e.hp / e.maxHp);
          const ebarW = isBoss(e) ? 100 : 80;
          const ebarH = 8;
          const ebarX = ex - ebarW / 2;
          const ebarY = ey + 30;
          ctx.fillStyle = "rgba(15,15,30,0.8)";
          ctx.beginPath(); ctx.roundRect(ebarX, ebarY, ebarW, ebarH, 4); ctx.fill();
          if (ehp > 0) {
            const eGrad = ctx.createLinearGradient(ebarX, 0, ebarX + ebarW * ehp, 0);
            eGrad.addColorStop(0, e.color);
            eGrad.addColorStop(1, e.color + "cc");
            ctx.fillStyle = eGrad;
            ctx.beginPath(); ctx.roundRect(ebarX + 1, ebarY + 1, Math.max(0, (ebarW - 2) * ehp), ebarH - 2, 3); ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.12)";
            ctx.beginPath(); ctx.roundRect(ebarX + 1, ebarY + 1, Math.max(0, (ebarW - 2) * ehp), (ebarH - 2) / 2, [3, 3, 0, 0]); ctx.fill();
          }
          ctx.fillStyle = "#9ca3af";
          ctx.font = "11px system-ui, sans-serif";
          ctx.fillText(`${Math.ceil(e.hp)}/${e.maxHp}`, ex, ebarY + ebarH + 14);
        });
      }

      // Draw particles (enhanced with trails)
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.018;
        if (p.life <= 0) return false;
        ctx.save();
        ctx.globalAlpha = p.life * 0.9;
        // Glow effect
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * p.life * 2);
        glow.addColorStop(0, p.color);
        glow.addColorStop(0.4, p.color + "88");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4);
        // Core
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, [screen, player, stats, battleEnemies, animatingHit, defBuff, atkBuff]);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: cx + x, y: cy + y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 4,
        life: 0.6 + Math.random() * 0.5,
        color,
        size: 3 + Math.random() * 6,
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
    setComboCount(0);
    setBattleTurnCount(0);
    setLevelUpThisBattle(false);
    setLevelUpOldLevel(player.level);
    setFloatingDamages([]);

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
    setBattleTurnCount(prev => prev + 1);
    const s = calcStats(player);
    const isCrit = Math.random() < 0.15;
    const critMult = isCrit ? 2.0 : 1.0;
    const comboMult = 1 + Math.min(comboCount, 10) * 0.05;
    const rawDmg = Math.max(1, s.atk * atkBuff * comboMult - enemy.def * 0.5);
    const dmg = Math.round(rawDmg * (0.9 + Math.random() * 0.2) * critMult);
    if (isCrit) { setCriticalHit(true); setTimeout(() => setCriticalHit(false), 600); triggerShake(1.5); }
    else { triggerShake(0.6); }

    setBattleEnemies(prev => {
      const next = [...prev];
      next[targetIdx] = { ...next[targetIdx], hp: Math.max(0, next[targetIdx].hp - dmg) };
      return next;
    });
    setAnimatingHit(targetIdx + 1);
    setTimeout(() => setAnimatingHit(-1), 250);
    spawnParticles(120 + targetIdx * 70, -20, isCrit ? '#fbbf24' : CLASSES[player.classId].color, isCrit ? 25 : 10);

    // Floating damage
    const enemyCount = battleEnemies.filter(e => e.hp > 0).length;
    const xPos = 72 + (targetIdx / Math.max(enemyCount, 1)) * 20;
    addFloatingDamage(dmg, xPos, 35, isCrit ? "crit" : "player");

    incrementCombo();
    addLog(`${CLASSES[player.classId].emoji} ${isCrit ? '\u{1F480} CRITICO! ' : ''}${comboCount > 0 ? `[COMBO x${comboCount + 1}] ` : ''}Atacas ${enemy.emoji} ${enemy.name} por ${dmg}!`);

    if (enemy.hp - dmg <= 0) {
      spawnParticles(120 + targetIdx * 70, -20, enemy.color, 20);
      addLog(`${enemy.emoji} ${enemy.name} foi derrotado!`);
    }

    setTimeout(() => enemyTurn(player, targetIdx), 800);
  }, [player, isPlayerTurn, battleOver, battleEnemies, atkBuff, comboCount, spawnParticles, addLog, addFloatingDamage, incrementCombo, triggerShake]);

  const useSkill = useCallback((skillIdx: number) => {
    if (!player || !isPlayerTurn || battleOver) return;
    const skills = SKILLS[player.classId];
    if (!skills || !skills[skillIdx]) return;
    const skill = skills[skillIdx];
    if (stats.mp < skill.mpCost) { addLog("MP insuficiente!"); return; }

    setIsPlayerTurn(false);
    setBattleTurnCount(prev => prev + 1);
    setStats(prev => ({ ...prev, mp: prev.mp - skill.mpCost }));
    triggerShake(0.8);

    if (skill.type === "damage") {
      const s = calcStats(player);
      const comboMult = 1 + Math.min(comboCount, 10) * 0.05;
      battleEnemies.forEach((enemy, i) => {
        if (enemy.hp <= 0) return;
        const dmg = Math.round(Math.max(1, s.atk * skill.power * comboMult - enemy.def * 0.3) * (0.9 + Math.random() * 0.2));
        setBattleEnemies(prev => {
          const next = [...prev];
          next[i] = { ...next[i], hp: Math.max(0, next[i].hp - dmg) };
          return next;
        });
        setAnimatingHit(i + 1);
        setTimeout(() => setAnimatingHit(-1), 250);
        spawnParticles(120 + i * 70, -20, "#f59e0b", 12);
        const aliveCount = battleEnemies.filter(e => e.hp > 0).length;
        addFloatingDamage(dmg, 72 + (i / Math.max(aliveCount, 1)) * 20, 30, "player");
        addLog(`${skill.emoji} ${skill.name}! ${dmg} dano a ${enemy.emoji}`);
      });
      incrementCombo();
    } else if (skill.type === "heal") {
      const heal = Math.round(stats.maxHp * skill.power);
      setStats(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + heal) }));
      spawnParticles(-120, 40, "#22c55e", 15);
      addFloatingDamage(heal, 28, 45, "heal");
      addLog(`${skill.emoji} ${skill.name}! +${heal} HP`);
    } else if (skill.type === "buff") {
      if (player.classId === 4) {
        setDefBuff(prev => prev * skill.power);
        addLog(`${skill.emoji} ${skill.name}! Defesa aumentada!`);
      } else {
        setAtkBuff(prev => prev * skill.power);
        addLog(`${skill.emoji} ${skill.name}! Ataque aumentado!`);
      }
      spawnParticles(-120, 40, "#f59e0b", 10);
      addFloatingDamage(0, 28, 45, "buff");
    }

    setTimeout(() => enemyTurn(player, -1), 800);
  }, [player, isPlayerTurn, battleOver, battleEnemies, stats, comboCount, spawnParticles, addLog, addFloatingDamage, incrementCombo, triggerShake]);

  const enemyTurn = useCallback((p: PlayerState, _lastTarget: number) => {
    if (!p) return;
    const alive = battleEnemies.filter(e => e.hp > 0);
    if (alive.length === 0) return;

    let totalDamage = 0;
    resetCombo();
    triggerShake(1);

    alive.forEach(enemy => {
      const rawDmg = Math.max(1, enemy.atk - (stats.def * defBuff) * 0.5);
      const dmg = Math.round(rawDmg * (0.85 + Math.random() * 0.3));
      totalDamage += dmg;
      setDamageTaken(prev => prev + dmg);
      setAnimatingHit(0);
      setTimeout(() => setAnimatingHit(-1), 250);
      spawnParticles(-120, 40, "#ef4444", 8);
      addFloatingDamage(dmg, 28, 45, "enemy");
      addLog(`${enemy.emoji} ${enemy.name} ataca por ${dmg}!`);
    });

    const playerDied = stats.hp - totalDamage <= 0;
    setStats(prev => ({
      ...prev,
      hp: Math.max(0, prev.hp - totalDamage),
      mp: Math.min(prev.maxMp, prev.mp + 3),
    }));

    if (playerDied) {
      setBattleOver(true);
      setBattleWon(false);
      addLog("Foste derrotado...");
      setTimeout(() => setScreen("gameOver"), 1000);
    }

    const allDead = battleEnemies.every(e => e.hp <= 0);
    if (allDead) {
      setBattleOver(true);
      setBattleWon(true);
      addLog("Vitoria!");
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

      let totalXp = 0, totalGold = 0;
      battleEnemies.forEach(e => { totalXp += e.xpReward; totalGold += e.goldReward; });
      setEarnedXp(totalXp);
      setEarnedGold(totalGold);

      if (p.currentWorld < WORLDS.length && p.currentLevel < WORLDS[p.currentWorld].levels.length) {
        const levelData = WORLDS[p.currentWorld].levels[p.currentLevel];
        let stars = 0;
        if (totalDamage <= (levelData.stars[0] || 999)) stars = 3;
        else if (totalDamage <= (levelData.stars[1] || 999)) stars = 2;
        else stars = 1;
        setEarnedStars(stars);

        const newP = { ...p };
        if (!newP.worldStars[p.currentWorld]) newP.worldStars[p.currentWorld] = [];
        newP.worldStars[p.currentWorld][p.currentLevel] = Math.max(
          newP.worldStars[p.currentWorld]?.[p.currentLevel] || 0, stars
        );
        newP.totalStars = Object.values(newP.worldStars).flat().reduce((a, b) => a + (b || 0), 0);
        newP.xp += totalXp;
        newP.gold += totalGold;

        // Level up check
        let didLevelUp = false;
        while (newP.xp >= newP.level * 50 + 50) {
          newP.xp -= newP.level * 50 + 50;
          newP.level++;
          didLevelUp = true;
          addLog(`\u2B06\uFE0F Nivel ${newP.level}!`);
        }
        if (didLevelUp) {
          setLevelUpThisBattle(true);
          setTimeout(() => {
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.4 } });
            confetti({ particleCount: 100, spread: 60, origin: { y: 0.3 }, colors: ["#fbbf24", "#f59e0b", "#d97706"] });
          }, 600);
        }

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
  }, [battleEnemies, defBuff, stats, spawnParticles, addLog, recalcStats, onScore, resetCombo, triggerShake, addFloatingDamage]);

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
    if (!player) return undefined as { won: boolean; enemy: typeof CLASSES[0]; enemyLvl: number; reward: number } | undefined;
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
      <div className="max-w-lg mx-auto p-4 relative overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div key={i}
              animate={{ y: [0, -30, 0], opacity: [0.08, 0.2, 0.08], scale: [1, 1.3, 1] }}
              transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.25 }}
              className="absolute rounded-full"
              style={{
                left: `${8 + (i * 13) % 85}%`,
                top: `${10 + (i * 17) % 80}%`,
                width: `${3 + (i % 4)}px`,
                height: `${3 + (i % 4)}px`,
                background: ["#a855f7", "#6366f1", "#3b82f6", "#22c55e", "#f59e0b"][i % 5],
                boxShadow: `0 0 ${6 + i * 2}px ${["#a855f7", "#6366f1", "#3b82f6", "#22c55e", "#f59e0b"][i % 5]}40`,
              }} />
          ))}
        </div>

        <motion.div {...fadeSlideUp} className="text-center mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 via-indigo-500/10 to-transparent rounded-2xl blur-sm" />
          <motion.div animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0], scale: [1, 1.08, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
            <span className="text-8xl block mb-2 filter drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">\u2694\uFE0F</span>
          </motion.div>
          <motion.h3 className="font-display text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 bg-clip-text text-transparent relative drop-shadow-sm">
            Campanha RPG
          </motion.h3>
          <p className="text-xs text-muted-foreground mt-1.5 tracking-wide">Escolhe a tua classe e conquista 5 mundos!</p>
          <div className="flex justify-center gap-3 mt-3 text-[10px] text-muted-foreground">
            <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }} className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-yellow-400" /> 5 Mundos</motion.span>
            <span className="flex items-center gap-1"><Skull className="h-3 w-3 text-red-400" /> Bosses</span>
            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" /> 3 Estrelas</span>
            <span className="flex items-center gap-1"><Target className="h-3 w-3 text-purple-400" /> Combos</span>
          </div>
        </motion.div>

        <motion.div {...staggerContainer} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CLASSES.map((c, i) => (
            <motion.button key={i} {...staggerItem}
              whileHover={{ scale: 1.06, y: -4, boxShadow: `0 8px 30px ${c.color}25` }}
              whileTap={{ scale: 0.94 }}
              onClick={() => selectClass(i)}
              className="rounded-xl border-2 border-border bg-card/80 backdrop-blur-sm p-4 text-left transition-all relative overflow-hidden group"
              style={{ borderColor: `${c.color}30` }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(135deg, ${c.color}08, transparent)` }} />
              <motion.span className="text-3xl block relative z-10" animate={{ rotate: [0, -3, 3, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}>{c.emoji}</motion.span>
              <p className="font-bold text-sm mt-1.5 relative z-10" style={{ color: c.color }}>{c.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 relative z-10">{c.desc}</p>
              <div className="grid grid-cols-2 gap-1 mt-2.5 text-[9px] relative z-10">
                <span className="flex items-center gap-0.5 text-red-400"><Heart className="h-2.5 w-2.5" />{c.baseHp}</span>
                <span className="flex items-center gap-0.5 text-orange-400"><Swords className="h-2.5 w-2.5" />{c.baseAtk}</span>
                <span className="flex items-center gap-0.5 text-blue-400"><Shield className="h-2.5 w-2.5" />{c.baseDef}</span>
                <span className="flex items-center gap-0.5 text-green-400"><Zap className="h-2.5 w-2.5" />{c.baseSpd}</span>
              </div>
              {/* Color accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60" style={{ background: `linear-gradient(90deg, transparent, ${c.color}, transparent)` }} />
            </motion.button>
          ))}
        </motion.div>
      </div>
    );
  }

  if (!player) return null;
  const cl = CLASSES[player.classId];
  const skills = SKILLS[player.classId] || [];
  const xpNeeded = player.level * 50 + 50;
  const xpPct = Math.min(1, player.xp / xpNeeded);

  // ---- World Map Screen ----
  if (screen === "worldMap") {
    return (
      <motion.div {...fadeSlideUp} className="max-w-lg mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <motion.div className="flex items-center gap-2.5" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="relative">
              <span className="text-3xl">{cl.emoji}</span>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-background" style={{ background: cl.color }}>{player.level}</div>
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: cl.color }}>{player.name}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5 text-amber-400" />{player.totalStars}</span>
                <span className="flex items-center gap-0.5"><Gem className="h-2.5 w-2.5 text-yellow-400" />{player.gold}</span>
              </div>
              {/* XP Progress Bar */}
              <div className="mt-1 w-24 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${cl.color}88, ${cl.color})` }} initial={{ width: 0 }} animate={{ width: `${xpPct * 100}%` }} transition={{ duration: 0.5 }} />
              </div>
              <p className="text-[8px] text-muted-foreground mt-0.5">XP {player.xp}/{xpNeeded}</p>
            </div>
          </motion.div>
          <motion.div className="flex gap-1.5" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            {[
              { icon: <ShoppingBag className="h-4 w-4 text-yellow-500" />, action: () => setScreen("shop"), label: "Loja" },
              { icon: <Shield className="h-4 w-4 text-blue-400" />, action: () => setScreen("inventory"), label: "Inventario" },
              { icon: <Swords className="h-4 w-4 text-red-400" />, action: () => { const r = simulatePVP(); if (r) alert(r.won ? `Venceste ${r.enemy.emoji} ${r.enemy.name} Nv.${r.enemyLvl}! +${r.reward}\uD83D\uDCB0` : `Perdeste para ${r.enemy.emoji} ${r.enemy.name} Nv.${r.enemyLvl}`); }, label: "PVP" },
              { icon: <RotateCcw className="h-4 w-4 text-muted-foreground" />, action: resetGame, label: "Reset" },
            ].map((btn, i) => (
              <motion.button key={i} whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.08 }}
                onClick={btn.action} title={btn.label}
                className="p-2 rounded-lg bg-card/80 border border-border hover:border-primary/50 backdrop-blur-sm transition-colors">
                {btn.icon}
              </motion.button>
            ))}
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div className="flex gap-1.5 mb-5 text-[10px] flex-wrap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          {[
            { icon: <Heart className="h-3 w-3" />, value: stats.maxHp, color: "text-red-400", bg: "bg-red-500/10" },
            { icon: <Swords className="h-3 w-3" />, value: stats.atk, color: "text-orange-400", bg: "bg-orange-500/10" },
            { icon: <Shield className="h-3 w-3" />, value: stats.def, color: "text-blue-400", bg: "bg-blue-500/10" },
            { icon: <Zap className="h-3 w-3" />, value: stats.spd, color: "text-green-400", bg: "bg-green-500/10" },
            { icon: <Sparkles className="h-3 w-3" />, value: stats.maxMp, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          ].map((s, i) => (
            <span key={i} className={`px-2 py-1 rounded-full ${s.bg} ${s.color} flex items-center gap-1 font-medium`}>
              {s.icon} {s.value}
            </span>
          ))}
        </motion.div>

        {/* Worlds */}
        <div className="space-y-5">
          {WORLDS.map((world, wi) => {
            const unlocked = wi <= player.currentWorld;
            const isCurrent = wi === player.currentWorld;
            const worldStarCount = player.worldStars[wi]?.filter(Boolean).length || 0;
            const worldProgress = worldStarCount / world.levels.length;
            return (
              <motion.div key={wi}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: unlocked ? 1 : 0.35, x: 0 }}
                transition={{ delay: wi * 0.08 }}>
                {/* World Header */}
                <div className={`flex items-center gap-2 mb-2.5 relative`}>
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full" style={{ background: world.color, opacity: isCurrent ? 1 : 0.3 }} />
                  <span className="text-xl ml-2">{world.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{ color: world.color }}>{world.name}</span>
                      {!unlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      {isCurrent && (
                        <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${world.color}20`, color: world.color }}>
                          ATUAL
                        </motion.span>
                      )}
                    </div>
                    {/* World progress bar */}
                    <div className="mt-1 h-1 rounded-full bg-muted/30 overflow-hidden w-40">
                      <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${world.color}88, ${world.color})` }}
                        initial={{ width: 0 }} animate={{ width: `${worldProgress * 100}%` }} transition={{ duration: 0.8, delay: wi * 0.1 }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400" />{worldStarCount}/{world.levels.length}
                  </span>
                </div>

                {/* Level Nodes */}
                <div className="grid grid-cols-5 gap-2 ml-2">
                  {world.levels.map((level, li) => {
                    const isPlayable = isCurrent && li <= player.currentLevel;
                    const isCompleted = (player.worldStars[wi]?.[li] || 0) > 0;
                    const stars = player.worldStars[wi]?.[li] || 0;
                    const isBoss = !!level.boss;
                    return (
                      <motion.button
                        key={li}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: wi * 0.08 + li * 0.04, type: "spring", stiffness: 300 }}
                        whileTap={isPlayable ? { scale: 0.88 } : undefined}
                        whileHover={isPlayable ? { scale: 1.08, y: -2 } : undefined}
                        onClick={() => isPlayable && startLevel(wi, li)}
                        disabled={!isPlayable}
                        className={`relative rounded-xl border p-2 text-center transition-all overflow-hidden ${
                          isBoss && isPlayable ? "ring-1 ring-red-500/40" : ""
                        } ${
                          isPlayable
                            ? isBoss
                              ? "border-red-500/40 bg-gradient-to-b from-red-500/10 to-red-900/10 hover:from-red-500/20 cursor-pointer"
                              : "border-primary/40 bg-gradient-to-b from-primary/5 to-primary/10 hover:from-primary/10 cursor-pointer"
                            : isCompleted
                            ? "border-border bg-card/60"
                            : "border-border/30 bg-muted/10"
                        }`}
                        style={isPlayable && !isBoss ? { borderColor: `${world.color}40` } : undefined}>
                        {/* Playable glow effect */}
                        {isPlayable && (
                          <motion.div className="absolute inset-0 rounded-xl" style={{ boxShadow: `inset 0 0 20px ${isBoss ? "rgba(239,68,68,0.1)" : `${world.color}15`}` }}
                            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                        )}
                        {isBoss ? (
                          <motion.div animate={isPlayable ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }}>
                            <Skull className={`h-5 w-5 mx-auto mb-1 ${isPlayable ? "text-red-400" : "text-muted-foreground"}`} />
                          </motion.div>
                        ) : (
                          <Swords className={`h-4 w-4 mx-auto mb-1 ${isPlayable ? "" : "text-muted-foreground"}`} style={isPlayable ? { color: world.color } : undefined} />
                        )}
                        <p className="text-[9px] font-bold truncate relative z-10">{li + 1}</p>
                        {isCompleted && (
                          <div className="flex justify-center gap-0.5 mt-0.5">
                            {[0, 1, 2].map(s => (
                              <Star key={s} className={`h-2 w-2 ${s < stars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"}`} />
                            ))}
                          </div>
                        )}
                        {isPlayable && !isCompleted && (
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                            <Play className="h-3.5 w-3.5 mx-auto mt-0.5" style={{ color: world.color }} />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // ---- Battle Screen ----
  if (screen === "battle") {
    const hpPct = Math.max(0, stats.hp / stats.maxHp);
    const mpPct = Math.max(0, stats.mp / stats.maxMp);
    return (
      <motion.div
        animate={isShaking ? { x: [-4, 4, -3, 3, -1, 1, 0], y: [1, -2, 1, -1, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-lg mx-auto">
        {/* Battle Canvas with overlay */}
        <div className="relative rounded-2xl overflow-hidden mb-3 border border-border/30"
          style={{ boxShadow: "0 0 30px rgba(0,0,0,0.3), inset 0 0 60px rgba(0,0,0,0.1)" }}>
          <canvas ref={canvasRef} className="w-full h-52 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950" />

          {/* Floating Damage Numbers */}
          <AnimatePresence>
            {floatingDamages.map((fd) => {
              const isCritDamage = fd.type === "crit";
              const isHeal = fd.type === "heal";
              const isBuff = fd.type === "buff";
              const isEnemyDmg = fd.type === "enemy";
              return (
                <motion.div
                  key={fd.id}
                  initial={{ opacity: 1, y: 0, scale: isCritDamage ? 1.5 : 1 }}
                  animate={{ opacity: 0, y: -60, scale: isCritDamage ? 0.8 : 0.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute pointer-events-none font-black z-10"
                  style={{
                    left: `${fd.x}%`,
                    top: `${fd.y}%`,
                    transform: "translate(-50%, -50%)",
                    color: isHeal ? "#22c55e" : isBuff ? "#f59e0b" : isEnemyDmg ? "#ef4444" : isCritDamage ? "#fbbf24" : "#ffffff",
                    fontSize: isCritDamage ? "28px" : isHeal || isBuff ? "18px" : isEnemyDmg ? "20px" : "22px",
                    textShadow: isCritDamage
                      ? "0 0 10px #fbbf24, 0 0 20px #f59e0b, 0 2px 4px rgba(0,0,0,0.8)"
                      : isHeal
                      ? "0 0 8px #22c55e, 0 2px 4px rgba(0,0,0,0.8)"
                      : "0 0 6px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.8)",
                  }}>
                  {isBuff ? "BUFF!" : isHeal ? `+${fd.value}` : isCritDamage ? `${fd.value}!` : `-${fd.value}`}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Combo Display */}
          <AnimatePresence>
            {comboCount >= 2 && (
              <motion.div
                key="combo"
                initial={{ opacity: 0, scale: 0.5, x: -20 }}
                animate={{
                  opacity: 1,
                  scale: 1 + Math.min(comboCount, 10) * 0.03,
                  x: 0,
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-2 left-3 z-10"
                style={{
                  background: comboCount >= 8 ? "linear-gradient(135deg, rgba(239,68,68,0.9), rgba(245,158,11,0.9))" :
                    comboCount >= 5 ? "linear-gradient(135deg, rgba(245,158,11,0.85), rgba(234,179,8,0.85))" :
                    "linear-gradient(135deg, rgba(99,102,241,0.8), rgba(139,92,246,0.8))",
                  padding: "3px 10px",
                  borderRadius: "8px",
                  boxShadow: comboCount >= 5 ? "0 0 15px rgba(245,158,11,0.4)" : "0 0 10px rgba(99,102,241,0.3)",
                }}>
                <span className="text-white font-black text-xs flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  COMBO x{comboCount}
                  {comboCount >= 5 && <Sparkles className="h-3 w-3" />}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Turn Indicator */}
          <div className="absolute top-2 right-3 z-10">
            <motion.div
              animate={isPlayerTurn && !battleOver ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.4 }}
              transition={{ duration: 1.5, repeat: isPlayerTurn && !battleOver ? Infinity : 0 }}
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold backdrop-blur-sm ${isPlayerTurn && !battleOver ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {isPlayerTurn && !battleOver ? "TEU TURNO" : battleOver ? (battleWon ? "VITORIA!" : "...") : "INIMIGO"}
            </motion.div>
          </div>
        </div>

        {/* Player HP/MP Bars */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="flex items-center gap-1 text-red-400 font-medium"><Heart className="h-3 w-3" /> HP</span>
              <span className="text-muted-foreground">{Math.ceil(stats.hp)}/{stats.maxHp}</span>
            </div>
            <div className="h-3 rounded-full bg-muted/30 overflow-hidden border border-border/20">
              <motion.div className="h-full rounded-full" style={{ background: hpPct > 0.5 ? "linear-gradient(90deg, #22c55e, #4ade80)" : hpPct > 0.25 ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #dc2626, #ef4444)" }}
                animate={{ width: `${hpPct * 100}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="flex items-center gap-1 text-indigo-400 font-medium"><Sparkles className="h-3 w-3" /> MP</span>
              <span className="text-muted-foreground">{Math.ceil(stats.mp)}/{stats.maxMp}</span>
            </div>
            <div className="h-3 rounded-full bg-muted/30 overflow-hidden border border-border/20">
              <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #6366f1, #818cf8)" }}
                animate={{ width: `${mpPct * 100}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
          {(defBuff > 1 || atkBuff > 1) && (
            <div className="flex items-center gap-1">
              {defBuff > 1 && <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }} className="text-[10px] px-2 py-1 rounded-full bg-blue-500/15 text-blue-400 font-bold border border-blue-500/20"><Shield className="h-3 w-3 inline" /> x{defBuff.toFixed(1)}</motion.span>}
              {atkBuff > 1 && <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }} className="text-[10px] px-2 py-1 rounded-full bg-orange-500/15 text-orange-400 font-bold border border-orange-500/20"><Flame className="h-3 w-3 inline" /> x{atkBuff.toFixed(1)}</motion.span>}
            </div>
          )}
        </div>

        {/* Battle Log */}
        <div className="h-24 overflow-y-auto rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 p-2 mb-3 text-[11px] text-muted-foreground space-y-0.5"
          style={{ boxShadow: "inset 0 2px 10px rgba(0,0,0,0.1)" }}>
          <AnimatePresence>
            {battleLog.map((log, i) => (
              <motion.p key={`${i}-${log.slice(0, 20)}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={i === battleLog.length - 1 ? "text-foreground font-medium" : ""}
                style={log.includes("CRITICO") ? { color: "#fbbf24" } : log.includes("Vitoria") ? { color: "#22c55e" } : log.includes("derrotad") ? { color: "#ef4444" } : log.includes("Nivel") ? { color: "#a855f7" } : log.includes("COMBO") ? { color: "#818cf8" } : undefined}>
                {log}
              </motion.p>
            ))}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {/* Attack buttons for each alive enemy */}
          <div className="flex gap-2 flex-wrap">
            {battleEnemies.map((enemy, i) => (
              enemy.hp > 0 && (
                <motion.button
                  key={i}
                  layout
                  whileHover={isPlayerTurn && !battleOver ? { scale: 1.05, boxShadow: `0 0 15px ${enemy.color}30` } : undefined}
                  whileTap={{ scale: 0.92 }}
                  disabled={!isPlayerTurn || battleOver}
                  onClick={() => playerAttack(i)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium disabled:opacity-30 transition-all border relative overflow-hidden group"
                  style={{
                    background: `linear-gradient(135deg, ${enemy.color}10, ${enemy.color}05)`,
                    borderColor: `${enemy.color}40`,
                    color: enemy.color,
                  }}>
                  <motion.span className="text-lg" animate={isPlayerTurn && !battleOver ? { y: [0, -2, 0] } : {}} transition={{ duration: 1, repeat: Infinity }}>{enemy.emoji}</motion.span>
                  <span className="font-bold">{enemy.name}</span>
                  <span className="text-[9px] opacity-60 ml-1">{Math.ceil(enemy.hp)}HP</span>
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(circle at center, ${enemy.color}10, transparent)` }} />
                </motion.button>
              )
            ))}
          </div>

          {/* Skill buttons */}
          {skills.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {skills.map((skill, i) => {
                const canUse = isPlayerTurn && !battleOver && stats.mp >= skill.mpCost;
                const mpRatio = stats.mp / skill.mpCost;
                return (
                  <motion.button
                    key={i}
                    whileHover={canUse ? { scale: 1.05, y: -1 } : undefined}
                    whileTap={canUse ? { scale: 0.92 } : undefined}
                    disabled={!canUse}
                    onClick={() => useSkill(i)}
                    className="relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium disabled:opacity-30 overflow-hidden border transition-all group"
                    style={{
                      background: canUse
                        ? skill.type === "damage" ? "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.05))"
                          : skill.type === "heal" ? "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.05))"
                          : "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.05))"
                        : "linear-gradient(135deg, rgba(100,100,100,0.05), rgba(100,100,100,0.02))",
                      borderColor: canUse
                        ? skill.type === "damage" ? "rgba(239,68,68,0.3)"
                          : skill.type === "heal" ? "rgba(34,197,94,0.3)"
                          : "rgba(245,158,11,0.3)"
                        : "rgba(100,100,100,0.15)",
                      color: canUse
                        ? skill.type === "damage" ? "#f87171"
                          : skill.type === "heal" ? "#4ade80"
                          : "#fbbf24"
                        : "#666",
                      boxShadow: canUse ? `0 0 10px ${skill.type === "damage" ? "rgba(239,68,68,0.1)" : skill.type === "heal" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)"}` : "none",
                    }}>
                    <span className="text-base">{skill.emoji}</span>
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-[11px]">{skill.name}</span>
                      {/* MP Cost with mini bar */}
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] opacity-70">{skill.mpCost}MP</span>
                        <div className="w-8 h-1 rounded-full bg-black/20 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(1, mpRatio) * 100}%`,
                              background: mpRatio >= 1 ? "#818cf8" : mpRatio >= 0.5 ? "#f59e0b" : "#ef4444",
                            }} />
                        </div>
                      </div>
                    </div>
                    {/* Cooldown shimmer when can't use */}
                    {!canUse && stats.mp > 0 && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                        style={{ animation: "shimmer 2s infinite" }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Critical Hit Flash Overlay */}
        <AnimatePresence>
          {criticalHit && (
            <motion.div
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="fixed inset-0 pointer-events-none z-50"
              style={{ background: "radial-gradient(circle, rgba(251,191,36,0.3), transparent 60%)" }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ---- Shop Screen ----
  if (screen === "shop") {
    return (
      <motion.div {...fadeSlideUp} className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-2 mb-5">
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setScreen("worldMap")}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </motion.button>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-yellow-500" />
            <h3 className="font-display text-lg font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">Loja</h3>
          </div>
          <div className="ml-auto flex items-center gap-1 text-sm font-bold text-yellow-400 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <Gem className="h-3.5 w-3.5" /> {player.gold}
          </div>
        </div>

        {/* Item type filters */}
        <div className="flex gap-2 mb-4">
          {["Todos", "Armas", "Armaduras", "Acessorios"].map((filter, i) => (
            <span key={i} className="text-[10px] px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground font-medium">{filter}</span>
          ))}
        </div>

        <motion.div {...staggerContainer} className="grid gap-2.5">
          {SHOP_ITEMS.map(item => {
            const rarity = getRarity(item.price);
            const owned = player.inventory.some(i => i.id === item.id) || player.equipment.some(e => e?.id === item.id);
            const canAfford = player.gold >= item.price;
            return (
              <motion.div key={item.id} {...staggerItem}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${owned ? "opacity-50" : ""}`}
                style={{
                  background: `linear-gradient(135deg, ${rarity.bg}, transparent)`,
                  borderColor: rarity.border,
                  boxShadow: owned ? "none" : rarity.glow,
                }}>
                <div className="relative">
                  <span className="text-3xl">{item.icon}</span>
                  {!owned && item.price >= 500 && (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-1 -right-1">
                      <Sparkles className="h-3 w-3" style={{ color: rarity.color }} />
                    </motion.div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate" style={{ color: rarity.color }}>{item.name}</p>
                    <span className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider" style={{ color: rarity.color, background: `${rarity.color}15`, border: `1px solid ${rarity.color}30` }}>{rarity.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {item.atk ? <span className="text-orange-400">ATK+{item.atk} </span> : ""}
                    {item.def ? <span className="text-blue-400">DEF+{item.def} </span> : ""}
                    {item.spd ? <span className="text-green-400">SPD+{item.spd} </span> : ""}
                    {item.hp ? <span className="text-red-400">HP+{item.hp} </span> : ""}
                    {item.mp ? <span className="text-indigo-400">MP+{item.mp} </span> : ""}
                  </p>
                </div>
                <motion.button whileTap={{ scale: 0.88 }}
                  disabled={owned || !canAfford}
                  onClick={() => buyItem(item)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30 transition-all"
                  style={{
                    background: owned ? "rgba(100,100,100,0.1)" : `linear-gradient(135deg, ${rarity.color}15, ${rarity.color}08)`,
                    borderColor: owned ? "rgba(100,100,100,0.2)" : rarity.border,
                    color: owned ? "#666" : rarity.color,
                    border: `1px solid ${owned ? "rgba(100,100,100,0.2)" : rarity.border}`,
                  }}>
                  {owned ? "Comprado" : <span className="flex items-center gap-1"><Gem className="h-3 w-3" />{item.price}</span>}
                </motion.button>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    );
  }

  // ---- Inventory Screen ----
  if (screen === "inventory") {
    return (
      <motion.div {...fadeSlideUp} className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-2 mb-5">
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setScreen("worldMap")}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </motion.button>
          <Shield className="h-5 w-5 text-blue-400" />
          <h3 className="font-display text-lg font-bold">Inventario</h3>
        </div>

        {/* Equipped Items */}
        <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider flex items-center gap-1"><Crown className="h-3 w-3 text-amber-400" /> Equipado</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {player.equipment.map((eq, i) => {
            const rarity = eq ? getRarity(eq.price) : null;
            return (
              <motion.div key={i} {...popIn} transition={{ delay: i * 0.1 }}
                className="p-3 rounded-xl border text-center transition-all"
                style={rarity ? {
                  background: `linear-gradient(135deg, ${rarity.bg}, transparent)`,
                  borderColor: rarity.border,
                  boxShadow: rarity.glow,
                } : {
                  background: "rgba(100,100,100,0.03)",
                  borderColor: "rgba(100,100,100,0.15)",
                }}>
                <p className="text-[9px] text-muted-foreground mb-1 font-medium">{["Arma", "Armadura", "Acessorio"][i]}</p>
                {eq ? (
                  <>
                    <span className="text-2xl block">{eq.icon}</span>
                    <p className="text-[10px] font-bold truncate mt-1" style={{ color: rarity?.color }}>{eq.name}</p>
                    <span className="text-[7px] font-bold uppercase" style={{ color: rarity?.color }}>{rarity?.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground/30 text-xs">Vazio</span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Inventory Bag */}
        <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider flex items-center gap-1"><ShoppingBag className="h-3 w-3" /> Mochila ({player.inventory.length})</p>
        <motion.div {...staggerContainer} className="grid gap-2">
          {player.inventory.length === 0 && (
            <motion.p {...fadeSlideUp} className="text-xs text-muted-foreground text-center py-8">
              Mochila vazia. Visita a loja!
            </motion.p>
          )}
          {player.inventory.map((item, i) => {
            const rarity = getRarity(item.price);
            return (
              <motion.div key={i} {...staggerItem}
                className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01]"
                style={{
                  background: `linear-gradient(135deg, ${rarity.bg}, transparent)`,
                  borderColor: rarity.border,
                  boxShadow: rarity.glow,
                }}>
                <div className="relative">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="absolute -top-1 -right-1 text-[7px] font-bold uppercase px-1 rounded" style={{ color: rarity.color, background: `${rarity.color}20` }}>{rarity.name}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: rarity.color }}>{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.atk ? <span className="text-orange-400">ATK+{item.atk} </span> : ""}
                    {item.def ? <span className="text-blue-400">DEF+{item.def} </span> : ""}
                    {item.spd ? <span className="text-green-400">SPD+{item.spd} </span> : ""}
                    {item.hp ? <span className="text-red-400">HP+{item.hp} </span> : ""}
                    {item.mp ? <span className="text-indigo-400">MP+{item.mp} </span> : ""}
                  </p>
                </div>
                <motion.button whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.05 }} onClick={() => equipItem(i)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                  style={{
                    background: `linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))`,
                    borderColor: "rgba(34,197,94,0.3)",
                    color: "#4ade80",
                    boxShadow: "0 0 10px rgba(34,197,94,0.1)",
                  }}>
                  Equipar
                </motion.button>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    );
  }

  // ---- Level Complete Screen ----
  if (screen === "levelComplete") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-sm mx-auto p-6 text-center relative">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 30%, rgba(251,191,36,0.15), transparent 60%)" }} />

        <motion.div initial={{ opacity: 0, scale: 0.3, rotate: -20 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}>
          <motion.div animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
            <span className="text-8xl block filter drop-shadow-[0_0_25px_rgba(251,191,36,0.5)]">\uD83C\uDFC6</span>
          </motion.div>
        </motion.div>

        <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="font-display text-2xl font-black mt-4 bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow-sm">
          Nivel Completo!
        </motion.h3>

        {/* Stars */}
        <div className="flex justify-center gap-3 mt-4">
          {[0, 1, 2].map((s, i) => (
            <motion.div key={s}
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: s < earnedStars ? 1 : 0.7, rotate: 0, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.25, type: "spring", stiffness: 300 }}>
              {s < earnedStars ? (
                <motion.div animate={{ scale: [1, 1.2, 1], filter: ["drop-shadow(0 0 8px rgba(251,191,36,0.6))", "drop-shadow(0 0 16px rgba(251,191,36,0.8))", "drop-shadow(0 0 8px rgba(251,191,36,0.6))"] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}>
                  <Star className="h-10 w-10 text-yellow-400 fill-yellow-400" />
                </motion.div>
              ) : (
                <Star className="h-10 w-10 text-muted-foreground/20" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Rewards */}
        <div className="flex justify-center gap-4 mt-6">
          <motion.div initial={{ y: 30, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.6, type: "spring" }}
            className="px-5 py-3 rounded-2xl border relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))", borderColor: "rgba(99,102,241,0.25)", boxShadow: "0 0 20px rgba(99,102,241,0.1)" }}>
            <p className="text-xl font-black text-blue-400">+{earnedXp}</p>
            <p className="text-[10px] text-muted-foreground font-medium">XP</p>
          </motion.div>
          <motion.div initial={{ y: 30, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.75, type: "spring" }}
            className="px-5 py-3 rounded-2xl border relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.05))", borderColor: "rgba(245,158,11,0.25)", boxShadow: "0 0 20px rgba(245,158,11,0.1)" }}>
            <p className="text-xl font-black text-yellow-400">+{earnedGold}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Ouro</p>
          </motion.div>
        </div>

        {/* Level Up Celebration */}
        <AnimatePresence>
          {levelUpThisBattle && player && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 1, type: "spring" }}
              className="mt-5 p-4 rounded-2xl border relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1), rgba(236,72,153,0.08))",
                borderColor: "rgba(168,85,247,0.3)",
                boxShadow: "0 0 30px rgba(168,85,247,0.15), 0 0 60px rgba(168,85,247,0.05)",
              }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 0%, rgba(168,85,247,0.2), transparent 70%)" }} />
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                  <span className="font-black text-lg bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">LEVEL UP!</span>
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                </div>
              </motion.div>
              <p className="text-sm font-bold text-center" style={{ color: cl.color }}>
                Nivel {levelUpOldLevel} <ChevronRight className="h-4 w-4 inline" /> {player.level}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: "HP", val: `+${12 + player.level}`, icon: <Heart className="h-3 w-3 text-red-400" />, color: "#ef4444" },
                  { label: "ATK", val: "+2", icon: <Swords className="h-3 w-3 text-orange-400" />, color: "#f97316" },
                  { label: "DEF", val: "+1", icon: <Shield className="h-3 w-3 text-blue-400" />, color: "#3b82f6" },
                ].map((stat, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 + i * 0.15 }}
                    className="text-center p-1.5 rounded-lg" style={{ background: `${stat.color}08` }}>
                    <div className="flex items-center justify-center gap-0.5">{stat.icon}<span className="text-[9px] text-muted-foreground">{stat.label}</span></div>
                    <p className="text-xs font-bold mt-0.5" style={{ color: stat.color }}>{stat.val}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.03 }} onClick={() => { setShowLevelUpOverlay(false); setScreen("worldMap"); }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: levelUpThisBattle ? 1.5 : 0.9 }}
          className="mt-6 px-8 py-3 rounded-full font-bold text-sm shadow-lg relative overflow-hidden group"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 4px 20px rgba(99,102,241,0.3), 0 0 40px rgba(99,102,241,0.1)",
          }}>
          <span className="relative z-10 text-white flex items-center gap-1.5">
            Continuar <ChevronRight className="h-4 w-4" />
          </span>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(135deg, #818cf8, #a78bfa)" }} />
        </motion.button>
      </motion.div>
    );
  }

  // ---- Game Over Screen ----
  if (screen === "gameOver") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-sm mx-auto p-6 text-center relative">
        {/* Dark vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle, transparent 30%, rgba(0,0,0,0.3) 100%)" }} />

        <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 150, damping: 10 }}>
          <motion.span className="text-8xl block" animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 3, repeat: Infinity }}>
            \uD83D\uDC80
          </motion.span>
        </motion.div>

        <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="font-display text-2xl font-black mt-4 bg-gradient-to-r from-red-500 via-red-400 to-orange-500 bg-clip-text text-transparent">
          Derrotado!
        </motion.h3>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-sm text-muted-foreground mt-2">
          Melhora o teu equipamento e tenta novamente.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="flex gap-3 justify-center mt-6">
          <motion.button whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.03 }} onClick={() => setScreen("worldMap")}
            className="px-5 py-2.5 rounded-full bg-card border border-border font-medium text-sm hover:border-muted-foreground/30 transition-colors">
            Mapa
          </motion.button>
          <motion.button whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(99,102,241,0.3)" }} onClick={() => {
            if (player) {
              const s = calcStats(player);
              setStats({ ...s, hp: s.maxHp, mp: s.maxMp });
              startLevel(player.currentWorld, player.currentLevel);
            }
          }}
            className="px-5 py-2.5 rounded-full font-medium text-sm text-white relative overflow-hidden group"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 15px rgba(99,102,241,0.25)" }}>
            <span className="relative z-10 flex items-center gap-1.5"><Swords className="h-4 w-4" /> Tentar Outra Vez</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(135deg, #818cf8, #a78bfa)" }} />
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  return null;
}