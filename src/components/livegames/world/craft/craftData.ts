// ============================================================
// BATEUCRAFT — Dados do mundo voxel (REA de Minecraft)
// Blocos, itens, ferramentas, receitas e texturas pixel-art
// procedurais (0% direitos de autor — arte própria gerada em canvas)
// ============================================================

// ── IDs dos blocos ──────────────────────────────────────────
export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, BEDROCK: 5, SAND: 6,
  WATER: 7, LOG: 8, LEAVES: 9, PLANKS: 10, COAL_ORE: 11, IRON_ORE: 12,
  GOLD_ORE: 13, DIAMOND_ORE: 14, TABLE: 15, FURNACE: 16, FURNACE_LIT: 17,
  TORCH: 18, GLASS: 19, SNOW: 20, GRAVEL: 21, BRICK: 22, WOOL: 23,
  CHEST: 24, CACTUS: 25, CRYSTAL_ORE: 26, SANDSTONE: 27,
} as const;

// ── Tiles do atlas (índices) ────────────────────────────────
export const T = {
  GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, COBBLE: 4, BEDROCK: 5,
  SAND: 6, WATER: 7, LOG_SIDE: 8, LOG_TOP: 9, LEAVES: 10, PLANKS: 11,
  COAL: 12, IRON: 13, GOLD: 14, DIAMOND: 15, TABLE_TOP: 16, TABLE_SIDE: 17,
  FURN_FRONT: 18, FURN_SIDE: 19, FURN_LIT: 20, TORCH: 21, GLASS: 22,
  SNOW_TOP: 23, SNOW_SIDE: 24, GRAVEL: 25, BRICK: 26, WOOL: 27,
  CHEST_SIDE: 28, CHEST_FRONT: 29, CHEST_TOP: 30, CACTUS_SIDE: 31,
  CACTUS_TOP: 32, CRYSTAL: 33, SANDSTONE: 34, CRACK0: 40, // 40..49 = rachas
} as const;

export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 7; // 56 slots de 16px → 128×112
export const TILE_PX = 16;

export interface BlockDef {
  name: string;
  hard: number;                       // segundos com a mão
  tool: "pickaxe" | "axe" | "shovel" | "any";
  tier: number;                       // tier mínimo da ferramenta para DROP
  drop?: { b?: number; i?: string; n?: number }[] | null;
  solid: boolean;
  opaque: boolean;                    // false → rende no mesh transparente
  liquid?: boolean;
  light?: number;                     // emite luz (tocha/cristal)
  tiles: [number, number, number];    // [topo, fundo, lado]
  soundPitch?: number;
}

