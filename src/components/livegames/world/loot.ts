// @ts-nocheck
// ============================================================
// BATEU WORLD — ERA DAS LENDAS · LOOT & MELHORIAS
// Raridades Comum→Mítico, affixos, geração por nível/tier e
// OFICINA de melhorias +1..+12 (fragmentos, falhas, brilho).
// ============================================================

import { RARITY_META, AFFIXES, SLOTS, type LootItem } from "./mmo";

const SLOT_NAMES: Record<string, string[]> = {
  arma: ["Lâmina", "Machado", "Cajado", "Arco", "Marty", "Foice", "Marreta", "Punhal"],
  armadura: ["Couraça", "Malha", "Túnica", "Peitoral", "Vestes"],
  elmo: ["Elmo", "Capacete", "Coroa", "Capuz"],
  amuleto: ["Amuleto", "Talismã", "Colar", "Relíquia"],
  botas: ["Botas", "Grevas", "Sandálias", "Passos"],
  anel: ["Anel", "Selo", "Círculo", "Aura"],
};

const SLOT_EMOJI: Record<string, string> = {
  arma: "⚔️", armadura: "🛡️", elmo: "⛑️", amuleto: "📿", botas: "🥾", anel: "💍",
};

let itemId = 1;

export function rollLoot(tier: number, isBoss: boolean, isElite: boolean, level: number): LootItem | null {
  const chance = isBoss ? 1 : isElite ? 0.5 : [0.085, 0.105, 0.125, 0.15, 0.18, 0.22][tier - 1] ?? 0.1;
  if (Math.random() > chance) return null;
  const roll = Math.random() + tier * 0.06 + (isBoss ? 0.34 : 0) + (isElite ? 0.16 : 0);
  let rarity = 0;
  if (roll > 1.9) rarity = 5; else if (roll > 1.55) rarity = 4;
  else if (roll > 1.18) rarity = 3; else if (roll > 0.86) rarity = 2;
  else if (roll > 0.55) rarity = 1;

  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)] as any;
  const baseName = SLOT_NAMES[slot][Math.floor(Math.random() * SLOT_NAMES[slot].length)];
  const rm = RARITY_META[rarity];
  const power = 1 + level * 0.14 + rarity * 0.5 + (isBoss ? 0.5 : 0) + (isElite ? 0.2 : 0);

  const stats: Record<string, number> = {};
  const nAff = rm.affixes;
  const pool = [...AFFIXES];
  for (let i = 0; i < nAff && pool.length; i++) {
    const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    stats[a.stat] = Math.round(a.per * power * (0.8 + Math.random() * 0.5) * 10) / 10;
  }

  return {
    id: `it${itemId++}`,
    slot,
    name: `${baseName} ${rm.name}`,
    emoji: SLOT_EMOJI[slot] || "📦",
    rarity,
    level,
    stats,
    up: 0,
  };
}

export function statLabel(k: string): string {
  return {
    atk: "Ataque", hp: "Vida", def: "Defesa", spd: "Velocidade",
    crit: "Crítico %", mana: "Mana", leech: "Roubo de vida %",
  }[k] || k;
}

/** Aplica os stats de um item (com melhorias) a um acumulador. */
export function applyItemStats(item: LootItem | null, acc: Record<string, number>) {
  if (!item) return;
  const upMult = 1 + (item.up || 0) * 0.12;
  for (const [k, v] of Object.entries(item.stats || {})) {
    acc[k] = (acc[k] || 0) + v * upMult;
  }
}

/** Custo em fragmentos para melhorar. */
export function upgradeCost(up: number): number {
  return 3 + up * 3;
}

/** Probabilidade de sucesso (100% até +6, depois cai). */
export function upgradeChance(up: number): number {
  if (up < 6) return 1;
  return [0.72, 0.6, 0.48, 0.36, 0.28, 0.2][up - 6] ?? 0.2;
}

export function upgradeGlow(up: number): string {
  if (up >= 12) return "#ec4899";
  if (up >= 9) return "#f59e0b";
  if (up >= 6) return "#38bdf8";
  return "";
}
