// @ts-nocheck
// ============================================================
// BATEU WORLD — ERA DAS LENDAS (v18) · DADOS DO MMO
// Reconstrução total com REA de Hordes.io + superação em
// TODOS os requisitos:
//  · 4 classes × 12 habilidades (48+) + pontos + livros
//  · 2 FACÇÕES com PvP aberto, FAMA e guerra de TERRITÓRIO
//  · Mobs agressivos em matilha, elites, chefes com mecânicas
//  · 2 MASMORRAS, 2 CHEFES MUNDIAIS e VILÕES da plataforma
//  · Grupo 1-clique com bónus XP/loot, CLÃS, duelos 1v1
//  · Oficina de melhorias +1..+12, 5 montarias, habitação
//    com proteção e invasão, cupões roubáveis, mundo que
//    CRESCE com a população e com as empresas da plataforma
// ============================================================

// ── Loot: itens ─────────────────────────────────────────────
export interface LootItem {
  id: string;
  slot: typeof SLOTS[number];
  name: string;
  emoji: string;
  rarity: number;
  level: number;
  stats: Record<string, number>;
  up: number;
}

// ── Raridades ───────────────────────────────────────────────
export const RARITY_META = [
  { name: "Comum", color: "#9ca3af", mult: 1.0, affixes: 1, emoji: "⚪" },
  { name: "Incomum", color: "#22c55e", mult: 1.18, affixes: 1, emoji: "🟢" },
  { name: "Raro", color: "#3b82f6", mult: 1.4, affixes: 2, emoji: "🔵" },
  { name: "Épico", color: "#a855f7", mult: 1.65, affixes: 3, emoji: "🟣" },
  { name: "Lendário", color: "#f59e0b", mult: 1.95, affixes: 4, emoji: "🟠" },
  { name: "Mítico", color: "#ec4899", mult: 2.35, affixes: 5, emoji: "💗" },
];

export const SLOTS = ["arma", "armadura", "elmo", "amuleto", "botas", "anel"] as const;

export const AFFIXES = [
  { id: "forca", label: "Força", stat: "atk", per: 2.2 },
  { id: "vigoraiz", label: "Vigor", stat: "hp", per: 9 },
  { id: "guarda", label: "Guarda", stat: "def", per: 1.4 },
  { id: "agilidade", label: "Agilidade", stat: "spd", per: 0.14 },
  { id: "precisao", label: "Precisão", stat: "crit", per: 0.9 },
  { id: "arcana", label: "Arcana", stat: "mana", per: 6 },
  { id: "vampirico", label: "Vampírico", stat: "leech", per: 0.5 },
];

// ── Classes ─────────────────────────────────────────────────
export interface ClassDef {
  id: number; name: string; emoji: string; color: string; hex: number;
  desc: string; resource: string;
  base: { atk: number; maxHp: number; def: number; spd: number; mana: number; crit: number };
  growth: { atk: number; maxHp: number; def: number; spd: number; mana: number };
  main: "str" | "int" | "agi";
}

export const CLASSES: ClassDef[] = [
  {
    id: 0, name: "Guerreiro", emoji: "⚔️", color: "#ef4444", hex: 0xef4444,
    desc: "Linha da frente:vida brutal, escudo e golpes devastadores",
    resource: "Fúria", main: "str",
    base: { atk: 14, maxHp: 220, def: 8, spd: 5.4, mana: 60, crit: 6 },
    growth: { atk: 3.2, maxHp: 26, def: 1.5, spd: 0.05, mana: 4 },
  },
  {
    id: 1, name: "Mago", emoji: "🔮", color: "#a855f7", hex: 0xa855f7,
    desc: "Arcano puro:explosões, meteoros e controlo de massa",
    resource: "Mana", main: "int",
    base: { atk: 17, maxHp: 150, def: 4, spd: 5.6, mana: 120, crit: 8 },
    growth: { atk: 4.0, maxHp: 14, def: 0.8, spd: 0.05, mana: 12 },
  },
  {
    id: 2, name: "Arqueiro", emoji: "🏹", color: "#22c55e", hex: 0x22c55e,
    desc: "Precisão letal:chuvas de flechas, veneno e esquivas",
    resource: "Foco", main: "agi",
    base: { atk: 15, maxHp: 170, def: 5, spd: 6.4, mana: 90, crit: 12 },
    growth: { atk: 3.6, maxHp: 17, def: 1.0, spd: 0.10, mana: 7 },
  },
  {
    id: 3, name: "Xamã", emoji: "🌿", color: "#14b8a6", hex: 0x14b8a6,
    desc: "Espíritos da terra:veneno, cura e correntes ancestrais",
    resource: "Espírito", main: "int",
    base: { atk: 13, maxHp: 185, def: 6, spd: 5.8, mana: 110, crit: 7 },
    growth: { atk: 3.0, maxHp: 20, def: 1.1, spd: 0.06, mana: 10 },
  },
];

// ── Habilidades: 4 × 12 = 48 (hordes tem ~50 no total; a
// nossa cada classe tem o seu arsenal completo + talentos) ──
export interface SkillDef {
  id: string; name: string; unlock: number; cd: number; mana: number;
  dmg: number; radius?: number; range?: number; speed?: number;
  kind: "golpe" | "projeto" | "area" | "buff" | "cura" | "dash" | "passiva";
  color: string; emoji: string; desc: string; ult?: boolean;
}