const ORE_DROP = (i: string, n = 1) => [{ i, n }];
export const BLOCKS: Record<number, BlockDef> = {
  [B.GRASS]: { name: "Relva", hard: 0.65, tool: "shovel", tier: 0, drop: [{ b: B.DIRT }], solid: true, opaque: true, tiles: [T.GRASS_TOP, T.DIRT, T.GRASS_SIDE], soundPitch: 1.1 },
  [B.DIRT]: { name: "Terra", hard: 0.55, tool: "shovel", tier: 0, drop: [{ b: B.DIRT }], solid: true, opaque: true, tiles: [T.DIRT, T.DIRT, T.DIRT] },
  [B.STONE]: { name: "Pedra", hard: 1.6, tool: "pickaxe", tier: 0, drop: [{ b: B.COBBLE }], solid: true, opaque: true, tiles: [T.STONE, T.STONE, T.STONE] },
  [B.COBBLE]: { name: "Pedra Britada", hard: 1.9, tool: "pickaxe", tier: 0, drop: [{ b: B.COBBLE }], solid: true, opaque: true, tiles: [T.COBBLE, T.COBBLE, T.COBBLE] },
  [B.BEDROCK]: { name: "Rocha-Mãe", hard: Infinity, tool: "any", tier: 9, drop: null, solid: true, opaque: true, tiles: [T.BEDROCK, T.BEDROCK, T.BEDROCK] },
  [B.SAND]: { name: "Areia", hard: 0.55, tool: "shovel", tier: 0, drop: [{ b: B.SAND }], solid: true, opaque: true, tiles: [T.SAND, T.SAND, T.SAND] },
  [B.WATER]: { name: "Água", hard: Infinity, tool: "any", tier: 9, drop: null, solid: false, opaque: false, liquid: true, tiles: [T.WATER, T.WATER, T.WATER] },
  [B.LOG]: { name: "Tronco", hard: 1.9, tool: "axe", tier: 0, drop: [{ b: B.LOG }], solid: true, opaque: true, tiles: [T.LOG_TOP, T.LOG_TOP, T.LOG_SIDE] },
  [B.LEAVES]: { name: "Folhas", hard: 0.25, tool: "any", tier: 0, drop: [{ i: "apple", n: 1 }], solid: true, opaque: true, tiles: [T.LEAVES, T.LEAVES, T.LEAVES], soundPitch: 1.6 },
  [B.PLANKS]: { name: "Tábuas", hard: 1.7, tool: "axe", tier: 0, drop: [{ b: B.PLANKS }], solid: true, opaque: true, tiles: [T.PLANKS, T.PLANKS, T.PLANKS] },
  [B.COAL_ORE]: { name: "Minério de Carvão", hard: 2.6, tool: "pickaxe", tier: 0, drop: ORE_DROP("coal"), solid: true, opaque: true, tiles: [T.COAL, T.COAL, T.COAL] },
  [B.IRON_ORE]: { name: "Minério de Ferro", hard: 2.8, tool: "pickaxe", tier: 1, drop: [{ b: B.IRON_ORE }], solid: true, opaque: true, tiles: [T.IRON, T.IRON, T.IRON] },
  [B.GOLD_ORE]: { name: "Minério de Ouro", hard: 2.9, tool: "pickaxe", tier: 2, drop: [{ b: B.GOLD_ORE }], solid: true, opaque: true, tiles: [T.GOLD, T.GOLD, T.GOLD] },
  [B.DIAMOND_ORE]: { name: "Minério de Diamante", hard: 3.1, tool: "pickaxe", tier: 2, drop: ORE_DROP("diamond"), solid: true, opaque: true, tiles: [T.DIAMOND, T.DIAMOND, T.DIAMOND] },
  [B.CRYSTAL_ORE]: { name: "Cristal Bateu", hard: 3.6, tool: "pickaxe", tier: 3, drop: ORE_DROP("crystal"), solid: true, opaque: true, light: 7, tiles: [T.CRYSTAL, T.CRYSTAL, T.CRYSTAL] },
  [B.TABLE]: { name: "Mesa de Craft", hard: 2.2, tool: "axe", tier: 0, drop: [{ b: B.TABLE }], solid: true, opaque: true, tiles: [T.TABLE_TOP, T.PLANKS, T.TABLE_SIDE] },
  [B.FURNACE]: { name: "Fornalha", hard: 3.2, tool: "pickaxe", tier: 0, drop: [{ b: B.FURNACE }], solid: true, opaque: true, tiles: [T.FURN_SIDE, T.FURN_SIDE, T.FURN_SIDE] },
  [B.FURNACE_LIT]: { name: "Fornalha", hard: 3.2, tool: "pickaxe", tier: 0, drop: [{ b: B.FURNACE }], solid: true, opaque: true, light: 9, tiles: [T.FURN_SIDE, T.FURN_SIDE, T.FURN_LIT] },
  [B.TORCH]: { name: "Tocha", hard: 0.05, tool: "any", tier: 0, drop: [{ b: B.TORCH }], solid: false, opaque: false, light: 13, tiles: [T.TORCH, T.TORCH, T.TORCH] },
  [B.GLASS]: { name: "Vidro", hard: 0.35, tool: "any", tier: 0, drop: null, solid: true, opaque: false, tiles: [T.GLASS, T.GLASS, T.GLASS] },
  [B.SNOW]: { name: "Relva Nevada", hard: 0.65, tool: "shovel", tier: 0, drop: [{ b: B.DIRT }], solid: true, opaque: true, tiles: [T.SNOW_TOP, T.DIRT, T.SNOW_SIDE] },
  [B.GRAVEL]: { name: "Cascalho", hard: 0.65, tool: "shovel", tier: 0, drop: [{ b: B.GRAVEL }], solid: true, opaque: true, tiles: [T.GRAVEL, T.GRAVEL, T.GRAVEL] },
  [B.BRICK]: { name: "Tijolos", hard: 2.1, tool: "pickaxe", tier: 0, drop: [{ b: B.BRICK }], solid: true, opaque: true, tiles: [T.BRICK, T.BRICK, T.BRICK] },
  [B.WOOL]: { name: "Lã", hard: 0.8, tool: "any", tier: 0, drop: [{ b: B.WOOL }], solid: true, opaque: true, tiles: [T.WOOL, T.WOOL, T.WOOL] },
  [B.CHEST]: { name: "Baú", hard: 2.2, tool: "axe", tier: 0, drop: [{ b: B.CHEST }], solid: true, opaque: true, tiles: [T.CHEST_TOP, T.CHEST_TOP, T.CHEST_FRONT] },
  [B.CACTUS]: { name: "Cacto", hard: 0.45, tool: "any", tier: 0, drop: [{ b: B.CACTUS }], solid: true, opaque: true, tiles: [T.CACTUS_TOP, T.CACTUS_TOP, T.CACTUS_SIDE] },
  [B.SANDSTONE]: { name: "Arenito", hard: 1.4, tool: "pickaxe", tier: 0, drop: [{ b: B.SANDSTONE }], solid: true, opaque: true, tiles: [T.SANDSTONE, T.SANDSTONE, T.SANDSTONE] },
};

