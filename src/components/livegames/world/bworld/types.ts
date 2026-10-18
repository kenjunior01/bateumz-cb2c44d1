// ============================================================
// MUNDO BATEU — Tipos, tabelas e constantes do jogo · v1
// Mundo aberto viral da plataforma: construir + proteger,
// roubar, duelar 1v1, vilões/chefes, desafios de empresas,
// cupões reais e um mundo que CRESCER com a plataforma.
// ============================================================

// ─── Constantes do mundo ─────────────────────────────────────
export const TILE = 48;                 // px por tile (zoom base)
export const CHUNK = 16;                // tiles por chunk
export const DAY_MS = 360_000;          // ciclo dia/noite: 6 min
export const REGION_RADIUS = 92;        // tiles — região ≈ 184x184

// ─── Tiles ───────────────────────────────────────────────────
export const T = {
  OCEAN: 0, SAND: 1, GRASS: 2, FOREST: 3, DESERT: 4, ROCK: 5,
  ROAD: 6, RIVER: 7, CITY: 8, WOODFLOOR: 9, FARM: 10, SNOW: 11,
  WALL: 12, DOOR: 13, BRIDGE: 14, DIRT: 15, MIST: 16, PLAZA: 17,
} as const;
export type Tile = number;

const SOLID_SET = new Set([T.OCEAN, T.RIVER, T.WALL, T.MIST]);
export function tileSolid(t: Tile): boolean { return SOLID_SET.has(t); }

// ─── Biomas ──────────────────────────────────────────────────
export type BiomeId = "musseque" | "savana" | "maiombe" | "namibe" | "costa" | "leba" | "kissama" | "lunda" | "oc";
export interface Biome {
  id: BiomeId; name: string; ground: Tile; alt: Tile;
  tint: string;        // cor de ambientação
  trees: number;       // densidade de árvores 0..1
  cacti: number; rocks: number; grassTuft: number;
  mobs: string[];      // ids de mobs
}
export const BIOMES: Record<BiomeId, Biome> = {
  musseque: { id: "musseque", name: "Musseque de Luanda", ground: T.CITY, alt: T.DIRT, tint: "#8d7f6f", trees: 0.04, cacti: 0, rocks: 0.02, grassTuft: 0.05, mobs: ["rufia", "bandido"] },
  savana:   { id: "savana",   name: "Savana Dourada",     ground: T.GRASS, alt: T.DIRT, tint: "#c9b45e", trees: 0.05, cacti: 0.01, rocks: 0.03, grassTuft: 0.22, mobs: ["javali", "cobra", "abutre", "bandido"] },
  maiombe:  { id: "maiombe",  name: "Floresta do Maiombe",ground: T.FOREST,alt: T.GRASS, tint: "#2e7d4f", trees: 0.34, cacti: 0, rocks: 0.02, grassTuft: 0.3, mobs: ["macaco", "besouro", "cobra", "espetro"] },
  namibe:   { id: "namibe",   name: "Deserto do Namibe",  ground: T.DESERT,alt: T.SAND,  tint: "#e0b56f", trees: 0.006, cacti: 0.08, rocks: 0.06, grassTuft: 0.01, mobs: ["escorpiao", "chacal"] },
  costa:    { id: "costa",    name: "Costa de Benguela",  ground: T.SAND,  alt: T.GRASS, tint: "#e8cf94", trees: 0.07, cacti: 0, rocks: 0.02, grassTuft: 0.04, mobs: ["caranguejo", "bandido_costa"] },
  leba:     { id: "leba",     name: "Serra da Leba",      ground: T.ROCK,  alt: T.GRASS, tint: "#9a8f86", trees: 0.05, cacti: 0, rocks: 0.12, grassTuft: 0.06, mobs: ["lobo", "aguia", "espetro"] },
  kissama:  { id: "kissama",  name: "Parque do Kissama",  ground: T.GRASS, alt: T.DIRT,  tint: "#7da05a", trees: 0.12, cacti: 0, rocks: 0.03, grassTuft: 0.3, mobs: ["javali", "girafa", "bandido"] },
  lunda:    { id: "lunda",    name: "Lunda Diamantífera", ground: T.DIRT,  alt: T.ROCK,  tint: "#8a7f6a", trees: 0.08, cacti: 0, rocks: 0.14, grassTuft: 0.05, mobs: ["lobo", "bandido", "espetro"] },
  oc:       { id: "oc",       name: "Território Selvagem",ground: T.FOREST,alt: T.GRASS, tint: "#356e52", trees: 0.2, cacti: 0.02, rocks: 0.06, grassTuft: 0.18, mobs: ["espetro", "chacal", "lobo"] },
};