export const SKILLS: SkillDef[][] = [
  // GUERREIRO — linha da frente
  [
    { id: "g1", name: "Golpe Poderoso", unlock: 1, cd: 2.4, mana: 8, dmg: 1.5, range: 3.2, kind: "golpe", color: "#ef4444", emoji: "🗡️", desc: "Golpe pesado com a arma" },
    { id: "g2", name: "Investida", unlock: 1, cd: 8, mana: 10, dmg: 1.2, speed: 26, range: 14, kind: "dash", color: "#f97316", emoji: "💥", desc: "Avança e atropela os inimigos" },
    { id: "g3", name: "Grito de Guerra", unlock: 2, cd: 16, mana: 14, dmg: 0, kind: "buff", color: "#fbbf24", emoji: "📣", desc: "+35% ataque e +20% velocidade por 10s" },
    { id: "g4", name: "Corte Giratório", unlock: 4, cd: 5.5, mana: 16, dmg: 1.3, radius: 4.6, kind: "area", color: "#ef4444", emoji: "🌀", desc: "Rodopia atingindo tudo à volta" },
    { id: "g5", name: "Muralha Viva", unlock: 6, cd: 18, mana: 18, dmg: 0, kind: "buff", color: "#60a5fa", emoji: "🛡️", desc: "+60% defesa e escudo por 8s" },
    { id: "g6", name: "Lança de Titã", unlock: 9, cd: 7, mana: 20, dmg: 2.0, range: 6, kind: "golpe", color: "#fb923c", emoji: "🔱", desc: "Estocada longa que empurra" },
    { id: "g7", name: "Terremoto", unlock: 12, cd: 12, mana: 26, dmg: 1.7, radius: 7.5, kind: "area", color: "#a16207", emoji: "🌋", desc: "Racha o chão e atordoa" },
    { id: "g8", name: "Sede de Sangue", unlock: 16, cd: 22, mana: 24, dmg: 0, kind: "buff", color: "#dc2626", emoji: "🩸", desc: "Cada golpe cura 12% do dano por 12s" },
    { id: "g9", name: "Escudo Espiral", unlock: 20, cd: 14, mana: 22, dmg: 1.4, radius: 5, kind: "area", color: "#3b82f6", emoji: "🔷", desc: "Escudos giratórios cortam os inimigos", ult: true },
    { id: "g10", name: "Fúria Ancestral", unlock: 26, cd: 30, mana: 30, dmg: 0, kind: "buff", color: "#b91c1c", emoji: "🔥", desc: "+70% ataque, imune a atordoar, 10s" },
    { id: "g11", name: "Meteoro de Aço", unlock: 33, cd: 26, mana: 40, dmg: 3.2, radius: 8, kind: "area", color: "#7f1d1d", emoji: "☄️", desc: "Um meteoro de aço cai do céu", ult: true },
    { id: "g12", name: "Julgamento do Colosso", unlock: 40, cd: 45, mana: 55, dmg: 4.5, radius: 9, kind: "area", color: "#fbbf24", emoji: "⚡", desc: "ULTIMATE: o colosso julga todos à tua volta", ult: true },
  ],
  // MAGO — arcano
  [
    { id: "m1", name: "Dardo Arcano", unlock: 1, cd: 1.6, mana: 6, dmg: 1.35, speed: 24, range: 22, kind: "projeto", color: "#a855f7", emoji: "✨", desc: "Projétil arcano rápido" },
    { id: "m2", name: "Nova de Gelo", unlock: 1, cd: 6, mana: 14, dmg: 1.1, radius: 5.5, kind: "area", color: "#38bdf8", emoji: "❄️", desc: "Congela e abranda os inimigos" },
    { id: "m3", name: "Escudo Arcano", unlock: 2, cd: 15, mana: 16, dmg: 0, kind: "buff", color: "#818cf8", emoji: "🔮", desc: "Absorve dano e reflete 20%" },
    { id: "m4", name: "Bola de Fogo", unlock: 4, cd: 5, mana: 18, dmg: 1.9, speed: 18, radius: 3.6, range: 20, kind: "projeto", color: "#f97316", emoji: "🔥", desc: "Explode em área ao impacto" },
    { id: "m5", name: "Raios em Cadeia", unlock: 6, cd: 7, mana: 20, dmg: 1.5, radius: 6, range: 18, kind: "area", color: "#22d3ee", emoji: "⚡", desc: "Relâmpago salta entre inimigos" },
    { id: "m6", name: "Teleporte", unlock: 9, cd: 10, mana: 12, dmg: 0, speed: 30, range: 12, kind: "dash", color: "#c084fc", emoji: "💫", desc: "Desaparece e reaparece adiante" },
    { id: "m7", name: "Tempestade Arcana", unlock: 12, cd: 13, mana: 30, dmg: 1.6, radius: 8, kind: "area", color: "#8b5cf6", emoji: "🌪️", desc: "Vórtice arrasta e fere os inimigos", ult: true },
    { id: "m8", name: "Sintonia Arcana", unlock: 16, cd: 24, mana: 0, dmg: 0, kind: "buff", color: "#38bdf8", emoji: "📶", desc: "-30% cooldowns e mana infinita 8s" },
    { id: "m9", name: "Cometa Estelar", unlock: 20, cd: 22, mana: 36, dmg: 2.8, radius: 7, kind: "area", color: "#f472b6", emoji: "☄️", desc: "Um cometa cai dos céus", ult: true },
    { id: "m10", name: "Prisão de Éter", unlock: 26, cd: 20, mana: 28, dmg: 0.8, radius: 6.5, kind: "area", color: "#6366f1", emoji: "🔗", desc: "Preso e incapaz de agir 3s" },
    { id: "m11", name: "Aniquilação", unlock: 33, cd: 30, mana: 50, dmg: 3.6, range: 26, kind: "projeto", speed: 34, color: "#e879f9", emoji: "🔫", desc: "Feixe de aniquilação perfurante", ult: true },
    { id: "m12", name: "Supernova", unlock: 40, cd: 45, mana: 60, dmg: 4.8, radius: 11, kind: "area", color: "#f0abfc", emoji: "🌟", desc: "ULTIMATE: uma estrela morre onde pisas", ult: true },
  ],
  // ARQUEIRO — precisão
  [
    { id: "a1", name: "Flecha Certeira", unlock: 1, cd: 1.5, mana: 5, dmg: 1.4, speed: 30, range: 26, kind: "projeto", color: "#22c55e", emoji: "🏹", desc: "Flecha rápida e precisa" },
    { id: "a2", name: "Rajada Dupla", unlock: 1, cd: 4, mana: 10, dmg: 0.95, speed: 32, range: 24, kind: "projeto", color: "#4ade80", emoji: "🎯", desc: "Duas flechas em sequência" },
    { id: "a3", name: "Passo Sombrio", unlock: 2, cd: 9, mana: 8, dmg: 0, speed: 28, range: 10, kind: "dash", color: "#a3e635", emoji: "💨", desc: "Esquiva veloz com 0.4s invulnerável" },
    { id: "a4", name: "Flecha Venenosa", unlock: 4, cd: 6, mana: 14, dmg: 1.2, speed: 26, range: 24, kind: "projeto", color: "#84cc16", emoji: "☠️", desc: "Envenena por 6 segundos" },
    { id: "a5", name: "Chuva de Flechas", unlock: 6, cd: 9, mana: 22, dmg: 1.5, radius: 6.5, range: 20, kind: "area", color: "#16a34a", emoji: "🌧️", desc: "Saraivada cai numa área" },
    { id: "a6", name: "Olho de Falcão", unlock: 9, cd: 18, mana: 12, dmg: 0, kind: "buff", color: "#fbbf24", emoji: "🦅", desc: "+40% crítico e alcance por 10s" },
    { id: "a7", name: "Tiro Perfurante", unlock: 12, cd: 8, mana: 20, dmg: 2.4, speed: 40, range: 30, kind: "projeto", color: "#eab308", emoji: "🗡️", desc: "Atravessa todos na linha", ult: true },
    { id: "a8", name: "Armadilha Explosiva", unlock: 16, cd: 12, mana: 18, dmg: 1.7, radius: 5, kind: "area", color: "#f97316", emoji: "🪤", desc: "Armadilha que lança inimigos ao ar" },
    { id: "a9", name: "Dança das Mil Flechas", unlock: 20, cd: 24, mana: 34, dmg: 2.6, radius: 8, range: 16, kind: "area", color: "#22c55e", emoji: "🌟", desc: "Gira atirando em todas as direções", ult: true },
    { id: "a10", name: "Marcação de Caça", unlock: 26, cd: 20, mana: 16, dmg: 0, kind: "buff", color: "#f87171", emoji: "🎯", desc: "O alvo sofre +25% de todos os danos 12s" },
    { id: "a11", name: "Flecha do Cometa", unlock: 33, cd: 28, mana: 44, dmg: 3.8, speed: 44, range: 32, kind: "projeto", color: "#fb923c", emoji: "☄️", desc: "Uma flecha a arder como um cometa", ult: true },
    { id: "a12", name: "Tempestade de Falcões", unlock: 40, cd: 45, mana: 55, dmg: 4.4, radius: 10, range: 24, kind: "area", color: "#facc15", emoji: "🦅", desc: "ULTIMATE: mil falcões espirituais atacam", ult: true },
  ],
  // XAMÃ — espíritos e venenos (hordes: healer; nós: híbrido superior)
  [
    { id: "x1", name: "Dardo Espiritual", unlock: 1, cd: 1.7, mana: 6, dmg: 1.3, speed: 22, range: 20, kind: "projeto", color: "#14b8a6", emoji: "🌿", desc: "Dardo de energia espiritual" },
    { id: "x2", name: "Bênção da Terra", unlock: 1, cd: 8, mana: 14, dmg: 0, kind: "cura", color: "#34d399", emoji: "💚", desc: "Cura 22% da vida máxima" },
    { id: "x3", name: "Mordida Venenosa", unlock: 2, cd: 5, mana: 12, dmg: 1.1, speed: 24, range: 18, kind: "projeto", color: "#84cc16", emoji: "🐍", desc: "Veneno que corrói por 7s" },
    { id: "x4", name: "Corrente Ancestral", unlock: 4, cd: 7, mana: 18, dmg: 1.4, radius: 6, range: 16, kind: "area", color: "#2dd4bf", emoji: "⚡", desc: "Corrente salta entre inimigos" },
    { id: "x5", name: "Totem Protetor", unlock: 6, cd: 16, mana: 20, dmg: 0, kind: "buff", color: "#fbbf24", emoji: "🗿", desc: "Totem reduz 30% do dano recebido 10s" },
    { id: "x6", name: "Onda de Cura", unlock: 9, cd: 12, mana: 24, dmg: 0, kind: "cura", color: "#4ade80", emoji: "🌊", desc: "Cura em área ao teu redor" },
    { id: "x7", name: "Fúria dos Espíritos", unlock: 12, cd: 14, mana: 28, dmg: 1.8, radius: 7, kind: "area", color: "#14b8a6", emoji: "👻", desc: "Espíritos furiosos dilaceram a área", ult: true },
    { id: "x8", name: "Liga de Vida", unlock: 16, cd: 20, mana: 18, dmg: 0, kind: "buff", color: "#f472b6", emoji: "🔗", desc: "25% do dano que causes volta em cura 10s" },
    { id: "x9", name: "Avatar da Natureza", unlock: 20, cd: 30, mana: 40, dmg: 0, kind: "buff", color: "#22c55e", emoji: "🌳", desc: "+45% em tudo e aura de cura 12s", ult: true },
    { id: "x10", name: "Chamado do Rebanho", unlock: 26, cd: 22, mana: 30, dmg: 1.2, radius: 8, kind: "area", color: "#a3e635", emoji: "🐗", desc: "Espíritos de feras embatem nos inimigos" },
    { id: "x11", name: "Punho do Vulcão", unlock: 33, cd: 26, mana: 46, dmg: 3.4, radius: 7, kind: "area", color: "#f97316", emoji: "🌋", desc: "A terra explode em magma espiritual", ult: true },
    { id: "x12", name: "Julgamento dos Antigos", unlock: 40, cd: 45, mana: 58, dmg: 4.6, radius: 10, kind: "area", color: "#2dd4bf", emoji: "🗿", desc: "ULTIMATE: os anciãos julgam os profanos", ult: true },
  ],
];