// ── Itens (não-blocos) ──────────────────────────────────────
export interface ItemDef {
  name: string; emoji: string; stack: number;
  food?: number; fuel?: number;         // nº de fundições que alimenta
  smelt?: { b?: number; i?: string };
  tool?: { type: "pickaxe" | "axe" | "shovel" | "sword"; tier: number; speed: number; dmg: number; dur: number };
  glint?: boolean;
}

export const MAT_INFO = [
  { key: "wood", name: "Madeira", speed: 2.2, dur: 68, dmg: 3, color: "#9a6b3f", tier: 0, fuel: 0.6 },
  { key: "stone", name: "Pedra", speed: 4, dur: 140, dmg: 4, color: "#8f8f8f", tier: 1, fuel: 0 },
  { key: "iron", name: "Ferro", speed: 6, dur: 260, dmg: 5, color: "#d8d8d8", tier: 2, fuel: 0 },
  { key: "gold", name: "Ouro", speed: 9, dur: 40, dmg: 3, color: "#f2c94c", tier: 1, fuel: 0 },
  { key: "diamond", name: "Diamante", speed: 8, dur: 900, dmg: 7, color: "#4ee1e8", tier: 3, fuel: 0 },
] as const;
export const TOOL_TYPES: Array<{ key: "pickaxe" | "axe" | "shovel" | "sword"; name: string; emoji: string }> = [
  { key: "pickaxe", name: "Picareta", emoji: "⛏️" },
  { key: "axe", name: "Machado", emoji: "🪓" },
  { key: "shovel", name: "Pá", emoji: "🥄" },
  { key: "sword", name: "Espada", emoji: "🗡️" },
] as const;

export const ITEMS: Record<string, ItemDef> = {
  stick: { name: "Pau", emoji: "🥢", stack: 64, fuel: 0.4 },
  coal: { name: "Carvão", emoji: "⚫", stack: 64, fuel: 7 },
  charcoal: { name: "Carvão Vegetal", emoji: "🟤", stack: 64, fuel: 7 },
  iron_ingot: { name: "Barra de Ferro", emoji: "⚙️", stack: 64 },
  gold_ingot: { name: "Barra de Ouro", emoji: "🟡", stack: 64 },
  diamond: { name: "Diamante", emoji: "💎", stack: 64, glint: true },
  crystal: { name: "Cristal Bateu", emoji: "🔮", stack: 64, glint: true },
  apple: { name: "Maçã", emoji: "🍎", stack: 64, food: 4 },
  porkchop: { name: "Costeleta Crua", emoji: "🥓", stack: 64, food: 3 },
  cooked_porkchop: { name: "Costeleta Assada", emoji: "🍖", stack: 64, food: 8 },
  beef: { name: "Bife Cru", emoji: "🥩", stack: 64, food: 3 },
  steak: { name: "Bife Assado", emoji: "🍖", stack: 64, food: 8 },
  bilhete: { name: "Bilhete de Sorteio", emoji: "🎫", stack: 16, glint: true },
};
for (const m of MAT_INFO) {
  for (const t of TOOL_TYPES) {
    ITEMS[`${m.key}_${t.key}`] = {
      name: `${t.name} de ${m.name}`, emoji: t.emoji, stack: 1,
      tool: { type: t.key, tier: m.tier, speed: m.speed, dmg: t.key === "sword" ? m.dmg + 1 : Math.max(2, m.dmg - 1), dur: m.dur },
      fuel: m.fuel > 0 ? m.fuel : undefined,
      glint: m.key === "diamond",
    };
  }
}
ITEMS["ki_sword"] = { name: "Espada de KI", emoji: "⚡", stack: 1, glint: true, tool: { type: "sword", tier: 4, speed: 9, dmg: 11, dur: 2200 } };

