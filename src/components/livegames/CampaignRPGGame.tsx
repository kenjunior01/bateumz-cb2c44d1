// ============================================================
// CampaignRPGGame.tsx – EPIC Campaign RPG (Canvas Combat Engine)
// All UI text in Portuguese (pt-BR)
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, VolumeX, Maximize2, Lock, Star, Shield,
  Sword, ChevronRight, RotateCcw, ShoppingBag, Backpack,
  Swords, Trophy, Heart, Zap, Wind, X, Coins, Crown
} from 'lucide-react';
import { useSoundEffects } from '@/hooks/useSoundEffects';

// ===================== TYPES =====================
type GameScreen =
  | 'menu' | 'classSelect' | 'campaignMap' | 'combat'
  | 'inventory' | 'shop' | 'pvp' | 'victory'
  | 'defeat' | 'bossIntro' | 'levelUp';

type Element = 'fire' | 'lightning' | 'poison' | 'shadow' | 'holy';
type AttackPattern = 'melee' | 'ranged' | 'charge' | 'summon' | 'aoe';
type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
type EquipSlot = 'weapon' | 'armor' | 'accessory';

interface CharClass {
  id: string; name: string; emoji: string; color: string;
  element: Element; baseHP: number; baseATK: number;
  baseDEF: number; baseSPD: number;
  abilityName: string; abilityDesc: string;
  abilityCooldown: number;
  passiveDesc: string;
}

interface Equipment {
  id: string; name: string; type: EquipSlot; rarity: Rarity;
  atk: number; def: number; hp: number; spd: number;
  element?: Element; special?: string; sellPrice: number;
}

interface EnemyDef {
  name: string; emoji: string; hp: number; atk: number;
  def: number; spd: number; color: string;
  attackPattern: AttackPattern; size: number;
  isBoss?: boolean; abilities?: string[];
  xpReward: number; goldReward: number;
}

interface LevelDef {
  enemy: EnemyDef;
  reward: Equipment | null;
  starThresholds: number[];
}

interface WorldDef {
  id: string; name: string; emoji: string;
  bgColor1: string; bgColor2: string; accentColor: string;
  unlockRequirement: string; description: string;
  levels: LevelDef[];
}

interface ShopItem extends Equipment { buyPrice: number; }

interface PlayerData {
  classId: string; level: number; xp: number; xpToNext: number;
  gold: number; kills: number; pvpWins: number;
  equipment: (Equipment | null)[];
  inventory: Equipment[];
  completedLevels: Record<string, number>;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  type: 'circle' | 'spark' | 'ring' | 'text' | 'star';
  text?: string; gravity?: number; shrink?: boolean;
}

interface Projectile {
  x: number; y: number; vx: number; vy: number;
  damage: number; isPlayer: boolean; color: string;
  trail: { x: number; y: number }[]; size: number;
}

interface Summon {
  x: number; y: number; hp: number; atk: number;
  cooldown: number; vx: number; vy: number;
}

interface CombatState {
  px: number; py: number; php: number; pmaxhp: number;
  patk: number; pdef: number; pspd: number;
  pvx: number; pvy: number; pAtkCD: number; pAbilCD: number;
  pHurt: number; pAtkAnim: number; pFaceR: boolean; pBob: number;
  pCritNext: boolean; pFuryNext: boolean;
  ex: number; ey: number; ehp: number; emaxhp: number;
  eatk: number; edef: number; espd: number;
  eHurt: number; eAtkAnim: number; eAtkCD: number;
  eFaceR: boolean; eCharging: boolean; eChargeTimer: number;
  eChargeVX: number; eChargeVY: number; ePause: number;
  eSummonCD: number; eAoeCD: number;
  projectiles: Projectile[]; particles: Particle[]; summons: Summon[];
  ambient: { x: number; y: number; vy: number; size: number; alpha: number }[];
  keys: Set<string>; frame: number; time: number;
  shake: number; shakeI: number;
  worldIdx: number; levelIdx: number;
  won: boolean; lost: boolean;
}

interface BattleResult {
  stars: number; time: number; score: number;
  reward: Equipment | null; xp: number; gold: number;
  leveledUp: boolean; newLevel: number;
}

// ===================== CONSTANTS =====================
const SAVE_KEY = 'campaignRPGSave';

const RARITY_COLORS: Record<Rarity, string> = {
  common: '#95a5a6', rare: '#3498db', epic: '#9b59b6', legendary: '#f1c40f',
};
const RARITY_NAMES: Record<Rarity, string> = {
  common: 'Comum', rare: 'Raro', epic: 'Épico', legendary: 'Lendário',
};

const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#e74c3c', lightning: '#f1c40f', poison: '#2ecc71',
  shadow: '#8e44ad', holy: '#f39c12',
};

const CLASSES: CharClass[] = [
  {
    id: 'guerreiro', name: 'Guerreiro', emoji: '⚔️', color: '#e74c3c', element: 'fire',
    baseHP: 180, baseATK: 14, baseDEF: 10, baseSPD: 3,
    abilityName: 'Fúria do Leão', abilityDesc: '3x de dano no próximo ataque corpo a corpo',
    abilityCooldown: 600,
    passiveDesc: '15% de redução de dano recebido',
  },
  {
    id: 'mago', name: 'Mago', emoji: '🔮', color: '#9b59b6', element: 'lightning',
    baseHP: 100, baseATK: 20, baseDEF: 5, baseSPD: 3.5,
    abilityName: 'Meteoro Arcano', abilityDesc: '8 projéteis de área atingem o inimigo',
    abilityCooldown: 720,
    passiveDesc: '20% mais dano de habilidade',
  },
  {
    id: 'arqueiro', name: 'Arqueiro', emoji: '🏹', color: '#2ecc71', element: 'poison',
    baseHP: 120, baseATK: 16, baseDEF: 6, baseSPD: 5,
    abilityName: 'Chuva de Flechas', abilityDesc: '12 flechas são disparadas em leque',
    abilityCooldown: 480,
    passiveDesc: '25% chance de crítico, 50% mais dano crítico',
  },
  {
    id: 'ladino', name: 'Ladino', emoji: '🥷', color: '#3498db', element: 'shadow',
    baseHP: 110, baseATK: 18, baseDEF: 5, baseSPD: 5.5,
    abilityName: 'Sombra Mortal', abilityDesc: 'Teleporta atrás do inimigo com crítico garantido',
    abilityCooldown: 420,
    passiveDesc: '20% de chance de esquivar ataques',
  },
  {
    id: 'paladino', name: 'Paladino', emoji: '🛡', color: '#f39c12', element: 'holy',
    baseHP: 150, baseATK: 15, baseDEF: 12, baseSPD: 3,
    abilityName: 'Julgamento Divino', abilityDesc: 'Dano massivo + cura 20% do HP máximo',
    abilityCooldown: 660,
    passiveDesc: 'Regenera 2 HP por segundo',
  },
  {
    id: 'necromante', name: 'Necromante', emoji: '👻', color: '#1abc9c', element: 'shadow',
    baseHP: 110, baseATK: 17, baseDEF: 5, baseSPD: 3.5,
    abilityName: 'Invocação Negra', abilityDesc: 'Invoca 3 esqueletos que atacam o inimigo',
    abilityCooldown: 900,
    passiveDesc: '15% de roubo de vida',
  },
];

// --- Equipment reward templates ---
const eq = (id: string, name: string, type: EquipSlot, rarity: Rarity, atk: number, def: number, hp: number, spd: number, sellPrice: number, element?: Element): Equipment =>
  ({ id, name, type, rarity, atk, def, hp, spd, sellPrice, element });