export const SKILL_BOOK_XP = "Livro de Habilidades";

// ── Títulos e Fama ──────────────────────────────────────────
export const TITLES: { lvl: number; title: string }[] = [
  { lvl: 1, title: "Novato" }, { lvl: 4, title: "Aventureiro" }, { lvl: 8, title: "Caçador" },
  { lvl: 13, title: "Veterano" }, { lvl: 18, title: "Elite" }, { lvl: 24, title: "Campeão" },
  { lvl: 30, title: "Mestre" }, { lvl: 38, title: "Grão-Mestre" }, { lvl: 46, title: "Lenda" },
  { lvl: 55, title: "Imortal" },
];

export const FAME_RANKS: { min: number; name: string; emoji: string }[] = [
  { min: 0, name: "Recruta", emoji: "🎖️" },
  { min: 100, name: "Soldado", emoji: "🪖" },
  { min: 300, name: "Cavaleiro", emoji: "⚔️" },
  { min: 800, name: "Campeão de Guerra", emoji: "🏆" },
  { min: 2000, name: "Senhor da Guerra", emoji: "👑" },
  { min: 5000, name: "LENDA VIVA", emoji: "🌟" },
];

// ── Facções ─────────────────────────────────────────────────
export const FACTIONS = [
  {
    id: 0, name: "VANGUARDA", emoji: "🛡️", color: "#3b82f6", hex: 0x3b82f6,
    motto: "A ordem forjará a vitória",
    desc: "Defensores do reino. Honra, disciplina e escudos impenetráveis.",
  },
  {
    id: 1, name: "TEMPESTADE", emoji: "⚡", color: "#f59e0b", hex: 0xf59e0b,
    motto: "Nada resiste à tempestade",
    desc: "Conquistadores implacáveis. Fúria, velocidade e pilhagem sem limites.",
  },
];