// ─── Regiões (mundo extenso que cresce) ─────────────────────
export interface RegionDef {
  id: string; name: string; biome: BiomeId; cx: number; cy: number;
  unlockAt: number;          // nº de territórios exigidos (base=1 sempre)
  desc: string;
}
export const REGIONS: RegionDef[] = [
  { id: "musseque", name: "Musseque de Luanda", biome: "musseque", cx: 0, cy: 0, unlockAt: 1, desc: "O coração do mundo. Vilas, feira e o Banco de Pontos." },
  { id: "savana",   name: "Savana Dourada",     biome: "savana",   cx: 120, cy: -95, unlockAt: 1, desc: "Campos dourados, javalis e a Torre da Coroa de Ferro." },
  { id: "maiombe",  name: "Floresta do Maiombe",biome: "maiombe",  cx: -125, cy: -80, unlockAt: 1, desc: "Névoa verde, árvores colossais e a Mãe do Maiombe." },
  { id: "namibe",   name: "Deserto do Namibe",  biome: "namibe",   cx: -110, cy: 105, unlockAt: 2, desc: "Dunas eternas, esqueletos de navio e o Djinn." },
  { id: "costa",    name: "Costa de Benguela",  biome: "costa",    cx: 115, cy: 100, unlockAt: 2, desc: "Praias, surf e o navio do Almirante Negro." },
  { id: "leba",     name: "Serra da Leba",      biome: "leba",     cx: 10, cy: -170, unlockAt: 3, desc: "Serpentina nas nuvens e o Colosso da Leba." },
  { id: "kissama",  name: "Parque do Kissama",  biome: "kissama",  cx: 30, cy: 185, unlockAt: 5, desc: "Safra selvagem e bases de troféus." },
  { id: "lunda",    name: "Lunda Diamantífera", biome: "lunda",    cx: -200, cy: 15, unlockAt: 8, desc: "Minas profundas, diamantes e perigos." },
];

// ─── Raridades ───────────────────────────────────────────────
export type Rarity = "comum" | "raro" | "epico" | "lendario" | "mitico";
export const RARITY_META: Record<Rarity, { name: string; color: string; glow: string }> = {
  comum:    { name: "Comum",    color: "#cbd5e1", glow: "#94a3b8" },
  raro:     { name: "Raro",     color: "#4ade80", glow: "#22c55e" },
  epico:    { name: "Épico",    color: "#c084fc", glow: "#a855f7" },
  lendario: { name: "Lendário", color: "#fbbf24", glow: "#f59e0b" },
  mitico:   { name: "Mítico",   color: "#f87171", glow: "#ef4444" },
};

