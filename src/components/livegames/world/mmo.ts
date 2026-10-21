// @ts-nocheck
// ============================================================
// BATEU HORDES (v20) · DADOS OFICIAIS DO HORDES.IO
// Conteúdo EXACTO das fontes oficiais (wiki.gg + hordes.io/info/skills):
//  · 4 classes × 12 habilidades OFICIAIS com MP/CD reais
//  · 2 facções oficiais: VANGUARD vs BLOODLUST
//  · 83 criaturas oficiais nv.1-45 com HP/XP exactos da wiki
//  · Regiões reais: Guardstone, Headless, Faivel, Oásis, Marrowlands
//  · Espécies raras oficiais + CHEFE MUNDIAL GLOOMFURY
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
  // GUERREIRO — linha da frente (oficial: Slash, Crescent Swipe, Whirlwind…)
  [
    { id: "g1", name: "Golpe", unlock: 1, cd: 1.0, mana: 2, dmg: 1.35, range: 3.2, kind: "golpe", color: "#ef4444", emoji: "🗡️", desc: "Golpe com força extra; cura 5% do dano causado" },
    { id: "g2", name: "Golpe Crescente", unlock: 1, cd: 6, mana: 4, dmg: 1.15, radius: 4.2, kind: "area", color: "#f87171", emoji: "🌀", desc: "Rodopia a espada, ferindo tudo à volta" },
    { id: "g3", name: "Redemoinho", unlock: 6, cd: 30, mana: 13, dmg: 1.6, radius: 6, kind: "area", color: "#dc2626", emoji: "🌪️", desc: "Gira sem parar e atinge todos; abranda-te enquanto dura" },
    { id: "g4", name: "Baluarte", unlock: 9, cd: 30, mana: 8, dmg: 0, kind: "buff", color: "#60a5fa", emoji: "🛡️", desc: "+34% de bloqueio; cada bloqueio cura-te" },
    { id: "g5", name: "Provocar", unlock: 11, cd: 15, mana: 4, dmg: 0, kind: "buff", color: "#fbbf24", emoji: "📣", desc: "Força os monstros à volta a atacar-te" },
    { id: "g6", name: "Grito Impiedoso", unlock: 13, cd: 30, mana: 4, dmg: 0, kind: "cura", color: "#fca5a5", emoji: "❤️", desc: "Recupera 25% da vida que te falta" },
    { id: "g7", name: "Investida", unlock: 15, cd: 15, mana: 12, dmg: 1.3, range: 26, speed: 26, kind: "dash", color: "#f97316", emoji: "💥", desc: "Avança até ao alvo e atordoa-o" },
    { id: "g8", name: "Enfurecer", unlock: 17, cd: 50, mana: 8, dmg: 0, kind: "buff", color: "#b91c1c", emoji: "🔥", desc: "+12% de dano durante 17s" },
    { id: "g9", name: "Coragem do Cruzado", unlock: 21, cd: 150, mana: 8, dmg: 0, kind: "buff", color: "#fbbf24", emoji: "⚔️", desc: "Tu e o grupo ganham defesa e mana" },
    { id: "g10", name: "Grito Profano", unlock: 25, cd: 150, mana: 8, dmg: 0, kind: "buff", color: "#7f1d1d", emoji: "☠️", desc: "Tu e o grupo causam dano extra" },
    { id: "g11", name: "Têmpera", unlock: 29, cd: 30, mana: 8, dmg: 0, kind: "buff", color: "#94a3b8", emoji: "⏳", desc: "Remove atordoamentos e prenções; acelera-te" },
    { id: "g12", name: "Reforço de Armadura", unlock: 1, cd: 0, mana: 0, dmg: 0, kind: "passiva", color: "#64748b", emoji: "🪖", desc: "+defesa permanente e gera mais aggro" },
  ],
  // MAGO — gelo arcano (oficial: Ice Bolt, Shatterfrost, Icicle Orb…)
  [
    { id: "m1", name: "Raio de Gelo", unlock: 1, cd: 1.5, mana: 3, dmg: 1.3, range: 26, speed: 24, kind: "projeto", color: "#38bdf8", emoji: "❄️", desc: "Sarcícula congelante; 5 acumulos atordoam" },
    { id: "m2", name: "Brilho Gélido", unlock: 4, cd: 25, mana: 4, dmg: 1.1, radius: 5.5, kind: "area", color: "#7dd3fc", emoji: "🧊", desc: "Onda de choque gélido congela à tua volta" },
    { id: "m3", name: "Estilhaço Gélido", unlock: 8, cd: 10, mana: 3, dmg: 2.3, range: 24, speed: 22, kind: "projeto", color: "#0ea5e9", emoji: "🗡️", desc: "Fragmento pesado; dano extra em congelados" },
    { id: "m4", name: "Teleporte", unlock: 11, cd: 12, mana: 4, dmg: 0, range: 12, speed: 30, kind: "dash", color: "#c084fc", emoji: "💫", desc: "Reaparece 12m adiante na direção em que olhas" },
    { id: "m5", name: "Escudo de Gelo", unlock: 14, cd: 60, mana: 5, dmg: 0, kind: "buff", color: "#bae6fd", emoji: "🛡️", desc: "Bloqueia os próximos ataques recebidos" },
    { id: "m6", name: "Chamado Gélido", unlock: 17, cd: 6, mana: 2, dmg: 1.2, radius: 6.5, kind: "area", color: "#22d3ee", emoji: "🌨️", desc: "Tempestade congelante numa área" },
    { id: "m7", name: "Orbe de Sarcículas", unlock: 20, cd: 8, mana: 10, dmg: 1.7, radius: 5.5, kind: "area", color: "#0284c7", emoji: "🔮", desc: "Orbe gigante cospe sarcículas no caminho", ult: true },
    { id: "m8", name: "Bloco de Gelo", unlock: 24, cd: 80, mana: 5, dmg: 0, kind: "cura", color: "#e0f2fe", emoji: "🧱", desc: "Invulnerável e a curar-te, mas imóvel" },
    { id: "m9", name: "Frenesi Hipotérmico", unlock: 28, cd: 45, mana: 0, dmg: 0, kind: "buff", color: "#67e8f9", emoji: "⚡", desc: "+pressa e +dano; reinicia o Orbe de Sarcículas" },
    { id: "m10", name: "Encantamento", unlock: 32, cd: 8, mana: 5, dmg: 0, kind: "buff", color: "#d8b4fe", emoji: "✨", desc: "Aumenta o dano de um aliado" },
    { id: "m11", name: "Aura Ártica", unlock: 36, cd: 120, mana: 15, dmg: 0, kind: "buff", color: "#38bdf8", emoji: "🌟", desc: "O teu grupo ganha crítico extra", ult: true },
    { id: "m12", name: "Coração Congelado", unlock: 1, cd: 0, mana: 0, dmg: 0, kind: "passiva", color: "#a5f3fc", emoji: "💠", desc: "Um Raio de Gelo instantâneo a cada 7s" },
  ],
  // ARQUEIRO — precisão (oficial: Swift Shot, Precise Shot, Volley…)
  [
    { id: "a1", name: "Tiro Rápido", unlock: 1, cd: 1.5, mana: 2, dmg: 1.3, range: 28, speed: 30, kind: "projeto", color: "#22c55e", emoji: "🏹", desc: "Flecha veloz; fica instantâneo após um Tiro Preciso" },
    { id: "a2", name: "Tiro Preciso", unlock: 3, cd: 6, mana: 5, dmg: 1.9, range: 28, speed: 34, kind: "projeto", color: "#4ade80", emoji: "🎯", desc: "Tiro forte; torna os Tiro Rápido instantâneos" },
    { id: "a3", name: "Salva", unlock: 4, cd: 25, mana: 21, dmg: 1.5, radius: 7, kind: "area", color: "#16a34a", emoji: "🌧️", desc: "Chuva de flechas em até 10 alvos" },
    { id: "a4", name: "Arranque", unlock: 5, cd: 10, mana: 6, dmg: 0, range: 10, speed: 28, kind: "dash", color: "#a3e635", emoji: "💨", desc: "Avança e reinicia o Tiro Preciso" },
    { id: "a5", name: "Flechas Serpente", unlock: 5, cd: 0, mana: 0, dmg: 0, kind: "passiva", color: "#86efac", emoji: "🐍", desc: "Os Tiro Preciso saltam para mais alvos" },
    { id: "a6", name: "Flecha Vampírica", unlock: 6, cd: 20, mana: 2, dmg: 1.4, range: 28, speed: 30, kind: "projeto", color: "#f87171", emoji: "🩸", desc: "Cura-te ao acertar; interrompe feitiços inimigos" },
    { id: "a7", name: "Reanimar", unlock: 7, cd: 50, mana: 0, dmg: 0, kind: "buff", color: "#fbbf24", emoji: "⚡", desc: "Recupera mana e aumenta o teu dano" },
    { id: "a8", name: "Tiro de Osso", unlock: 8, cd: 10, mana: 11, dmg: 2.3, range: 28, speed: 26, kind: "projeto", color: "#e7e5e4", emoji: "🦴", desc: "Flecha-fêmur; +50% de dano em alvos abaixo de metade", ult: true },
    { id: "a9", name: "Flechas Venenosas", unlock: 12, cd: 0, mana: 0, dmg: 0, kind: "passiva", color: "#84cc16", emoji: "☠️", desc: "Tiro Preciso envenena e abranda por 10s" },
    { id: "a10", name: "Sentido de Caminho", unlock: 16, cd: 80, mana: 12, dmg: 0, kind: "buff", color: "#a3e635", emoji: "🧭", desc: "+velocidade para ti e para o grupo" },
    { id: "a11", name: "Tiro Ofuscante", unlock: 21, cd: 25, mana: 2, dmg: 0.8, range: 28, speed: 30, kind: "projeto", color: "#fef08a", emoji: "🌫️", desc: "Cega o alvo, que vagueia sem rumo" },
    { id: "a12", name: "Perfurações Cranianas", unlock: 26, cd: 0, mana: 0, dmg: 0, kind: "passiva", color: "#fda4af", emoji: "💀", desc: "+3% de crítico permanente" },
  ],
  // XAMÃ — espíritos e pragas (oficial: Decay, Revitalize, Mimir's Well…)
  [
    { id: "x1", name: "Decadência", unlock: 1, cd: 3, mana: 6, dmg: 1.2, range: 22, speed: 22, kind: "projeto", color: "#14b8a6", emoji: "☠️", desc: "Maldição que corrói o alvo ao longo do tempo" },
    { id: "x2", name: "Espalha-praga", unlock: 4, cd: 0, mana: 0, dmg: 0, kind: "passiva", color: "#84cc16", emoji: "🦠", desc: "Decadência salta entre inimigos e dá-te pressa" },
    { id: "x3", name: "Revitalizar", unlock: 6, cd: 30, mana: 4, dmg: 0, kind: "cura", color: "#34d399", emoji: "💚", desc: "Cura ao longo do tempo; acumula até 3 vezes" },
    { id: "x4", name: "Tratamento", unlock: 8, cd: 2, mana: 6, dmg: 0, kind: "cura", color: "#4ade80", emoji: "➕", desc: "Cura direta poderosa" },
    { id: "x5", name: "Poço de Mimir", unlock: 11, cd: 90, mana: 0, dmg: 0, kind: "buff", color: "#2dd4bf", emoji: "🕳️", desc: "O teu grupo regenera mana rapidamente" },
    { id: "x6", name: "Totem de Cura", unlock: 14, cd: 20, mana: 10, dmg: 0, radius: 6, kind: "cura", color: "#fbbf24", emoji: "🗿", desc: "Totem que cura todos os aliados perto" },
    { id: "x7", name: "Uivo Canino", unlock: 17, cd: 25, mana: 8, dmg: 0, kind: "buff", color: "#94a3b8", emoji: "🐺", desc: "O teu grupo ganha pressa e cooldowns mais rápidos" },
    { id: "x8", name: "Convocar", unlock: 20, cd: 120, mana: 25, dmg: 0, kind: "buff", color: "#a78bfa", emoji: "🌀", desc: "Convoca o teu grupo para junto de ti" },
    { id: "x9", name: "Purificar", unlock: 24, cd: 12, mana: 8, dmg: 0, kind: "cura", color: "#a7f3d0", emoji: "🌿", desc: "Remove venenos e maldições" },
    { id: "x10", name: "Escudo Espiritual", unlock: 28, cd: 30, mana: 10, dmg: 0, kind: "buff", color: "#c4b5fd", emoji: "👻", desc: "Os espíritos absorvem parte do dano" },
    { id: "x11", name: "Corrente de Pragas", unlock: 32, cd: 7, mana: 8, dmg: 1.5, radius: 6, kind: "area", color: "#0d9488", emoji: "⛓️", desc: "A praga salta por toda a área", ult: true },
    { id: "x12", name: "Ira dos Anciãos", unlock: 36, cd: 45, mana: 30, dmg: 2.6, radius: 8, kind: "area", color: "#f97316", emoji: "🗿", desc: "Os anciãos esmagam tudo à tua volta", ult: true },
  ],
]

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
    id: 0, name: "VANGUARD", emoji: "🛡️", color: "#458BD9", hex: 0x458bd9,
    motto: "Tradição, estrutura e ordem",
    desc: "A horda da ordem. Castelo no verde exuberante de Guardstone, defensores leais do território.",
  },
  {
    id: 1, name: "BLOODLUST", emoji: "💀", color: "#dc2626", hex: 0xdc2626,
    motto: "O sangue alimenta a horda",
    desc: "Conquistadores sedentos. Território vermelho, pilhagem sem limites e glória eterna.",
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
  { id: "vila", name: "Guardstone", cx: 0, cz: 0, r: 60, color: "#fcd34d", lvl: [1, 99], desc: "Capital do mundo:banco, loja, feira e comerciantes das duas facções", danger: 0, hub: true },
  { id: "fortaleza", name: "Castelo Vanguarda", cx: -250, cz: -180, r: 46, color: "#458BD9", lvl: [1, 99], desc: "Capital da facção VANGUARD 🛡️ no verde de Guardstone", danger: 0, hub: true },
  { id: "bastiao", name: "Fortaleza Bloodlust", cx: 250, cz: 180, r: 46, color: "#dc2626", lvl: [1, 99], desc: "Capital da facção BLOODLUST 💀 — território vermelho", danger: 0, hub: true },
  { id: "planicie", name: "Campina de Guardstone", cx: -80, cz: 40, r: 110, color: "#a3e635", lvl: [1, 8], desc: "Larvas, raposas, mariposas e bandidos — os primeiros passos", danger: 1 },
  { id: "floresta", name: "Floresta Guardstone", cx: -190, cz: 140, r: 115, color: "#16a34a", lvl: [6, 19], desc: "Javalis, aranhas, lobos, abelhas e a Mina de Carvão", danger: 2 },
  { id: "dunas", name: "Deserto Headless", cx: 60, cz: -170, r: 115, color: "#f59e0b", lvl: [20, 30], desc: "Escaravelhos, lagartos, vermes, abutres e hienas das areias", danger: 3 },
  { id: "pantano", name: "Oásis dos Mortos", cx: 200, cz: 60, r: 110, color: "#65a30d", lvl: [23, 28], desc: "Guerreiros, arqueiros e magos mortos-vivos guardam as águas", danger: 4 },
  { id: "vulcao", name: "Terras Marrowlands", cx: -60, cz: -240, r: 110, color: "#b45309", lvl: [30, 45], desc: "Reclusas, piratas, leões e feras raras na costa queimada", danger: 5 },
  { id: "tundra", name: "Dell Alviverde · Faivel", cx: 280, cz: -80, r: 105, color: "#4ade80", lvl: [34, 40], desc: "Ursos primais, lobos uivantes e saqueadores de Faivel", danger: 6 },
  { id: "titas", name: "Pinhal Lunar · Faivel", cx: -280, cz: -40, r: 95, color: "#a8a29e", lvl: [39, 44], desc: "Tarântulas, alces, orcs e o culto do Lago Lunar", danger: 7, locked: true, lockLvl: 30, lockPop: 10 },
  { id: "escuro", name: "Ruínas de Gloomfury", cx: 120, cz: 250, r: 100, color: "#7c3aed", lvl: [42, 45], desc: "O fim do mundo:esqueletos sombrios e o CHEFE MUNDIAL Gloomfury", danger: 8, locked: true, lockLvl: 40, lockPop: 50 },
]

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
  ranged?: boolean; rare?: boolean; neutral?: boolean;
}