export const FAME_PER_PVP_KILL = 15;
export const FAME_PER_TOWER = 25;
export const FAME_PER_VILLAIN = 50;

// ── Regiões do mundo (800×800) ──────────────────────────────
export interface RegionDef {
  id: string; name: string; cx: number; cz: number; r: number;
  color: string; lvl: [number, number]; desc: string;
  danger: number; locked?: boolean; lockLvl?: number; lockPop?: number; hub?: boolean;
}

export const REGIONS: RegionDef[] = [
  { id: "vila", name: "Vila Dourada", cx: 0, cz: 0, r: 60, color: "#fcd34d", lvl: [1, 99], desc: "Coração da plataforma:banco, loja, feira e tendas de empresa", danger: 0, hub: true },
  { id: "fortaleza", name: "Fortaleza Vanguarda", cx: -250, cz: -180, r: 46, color: "#60a5fa", lvl: [1, 99], desc: "Capital da facção VANGUARDA 🛡️", danger: 0, hub: true },
  { id: "bastiao", name: "Bastião Tempestade", cx: 250, cz: 180, r: 46, color: "#fbbf24", lvl: [1, 99], desc: "Capital da facção TEMPESTADE ⚡", danger: 0, hub: true },
  { id: "planicie", name: "Planície Dourada", cx: -80, cz: 40, r: 110, color: "#a3e635", lvl: [1, 8], desc: "Campos calmos para os primeiros passos", danger: 1 },
  { id: "floresta", name: "Floresta Ancestral", cx: -190, cz: 140, r: 115, color: "#16a34a", lvl: [6, 16], desc: "Árvores milenares e espíritos guardiões", danger: 2 },
  { id: "dunas", name: "Dunas Escaldantes", cx: 60, cz: -170, r: 115, color: "#f59e0b", lvl: [12, 22], desc: "Deserto brutal com relíquias enterradas", danger: 3 },
  { id: "pantano", name: "Pântano Sombrio", cx: 200, cz: 60, r: 110, color: "#65a30d", lvl: [18, 30], desc: "Lodo venenoso e bruxas antigas", danger: 4 },
  { id: "vulcao", name: "Terras Vulcânicas", cx: -60, cz: -240, r: 110, color: "#dc2626", lvl: [26, 40], desc: "Magma vivo e dragões neonatos", danger: 5 },
  { id: "tundra", name: "Tundra Gelada", cx: 280, cz: -80, r: 105, color: "#67e8f9", lvl: [34, 48], desc: "Gelo eterno, yetis e espíritos frios", danger: 6 },
  { id: "titas", name: "Vale dos Titãs", cx: -280, cz: -40, r: 95, color: "#a8a29e", lvl: [42, 55], desc: "Ciclopes e colossos de pedra", danger: 7, locked: true, lockLvl: 25, lockPop: 10 },
  { id: "escuro", name: "Coração Escuro", cx: 120, cz: 250, r: 100, color: "#7c3aed", lvl: [50, 60], desc: "O fim do mundo:ceifadores e a Rainha das Sombras", danger: 8, locked: true, lockLvl: 45, lockPop: 50 },
];

