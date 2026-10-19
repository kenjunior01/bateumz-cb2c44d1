// @ts-nocheck
// ============================================================
// BATEU WORLD — ERA DAS LENDAS (v18) · UI DO MMO
// Reconstrução total sobre o motor v18 (REA Hordes.io):
//  · Criação com CLASSE + FACÇÃO + avatar articulado
//  · HUD MMO: barras HP/Mana/XP, alvo, barra de CHEFE,
//    minimapa ao vivo, tracker de missões, hotbar 6
//    habilidades com cooldown, joystick + botões mobile
//  · 12 painéis: Inventário, Habilidades, Missões, Mapa,
//    Clã, Grupo, Loja, Oficina, Habitação, Cupões, Banco,
//    Fama & Guerra
//  · Loop da plataforma: cupões → leilões/loja, Banco de
//    Pontos → créditos reais, prémio 1GB → WhatsApp,
//    conquistas → Stories
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Sparkles, X, Coins, Heart, Zap, Crown, Check, Users, Map,
  Shield, Flame, MapPin, Backpack, Settings, Gamepad2, ChevronLeft,
  Home, Store, Hammer, Ticket, Landmark, Trophy, Wand2, Skull, Star,
  Compass, ScrollText, Volume2, VolumeX, Maximize2, Minimize2, Camera,
} from "lucide-react";
import { WorldEngine, type EngineStats } from "./worldEngine";
import {
  CLASSES, SKILLS, FACTIONS, REGIONS, TOWERS, DUNGEONS, MOUNTS, BUILDINGS,
  RARITY_META, SLOTS, POTIONS, MATERIALS, CAMPAIGN, DAILY_QUESTS, TITLES,
  FAME_RANKS, xpNeed, LEVEL_CAP, PVP_SAFE_RADIUS, type LootItem,
  MOB_TYPES, REGION_BOSSES, WORLD_BOSSES, VILLAINS,
} from "./mmo";
import { statLabel, applyItemStats, upgradeCost, upgradeChance, upgradeGlow } from "./loot";
import { worldAudio, MUSIC_TRACKS } from "./worldAudio";
import { AvatarPreview, AvatarSwatches } from "./AvatarEditor";
import { defaultAvatar, randomAvatar, type AvatarConfig } from "./avatar";
import {
  fetchPlatformData, upsertCharacter, setCharacterOffline, worldRoute,
  fmtMZN, exchangeWorldPoints, claimWorldVoucher, fetchAccountVouchers,
  upsertWorldProgress, logWorldActivity, flushWorldActivity,
  type PlatformData,
} from "./platformSync";
import { useAuth } from "@/contexts/AuthContext";

// ── Estado persistente do herói ─────────────────────────────
const LS_KEY = "bateu_legends_v18";

interface Char {
  uid: string; name: string; classId: number; faction: number;
  level: number; xp: number; gold: number;
  skillPts: number; ranks: number[]; hotbar: (number | null)[];
  alloc: { str: number; int: number; agi: number; vit: number };
  inv: LootItem[]; equipped: Record<string, LootItem | null>;
  mats: Record<string, number>;
  pots: Record<string, number>;
  coupons: number; credits: number;
  fame: number; kills: number; deaths: number;
  mounts: string[]; activeMount: string | null;
  house: { built: Record<string, number>; vault: number } | null;
  clan: { tag: string; name: string } | null;
  campaign: { step: number; prog: number; done: boolean };
  daily: { date: string; prog: Record<string, number>; claimed: string[] };
  saga: { bosses: number; dungeons: number; duels: number; steals: number; towers: number; villains: number };
  avatar: AvatarConfig;
  musicOn: boolean;
  duelWins: number;
  createdAt: number;
}