// ── CRIATURAS OFICIAIS DO HORDES.IO (nv · HP · XP da wiki) ──
// 83 espécies nv.1-45 · Neutras só reagem · Raras = elites
export const MOB_TYPES: MobType[] = [
  { id: "larva", name: "Larva Jovem", tier: 1, color: 0x8d6e63, feature: "spikes", scale: 0.7, hp: 50, atk: 5, xp: 100, aggro: 0, speed: 2.6, region: "planicie", pack: 2, neutral: true },
  { id: "larva2", name: "Larva Adulta", tier: 2, color: 0x78716c, feature: "spikes", scale: 0.8, hp: 70, atk: 7, xp: 118, aggro: 0, speed: 2.8, region: "planicie", pack: 2, neutral: true },
  { id: "tarta_mar", name: "Tartaruga Marinha", tier: 3, color: 0xd9488, feature: "horns", scale: 0.9, hp: 90, atk: 9, xp: 137, aggro: 0, speed: 2.2, region: "planicie", pack: 1, neutral: true },
  { id: "raposa", name: "Raposa", tier: 3, color: 0xf97316, feature: "ears", scale: 0.9, hp: 90, atk: 9, xp: 137, aggro: 0, speed: 5.2, region: "planicie", pack: 1, neutral: true },
  { id: "raposa_raivosa", name: "Raposa Raivosa", tier: 4, color: 0xdc2626, feature: "ears", scale: 0.95, hp: 120, atk: 11, xp: 156, aggro: 10, speed: 5.4, region: "planicie", pack: 1, neutral: true },
  { id: "fantasma", name: "Fantasma", tier: 5, color: 0xa5b4fc, feature: "wings", scale: 1.0, hp: 230, atk: 13, xp: 175, aggro: 14, speed: 4.8, region: "planicie", pack: 1, rare: true },
  { id: "mariposa", name: "Mariposa Lunar", tier: 5, color: 0xc4b5fd, feature: "wings", scale: 0.85, hp: 150, atk: 13, xp: 175, aggro: 0, speed: 5.0, region: "planicie", pack: 1, neutral: true },
  { id: "bandido_arq", name: "Bandido Arqueiro", tier: 5, color: 0x92400e, feature: "horns", scale: 1.0, hp: 150, atk: 13, xp: 175, aggro: 13, speed: 4.4, region: "planicie", pack: 2, ranged: true },
  { id: "mariposa_atlas", name: "Mariposa Atlas", tier: 6, color: 0xa78bfa, feature: "wings", scale: 0.95, hp: 200, atk: 15, xp: 193, aggro: 0, speed: 5.0, region: "planicie", pack: 1, neutral: true },
  { id: "bandido", name: "Bandido Errante", tier: 6, color: 0xa16207, feature: "horns", scale: 1.05, hp: 200, atk: 15, xp: 193, aggro: 13, speed: 4.4, region: "planicie", pack: 2 },
  { id: "javali", name: "Javali Selvagem", tier: 7, color: 0x78350f, feature: "tusks", scale: 1.1, hp: 250, atk: 17, xp: 212, aggro: 12, speed: 4.6, region: "planicie", pack: 2 },
  { id: "lider_bandido", name: "Líder Bandido", tier: 7, color: 0x451a03, feature: "horns", scale: 1.2, hp: 380, atk: 17, xp: 212, aggro: 15, speed: 4.6, region: "planicie", pack: 2, rare: true },
  { id: "javali_furioso", name: "Javali Furioso", tier: 8, color: 0x92400e, feature: "tusks", scale: 1.15, hp: 300, atk: 19, xp: 231, aggro: 13, speed: 4.8, region: "planicie", pack: 2 },
  { id: "aranha", name: "Aranha da Floresta", tier: 9, color: 0x3f3f46, feature: "spikes", scale: 1.0, hp: 350, atk: 21, xp: 250, aggro: 14, speed: 4.2, region: "floresta", pack: 2 },
  { id: "tecela", name: "Tecelã da Mata", tier: 10, color: 0x27272a, feature: "spikes", scale: 1.05, hp: 400, atk: 23, xp: 268, aggro: 15, speed: 4.2, region: "floresta", pack: 2 },
  { id: "javali_anciao", name: "Javali Ancião", tier: 10, color: 0x451a03, feature: "tusks", scale: 1.35, hp: 600, atk: 23, xp: 268, aggro: 15, speed: 4.6, region: "floresta", pack: 1, rare: true },
  { id: "lobo", name: "Lobo", tier: 11, color: 0x6b7280, feature: "ears", scale: 1.0, hp: 480, atk: 25, xp: 287, aggro: 16, speed: 5.6, region: "floresta", pack: 3 },
  { id: "lobo_rustico", name: "Lobo Rústico", tier: 12, color: 0x4b5563, feature: "ears", scale: 1.05, hp: 550, atk: 27, xp: 306, aggro: 16, speed: 5.6, region: "floresta", pack: 3 },
  { id: "abelha", name: "Abelha", tier: 13, color: 0xfacc15, feature: "wings", scale: 0.8, hp: 650, atk: 29, xp: 325, aggro: 15, speed: 5.8, region: "floresta", pack: 3 },
  { id: "abelha_pec", name: "Abelha Peçonhenta", tier: 14, color: 0xeab308, feature: "wings", scale: 0.85, hp: 700, atk: 31, xp: 343, aggro: 16, speed: 5.9, region: "floresta", pack: 3 },
  { id: "saq_mina", name: "Saqueador da Mina", tier: 14, color: 0xa16207, feature: "horns", scale: 1.05, hp: 700, atk: 31, xp: 343, aggro: 15, speed: 4.4, region: "floresta", pack: 2 },
  { id: "trab_mina", name: "Trabalhador da Mina", tier: 15, color: 0x854d0e, feature: "horns", scale: 1.1, hp: 800, atk: 33, xp: 362, aggro: 15, speed: 4.4, region: "floresta", pack: 2 },
  { id: "cogumelito", name: "Cogumelito", tier: 15, color: 0xf472b6, feature: "spikes", scale: 0.95, hp: 800, atk: 33, xp: 362, aggro: 13, speed: 3.6, region: "floresta", pack: 2 },
  { id: "formiga", name: "Formiga", tier: 16, color: 0x525252, feature: "spikes", scale: 0.85, hp: 950, atk: 35, xp: 381, aggro: 16, speed: 4.4, region: "floresta", pack: 3 },
  { id: "golem_carvao", name: "Golem de Carvão", tier: 16, color: 0x1c1917, feature: "spikes", scale: 1.6, hp: 1400, atk: 35, xp: 381, aggro: 14, speed: 2.8, region: "floresta", pack: 1, rare: true },
  { id: "formiga_vulc", name: "Formiga Vulcânica", tier: 17, color: 0xb91c1c, feature: "spikes", scale: 0.9, hp: 1100, atk: 37, xp: 400, aggro: 17, speed: 4.6, region: "floresta", pack: 3 },
  { id: "tartaruga", name: "Tartaruga", tier: 18, color: 0x14b8a6, feature: "horns", scale: 1.1, hp: 1200, atk: 39, xp: 418, aggro: 12, speed: 2.3, region: "floresta", pack: 1 },
  { id: "tarta_pedra", name: "Tartaruga Pedregosa", tier: 19, color: 0x57534e, feature: "horns", scale: 1.2, hp: 1350, atk: 41, xp: 437, aggro: 13, speed: 2.3, region: "floresta", pack: 1 },
  { id: "escara_estrume", name: "Escaravelho Estrumeiro", tier: 20, color: 0x7c2d12, feature: "horns", scale: 1.0, hp: 1500, atk: 43, xp: 456, aggro: 15, speed: 3.6, region: "dunas", pack: 2 },
  { id: "escara_sombrio", name: "Escaravelho Sombrio", tier: 21, color: 0x292524, feature: "horns", scale: 1.05, hp: 1650, atk: 45, xp: 475, aggro: 16, speed: 3.6, region: "dunas", pack: 2 },
  { id: "mireshell", name: "Mireshell", tier: 21, color: 0x5eead4, feature: "horns", scale: 1.3, hp: 2500, atk: 45, xp: 475, aggro: 14, speed: 2.4, region: "dunas", pack: 1, rare: true },
  { id: "lagarto", name: "Lagarto Espinhoso", tier: 22, color: 0x84cc16, feature: "tusks", scale: 1.05, hp: 1800, atk: 47, xp: 493, aggro: 16, speed: 4.8, region: "dunas", pack: 2 },
  { id: "iguana", name: "Iguana do Deserto", tier: 23, color: 0xa3e635, feature: "tusks", scale: 1.1, hp: 2000, atk: 49, xp: 512, aggro: 16, speed: 4.8, region: "dunas", pack: 2 },
  { id: "escara_deserto", name: "Escaravelho do Deserto", tier: 23, color: 0xb45309, feature: "horns", scale: 1.5, hp: 3000, atk: 49, xp: 512, aggro: 17, speed: 3.6, region: "dunas", pack: 1, rare: true },
  { id: "verme_areia", name: "Verme das Areias", tier: 24, color: 0xd97706, feature: "spikes", scale: 1.3, hp: 2150, atk: 51, xp: 531, aggro: 16, speed: 3.2, region: "dunas", pack: 2 },
  { id: "estrangulador", name: "Estrangulador das Areias", tier: 25, color: 0xc2410c, feature: "spikes", scale: 1.35, hp: 2300, atk: 53, xp: 550, aggro: 17, speed: 3.2, region: "dunas", pack: 2 },
  { id: "abutre", name: "Abutre Rústico", tier: 26, color: 0x78716c, feature: "wings", scale: 1.0, hp: 2450, atk: 55, xp: 568, aggro: 16, speed: 6.0, region: "dunas", pack: 2 },
  { id: "abutre_quebra", name: "Abutre Quebradiço", tier: 27, color: 0x57534e, feature: "wings", scale: 1.05, hp: 2600, atk: 57, xp: 587, aggro: 16, speed: 6.0, region: "dunas", pack: 2 },
  { id: "verme_brilhante", name: "Verme Brilhante", tier: 27, color: 0xa3e635, feature: "spikes", scale: 1.4, hp: 3900, atk: 57, xp: 587, aggro: 17, speed: 3.2, region: "dunas", pack: 1, rare: true },
  { id: "hiena", name: "Hiena", tier: 28, color: 0xa8a29e, feature: "ears", scale: 1.0, hp: 2700, atk: 59, xp: 606, aggro: 17, speed: 5.6, region: "dunas", pack: 3 },
  { id: "hiena_caxiante", name: "Hiena Caxiante", tier: 29, color: 0x8c8378, feature: "ears", scale: 1.05, hp: 2900, atk: 61, xp: 625, aggro: 17, speed: 5.6, region: "dunas", pack: 3 },
  { id: "crocodilo", name: "Crocodilo do Rio", tier: 30, color: 0x166534, feature: "tusks", scale: 1.4, hp: 3000, atk: 63, xp: 643, aggro: 18, speed: 3.6, region: "dunas", pack: 1 },
  { id: "morto_arq", name: "Arqueiro Morto-Vivo", tier: 23, color: 0xe7e5e4, feature: "horns", scale: 1.05, hp: 2000, atk: 49, xp: 512, aggro: 15, speed: 3.4, region: "pantano", pack: 2, ranged: true },
  { id: "morto_guer", name: "Guerreiro Morto-Vivo", tier: 24, color: 0xd6d3d1, feature: "horns", scale: 1.1, hp: 2150, atk: 51, xp: 531, aggro: 16, speed: 3.4, region: "pantano", pack: 2 },
  { id: "morto_mago", name: "Mago Morto-Vivo", tier: 25, color: 0xc4b5fd, feature: "horns", scale: 1.05, hp: 2300, atk: 53, xp: 550, aggro: 16, speed: 3.2, region: "pantano", pack: 2, ranged: true },
  { id: "mumia", name: "Múmia Morta-Viva", tier: 25, color: 0xf5f5f4, feature: "horns", scale: 1.15, hp: 2300, atk: 53, xp: 550, aggro: 16, speed: 3.2, region: "pantano", pack: 2 },
  { id: "necromante", name: "Necromante Morto-Vivo", tier: 26, color: 0x7c3aed, feature: "horns", scale: 1.25, hp: 3700, atk: 55, xp: 568, aggro: 18, speed: 3.2, region: "pantano", pack: 1, rare: true },
  { id: "croco_ossudo", name: "Crocodilo Ossudo", tier: 31, color: 0x14532d, feature: "tusks", scale: 1.45, hp: 3200, atk: 65, xp: 662, aggro: 18, speed: 3.6, region: "vulcao", pack: 1 },
  { id: "reclusa_tormenta", name: "Reclusa da Tormenta", tier: 32, color: 0x7f1d1d, feature: "spikes", scale: 1.1, hp: 3400, atk: 67, xp: 681, aggro: 18, speed: 4.2, region: "vulcao", pack: 2 },
  { id: "pirata_arq", name: "Pirata Arqueiro", tier: 32, color: 0xea5e9, feature: "horns", scale: 1.05, hp: 3400, atk: 67, xp: 681, aggro: 17, speed: 4.4, region: "vulcao", pack: 2, ranged: true },
  { id: "reclusa_pec", name: "Reclusa Peçonhenta", tier: 33, color: 0x881337, feature: "spikes", scale: 1.15, hp: 3600, atk: 69, xp: 700, aggro: 18, speed: 4.2, region: "vulcao", pack: 2 },
  { id: "pirata_guer", name: "Pirata Guerreiro", tier: 33, color: 0x369a1, feature: "horns", scale: 1.1, hp: 3600, atk: 69, xp: 700, aggro: 18, speed: 4.4, region: "vulcao", pack: 2 },
  { id: "leao", name: "Leão", tier: 34, color: 0xd97706, feature: "tusks", scale: 1.4, hp: 3800, atk: 71, xp: 718, aggro: 19, speed: 6.0, region: "vulcao", pack: 1 },
  { id: "capitao_pirata", name: "Capitão Pirata", tier: 34, color: 0x1e3a8a, feature: "horns", scale: 1.3, hp: 5700, atk: 71, xp: 718, aggro: 19, speed: 4.6, region: "vulcao", pack: 1, rare: true },
  { id: "mae_osso", name: "Mãe-Osso", tier: 35, color: 0xf5f5f4, feature: "spikes", scale: 1.5, hp: 6000, atk: 73, xp: 737, aggro: 19, speed: 4.0, region: "vulcao", pack: 1, rare: true },
  { id: "chicote_lodo", name: "Chicoteador do Lodo", tier: 35, color: 0x3f6212, feature: "tusks", scale: 1.5, hp: 6000, atk: 73, xp: 737, aggro: 19, speed: 3.8, region: "vulcao", pack: 1, rare: true },
  { id: "pata_areia", name: "Pata-de-Areia", tier: 36, color: 0xfbbf24, feature: "tusks", scale: 1.45, hp: 6500, atk: 75, xp: 756, aggro: 19, speed: 6.0, region: "vulcao", pack: 1, rare: true },
  { id: "croco_areavel", name: "Crocodilo Areável", tier: 43, color: 0x365314, feature: "tusks", scale: 1.5, hp: 7100, atk: 89, xp: 887, aggro: 20, speed: 3.6, region: "vulcao", pack: 1 },
  { id: "tarta_areavel", name: "Tartaruga Areável", tier: 43, color: 0xf766e, feature: "horns", scale: 1.3, hp: 7100, atk: 89, xp: 887, aggro: 18, speed: 2.4, region: "vulcao", pack: 1 },
  { id: "urso_primal", name: "Urso Primal", tier: 35, color: 0x92400e, feature: "ears", scale: 1.6, hp: 4000, atk: 73, xp: 737, aggro: 18, speed: 5.0, region: "tundra", pack: 1 },
  { id: "urso_negro", name: "Urso Negrijuba", tier: 36, color: 0x1c1917, feature: "ears", scale: 1.65, hp: 4300, atk: 75, xp: 756, aggro: 18, speed: 5.0, region: "tundra", pack: 1 },
  { id: "lobo_sussurro", name: "Lobo Sussurrante", tier: 37, color: 0x9ca3af, feature: "ears", scale: 1.15, hp: 4700, atk: 77, xp: 775, aggro: 18, speed: 5.8, region: "tundra", pack: 3 },
  { id: "lobo_putrido", name: "Lobo Pútrido", tier: 38, color: 0x713f12, feature: "ears", scale: 1.2, hp: 5000, atk: 79, xp: 793, aggro: 19, speed: 5.8, region: "tundra", pack: 3 },
  { id: "saq_guerreiro", name: "Saqueador Guerreiro", tier: 38, color: 0x7f1d1d, feature: "horns", scale: 1.15, hp: 5000, atk: 79, xp: 793, aggro: 18, speed: 4.6, region: "tundra", pack: 2 },
  { id: "carvalho_juba", name: "Carvalho-juba", tier: 38, color: 0x365314, feature: "horns", scale: 1.9, hp: 7500, atk: 79, xp: 793, aggro: 19, speed: 4.6, region: "tundra", pack: 1, rare: true },
  { id: "saq_arqueiro", name: "Saqueador Arqueiro", tier: 39, color: 0x991b1b, feature: "horns", scale: 1.1, hp: 5400, atk: 81, xp: 812, aggro: 18, speed: 4.6, region: "tundra", pack: 2, ranged: true },
  { id: "corvo", name: "Corvo", tier: 39, color: 0x111827, feature: "wings", scale: 0.9, hp: 5400, atk: 81, xp: 812, aggro: 17, speed: 6.2, region: "tundra", pack: 2 },
  { id: "corvo_sombrio", name: "Corvo Garra-Sombria", tier: 40, color: 0x1f2937, feature: "wings", scale: 0.95, hp: 5700, atk: 83, xp: 831, aggro: 18, speed: 6.2, region: "tundra", pack: 2 },
  { id: "sacerdote_lunar", name: "Sacerdote do Lago Lunar", tier: 39, color: 0x6366f1, feature: "horns", scale: 1.15, hp: 5400, atk: 81, xp: 812, aggro: 18, speed: 4.4, region: "titas", pack: 2 },
  { id: "lunar_arq", name: "Arqueiro do Lago Lunar", tier: 40, color: 0x818cf8, feature: "horns", scale: 1.1, hp: 5700, atk: 83, xp: 831, aggro: 18, speed: 4.4, region: "titas", pack: 2, ranged: true },
  { id: "lunar_guer", name: "Guerreiro do Lago Lunar", tier: 41, color: 0x4f46e5, feature: "horns", scale: 1.2, hp: 6200, atk: 85, xp: 850, aggro: 19, speed: 4.4, region: "titas", pack: 2 },
  { id: "tarantula", name: "Tarântula", tier: 41, color: 0x292524, feature: "spikes", scale: 1.2, hp: 6200, atk: 85, xp: 850, aggro: 19, speed: 4.2, region: "titas", pack: 2 },
  { id: "tarantula_crespa", name: "Tarântula Crespa", tier: 42, color: 0x1c1917, feature: "spikes", scale: 1.3, hp: 6600, atk: 87, xp: 868, aggro: 19, speed: 4.2, region: "titas", pack: 2 },
  { id: "orc_guerreiro", name: "Guerreiro Orc", tier: 42, color: 0x15803d, feature: "horns", scale: 1.3, hp: 6600, atk: 87, xp: 868, aggro: 19, speed: 4.6, region: "titas", pack: 2 },
  { id: "uivador_lunar", name: "Uivador Lunar", tier: 42, color: 0x94a3b8, feature: "ears", scale: 1.5, hp: 9900, atk: 87, xp: 868, aggro: 20, speed: 5.8, region: "titas", pack: 1, rare: true },
  { id: "alce", name: "Alce", tier: 43, color: 0x57534e, feature: "horns", scale: 1.6, hp: 7100, atk: 89, xp: 887, aggro: 18, speed: 4.0, region: "titas", pack: 1 },
  { id: "corredora_seda", name: "Corredora de Seda", tier: 43, color: 0xf9a8d4, feature: "spikes", scale: 1.5, hp: 10600, atk: 89, xp: 887, aggro: 20, speed: 4.4, region: "titas", pack: 1, rare: true },
  { id: "alce_crespo", name: "Alce Crespo", tier: 44, color: 0x44403c, feature: "horns", scale: 1.7, hp: 7500, atk: 91, xp: 906, aggro: 18, speed: 4.0, region: "titas", pack: 1 },
  { id: "sombrio_arq", name: "Arqueiro Sombrio", tier: 43, color: 0x4c1d95, feature: "horns", scale: 1.15, hp: 7100, atk: 89, xp: 887, aggro: 19, speed: 3.4, region: "escuro", pack: 2, ranged: true },
  { id: "sombrio_guer", name: "Guerreiro Sombrio", tier: 44, color: 0x5b21b6, feature: "horns", scale: 1.2, hp: 7500, atk: 91, xp: 906, aggro: 19, speed: 3.4, region: "escuro", pack: 2 },
  { id: "sombrio_mago", name: "Mago Sombrio", tier: 45, color: 0x6d28d9, feature: "horns", scale: 1.15, hp: 8000, atk: 93, xp: 925, aggro: 19, speed: 3.2, region: "escuro", pack: 2, ranged: true },
  { id: "ramo_cintilante", name: "Ramo Cintilante", tier: 45, color: 0x86efac, feature: "horns", scale: 1.9, hp: 12000, atk: 93, xp: 925, aggro: 20, speed: 4.0, region: "escuro", pack: 1, rare: true },
  { id: "visgo_noturno", name: "Visgo Noturno", tier: 45, color: 0x14532d, feature: "spikes", scale: 1.7, hp: 12000, atk: 93, xp: 925, aggro: 20, speed: 3.6, region: "escuro", pack: 1, rare: true },
];