export const TOWERS = [
  { id: "sol", name: "Torre do Sol", region: "planicie", x: -80, z: 40, emoji: "🌞" },
  { id: "nevoa", name: "Torre da Névoa", region: "pantano", x: 200, z: 60, emoji: "🌫️" },
  { id: "fogo", name: "Torre do Fogo", region: "vulcao", x: -60, z: -240, emoji: "🔥" },
];

// ── Mobs (19 tipos) ─────────────────────────────────────────
export interface MobType {
  id: string; name: string; tier: number; color: number; feature: string;
  scale: number; hp: number; atk: number; xp: number; aggro: number;
  speed: number; region: string; pack: number;
}

export const MOB_TYPES: MobType[] = [
  { id: "rato", name: "Rato Gigante", tier: 1, color: 0x8d6e63, feature: "ears", scale: 0.9, hp: 55, atk: 7, xp: 9, aggro: 9, speed: 3.4, region: "planicie", pack: 2 },
  { id: "escara", name: "Escaravelho Blindado", tier: 1, color: 0x57534e, feature: "horns", scale: 0.8, hp: 70, atk: 6, xp: 8, aggro: 7, speed: 2.6, region: "planicie", pack: 3 },
  { id: "javali", name: "Javali Selvagem", tier: 1, color: 0x92400e, feature: "tusks", scale: 1.1, hp: 95, atk: 10, xp: 12, aggro: 11, speed: 4.4, region: "planicie", pack: 2 },
  { id: "lobo", name: "Lobo Cinzento", tier: 2, color: 0x6b7280, feature: "ears", scale: 1.0, hp: 130, atk: 15, xp: 20, aggro: 14, speed: 5.0, region: "floresta", pack: 3 },
  { id: "vespa", name: "Vespa Rainha", tier: 2, color: 0xfacc15, feature: "wings", scale: 0.9, hp: 110, atk: 18, xp: 22, aggro: 16, speed: 5.6, region: "floresta", pack: 2 },
  { id: "golem", name: "Golem de Musgo", tier: 2, color: 0x15803d, feature: "spikes", scale: 1.4, hp: 220, atk: 20, xp: 28, aggro: 10, speed: 2.4, region: "floresta", pack: 1 },
  { id: "escorpiao", name: "Escorpião de Areia", tier: 3, color: 0xd97706, feature: "tusks", scale: 1.0, hp: 190, atk: 26, xp: 36, aggro: 15, speed: 4.8, region: "dunas", pack: 3 },
  { id: "falcao", name: "Falcão das Dunas", tier: 3, color: 0xf59e0b, feature: "wings", scale: 0.9, hp: 160, atk: 30, xp: 38, aggro: 18, speed: 6.0, region: "dunas", pack: 2 },
  { id: "mumia", name: "Múmia Errante", tier: 3, color: 0xe7e5e4, feature: "horns", scale: 1.1, hp: 260, atk: 34, xp: 44, aggro: 13, speed: 3.2, region: "dunas", pack: 2 },
  { id: "sapo", name: "Sapo Venenoso", tier: 4, color: 0x65a30d, feature: "ears", scale: 1.0, hp: 240, atk: 38, xp: 52, aggro: 12, speed: 3.8, region: "pantano", pack: 3 },
  { id: "serpente", name: "Serpente do Lodo", tier: 4, color: 0x4d7c0f, feature: "tusks", scale: 1.2, hp: 300, atk: 44, xp: 60, aggro: 16, speed: 4.6, region: "pantano", pack: 2 },
  { id: "bruxa", name: "Bruxa do Pântano", tier: 4, color: 0x7c3aed, feature: "horns", scale: 1.1, hp: 340, atk: 52, xp: 70, aggro: 17, speed: 4.0, region: "pantano", pack: 1 },
  { id: "igneo", name: "Ígneo Menor", tier: 5, color: 0xf97316, feature: "spikes", scale: 1.0, hp: 380, atk: 60, xp: 82, aggro: 16, speed: 4.6, region: "vulcao", pack: 3 },
  { id: "magma", name: "Golem de Magma", tier: 5, color: 0xdc2626, feature: "spikes", scale: 1.6, hp: 560, atk: 72, xp: 100, aggro: 12, speed: 2.8, region: "vulcao", pack: 1 },
  { id: "dragao", name: "Dragão Neonato", tier: 5, color: 0xb91c1c, feature: "wings", scale: 1.3, hp: 640, atk: 85, xp: 125, aggro: 20, speed: 5.4, region: "vulcao", pack: 1 },
  { id: "gelido", name: "Lobo Gélido", tier: 6, color: 0x67e8f9, feature: "ears", scale: 1.2, hp: 520, atk: 88, xp: 130, aggro: 18, speed: 5.8, region: "tundra", pack: 3 },
  { id: "yeti", name: "Yeti Jovem", tier: 6, color: 0xe0f2fe, feature: "horns", scale: 1.7, hp: 820, atk: 100, xp: 160, aggro: 15, speed: 3.6, region: "tundra", pack: 2 },
  { id: "ciclope", name: "Ciclope", tier: 7, color: 0xa8a29e, feature: "horns", scale: 2.0, hp: 1100, atk: 130, xp: 220, aggro: 16, speed: 3.8, region: "titas", pack: 1 },
  { id: "ceifador", name: "Ceifador Sombrio", tier: 8, color: 0x4c1d95, feature: "spikes", scale: 1.6, hp: 1400, atk: 165, xp: 300, aggro: 22, speed: 5.2, region: "escuro", pack: 2 },
];