// --- WORLDS (5 worlds, 5 levels each = 25 levels) ---
const WORLDS: WorldDef[] = [
  {
    id: 'floresta', name: 'Floresta Sombria', emoji: '🌲',
    bgColor1: '#0a1a0a', bgColor2: '#1a2f1a', accentColor: '#2ecc71',
    unlockRequirement: '',
    description: 'Uma floresta escura cheia de criaturas perigosas.',
    levels: [
      {
        enemy: { name: 'Lobo', emoji: '🐺', hp: 60, atk: 8, def: 3, spd: 2, color: '#8B7355', attackPattern: 'melee', size: 1.0, xpReward: 30, goldReward: 20 },
        reward: eq('espada_ferro', 'Espada de Ferro', 'weapon', 'common', 6, 0, 0, 0, 30),
        starThresholds: [10, 20, 35],
      },
      {
        enemy: { name: 'Aranha', emoji: '🕷️', hp: 50, atk: 10, def: 2, spd: 2.5, color: '#4A3728', attackPattern: 'ranged', size: 0.9, xpReward: 35, goldReward: 25 },
        reward: eq('armadura_couro', 'Armadura de Couro', 'armor', 'common', 0, 4, 15, 0, 30),
        starThresholds: [12, 22, 38],
      },
      {
        enemy: { name: 'Goblin', emoji: '👺', hp: 80, atk: 12, def: 5, spd: 1.8, color: '#556B2F', attackPattern: 'melee', size: 1.0, xpReward: 40, goldReward: 30 },
        reward: null,
        starThresholds: [14, 25, 40],
      },
      {
        enemy: { name: 'Cobra', emoji: '🐍', hp: 55, atk: 14, def: 3, spd: 3, color: '#2E8B57', attackPattern: 'charge', size: 0.8, xpReward: 45, goldReward: 35 },
        reward: eq('anel_floresta', 'Anel da Floresta', 'accessory', 'common', 3, 2, 5, 1, 25),
        starThresholds: [12, 20, 35],
      },
      {
        enemy: { name: 'Troll', emoji: '👹', hp: 250, atk: 18, def: 8, spd: 1.5, color: '#5C4033', attackPattern: 'aoe', size: 2.0, isBoss: true, abilities: ['Investida Brutal', 'Esmagar'], xpReward: 150, goldReward: 100 },
        reward: eq('espada_cacador', 'Espada do Caçador', 'weapon', 'rare', 12, 0, 0, 1, 80),
        starThresholds: [25, 45, 70],
      },
    ],
  },
  {
    id: 'vulcao', name: 'Vulcão Ardente', emoji: '🌋',
    bgColor1: '#1a0a0a', bgColor2: '#2f1a1a', accentColor: '#e74c3c',
    unlockRequirement: 'floresta',
    description: 'Um vulcão ativo com criaturas de fogo e pedra.',
    levels: [
      {
        enemy: { name: 'Elemental', emoji: '🔥', hp: 150, atk: 18, def: 8, spd: 2, color: '#FF4500', attackPattern: 'ranged', size: 1.1, xpReward: 70, goldReward: 50 },
        reward: eq('cajado_chama', 'Cajado Flamejante', 'weapon', 'rare', 16, 0, 5, 0, 120),
        starThresholds: [15, 28, 45],
      },
      {
        enemy: { name: 'Golem', emoji: '🪨', hp: 250, atk: 15, def: 15, spd: 1, color: '#8B4513', attackPattern: 'melee', size: 1.3, xpReward: 80, goldReward: 60 },
        reward: eq('armadura_escamas', 'Armadura de Escamas', 'armor', 'rare', 0, 10, 25, -1, 130),
        starThresholds: [18, 32, 50],
      },
      {
        enemy: { name: 'Salamandra', emoji: '🦎', hp: 120, atk: 22, def: 6, spd: 2.8, color: '#FF6347', attackPattern: 'charge', size: 1.0, xpReward: 75, goldReward: 55 },
        reward: null,
        starThresholds: [14, 25, 42],
      },
      {
        enemy: { name: 'Dragão Menor', emoji: '🐉', hp: 200, atk: 25, def: 10, spd: 1.5, color: '#B22222', attackPattern: 'ranged', size: 1.4, xpReward: 90, goldReward: 70 },
        reward: eq('amuleto_fogo', 'Amuleto de Fogo', 'accessory', 'rare', 6, 4, 10, 2, 110),
        starThresholds: [16, 30, 48],
      },
      {
        enemy: { name: 'Senhor do Vulcão', emoji: '🌋', hp: 800, atk: 35, def: 20, spd: 1.2, color: '#8B0000', attackPattern: 'aoe', size: 2.2, isBoss: true, abilities: ['Erupção', 'Chuva de Fogo'], xpReward: 400, goldReward: 250 },
        reward: eq('lamina_vulcanica', 'Lâmina Vulcânica', 'weapon', 'epic', 22, 0, 0, 2, 250),
        starThresholds: [30, 50, 80],
      },
    ],
  },
  {
    id: 'gelo', name: 'Picos Congelados', emoji: '❄️',
    bgColor1: '#0a0a1a', bgColor2: '#1a1a2f', accentColor: '#3498db',
    unlockRequirement: 'vulcao',
    description: 'Montanhas geladas com criaturas ancestrais congeladas.',
    levels: [
      {
        enemy: { name: 'Lobo do Gelo', emoji: '🐺', hp: 300, atk: 28, def: 15, spd: 2.5, color: '#B0C4DE', attackPattern: 'melee', size: 1.2, xpReward: 140, goldReward: 100 },
        reward: eq('arco_gelo', 'Arco de Gelo', 'weapon', 'rare', 18, 0, 0, 3, 150),
        starThresholds: [18, 32, 50],
      },
      {
        enemy: { name: 'Golem de Gelo', emoji: '🧊', hp: 450, atk: 25, def: 25, spd: 0.8, color: '#87CEEB', attackPattern: 'melee', size: 1.5, xpReward: 160, goldReward: 120 },
        reward: eq('peitoral_glacial', 'Peitoral Glacial', 'armor', 'epic', 0, 18, 40, -1, 250),
        starThresholds: [22, 38, 60],
      },
      {
        enemy: { name: 'Fantasma', emoji: '👻', hp: 200, atk: 35, def: 5, spd: 3, color: '#E0E0E0', attackPattern: 'ranged', size: 1.0, xpReward: 150, goldReward: 110 },
        reward: null,
        starThresholds: [16, 28, 45],
      },
      {
        enemy: { name: 'Águia', emoji: '🦅', hp: 250, atk: 32, def: 10, spd: 3.5, color: '#4682B4', attackPattern: 'charge', size: 1.1, xpReward: 155, goldReward: 115 },
        reward: eq('botas_inverno', 'Botas do Inverno', 'accessory', 'rare', 4, 3, 10, 4, 140),
        starThresholds: [15, 28, 45],
      },
      {
        enemy: { name: 'Rainha do Gelo', emoji: '👸', hp: 1500, atk: 45, def: 30, spd: 1.5, color: '#ADD8E6', attackPattern: 'aoe', size: 2.3, isBoss: true, abilities: ['Nevasca', 'Lança de Gelo'], xpReward: 800, goldReward: 500 },
        reward: eq('cajado_gelo', 'Cajado do Gelo', 'weapon', 'epic', 28, 0, 15, 1, 300),
        starThresholds: [35, 55, 85],
      },
    ],
  },
  {
    id: 'abismo', name: 'Abismo Sombrio', emoji: '🌑',
    bgColor1: '#0a0a12', bgColor2: '#1a0a2f', accentColor: '#8e44ad',
    unlockRequirement: 'gelo',
    description: 'Um abismo escuro onde demônios e sombras reinam.',
    levels: [
      {
        enemy: { name: 'Sombra', emoji: '👤', hp: 500, atk: 40, def: 20, spd: 3, color: '#2F2F4F', attackPattern: 'melee', size: 1.1, xpReward: 280, goldReward: 200 },
        reward: eq('adaga_sombria', 'Adaga Sombria', 'weapon', 'epic', 26, 0, 0, 4, 280),
        starThresholds: [20, 35, 55],
      },
      {
        enemy: { name: 'Demônio', emoji: '😈', hp: 650, atk: 50, def: 25, spd: 2, color: '#8B008B', attackPattern: 'ranged', size: 1.3, xpReward: 320, goldReward: 230 },
        reward: eq('armadura_sombras', 'Armadura das Sombras', 'armor', 'epic', 0, 24, 60, -1, 320),
        starThresholds: [25, 42, 65],
      },
      {
        enemy: { name: 'Necromante Inimigo', emoji: '🧙', hp: 400, atk: 55, def: 15, spd: 1.8, color: '#4B0082', attackPattern: 'summon', size: 1.2, xpReward: 300, goldReward: 220 },
        reward: null,
        starThresholds: [22, 38, 60],
      },
      {
        enemy: { name: 'Cavaleiro Negro', emoji: '🗡️', hp: 800, atk: 45, def: 40, spd: 1.5, color: '#363636', attackPattern: 'charge', size: 1.5, xpReward: 350, goldReward: 260 },
        reward: eq('mascara_abismo', 'Máscara do Abismo', 'accessory', 'epic', 10, 8, 20, 3, 280),
        starThresholds: [24, 40, 62],
      },
      {
        enemy: { name: 'Senhor das Sombras', emoji: '👑', hp: 3000, atk: 70, def: 45, spd: 2, color: '#1A1A2E', attackPattern: 'aoe', size: 2.5, isBoss: true, abilities: ['Abismo Total', 'Drenar Vida'], xpReward: 1500, goldReward: 1000 },
        reward: eq('espada_senhor', 'Espada do Senhor', 'weapon', 'legendary', 40, 5, 20, 3, 600),
        starThresholds: [40, 65, 100],
      },
    ],
  },
  {
    id: 'celestial', name: 'Torre Celestial', emoji: '✨',
    bgColor1: '#1a150a', bgColor2: '#2f2a1a', accentColor: '#f1c40f',
    unlockRequirement: 'abismo',
    description: 'A torre dos deuses, onde os seres mais poderosos habitam.',
    levels: [
      {
        enemy: { name: 'Anjo', emoji: '👼', hp: 1000, atk: 60, def: 35, spd: 2.5, color: '#FFD700', attackPattern: 'ranged', size: 1.2, xpReward: 500, goldReward: 350 },
        reward: eq('cetro_divino', 'Cetro Divino', 'weapon', 'epic', 35, 0, 20, 2, 400),
        starThresholds: [25, 42, 65],
      },
      {
        enemy: { name: 'Querubim', emoji: '✨', hp: 1200, atk: 65, def: 40, spd: 2, color: '#FFFACD', attackPattern: 'melee', size: 1.3, xpReward: 550, goldReward: 400 },
        reward: eq('armadura_celestial', 'Armadura Celestial', 'armor', 'legendary', 0, 35, 80, 0, 600),
        starThresholds: [28, 48, 72],
      },
      {
        enemy: { name: 'Serafim', emoji: '⚡', hp: 900, atk: 75, def: 30, spd: 3, color: '#FFE4B5', attackPattern: 'charge', size: 1.4, xpReward: 520, goldReward: 380 },
        reward: null,
        starThresholds: [22, 38, 60],
      },
      {
        enemy: { name: 'Arcanjo', emoji: '🌟', hp: 1500, atk: 80, def: 50, spd: 2.5, color: '#FFA500', attackPattern: 'aoe', size: 1.6, xpReward: 600, goldReward: 450 },
        reward: eq('coroa_anjos', 'Coroa dos Anjos', 'accessory', 'legendary', 15, 12, 30, 5, 550),
        starThresholds: [30, 50, 78],
      },
      {
        enemy: { name: 'Deus Supremo', emoji: '☯️', hp: 5000, atk: 100, def: 60, spd: 2, color: '#FFD700', attackPattern: 'aoe', size: 2.5, isBoss: true, abilities: ['Julgamento Final', 'Ressurreição', 'Apocalipse'], xpReward: 3000, goldReward: 2000 },
        reward: eq('lamina_suprema', 'Lâmina Suprema', 'weapon', 'legendary', 60, 10, 30, 5, 1000),
        starThresholds: [50, 80, 120],
      },
    ],
  },
];

const SHOP_ITEMS: ShopItem[] = [
  { ...eq('shop_espada', 'Espada de Aço', 'weapon', 'common', 8, 0, 0, 0, 25), buyPrice: 100 },
  { ...eq('shop_arco', 'Arco Longo', 'weapon', 'common', 6, 0, 0, 3, 30), buyPrice: 120 },
  { ...eq('shop_cajado', 'Cajado Arcano', 'weapon', 'rare', 14, 0, 10, 0, 80), buyPrice: 300 },
  { ...eq('shop_couro', 'Armadura de Couro Reforçado', 'armor', 'common', 0, 6, 20, 0, 25), buyPrice: 100 },
  { ...eq('shop_malha', 'Cota de Malha', 'armor', 'rare', 0, 12, 40, -1, 90), buyPrice: 300 },
  { ...eq('shop_escudo', 'Escudo Sagrado', 'armor', 'epic', 0, 22, 80, -1, 200), buyPrice: 600 },
  { ...eq('shop_anel', 'Anel da Força', 'accessory', 'common', 3, 3, 5, 2, 20), buyPrice: 80 },
  { ...eq('shop_amuleto', 'Amuleto do Poder', 'accessory', 'epic', 12, 8, 15, 5, 180), buyPrice: 700 },
  { ...eq('shop_coroa', 'Coroa do Campeão', 'accessory', 'legendary', 18, 15, 25, 6, 350), buyPrice: 1200 },
];

// ===================== HELPERS =====================
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number, color: string) {
  ctx.fillStyle = color;
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, current: number, max: number, color1: string, color2: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  const pct = Math.max(0, current / max);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w * pct, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
}

function createDefaultPlayer(classId: string = ''): PlayerData {
  return {
    classId, level: 1, xp: 0, xpToNext: 100,
    gold: 50, kills: 0, pvpWins: 0,
    equipment: [null, null, null],
    inventory: [],
    completedLevels: {},
  };
}

function calcStats(pd: PlayerData) {
  const cls = CLASSES.find(c => c.id === pd.classId);
  if (!cls) return { hp: 100, atk: 10, def: 5, spd: 3 };
  let hp = cls.baseHP + (pd.level - 1) * 15;
  let atk = cls.baseATK + (pd.level - 1) * 3;
  let def = cls.baseDEF + (pd.level - 1) * 2;
  let spd = cls.baseSPD + (pd.level - 1) * 0.5;
  for (const item of pd.equipment) {
    if (item) { hp += item.hp; atk += item.atk; def += item.def; spd += item.spd; }
  }
  return { hp, atk, def, spd };
}

// ===================== COMPONENT =====================
interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