// ── Chefes de região (com mecânicas) ────────────────────────
export interface BossDef { name: string; region: string; tier: number; x: number; z: number; mech: "slam" | "summon" | "enrage" | "nova"; title: string }

export const REGION_BOSSES: BossDef[] = [
  { name: "Fantasma Errante", region: "planicie", tier: 5, x: -110, z: 70, mech: "nova", title: "O Espectro da Campina" },
  { name: "Líder Bandido", region: "planicie", tier: 7, x: -60, z: 10, mech: "slam", title: "Terror dos Caminhos" },
  { name: "Javali Ancião", region: "floresta", tier: 10, x: -215, z: 165, mech: "slam", title: "Presas de Ferro" },
  { name: "Golem de Carvão", region: "floresta", tier: 16, x: -160, z: 180, mech: "enrage", title: "Coração de Carvão" },
  { name: "Necromante Morto-Vivo", region: "pantano", tier: 26, x: 225, z: 85, mech: "summon", title: "Senhor do Oásis" },
  { name: "Capitão Pirata", region: "vulcao", tier: 34, x: -85, z: -262, mech: "nova", title: "Flagelo dos Mares" },
  { name: "Mãe-Osso", region: "vulcao", tier: 35, x: -20, z: -200, mech: "summon", title: "Mãe da Trepadeira" },
  { name: "Carvalho-juba", region: "tundra", tier: 38, x: 300, z: -100, mech: "slam", title: "Colosso de Faivel" },
]

