// @ts-nocheck
// ============================================================
// BATEU WORLD — Motor 3D em tempo real (estilo Hordes.io) · v4
// Three.js: mundo aberto low-poly, combate em tempo real,
// multiplayer via Supabase Realtime (broadcast + presence),
// PvP com roubo de cupões/pontos, poderes por classe,
// partículas, descobertas, missões, bancos e natureza viva.
// v4: PÓS-PROCESSAMENTO cinematográfico (bloom/vinheta/ACES),
// qualidade adaptativa, loot com raridades, pet companheiro,
// ARENA DAS ONDAS (sobrevivência), combo de mortes, estrelas
// cadentes, paleta de pôr-do-sol e modo foto.
// v5: AVATARES articulados e customizáveis (pele, cabelo,
// traje, capa, chapéu) com preview 3D, animação de caminhada,
// aparência sincronizada entre jogadores e emotes visuais.
// v7: MUNDO ESPECTACULAR — terreno com cores por bioma,
// floresta densa com 6 tipos de árvores (acácias, pinheiros,
// gigantes, palmeiras, cactos, árvores mortas), cogumelos
// luminosos, monólitos, lanternas, tendas, fogueira viva,
// aurora boreal, névoa/poeira/cinzas por região,
// ACONTECIMENTOS DO MUNDO (meteoros, frenesi de roubos,
// enxame de elite), roubo de ITENS em PvP e novas missões
// diárias de caça entre heróis.
// ============================================================

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { supabase } from "@/integrations/supabase/client";
import { worldAudio } from "./worldAudio";
import {
  buildAvatar, animateAvatar, defaultAvatar, avatarKey, parseAvatarKey,
  type AvatarConfig, type AvatarParts,
} from "./avatar";

export interface EngineStats {
  atk: number;
  maxHp: number;
  spd: number;
  def: number; // v6: defesa — reduz o dano recebido (até ~60%)
}

export interface EngineOpts {
  name: string;
  classId: number;
  level: number;
  uid: string;
  stats: EngineStats;
  avatar?: AvatarConfig;
  onEvent: (ev: { type: string; [k: string]: any }) => void;
}

// ── Loot: raridades e geração de itens ──────────────────────
export interface LootItem {
  id: string;
  slot: "arma" | "armadura" | "amuleto" | "escudo"; // v6: + escudo
  name: string;
  emoji: string;
  rarity: 0 | 1 | 2 | 3; // 0 Comum · 1 Raro · 2 Épico · 3 Lendário
  atk: number;
  hp: number;
  spd: number;
  def: number; // v6: pontos de defesa (redução de dano)
}

export const RARITY_META = [
  { name: "Comum", color: "#9ca3af", glow: 0x9ca3af },
  { name: "Raro", color: "#38bdf8", glow: 0x38bdf8 },
  { name: "Épico", color: "#a855f7", glow: 0xa855f7 },
  { name: "Lendário", color: "#fbbf24", glow: 0xfbbf24 },
];

const LOOT_PREFIX = [
  ["Gasto", "Simples", "Comum", "Desgastado"],
  ["Afiado", "Enferrujada"],
  ["Épico", "Arcano"],
  ["Lendário", "Divino", "Mítico"],
];
const LOOT_BASE: Record<LootItem["slot"], string[]> = {
  arma: ["Lâmina", "Machado", "Cajado", "Arco", "Punhal", "Martelo"],
  armadura: ["Peitoral", "Manto", "Couraça", "Capa", "Elmo"],
  amuleto: ["Talismã", "Anel", "Colar", "Gema", "Totem"],
  escudo: ["Broquel", "Adarga", "Pavês", "Escudo", "Égide"],
};
const LOOT_EMOJI: Record<LootItem["slot"], string[]> = {
  arma: ["🗡️", "🪓", "🪄", "🏹", "🔨"],
  armadura: ["🥋", "🪖", "🦺"],
  amuleto: ["💎", "💍", "📿", "🔷"],
  escudo: ["🛡️", "⛨", "🛡"],
};

export function rollLoot(tier: number, isBoss: boolean, isGuard: boolean, level: number): LootItem | null {
  const chance = isBoss ? 1 : isGuard ? 0.4 : [0.09, 0.11, 0.13, 0.15, 0.18][tier] ?? 0.1;
  if (Math.random() > chance) return null;
  // raridade pesada pelo tier
  const roll = Math.random() + tier * 0.08 + (isBoss ? 0.3 : 0) + (isGuard ? 0.12 : 0);
  const rarity: LootItem["rarity"] = roll > 1.05 ? 3 : roll > 0.82 ? 2 : roll > 0.5 ? 1 : 0;
  const slots: LootItem["slot"][] = ["arma", "armadura", "amuleto", "escudo"]; // v6: + escudo
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const bases = LOOT_BASE[slot];
  const emojis = LOOT_EMOJI[slot];
  const base = bases[Math.floor(Math.random() * bases.length)];
  const pool = LOOT_PREFIX[rarity];
  const prefix = pool[Math.floor(Math.random() * pool.length)];
  const mult = 1 + level * 0.12 + rarity * 0.55 + (isBoss ? 0.4 : 0);
  const stat = (base3: number) => Math.max(1, Math.round(base3 * mult * (0.75 + Math.random() * 0.5)));
  return {
    id: "lt_" + Math.random().toString(36).slice(2, 9),
    slot,
    name: `${prefix} ${base}`, // raro usa "de" quando soa melhor
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    rarity,
    atk: slot === "arma" ? stat(3) : rarity >= 2 ? stat(1) : 0,
    hp: slot === "armadura" ? stat(9) : slot === "escudo" ? stat(6) : rarity >= 2 ? stat(4) : 0,
    spd: slot === "amuleto" ? stat(0.6) : 0,
    def: slot === "escudo" ? stat(2.4) : slot === "armadura" ? Math.max(1, stat(1.1)) : 0,
  };
}

export interface SkillDef {
  name: string;
  emoji: string;
  lvl: number;
  cd: number;
  desc: string;
}

// ── Poderes por classe (slot 0/1/2 desbloqueiam a Nv3/7/12) ──
export const SKILLS: SkillDef[][] = [
  // Guerreiro
  [
    { name: "Golpe Devastador", emoji: "💥", lvl: 3, cd: 8, desc: "Golpeia todos os inimigos próximos (2.2x)" },
    { name: "Grito de Guerra", emoji: "📢", lvl: 7, cd: 18, desc: "+50% de ataque durante 8s" },
    { name: "Terremoto", emoji: "🌋", lvl: 12, cd: 25, desc: "3.2x em área + atordoa os inimigos" },
  ],
  // Mago
  [
    { name: "Explosão Arcana", emoji: "✨", lvl: 3, cd: 8, desc: "Explosão mágica em área (2.4x)" },
    { name: "Nova de Gelo", emoji: "❄️", lvl: 7, cd: 16, desc: "Congela e fere inimigos à volta" },
    { name: "Meteoro", emoji: "☄️", lvl: 12, cd: 26, desc: "Chama um meteoro: 4x de dano massivo" },
  ],
  // Arqueiro
  [
    { name: "Chuva de Flechas", emoji: "🌧️", lvl: 3, cd: 9, desc: "5 flechas rápidas nos inimigos próximos" },
    { name: "Passo Sombrio", emoji: "💨", lvl: 7, cd: 14, desc: "Avanço instantâneo + esquiva breve" },
    { name: "Tiro Certeiro", emoji: "🎯", lvl: 12, cd: 20, desc: "Flecha perfurante devastadora (3.5x)" },
  ],
  // Curandeiro
  [
    { name: "Onda Vital", emoji: "💚", lvl: 3, cd: 8, desc: "Cura 30% da vida + fere inimigos" },
    { name: "Círculo de Cura", emoji: "🌀", lvl: 7, cd: 20, desc: "Regeneração forte durante 10s" },
    { name: "Ira da Natureza", emoji: "🌿", lvl: 12, cd: 24, desc: "2.8x em área + cura 15% da vida" },
  ],
];

// ── Descobertas do mundo ─────────────────────────────────────
export const LANDMARKS: { id: string; name: string; x: number; z: number; r: number; emoji: string; desc: string }[] = [
  { id: "obelisco", name: "Obelisco da Praça", x: 0, z: 0, r: 12, emoji: "🗿", desc: "Coração do mundo — renasces aqui quando cais em combate" },
  { id: "templo", name: "Templo dos Sorteios", x: 0, z: -52, r: 13, emoji: "🎁", desc: "Abre baús com bilhetes de sorteios REAIS da plataforma" },
  { id: "feira", name: "Feira Bateu", x: 52, z: 0, r: 13, emoji: "🛒", desc: "Bens reais em venda e leasing — viaturas, lojas, equipamentos" },
  { id: "torre", name: "Torre dos Concursos", x: -52, z: 0, r: 13, emoji: "🏆", desc: "Concursos ativos da comunidade — participa e ganha prémios" },
  { id: "cofre", name: "Cofre de Cupões", x: 0, z: 52, r: 13, emoji: "🎟️", desc: "Baús guardam cupões de desconto reais para as tuas compras" },
  { id: "banco", name: "Banco de Pontos", x: -14, z: -14, r: 8, emoji: "🏦", desc: "Troca Pontos de Troféu por cupões e moeda REAL da carteira" },
  { id: "fonte", name: "Fonte da Vida", x: 14, z: -14, r: 7, emoji: "⛲", desc: "Cura gratuita e total — o teu ponto de descanso seguro" },
  { id: "ruinas", name: "Ruínas Antigas", x: -100, z: -60, r: 10, emoji: "🏛️", desc: "Restos de uma civilização perdida — chefes espreitam as pedras" },
  { id: "lago", name: "Lago Misterioso", x: 95, z: 70, r: 11, emoji: "🌊", desc: "Águas que brilham à noite — dizem que guardam um segredo" },
  { id: "caverna", name: "Caverna de Cristais", x: -90, z: 85, r: 10, emoji: "💎", desc: "Cristais luminosos — ninho de bugs gélidos e tesouros raros" },
  { id: "baoba", name: "Baobá Gigante", x: 60, z: -100, r: 10, emoji: "🌳", desc: "A árvore-mãe do mundo — mil anos de histórias nas raízes" },
  { id: "arena", name: "Arena das Ondas", x: 112, z: 0, r: 13, emoji: "🏟️", desc: "Sobrevive a ondas de inimigos e ganha pontos e ouro sem fim" },
  // v6 — novos marcos do mundo expandido
  { id: "vigia", name: "Torre de Vigia", x: -140, z: 20, r: 10, emoji: "🗼", desc: "Vê o mundo lá do alto — o melhor ponto para planear rotas" },
  { id: "aldeia", name: "Aldeia Capulana", x: 40, z: 140, r: 11, emoji: "🏘️", desc: "Aldeia acolhedora de jogadores — zona calma sem perigos" },
  { id: "desejos", name: "Pedra dos Desejos", x: -35, z: -150, r: 9, emoji: "🪨", desc: "Monólito antigo que sussurra aos exploradores corajosos" },
  { id: "cacamp", name: "Acampamento dos Caçadores", x: 150, z: 90, r: 10, emoji: "⛺", desc: "Base dos heróis no deserto — fogueira com bónus de XP" },
  { id: "eclipse", name: "Portal do Eclipse", x: -150, z: -140, r: 11, emoji: "🌀", desc: "Portal instável — por aqui entram os bugs mais perigosos" },
  { id: "eco", name: "Gruta do Eco", x: 155, z: -70, r: 9, emoji: "🕳️", desc: "Cada golpe ressoa sete vezes — treina os teus poderes aqui" },
  // v10 — o novo coração da Floresta Ancestral
  { id: "coracao", name: "Coração da Floresta", x: -120, z: -40, r: 13, emoji: "💚", desc: "A clareira sagrada onde o cristal verde pulsa — a Guardiã Anciã nunca dorme" },
];

// ── v8: Vilas e Interiores — edifícios enteráveis do mundo ──
// Catálogo público (mapa, legenda e E2E). A geometria real vive
// no motor (buildBuildings → makeHouse / makeLighthouse).
export const BUILDINGS: { id: string; name: string; desc: string; x: number; z: number; emoji: string; floors: number }[] = [
  { id: "casa-explorador", name: "Casa do Explorador", desc: "Primeira casa da vila — sobe ao 2º andar e vigia a praça", x: 24, z: 18, emoji: "🏠", floors: 2 },
  { id: "pousada", name: "Pousada do Viajante", desc: "Camas quentes e alpendre — descanso rápido dentro", x: -27, z: 21, emoji: "🛏️", floors: 1 },
  { id: "cabana-lenhador", name: "Cabana do Lenhador", desc: "Troncos milenares na Floresta Ancestral — mapas no andar de cima", x: -106, z: -24, emoji: "🛖", floors: 2 },
  { id: "casa-mercador", name: "Casa do Mercador", desc: "Adobe fresco nas Dunas — tapetes e jarros do norte", x: -52, z: -136, emoji: "🏺", floors: 1 },
  { id: "farol", name: "Farol das Ondas", desc: "3 pisos e miradouro no topo — a melhor vista do mundo", x: 140, z: 34, emoji: "🗼", floors: 4 },
  { id: "abrigo-pantano", name: "Abrigo do Pântano", desc: "Em palafitas sobre a água — os bugs não sobem", x: 18, z: 126, emoji: "🏡", floors: 1 },
  { id: "fortim-vulcanico", name: "Fortim Vulcânico", desc: "Bastião de pedra nas Terras Vulcânicas — vigia o calor", x: 158, z: -128, emoji: "🏰", floors: 2 },
];

export const ARENA_CENTER = new THREE.Vector3(112, 0, 0);
export const ARENA_RADIUS = 26;

export const PVP_SAFE_RADIUS = 21;
const PVP_MIN_LEVEL = 3;
const PVP_SHIELD_MS = 180000; // 3 min após ser roubado

interface Mob {
  group: THREE.Group;
  hpBar: THREE.Sprite;
  hpCanvas: HTMLCanvasElement;
  hpTex: THREE.CanvasTexture;
  tier: number;
  hp: number;
  maxHp: number;
  atk: number;
  xp: number;
  gold: number;
  pts: number;
  speed: number;
  home: THREE.Vector3;
  target: THREE.Vector3;
  state: "idle" | "chase" | "return" | "dead";
  nextThink: number;
  atkCd: number;
  respawnAt: number;
  hitFlash: number;
  bob: number;
  isBoss: boolean;
  isGuard: boolean;
  stunUntil: number;
  slowUntil: number;
  name: string;
  arena?: boolean;
  event?: boolean; // v7: mob de Acontecimento (recompensas x2, desaparece no fim)
}

interface RemotePlayer {
  group: THREE.Group;
  hpBar: THREE.Sprite;
  hpCanvas: HTMLCanvasElement;
  hpTex: THREE.CanvasTexture;
  target: THREE.Vector3;
  targetRy: number;
  moving: boolean;
  lastSeen: number;
  name: string;
  hp: number;
  maxHp: number;
  shield: boolean;
  // v5: avatar customizável do outro jogador
  parts: AvatarParts | null;
  walkT: number;
  avKey: string;
  emoteSpr: THREE.Sprite | null;
  emoteUntil: number;
}

interface Projectile {
  mesh: THREE.Mesh;
  target: Mob | null;
  speed: number;
  dmg: number;
  life: number;
  kind: "orb" | "arrow";
  trailColor: number | null;
}

interface Orb {
  mesh: THREE.Mesh;
  t: number;
  gold: number;
  xp: number;
  mult: number;
  from: THREE.Vector3;
}

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  t: number;
  life: number;
  gravity: number;
  size: number;
}

interface FloatText {
  sprite: THREE.Sprite;
  t: number;
  life: number;
}

interface Interactable {
  group: THREE.Group;
  kind: "raffle" | "contest" | "voucher" | "asset" | "games" | "bank" | "fountain" | "arena";
  id: string;
  label: string;
  pos: THREE.Vector3;
  used: boolean;
  lid?: THREE.Mesh;
  icon?: THREE.Sprite;
}

// v4 — loot no chão
interface GroundLoot {
  group: THREE.Group;
  item: LootItem;
  t: number;
}

// ── v8: EDIFÍCIOS ENTERÁVEIS ────────────────────────────────
// Piso = retângulo a altura fixa; Rampa = escada que interpola a
// altura enquanto o herói anda (sobe-se a pé, sem teleportes).
// Paredes = caixas de colisão (AABB) com topo — só bloqueiam
// quem está por baixo, para o 2º andar ser andável por cima.
interface FloorZone {
  minX: number; maxX: number; minZ: number; maxZ: number;
  y: number;
  rampAxis?: "x" | "z";
  y0?: number; // altura no lado MIN do eixo
  y1?: number; // altura no lado MAX do eixo
}

interface WallBox {
  minX: number; maxX: number; minZ: number; maxZ: number;
  top: number; base: number; // colide só entre base e topo
}

interface Building {
  id: string;
  name: string;
  desc: string;
  group: THREE.Group;
  cx: number;
  cz: number;
  minX: number; maxX: number; minZ: number; maxZ: number;
  f0Y: number; // altura do piso de entrada
  zones: FloorZone[];
  walls: WallBox[];
  roof: THREE.Group | null;
  doorPivot: THREE.Group | null;
  doorBaseY: number;
  doorOpenT: number; // 0 fechado → 1 aberto
  light: THREE.PointLight | null;
  camBlockers: THREE.Mesh[];
}

// v4 — estado da Arena das Ondas
interface ArenaState {
  active: boolean;
  wave: number;
  alive: number;
  kills: number;
  pts: number;
  gold: number;
  xp: number;
  nextWaveAt: number;
  cooldown: boolean;
}

// ── Balanceamento v2: 5 tiers + guardiões + 2 chefes ─────────
const MOB_TIERS = [
  { hp: 40, atk: 6, xp: 14, gold: 10, pts: 1, speed: 2.2, color: 0x4ade80, name: "Bug Verde", scale: 1 },
  { hp: 95, atk: 12, xp: 34, gold: 24, pts: 2, speed: 2.8, color: 0xf97316, name: "Bug Laranja", scale: 1.25 },
  { hp: 190, atk: 20, xp: 75, gold: 55, pts: 4, speed: 3.3, color: 0xa855f7, name: "Bug Sombrio", scale: 1.5 },
  { hp: 340, atk: 30, xp: 140, gold: 100, pts: 7, speed: 3.6, color: 0x38bdf8, name: "Bug Gélido", scale: 1.7 },
  { hp: 520, atk: 42, xp: 240, gold: 180, pts: 10, speed: 3.9, color: 0xf43f5e, name: "Bug Infernal", scale: 1.9 },
];

const CLASS_COLORS = [0xef4444, 0x8b5cf6, 0x22c55e, 0x06b6d4];
const WORLD_RADIUS = 230;

// ── v6: Regiões nomeadas do mundo expandido ──────────────
export interface RegionDef {
  id: string;
  name: string;
  desc: string;
  cx: number;
  cz: number;
  r: number;
  color: string;
}
export const REGIONS: RegionDef[] = [
  { id: "planicie", name: "Planície Central", desc: "Zona inicial segura — a Praça, o Banco e a Fonte", cx: 0, cz: 0, r: 70, color: "#4ade80" },
  { id: "floresta", name: "Floresta Ancestral", desc: "Árvores milenares a oeste — o Coração Verde pulsa entre raízes gigantes", cx: -120, cz: -40, r: 85, color: "#15803d" },
  { id: "dunas", name: "Dunas Escaldantes", desc: "Deserto do norte — calor extremo e bugs de elite", cx: -40, cz: -150, r: 85, color: "#f59e0b" },
  { id: "litoral", name: "Litoral das Ondas", desc: "Costa a leste — a Arena e o Lago Misterioso", cx: 130, cz: 20, r: 85, color: "#38bdf8" },
  { id: "pantano", name: "Pântano Sombrio", desc: "Terras húmidas do sul — o perigo espreita na névoa", cx: 40, cz: 150, r: 85, color: "#7c3aed" },
  { id: "montanhas", name: "Montanhas Negras", desc: "Picos rochosos a sudoeste — cavernas de cristais", cx: -120, cz: 130, r: 85, color: "#64748b" },
  { id: "vulcanicas", name: "Terras Vulcânicas", desc: "O canto mais hostil do mundo — só para lendas", cx: 170, cz: -140, r: 75, color: "#dc2626" },
];
const DAY_LEN = 240000; // ms

function groundY(x: number, z: number): number {
  const base =
    1.5 * Math.sin(x * 0.045) * Math.cos(z * 0.038) +
    0.7 * Math.sin(x * 0.11 + 2) * Math.sin(z * 0.09 + 1) +
    0.4 * Math.sin((x + z) * 0.02);
  // Zonas planas: praça + POIs + marcos + arena
  const pois: [number, number][] = [[0, 0], [0, -52], [52, 0], [-52, 0], [0, 52],
    [-100, -60], [95, 70], [-90, 85], [60, -100], [-14, -14], [14, -14], [112, 0]];
  let f = 1;
  for (const [px, pz] of pois) {
    const d = Math.hypot(x - px, z - pz);
    if (d < 16) { f = 0; break; }
    if (d < 28) f = Math.min(f, (d - 16) / 12);
  }
  if (Math.abs(x) < 3.5 || Math.abs(z) < 3.5) f = Math.min(f, 0.15);
  return base * Math.max(0, f);
}

// ── v7: bioma dominante numa posição (índice de REGIONS) ────
const BIOME_COLORS = [
  { base: 0x4e9c40, alt: 0x63b04b },  // 0 planície — verde savana
  { base: 0x1e6b3c, alt: 0x2d8549 },  // 1 floresta — verde profundo
  { base: 0xddb06a, alt: 0xecca8f },  // 2 dunas — areia
  { base: 0x7fb04c, alt: 0x9cc35e },  // 3 litoral — verde claro
  { base: 0x41584a, alt: 0x52684f },  // 4 pântano — verde sombrio
  { base: 0x6e7b74, alt: 0x87928c },  // 5 montanhas — cinza-rocha
  { base: 0x4a3d3a, alt: 0x5c4a44 },  // 6 vulcânicas — cinza incandescente
];
const C_SAND = new THREE.Color(0xe4c48c);
const C_STONE = new THREE.Color(0x9aa0a6);
const C_ROAD = new THREE.Color(0x8a6a3d);

function biomeOf(x: number, z: number): number {
  let best = 0;
  let bestScore = Infinity;
  for (let i = 0; i < REGIONS.length; i++) {
    const rg = REGIONS[i];
    const d = Math.hypot(x - rg.cx, z - rg.cz) / rg.r;
    if (d < bestScore) { bestScore = d; best = i; }
  }
  return best;
}

function smooth01(t: number): number {
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// v8: pool de rótulos/ícones do mundo para culling por distância
// (limpeza visual — nada de texto a flutuar longe do jogador)
const CULL_POOL: THREE.Sprite[] = [];

function makeTextSprite(text: string, opts: { size?: number; color?: string; bg?: boolean; accent?: string; cull?: boolean } = {}): THREE.Sprite {
  const size = opts.size ?? 30;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  if (opts.bg) {
    ctx.fillStyle = "rgba(8,10,18,0.82)";
    const r = 24;
    ctx.beginPath();
    ctx.moveTo(r, 8); ctx.lineTo(512 - r, 8); ctx.quadraticCurveTo(512 - 8, 8, 512 - 8, 8 + r);
    ctx.lineTo(512 - 8, 128 - r); ctx.quadraticCurveTo(512 - 8, 120, 512 - r, 120);
    ctx.lineTo(r, 120); ctx.quadraticCurveTo(8, 120, 8, 120 - r);
    ctx.lineTo(8, 8 + r); ctx.quadraticCurveTo(8, 8, r, 8);
    ctx.fill();
    if (opts.accent) { ctx.strokeStyle = opts.accent; ctx.lineWidth = 5; ctx.stroke(); }
  }
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.strokeText(text, 256, 64);
  ctx.fillStyle = opts.color || "#ffffff";
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  if (opts.cull) CULL_POOL.push(spr);
  return spr;
}

function makeIconSprite(emoji: string, cull = false): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "92px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 64, 70);
  const tex = new THREE.CanvasTexture(canvas);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  if (cull) CULL_POOL.push(spr);
  return spr;
}

export class WorldEngine {
  private canvas: HTMLCanvasElement;
  private opts: EngineOpts;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private hemi!: THREE.HemisphereLight;
  private sun!: THREE.DirectionalLight;

  private player!: THREE.Group;
  private playerShadow!: THREE.Mesh;
  private pos = new THREE.Vector3(0, 0, 6);
  private vy = 0;
  private onGround = true;
  private moveDirFace = new THREE.Vector3(0, 0, -1);
  private camYaw = 0;
  private camDist = 12;
  // v12: modos de câmara — "orbit" (clássica) / "third" (ombro, San Andreas) / "first" (olhos do personagem, Minecraft)
  camMode: "orbit" | "third" | "first" = "orbit";
  private camPitch = 0.34;
  private camPos = new THREE.Vector3(0, 8, 18);

  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private dragId: number | null = null;
  private dragStart = { x: 0, y: 0, t: 0, moved: 0 };
  private dragging = false;

  private mobs: Mob[] = [];
  private projectiles: Projectile[] = [];
  private orbs: Orb[] = [];
  private particles: Particle[] = [];
  private floats: FloatText[] = [];
  private interactables: Interactable[] = [];
  private remotes = new Map<string, RemotePlayer>();
  private chan: any = null;
  private posTimer: any = null;
  private remoteGroup!: THREE.Group;

  private atkCd = 0;
  private skillCds = [0, 0, 0];
  private lastHitAt = 0;
  private hp: number;
  private invulnUntil = 0;
  private dead = false;
  private near: Interactable | null = null;
  private nearLm: string | null = null; // v6: marco próximo (nome — significado)
  private bob = 0;
  private raf = 0;
  private lastT = 0;
  private disposed = false;
  private resizeObs!: ResizeObserver;
  private myId: string;

  // Buffs / poderes
  private atkBuffUntil = 0;
  private hotUntil = 0;
  private hotTick = 0;
  private dashUntil = 0;
  private pvpShieldUntil = 0;
  private lastPvpHpSent = 0;
  private dustTimer = 0;

  // PvP
  private shakeAmp = 0;

  // Descobertas
  private discovered = new Set<string>();
  private discoverCheckT = 0;

  // Vaga-lumes noturnos
  private fireflies: { spr: THREE.Sprite; a: number; r: number; s: number; y0: number }[] = [];

  // v7 — atmosfera por bioma + cenário vivo
  private ambFx: { spr: THREE.Sprite; kind: "mist" | "dust" | "ash"; cx: number; cz: number; a: number; r: number; s: number; y0: number; size: number; phase: number }[] = [];
  private aurora: THREE.Group | null = null;
  private cloudMat: THREE.MeshLambertMaterial | null = null;
  private campfireLight: THREE.PointLight | null = null;
  private campfireGlow: THREE.Sprite | null = null;

  // v7 — ACONTECIMENTOS DO MUNDO
  private wEvent: { kind: "" | "meteors" | "frenzy" | "swarm"; until: number; next: number } = { kind: "", until: 0, next: 14000 };
  private meteors: { x: number; z: number; t0: number; ring: THREE.Mesh; spr: THREE.Sprite; hit: boolean }[] = [];
  private meteorTimer = 0;

  // v8 — EDIFÍCIOS ENTERÁVEIS (casas, torres, escadas)
  private buildings: Building[] = [];
  private camBlockerList: THREE.Mesh[] = [];
  private curInside: Building | null = null;
  private insideSeen = new Set<string>();
  private insideRegenT = 0;
  private cullables: { spr: THREE.Sprite; x: number; z: number }[] = [];
  private cullT = 0;
  private ray = new THREE.Raycaster();

  // v10 — CORAÇÃO DA FLORESTA (Floresta Ancestral espetacular)
  private heartLight: THREE.PointLight | null = null;
  private heartCrystal: THREE.Group | null = null;
  private godRays: { mesh: THREE.Mesh; phase: number }[] = [];
  private spores: { spr: THREE.Sprite; a: number; r: number; y0: number; s: number; phase: number }[] = [];
  private heartRunes: THREE.Mesh[] = [];

  // v3 — céu, clima e vida do mundo
  private skyDome!: THREE.Mesh;
  private stars!: THREE.Points;
  private sunSpr!: THREE.Sprite;
  private moonSpr!: THREE.Sprite;
  private clouds: { g: THREE.Group; spd: number }[] = [];
  private butterflies: { spr: THREE.Sprite; a: number; r: number; s: number; y0: number }[] = [];
  private lakeWater: THREE.Mesh | null = null;
  private rippleT = 0;
  private fountainT = 0;

  // v3 — herói (arma/capa/aura)
  private weaponPivot: THREE.Group | null = null;
  private capeMesh: THREE.Mesh | null = null;
  // v6 — defesa: escudo equipado na mão esquerda + modo guarda
  private guarding = false;
  private guardT = 0;          // 0..1 animação suave de erguer/abaixar
  private shieldMesh: THREE.Group | null = null;
  private shieldGlow: THREE.Mesh | null = null;
  private guardFlash = 0;      // flash dourado ao bloquear
  // v6 — waypoint do mapa grande + região atual
  private waypoint: THREE.Vector3 | null = null;
  private waypointBeam: THREE.Group | null = null;
  private lastRegion = "";
  // v5: avatar articulado do jogador
  private avParts: AvatarParts | null = null;
  private avCfg: AvatarConfig = defaultAvatar(0);
  private avKey = "";
  private swingT = 0;             // 0..1 animação de golpe
  private landSquash = 0;
  private classAura!: THREE.PointLight;

  // v3 — chefe ativo para a barra do HUD
  private bossAuraLights: THREE.PointLight[] = [];

  // v3 — emote ativo
  private emoteSprite: THREE.Sprite | null = null;
  private emoteUntil = 0;

  // ── v4: pós-processamento e qualidade ──
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private vignettePass: ShaderPass | null = null;
  private quality: "auto" | "low" | "medium" | "high" = "auto";
  private pq = { bloom: true, vignette: true, pixelRatio: 1.5 };

  // ── v4: loot, pet, arena, combo ──
  private groundLoot: GroundLoot[] = [];
  private pet: THREE.Group | null = null;
  private petT = 0;
  private hasPet = false;
  private arena: ArenaState = { active: false, wave: 0, alive: 0, kills: 0, pts: 0, gold: 0, xp: 0, nextWaveAt: 0, cooldown: false };
  private arenaRing: THREE.Mesh | null = null;
  private combo = 0;
  private comboUntil = 0;
  private shootStars: { spr: THREE.Sprite; active: boolean; t: number; dur: number; from: THREE.Vector3; to: THREE.Vector3; next: number }[] = [];

  // geometrias partilhadas
  private geoBody!: THREE.CapsuleGeometry;
  private geoHead!: THREE.SphereGeometry;
  private geoOrb!: THREE.SphereGeometry;
  private geoShadow!: THREE.CircleGeometry;
  private geoPart!: THREE.SphereGeometry;
  private matShadow!: THREE.MeshBasicMaterial;

  constructor(canvas: HTMLCanvasElement, opts: EngineOpts) {
    this.canvas = canvas;
    this.opts = opts;
    this.hp = opts.stats.maxHp;
    this.myId = opts.uid;
    this.init();
  }

  // ── INIT ────────────────────────────────────────────────────