function emptyChar(name: string, classId: number, faction: number, avatar: AvatarConfig): Char {
  return {
    uid: `bw_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
    name, classId, faction, level: 1, xp: 0, gold: 250,
    skillPts: 0, ranks: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], hotbar: [0, 1, null, null, null, null],
    alloc: { str: 0, int: 0, agi: 0, vit: 0 },
    inv: [], equipped: { arma: null, armadura: null, elmo: null, amuleto: null, botas: null, anel: null },
    mats: { fragmento: 2, erva: 0, minerio: 0, cristal: 0, essencia: 0 },
    pots: { vida: 2, forca: 0, vento: 0, guarda: 0 },
    coupons: 0, credits: 0,
    fame: 0, kills: 0, deaths: 0,
    mounts: [], activeMount: null,
    house: null, clan: null,
    campaign: { step: 0, prog: 0, done: false },
    daily: { date: new Date().toDateString(), prog: {}, claimed: [] },
    saga: { bosses: 0, dungeons: 0, duels: 0, steals: 0, towers: 0, villains: 0 },
    avatar, musicOn: true, duelWins: 0, createdAt: Date.now(),
  };
}

function loadChar(): Char | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c?.name || c?.v !== 18) return null;
    return c;
  } catch { return null; }
}
function saveChar(c: Char) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ ...c, v: 18 })); } catch { }
}

// ── Derivação de stats (base + nível + pontos + equipamento) ─
function deriveStats(c: Char): EngineStats {
  const cls = CLASSES[c.classId];
  const L = c.level - 1;
  const acc: Record<string, number> = {
    atk: cls.base.atk + cls.growth.atk * L,
    maxHp: cls.base.maxHp + cls.growth.maxHp * L,
    def: cls.base.def + cls.growth.def * L,
    spd: cls.base.spd + cls.growth.spd * L,
    maxMp: cls.base.mana + cls.growth.mana * L,
    crit: cls.base.crit, leech: 0,
  };
  // atributos investidos
  acc.atk += c.alloc.str * 2.2 + c.alloc.agi * 1.6 + c.alloc.int * 1.8;
  acc.maxHp += c.alloc.vit * 14 + c.alloc.str * 4;
  acc.def += c.alloc.vit * 0.8;
  acc.crit += c.alloc.agi * 0.7;
  acc.maxMp += c.alloc.int * 7;
  // equipamento
  for (const s of SLOTS) applyItemStats(c.equipped[s], acc);
  return {
    atk: Math.round(acc.atk * 10) / 10,
    maxHp: Math.round(acc.maxHp),
    def: Math.round(acc.def * 10) / 10,
    spd: Math.round(acc.spd * 10) / 10,
    maxMp: Math.round(acc.maxMp),
    crit: Math.round(acc.crit * 10) / 10,
    leech: Math.round(acc.leech * 10) / 10,
  };
}

function titleFor(lvl: number): string {
  let t = TITLES[0].title;
  for (const x of TITLES) if (lvl >= x.lvl) t = x.title;
  return t;
}
function fameRank(f: number) {
  let r = FAME_RANKS[0];
  for (const x of FAME_RANKS) if (f >= x.min) r = x;
  return r;
}

// ════════════════════════════════════════════════════════════
export default function BateuWorld({
  onScore, onNavigate, onExit,
}: {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
  onNavigate?: (route: string) => void;
  onExit?: () => void;
}) {
  const { user } = useAuth() as any;
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WorldEngine | null>(null);
  const charRef = useRef<Char | null>(null);
  const [phase, setPhase] = useState<"load" | "create" | "play">("load");
  const [, forceRender] = useState(0);
  const rerender = useCallback(() => forceRender(x => x + 1), []);

  // HUD state (atualizado a 5Hz a partir do engine)
  const [hud, setHud] = useState<any>({
    hp: 100, maxHp: 100, mp: 100, maxMp: 100, level: 1, xp: 0, x: 0, z: 30,
    target: null, region: "vila", cds: [0, 0, 0, 0, 0, 0], buffs: [],
    dead: false, gold: 0, fps: 60, online: 8,
  });
  const [bossBar, setBossBar] = useState<any>(null);
  const [toast, setToast] = useState<{ text: string; emoji: string; id: number } | null>(null);
  const [feed, setFeed] = useState<{ text: string; emoji: string; id: number }[]>([]);
  const [panel, setPanel] = useState<string | null>(null);
  const [lootPop, setLootPop] = useState<{ item: LootItem; id: number } | null>(null);
  const [dmgFlash, setDmgFlash] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fs, setFs] = useState(false);
  const [plat, setPlat] = useState<PlatformData | null>(null);
  const [duelState, setDuelState] = useState<string | null>(null);
  const [fpMode, setFpMode] = useState(false);

  const pushFeed = useCallback((text: string, emoji = "✨") => {
    const id = Date.now() + Math.random();
    setFeed(f => [...f.slice(-5), { text, emoji, id }]);
    setTimeout(() => setFeed(f => f.filter(x => x.id !== id)), 7000);
  }, []);

  const showToast = useCallback((text: string, emoji = "✨") => {
    setToast({ text, emoji, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  }, []);

  // ── boot ──────────────────────────────────────────────────
  useEffect(() => {
    const c = loadChar();
    if (c) { charRef.current = c; setPhase("create"); rerender(); }
    else setPhase("create");
    fetchPlatformData().then(setPlat);
    flushWorldActivity();
  }, []);

  // ── arranque do motor ─────────────────────────────────────
  const startEngine = useCallback((c: Char) => {
    if (!mountRef.current || engineRef.current) return;
    const stats = deriveStats(c);
    const eng = new WorldEngine(mountRef.current, {
      name: c.name, classId: c.classId, level: c.level, faction: c.faction,
      uid: c.uid, avatar: c.avatar, stats,
      onEvent: (ev) => handleEvent(c, ev),
    });
    engineRef.current = eng;
    setPhase("play");
    worldAudio.ensure();
    if (c.musicOn) { worldAudio.startMusic(); }
    // expõe hooks de teste/integração
    (window as any).__bw = {
      version: "18-legends",
      engine: eng,
      getChar: () => charRef.current,
      xpNeed: (l: number) => xpNeed(l),
      data: {
        skills: SKILLS.reduce((a, s) => a + s.length, 0),
        classes: SKILLS.length,
        mobs: (MOB_TYPES as any[]).length,
        bosses: (REGION_BOSSES as any[]).length,
        worldBosses: (WORLD_BOSSES as any[]).length,
        villains: (VILLAINS as any[]).length,
        dungeons: (DUNGEONS as any[]).length,
        mounts: (MOUNTS as any[]).length,
        buildings: (BUILDINGS as any[]).length,
        campaign: (CAMPAIGN as any[]).length,
        dailies: (DAILY_QUESTS as any[]).length,
        titles: (TITLES as any[]).length,
        fameRanks: (FAME_RANKS as any[]).length,
        regions: (REGIONS as any[]).length,
        towers: (TOWERS as any[]).length,
        potions: (POTIONS as any[]).length,
      },
      updateChar: (fn: (c: Char) => void) => {
        const cc = charRef.current; if (!cc) return;
        fn(cc); saveChar(cc);
        eng.setStats(deriveStats(cc), cc.level);
        eng.setSkillRanks(cc.ranks);
        eng.setHotbar(cc.hotbar);
        rerender();
      },
      openPanel: (p: string) => setPanel(p),
      closePanel: () => setPanel(null),
      giveXp: (n: number) => (window as any).__bw?.engine?.gainXpPublic?.(n),
      setPopulation: (n: number) => eng.setPopulation(n),
      panels: () => panel,
      // helpers de teste
      testSpawnElite: () => (window as any).__bw?.engine?.spawnTestMobPublic?.(true),
    };
  }, [rerender]);

  // ── eventos do motor ──────────────────────────────────────
  const handleEvent = useCallback((c0: Char, ev: any) => {
    const c = charRef.current;
    if (!c) return;
    let dirty = false;
    switch (ev.type) {
      case "kill": {
        c.gold += ev.gold || 0;
        c.kills++;
        c.daily.prog.d_kills = (c.daily.prog.d_kills || 0) + 1;
        if (ev.isElite) c.daily.prog.d_elite = (c.daily.prog.d_elite || 0) + 1;
        if (ev.isBoss || ev.isWorld || ev.isVillain) {
          c.saga.bosses++;
          if (ev.isVillain) c.saga.villains++;
          c.daily.prog.d_boss = (c.daily.prog.d_boss || 0) + 1;
          pushFeed(`☠ ${ev.name} derrotado! +${ev.gold} ouro`, "☠️");
        }
        dirty = true;
        break;
      }
      case "loot": {
        if (c.inv.length < 60) { c.inv.push(ev.item); dirty = true; }
        setLootPop({ item: ev.item, id: Date.now() });
        setTimeout(() => setLootPop(p => (p?.item === ev.item ? null : p)), 3200);
        break;
      }
      case "material": {
        c.mats[ev.id] = (c.mats[ev.id] || 0) + (ev.n || 1);
        c.daily.prog.d_gather = (c.daily.prog.d_gather || 0) + (ev.n || 1);
        showToast(`+${ev.n || 1} ${(MATERIALS.find(m => m.id === ev.id)?.name) || ev.id}`, "🧰");
        dirty = true;
        break;
      }
      case "coupon": {
        c.coupons += ev.n || 1;
        showToast(`+${ev.n || 1} CUPÃO de ${ev.from}!`, "🎟️");
        pushFeed(`🎟️ Cupão obtido de ${ev.from}! Usa na Casa de Leilões`, "🎟️");
        logWorldActivity(c.uid, "coupon", ev.from, ev.n || 1);
        dirty = true;
        break;
      }
      case "steal": {
        c.coupons += 1;
        c.saga.steals++;
        c.daily.prog.d_steal = (c.daily.prog.d_steal || 0) + 1;
        pushFeed(`🥷 Roubaste um cupão de ${ev.from}!`, "🥷");
        showToast("CUPÃO ROUBADO!", "🥷");
        logWorldActivity(c.uid, "steal", ev.from, 1);
        dirty = true;
        break;
      }
      case "pvp-kill": {
        c.fame += ev.fame || 15;
        pushFeed(`⚔ Vitória sobre ${ev.name} · +${ev.fame} FAMA`, "⚔️");
        dirty = true;
        break;
      }
      case "xp": {
        c.xp = ev.total || c.xp;
        dirty = true;
        break;
      }
      case "levelup": {
        c.level = ev.level;
        c.skillPts += 1;
        showToast(`NÍVEL ${ev.level}! +1 ponto de habilidade`, "⬆️");
        pushFeed(`⬆️ ${c.name} alcançou o nível ${ev.level}!`, "🎉");
        logWorldActivity(c.uid, "level", `Nv${ev.level}`, ev.level);
        if (onScore) onScore(c.name, ev.level);
        dirty = true;
        break;
      }
      case "death": {
        c.deaths++;
        const lost = Math.round(xpNeed(c.level) * 0.05);
        c.xp = Math.max(0, c.xp - lost);
        pushFeed(`💀 Morreste por ${ev.by} · −${lost} XP`, "💀");
        dirty = true;
        break;
      }
      case "tower": {
        if (ev.action === "captured") {
          c.fame += 25; c.saga.towers++;
          c.campaign.prog += 1;
          pushFeed(`🏳️ ${ev.name} capturada pela tua facção! +25 FAMA`, "🏳️");
          dirty = true;
        }
        break;
      }
      case "dungeon": {
        if (ev.action === "clear") {
          c.saga.dungeons++;
        }
        break;
      }
      case "duel": {
        if (ev.action === "win") {
          c.saga.duels++; c.duelWins++;
          c.gold += ev.wager || 0;
          setDuelState(null);
        } else if (ev.action === "start") setDuelState(ev.opponent);
        else if (ev.action === "lose") {
          c.gold = Math.max(0, c.gold - Math.round((ev.wager || 500) * 0.5));
          setDuelState(null);
        }
        dirty = true;
        break;
      }
      case "announce": { pushFeed(ev.text, ev.emoji); break; }
      case "unlock": { pushFeed(`🌍 Nova terra: ${ev.name}!`, "🌍"); break; }
      case "interact": {
        const map: Record<string, string> = {
          banco: "bank", leilao: "coupons", loja: "shop", feira: "shop",
          montaria: "mounts", arvore: "clan", obelisco: "fame",
          fonte: "quests", tenda1: "quests", tenda2: "quests", tenda3: "quests",
          estatua_h: "fame", sino: "quests", campog: "map",
        };
        setPanel(map[ev.id] || "map");
        break;
      }
      case "house": {
        if (ev.action === "claim") c.house = { built: {}, vault: 0 };
        if (ev.action === "build") c.house!.built[ev.id] = ev.level;
        if (ev.action === "deposit") c.house!.vault = ev.vault;
        dirty = true;
        break;
      }
      case "quest": {
        // campanha: progresso por capítulo
        const step = c.campaign.step;
        const ch = CAMPAIGN[step];
        if (ch && !c.campaign.done) {
          const k: Record<string, string> = { kills: "kills", elite: "elite", tower: "tower", duel: "duel", dungeon: "dungeon", house: "house", villain: "villain", worldboss: "worldboss" };
          if (k[ch.kind] === ev.kind) c.campaign.prog += 1;
        }
        dirty = true;
        break;
      }
      case "region": { break; }
      case "mp-fail": { showToast("Mana insuficiente!", "💧"); break; }
      case "player-join": { pushFeed(`${ev.name} entrou no mundo`, "👋"); break; }
      case "villain": {
        if (ev.action === "spawn") pushFeed(`😈 ${ev.name} apareceu — caça-o!`, "😈");
        dirty = true;
        break;
      }
      case "worldboss": {
        if (ev.action === "spawn") pushFeed(`☄️ ${ev.name} despertou!`, "☄️");
        break;
      }
      case "mount": {
        if (ev.action === "ride") { c.activeMount = ev.id; dirty = true; }
        if (ev.action === "dismount") { c.activeMount = null; dirty = true; }
        break;
      }
    }
    if (dirty) { saveChar(c); engineRef.current?.setStats(deriveStats(c), c.level); rerender(); }
  }, [pushFeed, showToast, rerender, onScore]);

  // ── HUD polling (5Hz) ─────────────────────────────────────
  useEffect(() => {
    if (phase !== "play") return;
    const iv = setInterval(() => {
      const eng = engineRef.current;
      if (!eng) return;
      const st = eng.getState();
      setHud({
        hp: st.hp, maxHp: st.maxHp, mp: st.mp, maxMp: st.maxMp,
        level: st.level, xp: charRef.current?.xp || 0, x: st.x, z: st.z,
        target: st.target, region: st.region, cds: [...(st.cds || [0, 0, 0, 0, 0, 0])],
        buffs: st.buffs || [], dead: st.dead, gold: charRef.current?.gold || 0,
        fps: st.fps, online: eng.getOnline(),
      });
      setBossBar(eng.getBossBar());
    }, 200);
    return () => clearInterval(iv);
  }, [phase]);

  // ── full-screen ───────────────────────────────────────────
  const toggleFs = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await (mountRef.current?.requestFullscreen?.() || document.documentElement.requestFullscreen?.());
        setFs(true);
      } else {
        await document.exitFullscreen();
        setFs(false);
      }
    } catch { setFs(f => !f); }
  }, []);

  // ── sair ──────────────────────────────────────────────────
  const exitGame = useCallback(() => {
    const c = charRef.current;
    if (c) {
      saveChar(c);
      upsertCharacter({
        guest_id: c.uid, name: c.name, class_id: c.classId, level: c.level,
        xp: c.xp, gold: c.gold, hp: hud.hp, max_hp: hud.maxHp, atk: deriveStats(c).atk,
        spd: deriveStats(c).spd, total_kills: c.kills, is_online: false,
      } as any);
      setCharacterOffline(c.uid);
      upsertWorldProgress({
        guest_id: c.uid, name: c.name, class_id: c.classId, level: c.level,
        points: c.fame, kills: c.kills, discoveries: [], gold: c.gold,
        deaths: c.deaths, vouchers_count: c.coupons, avatar: c.avatar,
      });
    }
    engineRef.current?.dispose();
    engineRef.current = null;
    onExit?.();
  }, [hud.hp, hud.maxHp, onExit]);

  // ════════════════ CRIAÇÃO DE HERÓI ════════════════════════
  const [ncName, setNcName] = useState("");
  const [ncClass, setNcClass] = useState(0);
  const [ncFaction, setNcFaction] = useState(0);
  const [ncAvatar, setNcAvatar] = useState<AvatarConfig>(defaultAvatar(0));
  const [ncStep, setNcStep] = useState(0); // 0 classe/facção · 1 avatar

  const existing = charRef.current;

  const beginNew = () => {
    const name = (ncName || "").trim().slice(0, 16) || `Herói${Math.floor(Math.random() * 999)}`;
    const av = ncAvatar;
    const c = emptyChar(name, ncClass, ncFaction, av);
    charRef.current = c;
    saveChar(c);
    startEngine(c);
  };
  const continueGame = () => {
    if (!existing) return;
    setNcAvatar(existing.avatar);
    startEngine(existing);
  };

  const createUi = (phase === "create" || !charRef.current) ? (
      <div className="w-full h-full relative overflow-y-auto overflow-x-hidden" style={{ background: "radial-gradient(ellipse at top, #1e1b4b 0%, #020617 60%)" }} data-testid="bw-create">
        <div className="min-h-full flex flex-col items-center justify-center px-4 py-8" style={{ minHeight: "100dvh" }}>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md">
            <div className="text-center mb-4">
              <div className="text-[10px] tracking-[0.35em] text-amber-400/80 font-bold">BATEU WORLD</div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 mt-1">ERA DAS LENDAS</h1>
              <p className="text-xs text-slate-400 mt-1">MMO 3D · 2 facções · 48 habilidades · mundo que cresce</p>
            </div>

            {existing && (
              <div className="mb-4 rounded-2xl border border-amber-500/40 bg-slate-900/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                    <AvatarPreview cfg={existing.avatar} classColor={CLASSES[existing.classId].color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{existing.name}</div>
                    <div className="text-xs text-slate-400">
                      Nv{existing.level} · {CLASSES[existing.classId].name} {CLASSES[existing.classId].emoji}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: FACTIONS[existing.faction].color }}>
                      {FACTIONS[existing.faction].emoji} {FACTIONS[existing.faction].name} · {fameRank(existing.fame).emoji} {fameRank(existing.fame).name}
                    </div>
                  </div>
                  <button onClick={continueGame} data-testid="bw-continue"
                    className="px-4 py-2.5 rounded-xl font-bold text-sm text-slate-900 bg-gradient-to-r from-amber-300 to-yellow-500 shadow-lg shadow-amber-500/30 active:scale-95">
                    CONTINUAR
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4 space-y-4">
              <div>
                <div className="text-xs font-bold text-slate-300 mb-2">1 · NOME DO HERÓI</div>
                <input value={ncName} onChange={e => setNcName(e.target.value)} maxLength={16} data-testid="bw-name-input"
                  placeholder="Escreve o teu nome…" className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-400" />
              </div>

              <div>
                <div className="text-xs font-bold text-slate-300 mb-2">2 · CLASSE (4 · 48 habilidades)</div>
                <div className="grid grid-cols-2 gap-2">
                  {CLASSES.map(cl => (
                    <button key={cl.id} onClick={() => { setNcClass(cl.id); setNcAvatar(defaultAvatar(cl.id)); }} data-testid={`bw-class-${cl.id}`}
                      className={`p-2.5 rounded-xl border text-left transition-all ${ncClass === cl.id ? "border-amber-400 bg-amber-400/10 scale-[1.02]" : "border-slate-700 bg-slate-950/60"}`}>
                      <div className="text-lg">{cl.emoji}</div>
                      <div className="font-bold text-sm" style={{ color: cl.color }}>{cl.name}</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{cl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-300 mb-2">3 · FACÇÃO (guerra permanente)</div>
                <div className="grid grid-cols-2 gap-2">
                  {FACTIONS.map(f => (
                    <button key={f.id} onClick={() => setNcFaction(f.id)} data-testid={`bw-faction-${f.id}`}
                      className={`p-2.5 rounded-xl border text-left transition-all ${ncFaction === f.id ? "border-amber-400 bg-amber-400/10 scale-[1.02]" : "border-slate-700 bg-slate-950/60"}`}>
                      <div className="font-black text-sm" style={{ color: f.color }}>{f.emoji} {f.name}</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-300 mb-2">4 · APARÊNCIA</div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                    <AvatarPreview cfg={ncAvatar} classColor={CLASSES[ncClass].color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <AvatarSwatches cfg={ncAvatar} onChange={setNcAvatar} />
                  </div>
                  <button onClick={() => setNcAvatar(randomAvatar(ncClass))} title="Aleatório"
                    className="px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs">🎲</button>
                </div>
              </div>

              <button onClick={beginNew} data-testid="bw-enter"
                className="w-full py-3.5 rounded-xl font-black text-base text-slate-900 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-xl shadow-amber-500/25 active:scale-[0.98]">
                ENTRAR NO MUNDO ⚔
              </button>
              <p className="text-center text-[10px] text-slate-500">Sem registo · o progresso guarda na tua conta quando fizeres login</p>
            </div>
          </motion.div>
        </div>
      </div>
    ) : null;

  // ════════════════ JOGO (HUD) ══════════════════════════════
  function renderHud() {
  const c = charRef.current!;
  const stats = deriveStats(c);
  const cls = CLASSES[c.classId];
  const region = REGIONS.find(r => r.id === hud.region) || REGIONS[0];
  const xpNeedCur = xpNeed(c.level);
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const mpPct = Math.max(0, Math.min(100, (hud.mp / hud.maxMp) * 100));
  const xpPct = Math.max(0, Math.min(100, (c.xp / xpNeedCur) * 100));
  const isMobileHud = window.innerWidth < 820 || window.matchMedia?.("(pointer: coarse)").matches;
  const isTouch = window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window;
  const towerOwned = (engineRef.current?.getTowers() || []).filter(t => t.owner === c.faction).length;

  const skillSlot = (i: number) => {
    const si = c.hotbar[i];
    if (si == null) return null;
    const sk = SKILLS[c.classId][si];
    const locked = c.level < sk.unlock;
    const cd = hud.cds[i] || 0;
    return { sk, locked, cd, si };
  };

  const MENUS: { id: string; label: string; icon: any; testid: string }[] = [
    { id: "inv", label: "Mochila", icon: Backpack, testid: "bw-menu-inv" },
    { id: "skills", label: "Habilidades", icon: Sparkles, testid: "bw-menu-skills" },
    { id: "quests", label: "Missões", icon: ScrollText, testid: "bw-menu-quests" },
    { id: "map", label: "Mapa", icon: Map, testid: "bw-menu-map" },
    { id: "fame", label: "Fama", icon: Trophy, testid: "bw-menu-fame" },
    { id: "party", label: "Grupo", icon: Users, testid: "bw-menu-party" },
    { id: "clan", label: "Clã", icon: Shield, testid: "bw-menu-clan" },
    { id: "mounts", label: "Montarias", icon: Compass, testid: "bw-menu-mounts" },
    { id: "home", label: "Habitação", icon: Home, testid: "bw-menu-home" },
    { id: "forge", label: "Oficina", icon: Hammer, testid: "bw-menu-forge" },
    { id: "shop", label: "Loja", icon: Store, testid: "bw-menu-shop" },
    { id: "coupons", label: "Cupões", icon: Ticket, testid: "bw-menu-coupons" },
    { id: "bank", label: "Banco", icon: Landmark, testid: "bw-menu-bank" },
    { id: "settings", label: "Opções", icon: Settings, testid: "bw-menu-settings" },
  ];

  const openMenu = (id: string) => { setMenuOpen(false); setPanel(id); worldAudio.play("click"); };

  return (
    <div className="absolute inset-0" data-testid="bw-play">

      {/* flash de dano */}
      <AnimatePresence>
        {hud.hp < hud.maxHp * 0.3 && !hud.dead && (
          <motion.div animate={{ opacity: [0.25, 0.08, 0.25] }} transition={{ repeat: Infinity, duration: 1.2 }}
            className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(220,38,38,0.55))" }} />
        )}
      </AnimatePresence>

      {/* ── topo esquerda: barras ── */}
      <div className="absolute top-2 left-2 right-2 flex items-start gap-2 pointer-events-none z-20">
        <div className="flex-1 max-w-[46%]">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="px-1.5 py-0.5 rounded-md text-[10px] font-black text-slate-900" style={{ background: cls.color }}>
              {cls.emoji} Nv{c.level}
            </div>
            <div className="px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate" style={{ background: "rgba(2,6,23,0.7)", color: FACTIONS[c.faction].color }}>
              {FACTIONS[c.faction].emoji} {c.name}
            </div>
            {c.clan && <div className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/70 text-cyan-300">[{c.clan.tag}]</div>}
          </div>
          {/* HP */}
          <div className="h-3 rounded-full bg-slate-950/80 border border-slate-700/80 overflow-hidden mb-1" data-testid="bw-hp-bar">
            <motion.div className="h-full" animate={{ width: `${hpPct}%` }} transition={{ duration: 0.2 }}
              style={{ background: "linear-gradient(90deg,#dc2626,#f87171)" }} />
          </div>
          {/* Mana */}
          <div className="h-2 rounded-full bg-slate-950/80 border border-slate-700/80 overflow-hidden mb-1">
            <motion.div className="h-full" animate={{ width: `${mpPct}%` }} transition={{ duration: 0.2 }}
              style={{ background: "linear-gradient(90deg,#2563eb,#60a5fa)" }} />
          </div>
          {/* XP */}
          <div className="h-1.5 rounded-full bg-slate-950/80 border border-slate-800 overflow-hidden">
            <motion.div className="h-full" animate={{ width: `${xpPct}%` }} transition={{ duration: 0.3 }}
              style={{ background: "linear-gradient(90deg,#d97706,#fbbf24)" }} />
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5 flex gap-2">
            <span data-testid="bw-gold">🪙 {c.gold.toLocaleString("pt-MZ")}</span>
            <span>🎟️ {c.coupons}</span>
            <span>⭐ XP {Math.floor(xpPct)}%</span>
          </div>
        </div>

        {/* centro: alvo */}
        <div className="flex-1 flex flex-col items-center">
          {hud.target && (
            <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-red-900/70 min-w-[140px]" data-testid="bw-target">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-red-300 truncate max-w-[130px]">{hud.target.name}</span>
                <span className="text-[10px] text-slate-400">Nv{hud.target.lvl}</span>
              </div>
              <div className="h-1.5 mt-0.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-red-500 transition-all" style={{ width: `${(hud.target.hp / hud.target.maxHp) * 100}%` }} />
              </div>
            </div>
          )}
          {bossBar && (
            <div className="mt-1 px-3 py-1 rounded-lg bg-slate-950/85 border border-amber-600/80 min-w-[200px] max-w-[280px]" data-testid="bw-boss-bar">
              <div className="text-center text-[10px] font-black text-amber-400 tracking-wider">{bossBar.kind}</div>
              <div className="text-center text-[11px] font-bold text-white truncate">{bossBar.name}</div>
              <div className="h-2 mt-0.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div className="h-full transition-all" style={{ width: `${(bossBar.hp / bossBar.maxHp) * 100}%`, background: "linear-gradient(90deg,#7f1d1d,#ef4444)" }} />
              </div>
            </div>
          )}
          <div className="mt-1 text-center">
            <div className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "rgba(2,6,23,0.7)", color: region.color }} data-testid="bw-region">
              {region.emoji || "📍"} {region.name}{region.danger > 0 ? ` · ☠${region.danger}` : " · seguro"}
            </div>
            {towerOwned > 0 && <div className="text-[9px] text-amber-300 mt-0.5">🏳️ Domínio: +10% XP ({towerOwned} torre{towerOwned > 1 ? "s" : ""})</div>}
          </div>
        </div>

        {/* direita: minimapa + botões */}
        <div className="flex flex-col items-end gap-1 pointer-events-auto">
          <div className="w-[86px] h-[86px] rounded-xl overflow-hidden border border-slate-600/80 bg-slate-950/80 relative" data-testid="bw-minimap">
            <MiniMap engine={engineRef.current} faction={c.faction} />
          </div>
          <div className="flex gap-1">
            <button onClick={() => worldAudio.toggleMusic()} className="w-8 h-8 rounded-lg bg-slate-900/85 border border-slate-700 flex items-center justify-center text-slate-300 text-xs active:scale-90">
              {c.musicOn ? "🎵" : "🔇"}
            </button>
            <button onClick={() => { const m = engineRef.current?.toggleCamera(); setFpMode(m === "1p"); }}
              className="w-8 h-8 rounded-lg bg-slate-900/85 border border-slate-700 flex items-center justify-center text-slate-300 text-xs active:scale-90">
              📷
            </button>
            <button onClick={toggleFs} className="w-8 h-8 rounded-lg bg-slate-900/85 border border-slate-700 flex items-center justify-center text-slate-300 text-xs active:scale-90">
              {fs ? "🗗" : "⛶"}
            </button>
            <button onClick={exitGame} className="w-8 h-8 rounded-lg bg-red-950/90 border border-red-800 flex items-center justify-center text-red-300 text-xs active:scale-90" data-testid="bw-exit">✕</button>
          </div>
        </div>
      </div>

      {/* ── buffs ativos ── */}
      {hud.buffs.length > 0 && (
        <div className="absolute top-[104px] left-2 flex flex-wrap gap-1 max-w-[40%] z-10 pointer-events-none">
          {hud.buffs.map((b: any, i: number) => (
            <div key={i} className="px-1.5 py-0.5 rounded-md bg-emerald-950/85 border border-emerald-700/60 text-[9px] text-emerald-300 font-bold">
              {b.id === "estrelas" ? "🌟" : b.id.startsWith("forca") ? "💪" : "✨"} {Math.ceil(b.t)}s
            </div>
          ))}
        </div>
      )}

      {/* ── feed de eventos ── */}
      <div className="absolute left-2 top-[150px] max-w-[52%] space-y-1 z-10 pointer-events-none">
        <AnimatePresence>
          {feed.map(f => (
            <motion.div key={f.id} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}
              className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-700/60 text-[10px] text-slate-200 leading-tight">
              <span className="mr-1">{f.emoji}</span>{f.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── tracker de missão (campanha) ── */}
      {!c.campaign.done && CAMPAIGN[c.campaign.step] && (
        <div className="absolute right-2 top-[104px] w-[150px] px-2 py-1.5 rounded-lg bg-slate-950/80 border border-amber-700/50 z-10 pointer-events-none" data-testid="bw-tracker">
          <div className="text-[9px] font-black text-amber-400 tracking-wider">CAMPANHA {c.campaign.step + 1}/12</div>
          <div className="text-[10px] text-slate-200 leading-tight">{CAMPAIGN[c.campaign.step].title}</div>
          <div className="text-[9px] text-slate-400 leading-tight">{CAMPAIGN[c.campaign.step].goal}</div>
          <div className="h-1 mt-1 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (c.campaign.prog / Math.max(1, CAMPAIGN[c.campaign.step].target)) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* ── loot pop ── */}
      <AnimatePresence>
        {lootPop && (
          <motion.div key={lootPop.id} initial={{ scale: 0.5, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="absolute left-1/2 top-[38%] -translate-x-1/2 z-30 px-3 py-2 rounded-xl border shadow-xl"
            style={{ background: "rgba(2,6,23,0.92)", borderColor: RARITY_META[lootPop.item.rarity].color }}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{lootPop.item.emoji}</span>
              <div>
                <div className="text-xs font-bold" style={{ color: RARITY_META[lootPop.item.rarity].color }}>
                  {lootPop.item.name}{lootPop.item.up > 0 ? ` +${lootPop.item.up}` : ""}
                </div>
                <div className="text-[9px] text-slate-400">{RARITY_META[lootPop.item.rarity].name} · Nv{lootPop.item.level}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── duelo ── */}
      {duelState && (
        <div className="absolute left-1/2 top-[22%] -translate-x-1/2 z-30 px-4 py-1.5 rounded-xl bg-red-950/90 border border-red-600 text-center" data-testid="bw-duel-banner">
          <div className="text-xs font-black text-red-300 tracking-widest">⚔ DUELO</div>
          <div className="text-[11px] text-white">vs {duelState} — reduz a vida dele a zero!</div>
        </div>
      )}

      {/* ── morte ── */}
      {hud.dead && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/75" data-testid="bw-death">
          <Skull className="w-14 h-14 text-red-500 mb-3" />
          <div className="text-2xl font-black text-red-400">CAÍSTE EM BATALHA</div>
          <p className="text-xs text-slate-400 mt-1 mb-5">−5% de XP · renasce na tua fortaleza</p>
          <button onClick={() => engineRef.current?.respawn()} data-testid="bw-respawn"
            className="px-8 py-3 rounded-xl font-black text-slate-900 bg-gradient-to-r from-amber-300 to-yellow-500 active:scale-95">
            RENASCER
          </button>
        </div>
      )}

      {/* ── joystick (só ecrãs táteis) ── */}
      {isTouch && <Joystick onMove={(x, y) => engineRef.current?.setMoveVec(x, y)} />}

      {/* ── hotbar ── */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-1.5 z-20" data-testid="bw-hotbar">
        {[0, 1, 2, 3, 4, 5].map(i => {
          const s = skillSlot(i);
          const cdPct = s && s.cd > 0 ? (s.cd / s.sk.cd) * 100 : 0;
          return (
            <button key={i}
              onClick={() => engineRef.current?.castSkill(i)}
              data-testid={`bw-skill-${i}`}
              className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-2 flex flex-col items-center justify-center active:scale-90 transition-transform ${s?.locked ? "opacity-40 border-slate-800 bg-slate-950/90" : "border-slate-600 bg-slate-950/85"}`}
              style={{ boxShadow: s && !s.locked ? `0 0 8px ${s.sk.color}55` : undefined }}>
              <span className="text-lg leading-none">{s ? s.sk.emoji : "＋"}</span>
              <span className="text-[7px] text-slate-400 leading-none mt-0.5">{s ? (s.locked ? `Nv${s.sk.unlock}` : s.sk.name.split(" ")[0].slice(0, 7)) : ""}</span>
              {cdPct > 0 && (
                <div className="absolute inset-0 rounded-xl bg-slate-950/75 flex items-center justify-center" style={{ clipPath: `inset(${100 - cdPct}% 0 0 0)` }}>
                  <span className="text-xs font-black text-white">{s!.cd.toFixed(1)}</span>
                </div>
              )}
            </button>
          );
        })}
        {/* ações */}
        <button onClick={() => engineRef.current?.dodge()} className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-2 border-cyan-700 bg-cyan-950/85 flex items-center justify-center active:scale-90" data-testid="bw-dodge">
          <span className="text-lg">💨</span>
        </button>
        <button onPointerDown={() => { engineRef.current?.requestAttack(); }} data-testid="bw-attack"
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-red-600 bg-gradient-to-b from-red-600 to-red-800 flex items-center justify-center active:scale-90 shadow-lg shadow-red-900/50">
          <Swords className="w-7 h-7 text-white" />
        </button>
      </div>

      {/* ── menu de painéis (canto direito) ── */}
      <div className="absolute right-2 bottom-[84px] z-20 flex flex-col items-end gap-1" data-testid="bw-menu">
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="grid grid-cols-3 gap-1 p-2 rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl mb-1">
              {MENUS.map(m => (
                <button key={m.id} onClick={() => openMenu(m.id)} data-testid={m.testid}
                  className="w-[64px] h-[54px] rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center gap-0.5 active:scale-90">
                  <m.icon className="w-4 h-4 text-amber-300" />
                  <span className="text-[8px] text-slate-300 font-bold">{m.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={() => { setMenuOpen(o => !o); worldAudio.play("click"); }} data-testid="bw-menu-toggle"
          className="w-12 h-12 rounded-2xl border-2 border-amber-600 bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center active:scale-90 shadow-lg">
          <Gamepad2 className="w-6 h-6 text-amber-300" />
        </button>
      </div>

      {/* ── interação próxima ── */}
      <NearInteract engine={engineRef.current} onInteract={(id) => {
        const map: Record<string, string> = {
          banco: "bank", leilao: "coupons", loja: "shop", feira: "shop",
          montaria: "mounts", arvore: "clan", obelisco: "fame", fonte: "quests",
          tenda1: "quests", tenda2: "quests", tenda3: "quests", estatua_h: "fame",
          sino: "quests", campog: "map", arena: "party", lote: "home",
        };
        if (map[id]) setPanel(map[id]);
      }} />

      {/* ── toast central ── */}
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.1, opacity: 0 }}
            className="absolute left-1/2 top-[16%] -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-slate-950/95 border border-amber-500/70 shadow-2xl">
            <div className="text-sm font-black text-amber-300 text-center">{toast.emoji} {toast.text}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FPS discreto ── */}
      <div className="absolute bottom-1 left-1 text-[8px] text-slate-600 z-10">{hud.fps} fps · {hud.online} online</div>

      {/* ── painéis ── */}
      <AnimatePresence>
        {panel && (
          <PanelShell title={MENUS.find(m => m.id === panel)?.label || panel} onClose={() => setPanel(null)}>
            {panel === "inv" && <InvPanel c={c} onUpdate={commit} />}
            {panel === "skills" && <SkillsPanel c={c} onUpdate={commit} />}
            {panel === "quests" && <QuestsPanel c={c} plat={plat} onNavigate={onNavigate} onUpdate={commit} />}
            {panel === "map" && <MapPanel c={c} engine={engineRef.current} />}
            {panel === "fame" && <FamePanel c={c} towers={engineRef.current?.getTowers() || []} />}
            {panel === "party" && <PartyPanel c={c} engine={engineRef.current} onDuel={(n) => { engineRef.current?.startDuel(n); setPanel(null); }} />}
            {panel === "clan" && <ClanPanel c={c} onUpdate={commit} />}
            {panel === "mounts" && <MountsPanel c={c} engine={engineRef.current} onUpdate={commit} />}
            {panel === "home" && <HomePanel c={c} engine={engineRef.current} onUpdate={commit} />}
            {panel === "forge" && <ForgePanel c={c} onUpdate={commit} />}
            {panel === "shop" && <ShopPanel c={c} onUpdate={commit} engine={engineRef.current} />}
            {panel === "coupons" && <CouponsPanel c={c} onUpdate={commit} onNavigate={onNavigate} />}
            {panel === "bank" && <BankPanel c={c} onUpdate={commit} onNavigate={onNavigate} />}
            {panel === "settings" && <SettingsPanel c={c} onUpdate={commit} engine={engineRef.current} onExit={exitGame} />}
          </PanelShell>
        )}
      </AnimatePresence>
    </div>
  );
  }

  const hudUi = (charRef.current && phase === "play") ? renderHud() : null;

  // aplica mudanças de char → motor + storage
  function commit(fn?: (c: Char) => void) {
    const cc = charRef.current; if (!cc) return;
    fn?.(cc);
    saveChar(cc);
    engineRef.current?.setStats(deriveStats(cc), cc.level);
    engineRef.current?.setSkillRanks(cc.ranks);
    engineRef.current?.setHotbar(cc.hotbar);
    rerender();
  }

  // Shell persistente: o canvas do motor vive SEMPRE montado
  // (o startEngine precisa do mountRef já durante a criação)
  return (
    <div className="w-full h-full relative overflow-hidden select-none" style={{ background: "#0b1026", height: "100dvh" }}>
      <div ref={mountRef} className="absolute inset-0" data-testid="bw-canvas-host" onTouchStart={() => { worldAudio.ensure(); }} />
      {createUi || hudUi}
    </div>
  );
}