// ── Shape de item em inventário ─────────────────────────────
export interface Stack { b?: number; i?: string; n: number; dur?: number }
export function stackId(s: Stack | null | undefined): string { return s ? (s.b !== undefined && s.b !== null ? "b" + s.b : "i" + s.i) : "x"; }
export function makeStack(bOrItem: number | string, n = 1, dur?: number): Stack {
  return typeof bOrItem === "number" ? { b: bOrItem, n } : { i: bOrItem, n, dur };
}
export function nameOf(s: Stack): string {
  if (s.b !== undefined && s.b !== null) return BLOCKS[s.b]?.name || "Bloco";
  return ITEMS[s.i!]?.name || s.i;
}
export function emojiOf(s: Stack): string {
  if (s.b !== undefined && s.b !== null) return "🧱";
  return ITEMS[s.i!]?.emoji || "❔";
}
export function maxStack(s: Stack): number {
  if (s.b !== undefined && s.b !== null) return 64;
  return ITEMS[s.i!]?.stack || 64;
}

// ── Receitas (livro de receitas — estilo Minecraft moderno) ─
export interface Recipe { id: string; out: Stack; ins: Stack[]; table?: boolean; cat: "básico" | "ferramentas" | "especial" }
export const RECIPES: Recipe[] = [
  { id: "planks", out: makeStack(B.PLANKS, 4), ins: [makeStack(B.LOG, 1)], cat: "básico" },
  { id: "stick", out: makeStack("stick", 4), ins: [makeStack(B.PLANKS, 2)], cat: "básico" },
  { id: "table", out: makeStack(B.TABLE, 1), ins: [makeStack(B.PLANKS, 4)], cat: "básico" },
  { id: "torch", out: makeStack(B.TORCH, 4), ins: [makeStack("coal", 1), makeStack("stick", 1)], cat: "básico" },
  { id: "furnace", out: makeStack(B.FURNACE, 1), ins: [makeStack(B.COBBLE, 8)], table: true, cat: "básico" },
  { id: "chest", out: makeStack(B.CHEST, 1), ins: [makeStack(B.PLANKS, 8)], table: true, cat: "básico" },
  { id: "brick", out: makeStack(B.BRICK, 1), ins: [makeStack(B.STONE, 4)], table: true, cat: "básico" },
  { id: "glass_x", out: makeStack(B.GLASS, 1), ins: [makeStack(B.SAND, 1), makeStack("coal", 1)], cat: "básico" },
];
for (const m of MAT_INFO) {
  const head = m.key === "wood" ? makeStack(B.PLANKS, 3) : makeStack(m.key === "stone" ? B.COBBLE : `${m.key === "iron" ? "iron_ingot" : m.key === "gold" ? "gold_ingot" : "diamond"}`, 3);
  RECIPES.push({ id: `${m.key}_pickaxe`, out: makeStack(`${m.key}_pickaxe`, 1), ins: [head, makeStack("stick", 2)], table: true, cat: "ferramentas" });
  RECIPES.push({ id: `${m.key}_axe`, out: makeStack(`${m.key}_axe`, 1), ins: [head, makeStack("stick", 2)], table: true, cat: "ferramentas" });
  RECIPES.push({ id: `${m.key}_shovel`, out: makeStack(`${m.key}_shovel`, 1), ins: [head, makeStack("stick", 1)], table: true, cat: "ferramentas" });
  RECIPES.push({ id: `${m.key}_sword`, out: makeStack(`${m.key}_sword`, 1), ins: [head, makeStack("stick", 1)], table: true, cat: "ferramentas" });
}
RECIPES.push({ id: "ki_sword", out: makeStack("ki_sword", 1), ins: [makeStack("diamond", 2), makeStack("crystal", 3), makeStack("stick", 1)], table: true, cat: "especial" });

export const SELL_PRICES: Record<string, number> = {
  coal: 2, charcoal: 2, iron_ingot: 6, gold_ingot: 14, diamond: 45, crystal: 150,
};
// vender blocos brutos também
export const SELL_BLOCK_PRICES: Record<number, number> = {
  [B.LOG]: 1, [B.COBBLE]: 0.5, [B.SAND]: 0.4, [B.GRAVEL]: 0.4, [B.IRON_ORE]: 4, [B.GOLD_ORE]: 10,
};