// ── Chefes mundiais (aparecem em ciclos, anúncio global) ────
export const WORLD_BOSSES = [
  { name: "Gloomfury", region: "escuro", tier: 45, x: 140, z: 275, cycle: 420, emoji: "🗡️", title: "CHEFE MUNDIAL · Runefire" },
  { name: "Hellspawn", region: "vulcao", tier: 32, x: -60, z: -255, cycle: 420, emoji: "🔥", title: "CHEFE MUNDIAL · Infernal" },
]

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
  { id: 1, title: "Primeiros Passos", goal: "Abate 5 criaturas na Campina de Guardstone", kind: "kills", target: 5, reward: "500 ouro + 1 Livro" },
  { id: 2, title: "O Chamado das Armas", goal: "Alcança o nível 3", kind: "level", target: 3, reward: "1.500 ouro" },
  { id: 3, title: "O Corcel", goal: "Fala com o Mestre de Montarias em Guardstone", kind: "npc", target: 1, reward: "Corcel Dourado 🐴" },
  { id: 4, title: "Primeira Prova", goal: "Abate um ELITE", kind: "elite", target: 1, reward: "2.000 ouro + Fragmentos" },
  { id: 5, title: "A Guerra Começa", goal: "Confirma a tua facção no teu castelo", kind: "flag", target: 1, reward: "3.000 ouro + Fama" },
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
export function mobXp(_tier: number, charLvl: number, mobLvl: number): number {
  // Tabela oficial de XP do hordes.io (wiki): 100 no nv.1, +18.7 por nível
  const base = Math.round(100 + (mobLvl - 1) * 18.71);
  const diff = mobLvl - charLvl;
  const scale = diff >= -5 ? 1 : Math.max(0.1, 1 + diff * 0.07);
  return Math.max(1, Math.round(base * scale));
}
export function mobLevelForTier(tier: number): number {
  // Nível oficial = nível da espécie (wiki), sem aleatoriedade
  return tier;
}