// ── Chefes de região (com mecânicas) ────────────────────────
export interface BossDef { name: string; region: string; tier: number; x: number; z: number; mech: "slam" | "summon" | "enrage" | "nova"; title: string }

export const REGION_BOSSES: BossDef[] = [
  { name: "Rei Javali Cornudo", region: "planicie", tier: 1, x: -110, z: 70, mech: "slam", title: "O Primeiro Desafio" },
  { name: "Guardiã Anciã", region: "floresta", tier: 2, x: -215, z: 165, mech: "summon", title: "Espírito da Floresta" },
  { name: "Faraó das Areias", region: "dunas", tier: 3, x: 85, z: -190, mech: "nova", title: "Terror das Dunas" },
  { name: "Mãe dos Sapos", region: "pantano", tier: 4, x: 225, z: 85, mech: "summon", title: "Rainha do Lodo" },
  { name: "Olmag, Coração de Magma", region: "vulcao", tier: 5, x: -85, z: -262, mech: "enrage", title: "Fúria Vulcânica" },
  { name: "Patriarca Yeti", region: "tundra", tier: 6, x: 300, z: -100, mech: "slam", title: "Colosso Gelado" },
  { name: "Titã Pedra-Viva", region: "titas", tier: 7, x: -300, z: -55, mech: "slam", title: "Montanha que Anda" },
  { name: "Ceifador Supremo", region: "escuro", tier: 8, x: 140, z: 275, mech: "nova", title: "Fim de Todos" },
];

// ── Chefes mundiais (aparecem em ciclos, anúncio global) ────
export const WORLD_BOSSES = [
  { name: "Nyx, Rainha das Sombras", region: "escuro", tier: 9, x: 120, z: 255, cycle: 420, emoji: "🌑", title: "CHEFE MUNDIAL" },
  { name: "Ignarok, Devorador de Mundos", region: "vulcao", tier: 9, x: -60, z: -255, cycle: 420, emoji: "☄️", title: "CHEFE MUNDIAL" },
];

// ── Vilões da PLATAFORMA (spawn por eventos/timer) ──────────
export const VILLAINS = [
  { name: "Barão dos Cupões", emoji: "🎩", tier: 6, mech: "nova", loot: "cupao", taunt: "Os vossos cupões pertencem-me agora!" },
  { name: "O Colecionador", emoji: "🎭", tier: 7, mech: "summon", loot: "cupao", taunt: "Que bela coleção de heróis vou fazer..." },
  { name: "Fantasma do Leilão", emoji: "👻", tier: 7, mech: "enrage", loot: "essencia", taunt: "Licito a vossa alma!" },
  { name: "General Tempestade", emoji: "🌩️", tier: 8, mech: "slam", loot: "cupao", taunt: "A tempestade varre os fracos!" },
];

// ── Masmorras ───────────────────────────────────────────────
export const DUNGEONS = [
  {
    id: "cripta", name: "Cripta Afundada", region: "pantano", x: 185, z: 95, minLvl: 15,
    waves: 5, boss: "Senhor da Cripta", tier: 4, emoji: "💀",
    desc: "5 ondas de mortos-vivos e o Senhor da Cripta",
  },
  {
    id: "mina", name: "Mina de Lava", region: "vulcao", x: -35, z: -225, minLvl: 30,
    waves: 7, boss: "Forja Viva", tier: 5, emoji: "🔥",
    desc: "7 ondas ígneas e a Forja Viva ardente",
  },
];

// ── Montarias ───────────────────────────────────────────────
export const MOUNTS = [
  { id: "lobo", name: "Lobo Veloz", emoji: "🐺", mult: 1.35, color: 0x6b7280, source: "Loja · 15.000 ouro" },
  { id: "corcel", name: "Corcel Dourado", emoji: "🐴", mult: 1.45, color: 0xd97706, source: "Campanha Cap. 3" },
  { id: "javali", name: "Javali Blindado", emoji: "🐗", mult: 1.55, color: 0x78350f, source: "Drop de elite raro" },
  { id: "pantera", name: "Pantera Sombria", emoji: "🐈‍⬛", mult: 1.7, color: 0x1f2937, source: "Chefe mundial" },
  { id: "dragao", name: "Dragão Jovem", emoji: "🐉", mult: 1.9, color: 0xb91c1c, source: "Vilão da plataforma (raro)" },
];

// ── Habitação ───────────────────────────────────────────────
export const BUILDINGS = [
  { id: "casa", name: "Casa", emoji: "🏠", levels: 4, cost: [2000, 6000, 18000, 45000], desc: "O teu lar. Descansar dá buff +15% XP" },
  { id: "muralha", name: "Muralha", emoji: "🧱", levels: 3, cost: [1500, 5000, 14000], desc: "Proteção física do lote" },
  { id: "torre", name: "Torre de Guarda", emoji: "🏹", levels: 3, cost: [4000, 12000, 30000], desc: "Ataca invasores e protege os cupões guardados" },
  { id: "estatua", name: "Estátua da Fama", emoji: "🗿", levels: 2, cost: [8000, 20000], desc: "+5% Fama ganha por nível" },
  { id: "fogueira", name: "Fogueira", emoji: "🔥", levels: 1, cost: [1000], desc: "Ponto de renascimento pessoal" },
];