// ── Texturas procedurais (pixel-art própria) ────────────────
type RNG = () => number;
function mulberry(seed: number): RNG {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hex(c: number) { return "#" + c.toString(16).padStart(6, "0"); }
function shade(c: number, f: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
}

/** Pinta o atlas completo num canvas e devolve-o. */
export function paintAtlas(): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = ATLAS_COLS * TILE_PX; cv.height = ATLAS_ROWS * TILE_PX;
  const g = cv.getContext("2d")!;
  const P = (tile: number, fn: (put: (x: number, y: number, c: number, a?: number) => void, r: RNG) => void, seed = 1) => {
    const ox = (tile % ATLAS_COLS) * TILE_PX, oy = Math.floor(tile / ATLAS_COLS) * TILE_PX;
    const put = (x: number, y: number, c: number, a = 1) => { g.globalAlpha = a; g.fillStyle = hex(c); g.fillRect(ox + x, oy + y, 1, 1); g.globalAlpha = 1; };
    fn(put, mulberry(seed * 7919 + tile));
  };
  const noiseFill = (put: any, r: RNG, base: number, v = 0.14) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) put(x, y, shade(base, 1 - v / 2 + r() * v));
  };

  P(T.GRASS_TOP, (p, r) => { noiseFill(p, r, 0x6fbf44, 0.2); for (let i = 0; i < 14; i++) p(Math.floor(r() * 16), Math.floor(r() * 16), shade(0x8fdf60, 0.9 + r() * 0.2)); }, 3);
  P(T.GRASS_SIDE, (p, r) => { noiseFill(p, r, 0x8a5f38, 0.16); for (let x = 0; x < 16; x++) { const h = 2 + Math.floor(r() * 3); for (let y = 0; y < h; y++) p(x, y, shade(0x6fbf44, 0.85 + r() * 0.3)); } }, 5);
  P(T.DIRT, (p, r) => { noiseFill(p, r, 0x8a5f38, 0.18); for (let i = 0; i < 8; i++) p(Math.floor(r() * 16), Math.floor(r() * 16), shade(0x6e4a2a, 1)); }, 7);
  P(T.STONE, (p, r) => { noiseFill(p, r, 0x8c8c8c, 0.12); for (let i = 0; i < 6; i++) { const x = Math.floor(r() * 15), y = Math.floor(r() * 15); p(x, y, 0x6f6f6f); p(x + 1, y, 0x777777); } }, 9);
  P(T.COBBLE, (p, r) => { noiseFill(p, r, 0x828282, 0.1); for (let by = 0; by < 4; by++) for (let bx = 0; bx < 4; bx++) { const s = 0.78 + r() * 0.4; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { if (x === 3 || y === 3) p(bx * 4 + x, by * 4 + y, 0x4f4f4f); else p(bx * 4 + x, by * 4 + y, shade(0x9a9a9a, s * (0.92 + r() * 0.16))); } } }, 11);
  P(T.BEDROCK, (p, r) => { noiseFill(p, r, 0x3c3c3c, 0.5); }, 13);
  P(T.SAND, (p, r) => { noiseFill(p, r, 0xdcc98f, 0.1); }, 15);
  P(T.WATER, (p, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p(x, y, shade(0x2f6fd0, 0.9 + r() * 0.2), 0.72); }, 17);
  P(T.LOG_SIDE, (p, r) => { for (let x = 0; x < 16; x++) { const s = 0.82 + ((x * 37) % 7) * 0.05; for (let y = 0; y < 16; y++) p(x, y, shade(0x7a5630, s * (0.95 + r() * 0.1))); } }, 19);
  P(T.LOG_TOP, (p, r) => { noiseFill(p, r, 0xb08a55, 0.08); for (let ring = 6; ring >= 1; ring -= 2) for (let a = 0; a < 40; a++) { const th = (a / 40) * Math.PI * 2; p(Math.round(8 + Math.cos(th) * ring), Math.round(8 + Math.sin(th) * ring), shade(0x7a5630, 1)); } }, 21);
  P(T.LEAVES, (p, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p(x, y, shade(0x3f8f2f, 0.7 + r() * 0.6)); }, 23);
  P(T.PLANKS, (p, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const row = Math.floor(y / 4); const s = row % 2 ? 0.92 : 1; p(x, y, shade(0xa87c4a, s * (0.94 + r() * 0.12))); if (y % 4 === 3) p(x, y, 0x6e4e2a); } }, 25);
  const ore = (tile: number, c: number, seed: number) => P(tile, (p, r) => {
    noiseFill(p, r, 0x8c8c8c, 0.12);
    for (let cl = 0; cl < 4; cl++) { const cx = 2 + Math.floor(r() * 12), cy = 2 + Math.floor(r() * 12); for (let k = 0; k < 5; k++) { const x = cx + Math.floor(r() * 3) - 1, y = cy + Math.floor(r() * 3) - 1; p(x, y, shade(c, 0.85 + r() * 0.3)); } p(cx, cy, shade(c, 1.25)); }
  }, seed);
  ore(T.COAL, 0x2b2b2b, 27); ore(T.IRON, 0xd8a780, 29); ore(T.GOLD, 0xf2c94c, 31); ore(T.DIAMOND, 0x4ee1e8, 33); ore(T.CRYSTAL, 0xb26bff, 35);
  P(T.TABLE_TOP, (p, r) => { noiseFill(p, r, 0xa87c4a, 0.1); for (let i = 0; i < 16; i += 5) for (let x = 0; x < 16; x++) p(x, i, 0x6e4e2a); for (let i = 0; i < 16; i += 5) for (let y = 0; y < 16; y++) p(i, y, 0x5d3f1f); }, 37);
  P(T.TABLE_SIDE, (p, r) => { noiseFill(p, r, 0xa87c4a, 0.12); for (let x = 0; x < 16; x++) { p(x, 3, 0x5d3f1f); p(x, 4, 0x5d3f1f); } for (let y = 6; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 9 === 0) p(x, y, 0x8a6236); }, 39);
  P(T.FURN_SIDE, (p, r) => { noiseFill(p, r, 0x777777, 0.1); for (let x = 0; x < 16; x++) { p(x, 0, 0x5a5a5a); p(x, 15, 0x4a4a4a); } }, 41);
  P(T.FURN_FRONT, (p, r) => { noiseFill(p, r, 0x777777, 0.1); for (let y = 7; y < 14; y++) for (let x = 4; x < 12; x++) p(x, y, 0x2a2a2a); }, 43);
  P(T.FURN_LIT, (p, r) => { noiseFill(p, r, 0x777777, 0.1); for (let y = 7; y < 14; y++) for (let x = 4; x < 12; x++) { const f = r(); p(x, y, f > 0.5 ? 0xff9a2a : f > 0.2 ? 0xffd24a : 0xff5a1a); } }, 45);
  P(T.TORCH, (p, r) => { for (let y = 6; y < 16; y++) { p(7, y, 0x9a6b3f); p(8, y, 0x7a5630); } p(7, 4, 0xffd24a); p(8, 4, 0xffd24a); p(7, 5, 0xff9a2a); p(8, 5, 0xff9a2a); p(7, 3, 0xfff0a0); p(8, 3, 0xfff0a0); }, 47);
  P(T.GLASS, (p, r) => { for (let i = 0; i < 16; i++) { p(i, 0, 0xcfe8f5, 0.9); p(i, 15, 0xcfe8f5, 0.9); p(0, i, 0xcfe8f5, 0.9); p(15, i, 0xcfe8f5, 0.9); } p(3, 3, 0xffffff, 0.55); p(4, 4, 0xffffff, 0.4); p(11, 9, 0xffffff, 0.35); }, 49);
  P(T.SNOW_TOP, (p, r) => { noiseFill(p, r, 0xf2f6fa, 0.05); }, 51);
  P(T.SNOW_SIDE, (p, r) => { noiseFill(p, r, 0x8a5f38, 0.16); for (let x = 0; x < 16; x++) { const h = 2 + Math.floor(r() * 3); for (let y = 0; y < h; y++) p(x, y, shade(0xf2f6fa, 0.95 + r() * 0.1)); } }, 53);
  P(T.GRAVEL, (p, r) => { noiseFill(p, r, 0x8f8578, 0.25); }, 55);
  P(T.BRICK, (p, r) => { noiseFill(p, r, 0x9c5a4a, 0.08); for (let y = 3; y < 16; y += 4) for (let x = 0; x < 16; x++) p(x, y, 0xd8cfc4); for (let y = 0; y < 16; y++) for (let x = (Math.floor(y / 4) % 2 ? 0 : 8); x < 16; x += 8) p(x, y, 0xd8cfc4); }, 57);
  P(T.WOOL, (p, r) => { noiseFill(p, r, 0xe8e8e8, 0.07); for (let i = 0; i < 10; i++) p(Math.floor(r() * 16), Math.floor(r() * 16), 0xd0d0d0); }, 59);
  P(T.CHEST_SIDE, (p, r) => { noiseFill(p, r, 0x9a6b2f, 0.1); for (let i = 0; i < 16; i++) { p(i, 0, 0x5d3f1f); p(i, 15, 0x5d3f1f); p(0, i, 0x5d3f1f); p(15, i, 0x5d3f1f); } }, 61);
  P(T.CHEST_FRONT, (p, r) => { noiseFill(p, r, 0x9a6b2f, 0.1); for (let i = 0; i < 16; i++) { p(i, 0, 0x5d3f1f); p(i, 15, 0x5d3f1f); p(0, i, 0x5d3f1f); p(15, i, 0x5d3f1f); p(i, 7, 0x5d3f1f); } p(7, 6, 0xc9c9c9); p(8, 6, 0xc9c9c9); p(7, 7, 0x8a8a8a); p(8, 7, 0x8a8a8a); }, 63);
  P(T.CHEST_TOP, (p, r) => { noiseFill(p, r, 0x9a6b2f, 0.1); for (let i = 0; i < 16; i++) { p(i, 0, 0x5d3f1f); p(i, 15, 0x5d3f1f); p(0, i, 0x5d3f1f); p(15, i, 0x5d3f1f); } }, 65);
  P(T.CACTUS_SIDE, (p, r) => { noiseFill(p, r, 0x3f7f2f, 0.12); for (let y = 1; y < 16; y += 3) { p(3, y, 0xdfeacb); p(11, (y + 1) % 16, 0xdfeacb); } }, 67);
  P(T.CACTUS_TOP, (p, r) => { noiseFill(p, r, 0x4f9f3f, 0.1); }, 69);
  P(T.SANDSTONE, (p, r) => { noiseFill(p, r, 0xd4bd82, 0.07); for (let y = 5; y < 16; y += 5) for (let x = 0; x < 16; x++) p(x, y, 0xb89d5e); }, 71);
  // Rachaduras (10 estágios) sobre transparente
  for (let s = 0; s < 10; s++) {
    P(T.CRACK0 + s, (p, r) => {
      const n = 2 + s * 2;
      for (let k = 0; k < n; k++) {
        let x = Math.floor(r() * 16), y = Math.floor(r() * 16);
        const len = 3 + Math.floor(r() * (2 + s));
        for (let j = 0; j < len; j++) {
          p(Math.max(0, Math.min(15, x)), Math.max(0, Math.min(15, y)), 0x111111, Math.min(0.85, 0.25 + s * 0.06));
          x += Math.floor(r() * 3) - 1; y += Math.floor(r() * 3) - 1;
        }
      }
    }, 73 + s);
  }
  return cv;
}