export default function CampaignRPGGame({ onScore, liveCode }: Props) {
  const { sfx } = useSoundEffects();

  const [screen, setScreen] = useState<GameScreen>('menu');
  const [playerData, setPlayerData] = useState<PlayerData>(createDefaultPlayer());
  const [soundOn, setSoundOn] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedWorld, setSelectedWorld] = useState(0);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [pvpResult, setPvpResult] = useState<{ won: boolean; lvl: number; gold: number } | null>(null);
  const [bossIntroTimer, setBossIntroTimer] = useState(0);
  const [levelUpInfo, setLevelUpInfo] = useState<{ from: number; to: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const combatRef = useRef<CombatState | null>(null);
  const sizeRef = useRef({ w: 800, h: 600 });
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const playSound = useCallback((fn: () => void) => {
    if (soundOn) { try { fn(); } catch { /* sfx method may not exist */ } }
  }, [soundOn]);

  // --- Save / Load ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as PlayerData;
        if (data && data.classId) {
          setPlayerData(data);
          setScreen('campaignMap');
          setSelectedClass(data.classId);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (playerData.classId && screen !== 'combat') {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(playerData)); } catch { /* ignore */ }
    }
  }, [playerData, screen]);

  // --- Resize ---
  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (el) {
        const w = el.clientWidth;
        const h = el.clientHeight;
        sizeRef.current = { w, h };
        const c = canvasRef.current;
        if (c) { c.width = w; c.height = h; }
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // --- Start Combat ---
  const startCombat = useCallback((wIdx: number, lIdx: number) => {
    const cls = CLASSES.find(c => c.id === playerData.classId);
    if (!cls) return;
    const stats = calcStats(playerData);
    const w = sizeRef.current.w;
    const h = sizeRef.current.h;
    const groundY = h * 0.75;
    const enemyDef = WORLDS[wIdx].levels[lIdx].enemy;

    const c: CombatState = {
      px: w * 0.25, py: groundY * 0.6,
      php: stats.hp, pmaxhp: stats.hp,
      patk: stats.atk, pdef: stats.def, pspd: stats.spd,
      pvx: 0, pvy: 0, pAtkCD: 0, pAbilCD: 0,
      pHurt: 0, pAtkAnim: 0, pFaceR: true, pBob: 0,
      pCritNext: false, pFuryNext: false,
      ex: w * 0.75, ey: groundY * 0.5,
      ehp: enemyDef.hp, emaxhp: enemyDef.hp,
      eatk: enemyDef.atk, edef: enemyDef.def, espd: enemyDef.spd,
      eHurt: 0, eAtkAnim: 0, eAtkCD: 60,
      eFaceR: false, eCharging: false, eChargeTimer: 0,
      eChargeVX: 0, eChargeVY: 0, ePause: 0,
      eSummonCD: 180, eAoeCD: 120,
      projectiles: [], particles: [], summons: [],
      ambient: Array.from({ length: 30 }, () => ({
        x: Math.random() * w, y: Math.random() * groundY,
        vy: -0.3 - Math.random() * 0.5,
        size: 1 + Math.random() * 3,
        alpha: 0.1 + Math.random() * 0.3,
      })),
      keys: new Set(), frame: 0, time: 0,
      shake: 0, shakeI: 0,
      worldIdx: wIdx, levelIdx: lIdx,
      won: false, lost: false,
    };
    combatRef.current = c;

    if (enemyDef.isBoss) {
      setScreen('bossIntro');
      setBossIntroTimer(120);
    } else {
      playSound(() => sfx.battleStart());
      setScreen('combat');
    }
  }, [playerData, playSound]);

  // --- Boss intro auto-transition ---
  useEffect(() => {
    if (screen !== 'bossIntro' || bossIntroTimer <= 0) return;
    const t = setTimeout(() => {
      playSound(() => sfx.battleStart());
      setScreen('combat');
    }, bossIntroTimer * (1000 / 60));
    return () => clearTimeout(t);
  }, [screen, bossIntroTimer, playSound]);

  // --- Handle combat end ---
  const handleCombatEnd = useCallback((won: boolean) => {
    const c = combatRef.current;
    if (!c) return;
    const enemyDef = WORLDS[c.worldIdx].levels[c.levelIdx].enemy;
    const levelDef = WORLDS[c.worldIdx].levels[c.levelIdx];
    const timeSec = c.time / 60;

    if (won) {
      playSound(() => sfx.victoryFanfare());
      const th = levelDef.starThresholds;
      const stars = timeSec <= th[0] ? 3 : timeSec <= th[1] ? 2 : 1;
      const score = stars * 1000 + Math.max(0, Math.floor((th[2] - timeSec) * 10));

      let newXp = playerData.xp + enemyDef.xpReward;
      let newGold = playerData.gold + enemyDef.goldReward;
      let leveledUp = false;
      let newLevel = playerData.level;
      let newXpToNext = playerData.xpToNext;
      let xpOverflow = newXp;

      while (xpOverflow >= newXpToNext) {
        xpOverflow -= newXpToNext;
        newLevel++;
        newXpToNext = 100 * newLevel;
        leveledUp = true;
        playSound(() => sfx.levelUp());
      }

      const newInv = [...playerData.inventory];
      if (levelDef.reward) newInv.push({ ...levelDef.reward });

      const key = `${c.worldIdx}-${c.levelIdx}`;
      const prevStars = playerData.completedLevels[key] || 0;
      const bestStars = Math.max(prevStars, stars);

      const updated: PlayerData = {
        ...playerData,
        level: newLevel,
        xp: xpOverflow,
        xpToNext: newXpToNext,
        gold: newGold,
        kills: playerData.kills + 1,
        inventory: newInv,
        completedLevels: { ...playerData.completedLevels, [key]: bestStars },
      };
      setPlayerData(updated);

      const result: BattleResult = {
        stars, time: timeSec, score,
        reward: levelDef.reward, xp: enemyDef.xpReward,
        gold: enemyDef.goldReward, leveledUp, newLevel,
      };
      setBattleResult(result);

      if (leveledUp) {
        setLevelUpInfo({ from: playerData.level, to: newLevel });
        setScreen('levelUp');
        setTimeout(() => setScreen('victory'), 2000);
      } else {
        setScreen('victory');
      }

      onScore?.('CampaignRPG', score);
    } else {
      playSound(() => sfx.lose());
      setScreen('defeat');
    }
  }, [playerData, onScore, playSound]);

  // --- Player Attack (called from game loop and touch buttons) ---
  const doPlayerAttack = useCallback(() => {
    const c = combatRef.current;
    if (!c || c.won || c.lost || c.pAtkCD > 0) return;
    const cls = CLASSES.find(cl => cl.id === playerData.classId);
    if (!cls) return;
    const w = sizeRef.current.w;
    const h = sizeRef.current.h;
    const dx = c.ex - c.px;
    const dy = c.ey - c.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const enemySize = WORLDS[c.worldIdx].levels[c.levelIdx].enemy.size;

    if (dist < 120) {
      // Melee attack
      let dmg = Math.max(1, c.patk - c.edef * 0.5);
      let isCrit = false;

      // Crit check
      if (c.pCritNext) {
        isCrit = true;
        dmg *= 2;
        c.pCritNext = false;
      } else if (cls.id === 'arqueiro') {
        if (Math.random() < 0.25) { isCrit = true; dmg *= 2; }
      } else {
        if (Math.random() < 0.1) { isCrit = true; dmg *= 1.5; }
      }

      // Fury
      if (c.pFuryNext) { dmg *= 3; c.pFuryNext = false; playSound(() => sfx.powerUp()); }

      // Mage passive: more ability damage (not applicable here)
      // Necromancer passive: lifesteal
      if (cls.id === 'necromante') {
        const heal = Math.floor(dmg * 0.15);
        c.php = Math.min(c.pmaxhp, c.php + heal);
        c.particles.push({ x: c.px, y: c.py - 30, vx: (Math.random() - 0.5) * 2, vy: -1.5, life: 40, maxLife: 40, color: '#2ecc71', size: 14, type: 'text', text: `+${heal}`, shrink: false });
      }

      dmg = Math.floor(dmg);
      c.ehp -= dmg;
      c.eHurt = 8;
      c.pAtkAnim = 12;
      c.pAtkCD = cls.id === 'arqueiro' ? 18 : 25;
      c.shake = 6;
      c.shakeI = 4;

      playSound(() => sfx.pop());

      // Damage number
      c.particles.push({
        x: c.ex + (Math.random() - 0.5) * 20, y: c.ey - 40,
        vx: (Math.random() - 0.5) * 2, vy: -2, life: 50, maxLife: 50,
        color: isCrit ? '#ffff00' : '#ff4444',
        size: isCrit ? 22 : 16, type: 'text',
        text: isCrit ? `${dmg} CRÍTICO!` : `${dmg}`, shrink: false,
      });

      // Hit sparks
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        c.particles.push({
          x: c.ex - dx / dist * enemySize * 15, y: c.ey - dy / dist * enemySize * 15,
          vx: Math.cos(a) * (2 + Math.random() * 3), vy: Math.sin(a) * (2 + Math.random() * 3),
          life: 20, maxLife: 20, color: cls.color, size: 3, type: 'spark', shrink: true,
        });
      }
    } else {
      // Ranged attack - shoot projectile
      const angle = Math.atan2(dy, dx);
      const speed = 6;
      c.projectiles.push({
        x: c.px, y: c.py - 10,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        damage: c.patk, isPlayer: true, color: cls.color,
        trail: [], size: 4,
      });
      c.pAtkCD = cls.id === 'arqueiro' ? 12 : 20;
      playSound(() => sfx.pop());
    }
  }, [playerData.classId, playSound]);

  // --- Player Ability ---
  const doPlayerAbility = useCallback(() => {
    const c = combatRef.current;
    if (!c || c.won || c.lost || c.pAbilCD > 0) return;
    const cls = CLASSES.find(cl => cl.id === playerData.classId);
    if (!cls) return;
    const dx = c.ex - c.px;
    const dy = c.ey - c.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Mage passive: 20% more ability damage
    const abilMult = cls.id === 'mago' ? 1.2 : 1.0;

    c.pAbilCD = cls.abilityCooldown;
    playSound(() => sfx.ultimate());

    switch (cls.id) {
      case 'guerreiro': {
        // Fúria do Leão: next melee is 3x
        c.pFuryNext = true;
        c.particles.push({ x: c.px, y: c.py - 40, vx: 0, vy: -1, life: 60, maxLife: 60, color: '#e74c3c', size: 18, type: 'text', text: 'FÚRIA!', shrink: false });
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          c.particles.push({ x: c.px, y: c.py, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 30, maxLife: 30, color: '#e74c3c', size: 4, type: 'circle', gravity: 0, shrink: true });
        }
        break;
      }
      case 'mago': {
        // Meteoro Arcano: 8 projectiles from above
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            if (!combatRef.current || combatRef.current.won || combatRef.current.lost) return;
            const cc = combatRef.current;
            const tx = cc.ex + (Math.random() - 0.5) * 120;
            const ty = cc.ey + (Math.random() - 0.5) * 60;
            cc.projectiles.push({
              x: tx, y: -20, vx: 0, vy: 8,
              damage: Math.floor(c.patk * 0.6 * abilMult), isPlayer: true, color: '#9b59b6',
              trail: [], size: 8,
            });
            playSound(() => sfx.explosion());
          }, i * 100);
        }
        break;
      }
      case 'arqueiro': {
        // Chuva de Flechas: 12 projectiles in fan
        for (let i = 0; i < 12; i++) {
          const spread = (i - 5.5) * 0.12;
          const a = angle + spread;
          c.projectiles.push({
            x: c.px, y: c.py - 10,
            vx: Math.cos(a) * 7, vy: Math.sin(a) * 7,
            damage: Math.floor(c.patk * 0.4), isPlayer: true, color: '#2ecc71',
            trail: [], size: 3,
          });
        }
        break;
      }
      case 'ladino': {
        // Sombra Mortal: teleport behind enemy + guaranteed crit
        const behindX = c.ex + (c.eFaceR ? -50 : 50);
        const behindY = c.ey;
        // Disappear particles
        for (let i = 0; i < 10; i++) {
          c.particles.push({ x: c.px, y: c.py, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 25, maxLife: 25, color: '#3498db', size: 5, type: 'circle', shrink: true });
        }
        c.px = behindX;
        c.py = behindY;
        c.pCritNext = true;
        // Appear particles
        for (let i = 0; i < 10; i++) {
          c.particles.push({ x: c.px, y: c.py, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 25, maxLife: 25, color: '#3498db', size: 5, type: 'circle', shrink: true });
        }
        c.particles.push({ x: c.px, y: c.py - 40, vx: 0, vy: -1, life: 50, maxLife: 50, color: '#3498db', size: 16, type: 'text', text: 'CRÍTICO!', shrink: false });
        // Auto-attack immediately
        setTimeout(() => doPlayerAttack(), 100);
        break;
      }
      case 'paladino': {
        // Julgamento Divino: big damage + heal 20% HP
        const dmg = Math.floor(c.patk * 2.5 * abilMult);
        c.ehp -= dmg;
        c.eHurt = 12;
        c.shake = 10;
        c.shakeI = 6;
        const healAmt = Math.floor(c.pmaxhp * 0.2);
        c.php = Math.min(c.pmaxhp, c.php + healAmt);
        playSound(() => sfx.shieldUp());
        // Damage particles
        c.particles.push({ x: c.ex, y: c.ey - 40, vx: 0, vy: -2, life: 50, maxLife: 50, color: '#f39c12', size: 22, type: 'text', text: `${dmg}`, shrink: false });
        c.particles.push({ x: c.px, y: c.py - 40, vx: 0, vy: -2, life: 50, maxLife: 50, color: '#2ecc71', size: 18, type: 'text', text: `+${healAmt}`, shrink: false });
        // Holy ring
        c.particles.push({ x: c.ex, y: c.ey, vx: 0, vy: 0, life: 30, maxLife: 30, color: '#f1c40f', size: 10, type: 'ring', shrink: false });
        for (let i = 0; i < 15; i++) {
          const a = Math.random() * Math.PI * 2;
          c.particles.push({ x: c.ex, y: c.ey, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, life: 25, maxLife: 25, color: '#f1c40f', size: 3, type: 'star', shrink: true });
        }
        break;
      }
      case 'necromante': {
        // Invocação Negra: summon 3 skeletons
        for (let i = 0; i < 3; i++) {
          c.summons.push({
            x: c.px + (i - 1) * 40, y: c.py + Math.random() * 20,
            hp: 1, atk: Math.floor(c.patk * 0.3), cooldown: 0,
            vx: 0, vy: 0,
          });
          for (let j = 0; j < 8; j++) {
            const a = Math.random() * Math.PI * 2;
            c.particles.push({ x: c.px + (i - 1) * 40, y: c.py, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 20, maxLife: 20, color: '#1abc9c', size: 4, type: 'circle', shrink: true });
          }
        }
        break;
      }
    }
  }, [playerData.classId, playSound, doPlayerAttack]);

  // ===================== GAME LOOP =====================
  useEffect(() => {
    if (screen !== 'combat') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId = 0;

    const loop = () => {
      const c = combatRef.current;
      if (!c || c.won || c.lost) { animId = requestAnimationFrame(loop); return; }
      const w = sizeRef.current.w;
      const h = sizeRef.current.h;
      const groundY = h * 0.75;
      const world = WORLDS[c.worldIdx];
      const enemyDef = world.levels[c.levelIdx].enemy;
      const cls = CLASSES.find(cl => cl.id === playerData.classId);
      if (!cls) { animId = requestAnimationFrame(loop); return; }

      c.frame++;
      c.time++;

      // --- UPDATE ---
      // Player movement
      let mx = 0, my = 0;
      if (c.keys.has('a') || c.keys.has('arrowleft')) mx -= 1;
      if (c.keys.has('d') || c.keys.has('arrowright')) mx += 1;
      if (c.keys.has('w') || c.keys.has('arrowup')) my -= 1;
      if (c.keys.has('s') || c.keys.has('arrowdown')) my += 1;
      if (mx !== 0 || my !== 0) {
        const len = Math.sqrt(mx * mx + my * my);
        c.px += (mx / len) * c.pspd;
        c.py += (my / len) * c.pspd;
        c.pBob += 0.15;
        if (mx !== 0) c.pFaceR = mx > 0;
      }
      c.px = Math.max(25, Math.min(w - 25, c.px));
      c.py = Math.max(25, Math.min(groundY - 20, c.py));

      // Cooldowns
      if (c.pAtkCD > 0) c.pAtkCD--;
      if (c.pAbilCD > 0) c.pAbilCD--;
      if (c.pHurt > 0) c.pHurt--;
      if (c.pAtkAnim > 0) c.pAtkAnim--;

      // Paladin passive: regen 2 HP/sec
      if (cls.id === 'paladino' && c.frame % 30 === 0) {
        c.php = Math.min(c.pmaxhp, c.php + 1);
      }

      // Key-based attacks
      if (c.keys.has(' ') || c.keys.has('j')) {
        if (c.pAtkCD <= 0) doPlayerAttack();
      }
      if (c.keys.has('e') || c.keys.has('k')) {
        if (c.pAbilCD <= 0) doPlayerAbility();
      }

      // --- Enemy AI ---
      if (c.eHurt > 0) c.eHurt--;
      if (c.eAtkAnim > 0) c.eAtkAnim--;
      if (c.ePause > 0) { c.ePause--; }
      else {
        const edx = c.px - c.ex;
        const edy = c.py - c.ey;
        const eDist = Math.sqrt(edx * edx + edy * edy);
        c.eFaceR = edx > 0;

        if (c.eCharging) {
          c.ex += c.eChargeVX;
          c.ey += c.eChargeVY;
          c.eChargeTimer--;
          if (c.eChargeTimer <= 0) {
            c.eCharging = false;
            c.ePause = 60;
            c.shake = 8; c.shakeI = 5;
            // Charge hit
            if (eDist < 80 * enemyDef.size) {
              let dmg = Math.floor(c.eatk * 1.5);
              // Warrior passive: 15% damage reduction
              if (cls.id === 'guerreiro') dmg = Math.floor(dmg * 0.85);
              // Rogue passive: 20% dodge
              if (cls.id === 'ladino' && Math.random() < 0.2) {
                c.particles.push({ x: c.px, y: c.py - 30, vx: 0, vy: -2, life: 40, maxLife: 40, color: '#3498db', size: 16, type: 'text', text: 'ESQUIVA!', shrink: false });
              } else {
                const finalDmg = Math.max(1, dmg - c.pdef * 0.4);
                c.php -= finalDmg;
                c.pHurt = 8;
                c.shake = 6; c.shakeI = 4;
                c.particles.push({ x: c.px, y: c.py - 30, vx: 0, vy: -2, life: 40, maxLife: 40, color: '#ff4444', size: 16, type: 'text', text: `-${finalDmg}`, shrink: false });
                playSound(() => sfx.error());
              }
            }
          }
        } else {
          switch (enemyDef.attackPattern) {
            case 'melee': {
              if (eDist > 60 * enemyDef.size) {
                c.ex += (edx / eDist) * c.espd;
                c.ey += (edy / eDist) * c.espd;
              }
              if (eDist < 80 * enemyDef.size && c.eAtkCD <= 0) {
                let dmg = c.eatk;
                if (cls.id === 'guerreiro') dmg = Math.floor(dmg * 0.85);
                if (cls.id === 'ladino' && Math.random() < 0.2) {
                  c.particles.push({ x: c.px, y: c.py - 30, vx: 0, vy: -2, life: 40, maxLife: 40, color: '#3498db', size: 16, type: 'text', text: 'ESQUIVA!', shrink: false });
                } else {
                  const finalDmg = Math.max(1, Math.floor(dmg - c.pdef * 0.4));
                  c.php -= finalDmg;
                  c.pHurt = 8;
                  c.eAtkAnim = 15;
                  c.eAtkCD = enemyDef.isBoss ? 60 : 90;
                  c.shake = 4; c.shakeI = 3;
                  c.particles.push({ x: c.px, y: c.py - 30, vx: (Math.random() - 0.5) * 2, vy: -2, life: 40, maxLife: 40, color: '#ff4444', size: 16, type: 'text', text: `-${finalDmg}`, shrink: false });
                  playSound(() => sfx.error());
                }
              }
              break;
            }
            case 'ranged': {
              if (eDist < 180) {
                c.ex -= (edx / eDist) * c.espd * 0.5;
                c.ey -= (edy / eDist) * c.espd * 0.5;
              } else if (eDist > 280) {
                c.ex += (edx / eDist) * c.espd * 0.5;
                c.ey += (edy / eDist) * c.espd * 0.5;
              }
              if (c.eAtkCD <= 0) {
                const ang = Math.atan2(edy, edx);
                c.projectiles.push({
                  x: c.ex, y: c.ey - 5,
                  vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 4,
                  damage: c.eatk, isPlayer: false, color: enemyDef.color,
                  trail: [], size: 5,
                });
                c.eAtkCD = enemyDef.isBoss ? 50 : 100;
                c.eAtkAnim = 10;
                playSound(() => sfx.whoosh());
              }
              break;
            }
            case 'charge': {
              if (c.eAtkCD <= 0 && !c.eCharging) {
                // Start charge
                c.eCharging = true;
                c.eChargeTimer = 30;
                const ang = Math.atan2(edy, edx);
                c.eChargeVX = Math.cos(ang) * c.espd * 3;
                c.eChargeVY = Math.sin(ang) * c.espd * 3;
                c.eAtkCD = enemyDef.isBoss ? 80 : 140;
                playSound(() => sfx.whoosh());
              } else if (eDist > 100 * enemyDef.size) {
                c.ex += (edx / eDist) * c.espd * 0.5;
                c.ey += (edy / eDist) * c.espd * 0.5;
              }
              break;
            }
            case 'summon': {
              if (eDist > 200) {
                c.ex += (edx / eDist) * c.espd * 0.4;
                c.ey += (edy / eDist) * c.espd * 0.4;
              }
              if (c.eSummonCD <= 0) {
                c.summons.push({
                  x: c.ex + (Math.random() - 0.5) * 40, y: c.ey + (Math.random() - 0.5) * 20,
                  hp: 1, atk: Math.floor(c.eatk * 0.3), cooldown: 0,
                  vx: 0, vy: 0, isEnemy: true,
                } as any);
                c.eSummonCD = enemyDef.isBoss ? 120 : 200;
                c.eAtkAnim = 15;
                for (let i = 0; i < 6; i++) {
                  const a = Math.random() * Math.PI * 2;
                  c.particles.push({ x: c.ex, y: c.ey, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 20, maxLife: 20, color: enemyDef.color, size: 4, type: 'circle', shrink: true });
                }
              }
              // Also do ranged attack sometimes
              if (c.eAtkCD <= 0) {
                const ang = Math.atan2(edy, edx);
                c.projectiles.push({ x: c.ex, y: c.ey - 5, vx: Math.cos(ang) * 3.5, vy: Math.sin(ang) * 3.5, damage: Math.floor(c.eatk * 0.7), isPlayer: false, color: enemyDef.color, trail: [], size: 4 });
                c.eAtkCD = enemyDef.isBoss ? 70 : 120;
              }
              break;
            }
            case 'aoe': {
              if (eDist > 120 * enemyDef.size) {
                c.ex += (edx / eDist) * c.espd * 0.6;
                c.ey += (edy / eDist) * c.espd * 0.6;
              }
              if (eDist < 150 * enemyDef.size && c.eAoeCD <= 0) {
                // AOE attack
                const aoeDmg = c.eatk;
                if (cls.id === 'guerreiro') {
                  // warrior still takes 85%
                  const fd = Math.max(1, Math.floor(aoeDmg * 0.85 - c.pdef * 0.3));
                  c.php -= fd;
                  c.particles.push({ x: c.px, y: c.py - 30, vx: 0, vy: -2, life: 40, maxLife: 40, color: '#ff4444', size: 18, type: 'text', text: `-${fd}`, shrink: false });
                } else if (cls.id === 'ladino' && Math.random() < 0.2) {
                  c.particles.push({ x: c.px, y: c.py - 30, vx: 0, vy: -2, life: 40, maxLife: 40, color: '#3498db', size: 16, type: 'text', text: 'ESQUIVA!', shrink: false });
                } else {
                  const fd = Math.max(1, Math.floor(aoeDmg - c.pdef * 0.3));
                  c.php -= fd;
                  c.pHurt = 10;
                  c.particles.push({ x: c.px, y: c.py - 30, vx: 0, vy: -2, life: 40, maxLife: 40, color: '#ff4444', size: 18, type: 'text', text: `-${fd}`, shrink: false });
                }
                c.eAtkAnim = 20;
                c.eAoeCD = enemyDef.isBoss ? 80 : 150;
                c.shake = 8; c.shakeI = 6;
                // AOE ring effect
                c.particles.push({ x: c.ex, y: c.ey, vx: 0, vy: 0, life: 30, maxLife: 30, color: enemyDef.color, size: 5, type: 'ring', shrink: false });
                playSound(() => sfx.explosion());
              }
              break;
            }
          }
          if (c.eAtkCD > 0) c.eAtkCD--;
          if (c.eSummonCD > 0) c.eSummonCD--;
          if (c.eAoeCD > 0) c.eAoeCD--;
        }

        // Constrain enemy
        c.ex = Math.max(30 * enemyDef.size, Math.min(w - 30 * enemyDef.size, c.ex));
        c.ey = Math.max(30 * enemyDef.size, Math.min(groundY - 20 * enemyDef.size, c.ey));
      }

      // --- Projectiles ---
      for (let i = c.projectiles.length - 1; i >= 0; i--) {
        const p = c.projectiles[i];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();
        p.x += p.vx;
        p.y += p.vy;

        let hit = false;
        if (p.isPlayer) {
          const edx = p.x - c.ex;
          const edy = p.y - c.ey;
          const eDist = Math.sqrt(edx * edx + edy * edy);
          if (eDist < 25 * enemyDef.size) {
            let dmg = Math.max(1, p.damage - c.edef * 0.4);
            let isCrit = false;
            if (cls.id === 'arqueiro' && Math.random() < 0.25) { isCrit = true; dmg = Math.floor(dmg * 1.5); }
            dmg = Math.floor(dmg);
            c.ehp -= dmg;
            c.eHurt = 6;
            c.shake = 3; c.shakeI = 2;
            c.particles.push({
              x: c.ex + (Math.random() - 0.5) * 20, y: c.ey - 30,
              vx: (Math.random() - 0.5) * 2, vy: -2, life: 40, maxLife: 40,
              color: isCrit ? '#ffff00' : '#ff4444', size: isCrit ? 18 : 14,
              type: 'text', text: isCrit ? `${dmg} CRÍTICO!` : `${dmg}`, shrink: false,
            });
            // Necromancer lifesteal
            if (cls.id === 'necromante') {
              const heal = Math.floor(dmg * 0.15);
              c.php = Math.min(c.pmaxhp, c.php + heal);
            }
            hit = true;
            playSound(() => sfx.pop());
            // Spark particles
            for (let j = 0; j < 4; j++) {
              const a = Math.random() * Math.PI * 2;
              c.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, life: 15, maxLife: 15, color: p.color, size: 2, type: 'spark', shrink: true });
            }
          }
        } else {
          const pdx = p.x - c.px;
          const pdy = p.y - c.py;
          const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
          if (pDist < 20) {
            let dmg = Math.max(1, Math.floor(p.damage - c.pdef * 0.4));
            if (cls.id === 'guerreiro') dmg = Math.floor(dmg * 0.85);
            if (cls.id === 'ladino' && Math.random() < 0.2) {
              c.particles.push({ x: c.px, y: c.py - 30, vx: 0, vy: -2, life: 40, maxLife: 40, color: '#3498db', size: 16, type: 'text', text: 'ESQUIVA!', shrink: false });
            } else {
              c.php -= dmg;
              c.pHurt = 8;
              c.shake = 4; c.shakeI = 3;
              c.particles.push({ x: c.px, y: c.py - 30, vx: (Math.random() - 0.5) * 2, vy: -2, life: 40, maxLife: 40, color: '#ff4444', size: 14, type: 'text', text: `-${dmg}`, shrink: false });
              playSound(() => sfx.error());
            }
            hit = true;
          }
        }
        if (hit || p.x < -50 || p.x > w + 50 || p.y < -50 || p.y > h + 50) {
          c.projectiles.splice(i, 1);
        }
      }

      // --- Summons ---
      for (let i = c.summons.length - 1; i >= 0; i--) {
        const s = c.summons[i];
        const isEnemy = (s as any).isEnemy;
        const targetX = isEnemy ? c.px : c.ex;
        const targetY = isEnemy ? c.py : c.ey;
        const sdx = targetX - s.x;
        const sdy = targetY - s.y;
        const sDist = Math.sqrt(sdx * sdx + sdy * sdy);

        if (sDist > 30) {
          s.x += (sdx / sDist) * 2;
          s.y += (sdy / sDist) * 2;
        }
        s.cooldown--;
        if (sDist < 40 && s.cooldown <= 0) {
          s.cooldown = 45;
          if (isEnemy) {
            let dmg = Math.max(1, s.atk);
            if (cls.id === 'ladino' && Math.random() < 0.2) {
              c.particles.push({ x: c.px, y: c.py - 25, vx: 0, vy: -2, life: 30, maxLife: 30, color: '#3498db', size: 12, type: 'text', text: 'ESQUIVA!', shrink: false });
            } else {
              c.php -= dmg;
              c.pHurt = 4;
              c.particles.push({ x: c.px, y: c.py - 25, vx: 0, vy: -2, life: 30, maxLife: 30, color: '#ff6666', size: 12, type: 'text', text: `-${dmg}`, shrink: false });
            }
          } else {
            c.ehp -= s.atk;
            c.eHurt = 4;
            c.particles.push({ x: c.ex, y: c.ey - 25, vx: 0, vy: -2, life: 30, maxLife: 30, color: '#66ff66', size: 12, type: 'text', text: `-${s.atk}`, shrink: false });
          }
          s.hp = 0;
        }
        if (s.hp <= 0) c.summons.splice(i, 1);
      }

      // --- Particles ---
      for (let i = c.particles.length - 1; i >= 0; i--) {
        const p = c.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.gravity) p.vy += p.gravity;
        p.life--;
        if (p.life <= 0) c.particles.splice(i, 1);
      }

      // --- Ambient particles ---
      for (const a of c.ambient) {
        a.y += a.vy;
        a.x += Math.sin(c.frame * 0.01 + a.y * 0.01) * 0.3;
        if (a.y < -10) { a.y = groundY; a.x = Math.random() * w; }
      }

      // --- Screen shake ---
      if (c.shake > 0) c.shake--;

      // --- Win/Lose check ---
      if (c.ehp <= 0 && !c.won) {
        c.won = true;
        // Death explosion
        for (let i = 0; i < 20; i++) {
          const a = Math.random() * Math.PI * 2;
          c.particles.push({ x: c.ex, y: c.ey, vx: Math.cos(a) * (3 + Math.random() * 4), vy: Math.sin(a) * (3 + Math.random() * 4), life: 40, maxLife: 40, color: enemyDef.color, size: 4, type: 'circle', gravity: 0.1, shrink: true });
        }
        for (let i = 0; i < 5; i++) {
          c.particles.push({ x: c.ex + (Math.random() - 0.5) * 40, y: c.ey + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 2, life: 60, maxLife: 60, color: '#f1c40f', size: 8, type: 'star', gravity: 0.05, shrink: false });
        }
        setTimeout(() => handleCombatEnd(true), 1500);
      }
      if (c.php <= 0 && !c.lost) {
        c.lost = true;
        setTimeout(() => handleCombatEnd(false), 1000);
      }

      // ===================== DRAW =====================
      ctx.save();
      if (c.shake > 0) {
        ctx.translate((Math.random() - 0.5) * c.shakeI * 2, (Math.random() - 0.5) * c.shakeI * 2);
      }

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, world.bgColor1);
      bgGrad.addColorStop(1, world.bgColor2);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < w; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, groundY); ctx.stroke();
      }
      for (let gy = 0; gy < groundY; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      // Ground
      ctx.strokeStyle = world.accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
      groundGrad.addColorStop(0, world.accentColor + '33');
      groundGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, groundY, w, h - groundY);

      // Ambient particles
      for (const a of c.ambient) {
        ctx.globalAlpha = a.alpha;
        ctx.fillStyle = world.accentColor;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // --- Draw Summons ---
      for (const s of c.summons) {
        const isE = (s as any).isEnemy;
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = isE ? '#ff4444' : '#44ff44';
        ctx.fillText(isE ? '💀' : '💀', s.x, s.y);
        // Small health indicator
        ctx.fillStyle = isE ? 'rgba(255,0,0,0.3)' : 'rgba(0,255,0,0.3)';
        ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, Math.PI * 2); ctx.fill();
      }

      // --- Draw Enemy ---
      if (!c.won) {
        const es = enemyDef.size;
        const eBob = Math.sin(c.frame * 0.05) * 3;
        const ey = c.ey + eBob;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(c.ex, c.ey + 25 * es, 20 * es, 6 * es, 0, 0, Math.PI * 2); ctx.fill();

        // Boss glow
        if (enemyDef.isBoss) {
          const bGlow = ctx.createRadialGradient(c.ex, ey, 0, c.ex, ey, 60 * es);
          bGlow.addColorStop(0, enemyDef.color + '44');
          bGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = bGlow;
          ctx.beginPath(); ctx.arc(c.ex, ey, 60 * es, 0, Math.PI * 2); ctx.fill();
        }

        // Body
        ctx.save();
        if (c.eCharging) {
          ctx.translate(c.ex, ey);
          ctx.rotate(Math.atan2(c.eChargeVY, c.eChargeVX));
          ctx.translate(-c.ex, -ey);
        }
        const bw = 22 * es;
        const bh = 28 * es;
        const lean = c.eAtkAnim > 0 ? (c.eFaceR ? 5 : -5) : 0;
        // Body shape
        ctx.fillStyle = enemyDef.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        const bodyX = c.ex - bw + lean;
        const bodyY = ey - bh * 0.5;
        ctx.beginPath();
        ctx.moveTo(bodyX + 5, bodyY + bh);
        ctx.lineTo(bodyX, bodyY + bh * 0.3);
        ctx.quadraticCurveTo(bodyX, bodyY, bodyX + bw * 0.5, bodyY);
        ctx.quadraticCurveTo(bodyX + bw, bodyY, bodyX + bw, bodyY + bh * 0.3);
        ctx.lineTo(bodyX + bw - 5, bodyY + bh);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Head
        const headR = 10 * es;
        ctx.beginPath(); ctx.arc(c.ex + lean, bodyY - headR * 0.3, headR, 0, Math.PI * 2);
        ctx.fillStyle = enemyDef.color; ctx.fill(); ctx.stroke();

        // Eyes
        const eyeDir = c.eFaceR ? 1 : -1;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(c.ex + lean + 4 * eyeDir * es, bodyY - headR * 0.4, 3 * es, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(c.ex + lean + 5 * eyeDir * es, bodyY - headR * 0.4, 1.5 * es, 0, Math.PI * 2); ctx.fill();

        // Emoji
        ctx.font = `${24 * es}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(enemyDef.emoji, c.ex + lean, ey + 5);

        // Boss crown
        if (enemyDef.isBoss) {
          const crownY = bodyY - headR * 1.5;
          ctx.fillStyle = '#f1c40f';
          ctx.beginPath();
          ctx.moveTo(c.ex + lean - 12 * es, crownY + 8 * es);
          ctx.lineTo(c.ex + lean - 12 * es, crownY);
          ctx.lineTo(c.ex + lean - 6 * es, crownY + 5 * es);
          ctx.lineTo(c.ex + lean, crownY - 3 * es);
          ctx.lineTo(c.ex + lean + 6 * es, crownY + 5 * es);
          ctx.lineTo(c.ex + lean + 12 * es, crownY);
          ctx.lineTo(c.ex + lean + 12 * es, crownY + 8 * es);
          ctx.closePath(); ctx.fill();
        }

        // Hurt flash
        if (c.eHurt > 0) {
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(c.ex - bw, bodyY, bw * 2, bh);
          ctx.globalAlpha = 1;
        }
        ctx.restore();

        // Enemy HP bar
        const ehpW = 120 * es;
        drawHealthBar(ctx, c.ex - ehpW / 2, ey - bh - 20, ehpW, 8, c.ehp, c.emaxhp, '#e74c3c', '#8b0000');
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${enemyDef.name} ${enemyDef.isBoss ? '👑' : ''}`, c.ex, ey - bh - 24);
      }

      // --- Draw Player ---
      if (!c.lost) {
        const bobY = Math.sin(c.pBob) * 3;
        const px = c.px;
        const py = c.py + bobY;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(px, c.py + 25, 18, 5, 0, 0, Math.PI * 2); ctx.fill();

        // Element glow
        const elColor = ELEMENT_COLORS[cls.element];
        const pGlow = ctx.createRadialGradient(px, py, 0, px, py, 40);
        pGlow.addColorStop(0, elColor + '33');
        pGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = pGlow;
        ctx.beginPath(); ctx.arc(px, py, 40, 0, Math.PI * 2); ctx.fill();

        // Body
        const bodyW = 18;
        const bodyH = 24;
        const lean = c.pAtkAnim > 0 ? (c.pFaceR ? 6 : -6) : 0;
        const bx = px - bodyW / 2 + lean;
        const by = py - bodyH * 0.3;

        ctx.fillStyle = cls.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        // Rounded rect body
        const r = 5;
        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + bodyW - r, by);
        ctx.arcTo(bx + bodyW, by, bx + bodyW, by + r, r);
        ctx.lineTo(bx + bodyW, by + bodyH - r);
        ctx.arcTo(bx + bodyW, by + bodyH, bx + bodyW - r, by + bodyH, r);
        ctx.lineTo(bx + r, by + bodyH);
        ctx.arcTo(bx, by + bodyH, bx, by + bodyH - r, r);
        ctx.lineTo(bx, by + r);
        ctx.arcTo(bx, by, bx + r, by, r);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Head
        const headR = 9;
        ctx.beginPath(); ctx.arc(px + lean, by - headR * 0.4, headR, 0, Math.PI * 2);
        ctx.fillStyle = '#fdbcb4'; ctx.fill(); ctx.stroke();

        // Eyes
        const eyeD = c.pFaceR ? 1 : -1;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(px + lean + 3 * eyeD, by - headR * 0.5, 1.5, 0, Math.PI * 2); ctx.fill();

        // Weapon
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2;
        const weaponX = px + (c.pFaceR ? 1 : -1) * 14 + lean;
        const weaponY = by + bodyH * 0.3;
        const swingAngle = c.pAtkAnim > 0 ? (c.pFaceR ? -0.8 : 0.8) : 0;
        ctx.save();
        ctx.translate(weaponX, weaponY);
        ctx.rotate(swingAngle + (c.pFaceR ? 0.3 : -0.3));
        switch (cls.id) {
          case 'guerreiro':
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.stroke();
            ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(-4, -20); ctx.lineTo(0, -28); ctx.lineTo(4, -20); ctx.closePath(); ctx.fill();
            break;
          case 'mago':
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -24); ctx.stroke();
            ctx.fillStyle = '#9b59b6'; ctx.beginPath(); ctx.arc(0, -27, 5, 0, Math.PI * 2); ctx.fill();
            break;
          case 'arqueiro':
            ctx.beginPath(); ctx.arc(0, -12, 14, -0.8, 0.8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, 0); ctx.stroke();
            break;
          case 'ladino':
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, -16); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(3, -16); ctx.stroke();
            break;
          case 'paladino':
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.stroke();
            ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(0, -28); ctx.lineTo(5, -20); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 1.5;
            ctx.strokeRect(c.pFaceR ? 5 : -12, -8, 7, 16);
            break;
          case 'necromante':
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -24); ctx.stroke();
            ctx.fillStyle = '#1abc9c'; ctx.beginPath(); ctx.arc(0, -27, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.font = '7px serif'; ctx.textAlign = 'center'; ctx.fillText('☠', 0, -25);
            break;
        }
        ctx.restore();

        // Fury/FuryNext indicator
        if (c.pFuryNext) {
          ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(px, py, 30 + Math.sin(c.frame * 0.1) * 5, 0, Math.PI * 2); ctx.stroke();
        }

        // Hurt flash
        if (c.pHurt > 0) {
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#fff';
          ctx.fillRect(px - 20, by - 10, 40, bodyH + 20);
          ctx.globalAlpha = 1;
        }

        // Player HP bar at bottom
        drawHealthBar(ctx, 15, groundY + 10, 150, 12, c.php, c.pmaxhp, '#2ecc71', '#1a7a3a');
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(`HP: ${Math.max(0, Math.ceil(c.php))} / ${c.pmaxhp}`, 18, groundY + 20);
      }

      // --- Draw Projectiles ---
      for (const p of c.projectiles) {
        // Trail
        for (let t = 0; t < p.trail.length; t++) {
          const alpha = (t / p.trail.length) * 0.4;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.trail[t].x, p.trail[t].y, p.size * 0.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Glow
        const pGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        pGlow.addColorStop(0, p.color + '66');
        pGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = pGlow;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2); ctx.fill();
        // Core
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2); ctx.fill();
      }

      // --- Draw Particles ---
      for (const p of c.particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        const sz = p.shrink ? p.size * alpha : p.size;

        switch (p.type) {
          case 'circle':
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2); ctx.fill();
            break;
          case 'spark':
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); ctx.stroke();
            break;
          case 'ring': {
            const ringR = (1 - alpha) * 80;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3 * alpha;
            ctx.beginPath(); ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2); ctx.stroke();
            break;
          }
          case 'text':
            ctx.fillStyle = p.color;
            ctx.font = `bold ${sz}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(p.text || '', p.x, p.y);
            break;
          case 'star':
            drawStar(ctx, p.x, p.y, 5, sz, sz * 0.4, p.color);
            break;
        }
      }
      ctx.globalAlpha = 1;

      // --- Battle timer ---
      const sec = Math.floor(c.time / 60);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(w / 2 - 30, 8, 60, 22);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${sec}s`, w / 2, 24);

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [screen, playerData.classId, doPlayerAttack, doPlayerAbility, handleCombatEnd]);

  // --- Keyboard ---
  useEffect(() => {
    if (screen !== 'combat') return;
    const down = (e: KeyboardEvent) => {
 const k = e.key.toLowerCase();
      combatRef.current?.keys.add(k);
      if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', 'j', 'k'].includes(k)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      combatRef.current?.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [screen]);

  // --- Equipment actions ---
  const equipItem = useCallback((item: Equipment) => {
    playSound(() => sfx.equip());
    setPlayerData(prev => {
      const slotIdx = item.type === 'weapon' ? 0 : item.type === 'armor' ? 1 : 2;
      const newEquip = [...prev.equipment];
      const old = newEquip[slotIdx];
      newEquip[slotIdx] = item;
      const newInv = prev.inventory.filter(i => i.id !== item.id || i !== item);
      if (old) newInv.push(old);
      return { ...prev, equipment: newEquip, inventory: newInv };
    });
  }, [playSound]);

  const sellItem = useCallback((item: Equipment) => {
    playSound(() => sfx.coinClink());
    setPlayerData(prev => ({
      ...prev,
      gold: prev.gold + item.sellPrice,
      inventory: prev.inventory.filter(i => i !== item),
    }));
  }, [playSound]);

  const unequipItem = useCallback((slotIdx: number) => {
    playSound(() => sfx.click());
    setPlayerData(prev => {
      const newEquip = [...prev.equipment];
      const item = newEquip[slotIdx];
      if (!item) return prev;
      newEquip[slotIdx] = null;
      return { ...prev, equipment: newEquip, inventory: [...prev.inventory, item] };
    });
  }, [playSound]);

  const buyShopItem = useCallback((item: ShopItem) => {
    if (playerData.gold < item.buyPrice) return;
    playSound(() => sfx.coinClink());
    setPlayerData(prev => ({
      ...prev,
      gold: prev.gold - item.buyPrice,
      inventory: [...prev.inventory, { id: item.id + '_' + Date.now(), name: item.name, type: item.type, rarity: item.rarity, atk: item.atk, def: item.def, hp: item.hp, spd: item.spd, sellPrice: item.sellPrice, element: item.element }],
    }));
  }, [playerData.gold, playSound]);

  const handlePvP = useCallback(() => {
    playSound(() => sfx.battleStart());
    const oppLvl = Math.max(1, playerData.level + Math.floor(Math.random() * 5) - 2);
    const winChance = Math.min(0.85, Math.max(0.15, 0.5 + (playerData.level - oppLvl) * 0.06));
    const won = Math.random() < winChance;
    if (won) {
      const goldWin = 50 + oppLvl * 20;
      setPlayerData(prev => ({ ...prev, pvpWins: prev.pvpWins + 1, gold: prev.gold + goldWin }));
      setPvpResult({ won: true, lvl: oppLvl, gold: goldWin });
      playSound(() => sfx.victoryFanfare());
    } else {
      setPvpResult({ won: false, lvl: oppLvl, gold: 0 });
      playSound(() => sfx.lose());
    }
  }, [playerData.level, playSound]);

  const handleReset = useCallback(() => {
    if (!confirm('Tem certeza que deseja resetar todo o progresso?')) return;
    localStorage.removeItem(SAVE_KEY);
    setPlayerData(createDefaultPlayer());
    setSelectedClass('');
    setScreen('menu');
  }, []);

  const cls = CLASSES.find(c => c.id === playerData.classId);
  const stats = cls ? calcStats(playerData) : { hp: 0, atk: 0, def: 0, spd: 0 };
  const totalStars = Object.values(playerData.completedLevels).reduce((a, b) => a + b, 0);

  // ===================== RENDER SCREENS =====================
  const btnClass = "px-4 py-2 rounded-lg font-bold text-sm transition-all";

  // --- MENU ---
  const renderMenu = () => (
    <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-6xl mb-4">⚔️</motion.div>
      <h1 className="text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">Campanha RPG</h1>
      <p className="text-gray-400 mb-8 text-sm">Uma épica aventura espera por você</p>
      <div className="flex flex-col gap-3 w-60">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSound(() => sfx.click()); setScreen('classSelect'); }}
          className={`${btnClass} bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40`}>Nova Aventura</motion.button>
        {playerData.classId && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSound(() => sfx.click()); setScreen('campaignMap'); }}
            className={`${btnClass} bg-gray-700 text-white hover:bg-gray-600`}>Continuar</motion.button>
        )}
      </div>
      <div className="mt-8 text-xs text-gray-500 text-center space-y-1">
        <p>🎮 WASD/Setas: Mover | Espaço/J: Atacar | E/K: Habilidade</p>
        <p>📱 Toque nos botões para jogar no celular</p>
      </div>
    </motion.div>
  );

  // --- CLASS SELECT ---
  const renderClassSelect = () => (
    <motion.div key="classSelect" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 z-20 bg-gray-950/95 overflow-y-auto p-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-black text-center text-white mb-1">Escolha sua Classe</h2>
        <p className="text-gray-400 text-center text-sm mb-6">Cada classe tem habilidades e passivas únicas</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {CLASSES.map(c => (
            <motion.button key={c.id} whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }}
              onClick={() => { playSound(() => sfx.click()); setSelectedClass(c.id); }}
              className={`p-3 rounded-xl border-2 text-left transition-all ${selectedClass === c.id ? 'border-white bg-white/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{c.emoji}</span>
                <span className="font-bold text-white" style={{ color: c.color }}>{c.name}</span>
              </div>
              <div className="flex gap-2 text-xs mb-1">
                <span className="bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded">❤️{c.baseHP}</span>
                <span className="bg-orange-900/50 text-orange-300 px-1.5 py-0.5 rounded">⚔️{c.baseATK}</span>
                <span className="bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">🛡{c.baseDEF}</span>
              </div>
            </motion.button>
          ))}
        </div>
        {selectedClass && (() => {
          const sc = CLASSES.find(c => c.id === selectedClass)!;
          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-800/80 rounded-xl p-4 mb-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">{sc.emoji}</span>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: sc.color }}>{sc.name}</h3>
                  <p className="text-xs text-gray-400">Elemento: {sc.element.charAt(0).toUpperCase() + sc.element.slice(1)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-900/50 rounded-lg p-2">
                  <p className="text-yellow-400 font-bold mb-1">⚡ {sc.abilityName}</p>
                  <p className="text-gray-300 text-xs">{sc.abilityDesc}</p>
                  <p className="text-gray-500 text-xs mt-1">Cooldown: {sc.abilityCooldown / 60}s</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2">
                  <p className="text-green-400 font-bold mb-1">🌿 Passiva</p>
                  <p className="text-gray-300 text-xs">{sc.passiveDesc}</p>
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-400">
                <span>❤️ HP: {sc.baseHP}</span>
                <span>⚔️ ATK: {sc.baseATK}</span>
                <span>🛡️ DEF: {sc.baseDEF}</span>
                <span>💨 SPD: {sc.baseSPD}</span>
              </div>
            </motion.div>
          );
        })()}
        <div className="text-center">
          <motion.button whileTap={{ scale: 0.95 }} disabled={!selectedClass}
            onClick={() => {
              if (!selectedClass) return;
              playSound(() => sfx.click());
              setPlayerData(createDefaultPlayer(selectedClass));
              setSelectedWorld(0);
              setScreen('campaignMap');
            }}
            className={`${btnClass} bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950 shadow-lg ${!selectedClass ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-yellow-500/40'}`}>Iniciar Aventura</motion.button>
        </div>
      </div>
    </motion.div>
  );

  // --- CAMPAIGN MAP ---
  const renderCampaignMap = () => {
    const isWorldUnlocked = (idx: number) => {
 if (idx === 0) return true;
      const req = WORLDS[idx].unlockRequirement;
 const reqIdx = WORLDS.findIndex(w => w.id === req);
      if (reqIdx === -1) return false;
      return Object.keys(playerData.completedLevels).some(k => k.startsWith(`${reqIdx}-`));
    };
    const isLevelUnlocked = (wIdx: number, lIdx: number) => {
      if (lIdx === 0) return isWorldUnlocked(wIdx);
      return !!playerData.completedLevels[`${wIdx}-${lIdx - 1}`];
    };

    return (
      <motion.div key="campaignMap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-20 bg-gray-950/95 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4">
          <h2 className="text-2xl font-black text-white mb-1 text-center">🗺️ Mapa da Campanha</h2>
          <div className="flex gap-2 justify-center text-xs text-gray-400 mb-4">
            <span>⭐ {totalStars} estrelas</span>
            <span>🏆 {playerData.pvpWins} vitórias PVP</span>
            <span>💀 {playerData.kills} abates</span>
          </div>

          {/* World Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {WORLDS.map((world, idx) => {
              const unlocked = isWorldUnlocked(idx);
              return (
                <button key={world.id}
                  onClick={() => { if (unlocked) { playSound(() => sfx.tabClick()); setSelectedWorld(idx); } }}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                    selectedWorld === idx ? 'border-white bg-white/10 text-white' :
                    unlocked ? 'border-gray-700 text-gray-300 hover:border-gray-500' : 'border-gray-800 text-gray-600 cursor-not-allowed'}`}>
                  {unlocked ? world.emoji : '🔒'} {world.name}
                </button>
              );
            })}
          </div>

          {/* World Info */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">{WORLDS[selectedWorld].emoji} {WORLDS[selectedWorld].name}</h3>
            <p className="text-gray-400 text-sm">{WORLDS[selectedWorld].description}</p>
          </div>

          {/* Level Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {WORLDS[selectedWorld].levels.map((level, lIdx) => {
              const unlocked = isLevelUnlocked(selectedWorld, lIdx);
              const stars = playerData.completedLevels[`${selectedWorld}-${lIdx}`] || 0;
              return (
                <motion.button key={lIdx} whileTap={unlocked ? { scale: 0.97 } : {}}
                  onClick={() => {
                    if (!unlocked) return;
                    playSound(() => sfx.click());
                    startCombat(selectedWorld, lIdx);
                  }}
                  disabled={!unlocked}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    unlocked ? 'border-gray-600 bg-gray-800/60 hover:border-gray-400 cursor-pointer' : 'border-gray-800 bg-gray-900/40 opacity-50 cursor-not-allowed'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{unlocked ? level.enemy.emoji : '🔒'}</span>
                    <span className="font-bold text-white text-sm">{unlocked ? level.enemy.name : 'Bloqueado'}</span>
                    {level.enemy.isBoss && unlocked && <span className="text-xs bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded font-bold">BOSS</span>}
                  </div>
                  {unlocked && (
                    <>
                      <div className="text-xs text-gray-400 mb-1">
                        ❤️{level.enemy.hp} ⚔️{level.enemy.atk} 🛡️{level.enemy.def}
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map(s => (
                          <Star key={s} size={12} className={s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                        ))}
                        {level.reward && <span className="text-xs ml-auto" style={{ color: RARITY_COLORS[level.reward.rarity] }}>{level.reward.name}</span>}
                      </div>
                    </>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSound(() => sfx.click()); setScreen('inventory'); }}
              className={`${btnClass} bg-blue-600 text-white flex items-center gap-1.5`}><Backpack size={16} /> Inventário</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSound(() => sfx.click()); setScreen('shop'); }}
              className={`${btnClass} bg-green-600 text-white flex items-center gap-1.5`}><ShoppingBag size={16} /> Loja</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSound(() => sfx.click()); setPvpResult(null); setScreen('pvp'); }}
              className={`${btnClass} bg-purple-600 text-white flex items-center gap-1.5`}><Swords size={16} /> Desafio PVP</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleReset}
              className={`${btnClass} bg-red-700 text-white flex items-center gap-1.5`}><RotateCcw size={16} /> Resetar</motion.button>
          </div>

          {/* Player Stats Summary */}
          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 text-sm text-gray-300">
            <div className="flex flex-wrap gap-4">
              <span>{cls?.emoji} {cls?.name} Nv.{playerData.level}</span>
              <span>❤️ {stats.hp}</span>
              <span>⚔️ {stats.atk}</span>
              <span>🛡️ {stats.def}</span>
              <span>💨 {stats.spd}</span>
              <span>💰 {playerData.gold} ouro</span>
              <span>✨ {playerData.xp}/{playerData.xpToNext} XP</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // --- INVENTORY ---
  const renderInventory = () => {
    const slotNames: { name: string; icon: string; type: EquipSlot }[] = [
      { name: 'Arma', icon: '⚔️', type: 'weapon' },
      { name: 'Armadura', icon: '🛡️', type: 'armor' },
      { name: 'Acessório', icon: '💍', type: 'accessory' },
    ];
    return (
      <motion.div key="inventory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-30 bg-gray-950/95 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-white flex items-center gap-2"><Backpack size={24} /> Inventário</h2>
            <button onClick={() => { playSound(() => sfx.click()); setScreen('campaignMap'); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
          </div>

          {/* Equipment Slots */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {slotNames.map((slot, idx) => {
              const item = playerData.equipment[idx];
              return (
                <div key={slot.type} className="bg-gray-800 rounded-xl p-3 border-2 border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">{slot.icon} {slot.name}</p>
                  {item ? (
                    <>
                      <p className="font-bold text-sm" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</p>
                      <p className="text-xs text-gray-400">{RARITY_NAMES[item.rarity]}</p>
                      <div className="text-xs text-gray-300 mt-1 space-y-0.5">
                        {item.atk > 0 && <p>⚔️+{item.atk}</p>}
                        {item.def > 0 && <p>🛡+{item.def}</p>}
                        {item.hp > 0 && <p>❤️+{item.hp}</p>}
                        {item.spd !== 0 && <p>💨{item.spd > 0 ? '+' : ''}{item.spd}</p>}
                      </div>
                      <button onClick={() => unequipItem(idx)} className="mt-2 text-xs text-red-400 hover:text-red-300">Desequipar</button>
                    </>
                  ) : (
                    <p className="text-gray-600 text-sm">Vazio</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Inventory Items */}
          <h3 className="text-lg font-bold text-white mb-3">Itens ({playerData.inventory.length})</h3>
          {playerData.inventory.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum item no inventário.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {playerData.inventory.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="bg-gray-800/80 rounded-lg p-3 border-l-4" style={{ borderColor: RARITY_COLORS[item.rarity] }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</p>
                      <p className="text-xs text-gray-400">{RARITY_NAMES[item.rarity]} • {item.type === 'weapon' ? '⚔️ Arma' : item.type === 'armor' ? '🛡️ Armadura' : '💍 Acessório'}</p>
                      <div className="flex gap-2 text-xs text-gray-300 mt-1">
                        {item.atk > 0 && <span>⚔️+{item.atk}</span>}
                        {item.def > 0 && <span>🛡+{item.def}</span>}
                        {item.hp > 0 && <span>❤️+{item.hp}</span>}
                        {item.spd !== 0 && <span>💨{item.spd > 0 ? '+' : ''}{item.spd}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => equipItem(item)} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-500">Equipar</button>
                      <button onClick={() => sellItem(item)} className="text-xs bg-yellow-700 text-white px-2 py-1 rounded hover:bg-yellow-600">Vender ({item.sellPrice}💰)</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // --- SHOP ---
  const renderShop = () => (
    <motion.div key="shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 bg-gray-950/95 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-white flex items-center gap-2"><ShoppingBag size={24} /> Loja</h2>
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 font-bold">💰 {playerData.gold}</span>
            <button onClick={() => { playSound(() => sfx.click()); setScreen('campaignMap'); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SHOP_ITEMS.map((item) => (
            <div key={item.id} className="bg-gray-800/80 rounded-xl p-3 border border-gray-700">
              <p className="font-bold text-sm" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</p>
              <p className="text-xs text-gray-400 mb-2">{RARITY_NAMES[item.rarity]} • {item.type === 'weapon' ? '⚔️' : item.type === 'armor' ? '🛡️' : '💍'}</p>
              <div className="flex gap-2 text-xs text-gray-300 mb-2">
                {item.atk > 0 && <span>⚔️+{item.atk}</span>}
                {item.def > 0 && <span>🛡+{item.def}</span>}
                {item.hp > 0 && <span>❤️+{item.hp}</span>}
                {item.spd !== 0 && <span>💨{item.spd > 0 ? '+' : ''}{item.spd}</span>}
              </div>
              <button onClick={() => buyShopItem(item)}
                disabled={playerData.gold < item.buyPrice}
                className={`w-full text-xs py-1.5 rounded font-bold transition-all ${playerData.gold >= item.buyPrice ? 'bg-yellow-600 text-gray-950 hover:bg-yellow-500' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                Comprar ({item.buyPrice}💰)
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  // --- PVP ---
  const renderPvP = () => (
    <motion.div key="pvp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 bg-gray-950/95 flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 border border-gray-700 text-center">
        <div className="text-4xl mb-3">⚔️</div>
        <h2 className="text-xl font-black text-white mb-2">Desafio PVP</h2>
        <p className="text-gray-400 text-sm mb-4">Desafie um jogador aleatório! A vitória depende do seu nível e equipamento.</p>
        {pvpResult ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-4">
            <div className={`text-2xl font-black ${pvpResult.won ? 'text-yellow-400' : 'text-red-400'}`}>
              {pvpResult.won ? '🏆 VITÓRIA!' : '💀 DERROTA'}
            </div>
            <p className="text-gray-400 text-sm mt-1">Oponente Nv.{pvpResult.lvl}</p>
            {pvpResult.won && <p className="text-yellow-400 text-sm">+{pvpResult.gold}💰</p>}
          </motion.div>
        ) : null}
        <div className="flex flex-col gap-2">
          <motion.button whileTap={{ scale: 0.95 }} onClick={handlePvP}
            className={`${btnClass} bg-purple-600 text-white hover:bg-purple-500`}>Desafiar Jogador</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSound(() => sfx.click()); setScreen('campaignMap'); }}
            className={`${btnClass} bg-gray-700 text-white hover:bg-gray-600`}>Voltar</motion.button>
        </div>
      </div>
    </motion.div>
  );

  // --- VICTORY ---
  const renderVictory = () => (
    battleResult && (
      <motion.div key="victory" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
        <div className="bg-gray-900/95 rounded-2xl p-6 max-w-sm w-full mx-4 border border-yellow-600/50 text-center">
          <motion.h2 className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent mb-3"
            animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>VITÓRIA!</motion.h2>
          <div className="flex justify-center gap-2 mb-3">
            {[1, 2, 3].map(s => (
              <motion.div key={s} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: s * 0.2 }}>
                <Star size={28} className={s <= battleResult.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
              </motion.div>
            ))}
          </div>
          <div className="text-sm text-gray-300 space-y-1 mb-3">
            <p>⏱️ Tempo: {battleResult.time.toFixed(1)}s</p>
            <p>📊 Pontuação: {battleResult.score}</p>
            <p>✨ +{battleResult.xp} XP</p>
            <p>💰 +{battleResult.gold} ouro</p>
            {battleResult.reward && (
              <p className="mt-1">
                <span className="font-bold">Recompensa:</span>{' '}
                <span style={{ color: RARITY_COLORS[battleResult.reward.rarity] }}>{battleResult.reward.name}</span>
              </p>
            )}
            {battleResult.leveledUp && (
              <p className="text-green-400 font-bold mt-1">⬆️ Subiu para Nível {battleResult.newLevel}!</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => {
                playSound(() => sfx.click());
                const nextLvl = battleResult.levelIdx + 1;
                const nextWorld = battleResult.worldIdx;
                if (nextLvl < WORLDS[nextWorld].levels.length) {
                  startCombat(nextWorld, nextLvl);
                } else {
                  setScreen('campaignMap');
                }
              }}
              className={`${btnClass} bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-950`}>Próximo Nível</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSound(() => sfx.click()); setScreen('campaignMap'); }}
              className={`${btnClass} bg-gray-700 text-white hover:bg-gray-600`}>Mapa da Campanha</motion.button>
          </div>
        </div>
      </motion.div>
    )
  );

  // --- DEFEAT ---
  const renderDefeat = () => (
    <motion.div key="defeat" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900/95 rounded-2xl p-6 max-w-sm w-full mx-4 border border-red-600/50 text-center">
        <h2 className="text-3xl font-black text-red-500 mb-4">DERROTA</h2>
        <p className="text-gray-400 text-sm mb-6">Você foi derrotado. Tente novamente!</p>
        <div className="flex flex-col gap-2">
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => { playSound(() => sfx.click()); setBattleResult(null); startCombat(combatRef.current?.worldIdx ?? 0, combatRef.current?.levelIdx ?? 0); }}
            className={`${btnClass} bg-red-600 text-white hover:bg-red-500`}>Tentar Novamente</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { playSound(() => sfx.click()); setScreen('campaignMap'); }}
            className={`${btnClass} bg-gray-700 text-white hover:bg-gray-600`}>Mapa da Campanha</motion.button>
        </div>
      </div>
    </motion.div>
  );

  // --- BOSS INTRO ---
  const renderBossIntro = () => {
    const c = combatRef.current;
    if (!c) return null;
    const enemyDef = WORLDS[c.worldIdx].levels[c.levelIdx].enemy;
    return (
      <motion.div key="bossIntro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 8 }}
            className="text-7xl mb-4">{enemyDef.emoji}</motion.div>
          <motion.h2 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-3xl font-black text-red-500 mb-2">{enemyDef.name}</motion.h2>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="space-y-1 mb-4">
            <p className="text-yellow-400 font-bold">👑 BOSS</p>
            {enemyDef.abilities && enemyDef.abilities.map((ab, i) => (
              <p key={i} className="text-gray-400 text-sm">⚡ {ab}</p>
            ))}
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}
            className="text-gray-500 text-sm">Prepare-se...</motion.div>
        </div>
      </motion.div>
    );
  };

  // --- LEVEL UP ---
  const renderLevelUp = () => (
    levelUpInfo && (
      <motion.div key="levelUp" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-25 flex items-center justify-center bg-black/70">
        <div className="text-center">
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
            className="text-6xl mb-3">⬆️</motion.div>
          <h2 className="text-3xl font-black text-green-400 mb-2">NÍVEL {levelUpInfo.to}!</h2>
          <p className="text-gray-300">Nível {levelUpInfo.from} → Nível {levelUpInfo.to}</p>
          <div className="flex gap-3 justify-center mt-3 text-sm text-gray-300">
            <span className="text-green-400">❤️+15</span>
            <span className="text-red-400">⚔️+3</span>
            <span className="text-blue-400">🛡+2</span>
            <span className="text-cyan-400">💨+0.5</span>
          </div>
        </div>
      </motion.div>
    )
  );

  // --- TOP BAR ---
  const renderTopBar = () => (
    (screen === 'combat' || screen === 'campaignMap' || screen === 'victory' || screen === 'defeat' || screen === 'bossIntro' || screen === 'levelUp') && (
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-1.5 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-white">
          <span>{cls?.emoji}</span>
          <span className="font-bold">{cls?.name}</span>
          <span className="text-gray-400">Nv.{playerData.level}</span>
          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(playerData.xp / playerData.xpToNext) * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-white">
          <span className="text-yellow-400">💰 {playerData.gold}</span>
          <span className="text-gray-400">💀 {playerData.kills}</span>
          <button onClick={() => { playSound(() => sfx.click()); setSoundOn(p => !p); }}
            className="p-1 rounded hover:bg-white/10">{soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}</button>
          <button onClick={() => { playSound(() => sfx.click()); containerRef.current?.requestFullscreen?.(); }}
            className="p-1 rounded hover:bg-white/10"><Maximize2 size={14} /></button>
        </div>
      </div>
    )
  );

  // --- COMBAT HUD ---
  const renderCombatHUD = () => {
    const c = combatRef.current;
    if (!c) return null;
    const charCls = CLASSES.find(cl => cl.id === playerData.classId);
    if (!charCls) return null;
    const abilPct = Math.max(0, 1 - c.pAbilCD / charCls.abilityCooldown);
    return (
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-end justify-center gap-3 p-3 pointer-events-none">
        <button
          onClick={doPlayerAttack}
          className="pointer-events-auto w-16 h-16 rounded-full bg-red-600/80 text-white font-bold text-xs flex items-center justify-center shadow-lg active:scale-90 transition-transform border-2 border-red-400">
          ⚔️
        </button>
        <div className="relative pointer-events-auto">
          <button
            onClick={doPlayerAbility}
            disabled={c.pAbilCD > 0}
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-lg transition-transform border-2 active:scale-90 ${c.pAbilCD > 0 ? 'bg-gray-700/80 border-gray-500 opacity-60' : 'bg-gradient-to-b from-purple-600 to-purple-800 border-purple-400'}`}>
            <span className="text-lg">⚡</span>
            <span className="text-[9px] text-white font-bold">{charCls.abilityName.split(' ').slice(0, 2).join(' ')}</span>
          </button>
          {c.pAbilCD > 0 && (
            <div className="absolute inset-0 rounded-full border-4 border-t-purple-400" style={{
              clipPath: `inset(0 0 ${100 - abilPct * 100}% 0)`,
            }} />
          )}
        </div>
      </div>
    );
  };

  // ===================== MAIN RETURN =====================
  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[500px] bg-gray-950 overflow-hidden select-none rounded-xl">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {renderTopBar()}
      {screen === 'combat' && renderCombatHUD()}
      <AnimatePresence>
        {screen === 'menu' && renderMenu()}
        {screen === 'classSelect' && renderClassSelect()}
        {screen === 'campaignMap' && renderCampaignMap()}
        {screen === 'inventory' && renderInventory()}
        {screen === 'shop' && renderShop()}
        {screen === 'pvp' && renderPvP()}
        {screen === 'victory' && renderVictory()}
        {screen === 'defeat' && renderDefeat()}
        {screen === 'bossIntro' && renderBossIntro()}
        {screen === 'levelUp' && renderLevelUp()}
      </AnimatePresence>
    </div>
  );
}