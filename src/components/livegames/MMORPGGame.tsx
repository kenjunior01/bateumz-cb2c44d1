"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Swords, Heart, Zap, Crown, RotateCcw, Star, Lock,
  ShoppingBag, Send, Trophy, Users, Map as MapIcon, LogOut,
  ArrowLeft, Sparkles, MessageCircle, Coins, Target, Skull,
  ChevronRight, Gift, Swords as SwordsIcon, Globe, TrendingUp, Eye
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TYPES
// ============================================================

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface CharStats {
  hp: number; maxHp: number; atk: number; def: number; spd: number; mp: number; maxMp: number;
}

interface Equipment {
  id: string; name: string; type: "weapon" | "armor" | "accessory";
  atk?: number; def?: number; spd?: number; hp?: number; mp?: number;
  price: number; icon: string;
}

interface Enemy {
  name: string; emoji: string; hp: number; maxHp: number;
  atk: number; def: number; spd: number; xpReward: number; goldReward: number; color: string;
}

interface OnlinePlayer {
  charId: string; name: string; classId: number; level: number; gold: number;
  zone: number; isOnline: boolean;
}

interface ChatMsg {
  id: string; charName: string; classId: number; message: string; time: string;
}

interface DuelRequest {
  id: string; challengerId: string; challengerName: string; challengerClass: number;
  challengerLevel: number; stake: number; created_at: string;
}

interface LeaderboardEntry {
  charId: string; name: string; classId: number; level: number; gold: number; kills: number; wins: number;
}

interface CharacterData {
  charId: string; name: string; classId: number; level: number; xp: number; gold: number;
  equipment: (Equipment | null)[]; inventory: Equipment[];
  totalKills: number; totalDeaths: number; duelsWon: number; duelsLost: number; totalEarned: number;
  currentZone: number;
}

// ============================================================
// GAME DATA
// ============================================================

const CLASSES = [
  { name: "Guerreiro", emoji: "\u2694\uFE0F", desc: "Alto ataque e defesa. Tanque do grupo.", baseHp: 120, baseAtk: 18, baseDef: 14, baseSpd: 8, baseMp: 30, color: "#ef4444" },
  { name: "Mago", emoji: "\uD83D\uDD2E", desc: "Poder magico devastador e controle.", baseHp: 80, baseAtk: 22, baseDef: 6, baseSpd: 10, baseMp: 80, color: "#8b5cf6" },
  { name: "Arqueiro", emoji: "\uD83C\uDFF9\uFE0F", desc: "Ataques rapidos, precisos e letais.", baseHp: 90, baseAtk: 16, baseDef: 8, baseSpd: 18, baseMp: 40, color: "#22c55e" },
  { name: "Ladino", emoji: "\uD83D\uDDE1\uFE0F", desc: "Criticos mortais, invisibilidade.", baseHp: 85, baseAtk: 14, baseDef: 7, baseSpd: 20, baseMp: 50, color: "#f59e0b" },
  { name: "Clerigo", emoji: "\u2728", desc: "Curandeiro divino, suporte essencial.", baseHp: 100, baseAtk: 10, baseDef: 10, baseSpd: 9, baseMp: 90, color: "#06b6d4" },
  { name: "Barbaro", emoji: "\uD83E\uDD8A", desc: "Furia bruta, dano insano.", baseHp: 150, baseAtk: 20, baseDef: 12, baseSpd: 6, baseMp: 20, color: "#dc2626" },
];

const SKILLS: Record<number, { name: string; emoji: string; mpCost: number; type: "damage" | "heal" | "buff"; power: number; desc: string }[]> = {
  0: [{ name: "Golpe Heroico", emoji: "\u2694\uFE0F", mpCost: 10, type: "damage", power: 1.8, desc: "Dano forte" }, { name: "Grito de Guerra", emoji: "\uD83C\uDFAF", mpCost: 8, type: "buff", power: 1.5, desc: "Aumenta ataque" }],
  1: [{ name: "Bola de Fogo", emoji: "\uD83D\uDD25", mpCost: 15, type: "damage", power: 2.2, desc: "Dano magico" }, { name: "Gelo", emoji: "\u2744\uFE0F", mpCost: 12, type: "damage", power: 1.6, desc: "Congela inimigo" }],
  2: [{ name: "Tiro Preciso", emoji: "\uD83C\uDFAF", mpCost: 8, type: "damage", power: 2.0, desc: "Critico garantido" }, { name: "Chuva de Flechas", emoji: "\uD83C\uDF0D", mpCost: 14, type: "damage", power: 1.5, desc: "Dano em area" }],
  3: [{ name: "Golpe Sombrio", emoji: "\uD83C\uDF11", mpCost: 12, type: "damage", power: 2.5, desc: "Critico mortal" }, { name: "Evasao", emoji: "\uD83D\uDD38", mpCost: 8, type: "buff", power: 1.4, desc: "Aumenta defesa" }],
  4: [{ name: "Cura Divina", emoji: "\uD83D\uDC9A", mpCost: 15, type: "heal", power: 0.4, desc: "Restaura HP" }, { name: "Escudo Santo", emoji: "\uD83D\uDEE1\uFE0F", mpCost: 10, type: "buff", power: 1.5, desc: "Aumenta defesa" }],
  5: [{ name: "Furia", emoji: "\uD83D\uDCA2", mpCost: 12, type: "buff", power: 1.8, desc: "Aumenta ataque" }, { name: "Terremoto", emoji: "\uD83C\uDF0B", mpCost: 18, type: "damage", power: 2.0, desc: "Dano em area" }],
};

const SHOP_ITEMS: Equipment[] = [
  { id: "w1", name: "Espada de Ferro", type: "weapon", atk: 5, price: 100, icon: "\uD83D\uDDE1\uFE0F" },
  { id: "w2", name: "Espada de Aco", type: "weapon", atk: 10, price: 300, icon: "\u2694\uFE0F" },
  { id: "w3", name: "Cajado Arcano", type: "weapon", atk: 15, mp: 20, price: 500, icon: "\uD83D\uDD2E" },
  { id: "w4", name: "Arco Longo", type: "weapon", atk: 12, spd: 5, price: 400, icon: "\uD83C\uDFF9\uFE0F" },
  { id: "w5", name: "Adaga Fantasma", type: "weapon", atk: 8, spd: 10, price: 450, icon: "\uD83D\uDDE1\uFE0F" },
  { id: "a1", name: "Armadura de Couro", type: "armor", def: 5, hp: 20, price: 120, icon: "\uD83D\uDEE1\uFE0F" },
  { id: "a2", name: "Armadura de Ferro", type: "armor", def: 10, hp: 50, price: 350, icon: "\uD83D\uDEE1\uFE0F" },
  { id: "a3", name: "Manto Magico", type: "armor", def: 4, mp: 30, price: 400, icon: "\uD83E\uDDE5" },
  { id: "a4", name: "Armadura do Dragao", type: "armor", def: 18, hp: 80, price: 800, icon: "\uD83D\uDC09" },
  { id: "ac1", name: "Anel de Vida", type: "accessory", hp: 40, price: 200, icon: "\uD83D\uDC8D" },
  { id: "ac2", name: "Amuleto de Mana", type: "accessory", mp: 40, price: 200, icon: "\uD83D\uDCFF" },
  { id: "ac3", name: "Botas de Velocidade", type: "accessory", spd: 8, price: 250, icon: "\uD83D\uDC62" },
  { id: "ac4", name: "Coroa do Heroi", type: "accessory", atk: 5, def: 5, hp: 30, mp: 30, price: 1000, icon: "\uD83D\uDC51" },
  { id: "w6", name: "Espada Lendária", type: "weapon", atk: 25, spd: 3, price: 2000, icon: "\u2694\uFE0F" },
  { id: "w7", name: "Cajado do Caos", type: "weapon", atk: 20, mp: 40, price: 1800, icon: "\uD83D\uDD2E" },
  { id: "a5", name: "Armadura Abissal", type: "armor", def: 25, hp: 120, price: 1500, icon: "\uD83D\uDC7E" },
  { id: "a6", name: "Manto Celestial", type: "armor", def: 15, mp: 50, hp: 60, price: 2200, icon: "\u2728" },
  { id: "ac5", name: "Anel do Vazio", type: "accessory", atk: 10, spd: 10, mp: 20, price: 1500, icon: "\uD83D\uDC8D" },
  { id: "ac6", name: "Pendente do Dragao", type: "accessory", atk: 8, def: 10, hp: 60, price: 2500, icon: "\uD83D\uDC9C" },
];

const ZONES = [
  { name: "Planicie Verde", emoji: "\uD83C\uDF3F", color: "#22c55e", minLevel: 1, enemies: [
    { name: "Goblin", emoji: "\uD83D\uDC7A", hp: 40, atk: 8, def: 3, spd: 5, xp: 15, gold: 20, color: "#4ade80" },
    { name: "Lobo", emoji: "\uD83D\uDC3A", hp: 35, atk: 10, def: 2, spd: 8, xp: 20, gold: 25, color: "#94a3b8" },
    { name: "Slime", emoji: "\uD83D\uDFE2", hp: 25, atk: 6, def: 1, spd: 4, xp: 10, gold: 12, color: "#22d3ee" },
  ]},
  { name: "Floresta Sombria", emoji: "\uD83C\uDF32", color: "#16a34a", minLevel: 3, enemies: [
    { name: "Aranha", emoji: "\uD83D\uDD77\uFE0F", hp: 55, atk: 12, def: 5, spd: 10, xp: 30, gold: 35, color: "#a855f7" },
    { name: "Bandido", emoji: "\uD83D\uDC63", hp: 60, atk: 14, def: 6, spd: 9, xp: 35, gold: 45, color: "#78716c" },
    { name: "Lobo Alfa", emoji: "\uD83D\uDC3A", hp: 70, atk: 15, def: 7, spd: 11, xp: 40, gold: 50, color: "#64748b" },
  ]},
  { name: "Catacumbas", emoji: "\uD83D\uDC80", color: "#a855f7", minLevel: 5, enemies: [
    { name: "Esqueleto", emoji: "\uD83D\uDC80", hp: 80, atk: 16, def: 10, spd: 7, xp: 50, gold: 55, color: "#c084fc" },
    { name: "Zumbi", emoji: "\uD83E\uDDDF", hp: 100, atk: 14, def: 12, spd: 4, xp: 55, gold: 60, color: "#65a30d" },
    { name: "Fantasma", emoji: "\uD83D\uDC7B", hp: 65, atk: 20, def: 5, spd: 14, xp: 60, gold: 65, color: "#e2e8f0" },
  ]},
  { name: "Vulcao Ardente", emoji: "\uD83C\uDF0B", color: "#ef4444", minLevel: 8, enemies: [
    { name: "Salamandra", emoji: "\uD83E\uDD8E", hp: 120, atk: 22, def: 12, spd: 10, xp: 80, gold: 85, color: "#f97316" },
    { name: "Golem de Fogo", emoji: "\uD83D\uDD25", hp: 160, atk: 18, def: 18, spd: 5, xp: 90, gold: 95, color: "#dc2626" },
    { name: "Demonio Menor", emoji: "\uD83D\uDC7F", hp: 140, atk: 24, def: 14, spd: 12, xp: 100, gold: 110, color: "#f43f5e" },
  ]},
  { name: "Oceano Profundo", emoji: "\uD83C\uDF0A", color: "#3b82f6", minLevel: 11, enemies: [
    { name: "Piranha", emoji: "\uD83D\uDC1F", hp: 150, atk: 26, def: 14, spd: 14, xp: 120, gold: 130, color: "#38bdf8" },
    { name: "Medusa", emoji: "\uD83E\uDEBC", hp: 130, atk: 30, def: 10, spd: 12, xp: 130, gold: 140, color: "#c084fc" },
    { name: "Tritao", emoji: "\uD83E\uDDDC", hp: 170, atk: 28, def: 16, spd: 13, xp: 140, gold: 150, color: "#0ea5e9" },
  ]},
  { name: "Castelo Demonio", emoji: "\uD83D\uDDF0", color: "#dc2626", minLevel: 15, enemies: [
    { name: "Cavaleiro Negro", emoji: "\uD83D\uDEE1\uFE0F", hp: 200, atk: 32, def: 22, spd: 10, xp: 180, gold: 200, color: "#1e293b" },
    { name: "Necromante", emoji: "\uD83E\uDDD9", hp: 160, atk: 38, def: 12, spd: 14, xp: 200, gold: 220, color: "#6b21a8" },
    { name: "Demonio Elite", emoji: "\uD83D\uDC79", hp: 250, atk: 36, def: 20, spd: 15, xp: 250, gold: 280, color: "#be123c" },
  ]},
  { name: "Abismo Vazio", emoji: "\uD83C\uDF0C", color: "#7c3aed", minLevel: 18, enemies: [
    { name: "Vazio Andarilho", emoji: "\u26AB", hp: 280, atk: 38, def: 25, spd: 16, xp: 300, gold: 320, color: "#7c3aed" },
    { name: "Sombra Devoradora", emoji: "\uD83D\uDD2E", hp: 320, atk: 42, def: 20, spd: 18, xp: 350, gold: 380, color: "#4c1d95" },
    { name: "Guardiao Abissal", emoji: "\uD83D\uDC7E", hp: 400, atk: 45, def: 30, spd: 14, xp: 400, gold: 450, color: "#3b0764" },
  ]},
  { name: "Celesstia", emoji: "\u2B50", color: "#f59e0b", minLevel: 22, enemies: [
    { name: "Anjo Caído", emoji: "\uD83D\uDC7A", hp: 400, atk: 48, def: 32, spd: 16, xp: 500, gold: 550, color: "#fbbf24" },
    { name: "Seraphim", emoji: "\u2728", hp: 350, atk: 55, def: 28, spd: 20, xp: 550, gold: 600, color: "#f59e0b" },
    { name: "Arquidemónio", emoji: "\u2620\uFE0F", hp: 500, atk: 60, def: 35, spd: 18, xp: 700, gold: 800, color: "#dc2626" },
  ]},
];