// ── Ícones de itens (pixel-art própria 16×16 → dataURL) ─────
const iconCache = new Map<string, string>();
export function itemIcon(id: string): string {
  const hit = iconCache.get(id); if (hit) return hit;
  const cv = document.createElement("canvas"); cv.width = 16; cv.height = 16;
  const g = cv.getContext("2d")!;
  const put = (x: number, y: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const isTool = id.includes("_pickaxe") || id.includes("_axe") || id.includes("_shovel") || id.includes("_sword");
  if (id === "stick") { for (let k = 0; k < 9; k++) put(4 + k, 12 - k, "#9a6b3f"); }
  else if (id === "coal") { g.fillStyle = "#2b2b2b"; g.fillRect(4, 5, 8, 7); g.fillStyle = "#444444"; g.fillRect(5, 6, 3, 2); }
  else if (id === "charcoal") { g.fillStyle = "#4a3220"; g.fillRect(4, 5, 8, 7); g.fillStyle = "#6e4e2a"; g.fillRect(5, 6, 3, 2); }
  else if (id === "iron_ingot") { g.fillStyle = "#d8d8d8"; g.fillRect(3, 6, 10, 5); g.fillStyle = "#f4f4f4"; g.fillRect(4, 6, 8, 2); }
  else if (id === "gold_ingot") { g.fillStyle = "#f2c94c"; g.fillRect(3, 6, 10, 5); g.fillStyle = "#ffe9a0"; g.fillRect(4, 6, 8, 2); }
  else if (id === "diamond") { g.fillStyle = "#4ee1e8"; for (let y = 0; y < 6; y++) { const w = 9 - Math.abs(4 - y) * 2; for (let x = 0; x < w; x++) put(4 + x, 5 + y, y < 2 ? "#c9fbff" : "#4ee1e8"); } }
  else if (id === "crystal") { g.fillStyle = "#b26bff"; for (let y = 0; y < 9; y++) { const w = Math.max(1, 6 - Math.abs(4 - y)); for (let x = 0; x < w; x++) put(5 + x, 4 + y, y % 3 ? "#b26bff" : "#e6ccff"); } }
  else if (id === "apple") { g.fillStyle = "#e03131"; g.fillRect(4, 6, 8, 7); g.fillStyle = "#ff8787"; g.fillRect(5, 7, 2, 2); put(8, 4, "#5d3f1f"); put(8, 3, "#3f8f2f"); }
  else if (id === "porkchop" || id === "beef") { g.fillStyle = id === "porkchop" ? "#f0a0a0" : "#c05050"; g.fillRect(4, 5, 8, 7); g.fillStyle = "#ffffff"; g.fillRect(5, 6, 2, 2); }
  else if (id === "cooked_porkchop" || id === "steak") { g.fillStyle = "#a05a2a"; g.fillRect(4, 5, 8, 7); g.fillStyle = "#c97c3f"; g.fillRect(5, 6, 3, 2); }
  else if (id === "bilhete") { g.fillStyle = "#f2c94c"; g.fillRect(2, 5, 12, 7); g.fillStyle = "#b26bff"; g.fillRect(4, 7, 3, 3); g.fillStyle = "#7a5630"; g.fillRect(9, 7, 3, 1); g.fillRect(9, 9, 3, 1); }
  else if (id === "ki_sword") { for (let k = 0; k < 8; k++) put(5 + k, 11 - k, k % 2 ? "#8fdcff" : "#e6f9ff"); put(4, 11, "#9a6b3f"); put(3, 12, "#9a6b3f"); put(6, 12, "#f2c94c"); put(5, 13, "#f2c94c"); }
  else if (isTool) {
    const m = id.split("_")[0] as typeof MAT_INFO[number]["key"];
    const info = MAT_INFO.find((x) => x.key === m)!;
    const type = id.split("_")[1];
    for (let k = 0; k < 7; k++) put(5 + k, 13 - k, "#9a6b3f"); // cabo
    if (type === "pickaxe") { for (let k = -3; k <= 3; k++) put(10 + k, 4 + Math.abs(k), info.color); put(10, 3, info.color); }
    if (type === "axe") { for (let y = 2; y < 7; y++) for (let x = 8; x < 12; x++) if (!(x === 11 && y > 4)) put(x, y, info.color); }
    if (type === "shovel") { for (let y = 2; y < 6; y++) for (let x = 9; x < 12; x++) put(x, y, info.color); }
    if (type === "sword") { for (let k = 0; k < 9; k++) put(6 + k, 11 - k, info.color); put(5, 12, "#6e4e2a"); put(7, 12, "#6e4e2a"); put(4, 13, "#6e4e2a"); }
  } else { g.fillStyle = "#c9c9c9"; g.fillRect(4, 4, 8, 8); }
  const url = cv.toDataURL();
  iconCache.set(id, url);
  return url;
}

/** Ícone para um stack (bloco → tile do atlas; item → pixel-art). */
export function stackIcon(s: Stack): string {
  if (s.b !== undefined && s.b !== null) {
    const key = "b" + s.b;
    const hit = iconCache.get(key); if (hit) return hit;
    const atlas = (window as any).__bateuAtlas as HTMLCanvasElement | undefined;
    if (!atlas) return "";
    const tile = BLOCKS[s.b]?.tiles[2] ?? T.STONE;
    const cv = document.createElement("canvas"); cv.width = 16; cv.height = 16;
    const g = cv.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.drawImage(atlas, (tile % ATLAS_COLS) * TILE_PX, Math.floor(tile / ATLAS_COLS) * TILE_PX, TILE_PX, TILE_PX, 0, 0, 16, 16);
    const url = cv.toDataURL(); iconCache.set(key, url);
    return url;
  }
  return itemIcon(s.i!);
}