// ─── Classes ─────────────────────────────────────────────────
export interface Ability { id: string; name: string; desc: string; cd: number; emoji: string; }
export interface ClassDef {
  id: number; name: string; emoji: string; hp: number; atk: number; def: number; spd: number;
  color: string; desc: string; abilities: Ability[];
}
export const CLASSES: ClassDef[] = [
  {
    id: 0, name: "Guerreiro", emoji: "⚔️", hp: 130, atk: 14, def: 10, spd: 1, color: "#ef4444",
    desc: "Tanque da disciplina: resiste a tudo e abre caminho à força.",
    abilities: [
      { id: "golpe", name: "Golpe Rodado", desc: "Gira e atinge todos à volta", cd: 6000, emoji: "🌀" },
      { id: "grito", name: "Grito de Guerra", desc: "Dano +50% durante 6s", cd: 16000, emoji: "📢" },
    ],
  },
  {
    id: 1, name: "Caçador", emoji: "🏹", hp: 100, atk: 12, def: 6, spd: 1.25, color: "#22c55e",
    desc: "Rápido e silencioso: o rei do roubo e da esquiva.",
    abilities: [
      { id: "flecha", name: "Flecha Perfurante", desc: "Dispara uma flecha à distância", cd: 3500, emoji: "🎯" },
      { id: "passo", name: "Passo Sombrio", desc: "Esquiva com invulnerabilidade breve", cd: 9000, emoji: "💨" },
    ],
  },
  {
    id: 2, name: "Feiticeiro", emoji: "🔮", hp: 88, atk: 17, def: 4, spd: 1.05, color: "#a855f7",
    desc: "Mestre do Kimbanda moderno: fogo, escudos e poder arcano.",
    abilities: [
      { id: "fogo", name: "Bola de Fogo", desc: "Explosão em área à distância", cd: 5000, emoji: "🔥" },
      { id: "escudo", name: "Escudo Arcano", desc: "Absorve o próximo dano recebido", cd: 12000, emoji: "🛡️" },
    ],
  },
];

// ─── XP / nível (curva DIFÍCIL — evoluir é raro e valioso) ──
export function xpNeeded(level: number): number {
  return Math.floor(90 * Math.pow(level, 2.45)) + 140 * level;
}
export function powerLevel(p: { level: number; atk: number; def: number; spd: number; gear?: number }): number {
  return Math.round(p.level * 120 + p.atk * 22 + p.def * 20 + p.spd * 14 + (p.gear || 0));
}