// ── Zona segura (sem PvP perto de hubs) ─────────────────────
export const PVP_SAFE_RADIUS = 70;

// ── Buffs ───────────────────────────────────────────────────
export const BUFFS: Record<string, { name: string; emoji: string; desc: string }> = {
  g4: { name: "Baluarte", emoji: "🛡️", desc: "+34% bloqueio" },
  g5: { name: "Provocar", emoji: "📣", desc: "Monstros atacam-te" },
  g8: { name: "Enfurecer", emoji: "🔥", desc: "+12% ATK" },
  g9: { name: "Coragem do Cruzado", emoji: "⚔️", desc: "Grupo +DEF/+mana" },
  g10: { name: "Grito Profano", emoji: "☠️", desc: "Grupo +ATK" },
  g11: { name: "Têmpera", emoji: "⏳", desc: "Limpa controlos" },
  m5: { name: "Escudo de Gelo", emoji: "🛡️", desc: "Bloqueia ataques" },
  m9: { name: "Frenesi Hipotérmico", emoji: "⚡", desc: "+pressa/+dano" },
  m10: { name: "Encantamento", emoji: "✨", desc: "+dano no alvo" },
  m11: { name: "Aura Ártica", emoji: "🌟", desc: "Grupo +crítico" },
  a7: { name: "Reanimar", emoji: "⚡", desc: "+mana/+dano" },
  a10: { name: "Sentido de Caminho", emoji: "🧭", desc: "Grupo +velocidade" },
  x5: { name: "Poço de Mimir", emoji: "🕳️", desc: "Grupo +mana" },
  x7: { name: "Uivo Canino", emoji: "🐺", desc: "Grupo +pressa" },
  x8: { name: "Convocar", emoji: "🌀", desc: "Grupo teleporta" },
  x10: { name: "Escudo Espiritual", emoji: "👻", desc: "Absorve dano" },
  territorio: { name: "Domínio de Facção", emoji: "🏳️", desc: "+10% XP (torre)" },
  descanso: { name: "Descanso em Casa", emoji: "🏠", desc: "+15% XP" },
  estrelas: { name: "Chuva de Estrelas", emoji: "🌟", desc: "XP ×2" },
  forcapocao: { name: "Elixir de Força", emoji: "💪", desc: "+40% ATK" },
  ventopocao: { name: "Poção do Vento", emoji: "🌪️", desc: "+35% VEL" },
  guardapocao: { name: "Óleo de Guarda", emoji: "🛡️", desc: "+40% DEF" },
  grupo: { name: "Bónus de Grupo", emoji: "🤝", desc: "+XP/+loot por membro perto" },
}