const BOSS_POOL = [
  { name: "Dragao Antigo", emoji: "\uD83D\uDC09", hp: 2000, atk: 40, def: 25, xp: 500, gold: 1000, color: "#7f1d1d" },
  { name: "Kraken", emoji: "\uD83D\uDC19", hp: 3000, atk: 45, def: 30, xp: 800, gold: 2000, color: "#1e3a5f" },
  { name: "Senhor Demonio", emoji: "\uD83D\uDC7E", hp: 5000, atk: 55, def: 35, xp: 1500, gold: 5000, color: "#450a0a" },
  { name: "Fenix Celestial", emoji: "\uD83D\uDD25", hp: 8000, atk: 65, def: 40, xp: 2500, gold: 8000, color: "#f59e0b" },
  { name: "Serpente Cosmica", emoji: "\uD83D\uDC0D", hp: 12000, atk: 80, def: 50, xp: 5000, gold: 15000, color: "#6366f1" },
];

const RAID_BOSSES = [
  { name: "Hydra", emoji: "\uD83D\uDC0D", hp: 5000, atk: 50, def: 30, xp: 2000, gold: 5000, color: "#22c55e" },
  { name: "Golem Celestial", emoji: "\uD83E\uDDD8", hp: 8000, atk: 60, def: 45, xp: 3000, gold: 8000, color: "#f59e0b" },
];

// ============================================================
// QUEST SYSTEM
// ============================================================

interface Quest {
  id: string; name: string; desc: string; emoji: string;
  target: number; progress: number; reward: number; rewardType: "gold" | "xp";
  type: "kill" | "gold_earn" | "duel_win" | "level_up";
  completed: boolean;
}

const DAILY_QUESTS: Omit<Quest, "id" | "progress" | "completed">[] = [
  { name: "Cacador Iniciante", desc: "Derrota 5 inimigos", emoji: "\u2694\uFE0F", target: 5, reward: 100, rewardType: "gold", type: "kill" },
  { name: "Colecionador de Ouro", desc: "Ganha 300 ouro", emoji: "\uD83D\uDCB0", target: 300, reward: 50, rewardType: "xp", type: "gold_earn" },
  { name: "Guerreiro do Dia", desc: "Vence 1 duelo PVP", emoji: "\uD83C\uDFC6", target: 1, reward: 200, rewardType: "gold", type: "duel_win" },
  { name: "Ascensao", desc: "Sobe 1 nivel", emoji: "\u2B50", target: 1, reward: 150, rewardType: "xp", type: "level_up" },
];

// ============================================================
// ACHIEVEMENTS
// ============================================================

interface Achievement {
  id: string; name: string; desc: string; emoji: string; unlocked: boolean;
}

const ACHIEVEMENT_DEFS: Omit<Achievement, "id" | "unlocked">[] = [
  { name: "Primeiro Sangue", desc: "Derrota o teu primeiro inimigo", emoji: "\uD83C\uDFA5" },
  { name: "Colecionador", desc: "Compra 3 itens na loja", emoji: "\uD83D\uDCE6" },
  { name: "Duelista", desc: "Vence o teu primeiro duelo PVP", emoji: "\u2694\uFE0F" },
  { name: "Cacador de Boss", desc: "Contribui para derrotar um Boss Mundial", emoji: "\uD83D\uDC80" },
  { name: "Rico", desc: "Acumula 5000 ouro", emoji: "\uD83D\uDC51" },
  { name: "Veterano", desc: "Alcana nivel 10", emoji: "\uD83C\uDF96\uFE0F" },
  { name: "Lendario", desc: "Alcana nivel 25", emoji: "\uD83D\uDC51" },
  { name: "Matador de 100", desc: "Derrota 100 inimigos", emoji: "\uD83D\uDCAF" },
];

// ============================================================
// LOOT DROP SYSTEM
// ============================================================

interface LootDrop {
  item: Equipment; rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

const LOOT_RARITY: Record<string, { label: string; color: string; glow: string; chance: number }> = {
  common: { label: "Comum", color: "#9ca3af", glow: "", chance: 0.6 },
  uncommon: { label: "Incomum", color: "#22c55e", glow: "shadow-[0_0_8px_#22c55e40]", chance: 0.25 },
  rare: { label: "Raro", color: "#3b82f6", glow: "shadow-[0_0_12px_#3b82f640]", chance: 0.1 },
  epic: { label: "Epico", color: "#a855f7", glow: "shadow-[0_0_16px_#a855f740]", chance: 0.04 },
  legendary: { label: "Lendario", color: "#f59e0b", glow: "shadow-[0_0_20px_#f59e0b60]", chance: 0.01 },
};

const LOOT_ITEMS: Equipment[] = [
  { id: "lw1", name: "Lamina Velha", type: "weapon", atk: 3, price: 80, icon: "\uD83D\uDDE1\uFE0F" },
  { id: "lw2", name: "Espada Encantada", type: "weapon", atk: 8, price: 250, icon: "\u2694\uFE0F" },
  { id: "lw3", name: "Cajado Sombrio", type: "weapon", atk: 13, mp: 15, price: 450, icon: "\uD83D\uDD2E" },
  { id: "la1", name: "Tunica de Couro", type: "armor", def: 3, hp: 15, price: 60, icon: "\uD83D\uDEE1\uFE0F" },
  { id: "la2", name: "Armadura de Titio", type: "armor", def: 8, hp: 40, price: 200, icon: "\uD83D\uDEE1\uFE0F" },
  { id: "lac1", name: "Anel Sorte", type: "accessory", spd: 5, hp: 20, price: 150, icon: "\uD83D\uDC8D" },
  { id: "lac2", name: "Pendente de Forca", type: "accessory", atk: 7, def: 3, price: 350, icon: "\uD83D\uDCFF" },
];

function rollLoot(): LootDrop | null {
  const roll = Math.random();
  let cumulative = 0;
  let rarity = "common";
  for (const [key, val] of Object.entries(LOOT_RARITY)) {
    cumulative += val.chance;
    if (roll < cumulative) { rarity = key; break; }
  }
  // Only drop 35% of the time
  if (Math.random() > 0.35) return null;
  const item = { ...LOOT_ITEMS[Math.floor(Math.random() * LOOT_ITEMS.length)] };
  // Boost stats based on rarity
  const mult = rarity === "legendary" ? 3 : rarity === "epic" ? 2.2 : rarity === "rare" ? 1.6 : rarity === "uncommon" ? 1.3 : 1;
  if (item.atk) item.atk = Math.round(item.atk * mult);
  if (item.def) item.def = Math.round(item.def * mult);
  if (item.hp) item.hp = Math.round(item.hp * mult);
  if (item.mp) item.mp = Math.round(item.mp * mult);
  if (item.spd) item.spd = Math.round(item.spd * mult);
  item.price = Math.round(item.price * mult);
  item.id += "_" + rarity;
  return { item, rarity };
}

// ============================================================
// HELPERS
// ============================================================

const SAVE_KEY = "bateu_mmorpg_char";
const GUEST_PREFIX = "guest_";

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function loadLocalChar(): CharacterData | null {
  try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

function saveLocalChar(c: CharacterData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(c)); } catch {}
}

function calcStats(char: CharacterData): CharStats {
  const c = CLASSES[char.classId];
  const lvl = char.level;
  let hp = c.baseHp + lvl * 12, maxHp = hp;
  let atk = c.baseAtk + lvl * 2;
  let def = c.baseDef + lvl * 1;
  let spd = c.baseSpd + lvl * 1;
  let mp = c.baseMp + lvl * 5, maxMp = mp;
  for (const eq of char.equipment) {
    if (!eq) continue;
    hp += eq.hp || 0; maxHp += eq.hp || 0;
    atk += eq.atk || 0; def += eq.def || 0; spd += eq.spd || 0;
    mp += eq.mp || 0; maxMp += eq.mp || 0;
  }
  return { hp, maxHp, atk, def, spd, mp, maxMp };
}

function xpForLevel(lvl: number) { return lvl * 50 + 50; }

function makeEnemy(e: typeof ZONES[0]["enemies"][0]): Enemy {
  return { name: e.name, emoji: e.emoji, hp: e.hp, maxHp: e.hp, atk: e.atk, def: e.def, spd: e.spd, xpReward: e.xp, goldReward: e.gold, color: e.color };
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}m atras`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atras`;
  return `${Math.floor(s / 86400)}d atras`;
}

// ============================================================
// SUPABASE HELPERS (com fallback para localStorage)
// ============================================================

async function dbUpsertChar(char: CharacterData, guestId?: string) {
  try {
    const stats = calcStats(char);
    const row = {
      guest_id: guestId || null,
      name: char.name, class_id: char.classId, level: char.level, xp: char.xp, gold: char.gold,
      hp: stats.maxHp, max_hp: stats.maxHp, mp: stats.maxMp, max_mp: stats.maxMp,
      atk: stats.atk, def: stats.def, spd: stats.spd,
      equipment: JSON.stringify(char.equipment), inventory: JSON.stringify(char.inventory),
      total_stars: 0, total_kills: char.totalKills, total_deaths: char.totalDeaths,
      total_duels_won: char.duelsWon, total_duels_lost: char.duelsLost, total_earned: char.totalEarned,
      current_zone: char.currentZone, is_online: true, last_online: new Date().toISOString(),
    };
    const { error } = await (supabase as any).from("rpg_characters").upsert(row, { onConflict: "guest_id" });
    if (error) throw error;
  } catch { saveLocalChar(char); }
}

async function dbSetOffline(guestId: string) {
  try { await (supabase as any).from("rpg_characters").update({ is_online: false }).eq("guest_id", guestId); } catch {}
}

async function dbSendChat(guestId: string, charName: string, classId: number, message: string, zone: number) {
  try {
    await (supabase as any).from("rpg_chat").insert({ guest_id: guestId, char_name: charName, class_id: classId, message, zone });
  } catch (e) { console.warn("Chat insert failed:", e); }
}