// ─── Itens ───────────────────────────────────────────────────
export type ItemKind = "arma" | "armadura" | "amuleto" | "material" | "consumivel" | "cupao" | "trofeu";
export interface ItemDef {
  id: string; name: string; kind: ItemKind; rarity: Rarity; emoji: string;
  atk?: number; def?: number; spd?: number; heal?: number; value?: number; desc?: string;
}
export const ITEMS: Record<string, ItemDef> = {
  // materiais
  madeira:   { id: "madeira",   name: "Madeira",       kind: "material", rarity: "comum", emoji: "🪵", value: 6 },
  pedra:     { id: "pedra",     name: "Pedra",         kind: "material", rarity: "comum", emoji: "🪨", value: 8 },
  fibra:     { id: "fibra",     name: "Fibra",         kind: "material", rarity: "comum", emoji: "🌿", value: 5 },
  pele:      { id: "pele",      name: "Pele Curada",   kind: "material", rarity: "comum", emoji: "🟫", value: 14 },
  cristal:   { id: "cristal",   name: "Cristal Verde", kind: "material", rarity: "epico", emoji: "💎", value: 220 },
  diamante:  { id: "diamante",  name: "Diamante Lunda",kind: "material", rarity: "lendario", emoji: "💠", value: 900 },
  // consumíveis
  manga:     { id: "manga",     name: "Manga Doce",    kind: "consumivel", rarity: "comum", emoji: "🥭", heal: 28, value: 10 },
  funge:     { id: "funge",     name: "Funge Energético", kind: "consumivel", rarity: "raro", emoji: "🍲", heal: 65, value: 45 },
  elixir:    { id: "elixir",    name: "Elixir do Girassol", kind: "consumivel", rarity: "epico", emoji: "🧪", heal: 999, value: 160 },
  // armas
  paos:      { id: "paos",      name: "Pau de Futebol", kind: "arma", rarity: "comum", emoji: "🏏", atk: 4, value: 30 },
  cutelo:    { id: "cutelo",    name: "Cutelo do Musseque", kind: "arma", rarity: "raro", emoji: "🔪", atk: 9, value: 120 },
  arco:      { id: "arco",      name: "Arco do Maiombe", kind: "arma", rarity: "raro", emoji: "🏹", atk: 10, spd: 0.06, value: 140 },
  catana:    { id: "catana",    name: "Catana da Savana", kind: "arma", rarity: "epico", emoji: "🗡️", atk: 16, value: 420 },
  fulgor:    { id: "fulgor",    name: "Fulgor da Leba", kind: "arma", rarity: "lendario", emoji: "⚡", atk: 26, value: 1200 },
  coroa_l:   { id: "coroa_l",   name: "Lâmina da Coroa", kind: "arma", rarity: "mitico", emoji: "👑", atk: 38, value: 3000 },
  // armaduras
  capulana:  { id: "capulana",  name: "Capulana Blindada", kind: "armadura", rarity: "comum", emoji: "🧵", def: 3, value: 25 },
  couraca:   { id: "couraca",   name: "Couraça de Pele", kind: "armadura", rarity: "raro", emoji: "🦺", def: 7, value: 130 },
  ferro:     { id: "ferro",     name: "Pecho de Ferro",  kind: "armadura", rarity: "epico", emoji: "🛡️", def: 13, value: 400 },
  colosso:   { id: "colosso",   name: "Casca do Colosso",kind: "armadura", rarity: "lendario", emoji: "🗿", def: 22, value: 1300 },
  // amuletos
  conta:     { id: "conta",     name: "Contas do Girassol", kind: "amuleto", rarity: "raro", emoji: "📿", spd: 0.1, value: 110 },
  buzio:     { id: "buzio",     name: "Búzio Ancestral", kind: "amuleto", rarity: "epico", emoji: "🐚", atk: 5, def: 3, value: 300 },
  djinn:     { id: "djinn",     name: "Foco do Djinn",   kind: "amuleto", rarity: "lendario", emoji: "🧞", atk: 9, spd: 0.12, value: 1000 },
  // cupão especial (roubo/liderança dá cupões reais)
  cupao_mundo: { id: "cupao_mundo", name: "Cupão do Mundo", kind: "cupao", rarity: "lendario", emoji: "🎟️", value: 500, desc: "Cupão real da plataforma — reclama na tua conta!" },
};

