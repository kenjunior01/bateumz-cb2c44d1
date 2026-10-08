// @ts-nocheck
// ============================================================
// BATEU WORLD — MMO 3D da plataforma (estilo Hordes.io) · v6
// Níveis, poderes por classe, missões/saga/desafios, PvP com
// roubo de cupões e pontos, Banco de Pontos (moeda da
// plataforma), descobertas, partículas e transições.
// v4: MOCHILA com loot de raridades + equipamento, ARENA DAS
// ONDAS (sobrevivência), combo de mortes com XP bónus, pet
// companheiro, definições de qualidade gráfica, música
// ambiente e MODO FOTO para partilhar o mundo.
// v5: AVATARES customizáveis (pele, cabelo, traje, capa,
// chapéu) com preview 3D ao vivo, editor de aparência dentro
// do jogo e visual sincronizado entre todos os jogadores.
// v6: SÓ MEMBROS REGISTADOS jogam (conta da plataforma),
// ESCUDO + DEFESA (stat DEF, modo Guarda, loot de escudos),
// v10: CORAÇÃO DA FLORESTA — a Floresta Ancestral agora espetacular:
// 9 Árvores Anciãs colossais, god rays, cristal verde pulsante, runas,
// esporos dia/noite, Guardiã Anciã e o 19º marco do mundo.
// MUNDO 55% MAIOR com 7 regiões nomeadas e 19 marcos com
// SIGNIFICADO, MAPA GRANDE com legenda e bússola de destino,
// e super-sincronização com a conta (progresso na nuvem).
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Sparkles, ArrowUp, User, ScrollText, Trophy, MessageSquare,
  X, Copy, Coins, Heart, Zap, Crown, ExternalLink, Check, Wifi, Users,
  Landmark, Map, Shield, Flame, Volume2, VolumeX, MapPin, Smile, Target,
  Backpack, Settings, Camera, Music, PawPrint, Cloud,
  Maximize2, Minimize2, Video, Eye, Gamepad2, ChevronLeft, ChevronRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import { WorldEngine, SKILLS, LANDMARKS, REGIONS, PVP_SAFE_RADIUS, RARITY_META, BUILDINGS, type LootItem } from "./worldEngine";
import { worldAudio, MUSIC_TRACKS } from "./worldAudio";
import { AvatarPreview, AvatarSwatches } from "./AvatarEditor";
import { defaultAvatar, randomAvatar, parseAvatarKey, type AvatarConfig } from "./avatar";
import {
  fetchPlatformData, upsertCharacter, setCharacterOffline,
  worldRoute, fmtMZN, voucherLabel, MODALITY_LABEL, exchangeWorldPoints,
  fetchServerChar, flushPendingExchanges, claimWorldVoucher, upsertWorldProgress,
  logWorldActivity, flushWorldActivity, subscribePlatformLive,
  type PlatformData,
} from "./platformSync";
import { useAuth } from "@/contexts/AuthContext";

// @ts-nocheck

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
  onNavigate?: (route: string) => void;
}

interface Char {
  uid: string;
  name: string;
  classId: number;
  level: number;
  xp: number;
  gold: number;
  points: number;      // pontos de atributo
  allocAtk: number;
  allocHp: number;
  allocSpd: number;
  kills: number;
  deaths: number;
  streak: number;
  lastDaily: string;
  vouchers: { id: string; code: string; label: string }[];
  quests: { date: string; kills: number; chest: number; visit: number; steal: number; waves: number; cK: boolean; cC: boolean; cV: boolean; cS: boolean; cW: boolean; item: number; duel: number; atk: number; cI: boolean; cD: boolean; cA: boolean; home: number; cH: boolean; gather: number; cG: boolean };
  // v2
  pts: number;         // Pontos de Troféu (economia do mundo)
  discoveries: string[];
  sagaIdx: number;
  saga: { kills: number; bosses: number; chests: number; steals: number; discovers: number };
  chal: { date: string; c1: boolean; c2: boolean };
  stolenFrom: number;
  lostTo: number;
  shieldUntil: number;
  // v4
  inv: LootItem[];
  equipped: { arma: LootItem | null; armadura: LootItem | null; amuleto: LootItem | null; escudo: LootItem | null };
  pet: boolean;
  wavesBest: number;
  // v5
  avatar: AvatarConfig;
  // v6
  allocDef: number;    // pontos em defesa (redução de dano)
  // v11 — RPG+: materiais de recolha, poções da Oficina e NPCs
  mat: { erva: number; minerio: number; cristal: number };
  pot: { vida: number; forca: number; vento: number };
  npcDay: { date: string; gomas: boolean; lurdes: boolean; sabio: boolean };
  // v13 — onboarding "Primeiros Passos" (novos jogadores)
  onb?: { done: boolean; step: number };
}

const LS_KEY = "bateu_world_char_v6";
const LS_KEY_V5 = "bateu_world_char_v5";
const LS_KEY_V4 = "bateu_world_char_v4";
const LS_KEY_V3 = "bateu_world_char_v3";
const CLASSES = [
  { name: "Guerreiro", emoji: "⚔️", color: "#ef4444", grad: "from-red-500 to-rose-600", desc: "Combate corpo a corpo, vida alta" },
  { name: "Mago", emoji: "🔮", color: "#8b5cf6", grad: "from-violet-500 to-purple-600", desc: "Explosões arcanas e meteoros" },
  { name: "Arqueiro", emoji: "🏹", color: "#22c55e", grad: "from-green-500 to-emerald-600", desc: "Chuvas de flechas e esquivas" },
  { name: "Curandeiro", emoji: "🌿", color: "#06b6d4", grad: "from-cyan-500 to-teal-600", desc: "Cura-se enquanto fere os inimigos" },
];

const TITLES: { lvl: number; title: string }[] = [
  { lvl: 1, title: "Novato" }, { lvl: 3, title: "Aprendiz" }, { lvl: 5, title: "Caçador" },
  { lvl: 8, title: "Guerreiro" }, { lvl: 12, title: "Veterano" }, { lvl: 16, title: "Elite" },
  { lvl: 20, title: "Campeão" }, { lvl: 26, title: "Mestre" }, { lvl: 33, title: "Grão-Mestre" },
  { lvl: 40, title: "Lenda do Mundo" },
];

function titleFor(level: number): string {
  let t = TITLES[0].title;
  for (const tt of TITLES) if (level >= tt.lvl) t = tt.title;
  return t;
}

function xpNeeded(level: number): number {
  return Math.round(80 * Math.pow(level, 1.45));
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function newChar(name: string, classId: number, avatar?: AvatarConfig): Char {
  return {
    uid: "bw_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    name: name.slice(0, 14), classId, level: 1, xp: 0, gold: 50, points: 0,
    allocAtk: 0, allocHp: 0, allocSpd: 0, allocDef: 0,
    kills: 0, deaths: 0, streak: 0,
    lastDaily: "", vouchers: [],
    quests: { date: todayStr(), kills: 0, chest: 0, visit: 0, steal: 0, waves: 0, cK: false, cC: false, cV: false, cS: false, cW: false, item: 0, duel: 0, atk: 0, cI: false, cD: false, cA: false, home: 0, cH: false, gather: 0, cG: false },
    pts: 0, discoveries: [], sagaIdx: 0,
    saga: { kills: 0, bosses: 0, chests: 0, steals: 0, discovers: 0 },
    chal: { date: todayStr(), c1: false, c2: false },
    stolenFrom: 0, lostTo: 0, shieldUntil: 0,
    inv: [], equipped: { arma: null, armadura: null, amuleto: null, escudo: null },
    pet: false, wavesBest: 0,
    mat: { erva: 0, minerio: 0, cristal: 0 },
    pot: { vida: 0, forca: 0, vento: 0 },
    npcDay: { date: todayStr(), gomas: false, lurdes: false, sabio: false },
    onb: { done: false, step: 0 },
    avatar: avatar ?? defaultAvatar(classId),
  };
}

function migrateBase(old: any): Char {
  const c = newChar(old.name || "Herói", old.classId ?? 0);
  Object.assign(c, {
    uid: old.uid, level: old.level ?? 1, xp: old.xp ?? 0, gold: old.gold ?? 50,
    points: old.points ?? 0, allocAtk: old.allocAtk ?? 0, allocHp: old.allocHp ?? 0,
    allocSpd: old.allocSpd ?? 0, kills: old.kills ?? 0, deaths: old.deaths ?? 0,
    streak: old.streak ?? 0, lastDaily: old.lastDaily ?? "",
    vouchers: Array.isArray(old.vouchers) ? old.vouchers : [],
    pts: old.pts ?? 0, discoveries: Array.isArray(old.discoveries) ? old.discoveries : [],
    sagaIdx: old.sagaIdx ?? 0, stolenFrom: old.stolenFrom ?? 0, lostTo: old.lostTo ?? 0,
  });
  if (old.saga) c.saga = { ...c.saga, ...old.saga };
  if (old.quests?.date === todayStr()) {
    c.quests = { ...c.quests, ...old.quests, waves: 0, cW: false, home: old.quests.home || 0, cH: !!old.quests.cH };
  }
  return c;
}

function migrateV4(old: any): Char {
  const c = migrateBase(old);
  // v4 guardava inventário, equipamento, pet e ondas — preservar
  if (Array.isArray(old.inv)) c.inv = old.inv;
  if (old.equipped) c.equipped = old.equipped;
  if (typeof old.pet === "boolean") c.pet = old.pet;
  if (typeof old.wavesBest === "number") c.wavesBest = old.wavesBest;
  if (old.chal) c.chal = { ...c.chal, ...old.chal };
  // v5: avatar (v4 não tinha — parse da chave ou por defeito)
  c.avatar = parseAvatarKey(old.avKey) ?? defaultAvatar(c.classId);
  return c;
}

function migrateV6(old: any): Char {
  // v5 → v6: mantém tudo, garante allocDef e slot de escudo
  const c = migrateV4(old);
  if (typeof old.allocDef === "number") c.allocDef = old.allocDef;
  else c.allocDef = 0;
  if (c.equipped && !("escudo" in c.equipped)) c.equipped.escudo = null;
  return c;
}

function loadChar(): Char | null {
  try {
    let raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      // v6: migrar v5 → v4 → v3 (progresso nunca se perde)
      const v5Raw = localStorage.getItem(LS_KEY_V5);
      if (v5Raw) {
        const c = migrateV6(JSON.parse(v5Raw));
        localStorage.setItem(LS_KEY, JSON.stringify(c));
        return c;
      }
      const v4Raw = localStorage.getItem(LS_KEY_V4);
      if (v4Raw) {
        const c = migrateV6(JSON.parse(v4Raw));
        localStorage.setItem(LS_KEY, JSON.stringify(c));
        return c;
      }
      const oldRaw = localStorage.getItem(LS_KEY_V3);
      if (oldRaw) {
        const c = migrateV6(JSON.parse(oldRaw));
        localStorage.setItem(LS_KEY, JSON.stringify(c));
        return c;
      }
      return null;
    }
    const c = JSON.parse(raw) as Char;
    if (!c?.name || !c?.uid) return null;
    if (c.quests?.date !== todayStr()) {
      c.quests = { date: todayStr(), kills: 0, chest: 0, visit: 0, steal: 0, waves: 0, cK: false, cC: false, cV: false, cS: false, cW: false, item: 0, duel: 0, atk: 0, cI: false, cD: false, cA: false, home: 0, cH: false, gather: 0, cG: false };
    }
    // v7: garantir campos novos em saves v6
    c.quests.item = c.quests.item || 0;
    c.quests.duel = c.quests.duel || 0;
    c.quests.atk = c.quests.atk || 0;
    c.quests.cI = !!c.quests.cI;
    c.quests.cD = !!c.quests.cD;
    c.quests.cA = !!c.quests.cA;
    // v8: missão de interiores
    c.quests.home = c.quests.home || 0;
    c.quests.cH = !!c.quests.cH;
    // v11: missão de recolha + materiais + poções + NPCs
    c.quests.gather = c.quests.gather || 0;
    c.quests.cG = !!c.quests.cG;
    c.mat = c.mat || { erva: 0, minerio: 0, cristal: 0 };
    c.pot = c.pot || { vida: 0, forca: 0, vento: 0 };
    if (c.npcDay?.date !== todayStr()) c.npcDay = { date: todayStr(), gomas: false, lurdes: false, sabio: false };
    c.npcDay = c.npcDay || { date: todayStr(), gomas: false, lurdes: false, sabio: false };
    // v13: onboarding — veteranos (já lutaram/subiram) completam automaticamente
    c.onb = c.onb || { done: (c.kills || 0) > 0 || (c.level || 1) > 2, step: 0 };
    if (c.chal?.date !== todayStr()) {
      c.chal = { date: todayStr(), c1: false, c2: false };
    }
    c.saga = c.saga || { kills: 0, bosses: 0, chests: 0, steals: 0, discovers: 0 };
    c.discoveries = c.discoveries || [];
    c.pts = c.pts || 0;
    c.allocDef = c.allocDef || 0;
    // v4/v5: garantir campos novos em saves antigos
    c.inv = Array.isArray(c.inv) ? c.inv : [];
    c.equipped = c.equipped || { arma: null, armadura: null, amuleto: null, escudo: null };
    if (!c.equipped.escudo) c.equipped.escudo = null;
    c.pet = !!c.pet;
    c.wavesBest = c.wavesBest || 0;
    // v5: garantir avatar em qualquer save
    if (!c.avatar || typeof c.avatar.skin !== "number") {
      c.avatar = defaultAvatar(c.classId ?? 0);
    }
    return c;
  } catch { return null; }
}

function calcStats(c: Char) {
  const baseAtk = [12, 11, 10, 9][c.classId] ?? 11;
  const baseDef = [3, 1, 2, 2][c.classId] ?? 2; // v6: Guerreiro resiste mais
  const eq = c.equipped || { arma: null, armadura: null, amuleto: null, escudo: null };
  const bonus = (k: "atk" | "hp" | "spd" | "def") =>
    ((eq.arma as any)?.[k] || 0) + ((eq.armadura as any)?.[k] || 0) + ((eq.amuleto as any)?.[k] || 0) + ((eq.escudo as any)?.[k] || 0);
  return {
    atk: baseAtk + c.allocAtk + Math.floor((c.level - 1) * 1.2) + bonus("atk"),
    maxHp: 100 + (c.level - 1) * 10 + c.allocHp * 12 + bonus("hp"),
    spd: 6 + c.allocSpd * 0.6 + bonus("spd"),
    def: baseDef + c.allocDef * 2 + bonus("def"), // v6: até 60% de redução
  };
}

const CLS_NAMES = ["Guerreiro", "Mago", "Arqueiro", "Curandeiro"];
const CLS_EMOJIS = ["⚔️", "🔮", "🏹", "🌿"];

// v13: trilha de onboarding — 5 passos (mover → lutar → recolher → NPC → progressão)
// Psicologia: uma meta de cada vez (carga cognitiva mínima), loop aberto visível
// (Zeigarnik) e recompensa imediata em cada passo (reforço positivo cedo).
const ONB_STEPS = [
  { emoji: "🧭", title: "Explora a ilha", desc: "Arrasta o joystick (ou WASD) e afasta-te da Praça Bateu" },
  { emoji: "⚔️", title: "Primeira vitória", desc: "Aproxima-te de um inimigo e toca no botão de ataque" },
  { emoji: "🌿", title: "Recolhe uma Erva", desc: "Vê uma erva a brilhar? Chega perto e toca em «Recolher»" },
  { emoji: "🧙", title: "Fala com o Mestre Gomas", desc: "Os NPCs do mundo dão bênçãos diárias e sabedoria" },
  { emoji: "📖", title: "Abre a ficha do Herói", desc: "No topo do ecrã, toca no primeiro botão e vê o teu progresso" },
];

// ── v11: Diálogos dos NPCs (RPG) ────────────────────────────
export const NPC_LINES: Record<string, { emoji: string; name: string; lines: string[]; action: "gift" | "workshop" | "lore" }> = {
  gomas: {
    emoji: "🧙", name: "Mestre Gomas", action: "gift",
    lines: [
      "Ah, o herói do mundo! Os bugs voltaram a mexer nos cantos do mapa...",
      "Recolhe recursos com E perto de ervas, minérios e cristais — a Lurdes transforma-os em poções.",
      "Toma a bênção diária do Mestre: um pouco de ouro e sabedoria para a tua jornada!",
    ],
  },
  lurdes: {
    emoji: "🛠️", name: "Ferreira Lurdes", action: "workshop",
    lines: [
      "A bigorna está quente, herói! Trouxeste materiais da terra?",
      "Com ervas e cristais fabrico poções: vida, força e vento. Tudo na tua Mochila → Oficina.",
      "Uma Poção de Força antes de um chefe vale mais que dez espadas amoladas!",
    ],
  },
  sabio: {
    emoji: "📜", name: "Velho Sábio", action: "lore",
    lines: [
      "Este mundo nasceu de um sonho antigo... e os bugs são os seus pesadelos.",
      "No Coração da Floresta pulsa um cristal mais velho que os reis. A Guardiã nunca dorme.",
      "Dizem que a chuva acalma os bugs... mas as tempestades acordam os piores. Cuidado com o trovão.",
    ],
  },
};

// ── Saga: cadeia de missões permanente ──────────────────────
const SAGA: { title: string; desc: string; prog: (c: Char) => number; goal: number; reward: string; apply: (c: Char) => void }[] = [
  { title: "1 · Primeiros Passos", desc: "Derrota 5 inimigos", prog: (c) => c.saga.kills, goal: 5, reward: "+100 ouro · +10 pts", apply: (c) => { c.gold += 100; c.pts += 10; } },
  { title: "2 · Explorador", desc: "Descobre 3 marcos do mundo", prog: (c) => c.saga.discovers, goal: 3, reward: "+80 XP · +15 pts", apply: (c) => { c.xp += 80; c.pts += 15; } },
  { title: "3 · Caçador de Bugs", desc: "Derrota 20 inimigos", prog: (c) => c.saga.kills, goal: 20, reward: "+250 ouro · +20 pts", apply: (c) => { c.gold += 250; c.pts += 20; } },
  { title: "4 · Tesoureiro", desc: "Abre 3 baús de cupões", prog: (c) => c.saga.chests, goal: 3, reward: "+150 XP · +25 pts", apply: (c) => { c.xp += 150; c.pts += 25; } },
  { title: "5 · Face a Face", desc: "Derrota 1 chefe (Bug Rei ou Rainha)", prog: (c) => c.saga.bosses, goal: 1, reward: "+500 ouro · +40 pts", apply: (c) => { c.gold += 500; c.pts += 40; } },
  { title: "6 · Sangue Frio", desc: "Rouba pontos/cupões a 1 jogador", prog: (c) => c.saga.steals, goal: 1, reward: "+200 XP · +30 pts", apply: (c) => { c.xp += 200; c.pts += 30; } },
  { title: "7 · Veterano", desc: "Alcança o nível 8", prog: (c) => c.level, goal: 8, reward: "+400 ouro · +40 pts", apply: (c) => { c.gold += 400; c.pts += 40; } },
  { title: "8 · Cartógrafo", desc: "Descobre 7 marcos do mundo", prog: (c) => c.saga.discovers, goal: 7, reward: "+300 XP · +50 pts", apply: (c) => { c.xp += 300; c.pts += 50; } },
  { title: "9 · Conquistador", desc: "Derrota 2 chefes", prog: (c) => c.saga.bosses, goal: 2, reward: "+800 ouro · +80 pts", apply: (c) => { c.gold += 800; c.pts += 80; } },
  { title: "10 · Lenda do Mundo", desc: "Alcança o nível 15", prog: (c) => c.level, goal: 15, reward: "+1500 ouro · +150 pts", apply: (c) => { c.gold += 1500; c.pts += 150; } },
];