async function dbSendTransfer(fromId: string, fromName: string, toId: string, toName: string, amount: number, desc: string) {
  try {
    await (supabase as any).from("rpg_transactions").insert({
      from_guest_id: fromId, from_name: fromName, to_guest_id: toId, to_name: toName, amount, type: "transfer", description: desc,
    });
  } catch (e) { console.warn("Transfer insert failed:", e); }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

type Screen = "create" | "world" | "battle" | "pvpBattle" | "pvpResult";
type Tab = "map" | "arena" | "economy" | "shop" | "chat" | "rank" | "profile" | "market" | "quests";

export default function MMORPGGame({ onScore, liveCode }: Props) {
  // Core
  const [char, setChar] = useState<CharacterData | null>(null);
  const [stats, setStats] = useState<CharStats>({ hp: 100, maxHp: 100, atk: 10, def: 5, spd: 8, mp: 30, maxMp: 30 });
  const [screen, setScreen] = useState<Screen>("create");
  const [tab, setTab] = useState<Tab>("map");
  const [guestId, setGuestId] = useState("");

  // Multiplayer
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [duelRequests, setDuelRequests] = useState<DuelRequest[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [worldBoss, setWorldBoss] = useState<{ name: string; emoji: string; hp: number; maxHp: number; rewardsPool: number; isActive: boolean } | null>(null);

  // Battle
  const [battleEnemy, setBattleEnemy] = useState<Enemy | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [battleOver, setBattleOver] = useState(false);
  const [battleWon, setBattleWon] = useState(false);
  const [defBuff, setDefBuff] = useState(1);
  const [atkBuff, setAtkBuff] = useState(1);
  const [battleHp, setBattleHp] = useState(100);
  const [battleMp, setBattleMp] = useState(30);

  // PVP
  const [pvpOpponent, setPvpOpponent] = useState<OnlinePlayer | null>(null);
  const [pvpStake, setPvpStake] = useState(0);
  const [pvpHp, setPvpHp] = useState(100);
  const [pvpEnemyHp, setPvpEnemyHp] = useState(100);
  const [pvpLog, setPvpLog] = useState<string[]>([]);
  const [pvpOver, setPvpOver] = useState(false);
  const [pvpWon, setPvpWon] = useState(false);
  const [pvpTurn, setPvpTurn] = useState(true);

  // UI
  const [chatInput, setChatInput] = useState("");
  const [transferTarget, setTransferTarget] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [stakeInput, setStakeInput] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState<OnlinePlayer | null>(null);
  const [charNameInput, setCharNameInput] = useState("");
  const placeholderName = useMemo(() => "Heroi " + Math.floor(Math.random() * 9999), []);
  const [notification, setNotification] = useState("");
  const [dailyCollected, setDailyCollected] = useState(false);

  // Quest & Achievement State
  const [quests, setQuests] = useState<Quest[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [lootDrop, setLootDrop] = useState<LootDrop | null>(null);
  const [showLoot, setShowLoot] = useState(false);
  const [floatingDmg, setFloatingDmg] = useState<{ id: number; value: number; type: "player" | "enemy" | "heal" | "gold" | "xp"; x: number; y: number }[]>([]);
  const floatIdRef = useRef(0);
  const [levelUpEffect, setLevelUpEffect] = useState(false);

  // Auto-grind
  const [autoGrind, setAutoGrind] = useState(false);
  const [grindLog, setGrindLog] = useState<string[]>([]);
  const [grindStats, setGrindStats] = useState({ kills: 0, gold: 0, xp: 0, deaths: 0 });
  const autoGrindRef = useRef<any>(null);

  // Marketplace
  const [marketListings, setMarketListings] = useState<{ id: string; sellerId: string; sellerName: string; item: Equipment; price: number; time: string }[]>([]);
  const [marketSellPrice, setMarketSellPrice] = useState("");
  const [marketSellItem, setMarketSellItem] = useState("");

  // Time Events
  const [eventBonus, setEventBonus] = useState<{ type: string; multiplier: number; label: string } | null>(null);
  const [bossTimer, setBossTimer] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const battleLogRef = useRef<HTMLDivElement>(null);
  const grindLogRef = useRef<HTMLDivElement>(null);
  const onlineCountRef = useRef(onlinePlayers.length);
  onlineCountRef.current = onlinePlayers.length;

  const notify = useCallback((msg: string) => { setNotification(msg); setTimeout(() => setNotification(""), 3000); }, []);

  // Floating damage numbers
  const spawnFloating = useCallback((value: number, type: "player" | "enemy" | "heal" | "gold" | "xp") => {
    const id = ++floatIdRef.current;
    setFloatingDmg(prev => [...prev, { id, value, type, x: 40 + Math.random() * 20, y: 30 + Math.random() * 20 }]);
    setTimeout(() => setFloatingDmg(prev => prev.filter(d => d.id !== id)), 1200);
  }, []);

  // ---- Quest System ----
  useEffect(() => {
    if (!char) return;
    const saved = localStorage.getItem("bateu_mmorpg_quests");
    if (saved) { try { setQuests(JSON.parse(saved)); } catch {} }
    else {
      setQuests(DAILY_QUESTS.map((q, i) => ({ ...q, id: `q_${i}`, progress: 0, completed: false })));
    }
  }, [char]);

  useEffect(() => {
    if (quests.length > 0) localStorage.setItem("bateu_mmorpg_quests", JSON.stringify(quests));
  }, [quests]);

  const advanceQuest = useCallback((type: Quest["type"], amount: number = 1) => {
    setQuests(prev => prev.map(q => {
      if (q.completed || q.type !== type) return q;
      const np = Math.min(q.target, q.progress + amount);
      const nc = np >= q.target;
      if (nc && !q.completed) {
        const rewardLabel = q.rewardType === "gold" ? `+${q.reward} \uD83D\uDCB0` : `+${q.reward} XP`;
        setTimeout(() => notify(`\uD83C\uDF89 Quest completa: ${q.name}! ${rewardLabel}`), 500);
      }
      return { ...q, progress: np, completed: nc };
    }));
  }, [notify]);

  // ---- Achievement System ----
  useEffect(() => {
    const saved = localStorage.getItem("bateu_mmorpg_achievements");
    if (saved) { try { setAchievements(JSON.parse(saved)); } catch {} }
    else { setAchievements(ACHIEVEMENT_DEFS.map((a, i) => ({ ...a, id: `ach_${i}`, unlocked: false }))); }
  }, []);

  useEffect(() => {
    if (achievements.length > 0) localStorage.setItem("bateu_mmorpg_achievements", JSON.stringify(achievements));
  }, [achievements]);

  const unlockAchievement = useCallback((name: string) => {
    setAchievements(prev => prev.map(a => {
      if (a.unlocked || a.name !== name) return a;
      setTimeout(() => { notify(`\uD83C\uDFC5 Conquista desbloqueada: ${a.emoji} ${a.name}!`); confetti({ particleCount: 80, spread: 60 }); }, 300);
      return { ...a, unlocked: true };
    }));
  }, [notify]);

  // Check achievements
  useEffect(() => {
    if (!char) return;
    if (char.totalKills >= 1) unlockAchievement("Primeiro Sangue");
    if (char.totalKills >= 100) unlockAchievement("Matador de 100");
    if (char.duelsWon >= 1) unlockAchievement("Duelista");
    if (char.gold >= 5000) unlockAchievement("Rico");
    if (char.level >= 10) unlockAchievement("Veterano");
    if (char.level >= 25) unlockAchievement("Lendario");
    if (char.inventory.length + char.equipment.filter(Boolean).length >= 3) unlockAchievement("Colecionador");
  }, [char, unlockAchievement]);

  // ---- Reset daily quests at midnight ----
  useEffect(() => {
    const lastReset = localStorage.getItem("bateu_mmorpg_quest_reset");
    const today = new Date().toDateString();
    if (lastReset !== today) {
      localStorage.setItem("bateu_mmorpg_quest_reset", today);
      setQuests(DAILY_QUESTS.map((q, i) => ({ ...q, id: `q_${i}`, progress: 0, completed: false })));
    }
  }, []);

  // ---- Load Character ----
  useEffect(() => {
    let gid = localStorage.getItem("bateu_mmorpg_guestid");
    if (!gid) { gid = GUEST_PREFIX + genId(); localStorage.setItem("bateu_mmorpg_guestid", gid); }
    setGuestId(gid);

    const saved = loadLocalChar();
    if (saved) {
      setChar(saved);
      setStats(calcStats(saved));
      setScreen("world");
      dbUpsertChar(saved, gid);
    }

    // Daily reward check
    const lastDaily = localStorage.getItem("bateu_mmorpg_daily");
    if (lastDaily && Date.now() - parseInt(lastDaily) < 86400000) setDailyCollected(true);
  }, []);

  // ---- Supabase Realtime ----
  useEffect(() => {
    if (!guestId || !char) return;

    const channel = (supabase as any).channel(`mmorpg_${guestId}`, { config: { broadcast: { self: true } } });
    channelRef.current = channel;

    // Subscribe to characters changes for online list
    const charSub = (supabase as any)
      .channel("rpg_chars_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "rpg_characters" }, (payload: any) => {
        if (payload.new && payload.new.guest_id !== guestId) {
          setOnlinePlayers(prev => {
            const existing = prev.filter(p => p.charId !== payload.new.guest_id);
            if (payload.new.is_online) {
              return [...existing, {
                charId: payload.new.guest_id, name: payload.new.name, classId: payload.new.class_id,
                level: payload.new.level, gold: payload.new.gold, zone: payload.new.current_zone, isOnline: true,
              }];
            }
            return existing;
          });
        }
      })
      .subscribe();

    // Subscribe to chat
    const chatSub = (supabase as any)
      .channel("rpg_chat_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rpg_chat" }, (payload: any) => {
        const m = payload.new;
        // Avoid duplicate for sender (optimistic add already added it)
        if (m.guest_id === guestId) return;
        setChatMessages(prev => [...prev.slice(-49), {
          id: m.id, charName: m.char_name, classId: m.class_id, message: m.message, time: m.created_at,
        }]);
      })
      .subscribe();

    // Load initial data
    (async () => {
      try {
        const { data: onlineData } = await (supabase as any).from("rpg_characters").select("*").eq("is_online", true).neq("guest_id", guestId).limit(50);
        if (onlineData) {
          setOnlinePlayers(onlineData.map((r: any) => ({
            charId: r.guest_id, name: r.name, classId: r.class_id,
            level: r.level, gold: r.gold, zone: r.current_zone, isOnline: true,
          })));
        }

        const { data: chatData } = await (supabase as any).from("rpg_chat").select("*").order("created_at", { ascending: false }).limit(50);
        if (chatData) {
          setChatMessages(chatData.reverse().map((r: any) => ({
            id: r.id, charName: r.char_name, classId: r.class_id, message: r.message, time: r.created_at,
          })));
        }

        const { data: lbData } = await (supabase as any).from("rpg_characters").select("*").order("level", { ascending: false }).limit(20);
        if (lbData) {
          setLeaderboard(lbData.map((r: any) => ({
            charId: r.guest_id, name: r.name, classId: r.class_id, level: r.level,
            gold: r.gold, kills: r.total_kills || 0, wins: r.total_duels_won || 0,
          })));
        }

        // World boss
        const { data: bossData } = await (supabase as any).from("rpg_world_boss").select("*").eq("is_active", true).single();
        if (bossData) {
          setWorldBoss({ name: bossData.boss_name, emoji: bossData.boss_emoji, hp: bossData.boss_hp, maxHp: bossData.boss_max_hp, rewardsPool: bossData.rewards_pool || 0, isActive: true });
        }
      } catch {}
    })();

    // Set online
    dbUpsertChar(char, guestId);

    // Broadcast presence
    const presence = channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      // Merge with DB online list
    });

    channel.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          guest_id: guestId, name: char.name, class_id: char.classId, level: char.level, zone: char.currentZone,
        });
      }
    });

    return () => {
      channel.unsubscribe();
      charSub.unsubscribe();
      chatSub.unsubscribe();
      dbSetOffline(guestId);
    };
  }, [guestId, char?.charId]);

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
  useEffect(() => { battleLogRef.current?.scrollIntoView({ behavior: "smooth" }); }, [battleLog]);
  useEffect(() => { grindLogRef.current?.scrollIntoView({ behavior: "smooth" }); }, [grindLog]);

  // ---- Periodic DB Sync ----
  useEffect(() => {
    if (!char || !guestId) return;
    const iv = setInterval(() => {
      saveLocalChar(char);
      dbUpsertChar(char, guestId);
    }, 30000); // sync every 30s
    return () => clearInterval(iv);
  }, [char, guestId]);

  // ---- World Boss Auto-Spawn ----
  useEffect(() => {
    if (!char || screen !== "world") return;

    // Load saved boss state
    const savedBoss = localStorage.getItem("bateu_mmorpg_boss");
    if (savedBoss) {
      try {
        const b = JSON.parse(savedBoss);
        if (b.isActive && Date.now() - b.spawnedAt < 3600000) {
          setWorldBoss(b);
          const elapsed = Math.floor((Date.now() - b.spawnedAt) / 1000);
          setBossTimer(Math.max(0, 3600 - elapsed));
        } else {
          localStorage.removeItem("bateu_mmorpg_boss");
        }
      } catch {}
    }

    // Spawn boss every 30 min if none active
    const spawnInterval = setInterval(() => {
      if (worldBoss?.isActive) return;
      const poolIdx = Math.min(Math.floor(Math.random() * BOSS_POOL.length), BOSS_POOL.length - 1);
      const boss = BOSS_POOL[poolIdx];
      const scaledHp = boss.hp + char.level * 100;
      const newBoss = { name: boss.name, emoji: boss.emoji, hp: scaledHp, maxHp: scaledHp, rewardsPool: boss.gold + onlineCountRef.current * 100, isActive: true };
      setWorldBoss(newBoss);
      setBossTimer(3600);
      localStorage.setItem("bateu_mmorpg_boss", JSON.stringify({ ...newBoss, spawnedAt: Date.now() }));
      notify(`\uD83D\uDC7A ${boss.name} apareceu! Todos podem atacar!`);
      confetti({ particleCount: 50, spread: 40 });
    }, 1800000); // 30 min

    // Boss timer countdown
    const timerInterval = setInterval(() => {
      setBossTimer(prev => {
        if (prev <= 0) {
          setWorldBoss(null);
          localStorage.removeItem("bateu_mmorpg_boss");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { clearInterval(spawnInterval); clearInterval(timerInterval); };
  }, [char, screen, worldBoss?.isActive, notify]);

  // ---- Time Events ----
  useEffect(() => {
    if (!char) return;
    const check = () => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      // Weekend: 2x gold
      if (day === 0 || day === 6) {
        setEventBonus({ type: "gold", multiplier: 2, label: "\uD83C\uDFB2 Fim de semana: 2x Ouro!" });
      }
      // Golden hour: 12h-13h = 1.5x XP
      else if (hour >= 12 && hour < 13) {
        setEventBonus({ type: "xp", multiplier: 1.5, label: "\u2B50 Hora Dourada: 1.5x XP!" });
      }
      // Happy hour: 18h-20h = 1.5x gold
      else if (hour >= 18 && hour < 20) {
        setEventBonus({ type: "gold", multiplier: 1.5, label: "\uD83C\uDF89 Happy Hour: 1.5x Ouro!" });
      }
      else {
        setEventBonus(null);
      }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, [char]);

  // ---- Auto-Grind ----
  useEffect(() => {
    if (!autoGrind || !char || screen !== "world") {
      if (autoGrindRef.current) { clearInterval(autoGrindRef.current); autoGrindRef.current = null; }
      return;
    }
    const zone = ZONES[char.currentZone];
    if (!zone || char.level < zone.minLevel) { setAutoGrind(false); return; }

    const s = calcStats(char);

    autoGrindRef.current = setInterval(() => {
      // Pick a fresh random enemy each fight
      const freshTemplate = zone.enemies[Math.floor(Math.random() * zone.enemies.length)];
      const scale = 1 + (char.level - zone.minLevel) * 0.05;
      const eHp = Math.round(freshTemplate.hp * scale);
      const eAtk = Math.round(freshTemplate.atk * scale);
      const eDef = Math.round(freshTemplate.def * scale);

      setChar(prev => {
        if (!prev) return prev;
        const ps = calcStats(prev);
        let pHp = ps.maxHp; // Full HP each fight for auto
        let eCurrentHp = eHp;
        let turns = 0;

        while (pHp > 0 && eCurrentHp > 0 && turns < 30) {
          turns++;
          const pDmg = Math.max(1, Math.round((ps.atk - eDef * 0.5) * (0.85 + Math.random() * 0.3)));
          eCurrentHp -= pDmg;
          if (eCurrentHp <= 0) break;
          const eDmg = Math.max(1, Math.round((eAtk - ps.def * 0.5) * (0.85 + Math.random() * 0.3)));
          pHp -= eDmg;
        }

        if (eCurrentHp <= 0) {
          let goldG = freshTemplate.gold;
          let xpG = freshTemplate.xp;
          if (eventBonus?.type === "gold") goldG = Math.round(goldG * eventBonus.multiplier);
          if (eventBonus?.type === "xp") xpG = Math.round(xpG * eventBonus.multiplier);

          let nc = { ...prev, xp: prev.xp + xpG, gold: prev.gold + goldG, totalKills: prev.totalKills + 1, totalEarned: prev.totalEarned + goldG };
          while (nc.xp >= xpForLevel(nc.level)) {
            nc.xp -= xpForLevel(nc.level);
            nc.level++;
          }
          saveLocalChar(nc);

          setGrindStats(gs => ({ ...gs, kills: gs.kills + 1, gold: gs.gold + goldG, xp: gs.xp + xpG }));
          setGrindLog(gl => [...gl.slice(-19), `\u2705 ${freshTemplate.emoji} ${freshTemplate.name}: +${xpG}XP +${goldG}\uD83D\uDCB0`]);
          return nc;
        } else {
          setGrindStats(gs => ({ ...gs, deaths: gs.deaths + 1 }));
          setGrindLog(gl => [...gl.slice(-19), `\uD83D\uDC80 ${freshTemplate.emoji} ${freshTemplate.name}: Derrotado!`]);
          return { ...prev, totalDeaths: prev.totalDeaths + 1 };
        }
      });
    }, 1500);

    return () => { if (autoGrindRef.current) { clearInterval(autoGrindRef.current); autoGrindRef.current = null; } };
  }, [autoGrind, char, screen, char?.currentZone, eventBonus]);

  // ---- Game Actions ----
  const updateChar = useCallback((updater: (c: CharacterData) => CharacterData) => {
    setChar(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      saveLocalChar(next);
      dbUpsertChar(next, guestId);
      return next;
    });
  }, [guestId]);

  const recalcAndSet = useCallback((c: CharacterData) => {
    setStats(calcStats(c));
  }, []);

  // Recalculate stats whenever equipment changes (e.g. after equipItem)
  useEffect(() => {
    if (char) recalcAndSet(char);
  }, [char?.equipment, char?.level]);

  const createCharacter = useCallback((classId: number, name: string) => {
    const newChar: CharacterData = {
      charId: guestId, name: name || CLASSES[classId].name, classId, level: 1, xp: 0, gold: 100,
      equipment: [null, null, null], inventory: [],
      totalKills: 0, totalDeaths: 0, duelsWon: 0, duelsLost: 0, totalEarned: 0, currentZone: 0,
    };
    setChar(newChar);
    setStats(calcStats(newChar));
    saveLocalChar(newChar);
    dbUpsertChar(newChar, guestId);
    setScreen("world");
    confetti({ particleCount: 100, spread: 70 });
  }, [guestId]);

  const collectDaily = useCallback(() => {
    if (dailyCollected || !char) return;
    const reward = 50 + char.level * 10;
    updateChar(c => ({ ...c, gold: c.gold + reward, totalEarned: c.totalEarned + reward }));
    localStorage.setItem("bateu_mmorpg_daily", Date.now().toString());
    setDailyCollected(true);
    notify(`\uD83C\uDF81 Recompensa diaria: +${reward} ouro!`);
    onScore?.("Daily Reward", reward);
  }, [dailyCollected, char, updateChar, notify, onScore]);

  // ---- PVE Battle ----
  const startPVE = useCallback((zoneIdx: number, enemyIdx: number) => {
    if (!char) return;
    const zone = ZONES[zoneIdx];
    const e = zone.enemies[enemyIdx];
    const enemy = makeEnemy(e);
    // Scale enemy slightly with player level
    const scale = 1 + (char.level - zone.minLevel) * 0.05;
    enemy.hp = Math.round(enemy.hp * scale); enemy.maxHp = enemy.hp;
    enemy.atk = Math.round(enemy.atk * scale); enemy.def = Math.round(enemy.def * scale);

    setBattleEnemy(enemy);
    setBattleLog([`\uD83E\uDD16 Entraste em ${zone.name}!`]);
    setIsPlayerTurn(true); setBattleOver(false); setBattleWon(false);
    setDefBuff(1); setAtkBuff(1);
    const s = calcStats(char);
    setBattleHp(s.maxHp); setBattleMp(s.maxMp);
    setScreen("battle");
  }, [char]);

  const pveAttack = useCallback(() => {
    if (!char || !battleEnemy || !isPlayerTurn || battleOver) return;
    setIsPlayerTurn(false);
    const dmg = Math.max(1, Math.round((stats.atk * atkBuff - battleEnemy.def * 0.5) * (0.9 + Math.random() * 0.2)));
    const newEnemyHp = Math.max(0, battleEnemy.hp - dmg);
    setBattleEnemy(prev => prev ? { ...prev, hp: newEnemyHp } : null);
    spawnFloating(dmg, "player");
    setBattleLog(prev => [...prev.slice(-6), `${CLASSES[char.classId].emoji} Atacas ${battleEnemy.emoji} por ${dmg}!`]);

    setTimeout(() => {
      if (newEnemyHp <= 0) {
        setBattleOver(true); setBattleWon(true);
        setBattleLog(prev => [...prev.slice(-6), `\uD83C\uDFC6 ${battleEnemy.emoji} ${battleEnemy.name} derrotado!`]);
        confetti({ particleCount: 60, spread: 50 });
        let xpG = battleEnemy.xpReward; let goldG = battleEnemy.goldReward;
        if (eventBonus?.type === "gold") goldG = Math.round(goldG * eventBonus.multiplier);
        if (eventBonus?.type === "xp") xpG = Math.round(xpG * eventBonus.multiplier);
        const prevLevel = char.level;
        const loot = rollLoot();
        updateChar(c => {
          let nc = { ...c, xp: c.xp + xpG, gold: c.gold + goldG, totalKills: c.totalKills + 1, totalEarned: c.totalEarned + goldG };
          if (loot) nc = { ...nc, inventory: [...nc.inventory, loot.item] };
          let leveledUp = false;
          while (nc.xp >= xpForLevel(nc.level)) { nc.xp -= xpForLevel(nc.level); nc.level++; leveledUp = true; }
          if (leveledUp) { setLevelUpEffect(true); setTimeout(() => setLevelUpEffect(false), 2000); }
          return nc;
        });
        advanceQuest("kill", 1);
        advanceQuest("gold_earn", goldG);
        if (char.level < prevLevel + 1) advanceQuest("level_up", 1);
        if (loot) {
          setLootDrop(loot);
          setShowLoot(true);
          if (loot.rarity === "legendary" || loot.rarity === "epic") confetti({ particleCount: 150, spread: 80 });
        }
        onScore?.("PVE Kill", xpG + goldG);
        return;
      }
      // Enemy turn
      const eDmg = Math.max(1, Math.round((battleEnemy.atk - (stats.def * defBuff) * 0.5) * (0.85 + Math.random() * 0.3)));
      const newHp = Math.max(0, battleHp - eDmg);
      setBattleHp(newHp);
      spawnFloating(eDmg, "enemy");
      setBattleLog(prev => [...prev.slice(-6), `${battleEnemy.emoji} ${battleEnemy.name} ataca por ${eDmg}!`]);

      if (newHp <= 0) {
        setBattleOver(true); setBattleWon(false);
        setBattleLog(prev => [...prev.slice(-6), "\uD83D\uDC80 Foste derrotado!"]);
        updateChar(c => ({ ...c, totalDeaths: c.totalDeaths + 1 }));
        return;
      }
      setIsPlayerTurn(true);
      setBattleMp(prev => Math.min(stats.maxMp, prev + 3));
    }, 600);
  }, [char, battleEnemy, isPlayerTurn, battleOver, stats, atkBuff, defBuff, battleHp, eventBonus, updateChar, onScore]);

  const pveSkill = useCallback((skillIdx: number) => {
    if (!char || !battleEnemy || !isPlayerTurn || battleOver) return;
    const skills = SKILLS[char.classId];
    if (!skills?.[skillIdx]) return;
    const skill = skills[skillIdx];
    if (battleMp < skill.mpCost) { notify("MP insuficiente!"); return; }
    setBattleMp(prev => prev - skill.mpCost);
    setIsPlayerTurn(false);

    if (skill.type === "damage") {
      const dmg = Math.max(1, Math.round((stats.atk * skill.power - battleEnemy.def * 0.3) * (0.9 + Math.random() * 0.2)));
      const newEnemyHp = Math.max(0, battleEnemy.hp - dmg);
      setBattleEnemy(prev => prev ? { ...prev, hp: newEnemyHp } : null);
      spawnFloating(dmg, "player");
      setBattleLog(prev => [...prev.slice(-6), `${skill.emoji} ${skill.name}! ${dmg} dano!`]);

      setTimeout(() => {
        if (newEnemyHp <= 0) {
          setBattleOver(true); setBattleWon(true);
          setBattleLog(prev => [...prev.slice(-6), `\uD83C\uDFC6 Vitoria!`]);
          confetti({ particleCount: 60, spread: 50 });
          let xpG = battleEnemy.xpReward; let goldG = battleEnemy.goldReward;
          if (eventBonus?.type === "gold") goldG = Math.round(goldG * eventBonus.multiplier);
          if (eventBonus?.type === "xp") xpG = Math.round(xpG * eventBonus.multiplier);
          const loot = rollLoot();
          const prevLevel = char.level;
          updateChar(c => {
            let nc = { ...c, xp: c.xp + xpG, gold: c.gold + goldG, totalKills: c.totalKills + 1, totalEarned: c.totalEarned + goldG };
            if (loot) nc = { ...nc, inventory: [...nc.inventory, loot.item] };
            let leveledUp = false;
            while (nc.xp >= xpForLevel(nc.level)) { nc.xp -= xpForLevel(nc.level); nc.level++; leveledUp = true; }
            if (leveledUp) { setLevelUpEffect(true); setTimeout(() => setLevelUpEffect(false), 2000); }
            return nc;
          });
          advanceQuest("kill", 1);
          advanceQuest("gold_earn", goldG);
          if (char.level < prevLevel + 1) advanceQuest("level_up", 1);
          if (loot) {
            setLootDrop(loot); setShowLoot(true);
            if (loot.rarity === "legendary" || loot.rarity === "epic") confetti({ particleCount: 150, spread: 80 });
          }
          onScore?.("PVE Skill Kill", xpG + goldG);
          return;
        }
        const eDmg = Math.max(1, Math.round((battleEnemy.atk - (stats.def * defBuff) * 0.5) * (0.85 + Math.random() * 0.3)));
        const newHp = Math.max(0, battleHp - eDmg);
        setBattleHp(newHp);
        spawnFloating(eDmg, "enemy");
        setBattleLog(prev => [...prev.slice(-6), `${battleEnemy.emoji} contra-ataca por ${eDmg}!`]);
        if (newHp <= 0) { setBattleOver(true); setBattleWon(false); updateChar(c => ({ ...c, totalDeaths: c.totalDeaths + 1 })); return; }
        setIsPlayerTurn(true);
        setBattleMp(prev => Math.min(stats.maxMp, prev + 3));
      }, 600);
    } else if (skill.type === "heal") {
      const heal = Math.round(stats.maxHp * skill.power);
      setBattleHp(prev => Math.min(stats.maxHp, prev + heal));
      setBattleLog(prev => [...prev.slice(-6), `${skill.emoji} ${skill.name}! +${heal} HP`]);
      // Enemy still attacks after heal
      setTimeout(() => {
        if (battleEnemy) {
          const eDmg = Math.max(1, Math.round((battleEnemy.atk - (stats.def * defBuff) * 0.5) * (0.85 + Math.random() * 0.3)));
          const newHp = Math.min(stats.maxHp, Math.max(0, battleHp + heal - eDmg));
          setBattleHp(newHp);
          setBattleLog(prev => [...prev.slice(-6), `${battleEnemy.emoji} contra-ataca por ${eDmg}!`]);
          if (newHp <= 0) { setBattleOver(true); setBattleWon(false); updateChar(c => ({ ...c, totalDeaths: c.totalDeaths + 1 })); return; }
        }
        setIsPlayerTurn(true);
        setBattleMp(prev => Math.min(stats.maxMp, prev + 2));
      }, 400);
    } else {
      if (skill.name.includes("Defesa") || char.classId === 4) setDefBuff(prev => prev * skill.power);
      else setAtkBuff(prev => prev * skill.power);
      setBattleLog(prev => [...prev.slice(-6), `${skill.emoji} ${skill.name}! Buff ativado!`]);
      // Enemy still attacks after buff
      setTimeout(() => {
        if (battleEnemy) {
          const eDmg = Math.max(1, Math.round((battleEnemy.atk - (stats.def * defBuff) * 0.5) * (0.85 + Math.random() * 0.3)));
          const newHp = Math.max(0, battleHp - eDmg);
          setBattleHp(newHp);
          setBattleLog(prev => [...prev.slice(-6), `${battleEnemy.emoji} contra-ataca por ${eDmg}!`]);
          if (newHp <= 0) { setBattleOver(true); setBattleWon(false); updateChar(c => ({ ...c, totalDeaths: c.totalDeaths + 1 })); return; }
        }
        setIsPlayerTurn(true);
        setBattleMp(prev => Math.min(stats.maxMp, prev + 2));
      }, 400);
    }
  }, [char, battleEnemy, isPlayerTurn, battleOver, stats, defBuff, atkBuff, battleHp, battleMp, updateChar, onScore, notify]);

  // ---- PVP ----
  const challengePlayer = useCallback((opponent: OnlinePlayer, stake: number) => {
    if (!char || char.gold < stake) { notify("Ouro insuficiente!"); return; }
    if (stake <= 0) { notify("Aposta deve ser maior que 0!"); return; }

    // Start simulated real-time PVP (in production, this would use Supabase Realtime for true sync)
    setPvpOpponent(opponent);
    setPvpStake(stake);
    setPvpHp(stats.maxHp);
    const oppClass = CLASSES[opponent.classId];
    const oppMaxHp = oppClass.baseHp + opponent.level * 12 + 50; // estimate
    setPvpEnemyHp(oppMaxHp);
    setPvpLog([`\u2694\uFE0F Duelo contra ${opponent.emoji || CLASSES[opponent.classId].emoji} ${opponent.name}!`]);
    setPvpOver(false); setPvpWon(false); setPvpTurn(true);
    setScreen("pvpBattle");
  }, [char, stats, notify]);

  const pvpAttack = useCallback(() => {
    if (!char || !pvpOpponent || pvpOver || !pvpTurn) return;
    setPvpTurn(false);
    const oppClass = CLASSES[pvpOpponent.classId];
    const oppDef = oppClass.baseDef + pvpOpponent.level;
    const pDmg = Math.max(1, Math.round((stats.atk * atkBuff - oppDef * 0.4) * (0.85 + Math.random() * 0.3)));
    const newEHp = Math.max(0, pvpEnemyHp - pDmg);
    setPvpEnemyHp(newEHp);
    setPvpLog(prev => [...prev.slice(-6), `${CLASSES[char.classId].emoji} Atacas ${CLASSES[pvpOpponent.classId].emoji} por ${pDmg}!`]);

    setTimeout(() => {
      if (newEHp <= 0) {
        setPvpOver(true); setPvpWon(true);
        // TODO: Implement server-side PVP with real stakes via Supabase RPC
        setPvpLog(prev => [...prev.slice(-6), `\uD83C\uDFC6 Venceste o duelo! +${pvpStake} ouro!`]);
        confetti({ particleCount: 100, spread: 70 });
        updateChar(c => ({ ...c, gold: c.gold + pvpStake, duelsWon: c.duelsWon + 1, totalEarned: c.totalEarned + pvpStake }));
        advanceQuest("duel_win", 1);
        dbSendTransfer(guestId, char!.name, pvpOpponent!.charId, pvpOpponent!.name, pvpStake, `Duelo PVP - aposta`);
        onScore?.("PVP Win", pvpStake * 2);
        return;
      }
      // Opponent counter-attack (AI simulated for opponent)
      const oppAtk = oppClass.baseAtk + pvpOpponent.level * 2 + 5;
      const eDmg = Math.max(1, Math.round((oppAtk - (stats.def * defBuff) * 0.4) * (0.85 + Math.random() * 0.3)));
      const newHp = Math.max(0, pvpHp - eDmg);
      setPvpHp(newHp);
      setPvpLog(prev => [...prev.slice(-6), `${CLASSES[pvpOpponent.classId].emoji} ${pvpOpponent.name} contra-ataca por ${eDmg}!`]);

      if (newHp <= 0) {
        setPvpOver(true); setPvpWon(false);
        setPvpLog(prev => [...prev.slice(-6), `\uD83D\uDC80 Perdeste o duelo! -${pvpStake} ouro`]);
        updateChar(c => ({ ...c, gold: Math.max(0, c.gold - pvpStake), duelsLost: c.duelsLost + 1 }));
        dbSendTransfer(guestId, char!.name, pvpOpponent!.charId, pvpOpponent!.name, pvpStake, `Duelo PVP - perda`);
        onScore?.("PVP Loss", 0);
        return;
      }
      setPvpTurn(true);
    }, 700);
  }, [char, pvpOpponent, pvpOver, pvpTurn, stats, atkBuff, defBuff, pvpHp, pvpEnemyHp, pvpStake, updateChar, onScore, guestId]);

  // ---- Economy ----
  const sendGold = useCallback((targetId: string, targetName: string, amount: number) => {
    if (!char || char.gold < amount || amount <= 0) { notify("Transferencia invalida!"); return; }
    updateChar(c => ({ ...c, gold: c.gold - amount }));
    dbSendTransfer(guestId, char.name, targetId, targetName, amount, "Transferencia P2P");
    // TODO: Add recipient gold via Supabase RPC — currently only logs the transfer
    notify(`\u2705 Enviaste ${amount} ouro para ${targetName}`);
    onScore?.("P2P Transfer", amount);
  }, [char, guestId, updateChar, notify, onScore]);

  // ---- Shop ----
  const buyItem = useCallback((item: Equipment) => {
    if (!char || char.gold < item.price) { notify("Ouro insuficiente!"); return; }
    const owned = char.inventory.some(i => i.id === item.id) || char.equipment.some(e => e?.id === item.id);
    if (owned) { notify("Ja possuis este item!"); return; }
    updateChar(c => ({ ...c, gold: c.gold - item.price, inventory: [...c.inventory, { ...item }] }));
    notify(`${item.icon} ${item.name} comprado!`);
  }, [char, updateChar, notify]);

  const equipItem = useCallback((invIdx: number) => {
    if (!char) return;
    const item = char.inventory[invIdx];
    if (!item) return;
    const slot = item.type === "weapon" ? 0 : item.type === "armor" ? 1 : 2;
    updateChar(c => {
      const newInv = [...c.inventory]; newInv.splice(invIdx, 1);
      const oldItem = c.equipment[slot];
      if (oldItem) newInv.push(oldItem);
      const newEq = [...c.equipment]; newEq[slot] = item;
      return { ...c, inventory: newInv, equipment: newEq };
    });
  }, [char, updateChar]);

  const sellItem = useCallback((invIdx: number) => {
    if (!char) return;
    const item = char.inventory[invIdx];
    if (!item) return;
    const sellPrice = Math.floor(item.price * 0.6);
    updateChar(c => {
      const newInv = [...c.inventory]; newInv.splice(invIdx, 1);
      return { ...c, inventory: newInv, gold: c.gold + sellPrice };
    });
    notify(`Vendido por ${sellPrice} ouro`);
  }, [char, updateChar, notify]);

  // ---- World Boss ----
  const attackBoss = useCallback(() => {
    if (!char || !worldBoss || !worldBoss.isActive) return;
    const dmg = Math.max(1, Math.round(stats.atk * (0.8 + Math.random() * 0.4)));
    const newBossHp = Math.max(0, worldBoss.hp - dmg);
    setWorldBoss(prev => prev ? { ...prev, hp: newBossHp } : null);

    (async () => {
      try { await (supabase as any).from("rpg_world_boss").update({ boss_hp: newBossHp }).eq("is_active", true); } catch {}
    })();

    if (newBossHp <= 0) {
      const reward = Math.floor(worldBoss.rewardsPool / Math.max(1, onlinePlayers.length + 1)) + 100;
      updateChar(c => ({ ...c, gold: c.gold + reward, totalEarned: c.totalEarned + reward, xp: c.xp + 200 }));
      setWorldBoss(null);
      confetti({ particleCount: 200, spread: 100 });
      notify(`\uD83C\uDFC6 Boss derrotado! +${reward} ouro!`);
    }
  }, [char, worldBoss, stats, onlinePlayers.length, updateChar, notify]);

  // ---- Chat ----
  const sendChat = useCallback(() => {
    if (!char || !chatInput.trim()) return;
    const msg = chatInput.trim().slice(0, 200);
    dbSendChat(guestId, char.name, char.classId, msg, char.currentZone);
    setChatMessages(prev => [...prev.slice(-49), {
      id: genId(), charName: char.name, classId: char.classId, message: msg, time: new Date().toISOString(),
    }]);
    setChatInput("");
  }, [char, chatInput, guestId]);

  // ---- Delete & Reset ----
  const deleteCharacter = useCallback(() => {
    if (!confirm("Tens a certeza? Todo o progresso sera perdido!")) return;
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem("bateu_mmorpg_guestid");
    localStorage.removeItem("bateu_mmorpg_daily");
    localStorage.removeItem("bateu_mmorpg_boss");
    (async () => { try { await (supabase as any).from("rpg_characters").delete().eq("guest_id", guestId); } catch {} })();
    setChar(null); setScreen("create");
  }, [guestId]);

  // ============================================================
  // RENDER: Character Creation
  // ============================================================

  if (screen === "create") {
    const [hoveredClass, setHoveredClass] = useState<number | null>(null);
    const hc = hoveredClass !== null ? CLASSES[hoveredClass] : null;
    return (
      <div className="max-w-lg mx-auto p-3 sm:p-4 pb-28 sm:pb-6">
        {/* Epic Header */}
        <div className="text-center mb-5 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent rounded-2xl" />
          <motion.div animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }} transition={{ duration: 4, repeat: Infinity }}>
            <span className="text-6xl block mb-2">\uD83C\uDF0D</span>
          </motion.div>
          <motion.h3 className="font-display text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 bg-clip-text text-transparent relative"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }} transition={{ duration: 3, repeat: Infinity }}>
            MMORPG Bateu
          </motion.h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Mundo persistente \u2022 Duelos PVP \u2022 Loot \u2022 Economia P2P</p>
          <div className="flex justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">\uD83C\uDF1F 8 Zonas</span>
            <span className="flex items-center gap-1">\u2694\uFE0F PVP</span>
            <span className="flex items-center gap-1">\uD83D\uDC7A 5 Bosses</span>
            <span className="flex items-center gap-1">\uD83C\uDF81 Loot</span>
          </div>
        </div>

        <div className="mb-3 sm:mb-4">
          <label className="text-xs text-muted-foreground block mb-1">Nome do personagem</label>
          <input
            value={charNameInput} onChange={e => setCharNameInput(e.target.value.slice(0, 16))}
            placeholder={placeholderName}
            className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
            maxLength={16}
          />
        </div>

        {/* Class Preview */}
        <AnimatePresence>
          {hc && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mb-3 p-3 rounded-xl bg-card border border-border overflow-hidden">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{hc.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: hc.color }}>{hc.name}</p>
                  <p className="text-[10px] text-muted-foreground">{hc.desc}</p>
                  <div className="grid grid-cols-5 gap-2 mt-1.5 text-[9px]">
                    <div className="text-center"><p className="text-red-400 font-bold">\u2764\uFE0F {hc.baseHp}</p><p className="text-muted-foreground">Vida</p></div>
                    <div className="text-center"><p className="text-orange-400 font-bold">\u2694\uFE0F {hc.baseAtk}</p><p className="text-muted-foreground">Ataque</p></div>
                    <div className="text-center"><p className="text-blue-400 font-bold">\uD83D\uDEE1\uFE0F {hc.baseDef}</p><p className="text-muted-foreground">Defesa</p></div>
                    <div className="text-center"><p className="text-green-400 font-bold">\uD83D\uDCA8 {hc.baseSpd}</p><p className="text-muted-foreground">Veloc.</p></div>
                    <div className="text-center"><p className="text-indigo-400 font-bold">\uD83D\uDD2E {hc.baseMp}</p><p className="text-muted-foreground">Mana</p></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground mb-2 font-medium">Escolhe a tua classe:</p>
        <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 sm:gap-3">
          {CLASSES.map((c, i) => (
            <motion.button
              key={i} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
              onHoverStart={() => setHoveredClass(i)} onHoverEnd={() => setHoveredClass(null)}
              onClick={() => createCharacter(i, charNameInput)}
              className={`rounded-xl border p-2.5 sm:p-4 text-left transition-all ${hoveredClass === i ? "border-primary/60 bg-primary/5 shadow-lg" : "border-border bg-card hover:border-primary/30"}`}
            >
              <span className="text-2xl sm:text-3xl">{c.emoji}</span>
              <p className="font-bold text-xs sm:text-sm mt-0.5 sm:mt-1" style={{ color: c.color }}>{c.name}</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{c.desc}</p>
              <div className="flex gap-1 sm:gap-2 mt-1.5 sm:mt-2 text-[8px] sm:text-[9px] text-muted-foreground">
                <span>\u2764\uFE0F{c.baseHp}</span><span>\u2694\uFE0F{c.baseAtk}</span><span>\uD83D\uDEE1\uFE0F{c.baseDef}</span><span>\uD83D\uDCA8{c.baseSpd}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (!char) return null;
  const cl = CLASSES[char.classId];
  const skills = SKILLS[char.classId] || [];

  // ============================================================
  // RENDER: PVE Battle
  // ============================================================

  if (screen === "battle" && battleEnemy) {
    return (
      <div className="max-w-lg mx-auto p-4 relative">
        {/* Floating Damage Numbers */}
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
          <AnimatePresence>
            {floatingDmg.map(d => (
              <motion.div key={d.id} initial={{ opacity: 1, y: 0, scale: 1.2 }} animate={{ opacity: 0, y: -60, scale: 0.8 }} exit={{ opacity: 0 }}
                className="absolute font-black text-xl sm:text-2xl"
                style={{ left: `${d.x}%`, top: `${d.y}%`, color: d.type === "player" ? "#fbbf24" : d.type === "heal" ? "#34d399" : "#f87171", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
                {d.type === "heal" ? "+" : "-"}{d.value}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Level Up Effect */}
        <AnimatePresence>
          {levelUpEffect && (
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.5 }}
              className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-5xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent animate-pulse">LEVEL UP!</p>
                <p className="text-2xl mt-1">\u2B50 Nivel {char.level + 1} \u2B50</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loot Drop Modal */}
        <AnimatePresence>
          {showLoot && lootDrop && (
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowLoot(false)}>
              <div className={`p-5 rounded-2xl bg-card border-2 text-center max-w-xs mx-4 ${LOOT_RARITY[lootDrop.rarity]?.glow || ""}`}
                style={{ borderColor: LOOT_RARITY[lootDrop.rarity]?.color || "#9ca3af" }}
                onClick={e => e.stopPropagation()}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: LOOT_RARITY[lootDrop.rarity]?.color }}>
                  {LOOT_RARITY[lootDrop.rarity]?.label}
                </p>
                <motion.span className="text-5xl block mb-2" animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.5 }}>
                  {lootDrop.item.icon}
                </motion.span>
                <p className="font-bold text-sm" style={{ color: LOOT_RARITY[lootDrop.rarity]?.color }}>{lootDrop.item.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {lootDrop.item.atk ? `\u2694\uFE0F+${lootDrop.item.atk} ` : ""}
                  {lootDrop.item.def ? `\uD83D\uDEE1\uFE0F+${lootDrop.item.def} ` : ""}
                  {lootDrop.item.hp ? `\u2764\uFE0F+${lootDrop.item.hp} ` : ""}
                  {lootDrop.item.spd ? `\uD83D\uDCA8+${lootDrop.item.spd} ` : ""}
                  {lootDrop.item.mp ? `\uD83D\uDD2E+${lootDrop.item.mp}` : ""}
                </p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowLoot(false)}
                  className="mt-3 px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  Recolher!
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setScreen("world")} className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
          <span className="font-bold text-sm">Combate - {ZONES[char.currentZone]?.name}</span>
        </div>

        {/* Enemy */}
        <motion.div className={`text-center p-4 rounded-xl bg-card border border-border mb-3 ${battleEnemy.hp <= 0 ? "opacity-40" : ""}`} animate={battleEnemy.hp > 0 ? { x: [0, -3, 3, 0] } : {}} transition={{ duration: 0.3 }}>
          <span className="text-5xl">{battleEnemy.emoji}</span>
          <p className="font-bold text-sm mt-1" style={{ color: battleEnemy.color }}>{battleEnemy.name}</p>
          <div className="w-40 mx-auto mt-2 h-3 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
            <motion.div className="h-full rounded-full" style={{ width: `${(battleEnemy.hp / battleEnemy.maxHp) * 100}%`, backgroundColor: battleEnemy.color }}
              animate={{ width: `${(battleEnemy.hp / battleEnemy.maxHp) * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{Math.ceil(battleEnemy.hp)}/{battleEnemy.maxHp} HP</p>
        </motion.div>

        {/* Player HP/MP */}
        <div className="flex gap-3 mb-3 text-[11px]">
          <div className="flex-1 p-2 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-1"><span>\u2764\uFE0F HP</span><span>{Math.ceil(battleHp)}/{stats.maxHp}</span></div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden"><div className="h-full bg-red-500 transition-all" style={{ width: `${(battleHp / stats.maxHp) * 100}%` }} /></div>
          </div>
          <div className="flex-1 p-2 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-1"><span>\uD83D\uDD2E MP</span><span>{Math.ceil(battleMp)}/{stats.maxMp}</span></div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden"><div className="h-full bg-indigo-500 transition-all" style={{ width: `${(battleMp / stats.maxMp) * 100}%` }} /></div>
          </div>
        </div>

        {/* Actions */}
        {!battleOver && (
          <div className="space-y-2">
            <motion.button whileTap={{ scale: 0.95 }} disabled={!isPlayerTurn} onClick={pveAttack}
              className="w-full py-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-bold disabled:opacity-30">
              \u2694\uFE0F Ataque Basico
            </motion.button>
            <div className="flex gap-2">
              {skills.map((sk, i) => (
                <motion.button key={i} whileTap={{ scale: 0.95 }} disabled={!isPlayerTurn || battleMp < sk.mpCost} onClick={() => pveSkill(i)}
                  className="flex-1 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold disabled:opacity-30">
                  {sk.emoji} {sk.name} ({sk.mpCost})
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {battleOver && (
          <div className="text-center p-4 rounded-xl bg-card border border-border">
            <span className="text-4xl">{battleWon ? "\uD83C\uDFC6" : "\uD83D\uDC80"}</span>
            <p className="font-bold mt-2">{battleWon ? "Vitoria!" : "Derrotado!"}</p>
            {battleWon && <p className="text-xs text-muted-foreground">+{battleEnemy.xpReward} XP  +{battleEnemy.goldReward} \uD83D\uDCB0</p>}
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setScreen("world")}
              className="mt-3 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              Voltar
            </motion.button>
          </div>
        )}

        {/* Battle Log */}
        <div className="h-20 overflow-y-auto rounded-lg bg-card/50 border border-border p-2 mt-3 text-[11px] text-muted-foreground space-y-0.5">
          {battleLog.map((l, i) => <p key={i}>{l}</p>)}
          <div ref={battleLogRef} />
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: PVP Battle
  // ============================================================

  if (screen === "pvpBattle" && pvpOpponent) {
    const oppClass = CLASSES[pvpOpponent.classId];
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setScreen("world")} className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
          <span className="font-bold text-sm">\u2694\uFE0F Duelo PVP</span>
          <span className="ml-auto text-xs text-yellow-400 font-bold">Aposta: {pvpStake} \uD83D\uDCB0</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Player side */}
          <div className="text-center p-3 rounded-xl bg-card border border-primary/20">
            <span className="text-3xl">{cl.emoji}</span>
            <p className="font-bold text-xs mt-1" style={{ color: cl.color }}>{char.name}</p>
            <p className="text-[10px] text-muted-foreground">Nv.{char.level}</p>
            <div className="w-full mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(pvpHp / stats.maxHp) * 100}%` }} />
            </div>
            <p className="text-[10px] mt-0.5">{Math.ceil(pvpHp)}/{stats.maxHp}</p>
          </div>
          {/* Opponent side */}
          <div className="text-center p-3 rounded-xl bg-card border border-red-500/20">
            <span className="text-3xl">{oppClass.emoji}</span>
            <p className="font-bold text-xs mt-1" style={{ color: oppClass.color }}>{pvpOpponent.name}</p>
            <p className="text-[10px] text-muted-foreground">Nv.{pvpOpponent.level}</p>
            <div className="w-full mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full bg-red-500 transition-all" style={{ width: `${(pvpEnemyHp / (oppClass.baseHp + pvpOpponent.level * 12 + 50)) * 100}%` }} />
            </div>
            <p className="text-[10px] mt-0.5">{Math.ceil(pvpEnemyHp)}</p>
          </div>
        </div>

        {!pvpOver ? (
          <motion.button whileTap={{ scale: 0.95 }} disabled={!pvpTurn} onClick={pvpAttack}
            className="w-full py-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-bold disabled:opacity-30">
            \u2694\uFE0F Atacar!
          </motion.button>
        ) : (
          <div className="text-center p-4 rounded-xl bg-card border border-border">
            <span className="text-5xl">{pvpWon ? "\uD83C\uDFC6" : "\uD83D\uDC80"}</span>
            <p className="font-bold text-lg mt-2">{pvpWon ? "Venceste!" : "Perdeste!"}</p>
            <p className="text-sm text-yellow-400">{pvpWon ? `+${pvpStake} \uD83D\uDCB0` : `-${pvpStake} \uD83D\uDCB0`}</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setScreen("world")}
              className="mt-3 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              Continuar
            </motion.button>
          </div>
        )}

        <div className="h-20 overflow-y-auto rounded-lg bg-card/50 border border-border p-2 mt-3 text-[11px] text-muted-foreground space-y-0.5">
          {pvpLog.map((l, i) => <p key={i}>{l}</p>)}
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: World Hub
  // ============================================================

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "map", label: "Mundo", icon: MapIcon },
    { id: "arena", label: "Arena", icon: Swords },
    { id: "quests", label: "Quests", icon: Star, badge: quests.filter(q => !q.completed).length },
    { id: "shop", label: "Loja", icon: ShoppingBag },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "rank", label: "Ranking", icon: Trophy },
    { id: "economy", label: "Economia", icon: Coins },
    { id: "profile", label: "Perfil", icon: Shield },
    { id: "market", label: "Mercado", icon: TrendingUp },
  ];

  return (
    <div className="max-w-lg mx-auto">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-card border border-primary/30 text-sm font-medium shadow-lg">
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="px-3 pt-2 pb-2 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-xl sm:text-2xl">{cl.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm truncate" style={{ color: cl.color }}>{char.name}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">Nv.{char.level}</span>
              {onlinePlayers.length > 0 && <span className="flex items-center gap-0.5 text-[10px] text-green-400"><Users className="h-3 w-3" />{onlinePlayers.length}</span>}
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span>\u2B50{char.totalKills} abates</span>
              <span>\uD83C\uDFC6{char.duelsWon}W</span>
              <span>\uD83D\uDCB5{char.duelsLost}L</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-yellow-400">{char.gold} \uD83D\uDCB0</p>
            <div className="w-20 h-1.5 rounded-full bg-gray-800 overflow-hidden mt-0.5">
              <motion.div className="h-full bg-blue-400 rounded-full" animate={{ width: `${(char.xp / xpForLevel(char.level)) * 100}%` }} transition={{ duration: 0.5 }} />
            </div>
            <p className="text-[9px] text-muted-foreground">{char.xp}/{xpForLevel(char.level)} XP</p>
          </div>
        </div>

        {/* Daily Reward */}
        {!dailyCollected && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={collectDaily}
            className="w-full py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold mb-1.5">
            \uD83C\uDF81 Recompensa Diaria - Clica para reclamar!
          </motion.button>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all relative ${
                tab === t.id ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:bg-muted"
              }`}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
              {t.badge && t.badge > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[8px] font-black text-white flex items-center justify-center">{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-3 min-h-[60vh]">
        {/* Event Bonus Banner */}
        {eventBonus && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-3 p-2 rounded-lg bg-gradient-to-r from-yellow-500/15 to-amber-500/15 border border-yellow-500/30 text-center">
            <p className="text-xs font-bold text-yellow-400">{eventBonus.label}</p>
          </motion.div>
        )}

        {/* ---- MAP TAB ---- */}
        {tab === "map" && (
          <div className="space-y-3">
            {/* Auto-Grind Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="flex-1">
                <p className="text-xs font-bold">\uD83E\uDD16 Auto-Grind {autoGrind && "\u2705"}</p>
                <p className="text-[10px] text-muted-foreground">Luta automatica na zona actual</p>
                {autoGrind && <p className="text-[10px] text-green-400 mt-0.5">{grindStats.kills} kills | +{grindStats.gold}\uD83D\uDCB0 | +{grindStats.xp}XP | {grindStats.deaths} mortes</p>}
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setAutoGrind(!autoGrind); if (!autoGrind) { setGrindStats({ kills: 0, gold: 0, xp: 0, deaths: 0 }); setGrindLog([]); } }}
                className={`px-4 py-2 rounded-lg text-xs font-bold ${autoGrind ? "bg-red-500/15 border border-red-500/30 text-red-400" : "bg-green-500/15 border border-green-500/30 text-green-400"}`}>
                {autoGrind ? "Parar" : "Iniciar"}
              </motion.button>
            </div>

            {/* Grind Log */}
            {autoGrind && (
              <div className="h-24 overflow-y-auto rounded-lg bg-card/50 border border-border p-2 text-[10px] text-muted-foreground space-y-0.5">
                {grindLog.length === 0 && <p className="text-center py-4 opacity-50">A iniciar auto-grind...</p>}
                {grindLog.map((l, i) => <p key={i}>{l}</p>)}
                <div ref={grindLogRef} />
              </div>
            )}

            {/* World Boss */}
            {worldBoss?.isActive && (
              <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity }}
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Skull className="h-4 w-4 text-red-400" />
                  <span className="font-bold text-sm text-red-400">BOSS MUNDIAL</span>
                  <span className="ml-auto text-[10px] text-yellow-400">Recompensa: {worldBoss.rewardsPool} \uD83D\uDCB0</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{worldBoss.emoji}</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold">{worldBoss.name}</p>
                    <div className="w-full h-2.5 rounded-full bg-gray-800 overflow-hidden mt-1">
                      <div className="h-full bg-red-500 transition-all" style={{ width: `${(worldBoss.hp / worldBoss.maxHp) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{Math.ceil(worldBoss.hp)}/{worldBoss.maxHp} | {Math.floor(bossTimer / 60)}:{String(bossTimer % 60).padStart(2, '0')}</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={attackBoss}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold">
                    Atacar!
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Zone selection */}
            {ZONES.map((zone, zi) => {
              const unlocked = char.level >= zone.minLevel;
              const isCurrent = zi === char.currentZone;
              return (
                <div key={zi}>
                  <div className={`flex items-center gap-2 mb-2 ${unlocked ? "" : "opacity-40"}`}>
                    <span className="text-lg">{zone.emoji}</span>
                    <span className="font-bold text-xs" style={{ color: zone.color }}>{zone.name}</span>
                    {!unlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                    <span className="ml-auto text-[10px] text-muted-foreground">Nv.{zone.minLevel}+</span>
                    <button onClick={() => unlocked && updateChar(c => ({ ...c, currentZone: zi }))}
                      className={`text-[10px] px-2 py-0.5 rounded-full ${isCurrent ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                      {isCurrent ? "Aqui" : "Ir"}
                    </button>
                  </div>
                  {unlocked && isCurrent && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {zone.enemies.map((enemy, ei) => (
                        <motion.button key={ei} whileTap={{ scale: 0.95 }} onClick={() => startPVE(zi, ei)}
                          className="p-2.5 rounded-xl bg-card border border-border hover:border-primary/40 text-center transition-all">
                          <span className="text-2xl">{enemy.emoji}</span>
                          <p className="text-[10px] font-medium mt-1 truncate">{enemy.name}</p>
                          <p className="text-[9px] text-muted-foreground">+{enemy.xp}XP +{enemy.gold}\uD83D\uDCB0</p>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ---- QUESTS TAB ---- */}
        {tab === "quests" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-amber-400" />
              <span className="font-bold text-sm">Missoes Diarias</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{quests.filter(q => q.completed).length}/{quests.length} completas</span>
            </div>

            {/* Quest Progress Bar */}
            <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                animate={{ width: `${(quests.filter(q => q.completed).length / Math.max(1, quests.length)) * 100}%` }} />
            </div>

            {quests.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">A carregar missoes...</p>}

            {quests.map((q, i) => (
              <motion.div key={q.id} whileTap={{ scale: 0.98 }}
                className={`p-3 rounded-xl border transition-all ${q.completed ? "bg-green-500/5 border-green-500/20" : "bg-card border-border"}`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{q.completed ? "\u2705" : q.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${q.completed ? "text-green-400" : ""}`}>{q.name}</p>
                    <p className="text-[10px] text-muted-foreground">{q.desc}</p>
                    <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden mt-1.5">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: q.completed ? "#22c55e" : "#f59e0b" }}
                        animate={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }} />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{q.progress}/{q.target} • Recompensa: {q.reward} {q.rewardType === "gold" ? "\uD83D\uDCB0" : "XP"}</p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Achievements Section */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-4 w-4 text-amber-400" />
                <span className="font-bold text-sm">Conquistas</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{achievements.filter(a => a.unlocked).length}/{achievements.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {achievements.map((a, i) => (
                  <div key={a.id} className={`p-2 rounded-lg border text-center transition-all ${a.unlocked ? "bg-amber-500/10 border-amber-500/30" : "bg-card/50 border-border opacity-50"}`}>
                    <span className="text-lg">{a.unlocked ? a.emoji : "\uD83D\uDD12"}</span>
                    <p className="text-[9px] font-bold mt-0.5">{a.name}</p>
                    <p className="text-[8px] text-muted-foreground">{a.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---- ARENA TAB ---- */}
        {tab === "arena" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Swords className="h-4 w-4 text-red-400" />
              <span className="font-bold text-sm">Arena PVP</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{onlinePlayers.length} jogadores online</span>
            </div>

            {/* Challenge specific player */}
            {selectedOpponent ? (
              <div className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{CLASSES[selectedOpponent.classId].emoji}</span>
                  <div>
                    <p className="font-bold text-sm" style={{ color: CLASSES[selectedOpponent.classId].color }}>{selectedOpponent.name}</p>
                    <p className="text-[10px] text-muted-foreground">Nv.{selectedOpponent.level} | {selectedOpponent.gold} \uD83D\uDCB0</p>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-[10px] text-muted-foreground block mb-1">Aposta (\uD83D\uDCB0):</label>
                  <input type="number" value={stakeInput} onChange={e => setStakeInput(e.target.value)}
                    placeholder="100" min="1" max={char.gold}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
                </div>
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => { const s = parseInt(stakeInput) || 0; challengePlayer(selectedOpponent, s); setSelectedOpponent(null); }}
                    className="flex-1 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-bold">
                    \u2694\uFE0F Desafiar!
                  </motion.button>
                  <button onClick={() => setSelectedOpponent(null)} className="px-4 py-2 rounded-lg bg-muted text-sm">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-muted-foreground mb-2">Seleciona um jogador para desafiar. O vencedor fica com a aposta!</p>
                <div className="space-y-2">
                  {onlinePlayers.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Nenhum jogador online agora</p>
                      <p className="text-[10px] text-muted-foreground/60">Convida amigos para jogar!</p>
                    </div>
                  )}
                  {onlinePlayers.map(p => (
                    <motion.button key={p.charId} whileTap={{ scale: 0.98 }} onClick={() => setSelectedOpponent(p)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                      <span className="text-xl">{CLASSES[p.classId].emoji}</span>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold" style={{ color: CLASSES[p.classId].color }}>{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">Nv.{p.level} | {ZONES[p.zone]?.emoji || "\uD83C\uDF0D"} {ZONES[p.zone]?.name || "Desconhecido"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-yellow-400">{p.gold} \uD83D\uDCB0</p>
                        <div className="w-2 h-2 rounded-full bg-green-400 ml-auto mt-1" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </>
            )}

            {/* Quick PVP (random opponent) */}
            {onlinePlayers.length > 0 && !selectedOpponent && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => {
                const random = onlinePlayers[Math.floor(Math.random() * onlinePlayers.length)];
                const stake = Math.min(50, char.gold);
                if (stake > 0) challengePlayer(random, stake);
              }} className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 text-sm font-bold">
                \uD83C\uDFB2 Duelo Rapido (50 \uD83D\uDCB0)
              </motion.button>
            )}
          </div>
        )}

        {/* ---- ECONOMY TAB ---- */}
        {tab === "economy" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-400" />
              <span className="font-bold text-sm">Economia P2P</span>
            </div>

            {/* Balance */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 text-center">
              <p className="text-[10px] text-muted-foreground">Teu saldo</p>
              <p className="text-2xl font-bold text-yellow-400">{char.gold} <span className="text-sm">\uD83D\uDCB0</span></p>
              <p className="text-[10px] text-muted-foreground mt-1">Ganho total: {char.totalEarned} \uD83D\uDCB0</p>
            </div>

            {/* P2P Transfer */}
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-xs font-bold mb-2">\uD83D\uDCE8 Enviar Ouro (P2P)</p>
              <div className="space-y-2">
                <select value={transferTarget} onChange={e => setTransferTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm">
                  <option value="">Seleciona jogador...</option>
                  {onlinePlayers.map(p => (
                    <option key={p.charId} value={`${p.charId}|${p.name}`}>{CLASSES[p.classId].emoji} {p.name} (Nv.{p.level})</option>
                  ))}
                </select>
                <input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)}
                  placeholder="Quantidade" min="1" max={char.gold}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
                <motion.button whileTap={{ scale: 0.95 }}
                  disabled={!transferTarget || !transferAmount || parseInt(transferAmount) <= 0}
                  onClick={() => {
                    const [tid, tname] = transferTarget.split("|");
                    sendGold(tid, tname, parseInt(transferAmount));
                    setTransferTarget(""); setTransferAmount("");
                  }}
                  className="w-full py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-bold disabled:opacity-30">
                  Enviar \uD83D\uDCE8
                </motion.button>
              </div>
            </div>

            {/* Economy info */}
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-xs font-bold mb-2">\uD83D\uDCCA Como ganhar ouro</p>
              <div className="space-y-1.5 text-[11px] text-muted-foreground">
                <p>\u2694\uFE0F <b>Derrota monstros</b> nos mapas - ganha XP e ouro</p>
                <p>\uD83C\uDFC6 <b> Duelos PVP</b> - aposta ouro, vence e fica com tudo</p>
                <p>\uD83D\uDCB0 <b>Recompensa diaria</b> - clica todos os dias</p>
                <p>\uD83E\uDDD1\u200D\uD83E\uDD1D <b>Transferencias P2P</b> - envia e recebe de outros jogadores</p>
                <p>\uD83C\uDF81 <b>World Boss</b> - contribui para derrotar e ganha recompensas</p>
              </div>
            </div>
          </div>
        )}

        {/* ---- SHOP TAB ---- */}
        {tab === "shop" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-yellow-400" />
                <span className="font-bold text-sm">Loja</span>
              </div>
              <span className="text-sm font-bold text-yellow-400">{char.gold} \uD83D\uDCB0</span>
            </div>

            {/* Current equipment */}
            <div className="flex gap-2">
              {char.equipment.map((eq, i) => (
                <div key={i} className="flex-1 p-2 rounded-lg bg-primary/5 border border-primary/20 text-center">
                  <p className="text-[9px] text-muted-foreground">{["Arma", "Armadura", "Acessorio"][i]}</p>
                  {eq ? <><span className="text-lg">{eq.icon}</span><p className="text-[9px] font-medium truncate">{eq.name}</p></> : <span className="text-xs text-muted-foreground">Vazio</span>}
                </div>
              ))}
            </div>

            {/* Items for sale */}
            {SHOP_ITEMS.map(item => {
              const owned = char.inventory.some(i => i.id === item.id) || char.equipment.some(e => e?.id === item.id);
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.atk ? `\u2694\uFE0F+${item.atk} ` : ""}{item.def ? `\uD83D\uDEE1\uFE0F+${item.def} ` : ""}{item.spd ? `\uD83D\uDCA8+${item.spd} ` : ""}{item.hp ? `\u2764\uFE0F+${item.hp} ` : ""}{item.mp ? `\uD83D\uDD2E+${item.mp}` : ""}
                    </p>
                  </div>
                  <motion.button whileTap={{ scale: 0.9 }} disabled={owned || char.gold < item.price} onClick={() => buyItem(item)}
                    className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold disabled:opacity-30">
                    {owned ? "\u2705" : `${item.price} \uD83D\uDCB0`}
                  </motion.button>
                </div>
              );
            })}

            {/* Inventory */}
            {char.inventory.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold mb-2">\uD83D\uDCBC Mochila ({char.inventory.length})</p>
                <div className="space-y-2">
                  {char.inventory.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-card border border-border">
                      <span className="text-xl">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <p className="text-[9px] text-muted-foreground">{item.atk ? `\u2694\uFE0F+${item.atk} ` : ""}{item.def ? `\uD83D\uDEE1\uFE0F+${item.def} ` : ""}{item.hp ? `\u2764\uFE0F+${item.hp}` : ""}</p>
                      </div>
                      <button onClick={() => equipItem(i)} className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-[10px] font-bold">Equipar</button>
                      <button onClick={() => sellItem(i)} className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-[10px] font-bold">Vender</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- CHAT TAB ---- */}
        {tab === "chat" && (
          <div className="flex flex-col h-[55vh]">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="h-4 w-4 text-blue-400" />
              <span className="font-bold text-sm">Chat Global</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{onlinePlayers.length + 1} online</span>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl bg-card border border-border p-3 space-y-2">
              {chatMessages.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Nenhuma mensagem ainda. Sê o primeiro!</p>}
              {chatMessages.map(msg => {
                const isMe = msg.charName === char.name;
                return (
                  <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    <span className="text-lg flex-shrink-0">{CLASSES[msg.classId]?.emoji || "\uD83D\uDC64"}</span>
                    <div className={`max-w-[75%] ${isMe ? "text-right" : ""}`}>
                      <p className="text-[10px] font-bold" style={{ color: CLASSES[msg.classId]?.color }}>{msg.charName}</p>
                      <p className="text-xs bg-muted rounded-lg px-2.5 py-1.5 inline-block text-left">{msg.message}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">{timeAgo(msg.time)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2 mt-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Mensagem..." maxLength={200}
                className="flex-1 px-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:border-primary" />
              <motion.button whileTap={{ scale: 0.9 }} onClick={sendChat} disabled={!chatInput.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-30">
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        )}

        {/* ---- RANK TAB ---- */}
        {tab === "rank" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="font-bold text-sm">Ranking Global</span>
            </div>

            {/* Build ranking from online + leaderboard data */}
            {[...leaderboard, ...onlinePlayers.map(p => ({ charId: p.charId, name: p.name, classId: p.classId, level: p.level, gold: p.gold, kills: 0, wins: 0 }))]
              .reduce((acc, entry) => { if (!acc.find(e => e.charId === entry.charId)) acc.push(entry); return acc; }, [] as LeaderboardEntry[])
              .sort((a, b) => b.level - a.level || b.gold - a.gold)
              .slice(0, 20)
              .map((entry, i) => {
                const isMe = entry.charId === guestId || entry.name === char.name;
                return (
                  <div key={entry.charId + i} className={`flex items-center gap-3 p-2.5 rounded-xl ${isMe ? "bg-primary/5 border border-primary/20" : "bg-card border border-border"}`}>
                    <span className={`w-6 text-center font-bold text-sm ${i < 3 ? "text-yellow-400" : "text-muted-foreground"}`}>{i < 3 ? ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"][i] : i + 1}</span>
                    <span className="text-xl">{CLASSES[entry.classId]?.emoji || "\uD83D\uDC64"}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: isMe ? cl.color : CLASSES[entry.classId]?.color }}>{entry.name} {isMe && "(tu)"}</p>
                    </div>
                    <div className="text-right text-[10px]">
                      <p className="font-bold">Nv.{entry.level}</p>
                      <p className="text-muted-foreground">{entry.gold} \uD83D\uDCB0</p>
                    </div>
                  </div>
                );
              })}

            {leaderboard.length === 0 && onlinePlayers.length === 0 && (
              <div className="text-center py-8">
                <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nenhum jogador no ranking ainda</p>
              </div>
            )}
          </div>
        )}

        {/* ---- PROFILE TAB ---- */}
        {tab === "profile" && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{cl.emoji}</span>
              <p className="font-bold text-lg mt-2" style={{ color: cl.color }}>{char.name}</p>
              <p className="text-xs text-muted-foreground">{cl.name} - Nivel {char.level}</p>
              <p className="text-[10px] text-muted-foreground">XP: {char.xp}/{xpForLevel(char.level)}</p>
              <div className="w-40 mx-auto mt-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${(char.xp / xpForLevel(char.level)) * 100}%` }} />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-card border border-border text-center">
                <p className="text-[10px] text-muted-foreground">\u2764\uFE0F HP</p>
                <p className="font-bold text-sm text-red-400">{stats.maxHp}</p>
              </div>
              <div className="p-2 rounded-lg bg-card border border-border text-center">
                <p className="text-[10px] text-muted-foreground">\u2694\uFE0F ATK</p>
                <p className="font-bold text-sm text-orange-400">{stats.atk}</p>
              </div>
              <div className="p-2 rounded-lg bg-card border border-border text-center">
                <p className="text-[10px] text-muted-foreground">\uD83D\uDEE1\uFE0F DEF</p>
                <p className="font-bold text-sm text-blue-400">{stats.def}</p>
              </div>
              <div className="p-2 rounded-lg bg-card border border-border text-center">
                <p className="text-[10px] text-muted-foreground">\uD83D\uDCA8 SPD</p>
                <p className="font-bold text-sm text-green-400">{stats.spd}</p>
              </div>
              <div className="p-2 rounded-lg bg-card border border-border text-center">
                <p className="text-[10px] text-muted-foreground">\uD83D\uDD2E MP</p>
                <p className="font-bold text-sm text-indigo-400">{stats.maxMp}</p>
              </div>
              <div className="p-2 rounded-lg bg-card border border-border text-center">
                <p className="text-[10px] text-muted-foreground">\uD83D\uDCB0 Gold</p>
                <p className="font-bold text-sm text-yellow-400">{char.gold}</p>
              </div>
            </div>

            {/* Record */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-card border border-border">
                <p className="text-[10px] text-muted-foreground">Vitorias PVP</p>
                <p className="text-xl font-bold text-green-400">{char.duelsWon}</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <p className="text-[10px] text-muted-foreground">Derrotas PVP</p>
                <p className="text-xl font-bold text-red-400">{char.duelsLost}</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <p className="text-[10px] text-muted-foreground">Monstros Mortos</p>
                <p className="text-xl font-bold text-orange-400">{char.totalKills}</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <p className="text-[10px] text-muted-foreground">Ganho Total</p>
                <p className="text-xl font-bold text-yellow-400">{char.totalEarned}</p>
              </div>
            </div>

            {/* Equipment detail */}
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-xs font-bold mb-2">Equipamento</p>
              <div className="space-y-2">
                {char.equipment.map((eq, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">{["Arma", "Armadura", "Acessorio"][i]}</span>
                    {eq ? <><span className="text-lg">{eq.icon}</span><span className="text-xs font-medium">{eq.name}</span></> : <span className="text-xs text-muted-foreground">--</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={deleteCharacter}
                className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                Apagar Personagem
              </motion.button>
            </div>
          </div>
        )}

        {/* ---- MARKET TAB ---- */}
        {tab === "market" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="font-bold text-sm">Mercado P2P</span>
              <span className="ml-auto text-sm font-bold text-yellow-400">{char.gold} \uD83D\uDCB0</span>
            </div>

            {/* Sell item */}
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-xs font-bold mb-2">\uD83D\uDCE8 Vender Item</p>
              <div className="space-y-2">
                <select value={marketSellItem} onChange={e => setMarketSellItem(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm">
                  <option value="">Seleciona item da mochila...</option>
                  {char.inventory.map((item, i) => (
                    <option key={i} value={`${i}`}>{item.icon} {item.name}</option>
                  ))}
                </select>
                <input type="number" value={marketSellPrice} onChange={e => setMarketSellPrice(e.target.value)}
                  placeholder="Preco" min="1"
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
                <motion.button whileTap={{ scale: 0.95 }}
                  disabled={!marketSellItem || !marketSellPrice || parseInt(marketSellPrice) <= 0}
                  onClick={() => {
                    const idx = parseInt(marketSellItem);
                    const item = char.inventory[idx];
                    if (!item) return;
                    const price = parseInt(marketSellPrice);
                    const listing = { id: genId(), sellerId: guestId, sellerName: char.name, item: { ...item }, price, time: new Date().toISOString() };
                    setMarketListings(prev => [...prev, listing]);
                    updateChar(c => { const inv = [...c.inventory]; inv.splice(idx, 1); return { ...c, inventory: inv }; });
                    setMarketSellItem(""); setMarketSellPrice("");
                    notify(`Item listado por ${price} \uD83D\uDCB0`);
                  }}
                  className="w-full py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-bold disabled:opacity-30">
                  Listar no Mercado
                </motion.button>
              </div>
            </div>

            {/* Listings */}
            <p className="text-xs font-bold">\uD83D\uDCCA Itens a Venda ({marketListings.length})</p>
            {marketListings.length === 0 && (
              <div className="text-center py-8">
                <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nenhum item listado ainda</p>
                <p className="text-[10px] text-muted-foreground/60">Vende itens da tua mochila!</p>
              </div>
            )}
            <div className="space-y-2">
              {marketListings.map(listing => (
                <div key={listing.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  <span className="text-2xl">{listing.item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{listing.item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {listing.item.atk ? `\u2694\uFE0F+${listing.item.atk} ` : ""}{listing.item.def ? `\uD83D\uDEE1\uFE0F+${listing.item.def} ` : ""}{listing.item.hp ? `\u2764\uFE0F+${listing.item.hp}` : ""}
                    </p>
                    <p className="text-[9px] text-muted-foreground">por {listing.sellerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-400">{listing.price} \uD83D\uDCB0</p>
                    {listing.sellerId !== guestId ? (
                      <motion.button whileTap={{ scale: 0.9 }}
                        disabled={char.gold < listing.price}
                        onClick={() => {
                          updateChar(c => ({ ...c, gold: c.gold - listing.price, inventory: [...c.inventory, { ...listing.item }] }));
                          setMarketListings(prev => prev.filter(l => l.id !== listing.id));
                          notify(`\u2705 Compraste ${listing.item.name}!`);
                          dbSendTransfer(guestId, char!.name, listing.sellerId, listing.sellerName, listing.price, `Mercado: ${listing.item.name}`);
                        }}
                        className="mt-1 px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold disabled:opacity-30">
                        Comprar
                      </motion.button>
                    ) : (
                      <button onClick={() => {
                        updateChar(c => ({ ...c, inventory: [...c.inventory, { ...listing.item }] }));
                        setMarketListings(prev => prev.filter(l => l.id !== listing.id));
                        notify("Item cancelado do mercado");
                      }} className="mt-1 px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold">
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