// ── Poções (Oficina/Cauldron) ───────────────────────────────
export const POTIONS = [
  { id: "vida", name: "Poção de Vida", emoji: "🧪", cost: { erva: 3 }, desc: "Recupera 45% da vida" },
  { id: "forca", name: "Elixir de Força", emoji: "💪", cost: { erva: 2, minerio: 2 }, desc: "+40% ataque por 60s" },
  { id: "vento", name: "Poção do Vento", emoji: "🌪️", cost: { cristal: 2, erva: 1 }, desc: "+35% velocidade por 60s" },
  { id: "guarda", name: "Óleo de Guarda", emoji: "🛡️", cost: { minerio: 3, cristal: 1 }, desc: "+40% defesa por 60s" },
];

export const MATERIALS = [
  { id: "fragmento", name: "Fragmento Arcano", emoji: "🔹", desc: "Melhorias na Oficina" },
  { id: "erva", name: "Erva Solar", emoji: "🌿", desc: "Recolhe em arbustos" },
  { id: "minerio", name: "Minério de Ferro", emoji: "⛏️", desc: "Recolhe em veios" },
  { id: "cristal", name: "Cristal Arcano", emoji: "💎", desc: "Recolhe em clusters" },
  { id: "essencia", name: "Essência de Chefe", emoji: "🌟", desc: "Só de chefes e vilões" },
];

// ── Campanha (12 capítulos — hordes NÃO tem quests) ─────────
export interface Chapter { id: number; title: string; goal: string; kind: string; target: number; reward: string }

export const CAMPAIGN: Chapter[] = [
  { id: 1, title: "Primeiros Passos", goal: "Abate 5 criaturas na Planície Dourada", kind: "kills", target: 5, reward: "500 ouro + 1 Livro" },
  { id: 2, title: "O Chamado das Armas", goal: "Alcança o nível 3", kind: "level", target: 3, reward: "1.500 ouro" },
  { id: 3, title: "O Corcel", goal: "Fala com o Mestre de Montarias na Vila", kind: "npc", target: 1, reward: "Corcel Dourado 🐴" },
  { id: 4, title: "Primeira Prova", goal: "Abate um ELITE", kind: "elite", target: 1, reward: "2.000 ouro + Fragmentos" },
  { id: 5, title: "A Guerra Começa", goal: "Confirma a tua facção no teu bastião", kind: "flag", target: 1, reward: "3.000 ouro + Fama" },
  { id: 6, title: "Domínio", goal: "Participa na captura de uma Torre de Domínio", kind: "tower", target: 1, reward: "5.000 ouro + Fama" },
  { id: 7, title: "Sangue e Glória", goal: "Vence um duelo 1v1", kind: "duel", target: 1, reward: "6.000 ouro" },
  { id: 8, title: "Nas Profundezas", goal: "Completa a Cripta Afundada", kind: "dungeon", target: 1, reward: "8.000 ouro + item Épico" },
  { id: 9, title: "Um Teto Próprio", goal: "Constrói a tua Casa", kind: "house", target: 1, reward: "10.000 ouro" },
  { id: 10, title: "Caça ao Vilão", goal: "Ajuda a abater um VILÃO da plataforma", kind: "villain", target: 1, reward: "12.000 ouro + cupão" },
  { id: 11, title: "O Chefe Mundial", goal: "Participa num CHEFE MUNDIAL", kind: "worldboss", target: 1, reward: "20.000 ouro + item Lendário" },
  { id: 12, title: "Lenda Viva", goal: "Alcança o nível 25", kind: "level", target: 25, reward: "Título LENDA + 30.000 ouro" },
];

export const DAILY_QUESTS = [
  { id: "d_kills", label: "Caçador do Dia", goal: "Abate 15 criaturas", kind: "kills", target: 15, reward: 1200 },
  { id: "d_elite", label: "Caça ao Elite", goal: "Abate 2 elites", kind: "elite", target: 2, reward: 2000 },
  { id: "d_boss", label: "Desafio ao Chefe", goal: "Abate 1 chefe de região", kind: "boss", target: 1, reward: 3000 },
  { id: "d_steal", label: "Ladraão", goal: "Rouba 1 cupão (PvP ou vilão)", kind: "steal", target: 1, reward: 1500 },
  { id: "d_gather", label: "Recolha", goal: "Recolhe 6 recursos", kind: "gather", target: 6, reward: 1000 },
];

// ── Nomes de heróis-bot (o mundo nunca está vazio) ──────────
export const BOT_NAMES = [
  "Kudumba", "Zalala", "Nhamirre", "Tchaka", "Mabja", "Quissico", "Xitende",
  "Nwamatheu", "Mandlate", "Chissano", "Bonifácio", "Uandja", "Kuveya",
  "Tavares", "Muinga", "Domingas", "Sitoe", "Machava", "Cuna", "Zhingo",
];

// ── Curvas ──────────────────────────────────────────────────
export const LEVEL_CAP = 60;
export function xpNeed(l: number): number {
  return Math.round(50 * Math.pow(l, 2.35));
}
export function mobXp(tier: number, charLvl: number, mobLvl: number): number {
  const base = 6 * Math.pow(tier, 1.55);
  const diff = mobLvl - charLvl;
  const scale = diff >= -5 ? 1 : Math.max(0.1, 1 + diff * 0.07);
  return Math.max(1, Math.round(base * scale));
}
export function mobLevelForTier(tier: number): number {
  return Math.round(tier * 6 + 2 + Math.random() * 3);
}