// ════════════════ COMPONENTES DE APOIO ══════════════════════

function PanelShell({ title, onClose, children }: { title: string; onClose: () => void; children: any }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onClick={e => e.stopPropagation()} data-testid="bw-panel"
        className="w-full sm:max-w-lg max-h-[78%] sm:max-h-[82%] bg-slate-950/97 border border-slate-700 rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
          <div className="font-black text-amber-300 text-sm tracking-wide">{title.toUpperCase()}</div>
          <button onClick={onClose} data-testid="bw-panel-close" className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 active:scale-90">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-3 flex-1">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Row({ children, className = "" }: { children: any; className?: string }) {
  return <div className={`flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 ${className}`}>{children}</div>;
}
function Btn({ children, onClick, disabled, tone = "amber", testid, className = "" }: any) {
  const tones: Record<string, string> = {
    amber: "from-amber-400 to-yellow-500 text-slate-900",
    green: "from-emerald-500 to-green-600 text-white",
    red: "from-red-600 to-rose-700 text-white",
    slate: "from-slate-700 to-slate-800 text-slate-200",
    blue: "from-blue-600 to-indigo-700 text-white",
  };
  return (
    <button onClick={onClick} disabled={disabled} data-testid={testid}
      className={`px-3 py-2 rounded-xl font-bold text-xs bg-gradient-to-r active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

// ── Minimapa ao vivo ────────────────────────────────────────
function MiniMap({ engine, faction }: { engine: WorldEngine | null; faction: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0; let t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      t++;
      if (t % 4 !== 0 || !ref.current || !engine) return;
      const d = engine.getMinimapData();
      const ctx = ref.current.getContext("2d")!;
      const W = 86, S = W / 420; // mostra ±210 unidades
      ctx.clearRect(0, 0, W, W);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, W);
      // regiões
      for (const r of d.regions) {
        const dx = (r.cx - d.px) * S + W / 2, dz = (r.cz - d.pz) * S + W / 2;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = r.locked ? "#334155" : r.color;
        ctx.beginPath(); ctx.arc(dx, dz, Math.max(3, r.r * S), 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // marcos
      for (const l of d.landmarks) {
        const dx = (l.x - d.px) * S + W / 2, dz = (l.z - d.pz) * S + W / 2;
        ctx.fillStyle = "#fbbf24"; ctx.fillRect(dx - 1, dz - 1, 2, 2);
      }
      // torres (cor da facção dona)
      for (const tw of d.towers) {
        const dx = (tw.x - d.px) * S + W / 2, dz = (tw.z - d.pz) * S + W / 2;
        ctx.fillStyle = tw.owner === 0 ? "#3b82f6" : tw.owner === 1 ? "#f59e0b" : "#e2e8f0";
        ctx.fillRect(dx - 2, dz - 2, 4, 4);
      }
      // mobs
      for (const m of d.mobs) {
        const dx = (m.x - d.px) * S + W / 2, dz = (m.z - d.pz) * S + W / 2;
        ctx.fillStyle = m.boss ? "#ef4444" : m.elite ? "#fbbf24" : "#94a3b8";
        ctx.fillRect(dx - 1, dz - 1, m.boss ? 4 : 2, m.boss ? 4 : 2);
      }
      // jogadores
      for (const p of d.players) {
        const dx = (p.x - d.px) * S + W / 2, dz = (p.z - d.pz) * S + W / 2;
        ctx.fillStyle = p.faction === faction ? "#22c55e" : "#f87171";
        ctx.fillRect(dx - 1.5, dz - 1.5, 3, 3);
      }
      // eu
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(W / 2, W / 2, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.stroke();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [engine, faction]);
  return <canvas ref={ref} width={86} height={86} className="w-full h-full" />;
}

// ── Joystick virtual ────────────────────────────────────────
function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  const handle = (e: React.PointerEvent) => {
    if (!activeRef.current) return;
    const dx = e.clientX - startRef.current.x, dy = e.clientY - startRef.current.y;
    const max = 44;
    const len = Math.min(max, Math.hypot(dx, dy));
    const nx = len ? dx / Math.hypot(dx, dy) : 0, ny = len ? dy / Math.hypot(dx, dy) : 0;
    setKnob({ x: nx * len, y: ny * len });
    onMove(nx * (len / max), -ny * (len / max));
  };
  return (
    <div ref={baseRef} data-testid="bw-joystick"
      onPointerDown={(e) => { activeRef.current = true; startRef.current = { x: e.clientX, y: e.clientY }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
      onPointerMove={handle}
      onPointerUp={() => { activeRef.current = false; setKnob({ x: 0, y: 0 }); onMove(0, 0); }}
      onPointerCancel={() => { activeRef.current = false; setKnob({ x: 0, y: 0 }); onMove(0, 0); }}
      className="absolute left-3 bottom-20 w-[104px] h-[104px] rounded-full bg-slate-950/50 border-2 border-slate-600/70 z-20 touch-none sm:w-[120px] sm:h-[120px]">
      <div className="absolute w-12 h-12 rounded-full bg-slate-300/80 border-2 border-white shadow-lg transition-transform"
        style={{ left: `calc(50% - 24px + ${knob.x}px)`, top: `calc(50% - 24px + ${knob.y}px)` }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[9px] text-slate-500 font-bold">MOVER</span>
      </div>
    </div>
  );
}

// ── Interação próxima ───────────────────────────────────────
function NearInteract({ engine, onInteract }: { engine: WorldEngine | null; onInteract: (id: string) => void }) {
  const [near, setNear] = useState<any>(null);
  useEffect(() => {
    if (!engine) return;
    const iv = setInterval(() => {
      try {
        const it = engine.nearestInteract();
        setNear(it ? { ...it, key: it.id } : null);
      } catch { }
    }, 500);
    return () => clearInterval(iv);
  }, [engine]);
  if (!near) return null;
  return (
    <button onClick={() => { onInteract(near.id); }} data-testid="bw-interact"
      className="absolute left-1/2 -translate-x-1/2 bottom-[108px] z-20 px-4 py-2 rounded-xl bg-slate-950/90 border border-amber-500/80 shadow-xl active:scale-95">
      <div className="text-[10px] font-black text-amber-300">{near.emoji} {near.name}</div>
      <div className="text-[8px] text-slate-400">toca para interagir</div>
    </button>
  );
}

// ════════════════ PAINÉIS ═══════════════════════════════════

// ── Mochila + Equipamento ───────────────────────────────────
function InvPanel({ c, onUpdate }: { c: Char; onUpdate: (fn: (c: Char) => void) => void }) {
  const [sel, setSel] = useState<LootItem | null>(null);
  const equip = (it: LootItem) => {
    onUpdate(cc => {
      const old = cc.equipped[it.slot];
      cc.equipped[it.slot] = it;
      cc.inv = cc.inv.filter(x => x.id !== it.id);
      if (old) cc.inv.push(old);
    });
    setSel(null);
  };
  const sell = (it: LootItem) => {
    const price = 20 + it.level * 12 + it.rarity * 90 + it.up * 40;
    onUpdate(cc => { cc.inv = cc.inv.filter(x => x.id !== it.id); cc.gold += price; });
    setSel(null);
  };
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] font-black text-slate-400 mb-1.5 tracking-wider">EQUIPAMENTO</div>
        <div className="grid grid-cols-3 gap-1.5">
          {SLOTS.map(s => {
            const it = c.equipped[s];
            const rm = it ? RARITY_META[it.rarity] : null;
            return (
              <button key={s} onClick={() => it && setSel(it)}
                className="p-2 rounded-xl border bg-slate-900/70 text-left min-h-[52px]"
                style={{ borderColor: rm?.color + "88" || "#334155" }}>
                <div className="text-base">{it?.emoji || "＋"}</div>
                <div className="text-[8px] font-bold truncate" style={{ color: rm?.color || "#64748b" }}>{it ? `${it.name}${it.up ? ` +${it.up}` : ""}` : s}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-black text-slate-400 mb-1.5 tracking-wider">MOCHILA ({c.inv.length}/60)</div>
        {c.inv.length === 0 ? <p className="text-xs text-slate-500 py-4 text-center">Vazia — caça criaturas para obter loot!</p> : (
          <div className="grid grid-cols-4 gap-1.5">
            {c.inv.map(it => (
              <button key={it.id} onClick={() => setSel(it)}
                className="p-1.5 rounded-lg border bg-slate-900/70 text-center" style={{ borderColor: RARITY_META[it.rarity].color + "77" }}>
                <div className="text-lg leading-none">{it.emoji}</div>
                <div className="text-[7px] font-bold truncate" style={{ color: RARITY_META[it.rarity].color }}>{it.name.split(" ")[0]}{it.up ? `+${it.up}` : ""}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <AnimatePresence>
        {sel && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setSel(null)}>
            <div className="w-full max-w-xs bg-slate-950 border rounded-2xl p-4 space-y-2" style={{ borderColor: RARITY_META[sel.rarity].color }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <span className="text-3xl">{sel.emoji}</span>
                <div>
                  <div className="font-black text-sm" style={{ color: RARITY_META[sel.rarity].color }}>{sel.name} {sel.up > 0 && `+${sel.up}`}</div>
                  <div className="text-[10px] text-slate-400">{RARITY_META[sel.rarity].name} · {sel.slot} · Nv{sel.level}</div>
                </div>
              </div>
              <div className="space-y-0.5">
                {Object.entries(sel.stats).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[11px]">
                    <span className="text-slate-400">{statLabel(k)}</span>
                    <span className="text-emerald-300 font-bold">+{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Btn onClick={() => equip(sel)} tone="green" testid="bw-equip">EQUIPAR</Btn>
                <Btn onClick={() => sell(sel)} tone="slate" testid="bw-sell">Vender 🪙</Btn>
                <Btn onClick={() => setSel(null)} tone="red">✕</Btn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* materiais */}
      <div>
        <div className="text-[10px] font-black text-slate-400 mb-1.5 tracking-wider">MATERIAIS</div>
        <div className="grid grid-cols-5 gap-1.5">
          {MATERIALS.map(m => (
            <div key={m.id} className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/70 text-center">
              <div className="text-base">{m.emoji}</div>
              <div className="text-[10px] font-black text-amber-300" data-testid={`bw-mat-${m.id}`}>{c.mats[m.id] || 0}</div>
              <div className="text-[7px] text-slate-500 leading-none">{m.name.split(" ")[0]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Habilidades (48 + pontos) ───────────────────────────────
function SkillsPanel({ c, onUpdate }: { c: Char; onUpdate: (fn: (c: Char) => void) => void }) {
  const skills = SKILLS[c.classId];
  const [tab, setTab] = useState(0);
  const learn = (i: number) => {
    onUpdate(cc => {
      if (cc.skillPts <= 0 || cc.level < skills[i].unlock) return;
      if (cc.ranks[i] === 0) { cc.ranks[i] = 1; cc.skillPts -= 1; }
      else if (cc.ranks[i] < 5) { cc.ranks[i] += 1; cc.skillPts -= 1; }
    });
  };
  const setHot = (i: number, slot: number) => {
    onUpdate(cc => { cc.hotbar[slot] = i; });
  };
  return (
    <div className="space-y-3">
      <Row className="justify-between">
        <span className="text-xs text-slate-300">{CLASSES[c.classId].emoji} {CLASSES[c.classId].name} · {skills.length} habilidades</span>
        <span className="text-xs font-black text-amber-300" data-testid="bw-skillpts">Pontos: {c.skillPts}</span>
      </Row>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {[0, 1, 2, 3].map(t => (
          <button key={t} onClick={() => setTab(t)} data-testid={`bw-skilltab-${t}`}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${tab === t ? "border-amber-400 text-amber-300 bg-amber-400/10" : "border-slate-700 text-slate-400"}`}>
            Nv {skills[t * 3]?.unlock}+
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        {skills.slice(tab * 3, tab * 3 + 3).map((sk) => {
          const i = skills.indexOf(sk);
          const rank = c.ranks[i];
          const locked = c.level < sk.unlock;
          return (
            <div key={sk.id} className={`p-2.5 rounded-xl border ${locked ? "border-slate-800 bg-slate-950/60 opacity-60" : "border-slate-700 bg-slate-900/70"}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{sk.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black" style={{ color: sk.color }}>{sk.name} {sk.ult && <span className="text-[8px] text-amber-400 border border-amber-400/60 rounded px-1">ULT</span>}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{sk.desc}</div>
                  <div className="text-[9px] text-slate-500">CD {sk.cd}s · {sk.mana} {CLASSES[c.classId].resource}{rank > 0 ? ` · Rank ${rank}/5 (+${(rank - 1) * 18}% dano)` : ""}</div>
                </div>
                {!locked && (
                  <Btn onClick={() => learn(i)} disabled={c.skillPts <= 0 || rank >= 5} tone={rank === 0 ? "green" : "amber"} testid={`bw-learn-${sk.id}`}>
                    {rank === 0 ? "Aprender" : rank < 5 ? "+Rank" : "MAX"}
                  </Btn>
                )}
                {locked && <span className="text-[9px] text-slate-500">🔒 Nv{sk.unlock}</span>}
              </div>
              {!locked && rank > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {[0, 1, 2, 3, 4, 5].map(slot => (
                    <button key={slot} onClick={() => setHot(i, slot)}
                      className={`w-6 h-6 rounded-md text-[9px] font-black border ${c.hotbar[slot] === i ? "border-amber-400 bg-amber-400/20 text-amber-300" : "border-slate-700 bg-slate-950 text-slate-500"}`}>
                      {slot + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* atributos */}
      <div>
        <div className="text-[10px] font-black text-slate-400 mb-1.5 tracking-wider">ATRIBUTOS ({c.level - 1} pontos por nível de herói)</div>
        <div className="grid grid-cols-2 gap-1.5">
          {[["str", "Força", "+ATK +HP"], ["int", "Inteligência", "+ATK +Mana"], ["agi", "Agilidade", "+ATK +CRIT"], ["vit", "Vitalidade", "+HP +DEF"]].map(([k, label, eff]) => (
            <div key={k} className="p-2 rounded-xl border border-slate-800 bg-slate-900/70">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-200">{label}</span>
                <span className="text-[11px] font-black text-amber-300">{c.alloc[k as keyof typeof c.alloc]}</span>
              </div>
              <div className="text-[8px] text-slate-500">{eff}</div>
              <Btn tone="slate" className="w-full mt-1 !py-1" testid={`bw-alloc-${k}`}
                onClick={() => onUpdate(cc => { (cc.alloc as any)[k]++; })}>+1</Btn>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Missões (campanha + diárias + empresas reais) ───────────
function QuestsPanel({ c, plat, onNavigate, onUpdate }: any) {
  const ch = CAMPAIGN[c.campaign.step];
  const today = new Date().toDateString();
  const daily = c.daily.date === today ? c.daily : null;
  const claimDaily = (q: any) => {
    const prog = daily?.prog?.[q.id] || 0;
    if (prog < q.target || daily?.claimed?.includes(q.id)) return;
    onUpdate(cc => {
      cc.daily.claimed = [...(cc.daily.claimed || []), q.id];
      cc.gold += q.reward;
    });
  };
  const claimCampaign = () => {
    if (!ch || c.campaign.prog < ch.target) return;
    onUpdate(cc => {
      cc.gold += 800 + ch.id * 700;
      if (ch.id === 3 && !cc.mounts.includes("corcel")) cc.mounts.push("corcel");
      if (ch.id === 1 && !cc.mounts.includes("corcel")) { /* livro → +1 ponto */ cc.skillPts += 1; }
      if (ch.id === 8) { /* item épico */ }
      cc.campaign.step = Math.min(CAMPAIGN.length, cc.campaign.step + 1);
      cc.campaign.prog = 0;
      if (cc.campaign.step >= CAMPAIGN.length) cc.campaign.done = true;
    });
  };
  return (
    <div className="space-y-3">
      {/* campanha */}
      <div className="p-3 rounded-xl border border-amber-700/60 bg-amber-950/30">
        <div className="text-[10px] font-black text-amber-400 tracking-wider mb-1">⚔ CAMPANHA · CAPÍTULO {Math.min(12, c.campaign.step + 1)}/12</div>
        {c.campaign.done ? (
          <p className="text-xs text-amber-200 font-bold">🏆 CAMPANHA COMPLETA — és uma LENDA VIVA!</p>
        ) : ch ? (
          <>
            <div className="text-sm font-black text-white">{ch.title}</div>
            <div className="text-[11px] text-slate-300">{ch.goal}</div>
            <div className="h-1.5 mt-1.5 rounded-full bg-slate-900 overflow-hidden">
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, (c.campaign.prog / ch.target) * 100)}%` }} />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] text-slate-400">🎁 {ch.reward}</span>
              <Btn onClick={claimCampaign} disabled={c.campaign.prog < ch.target} testid="bw-claim-campaign">RECLAMAR</Btn>
            </div>
          </>
        ) : null}
      </div>
      {/* diárias */}
      <div>
        <div className="text-[10px] font-black text-slate-400 tracking-wider mb-1.5">📜 MISSÕES DIÁRIAS (reiniciam à meia-noite)</div>
        <div className="space-y-1.5">
          {DAILY_QUESTS.map(q => {
            const prog = daily?.prog?.[q.id] || 0;
            const done = prog >= q.target;
            const claimed = daily?.claimed?.includes(q.id);
            return (
              <div key={q.id} className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/70">
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <div className="text-[11px] font-bold text-slate-200">{q.label}</div>
                    <div className="text-[9px] text-slate-400">{q.goal} · 🪙 {q.reward}</div>
                  </div>
                  {claimed ? <span className="text-[10px] text-emerald-400 font-bold">✔ FEITO</span>
                    : <Btn onClick={() => claimDaily(q)} disabled={!done} tone={done ? "green" : "slate"} testid={`bw-daily-${q.id}`}>Reclamar</Btn>}
                </div>
                <div className="h-1 mt-1 rounded-full bg-slate-950 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (prog / q.target) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* empresas reais */}
      <div>
        <div className="text-[10px] font-black text-slate-400 tracking-wider mb-1.5">🎪 DESAFIOS DE EMPRESAS (conteúdo real da plataforma)</div>
        <div className="space-y-1.5">
          {(plat?.raffles || []).slice(0, 2).map((r: any) => (
            <div key={r.id} className="p-2.5 rounded-xl border border-fuchsia-800/60 bg-fuchsia-950/20">
              <div className="text-[11px] font-bold text-fuchsia-200">🎟️ {r.title}</div>
              <div className="text-[9px] text-slate-400">Prémio: {r.prizeTitle} ({fmtMZN(r.prizeValue)})</div>
              <Btn tone="blue" className="mt-1" onClick={() => onNavigate?.(worldRoute("raffle", r))}>Participar na plataforma</Btn>
            </div>
          ))}
          {(plat?.contests || []).slice(0, 1).map((cn: any) => (
            <div key={cn.id} className="p-2.5 rounded-xl border border-cyan-800/60 bg-cyan-950/20">
              <div className="text-[11px] font-bold text-cyan-200">🏆 {cn.title}</div>
              <div className="text-[9px] text-slate-400">{cn.prize || "Prémio especial"}</div>
              <Btn tone="blue" className="mt-1" onClick={() => onNavigate?.(worldRoute("contest", cn))}>Ver concurso</Btn>
            </div>
          ))}
          {(plat?.vouchers || []).slice(0, 1).map((v: any) => (
            <div key={v.id} className="p-2.5 rounded-xl border border-emerald-800/60 bg-emerald-950/20">
              <div className="text-[11px] font-bold text-emerald-200">🎟️ Cupão escondido: {v.code}</div>
              <div className="text-[9px] text-slate-400">Captura-o na Casa de Leilões do mundo!</div>
            </div>
          ))}
          {!plat?.live && <p className="text-[10px] text-slate-500">A ligar às empresas da plataforma…</p>}
        </div>
      </div>
    </div>
  );
}

// ── Mapa mundial ────────────────────────────────────────────
function MapPanel({ c, engine }: any) {
  const S = 340 / 860;
  const toXY = (x: number, z: number) => [170 + x * S, 170 + z * S];
  const mm = engine?.getMinimapData();
  const go = (id: string) => { engine?.teleportTo(id); };
  return (
    <div className="space-y-2">
      <div className="relative mx-auto rounded-xl border border-slate-700 overflow-hidden" style={{ width: 340, height: 340, background: "#0f172a" }} data-testid="bw-bigmap">
        {REGIONS.map(r => {
          const [x, y] = toXY(r.cx, r.cz);
          const locked = engine?.isRegionLocked(r.id);
          return (
            <button key={r.id} onClick={() => !r.hub && go(r.id)} disabled={r.hub}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center"
              style={{ left: x, top: y, width: Math.max(24, r.r * 2 * S), height: Math.max(24, r.r * 2 * S), background: r.color + (locked ? "33" : "55"), border: `1px solid ${r.color}` }}>
              <span className="text-[8px] font-black text-white drop-shadow text-center leading-tight px-0.5">{r.name}</span>
              {locked && <span className="absolute text-[10px]">🔒</span>}
            </button>
          );
        })}
        {mm && (
          <div className="absolute w-3 h-3 rounded-full bg-white border-2 border-amber-400 -translate-x-1/2 -translate-y-1/2" style={{ left: toXY(mm.px, mm.pz)[0], top: toXY(mm.px, mm.pz)[1] }} />
        )}
        {mm?.towers.map((t: any) => {
          const [x, y] = toXY(t.x, t.z);
          return <div key={t.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-[11px]" style={{ left: x, top: y }}>{t.owner === 0 ? "🛡️" : t.owner === 1 ? "⚡" : "🏳️"}</div>;
        })}
        {mm?.dungeons.map((d: any) => {
          const [x, y] = toXY(d.x, d.z);
          return <div key={d.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-[11px]" style={{ left: x, top: y }}>{d.emoji}</div>;
        })}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {REGIONS.map(r => {
          const locked = engine?.isRegionLocked(r.id);
          return (
            <button key={r.id} onClick={() => go(r.id)}
              className="p-2 rounded-xl border text-left active:scale-95"
              style={{ borderColor: r.color + "77", background: r.color + "14" }}>
              <div className="text-[11px] font-black" style={{ color: r.color }}>{r.hub ? "🏠" : "🌍"} {r.name} {locked && "🔒"}</div>
              <div className="text-[8px] text-slate-400 leading-tight">{r.desc}</div>
              <div className="text-[8px] text-slate-500">Nv {r.lvl[0]}–{r.lvl[1]}{r.locked && !locked ? " · DESBLOQUEADA" : ""}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Fama & Guerra ───────────────────────────────────────────
function FamePanel({ c, towers }: any) {
  const rank = fameRank(c.fame);
  const next = FAME_RANKS.find(r => r.min > c.fame);
  return (
    <div className="space-y-3">
      <div className="p-4 rounded-xl border border-amber-700/60 bg-amber-950/30 text-center">
        <div className="text-3xl">{rank.emoji}</div>
        <div className="font-black text-amber-300 text-lg">{rank.name}</div>
        <div className="text-xs text-slate-400">{c.fame} FAMA {next && `· faltam ${next.min - c.fame} para ${next.name}`}</div>
        <div className="mt-1 text-[10px] text-slate-500">{FACTIONS[c.faction].emoji} {FACTIONS[c.faction].name} — "{FACTIONS[c.faction].motto}"</div>
      </div>
      <div>
        <div className="text-[10px] font-black text-slate-400 tracking-wider mb-1.5">🏳️ GUERRA DE TERRITÓRIO</div>
        <div className="space-y-1.5">
          {towers.map((t: any) => {
            const td = TOWERS.find(x => x.id === t.id);
            return (
              <div key={t.id} className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/70 flex justify-between items-center">
                <div>
                  <div className="text-[11px] font-bold text-slate-200">{td?.emoji} {t.name}</div>
                  <div className="text-[9px] text-slate-400">Dono: {t.owner === 0 ? "🛡️ VANGUARDA" : t.owner === 1 ? "⚡ TEMPESTADE" : "livre"}</div>
                </div>
                {t.owner === c.faction && <span className="text-[9px] text-emerald-400 font-bold">TEU DOMÍNIO +10% XP</span>}
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-slate-500 mt-1.5">Fica dentro do anel de uma torre 10s para capturá-la para a tua facção. Domínio dá +10% XP a toda a facção.</p>
      </div>
      <div>
        <div className="text-[10px] font-black text-slate-400 tracking-wider mb-1.5">📊 A TUA SAGA</div>
        <div className="grid grid-cols-3 gap-1.5">
          {[["☠ Chefes", c.saga.bosses], ["💀 Masmorras", c.saga.dungeons], ["⚔ Duelos", c.saga.duels], ["🥷 Roubos", c.saga.steals], ["🏳️ Torres", c.saga.towers], ["😈 Vilões", c.saga.villains]].map(([l, v]) => (
            <div key={String(l)} className="p-2 rounded-xl border border-slate-800 bg-slate-900/70 text-center">
              <div className="text-sm font-black text-amber-300">{String(v)}</div>
              <div className="text-[8px] text-slate-400">{String(l)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Grupo 1-clique ──────────────────────────────────────────
function PartyPanel({ c, engine, onDuel }: any) {
  const [inParty, setInParty] = useState(false);
  const mm = engine?.getMinimapData();
  const near = (mm?.players || []).filter((p: any) => {
    const d = Math.hypot(p.x - mm.px, p.z - mm.pz);
    return d < 60;
  });
  const join = () => {
    const ids = near.map((p: any) => p.name);
    setInParty(true);
    engine?.setParty(ids);
  };
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl border border-emerald-800/60 bg-emerald-950/30">
        <div className="text-xs font-black text-emerald-300">🤝 PROCURAR GRUPO (1 clique)</div>
        <p className="text-[10px] text-slate-400 mt-1">Cada membro perto de ti dá <b className="text-emerald-300">+8% XP e +8% ouro</b> (até +32%). Igual ao Hordes.io, mas melhor.</p>
        {inParty ? (
          <div className="mt-2">
            <div className="text-[10px] font-bold text-emerald-400" data-testid="bw-party-active">✔ EM GRUPO com {near.length} herói(s) por perto</div>
            <Btn tone="red" className="mt-1.5" onClick={() => { setInParty(false); engine?.setParty([]); }}>Sair do grupo</Btn>
          </div>
        ) : (
          <Btn tone="green" className="mt-2" onClick={join} testid="bw-party-join" disabled={near.length === 0}>
            {near.length > 0 ? `AGRUPAR com ${near.length} por perto` : "Sem heróis por perto agora"}
          </Btn>
        )}
      </div>
      <div>
        <div className="text-[10px] font-black text-slate-400 tracking-wider mb-1.5">⚔ DESAFIAR (duelo 1v1 com aposta)</div>
        <div className="space-y-1.5">
          {(mm?.players || []).slice(0, 5).map((p: any) => (
            <div key={p.name} className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/70 flex justify-between items-center">
              <div>
                <div className="text-[11px] font-bold text-slate-200">{p.faction === c.faction ? "🤝" : "⚔"} {p.name}</div>
                <div className="text-[9px]" style={{ color: FACTIONS[p.faction]?.color }}>{FACTIONS[p.faction]?.name}</div>
              </div>
              <Btn tone="red" onClick={() => onDuel(p.name)} testid={`bw-duel-${p.name}`}>Desafiar</Btn>
            </div>
          ))}
          {!mm?.players?.length && <p className="text-[10px] text-slate-500">Ninguém perto — explora o mundo!</p>}
        </div>
      </div>
    </div>
  );
}

// ── Clã ─────────────────────────────────────────────────────
function ClanPanel({ c, onUpdate }: any) {
  const [tag, setTag] = useState(c.clan?.tag || "");
  const [name, setName] = useState(c.clan?.name || "");
  const LS_CLANS = "bateu_legends_clans";
  const [clans, setClans] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_CLANS) || "[]"); } catch { return []; }
  });
  const create = () => {
    const t = (tag || "").toUpperCase().slice(0, 4).trim();
    const n = (name || "").trim().slice(0, 20);
    if (!t || !n || c.gold < 5000) return;
    onUpdate(cc => {
      cc.clan = { tag: t, name: n };
      cc.gold -= 5000;
    });
    try {
      const list = JSON.parse(localStorage.getItem(LS_CLANS) || "[]");
      list.push({ tag: t, name: n, by: c.name, at: Date.now() });
      localStorage.setItem(LS_CLANS, JSON.stringify(list.slice(-30)));
      setClans(list);
    } catch { }
  };
  return (
    <div className="space-y-3">
      {c.clan ? (
        <div className="p-3 rounded-xl border border-cyan-700/60 bg-cyan-950/30 text-center">
          <div className="text-2xl font-black text-cyan-300">[{c.clan.tag}]</div>
          <div className="text-xs text-slate-300">{c.clan.name}</div>
          <div className="text-[10px] text-slate-500 mt-1">Fundado por {c.name} · Árvore dos Juramentos 🌳</div>
        </div>
      ) : (
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/70 space-y-2">
          <div className="text-xs font-black text-slate-300">🌳 FUNDA O TEU CLÃ (5.000 🪙)</div>
          <input value={tag} onChange={e => setTag(e.target.value)} maxLength={4} placeholder="SIGLA (ex: LZA)"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm uppercase" />
          <input value={name} onChange={e => setName(e.target.value)} maxLength={20} placeholder="Nome do clã"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
          <Btn onClick={create} disabled={!tag || !name || c.gold < 5000} testid="bw-clan-create">FUNDAR CLÃ</Btn>
        </div>
      )}
      {clans.length > 0 && (
        <div>
          <div className="text-[10px] font-black text-slate-400 tracking-wider mb-1.5">CLÃS DO MUNDO</div>
          <div className="space-y-1">
            {clans.slice(-8).reverse().map((cl: any, i: number) => (
              <div key={i} className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 flex justify-between text-[10px]">
                <span className="font-black text-cyan-300">[{cl.tag}] {cl.name}</span>
                <span className="text-slate-500">por {cl.by}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Montarias ───────────────────────────────────────────────
function MountsPanel({ c, engine, onUpdate }: any) {
  const buy = (id: string, cost: number) => {
    if (c.gold < cost || c.mounts.includes(id)) return;
    onUpdate(cc => { cc.gold -= cost; cc.mounts.push(id); });
  };
  const ride = (id: string) => {
    const ok = engine?.mount(id);
    onUpdate(cc => { cc.activeMount = ok ? id : null; });
  };
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-slate-400">Invoca a montaria e galopa pelo mundo com velocidade extra.</p>
      {MOUNTS.map(m => {
        const owned = c.mounts.includes(m.id);
        const active = c.activeMount === m.id;
        return (
          <div key={m.id} className="p-2.5 rounded-xl border bg-slate-900/70 flex items-center gap-2" style={{ borderColor: active ? "#fbbf24" : "#1e293b" }}>
            <span className="text-2xl">{m.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-slate-200">{m.name} <span className="text-emerald-400">×{m.mult} vel.</span></div>
              <div className="text-[9px] text-slate-500">{m.source}</div>
            </div>
            {owned
              ? <Btn onClick={() => ride(m.id)} tone={active ? "amber" : "slate"} testid={`bw-mount-${m.id}`}>{active ? "Desmontar" : "Montar"}</Btn>
              : m.id === "lobo" ? <Btn onClick={() => buy(m.id, 15000)} disabled={c.gold < 15000} testid={`bw-buy-${m.id}`}>15.000 🪙</Btn>
                : <span className="text-[9px] text-slate-500">🔒</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Habitação ───────────────────────────────────────────────
function HomePanel({ c, engine, onUpdate }: any) {
  const house = engine?.getHousing();
  return (
    <div className="space-y-2">
      {!house ? (
        <div className="p-3 rounded-xl border border-amber-800/60 bg-amber-950/20">
          <div className="text-xs font-black text-amber-300">🏘️ RECLAMA O TEU LOTE (GRÁTIS)</div>
          <p className="text-[10px] text-slate-400 mt-1">Um terreno no Bairro das Residências, perto da Vila Dourada. Constroi casa, muralha e torre de guarda para proteger os teus cupões de ladrões inimigos.</p>
          <Btn tone="green" className="mt-2" onClick={() => { engine?.claimPlot(); onUpdate(() => { }); }} testid="bw-claim-plot">RECLAMAR LOTE</Btn>
        </div>
      ) : (
        <>
          <div className="p-2.5 rounded-xl border border-emerald-800/60 bg-emerald-950/20">
            <div className="text-[10px] text-slate-300">🏠 Lote reclamado · Cofre de cupões: <b className="text-amber-300">{house.vault}</b> 🎟️</div>
            <div className="flex gap-2 mt-1.5">
              <Btn tone="amber" onClick={() => { if (c.coupons > 0) { engine?.depositCoupon(1); onUpdate(cc => { cc.coupons--; }); } }} disabled={c.coupons <= 0} testid="bw-deposit-coupon">Guardar 1 cupão</Btn>
              <Btn tone="green" onClick={() => { onUpdate(cc => { cc.gold += 300; cc.house && (cc.house.vault = Math.max(0, cc.house.vault - 1)); }); engine?.getHousing(); }} disabled={(house.vault || 0) <= 0}>Levantar 1</Btn>
            </div>
          </div>
          {BUILDINGS.map(b => {
            const lvl = house.built?.[b.id] || 0;
            const next = lvl + 1;
            const cost = b.cost[Math.min(lvl, b.cost.length - 1)];
            const maxed = lvl >= b.levels;
            return (
              <div key={b.id} className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/70">
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <div className="text-[11px] font-bold text-slate-200">{b.emoji} {b.name} {lvl > 0 && <span className="text-amber-300">Nv{lvl}</span>}</div>
                    <div className="text-[9px] text-slate-400">{b.desc}</div>
                  </div>
                  {!maxed
                    ? <Btn onClick={() => { engine?.buildHouse(b.id); onUpdate(cc => { cc.gold -= cost; }); }} disabled={c.gold < cost} testid={`bw-build-${b.id}`}>
                      {lvl === 0 ? "Construir" : `Melhorar Nv${next}`} · {cost.toLocaleString("pt-MZ")} 🪙
                    </Btn>
                    : <span className="text-[9px] text-emerald-400 font-bold">MAX</span>}
                </div>
              </div>
            );
          })}
          <p className="text-[9px] text-slate-500">Com Torre de Guarda ativa, os inimigos não conseguem roubar cupões dentro do teu lote — têm primeiro de destruir a torre (invasão).</p>
        </>
      )}
    </div>
  );
}

// ── Oficina (melhorias) ─────────────────────────────────────
function ForgePanel({ c, onUpdate }: any) {
  const [sel, setSel] = useState<LootItem | null>(null);
  const items = [...Object.values(c.equipped).filter(Boolean), ...c.inv] as LootItem[];
  const doUpgrade = () => {
    if (!sel) return;
    const cost = upgradeCost(sel.up);
    if ((c.mats.fragmento || 0) < cost) return;
    const chance = upgradeChance(sel.up);
    const ok = Math.random() < chance;
    onUpdate(cc => {
      cc.mats.fragmento -= cost;
      const all = [...cc.inv, ...Object.values(cc.equipped).filter(Boolean)];
      const it = all.find(x => x.id === sel.id);
      if (it && ok) it.up += 1;
    });
  };
  const cost = sel ? upgradeCost(sel.up) : 0;
  const chance = sel ? Math.round(upgradeChance(sel.up) * 100) : 0;
  return (
    <div className="space-y-3">
      <p className="text-[10px] text-slate-400"> 🔨 melhora o teu equipamento com Fragmentos Arcanos. Até +6 é 100%; depois falha-se! Cada nível dá +12% aos stats do item.</p>
      <div className="grid grid-cols-4 gap-1.5">
        {items.map(it => (
          <button key={it.id} onClick={() => setSel(it)} className="p-1.5 rounded-lg border bg-slate-900/70" style={{ borderColor: RARITY_META[it.rarity].color + (sel?.id === it.id ? "" : "66") }}>
            <div className="text-lg">{it.emoji}</div>
            <div className="text-[7px] font-bold" style={{ color: RARITY_META[it.rarity].color }}>{it.name.split(" ")[0]}{it.up ? `+${it.up}` : ""}</div>
          </button>
        ))}
        {items.length === 0 && <p className="col-span-4 text-xs text-slate-500 text-center py-4">Sem itens — caça primeiro!</p>}
      </div>
      {sel && (
        <div className="p-3 rounded-xl border" style={{ borderColor: upgradeGlow(sel.up) || RARITY_META[sel.rarity].color, background: "rgba(2,6,23,0.8)" }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{sel.emoji}</span>
            <div className="flex-1">
              <div className="text-xs font-black" style={{ color: RARITY_META[sel.rarity].color }}>{sel.name} → +{sel.up + 1}</div>
              <div className="text-[10px] text-slate-400">Custo: {cost} 🔹 · Sucesso: {chance}%</div>
            </div>
          </div>
          <Btn onClick={doUpgrade} disabled={(c.mats.fragmento || 0) < cost} tone={chance === 100 ? "green" : "amber"} className="w-full mt-2" testid="bw-upgrade-go">
            MELHORAR ({c.mats.fragmento || 0} 🔹 disponíveis)
          </Btn>
        </div>
      )}
    </div>
  );
}

// ── Loja ────────────────────────────────────────────────────
function ShopPanel({ c, onUpdate, engine }: any) {
  const craft = (p: any) => {
    const ok = Object.entries(p.cost).every(([k, v]) => (c.mats[k] || 0) >= (v as number));
    if (!ok) return;
    onUpdate(cc => {
      for (const [k, v] of Object.entries(p.cost)) cc.mats[k] -= v as number;
      cc.pots[p.id] = (cc.pots[p.id] || 0) + 1;
    });
  };
  const buyVida = () => {
    if (c.gold < 300) return;
    onUpdate(cc => { cc.gold -= 300; cc.pots.vida = (cc.pots.vida || 0) + 1; });
  };
  const usePot = (id: string) => {
    if ((c.pots[id] || 0) <= 0) return;
    if (engine?.usePotion(id)) onUpdate(cc => { cc.pots[id]--; });
  };
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] font-black text-slate-400 tracking-wider mb-1.5">🧪 CALDEIRÃO (usa materiais)</div>
        <div className="space-y-1.5">
          {POTIONS.map(p => {
            const can = Object.entries(p.cost).every(([k, v]) => (c.mats[k] || 0) >= (v as number));
            return (
              <div key={p.id} className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/70 flex justify-between items-center gap-2">
                <div>
                  <div className="text-[11px] font-bold text-slate-200">{p.emoji} {p.name} <span className="text-amber-300">×{c.pots[p.id] || 0}</span></div>
                  <div className="text-[9px] text-slate-400">{p.desc} · {Object.entries(p.cost).map(([k, v]) => `${v} ${k}`).join(", ")}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <Btn onClick={() => craft(p)} disabled={!can} tone={can ? "green" : "slate"} testid={`bw-craft-${p.id}`}>Fabricar</Btn>
                  <Btn onClick={() => usePot(p.id)} disabled={(c.pots[p.id] || 0) <= 0} tone="slate" testid={`bw-usepot-${p.id}`}>Usar</Btn>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-black text-slate-400 tracking-wider mb-1.5">🏪 MERCADOR</div>
        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/70 flex justify-between items-center">
          <div>
            <div className="text-[11px] font-bold text-slate-200">🧪 Poção de Vida ×1</div>
            <div className="text-[9px] text-slate-400">Recupera 45% da vida · 300 🪙</div>
          </div>
          <Btn onClick={buyVida} disabled={c.gold < 300} testid="bw-buy-potion">Comprar</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Cupões (economia da plataforma) ─────────────────────────
function CouponsPanel({ c, onUpdate, onNavigate }: any) {
  const [acc, setAcc] = useState<{ id: string; code: string; label: string }[]>([]);
  const [plat, setPlat] = useState<PlatformData | null>(null);
  const [claimed, setClaimed] = useState<string[]>([]);
  useEffect(() => {
    fetchAccountVouchers().then(setAcc);
    fetchPlatformData().then(setPlat);
  }, []);
  const claim = (v: any) => {
    if (c.coupons <= 0) return;
    onUpdate(cc => { cc.coupons--; });
    claimWorldVoucher(v.id, v.code, voucherLabelOf(v)).then(ok => {
      if (ok) setClaimed(cl => [...cl, v.id]);
    });
    logWorldActivity(c.uid, "coupon-claim", v.code, 1);
  };
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl border border-amber-700/60 bg-amber-950/30 text-center">
        <div className="text-3xl font-black text-amber-300" data-testid="bw-coupons-count">🎟️ {c.coupons}</div>
        <div className="text-[10px] text-slate-400">cupões no bolso — ganhos a roubar, em vilões, chefes e desafios</div>
      </div>
      <div>
        <div className="text-[10px] font-black text-slate-400 tracking-wider mb-1.5">🔁 TROCAR POR CUPÕES REAIS DA PLATAFORMA</div>
        <div className="space-y-1.5">
          {(plat?.vouchers || []).map((v: any) => (
            <div key={v.id} className="p-2.5 rounded-xl border border-emerald-800/60 bg-emerald-950/20 flex justify-between items-center gap-2">
              <div>
                <div className="text-[11px] font-black text-emerald-300">{v.code}</div>
                <div className="text-[9px] text-slate-400">{voucherLabelOf(v)}</div>
              </div>
              {claimed.includes(v.id) || acc.some(a => a.id === v.id)
                ? <span className="text-[10px] text-emerald-400 font-bold">✔ NA CONTA</span>
                : <Btn onClick={() => claim(v)} disabled={c.coupons <= 0} tone="green" testid={`bw-claim-voucher-${v.id}`}>Trocar 1 🎟️</Btn>}
            </div>
          ))}
          {!plat?.vouchers?.length && <p className="text-[10px] text-slate-500">Sem cupões ativos agora — volta em breve!</p>}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-black text-slate-400 tracking-wider mb-1.5">🔨 CASA DE LEILÕES</div>
        <p className="text-[10px] text-slate-400 mb-1.5">Usa o teu ouro e créditos nos leilões reais da plataforma.</p>
        <Btn tone="blue" onClick={() => onNavigate?.("/leiloes")}>Abrir Leilões da plataforma</Btn>
      </div>
      {acc.length > 0 && (
        <div>
          <div className="text-[10px] font-black text-slate-400 tracking-wider mb-1.5">💼 NA TUA CONTA</div>
          {acc.map(a => (
            <div key={a.id} className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 text-[10px] text-slate-300 mb-1">
              {a.code} · {a.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function voucherLabelOf(v: any): string {
  return v.type === "percentage" ? `-${v.value}%` : `-${v.value} MT`;
}

// ── Banco de Pontos ─────────────────────────────────────────
function BankPanel({ c, onUpdate, onNavigate }: any) {
  const [amount, setAmount] = useState(10);
  const [status, setStatus] = useState<string | null>(null);
  const exchange = () => {
    const cost = amount * 100;
    if (c.gold < cost) return;
    onUpdate(cc => { cc.gold -= cost; });
    exchangeWorldPoints(amount, c.uid).then(r => {
      if (r === "ok") setStatus(`✔ ${amount} créditos creditados na conta!`);
      else if (r === "no-auth") setStatus("⏳ Guardado — entra na conta para receber (sincroniza automático).");
      else setStatus("⏳ Pedido registado — processa após sincronização.");
    });
    logWorldActivity(c.uid, "bank-exchange", `${amount}p`, amount);
  };
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl border border-emerald-700/60 bg-emerald-950/25">
        <div className="text-xs font-black text-emerald-300">🏦 BANCO DE PONTOS</div>
        <p className="text-[10px] text-slate-400 mt-1">Converte ouro do mundo em <b className="text-emerald-300">créditos reais da plataforma</b> — 100 🪙 = 1 crédito. Mínimo 10.</p>
        <div className="flex items-center gap-2 mt-2">
          <input type="number" min={10} max={100} value={amount} onChange={e => setAmount(Math.max(10, Math.min(100, Number(e.target.value) || 10)))}
            className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm" data-testid="bw-bank-amount" />
          <Btn onClick={exchange} disabled={c.gold < amount * 100} tone="green" testid="bw-bank-exchange">Trocar · {amount * 100} 🪙</Btn>
        </div>
        {status && <div className="text-[10px] mt-2 text-emerald-300" data-testid="bw-bank-status">{status}</div>}
      </div>
      <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="text-xs font-bold text-slate-300">💡 O que fazer com créditos?</div>
        <ul className="text-[10px] text-slate-400 list-disc pl-4 space-y-0.5 mt-1">
          <li>Participar em sorteios e concursos reais</li>
          <li>Licitar nos leilões da plataforma</li>
          <li>Comprar bilhetes de prémios</li>
        </ul>
        <Btn tone="blue" className="mt-2" onClick={() => onNavigate?.("/lives")}>Ir à plataforma</Btn>
      </div>
    </div>
  );
}

// ── Opções ──────────────────────────────────────────────────
function SettingsPanel({ c, onUpdate, engine, onExit }: any) {
  const WHATS = "+258848547887";
  const [share, setShare] = useState(false);
  const shareAchievement = () => {
    const text = `⚔ Sou ${c.name}, ${CLASSES[c.classId].name} Nv${c.level} com ${fameRank(c.fame).name} no BATEU WORLD: Era das Lendas! Vem jogar: jogo de mundo aberto da plataforma Bateu 🌍`;
    try { navigator.share?.({ text }); } catch { }
    setShare(true);
  };
  const waMsg = encodeURIComponent(`Olá! Acabei de conquistar um prémio no Bateu World — Era das Lendas (Nv${c.level}, ${fameRank(c.fame).name}). Quero receber o meu 1GB! Herói: ${c.name}`);
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="text-xs font-black text-slate-300 mb-1.5">🎵 ÁUDIO</div>
        <div className="flex gap-2 flex-wrap">
          {MUSIC_TRACKS.map((t, i) => (
            <button key={t.id} onClick={() => { worldAudio.setTrack(i); worldAudio.startMusic(); }}
              className="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-[9px] text-slate-300">{t.emoji} {t.name}</button>
          ))}
        </div>
      </div>
      <div className="p-3 rounded-xl border border-fuchsia-800/60 bg-fuchsia-950/20">
        <div className="text-xs font-black text-fuchsia-300">🌟 CONQUISTAS</div>
        <Btn tone="blue" className="mt-1.5" onClick={shareAchievement} testid="bw-share">
          {share ? "✔ Partilhado!" : "Partilhar nos Stories"}
        </Btn>
      </div>
      <div className="p-3 rounded-xl border border-amber-800/60 bg-amber-950/20">
        <div className="text-xs font-black text-amber-300">📞 APOIO / PRÉMIOS</div>
        <a href={`https://wa.me/${WHATS.replace("+", "")}?text=${waMsg}`} target="_blank" rel="noreferrer" data-testid="bw-whatsapp"
          className="inline-block mt-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold active:scale-95">
          WhatsApp {WHATS}
        </a>
        <p className="text-[9px] text-slate-500 mt-1">Prémio 1GB (qualquer operador) — enviado com mensagem automática.</p>
      </div>
      <div className="p-3 rounded-xl border border-red-900/60 bg-red-950/20">
        <div className="text-xs font-black text-red-300 mb-1.5">⚠ ZONA DE PERIGO</div>
        <div className="flex gap-2 flex-wrap">
          <Btn tone="slate" onClick={() => { if (confirm("Apagar o herói e começar de novo?")) { localStorage.removeItem(LS_KEY); onExit?.(); } }}>Recomeçar herói</Btn>
          <Btn tone="red" onClick={onExit} testid="bw-quit">Sair do mundo</Btn>
        </div>
      </div>
      <div className="text-center text-[9px] text-slate-600">Bateu World · Era das Lendas v18 · {engine?.getState().fps || 0} fps</div>
    </div>
  );
}