  private init(): void {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !isTouch,
      powerPreference: "high-performance",
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fd7f2);
    this.scene.fog = new THREE.FogExp2(0xa8dbf0, 0.0042); // v12: névoa mais longe e leve — visão limpa

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 560);

    this.hemi = new THREE.HemisphereLight(0xcde9ff, 0x52796f, 1.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff3d6, 1.15);
    this.sun.position.set(40, 60, 20);
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.36));

    this.buildTerrain();
    this.buildSky();
    this.buildShared();
    this.buildPlaza();
    this.buildPOIs();
    this.buildLandmarks();
    this.buildBuildings(); // v8: casas, pousada, farol, fortim… enteráveis
    this.buildArena();
    this.buildNature();
    this.buildHeartForest(); // v10: Coração da Floresta — clareira sagrada
    // v5: configuração do avatar antes de construir o corpo
    if (this.opts.avatar) this.avCfg = this.opts.avatar;
    this.avKey = avatarKey(this.avCfg);
    this.buildPlayer();
    this.buildMobs();
    this.buildNet();
    worldAudio.startAmbient();
    worldAudio.startMusic();

    this.setupPostFx(isTouch);
    this.bindInput();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(this.canvas.parentElement || this.canvas);
    this.resize();

    // v8: regista rótulos/ícones distantes para culling (visão limpa)
    // + parede de todos os edifícios para a câmara não atravessar
    this.scene.updateMatrixWorld(true);
    const wv = new THREE.Vector3();
    for (const s of CULL_POOL.splice(0)) {
      s.getWorldPosition(wv);
      this.cullables.push({ spr: s, x: wv.x, z: wv.z });
    }
    this.camBlockerList = this.buildings.flatMap((b) => b.camBlockers);

    this.lastT = performance.now();
    this.loop(this.lastT);
    this.opts.onEvent({ type: "ready" });
  }

  // ── v4: pipeline de pós-processamento + qualidade ──────

  private setupPostFx(isTouch: boolean): void {
    try {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.08;
      const size = new THREE.Vector2();
      this.renderer.getSize(size);
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(size, 0.42, 0.6, 0.82);
      this.composer.addPass(this.bloomPass);
      // vinheta + saturação suave (film look)
      this.vignettePass = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          offset: { value: 1.12 },
          darkness: { value: 0.62 },
          saturation: { value: 1.07 },
        },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; uniform float saturation;
          varying vec2 vUv;
          void main(){
            vec4 c = texture2D(tDiffuse, vUv);
            float d = distance(vUv, vec2(0.5));
            c.rgb *= 1.0 - smoothstep(0.35, 0.85, d * offset) * darkness;
            float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
            c.rgb = mix(vec3(l), c.rgb, saturation);
            gl_FragColor = c;
          }`,
      });
      this.composer.addPass(this.vignettePass);
      this.composer.addPass(new OutputPass());
      this.applyQuality(this.quality, isTouch);
    } catch (e) {
      console.warn("[BateuWorld] pós-processamento indisponível:", e);
      this.composer = null;
    }
  }

  /** Aplica um nível de qualidade (auto decide pelo dispositivo). */
  setQuality(q: "auto" | "low" | "medium" | "high"): void {
    this.applyQuality(q, window.matchMedia("(pointer: coarse)").matches);
  }

  private applyQuality(q: "auto" | "low" | "medium" | "high", isTouch: boolean): void {
    this.quality = q;
    const autoTier: "low" | "medium" | "high" = isTouch ? (window.devicePixelRatio > 2 ? "medium" : "high") : "high";
    const tier = q === "auto" ? autoTier : q;
    if (tier === "low") this.pq = { bloom: false, vignette: false, pixelRatio: 1 };
    else if (tier === "medium") this.pq = { bloom: true, vignette: false, pixelRatio: Math.min(window.devicePixelRatio || 1, 1.25) };
    else this.pq = { bloom: true, vignette: true, pixelRatio: Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2) };
    this.renderer.setPixelRatio(this.pq.pixelRatio);
    if (this.bloomPass) this.bloomPass.enabled = this.pq.bloom;
    if (this.vignettePass) this.vignettePass.enabled = this.pq.vignette;
    if (this.composer) this.composer.setSize(this.canvas.parentElement?.clientWidth || window.innerWidth, this.canvas.parentElement?.clientHeight || window.innerHeight);
  }

  /** Fotografia do mundo (modo foto) — devolve dataURL PNG. */
  snapshot(): string {
    this.renderFrame();
    try { return this.renderer.domElement.toDataURL("image/png"); } catch { return ""; }
  }

  private buildTerrain(): void {
    // v7: mundo mais largo + cores por BIOMA (7 regiões visíveis)
    const geo = new THREE.PlaneGeometry(480, 480, 128, 128);
    geo.rotateX(-Math.PI / 2);
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);
    const c = new THREE.Color();
    const cA = new THREE.Color();
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = groundY(x, z);
      posAttr.setY(i, y);
      const dCenter = Math.hypot(x, z);
      const dLake = Math.hypot(x - 95, z - 70);
      if (dCenter < 17) c.copy(C_STONE);
      else if (Math.abs(x) < 3.5 || Math.abs(z) < 3.5) c.copy(C_ROAD);
      else if (dLake < 12.5) c.copy(C_SAND); // praia do Lago Misterioso
      else {
        const b = biomeOf(x, z);
        const pal = BIOME_COLORS[b];
        // variação orgânica: manchas suaves + micro-ruído
        const n = 0.5 + 0.5 * Math.sin(x * 0.11 + Math.sin(z * 0.13) * 2.1) * Math.cos(z * 0.09 + Math.sin(x * 0.07) * 1.7);
        const micro = ((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1) * 0.06;
        cA.setHex(pal.base).lerp(new THREE.Color(pal.alt), n);
        c.copy(cA).offsetHSL(0, 0, micro - 0.03);
      }
      // borda do mundo escurece (falda de montanha inacessível)
      if (dCenter > 228) c.multiplyScalar(Math.max(0.35, 1 - (dCenter - 228) / 20));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);
  }

  // ── Céu v3: domo de gradiente, sol, lua, estrelas e nuvens ──

  private buildSky(): void {
    // Domo com gradiente vertical (azul zenite → horizonte claro)
    const domeGeo = new THREE.SphereGeometry(320, 20, 14);
    const domeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x2f7fd4) },
        mid: { value: new THREE.Color(0x9bd0e8) },
        bot: { value: new THREE.Color(0xdceef7) },
      },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;
        void main(){
          float h = normalize(vP).y;
          if (h > 0.25) gl_FragColor = vec4(mix(mid, top, smoothstep(0.25, 0.85, h)), 1.0);
          else gl_FragColor = vec4(mix(bot, mid, smoothstep(-0.1, 0.25, h)), 1.0);
        }`,
    });
    this.skyDome = new THREE.Mesh(domeGeo, domeMat);
    this.scene.add(this.skyDome);

    // Estrelas (visíveis à noite)
    const starGeo = new THREE.BufferGeometry();
    const sN = 420;
    const sPos = new Float32Array(sN * 3);
    for (let i = 0; i < sN; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = 0.15 + Math.random() * 1.35; // elevação
      const rr = 300;
      sPos[i * 3] = Math.cos(a) * Math.cos(e) * rr;
      sPos[i * 3 + 1] = Math.sin(e) * rr;
      sPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * rr;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false,
    }));
    this.scene.add(this.stars);

    // Sol e lua (sprites com halo)
    const mkGlow = (inner: string, outer: string) => {
      const cv = document.createElement("canvas");
      cv.width = 128; cv.height = 128;
      const c = cv.getContext("2d")!;
      const g = c.createRadialGradient(64, 64, 6, 64, 64, 62);
      g.addColorStop(0, inner);
      g.addColorStop(0.45, inner);
      g.addColorStop(1, outer);
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(cv);
    };
    this.sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: mkGlow("rgba(255,244,214,1)", "rgba(255,214,120,0)"), transparent: true, depthWrite: false, fog: false,
    }));
    this.sunSpr.scale.setScalar(34);
    this.scene.add(this.sunSpr);
    this.moonSpr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: mkGlow("rgba(226,236,255,1)", "rgba(160,190,255,0)"), transparent: true, depthWrite: false, fog: false, opacity: 0,
    }));
    this.moonSpr.scale.setScalar(26);
    this.scene.add(this.moonSpr);
    // v7: textura de meteoro (bola de fogo)
    this.meteorTex = mkGlow("rgba(255,214,140,1)", "rgba(255,120,40,0)");

    // Nuvens low-poly a derivar (v7: material guardado para tint do entardecer)
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
    this.cloudMat = cloudMat;
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const puffs = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffs; p++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 3.4, 7, 6), cloudMat);
        m.position.set(p * 3.4 - puffs * 1.4, Math.random() * 1.2, Math.random() * 2.4 - 1.2);
        m.scale.y = 0.55;
        g.add(m);
      }
      const a = Math.random() * Math.PI * 2;
      const rr = 60 + Math.random() * 150;
      g.position.set(Math.cos(a) * rr, 42 + Math.random() * 22, Math.sin(a) * rr);
      this.scene.add(g);
      this.clouds.push({ g, spd: 0.4 + Math.random() * 0.7 });
    }

    // v4: estrelas cadentes (faíscas brancas que riscam o céu à noite)
    const ssCanvas = document.createElement("canvas");
    ssCanvas.width = 64; ssCanvas.height = 16;
    const sctx = ssCanvas.getContext("2d")!;
    const sg = sctx.createLinearGradient(0, 0, 64, 0);
    sg.addColorStop(0, "rgba(255,255,255,0)");
    sg.addColorStop(0.75, "rgba(255,255,255,0.9)");
    sg.addColorStop(1, "rgba(190,220,255,1)");
    sctx.fillStyle = sg;
    sctx.fillRect(0, 6, 64, 4);
    const ssTex = new THREE.CanvasTexture(ssCanvas);
    for (let i = 0; i < 3; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: ssTex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      spr.scale.set(9, 2.2, 1);
      this.scene.add(spr);
      this.shootStars.push({ spr, active: false, t: 0, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), next: 2500 + Math.random() * 8000 });
    }

    // ── v7: AURORA BOREAL (fitas que dançam no céu noturno) ──
    const auroraTex = (c1: string, c2: string) => {
      const cv = document.createElement("canvas");
      cv.width = 256; cv.height = 128;
      const cx = cv.getContext("2d")!;
      for (let i = 0; i < 3; i++) {
        const gr = cx.createLinearGradient(0, 20 + i * 30, 0, 70 + i * 30);
        gr.addColorStop(0, "rgba(0,0,0,0)");
        gr.addColorStop(0.5, i % 2 ? c2 : c1);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        cx.fillStyle = gr;
        cx.beginPath();
        cx.moveTo(0, 45 + i * 26);
        for (let x = 0; x <= 256; x += 16) cx.lineTo(x, 45 + i * 26 + Math.sin(x / 34 + i * 2) * 16);
        for (let x = 256; x >= 0; x -= 16) cx.lineTo(x, 65 + i * 26 + Math.sin(x / 26 + i) * 14);
        cx.closePath(); cx.fill();
      }
      return new THREE.CanvasTexture(cv);
    };
    this.aurora = new THREE.Group();
    this.aurora.name = "aurora";
    const bands: [string, string, number, number][] = [
      ["rgba(52,211,153,0.5)", "rgba(34,211,238,0.35)", -0.32, 0],
      ["rgba(167,139,250,0.4)", "rgba(52,211,153,0.3)", -0.22, 1],
    ];
    for (const [c1, c2, tilt, k] of bands) {
      const band = new THREE.Mesh(
        new THREE.PlaneGeometry(430, 120, 1, 1),
        new THREE.MeshBasicMaterial({ map: auroraTex(c1, c2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
      );
      band.position.set(0, 95 + k * 26, -240);
      band.rotation.x = tilt;
      band.name = "auroraBand" + k;
      this.aurora.add(band);
    }
    this.scene.add(this.aurora);
  }

  private buildShared(): void {
    this.geoBody = new THREE.CapsuleGeometry(0.38, 0.75, 4, 10);
    this.geoHead = new THREE.SphereGeometry(0.3, 12, 10);
    this.geoOrb = new THREE.SphereGeometry(0.16, 8, 8);
    this.geoShadow = new THREE.CircleGeometry(0.55, 16);
    this.geoShadow.rotateX(-Math.PI / 2);
    this.geoPart = new THREE.SphereGeometry(0.09, 6, 6);
    this.matShadow = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
  }

  private addShadow(x: number, y: number, z: number, scale = 1): THREE.Mesh {
    const m = new THREE.Mesh(this.geoShadow, this.matShadow);
    m.position.set(x, y + 0.03, z);
    m.scale.setScalar(scale);
    this.scene.add(m);
    return m;
  }

  private buildPlaza(): void {
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 17, 0.5, 40),
      new THREE.MeshLambertMaterial({ color: 0x8d939c })
    );
    stone.position.set(0, 0.25, 0);
    this.scene.add(stone);

    // Obelisco Bateu
    const ob = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 14, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x1e293b })
    );
    ob.position.set(0, 7.5, 0);
    this.scene.add(ob);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.4, 2.4),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    band.position.set(0, 11.5, 0);
    this.scene.add(band);
    const glow = new THREE.PointLight(0xf43f5e, 26, 20);
    glow.position.set(0, 12, 0);
    this.scene.add(glow);

    // Portal dos Jogos
    const portal = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.35, 10, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    ring.position.y = 2.6;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.1, 24),
      new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    disc.position.y = 2.6;
    const pLabel = makeTextSprite("🌀 JOGOS BATEU", { size: 34, bg: true, accent: "#38bdf8" });
    pLabel.scale.set(5.4, 1.35, 1);
    pLabel.position.y = 5.6;
    const pIcon = makeIconSprite("🌀");
    pIcon.scale.set(1.5, 1.5, 1);
    pIcon.position.y = 2.6;
    portal.add(ring, disc, pLabel, pIcon);
    portal.position.set(8, 0, 8);
    this.scene.add(portal);
    this.interactables.push({
      group: portal, kind: "games", id: "games", label: "Abrir Jogos da Plataforma",
      pos: portal.position.clone(), used: false, icon: pIcon,
    });

    // 🏦 Banco de Pontos — troca pontos por moeda da plataforma
    const bank = new THREE.Group();
    const bBase = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 2.6, 3.4),
      new THREE.MeshLambertMaterial({ color: 0xcaa64a })
    );
    bBase.position.y = 1.3;
    const bRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(2.9, 2.9, 0.55, 12, 1, false, 0, Math.PI),
      new THREE.MeshLambertMaterial({ color: 0x8a6d2f })
    );
    bRoof.position.y = 2.85;
    bRoof.rotation.z = Math.PI / 2;
    const colGeo = new THREE.CylinderGeometry(0.24, 0.24, 2.5, 8);
    const colMat = new THREE.MeshLambertMaterial({ color: 0xf3e2ab });
    for (const cx of [-1.8, -0.6, 0.6, 1.8]) {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cx, 1.25, 1.55);
      bank.add(col);
    }
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    coin.rotation.x = Math.PI / 2;
    coin.position.set(0, 2.1, 1.75);
    const bIcon = makeIconSprite("🏦");
    bIcon.scale.set(1.4, 1.4, 1);
    bIcon.position.y = 3.9;
    const bLab = makeTextSprite("BANCO DE PONTOS", { size: 28, bg: true, accent: "#fbbf24" });
    bLab.scale.set(5, 1.25, 1);
    bLab.position.y = 5.1;
    bank.add(bBase, bRoof, coin, bIcon, bLab);
    bank.position.set(-14, 0, -14);
    bank.rotation.y = Math.PI / 4;
    this.scene.add(bank);
    this.interactables.push({
      group: bank, kind: "bank", id: "bank", label: "🏦 Trocar Pontos no Banco",
      pos: bank.position.clone(), used: false, icon: bIcon,
    });

    // ⛲ Fonte da Vida — cura quem se aproxima
    const ftn = new THREE.Group();
    const fBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2.3, 0.7, 18),
      new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
    );
    fBase.position.y = 0.35;
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.7, 0.25, 18),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.75 })
    );
    water.position.y = 0.78;
    const fTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 1.5, 10),
      new THREE.MeshLambertMaterial({ color: 0xcbd5e1 })
    );
    fTop.position.y = 1.4;
    const fOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x6ee7b7 })
    );
    fOrb.position.y = 2.4;
    const fIcon = makeIconSprite("⛲");
    fIcon.scale.set(1.3, 1.3, 1);
    fIcon.position.y = 3.6;
    const fLab = makeTextSprite("FONTE DA VIDA", { size: 26, bg: true, accent: "#34d399" });
    fLab.scale.set(4.2, 1.05, 1);
    fLab.position.y = 4.7;
    ftn.add(fBase, water, fTop, fOrb, fIcon, fLab);
    ftn.position.set(14, 0, -14);
    this.scene.add(ftn);
    this.interactables.push({
      group: ftn, kind: "fountain", id: "fountain", label: "⛲ Beber da Fonte (cura total)",
      pos: ftn.position.clone(), used: false, icon: fIcon,
    });
  }

  private buildPOIs(): void {
    this.buildTemple();   // Norte — Sorteios
    this.buildMarket();   // Este — Feira (Alienação)
    this.buildTower();    // Oeste — Concursos
    this.buildVault();    // Sul — Cupões
  }

  private poiBase(x: number, z: number, floorColor: number): void {
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(13, 13.5, 0.4, 28),
      new THREE.MeshLambertMaterial({ color: floorColor })
    );
    floor.position.set(x, groundY(x, z) + 0.2, z);
    this.scene.add(floor);
  }

  private buildTemple(): void {
    this.poiBase(0, -52, 0x7c6bae);
    const label = makeTextSprite("🎁 TEMPLO DOS SORTEIOS", { size: 40, bg: true, accent: "#a78bfa" });
    label.scale.set(15, 3.75, 1);
    label.position.set(0, groundY(0, -52) + 9, -60);
    this.scene.add(label);
  }

  private buildMarket(): void {
    this.poiBase(52, 0, 0xb08968);
    const label = makeTextSprite("🛒 FEIRA BATEU", { size: 40, bg: true, accent: "#fbbf24" });
    label.scale.set(11, 2.75, 1);
    label.position.set(60, groundY(52, 0) + 8, 0);
    this.scene.add(label);
  }

  private buildTower(): void {
    this.poiBase(-52, 0, 0x4d7c8a);
    const label = makeTextSprite("🏆 TORRE DOS CONCURSOS", { size: 38, bg: true, accent: "#f59e0b" });
    label.scale.set(16, 4, 1);
    label.position.set(-60, groundY(-52, 0) + 8.5, 0);
    this.scene.add(label);
  }

  private buildVault(): void {
    this.poiBase(0, 52, 0x8a5a5a);
    const label = makeTextSprite("🎟️ COFRE DE CUPÕES", { size: 40, bg: true, accent: "#f87171" });
    label.scale.set(13, 3.25, 1);
    label.position.set(0, groundY(0, 52) + 8, 60);
    this.scene.add(label);
  }

  // ── Marcos exploráveis (descobertas) ────────────────────────

  private buildLandmarks(): void {
    // Ruínas Antigas (SO)
    const ruins = new THREE.Group();
    const ruinMat = new THREE.MeshLambertMaterial({ color: 0x9c9484 });
    const cols = [new THREE.CylinderGeometry(0.7, 0.8, 6, 8), new THREE.CylinderGeometry(0.7, 0.8, 3.4, 8), new THREE.CylinderGeometry(0.7, 0.8, 4.6, 8)];
    const colPos: [number, number, number][] = [[-3, 3, 0], [0, 1.7, -2], [3, 2.3, 1]];
    cols.forEach((cg, i) => {
      const m = new THREE.Mesh(cg, ruinMat);
      m.position.set(...colPos[i]);
      m.rotation.z = (i - 1) * 0.12;
      ruins.add(m);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.8, 1.4), ruinMat);
    lintel.position.set(0, 6.4, 0);
    lintel.rotation.z = -0.08;
    ruins.add(lintel);
    const rIcon = makeIconSprite("🏛️", true);
    rIcon.scale.set(1.6, 1.6, 1);
    rIcon.position.y = 8.2;
    ruins.add(rIcon);
    ruins.position.set(-100, 0, -60);
    this.scene.add(ruins);

    // Lago Misterioso (NE) — água animada v3
    const lake = new THREE.Mesh(
      new THREE.CircleGeometry(9, 26),
      new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.7 })
    );
    lake.rotateX(-Math.PI / 2);
    lake.position.set(95, groundY(95, 70) + 0.12, 70);
    this.scene.add(lake);
    this.lakeWater = lake;
    const lIcon = makeIconSprite("🌊", true);
    lIcon.scale.set(1.6, 1.6, 1);
    lIcon.position.set(95, groundY(95, 70) + 3.4, 70);
    this.scene.add(lIcon);
    const lLight = new THREE.PointLight(0x22d3ee, 14, 18);
    lLight.position.set(95, 3, 70);
    this.scene.add(lLight);

    // Caverna de Cristais (NO)
    const cave = new THREE.Group();
    const rockM = new THREE.MeshLambertMaterial({ color: 0x57534e });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6.4, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), rockM);
    dome.position.y = 0.4;
    cave.add(dome);
    for (let i = 0; i < 7; i++) {
      const h = 1.2 + Math.random() * 2.6;
      const cr = new THREE.Mesh(
        new THREE.ConeGeometry(0.34 + Math.random() * 0.3, h, 6),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x8b5cf6 : 0x22d3ee, transparent: true, opacity: 0.85 })
      );
      const a = Math.random() * Math.PI * 2;
      const rr = 1 + Math.random() * 4;
      cr.position.set(Math.cos(a) * rr, h / 2 + 0.3, Math.sin(a) * rr);
      cave.add(cr);
    }
    const cIcon = makeIconSprite("💎", true);
    cIcon.scale.set(1.6, 1.6, 1);
    cIcon.position.y = 8;
    cave.add(cIcon);
    const cLight = new THREE.PointLight(0x8b5cf6, 18, 20);
    cLight.position.set(0, 3, 0);
    cave.add(cLight);
    cave.position.set(-90, 0, 85);
    this.scene.add(cave);

    // Baobá Gigante (SE)
    const baoba = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.4, 9, 10),
      new THREE.MeshLambertMaterial({ color: 0x8d6748 })
    );
    trunk.position.y = 4.5;
    baoba.add(trunk);
    const crownM = new THREE.MeshLambertMaterial({ color: 0x65a30d });
    for (const [ox, oy, oz, s] of [[-2.4, 9.6, 0, 2.4], [2.4, 9.9, 0.6, 2.6], [0, 10.6, -2, 2.2], [0.4, 10.2, 2.2, 2.5]]) {
      const cl = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 0), crownM);
      cl.position.set(ox, oy, oz);
      cl.scale.setScalar(s / 2.4);
      baoba.add(cl);
    }
    const bIcon2 = makeIconSprite("🌳", true);
    bIcon2.scale.set(1.7, 1.7, 1);
    bIcon2.position.y = 13.6;
    baoba.add(bIcon2);
    baoba.position.set(60, 0, -100);
    this.scene.add(baoba);
  }

  // ── v8: EDIFÍCIOS ENTERÁVEIS ────────────────────────────────
  // Casas com interior mobiliado, portas que abrem à passagem,
  // escadas com rampas navegáveis a pé, telhados que desaparecem
  // quando entras (vês o interior), zonas seguras sem mobs.

  private buildBuildings(): void {
    // Vila da Praça (Planície Central)
    this.makeHouse({ id: "casa-explorador", name: "Casa do Explorador", desc: "Primeira casa da vila — sobe ao 2º andar e vigia a praça", x: 24, z: 18, w: 9, d: 7, floors: 2, wall: 0xc9b18c, roof: 0xb4552d, trim: 0x7c5a38 });
    this.makeHouse({ id: "pousada", name: "Pousada do Viajante", desc: "Camas quentes e alpendre — descanso rápido dentro", x: -27, z: 21, w: 10, d: 7, floors: 1, wall: 0xd9c49a, roof: 0x8c5a3c, trim: 0x6b4a2f, porch: true });
    // Floresta Ancestral
    this.makeHouse({ id: "cabana-lenhador", name: "Cabana do Lenhador", desc: "Troncos milenares na Floresta Ancestral — mapas no andar de cima", x: -106, z: -24, w: 8.5, d: 7, floors: 2, wall: 0x8a6a45, roof: 0x4a5d3a, trim: 0x5c4033 });
    // Dunas Escaldantes
    this.makeHouse({ id: "casa-mercador", name: "Casa do Mercador", desc: "Adobe fresco nas Dunas — tapetes e jarros do norte", x: -52, z: -136, w: 9, d: 6.5, floors: 1, wall: 0xe0c294, roof: 0xc2874e, trim: 0xa1733f, adobe: true });
    // Litoral das Ondas — farol com 3 pisos + miradouro
    this.makeLighthouse(140, 34);
    // Pântano Sombrio
    this.makeHouse({ id: "abrigo-pantano", name: "Abrigo do Pântano", desc: "Em palafitas sobre a água — os bugs não sobem", x: 18, z: 126, w: 8, d: 6.5, floors: 1, wall: 0x7d6b52, roof: 0x5d5a43, trim: 0x4c4436, stilts: true });
    // Terras Vulcânicas
    this.makeHouse({ id: "fortim-vulcanico", name: "Fortim Vulcânico", desc: "Bastião de pedra nas Terras Vulcânicas — vigia o calor", x: 158, z: -128, w: 9.5, d: 8, floors: 2, wall: 0x8d8d93, roof: 0x53535b, trim: 0x3f3f46, stone: true });
  }

  /** Caixa de parede: malha visível + colisor + bloqueio de câmara. */
  private wallBox(g: THREE.Group, blockers: THREE.Mesh[], mat: THREE.Material, minX: number, maxX: number, minZ: number, maxZ: number, base: number, top: number, walls: WallBox[]): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.05, maxX - minX), Math.max(0.05, top - base), Math.max(0.05, maxZ - minZ)),
      mat
    );
    m.position.set((minX + maxX) / 2, (base + top) / 2, (minZ + maxZ) / 2);
    g.add(m);
    blockers.push(m);
    walls.push({ minX, maxX, minZ, maxZ, base, top });
    return m;
  }

  private makeHouse(o: { id: string; name: string; desc: string; x: number; z: number; w: number; d: number; floors: number; wall: number; roof: number; trim: number; porch?: boolean; adobe?: boolean; stilts?: boolean; stone?: boolean }): void {
    const g = new THREE.Group();
    const FLOOR_H = 3.1;
    const hw = o.w / 2, hd = o.d / 2, t = 0.36;
    const baseY = groundY(o.x, o.z);
    const f0 = o.stilts ? baseY + 1.35 : baseY; // palafitas: piso elevado
    const f1 = f0 + FLOOR_H;
    const iMinX = o.x - hw + t, iMaxX = o.x + hw - t, iMinZ = o.z - hd + t, iMaxZ = o.z + hd - t;
    const zones: FloorZone[] = [];
    const walls: WallBox[] = [];
    const blockers: THREE.Mesh[] = [];
    const matWall = new THREE.MeshLambertMaterial({ color: o.wall });
    const matTrim = new THREE.MeshLambertMaterial({ color: o.trim });
    const matRoof = new THREE.MeshLambertMaterial({ color: o.roof });
    const matWood = new THREE.MeshLambertMaterial({ color: o.stone ? 0x64748b : 0x8b5e3c });
    const matFloor = new THREE.MeshLambertMaterial({ color: o.adobe ? 0xd8c7a1 : o.stone ? 0x9a9aa2 : 0xa07850 });

    // fundação (ou palafitas sob a casa)
    if (o.stilts) {
      const postMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
      for (const [px, pz] of [[-hw + 0.5, -hd + 0.5], [hw - 0.5, -hd + 0.5], [-hw + 0.5, hd - 0.5], [hw - 0.5, hd - 0.5], [0, -hd + 0.5], [0, hd - 0.5]] as [number, number][]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.7, 6), postMat);
        p.position.set(o.x + px, baseY + 0.55, o.z + pz);
        g.add(p);
      }
    }
    const slab = new THREE.Mesh(new THREE.BoxGeometry(o.w + 0.7, 1.2, o.d + 0.7), new THREE.MeshLambertMaterial({ color: o.stone ? 0x6e6e75 : 0x9b9186 }));
    slab.position.set(o.x, f0 - 0.6, o.z);
    g.add(slab);

    // piso interior do rés-do-chão
    const floor0 = new THREE.Mesh(new THREE.BoxGeometry(o.w - 0.1, 0.22, o.d - 0.1), matFloor);
    floor0.position.set(o.x, f0 + 0.11, o.z);
    g.add(floor0);
    zones.push({ minX: o.x - hw - 0.35, maxX: o.x + hw + 0.35, minZ: o.z - hd - 0.35, maxZ: o.z + hd + 0.35, y: f0 });

    // escada exterior para casas em palafitas (rampa a sul, até à porta)
    if (o.stilts) {
      const rl = 4.6;
      const rz1e = o.z - hd + 0.1, rz0e = rz1e - rl;
      zones.push({ minX: o.x - 1.0, maxX: o.x + 1.0, minZ: rz0e, maxZ: rz1e, y: f0, rampAxis: "z", y0: baseY, y1: f0 });
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, rl / steps + 0.03), matWood);
        st.position.set(o.x, baseY + ((i + 1) / steps) * (f0 - baseY) - 0.07, rz0e + (i + 0.5) * (rl / steps));
        g.add(st);
      }
      for (const sx of [-1.05, 1.05]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, rl), matTrim);
        rail.position.set(o.x + sx, baseY + (f0 - baseY) / 2 + 0.5, (rz0e + rz1e) / 2);
        g.add(rail);
      }
    }

    // paredes do rés-do-chão (porta ao sul, no centro)
    const gap = 0.95;
    const wallH = o.floors === 2 ? FLOOR_H : 2.75;
    this.wallBox(g, blockers, matWall, o.x - hw, o.x - gap, o.z - hd, o.z - hd + t, f0 - 0.5, f0 + wallH, walls);
    this.wallBox(g, blockers, matWall, o.x + gap, o.x + hw, o.z - hd, o.z - hd + t, f0 - 0.5, f0 + wallH, walls);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(gap * 2, Math.max(0.3, wallH - 2.4), t), matTrim);
    lintel.position.set(o.x, f0 + 2.4 + Math.max(0.3, wallH - 2.4) / 2, o.z - hd + t / 2);
    g.add(lintel);
    blockers.push(lintel);
    this.wallBox(g, blockers, matWall, o.x - hw, o.x + hw, o.z + hd - t, o.z + hd, f0 - 0.5, f0 + wallH, walls);
    this.wallBox(g, blockers, matWall, o.x - hw, o.x - hw + t, o.z - hd + t, o.z + hd - t, f0 - 0.5, f0 + wallH, walls);
    this.wallBox(g, blockers, matWall, o.x + hw - t, o.x + hw, o.z - hd + t, o.z + hd - t, f0 - 0.5, f0 + wallH, walls);

    // janelas brilhantes (decorativas)
    const matGlass = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.6 });
    const addWin = (x: number, z: number, ry: number, yy: number) => {
      const fr = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.24, 0.08), matTrim);
      fr.position.set(x, yy, z);
      fr.rotation.y = ry;
      g.add(fr);
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.0, 0.1), matGlass);
      w1.position.copy(fr.position);
      w1.rotation.y = ry;
      w1.translateZ(0.03);
      g.add(w1);
    };
    addWin(o.x - hw - 0.02, o.z, Math.PI / 2, f0 + 1.75);
    addWin(o.x + hw + 0.02, o.z, -Math.PI / 2, f0 + 1.75);

    // telhado (desaparece quando entras — vês o interior)
    let roofG: THREE.Group | null = null;
    if (o.adobe) {
      roofG = new THREE.Group();
      const flat = new THREE.Mesh(new THREE.BoxGeometry(o.w + 0.55, 0.3, o.d + 0.55), matRoof);
      flat.position.set(o.x, f0 + wallH + 0.15, o.z);
      roofG.add(flat);
      const pw = new THREE.Mesh(new THREE.BoxGeometry(o.w + 0.55, 0.5, 0.18), matTrim);
      pw.position.set(o.x, f0 + wallH + 0.52, o.z - o.d / 2 - 0.2);
      const pe = pw.clone(); pe.position.z = o.z + o.d / 2 + 0.2;
      const pn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, o.d + 0.55), matTrim);
      pn.position.set(o.x - o.w / 2 - 0.2, f0 + wallH + 0.52, o.z);
      const ps = pn.clone(); ps.position.x = o.x + o.w / 2 + 0.2;
      roofG.add(pw, pe, pn, ps);
    } else {
      roofG = new THREE.Group();
      const rise = 2.3;
      const slope = Math.hypot(hw + 0.6, rise);
      const ang = Math.atan2(rise, hw + 0.6);
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(slope + 0.3, 0.16, o.d + 1.0), matRoof);
      r1.position.set(o.x - (hw + 0.6) / 2, f0 + wallH + rise / 2, o.z);
      r1.rotation.z = ang;
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(slope + 0.3, 0.16, o.d + 1.0), matRoof);
      r2.position.set(o.x + (hw + 0.6) / 2, f0 + wallH + rise / 2, o.z);
      r2.rotation.z = -ang;
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(o.w + 1.5, 0.26, 0.34), matTrim);
      ridge.position.set(o.x, f0 + wallH + rise, o.z);
      roofG.add(r1, r2, ridge);
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.5, 0.55), o.stone ? matTrim : new THREE.MeshLambertMaterial({ color: 0x8d8d93 }));
      chim.position.set(o.x + hw - 1.2, f0 + wallH + rise + 0.4, o.z + 0.8);
      roofG.add(chim);
    }
    g.add(roofG);

    // porta com dobradiça — abre-se à passagem com ranger suave
    const pivot = new THREE.Group();
    pivot.position.set(o.x - gap + 0.04, f0, o.z - hd + t / 2);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(gap * 2 - 0.12, 2.32, 0.1), matWood);
    panel.position.set(gap - 0.02, 1.16, 0);
    pivot.add(panel);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf5c96b }));
    knob.position.set(gap * 2 - 0.26, 1.12, 0.09);
    pivot.add(knob);
    g.add(pivot);

    // mobília do rés-do-chão
    this.furnBed(g, o.x + hw - 1.35, o.z + hd - 1.45, f0, o.floors === 2 ? Math.PI : 0);
    this.furnTable(g, o.x - 1.0, o.z + 0.4, f0);
    this.furnRug(g, o.x - 0.6, o.z - 1.5, f0 + 0.02, 0x9f4a3e);
    this.furnShelf(g, o.x - hw + 0.62, o.z + hd - 1.5, f0);
    this.furnChest(g, o.x + 1.9, o.z - 1.5, f0);
    if (o.adobe) this.furnJar(g, o.x - hw + 0.8, o.z - hd + 1.0, f0);

    if (o.floors === 2) {
      // anel de paredes do andar de cima + janelas
      const b2 = f0 + wallH - 0.28, t2 = f1 + 2.8;
      this.wallBox(g, blockers, matWall, o.x - hw, o.x + hw, o.z + hd - t, o.z + hd, b2, t2, walls);
      this.wallBox(g, blockers, matWall, o.x - hw, o.x - hw + t, o.z - hd + t, o.z + hd - t, b2, t2, walls);
      this.wallBox(g, blockers, matWall, o.x + hw - t, o.x + hw, o.z - hd + t, o.z + hd - t, b2, t2, walls);
      this.wallBox(g, blockers, matWall, o.x - hw, o.x + hw, o.z - hd, o.z - hd + t, b2, t2, walls);
      addWin(o.x - hw - 0.02, o.z, Math.PI / 2, f1 + 1.7);
      addWin(o.x + hw + 0.02, o.z, -Math.PI / 2, f1 + 1.7);
      // escada: faixa junto à parede norte, sobe de oeste para leste
      const rampLen = Math.min(5.0, o.w - 2.8);
      const rx0 = iMinX, rx1 = iMinX + rampLen;
      const rz0 = iMaxZ - 1.5, rz1 = iMaxZ;
      // piso superior = tudo exceto a faixa da escada
      zones.push({ minX: rx1, maxX: iMaxX + t, minZ: iMinZ - t, maxZ: iMaxZ + t, y: f1 });
      zones.push({ minX: iMinX - t, maxX: rx1, minZ: iMinZ - t, maxZ: rz0, y: f1 });
      zones.push({ minX: rx0, maxX: rx1, minZ: rz0, maxZ: rz1, y: f1, rampAxis: "x", y0: f0, y1: f1 });
      // guarda-corpo (deixa a saída da escada livre)
      this.wallBox(g, blockers, matTrim, rx0, rx1 - 1.15, rz0 - 0.16, rz0, f1 + 0.55, f1 + 1.45, walls);
      // degraus visuais
      const steps = 9;
      for (let i = 0; i < steps; i++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(rampLen / steps + 0.03, 0.15, 1.48), matWood);
        st.position.set(rx0 + (i + 0.5) * (rampLen / steps), f0 + ((i + 1) / steps) * FLOOR_H - 0.08, (rz0 + rz1) / 2);
        g.add(st);
      }
      // mobília do andar de cima
      this.furnBed(g, o.x + hw - 1.35, o.z - hd + 1.5, f1, Math.PI);
      this.furnShelf(g, o.x - hw + 0.62, o.z - hd + 1.4, f1);
      this.furnRug(g, o.x, o.z, f1 + 0.02, 0x3f6f8a);
      // (luz partilhada com o rés-do-chão — 1 luz por edifício, performance)
    }

    // luz interior quente
    const light = new THREE.PointLight(0xffd9a0, 9, o.w + 5, 1.7);
    light.position.set(o.x, f0 + 2.3, o.z);
    g.add(light);

    // alpendre da pousada
    if (o.porch) {
      const pw = o.w * 0.72, pz0 = o.z - hd - 3.1, pz1 = o.z - hd;
      const pf = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.22, 3.1), matWood);
      pf.position.set(o.x, f0 + 0.11, pz0 + 1.55);
      g.add(pf);
      zones.push({ minX: o.x - pw / 2, maxX: o.x + pw / 2, minZ: pz0, maxZ: pz1, y: f0 + 0.22 });
      const postM = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
      for (const px of [-pw / 2, pw / 2]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.7, 6), postM);
        p.position.set(o.x + px, f0 + 1.35, pz0 + 0.35);
        g.add(p);
      }
      const awn = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.6, 0.14, 3.6), matRoof);
      awn.position.set(o.x, f0 + 2.75, pz0 + 1.4);
      awn.rotation.x = -0.16;
      g.add(awn);
      this.furnBed(g, o.x - hw + 1.3, o.z - hd + 1.5, f0, 0);
    }

    // rótulo do edifício (some ao longe — visão limpa)
    const lab = makeTextSprite(o.name, { size: 26, bg: true, accent: "#fbbf24", cull: true });
    lab.scale.set(5.0, 1.25, 1);
    lab.position.set(o.x, f0 + (o.floors === 2 ? 8.2 : 5.4), o.z);
    g.add(lab);

    this.scene.add(g);
    this.buildings.push({
      id: o.id, name: o.name, desc: o.desc,
      group: g, cx: o.x, cz: o.z,
      minX: o.x - hw - 0.6, maxX: o.x + hw + 0.6,
      minZ: o.z - hd - (o.porch ? 3.6 : 0.6), maxZ: o.z + hd + 0.6,
      f0Y: f0,
      zones, walls,
      roof: roofG, doorPivot: pivot, doorBaseY: f0, doorOpenT: 0,
      light, camBlockers: blockers,
    });
  }

  /** Farol do Litoral: torre com 3 pisos de escadas em zigue-zague + miradouro. */
  private makeLighthouse(x: number, z: number): void {
    const g = new THREE.Group();
    const g0 = groundY(x, z);
    const F = 2.95;
    const w = 7.4, hw = w / 2, t = 0.42;
    const f1 = g0 + F, f2 = g0 + F * 2, fT = g0 + F * 3 + 0.7;
    const iMinX = x - hw + t, iMaxX = x + hw - t, iMinZ = z - hw + t, iMaxZ = z + hw - t;
    const zones: FloorZone[] = [];
    const walls: WallBox[] = [];
    const blockers: THREE.Mesh[] = [];
    const matWall = new THREE.MeshLambertMaterial({ color: 0xe8e2d4 });
    const matRed = new THREE.MeshLambertMaterial({ color: 0xc2452d });
    const matWood = new THREE.MeshLambertMaterial({ color: 0x8b5e3c });
    const matFloor = new THREE.MeshLambertMaterial({ color: 0xb09877 });

    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 1.3, w + 0.8), new THREE.MeshLambertMaterial({ color: 0x9b9186 }));
    slab.position.set(x, g0 - 0.62, z);
    g.add(slab);
    zones.push({ minX: x - hw - 0.4, maxX: x + hw + 0.4, minZ: z - hw - 0.4, maxZ: z + hw + 0.4, y: g0 });

    // faixas vermelhas exteriores (visual de farol)
    for (const yy of [g0 + 1.0, g0 + 4.2, g0 + 7.4]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(hw + 0.09, hw + 0.09, 0.85, 12), matRed);
      band.position.set(x, yy, z);
      g.add(band);
    }

    // paredes altas (sul com porta)
    const gap = 0.95;
    const topAll = fT + 1.05;
    this.wallBox(g, blockers, matWall, x - hw, x - gap, z - hw, z - hw + t, g0 - 0.5, topAll, walls);
    this.wallBox(g, blockers, matWall, x + gap, x + hw, z - hw, z - hw + t, g0 - 0.5, topAll, walls);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(gap * 2, 0.7, t), matRed);
    lintel.position.set(x, g0 + 2.75, z - hw + t / 2);
    g.add(lintel);
    blockers.push(lintel);
    this.wallBox(g, blockers, matWall, x - hw, x + hw, z + hw - t, z + hw, g0 - 0.5, topAll, walls);
    this.wallBox(g, blockers, matWall, x - hw, x - hw + t, z - hw + t, z + hw - t, g0 - 0.5, topAll, walls);
    this.wallBox(g, blockers, matWall, x + hw - t, x + hw, z - hw + t, z + hw - t, g0 - 0.5, topAll, walls);

    const matGlass = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.6 });
    for (const yy of [g0 + 1.8, f1 + 1.8, f2 + 1.8]) {
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 1.0), matGlass);
      w1.position.set(x - hw - 0.02, yy, z);
      g.add(w1);
      const w2 = w1.clone();
      w2.position.x = x + hw + 0.02;
      g.add(w2);
    }

    // piso 0
    const fl0 = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.2, w - 0.1), matFloor);
    fl0.position.set(x, g0 + 0.1, z);
    g.add(fl0);

    // escadas em zigue-zague (norte → sul → norte)
    const rl = 4.3;
    // A: piso 0 → 1, faixa norte, sobe para leste
    const ax0 = iMinX, ax1 = iMinX + rl, az0 = iMaxZ - 1.5, az1 = iMaxZ;
    zones.push({ minX: ax1, maxX: iMaxX + t, minZ: iMinZ - t, maxZ: iMaxZ + t, y: f1 });
    zones.push({ minX: iMinX - t, maxX: ax1, minZ: iMinZ - t, maxZ: az0, y: f1 });
    zones.push({ minX: ax0, maxX: ax1, minZ: az0, maxZ: az1, y: f1, rampAxis: "x", y0: g0, y1: f1 });
    this.wallBox(g, blockers, matRed, ax0, ax1 - 1.1, az0 - 0.16, az0, f1 + 0.5, f1 + 1.35, walls);
    // B: piso 1 → 2, faixa sul, sobe para oeste
    const bx0 = iMaxX - rl, bx1 = iMaxX, bz0 = iMinZ - t, bz1 = iMinZ + 1.5;
    zones.push({ minX: iMinX - t, maxX: bx0, minZ: iMinZ - t, maxZ: iMaxZ + t, y: f2 });
    zones.push({ minX: bx0, maxX: iMaxX + t, minZ: bz1, maxZ: iMaxZ + t, y: f2 });
    zones.push({ minX: bx0, maxX: bx1, minZ: bz0, maxZ: bz1, y: f2, rampAxis: "x", y0: f2, y1: f1 });
    this.wallBox(g, blockers, matRed, bx0 + 1.1, bx1, bz1, bz1 + 0.16, f2 + 0.5, f2 + 1.35, walls);
    // C: piso 2 → miradouro, faixa norte outra vez
    const cx0 = iMinX, cx1 = iMinX + rl, cz0 = iMaxZ - 1.5, cz1 = iMaxZ;
    zones.push({ minX: cx1, maxX: iMaxX + t, minZ: iMinZ - t, maxZ: iMaxZ + t, y: fT });
    zones.push({ minX: iMinX - t, maxX: cx1, minZ: iMinZ - t, maxZ: cz0, y: fT });
    zones.push({ minX: cx0, maxX: cx1, minZ: cz0, maxZ: cz1, y: fT, rampAxis: "x", y0: f2, y1: fT });
    this.wallBox(g, blockers, matRed, cx0, cx1 - 1.1, cz0 - 0.16, cz0, fT + 0.5, fT + 1.35, walls);

    // degraus visuais das 3 rampas
    for (const [yA, yB, x0, x1, zc] of [[g0, f1, ax0, ax1, (az0 + az1) / 2], [f1, f2, bx0, bx1, (bz0 + bz1) / 2], [f2, fT, cx0, cx1, (cz0 + cz1) / 2]] as [number, number, number, number, number][]) {
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(rl / steps + 0.03, 0.15, 1.48), matWood);
        const tt = (i + 0.5) / steps;
        st.position.set(x0 + (i + 0.5) * (rl / steps), yA + tt * (yB - yA) - 0.08, zc);
        g.add(st);
      }
    }

    // mobília mínima por piso
    this.furnChest(g, x + hw - 1.1, z + hw - 1.2, g0);
    this.furnShelf(g, x - hw + 0.7, z + hw - 1.3, f1);
    this.furnTable(g, x, z, f2);

    // lanterna no topo
    const lampLight = new THREE.PointLight(0xfff2c0, 18, 24, 1.5);
    lampLight.position.set(x, fT + 2.3, z);
    g.add(lampLight);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
    bulb.position.set(x, fT + 2.3, z);
    g.add(bulb);
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.7, 6), matWood);
      post.position.set(x + px * 1.4, fT + 0.85, z + pz * 1.4);
      g.add(post);
    }
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.3, 10), matRed);
    cap.position.set(x, fT + 3.7, z);
    g.add(cap);

    const lab = makeTextSprite("Farol das Ondas", { size: 26, bg: true, accent: "#38bdf8", cull: true });
    lab.scale.set(5.4, 1.35, 1);
    lab.position.set(x, fT + 6.0, z);
    g.add(lab);

    this.scene.add(g);
    this.buildings.push({
      id: "farol", name: "Farol das Ondas", desc: "3 pisos e miradouro no topo — a melhor vista do mundo",
      group: g, cx: x, cz: z,
      minX: x - hw - 0.6, maxX: x + hw + 0.6, minZ: z - hw - 0.6, maxZ: z + hw + 0.6,
      f0Y: g0,
      zones, walls,
      roof: null, doorPivot: null, doorBaseY: g0, doorOpenT: 0,
      light: lampLight, camBlockers: blockers,
    });
  }

  // ── v8: mobília dos interiores ──

  private furnBed(g: THREE.Group, x: number, z: number, y: number, ry: number): void {
    const b = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 2.15), new THREE.MeshLambertMaterial({ color: 0x6b4a2f }));
    frame.position.y = 0.21;
    const mat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 1.95), new THREE.MeshLambertMaterial({ color: 0xe7e0d2 }));
    mat.position.y = 0.5;
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.42), new THREE.MeshLambertMaterial({ color: 0xfdf6e9 }));
    pillow.position.set(0, 0.62, -0.72);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.1, 1.1), new THREE.MeshLambertMaterial({ color: 0xb4552d }));
    blanket.position.set(0, 0.6, 0.35);
    b.add(frame, mat, pillow, blanket);
    b.position.set(x, y, z);
    b.rotation.y = ry;
    g.add(b);
  }

  private furnTable(g: THREE.Group, x: number, z: number, y: number): void {
    const tb = new THREE.Group();
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.78, 6), new THREE.MeshLambertMaterial({ color: 0x5c4033 }));
    leg.position.y = 0.39;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 10), new THREE.MeshLambertMaterial({ color: 0x8b5e3c }));
    top.position.y = 0.8;
    const mug1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 8), new THREE.MeshLambertMaterial({ color: 0x3f6f8a }));
    mug1.position.set(0.18, 0.9, 0.12);
    const mug2 = mug1.clone();
    mug2.position.set(-0.2, 0.9, -0.1);
    tb.add(leg, top, mug1, mug2);
    tb.position.set(x, y, z);
    g.add(tb);
  }

  private furnRug(g: THREE.Group, x: number, z: number, y: number, color: number): void {
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.15, 18), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    rug.rotateX(-Math.PI / 2);
    rug.position.set(x, y, z);
    g.add(rug);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.05, 18), new THREE.MeshBasicMaterial({ color: 0xf5c96b, transparent: true, opacity: 0.5 }));
    ring.rotateX(-Math.PI / 2);
    ring.position.set(x, y + 0.01, z);
    g.add(ring);
  }

  private furnShelf(g: THREE.Group, x: number, z: number, y: number): void {
    const s = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.7, 1.3), new THREE.MeshLambertMaterial({ color: 0x6b4a2f }));
    body.position.y = 0.85;
    s.add(body);
    const bookCols = [0xb4552d, 0x3f6f8a, 0x9f4a3e, 0x4a7c59, 0xf5c96b];
    for (let i = 0; i < 5; i++) {
      const bk = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.12), new THREE.MeshLambertMaterial({ color: bookCols[i] }));
      bk.position.set(0.24, 0.45 + (i % 2) * 0.62, -0.45 + i * 0.22);
      s.add(bk);
    }
    s.position.set(x, y, z);
    g.add(s);
  }

  private furnChest(g: THREE.Group, x: number, z: number, y: number): void {
    const c = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.62), new THREE.MeshLambertMaterial({ color: 0x8a5a2b }));
    body.position.y = 0.28;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.18, 0.66), new THREE.MeshLambertMaterial({ color: 0x6e4520 }));
    lid.position.y = 0.62;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.99, 0.6, 0.14), new THREE.MeshLambertMaterial({ color: 0xf5c96b }));
    band.position.y = 0.3;
    c.add(body, lid, band);
    c.position.set(x, y, z);
    g.add(c);
  }

  private furnJar(g: THREE.Group, x: number, z: number, y: number): void {
    const j = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.62, 8), new THREE.MeshLambertMaterial({ color: 0xb0703c }));
    j.position.set(x, y + 0.31, z);
    g.add(j);
    const j2 = j.clone();
    j2.position.set(x + 0.55, y + 0.22, z + 0.3);
    j2.scale.setScalar(0.7);
    g.add(j2);
  }

  // ── v8: física dos edifícios ──

  /** Altura efetiva do chão: terreno + pisos e rampas dos edifícios. */
  private groundHeightAt(x: number, z: number): number {
    let g = groundY(x, z);
    if (this.buildings.length === 0) return g;
    const py = this.pos ? this.pos.y : g;
    for (const b of this.buildings) {
      if (x < b.minX - 1 || x > b.maxX + 1 || z < b.minZ - 1 || z > b.maxZ + 1) continue;
      for (const zn of b.zones) {
        if (x < zn.minX || x > zn.maxX || z < zn.minZ || z > zn.maxZ) continue;
        let y = zn.y;
        if (zn.rampAxis === "x") {
          const tt = (x - zn.minX) / Math.max(0.001, zn.maxX - zn.minX);
          y = (zn.y0 ?? zn.y) + ((zn.y1 ?? zn.y) - (zn.y0 ?? zn.y)) * tt;
        } else if (zn.rampAxis === "z") {
          const tt = (z - zn.minZ) / Math.max(0.001, zn.maxZ - zn.minZ);
          y = (zn.y0 ?? zn.y) + ((zn.y1 ?? zn.y) - (zn.y0 ?? zn.y)) * tt;
        }
        if (y <= py + 0.8 && y > g) g = y;
      }
    }
    return g;
  }

  /** Empurra o herói para fora das paredes (colisão AABB). */
  private collideWalls(): void {
    const py = this.pos.y;
    const r = 0.42;
    for (const b of this.buildings) {
      if (this.pos.x < b.minX - 1.5 || this.pos.x > b.maxX + 1.5 || this.pos.z < b.minZ - 1.5 || this.pos.z > b.maxZ + 1.5) continue;
      for (const w of b.walls) {
        if (py + 1.6 <= w.base || py >= w.top) continue;
        if (this.pos.x > w.minX - r && this.pos.x < w.maxX + r && this.pos.z > w.minZ - r && this.pos.z < w.maxZ + r) {
          const dxL = this.pos.x - (w.minX - r);
          const dxR = (w.maxX + r) - this.pos.x;
          const dzL = this.pos.z - (w.minZ - r);
          const dzR = (w.maxZ + r) - this.pos.z;
          const m = Math.min(dxL, dxR, dzL, dzR);
          if (m === dxL) this.pos.x = w.minX - r;
          else if (m === dxR) this.pos.x = w.maxX + r;
          else if (m === dzL) this.pos.z = w.minZ - r;
          else this.pos.z = w.maxZ + r;
        }
      }
    }
  }

  /** Edifício cujo terreno ocupa esta posição (para mobs não nascerem dentro). */
  private insideFootprint(x: number, z: number): Building | null {
    for (const b of this.buildings) {
      if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return b;
    }
    return null;
  }

  // ── v8: portas automáticas, telhados, zona segura e descoberta ──

  private updateBuildings(dt: number): void {
    let inside: Building | null = null;
    for (const b of this.buildings) {
      const inF = this.pos.x > b.minX && this.pos.x < b.maxX && this.pos.z > b.minZ && this.pos.z < b.maxZ && this.pos.y > b.f0Y - 0.9;
      if (b.doorPivot) {
        const dx = this.pos.x - b.doorPivot.position.x;
        const dz = this.pos.z - b.doorPivot.position.z;
        const near = dx * dx + dz * dz < 13;
        const was = b.doorOpenT;
        b.doorOpenT = Math.min(1, Math.max(0, b.doorOpenT + (near ? dt * 3.2 : -dt * 2.0)));
        if ((was <= 0.02 && b.doorOpenT > 0.02) || (was >= 0.98 && b.doorOpenT < 0.98)) worldAudio.play("door");
        const e = b.doorOpenT * b.doorOpenT * (3 - 2 * b.doorOpenT);
        b.doorPivot.rotation.y = -2.05 * e;
      }
      if (b.roof) b.roof.visible = !inF;
      if (b.light) {
        // v8: luz só ligada perto do herói (histerese 40/50) — performance
        const d = Math.hypot(this.pos.x - b.cx, this.pos.z - b.cz);
        const want = d < 40 || (b.light.visible && d < 50);
        if (b.light.visible !== want) b.light.visible = want;
        b.light.intensity = inF ? 18 : 14;
      }
      if (inF) inside = b;
    }
    if (inside !== this.curInside) {
      this.curInside = inside;
      if (inside) {
        this.opts.onEvent({ type: "inside", name: inside.name, desc: inside.desc, on: true });
        this.opts.onEvent({ type: "quest", kind: "home" });
        if (!this.insideSeen.has(inside.id)) {
          this.insideSeen.add(inside.id);
          worldAudio.play("discover");
          this.discoverFx();
          this.opts.onEvent({ type: "discover", id: "bld-" + inside.id, name: inside.name, emoji: "🏠", xp: 45 });
        }
      } else {
        this.opts.onEvent({ type: "inside", name: "", desc: "", on: false });
      }
    }
    // descanso: dentro de casa recupera vida depressa (zona segura)
    if (this.curInside && !this.dead && this.hp < this.opts.stats.maxHp) {
      this.hp = Math.min(this.opts.stats.maxHp, this.hp + this.opts.stats.maxHp * 0.05 * dt);
      this.insideRegenT += dt;
      if (this.insideRegenT >= 1.2) {
        this.insideRegenT = 0;
        this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
        this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.1, 0)), "+ descanso", "#34d399", 0.8);
      }
    }
  }

  // ── v8: API pública para o mapa e testes ──

  getBuildingsInfo(): { count: number; names: string[]; inside: string | null; visited: number } {
    return {
      count: this.buildings.length,
      names: this.buildings.map((b) => b.name),
      inside: this.curInside ? this.curInside.name : null,
      visited: this.insideSeen.size,
    };
  }

  /** Teleporta o herói para uma posição (usado por testes e futuras viagens rápidas). */
  warpTo(x: number, z: number): void {
    // v8: teleportar = deixar a arena (evita o auto-exit no meio do warp)
    if (this.arena.active) this.endArena("quit");
    // v8: preserva a altura atual como referência — permite teleportes
    // dentro do mesmo piso e subir rampas com passos curtos; pisos
    // muito acima continuam a exigir subir pela escada (anti-queda)
    this.pos.x = x;
    this.pos.z = z;
    const gy = this.groundHeightAt(x, z);
    this.pos.y = gy + 0.4;
    this.vy = 0;
    this.onGround = true;
    this.player.position.copy(this.pos);
    this.ringEffectAt(new THREE.Vector3(x, this.pos.y + 0.1, z), 0x38bdf8, 3.2);
  }

  // ── v4: ARENA DAS ONDAS (sobrevivência) ───────────────────

  private buildArena(): void {
    const g = new THREE.Group();
    // piso de areia escura
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS + 1.5, 0.5, 36),
      new THREE.MeshLambertMaterial({ color: 0x8c6d4f })
    );
    floor.position.set(ARENA_CENTER.x, 0.25, ARENA_CENTER.z);
    g.add(floor);
    // anel de energia (fica pulsante quando o modo está ativo)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(ARENA_RADIUS - 1, 0.22, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.75 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ARENA_CENTER.x, 0.55, ARENA_CENTER.z);
    this.arenaRing = ring;
    g.add(ring);
    // pilares nas bordas
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = ARENA_CENTER.x + Math.cos(a) * (ARENA_RADIUS - 3);
      const pz = ARENA_CENTER.z + Math.sin(a) * (ARENA_RADIUS - 3);
      const pil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.9, 5 + (i % 2) * 1.6, 8),
        new THREE.MeshLambertMaterial({ color: 0x57493c })
      );
      pil.position.set(px, 2.6, pz);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.36, 0.9, 6),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xfb923c : 0xf43f5e })
      );
      flame.position.set(px, 5.6 + (i % 2) * 1.6, pz);
      g.add(pil, flame);
    }
    // portal de entrada
    const portalRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.3, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    portalRing.position.set(ARENA_CENTER.x - ARENA_RADIUS - 3.5, 2.3, ARENA_CENTER.z);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.7, 22),
      new THREE.MeshBasicMaterial({ color: 0x7f1d1d, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    disc.position.copy(portalRing.position);
    const aIcon = makeIconSprite("🏟️");
    aIcon.scale.set(1.5, 1.5, 1);
    aIcon.position.set(ARENA_CENTER.x - ARENA_RADIUS - 3.5, 4.6, ARENA_CENTER.z);
    const aLab = makeTextSprite("ARENA DAS ONDAS", { size: 30, bg: true, accent: "#f87171" });
    aLab.scale.set(6, 1.5, 1);
    aLab.position.set(ARENA_CENTER.x - ARENA_RADIUS - 3.5, 6.4, ARENA_CENTER.z);
    g.add(portalRing, disc, aIcon, aLab);
    // interactable do portal
    const portalPos = new THREE.Vector3(ARENA_CENTER.x - ARENA_RADIUS - 3.5, 0, ARENA_CENTER.z);
    this.interactables.push({
      group: new THREE.Group(), kind: "arena", id: "arena",
      label: "🏟️ Entrar na Arena das Ondas",
      pos: portalPos, used: false, icon: aIcon,
    });
    const light = new THREE.PointLight(0xf43f5e, 20, 22);
    light.position.set(ARENA_CENTER.x, 4, ARENA_CENTER.z);
    g.add(light);
    this.scene.add(g);
  }

  /** Inicia o modo sobrevivência na Arena das Ondas. */
  startArena(): void {
    if (this.arena.active) return;
    this.arena = { active: true, wave: 0, alive: 0, kills: 0, pts: 0, gold: 0, xp: 0, nextWaveAt: performance.now() + 1200, cooldown: false };
    this.pos.set(ARENA_CENTER.x - 6, 0, ARENA_CENTER.z);
    this.hp = Math.min(this.opts.stats.maxHp, this.hp + this.opts.stats.maxHp * 0.5);
    this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
    this.ringEffectAt(ARENA_CENTER.clone(), 0xf43f5e, 10);
    this.shake(0.3);
    worldAudio.play("wave");
    this.opts.onEvent({ type: "arena", action: "start" });
  }

  private endArena(reason: "death" | "exit" | "quit"): void {
    if (!this.arena.active) return;
    this.arena.active = false;
    // remove mobs da arena
    for (const m of this.mobs) {
      if (m.arena && m.state !== "dead") {
        m.state = "dead";
        m.respawnAt = Number.MAX_SAFE_INTEGER;
        m.group.visible = false;
      }
    }
    if (reason === "exit") {
      this.pos.set(0, 0, 6);
      this.opts.onEvent({ type: "notify", msg: "Saíste da arena — de volta à praça.", tone: "info" });
    }
    if (this.arenaRing) (this.arenaRing.material as THREE.MeshBasicMaterial).color.setHex(0xf43f5e);
    this.opts.onEvent({
      type: "arena", action: "end", reason,
      wave: this.arena.wave, kills: this.arena.kills,
      pts: this.arena.pts, gold: this.arena.gold, xp: this.arena.xp,
    });
  }

  getArena(): { active: boolean; wave: number; alive: number } {
    return { active: this.arena.active, wave: this.arena.wave, alive: this.arena.alive };
  }

  private arenaNextWave(): void {
    this.arena.wave += 1;
    const w = this.arena.wave;
    const count = Math.min(14, 3 + Math.floor(w * 1.4));
    const maxTier = Math.min(4, Math.floor(w / 2));
    const isBossWave = w % 5 === 0;
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 8 + Math.random() * (ARENA_RADIUS - 12);
      const tier = Math.min(maxTier, Math.max(0, Math.floor(Math.random() * (maxTier + 1))));
      this.spawnMob(tier, ARENA_CENTER.x + Math.cos(a) * rr, ARENA_CENTER.z + Math.sin(a) * rr, false, false, true);
      spawned++;
    }
    if (isBossWave) {
      this.spawnMob(Math.min(4, 2 + Math.floor(w / 8)), ARENA_CENTER.x, ARENA_CENTER.z + 10, true, false, true);
      spawned++;
    }
    this.arena.alive = spawned;
    this.arena.cooldown = false;
    if (this.arenaRing) (this.arenaRing.material as THREE.MeshBasicMaterial).color.setHex(0xfb923c);
    worldAudio.play("wave");
    this.shake(0.18);
    this.ringEffectAt(ARENA_CENTER.clone(), 0xfb923c, 8);
    this.opts.onEvent({ type: "arena", action: "wave", wave: w, count: spawned, boss: isBossWave });
  }

  // ── Natureza ────────────────────────────────────────────────

  private buildNature(): void {
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    // ── zonas protegidas (sem vegetação): POIs, marcos, arena ──
    const SAFE: [number, number, number][] = [
      [0, -52, 16], [52, 0, 16], [-52, 0, 16], [0, 52, 16],
      [-100, -60, 12], [95, 70, 15], [-90, 85, 10], [60, -100, 12], [112, 0, 30],
      [-140, 20, 11], [40, 140, 13], [-35, -150, 10], [150, 90, 11], [-150, -140, 12], [155, -70, 10],
      [-120, -40, 27], // v10: clareira do Coração da Floresta — só cenário curado
    ];
    const inSafe = (x: number, z: number, pad = 0): boolean => {
      if (Math.abs(x) < 6 + pad || Math.abs(z) < 6 + pad) return true; // estradas
      if (Math.hypot(x, z) < 24 + pad) return true; // praça
      if (Math.hypot(x - 95, z - 70) < 14 + pad) return true; // lago + praia
      for (const [sx, sz, sr] of SAFE) if (Math.hypot(x - sx, z - sz) < sr + pad) return true;
      return false;
    };
    const spot = (bias?: { x: number; z: number; r: number; w: number }): [number, number] => {
      for (let g = 0; g < 40; g++) {
        let x: number, z: number;
        if (bias && Math.random() < bias.w) {
          x = bias.x + (Math.random() - 0.5) * bias.r * 2;
          z = bias.z + (Math.random() - 0.5) * bias.r * 2;
        } else {
          const a = Math.random() * Math.PI * 2;
          const rr = 24 + Math.random() * 198;
          x = Math.cos(a) * rr; z = Math.sin(a) * rr;
        }
        if (!inSafe(x, z)) return [x, z];
      }
      return [9999, 9999];
    };

    // ── v7: FLORESTA RICA — 6 tipos de árvores por bioma ─────
    const TREE_BY_BIOME: string[][] = [
      ["acacia", "acacia", "acacia", "acacia", "baoba", "giant", "palm", "pine", "dead"], // planície
      ["giant", "giant", "giant", "giant", "pine", "pine", "pine", "acacia", "acacia"],   // floresta
      ["palm", "palm", "dead", "dead", "dead", "dead", "acacia"],                          // dunas (secas)
      ["palm", "palm", "palm", "palm", "palm", "acacia", "acacia", "pine"],                // litoral
      ["dead", "dead", "dead", "dead", "pine", "pine", "giant", "giant"],                  // pântano
      ["pine", "pine", "pine", "pine", "pine", "pine", "dead", "dead", "giant"],           // montanhas
      ["dead", "dead", "dead", "dead", "dead", "dead", "pine", "pine"],                    // vulcânicas
    ];
    const CANOPY: Record<string, number[]> = {
      acacia: [0x6a994e, 0x86b35a, 0x57883e],
      giant: [0x2d6a4f, 0x40916c, 0x1b4332, 0x35684a],
      pine: [0x2f5d3a, 0x3a7248, 0x27512f],
      palm: [0x58a356, 0x6fbf63, 0x4c9452],
    };
    const TRUNK_COL: Record<string, number> = {
      acacia: 0x6b4a2b, giant: 0x5a3f24, pine: 0x5d4126, palm: 0x8a6642, dead: 0x4a4038, baoba: 0x8d6748,
    };

    // listas de árvores geradas primeiro (2 passadas → instancing limpo)
    const trees: { x: number; z: number; y: number; s: number; type: string; tilt: number; rot: number; b: number }[] = [];
    for (let i = 0; i < 640; i++) {
      const bias = Math.random() < 0.4 ? { x: -120, z: -40, r: 88, w: 0.85 }
        : Math.random() < 0.5 ? { x: 150, z: 55, r: 75, w: 0.7 } : undefined;
      const [x, z] = spot(bias);
      if (x > 9000) continue;
      const b = biomeOf(x, z);
      const pool = TREE_BY_BIOME[b];
      const type = pool[Math.floor(Math.random() * pool.length)];
      trees.push({ x, z, y: groundY(x, z), s: 0.85 + Math.random() * 0.75, type, tilt: type === "palm" ? (Math.random() - 0.5) * 0.34 : type === "dead" ? (Math.random() - 0.5) * 0.4 : (Math.random() - 0.5) * 0.1, rot: Math.random() * Math.PI * 2, b });
    }
    // cactos nas dunas
    const cactiList: { x: number; z: number; y: number; s: number }[] = [];
    for (let i = 0; i < 72; i++) {
      const [x, z] = spot({ x: -40, z: -150, r: 80, w: 0.9 });
      if (x > 9000) continue;
      if (biomeOf(x, z) !== 2) continue;
      cactiList.push({ x, z, y: groundY(x, z), s: 0.7 + Math.random() * 0.9 });
    }

    const N = trees.length;
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.34, 2.4, 6);
    trunkGeo.translate(0, 1.2, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
    const canSphGeo = new THREE.IcosahedronGeometry(1.35, 0);
    const canSph = new THREE.InstancedMesh(canSphGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), N * 3 + 8);
    const canConeGeo = new THREE.ConeGeometry(1.35, 2.5, 7);
    const canCone = new THREE.InstancedMesh(canConeGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), N * 2 + 8);
    const leafGeo = new THREE.ConeGeometry(0.36, 2.7, 5);
    leafGeo.scale(1, 1, 0.24);
    const palmLeaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 420);
    let ti = 0, si = 0, ci = 0, li = 0;

    const pickCol = (type: string, b: number): THREE.Color => {
      if (b === 2) return col.setHex(type === "palm" ? 0x9a8f5a : 0x7a8a4a).clone(); // secas
      if (b === 6 && type === "pine") return col.setHex(0x4a3a30).clone(); // queimado
      const arr = CANOPY[type] || CANOPY.acacia;
      return col.setHex(arr[Math.floor(Math.random() * arr.length)]).offsetHSL(0, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.1).clone();
    };

    for (const t of trees) {
      const { x, z, y, s, type, tilt, rot, b } = t;
      // tronco
      const th = type === "giant" ? 2.5 : type === "pine" ? 1.55 : type === "palm" ? 1.8 : type === "baoba" ? 1.0 : type === "dead" ? 1.15 : 1;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rot, tilt);
      dummy.scale.set(type === "baoba" ? 1.9 * s : type === "giant" ? 1.35 * s : type === "palm" ? 0.62 * s : 0.85 * s, th * s, type === "baoba" ? 1.9 * s : type === "giant" ? 1.35 * s : 0.85 * s);
      dummy.updateMatrix();
      trunks.setMatrixAt(ti, dummy.matrix);
      trunks.setColorAt(ti, col.setHex(TRUNK_COL[type]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08));
      const topX = x + Math.sin(tilt) * 2.4 * th * s;
      const topZ = z;
      // copas
      if (type === "acacia") {
        dummy.position.set(topX, y + 2.5 * th * s, topZ);
        dummy.rotation.set(0, rot * 2, 0);
        dummy.scale.set(2.1 * s, 0.72 * s, 2.1 * s);
        dummy.updateMatrix();
        canSph.setMatrixAt(si, dummy.matrix); canSph.setColorAt(si++, pickCol(type, b));
      } else if (type === "giant") {
        const layers: [number, number, number][] = [[1.55, 3.9, 1], [1.15, 5.3, 1.25], [0.85, 6.5, 1.6]];
        for (const [r, yy, sw] of layers) {
          dummy.position.set(topX + (Math.random() - 0.5) * 0.5, y + yy * s, topZ + (Math.random() - 0.5) * 0.5);
          dummy.rotation.set(Math.random(), rot * 3, Math.random() * 0.4);
          dummy.scale.set(r * s * sw, r * 0.85 * s, r * s * sw);
          dummy.updateMatrix();
          canSph.setMatrixAt(si, dummy.matrix); canSph.setColorAt(si++, pickCol(type, b));
        }
      } else if (type === "baoba") {
        for (const [ox, oy, oz] of [[-0.9, 3.4, 0.2], [0.9, 3.7, -0.3]]) {
          dummy.position.set(topX + ox * s, y + oy * s, topZ + oz * s);
          dummy.rotation.set(Math.random(), Math.random(), Math.random());
          dummy.scale.setScalar(1.05 * s);
          dummy.updateMatrix();
          canSph.setMatrixAt(si, dummy.matrix); canSph.setColorAt(si++, col.setHex(0x65a30d).offsetHSL(0, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.08).clone());
        }
      } else if (type === "pine") {
        for (const [sc, yy] of [[1.15, 2.7], [0.8, 4.15]]) {
          dummy.position.set(topX, y + yy * s, topZ);
          dummy.rotation.set(0, rot * 2, 0);
          dummy.scale.set(sc * s, sc * s * (b === 5 ? 1.25 : 1), sc * s);
          dummy.updateMatrix();
          canCone.setMatrixAt(ci, dummy.matrix); canCone.setColorAt(ci++, pickCol(type, b));
        }
      } else if (type === "palm") {
        const hTop = 2.4 * th * s;
        for (let lf = 0; lf < 6; lf++) {
          const la = (lf / 6) * Math.PI * 2 + rot;
          dummy.position.set(topX + Math.sin(tilt) * 0 + Math.cos(la) * 0.85 * s, y + hTop - 0.15 * s, topZ + Math.sin(la) * 0.85 * s);
          dummy.rotation.set(0, la, -2.05 + Math.random() * 0.25);
          dummy.scale.setScalar(s * (0.85 + Math.random() * 0.3));
          dummy.updateMatrix();
          if (li < 420) { palmLeaves.setMatrixAt(li, dummy.matrix); palmLeaves.setColorAt(li, pickCol(type, b)); li++; }
        }
      }
      // árvore morta: sem copa (silhueta seca)
      ti++;
    }
    trunks.count = ti; canSph.count = si; canCone.count = ci; palmLeaves.count = li;
    if (trunks.instanceColor) trunks.instanceColor.needsUpdate = true;
    if (canSph.instanceColor) canSph.instanceColor.needsUpdate = true;
    if (canCone.instanceColor) canCone.instanceColor.needsUpdate = true;
    if (palmLeaves.instanceColor) palmLeaves.instanceColor.needsUpdate = true;
    this.scene.add(trunks, canSph, canCone, palmLeaves);

    // cactos (dunas) com braços
    if (cactiList.length) {
      const cacGeo = new THREE.CapsuleGeometry(0.3, 1.25, 4, 8);
      cacGeo.translate(0, 0.95, 0);
      const cacMesh = new THREE.InstancedMesh(cacGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), cactiList.length);
      const armGeo = new THREE.CapsuleGeometry(0.14, 0.5, 3, 6);
      armGeo.translate(0, 0.3, 0);
      const armMesh = new THREE.InstancedMesh(armGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), cactiList.length * 2);
      let ai = 0;
      cactiList.forEach((ca, k) => {
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        dummy.position.set(ca.x, ca.y, ca.z);
        dummy.scale.setScalar(ca.s);
        dummy.updateMatrix();
        cacMesh.setMatrixAt(k, dummy.matrix);
        cacMesh.setColorAt(k, col.setHex(Math.random() < 0.5 ? 0x4c8c46 : 0x3e7a3e));
        if (Math.random() < 0.75) {
          dummy.position.set(ca.x + 0.42 * ca.s, ca.y + 0.75 * ca.s, ca.z);
          dummy.rotation.set(0, 0, -0.95); dummy.scale.setScalar(ca.s);
          dummy.updateMatrix(); armMesh.setMatrixAt(ai, dummy.matrix); armMesh.setColorAt(ai, col.clone()); ai++;
        }
        if (Math.random() < 0.5) {
          dummy.position.set(ca.x - 0.42 * ca.s, ca.y + 0.55 * ca.s, ca.z);
          dummy.rotation.set(0, 0, 0.95);
          dummy.updateMatrix(); armMesh.setMatrixAt(ai, dummy.matrix); armMesh.setColorAt(ai, col.clone()); ai++;
        }
      });
      cacMesh.count = cactiList.length; armMesh.count = ai;
      if (cacMesh.instanceColor) cacMesh.instanceColor.needsUpdate = true;
      if (armMesh.instanceColor) armMesh.instanceColor.needsUpdate = true;
      this.scene.add(cacMesh, armMesh);
    }

    // ── rochas com cor por bioma (obsidiana, areia, musgo) ──
    const ROCK_COL = [0x7d8590, 0x5f7d54, 0xcbb27e, 0x93a08a, 0x5c6a5e, 0x8a939b, 0x2e2a2e];
    const rockGeo = new THREE.IcosahedronGeometry(0.9, 0);
    const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 170);
    let rp = 0;
    let guard = 0;
    while (rp < 170 && guard++ < 1400) {
      const [x, z] = spot();
      if (x > 9000) continue;
      dummy.position.set(x, groundY(x, z) + 0.25, z);
      const big = Math.random() < 0.14;
      dummy.scale.set((0.6 + Math.random() * 1.3) * (big ? 2.2 : 1), (0.5 + Math.random() * 0.9) * (big ? 1.9 : 1), (0.6 + Math.random() * 1.3) * (big ? 2.2 : 1));
      dummy.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
      dummy.updateMatrix();
      rocks.setMatrixAt(rp, dummy.matrix);
      const b = biomeOf(x, z);
      rocks.setColorAt(rp, col.setHex(ROCK_COL[b]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1));
      rp++;
    }
    rocks.count = rp;
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
    this.scene.add(rocks);

    // monólitos das Montanhas Negras
    const monoMat = new THREE.MeshLambertMaterial({ color: 0x69756e });
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 12 + Math.random() * 58;
      const x = -120 + Math.cos(a) * rr;
      const z = 130 + Math.sin(a) * rr * 0.8;
      if (inSafe(x, z, 4)) continue;
      const h = 4.5 + Math.random() * 5;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.4 + Math.random() * 1.2, h, 1.1 + Math.random()), monoMat);
      m.position.set(x, groundY(x, z) + h / 2 - 0.4, z);
      m.rotation.set((Math.random() - 0.5) * 0.16, Math.random() * Math.PI, (Math.random() - 0.5) * 0.14);
      this.scene.add(m);
      if (Math.random() < 0.4) {
        const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), monoMat);
        cap.position.set(x, groundY(x, z) + h - 0.2, z);
        this.scene.add(cap);
      }
    }

    const bushGeo = new THREE.IcosahedronGeometry(0.55, 0);
    const bushes = new THREE.InstancedMesh(bushGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 150);
    const BUSH_COL = [0x40916c, 0x2d6a4f, 0x74a352, 0x52796f, 0x4a5d43, 0x607b5e, 0x6a6f4a];
    let bp = 0;
    guard = 0;
    while (bp < 150 && guard++ < 1000) {
      const [x, z] = spot();
      if (x > 9000) continue;
      dummy.position.set(x, groundY(x, z) + 0.22, z);
      dummy.scale.set(0.7 + Math.random() * 0.9, 0.5 + Math.random() * 0.5, 0.7 + Math.random() * 0.9);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      bushes.setMatrixAt(bp, dummy.matrix);
      bushes.setColorAt(bp, col.setHex(BUSH_COL[biomeOf(x, z)]).offsetHSL(0, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.08));
      bp++;
    }
    bushes.count = bp;
    if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
    this.scene.add(bushes);

    // ── relva DENSA (1500 tufos) com cor por bioma ──
    const GRASS_COL = [0x4fae43, 0x2f8a4d, 0xcdb26a, 0x77b352, 0x3f6a4c, 0x7e8c84, 0x5a5a48];
    const bladeGeo = new THREE.ConeGeometry(0.05, 0.55, 4);
    bladeGeo.translate(0, 0.27, 0);
    const grass = new THREE.InstancedMesh(bladeGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 4600);
    let gi = 0;
    guard = 0;
    while (gi < 1500 && guard++ < 5200) {
      const [x, z] = spot();
      if (x > 9000) continue;
      const b = biomeOf(x, z);
      if (b === 2 && Math.random() < 0.72) continue; // dunas quase sem relva
      if (b === 6 && Math.random() < 0.6) continue;  // vulcânicas queimadas
      const y = groundY(x, z);
      for (let bl = 0; bl < 3; bl++) {
        dummy.position.set(x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5);
        dummy.scale.setScalar(0.7 + Math.random() * 0.9);
        dummy.rotation.set((Math.random() - 0.5) * 0.3, (bl / 3) * Math.PI + Math.random(), (Math.random() - 0.5) * 0.3);
        dummy.updateMatrix();
        const idx = gi * 3 + bl;
        if (idx < 4600) {
          grass.setMatrixAt(idx, dummy.matrix);
          grass.setColorAt(idx, col.setHex(GRASS_COL[b]).offsetHSL((Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.12));
        }
      }
      gi++;
    }
    grass.count = Math.min(4600, gi * 3);
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    this.scene.add(grass);

    // ── fetos (floresta/pântano) ──
    const fernGeo = new THREE.ConeGeometry(0.42, 0.5, 6);
    fernGeo.translate(0, 0.2, 0);
    const ferns = new THREE.InstancedMesh(fernGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 120);
    let fei = 0;
    guard = 0;
    while (fei < 120 && guard++ < 700) {
      const [x, z] = spot({ x: -110, z: -30, r: 90, w: 0.8 });
      if (x > 9000) continue;
      const b = biomeOf(x, z);
      if (b !== 1 && b !== 4) continue;
      dummy.position.set(x, groundY(x, z), z);
      dummy.scale.set(0.7 + Math.random() * 0.8, 0.6 + Math.random() * 0.6, 0.7 + Math.random() * 0.8);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.updateMatrix();
      ferns.setMatrixAt(fei, dummy.matrix);
      ferns.setColorAt(fei, col.setHex(b === 4 ? 0x2c5538 : 0x276b3f).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08));
      fei++;
    }
    ferns.count = fei;
    if (ferns.instanceColor) ferns.instanceColor.needsUpdate = true;
    this.scene.add(ferns);

    // ── cogumelos LUMINOSOS (pântano/montanhas/floresta) — brilham com bloom ──
    const mushStemGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.42, 5);
    mushStemGeo.translate(0, 0.21, 0);
    const mushStems = new THREE.InstancedMesh(mushStemGeo, new THREE.MeshLambertMaterial({ color: 0xe8e2d0 }), 96);
    const mushCapGeo = new THREE.ConeGeometry(0.27, 0.32, 7);
    mushCapGeo.translate(0, 0.5, 0);
    const MUSH_COL = [0x22d3ee, 0xa855f7, 0xf472b6, 0x4ade80];
    const mushCaps = new THREE.InstancedMesh(mushCapGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x444444 }), 96);
    let mi = 0;
    guard = 0;
    while (mi < 96 && guard++ < 600) {
      const [x, z] = spot({ x: -90, z: 85, r: 55, w: 0.55 });
      if (x > 9000) continue;
      const b = biomeOf(x, z);
      if (b !== 4 && b !== 5 && b !== 1) continue;
      const y = groundY(x, z);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.setScalar(0.7 + Math.random() * 1.1);
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mushStems.setMatrixAt(mi, dummy.matrix);
      const mc = col.setHex(MUSH_COL[Math.floor(Math.random() * MUSH_COL.length)]).clone();
      mushCaps.setMatrixAt(mi, dummy.matrix);
      mushCaps.setColorAt(mi, mc);
      mi++;
    }
    mushStems.count = mi; mushCaps.count = mi;
    if (mushCaps.instanceColor) mushCaps.instanceColor.needsUpdate = true;
    this.scene.add(mushStems, mushCaps);

    // ── flores coloridas (mais espalhadas) ──
    const flowerColors = [0xf472b6, 0xfbbf24, 0xf87171, 0xa78bfa, 0xffffff, 0x34d399];
    const F = 330;
    const flowerGeo = new THREE.SphereGeometry(0.09, 5, 4);
    const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), F);
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
    const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshLambertMaterial({ color: 0x2d6a4f }), F);
    let fi = 0;
    guard = 0;
    while (fi < F && guard++ < 1600) {
      const [x, z] = spot();
      if (x > 9000) continue;
      const b = biomeOf(x, z);
      if ((b === 2 || b === 6) && Math.random() < 0.7) continue;
      const y = groundY(x, z);
      dummy.position.set(x, y + 0.15, z);
      dummy.scale.setScalar(1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      stems.setMatrixAt(fi, dummy.matrix);
      dummy.position.y = y + 0.32;
      dummy.updateMatrix();
      flowers.setMatrixAt(fi, dummy.matrix);
      flowers.setColorAt(fi, col.setHex(flowerColors[fi % flowerColors.length]));
      fi++;
    }
    flowers.count = fi;
    stems.count = fi;
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
    this.scene.add(flowers, stems);

    // ── nenúfares no Lago Misterioso ──
    const lilyMat = new THREE.MeshLambertMaterial({ color: 0x3f8a4f });
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.random() * 7.2;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.4 + Math.random() * 0.35, 8), lilyMat);
      pad.rotateX(-Math.PI / 2);
      pad.position.set(95 + Math.cos(a) * rr, groundY(95, 70) + 0.16, 70 + Math.sin(a) * rr);
      this.scene.add(pad);
      if (i % 3 === 0) {
        const bl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), new THREE.MeshLambertMaterial({ color: 0xf9a8d4 }));
        bl.position.set(pad.position.x, pad.position.y + 0.12, pad.position.z);
        this.scene.add(bl);
      }
    }

    // ══ v7: PROPS DE CENÁRIO ════════════════════════════════

    // Lanternas ao longo das estradas (glow captado pelo bloom)
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3f3a35 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd66b });
    const lampGlowTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = 64; cv.height = 64;
      const cx = cv.getContext("2d")!;
      const g = cx.createRadialGradient(32, 32, 3, 32, 32, 30);
      g.addColorStop(0, "rgba(255,214,107,0.85)");
      g.addColorStop(1, "rgba(255,214,107,0)");
      cx.fillStyle = g; cx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(cv);
    })();
    for (const [lx, lz] of [[7.5, 7.5], [-7.5, 7.5], [7.5, -7.5], [-7.5, -7.5], [24, 5], [-24, 5], [24, -5], [-24, -5], [5, 24], [-5, 24], [5, -24], [-5, -24], [46, 5], [-46, -5], [5, 46], [-5, -46]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 3.1, 6), poleMat);
      pole.position.set(lx, groundY(lx, lz) + 1.55, lz);
      this.scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lampMat);
      bulb.position.set(lx, groundY(lx, lz) + 3.2, lz);
      this.scene.add(bulb);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampGlowTex, transparent: true, depthWrite: false, opacity: 0.9 }));
      glow.position.copy(bulb.position);
      glow.scale.setScalar(2.4);
      this.scene.add(glow);
    }

    // Arcos de pedra monumentais nas estradas
    for (const [ax, az, rotY] of [[0, -34, 0], [34, 0, Math.PI / 2], [0, 34, 0], [-34, 0, Math.PI / 2]]) {
      const arch = new THREE.Group();
      const aMat = new THREE.MeshLambertMaterial({ color: 0x8f8878 });
      for (const px of [-3, 3]) {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(1.1, 5.6, 1.3), aMat);
        pil.position.set(px, 2.8, 0);
        arch.add(pil);
      }
      const top = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.9, 1.5), aMat);
      top.position.y = 5.9;
      arch.add(top);
      const keystone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), aMat);
      keystone.position.y = 6.7;
      arch.add(keystone);
      const banner = makeTextSprite("⚔ BATEU WORLD", { size: 26, bg: true, accent: "#f43f5e" });
      banner.scale.set(3.4, 0.85, 1);
      banner.position.y = 7.8;
      arch.add(banner);
      arch.position.set(ax, 0, az);
      arch.rotation.y = rotY;
      this.scene.add(arch);
    }

    // Aldeia Capulana: cerca colorida + tendas de capulana
    const aldeia = new THREE.Group();
    const fenceCols = [0xef476f, 0xf78c6b, 0x06d6a0, 0x118ab2, 0xffd166];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const fx = Math.cos(a) * 9.5;
      const fz = Math.sin(a) * 9.5;
      if (Math.abs(fx) > 8.4 && Math.abs(fz) > 8.4) { /* arco de entrada fica */ }
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), new THREE.MeshLambertMaterial({ color: fenceCols[i % fenceCols.length] }));
      post.position.set(fx, 0.55, fz);
      aldeia.add(post);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.7), new THREE.MeshLambertMaterial({ color: 0x8a6642 }));
      rail.position.set(fx, 0.85, fz);
      rail.rotation.y = -a;
      aldeia.add(rail);
    }
    for (const [tx, tz, tc] of [[-3, -2, 0xef476f], [3, -1, 0x118ab2], [0.5, 2.5, 0xffd166]]) {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.3, 6), new THREE.MeshLambertMaterial({ color: tc }));
      tent.position.set(tx, 1.15, tz);
      aldeia.add(tent);
    }
    aldeia.position.set(40, groundY(40, 140), 140);
    this.scene.add(aldeia);

    // Acampamento dos Caçadores: tendas + FOGUEIRA VIVA (luz a tremular)
    const camp = new THREE.Group();
    for (const [tx, tz, tc] of [[-2.6, -1.6, 0xd9a960], [2.4, -1.2, 0xb0784a], [-0.6, 2.4, 0x9c6b3f]]) {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.1, 5), new THREE.MeshLambertMaterial({ color: tc }));
      tent.position.set(tx, 1.05, tz);
      camp.add(tent);
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshLambertMaterial({ color: 0x5a5a5a }));
      st.position.set(Math.cos(a) * 0.75, 0.12, Math.sin(a) * 0.75);
      camp.add(st);
    }
    const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 5), new THREE.MeshLambertMaterial({ color: 0x5d4126 }));
    log1.rotation.z = Math.PI / 2; log1.position.y = 0.16; camp.add(log1);
    const log2 = log1.clone(); log2.rotation.y = Math.PI / 2; camp.add(log2);
    const fireLight = new THREE.PointLight(0xff8c3a, 0, 16);
    fireLight.position.set(0, 1, 0);
    camp.add(fireLight);
    const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampGlowTex, color: 0xff9a4a, transparent: true, depthWrite: false, opacity: 0 }));
    fireGlow.position.set(0, 0.9, 0);
    fireGlow.scale.setScalar(3.2);
    camp.add(fireGlow);
    camp.position.set(150, groundY(150, 90), 90);
    this.scene.add(camp);
    this.campfireLight = fireLight;
    this.campfireGlow = fireGlow;

    // Efeitos atmosféricos: névoa (pântano) · poeira (dunas) · cinzas (vulcânicas)
    const fxTex = (r: number, g: number, b: number) => {
      const cv = document.createElement("canvas");
      cv.width = 64; cv.height = 64;
      const cx = cv.getContext("2d")!;
      const gr = cx.createRadialGradient(32, 32, 2, 32, 32, 30);
      gr.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(cv);
    };
    const mistTex = fxTex(190, 210, 200);
    const dustTex = fxTex(226, 198, 140);
    const ashTex = fxTex(120, 110, 108);
    const addFx = (kind: "mist" | "dust" | "ash", cx: number, cz: number, n: number, size: number, yRange: number) => {
      for (let i = 0; i < n; i++) {
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({
          map: kind === "mist" ? mistTex : kind === "dust" ? dustTex : ashTex,
          transparent: true, depthWrite: false, opacity: 0,
        }));
        const a = Math.random() * Math.PI * 2;
        const rr = kind === "mist" ? Math.random() * 52 : Math.random() * 70;
        this.ambFx.push({
          spr, kind, cx, cz,
          a: Math.random() * Math.PI * 2,
          r: rr, s: 0.008 + Math.random() * 0.02,
          y0: kind === "ash" ? 0 : Math.random() * yRange,
          size: size * (0.7 + Math.random() * 0.7),
          phase: Math.random() * Math.PI * 2,
        });
        spr.scale.setScalar(size * (0.7 + Math.random() * 0.7));
        this.scene.add(spr);
      }
    };
    addFx("mist", 40, 150, 22, 7, 1.4);   // Pântano Sombrio
    addFx("dust", -40, -150, 20, 3.2, 1.8); // Dunas Escaldantes
    addFx("ash", 170, -140, 26, 2.2, 7);  // Terras Vulcânicas

    // ── v3: borboletas de dia (como os vaga-lumes de noite) ──
    const bfCanvas = document.createElement("canvas");
    bfCanvas.width = 32; bfCanvas.height = 32;
    const bctx = bfCanvas.getContext("2d")!;
    const bGrd = bctx.createRadialGradient(16, 16, 2, 16, 16, 15);
    bGrd.addColorStop(0, "rgba(255,183,230,1)");
    bGrd.addColorStop(1, "rgba(255,183,230,0)");
    bctx.fillStyle = bGrd;
    bctx.fillRect(0, 0, 32, 32);
    const bfTex = new THREE.CanvasTexture(bfCanvas);
    for (let i = 0; i < 22; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: bfTex, transparent: true, depthWrite: false, opacity: 0 }));
      const a = Math.random() * Math.PI * 2;
      const rr = 16 + Math.random() * 185;
      this.butterflies.push({
        spr, a, r: rr, s: 0.03 + Math.random() * 0.06,
        y0: groundY(Math.cos(a) * rr, Math.sin(a) * rr) + 1 + Math.random() * 1.6,
      });
      spr.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      spr.scale.setScalar(0.35 + Math.random() * 0.3);
      this.scene.add(spr);
    }

    // Vaga-lumes para as noites do mundo
    const ffCanvas = document.createElement("canvas");
    ffCanvas.width = 32; ffCanvas.height = 32;
    const fctx = ffCanvas.getContext("2d")!;
    const grd = fctx.createRadialGradient(16, 16, 2, 16, 16, 15);
    grd.addColorStop(0, "rgba(253,224,71,1)");
    grd.addColorStop(1, "rgba(253,224,71,0)");
    fctx.fillStyle = grd;
    fctx.fillRect(0, 0, 32, 32);
    const ffTex = new THREE.CanvasTexture(ffCanvas);
    for (let i = 0; i < 52; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: ffTex, transparent: true, depthWrite: false, opacity: 0 }));
      const a = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 190;
      this.fireflies.push({
        spr, a, r, s: 0.02 + Math.random() * 0.05,
        y0: groundY(Math.cos(a) * r, Math.sin(a) * r) + 0.8 + Math.random() * 2,
      });
      spr.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      spr.scale.setScalar(0.5 + Math.random() * 0.5);
      this.scene.add(spr);
    }
  }

  // ══ v10: CORAÇÃO DA FLORESTA — a clareira sagrada da Floresta Ancestral ══
  // 9 Árvores Anciãs colossais em anel, dossel fechado, feixes de luz,
  // círculo de pedras com o cristal verde pulsante, runas antigas,
  // trepadeiras, sub-bosque denso e esporos luminosos dia/noite.

  private buildHeartForest(): void {
    const CX = -120, CZ = -40;
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    // ── 1. ÁRVORES ANCIÃS (anel colossal) ──────────────────────
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3520 });
    const rootMat = new THREE.MeshLambertMaterial({ color: 0x3f2d1d });
    const mossMat = new THREE.MeshLambertMaterial({ color: 0x2d6a4f });
    const canopyCols = [0x1b4332, 0x2d6a4f, 0x40916c, 0x35684a];
    const runeMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9 });
    const ANCIENTS = 9;
    let runeTree = 0;
    for (let i = 0; i < ANCIENTS; i++) {
      const a = (i / ANCIENTS) * Math.PI * 2 + 0.35;
      const rr = 34 + Math.random() * 12;
      const x = CX + Math.cos(a) * rr;
      const z = CZ + Math.sin(a) * rr * 0.92;
      // respeita as Ruínas Antigas e a Cabana do Lenhador
      if (Math.hypot(x + 100, z + 60) < 15 || Math.hypot(x + 106, z + 24) < 14) continue;
      const y = groundY(x, z);
      const h = 15 + Math.random() * 7;      // altura total
      const tr = 1.7 + Math.random() * 0.9;  // raio do tronco
      const g = new THREE.Group();

      // tronco em 3 segmentos afilados com leve inclinação
      const lean = (Math.random() - 0.5) * 0.1;
      const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(tr * 0.66, tr, h * 0.45, 9), trunkMat);
      seg1.position.y = h * 0.225;
      const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(tr * 0.5, tr * 0.66, h * 0.32, 9), trunkMat);
      seg2.position.y = h * 0.61;
      const seg3 = new THREE.Mesh(new THREE.CylinderGeometry(tr * 0.3, tr * 0.5, h * 0.25, 9), trunkMat);
      seg3.position.y = h * 0.895;
      seg3.rotation.z = lean;
      g.add(seg1, seg2, seg3);

      // raízes de apoio (contrafortes) à volta da base
      const nRoots = 6 + Math.floor(Math.random() * 2);
      for (let k = 0; k < nRoots; k++) {
        const ra = (k / nRoots) * Math.PI * 2 + Math.random() * 0.4;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.85, 2.9, 5), rootMat);
        root.position.set(Math.cos(ra) * tr * 0.95, 0.75, Math.sin(ra) * tr * 0.95);
        root.rotation.set(Math.sin(ra) * 0.62, -ra, -Math.cos(ra) * 0.62);
        root.scale.y = 0.9 + Math.random() * 0.7;
        g.add(root);
      }

      // musgo no tronco
      for (let k = 0; k < 4; k++) {
        const moss = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 0.45, 7, 6), mossMat);
        moss.position.set((Math.random() - 0.5) * tr * 1.3, 1.6 + Math.random() * h * 0.4, (Math.random() - 0.5) * tr * 1.3);
        moss.scale.set(1, 0.55, 0.5);
        moss.rotation.y = Math.random() * Math.PI;
        g.add(moss);
      }

      // runas antigas brilhantes em 3 anciãs
      if (i % 3 === 0 && runeTree < 3) {
        runeTree++;
        for (let k = 0; k < 3; k++) {
          const rune = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5 + Math.random() * 0.4, 0.06), runeMat);
          rune.position.set(tr * 0.72, 2.2 + k * 1.15 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6);
          rune.rotation.y = Math.random() * 0.6;
          rune.userData.base = 0.9;
          g.add(rune);
          this.heartRunes.push(rune);
        }
      }

      // copa em domo (6-7 bolosas achatadas)
      const topY = h * (0.98 + Math.random() * 0.06);
      const nBlob = 6 + Math.floor(Math.random() * 2);
      for (let k = 0; k < nBlob; k++) {
        const isTop = k === 0;
        const br = isTop ? 4.6 + Math.random() * 1.6 : 3.1 + Math.random() * 2.3;
        const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(br, 1), new THREE.MeshLambertMaterial({ color: canopyCols[Math.floor(Math.random() * canopyCols.length)] }));
        const ba = (k / nBlob) * Math.PI * 2;
        const brad = isTop ? 0 : 2.6 + Math.random() * 2.4;
        blob.position.set(Math.cos(ba) * brad, topY + (isTop ? 2.2 : 0.6 + Math.random() * 1.6) - k * 0.55, Math.sin(ba) * brad);
        blob.scale.set(1.25, 0.62 + Math.random() * 0.2, 1.25);
        g.add(blob);
      }

      // trepadeiras penduradas da copa
      const nVines = 4 + Math.floor(Math.random() * 3);
      for (let k = 0; k < nVines; k++) {
        const va = Math.random() * Math.PI * 2;
        const vlen = 2.6 + Math.random() * 3.4;
        const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.028, vlen, 5), new THREE.MeshLambertMaterial({ color: 0x3a7248 }));
        vine.position.set(Math.cos(va) * tr * 0.9, h * 0.8 - vlen / 2, Math.sin(va) * tr * 0.9);
        vine.rotation.z = (Math.random() - 0.5) * 0.16;
        g.add(vine);
      }

      g.position.set(x, y, z);
      g.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(g);
    }

    // ── 2. FEIXES DE LUZ (god rays) entre a copa e o chão ───────
    const rayGeo = new THREE.ConeGeometry(2.5, 19, 12, 1, true);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const rr = 7 + Math.random() * 15;
      const x = CX + Math.cos(a) * rr;
      const z = CZ + Math.sin(a) * rr;
      const mesh = new THREE.Mesh(rayGeo, new THREE.MeshBasicMaterial({
        color: 0xfff6cf, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      }));
      mesh.position.set(x, groundY(x, z) + 9.2, z);
      mesh.rotation.set((Math.random() - 0.5) * 0.14, Math.random() * Math.PI, 0.2 + Math.random() * 0.24);
      mesh.userData.phase = Math.random() * Math.PI * 2;
      this.scene.add(mesh);
      this.godRays.push({ mesh, phase: mesh.userData.phase });
    }

    // ── 3. CÍRCULO DE PEDRAS + CRISTAL DO CORAÇÃO ──────────────
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x5f705f });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const x = CX + Math.cos(a) * 7.5;
      const z = CZ + Math.sin(a) * 7.5;
      const st = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85 + Math.random() * 0.4, 0), stoneMat);
      st.position.set(x, groundY(x, z) + 0.7, z);
      st.scale.set(1, 1.5 + Math.random() * 0.9, 0.8);
      st.rotation.set((Math.random() - 0.5) * 0.24, Math.random() * Math.PI, (Math.random() - 0.5) * 0.2);
      this.scene.add(st);
      // tapete de musgo na base
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.75, 7, 5), mossMat);
      m.position.set(x, groundY(x, z) + 0.12, z);
      m.scale.set(1.2, 0.3, 1.2);
      this.scene.add(m);
    }

    // montinho musgoso central + cristais verdes flutuantes
    const heart = new THREE.Group();
    const mound = new THREE.Mesh(new THREE.IcosahedronGeometry(2.7, 1), mossMat);
    mound.scale.set(1, 0.38, 1);
    mound.position.y = 0.2;
    heart.add(mound);
    const cryMat = new THREE.MeshLambertMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 0.95 });
    const c1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), cryMat);
    c1.position.y = 2.15;
    const c2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), cryMat);
    c2.position.set(0.62, 1.35, 0.3);
    c2.rotation.set(0.5, 0.4, 0.3);
    const c3 = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), cryMat);
    c3.position.set(-0.55, 1.5, -0.35);
    c3.rotation.set(-0.4, 0.8, 0.2);
    const heartGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: (() => {
        const cv = document.createElement("canvas");
        cv.width = 64; cv.height = 64;
        const cx2 = cv.getContext("2d")!;
        const gr = cx2.createRadialGradient(32, 32, 3, 32, 32, 30);
        gr.addColorStop(0, "rgba(52,211,153,0.9)");
        gr.addColorStop(1, "rgba(52,211,153,0)");
        cx2.fillStyle = gr; cx2.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(cv);
      })(), transparent: true, depthWrite: false, opacity: 0.75,
    }));
    heartGlow.position.y = 2.1;
    heartGlow.scale.setScalar(6);
    const hLight = new THREE.PointLight(0x34d399, 4, 18);
    hLight.position.y = 2.4;
    heart.add(mound, c1, c2, c3, heartGlow, hLight);
    heart.position.set(CX, groundY(CX, CZ), CZ);
    this.scene.add(heart);
    this.heartCrystal = heart;
    this.heartLight = hLight;

    // pedras rúnicas em pé (3) — pulsam à noite
    const runeStoneMat = new THREE.MeshLambertMaterial({ color: 0x556055 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 1.1;
      const x = CX + Math.cos(a) * 11.5;
      const z = CZ + Math.sin(a) * 11.5;
      const y = groundY(x, z);
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.9, 0.45), runeStoneMat);
      st.position.set(x, y + 0.85, z);
      st.rotation.set((Math.random() - 0.5) * 0.12, Math.random() * Math.PI, (Math.random() - 0.5) * 0.1);
      this.scene.add(st);
      const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 0.05), runeMat.clone());
      glyph.position.set(0, 0.12, 0.24);
      glyph.userData.base = 0.8;
      st.add(glyph);
      this.heartRunes.push(glyph);
    }

    // poça de luz na orla da clareira
    const poolX = CX - 13, poolZ = CZ + 7;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.4, 20), new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.3, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(poolX, groundY(poolX, poolZ) + 0.18, poolZ);
    pool.userData.base = 0.3;
    this.scene.add(pool);
    this.heartRunes.push(pool);

    // ── 4. SUB-BOSQUE DENSO (só bioma floresta) ────────────────
    const inHeart = (x: number, z: number, pad = 0) => Math.hypot(x - CX, z - CZ) < 12 + pad;
    const fspot = (minR: number, maxR: number): [number, number] | null => {
      for (let g = 0; g < 30; g++) {
        const a = Math.random() * Math.PI * 2;
        const rr = minR + Math.random() * (maxR - minR);
        const x = CX + Math.cos(a) * rr;
        const z = CZ + Math.sin(a) * rr;
        if (Math.hypot(x, z) > 224) continue;
        if (Math.abs(x) < 7 || Math.abs(z) < 7) continue;
        if (Math.hypot(x + 100, z + 60) < 13 || Math.hypot(x + 106, z + 24) < 14) continue;
        if (inHeart(x, z, -4)) continue; // clareira interior fica curada
        return [x, z];
      }
      return null;
    };
    // fetos
    const fernGeo = new THREE.ConeGeometry(0.46, 0.55, 6);
    fernGeo.translate(0, 0.22, 0);
    const fFerns = new THREE.InstancedMesh(fernGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 88);
    let ffi = 0;
    for (let i = 0; i < 150 && ffi < 88; i++) {
      const p = fspot(10, 82);
      if (!p) continue;
      const [x, z] = p;
      dummy.position.set(x, groundY(x, z), z);
      dummy.scale.set(0.8 + Math.random() * 1.0, 0.7 + Math.random() * 0.7, 0.8 + Math.random() * 1.0);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.updateMatrix();
      fFerns.setMatrixAt(ffi, dummy.matrix);
      fFerns.setColorAt(ffi, col.setHex(0x276b3f).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08));
      ffi++;
    }
    fFerns.count = ffi;
    if (fFerns.instanceColor) fFerns.instanceColor.needsUpdate = true;
    this.scene.add(fFerns);
    // arbustos
    const bushGeo2 = new THREE.IcosahedronGeometry(0.6, 0);
    const fBush = new THREE.InstancedMesh(bushGeo2, new THREE.MeshLambertMaterial({ color: 0xffffff }), 52);
    let fbi = 0;
    for (let i = 0; i < 90 && fbi < 52; i++) {
      const p = fspot(12, 84);
      if (!p) continue;
      const [x, z] = p;
      dummy.position.set(x, groundY(x, z) + 0.24, z);
      dummy.scale.set(0.8 + Math.random() * 1.0, 0.55 + Math.random() * 0.5, 0.8 + Math.random() * 1.0);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      fBush.setMatrixAt(fbi, dummy.matrix);
      fBush.setColorAt(fbi, col.setHex(Math.random() < 0.5 ? 0x2d6a4f : 0x40916c).offsetHSL(0, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.08));
      fbi++;
    }
    fBush.count = fbi;
    if (fBush.instanceColor) fBush.instanceColor.needsUpdate = true;
    this.scene.add(fBush);
    // cogumelos luminosos
    const mushStemGeo2 = new THREE.CylinderGeometry(0.06, 0.1, 0.46, 5);
    mushStemGeo2.translate(0, 0.23, 0);
    const fStems = new THREE.InstancedMesh(mushStemGeo2, new THREE.MeshLambertMaterial({ color: 0xe8e2d0 }), 34);
    const fCaps = new THREE.InstancedMesh(new THREE.ConeGeometry(0.3, 0.34, 7).translate(0, 0.54, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x444444 }), 34);
    const fMushCols = [0x22d3ee, 0xa855f7, 0x4ade80];
    let fmi = 0;
    for (let i = 0; i < 70 && fmi < 34; i++) {
      const p = fspot(11, 80);
      if (!p) continue;
      const [x, z] = p;
      const y = groundY(x, z);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.setScalar(0.75 + Math.random() * 1.1);
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      fStems.setMatrixAt(fmi, dummy.matrix);
      fCaps.setMatrixAt(fmi, dummy.matrix);
      fCaps.setColorAt(fmi, col.setHex(fMushCols[Math.floor(Math.random() * fMushCols.length)]).clone());
      fmi++;
    }
    fStems.count = fmi; fCaps.count = fmi;
    if (fCaps.instanceColor) fCaps.instanceColor.needsUpdate = true;
    this.scene.add(fStems, fCaps);

    // ── 5. ESPOROS LUMINOSOS (pólen dourado de dia / esporos ciano à noite) ──
    const sporeTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = 32; cv.height = 32;
      const cx2 = cv.getContext("2d")!;
      const gr = cx2.createRadialGradient(16, 16, 2, 16, 16, 15);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      cx2.fillStyle = gr; cx2.fillRect(0, 0, 32, 32);
      return new THREE.CanvasTexture(cv);
    })();
    for (let i = 0; i < 34; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: sporeTex, transparent: true, depthWrite: false, opacity: 0 }));
      const a = Math.random() * Math.PI * 2;
      const rr = 10 + Math.random() * 68;
      this.spores.push({
        spr, a, r: rr, s: 0.015 + Math.random() * 0.035,
        y0: 0.4 + Math.random() * 5, phase: Math.random() * Math.PI * 2,
      });
      spr.scale.setScalar(0.42 + Math.random() * 0.5);
      spr.position.set(CX + Math.cos(a) * rr, 0, CZ + Math.sin(a) * rr);
      this.scene.add(spr);
    }
  }

  /** v10: animação do Coração da Floresta (chamada do ciclo dia/noite). */
  private updateHeartForest(t: number, dt: number, dayAmt: number): void {
    const CX = -120, CZ = -40;
    if (this.heartLight) {
      this.heartLight.intensity = (4.6 + Math.sin(t * 0.0021) * 1.8 + Math.sin(t * 0.0073) * 1.2) * (1.3 - dayAmt * 0.5);
    }
    if (this.heartCrystal) {
      this.heartCrystal.rotation.y += dt * 0.45;
      const kids = this.heartCrystal.children;
      if (kids.length >= 4) {
        kids[1].position.y = 2.15 + Math.sin(t * 0.0012) * 0.22;
        kids[2].position.y = 1.35 + Math.sin(t * 0.0016 + 1.4) * 0.16;
        kids[3].position.y = 1.5 + Math.sin(t * 0.0019 + 2.8) * 0.18;
      }
    }
    // god rays: brilham de dia, apagam à noite (o cristal assume o turno)
    for (const gr of this.godRays) {
      (gr.mesh.material as THREE.MeshBasicMaterial).opacity =
        (0.03 + dayAmt * 0.08) * (0.72 + Math.sin(t * 0.0006 + gr.phase) * 0.28);
    }
    // esporos: derivam para cima, dourados de dia / ciano à noite
    const nightAmt = Math.max(0, 1 - dayAmt * 1.6);
    for (const sp of this.spores) {
      const m = sp.spr.material as THREE.SpriteMaterial;
      m.opacity = 0.16 + Math.sin(t * 0.001 + sp.phase) * 0.07;
      if (m.opacity <= 0.02) continue;
      m.color.setRGB(0.55 + (1 - nightAmt) * 0.45, 0.72, 0.25 + nightAmt * 0.62);
      sp.a += sp.s * dt * 60;
      sp.y0 += dt * 0.28;
      if (sp.y0 > 6.2) sp.y0 = 0.35;
      const x = CX + Math.cos(sp.a) * sp.r;
      const z = CZ + Math.sin(sp.a) * sp.r;
      sp.spr.position.set(x + Math.sin(t * 0.0004 + sp.phase) * 0.6, groundY(x, z) + sp.y0, z + Math.cos(t * 0.0005 + sp.phase) * 0.6);
    }
    // runas, glifos e poça: pulso suave
    for (let i = 0; i < this.heartRunes.length; i++) {
      const mm = this.heartRunes[i].material as THREE.MeshBasicMaterial;
      const base = (this.heartRunes[i].userData.base as number) || 0.85;
      mm.opacity = base * (0.82 + Math.sin(t * 0.003 + i * 1.7) * 0.18) * (0.6 + nightAmt * 0.4);
    }
  }

  // ── Jogador ─────────────────────────────────────────────────

  private buildPlayer(): void {
    // ── v5: avatar humanoide articulado e customizável ──
    const color = CLASS_COLORS[this.opts.classId] ?? 0xef4444;
    const parts = buildAvatar(this.avCfg, { classColor: color, withWeapon: true, classId: this.opts.classId });
    this.avParts = parts;
    this.buildClassWeapon(parts.weaponSlot);
    this.weaponPivot = parts.armR;
    const g = parts.root;

    const nameSpr = makeTextSprite(`${this.opts.name} · Nv${this.opts.level}`, { size: 30, bg: true });
    nameSpr.scale.set(3.6, 0.9, 1);
    nameSpr.position.y = 2.95;
    nameSpr.name = "nameTag";
    g.add(nameSpr);
    this.player = g;
    this.scene.add(g);
    this.playerShadow = this.addShadow(this.pos.x, 0, this.pos.z, 1.1);
    const pLight = new THREE.PointLight(color, 4, 7);
    pLight.position.y = 2.4;
    g.add(pLight);
    // anel de escudo PvP próprio (visível quando ativo)
    const myRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.06, 6, 22),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.85 })
    );
    myRing.rotation.x = -Math.PI / 2;
    myRing.position.y = 0.25;
    myRing.visible = false;
    myRing.name = "myShield";
    g.add(myRing);
    this.classAura = pLight;
    this.capeMesh = parts.cape;
    this.buildHeroShield(parts.armL);
  }

  /** v6: escudo do herói — criado no braço esquerdo, visível quando equipado. */
  private buildHeroShield(armL: THREE.Group): void {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.06, 18),
      new THREE.MeshLambertMaterial({ color: 0x8b5e3c })
    );
    body.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.045, 6, 18),
      new THREE.MeshLambertMaterial({ color: 0xfbbf24 })
    );
    const boss = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xfacc15 })
    );
    boss.position.z = 0.06;
    g.add(body, rim, boss);
    g.position.set(0, -0.55, 0.12);
    g.rotation.x = Math.PI / 2;
    g.visible = false;
    g.name = "heroShield";
    armL.add(g);
    this.shieldMesh = g;
    // brilho que pulsa quando bloqueia
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.56, 20),
      new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    glow.position.set(0, -0.55, 0.2);
    glow.visible = false;
    armL.add(glow);
    this.shieldGlow = glow;
  }

  /** v6: mostrar/esconder o escudo equipado (cor pela raridade do item). */
  setShieldMesh(rarity: number | null): void {
    if (!this.shieldMesh) return;
    if (rarity === null) {
      this.shieldMesh.visible = false;
      return;
    }
    const cols = [0x9ca3af, 0x38bdf8, 0xa855f7, 0xfbbf24];
    const rimMat = (this.shieldMesh.children[1] as THREE.Mesh)?.material as THREE.MeshLambertMaterial;
    if (rimMat) rimMat.color.setHex(cols[rarity] ?? 0xfbbf24);
    this.shieldMesh.visible = true;
  }

  /** v6: modo guarda — ergue o escudo e reduz o dano; move mais devagar. */
  setGuard(on: boolean): void {
    if (this.dead) on = false;
    if (this.guarding === on) return;
    this.guarding = on;
    worldAudio.play(on ? "shield" : "click");
    this.opts.onEvent({ type: "guard", on });
  }

  toggleGuard(): void { this.setGuard(!this.guarding); }
  isGuarding(): boolean { return this.guarding; }

  /** v5: arma da classe empunhada na mão direita do avatar. */
  private buildClassWeapon(slot: THREE.Group): void {
    const wMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
    const hMat = new THREE.MeshLambertMaterial({ color: 0x7c4a21 });
    const cls = this.opts.classId;
    if (cls === 0) {
      // Espada com ponta afiada
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.9, 0.03), wMat);
      blade.position.y = 0.48;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.18, 4), wMat);
      tip.position.y = 1.0;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.06), new THREE.MeshLambertMaterial({ color: 0xfbbf24 }));
      guard.position.y = 0.03;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 6), hMat);
      grip.position.y = -0.1;
      slot.add(blade, tip, guard, grip);
      slot.rotation.x = Math.PI / 2.15; // lâmina aponta para a frente
    } else if (cls === 1) {
      // Cajado com orbe luminoso
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.2, 6), hMat);
      shaft.position.y = 0.4;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xa78bfa }));
      orb.position.y = 1.08;
      slot.add(shaft, orb);
    } else if (cls === 2) {
      // Arco vertical na mão
      const bow = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.035, 6, 14, Math.PI),
        new THREE.MeshLambertMaterial({ color: 0x8b5e3c })
      );
      bow.rotation.z = -Math.PI / 2;
      bow.rotation.y = Math.PI / 2;
      slot.add(bow);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4), new THREE.MeshBasicMaterial({ color: 0xe5e7eb }));
      slot.add(str);
    } else {
      // Tótém de cura
      const totem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.7, 6), new THREE.MeshLambertMaterial({ color: 0x0d9488 }));
      totem.position.y = 0.25;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0x6ee7b7 }));
      gem.position.y = 0.72;
      slot.add(totem, gem);
    }
  }

  /** v5: aplica novo avatar em jogo (editor de aparência). */
  applyAvatar(cfg: AvatarConfig): void {
    const pos = this.player.position.clone();
    const rotY = this.player.rotation.y;
    this.scene.remove(this.player);
    this.avCfg = cfg;
    this.avKey = avatarKey(cfg);
    this.buildPlayer();
    this.player.position.copy(pos);
    this.player.rotation.y = rotY;
    this.broadcastPos();
  }

  /** v5: mostra balão de emote sobre outro jogador sincronizado. */
  showRemoteEmote(name: string, emoji: string): void {
    for (const [, r] of this.remotes) {
      if (r.name !== name) continue;
      if (r.emoteSpr) { r.group.remove(r.emoteSpr); r.emoteSpr = null; }
      const spr = makeIconSprite(emoji);
      spr.scale.set(1.5, 1.5, 1);
      spr.position.y = 3.4;
      r.group.add(spr);
      r.emoteSpr = spr;
      r.emoteUntil = performance.now() + 2200;
      break;
    }
  }

  // ── v3: efeitos de progressão (level-up / descoberta) ───────

  levelFx(): void {
    // pilar de luz dourado + anel
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.0, 9, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
    );
    pillar.position.copy(this.pos).add(new THREE.Vector3(0, 4.5, 0));
    this.scene.add(pillar);
    const t0 = performance.now();
    const anim = () => {
      if (this.disposed) { this.scene.remove(pillar); return; }
      const t = (performance.now() - t0) / 900;
      if (t >= 1) { this.scene.remove(pillar); return; }
      pillar.scale.set(1 + t * 0.6, 1, 1 + t * 0.6);
      (pillar.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - t);
      requestAnimationFrame(anim);
    };
    anim();
    this.ringEffect(0xfbbf24, 6);
    this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0xfde047, 26, 4.5, 0.9, 0.11, 3);
    worldAudio.play("levelup");
  }

  discoverFx(): void {
    this.ringEffect(0x38bdf8, 6.5);
    this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.6, 0)), 0x38bdf8, 24, 4, 1, 0.1, 2);
  }

  // ── v3: emotes ───────────────────────────────────────────────

  emote(emoji: string): void {
    if (performance.now() < this.emoteUntil - 600) return;
    if (this.emoteSprite) {
      this.scene.remove(this.emoteSprite);
      this.emoteSprite = null;
    }
    const spr = makeIconSprite(emoji);
    spr.scale.set(1.5, 1.5, 1);
    spr.position.copy(this.pos).add(new THREE.Vector3(0, 3.6, 0));
    this.scene.add(spr);
    this.emoteSprite = spr;
    this.emoteUntil = performance.now() + 2200;
    this.burst(this.pos.clone().add(new THREE.Vector3(0, 2.6, 0)), 0xfbbf24, 6, 1.6, 0.5, 0.07, 2);
    worldAudio.play("click");
    try {
      this.chan?.send({ type: "broadcast", event: "chat", payload: { n: this.opts.name, m: emoji, emote: true } });
    } catch { /* ignore */ }
  }

  // ── v3: barra de chefe para o HUD ────────────────────────────

  getBossBar(): { name: string; hp: number; maxHp: number; pct: number } | null {
    let best: Mob | null = null;
    let bestD = 26;
    for (const m of this.mobs) {
      if (m.state !== "chase" || (!m.isBoss && !m.isGuard)) continue;
      const d = Math.hypot(m.group.position.x - this.pos.x, m.group.position.z - this.pos.z);
      if (d < bestD) { bestD = d; best = m; }
    }
    if (!best) return null;
    return { name: best.name, hp: best.hp, maxHp: best.maxHp, pct: Math.max(0, best.hp / best.maxHp) };
  }

  // ── v3: buffs ativos para o HUD ──────────────────────────────

  getBuffs(): { atk: number; hot: number } {
    const now = performance.now();
    return {
      atk: Math.max(0, this.atkBuffUntil - now),
      hot: Math.max(0, this.hotUntil - now),
    };
  }

  private buildMobs(): void {
    // v6: mundo 230 → mais inimigos em todas as faixas + 2 chefes e
    // 2 guardas extra nas terras distantes (Portal do Eclipse / Gruta do Eco)
    const defs: { tier: number; count: number; boss?: boolean; guard?: boolean; pos?: [number, number] }[] = [
      { tier: 0, count: 26 },
      { tier: 1, count: 20 },
      { tier: 2, count: 14 },
      { tier: 3, count: 10 },
      { tier: 4, count: 7 },
      { tier: 2, count: 1, boss: true, pos: [112, -112] },
      { tier: 4, count: 1, boss: true, pos: [-112, 112] },
      { tier: 4, count: 1, boss: true, pos: [-150, -140] },  // Portal do Eclipse
      { tier: 3, count: 1, boss: true, pos: [155, -70] },    // Gruta do Eco
      { tier: 4, count: 1, boss: true, pos: [-131, -52] },   // v10: Guardiã Anciã do Coração da Floresta
      { tier: 2, count: 1, guard: true, pos: [0, -45] },
      { tier: 2, count: 1, guard: true, pos: [0, 45] },
      { tier: 3, count: 1, guard: true, pos: [-140, 20] },   // Torre de Vigia
      { tier: 3, count: 1, guard: true, pos: [150, 90] },    // Acampamento
    ];
    for (const d of defs) {
      for (let i = 0; i < d.count; i++) {
        let x: number, z: number;
        if (d.pos) { [x, z] = d.pos; }
        else {
          const a = Math.random() * Math.PI * 2;
          const r = d.tier === 0 ? 30 + Math.random() * 40
            : d.tier === 1 ? 66 + Math.random() * 55
            : d.tier === 2 ? 108 + Math.random() * 62
            : d.tier === 3 ? 92 + Math.random() * 80
            : 122 + Math.random() * 95;
          x = Math.cos(a) * r;
          z = Math.sin(a) * r;
        }
        this.spawnMob(d.tier, x, z, !!d.boss, !!d.guard);
      }
    }
  }

  private spawnMob(tier: number, x: number, z: number, boss = false, isGuard = false, isArena = false): void {
    // v8: não nascer dentro de edifícios — empurra para fora
    const fb = this.insideFootprint(x, z);
    if (fb) { x = fb.maxX + 4 + Math.random() * 3; z = fb.maxZ + 4 + Math.random() * 3; }
    const t = MOB_TIERS[tier];
    const g = new THREE.Group();
    const scale = boss ? 2.4 : isGuard ? t.scale * 1.35 : t.scale;
    const mat = new THREE.MeshLambertMaterial({ color: boss ? 0xdc2626 : isGuard ? 0xfacc15 : t.color });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 10), mat);
    body.position.y = 0.75;
    body.scale.set(scale, scale * 0.85, scale);
    const eyeW = new THREE.SphereGeometry(0.13, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupil = new THREE.SphereGeometry(0.06, 6, 6);
    const puMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const e1 = new THREE.Mesh(eyeW, eyeMat); e1.position.set(-0.22 * scale, 0.95 * scale, 0.5 * scale);
    const e2 = new THREE.Mesh(eyeW, eyeMat); e2.position.set(0.22 * scale, 0.95 * scale, 0.5 * scale);
    const p1 = new THREE.Mesh(pupil, puMat); p1.position.set(-0.22 * scale, 0.95 * scale, 0.6 * scale);
    const p2 = new THREE.Mesh(pupil, puMat); p2.position.set(0.22 * scale, 0.95 * scale, 0.6 * scale);
    // espinhos para tiers altos
    if (tier >= 3) {
      const spikeMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 });
      for (let si = 0; si < 4; si++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 0.5 * scale, 5), spikeMat);
        const sa = (si / 4) * Math.PI * 2;
        sp.position.set(Math.cos(sa) * 0.4 * scale, 1.25 * scale, Math.sin(sa) * 0.4 * scale);
        g.add(sp);
      }
    }
    // v3: cornos para tiers médios
    if (tier >= 1 && tier < 3) {
      const hornMat = new THREE.MeshLambertMaterial({ color: 0x3f2d1d });
      for (const hx of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09 * scale, 0.42 * scale, 5), hornMat);
        horn.position.set(hx * 0.3 * scale, 1.35 * scale, 0.1 * scale);
        horn.rotation.z = -hx * 0.5;
        g.add(horn);
      }
    }
    // v3: coroa 3D nos chefes
    if (boss) {
      const crownMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
      const crown = new THREE.Group();
      for (let ci = 0; ci < 5; ci++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09 * scale, 0.3 * scale, 4), crownMat);
        const ca = (ci / 5) * Math.PI * 2;
        spike.position.set(Math.cos(ca) * 0.3 * scale, 1.62 * scale, Math.sin(ca) * 0.3 * scale);
        crown.add(spike);
      }
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.3 * scale, 0.05 * scale, 5, 14), crownMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = 1.5 * scale;
      crown.add(band);
      g.add(crown);
      // aura vermelha de chefe
      const aura = new THREE.PointLight(0xff4444, 12, 10);
      aura.position.y = 1.4 * scale;
      g.add(aura);
      this.bossAuraLights.push(aura);
    }
    g.add(body, e1, e2, p1, p2);

    const hpCanvas = document.createElement("canvas");
    hpCanvas.width = 64; hpCanvas.height = 10;
    const hpTex = new THREE.CanvasTexture(hpCanvas);
    const hpBar = new THREE.Sprite(new THREE.SpriteMaterial({ map: hpTex, depthWrite: false }));
    hpBar.scale.set(1.6, 0.25, 1);
    hpBar.position.y = 1.7 * scale + 0.35;
    g.add(hpBar);

    const nm = makeTextSprite(`${boss ? "👑 " : isGuard ? "🛡️ " : ""}${boss ? (tier >= 4 ? "Rainha Sombria" : "Bug Rei") : isGuard ? "Guardião" : t.name}${boss ? " · CHEFE" : ""}`, {
      size: 24, bg: true, accent: boss ? "#f87171" : isGuard ? "#facc15" : undefined,
    });
    nm.scale.set(3.4, 0.85, 1);
    nm.position.y = 1.7 * scale + 0.95;
    g.add(nm);

    const y = groundY(x, z);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.addShadow(x, y, z, scale);

    const mult = boss ? 10 : isGuard ? 2.2 : 1;
    const mob: Mob = {
      group: g, hpBar, hpCanvas, hpTex,
      tier, isBoss: boss, isGuard,
      arena: isArena,
      hp: Math.round(t.hp * mult), maxHp: Math.round(t.hp * mult),
      atk: Math.round(t.atk * (boss ? 3 : isGuard ? 1.5 : 1)),
      xp: Math.round(t.xp * mult), gold: Math.round(t.gold * mult), pts: Math.round(t.pts * (boss ? 10 : isGuard ? 3 : 1)),
      speed: t.speed * (boss ? 0.8 : 1),
      home: new THREE.Vector3(x, y, z),
      target: new THREE.Vector3(x, y, z),
      state: "idle",
      nextThink: 0, atkCd: 0, respawnAt: 0, hitFlash: 0, bob: Math.random() * 10,
      stunUntil: 0, slowUntil: 0,
      name: boss ? (tier >= 4 ? "Rainha Sombria" : "Bug Rei") : isGuard ? "Guardião" : t.name,
    };
    this.drawMobHp(mob);
    this.mobs.push(mob);
  }

  private drawMobHp(mob: Mob): void {
    const ctx = mob.hpCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, 64, 10);
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, 64, 10);
    const pct = Math.max(0, mob.hp / mob.maxHp);
    ctx.fillStyle = pct > 0.5 ? "#4ade80" : pct > 0.25 ? "#facc15" : "#f87171";
    ctx.fillRect(1, 1, 62 * pct, 8);
    mob.hpTex.needsUpdate = true;
  }

  // ── Objetos de plataforma (populados pelo React) ───────────

  // v8: espelho dos objetos da plataforma para atualização AO VIVO
  private platInteractables: Interactable[] = [];

  /** Remove os objetos da plataforma atuais (antes de recriar em tempo real). */
  clearPlatformObjects(): void {
    for (const it of this.platInteractables) {
      this.scene.remove(it.group);
      const idx = this.interactables.indexOf(it);
      if (idx >= 0) this.interactables.splice(idx, 1);
    }
    this.platInteractables = [];
  }

  spawnPlatformObjects(data: {
    raffles: { id: string; title: string; prizeTitle: string }[];
    contests: { id: string; title: string; prize?: string }[];
    vouchers: { id: string; code: string; label: string }[];
    assets: { id: string; title: string; value: number; modality: string }[];
  }): void {
    // v8: pode ser chamado de novo em tempo real — limpa os anteriores
    this.clearPlatformObjects();
    const nR = Math.min(data.raffles.length, 8);
    for (let i = 0; i < nR; i++) {
      const r = data.raffles[i];
      const a = (-Math.PI / 2) * (i / Math.max(1, nR - 1)) - Math.PI * 0.25;
      const x = Math.cos(a) * 9;
      const z = -52 + Math.sin(a) * 9;
      this.addCrystal(r.id, r.title, x, z, 0xc084fc, "🎁");
    }
    if (nR === 0) this.addCrystal("none", "Sem sorteios ativos", 0, -52, 0x64748b, "🎁");

    const nA = Math.min(data.assets.length, 6);
    for (let i = 0; i < nA; i++) {
      const it = data.assets[i];
      const z = (i - (nA - 1) / 2) * 4.4;
      this.addStall(it.id, it.title, 52, z);
    }

    const nC = Math.min(data.contests.length, 4);
    for (let i = 0; i < nC; i++) {
      const it = data.contests[i];
      const z = (i - (nC - 1) / 2) * 5.4;
      this.addBillboard(it.id, it.title, -52, z);
    }

    const nV = Math.min(Math.max(data.vouchers.length, 2), 5);
    for (let i = 0; i < nV; i++) {
      const v = data.vouchers[i] || { id: `gold-${i}`, code: "", label: "" };
      const x = (i - (nV - 1) / 2) * 3.6;
      this.addChest(v.id, x, 52, v);
    }

    // v8: snapshot dos objetos criados (para atualização ao vivo)
    this.platInteractables = this.interactables.filter((i) => ["raffle", "contest", "voucher", "asset"].includes(i.kind));
  }

  private addCrystal(id: string, title: string, x: number, z: number, color: number, emoji: string): void {
    const g = new THREE.Group();
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.75, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: 0x4c4370 })
    );
    ped.position.y = 0.55;
    const cry = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.85),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    cry.position.y = 2.1;
    const icon = makeIconSprite(emoji);
    icon.scale.set(1.3, 1.3, 1);
    icon.position.y = 3.6;
    const lab = makeTextSprite(title.slice(0, 22), { size: 26, bg: true, accent: "#a78bfa" });
    lab.scale.set(4.6, 1.15, 1);
    lab.position.y = 4.8;
    g.add(ped, cry, icon, lab);
    const y = groundY(x, z);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.interactables.push({
      group: g, kind: "raffle", id, label: `Sorteio: ${title.slice(0, 28)}`,
      pos: g.position.clone(), used: false, icon,
    });
  }

  private addStall(id: string, title: string, x: number, z: number): void {
    const g = new THREE.Group();
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.2, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x8b5e3c })
    );
    counter.position.y = 0.6;
    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6), new THREE.MeshLambertMaterial({ color: 0x5c4033 }));
    post1.position.set(-1.3, 1.9, -0.6);
    const post2 = post1.clone();
    post2.position.x = 1.3;
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.16, 2.2),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    awning.position.y = 3.1;
    awning.rotation.x = -0.18;
    const lab = makeTextSprite(title.slice(0, 20), { size: 26, bg: true, accent: "#fbbf24" });
    lab.scale.set(4.6, 1.15, 1);
    lab.position.y = 4.3;
    const icon = makeIconSprite("🛒");
    icon.scale.set(1.2, 1.2, 1);
    icon.position.y = 2.1;
    g.add(counter, post1, post2, awning, lab, icon);
    g.position.set(x, groundY(x, z), z);
    this.scene.add(g);
    this.interactables.push({
      group: g, kind: "asset", id, label: `Bem: ${title.slice(0, 28)}`,
      pos: g.position.clone(), used: false, icon,
    });
  }

  private addBillboard(id: string, title: string, x: number, z: number): void {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 3.4),
      new THREE.MeshLambertMaterial({ color: 0x6b7280 })
    );
    pole.position.y = 1.7;
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 2.2, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x0f172a })
    );
    panel.position.y = 3.6;
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(3.75, 2.35, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    border.position.set(0, 3.6, -0.05);
    const lab = makeTextSprite(title.slice(0, 20), { size: 26, bg: true, accent: "#f59e0b" });
    lab.scale.set(4.4, 1.1, 1);
    lab.position.y = 5.6;
    const icon = makeIconSprite("🏆");
    icon.scale.set(1.2, 1.2, 1);
    icon.position.y = 1.6;
    icon.position.z = 0.4;
    g.add(pole, border, panel, lab, icon);
    g.position.set(x, groundY(x, z), z);
    g.rotation.y = Math.PI / 2;
    this.scene.add(g);
    this.interactables.push({
      group: g, kind: "contest", id, label: `Concurso: ${title.slice(0, 28)}`,
      pos: g.position.clone(), used: false, icon,
    });
  }

  private addChest(id: string, x: number, z: number, voucher: { id: string; code: string; label: string }): void {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.9, 1),
      new THREE.MeshLambertMaterial({ color: 0x92400e })
    );
    base.position.y = 0.45;
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.5, 1.05),
      new THREE.MeshLambertMaterial({ color: 0xb45309 })
    );
    lid.position.set(0, 0.95, 0);
    const lock = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    lock.position.set(0, 0.75, 0.55);
    const icon = makeIconSprite("🎟️");
    icon.scale.set(1.3, 1.3, 1);
    icon.position.y = 2.2;
    const lab = voucher.code
      ? makeTextSprite(voucher.label.slice(0, 22), { size: 26, bg: true, accent: "#f87171" })
      : makeTextSprite("Ouro bónus", { size: 26, bg: true, accent: "#fbbf24" });
    lab.scale.set(4.4, 1.1, 1);
    lab.position.y = 3.2;
    g.add(base, lid, lock, icon, lab);
    g.position.set(x, groundY(x, z), z);
    this.scene.add(g);
    this.interactables.push({
      group: g, kind: "voucher", id: voucher.id || `gold-${x}`, label: voucher.code ? `Cupão: ${voucher.label}` : "Baú de ouro",
      pos: g.position.clone(), used: false, lid, icon,
    });
  }

  // ── Rede (multiplayer realtime + PvP) ───────────────────────

  private buildNet(): void {
    try {
      const ch: any = (supabase as any).channel("bateu-world-v1", {
        config: { presence: { key: this.myId } },
      });
      ch.on("broadcast", { event: "pos" }, ({ payload }: any) => {
        if (!payload || payload.id === this.myId) return;
        this.upsertRemote(payload);
      });
      ch.on("broadcast", { event: "chat" }, ({ payload }: any) => {
        // v5: emotes aparecem como balão sobre o outro jogador
        if (payload?.n && payload?.emote) this.showRemoteEmote(payload.n, payload.m);
        if (payload?.n) this.opts.onEvent({ type: "chat", name: payload.n, msg: payload.m });
      });
      ch.on("broadcast", { event: "pvphit" }, ({ payload }: any) => {
        if (!payload || payload.t !== this.myId) return;
        this.receivePvpHit(payload);
      });
      ch.on("broadcast", { event: "pvphp" }, ({ payload }: any) => {
        if (!payload || payload.id === this.myId) return;
        const r = this.remotes.get(payload.id);
        if (r && typeof payload.hp === "number") {
          r.hp = payload.hp;
          r.maxHp = payload.mhp || r.maxHp || 100;
          this.drawRemoteHp(r);
        }
      });
      ch.on("broadcast", { event: "pvpdeath" }, ({ payload }: any) => {
        if (!payload) return;
        if (payload.k === this.myId && payload.v !== this.myId) {
          // Eu fui o ladrão — recompensa (v7: + item roubado + bónus de Frenesi)
          this.opts.onEvent({ type: "pvp", action: "steal", victim: payload.vn, pts: payload.pts || 0, coupon: payload.cpn || null, item: payload.itm || null, bonus: this.wEvent.kind === "frenzy" ? 25 : 0 });
        } else if (payload.k && payload.v !== this.myId) {
          this.opts.onEvent({ type: "pvp", action: "feed", kn: payload.kn, vn: payload.vn });
        }
      });
      ch.on("presence", { event: "sync" }, () => {
        try {
          const st = ch.presenceState();
          this.opts.onEvent({ type: "online", count: Object.keys(st).length });
        } catch { /* ignore */ }
      });
      ch.on("presence", { event: "leave" }, ({ key }: any) => {
        const r = this.remotes.get(key);
        if (r) {
          this.scene.remove(r.group);
          this.remotes.delete(key);
        }
      });
      ch.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          try { ch.track({ id: this.myId, n: this.opts.name }); } catch { /* ignore */ }
        }
      });
      this.chan = ch;
      this.posTimer = setInterval(() => this.broadcastPos(), 125);
    } catch (e) {
      console.warn("[BateuWorld] realtime indisponível:", e);
    }

    this.remoteGroup = new THREE.Group();
    this.scene.add(this.remoteGroup);
  }

  private makeRemoteHpBar(): { bar: THREE.Sprite; canvas: HTMLCanvasElement; tex: THREE.CanvasTexture } {
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 10;
    const tex = new THREE.CanvasTexture(canvas);
    const bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
    bar.scale.set(1.6, 0.25, 1);
    bar.position.y = 2.55;
    return { bar, canvas, tex };
  }

  private drawRemoteHp(r: RemotePlayer): void {
    const ctx = r.hpCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, 64, 10);
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, 64, 10);
    const pct = Math.max(0, Math.min(1, r.hp / Math.max(1, r.maxHp)));
    ctx.fillStyle = r.shield ? "#60a5fa" : pct > 0.5 ? "#f87171" : "#fbbf24";
    ctx.fillRect(1, 1, 62 * pct, 8);
    r.hpTex.needsUpdate = true;
  }

  private upsertRemote(p: { id: string; n: string; cl?: number; lv?: number; x: number; z: number; ry?: number; mv?: boolean; hp?: number; mhp?: number; sh?: boolean; av?: string }): void {
    let r = this.remotes.get(p.id);
    if (!r) {
      const g = new THREE.Group();
      const color = CLASS_COLORS[p.cl ?? 0] ?? 0x888888;
      // v5: avatar completo do outro jogador (ou cápsula legado)
      let parts: AvatarParts | null = null;
      let key = "";
      if (p.av) {
        const cfg = parseAvatarKey(p.av);
        if (cfg) {
          parts = buildAvatar(cfg, { classColor: color });
          parts.root.name = "avatarBody";
          g.add(parts.root);
          key = avatarKey(cfg);
        }
      }
      if (!parts) {
        const body = new THREE.Mesh(this.geoBody, new THREE.MeshLambertMaterial({ color }));
        body.position.y = 1.05;
        const head = new THREE.Mesh(this.geoHead, new THREE.MeshLambertMaterial({ color: 0xf5d0a9 }));
        head.position.y = 1.95;
        g.add(body, head);
      }
      const nameSpr = makeTextSprite(`${(p.n || "Jogador").slice(0, 14)} · Nv${p.lv ?? 1}`, { size: 30, bg: true });
      nameSpr.scale.set(3.6, 0.9, 1);
      nameSpr.position.y = 2.95;
      nameSpr.name = "nameTag";
      const { bar, canvas, tex } = this.makeRemoteHpBar();
      g.add(nameSpr, bar);
      // anel de proteção (escudo)
      const shieldRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.05, 6, 20),
        new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.8 })
      );
      shieldRing.rotation.x = -Math.PI / 2;
      shieldRing.position.y = 0.3;
      shieldRing.visible = false;
      shieldRing.name = "shieldRing";
      g.add(shieldRing);
      this.remoteGroup.add(g);
      r = {
        group: g, hpBar: bar, hpCanvas: canvas, hpTex: tex,
        target: new THREE.Vector3(p.x, 0, p.z), targetRy: p.ry ?? 0, moving: !!p.mv,
        lastSeen: performance.now(), name: p.n,
        hp: p.hp ?? 100, maxHp: p.mhp ?? 100, shield: !!p.sh,
        parts, walkT: 0, avKey: key, emoteSpr: null, emoteUntil: 0,
      };
      g.position.set(p.x, groundY(p.x, p.z), p.z);
      this.remotes.set(p.id, r);
      this.drawRemoteHp(r);
      worldAudio.play("join");
      this.opts.onEvent({ type: "playerjoin", name: r.name });
    } else if (p.av && p.av !== r.avKey) {
      // v5: o jogador mudou de aparência — reconstruir avatar
      const old = r.group.children.find((c) => c.name === "avatarBody");
      if (old) r.group.remove(old);
      const cfg = parseAvatarKey(p.av);
      if (cfg) {
        const color = CLASS_COLORS[p.cl ?? 0] ?? 0x888888;
        r.parts = buildAvatar(cfg, { classColor: color });
        r.parts.root.name = "avatarBody";
        r.group.add(r.parts.root);
        r.avKey = avatarKey(cfg);
      }
    }
    // nome/nível/escudo atualizam-se se mudaram
    const wantText = `${(p.n || "Jogador").slice(0, 14)} · Nv${p.lv ?? 1}${p.sh ? " 🛡️" : ""}`;
    const tag = r.group.children.find((c) => c.name === "nameTag") as THREE.Sprite | undefined;
    if (tag && (tag as any).__txt !== wantText) {
      (tag as any).__txt = wantText;
      const newMat = makeTextSprite(wantText, { size: 30, bg: true });
      tag.material.dispose();
      tag.material = newMat.material;
    }
    const ring = r.group.children.find((c) => c.name === "shieldRing") as THREE.Mesh | undefined;
    if (ring) ring.visible = !!p.sh;
    r.target.set(p.x, 0, p.z);
    r.targetRy = p.ry ?? r.targetRy;
    r.moving = !!p.mv;
    r.lastSeen = performance.now();
    if (typeof p.hp === "number") { r.hp = p.hp; r.maxHp = p.mhp ?? r.maxHp; r.shield = !!p.sh; this.drawRemoteHp(r); }
  }

  private broadcastPos(): void {
    if (!this.chan || this.disposed) return;
    const payload = {
      id: this.myId, n: this.opts.name, cl: this.opts.classId,
      lv: this.opts.level, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2),
      ry: +this.player.rotation.y.toFixed(2), mv: this.isMoving(),
      hp: Math.round(this.hp), mhp: Math.round(this.opts.stats.maxHp),
      sh: performance.now() < this.pvpShieldUntil,
      av: this.avKey, // v5: aparência do avatar
    };
    try { this.chan.send({ type: "broadcast", event: "pos", payload }); } catch { /* ignore */ }
  }

  sendChat(msg: string): void {
    if (!this.chan || !msg.trim()) return;
    try {
      this.chan.send({ type: "broadcast", event: "chat", payload: { n: this.opts.name, m: msg.slice(0, 140) } });
    } catch { /* ignore */ }
  }

  // ── PvP: ataque e roubo ─────────────────────────────────────

  get inSafeZone(): boolean {
    return Math.hypot(this.pos.x, this.pos.z) < PVP_SAFE_RADIUS;
  }

  get shielded(): boolean {
    return performance.now() < this.pvpShieldUntil;
  }

  setShield(ms: number): void {
    this.pvpShieldUntil = performance.now() + ms;
    worldAudio.play("shield");
    const myRing = this.player.children.find((c) => c.name === "myShield") as THREE.Mesh | undefined;
    if (myRing) myRing.visible = true;
    this.ringEffect(0x60a5fa, 4);
    this.opts.onEvent({ type: "hp", hp: Math.max(0, this.hp), maxHp: this.opts.stats.maxHp });
  }

  private effAtk(): number {
    const buff = performance.now() < this.atkBuffUntil ? 1.5 : 1;
    const petBonus = this.hasPet ? 1.08 : 1; // v4: o companheiro incentiva o ataque
    return this.opts.stats.atk * buff * petBonus;
  }

  private receivePvpHit(p: { a: string; an: string; d: number }): void {
    if (this.dead) return;
    if (this.inSafeZone) {
      this.opts.onEvent({ type: "notify", msg: "🛡️ Zona segura — ninguém te pode ferir aqui!", tone: "info" });
      return;
    }
    if (this.shielded) {
      this.opts.onEvent({ type: "notify", msg: "🛡️ Tens proteção de roubo — o golpe foi anulado!", tone: "info" });
      return;
    }
    if (this.opts.level < PVP_MIN_LEVEL) {
      this.opts.onEvent({ type: "notify", msg: "🛡️ Heróis abaixo do nível 3 estão protegidos!", tone: "info" });
      return;
    }
    // valida proximidade do agressor
    const atk = this.remotes.get(p.a);
    const dAtk = atk ? Math.hypot(atk.group.position.x - this.pos.x, atk.group.position.z - this.pos.z) : 0;
    if (atk && dAtk > 12) return; // anti-alcance
    const def = this.opts.level * 2;
    const dmg = Math.max(1, Math.round((p.d || 5) * (100 / (100 + def * 4))));
    this.hp -= dmg;
    this.lastHitAt = performance.now();
    this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0xf87171, 10, 3.2, 0.5, 0.09, 6);
    this.shake(0.14);
    this.drawPlayerHpEvent(dmg, p.an);
    const now = performance.now();
    if (now - this.lastPvpHpSent > 300) {
      this.lastPvpHpSent = now;
      try { this.chan?.send({ type: "broadcast", event: "pvphp", payload: { id: this.myId, hp: Math.max(0, Math.round(this.hp)), mhp: Math.round(this.opts.stats.maxHp) } }); } catch { /* ignore */ }
    }
    if (this.hp <= 0) {
      this.dead = true;
      this.shake(0.4);
      this.opts.onEvent({ type: "pvp", action: "death", by: p.an, killerId: p.a });
    }
  }

  private drawPlayerHpEvent(dmg: number, by: string): void {
    this.opts.onEvent({ type: "hp", hp: Math.max(0, this.hp), maxHp: this.opts.stats.maxHp, hit: true });
    this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.5, 0)), `-${dmg}`, "#f87171", 1.2);
    if (by) this.opts.onEvent({ type: "pvphitby", name: by, dmg });
  }

  private tryPvpStrike(): boolean {
    // alvo: jogador remoto vivo mais próximo (fora de zona segura)
    let best: RemotePlayer | null = null;
    let bestD = 9;
    for (const r of this.remotes.values()) {
      const d = Math.hypot(r.group.position.x - this.pos.x, r.group.position.z - this.pos.z);
      if (d < bestD) { bestD = d; best = r; }
    }
    if (!best) return false;
    const melee = this.opts.classId === 0;
    const range = melee ? 3.4 : 8.5;
    if (bestD > range) return false;
    if (this.inSafeZone) {
      this.opts.onEvent({ type: "notify", msg: "Saia da praça para desafiar outros heróis (PvP)!", tone: "info" });
      return true; // consumiu o ataque
    }
    if (best.shield) {
      this.opts.onEvent({ type: "notify", msg: `🛡️ ${best.name} está protegido contra roubos!`, tone: "info" });
      return true;
    }
    const dmg = Math.round(this.effAtk() * (0.9 + Math.random() * 0.25));
    const fwd = new THREE.Vector3(best.group.position.x - this.pos.x, 0, best.group.position.z - this.pos.z).normalize();
    this.player.rotation.y = Math.atan2(fwd.x, fwd.z);
    this.slashEffect(fwd.clone());
    try {
      this.chan?.send({ type: "broadcast", event: "pvphit", payload: { a: this.myId, an: this.opts.name, t: this.remoteIdOf(best), d: dmg } });
    } catch { /* ignore */ }
    this.floatText(best.group.position.clone().add(new THREE.Vector3(0, 2.4, 0)), "⚔️", "#fbbf24", 1.1);
    // v7: contador para missão "Acerta golpes em heróis"
    this.opts.onEvent({ type: "pvpatk" });
    return true;
  }

  private remoteIdOf(r: RemotePlayer): string {
    for (const [id, rr] of this.remotes) if (rr === r) return id;
    return "";
  }

  broadcastPvpDeath(killerId: string, killerName: string, stolenPts: number, coupon: { id: string; code: string; label: string } | null, item: LootItem | null = null): void {
    try {
      this.chan?.send({
        type: "broadcast", event: "pvpdeath",
        payload: {
          v: this.myId, vn: this.opts.name,
          k: killerId, kn: killerName,
          pts: stolenPts, cpn: coupon, itm: item,
        },
      });
    } catch { /* ignore */ }
  }

  // ── Input ───────────────────────────────────────────────────

  private bindInput(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: true });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    this.keys.add(e.key.toLowerCase());
    if (e.key === " ") { this.jump(); e.preventDefault(); }
    // v12: C troca o modo de câmara (órbita → ombro → 1ª pessoa)
    if (e.key.toLowerCase() === "c") this.cycleCamMode();
    if (e.key.toLowerCase() === "e") this.interact();
    if (e.key.toLowerCase() === "f") this.attack();
    if (e.key === "1") this.skill(0);
    if (e.key === "2") this.skill(1);
    if (e.key === "3") this.skill(2);
    // v6: Shift = erguer/abaixar o escudo (modo guarda)
    if (e.key === "Shift") { e.preventDefault(); this.toggleGuard(); }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (this.dragId !== null) return;
    this.dragId = e.pointerId;
    this.dragStart = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    this.dragging = false;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.dragId) return;
    const dx = e.movementX || 0;
    const dy = e.movementY || 0;
    this.dragStart.moved += Math.abs(dx) + Math.abs(dy);
    if (this.dragStart.moved > 10) this.dragging = true;
    if (this.dragging) {
      this.camYaw -= dx * 0.0052;
      if (this.camMode === "orbit") {
        this.camDist = Math.max(6, Math.min(18, this.camDist + dy * 0.02));
      } else {
        this.camPitch = Math.max(-1.1, Math.min(1.25, this.camPitch + dy * 0.0042));
      }
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.dragId) return;
    const dt = performance.now() - this.dragStart.t;
    if (!this.dragging && dt < 320) this.attack();
    this.dragId = null;
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    this.camDist = Math.max(6, Math.min(18, this.camDist + (e.deltaY > 0 ? 1.2 : -1.2)));
  };

  cycleCamMode(): void {
    const order: ("orbit" | "third" | "first")[] = ["orbit", "third", "first"];
    this.setCamMode(order[(order.indexOf(this.camMode) + 1) % order.length]);
  }

  setCamMode(m: "orbit" | "third" | "first"): void {
    if (this.camMode === m) return;
    const wasFirst = this.camMode === "first";
    this.camMode = m;
    if (m === "third") {
      this.camPitch = Math.max(0.05, Math.min(this.camPitch, 0.6));
    } else if (m === "orbit") {
      this.camPitch = 0.34;
    }
    // ao sair da 1ª pessoa, encostar a câmara à posição orbital para evitar voo lateral
    if (wasFirst && m !== "first") {
      this.camPos.set(
        this.pos.x + Math.sin(this.camYaw) * this.camDist,
        this.pos.y + 5.5 + this.camDist * 0.32,
        this.pos.z + Math.cos(this.camYaw) * this.camDist
      );
    }
    this.applyCamVisibility();
    this.opts.onEvent({ type: "cammode", mode: m });
  }

  private applyCamVisibility(): void {
    // 1ª pessoa: o avatar desaparece (vês o mundo com os olhos dele)
    const fp = this.camMode === "first";
    if (this.player) this.player.visible = !fp;
    if (this.playerShadow) this.playerShadow.visible = !fp;
    if (this.classAura) this.classAura.visible = !fp;
  }

  setJoystick(x: number, y: number): void {
    this.joy.x = x;
    this.joy.y = y;
  }

  jump(): void {
    if (this.onGround && !this.dead) {
      this.vy = 6.6;
      this.onGround = false;
      this.burst(this.pos.clone(), 0xd6c8a8, 5, 1.6, 0.4, 0.07, 3);
    }
  }

  // ── Combate ─────────────────────────────────────────────────

  attack(): void {
    if (this.dead || this.atkCd > 0) return;
    this.atkCd = 0.55;
    this.swingT = 0.0001; // v3: animação de golpe da arma
    worldAudio.play("swing");
    // se houver jogador remoto perto (e nenhum mob mais perto), golpe PvP
    let nearMob = Infinity;
    for (const m of this.mobs) {
      if (m.state === "dead") continue;
      nearMob = Math.min(nearMob, m.group.position.distanceTo(this.pos));
    }
    let nearPl = Infinity;
    let anyPl = false;
    for (const r of this.remotes.values()) {
      anyPl = true;
      nearPl = Math.min(nearPl, Math.hypot(r.group.position.x - this.pos.x, r.group.position.z - this.pos.z));
    }
    if (anyPl && nearPl < Math.min(nearMob, 8.5) && nearPl <= 8.5) {
      if (this.tryPvpStrike()) return;
    }
    const cls = this.opts.classId;
    if (cls === 0) this.meleeAttack();
    else if (cls === 1) this.shoot(0xff7b00, 16, 18, "orb", 0xff7b00);
    else if (cls === 2) this.shoot(0xfde047, 24, 20, "arrow", 0xfde047);
    else this.shoot(0x2dd4bf, 14, 16, "orb", 0x2dd4bf);
  }

  skill(slot: number): void {
    if (this.dead) return;
    const def = SKILLS[this.opts.classId]?.[slot];
    if (!def) return;
    if (this.opts.level < def.lvl) {
      worldAudio.play("deny");
      this.opts.onEvent({ type: "skill2", slot, ok: false, reason: "locked", lvl: def.lvl });
      return;
    }
    if (this.skillCds[slot] > 0) {
      worldAudio.play("deny");
      this.opts.onEvent({ type: "skill2", slot, ok: false, reason: "cd", remain: Math.ceil(this.skillCds[slot]) });
      return;
    }
    this.skillCds[slot] = def.cd;
    this.swingT = 0.0001;
    worldAudio.play("skill");
    this.opts.onEvent({ type: "skill2", slot, ok: true, cd: def.cd });
    const now = performance.now();
    const cls = this.opts.classId;
    const aoeDamage = (range: number, mult: number, maxHits = 24) => {
      let hits = 0;
      for (const m of this.mobs) {
        if (m.state === "dead" || hits >= maxHits) continue;
        if (m.group.position.distanceTo(this.pos) <= range) {
          this.damageMob(m, this.effAtk() * mult * (0.9 + Math.random() * 0.2), false);
          hits++;
        }
      }
      return hits;
    };
    if (cls === 0) {
      // GUERREIRO
      if (slot === 0) { this.ringEffect(0xfbbf24, 4.5); aoeDamage(4.2, 2.2); }
      else if (slot === 1) {
        this.atkBuffUntil = now + 8000;
        this.ringEffect(0xef4444, 5);
        this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.6, 0)), "GRITO!", "#f87171", 1.2);
        this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xef4444, 18, 4, 0.6, 0.1, 4);
      } else {
        this.shake(0.35);
        this.ringEffect(0xf97316, 6.5);
        const hits = aoeDamage(6.5, 3.2);
        for (const m of this.mobs) {
          if (m.state !== "dead" && m.group.position.distanceTo(this.pos) <= 6.5) m.stunUntil = now + 2000;
        }
        this.burst(this.pos.clone(), 0xa16207, 26, 5, 0.8, 0.12, 9);
        if (hits > 0) this.opts.onEvent({ type: "skillhit", hits });
      }
    } else if (cls === 1) {
      // MAGO
      if (slot === 0) { this.ringEffect(0x8b5cf6, 5.5); const h = aoeDamage(7, 2.4); if (h > 0) this.opts.onEvent({ type: "skillhit", hits: h }); }
      else if (slot === 2) {
        // Meteoro: rocha cai e explode
        const fwd = new THREE.Vector3(Math.sin(this.player.rotation.y), 0, Math.cos(this.player.rotation.y));
        const at = this.pos.clone().addScaledVector(fwd, 5);
        const rock = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.1, 0),
          new THREE.MeshBasicMaterial({ color: 0xf97316 })
        );
        rock.position.copy(at).add(new THREE.Vector3(0, 14, 0));
        this.scene.add(rock);
        const t0 = performance.now();
        const anim = () => {
          if (this.disposed) { this.scene.remove(rock); return; }
          const t = Math.min(1, (performance.now() - t0) / 650);
          rock.position.y = 14 * (1 - t) + groundY(at.x, at.z);
          if (t >= 1) {
            this.scene.remove(rock);
            this.shake(0.45);
            this.burst(at.clone(), 0xf97316, 34, 6, 0.9, 0.14, 8);
            this.burst(at.clone(), 0xfde047, 20, 4, 0.7, 0.1, 6);
            this.ringEffectAt(at, 0xf97316, 9);
            let hits = 0;
            for (const m of this.mobs) {
              if (m.state === "dead") continue;
              if (m.group.position.distanceTo(at) <= 6.5) {
                this.damageMob(m, this.effAtk() * 4 * (0.9 + Math.random() * 0.2), true);
                hits++;
              }
            }
            if (hits > 0) this.opts.onEvent({ type: "skillhit", hits });
            return;
          }
          requestAnimationFrame(anim);
        };
        anim();
      } else {
        this.ringEffect(0x22d3ee, 6.5);
        const hits = aoeDamage(9, 1.8);
        for (const m of this.mobs) {
          if (m.state !== "dead" && m.group.position.distanceTo(this.pos) <= 9) m.slowUntil = now + 4000;
        }
        for (let i = 0; i < 18; i++) this.burst(this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, 0.4, (Math.random() - 0.5) * 8)), 0x93c5fd, 3, 1.4, 0.8, 0.08, 2);
        if (hits > 0) this.opts.onEvent({ type: "skillhit", hits });
      }
    } else if (cls === 2) {
      // ARQUEIRO
      if (slot === 0) {
        // Chuva de flechas: 5 tiros rápidos
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            if (this.disposed || this.dead) return;
            this.shoot(0x4ade80, 26, 14, "arrow", 0x22c55e);
          }, i * 180);
        }
      } else if (slot === 1) {
        const fwd = new THREE.Vector3(Math.sin(this.player.rotation.y), 0, Math.cos(this.player.rotation.y));
        const dest = this.pos.clone().addScaledVector(fwd, 6);
        this.burst(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x9ca3af, 14, 3, 0.5, 0.09, 5);
        const r = Math.hypot(dest.x, dest.z);
        if (r > WORLD_RADIUS) { dest.x *= WORLD_RADIUS / r; dest.z *= WORLD_RADIUS / r; }
        this.pos.x = dest.x; this.pos.z = dest.z;
        this.invulnUntil = now + 700;
        this.burst(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x4ade80, 14, 3, 0.5, 0.09, 5);
      } else {
        // Tiro certeiro: 3.5x no mais próximo
        let best: Mob | null = null;
        let bestD = 16;
        for (const m of this.mobs) {
          if (m.state === "dead") continue;
          const d = m.group.position.distanceTo(this.pos);
          if (d < bestD) { bestD = d; best = m; }
        }
        if (best) {
          const dmg = this.effAtk() * 3.5;
          setTimeout(() => { if (!this.disposed) this.damageMob(best!, dmg, true); }, 120);
          this.shoot(0xfde047, 30, 20, "arrow", 0xfde047);
        } else {
          this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), "sem alvo", "#cbd5e1", 0.9);
        }
      }
    } else {
      // CURANDEIRO
      if (slot === 0) {
        aoeDamage(8, 1.8);
        this.hp = Math.min(this.opts.stats.maxHp, this.hp + Math.round(this.opts.stats.maxHp * 0.3));
        this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
        this.ringEffect(0x2dd4bf, 6);
        this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), "+vida", "#4ade80", 1.1);
      } else if (slot === 1) {
        this.hotUntil = now + 10000;
        this.ringEffect(0x34d399, 5.5);
        this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), "regeneração", "#34d399", 1.1);
      } else {
        const hits = aoeDamage(8, 2.8);
        this.hp = Math.min(this.opts.stats.maxHp, this.hp + Math.round(this.opts.stats.maxHp * 0.15));
        this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
        this.ringEffect(0x4ade80, 7);
        this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0x4ade80, 22, 4.5, 0.7, 0.1, 3);
        if (hits > 0) this.opts.onEvent({ type: "skillhit", hits });
      }
    }
  }

  private meleeAttack(): void {
    const fwd = new THREE.Vector3(Math.sin(this.player.rotation.y), 0, Math.cos(this.player.rotation.y));
    let hitAny = false;
    for (const m of this.mobs) {
      if (m.state === "dead") continue;
      const to = m.group.position.clone().sub(this.pos);
      const dist = to.length();
      if (dist > 3.0) continue;
      to.y = 0;
      to.normalize();
      if (fwd.dot(to) > 0.25 || dist < 1.2) {
        this.damageMob(m, this.effAtk() * (0.9 + Math.random() * 0.25), Math.random() < 0.12);
        hitAny = true;
      }
    }
    this.slashEffect(fwd);
    if (!hitAny) this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2, 0)), "miss", "#cbd5e1", 0.8);
  }

  private shoot(color: number, speed: number, range: number, kind: "orb" | "arrow", trailColor: number | null = null): void {
    let best: Mob | null = null;
    let bestD = range;
    for (const m of this.mobs) {
      if (m.state === "dead") continue;
      const d = m.group.position.distanceTo(this.pos);
      if (d < bestD) { bestD = d; best = m; }
    }
    const fwd = new THREE.Vector3(Math.sin(this.player.rotation.y), 0, Math.cos(this.player.rotation.y));
    const geo = kind === "orb" ? new THREE.SphereGeometry(0.22, 8, 8) : new THREE.BoxGeometry(0.08, 0.08, 0.9);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    const start = this.pos.clone().add(new THREE.Vector3(0, 1.4, 0)).add(fwd.clone().multiplyScalar(0.8));
    mesh.position.copy(start);
    if (best) {
      const aim = best.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)).sub(start).normalize();
      mesh.lookAt(start.clone().add(aim));
    } else {
      mesh.lookAt(start.clone().add(fwd));
    }
    this.scene.add(mesh);
    this.projectiles.push({ mesh, target: best, speed, dmg: this.effAtk() * (0.9 + Math.random() * 0.25), life: 2.2, kind, trailColor });
  }

  private damageMob(m: Mob, dmg: number, crit: boolean): void {
    if (m.state === "dead") return;
    const d = Math.max(1, Math.round(dmg * (crit ? 2 : 1)));
    m.hp -= d;
    m.hitFlash = 0.12;
    worldAudio.play(crit ? "crit" : "hit");
    this.drawMobHp(m);
    const p = m.group.position.clone().add(new THREE.Vector3(0, 1.6 * (m.isBoss ? 2.2 : 1), 0));
    this.floatText(p, crit ? `${d}!` : `${d}`, crit ? "#fde047" : "#ffffff", crit ? 1.3 : 1);
    this.burst(p, crit ? 0xfde047 : 0xffffff, crit ? 8 : 4, 2.6, 0.35, 0.07, 4);
    (m.group.children[0] as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    setTimeout(() => {
      if (!this.disposed && m.state !== "dead") {
        (m.group.children[0] as THREE.Mesh).material = new THREE.MeshLambertMaterial({
          color: m.isBoss ? 0xdc2626 : m.isGuard ? 0xfacc15 : MOB_TIERS[m.tier].color,
        });
      }
    }, 90);
    if (m.hp <= 0) this.killMob(m);
  }

  private killMob(m: Mob): void {
    m.state = "dead";
    m.respawnAt = (m.arena || m.event) ? Number.MAX_SAFE_INTEGER : performance.now() + (m.isBoss ? 30000 : 8000);
    const gold = Math.round(m.gold * (0.7 + Math.random() * 0.7));
    // v4: multiplicador de combo calculado antes das esferas
    const nowK = performance.now();
    if (nowK < this.comboUntil) this.combo += 1; else this.combo = 1;
    this.comboUntil = nowK + 4200;
    if (this.combo >= 2) {
      this.opts.onEvent({ type: "combo", n: this.combo });
      worldAudio.play("combo");
    }
    const comboMult = 1 + Math.min(0.5, (this.combo - 1) * 0.1);
    this.spawnOrbs(m.group.position.clone(), gold, m.xp, m.isBoss ? 5 : 3, comboMult);
    this.burst(m.group.position.clone().add(new THREE.Vector3(0, 0.9, 0)), m.isBoss ? 0xdc2626 : m.isGuard ? 0xfacc15 : MOB_TIERS[m.tier].color, m.isBoss ? 40 : 16, 4.5, 0.7, 0.12, 6);
    if (m.isBoss || m.isGuard) this.shake(0.3);
    // v4: loot com raridades
    const loot = rollLoot(m.tier, m.isBoss, m.isGuard, this.opts.level);
    if (loot) this.dropLoot(m.group.position.clone(), loot);
    // v4: contabilidade da arena
    if (m.arena && this.arena.active) {
      this.arena.alive = Math.max(0, this.arena.alive - 1);
      this.arena.kills += 1;
      this.arena.pts += m.pts;
      this.arena.gold += gold;
      this.arena.xp += m.xp;
    }
    // v3: animação de morte (encolher e afundar) em vez de desaparecer
    const g = m.group;
    const t0 = performance.now();
    const baseScale = g.scale.x || 1;
    const anim = () => {
      if (this.disposed) return;
      const t = (performance.now() - t0) / 380;
      if (t >= 1) { g.visible = false; g.scale.setScalar(baseScale); return; }
      const s = baseScale * (1 - t * 0.9);
      g.scale.setScalar(Math.max(0.05, s));
      g.position.y = m.home.y - t * 0.6;
      requestAnimationFrame(anim);
    };
    anim();
    worldAudio.play(m.isBoss ? "death" : "hit");
    this.opts.onEvent({ type: "kill", tier: m.tier, gold, xp: m.xp, pts: m.pts, boss: m.isBoss, guard: m.isGuard, name: m.name, combo: this.combo, comboMult, arena: !!m.arena });
  }

  private spawnOrbs(at: THREE.Vector3, gold: number, xp: number, n: number, mult = 1): void {
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.geoOrb, new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xfbbf24 : 0x4ade80 }));
      mesh.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.6, (Math.random() - 0.5) * 1.4));
      this.scene.add(mesh);
      this.orbs.push({ mesh, t: 0, gold: Math.round(gold / n), xp: Math.round(xp / n), mult, from: mesh.position.clone() });
    }
  }

  // ── v4: LOOT no chão ──────────────────────────────────────

  private dropLoot(at: THREE.Vector3, item: LootItem): void {
    const meta = RARITY_META[item.rarity];
    const g = new THREE.Group();
    const glow = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34),
      new THREE.MeshBasicMaterial({ color: meta.glow, transparent: true, opacity: 0.95 })
    );
    glow.position.y = 0.7;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.16, 1.6, 6),
      new THREE.MeshBasicMaterial({ color: meta.glow, transparent: true, opacity: 0.3, depthWrite: false })
    );
    beam.position.y = 0.8;
    const icon = makeIconSprite(item.emoji);
    icon.scale.set(0.8, 0.8, 1);
    icon.position.y = 1.5;
    const lab = makeTextSprite(`${meta.name} · ${item.name}`, { size: 22, bg: true, accent: meta.color });
    lab.scale.set(3.6, 0.9, 1);
    lab.position.y = 2.3;
    g.add(glow, beam, icon, lab);
    g.position.copy(at);
    this.scene.add(g);
    this.groundLoot.push({ group: g, item, t: 0 });
    worldAudio.play("loot");
    if (item.rarity >= 2) {
      this.ringEffectAt(at, meta.glow, 3.5);
      this.opts.onEvent({ type: "notify", msg: `${item.emoji} ${meta.name} dropou: ${item.name}!`, tone: "good" });
    }
  }

  private updateLoot(dt: number): void {
    for (let i = this.groundLoot.length - 1; i >= 0; i--) {
      const gl = this.groundLoot[i];
      gl.t += dt;
      gl.group.children[0].rotation.y += dt * 2.4;
      gl.group.children[0].position.y = 0.7 + Math.sin(gl.t * 2.6) * 0.12;
      const d = Math.hypot(this.pos.x - gl.group.position.x, this.pos.z - gl.group.position.z);
      if (d < 1.6) {
        // apanhar: efeito + evento para o React
        this.burst(gl.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), RARITY_META[gl.item.rarity].glow, 14, 3, 0.5, 0.08, 4);
        this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.6, 0)), `+ ${gl.item.name}`, RARITY_META[gl.item.rarity].color, 1.05);
        this.opts.onEvent({ type: "loot", item: gl.item });
        this.scene.remove(gl.group);
        this.groundLoot.splice(i, 1);
      }
    }
  }

  // ── v4: PET companheiro ───────────────────────────────────

  setPet(on: boolean): void {
    if (on === this.hasPet) return;
    this.hasPet = on;
    if (on && !this.pet) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0xfde68a })
      );
      const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0x111827 }));
      eye1.position.set(-0.1, 0.08, 0.26);
      const eye2 = eye1.clone();
      eye2.position.x = 0.1;
      const wingGeo = new THREE.ConeGeometry(0.1, 0.34, 4);
      const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
      const w1 = new THREE.Mesh(wingGeo, wingMat);
      w1.rotation.z = Math.PI / 2.4;
      w1.position.set(0.3, 0.14, 0);
      const w2 = new THREE.Mesh(wingGeo, wingMat);
      w2.rotation.z = -Math.PI / 2.4;
      w2.position.set(-0.3, 0.14, 0);
      const light = new THREE.PointLight(0xfde68a, 6, 6);
      g.add(body, eye1, eye2, w1, w2, light);
      this.scene.add(g);
      this.pet = g;
    }
    if (this.pet) this.pet.visible = on;
    if (on) {
      worldAudio.play("pet");
      this.burst(this.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), 0xfde68a, 16, 3, 0.7, 0.08, 3);
    }
  }

  private updatePet(dt: number): void {
    if (!this.pet || !this.hasPet) return;
    this.petT += dt;
    const t = this.petT;
    // orbita suave à volta do herói
    const ox = Math.cos(t * 0.9) * 1.5;
    const oz = Math.sin(t * 0.9) * 1.5;
    const target = new THREE.Vector3(this.pos.x + ox, this.pos.y + 2.5 + Math.sin(t * 2.2) * 0.22, this.pos.z + oz);
    this.pet.position.lerp(target, Math.min(1, dt * 4));
    this.pet.rotation.y += dt * 1.5;
    // asas batem
    const flap = Math.sin(t * 14) * 0.5;
    (this.pet.children[3] as THREE.Mesh).rotation.x = flap;
    (this.pet.children[4] as THREE.Mesh).rotation.x = -flap;
  }

  get hasPetActive(): boolean {
    return this.hasPet;
  }

  /** v4: debug/testes — largar um item lendário aos pés do herói. */
  debugDropLoot(): void {
    const item: LootItem = {
      id: "lt_debug_" + Date.now().toString(36),
      slot: "arma", name: "Lâmina de Teste", emoji: "🗡️",
      rarity: 3, atk: 5, hp: 0, spd: 0,
    };
    this.dropLoot(this.pos.clone(), item);
  }

  /** v4: debug/testes — dispara uma onda de arena sem teletransporte. */
  debugStartArenaHere(): void {
    this.startArena();
  }

  /** v7: debug/testes — força um Acontecimento do Mundo. */
  debugForceEvent(kind: "meteors" | "frenzy" | "swarm" = "meteors"): void {
    if (this.wEvent.kind) this.endWorldEvent(performance.now());
    this.startWorldEvent(kind, performance.now());
  }

  /** v7: debug/testes — simula o roubo de um ITEM (como se outro herói tivesse caído). */
  debugReceiveSteal(): void {
    this.opts.onEvent({
      type: "pvp", action: "steal", victim: "Herói Fantasma", pts: 30, bonus: 0,
      item: {
        id: "lt_steal_" + Date.now().toString(36), slot: "arma",
        name: "Lâmina Roubada", emoji: "🗡️", rarity: 1,
        atk: 6, hp: 0, spd: 0, def: 0,
      },
    });
  }

  /** v7: debug/testes — info do mundo para os testes E2E. */
  debugWorldInfo(): { aurora: boolean; mobs: number; eventMobs: number; trees: number; event: string } {
    let eventMobs = 0;
    for (const m of this.mobs) if (m.event && m.state !== "dead") eventMobs++;
    return {
      aurora: !!this.aurora,
      mobs: this.mobs.length,
      eventMobs,
      trees: this.scene.children.length,
      event: this.wEvent.kind,
    };
  }

  // ── Efeitos ─────────────────────────────────────────────────

  private burst(at: THREE.Vector3, color: number, n: number, speed = 3, life = 0.6, size = 0.09, gravity = 6): void {
    if (this.particles.length > 380) return;
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.geoPart, new THREE.MeshBasicMaterial({ color, transparent: true }));
      mesh.position.copy(at);
      const s = size * (0.6 + Math.random() * 0.9);
      mesh.scale.setScalar(s / 0.09);
      this.scene.add(mesh);
      const a = Math.random() * Math.PI * 2;
      const up = Math.random();
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(a) * speed * (0.3 + Math.random() * 0.7), up * speed * 0.9, Math.sin(a) * speed * (0.3 + Math.random() * 0.7)),
        t: 0, life: life * (0.7 + Math.random() * 0.6), gravity, size: s,
      });
    }
  }

  private shake(amp: number): void {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
  }

  private slashEffect(fwd: THREE.Vector3): void {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.12, 6, 18, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.z = Math.PI / 2;
    ring.position.copy(this.pos).add(new THREE.Vector3(0, 1.2, 0)).add(fwd.multiplyScalar(1));
    this.scene.add(ring);
    const t0 = performance.now();
    const anim = () => {
      if (this.disposed) { this.scene.remove(ring); return; }
      const t = (performance.now() - t0) / 220;
      if (t >= 1) { this.scene.remove(ring); return; }
      ring.scale.setScalar(1 + t * 0.8);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - t);
      requestAnimationFrame(anim);
    };
    anim();
  }

  private ringEffect(color: number, radius: number): void {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.4, 0.16, 6, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(this.pos).add(new THREE.Vector3(0, 0.5, 0));
    this.scene.add(ring);
    const t0 = performance.now();
    const anim = () => {
      if (this.disposed) { this.scene.remove(ring); return; }
      const t = (performance.now() - t0) / 420;
      if (t >= 1) { this.scene.remove(ring); return; }
      ring.scale.setScalar(1 + t * 2.2);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
      requestAnimationFrame(anim);
    };
    anim();
  }

  private ringEffectAt(at: THREE.Vector3, color: number, radius: number): void {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.5, 0.1, 6, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(at);
    this.scene.add(ring);
    const t0 = performance.now();
    const anim = () => {
      if (this.disposed) { this.scene.remove(ring); return; }
      const t = (performance.now() - t0) / 300;
      if (t >= 1) { this.scene.remove(ring); return; }
      ring.scale.setScalar(1 + t * 1.6);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
      requestAnimationFrame(anim);
    };
    anim();
  }

  private floatText(at: THREE.Vector3, text: string, color: string, scale = 1): void {
    const spr = makeTextSprite(text, { size: 44, color });
    spr.scale.set(1.7 * scale, 0.42 * scale, 1);
    spr.position.copy(at);
    this.scene.add(spr);
    this.floats.push({ sprite: spr, t: 0, life: 0.95 });
  }

  // ── Interação com objetos ───────────────────────────────────

  interact(): void {
    if (!this.near) return;
    const it = this.near;
    if (it.kind === "voucher") {
      if (it.used) {
        this.opts.onEvent({ type: "notify", msg: "Este baú já foi aberto — procura outro!", tone: "info" });
        return;
      }
      it.used = true;
      worldAudio.play("chest");
      if (it.lid) {
        const lid = it.lid;
        const t0 = performance.now();
        const anim = () => {
          if (this.disposed) return;
          const t = Math.min(1, (performance.now() - t0) / 350);
          lid.rotation.x = -1.25 * t;
          if (t < 1) requestAnimationFrame(anim);
        };
        anim();
      }
      if (it.icon) it.icon.visible = false;
      this.opts.onEvent({ type: "open", kind: "voucher", id: it.id });
      this.opts.onEvent({ type: "quest", kind: "chest" });
    } else if (it.kind === "fountain") {
      this.hp = this.opts.stats.maxHp;
      worldAudio.play("heal");
      this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
      this.opts.onEvent({ type: "notify", msg: "⛲ Vida restaurada pela Fonte da Vida!", tone: "good" });
      this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0x34d399, 18, 3, 0.7, 0.1, 3);
    } else if (it.kind === "bank") {
      this.opts.onEvent({ type: "open", kind: "bank", id: "bank" });
    } else if (it.kind === "arena") {
      if (this.arena.active) {
        this.endArena("quit");
      } else {
        this.opts.onEvent({ type: "open", kind: "arena", id: "arena" });
      }
    } else {
      if (it.kind !== "games") this.opts.onEvent({ type: "quest", kind: "visit" });
      this.opts.onEvent({ type: "open", kind: it.kind, id: it.id });
    }
    this.near = null;
    this.opts.onEvent({ type: "near", label: null });
  }

  resetChest(id: string): void {
    const it = this.interactables.find((i) => i.id === id);
    if (it) { it.used = false; if (it.icon) it.icon.visible = true; }
  }

  // ── API pública para o React ────────────────────────────────

  syncStats(stats: EngineStats, level: number): void {
    this.opts.stats = stats;
    this.opts.level = level;
    if (this.hp > stats.maxHp) this.hp = stats.maxHp;
    // atualizar etiqueta de nome com o novo nível
    const tag = this.player.children.find((c) => c.name === "nameTag") as THREE.Sprite | undefined;
    if (tag) {
      const wantText = `${this.opts.name} · Nv${level}`;
      if ((tag as any).__txt !== wantText) {
        (tag as any).__txt = wantText;
        const nm = makeTextSprite(wantText, { size: 30, bg: true });
        tag.material.dispose();
        tag.material = nm.material;
      }
    }
  }

  healFull(): void {
    this.hp = this.opts.stats.maxHp;
    this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
  }

  getMinimap(): {
    px: number; pz: number; yaw: number;
    mobs: { x: number; z: number; t: number }[];
    pois: { x: number; z: number; k: string }[];
    players: { x: number; z: number }[];
    marks: { id: string; x: number; z: number; found: boolean }[];
    buildings: { x: number; z: number; visited: boolean }[];
  } {
    return {
      px: this.pos.x, pz: this.pos.z, yaw: this.camYaw,
      mobs: this.mobs.filter((m) => m.state !== "dead").map((m) => ({ x: m.group.position.x, z: m.group.position.z, t: m.tier })),
      pois: [
        { x: 0, z: -52, k: "raffle" }, { x: 52, z: 0, k: "asset" },
        { x: -52, z: 0, k: "contest" }, { x: 0, z: 52, k: "voucher" }, { x: 8, z: 8, k: "games" },
        { x: -14, z: -14, k: "bank" }, { x: 112, z: 0, k: "arena" },
      ],
      players: [...this.remotes.values()].map((r) => ({ x: r.group.position.x, z: r.group.position.z })),
      marks: LANDMARKS.map((l) => ({ id: l.id, x: l.x, z: l.z, found: this.discovered.has(l.id) })),
      buildings: this.buildings.map((b) => ({ x: b.cx, z: b.cz, visited: this.insideSeen.has(b.id) })),
    };
  }

  // ── Descobertas ─────────────────────────────────────────────

  private checkDiscoveries(t: number): void {
    if (t < this.discoverCheckT) return;
    this.discoverCheckT = t + 500;
    for (const l of LANDMARKS) {
      if (this.discovered.has(l.id)) continue;
      if (Math.hypot(this.pos.x - l.x, this.pos.z - l.z) <= l.r) {
        this.discovered.add(l.id);
        worldAudio.play("discover");
        this.discoverFx();
        this.opts.onEvent({ type: "discover", id: l.id, name: l.name, emoji: l.emoji, xp: 60 });
      }
    }
    // v6: entrada numa nova região — banner com nome e significado
    const reg = this.currentRegion();
    if (reg.id !== this.lastRegion) {
      const first = this.lastRegion === "";
      this.lastRegion = reg.id;
      if (!first) {
        worldAudio.play("region");
        this.opts.onEvent({ type: "region", id: reg.id, name: reg.name, desc: reg.desc, emoji: "🗺️" });
      }
    }
  }

  // ── Loop ────────────────────────────────────────────────────

  private isMoving(): boolean {
    return this.keys.has("w") || this.keys.has("arrowup") || this.keys.has("s") || this.keys.has("arrowdown") ||
      this.keys.has("a") || this.keys.has("arrowleft") || this.keys.has("d") || this.keys.has("arrowright") ||
      Math.abs(this.joy.x) > 0.1 || Math.abs(this.joy.y) > 0.1;
  }

  private loop = (t: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;

    this.updatePlayer(dt);
    this.updateBuildings(dt); // v8: portas, telhados, zona segura
    this.updateMobs(t, dt);
    this.updateProjectiles(dt);
    this.updateOrbs(dt);
    this.updateParticles(dt);
    this.updateFloats(dt);
    this.updateInteractables(t);
    this.updateRemotes(dt);
    this.updateDayNight(t, dt);
    this.updateSkyV3(t, dt);
    this.updateHeroV3(dt);
    this.updatePet(dt);
    this.updateLoot(dt);
    this.updateArena(t);
    this.updateWorldEvent(t, dt);
    this.updateCamera(dt);
    this.checkDiscoveries(t);

    for (let i = 0; i < 3; i++) this.skillCds[i] = Math.max(0, this.skillCds[i] - dt);
    this.atkCd = Math.max(0, this.atkCd - dt);

    // v8: culling de rótulos/ícones distantes — visão limpa
    this.cullT += dt;
    if (this.cullT > 0.4) {
      this.cullT = 0;
      for (const c of this.cullables) c.spr.visible = Math.hypot(this.pos.x - c.x, this.pos.z - c.z) < 58;
    }

    // regeneração fora de combate + círculo de cura
    const now = performance.now();
    if (!this.dead && t - this.lastHitAt > 5000 && this.hp < this.opts.stats.maxHp) {
      this.hp = Math.min(this.opts.stats.maxHp, this.hp + this.opts.stats.maxHp * 0.06 * dt);
      this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
    }
    if (!this.dead && now < this.hotUntil) {
      this.hotTick += dt;
      if (this.hotTick >= 1) {
        this.hotTick = 0;
        const heal = Math.round(this.opts.stats.maxHp * 0.05);
        if (this.hp < this.opts.stats.maxHp) {
          this.hp = Math.min(this.opts.stats.maxHp, this.hp + heal);
          this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
          this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), `+${heal}`, "#34d399", 0.85);
        }
      }
    }
    // Fonte da Vida: cura passiva por proximidade
    if (!this.dead && Math.hypot(this.pos.x - 14, this.pos.z - (-14)) < 5 && this.hp < this.opts.stats.maxHp) {
      this.hp = Math.min(this.opts.stats.maxHp, this.hp + this.opts.stats.maxHp * 0.04 * dt);
      this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
    }

    this.renderFrame();
  };

  /** Renderiza um frame (composer quando disponível). */
  private renderFrame(): void {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  // ── v4: atualização da arena ─────────────────────────────

  private updateArena(t: number): void {
    if (!this.arena.active) return;
    // sair da arena pelo limite
    const d = Math.hypot(this.pos.x - ARENA_CENTER.x, this.pos.z - ARENA_CENTER.z);
    if (d > ARENA_RADIUS + 8) { this.endArena("exit"); return; }
    if (this.arena.cooldown) {
      if (t >= this.arena.nextWaveAt) this.arenaNextWave();
    } else if (this.arena.alive <= 0 && this.arena.wave > 0) {
      // onda limpa — recompensa e prepara a próxima
      const bonusPts = 5 + this.arena.wave * 3;
      const bonusGold = 60 + this.arena.wave * 40;
      this.arena.pts += bonusPts;
      this.arena.gold += bonusGold;
      this.arena.cooldown = true;
      this.arena.nextWaveAt = t + 2600;
      if (this.arenaRing) (this.arenaRing.material as THREE.MeshBasicMaterial).color.setHex(0x4ade80);
      this.ringEffectAt(ARENA_CENTER.clone(), 0x4ade80, 9);
      this.opts.onEvent({ type: "arena", action: "cleared", wave: this.arena.wave, pts: bonusPts, gold: bonusGold });
    } else if (this.arena.wave === 0 && t >= this.arena.nextWaveAt) {
      this.arenaNextWave();
    }
  }

  // ── v7: ACONTECIMENTOS DO MUNDO (intensidade + viralidade) ─

  private static EVENT_META: Record<string, { name: string; emoji: string; desc: string; dur: number }> = {
    meteors: { name: "Chuva de Meteoros", emoji: "☄️", desc: "Meteoros caem do céu! Desvia... ou apanha os orbes de riqueza!", dur: 60000 },
    frenzy: { name: "Frenesi de Roubos", emoji: "💸", desc: "Todo o roubo em PvP rende +25 pts bónus! Caça outros heróis AGORA!", dur: 90000 },
    swarm: { name: "Enxame de Elite", emoji: "🐜", desc: "Bugs de elite cercaram-te — recompensas DUPLICADAS!", dur: 75000 },
  };

  private startWorldEvent(kind: "meteors" | "frenzy" | "swarm", t: number): void {
    const meta = WorldEngine.EVENT_META[kind];
    this.wEvent.kind = kind;
    this.wEvent.until = t + meta.dur;
    this.wEvent.next = t + meta.dur + 120000 + Math.random() * 180000;
    this.opts.onEvent({ type: "worldevent", kind, name: meta.name, emoji: meta.emoji, desc: meta.desc, dur: meta.dur });
    worldAudio.play("event");
    if (kind === "swarm") {
      // 5 bugs de elite x2 perto do herói
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
        const rr = 9 + Math.random() * 5;
        const x = Math.max(-220, Math.min(220, this.pos.x + Math.cos(a) * rr));
        const z = Math.max(-220, Math.min(220, this.pos.z + Math.sin(a) * rr));
        this.spawnMob(2, x, z);
        const m = this.mobs[this.mobs.length - 1];
        m.event = true;
        m.xp *= 2; m.gold *= 2; m.pts *= 2;
      }
      this.ringEffect(0xf43f5e, 7);
    }
    if (kind === "meteors") this.meteorTimer = 600;
  }

  private endWorldEvent(t: number): void {
    const kind = this.wEvent.kind;
    const meta = WorldEngine.EVENT_META[kind];
    this.wEvent.kind = "";
    this.wEvent.until = 0;
    this.opts.onEvent({ type: "worldeventend", kind, name: meta?.name || "" });
    if (kind === "swarm") {
      // remove mobs de evento vivos (escondem-se; mortos já não renascem)
      for (const m of this.mobs) {
        if (m.event && m.state !== "dead") {
          m.state = "dead";
          m.respawnAt = Number.MAX_SAFE_INTEGER;
          m.group.visible = false;
        }
      }
    }
    // limpa meteoros pendentes
    for (const me of this.meteors) {
      this.scene.remove(me.ring);
      this.scene.remove(me.spr);
    }
    this.meteors = [];
    void t;
  }

  private updateWorldEvent(t: number, dt: number): void {
    const w = this.wEvent;
    if (w.kind) {
      if (t >= w.until) { this.endWorldEvent(t); return; }
      if (w.kind === "meteors") {
        this.meteorTimer -= dt * 1000;
        if (this.meteorTimer <= 0) {
          this.meteorTimer = 1300 + Math.random() * 900;
          const a = Math.random() * Math.PI * 2;
          const rr = 4 + Math.random() * 13;
          const x = this.pos.x + Math.cos(a) * rr;
          const z = this.pos.z + Math.sin(a) * rr;
          const ring = new THREE.Mesh(
            new THREE.CircleGeometry(2.3, 20),
            new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
          );
          ring.rotateX(-Math.PI / 2);
          ring.position.set(x, groundY(x, z) + 0.08, z);
          this.scene.add(ring);
          const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.meteorTex, transparent: true, depthWrite: false }));
          spr.scale.setScalar(2.6);
          spr.position.set(x, groundY(x, z) + 42, z);
          this.scene.add(spr);
          this.meteors.push({ x, z, t0: t + 1250, ring, spr, hit: false });
        }
        // atualiza quedas
        for (let i = this.meteors.length - 1; i >= 0; i--) {
          const me = this.meteors[i];
          const k = 1 - (me.t0 - t) / 1250;
          if (k < 1) {
            const gy = groundY(me.x, me.z);
            me.spr.position.set(me.x, gy + 42 * (1 - k), me.z);
            (me.ring.material as THREE.MeshBasicMaterial).opacity = 0.25 + k * 0.55;
            me.ring.scale.setScalar(0.5 + k * 0.6);
          } else if (!me.hit) {
            // IMPACTO
            me.hit = true;
            const at = new THREE.Vector3(me.x, groundY(me.x, me.z) + 0.5, me.z);
            this.burst(at, 0xf97316, 26, 6, 0.8, 0.14, 8);
            this.burst(at, 0xfde047, 12, 4.5, 0.6, 0.1, 6);
            this.spawnOrbs(at, 14 + Math.floor(Math.random() * 18), 18 + Math.floor(Math.random() * 22), 3, 2);
            this.shake(0.35);
            worldAudio.play("boom");
            const dP = Math.hypot(this.pos.x - me.x, this.pos.z - me.z);
            // v8: dentro de uma casa o telhado protege dos meteoros
            if (!this.dead && !this.curInside && dP < 2.8 && performance.now() > this.invulnUntil) {
              const dmg = Math.round(this.opts.stats.maxHp * 0.08);
              this.hp -= dmg;
              this.lastHitAt = performance.now();
              this.drawPlayerHpEvent(dmg, "Meteoro ☄️");
              if (this.hp <= 0) {
                this.dead = true;
                this.opts.onEvent({ type: "death", by: "Chuva de Meteoros" });
              }
            }
          } else {
            this.scene.remove(me.ring);
            this.scene.remove(me.spr);
            this.meteors.splice(i, 1);
          }
        }
      }
    } else if (t >= w.next) {
      const kinds: ("meteors" | "frenzy" | "swarm")[] = ["meteors", "frenzy", "swarm"];
      this.startWorldEvent(kinds[Math.floor(Math.random() * kinds.length)], t);
    }
  }

  private meteorTex!: THREE.SpriteMaterial["map"];

  private updatePlayer(dt: number): void {
    const k = this.keys;
    let ix = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
    let iy = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    ix += this.joy.x;
    iy += -this.joy.y;
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }

    const speed = (4 + this.opts.stats.spd * 0.35) * (this.dead ? 0 : 1) * (this.guarding ? 0.45 : 1);
    const fwd = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = new THREE.Vector3(fwd.z * -1, 0, fwd.x);
    const move = new THREE.Vector3()
      .addScaledVector(fwd, iy)
      .addScaledVector(right, ix);

    if (move.lengthSq() > 0.001 && !this.dead) {
      move.normalize();
      this.pos.addScaledVector(move, speed * dt);
      const targetRy = Math.atan2(move.x, move.z);
      let diff = targetRy - this.player.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.player.rotation.y += diff * Math.min(1, dt * 12);
      this.moveDirFace.copy(move);
      this.bob += dt * 10;
      // poeira ao correr
      this.dustTimer += dt;
      if (this.dustTimer > 0.22 && this.onGround) {
        this.dustTimer = 0;
        this.burst(this.pos.clone(), 0xcbb99a, 2, 0.9, 0.4, 0.06, 1.5);
      }
    }

    // limite do mundo
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > WORLD_RADIUS) {
      this.pos.x *= WORLD_RADIUS / r;
      this.pos.z *= WORLD_RADIUS / r;
    }

    // v8: colisão com as paredes dos edifícios
    this.collideWalls();

    // gravidade / salto
    const gy = this.groundHeightAt(this.pos.x, this.pos.z);
    if (!this.onGround) {
      this.vy -= 16 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= gy) {
        this.pos.y = gy; this.vy = 0; this.onGround = true;
        this.landSquash = 1; // v3: squash ao aterrar
        this.burst(this.pos.clone(), 0xcbb99a, 4, 1.4, 0.4, 0.06, 2);
      }
    } else {
      this.pos.y = gy;
    }

    this.player.position.copy(this.pos);
    if (this.onGround && move.lengthSq() > 0.001) {
      this.player.position.y += Math.abs(Math.sin(this.bob)) * 0.06;
    }
    this.playerShadow.position.set(this.pos.x, gy + 0.03, this.pos.z);
  }

  private updateMobs(t: number, dt: number): void {
    const now = performance.now();
    for (const m of this.mobs) {
      if (m.state === "dead") {
        if (t >= m.respawnAt) {
          m.state = "idle";
          m.hp = m.maxHp;
          m.group.visible = true;
          m.group.position.copy(m.home);
          this.drawMobHp(m);
        }
        continue;
      }
      m.bob += dt * 4;
      const gp = m.group.position;
      const distP = Math.hypot(this.pos.x - gp.x, this.pos.z - gp.z);
      const aggro = m.arena ? 200 : m.isBoss ? 13 : m.isGuard ? 10 : 8.5;
      const spd = now < m.slowUntil ? m.speed * 0.4 : m.speed;

      // v8: barra de HP só quando faz falta (ferido/aggro e perto) — visão limpa
      m.hpBar.visible = (m.hp < m.maxHp || m.state === "chase") && distP < 18;

      if (m.state === "idle") {
        if (m.arena) {
          // mobs da arena nascem já agressivos
          m.state = "chase";
        } else if (distP < aggro && !this.dead && !this.curInside && Math.hypot(this.pos.x, this.pos.z) > (m.isGuard ? 12 : PVP_SAFE_RADIUS)) {
          m.state = "chase";
          // v3: anel de aviso + som quando o inimigo te nota
          this.ringEffectAt(m.group.position.clone().add(new THREE.Vector3(0, 0.15, 0)), m.isBoss ? 0xdc2626 : 0xf97316, m.isBoss ? 4.5 : 2.8);
          if (m.isBoss) { worldAudio.play("boss"); this.opts.onEvent({ type: "notify", msg: `👑 ${m.name} reparou em ti!`, tone: "bad" }); }
        } else if (t > m.nextThink) {
          m.nextThink = t + 2200 + Math.random() * 2600;
          m.target.copy(m.home).add(new THREE.Vector3((Math.random() - 0.5) * 7, 0, (Math.random() - 0.5) * 7));
        }
      }

      if (m.state === "chase") {
        // v8: o herói entrou numa casa — os bugs não entram (zona segura)
        if (!m.arena && this.curInside) {
          m.state = "return";
        } else if (!m.arena && (this.dead || distP > aggro + 9 || Math.hypot(gp.x, gp.z) < (m.isGuard ? 13 : 20))) {
          m.state = "return";
        } else if (distP < 1.7) {
          // atacar
          if (now < m.stunUntil) { /* atordoado */ }
          else {
            m.atkCd -= dt;
            if (m.atkCd <= 0) {
              m.atkCd = 1.4;
              this.hurtPlayer(m.atk * (0.8 + Math.random() * 0.4), m);
            }
          }
        } else if (now >= m.stunUntil) {
          const dir = new THREE.Vector3(this.pos.x - gp.x, 0, this.pos.z - gp.z).normalize();
          gp.x += dir.x * spd * dt;
          gp.z += dir.z * spd * dt;
          m.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
      }

      if (m.state === "return") {
        const dir = new THREE.Vector3(m.home.x - gp.x, 0, m.home.z - gp.z);
        if (dir.length() < 0.5) { m.state = "idle"; m.hp = m.maxHp; this.drawMobHp(m); }
        else {
          dir.normalize();
          gp.x += dir.x * spd * dt;
          gp.z += dir.z * spd * dt;
          m.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
      }

      if (m.state === "idle") {
        const dir = new THREE.Vector3(m.target.x - gp.x, 0, m.target.z - gp.z);
        if (dir.length() > 0.4) {
          dir.normalize();
          gp.x += dir.x * spd * 0.45 * dt;
          gp.z += dir.z * spd * 0.45 * dt;
          m.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
      }

      gp.y = groundY(gp.x, gp.z);
      m.group.children[0].position.y = 0.75 + Math.abs(Math.sin(m.bob)) * 0.12;
    }
  }

  private hurtPlayer(rawDmg: number, m: Mob): void {
    if (this.dead || performance.now() < this.invulnUntil) return;
    // v8: ZONA SEGURA — dentro de um edifício os bugs não conseguem ferir
    // (jogadores em PvP continuam a poder — receivePvpHit é separado)
    if (this.curInside) return;
    // v6: DEFESA — def reduz o dano (3% por ponto, máx 60%);
    // o modo GUARDA bloqueia +40% extra (máx total 78%)
    const defPct = Math.min(0.6, (this.opts.stats.def || 0) * 0.03);
    const guardPct = this.guarding ? 0.4 : 0;
    const mitig = Math.min(0.78, defPct + guardPct);
    const dmg = Math.max(1, Math.round(rawDmg * 0.9 * (1 - mitig)));
    this.hp -= dmg;
    this.lastHitAt = performance.now();
    if (this.guarding) {
      // golpe absorvido pelo escudo — clang dourado + faísca
      worldAudio.play("block");
      this.guardFlash = 1;
      this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), mitig >= 0.5 ? "BLOQUEADO!" : "BLOQUEADO", "#fde68a", 1.15);
      this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.3, 0)), 0xfde68a, 6, 1.4, 0.8, 0.05, 2.2);
    } else {
      worldAudio.play("hurt");
    }
    this.opts.onEvent({ type: "hp", hp: Math.max(0, this.hp), maxHp: this.opts.stats.maxHp, hit: true, blocked: this.guarding });
    this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), `-${dmg}`, this.guarding ? "#fbbf24" : "#f87171", 1.1);
    this.shake(0.1);
    if (this.hp <= 0) {
      this.dead = true;
      this.shake(0.4);
      worldAudio.play("death");
      // v4: morte na arena termina a sessão de ondas
      if (this.arena.active) this.endArena("death");
      this.opts.onEvent({ type: "death", by: m.name });
      setTimeout(() => {
        if (this.disposed) return;
        this.pos.set(0, groundY(0, 6), 6);
        this.hp = this.opts.stats.maxHp;
        this.dead = false;
        this.invulnUntil = performance.now() + 3000;
        this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
        this.opts.onEvent({ type: "notify", msg: "De volta à Praça Bateu! Cuidado com os bugs.", tone: "info" });
      }, 1400);
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.target && p.target.state === "dead") p.target = null;
      const dest = p.target
        ? p.target.group.position.clone().add(new THREE.Vector3(0, 0.8, 0))
        : p.mesh.position.clone().add(p.mesh.getWorldDirection(new THREE.Vector3()));
      const dir = dest.sub(p.mesh.position);
      const dist = dir.length();
      if (p.target && dist < 1.2) {
        this.damageMob(p.target, p.dmg, Math.random() < 0.12);
        if (p.kind === "orb") this.ringEffectAt(p.mesh.position, 0xff7b00, 1.4);
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || (!p.target && dist > 30)) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }
      dir.normalize();
      p.mesh.position.addScaledVector(dir, p.speed * dt);
      p.mesh.lookAt(p.mesh.position.clone().add(dir));
      if (p.trailColor !== null && Math.random() < 0.55 && this.particles.length < 380) {
        this.burst(p.mesh.position.clone(), p.trailColor, 1, 0.3, 0.3, 0.055, 0.5);
      }
    }
  }

  private updateOrbs(dt: number): void {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.t += dt * 2.2;
      if (o.t >= 1) {
        this.opts.onEvent({ type: "gain", gold: o.gold, xp: Math.round(o.xp * o.mult) });
        worldAudio.play("coin");
        this.burst(o.mesh.position.clone(), 0xfbbf24, 3, 1.2, 0.3, 0.05, 2);
        this.scene.remove(o.mesh);
        this.orbs.splice(i, 1);
        continue;
      }
      const dest = this.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
      o.mesh.position.lerpVectors(o.from, dest, smooth01(o.t));
      o.mesh.position.y += Math.sin(o.t * Math.PI) * 0.6;
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt;
      if (p.t >= p.life) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const fade = 1 - p.t / p.life;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = fade;
      p.mesh.scale.setScalar(Math.max(0.05, (p.size / 0.09) * fade));
    }
  }

  private updateFloats(dt: number): void {
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      if (f.t >= f.life) {
        this.scene.remove(f.sprite);
        (f.sprite.material as THREE.SpriteMaterial).map?.dispose();
        this.floats.splice(i, 1);
        continue;
      }
      f.sprite.position.y += dt * 1.4;
      (f.sprite.material as THREE.SpriteMaterial).opacity = 1 - f.t / f.life;
    }
  }

  private updateInteractables(t: number): void {
    let best: Interactable | null = null;
    let bestD = 3.4;
    for (const it of this.interactables) {
      if (it.icon && it.kind !== "voucher") {
        it.icon.position.y = (it.kind === "raffle" ? 3.6 : it.kind === "bank" ? 3.9 : it.kind === "fountain" ? 3.6 : 2.1) + Math.sin(t / 400 + it.pos.x) * 0.18;
      }
      const d = Math.hypot(this.pos.x - it.pos.x, this.pos.z - it.pos.z);
      if (d < bestD) { bestD = d; best = it; }
    }
    // v6: perto de um MARCO? — mostra nome + significado (descobertos)
    let lmLabel: string | null = null;
    for (const l of LANDMARKS) {
      if (!this.discovered.has(l.id)) continue;
      const d = Math.hypot(this.pos.x - l.x, this.pos.z - l.z);
      if (d <= Math.max(9, l.r * 0.8)) { lmLabel = `${l.emoji} ${l.name} — ${l.desc}`; break; }
    }
    const nearChanged = best !== this.near || lmLabel !== this.nearLm;
    if (nearChanged) {
      this.near = best;
      this.nearLm = lmLabel;
      this.opts.onEvent({ type: "near", label: best ? best.label : lmLabel });
    } else if (this.near && lmLabel) {
      // interativo tem prioridade sobre o marco
      this.opts.onEvent({ type: "near", label: best ? best.label : lmLabel });
    }
  }

  // ── v6: Waypoint, bússola, mapa e regiões ──────────────────

  /** Marca um destino no mundo (do mapa grande). Feixe vertical visível. */
  setWaypoint(x: number, z: number): void {
    this.waypoint = new THREE.Vector3(x, 0, z);
    if (!this.waypointBeam) {
      const g = new THREE.Group();
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.55, 26, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
      );
      beam.position.y = 13;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.5, 24),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.15;
      g.add(beam, ring);
      g.visible = false;
      this.scene.add(g);
      this.waypointBeam = g;
    }
    const gy = groundY(x, z);
    this.waypointBeam.position.set(x, gy, z);
    this.waypointBeam.visible = true;
    worldAudio.play("waypoint");
    this.opts.onEvent({ type: "notify", msg: "🧭 Destino marcado no mapa — segue a bússola!", tone: "info" });
  }

  clearWaypoint(): void {
    this.waypoint = null;
    if (this.waypointBeam) this.waypointBeam.visible = false;
  }

  getWaypoint(): { x: number; z: number } | null {
    return this.waypoint ? { x: this.waypoint.x, z: this.waypoint.z } : null;
  }

  /** Bússola: ângulo relativo à câmara (0=frente) + distância ao destino. */
  getCompass(): { angle: number; dist: number } | null {
    if (!this.waypoint) return null;
    const dx = this.waypoint.x - this.pos.x;
    const dz = this.waypoint.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 4) return { angle: 0, dist: 0 };
    const worldAng = Math.atan2(dx, dz);
    // camYaw roda a vista; subtrair para dar ângulo relativo ao ecrã
    const rel = worldAng - this.camYaw + Math.PI;
    return { angle: rel, dist };
  }

  /** Região atual pela posição (a mais próxima cujo centro cobre o jogador). */
  currentRegion(): RegionDef {
    let best = REGIONS[0];
    let bestD = Infinity;
    for (const r of REGIONS) {
      const d = Math.hypot(this.pos.x - r.cx, this.pos.z - r.cz);
      const eff = d - r.r;
      if (eff < bestD) { bestD = eff; best = r; }
    }
    return best;
  }

  /** Dados para o MAPA GRANDE (posições vivas — marcos vêm dos exports). */
  getMapData(): {
    px: number; pz: number; yaw: number;
    players: { x: number; z: number }[];
    region: string;
    waypoint: { x: number; z: number } | null;
    mobs: { x: number; z: number; t: number }[];
  } {
    const reg = this.currentRegion();
    return {
      px: this.pos.x, pz: this.pos.z, yaw: this.camYaw,
      players: [...this.remotes.values()].map((r) => ({ x: r.group.position.x, z: r.group.position.z })),
      region: reg.id,
      waypoint: this.waypoint ? { x: this.waypoint.x, z: this.waypoint.z } : null,
      mobs: this.mobs.filter((m) => m.state !== "dead" && !m.arena).slice(0, 90).map((m) => ({ x: m.group.position.x, z: m.group.position.z, t: m.tier })),
    };
  }

  private updateRemotes(dt: number): void {
    const now = performance.now();
    for (const [id, r] of this.remotes) {
      if (now - r.lastSeen > 45000) {
        this.remoteGroup.remove(r.group);
        this.remotes.delete(id);
        continue;
      }
      const g = r.group;
      g.position.x = lerp(g.position.x, r.target.x, Math.min(1, dt * 6));
      g.position.z = lerp(g.position.z, r.target.z, Math.min(1, dt * 6));
      g.position.y = groundY(g.position.x, g.position.z);
      let diff = r.targetRy - g.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * Math.min(1, dt * 8);
      // v5: animação de caminhada + emote dos avatares remotos
      if (r.parts) {
        if (r.moving) r.walkT += dt * 10;
        animateAvatar(r.parts, r.walkT, r.moving, 0, now);
      }
      if (r.emoteSpr && now > r.emoteUntil) {
        r.group.remove(r.emoteSpr);
        r.emoteSpr = null;
      }
    }
  }

  private updateDayNight(t: number, dt: number): void {
    const phase = (t % DAY_LEN) / DAY_LEN; // 0..1
    const dayAmt = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2); // 1=meio-dia, 0=meia-noite
    // v4: paleta em 4 fases (dia / entardecer / noite / amanhecer)
    const cNoon = new THREE.Color(0x9fd7f2);
    const cDusk = new THREE.Color(0xf0b98d);
    const cNight = new THREE.Color(0x101a33);
    const cDawn = new THREE.Color(0xe4d5e2);
    const sky = new THREE.Color();
    if (dayAmt > 0.55) {
      sky.copy(cDusk).lerp(cNoon, smooth01((dayAmt - 0.55) / 0.45));
    } else if (dayAmt > 0.3) {
      sky.copy(cNight).lerp(cDusk, smooth01((dayAmt - 0.3) / 0.25));
    } else {
      // entre noite funda e amanhecer rosado
      const dawnW = Math.max(0, Math.sin((0.5 - Math.abs(dayAmt - 0.24) * 6)) * 0.5 + 0.5);
      sky.copy(cNight).lerp(cDawn, smooth01(dawnW * 0.5) * smooth01((dayAmt + 0.15) / 0.3));
    }
    this.scene.background = sky;
    (this.scene.fog as THREE.FogExp2).color.copy(sky);
    this.hemi.intensity = 0.35 + dayAmt * 0.65;
    this.sun.intensity = 0.25 + dayAmt * 0.95;
    // luz do sol aquecida ao entardecer
    this.sun.color.setHex(dayAmt < 0.55 && dayAmt > 0.2 ? 0xffb27a : 0xfff3d6);
    const ang = phase * Math.PI * 2;
    this.sun.position.set(Math.cos(ang) * 80, 30 + dayAmt * 60, Math.sin(ang) * 80);
    // v3: sol e lua seguem o ciclo
    if (this.sunSpr) {
      this.sunSpr.position.set(this.pos.x + Math.cos(ang) * 180, 40 + dayAmt * 130, this.pos.z + Math.sin(ang) * 180);
      (this.sunSpr.material as THREE.SpriteMaterial).opacity = Math.max(0.15, dayAmt);
    }
    if (this.moonSpr) {
      this.moonSpr.position.set(this.pos.x - Math.cos(ang) * 180, 40 + (1 - dayAmt) * 130, this.pos.z - Math.sin(ang) * 180);
      (this.moonSpr.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - dayAmt * 1.6);
    }
    // v3: estrelas aparecem ao anoitecer
    if (this.stars) {
      (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - dayAmt * 1.8);
      this.stars.rotation.y = t * 0.00002;
    }
    // v7: AURORA BOREAL — só à noite, dança lentamente
    if (this.aurora) {
      const nightF = Math.max(0, 1 - dayAmt * 1.9);
      this.aurora.position.set(this.pos.x, 0, this.pos.z);
      this.aurora.rotation.y = Math.sin(t * 0.00003) * 0.4;
      this.aurora.children.forEach((band, i) => {
        ((band as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = nightF * (0.16 + Math.sin(t * 0.0004 + i * 2.1) * 0.08);
        band.position.y = 95 + i * 26 + Math.sin(t * 0.00025 + i) * 6;
      });
    }
    // v7: nuvens tingidas pelo céu (rosadas ao entardecer, escuras à noite)
    if (this.cloudMat) {
      const tint = new THREE.Color().copy(sky).lerp(new THREE.Color(0xffffff), 0.45);
      if (dayAmt < 0.2) tint.multiplyScalar(0.42);
      this.cloudMat.color.lerp(tint, 0.04);
    }
    // v7: fogueira do acampamento brilha mais à noite
    if (this.campfireLight) this.campfireLight.intensity = (10 + Math.sin(t * 0.011) * 4 + Math.sin(t * 0.037) * 3) * (1.35 - dayAmt * 0.7);
    // v3: domo do céu acompanha o jogador (dá sensação de infinito)
    if (this.skyDome) {
      this.skyDome.position.set(this.pos.x, 0, this.pos.z);
      const u = (this.skyDome.material as THREE.ShaderMaterial).uniforms;
      u.top.value.copy(sky).lerp(new THREE.Color(0x1b4c8c), dayAmt * 0.7);
      u.mid.value.copy(sky);
      u.bot.value.copy(sky).lerp(new THREE.Color(0xffffff), 0.18);
    }
    // v4: estrelas cadentes à noite
    for (const s of this.shootStars) {
      if (!s.active) {
        if (dayAmt < 0.25 && t > s.next) {
          s.active = true;
          s.t = 0;
          s.dur = 0.9 + Math.random() * 0.6;
          const a = Math.random() * Math.PI * 2;
          s.from.set(this.pos.x + Math.cos(a) * 120, 90 + Math.random() * 40, this.pos.z + Math.sin(a) * 120);
          s.to.copy(s.from).add(new THREE.Vector3((Math.random() - 0.5) * 90, -40 - Math.random() * 25, (Math.random() - 0.5) * 90));
          s.next = t + 4000 + Math.random() * 9000;
        }
        continue;
      }
      s.t += dt;
      const k = s.t / s.dur;
      if (k >= 1) { s.active = false; (s.spr.material as THREE.SpriteMaterial).opacity = 0; continue; }
      s.spr.position.lerpVectors(s.from, s.to, k);
      (s.spr.material as THREE.SpriteMaterial).opacity = Math.sin(k * Math.PI) * 0.9;
    }
    // vaga-lumes só à noite
    const ffOpacity = Math.max(0, 0.9 - dayAmt * 2.2);
    for (const ff of this.fireflies) {
      ff.spr.material.opacity = ffOpacity;
      if (ffOpacity <= 0) continue;
      ff.a += ff.s * dt * 60;
      const x = Math.cos(ff.a) * ff.r;
      const z = Math.sin(ff.a) * ff.r;
      ff.spr.position.set(x, ff.y0 + Math.sin(t / 900 + ff.r) * 0.4, z);
    }
    // v10: Coração da Floresta — cristal, raios de luz, esporos e runas
    this.updateHeartForest(t, dt, dayAmt);
  }

  // ── v3: céu vivo (nuvens, borboletas, água, fonte) ──────────

  private updateSkyV3(t: number, dt: number): void {
    // nuvens a derivar
    for (const c of this.clouds) {
      c.g.position.x += c.spd * dt;
      if (c.g.position.x > 220) c.g.position.x = -220;
    }
    // borboletas só de dia
    const phase = (t % DAY_LEN) / DAY_LEN;
    const dayAmt = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
    const bfOp = Math.max(0, dayAmt * 1.4 - 0.4);
    for (const b of this.butterflies) {
      b.spr.material.opacity = bfOp;
      if (bfOp <= 0) continue;
      b.a += b.s * dt * 60;
      const x = Math.cos(b.a) * b.r;
      const z = Math.sin(b.a) * b.r;
      b.spr.position.set(x, b.y0 + Math.sin(t / 500 + b.r) * 0.5, z);
    }
    // lago: ondulação suave
    if (this.lakeWater) {
      this.rippleT += dt;
      const s = 1 + Math.sin(this.rippleT * 1.6) * 0.012;
      this.lakeWater.scale.set(s, 1, s);
      (this.lakeWater.material as THREE.MeshBasicMaterial).opacity = 0.62 + Math.sin(this.rippleT * 2.2) * 0.08;
    }
    // fonte: jactos de partículas de vez em quando
    this.fountainT += dt;
    if (this.fountainT > 0.5) {
      this.fountainT = 0;
      if (this.particles.length < 340) {
        const at = new THREE.Vector3(14, groundY(14, -14) + 2.5, -14);
        this.burst(at, 0x6ee7b7, 2, 1.1, 0.55, 0.05, 3.4);
      }
    }
    // v7: fogueira — faíscas sobem sempre
    if (this.campfireGlow && this.campfireLight) {
      const flick = 0.55 + Math.sin(t * 0.013) * 0.2 + Math.sin(t * 0.047) * 0.14;
      (this.campfireGlow.material as THREE.SpriteMaterial).opacity = flick;
      this.campfireGlow.scale.setScalar(2.8 + Math.sin(t * 0.02) * 0.5);
      if (Math.random() < dt * 6 && this.particles.length < 340) {
        const fw = this.campfireGlow.getWorldPosition(new THREE.Vector3());
        this.burst(fw.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 0.4)), 0xff9a4a, 1, 1.6, 0.7, 0.06, 2.2);
      }
    }
    // v7: atmosfera por bioma — névoa rasteira, poeira rodopiantes, cinzas a subir
    for (const fx of this.ambFx) {
      const m = fx.spr.material as THREE.SpriteMaterial;
      const dHere = Math.hypot(this.pos.x - fx.cx, this.pos.z - fx.cz);
      const near = Math.max(0, 1 - dHere / 95);
      m.opacity = near * (fx.kind === "mist" ? 0.34 : fx.kind === "dust" ? 0.42 : 0.5) * (0.7 + Math.sin(t * 0.001 + fx.phase) * 0.3);
      if (m.opacity <= 0.01) continue;
      fx.a += fx.s * dt * (fx.kind === "dust" ? 3.4 : 1.1);
      const x = fx.cx + Math.cos(fx.a) * fx.r;
      const z = fx.cz + Math.sin(fx.a) * fx.r;
      if (fx.kind === "ash") {
        fx.y0 += dt * (0.9 + Math.sin(fx.phase) * 0.4);
        if (fx.y0 > 8) fx.y0 = 0;
        fx.spr.position.set(x, groundY(x, z) + fx.y0, z);
      } else {
        fx.spr.position.set(x, groundY(x, z) + fx.y0 * (0.4 + Math.sin(t * 0.0006 + fx.phase) * 0.25), z);
      }
    }
  }

  // ── v3: herói vivo (arma, capa, escudo, emote) ──────────────

  private updateHeroV3(dt: number): void {
    // v6: transição suave do escudo (erguer/abaixar) + flash de bloqueio
    const gTarget = this.guarding && !this.dead ? 1 : 0;
    this.guardT += (gTarget - this.guardT) * Math.min(1, dt * 10);
    if (this.shieldMesh) this.shieldMesh.visible = this.guardT > 0.02 || this.shieldMesh.visible;
    if (this.guardFlash > 0) {
      this.guardFlash = Math.max(0, this.guardFlash - dt * 2.6);
      if (this.shieldGlow) {
        (this.shieldGlow.material as THREE.MeshBasicMaterial).opacity = this.guardFlash * 0.85;
        this.shieldGlow.visible = this.guardFlash > 0.02;
        this.shieldGlow.scale.setScalar(1 + (1 - this.guardFlash) * 0.7);
      }
    }
    // v5: animação completa do avatar — caminhada, golpe, capa,
    // respiração em idle e squash ao aterrar
    if (this.swingT > 0) {
      this.swingT += dt * 5.2;
      if (this.swingT >= 1) this.swingT = 0;
    }
    if (this.avParts) {
      animateAvatar(this.avParts, this.bob, this.isMoving(), this.swingT, performance.now(), this.guardT);
      if (this.landSquash > 0) {
        this.landSquash = Math.max(0, this.landSquash - dt * 4.5);
        const s = this.landSquash;
        this.avParts.bodyRoot.scale.set(1 + s * 0.16, 1 - s * 0.2, 1 + s * 0.16);
      } else if (this.avParts.bodyRoot.scale.y !== 1) {
        this.avParts.bodyRoot.scale.set(1, 1, 1);
      }
    }
    // anel de escudo: roda e apaga quando expira
    const myRing = this.player.children.find((c) => c.name === "myShield") as THREE.Mesh | undefined;
    if (myRing) {
      const on = this.shielded;
      myRing.visible = on;
      if (on) myRing.rotation.z += dt * 1.6;
    }
    // aura da classe pulsa mais forte com buff de ataque
    const buffed = performance.now() < this.atkBuffUntil;
    this.classAura.intensity = 8 + (buffed ? 14 + Math.sin(performance.now() / 90) * 6 : Math.sin(performance.now() / 700) * 1.5);
    // emote flutua e desvanece
    if (this.emoteSprite) {
      if (performance.now() > this.emoteUntil) {
        this.scene.remove(this.emoteSprite);
        this.emoteSprite = null;
      } else {
        const remain = (this.emoteUntil - performance.now()) / 2200;
        this.emoteSprite.position.set(this.pos.x, this.pos.y + 3.6 + (1 - remain) * 0.8, this.pos.z);
        (this.emoteSprite.material as THREE.SpriteMaterial).opacity = Math.min(1, remain * 3);
      }
    }
  }

  private updateCamera(dt: number): void {
    const head = new THREE.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z);

    // v12: 1ª PESSOA — praticamente os olhos do personagem (estilo Minecraft)
    if (this.camMode === "first") {
      const cp = Math.cos(this.camPitch);
      const dir = new THREE.Vector3(-Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), -Math.cos(this.camYaw) * cp);
      this.camera.position.set(head.x + dir.x * 0.18, head.y + dir.y * 0.18, head.z + dir.z * 0.18);
      const look = head.clone().addScaledVector(dir, 12);
      if (this.shakeAmp > 0.001) {
        this.camera.position.y += (Math.random() - 0.5) * this.shakeAmp;
        this.shakeAmp *= Math.max(0, 1 - dt * 6);
      }
      this.camera.lookAt(look);
      return;
    }

    let target: THREE.Vector3;
    let look: THREE.Vector3;
    if (this.camMode === "third") {
      // v12: OMBRO — câmara rente atrás do personagem (estilo San Andreas/GTA)
      const d = 4.6;
      const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
      target = new THREE.Vector3(
        this.pos.x + Math.sin(this.camYaw) * d * cp + Math.cos(this.camYaw) * 0.85,
        this.pos.y + 1.75 + sp * d,
        this.pos.z + Math.cos(this.camYaw) * d * cp - Math.sin(this.camYaw) * 0.85
      );
      look = new THREE.Vector3(this.pos.x, this.pos.y + 1.7, this.pos.z);
    } else {
      target = new THREE.Vector3(
        this.pos.x + Math.sin(this.camYaw) * this.camDist,
        this.pos.y + 5.5 + this.camDist * 0.32,
        this.pos.z + Math.cos(this.camYaw) * this.camDist
      );
      look = new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
    }
    // v8: a câmara desliza junto às paredes em vez de as atravessar
    if (this.camBlockerList.length > 0) {
      let nearB = false;
      for (const b of this.buildings) {
        if (Math.abs(this.pos.x - b.cx) < 16 && Math.abs(this.pos.z - b.cz) < 16) { nearB = true; break; }
      }
      if (nearB) {
        const dir = target.clone().sub(head);
        const maxD = dir.length();
        this.ray.set(head, dir.normalize());
        this.ray.far = maxD + 0.5;
        const hits = this.ray.intersectObjects(this.camBlockerList, false);
        if (hits.length > 0 && hits[0].distance < maxD) {
          target.copy(head).addScaledVector(dir, Math.max(2.0, hits[0].distance - 0.45));
        }
      }
    }
    this.camPos.lerp(target, Math.min(1, dt * 5));
    this.camera.position.copy(this.camPos);
    if (this.shakeAmp > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmp;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmp;
      this.camera.position.z += (Math.random() - 0.5) * this.shakeAmp;
      this.shakeAmp *= Math.max(0, 1 - dt * 6);
    }
    this.camera.lookAt(look);
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    clearInterval(this.posTimer);
    this.resizeObs?.disconnect();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    try { this.chan?.unsubscribe(); } catch { /* ignore */ }
    try { this.renderer.dispose(); } catch { /* ignore */ }
    try { (supabase as any).removeChannel?.(this.chan); } catch { /* ignore */ }
    this.scene?.traverse((o: any) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: any) => { m.map?.dispose?.(); m.dispose?.(); });
      }
    });
  }
}