// ──Marcos com significado (20) ─────────────────────────────
export const LANDMARKS = [
  { id: "banco", name: "Banco de Pontos", x: -12, z: -8, r: 5, emoji: "🏦", desc: "Troca ouro por créditos reais da plataforma" },
  { id: "leilao", name: "Casa de Leilões", x: 14, z: -6, r: 5, emoji: "🔨", desc: "Acede aos leilões reais da plataforma" },
  { id: "feira", name: "Feira de Bens", x: -30, z: 12, r: 6, emoji: "🏪", desc: "Bens em alienação reais expostos no mundo" },
  { id: "loja", name: "Loja do Mercador", x: 30, z: 14, r: 5, emoji: "🛒", desc: "Poções, montarias e melhorias" },
  { id: "montaria", name: "Mestre de Montarias", x: -6, z: 22, r: 4, emoji: "🐴", desc: "Reclama e invoca montarias" },
  { id: "portal_v", name: "Portal Vanguard", x: -60, z: -40, r: 6, emoji: "🌀", desc: "Teleporta ao Castelo Vanguard" },
  { id: "portal_t", name: "Portal Bloodlust", x: 60, z: 40, r: 6, emoji: "🌀", desc: "Teleporta à Fortaleza Bloodlust" },
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

// ════════════════════════════════════════════════════════════
// REA v19 — FUSÃO DOS MELHORES DO GÉNERO
//  · Genshin (visual por bioma, identidade de região)
//  · Zelda BotW / Elden Ring (miradouros, segredos, viagem rápida)
//  · Fortnite / WoW (retenção: passe, streak, onboarding guiado)
//  · Bartle (conquistador/explorador/socializador/competidor)
// ════════════════════════════════════════════════════════════

// ── MIRADOUROS (BotW: torre ativa → revela a região) ────────
export const MIRADOUROS = [
  { id: "mira_planicie", region: "planicie", x: -95, z: 25, name: "Miradouro da Campina" },
  { id: "mira_floresta", region: "floresta", x: -175, z: 120, name: "Miradouro da Floresta Guardstone" },
  { id: "mira_dunas", region: "dunas", x: 45, z: -155, name: "Miradouro do Deserto Headless" },
  { id: "mira_pantano", region: "pantano", x: 185, z: 45, name: "Miradouro do Oásis" },
  { id: "mira_vulcao", region: "vulcao", x: -45, z: -225, name: "Miradouro de Marrowlands" },
  { id: "mira_tundra", region: "tundra", x: 265, z: -65, name: "Miradouro de Faivel" },
  { id: "mira_titas", region: "titas", x: -265, z: -25, name: "Miradouro do Pinhal Lunar" },
  { id: "mira_escuro", region: "escuro", x: 105, z: 235, name: "Miradouro de Gloomfury" },
];

// ── EMOTES (socializadores) ─────────────────────────────────
export const EMOTES = [
  { id: "ola", emoji: "👋", name: "Saudação" },
  { id: "danca", emoji: "💃", name: "Dança" },
  { id: "forca", emoji: "💪", name: "Força" },
  { id: "agradecer", emoji: "🙏", name: "Gratidão" },
  { id: "riso", emoji: "😂", name: "Riso" },
  { id: "chorar", emoji: "😭", name: "Choro" },
];

// ── AURAS cosméticas (estatuto visível — afinal é um MMO) ───
export const AURAS = [
  { id: "fogo", name: "Aura de Fogo", color: "#f97316", cost: 6000 },
  { id: "gelo", name: "Aura de Gelo", color: "#38bdf8", cost: 6000 },
  { id: "sombra", name: "Aura Sombria", color: "#a855f7", cost: 12000 },
  { id: "lenda", name: "Aura Lendária", color: "#fbbf24", cost: 25000 },
];

// ── PASSE DAS LENDAS (temporada 1 — 12 níveis) ──────────────
export interface PassTier { tier: number; need: number; kind: "gold" | "fragmento" | "cupao" | "pot" | "titulo"; n: number; label: string }

export const BATTLE_PASS: PassTier[] = [
  { tier: 1, need: 30, kind: "gold", n: 1500, label: "1.500 ouro" },
  { tier: 2, need: 70, kind: "fragmento", n: 4, label: "4 Fragmentos" },
  { tier: 3, need: 120, kind: "pot", n: 3, label: "3 Poções de Vida" },
  { tier: 4, need: 180, kind: "gold", n: 4000, label: "4.000 ouro" },
  { tier: 5, need: 250, kind: "cupao", n: 1, label: "1 CUPÃO 🎟️" },
  { tier: 6, need: 330, kind: "fragmento", n: 8, label: "8 Fragmentos" },
  { tier: 7, need: 420, kind: "gold", n: 9000, label: "9.000 ouro" },
  { tier: 8, need: 520, kind: "titulo", n: 1, label: "Título: Ascendente" },
  { tier: 9, need: 640, kind: "cupao", n: 2, label: "2 CUPÕES 🎟️" },
  { tier: 10, need: 780, kind: "gold", n: 20000, label: "20.000 ouro" },
  { tier: 11, need: 950, kind: "fragmento", n: 15, label: "15 Fragmentos" },
  { tier: 12, need: 1200, kind: "titulo", n: 1, label: "Título: ESTRELA DA TEMPORADA ⭐" },
];

export const PASS_XP = { kill: 1, elite: 3, boss: 8, chest: 5, miradouro: 15, quest: 6, villain: 12, fruto: 2 };

// ── STREAK diário (retenção diária — ciclo de 7 dias) ───────
export const STREAK_REWARDS = [
  { day: 1, kind: "gold", n: 800, label: "800 ouro" },
  { day: 2, kind: "fragmento", n: 2, label: "2 Fragmentos" },
  { day: 3, kind: "pot", n: 2, label: "2 Poções" },
  { day: 4, kind: "gold", n: 2500, label: "2.500 ouro" },
  { day: 5, kind: "cupao", n: 1, label: "1 CUPÃO 🎟️" },
  { day: 6, kind: "fragmento", n: 5, label: "5 Fragmentos" },
  { day: 7, kind: "gold", n: 6000, label: "6.000 ouro + aura 🌟" },
];

// ── TUTORIAL guiado (Exile's Reach: 6 passos com recompensa) ─
export const TUTORIAL_STEPS = [
  { id: 0, text: "Abate 3 criaturas na Campina", goal: 3, reward: 500 },
  { id: 1, text: "Abre 1 baú escondido (procura o brilho dourado)", goal: 1, reward: 800 },
  { id: 2, text: "Ativa 1 Miradouro 🗼", goal: 1, reward: 1200 },
  { id: 3, text: "Aprende uma habilidade nova", goal: 1, reward: 800 },
  { id: 4, text: "Visita o Banco de Pontos na Vila", goal: 1, reward: 600 },
  { id: 5, text: "Reclama o primeiro nível do Passe das Lendas", goal: 1, reward: 1000 },
];

// ── Títulos extra (passe/exploração) ────────────────────────
export const EXTRA_TITLES: Record<string, string> = {
  ascendente: "Ascendente",
  estrela: "Estrela da Temporada ⭐",
  explorador: "Explorador Supremo 🧭",
};