// ── Zona segura (sem PvP perto de hubs) ─────────────────────
export const PVP_SAFE_RADIUS = 70;

// ── Buffs ───────────────────────────────────────────────────
export const BUFFS: Record<string, { name: string; emoji: string; desc: string }> = {
  guerra: { name: "Grito de Guerra", emoji: "📣", desc: "+35% ATK" },
  muralha: { name: "Muralha Viva", emoji: "🛡️", desc: "+60% DEF" },
  sangue: { name: "Sede de Sangue", emoji: "🩸", desc: "Roubo de vida" },
  furiatotal: { name: "Fúria Ancestral", emoji: "🔥", desc: "+70% ATK" },
  escudoarcano: { name: "Escudo Arcano", emoji: "🔮", desc: "Absorve dano" },
  sintonia: { name: "Sintonia Arcana", emoji: "📶", desc: "-30% CD" },
  falcao: { name: "Olho de Falcão", emoji: "🦅", desc: "+40% CRIT" },
  marcado: { name: "Marcação", emoji: "🎯", desc: "+25% dano no alvo" },
  totem: { name: "Totem Protetor", emoji: "🗿", desc: "-30% dano" },
  liga: { name: "Liga de Vida", emoji: "🔗", desc: "25% do dano cura" },
  avatar: { name: "Avatar da Natureza", emoji: "🌳", desc: "+45% tudo" },
  territorio: { name: "Domínio de Facção", emoji: "🏳️", desc: "+10% XP (torre)" },
  descanso: { name: "Descanso em Casa", emoji: "🏠", desc: "+15% XP" },
  estrelas: { name: "Chuva de Estrelas", emoji: "🌟", desc: "XP ×2" },
  forcapocao: { name: "Elixir de Força", emoji: "💪", desc: "+40% ATK" },
  ventopocao: { name: "Poção do Vento", emoji: "🌪️", desc: "+35% VEL" },
  guardapocao: { name: "Óleo de Guarda", emoji: "🛡️", desc: "+40% DEF" },
  grupo: { name: "Bónus de Grupo", emoji: "🤝", desc: "+XP/+loot por membro perto" },
};

// ──Marcos com significado (20) ─────────────────────────────
export const LANDMARKS = [
  { id: "banco", name: "Banco de Pontos", x: -12, z: -8, r: 5, emoji: "🏦", desc: "Troca ouro por créditos reais da plataforma" },
  { id: "leilao", name: "Casa de Leilões", x: 14, z: -6, r: 5, emoji: "🔨", desc: "Acede aos leilões reais da plataforma" },
  { id: "feira", name: "Feira de Bens", x: -30, z: 12, r: 6, emoji: "🏪", desc: "Bens em alienação reais expostos no mundo" },
  { id: "loja", name: "Loja do Mercador", x: 30, z: 14, r: 5, emoji: "🛒", desc: "Poções, montarias e melhorias" },
  { id: "montaria", name: "Mestre de Montarias", x: -6, z: 22, r: 4, emoji: "🐴", desc: "Reclama e invoca montarias" },
  { id: "portal_v", name: "Portal Vanguarda", x: -60, z: -40, r: 6, emoji: "🌀", desc: "Teleporta à Fortaleza Vanguarda" },
  { id: "portal_t", name: "Portal Tempestade", x: 60, z: 40, r: 6, emoji: "🌀", desc: "Teleporta ao Bastião Tempestade" },
  { id: "arena", name: "Arena dos Duelos", x: 0, z: 46, r: 10, emoji: "⚔️", desc: "Duelos 1v1 com aposta" },
  { id: "cripta_e", name: "Entrada da Cripta", x: 185, z: 95, r: 5, emoji: "💀", desc: "Masmorra: Cripta Afundada (Nv15+)" },
  { id: "mina_e", name: "Entrada da Mina", x: -35, z: -225, r: 5, emoji: "🔥", desc: "Masmorra: Mina de Lava (Nv30+)" },
  { id: "obelisco", name: "Obelisco das Lendas", x: 8, z: -20, r: 4, emoji: "📜", desc: "Ranking global de lendas e fama" },
  { id: "arvore", name: "Árvore dos Juramentos", x: -190, z: 140, r: 8, emoji: "🌳", desc: "Clãs são fundados aqui" },
  { id: "campog", name: "Campo de Guerra", x: 0, z: -100, r: 14, emoji: "🏳️", desc: "Zona neutra de batalha entre facções" },
  { id: "fonte", name: "Fonte da Sorte", x: 22, z: -14, r: 4, emoji: "⛲", desc: "Sorteios e concursos reais da plataforma" },
  { id: "sino", name: "Sino de Guerra", x: -20, z: -18, r: 4, emoji: "🔔", desc: "Anuncia invasões de vilões" },
  { id: "tenda1", name: "Tenda de Empresa I", x: 38, z: 8, r: 4, emoji: "🎪", desc: "Desafios e prémios de empresas reais" },
  { id: "tenda2", name: "Tenda de Empresa II", x: 44, z: 18, r: 4, emoji: "🎪", desc: "Desafios e prémios de empresas reais" },
  { id: "tenda3", name: "Tenda de Empresa III", x: 34, z: 22, r: 4, emoji: "🎪", desc: "Desafios e prémios de empresas reais" },
  { id: "estatua_h", name: "Estatua do Herói", x: -14, z: 8, r: 4, emoji: "🗿", desc: "Homenagem às lendas da facção" },
  { id: "lote", name: "Bairro das Residências", x: 70, z: -30, r: 18, emoji: "🏘️", desc: "Constroi a tua casa e protege os cupões" },
];