export function lootRarityRoll(luck = 0): Rarity {
  const r = Math.random() * 100 - luck;
  if (r < 1.2) return "mitico";
  if (r < 6) return "lendario";
  if (r < 18) return "epico";
  if (r < 45) return "raro";
  return "comum";
}
export const LOOT_BY_RARITY: Record<Rarity, string[]> = {
  comum: ["madeira", "pedra", "fibra", "pele", "manga", "paos", "capulana"],
  raro: ["cutelo", "arco", "couraca", "conta", "funge"],
  epico: ["catana", "ferro", "buzio", "cristal", "elixir"],
  lendario: ["fulgor", "colosso", "djinn", "cupao_mundo"],
  mitico: ["coroa_l", "diamante"],
};
export function rollLoot(rarity: Rarity): string {
  const pool = LOOT_BY_RARITY[rarity];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Mobs ────────────────────────────────────────────────────
export interface MobDef {
  id: string; name: string; emoji: string; hp: number; atk: number; def: number; spd: number;
  xp: number; gold: [number, number]; r: number; aggro: number; color: string;
  tenente?: boolean;
}
export const MOBS: Record<string, MobDef> = {
  javali:      { id: "javali", name: "Javali", emoji: "🐗", hp: 55, atk: 9, def: 3, spd: 1.5, xp: 16, gold: [4, 12], r: 16, aggro: 150, color: "#7c5c3e" },
  cobra:       { id: "cobra", name: "Cobra Espinchada", emoji: "🐍", hp: 40, atk: 12, def: 1, spd: 1.9, xp: 18, gold: [5, 14], r: 13, aggro: 170, color: "#4d7c0f" },
  abutre:      { id: "abutre", name: "Abutre", emoji: "🦅", hp: 46, atk: 8, def: 2, spd: 1.8, xp: 15, gold: [3, 10], r: 15, aggro: 200, color: "#78716c" },
  macaco:      { id: "macaco", name: "Macaco Gatuno", emoji: "🐒", hp: 50, atk: 10, def: 2, spd: 2.1, xp: 20, gold: [8, 18], r: 14, aggro: 160, color: "#a16207" },
  besouro:     { id: "besouro", name: "Besouro-Eléctrico", emoji: "🪲", hp: 70, atk: 13, def: 6, spd: 1.1, xp: 24, gold: [6, 16], r: 15, aggro: 140, color: "#0e7490" },
  escorpiao:   { id: "escorpiao", name: "Escorpião de Vidro", emoji: "🦂", hp: 52, atk: 14, def: 4, spd: 1.6, xp: 22, gold: [7, 15], r: 14, aggro: 180, color: "#b45309" },
  chacal:      { id: "chacal", name: "Chacal do Namibe", emoji: "🐺", hp: 60, atk: 12, def: 3, spd: 2.0, xp: 22, gold: [6, 16], r: 15, aggro: 190, color: "#92400e" },
  caranguejo:  { id: "caranguejo", name: "Caranguejo Rei", emoji: "🦀", hp: 66, atk: 11, def: 8, spd: 0.9, xp: 20, gold: [6, 14], r: 15, aggro: 120, color: "#dc2626" },
  bandido:     { id: "bandido", name: "Bandido", emoji: "🥷", hp: 75, atk: 14, def: 5, spd: 1.7, xp: 30, gold: [14, 30], r: 15, aggro: 200, color: "#3f3f46" },
  bandido_costa: { id: "bandido_costa", name: "Corsário", emoji: "🏴‍☠️", hp: 80, atk: 15, def: 6, spd: 1.7, xp: 34, gold: [16, 34], r: 15, aggro: 210, color: "#1e3a5f" },
  rufia:       { id: "rufia", name: "Rufia", emoji: "🧟", hp: 60, atk: 10, def: 3, spd: 1.4, xp: 22, gold: [8, 18], r: 15, aggro: 170, color: "#57534e" },
  lobo:        { id: "lobo", name: "Lobo da Leba", emoji: "🐺", hp: 64, atk: 13, def: 4, spd: 2.1, xp: 24, gold: [6, 15], r: 15, aggro: 210, color: "#6b7280" },
  aguia:       { id: "aguia", name: "Águia Pescadora", emoji: "🦅", hp: 48, atk: 12, def: 2, spd: 2.3, xp: 22, gold: [5, 13], r: 14, aggro: 230, color: "#a8a29e" },
  espetro:     { id: "espetro", name: "Espetro", emoji: "👻", hp: 58, atk: 16, def: 2, spd: 1.9, xp: 34, gold: [10, 24], r: 14, aggro: 240, color: "#93c5fd" },
  girafa:      { id: "girafa", name: "Girafa Selvagem", emoji: "🦒", hp: 90, atk: 10, def: 6, spd: 1.6, xp: 30, gold: [8, 20], r: 17, aggro: 130, color: "#ca8a04" },
  // tenentes (elites dos vilões)
  ten_coroa:   { id: "ten_coroa", name: "Guarda da Coroa", emoji: "🛡️", hp: 150, atk: 18, def: 9, spd: 1.5, xp: 80, gold: [40, 70], r: 17, aggro: 220, color: "#b8860b", tenente: true },
  ten_maia:    { id: "ten_maia", name: "Filho do Maiombe", emoji: "🌿", hp: 160, atk: 19, def: 8, spd: 1.7, xp: 85, gold: [45, 75], r: 17, aggro: 220, color: "#166534", tenente: true },
  ten_djinn:   { id: "ten_djinn", name: "Vulto de Areia", emoji: "🌪️", hp: 155, atk: 20, def: 7, spd: 1.9, xp: 85, gold: [45, 78], r: 17, aggro: 240, color: "#d97706", tenente: true },
  ten_almir:   { id: "ten_almir", name: "Marujo Negro", emoji: "⚓", hp: 165, atk: 19, def: 9, spd: 1.6, xp: 88, gold: [48, 80], r: 17, aggro: 230, color: "#334155", tenente: true },
  ten_colosso: { id: "ten_colosso", name: "Eco de Pedra", emoji: "🗿", hp: 190, atk: 21, def: 12, spd: 1.2, xp: 95, gold: [50, 85], r: 18, aggro: 210, color: "#57534e", tenente: true },
  ten_mussek:  { id: "ten_mussek", name: "Chefe de Quarteirão", emoji: "🥊", hp: 170, atk: 20, def: 8, spd: 1.8, xp: 90, gold: [50, 90], r: 17, aggro: 240, color: "#7f1d1d", tenente: true },
};

// ─── Vilões (chefe de cada região) ──────────────────────────
export interface VillainDef {
  id: string; name: string; title: string; region: string; emoji: string; color: string;
  hp: number; atk: number; def: number; spd: number; xp: number; gold: [number, number];
  lore: string; ability: string;
}
export const VILLAINS: VillainDef[] = [
  { id: "coroa", name: "Coroa de Ferro", title: "Usurpador da Savana", region: "savana", emoji: "👑", color: "#b8860b", hp: 640, atk: 26, def: 12, spd: 1.5, xp: 400, gold: [300, 520], lore: "Coroou-se a si próprio com ferro derretido e jura reinar sobre toda a Savana.", ability: "Investida Real" },
  { id: "maia", name: "Mãe do Maiombe", title: "Rainha da Névoa", region: "maiombe", emoji: "🌳", color: "#166534", hp: 700, atk: 28, def: 11, spd: 1.4, xp: 430, gold: [320, 560], lore: "A floresta anda sob as suas raízes; quem corta sem pedir, some.", ability: "Raízes Vivas" },
  { id: "djinn", name: "Djinn do Namibe", title: "Senhor das Dunas", region: "namibe", emoji: "🧞", color: "#d97706", hp: 760, atk: 30, def: 10, spd: 1.8, xp: 470, gold: [350, 600], lore: "Concedia desejos; agora cobra cada um com areia e tormento.", ability: "Tempestade de Areia" },
  { id: "almir", name: "Almirante Negro", title: "Terror da Costa", region: "costa", emoji: "🏴‍☠️", color: "#1e3a5f", hp: 820, atk: 32, def: 12, spd: 1.6, xp: 510, gold: [380, 650], lore: "O seu navio afundado ainda dispara canhões na maré alta.", ability: "Salva de Canhões" },
  { id: "colosso", name: "Colosso da Leba", title: "Guardião Caído", region: "leba", emoji: "🗿", color: "#57534e", hp: 980, atk: 36, def: 18, spd: 1.1, xp: 620, gold: [420, 720], lore: "Fora guardião da serra; acorda furioso quando os vivos sobem.", ability: "Terremoto" },
  { id: "cativo", name: "Zé Cativo", title: "Chefe do Musseque", region: "musseque", emoji: "🥊", color: "#7f1d1d", hp: 720, atk: 30, def: 12, spd: 1.7, xp: 520, gold: [400, 700], lore: "Controla as esquinas do musseque e desafia quem vira estrela.", ability: "Combo Brutal" },
];

// ─── Marcos (descobertas) ────────────────────────────────────
export interface LandmarkDef {
  id: string; name: string; x: number; y: number; region: string;
  emoji: string; reward: number; lore: string;
}
export const LANDMARKS: LandmarkDef[] = [
  { id: "praça", name: "Praça da Independência", x: 0, y: -14, region: "musseque", emoji: "🏛️", reward: 20, lore: "Onde tudo começa. O coração pulsante do Musseque." },
  { id: "feira", name: "Feira do Bateu", x: 16, y: 8, region: "musseque", emoji: "🏪", reward: 20, lore: "Comprar, vender e leiloar — a economia viva da plataforma." },
  { id: "banco", name: "Banco de Pontos", x: -14, y: 6, region: "musseque", emoji: "🏦", reward: 20, lore: "Troca troféus por moeda real da plataforma." },
  { id: "torre", name: "Torre da Coroa", x: 120, y: -104, region: "savana", emoji: "🗼", reward: 40, lore: "O trono ilegítimo da Coroa de Ferro." },
  { id: "clareira", name: "Clareira Ancestral", x: -125, y: -88, region: "maiombe", emoji: "🌳", reward: 40, lore: "As árvores aqui têm mil anos e não perdoam machados." },
  { id: "navio", name: "Navio Naufragado", x: 132, y: 92, region: "costa", emoji: "🚢", reward: 40, lore: "O Almirante Negro ainda guarda o seu tesouro no casco." },
  { id: "dunas", name: "Dunas Sussurrantes", x: -110, y: 96, region: "namibe", emoji: "🏜️", reward: 40, lore: "O vento conta segredos de quem não pediu ao Djinn." },
  { id: "serpentina", name: "Serpentina da Leba", x: 10, y: -180, region: "leba", emoji: "🛣️", reward: 45, lore: "Cada curva, uma história; cada falésia, um abismo." },
  { id: "quilombo", name: "Quilombo do Kissama", x: 30, y: 176, region: "kissama", emoji: "🛖", reward: 50, lore: "Refúgio livre dos caçadores de troféus." },
  { id: "mina", name: "Mina Profunda", x: -208, y: 8, region: "lunda", emoji: "⛏️", reward: 60, lore: "Diamantes para quem sobreviver à escuridão." },
];

// ─── Estruturas de construção ────────────────────────────────
export type BuildKind = "parede" | "porta" | "bau" | "cama" | "torreta" | "lanterna" | "plantacao" | "bandeira";
export interface BuildDef { kind: BuildKind; name: string; emoji: string; cost: Record<string, number>; desc: string; solid?: boolean; }
export const BUILDINGS: Record<BuildKind, BuildDef> = {
  parede:    { kind: "parede", name: "Parede", emoji: "🧱", cost: { madeira: 6, pedra: 4 }, desc: "Barreira sólida da tua base.", solid: true },
  porta:     { kind: "porta", name: "Porta", emoji: "🚪", cost: { madeira: 4 }, desc: "Só tu (e quem tu quiseres) passam.", solid: true },
  bau:       { kind: "bau", name: "Baú", emoji: "📦", cost: { madeira: 8 }, desc: "Guarda itens. Pode ser ROUBADO se o escudo cair!" },
  cama:      { kind: "cama", name: "Cama", emoji: "🛏️", cost: { madeira: 6, fibra: 6 }, desc: "Ponto de renascimento da tua casa." },
  torreta:   { kind: "torreta", name: "Torreta", emoji: "🏹", cost: { pedra: 10, madeira: 8 }, desc: "Dispara em invasores que tocarem na tua terra." },
  lanterna:  { kind: "lanterna", name: "Lanterna", emoji: "🏮", cost: { madeira: 3, fibra: 2 }, desc: "Ilumina a noite e afasta espectros." },
  plantacao: { kind: "plantacao", name: "Plantação", emoji: "🌱", cost: { fibra: 8 }, desc: "Cresce manga e fibra ao longo do dia." },
  bandeira:  { kind: "bandeira", name: "Bandeira Bateu", emoji: "🚩", cost: { madeira: 5, fibra: 4 }, desc: "Marca o teu território com orgulho." },
};

// ─── Missões diárias ─────────────────────────────────────────
export interface DailyDef { id: string; label: string; goal: number; reward: number; emoji: string; }
export const DAILIES: DailyDef[] = [
  { id: "kills", label: "Derrotar 6 criaturas", goal: 6, reward: 60, emoji: "⚔️" },
  { id: "collect", label: "Recolher 8 recursos", goal: 8, reward: 50, emoji: "🌿" },
  { id: "steal", label: "Roubar com sucesso 1 vez", goal: 1, reward: 90, emoji: "🥷" },
  { id: "duel", label: "Vencer 1 duelo 1v1", goal: 1, reward: 90, emoji: "⚔️" },
  { id: "visit", label: "Visitar 1 marco do mundo", goal: 1, reward: 40, emoji: "🗺️" },
];

// ─── Desafios de empresas (gerados a partir da plataforma) ──
export interface CompanyChallenge {
  id: string; company: string; title: string; desc: string;
  objective: { kind: "kills" | "collect" | "visit" | "steal" | "duel"; goal: number };
  reward: { trofeus: number; cupao?: { id: string; code: string; label: string } };
}
export function challengeFromPlatform(contests: { id: string; title: string }[], vouchers: { id: string; code: string; type: string; value: number }[]): CompanyChallenge[] {
  const objs: CompanyChallenge["objective"]["kind"][] = ["kills", "collect", "visit", "steal", "duel"];
  return contests.slice(0, 4).map((c, i) => {
    const v = vouchers[i % Math.max(1, vouchers.length)];
    return {
      id: "emp_" + c.id,
      company: "Empresa Parceira",
      title: `Desafio: ${c.title.slice(0, 40)}`,
      desc: "Completa o objetivo e ganha um cupão real para usar na plataforma.",
      objective: { kind: objs[i % objs.length], goal: 2 + (i % 3) },
      reward: {
        trofeus: 40 + i * 10,
        cupao: v ? { id: v.id, code: v.code, label: v.type === "percentage" ? `-${v.value}%` : `-${v.value} MT` } : { id: "mundo", code: "BATEU-MUNDO-10", label: "-10%" },
      },
    };
  });
}

// ─── Misc ────────────────────────────────────────────────────
export function fmtNum(v: number): string {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(Math.round(v));
}
export function clamp(v: number, a: number, b: number): number { return Math.max(a, Math.min(b, v)); }
export function dist(ax: number, ay: number, bx: number, by: number): number { return Math.hypot(ax - bx, ay - by); }
export function now(): number { return Date.now(); }

export interface InventoryItem { id: string; qty: number; }
export interface VaultItem extends InventoryItem { locked?: boolean; }
export interface Equip { arma?: string; armadura?: string; amuleto?: string; }

export interface QuestState {
  date: string;
  kills: number; collect: number; steal: number; duel: number; visit: number;
  claimed: Record<string, boolean>;
}

export interface SagaState {
  killsTenentes: Record<string, number>;   // villainId -> tenentes mortos
  defeated: Record<string, number>;        // villainId -> vezes derrotado
}

export interface SaveV1 {
  v: 1;
  uid: string; name: string; classId: number;
  level: number; xp: number; gold: number; trofeus: number; pts: number;
  kills: number; deaths: number; streak: number;
  hp: number;
  inv: InventoryItem[]; equip: Equip;
  base: { x: number; y: number; claimed: boolean; prot: number; protUntil: number };
  vault: VaultItem[];
  quest: QuestState; saga: SagaState;
  discoveries: string[]; heat: number; karma: number;
  energy: number;
  pos: { x: number; y: number };
  playTimeMs: number;
  lastSeen: string;
}