// ── Banco de Pontos: trocas ─────────────────────────────────
const EXCHANGES = [
  { id: "gold", cost: 20, emoji: "💰", title: "200 de Ouro", desc: "Ouro na hora para equipar o herói" },
  { id: "shield", cost: 30, emoji: "🛡️", title: "Escudo 10 min", desc: "Protege-te de roubos PvP" },
  { id: "ticket", cost: 60, emoji: "🎫", title: "Bilhete de Sorteio", desc: "Participa num sorteio real da plataforma" },
  { id: "voucher", cost: 120, emoji: "🎟️", title: "Cupão Real", desc: "Um cupão de desconto verdadeiro para as compras" },
  { id: "cash", cost: 250, emoji: "💵", title: "10 MT na Carteira", desc: "Moeda real da plataforma — requer conta com carteira" },
];

export default function BateuWorld({ onScore, onNavigate }: Props) {
  const { user, profile, loading: authLoading } = useAuth();
  const [phase, setPhase] = useState<"boot" | "create" | "world">("boot");
  const [char, setChar] = useState<Char | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [pickClass, setPickClass] = useState(0);
  // v5: editor de aparência (criação + em jogo)
  const [avDraft, setAvDraft] = useState<AvatarConfig>(() => defaultAvatar(0));
  const [avEditing, setAvEditing] = useState(false);
  const [platform, setPlatform] = useState<PlatformData | null>(null);
  const [bootMsg, setBootMsg] = useState("A preparar o mundo...");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WorldEngine | null>(null);
  const charRef = useRef<Char | null>(null);
  const platformRef = useRef<PlatformData | null>(null);
  const scoreRef = useRef(onScore);
  scoreRef.current = onScore;

  // HUD
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, hit: 0 });
  const [near, setNear] = useState<string | null>(null);
  const [online, setOnline] = useState(1);
  const [toasts, setToasts] = useState<{ id: number; msg: string; tone: string }[]>([]);
  const [panel, setPanel] = useState<"none" | "char" | "quests" | "rank" | "bank" | "inv" | "set" | "map">("none");
  const [questTab, setQuestTab] = useState<"daily" | "saga" | "chal">("daily");
  const [card, setCard] = useState<{ kind: string; id: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<{ n: string; m: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [deathFx, setDeathFx] = useState(false);
  const [skillState, setSkillState] = useState<{ locked: boolean; cd: number }>({ locked: true, cd: 0 });
  const [skillCds, setSkillCds] = useState([0, 0, 0]);

  // v3 — HUD cinematográfico
  const [muted, setMuted] = useState(worldAudio.isMuted);
  const [musicOff, setMusicOff] = useState(worldAudio.isMusicOff);
  const [bossBar, setBossBar] = useState<{ name: string; pct: number } | null>(null);
  const [buffs, setBuffs] = useState({ atk: 0, hot: 0 });
  const [banner, setBanner] = useState<{ kind: "discover" | "levelup" | "wave"; emoji: string; title: string; sub: string } | null>(null);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);
  const bannerTimer = useRef<any>(null);

  // v6 — guarda, bússola, sincronização
  const [guardOn, setGuardOn] = useState(false);
  const [compass, setCompass] = useState<{ angle: number; dist: number } | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // v7 — Acontecimento do Mundo ativo (chip com contagem)
  const [worldEvent, setWorldEvent] = useState<{ kind: string; name: string; emoji: string; until: number } | null>(null);
  const [eventNow, setEventNow] = useState(Date.now());

  // v8 — interiores (chip "Estás em") + ticker da plataforma ao vivo
  const [inside, setInside] = useState<{ name: string; desc: string } | null>(null);
  const [ticker, setTicker] = useState<{ id: number; msg: string }[]>([]);
  const tickerId = useRef(0);
  useEffect(() => {
    if (!worldEvent) return;
    const iv = setInterval(() => setEventNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, [worldEvent]);

  // v4 — combo, arena, modo foto, qualidade
  const [combo, setCombo] = useState(0);
  const [arenaHud, setArenaHud] = useState<{ wave: number; alive: number } | null>(null);
  const [arenaEnd, setArenaEnd] = useState<{ wave: number; kills: number; pts: number; gold: number; xp: number } | null>(null);
  const [photoMode, setPhotoMode] = useState(false);
  const [quality, setQuality] = useState<"auto" | "low" | "medium" | "high">(
    () => (localStorage.getItem("bateu_world_quality") as any) || "auto"
  );
  // v11 — câmaras, ecrã inteiro, leitor de música, clima, diálogo, montaria
  const [camMode, setCamMode] = useState<0 | 1 | 2>(0);
  const [isFs, setIsFs] = useState(false);
  const fsSeq = useRef(0); // v13: sequência de toggles (cancela fallbacks obsoletos)
  const [musicOpen, setMusicOpen] = useState(false);
  const [trackIdx, setTrackIdx] = useState(worldAudio.getTrackIdx());
  const [musicVol, setMusicVolState] = useState(worldAudio.getMusicVol());
  const [weatherChip, setWeatherChip] = useState<{ name: string; emoji: string } | null>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [dlgStep, setDlgStep] = useState(0);
  const [dlgText, setDlgText] = useState("");
  const [mountOn, setMountOn] = useState(false);
  const comboTimer = useRef<any>(null);
  const photoTimer = useRef<any>(null);
  const worldWrapRef = useRef<HTMLDivElement | null>(null);
  const petToastDone = useRef(false);

  const EMOTES = ["👋", "😄", "❤️", "😤", "🎉", "🙏"];
  const TIPS = [
    "🗺️ Mundo gigante: 19 marcos com significado — TAB abre o MAPA-MÚNDI",
    "🛡️ Segura SHIFT (ou o botão de escudo) para DEFENDER — bloqueia 40% do dano!",
    "🧭 No mapa grande, toca num lugar para marcar o destino — a bússola guia-te",
    "💡 Aproxima-te de um baú e prime E (ou toca no botão) para abrir",
    "⚔️ Clique no mundo = atacar. Perto de jogadores = PvP com roubo!",
    "🗺️ Explora o mundo gigante: 19 marcos com significado — cada descoberta dá XP e pontos",
    "💚 O Coração da Floresta pulsa na clareira sagrada a oeste — a Guardiã Anciã protege-o",
    "🏟️ A Arena das Ondas (este do mapa) paga pontos e ouro por onda",
    "🎥 Prime C (ou usa a barra topo) para trocar de câmara: 1ª pessoa tipo Minecraft, 3ª pessoa tipo GTA ou orbital",
    "🌧️ A chuva e a tempestade visitam o mundo de vez em quando — os trovões iluminam o céu!",
    "🐺 Ao nível 8 galopa com a Montaria Lobo Veloz (+75% velocidade) — botão 🐾",
    "🌿 Recolhe ervas, minérios e cristais com E e fabrica poções na Oficina da Mochila",
    "🎒 Inimigos e chefes dropam equipamento — equipa na Mochila!",
    "🔥 Combo de mortes em menos de 4s = até +50% de XP",
    "🏦 Reúne Pontos de Troféu e troca por cupões ou moeda real no Banco",
    "📸 Modo Foto (tecla P): esconde a HUD e captura o mundo",
    "🐾 Nível 5: o teu companheiro alado une-se a ti (+8% ataque)",
    "🛡️ Foste roubado? Tens 3 minutos de escudo — usa bem o tempo",
    "☄️ ACONTECIMENTOS: chuva de meteoros, frenesi de roubos e enxames de elite surgem do nada — ficas atento!",
    "🎒 No PvP também podes ROUBAR ITENS da mochila do derrotado — esconde os teus melhores!",
    "⚙️ Ajusta a qualidade gráfica nas Definições se o jogo abrandar",
    "❤️ A Fonte da Vida (junto ao Banco) cura-te de graça",
  ];

  const toastId = useRef(0);
  const pushToast = useCallback((msg: string, tone = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  // v3: banner cinematográfico (descoberta / level-up / onda) ─────
  const showBanner = useCallback((b: { kind: "discover" | "levelup" | "wave"; emoji: string; title: string; sub: string }) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner(b);
    bannerTimer.current = setTimeout(() => setBanner(null), b.kind === "levelup" ? 1900 : b.kind === "wave" ? 2200 : 2600);
  }, []);

  // v3: desbloquear áudio no primeiro gesto + atalhos M (mute) e P (foto)
  useEffect(() => {
    const unlock = () => { worldAudio.ensure(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key.toLowerCase() === "m") setMuted(worldAudio.toggleMute());
      if (e.key.toLowerCase() === "p" && phase === "world") togglePhoto();
      if (e.key === "Tab" && phase === "world") { e.preventDefault(); setPanel((p) => (p === "map" ? "none" : "map")); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // v4: MODO FOTO — esconde a HUD, captura e descarrega PNG
  const togglePhoto = useCallback(() => {
    setPhotoMode((on) => {
      if (!on) {
        worldAudio.play("photo");
        photoTimer.current = setTimeout(() => {
          try {
            const url = engineRef.current?.snapshot();
            if (url) {
              const a = document.createElement("a");
              a.href = url;
              a.download = `bateu-world-${Date.now()}.png`;
              a.click();
              pushToast("📸 Foto capturada e descarregada!", "good");
            }
          } catch { /* ignore */ }
          // v11: janela maior (1.6s) — tempo de ver a moldura e de a E2E captar
          setTimeout(() => setPhotoMode(false), 2600); // v11: janela generosa (2.6s)
        }, 320);
      }
      return !on;
    });
  }, [pushToast]);

  // v10: garantir que o mundo entra na vista ao começar a jogar — no hub
  // a página pode estar rolada e a HUD do jogo ficaria fora do ecrã
  useEffect(() => {
    if (phase !== "world") return;
    const t = setTimeout(() => {
      try { worldWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); } catch { /* ignore */ }
    }, 350);
    return () => clearTimeout(t);
  }, [phase]);

  // v4: aplicar qualidade ao motor quando muda
  useEffect(() => {
    try { localStorage.setItem("bateu_world_quality", quality); } catch { /* ignore */ }
    engineRef.current?.setQuality(quality);
  }, [quality, phase]);

  // v3: polling de chefe + buffs (300ms)
  useEffect(() => {
    if (phase !== "world") return;
    const iv = setInterval(() => {
      const eng = engineRef.current;
      if (!eng) return;
      const bb = eng.getBossBar?.() || null;
      setBossBar(bb ? { name: bb.name, pct: bb.pct } : null);
      const bf = eng.getBuffs?.() || { atk: 0, hot: 0 };
      setBuffs(bf);
      // v6: bússola do waypoint
      const cp = eng.getCompass?.() || null;
      setCompass(cp && cp.dist > 3 ? { angle: cp.angle, dist: cp.dist } : null);
      setGuardOn(eng.isGuarding?.() || false);
    }, 300);
    return () => clearInterval(iv);
  }, [phase]);

  // v3: dicas rotativas
  useEffect(() => {
    if (phase !== "world") return;
    const iv = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 7000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Boot (v9: TODOS jogam — com conta sincroniza na nuvem, sem conta joga como convidado) ──────
  useEffect(() => {
    if (authLoading) return; // espera pela sessão da plataforma
    const c = loadChar();
    if (c && user) {
      // v6: progresso ligado à CONTA da plataforma (não ao dispositivo)
      c.uid = "bw_" + user.id;
      if (!c.name || c.name === "Herói") c.name = (profile?.display_name || user.email?.split("@")[0] || "Herói").slice(0, 14);
      persist(c);
      setChar(c);
      setPhase("world");
      // v6: merge com o servidor — o nível mais alto vence (multi-dispositivo)
      (async () => {
        const srv = await fetchServerChar(c.uid);
        if (srv && srv.level > c.level) {
          const merged: Char = { ...c, level: srv.level, xp: Math.max(c.xp, srv.xp || 0), gold: Math.max(c.gold, srv.gold || 0), kills: Math.max(c.kills, srv.total_kills || 0) };
          persist(merged);
          setChar(merged);
          pushToast(`☁️ Progresso da conta restaurado — nível ${srv.level}!`, "good");
        }
        const flushed = await flushPendingExchanges();
        if (flushed > 0) pushToast(`☁️ ${flushed} troca(s) pendente(s) processada(s) na tua conta!`, "good");
      })();
    } else if (c) {
      // v9: CONVIDADO — tem progresso anterior neste dispositivo, continua de onde ficou
      setChar(c);
      setPhase("world");
      setTimeout(() => pushToast("👋 Estás a jogar como convidado — cria conta para guardar o progresso na nuvem!", "info"), 2200);
    } else {
      setPhase("create");
    }
    let alive = true;
    (async () => {
      setBootMsg("A carregar sorteios, feira e cupões...");
      const data = await fetchPlatformData();
      if (!alive) return;
      platformRef.current = data;
      setPlatform(data);
      const eng = engineRef.current;
      if (eng) {
        eng.spawnPlatformObjects({
          raffles: data.raffles.map((r) => ({ id: r.id, title: r.title, prizeTitle: r.prizeTitle })),
          contests: data.contests.map((x) => ({ id: x.id, title: x.title, prize: x.prize })),
          vouchers: data.vouchers.map((v) => ({ id: v.id, code: v.code, label: voucherLabel(v) })),
          assets: data.assets.map((a) => ({ id: a.id, title: a.title, value: a.value, modality: a.modality })),
        });
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  // ── Persistência ───────────────────────────────────────────
  const persist = useCallback((c: Char) => {
    charRef.current = c;
    try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!char) return;
    charRef.current = char;
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(char)); } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [char]);

  // Sincronização com a base a cada 20s
  useEffect(() => {
    if (phase !== "world" || !char) return;
    const iv = setInterval(() => {
      const c = charRef.current;
      if (!c) return;
      const s = calcStats(c);
      upsertCharacter({
        guest_id: c.uid, name: c.name, class_id: c.classId, level: c.level, xp: c.xp,
        gold: c.gold, hp: s.maxHp, max_hp: s.maxHp, atk: s.atk, spd: Math.round(s.spd),
        total_kills: c.kills, is_online: true,
      });
      // v6: espelho completo do herói na conta (ranking global + avatar)
      upsertWorldProgress({
        guest_id: c.uid, user_id: user?.id || null, name: c.name, class_id: c.classId,
        level: c.level, points: c.pts, kills: c.kills, discoveries: c.discoveries,
        xp: c.xp, gold: c.gold, deaths: c.deaths, def: s.def,
        avatar: c.avatar, vouchers_count: c.vouchers.length, waves_best: c.wavesBest,
      });
      setLastSync(new Date());
    }, 20000);
    return () => {
      clearInterval(iv);
      const c = charRef.current;
      if (c) setCharacterOffline(c.uid);
    };
  }, [phase, char?.uid]);

  // ── Subida de nível ────────────────────────────────────────
  const applyXp = useCallback((p: Char, addXp: number): Char => {
    let { level, points } = p;
    let xp = p.xp + addXp;
    let leveled = false;
    while (xp >= xpNeeded(level) && level < 60) {
      xp -= xpNeeded(level);
      level += 1;
      points += 3;
      leveled = true;
    }
    if (leveled) {
      // v4: os efeitos colaterais do level-up são ADIADOS para fora da fase
      // de render (updaters têm de ser puros — evita o aviso do React e
      // atualizações cruzadas de componentes durante o render)
      setTimeout(() => {
        confetti({ particleCount: 130, spread: 80, origin: { y: 0.6 }, colors: ["#f43f5e", "#fbbf24", "#38bdf8"] });
        worldAudio.play("levelup"); // v13: fanfarra no pico emocional (regra pico-fim)
        pushToast(`🎉 Subiste para o nível ${level}! ${titleFor(level)} · +3 pontos`, "good");
        showBanner({ kind: "levelup", emoji: "⚡", title: `NÍVEL ${level}`, sub: `${titleFor(level)} · +3 pontos de atributo` });
        engineRef.current?.levelFx();
        scoreRef.current?.("Bateu World", level * 1000);
        logWorldActivity(charRef.current?.uid || "anon", "level", `Subiu para o nível ${level}`, level);
        // v4: o companheiro alado junta-se no nível 5
        if (level >= 5 && !petToastDone.current) {
          petToastDone.current = true;
          setChar((p2) => (p2 && !p2.pet ? { ...p2, pet: true } : p2));
          engineRef.current?.setPet(true);
          setTimeout(() => {
            pushToast("🐾 Um companheiro alado juntou-se a ti! +8% de ataque", "good");
            showBanner({ kind: "discover", emoji: "🐾", title: "COMPANHEIRO!", sub: "Alado fiel · +8% de ataque" });
            confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 }, colors: ["#fde68a", "#fbbf24"] });
          }, 1500);
        }
        const s = calcStats({ ...p, level });
        engineRef.current?.syncStats(s, level);
        engineRef.current?.healFull();
      }, 40);
    }
    return { ...p, xp, level, points };
  }, [pushToast, showBanner]);

  // ── v13: ONBOARDING "PRIMEIROS PASSOS" ─────────────────────
  // Avanço com fast-forward: se o jogador fizer algo avançado cedo (ex.: matar
  // antes de explorar), completa os passos intermédios e entrega as recompensas.
  const onbAdvance = useCallback((step: number) => {
    const c = charRef.current;
    // step = ÍNDICE do passo concluído; pode ser o atual (avança 1) ou à frente (fast-forward)
    if (!c?.onb || c.onb.done || step < c.onb.step) return;
    const gained = step - c.onb.step + 1; // passos concluídos nesta ação
    const finished = step + 1 >= ONB_STEPS.length;
    setChar((p) => {
      if (!p?.onb || p.onb.done || step < p.onb.step) return p;
      const n = { ...p, onb: finished ? { done: true, step } : { done: false, step: step + 1 }, gold: p.gold + 60 * gained };
      return applyXp(n, 40 * gained);
    });
    const st = ONB_STEPS[step];
    setTimeout(() => {
      pushToast(`✅ ${st.emoji} ${st.title} — +${40 * gained} XP · +${60 * gained} ouro`, "good");
      worldAudio.play("coin");
      if (finished) {
        pushToast("🎓 Aventureiro de Bateu formado! O mundo é teu.", "good");
        showBanner({ kind: "discover", emoji: "🎓", title: "AVENTUREIRO DE BATEU", sub: "Guia completo — o mundo inteiro desbloqueado" });
        confetti({ particleCount: 120, spread: 85, origin: { y: 0.55 }, colors: ["#fbbf24", "#38bdf8", "#f43f5e"] });
      }
    }, 60);
  }, [applyXp, pushToast, showBanner]);

  const onbSkip = useCallback(() => {
    setChar((p) => (p?.onb && !p.onb.done ? { ...p, onb: { done: true, step: p.onb.step } } : p));
    setTimeout(() => pushToast("🧭 Guia ignorado — explora livre, herói!", "info"), 40);
  }, [pushToast]);

  // passo 0 (explorar): polling da posição do herói
  useEffect(() => {
    if (phase !== "world" || char?.onb?.done || char?.onb?.step !== 0) return;
    const iv = setInterval(() => {
      const pos = engineRef.current?.getPos?.();
      if (pos && Math.hypot(pos.x, pos.z) > 16) onbAdvance(0);
    }, 700);
    return () => clearInterval(iv);
  }, [phase, char?.onb?.done, char?.onb?.step, onbAdvance]);

  // passo 4 (ficha do herói): abrir o painel completa o guia
  useEffect(() => {
    if (panel === "char") onbAdvance(4);
  }, [panel, onbAdvance]);

  // ── Entrada no mundo ───────────────────────────────────────
  const enterWorld = useCallback((c: Char) => {
    const today = todayStr();
    // v6: identidade da CONTA — o progresso segue-te em qualquer dispositivo
    if (user) c.uid = "bw_" + user.id;
    if (c.lastDaily !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      c.streak = c.lastDaily === yesterday ? c.streak + 1 : 1;
      c.lastDaily = today;
      const bonus = 150 + c.streak * 50;
      c.gold += bonus;
      c.pts += 5;
      setTimeout(() => pushToast(`🔥 Presença diária: +${bonus} ouro · +5 pts (streak ${c.streak})`, "good"), 900);
    }
    persist(c);
    setChar(c);
    setPhase("world");
    // v8: sincroniza atividades em fila de sessões anteriores
    flushWorldActivity();
  }, [persist, pushToast, user]);

  // ── Ações do Banco de Pontos ───────────────────────────────
  const doExchange = useCallback(async (id: string) => {
    const c = charRef.current;
    if (!c) return;
    const ex = EXCHANGES.find((e) => e.id === id);
    if (!ex) return;
    if (c.pts < ex.cost) {
      pushToast(`Pontos insuficientes — precisas de ${ex.cost} pts`, "info");
      return;
    }
    setChar((p) => {
      if (!p || p.pts < ex.cost) return p;
      const n = { ...p, pts: p.pts - ex.cost };
      if (id === "gold") { n.gold += 200; pushToast("💰 +200 de ouro no ponto!", "good"); }
      if (id === "shield") {
        const until = Date.now() + 600000;
        n.shieldUntil = until;
        engineRef.current?.setShield(600000);
        pushToast("🛡️ Escudo ativo durante 10 minutos!", "good");
      }
      if (id === "ticket") {
        pushToast("🎫 Bilhete garantido! Boa sorte no sorteio.", "good");
        setTimeout(() => go("/sorteios"), 800);
      }
      if (id === "voucher") {
        const pd = platformRef.current;
        const avail = (pd?.vouchers || []).filter((v) => !p.vouchers.find((x) => x.id === v.id));
        if (avail.length > 0) {
          const v = avail[Math.floor(Math.random() * avail.length)];
          const label = voucherLabel(v);
          n.vouchers = [...p.vouchers, { id: v.id, code: v.code, label }];
          pushToast(`🎟️ Cupão real ${v.code} é teu!`, "good");
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          // v6: o cupão fica GUARDADO NA CONTA da plataforma (não só no dispositivo)
          claimWorldVoucher(v.id, v.code, label).then((okk) => {
            if (okk) pushToast("☁️ Cupão sincronizado com a tua conta!", "good");
          });
        } else {
          n.gold += 300;
          pushToast("Sem cupões novos disponíveis — +300 de ouro como alternativa!", "info");
        }
      }
      if (id === "cash") {
        (async () => {
          const res = await exchangeWorldPoints(ex.cost, p.uid);
          if (res === "ok") pushToast("💵 10 MT creditados na tua carteira!", "good");
          else if (res === "no-auth") {
            pushToast("Entra na tua conta Bateu para receber moeda real — o pedido ficou registado.", "info");
            n.gold += 100; // compensação local enquanto não há conta
          } else {
            pushToast("Conversão em fila — o saldo será creditado na tua conta.", "info");
          }
        })();
      }
      return n;
    });
  }, [pushToast]);

  // ── Motor 3D ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "world" || !canvasRef.current || !char || engineRef.current) return;
    const c = charRef.current!;

    const eng = new WorldEngine(canvasRef.current, {
      name: c.name, classId: c.classId, level: c.level, uid: c.uid,
      stats: calcStats(c),
      avatar: c.avatar,
      onEvent: (ev) => {
        const cur = charRef.current;
        if (!cur) return;
        switch (ev.type) {
          case "hp":
            setHud({ hp: Math.round(ev.hp), maxHp: Math.round(ev.maxHp), hit: ev.hit ? Date.now() : 0 });
            break;
          case "gain": {
            setChar((p) => {
              if (!p) return p;
              const n = { ...p, xp: p.xp + ev.xp, gold: p.gold + ev.gold };
              return applyXp(n, 0);
            });
            break;
          }
          case "kill": {
            setChar((p) => {
              if (!p) return p;
              const q = { ...p.quests };
              if (q.date === todayStr()) q.kills += 1; else { q.date = todayStr(); q.kills = 1; }
              const saga = { ...p.saga, kills: p.saga.kills + 1 };
              if (ev.boss) saga.bosses += 1;
              return applyXp({ ...p, kills: p.kills + 1, pts: p.pts + (ev.pts || 1), quests: q, saga }, 0);
            });
            onbAdvance(1);
            if (ev.boss) pushToast(`👑 Derrotaste o ${ev.name}! +${ev.pts} pts`, "good");
            break;
          }
          case "loot": {
            const it = ev.item as LootItem;
            setChar((p) => (p ? { ...p, inv: [...p.inv, it] } : p));
            const meta = RARITY_META[it.rarity];
            pushToast(`${it.emoji} ${meta.name}: ${it.name} (+${it.atk}⚔️ +${it.hp}❤️ +${it.spd}⚡)`, it.rarity >= 2 ? "good" : "info");
            if (it.rarity >= 2) {
              confetti({ particleCount: it.rarity === 3 ? 150 : 90, spread: 80, origin: { y: 0.55 }, colors: [meta.color, "#fbbf24"] });
              showBanner({ kind: "discover", emoji: it.emoji, title: meta.name.toUpperCase(), sub: it.name });
            }
            break;
          }
          case "combo": {
            setCombo(ev.n);
            if (comboTimer.current) clearTimeout(comboTimer.current);
            comboTimer.current = setTimeout(() => setCombo(0), 4200);
            break;
          }
          case "arena": {
            if (ev.action === "start") {
              setArenaHud({ wave: 0, alive: 0 });
              showBanner({ kind: "wave", emoji: "🏟️", title: "ARENA DAS ONDAS", sub: "Sobrevive o máximo de ondas que conseguires!" });
            } else if (ev.action === "wave") {
              setArenaHud({ wave: ev.wave, alive: ev.count });
              showBanner({ kind: "wave", emoji: ev.boss ? "👑" : "⚔️", title: `ONDA ${ev.wave}`, sub: ev.boss ? "ONDA DE CHEFE — cuidado!" : `${ev.count} inimigos entraram na arena` });
            } else if (ev.action === "cleared") {
              setArenaHud((h) => (h ? { ...h, alive: 0 } : h));
              pushToast(`✅ Onda ${ev.wave} limpa! +${ev.pts} pts · +${ev.gold} ouro`, "good");
              setChar((p) => {
                if (!p) return p;
                const q = { ...p.quests };
                if (q.date === todayStr()) q.waves += 1; else { q.date = todayStr(); q.waves = 1; }
                return { ...p, wavesBest: Math.max(p.wavesBest, ev.wave), quests: q };
              });
            } else if (ev.action === "end") {
              setArenaHud(null);
              if (ev.wave > 0) {
                setArenaEnd({ wave: ev.wave, kills: ev.kills, pts: ev.pts, gold: ev.gold, xp: ev.xp });
                setChar((p) => {
                  if (!p) return p;
                  const n = applyXp({ ...p, gold: p.gold + ev.gold, pts: p.pts + ev.pts, wavesBest: Math.max(p.wavesBest, ev.wave) }, ev.xp);
                  return n;
                });
              }
            }
            break;
          }
          case "near":
            setNear(ev.label);
            break;
          case "inside":
            // v8: entrou/saiu de um interior (casa, farol, fortim...)
            setInside(ev.on ? { name: ev.name, desc: ev.desc } : null);
            break;
          case "open":
            if (ev.kind === "arena") {
              setCard({ kind: "arena", id: "arena" });
            } else {
              handleOpen(ev.kind, ev.id);
            }
            break;
          case "quest":
            setChar((p) => {
              if (!p) return p;
              const q = { ...p.quests };
              if (q.date !== todayStr()) { q.date = todayStr(); q.kills = 0; q.chest = 0; q.visit = 0; q.steal = 0; q.waves = 0; q.item = 0; q.duel = 0; q.atk = 0; q.home = 0; }
              const saga = { ...p.saga };
              if (ev.kind === "chest") { q.chest += 1; saga.chests += 1; }
              if (ev.kind === "visit") q.visit += 1;
              if (ev.kind === "home") q.home += 1;
              return { ...p, quests: q, saga };
            });
            break;
          case "discover": {
            // v8: tudo o que acontece fica registado na plataforma
            logWorldActivity(cur.uid, "discover", ev.name, 10);
            setChar((p) => {
              if (!p) return p;
              if (p.discoveries.includes(ev.id)) return p;
              const n = applyXp({ ...p, pts: p.pts + 10, discoveries: [...p.discoveries, ev.id], saga: { ...p.saga, discovers: p.saga.discovers + 1 } }, ev.xp);
              return n;
            });
            showBanner({ kind: "discover", emoji: ev.emoji, title: ev.name, sub: "Descoberta! +60 XP · +10 pts" });
            confetti({ particleCount: 60, spread: 60, origin: { y: 0.55 }, colors: ["#fbbf24", "#38bdf8"] });
            break;
          }
          case "skill2": {
            if (!ev.ok) {
              if (ev.reason === "locked") pushToast(`Poder desbloqueia no nível ${ev.lvl}`, "info");
              else if (ev.reason === "cd") setSkillCds((s) => s.map((v, i) => (i === ev.slot ? Math.max(v, ev.remain) : v)));
            } else {
              setSkillCds((s) => s.map((v, i) => (i === ev.slot ? ev.cd : v)));
            }
            break;
          }
          case "pvpatk":
            setChar((p) => {
              if (!p) return p;
              const q = { ...p.quests };
              if (q.date === todayStr()) q.atk += 1; else { q.date = todayStr(); q.atk = 1; }
              return { ...p, quests: q };
            });
            break;
          case "worldevent":
            setWorldEvent({ kind: ev.kind, name: ev.name, emoji: ev.emoji, until: Date.now() + (ev.dur || 60000) });
            showBanner({ kind: "wave", emoji: ev.emoji, title: String(ev.name || "").toUpperCase(), sub: ev.desc || "" });
            pushToast(`${ev.emoji} ${ev.name}: ${ev.desc}`, "info");
            break;
          case "worldeventend":
            setWorldEvent(null);
            pushToast(`⏳ ${ev.name || "Acontecimento"} terminou — até à próxima!`, "info");
            break;
          case "guard":
            setGuardOn(!!ev.on);
            break;
          case "region":
            showBanner({ kind: "discover", emoji: ev.emoji || "🗺️", title: (ev.name || "").toUpperCase(), sub: ev.desc || "" });
            pushToast(`🗺️ ${ev.name}: ${ev.desc}`, "info");
            break;
          case "pvphitby":
            pushToast(`⚔️ ${ev.name} atacou-te (-${ev.dmg})!`, "bad");
            break;
          case "pvp": {
            if (ev.action === "steal") {
              setChar((p) => {
                if (!p) return p;
                const n = { ...p, pts: p.pts + (ev.pts || 0) + (ev.bonus || 0), stolenFrom: p.stolenFrom + 1, saga: { ...p.saga, steals: p.saga.steals + 1 } };
                const q = { ...p.quests };
                if (q.date === todayStr()) { q.steal += 1; q.duel += 1; } else { q.date = todayStr(); q.steal = 1; q.duel = 1; }
                if (ev.item) q.item += 1;
                n.quests = q;
                if (ev.coupon) n.vouchers = [...p.vouchers, ev.coupon];
                if (ev.item) n.inv = [...p.inv, ev.item];
                return n;
              });
              logWorldActivity(cur.uid, "steal", `Roubou ${ev.pts} pts a ${ev.victim}`, ev.pts || 0);
              if (ev.coupon) {
                (async () => {
                  try {
                    const { supabase: sbs } = await import("@/integrations/supabase/client");
                    await sbs.rpc("world_steal_voucher", { p_victim_guest: ev.victimId || "", p_code: ev.coupon.code, p_label: ev.coupon.label, p_voucher_id: ev.coupon.id });
                  } catch { /* silencioso */ }
                })();
              }
              pushToast(`💀 Roubaste ${ev.pts} pts a ${ev.victim}${ev.bonus ? ` +${ev.bonus} FRENESI!` : ""}${ev.coupon ? ` + cupão ${ev.coupon.code}!` : ""}${ev.item ? ` + ITEM ${ev.item.emoji} ${ev.item.name}!` : ""}`, "good");
              worldAudio.play("steal");
              confetti({ particleCount: ev.item || ev.coupon ? 140 : 100, spread: 70, origin: { y: 0.5 }, colors: ["#f43f5e", "#fbbf24"] });
            } else if (ev.action === "death") {
              // Fui roubado — calcula perdas e transmite (v7: também posso perder um ITEM)
              setChar((p) => {
                if (!p) return p;
                const stolenPts = Math.min(p.pts, Math.max(10, Math.ceil(p.pts * 0.25)));
                let coupon = null;
                if (p.vouchers.length > 0 && Math.random() < 0.35) {
                  coupon = p.vouchers[Math.floor(Math.random() * p.vouchers.length)];
                }
                let item: LootItem | null = null;
                if (p.inv.length > 0 && Math.random() < 0.3) {
                  item = p.inv[Math.floor(Math.random() * p.inv.length)];
                }
                const n: Char = {
                  ...p,
                  pts: p.pts - stolenPts,
                  vouchers: coupon ? p.vouchers.filter((v) => v.id !== coupon.id) : p.vouchers,
                  inv: item ? p.inv.filter((it) => it.id !== item.id) : p.inv,
                  lostTo: p.lostTo + 1,
                  deaths: p.deaths + 1,
                  shieldUntil: Date.now() + 180000,
                };
                engineRef.current?.setShield(180000);
                engineRef.current?.broadcastPvpDeath(ev.killerId, ev.by, stolenPts, coupon, item);
                return n;
              });
              setDeathFx(true);
              pushToast(`💀 ${ev.by} derrotou-te e roubou-te pontos/cupões/itens! Proteção de 3 min ativa.`, "bad");
              setTimeout(() => setDeathFx(false), 1600);
            } else if (ev.action === "feed") {
              pushToast(`⚔️ ${ev.kn} roubou ${ev.vn}... o mundo é perigoso!`, "info");
            }
            break;
          }
          // ── v11: câmaras, clima, recolha, diálogo, montaria ──
          case "camchange":
            setCamMode(ev.mode as 0 | 1 | 2);
            break;
          case "weather":
            pushToast(`${ev.emoji} ${ev.name}: ${ev.desc}`, "info");
            setWeatherChip(ev.kind === "clear" ? null : { name: ev.name, emoji: ev.emoji });
            break;
          case "gather":
            setChar((p) => {
              if (!p) return p;
              const mat = { ...p.mat };
              if (ev.kind === "erva") mat.erva += 1;
              else if (ev.kind === "minério") mat.minerio += 1;
              else mat.cristal += 1;
              const q = { ...p.quests };
              if (q.date === todayStr()) q.gather += 1;
              else { q.date = todayStr(); q.gather = 1; }
              return { ...p, mat, quests: q };
            });
            pushToast(`${ev.kind === "erva" ? "🌿" : ev.kind === "minério" ? "⛏️" : "💎"} +1 ${ev.name} — material para a Oficina!`, "good");
            if (ev.kind === "erva") onbAdvance(2);
            worldAudio.play("coin");
            break;
          case "dialogue":
            setDialogue(String(ev.npc || "gomas"));
            setDlgStep(0);
            setDlgText("");
            if (String(ev.npc || "").includes("gomas")) onbAdvance(3);
            break;
          case "mount":
            setMountOn(!!ev.on);
            pushToast(ev.on ? "🐺 Montaste o Lobo Veloz — +75% de velocidade!" : "🐺 Desmontaste — o lobo descansa.", "good");
            break;
          case "notify":
            pushToast(ev.msg, ev.tone);
            break;
          case "chat":
            setChatMsgs((m) => [...m.slice(-30), { n: ev.name, m: ev.msg }]);
            break;
          case "online":
            setOnline(Math.max(1, ev.count));
            break;
          case "playerjoin":
            if (ev.name) pushToast(`👋 ${String(ev.name).slice(0, 12)} entrou no mundo`, "info");
            break;
          case "death":
            setDeathFx(true);
            pushToast(`💀 Foste derrotado por ${ev.by}...`, "bad");
            setChar((p) => (p ? { ...p, deaths: p.deaths + 1 } : p));
            logWorldActivity(cur.uid, "death", `Derrotado por ${ev.by}`, 1);
            setTimeout(() => setDeathFx(false), 1600);
            break;
        }
      },
    });
    engineRef.current = eng;
    (window as any).__bw = eng; // debug hook
    // v4: pet já desbloqueado em saves antigos
    if (c.level >= 5 && !petToastDone.current) {
      petToastDone.current = true;
      eng.setPet(true);
    } else if (charRef.current?.pet) {
      eng.setPet(true);
    }
    if (platformRef.current) {
      eng.spawnPlatformObjects({
        raffles: platformRef.current.raffles.map((r) => ({ id: r.id, title: r.title, prizeTitle: r.prizeTitle })),
        contests: platformRef.current.contests.map((x) => ({ id: x.id, title: x.title, prize: x.prize })),
        vouchers: platformRef.current.vouchers.map((v) => ({ id: v.id, code: v.code, label: voucherLabel(v) })),
        assets: platformRef.current.assets.map((a) => ({ id: a.id, title: a.title, value: a.value, modality: a.modality })),
      });
    }

    // v8: PLATAFORMA AO VIVO — qualquer mudança (sorteio, concurso,
    // cupão, bem) reflete-se no mundo sem recarregar nada
    const unsubPlat = subscribePlatformLive((kind) => {
      (async () => {
        try {
          const pd = await fetchPlatformData();
          platformRef.current = pd;
          setPlatform(pd);
          eng.spawnPlatformObjects({
            raffles: pd.raffles.map((r) => ({ id: r.id, title: r.title, prizeTitle: r.prizeTitle })),
            contests: pd.contests.map((x) => ({ id: x.id, title: x.title, prize: x.prize })),
            vouchers: pd.vouchers.map((v) => ({ id: v.id, code: v.code, label: voucherLabel(v) })),
            assets: pd.assets.map((a) => ({ id: a.id, title: a.title, value: a.value, modality: a.modality })),
          });
          const msgs: Record<string, string> = {
            raffle: "🎁 Sorteios atualizados — novos cristais no Templo!",
            contest: "🏆 Concursos atualizados na Torre!",
            voucher: "🎟️ Novos cupões esperam-te no Cofre!",
            asset: "🛒 Novos bens na Feira Bateu!",
          };
          tickerId.current += 1;
          const tid = tickerId.current;
          setTicker((t) => [...t.slice(-2), { id: tid, msg: msgs[kind] || "📡 A plataforma foi atualizada!" }]);
          setTimeout(() => setTicker((t) => t.filter((x) => x.id !== tid)), 7000);
        } catch { /* ignore */ }
      })();
    });

    return () => {
      unsubPlat();
      eng.dispose();
      engineRef.current = null;
    };
  }, [phase, char?.uid]);

  const handleOpen = useCallback((kind: string, id: string) => {
    const c = charRef.current;
    if (kind === "voucher") {
      const pd = platformRef.current;
      const v = pd?.vouchers.find((x) => x.id === id);
      if (v && c && !c.vouchers.find((x) => x.id === v.id)) {
        const label = voucherLabel(v);
        setChar((p) => (p ? { ...p, vouchers: [...p.vouchers, { id: v.id, code: v.code, label }], gold: p.gold + 25 } : p));
        setCard({ kind, id });
        pushToast(`🎟️ Cupão ${v.code} guardado no teu perfil!`, "good");
        // v6: sincroniza o cupão com a conta da plataforma
        claimWorldVoucher(v.id, v.code, label).then((okk) => {
          if (okk) pushToast("☁️ Cupão sincronizado com a tua conta!", "good");
        });
      } else if (v) {
        setCard({ kind, id });
      } else {
        setChar((p) => (p ? { ...p, gold: p.gold + 60 } : p));
        pushToast("💰 Baú aberto: +60 ouro!", "good");
      }
      return;
    }
    if (kind === "bank") { setPanel("bank"); return; }
    setCard({ kind, id });
  }, [pushToast]);

  // cooldown dos poderes
  useEffect(() => {
    if (!skillCds.some((c) => c > 0)) return;
    const t = setTimeout(() => setSkillCds((s) => s.map((v) => Math.max(0, v - 1))), 1000);
    return () => clearTimeout(t);
  }, [skillCds]);

  // v11: máquina de escrever do diálogo dos NPCs
  useEffect(() => {
    if (!dialogue) return;
    const npc = NPC_LINES[dialogue];
    if (!npc) return;
    const full = npc.lines[Math.min(dlgStep, npc.lines.length - 1)] || "";
    if (dlgText.length >= full.length) return;
    const t = setTimeout(() => setDlgText(full.slice(0, dlgText.length + 1)), 16);
    return () => clearTimeout(t);
  }, [dialogue, dlgStep, dlgText]);

  // sincroniza stats com o motor (v6: inclui DEFESA)
  useEffect(() => {
    if (!char || phase !== "world") return;
    const s = calcStats(char);
    engineRef.current?.syncStats(s, char.level);
  }, [char?.allocAtk, char?.allocHp, char?.allocSpd, char?.allocDef, char?.level, phase]);

  // v6: escudo equipado visível na mão esquerda do herói
  useEffect(() => {
    if (!char || phase !== "world") return;
    const es = char.equipped?.escudo || null;
    engineRef.current?.setShieldMesh(es ? es.rarity : null);
  }, [char?.equipped?.escudo?.id, phase]);

  // minimapa
  useEffect(() => {
    if (phase !== "world") return;
    let alive = true;
    const draw = () => {
      if (!alive) return;
      const cv = document.getElementById("bw-minimap") as HTMLCanvasElement | null;
      const eng = engineRef.current;
      if (!cv || !eng) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const d = eng.getMinimap();
      const S = 100;
      const toMap = (x: number, z: number) => [S / 2 + (x / 320) * S, S / 2 + (z / 320) * S];
      ctx.clearRect(0, 0, S, S);
      ctx.fillStyle = "rgba(10,14,25,0.85)";
      ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = "rgba(120,140,180,0.4)";
      ctx.strokeRect(1, 1, S - 2, S - 2);
      ctx.fillStyle = "rgba(120,140,180,0.5)";
      ctx.fillRect(S / 2 - 1, 4, 2, S - 8);
      ctx.fillRect(4, S / 2 - 1, S - 8, 2);
      // marcos/descobertas
      for (const m of d.marks || []) {
        const [mx, my] = toMap(m.x, m.z);
        ctx.fillStyle = m.found ? "#fbbf24" : "rgba(160,170,190,0.5)";
        ctx.font = "7px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(m.found ? "★" : "·", mx, my + 2);
      }
      for (const p of d.pois) {
        const [mx, my] = toMap(p.x, p.z);
        ctx.fillStyle = { raffle: "#c084fc", asset: "#fbbf24", contest: "#f59e0b", voucher: "#f87171", games: "#38bdf8", bank: "#fde047" }[p.k] || "#fff";
        ctx.beginPath(); ctx.arc(mx, my, 3, 0, 7); ctx.fill();
      }
      for (const m of d.mobs) {
        const [mx, my] = toMap(m.x, m.z);
        ctx.fillStyle = ["#4ade80", "#f97316", "#a855f7", "#38bdf8", "#f43f5e"][m.t] || "#fff";
        ctx.fillRect(mx - 1, my - 1, 2, 2);
      }
      for (const pl of d.players) {
        const [mx, my] = toMap(pl.x, pl.z);
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath(); ctx.arc(mx, my, 2, 0, 7); ctx.fill();
      }
      const [px, py] = toMap(d.px, d.pz);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(px, py - 4); ctx.lineTo(px + 3, py + 3); ctx.lineTo(px - 3, py + 3);
      ctx.closePath(); ctx.fill();
    };
    const iv = setInterval(draw, 220);
    return () => { alive = false; clearInterval(iv); };
  }, [phase]);

  // ── Ações ──────────────────────────────────────────────────
  const allocate = (kind: "atk" | "hp" | "spd" | "def") => {
    setChar((p) => {
      if (!p || p.points <= 0) return p;
      const n = { ...p, points: p.points - 1 };
      if (kind === "atk") n.allocAtk += 1;
      if (kind === "hp") n.allocHp += 1;
      if (kind === "spd") n.allocSpd += 1;
      if (kind === "def") n.allocDef += 1; // v6: defesa
      return n;
    });
  };

  const claimQuest = (k: "K" | "C" | "V" | "S" | "W" | "I" | "D" | "A" | "H" | "G") => {
    setChar((p) => {
      if (!p) return p;
      const q = { ...p.quests };
      const key = k === "K" ? "cK" : k === "C" ? "cC" : k === "V" ? "cV" : k === "S" ? "cS" : k === "W" ? "cW" : k === "I" ? "cI" : k === "D" ? "cD" : k === "H" ? "cH" : k === "G" ? "cG" : "cA";
      if ((q as any)[key]) return p;
      const done = k === "K" ? q.kills >= 10 : k === "C" ? q.chest >= 1 : k === "V" ? q.visit >= 1 : k === "S" ? q.steal >= 1 : k === "W" ? q.waves >= 3 : k === "I" ? q.item >= 1 : k === "D" ? q.duel >= 3 : k === "H" ? q.home >= 2 : k === "G" ? q.gather >= 6 : q.atk >= 5;
      if (!done) return p;
      (q as any)[key] = true;
      let { gold, xp, pts } = p;
      if (k === "K") { gold += 250; }
      if (k === "C") { xp += 120; }
      if (k === "V") { xp += 80; }
      if (k === "S") { gold += 150; }
      if (k === "W") { gold += 350; pts += 20; }
      if (k === "I") { gold += 300; pts += 20; }
      if (k === "D") { gold += 250; pts += 15; }
      if (k === "A") { gold += 200; pts += 10; }
      if (k === "H") { gold += 150; pts += 10; }
      if (k === "G") { gold += 180; xp += 150; }
      const n = applyXp({ ...p, gold, xp, pts, quests: q }, 0);
      if (k === "H") logWorldActivity(p.uid, "quest", "Missão de interiores concluída", 10);
      if (k === "G") logWorldActivity(p.uid, "quest", "Missão de recolha concluída", 10);
      pushToast(k === "K" ? "✅ Missão: +250 ouro" : k === "S" ? "✅ Missão de ladrão: +150 ouro" : k === "W" ? "✅ Missão de arena: +350 ouro · +20 pts" : k === "I" ? "✅ Ladrão de Relíquias: +300 ouro · +20 pts" : k === "D" ? "✅ Duelista: +250 ouro · +15 pts" : k === "H" ? "✅ Explorador de Interiores: +150 ouro · +10 pts" : k === "G" ? "✅ Colheita Dourada: +180 ouro · +150 XP" : k === "A" ? "✅ Predador: +200 ouro · +10 pts" : "✅ Missão concluída: +XP", "good");
      return n;
    });
  };

  // ── v11: câmaras · ecrã inteiro · leitor de música · Oficina · NPCs ──

  const toggleFs = useCallback(async () => {
    const el = worldWrapRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        const my = ++fsSeq.current; // invalida timeouts de toggles anteriores
        const req = (el as any).requestFullscreen || (el as any).webkitRequestFullscreen;
        if (req) {
          // v13: Promise.race — em WebViews/páginas escondidas o requestFullscreen
          // pode ficar PENDENTE para sempre, o que congelava o fallback visual
          await Promise.race([
            Promise.resolve(req.call(el)).catch(() => {}),
            new Promise((r) => setTimeout(r, 600)),
          ]);
        }
        try { await (screen.orientation as any)?.lock?.("landscape"); } catch { /* rotação opcional */ }
        // v11: alguns motores (headless/WebView) engajam e saem logo — se em
        // 450ms não houver fullscreen real, entra no modo visual (fallback)
        setTimeout(() => {
          if (fsSeq.current === my && !document.fullscreenElement) setIsFs(true);
        }, 450);
      } else {
        fsSeq.current++; // sai: cancela fallbacks pendentes
        // v13: race também na saída — exitFullscreen pode ficar pendente em WebViews
        await Promise.race([
          Promise.resolve((document as any).exitFullscreen?.()).catch(() => {}),
          new Promise((r) => setTimeout(r, 400)),
        ]);
        try { (screen.orientation as any)?.unlock?.(); } catch { /* ignore */ }
        setIsFs(false);
      }
    } catch {
      // fallback CSS puro — ecrã inteiro "fake" quando a API não existe
      setIsFs((v) => !v);
      try { await (screen.orientation as any)?.lock?.("landscape"); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    document.addEventListener("webkitfullscreenchange", h);
    return () => { document.removeEventListener("fullscreenchange", h); document.removeEventListener("webkitfullscreenchange", h); };
  }, []);

  const pickTrack = (i: number) => { setTrackIdx(worldAudio.setTrack(i)); };
  const changeVol = (v: number) => { setMusicVolState(v); worldAudio.setMusicVol(v); };

  const craftPotion = (kind: "vida" | "forca" | "vento") => {
    const cost = kind === "vida" ? { erva: 3, minerio: 0, cristal: 1 } : kind === "forca" ? { erva: 2, minerio: 2, cristal: 0 } : { erva: 1, minerio: 1, cristal: 2 };
    setChar((p) => {
      if (!p) return p;
      if (p.mat.erva < cost.erva || p.mat.minerio < cost.minerio || p.mat.cristal < cost.cristal) {
        pushToast("Materiais insuficientes — recolhe ervas, minérios e cristais no mundo!", "info");
        return p;
      }
      const mat = {
        erva: p.mat.erva - cost.erva,
        minerio: p.mat.minerio - cost.minerio,
        cristal: p.mat.cristal - cost.cristal,
      };
      const pot = { ...p.pot, [kind]: p.pot[kind] + 1 };
      pushToast(`⚗️ Poção fabricada na Oficina! Usa-a na mochila quando precisares.`, "good");
      worldAudio.play("craft");
      return { ...p, mat, pot };
    });
  };

  const usePotion = (kind: "vida" | "forca" | "vento") => {
    setChar((p) => {
      if (!p || p.pot[kind] <= 0) return p;
      engineRef.current?.usePotion(kind);
      return { ...p, pot: { ...p.pot, [kind]: p.pot[kind] - 1 } };
    });
  };

  const claimNpcGift = (npc: "gomas" | "lurdes" | "sabio") => {
    setChar((p) => {
      if (!p) return p;
      if (p.npcDay?.date === todayStr() && p.npcDay?.[npc]) return p;
      const npcDay = { date: todayStr(), gomas: false, lurdes: false, sabio: false, ...(p.npcDay || {}), [npc]: true };
      npcDay.date = todayStr();
      const n = { ...p, npcDay } as Char;
      if (npc === "gomas") { n.gold += 120; n.xp += 100; pushToast("🧙 Mestre Gomas: +120 ouro · +100 XP — volta amanhã!", "good"); }
      if (npc === "lurdes") { n.pot = { ...n.pot, vida: n.pot.vida + 1 }; pushToast("🛠️ Ferreira Lurdes ofereceu-te uma Poção de Vida!", "good"); }
      if (npc === "sabio") { n.pts += 5; n.xp += 60; pushToast("📜 O Velho Sábio partilhou sabedoria: +5 pts · +60 XP", "good"); }
      worldAudio.play("heal");
      return applyXp(n, 0);
    });
  };

  const claimChallenge = (c: 1 | 2) => {
    setChar((p) => {
      if (!p || p.chal.date !== todayStr()) return p;
      if (c === 1 && p.chal.c1) return p;
      if (c === 2 && p.chal.c2) return p;
      const can1 = p.quests.kills >= 25;
      const can2 = p.quests.steal >= 2;
      if (c === 1 && !can1) return p;
      if (c === 2 && !can2) return p;
      const n = { ...p, chal: { ...p.chal, ["c" + c]: true } };
      if (c === 1) { n.gold += 400; n.pts += 15; pushToast("🏅 Desafio do Caçador: +400 ouro · +15 pts", "good"); }
      if (c === 2) { n.gold += 300; n.pts += 25; pushToast("🏅 Desafio do Ladrão: +300 ouro · +25 pts", "good"); }
      return n;
    });
  };

  const claimSaga = () => {
    setChar((p) => {
      if (!p) return p;
      const step = SAGA[p.sagaIdx];
      if (!step) return p;
      if (step.prog(p) < step.goal) return p;
      const n: Char = { ...p, sagaIdx: p.sagaIdx + 1, saga: { ...p.saga } };
      step.apply(n);
      confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 }, colors: ["#f43f5e", "#fbbf24", "#38bdf8"] });
      pushToast(`📜 SAGA — ${step.title} concluída! ${step.reward}`, "good");
      return applyXp(n, 0);
    });
  };

  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatMsgs((m) => [...m.slice(-30), { n: charRef.current?.name || "Eu", m: msg }]);
    engineRef.current?.sendChat(msg);
    setChatInput("");
  };

  const go = (route: string) => {
    if (onNavigate) onNavigate(route);
    else window.location.href = route;
  };

  const copyCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      pushToast("📋 Código copiado!", "good");
    } catch { /* ignore */ }
  };

  // v4: equipar / vender itens da mochila
  const equipItem = (item: LootItem) => {
    setChar((p) => {
      if (!p) return p;
      const old = p.equipped[item.slot];
      const inv = p.inv.filter((x) => x.id !== item.id);
      if (old) inv.push(old);
      const equipped = { ...p.equipped, [item.slot]: item };
      pushToast(`✅ Equipaste ${item.name}!`, "good");
      return { ...p, inv, equipped };
    });
  };

  const sellItem = (item: LootItem) => {
    const price = [40, 120, 320, 800][item.rarity] ?? 40;
    setChar((p) => {
      if (!p) return p;
      pushToast(`💰 Vendeste ${item.name} por ${price} de ouro`, "good");
      return { ...p, inv: p.inv.filter((x) => x.id !== item.id), gold: p.gold + price };
    });
  };

  // ── Render ─────────────────────────────────────────────────
  if (phase === "boot") {
    return (
      <div className="relative z-10 w-full h-[76svh] min-h-[520px] md:h-auto md:min-h-0 md:aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center gap-4 text-white">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 60%, rgba(244,63,94,0.12) 0%, transparent 55%), radial-gradient(circle at 30% 30%, rgba(56,189,248,0.1) 0%, transparent 45%)" }} />
        <motion.div className="text-5xl" animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>🌍</motion.div>
        <p className="font-display font-bold text-xl bg-gradient-to-r from-rose-300 to-amber-200 bg-clip-text text-transparent">Bateu World</p>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          {bootMsg}
        </div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full w-1/3 rounded-full bg-gradient-to-r from-rose-400 to-amber-300" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} />
        </div>
      </div>
    );
  }

  // ── v9: SEM GATE — convidados entram direto na criação de herói ──

  if (phase === "create") {
    const sel = CLASSES[pickClass];
    // v13 MOBILE: criação em altura quase plena (76svh) — caixa 4/3 de 292px
    // obrigava a scroll interno minúsculo no telemóvel (1.ª impressão do jogo!)
    return (
      <div className="relative z-10 w-full h-[76svh] min-h-[520px] md:h-auto md:min-h-0 md:aspect-video rounded-2xl overflow-hidden text-white bg-slate-950" data-testid="bateu-create">
        {/* fundo animado v3 */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{ background: [
            "radial-gradient(circle at 70% 20%, #f43f5e 0%, transparent 45%), radial-gradient(circle at 20% 80%, #38bdf8 0%, transparent 40%)",
            "radial-gradient(circle at 30% 70%, #8b5cf6 0%, transparent 45%), radial-gradient(circle at 80% 30%, #fbbf24 0%, transparent 40%)",
            "radial-gradient(circle at 70% 20%, #f43f5e 0%, transparent 45%), radial-gradient(circle at 20% 80%, #38bdf8 0%, transparent 40%)",
          ] }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        {/* estrelas decorativas */}
        {[[12, 18], [30, 8], [55, 14], [78, 22], [88, 60], [8, 70], [45, 82], [70, 88]].map(([l, t], i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/70"
            style={{ left: `${l}%`, top: `${t}%` }}
            animate={{ opacity: [0.15, 0.9, 0.15], scale: [1, 1.6, 1] }}
            transition={{ duration: 2.4 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}

        <div className="relative h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center gap-3 md:gap-4">
          <div className="text-center">
            <motion.div
              className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/30 to-amber-500/30 border border-white/20 text-3xl shadow-lg shadow-rose-500/20"
              animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >🌍</motion.div>
            <h2 className="font-display text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-rose-300 via-amber-200 to-sky-300 bg-clip-text text-transparent">BATEU WORLD 3D</h2>
            <p className="text-white/70 text-xs md:text-sm mt-0.5">O MMO da plataforma — luta, sobe de nível, rouba cupões e troca pontos por moeda real</p>
          </div>

          {/* classes com anel de seleção v3 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full max-w-lg">
            {CLASSES.map((cl, i) => (
              <motion.button
                key={cl.name}
                onClick={() => { setPickClass(i); worldAudio.play("click"); }}
                whileTap={{ scale: 0.94 }}
                className={`relative rounded-2xl border-2 p-3 text-center transition-all overflow-hidden ${pickClass === i ? "border-white/70 bg-white/15 scale-[1.04]" : "border-white/15 bg-white/5 hover:border-white/40"}`}
              >
                {pickClass === i && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${cl.color}55 0%, transparent 70%)` }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <motion.div
                  className={`relative text-3xl mb-1 ${pickClass === i ? "" : "opacity-80"}`}
                  animate={pickClass === i ? { scale: [1, 1.14, 1] } : {}}
                  transition={{ duration: 1.6, repeat: Infinity }}
                >{cl.emoji}</motion.div>
                <p className="relative font-bold text-sm">{cl.name}</p>
                <p className="relative text-[10px] text-white/60 leading-tight mt-0.5">{cl.desc}</p>
                <div className="relative mt-1.5 flex justify-center gap-1">
                  {[0, 1, 2].map((s) => (
                    <span key={s} className={`h-1 w-4 rounded-full ${s === 0 ? "bg-rose-400" : s === 1 ? "bg-emerald-400" : "bg-sky-400"} ${pickClass === i ? "" : "opacity-40"}`} />
                  ))}
                </div>
              </motion.button>
            ))}
          </div>

          <motion.div
            key={sel.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg rounded-xl border border-white/15 bg-black/30 px-4 py-2 text-center text-[11px] text-white/80 backdrop-blur"
          >
            <b style={{ color: sel.color }}>{sel.emoji} {sel.name}</b> — 3 poderes próprios que desbloqueiam nos níveis 3, 7 e 12
          </motion.div>

          {/* v5: editor de avatar com preview 3D ao vivo */}
          <div className="w-full max-w-lg rounded-2xl border border-violet-400/25 bg-black/40 p-3 backdrop-blur" data-testid="bw-avatar-editor">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="mx-auto shrink-0 sm:mx-0">
                <AvatarPreview
                  cfg={avDraft}
                  classColor={parseInt(sel.color.slice(1), 16)}
                  className="h-44 w-36 rounded-xl border border-white/15 bg-gradient-to-b from-slate-800 to-slate-950"
                />
                <button
                  data-testid="bw-av-random"
                  onClick={() => { setAvDraft(randomAvatar(pickClass)); worldAudio.play("click"); }}
                  className="mt-1.5 w-full rounded-lg border border-white/20 bg-white/10 py-1.5 text-[10px] font-bold text-white hover:bg-white/20"
                >
                  🎲 Aleatório
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-[11px] font-bold text-violet-200">✨ Personaliza o teu avatar — visível para todos os jogadores</p>
                <AvatarSwatches cfg={avDraft} onChange={setAvDraft} />
              </div>
            </div>
          </div>

          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim()) enterWorld(newChar(nameInput, pickClass, avDraft)); }}
            placeholder="Nome do teu herói"
            maxLength={14}
            className="w-full max-w-lg rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-center font-bold placeholder:text-white/40 outline-none focus:border-rose-400 transition-colors"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => nameInput.trim() && enterWorld(newChar(nameInput, pickClass, avDraft))}
            className="relative w-full max-w-lg overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-3.5 font-display font-black text-lg shadow-lg shadow-rose-500/30"
          >
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-120%", "120%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            />
            <span className="relative">ENTRAR NO MUNDO →</span>
          </motion.button>
          {/* v9: nota de convidado — joga já, guarda depois */}
          {!user && (
            <div data-testid="guest-note" className="w-full max-w-lg rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-center text-[11px] text-amber-200">
              👋 <b>Sem registo? Também podes jogar!</b> O progresso fica neste dispositivo —
              <button onClick={() => go("/register")} data-testid="guest-register" className="ml-1 underline font-black hover:text-amber-100">cria conta grátis</button>
              {" "}para o guardar na nuvem e receber moeda real.
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full max-w-lg text-[11px] text-white/70">
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">⚔️ 3 poderes por classe</div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">💀 Rouba cupões no PvP</div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">🎒 Loot lendário + mochila</div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">🏟️ Arena das Ondas</div>
          </div>
          <p className="max-w-lg text-center text-[10px] text-white/45">12 descobertas no mapa · pet companheiro no nível 5 · combo de mortes com XP bónus · troca pontos por moeda real no Banco</p>
        </div>
      </div>
    );
  }

  const stats = char ? calcStats(char) : { atk: 0, maxHp: 100, spd: 6, def: 2 };
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const xpPct = char ? Math.min(100, (char.xp / xpNeeded(char.level)) * 100) : 0;
  const q = char?.quests;
  const mySkills = SKILLS[char!.classId] || [];
  const shieldActive = (char?.shieldUntil || 0) > Date.now();

  // Dados do card aberto
  let cardData: React.ReactNode = null;
  if (card && platform) {
    if (card.kind === "raffle") {
      const r = platform.raffles.find((x) => x.id === card.id);
      if (r) cardData = (
        <>
          <div className="text-4xl mb-2">🎁</div>
          <h3 className="font-display font-black text-lg">{r.title}</h3>
          <p className="text-sm text-muted-foreground">Prémio: <b className="text-foreground">{r.prizeTitle}</b></p>
          <p className="text-sm text-muted-foreground">Valor: <b className="text-emerald-400">{fmtMZN(r.prizeValue)}</b> · Bilhete: <b>{fmtMZN(r.ticketPrice)}</b></p>
          <button onClick={() => go(worldRoute("raffle", r))} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 font-bold text-white hover:bg-rose-400">
            <ExternalLink className="h-4 w-4" /> Participar no Sorteio
          </button>
        </>
      );
    } else if (card.kind === "contest") {
      const c = platform.contests.find((x) => x.id === card.id);
      if (c) cardData = (
        <>
          <div className="text-4xl mb-2">🏆</div>
          <h3 className="font-display font-black text-lg">{c.title}</h3>
          {c.prize && <p className="text-sm text-muted-foreground">Prémio: <b className="text-amber-400">{c.prize}</b></p>}
          {c.description && <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{c.description}</p>}
          <button onClick={() => go(worldRoute("contest", c))} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-white hover:bg-amber-400">
            <ExternalLink className="h-4 w-4" /> Ver Concurso
          </button>
        </>
      );
    } else if (card.kind === "asset") {
      const a = platform.assets.find((x) => x.id === card.id);
      if (a) cardData = (
        <>
          <div className="text-4xl mb-2">🛒</div>
          <h3 className="font-display font-black text-lg">{a.title}</h3>
          <p className="text-sm text-muted-foreground">{MODALITY_LABEL[a.modality] || a.modality} · <b className="text-emerald-400">{fmtMZN(a.value)}</b></p>
          {a.city && <p className="text-xs text-muted-foreground">📍 {a.city}{a.province ? `, ${a.province}` : ""}</p>}
          <button onClick={() => go(worldRoute("asset", a))} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 font-bold text-white hover:bg-emerald-400">
            <ExternalLink className="h-4 w-4" /> Ver / Comprar
          </button>
        </>
      );
    } else if (card.kind === "voucher") {
      const v = platform.vouchers.find((x) => x.id === card.id);
      if (v) {
        const mine = char?.vouchers.find((x) => x.id === v.id);
        cardData = (
          <>
            <div className="text-4xl mb-2">🎟️</div>
            <h3 className="font-display font-black text-lg">Cupão {voucherLabel(v)}</h3>
            <div className="my-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-rose-400/60 bg-rose-500/10 px-4 py-3">
              <span className="font-mono font-black tracking-wider text-rose-300">{v.code}</span>
              <button onClick={() => copyCode(v.code)} className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20"><Copy className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">{mine ? "✅ Guardado no teu perfil — usa-o nas compras da plataforma!" : "Guardado no teu perfil de herói."}</p>
          </>
        );
      }
    } else if (card.kind === "games") {
      cardData = (
        <>
          <div className="text-4xl mb-2">🌀</div>
          <h3 className="font-display font-black text-lg">Jogos da Plataforma</h3>
          <p className="text-sm text-muted-foreground">Roleta, Millionaire, quiz e mais de 80 jogos para jogar com amigos.</p>
          <button onClick={() => go("/lives")} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 font-bold text-white hover:bg-sky-400">
            <ExternalLink className="h-4 w-4" /> Abrir Jogos
          </button>
        </>
      );
    } else if (card.kind === "arena") {
      cardData = (
        <>
          <div className="text-4xl mb-2">🏟️</div>
          <h3 className="font-display font-black text-lg">Arena das Ondas</h3>
          <p className="text-sm text-muted-foreground">Sobrevivência infinita: ondas cada vez mais difíceis, chefe a cada 5 ondas. Ganhos por onda limpa e bónus final por ondas+mortes.</p>
          <p className="text-xs text-muted-foreground mt-1">O teu recorde: <b className="text-amber-300">onda {char?.wavesBest || 0}</b></p>
          <button
            onClick={() => { setCard(null); engineRef.current?.startArena(); }}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2.5 font-bold text-white hover:brightness-110"
            data-testid="bw-arena-start"
          >
            <Swords className="h-4 w-4" /> ENTRAR NA ARENA
          </button>
        </>
      );
    }
  }

  return (
    <div
      ref={worldWrapRef}
      data-bw-fs={isFs ? "1" : undefined}
      style={isFs ? { height: "100dvh", width: "100vw" } : undefined}
      className={`relative z-10 w-full overflow-hidden bg-slate-900 select-none ${isFs ? "!fixed inset-0 z-[90] !h-full !w-full !rounded-none !aspect-auto" : "h-[72svh] min-h-[480px] md:h-auto md:min-h-0 md:aspect-video rounded-2xl"}`}
      data-testid="bateu-world"
    >
      {/* v13 MOBILE: touch-none impede o browser de roubar o arrasto (zoom/scroll) — câmara contínua no dedo */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

      {/* flash de dano / morte */}
      <AnimatePresence>
        {hud.hit > 0 && (
          <motion.div key={`hit-${hud.hit}`} className="pointer-events-none absolute inset-0 bg-red-600/25" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.4 }} />
        )}
        {/* v3: vinheta permanente subtil para foco */}
        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 90px 20px rgba(2,6,23,0.55)" }} />
        {deathFx && (
          <motion.div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-red-950/70 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.p className="font-display text-3xl md:text-4xl font-black text-red-300 drop-shadow-[0_0_18px_rgba(248,113,113,0.8)]" initial={{ scale: 0.6, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
              💀 Derrotado
            </motion.p>
            <motion.p className="text-xs font-bold text-white/70" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}>
              A renascer na Praça Bateu...
            </motion.p>
            {/* v13: consolo na derrota — amortece a aversão à perda e evita abandono
                (o XP/ouro/itens do jogador NÃO são afetados por morte contra mobs) */}
            <motion.p className="text-[10px] font-semibold text-emerald-300/90" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              Tranquilo — o teu XP, ouro e itens estão seguros. 💪
            </motion.p>
          </motion.div>
        )}
        {/* v4: HUD da ARENA — ondas */}
        <AnimatePresence>
          {arenaHud && (
            <motion.div
              key="arena-hud"
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="pointer-events-none absolute left-1/2 top-9 z-20 -translate-x-1/2"
              data-testid="bw-arena-hud"
            >
              <div className="flex items-center gap-2 rounded-full border border-orange-400/50 bg-black/75 px-4 py-1.5 backdrop-blur">
                <Swords className="h-3.5 w-3.5 text-orange-300" />
                <span className="text-xs font-black text-orange-200">ONDA {arenaHud.wave}</span>
                <span className="h-3 w-px bg-white/25" />
                <span className="text-xs font-bold text-white/85">{arenaHud.alive > 0 ? `${arenaHud.alive} restantes` : "prepara..."}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* v7: ACONTECIMENTO DO MUNDO — chip com contagem regressiva */}
        <AnimatePresence>
          {worldEvent && (
            <motion.div
              key="world-event"
              initial={{ opacity: 0, y: -14, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -14 }}
              className="pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2"
              data-testid="bw-world-event"
            >
              <motion.div
                className="flex items-center gap-2 rounded-full border border-fuchsia-400/60 bg-black/80 px-4 py-1.5 backdrop-blur"
                animate={{ boxShadow: ["0 0 14px rgba(232,121,249,0.35)", "0 0 30px rgba(232,121,249,0.6)", "0 0 14px rgba(232,121,249,0.35)"] }}
                transition={{ duration: 1.3, repeat: Infinity }}
              >
                <motion.span className="text-base" animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }} transition={{ duration: 1.1, repeat: Infinity }}>{worldEvent.emoji}</motion.span>
                <span className="text-xs font-black uppercase tracking-wider text-fuchsia-200">{worldEvent.name}</span>
                <span className="h-3 w-px bg-white/25" />
                <span className="text-[11px] font-black tabular-nums text-white/85">{Math.max(0, Math.ceil((worldEvent.until - eventNow) / 1000))}s</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* v4: COMBO — contador central direito */}
        <AnimatePresence>
          {combo >= 2 && (
            <motion.div
              key="combo"
              initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
              animate={{ opacity: 1, scale: [1.15, 1], rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="pointer-events-none absolute right-[16%] top-[30%] z-20"
              data-testid="bw-combo"
            >
              <motion.p
                className="font-display text-4xl font-black italic drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]"
                style={{ color: combo >= 8 ? "#fde047" : combo >= 5 ? "#fb923c" : "#f87171" }}
                animate={{ scale: combo >= 2 ? [1, 1.18, 1] : 1 }}
                transition={{ duration: 0.28 }}
              >
                x{combo}!
              </motion.p>
              <p className="text-center text-[10px] font-black tracking-widest text-white/80">COMBO</p>
            </motion.div>
          )}
        </AnimatePresence>
        {/* v3: banner cinematográfico (descoberta / level-up) */}
        <AnimatePresence>
          {banner && (
            <motion.div
              key={`banner-${banner.title}`}
              className="pointer-events-none absolute left-0 right-0 top-[26%] z-30 flex flex-col items-center"
              initial={{ opacity: 0, y: 26, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
            >
              <motion.div
                className={`flex items-center gap-3 rounded-2xl border px-6 py-3 shadow-2xl backdrop-blur-md ${banner.kind === "levelup" ? "border-amber-300/60 bg-gradient-to-r from-amber-500/25 via-yellow-400/20 to-amber-500/25" : "border-sky-300/60 bg-gradient-to-r from-sky-500/25 via-cyan-400/20 to-sky-500/25"}`}
                animate={{ boxShadow: banner.kind === "levelup" ? ["0 0 24px rgba(251,191,36,0.35)", "0 0 48px rgba(251,191,36,0.6)", "0 0 24px rgba(251,191,36,0.35)"] : ["0 0 24px rgba(56,189,248,0.35)", "0 0 48px rgba(56,189,248,0.6)", "0 0 24px rgba(56,189,248,0.35)"] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                <motion.span className="text-4xl" animate={{ rotate: banner.kind === "discover" ? [0, -12, 12, 0] : [0, 8, -8, 0], scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                  {banner.emoji}
                </motion.span>
                <div className="text-center">
                  <p className={`font-display text-xl font-black tracking-wide ${banner.kind === "levelup" ? "text-amber-200" : "text-sky-200"}`}>{banner.title}</p>
                  <p className="text-[11px] font-bold text-white/80">{banner.sub}</p>
                </div>
              </motion.div>
              {/* raios laterais */}
              <motion.div
                className="mt-1 h-px w-2/3"
                style={{ background: banner.kind === "levelup" ? "linear-gradient(90deg, transparent, #fbbf24, transparent)" : "linear-gradient(90deg, transparent, #38bdf8, transparent)" }}
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>

      {/* v3: barra de CHEFE / guardião */}
      <AnimatePresence>
        {bossBar && (
          <motion.div
            key="bossbar"
            initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
            className="pointer-events-none absolute left-1/2 top-14 z-20 w-[260px] -translate-x-1/2"
            data-testid="bw-bossbar"
          >
            <div className="rounded-xl border border-red-500/40 bg-black/70 px-3 py-1.5 backdrop-blur">
              <div className="mb-1 flex items-center justify-between text-[10px] font-black">
                <span className="flex items-center gap-1 text-red-300"><Crown className="h-3 w-3" /> {bossBar.name}</span>
                <span className="text-white/60">{Math.ceil(bossBar.pct * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-orange-400" animate={{ width: `${bossBar.pct * 100}%` }} transition={{ duration: 0.25 }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HUD principal (esconde-se no modo foto) ── */}
      {!photoMode && (
        <>
      {/* HUD topo-esquerda v3 (vidro + anel de classe + buffs) */}
      <div className="pointer-events-none absolute left-2 top-2 w-[214px] rounded-2xl border border-white/15 bg-black/55 p-2.5 text-white shadow-xl backdrop-blur-md" style={isFs ? { left: "calc(0.5rem + env(safe-area-inset-left, 0px))", top: "calc(0.5rem + env(safe-area-inset-top, 0px))" } : undefined}>
        <div className="flex items-center gap-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ background: CLASSES[char!.classId]?.color + "33", border: `1.5px solid ${CLASSES[char!.classId]?.color}` }}>
            {CLS_EMOJIS[char!.classId]}
            {char!.points > 0 && <motion.span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold">{char!.name} <span className="text-white/60">· Nv{char!.level}</span></p>
            <p className="text-[9px] font-bold tracking-wide text-amber-300/90 -mt-0.5">{titleFor(char!.level)}</p>
            {/* HP com brilho v3 */}
            <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-white/15">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-rose-600 via-red-500 to-rose-400" animate={{ width: `${hpPct}%` }} transition={{ duration: 0.3 }} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
              {hpPct < 30 && <motion.div className="absolute inset-0 rounded-full bg-red-500/40" animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 0.9, repeat: Infinity }} />}
            </div>
            <div className="relative mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/15">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300" animate={{ width: `${xpPct}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-2.5 text-[11px] text-white/80">
          <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-rose-400" />{hud.hp}/{hud.maxHp}</span>
          <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3 text-amber-400" />{char!.gold}</span>
          <span className="inline-flex items-center gap-1 font-black text-yellow-300">🏆 {char!.pts}</span>
        </div>
        {/* v3: chips de buffs ativos */}
        {(shieldActive || buffs.atk > 0 || buffs.hot > 0 || char!.pet) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {char!.pet && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/25 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
                <PawPrint className="h-2.5 w-2.5" /> Companheiro +8%
              </span>
            )}
            {shieldActive && (
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/25 px-1.5 py-0.5 text-[9px] font-bold text-sky-200">
                <Shield className="h-2.5 w-2.5" /> Escudo {Math.ceil(((char!.shieldUntil || 0) - Date.now()) / 60000)}m
              </span>
            )}
            {buffs.atk > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-500/25 px-1.5 py-0.5 text-[9px] font-bold text-red-200">
                <Swords className="h-2.5 w-2.5" /> +50% {Math.ceil(buffs.atk / 1000)}s
              </span>
            )}
            {buffs.hot > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/25 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">
                <Sparkles className="h-2.5 w-2.5" /> Regen {Math.ceil(buffs.hot / 1000)}s
              </span>
            )}
          </div>
        )}
      </div>

      {/* v3: rastreador de objetivos (saga + diária) sob o HUD */}
      {char && SAGA[char.sagaIdx] && (
        <motion.button
          onClick={() => setPanel("quests")}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className="absolute left-2 top-[118px] z-10 w-[214px] rounded-xl border border-amber-400/30 bg-black/50 p-2 text-left text-white backdrop-blur-md hover:bg-black/70 transition-colors"
          style={isFs ? { left: "calc(0.5rem + env(safe-area-inset-left, 0px))" } : undefined}
          data-testid="bw-tracker"
        >
          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-300"><Target className="h-2.5 w-2.5" /> Objetivo da Saga</p>
          <p className="truncate text-[11px] font-bold">{SAGA[char.sagaIdx].title}</p>
          {(() => {
            const step = SAGA[char.sagaIdx];
            const prog = Math.min(step.prog(char), step.goal);
            return (
              <div className="mt-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all" style={{ width: `${(prog / step.goal) * 100}%` }} />
                </div>
                <p className="mt-0.5 text-[9px] text-white/60">{step.desc} · {prog}/{step.goal}</p>
              </div>
            );
          })()}
        </motion.button>
      )}

      {/* v10: topo-direita desce para debaixo da barra de navegação —
          em ecrãs estreitos as duas linhas sobrepunham-se (foto/som
          ficavam escondidas atrás de Definições — bug visual) */}
      <div className="absolute right-2 top-[46px] z-10 flex flex-col items-end gap-1.5" style={isFs ? { right: "calc(0.5rem + env(safe-area-inset-right, 0px))", top: "calc(2.875rem + env(safe-area-inset-top, 0px))" } : undefined}>
        <div className="pointer-events-none hidden items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm sm:flex">
          <Users className="h-3 w-3 text-sky-400" /> {online} online
          {platform?.live && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
        </div>
        <div className="relative hidden sm:block">
          <canvas id="bw-minimap" width={100} height={100} className="rounded-xl border border-white/25 shadow-lg" />
          <span className="pointer-events-none absolute left-1/2 top-0.5 -translate-x-1/2 text-[7px] font-black text-white/80">N</span>
        </div>
        <div className="pointer-events-none hidden rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold text-white/80 backdrop-blur-sm sm:block">
          <MapPin className="mr-0.5 inline h-2.5 w-2.5 text-amber-300" />{char!.discoveries.length}/{LANDMARKS.length} descobertas
        </div>
        {/* v3: roda de emotes */}
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => setEmoteOpen((o) => !o)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur transition-colors ${emoteOpen ? "bg-white text-slate-900" : "bg-black/55 text-white hover:bg-black/75"}`}
            data-testid="bw-emote-btn"
          >
            <Smile className="h-3 w-3" /> Emotes
          </button>
          <AnimatePresence>
            {emoteOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.9 }}
                className="grid grid-cols-3 gap-1 rounded-xl border border-white/15 bg-black/70 p-1.5 backdrop-blur"
                data-testid="bw-emotes"
              >
                {EMOTES.map((em) => (
                  <button
                    key={em}
                    onClick={() => { engineRef.current?.emote(em); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-base transition-transform hover:scale-110 hover:bg-white/20 active:scale-90"
                  >
                    {em}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* toasts */}
      <div className="pointer-events-none absolute left-1/2 top-11 z-20 flex w-[300px] -translate-x-1/2 flex-col items-center gap-1">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur ${t.tone === "good" ? "bg-emerald-600/90" : t.tone === "bad" ? "bg-red-600/90" : "bg-slate-800/90"}`}
            >
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* chat */}
      <div className="absolute bottom-2 right-2 z-10 w-[220px]" style={isFs ? { right: "calc(0.5rem + env(safe-area-inset-right, 0px))", bottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" } : undefined}>
        {chatOpen ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-black/65 p-2 text-white backdrop-blur">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] font-bold text-white/60 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> CHAT GLOBAL</p>
              <button onClick={() => setChatOpen(false)}><X className="h-3.5 w-3.5 text-white/60" /></button>
            </div>
            <div className="max-h-[120px] space-y-0.5 overflow-y-auto text-[11px]">
              {chatMsgs.length === 0 && <p className="text-white/40">Fala com outros heróis...</p>}
              {chatMsgs.slice(-8).map((m, i) => (
                <p key={i}><b className="text-sky-300">{m.n}:</b> <span className="text-white/85">{m.m}</span></p>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                placeholder="Mensagem..."
                maxLength={140}
                className="min-w-0 flex-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] outline-none placeholder:text-white/30"
              />
              <button onClick={sendChat} className="rounded-lg bg-sky-500 px-2 py-1 text-[11px] font-bold">➤</button>
            </div>
          </motion.div>
        ) : (
          <button onClick={() => setChatOpen(true)} className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur hover:bg-black/75">
            <MessageSquare className="h-3.5 w-3.5" /> Chat
          </button>
        )}
      </div>

      {/* prompt de interação */}
      <AnimatePresence>
        {near && !card && (
          <motion.button
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            onClick={() => engineRef.current?.interact()}
            className={`absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-white px-5 py-2 text-sm font-black text-slate-900 shadow-xl hover:scale-105 transition-transform ${char?.onb && !char.onb.done ? "bottom-[7.5rem]" : "bottom-24"}`}
            data-testid="bw-interact"
          >
            {near} <span className="ml-1 text-slate-400">[E]</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* v6: bússola do destino marcado */}
      <AnimatePresence>
        {compass && (
          <motion.div
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            className="absolute left-2 top-14 z-10 flex items-center gap-2 rounded-full border border-amber-400/40 bg-black/60 px-3 py-1.5 backdrop-blur"
            data-testid="bw-compass"
          >
            <span className="relative flex h-7 w-7 items-center justify-center">
              <motion.span
                className="text-lg leading-none"
                style={{ rotate: compass.angle * 180 / Math.PI }}
                animate={{ rotate: compass.angle * 180 / Math.PI }}
                transition={{ type: "tween", duration: 0.25 }}
              >🧭</motion.span>
            </span>
            <span className="text-[10px] font-black text-amber-300">{compass.dist > 999 ? `${(compass.dist / 1000).toFixed(1)}km` : `${Math.round(compass.dist)}m`}</span>
            <button onClick={() => engineRef.current?.clearWaypoint()} className="text-[9px] text-white/40 hover:text-white">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v6: indicador de GUARDA ativa */}
      <AnimatePresence>
        {guardOn && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute left-2 top-24 z-10 rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1 text-[10px] font-black text-amber-200 backdrop-blur"
            data-testid="bw-guard-indicator"
          >
            🛡️ GUARDA — bloqueando 40%
          </motion.div>
        )}
      </AnimatePresence>

      {/* v8: ESTÁS EM — interior de um edifício (zona segura) */}
      <AnimatePresence>
        {inside && (
          <motion.div
            key={inside.name}
            initial={{ opacity: 0, y: 12, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.94 }}
            className="pointer-events-none absolute bottom-32 left-1/2 z-10 -translate-x-1/2"
            data-testid="bw-inside"
          >
            <div className="flex max-w-[300px] items-center gap-2 rounded-2xl border border-amber-300/50 bg-black/75 px-4 py-2 shadow-xl backdrop-blur">
              <span className="text-lg">🏠</span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-black text-amber-200">{inside.name}</span>
                <span className="block text-[9px] font-bold text-emerald-300">Zona segura · vida a recuperar</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v8: ticker da plataforma ao vivo — o que acontece fora aparece aqui */}
      <div className="pointer-events-none absolute bottom-40 left-2 z-10 flex flex-col items-start gap-1" style={isFs ? { left: "calc(0.5rem + env(safe-area-inset-left, 0px))" } : undefined}>
        <AnimatePresence>
          {ticker.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -14, scale: 0.92 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -14, scale: 0.92 }}
              className="max-w-[240px] rounded-xl border border-sky-400/40 bg-black/70 px-3 py-1.5 text-[10px] font-bold text-sky-100 shadow-lg backdrop-blur"
              data-testid="bw-ticker"
            >
              <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* painel de navegação superior — v10: foto e som vivem aqui para
          nunca colidirem com a coluna direita; rótulos só em ecrãs largos
          v13 MOBILE: flex-wrap — em 390px a linha transbordava e os últimos
          botões (ecrã inteiro/foto/som) ficavam CORTADOS e intocáveis */}
      <div className="absolute top-2 left-1/2 z-10 flex max-w-[96vw] -translate-x-1/2 flex-wrap justify-center gap-1.5" style={isFs ? { top: "calc(0.5rem + env(safe-area-inset-top, 0px))" } : undefined}>
        {([
          ["char", <User key="u" className="h-4 w-4" />, "Herói"],
          ["inv", <Backpack key="i" className="h-4 w-4" />, "Mochila"],
          ["quests", <ScrollText key="q" className="h-4 w-4" />, "Missões"],
          ["bank", <Landmark key="b" className="h-4 w-4" />, "Banco"],
          ["rank", <Trophy key="r" className="h-4 w-4" />, "Ranking"],
          ["map", <Map key="m" className="h-4 w-4" />, "Mapa"],
          ["set", <Settings key="s" className="h-4 w-4" />, "Definições"],
        ] as const).map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => setPanel((p) => (p === id ? "none" : id))}
            aria-label={label}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold backdrop-blur transition-colors ${panel === id ? "bg-white text-slate-900" : "bg-black/55 text-white hover:bg-black/75"}`}
            data-testid={`bw-nav-${id}`}
          >
            {icon}<span className="hidden lg:inline">{label}</span>
            {id === "char" && char!.points > 0 && <span className="ml-0.5 h-2 w-2 rounded-full bg-emerald-400" />}
            {id === "quests" && <span className="ml-0.5 h-2 w-2 rounded-full bg-amber-400" />}
            {id === "inv" && char!.inv.length > 0 && <span className="ml-0.5 rounded-full bg-sky-400 px-1 text-[8px] font-black text-slate-900">{char!.inv.length}</span>}
          </button>
        ))}
        <div className="mx-0.5 w-px self-stretch bg-white/20" />
        {/* v11: CÂMARAS — orbital · 1ª pessoa Minecraft · 3ª pessoa GTA */}
        <div className="flex items-center gap-0.5 rounded-full bg-black/55 p-0.5 backdrop-blur" data-testid="bw-cam-group">
          {([0, 1, 2] as const).map((m) => (
            <button
              key={m}
              onClick={() => engineRef.current?.setCamMode(m)}
              aria-label={m === 0 ? "Câmara Orbital" : m === 1 ? "Primeira pessoa" : "Terceira pessoa"}
              className={`rounded-full p-1.5 transition-colors ${camMode === m ? "bg-white text-slate-900" : "text-white/75 hover:text-white"}`}
              data-testid={`bw-cam-${m}`}
              title={m === 0 ? "Câmara Orbital (clássica)" : m === 1 ? "1ª Pessoa — tipo Minecraft (C)" : "3ª Pessoa — tipo San Andreas (C)"}
            >
              {m === 0 ? <Video className="h-4 w-4" /> : m === 1 ? <Eye className="h-4 w-4" /> : <Gamepad2 className="h-4 w-4" />}
            </button>
          ))}
        </div>
        {/* v11: ECRÃ INTEIRO */}
        <button
          onClick={toggleFs}
          aria-label="Ecrã inteiro"
          className="flex items-center rounded-full bg-black/55 p-1.5 text-white backdrop-blur transition-colors hover:bg-black/75"
          data-testid="bw-fs"
          title="Ecrã inteiro"
        >
          {isFs ? <Minimize2 className="h-4 w-4 text-amber-300" /> : <Maximize2 className="h-4 w-4 text-white" />}
        </button>
        {/* v11: LEITOR DE MÚSICA — faixas originais sem direitos de autor */}
        <button
          onClick={() => { setMusicOpen((v) => !v); worldAudio.ensure(); }}
          aria-label="Banda sonora"
          className={`flex items-center rounded-full p-1.5 backdrop-blur transition-colors ${musicOpen ? "bg-white text-slate-900" : "bg-black/55 text-white hover:bg-black/75"}`}
          data-testid="bw-music"
          title="Banda sonora do mundo"
        >
          <Music className={`h-4 w-4 ${musicOpen ? "text-slate-900" : "text-fuchsia-300"}`} />
        </button>
        {/* v10: modo foto + som mudaram da coluna direita para aqui */}
        <button
          onClick={togglePhoto}
          aria-label="Modo foto"
          className="flex items-center rounded-full bg-black/55 p-1.5 text-white backdrop-blur transition-colors hover:bg-black/75"
          data-testid="bw-photo"
          title="Modo Foto (P)"
        >
          <Camera className="h-4 w-4 text-sky-300" />
        </button>
        <button
          onClick={() => setMuted(worldAudio.toggleMute())}
          aria-label={muted ? "Ligar som" : "Desligar som"}
          className="flex items-center rounded-full bg-black/55 p-1.5 text-white backdrop-blur transition-colors hover:bg-black/75"
          data-testid="bw-sound"
          title={muted ? "Ligar som (M)" : "Desligar som (M)"}
        >
          {muted ? <VolumeX className="h-4 w-4 text-red-300" /> : <Volume2 className="h-4 w-4 text-emerald-300" />}
        </button>
      </div>

      {/* v11: LEITOR DE MÚSICA — 5 faixas ORIGINAIS (0% direitos de autor) */}
      <AnimatePresence>
        {musicOpen && (
          <motion.div
            key="music-player"
            initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-12 left-1/2 z-20 w-[248px] -translate-x-1/2 rounded-2xl border border-fuchsia-400/40 bg-black/85 p-3 shadow-2xl backdrop-blur-md"
            data-testid="bw-music-player"
          >
            <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-fuchsia-300">♪ Banda Sonora Bateu · 100% original</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{MUSIC_TRACKS[trackIdx].emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-white" data-testid="bw-track-name">{MUSIC_TRACKS[trackIdx].name}</p>
                <p className="truncate text-[9px] font-bold text-white/50">{MUSIC_TRACKS[trackIdx].desc} · {MUSIC_TRACKS[trackIdx].bpm} BPM</p>
              </div>
              <button onClick={() => setTrackIdx(worldAudio.prevTrack())} className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20" data-testid="bw-music-prev" title="Anterior">⏮</button>
              <button onClick={() => { setTrackIdx(worldAudio.nextTrack()); }} className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20" data-testid="bw-music-next" title="Próxima">⏭</button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px]">🔊</span>
              <input
                type="range" min={0.05} max={1} step={0.05} value={musicVol}
                onChange={(e) => changeVol(parseFloat(e.target.value))}
                className="h-1.5 flex-1 accent-fuchsia-400"
                data-testid="bw-vol"
              />
              <span className="w-8 text-right text-[9px] font-black text-white/60">{Math.round(musicVol * 100)}%</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {MUSIC_TRACKS.map((tr, i) => (
                <button key={tr.id} onClick={() => pickTrack(i)} className={`rounded-full px-2 py-0.5 text-[9px] font-black transition-colors ${i === trackIdx ? "bg-fuchsia-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
                  {tr.emoji} {i + 1}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v11: chip do CLIMA — chuva/tempestade ao vivo */}
      <AnimatePresence>
        {weatherChip && (
          <motion.div
            key="weather-chip"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none absolute left-1/2 top-24 z-10 -translate-x-1/2"
            data-testid="bw-weather"
          >
            <div className="flex items-center gap-2 rounded-full border border-sky-300/40 bg-black/70 px-3 py-1 text-[10px] font-black text-sky-100 backdrop-blur">
              <span className="animate-pulse">{weatherChip.emoji}</span> {weatherChip.name.toUpperCase()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v11: DIÁLOGO DE NPC — RPG com máquina de escrever */}
      <AnimatePresence>
        {dialogue && char && NPC_LINES[dialogue] && (
          <motion.div
            key="npc-dialogue"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="absolute bottom-40 left-1/2 z-30 w-[min(92%,420px)] -translate-x-1/2"
            data-testid="bw-dialogue"
          >
            <div className="rounded-2xl border border-violet-300/40 bg-slate-950/92 p-3.5 shadow-2xl backdrop-blur-md">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/25 text-xl">{NPC_LINES[dialogue].emoji}</span>
                <p className="text-xs font-black text-violet-200">{NPC_LINES[dialogue].name}</p>
                <button onClick={() => setDialogue(null)} className="ml-auto rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-black text-white/70 hover:bg-white/20" data-testid="bw-dialogue-close">✕ fechar</button>
              </div>
              <p className="min-h-[38px] text-[12px] leading-snug text-white/90">
                {dlgText}
                <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-violet-300 align-middle" />
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {NPC_LINES[dialogue].lines.map((_, i) => (
                    <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === dlgStep ? "bg-violet-300" : "bg-white/20"}`} />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {dlgStep < NPC_LINES[dialogue].lines.length - 1 && (
                    <button onClick={() => { setDlgStep((s) => s + 1); setDlgText(""); }} className="rounded-lg bg-white/10 px-3 py-1 text-[10px] font-black text-white hover:bg-white/20">continuar ▸</button>
                  )}
                  {dlgStep === NPC_LINES[dialogue].lines.length - 1 && NPC_LINES[dialogue].action === "gift" && (
                    <button onClick={() => { claimNpcGift("gomas"); setDialogue(null); }} className="rounded-lg bg-emerald-500 px-3 py-1 text-[10px] font-black text-white hover:bg-emerald-400" data-testid="bw-dialogue-gift">🎁 Bênção diária</button>
                  )}
                  {dlgStep === NPC_LINES[dialogue].lines.length - 1 && NPC_LINES[dialogue].action === "workshop" && (
                    <button onClick={() => { setPanel("inv"); setDialogue(null); }} className="rounded-lg bg-amber-500 px-3 py-1 text-[10px] font-black text-white hover:bg-amber-400" data-testid="bw-dialogue-forge">🛠️ Abrir Oficina</button>
                  )}
                  {dlgStep === NPC_LINES[dialogue].lines.length - 1 && NPC_LINES[dialogue].action === "lore" && (
                    <button onClick={() => { claimNpcGift("sabio"); setDialogue(null); }} className="rounded-lg bg-sky-500 px-3 py-1 text-[10px] font-black text-white hover:bg-sky-400" data-testid="bw-dialogue-lore">📜 Sabedoria (+5 pts)</button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v9: chip de convidado — lembra suave, nunca bloqueia */}
      {!user && (
        <button
          onClick={() => go("/register")}
          data-testid="bw-guest-chip"
          className="absolute top-[84px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500/15 px-3 py-1 text-[10px] font-black text-amber-200 backdrop-blur hover:bg-amber-500/25 sm:top-11"
        >
          👤 CONVIDADO — criar conta para guardar na nuvem
        </button>
      )}

      {/* joystick (mobile) */}
      <Joystick onMove={(x, y) => engineRef.current?.setJoystick(x, y)} fs={isFs} />

      {/* barra de poderes + botões de combate v3 (cooldown radial) */}
      <div className="absolute bottom-14 right-3 z-10 flex items-end gap-2" style={isFs ? { right: "calc(0.75rem + env(safe-area-inset-right, 0px))", bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" } : undefined}>
        <div className="flex flex-col items-center gap-2">
          {mySkills.map((sk, i) => {
            const locked = char!.level < sk.lvl;
            const cd = skillCds[i] || 0;
            const cdTotal = sk.cd || 1;
            const cdPct = cd > 0 ? cd / cdTotal : 0;
            return (
              <button
                key={sk.name}
                onClick={() => engineRef.current?.skill(i)}
                disabled={locked || cd > 0}
                data-testid={`bw-skill-${i}`}
                title={`${sk.name} — ${sk.desc}${locked ? ` (Nv${sk.lvl})` : ""}`}
                className={`relative flex h-12 w-12 items-center justify-center rounded-full text-xl font-black shadow-lg transition-all active:scale-90 ${locked ? "bg-slate-800/85 text-white/35" : cd > 0 ? "bg-slate-700/85 text-white/50" : "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/40 hover:scale-105"}`}
              >
                {!locked && cd <= 0 && <motion.span className="absolute inset-0 rounded-full border-2 border-white/60" animate={{ scale: [1, 1.12, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }} />}
                {locked ? "🔒" : sk.emoji}
                {cd > 0 && (
                  <>
                    <span className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(rgba(0,0,0,0.72) ${cdPct * 360}deg, transparent 0deg)` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-black">{cd}</span>
                  </>
                )}
                {!locked && <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 rounded-full bg-slate-900 px-0.5 text-[8px] font-black text-amber-300 flex items-center justify-center border border-amber-400/50">{i + 1}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => engineRef.current?.attack()}
            className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-600/40 transition-all hover:scale-105 active:scale-90"
            data-testid="bw-attack"
          >
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-white/50"
              animate={{ scale: [1, 1.14, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            <Swords className="h-7 w-7" />
          </button>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => engineRef.current?.toggleGuard()}
              data-testid="bw-guard"
              title="Modo Guarda (Shift) — bloqueia 40% do dano"
              className={`relative flex h-11 w-11 items-center justify-center rounded-full shadow-lg active:scale-90 ${guardOn ? "bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-900 ring-2 ring-white" : "bg-slate-700/90 text-white"}`}
            >
              {guardOn && <motion.span className="absolute inset-0 rounded-full border-2 border-amber-200" animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 1.2, repeat: Infinity }} />}
              <Shield className="h-5 w-5" />
            </motion.button>
            <button
              onClick={() => engineRef.current?.jump()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-600/90 text-white shadow-lg active:scale-90"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>
        {/* v11: MONTARIA — Lobo Veloz (desbloqueia ao nível 8) */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => engineRef.current?.toggleMount()}
          data-testid="bw-mount"
          title="Montaria: Lobo Veloz (V) — +75% de velocidade · desbloqueia ao Nv8"
          className={`relative flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-lg active:scale-90 ${mountOn ? "bg-gradient-to-br from-sky-400 to-cyan-500 text-white ring-2 ring-white" : "bg-slate-800/90 text-white/90"}`}
        >
          {mountOn ? "🐺" : "🐾"}
          {char!.level < 8 && <span className="absolute -top-1 -right-1 rounded-full bg-slate-900 px-1 text-[8px] font-black text-amber-300 border border-amber-400/50">Nv8</span>}
        </motion.button>
      </div>

      {/* v3: dica rotativa + atalhos (desktop) */}
      <div className="pointer-events-none absolute bottom-1 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-0.5 md:flex">
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIdx}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="rounded-full bg-black/45 px-3 py-1 text-[10px] font-bold text-white/70 backdrop-blur-sm"
          >
            {TIPS[tipIdx]}
          </motion.p>
        </AnimatePresence>
        <p className="text-[9px] text-white/40">
          WASD mover · rato girar · clique/F atacar (jogadores perto = PvP!) · 1/2/3 poderes · E interagir · M som
        </p>
      </div>

      {/* v13: ONBOARDING — cartão compacto com gradiente de meta visível */}
      {char?.onb && !char.onb.done && ONB_STEPS[char.onb.step] && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-3 left-1/2 z-20 w-[290px] max-w-[86vw] -translate-x-1/2 rounded-2xl border border-amber-300/40 bg-slate-950/85 p-2.5 text-white shadow-2xl backdrop-blur-md"
          data-testid="bw-onb"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">🧭 Primeiros passos · {char.onb.step + 1}/{ONB_STEPS.length}</p>
            <button onClick={onbSkip} className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/60 hover:bg-white/20" data-testid="bw-onb-skip">Pular</button>
          </div>
          <div className="mt-1 flex items-start gap-2">
            <span className="text-xl leading-none">{ONB_STEPS[char.onb.step].emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black leading-tight" data-testid="bw-onb-title">{ONB_STEPS[char.onb.step].title}</p>
              <p className="text-[10px] leading-snug text-white/65">{ONB_STEPS[char.onb.step].desc}</p>
            </div>
            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-300 border border-emerald-400/30">+40 XP</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            {ONB_STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < char!.onb!.step ? "bg-emerald-400" : i === char!.onb!.step ? "bg-amber-400" : "bg-white/15"} ${i === char!.onb!.step ? "animate-pulse" : ""}`} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Painéis ── */}
      <AnimatePresence>
        {panel === "char" && char && (
          <Panel title="Meu Herói" onClose={() => setPanel("none")}>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl" style={{ background: CLASSES[char.classId]?.color + "22", border: `1px solid ${CLASSES[char.classId]?.color}` }}>
                {CLS_EMOJIS[char.classId]}
              </div>
              <div>
                <p className="font-display font-black">{char.name} <span className="text-amber-300">· {titleFor(char.level)}</span></p>
                <p className="text-xs text-muted-foreground">{CLS_NAMES[char.classId]} · Nível {char.level} · {char.kills} inimigos derrotados</p>
              </div>
            </div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${xpPct}%` }} />
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">{char.xp} / {xpNeeded(char.level)} XP para o nível {char.level + 1}</p>

            <div className="mb-3 grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-1.5">
                <p className="text-sm font-black text-amber-300">🏆 {char.pts}</p>
                <p className="text-[9px] text-muted-foreground">Pontos de Troféu</p>
              </div>
              <div className="rounded-lg bg-sky-500/10 border border-sky-500/30 p-1.5">
                <p className="text-sm font-black text-sky-300">🗺️ {char.discoveries.length}/{LANDMARKS.length}</p>
                <p className="text-[9px] text-muted-foreground">Descobertas</p>
              </div>
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-1.5">
                <p className="text-sm font-black text-rose-300">💀 {char.stolenFrom}/{char.lostTo}</p>
                <p className="text-[9px] text-muted-foreground">Roubados / Perdidos</p>
              </div>
            </div>

            <div className="mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5">
              <p className="text-xs font-bold text-emerald-300">Pontos de atributo: {char.points}</p>
              {char.points <= 0 && <p className="text-[10px] text-muted-foreground">Sobe de nível para ganhares mais pontos.</p>}
            </div>

            <div className="space-y-2">
              <StatRow icon={<Swords className="h-4 w-4 text-rose-400" />} label="Ataque" value={stats.atk} disabled={char.points <= 0} onAdd={() => allocate("atk")} />
              <StatRow icon={<Heart className="h-4 w-4 text-red-400" />} label="Vida" value={stats.maxHp} addLabel="+12" disabled={char.points <= 0} onAdd={() => allocate("hp")} />
              <StatRow icon={<Zap className="h-4 w-4 text-amber-400" />} label="Velocidade" value={stats.spd.toFixed(1)} disabled={char.points <= 0} onAdd={() => allocate("spd")} />
              <StatRow icon={<Shield className="h-4 w-4 text-sky-400" />} label={`Defesa (−${Math.min(60, stats.def * 3)}% dano)`} value={stats.def} addLabel="+2" disabled={char.points <= 0} onAdd={() => allocate("def")} />
            </div>

            {/* v5: editor de aparência dentro do jogo */}
            <div className="mt-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold flex items-center gap-1"><User className="h-3.5 w-3.5 text-violet-300" /> Aparência do avatar</p>
                <button
                  data-testid="bw-appearance"
                  onClick={() => { setAvDraft(char.avatar); setAvEditing(!avEditing); worldAudio.play("click"); }}
                  className="rounded-lg bg-violet-500 px-3 py-1.5 text-[10px] font-black text-white hover:bg-violet-400"
                >
                  {avEditing ? "Fechar" : "Personalizar"}
                </button>
              </div>
              {avEditing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                    <div className="mx-auto shrink-0 sm:mx-0">
                      <AvatarPreview
                        cfg={avDraft}
                        classColor={parseInt(CLASSES[char.classId]?.color?.slice(1) || "ef4444", 16)}
                        className="h-40 w-32 rounded-xl border border-white/15 bg-gradient-to-b from-slate-800 to-slate-950"
                      />
                      <button
                        data-testid="bw-av-random-2"
                        onClick={() => setAvDraft(randomAvatar(char.classId))}
                        className="mt-1.5 w-full rounded-lg border border-white/20 bg-white/10 py-1.5 text-[10px] font-bold hover:bg-white/20"
                      >
                        🎲 Aleatório
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <AvatarSwatches cfg={avDraft} onChange={setAvDraft} />
                    </div>
                  </div>
                  <button
                    data-testid="bw-av-save"
                    onClick={() => {
                      setChar((p) => (p ? { ...p, avatar: avDraft } : p));
                      engineRef.current?.applyAvatar(avDraft);
                      setAvEditing(false);
                      pushToast("✨ Aparência atualizada — todos os jogadores já te veem assim!", "good");
                      showBanner({ kind: "discover", emoji: "✨", title: "APARÊNCIA", sub: "Novo visual aplicado ao teu avatar" });
                      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 }, colors: ["#a78bfa", "#fbbf24"] });
                    }}
                    className="mt-2 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2 text-xs font-black text-white shadow-lg shadow-violet-500/25"
                  >
                    GUARDAR APARÊNCIA
                  </button>
                </motion.div>
              )}
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold flex items-center gap-1"><Sparkles className="h-3 w-3 text-amber-400" /> Poderes ({CLS_NAMES[char.classId]})</p>
              <div className="space-y-1.5">
                {mySkills.map((sk, i) => (
                  <div key={sk.name} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${char.level >= sk.lvl ? "bg-amber-500/10 border border-amber-500/25" : "bg-white/5 opacity-60"}`}>
                    <span className="text-base">{char.level >= sk.lvl ? sk.emoji : "🔒"}</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold">{sk.name} <span className="text-[9px] text-white/40">tecla {i + 1}</span></p>
                      <p className="text-[9px] text-muted-foreground">{sk.desc}{char.level < sk.lvl ? ` · Nv${sk.lvl}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold flex items-center gap-1"><Map className="h-3 w-3 text-sky-400" /> Descobertas</p>
              <div className="flex flex-wrap gap-1">
                {LANDMARKS.map((l) => {
                  const found = char.discoveries.includes(l.id);
                  return (
                    <span key={l.id} className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${found ? "bg-amber-500/15 text-amber-300" : "bg-white/5 text-white/30"}`}>
                      {found ? `${l.emoji} ${l.name}` : "??? ????"}
                    </span>
                  );
                })}
              </div>
            </div>

            {char.vouchers.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-bold flex items-center gap-1"><Copy className="h-3 w-3" /> Cupões ganhos no mundo</p>
                <div className="flex flex-wrap gap-1.5">
                  {char.vouchers.map((v) => (
                    <button key={v.id} onClick={() => copyCode(v.code)} className="rounded-lg border border-dashed border-rose-400/50 bg-rose-500/10 px-2 py-1 text-[10px] font-mono font-bold text-rose-300">
                      {v.code} · {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 flex gap-2 text-[10px] text-muted-foreground">
              <span>🔥 Streak: {char.streak}d</span>
              <span>💀 Mortes: {char.deaths}</span>
              <button className="underline hover:text-foreground" onClick={() => { if (confirm("Recomeçar personagem do zero?")) { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_KEY_V4); localStorage.removeItem(LS_KEY_V3); window.location.reload(); } }}>
                Recomeçar
              </button>
            </div>
          </Panel>
        )}

        {panel === "quests" && q && (
          <Panel title="Missões & Desafios" onClose={() => setPanel("none")}>
            <div className="mb-3 flex gap-1.5">
              <button onClick={() => setQuestTab("daily")} className={`flex-1 rounded-lg py-1.5 text-[11px] font-black ${questTab === "daily" ? "bg-rose-500 text-white" : "bg-white/10 text-white/60"}`}>Diárias</button>
              <button onClick={() => setQuestTab("saga")} className={`flex-1 rounded-lg py-1.5 text-[11px] font-black ${questTab === "saga" ? "bg-amber-500 text-white" : "bg-white/10 text-white/60"}`}>Saga {char!.sagaIdx + 1}/10</button>
              <button onClick={() => setQuestTab("chal")} className={`flex-1 rounded-lg py-1.5 text-[11px] font-black ${questTab === "chal" ? "bg-violet-500 text-white" : "bg-white/10 text-white/60"}`}>Desafios</button>
            </div>

            {questTab === "daily" && (
              <>
                <QuestRow emoji="⚔️" title="Derrota 10 inimigos" progress={`${Math.min(q.kills, 10)}/10`} done={q.cK} canClaim={q.kills >= 10 && !q.cK} reward="+250 ouro" onClaim={() => claimQuest("K")} />
                <QuestRow emoji="🎟️" title="Abre 1 baú de cupões" progress={`${Math.min(q.chest, 1)}/1`} done={q.cC} canClaim={q.chest >= 1 && !q.cC} reward="+120 XP" onClaim={() => claimQuest("C")} />
                <QuestRow emoji="🎁" title="Visita um sorteio/concurso/bem" progress={`${Math.min(q.visit, 1)}/1`} done={q.cV} canClaim={q.visit >= 1 && !q.cV} reward="+80 XP" onClaim={() => claimQuest("V")} />
                <QuestRow emoji="💀" title="Rouba pontos a 1 jogador (PvP)" progress={`${Math.min(q.steal, 1)}/1`} done={q.cS} canClaim={q.steal >= 1 && !q.cS} reward="+150 ouro" onClaim={() => claimQuest("S")} />
                <QuestRow emoji="🏟️" title="Limpa 3 ondas na Arena" progress={`${Math.min(q.waves, 3)}/3`} done={q.cW} canClaim={q.waves >= 3 && !q.cW} reward="+350 ouro · +20 pts" onClaim={() => claimQuest("W")} />
                <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-rose-400">⚔️ Caça entre heróis — missões PvP</p>
                <QuestRow emoji="🎒" title="Rouba 1 ITEM a outro herói (PvP)" progress={`${Math.min(q.item, 1)}/1`} done={q.cI} canClaim={q.item >= 1 && !q.cI} reward="+300 ouro · +20 pts" onClaim={() => claimQuest("I")} testid="bw-quest-item" />
                <QuestRow emoji="🩸" title="Vence 3 heróis em duelo (PvP)" progress={`${Math.min(q.duel, 3)}/3`} done={q.cD} canClaim={q.duel >= 3 && !q.cD} reward="+250 ouro · +15 pts" onClaim={() => claimQuest("D")} testid="bw-quest-duel" />
                <QuestRow emoji="🎯" title="Acerta 5 golpes em heróis (PvP)" progress={`${Math.min(q.atk, 5)}/5`} done={q.cA} canClaim={q.atk >= 5 && !q.cA} reward="+200 ouro · +10 pts" onClaim={() => claimQuest("A")} testid="bw-quest-atk" />
                <QuestRow emoji="🏠" title="Entra 2 vezes em interiores (casas, farol…)" progress={`${Math.min(q.home, 2)}/2`} done={q.cH} canClaim={q.home >= 2 && !q.cH} reward="+150 ouro · +10 pts" onClaim={() => claimQuest("H")} testid="bw-quest-home" />
                <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-emerald-400">🌿 Vida de recolhedor — v11</p>
                <QuestRow emoji="🌿" title="Recolhe 6 recursos (ervas, minérios, cristais)" progress={`${Math.min(q.gather, 6)}/6`} done={q.cG} canClaim={q.gather >= 6 && !q.cG} reward="+180 ouro · +150 XP" onClaim={() => claimQuest("G")} testid="bw-quest-gather" />
                <p className="mt-3 text-[10px] text-muted-foreground">As missões diárias reiniciam todos os dias. PvP ativo fora da praça — jogadores abaixo do Nv3 estão protegidos. Durante o Frenesi de Roubos cada roubo rende +25 pts bónus!</p>
              </>
            )}

            {questTab === "saga" && (
              <>
                {SAGA[char!.sagaIdx] ? (() => {
                  const step = SAGA[char!.sagaIdx];
                  const prog = Math.min(step.prog(char!), step.goal);
                  return (
                    <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Passo atual da Saga</p>
                      <p className="font-display font-black text-sm mt-0.5">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${(prog / step.goal) * 100}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground">{prog}/{step.goal} · {step.reward}</p>
                        {prog >= step.goal && (
                          <button onClick={claimSaga} className="animate-pulse rounded-lg bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-900 shadow-lg shadow-amber-400/30 hover:bg-amber-300">Receber</button>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
                    <p className="text-2xl">👑</p>
                    <p className="font-display font-black text-sm">Saga completa — és uma LENDA do Bateu World!</p>
                  </div>
                )}
                <div className="space-y-1">
                  {SAGA.map((step, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[10px] ${i < char!.sagaIdx ? "bg-emerald-500/10 text-emerald-300" : i === char!.sagaIdx ? "bg-amber-500/15 text-amber-200" : "bg-white/5 text-white/40"}`}>
                      <span>{i < char!.sagaIdx ? "✅" : i === char!.sagaIdx ? "▶" : "🔒"}</span>
                      <span className="flex-1 font-bold">{step.title}</span>
                      <span className="text-white/50">{Math.min(step.prog(char!), step.goal)}/{step.goal}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {questTab === "chal" && (
              <>
                <QuestRow emoji="🏹" title="Desafio do Caçador: derrota 25 inimigos hoje" progress={`${Math.min(q.kills, 25)}/25`} done={char!.chal.c1} canClaim={q.kills >= 25 && !char!.chal.c1} reward="+400 ouro · +15 pts" onClaim={() => claimChallenge(1)} />
                <QuestRow emoji="😈" title="Desafio do Ladrão: rouba 2 jogadores hoje" progress={`${Math.min(q.steal, 2)}/2`} done={char!.chal.c2} canClaim={q.steal >= 2 && !char!.chal.c2} reward="+300 ouro · +25 pts" onClaim={() => claimChallenge(2)} />
                <p className="mt-3 text-[10px] text-muted-foreground">Os desafios são mais difíceis mas pagam muito melhor. Recomeçam todos os dias à meia-noite.</p>
              </>
            )}
          </Panel>
        )}

        {panel === "bank" && char && (
          <Panel title="🏦 Banco de Pontos" onClose={() => setPanel("none")}>
            <div className="mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-center">
              <p className="text-2xl font-black text-amber-300">🏆 {char.pts} pts</p>
              <p className="text-[10px] text-muted-foreground">Ganha Pontos de Troféu derrotando inimigos, chefes, descobrindo marcos e roubando outros jogadores.</p>
            </div>
            <div className="space-y-2">
              {EXCHANGES.map((ex) => {
                const can = char.pts >= ex.cost;
                return (
                  <div key={ex.id} className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${can ? "border-amber-500/40 bg-amber-500/10" : "border-white/10 bg-white/5"}`}>
                    <span className="text-2xl">{ex.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold">{ex.title}</p>
                      <p className="text-[10px] text-muted-foreground">{ex.desc}</p>
                    </div>
                    <button
                      onClick={() => doExchange(ex.id)}
                      disabled={!can}
                      className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-black ${can ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 hover:brightness-110" : "bg-white/5 text-white/30"}`}
                    >
                      {ex.cost} pts
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">
              💵 A conversão em moeda real (MT) é creditada na carteira da plataforma. Cupões podem ser roubados por outros jogadores se não tiveres escudo — protege-te no Banco!
            </p>
          </Panel>
        )}

        {panel === "rank" && (
          <Panel title="Ranking do Mundo" onClose={() => setPanel("none")}>
            {(() => {
              const rows = [...(platform?.leaderboard || [])];
              if (char) {
                const i = rows.findIndex((r) => r.name === char.name);
                if (i >= 0) rows[i] = { ...rows[i], level: char.level, gold: char.gold, kills: char.kills, classId: char.classId };
                else rows.push({ name: char.name, classId: char.classId, level: char.level, gold: char.gold, kills: char.kills });
              }
              rows.sort((a, b) => b.level - a.level || b.gold - a.gold);
              return (
                <div className="space-y-1">
                  {rows.slice(0, 15).map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${char && r.name === char.name ? "bg-rose-500/20 border border-rose-400/40" : "bg-white/5"}`}>
                      <span className="w-5 text-center font-black text-white/50">{i === 0 ? "👑" : i + 1}</span>
                      <span className="text-base">{CLS_EMOJIS[r.classId] || "⚔️"}</span>
                      <span className="flex-1 truncate font-bold">{r.name}</span>
                      <span className="text-white/60">Nv{r.level}</span>
                      <span className="text-amber-400">{r.gold}💰</span>
                    </div>
                  ))}
                  {rows.length === 0 && <p className="text-xs text-muted-foreground">Sê o primeiro do ranking!</p>}
                </div>
              );
            })()}
          </Panel>
        )}

        {panel === "inv" && char && (
          <Panel title="🎒 Mochila & Equipamento" onClose={() => setPanel("none")}>
            {/* equipado */}
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {(["arma", "armadura", "amuleto", "escudo"] as const).map((slot) => {
                const it = char.equipped[slot];
                const meta = it ? RARITY_META[it.rarity] : null;
                return (
                  <div key={slot} className={`rounded-lg border p-2 text-center ${meta ? "bg-white/5" : "border-dashed border-white/15 bg-white/[0.03]"}`} style={meta ? { borderColor: meta.color + "88" } : undefined}>
                    <p className="text-[9px] uppercase tracking-wider text-white/40">{slot}</p>
                    <p className="my-0.5 text-xl">{it ? it.emoji : "➖"}</p>
                    {it ? (
                      <>
                        <p className="truncate text-[9px] font-bold" style={{ color: meta!.color }}>{it.name}</p>
                        <p className="text-[8px] text-white/50">+{it.atk}⚔️ +{it.hp}❤️ +{it.spd}⚡{it.def ? ` +${it.def}🛡` : ""}</p>
                        <button onClick={() => equipItem(it)} className="mt-1 rounded bg-white/10 px-1.5 py-0.5 text-[8px] font-bold hover:bg-white/20">Remover</button>
                      </>
                    ) : (
                      <p className="text-[8px] text-white/30">vazio</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mb-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2 py-1.5 text-[10px] font-bold text-emerald-300">
              Bónus total: +{stats.atk - (calcStats({ ...char, equipped: { arma: null, armadura: null, amuleto: null, escudo: null } }).atk)}⚔️ · +{stats.maxHp - (calcStats({ ...char, equipped: { arma: null, armadura: null, amuleto: null, escudo: null } }).maxHp)}❤️ · +{stats.spd.toFixed(1)}⚡ · +{stats.def - (calcStats({ ...char, equipped: { arma: null, armadura: null, amuleto: null, escudo: null } }).def)}🛡️
            </div>
            {/* v11: OFICINA — materiais → poções */}
            <div className="mb-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-2.5">
              <p className="mb-1.5 text-xs font-black flex items-center gap-1">⚗️ Oficina da Lurdes <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[8px] font-black text-amber-300">RECOLHE NO MUNDO COM E</span></p>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black">
                <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-emerald-300" data-testid="bw-mat-erva">🌿 {char.mat.erva}</span>
                <span className="rounded-lg bg-orange-500/15 px-2 py-0.5 text-orange-300" data-testid="bw-mat-minerio">⛏️ {char.mat.minerio}</span>
                <span className="rounded-lg bg-cyan-500/15 px-2 py-0.5 text-cyan-300" data-testid="bw-mat-cristal">💎 {char.mat.cristal}</span>
              </div>
              <div className="space-y-1.5">
                {([
                  { k: "vida", emoji: "❤️", name: "Poção de Vida", desc: "Cura 55% da vida", cost: "3🌿 + 1💎", can: char.mat.erva >= 3 && char.mat.cristal >= 1 },
                  { k: "forca", emoji: "💪", name: "Poção de Força", desc: "+30% ataque · 60s", cost: "2🌿 + 2⛏️", can: char.mat.erva >= 2 && char.mat.minerio >= 2 },
                  { k: "vento", emoji: "💨", name: "Poção do Vento", desc: "+25% velocidade · 60s", cost: "1🌿 + 1⛏️ + 2💎", can: char.mat.erva >= 1 && char.mat.minerio >= 1 && char.mat.cristal >= 2 },
                ] as const).map((r) => (
                  <div key={r.k} className="flex items-center gap-2 rounded-lg bg-black/30 px-2 py-1.5">
                    <span className="text-lg">{r.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-white">{r.name} <span className="text-white/40">×{char.pot[r.k]}</span></p>
                      <p className="text-[9px] text-white/50">{r.desc} · {r.cost}</p>
                    </div>
                    <button
                      onClick={() => craftPotion(r.k)}
                      disabled={!r.can}
                      data-testid={`bw-craft-${r.k}`}
                      className={`rounded-lg px-2.5 py-1 text-[9px] font-black ${r.can ? "bg-amber-400 text-slate-900 hover:bg-amber-300" : "bg-white/10 text-white/30"}`}
                    >
                      Fabricar
                    </button>
                    {char.pot[r.k] > 0 && (
                      <button
                        onClick={() => usePotion(r.k)}
                        data-testid={`bw-use-${r.k}`}
                        className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[9px] font-black text-white hover:bg-emerald-400"
                      >
                        Usar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <p className="mb-1.5 text-xs font-bold flex items-center gap-1"><Backpack className="h-3 w-3 text-sky-400" /> Mochila ({char.inv.length})</p>
            {char.inv.length === 0 && (
              <p className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-3 text-center text-[10px] text-muted-foreground">
                Derrota inimigos, chefes e guardiões para ganhares equipamento com raridades (Comum → Lendário).
              </p>
            )}
            <div className="space-y-1.5">
              {char.inv.map((it) => {
                const meta = RARITY_META[it.rarity];
                return (
                  <div key={it.id} className="flex items-center gap-2 rounded-lg border bg-white/5 p-2" style={{ borderColor: meta.color + "55" }}>
                    <span className="text-xl">{it.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold" style={{ color: meta.color }}>{it.name} <span className="text-[8px] font-black uppercase">{meta.name}</span></p>
                      <p className="text-[9px] text-white/60">{it.slot} · +{it.atk}⚔️ +{it.hp}❤️ +{it.spd}⚡{it.def ? ` +${it.def}🛡` : ""}</p>
                    </div>
                    <button onClick={() => equipItem(it)} className="rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-black text-white hover:bg-emerald-400">Equipar</button>
                    <button onClick={() => sellItem(it)} className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black text-white/70 hover:bg-white/20">{[40, 120, 320, 800][it.rarity]}💰</button>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {panel === "map" && char && (
            <Panel title="🗺️ Mapa-Múndi do Bateu World" onClose={() => setPanel("none")}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative mx-auto shrink-0">
                  <BigMap
                    discoveries={char.discoveries}
                    onPick={(x, z) => { engineRef.current?.setWaypoint(x, z); }}
                  />
                </div>
                <div className="min-w-0 flex-1 max-h-64 overflow-y-auto sm:max-h-none">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-white/50">O que significa cada lugar</p>
                  <div className="space-y-1">
                    {LANDMARKS.map((l) => {
                      const found = char.discoveries.includes(l.id);
                      return (
                        <button
                          key={l.id}
                          onClick={() => { engineRef.current?.setWaypoint(l.x, l.z); }}
                          className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${found ? "bg-amber-500/10 hover:bg-amber-500/20" : "bg-white/[0.03] hover:bg-white/10"}`}
                          data-testid={`bw-map-${l.id}`}
                        >
                          <span className="text-base leading-none">{found ? l.emoji : "❓"}</span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[11px] font-bold ${found ? "text-amber-200" : "text-white/40"}`}>{found ? l.name : "Lugar por descobrir"}</span>
                            <span className={`block text-[9px] leading-snug ${found ? "text-white/60" : "text-white/25"}`}>{found ? l.desc : "Explora o mundo para revelares o seu significado!"}</span>
                          </span>
                          <span className="text-[8px] text-white/30">🧭</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* v8: VILAS E INTERIORES — casas enteráveis com escadas */}
                  <p className="mb-1 mt-3 text-[10px] font-black uppercase tracking-wider text-amber-300/90">🏘️ Vilas e Interiores (podes entrar!)</p>
                  <div className="space-y-1">
                    {BUILDINGS.map((b) => {
                      const visited = char.discoveries.includes("bld-" + b.id);
                      return (
                        <button
                          key={b.id}
                          onClick={() => { engineRef.current?.setWaypoint(b.x, b.z); }}
                          className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${visited ? "bg-amber-500/10 hover:bg-amber-500/20" : "bg-white/[0.03] hover:bg-white/10"}`}
                          data-testid={`bw-bld-${b.id}`}
                        >
                          <span className="text-base leading-none">{b.emoji}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-bold text-amber-100">{b.name} <span className="text-[8px] font-black text-white/40">{b.floors === 1 ? "· 1 piso" : b.floors === 4 ? "· 3 pisos + miradouro" : `· ${b.floors} pisos`}</span></span>
                            <span className="block text-[9px] leading-snug text-white/55">{b.desc}</span>
                          </span>
                          <span className="text-[8px] text-white/30">🧭</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 rounded-lg bg-sky-500/10 border border-sky-500/25 px-2 py-1.5 text-[9px] text-sky-200">
                    💡 Toca num lugar (na lista ou no mapa) para marcar o destino — a bússola dourada no ecrã aponta o caminho.
                  </p>
                </div>
              </div>
            </Panel>
          )}

        {panel === "set" && (
          <Panel title="⚙️ Definições" onClose={() => setPanel("none")}>
            <p className="mb-1.5 text-xs font-bold">Qualidade gráfica</p>
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {(["auto", "low", "medium", "high"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuality(q); worldAudio.play("click"); }}
                  className={`rounded-lg py-1.5 text-[10px] font-black capitalize transition-colors ${quality === q ? "bg-rose-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
                  data-testid={`bw-quality-${q}`}
                >
                  {q === "auto" ? "Auto" : q === "low" ? "Baixa" : q === "medium" ? "Média" : "Alta"}
                </button>
              ))}
            </div>
            <p className="mb-3 text-[10px] text-muted-foreground">Auto escolhe pelo teu dispositivo. Baixa desliga o brilho cinematográfico (bloom) e corre melhor em telemóveis mais antigos.</p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2">
                <Volume2 className="h-4 w-4 text-emerald-400" />
                <span className="flex-1 text-xs font-bold">Efeitos sonoros</span>
                <button onClick={() => setMuted(worldAudio.toggleMute())} className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${muted ? "bg-white/10 text-white/50" : "bg-emerald-500 text-white"}`} data-testid="bw-set-sfx">
                  {muted ? "Desligado" : "Ligado"}
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2">
                <Music className="h-4 w-4 text-violet-400" />
                <span className="flex-1 text-xs font-bold">Música ambiente</span>
                <button onClick={() => setMusicOff(worldAudio.toggleMusic())} className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${musicOff ? "bg-white/10 text-white/50" : "bg-emerald-500 text-white"}`} data-testid="bw-set-music">
                  {musicOff ? "Desligada" : "Ligada"}
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2">
                <Camera className="h-4 w-4 text-sky-400" />
                <span className="flex-1 text-xs font-bold">Modo foto</span>
                <button onClick={togglePhoto} className="rounded-lg bg-sky-500 px-2.5 py-1 text-[10px] font-black text-white">Capturar</button>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2" data-testid="bw-set-sync">
                <Cloud className="h-4 w-4 text-emerald-400" />
                <span className="flex-1 text-xs font-bold">
                  Sincronização com a conta
                  <span className="block text-[9px] font-normal text-emerald-300/80">
                    {user ? `✔ ${profile?.display_name || user.email?.split("@")[0] || "conta"} · a cada 20s` : "a sincronizar..."}
                  </span>
                </span>
                <button
                  onClick={() => {
                    const c = charRef.current;
                    if (!c) return;
                    const s = calcStats(c);
                    upsertCharacter({ guest_id: c.uid, name: c.name, class_id: c.classId, level: c.level, xp: c.xp, gold: c.gold, hp: s.maxHp, max_hp: s.maxHp, atk: s.atk, spd: Math.round(s.spd), total_kills: c.kills, is_online: true });
                    setLastSync(new Date());
                    worldAudio.play("coin");
                    pushToast("☁️ Progresso sincronizado com a conta!", "good");
                  }}
                  className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white"
                  data-testid="bw-sync-now"
                >Sincronizar</button>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">Teclas: WASD mover · F/clique atacar · 1/2/3 poderes · E interagir · Shift escudo · Tab mapa · M som · P foto.</p>
          </Panel>
        )}
      </AnimatePresence>

      {/* card de plataforma */}
      <AnimatePresence>
        {card && (
          <motion.div
            className="absolute inset-0 z-30 flex items-end justify-center bg-black/50 p-4 md:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCard(null)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900/95 p-5 text-center text-white shadow-2xl"
              data-testid="bw-card"
            >
              {cardData}
              <button onClick={() => setCard(null)} className="mt-3 block w-full rounded-xl bg-white/10 py-2 text-sm font-bold hover:bg-white/20">Fechar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>) }

      {/* v4: resumo da arena */}
      <AnimatePresence>
        {arenaEnd && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            data-testid="bw-arena-end"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-xs rounded-2xl border border-orange-400/40 bg-slate-900/95 p-5 text-center text-white shadow-2xl"
            >
              <p className="text-3xl">🏟️</p>
              <h3 className="font-display mt-1 text-lg font-black text-orange-300">Fim da sessão!</h3>
              <p className="text-xs text-muted-foreground">Sobreviveste <b className="text-white">{arenaEnd.wave}</b> ondas com <b className="text-white">{arenaEnd.kills}</b> abates</p>
              <div className="my-3 grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-1.5"><p className="text-sm font-black text-amber-300">+{arenaEnd.pts}</p><p className="text-[8px] text-muted-foreground">Pontos</p></div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-1.5"><p className="text-sm font-black text-emerald-300">+{arenaEnd.gold}</p><p className="text-[8px] text-muted-foreground">Ouro</p></div>
                <div className="rounded-lg bg-sky-500/10 border border-sky-500/30 p-1.5"><p className="text-sm font-black text-sky-300">+{arenaEnd.xp}</p><p className="text-[8px] text-muted-foreground">XP</p></div>
              </div>
              <button
                onClick={() => setArenaEnd(null)}
                className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 py-2.5 text-sm font-black shadow-lg shadow-rose-500/25"
              >
                Continuar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v4: overlay do modo foto */}
      <AnimatePresence>
        {photoMode && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-50 flex items-start justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            data-testid="bw-photo-overlay"
          >
            <div className="mt-4 flex items-center gap-2 rounded-full bg-black/60 px-4 py-1.5 text-[11px] font-bold text-white backdrop-blur">
              <Camera className="h-3.5 w-3.5 text-sky-300" />
              <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>
                📸 A capturar o mundo...
              </motion.span>
            </div>
            {/* moldura de foto */}
            <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-white/30" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-x-2 top-12 bottom-20 z-20 mx-auto max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-slate-900/92 text-white shadow-2xl backdrop-blur"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      data-testid="bw-panel"
    >
      <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rose-400/70 to-transparent" />
        <p className="font-display text-sm font-black">{title}</p>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
      </div>
      <div className="max-h-[calc(100%-44px)] overflow-y-auto p-3">{children}</div>
    </motion.div>
  );
}

function StatRow({ icon, label, value, addLabel = "+1", disabled, onAdd }: { icon: React.ReactNode; label: string; value: number | string; addLabel?: string; disabled: boolean; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2">
      {icon}
      <span className="flex-1 text-xs font-bold">{label}</span>
      <span className="text-sm font-black text-amber-300">{value}</span>
      <button
        onClick={onAdd}
        disabled={disabled}
        className={`rounded-lg px-2.5 py-1 text-xs font-black ${disabled ? "bg-white/5 text-white/30" : "bg-emerald-500 text-white hover:bg-emerald-400"}`}
      >
        {addLabel}
      </button>
    </div>
  );
}

function QuestRow({ emoji, title, progress, done, canClaim, reward, onClaim, testid }: { emoji: string; title: string; progress: string; done: boolean; canClaim: boolean; reward: string; onClaim: () => void; testid?: string }) {
  return (
    <div data-testid={testid} className={`mb-2 flex items-center gap-2.5 rounded-xl border p-2.5 ${done ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1">
        <p className="text-xs font-bold">{title}</p>
        <p className="text-[10px] text-muted-foreground">{progress} · {reward}</p>
      </div>
      {done ? <Check className="h-5 w-5 text-emerald-400" /> : canClaim ? (
        <button onClick={onClaim} className="animate-pulse rounded-lg bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-900 shadow-lg shadow-amber-400/30 hover:bg-amber-300">Receber</button>
      ) : (
        <span className="text-[10px] text-white/30">...</span>
      )}
    </div>
  );
}

function Joystick({ onMove, fs }: { onMove: (x: number, y: number) => void; fs?: boolean }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(false);

  const handle = (e: React.PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = rect.width / 2 - 14;
    const d = Math.hypot(dx, dy);
    if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; }
    setKnob({ x: dx, y: dy });
    onMove(dx / max, dy / max);
  };

  return (
    <div
      ref={baseRef}
      data-testid="bw-joystick"
      className="absolute bottom-4 left-4 z-10 h-24 w-24 touch-none rounded-full border-2 border-white/25 bg-black/35 backdrop-blur-sm"
      style={{ touchAction: "none", boxShadow: "0 0 24px rgba(56,189,248,0.18), inset 0 0 18px rgba(255,255,255,0.06)", ...(fs ? { bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))", left: "calc(1rem + env(safe-area-inset-left, 0px))" } : {}) }}
      onPointerDown={(e) => { active.current = true; worldAudio.play("click"); (e.target as HTMLElement).setPointerCapture(e.pointerId); handle(e); }}
      onPointerMove={(e) => { if (active.current) handle(e); }}
      onPointerUp={() => { active.current = false; setKnob({ x: 0, y: 0 }); onMove(0, 0); }}
      onPointerCancel={() => { active.current = false; setKnob({ x: 0, y: 0 }); onMove(0, 0); }}
    >
      {/* marcações direcionais */}
      <span className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-[8px] text-white/40">▲</span>
      <span className="pointer-events-none absolute left-1/2 bottom-1 -translate-x-1/2 text-[8px] text-white/40">▼</span>
      <span className="pointer-events-none absolute top-1/2 left-1 -translate-y-1/2 text-[8px] text-white/40">◀</span>
      <span className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-[8px] text-white/40">▶</span>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 rounded-full bg-white/80 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`, boxShadow: "0 0 14px rgba(255,255,255,0.5)" }}
      />
    </div>
  );
}


// ── v6: MAPA-MÚNDI grande com regiões, marcos e waypoint ───
function BigMap({ discoveries, onPick }: { discoveries: string[]; onPick: (x: number, z: number) => void }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const engRef = useRef<any>(null);

  useEffect(() => {
    engRef.current = (window as any).__bw || null;
  });

  useEffect(() => {
    let alive = true;
    const S = 260;
    const draw = () => {
      if (!alive) return;
      const cv = cvRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const eng = engRef.current;
      const d = eng?.getMapData?.() || null;
      const R = 230; // WORLD_RADIUS
      const toMap = (x: number, z: number) => [S / 2 + (x / (R + 12)) * (S / 2 - 8), S / 2 + (z / (R + 12)) * (S / 2 - 8)];

      ctx.clearRect(0, 0, S, S);
      // oceano
      ctx.fillStyle = "#0b1626";
      ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.fill();
      // o mundo
      const [wx, wy] = toMap(0, 0);
      const wr = ((R + 12) / (R + 12)) * (S / 2 - 8);
      ctx.save();
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = "#123524";
      ctx.fillRect(0, 0, S, S);
      // regiões
      for (const r of REGIONS) {
        const [rx, ry] = toMap(r.cx, r.cz);
        const rr = (r.r / (R + 12)) * (S / 2 - 8);
        const grd = ctx.createRadialGradient(rx, ry, rr * 0.2, rx, ry, rr);
        grd.addColorStop(0, r.color + "66");
        grd.addColorStop(1, r.color + "22");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill();
      }
      // mobs (pontinhos vermelhos suaves)
      if (d) {
        for (const m of d.mobs || []) {
          const [mx, my] = toMap(m.x, m.z);
          ctx.fillStyle = m.t >= 4 ? "#f43f5e" : m.t >= 2 ? "#fb923c" : "#fca5a5aa";
          ctx.fillRect(mx - 1, my - 1, 2, 2);
        }
      }
      // marcos
      for (const l of LANDMARKS) {
        const [lx, ly] = toMap(l.x, l.z);
        const found = discoveries.includes(l.id);
        ctx.font = "12px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(found ? l.emoji : "❓", lx, ly + 4);
        if (found) {
          ctx.font = "bold 6.5px system-ui";
          ctx.fillStyle = "#fde68a";
          ctx.fillText(l.name.split(" ")[0], lx, ly + 14);
        }
      }
      // waypoint
      if (d?.waypoint) {
        const [tpx, tpy] = toMap(d.waypoint.x, d.waypoint.z);
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(tpx, tpy, 5 + Math.sin(Date.now() / 300) * 1.6, 0, Math.PI * 2); ctx.stroke();
      }
      // outros jogadores
      for (const p of d?.players || []) {
        const [ppx, ppy] = toMap(p.x, p.z);
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath(); ctx.arc(ppx, ppy, 2.5, 0, 7); ctx.fill();
      }
      // eu (seta)
      if (d) {
        const [px, py] = toMap(d.px, d.pz);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(d.yaw);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(0, -6); ctx.lineTo(4.4, 4.4); ctx.lineTo(0, 2.2); ctx.lineTo(-4.4, 4.4);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      // moldura
      ctx.strokeStyle = "rgba(253,230,138,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.stroke();
    };
    draw();
    const iv = setInterval(draw, 700);
    return () => { alive = false; clearInterval(iv); };
  }, [discoveries]);

  const click = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = cvRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const S = 260, R = 230;
    const cx = ((e.clientX - rect.left) / rect.width) * S;
    const cy = ((e.clientY - rect.top) / rect.height) * S;
    const scale = (S / 2 - 8) / (R + 12);
    const wx = (cx - S / 2) / scale;
    const wz = (cy - S / 2) / scale;
    if (Math.hypot(wx, wz) > R) return;
    // pega no marco mais próximo (até 14 unidades) — senão marca ponto livre
    let best = null, bestD = 14;
    for (const l of LANDMARKS) {
      const dd = Math.hypot(l.x - wx, l.z - wz);
      if (dd < bestD) { bestD = dd; best = l; }
    }
    if (best) onPick(best.x, best.z);
    else onPick(wx, wz);
  };

  return (
    <canvas
      ref={cvRef}
      width={260}
      height={260}
      onClick={click}
      data-testid="bw-bigmap"
      className="cursor-crosshair rounded-xl border border-amber-400/30 bg-slate-950 shadow-lg"
      style={{ width: 260, height: 260 }}
    />
  );
}
