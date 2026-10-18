// ============================================================
// MUNDO BATEU — Motor do jogo (estado + sistemas) · v1
// Combate, roubo com alarme, construção e proteção de casa,
// duelos 1v1 com aposta, vilões e chefes, guardas e heat,
// missões diárias, saga, economia e sincronização.
// ============================================================
// @ts-nocheck

import {
  BUILDINGS, CLASSES, DAILIES, DAY_MS, ITEMS, LANDMARKS, MOBS, TILE, VILLAINS,
  xpNeeded, powerLevel, lootRarityRoll, rollLoot, clamp, dist, now,
  type BuildKind, type CompanyChallenge, type Equip, type InventoryItem,
  type QuestState, type SagaState, type SaveV1, type VaultItem,
} from "./types";
import {
  expansionLevel, landmarkNear, mobSpawnAt, regionAt, shadowBaseAt,
  shadowBasesAround, tileAt, villainArena, VILLAGES,
} from "./gen";

export const LS_SAVE = "bateu_mundo_save_v1";

// ─── Entidades ───────────────────────────────────────────────
export interface Ent {
  id: string; kind: "mob" | "npc" | "boss" | "shadow" | "guarda";
  x: number; y: number; vx: number; vy: number; face: number;
  mobId?: string; role?: string;
  hp: number; maxHp: number; atk: number; def: number; spd: number; r: number;
  state: "idle" | "wander" | "aggro" | "flee" | "attack" | "dead";
  target: { x: number; y: number } | null;
  wanderT: number; cd: number; anim: number; hitFlash: number;
  name?: string; emoji: string; color: string;
  xp: number; gold: [number, number]; aggro: number;
  spawnX: number; spawnY: number;
  villain?: string; tier?: number;
  chat?: string; chatUntil?: number;
  deadT?: number;
  telegraph?: number; aoeT?: number;
  baseKey?: string;        // para shadows (base de origem)
  dead?: boolean;
}

export interface Projectile { x: number; y: number; vx: number; vy: number; kind: "flecha" | "fogo" | "torreta" | "canhao"; dmg: number; from: "player" | "ent"; life: number; r: number; }
export interface FloatTxt { x: number; y: number; text: string; color: string; life: number; vy: number; size: number; }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; grav: number; }
export interface GameEvent { id: string; text: string; emoji: string; kind: "info" | "good" | "bad" | "epic"; }

export interface BuildPart { x: number; y: number; kind: BuildKind; hp: number; plantedAt?: number; ready?: boolean; }

export interface PlayerState {
  uid: string; name: string; classId: number;
  x: number; y: number; vx: number; vy: number; face: number;
  hp: number; maxHp: number; energy: number;
  level: number; xp: number; gold: number; trofeus: number; pts: number;
  kills: number; deaths: number; streak: number; karma: number; heat: number;
  inv: InventoryItem[]; equip: Equip;
  attackCd: number; attackAnim: number; iframes: number;
  abilityCds: Record<string, number>;
  charge: number;            // 0..100 ultimate
  buffs: { atkUntil: number; shield: boolean; furyUntil: number };
  base: { claimed: boolean; x: number; y: number; prot: number; protUntil: number };
  vault: VaultItem[];
  discoveries: string[];
  quest: QuestState;
  saga: SagaState;
  bed: { x: number; y: number } | null;
  dead: boolean; deadT: number;
  anim: number; moving: boolean;
}

export interface DuelState {
  oppId: string; oppName: string; oppHp: number; oppMaxHp: number; oppAtk: number; oppDef: number; oppSpd: number; oppX: number; oppY: number; oppFace: number; oppCd: number;
  phase: "count" | "fight" | "end"; t: number; result: "" | "win" | "lose";
  stakeGold: number; stakeItem: string; cx: number; cy: number;
}

export interface HeistState { baseKey: string; t: number; dur: number; bx: number; by: number; }

export interface GameState {
  started: number; time: number; day: number;
  phase: number;         // 0..1 do ciclo
  night: boolean;
  weather: "limpo" | "chuva" | "vento"; weatherT: number;
  p: PlayerState;
  ents: Ent[]; projectiles: Projectile[]; floats: FloatTxt[]; particles: Particle[];
  events: GameEvent[];
  controls: { mx: number; my: number; sprint: boolean };
  buildMode: BuildKind | null;
  structures: Map<string, BuildPart>;
  harvest: Map<string, number>;       // "x,y" -> respawnAt (0=pronto)
  plots: string[];
  interact: { kind: string; label: string; sub?: string; data?: any } | null;
  duel: DuelState | null;
  heist: HeistState | null;
  bossActive: string | null;
  expansion: number; online: number; activityCount: number;
  platform: any; challenges: CompanyChallenge[];
  entSerial: number;
  spawnT: number; saveT: number; syncT: number;
  playTimeMs: number;
  screenShake: number;
  paused: boolean;
  regionName: string; regionId: string;
  bestPower: number;
}

// ─── Save / Load ─────────────────────────────────────────────
export function newSave(name: string, classId: number, uid: string): SaveV1 {
  const cls = CLASSES[classId];
  const d = new Date().toISOString().slice(0, 10);
  return {
    v: 1, uid, name, classId,
    level: 1, xp: 0, gold: 60, trofeus: 0, pts: 0,
    kills: 0, deaths: 0, streak: 0,
    hp: cls.hp,
    inv: [{ id: "manga", qty: 3 }, { id: "madeira", qty: 10 }, { id: "fibra", qty: 8 }],
    equip: {},
    base: { x: 8, y: 14, claimed: false, prot: 0, protUntil: 0 },
    vault: [],
    quest: { date: d, kills: 0, collect: 0, steal: 0, duel: 0, visit: 0, claimed: {} },
    saga: { killsTenentes: {}, defeated: {} },
    discoveries: [], heat: 0, karma: 0,
    energy: 100,
    pos: { x: 0.5, y: -10.5 },
    playTimeMs: 0,
    lastSeen: new Date().toISOString(),
  };
}
export function saveGame(g: GameState): boolean {
  try {
    const p = g.p;
    const s: SaveV1 = {
      v: 1, uid: p.uid, name: p.name, classId: p.classId,
      level: p.level, xp: p.xp, gold: Math.round(p.gold), trofeus: p.trofeus, pts: p.pts,
      kills: p.kills, deaths: p.deaths, streak: p.streak,
      hp: Math.max(1, Math.round(p.hp)),
      inv: p.inv.slice(0, 24), equip: p.equip,
      base: { ...p.base }, vault: p.vault.slice(0, 24),
      quest: p.quest, saga: p.saga,
      discoveries: p.discoveries.slice(0, 60), heat: Math.round(p.heat), karma: p.karma,
      energy: Math.round(p.energy),
      pos: { x: +p.x.toFixed(2), y: +p.y.toFixed(2) },
      playTimeMs: Math.round(g.playTimeMs),
      lastSeen: new Date().toISOString(),
    };
    localStorage.setItem(LS_SAVE, JSON.stringify(s));
    return true;
  } catch { return false; }
}
export function loadGame(): SaveV1 | null {
  try {
    const raw = localStorage.getItem(LS_SAVE);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1 || !s.name) return null;
    return s;
  } catch { return null; }
}
export function wipeSave() { try { localStorage.removeItem(LS_SAVE); } catch { /* */ } }

// ─── Criar estado ────────────────────────────────────────────
export function createGame(s: SaveV1, opts?: { expansion?: number; online?: number }): GameState {
  const cls = CLASSES[s.classId] || CLASSES[0];
  const p: PlayerState = {
    uid: s.uid, name: s.name, classId: s.classId,
    x: s.pos?.x ?? 0.5, y: s.pos?.y ?? -10.5, vx: 0, vy: 0, face: Math.PI / 2,
    hp: s.hp ?? cls.hp, maxHp: cls.hp + (s.level - 1) * 6, energy: s.energy ?? 100,
    level: s.level || 1, xp: s.xp || 0, gold: s.gold ?? 60, trofeus: s.trofeus || 0, pts: s.pts || 0,
    kills: s.kills || 0, deaths: s.deaths || 0, streak: s.streak || 0, karma: s.karma || 0, heat: s.heat || 0,
    inv: s.inv || [], equip: s.equip || {},
    attackCd: 0, attackAnim: 0, iframes: 0,
    abilityCds: {}, charge: 0,
    buffs: { atkUntil: 0, shield: false, furyUntil: 0 },
    base: s.base || { x: 8, y: 14, claimed: false, prot: 0, protUntil: 0 },
    vault: s.vault || [],
    discoveries: s.discoveries || [],
    quest: s.quest || newSave(s.name, s.classId, s.uid).quest,
    saga: s.saga || { killsTenentes: {}, defeated: {} },
    bed: null, dead: false, deadT: 0, anim: 0, moving: false,
  };
  // stats derivados de nível
  recomputeStats(p);
  const today = new Date().toISOString().slice(0, 10);
  if (p.quest.date !== today) p.quest = { date: today, kills: 0, collect: 0, steal: 0, duel: 0, visit: 0, claimed: {} };

  const g: GameState = {
    started: now(), time: DAY_MS * 0.22, day: 1, phase: 0.22, night: false,
    weather: "limpo", weatherT: 120_000,
    p,
    ents: [], projectiles: [], floats: [], particles: [], events: [],
    controls: { mx: 0, my: 0, sprint: false },
    buildMode: null,
    structures: new Map(), harvest: new Map(), plots: [],
    interact: null, duel: null, heist: null, bossActive: null,
    expansion: opts?.expansion ?? 1, online: opts?.online ?? 1, activityCount: 0,
    platform: null, challenges: [],
    entSerial: 1,
    spawnT: 0, saveT: 0, syncT: 0, playTimeMs: 0,
    screenShake: 0, paused: false,
    regionName: "", regionId: "", bestPower: 0,
  };
  g.bestPower = powerLevel({ level: p.level, atk: p.atk, def: p.def, spd: p.spd });
  // restaurar estruturas da base a partir do claim + vault
  if (p.base.claimed) claimArea(g, p.base.x, p.base.y, true);
  pushEvent(g, `Bem-vindo de volta, ${p.name}!`, "🌍", "info");
  return g;
}

export function recomputeStats(p: PlayerState) {
  const cls = CLASSES[p.classId] || CLASSES[0];
  p.maxHp = cls.hp + (p.level - 1) * 6;
  let atk = cls.atk + Math.floor((p.level - 1) * 1.5);
  let def = cls.def + Math.floor((p.level - 1) * 0.8);
  let spd = cls.spd;
  if (p.equip.arma && ITEMS[p.equip.arma]) atk += ITEMS[p.equip.arma].atk || 0;
  if (p.equip.armadura && ITEMS[p.equip.armadura]) def += ITEMS[p.equip.armadura].def || 0;
  if (p.equip.amuleto && ITEMS[p.equip.amuleto]) {
    atk += ITEMS[p.equip.amuleto].atk || 0;
    def += ITEMS[p.equip.amuleto].def || 0;
    spd += ITEMS[p.equip.amuleto].spd || 0;
  }
  (p as any).atk = atk; (p as any).def = def; (p as any).spd = spd;
}
export function pStats(p: PlayerState): { atk: number; def: number; spd: number } {
  return { atk: (p as any).atk ?? 10, def: (p as any).def ?? 5, spd: (p as any).spd ?? 1 };
}
export function currentPower(p: PlayerState): number {
  const st = pStats(p);
  const gear = ["arma", "armadura", "amuleto"].reduce((a, k) => a + (ITEMS[p.equip[k]]?.value || 0) * 0.1, 0);
  return powerLevel({ level: p.level, atk: st.atk, def: st.def, spd: st.spd, gear });
}

export function pushEvent(g: GameState, text: string, emoji: string, kind: GameEvent["kind"] = "info") {
  g.events.push({ id: "ev" + now() + Math.random().toString(36).slice(2, 6), text, emoji, kind });
  if (g.events.length > 6) g.events.shift();
}

// ─── Utilidades de mundo ─────────────────────────────────────
export function solidAt(g: GameState, wx: number, wy: number): boolean {
  const tx = Math.floor(wx), ty = Math.floor(wy);
  const t = tileAt(tx, ty, g.expansion);
  if (t === TILE.OCEAN || t === TILE.RIVER || t === TILE.WALL || t === TILE.MIST) return true;
  const part = g.structures.get(`${tx},${ty}`);
  if (part && part.kind !== "porta" && part.kind !== "lanterna" && part.kind !== "plantacao" && part.kind !== "bandeira" && part.kind !== "bau" && part.kind !== "cama") return true;
  return false;
}
function moveEnt(g: GameState, e: { x: number; y: number }, dx: number, dy: number, r = 0.34) {
  const nx = e.x + dx;
  if (!solidAt(g, nx + Math.sign(dx) * r, e.y) && !solidAt(g, nx + Math.sign(dx) * r, e.y + r * 0.6) && !solidAt(g, nx + Math.sign(dx) * r, e.y - r * 0.6)) e.x = nx;
  const ny = e.y + dy;
  if (!solidAt(g, e.x, ny + Math.sign(dy) * r) && !solidAt(g, e.x + r * 0.6, ny + Math.sign(dy) * r) && !solidAt(g, e.x - r * 0.6, ny + Math.sign(dy) * r)) e.y = ny;
}

// ─── Base do jogador (construir e proteger) ──────────────────
export function claimArea(g: GameState, cx: number, cy: number, silent = false): boolean {
  if (g.p.base.claimed && !silent) { pushEvent(g, "Já tens uma casa reivindicada!", "🏠", "info"); return false; }
  const t = tileAt(cx, cy, g.expansion);
  if (t === TILE.OCEAN || t === TILE.RIVER || t === TILE.MIST) { if (!silent) pushEvent(g, "Não podes construir aqui!", "⛔", "bad"); return false; }
  // não sobre bases de sombra
  for (const b of shadowBasesAround(cx, cy, 8)) {
    if (Math.abs(b.x - cx) < 9 && Math.abs(b.y - cy) < 9) { if (!silent) pushEvent(g, "Território ocupado por outro herói!", "🚫", "bad"); return false; }
  }
  for (const v of VILLAGES) { if (Math.abs(v.x - cx) < 5.5 && Math.abs(v.y - cy) < 5.5) { if (!silent) pushEvent(g, "Zona da vila — reivindica fora do perímetro.", "🚫", "bad"); return false; } }
  g.p.base = { x: cx, y: cy, claimed: true, prot: g.p.base.prot || 1, protUntil: now() + 86400_000 };
  g.plots = [];
  for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) g.plots.push(`${cx + dx},${cy + dy}`);
  if (!silent) {
    pushEvent(g, "TERRA REIVINDICADA! Constrói a tua casa!", "🚩", "good");
    logEvent(g, "base_claim", "Reivindicou território", 1);
  }
  return true;
}
export function canBuildAt(g: GameState, tx: number, ty: number): boolean {
  const p = g.p;
  if (!p.base.claimed) return false;
  if (Math.abs(tx - p.base.x) > 3 || Math.abs(ty - p.base.y) > 3) return false;
  const t = tileAt(tx, ty, g.expansion);
  if (t === TILE.OCEAN || t === TILE.RIVER || t === TILE.WALL || t === TILE.MIST) return false;
  if (g.structures.has(`${tx},${ty}`)) return false;
  if (Math.abs(tx - p.x) > 3.5 || Math.abs(ty - p.y) > 3.5) return false;
  return true;
}
export function placeBuild(g: GameState, kind: BuildKind): boolean {
  const def = BUILDINGS[kind];
  const tx = Math.floor(g.p.x + Math.cos(g.p.face) * 1.2);
  const ty = Math.floor(g.p.y + Math.sin(g.p.face) * 1.2);
  if (!canBuildAt(g, tx, ty)) { pushEvent(g, "Sem espaço aqui (dentro da tua terra!)", "🚫", "bad"); return false; }
  for (const [mat, qty] of Object.entries(def.cost)) {
    const have = g.p.inv.find((i) => i.id === mat)?.qty || 0;
    if (have < qty) { pushEvent(g, `Falta ${ITEMS[mat]?.name || mat} (${have}/${qty})`, "🧱", "bad"); return false; }
  }
  for (const [mat, qty] of Object.entries(def.cost)) {
    const it = g.p.inv.find((i) => i.id === mat);
    if (it) { it.qty -= qty; if (it.qty <= 0) g.p.inv = g.p.inv.filter((i) => i !== it); }
  }
  g.structures.set(`${tx},${ty}`, { x: tx, y: ty, kind, hp: 100, plantedAt: now(), ready: false });
  if (kind === "cama") g.p.bed = { x: tx + 0.5, y: ty + 1.2 };
  if (kind === "bau") g.p.base.prot = Math.max(g.p.base.prot, 1);
  pushEvent(g, `${def.emoji} ${def.name} construído!`, "🔨", "good");
  logEvent(g, "build", def.name, 1);
  return true;
}
export function upgradeProtection(g: GameState): boolean {
  const p = g.p;
  if (!p.base.claimed) { pushEvent(g, "Reivindica terra primeiro!", "🚩", "bad"); return false; }
  const cost = [0, 200, 600, 1400][p.base.prot] || 0;
  if (p.gold < cost) { pushEvent(g, `Escudo nível ${p.base.prot + 1} custa ${cost} ouro`, "💰", "bad"); return false; }
  p.gold -= cost;
  p.base.prot = Math.min(3, p.base.prot + 1);
  p.base.protUntil = now() + 86400_000;
  pushEvent(g, `ESCUDO nível ${p.base.prot} ativo! A tua casa está mais protegida.`, "🛡️", "good");
  logEvent(g, "base_prot", `Escudo nível ${p.base.prot}`, 1);
  return true;
}

// ─── Roubo (core viral) ──────────────────────────────────────
export function startHeist(g: GameState, baseKey: string) {
  if (g.heist) return;
  const b = shadowBasesAround(g.p.x, g.p.y, 3).find((x) => x.key === baseKey);
  if (!b) return;
  g.heist = { baseKey, t: 0, dur: 2600, bx: b.x, by: b.y };
  pushEvent(g, `A arrombar o baú de ${b.owner}…mantém-te perto!`, "🥷", "info");
}
export function cancelHeist(g: GameState) { if (g.heist) { g.heist = null; pushEvent(g, "Roubo abortado.", "💨", "info"); } }

function completeHeist(g: GameState, success: boolean) {
  const b = shadowBasesAround(g.p.x, g.p.y, 3).find((x) => x.key === g.heist?.baseKey);
  g.heist = null;
  if (!b) return;
  if (success) {
    const stolen: string[] = [];
    const n = clamp(1 + Math.floor(Math.random() * 3), 1, b.vault.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * b.vault.length);
      const it = b.vault[idx];
      if (!it) continue;
      addItem(g.p.inv, it.id, 1);
      stolen.push(ITEMS[it.id]?.emoji + " " + (ITEMS[it.id]?.name || it.id));
      it.qty -= 1;
      if (it.qty <= 0) b.vault.splice(idx, 1);
    }
    const gold = Math.round(b.gold * (0.3 + Math.random() * 0.4));
    g.p.gold += gold;
    g.p.heat = clamp(g.p.heat + 12 + b.prot * 6, 0, 100);
    g.p.charge = clamp(g.p.charge + 8, 0, 100);
    g.p.quest.steal += 1;
    bumpChallenge(g, "steal", 1);
    addFloat(g, g.p.x, g.p.y - 1, `+${gold} 💰`, "#fbbf24", 16);
    pushEvent(g, `ROUBO PERFEITO! Roubaste: ${stolen.join(", ")} (+${gold} ouro)`, "🥷", "good");
    logEvent(g, "steal", `Roubou a base de ${b.owner}`, 1);
    g.screenShake = 6;
  } else {
    g.p.heat = clamp(g.p.heat + 28, 0, 100);
    pushEvent(g, `ALARME! ${b.owner} acionou o escudo! Guardas a caminho!`, "🚨", "bad");
    for (let i = 0; i < 2; i++) g.ents.push(spawnGuard(g, b.x + (Math.random() - 0.5) * 6, b.y + (Math.random() - 0.5) * 6));
    logEvent(g, "steal_fail", `Alarme na base de ${b.owner}`, 1);
  }
}

// ─── Inventário / itens ──────────────────────────────────────
export function addItem(inv: InventoryItem[], id: string, qty = 1) {
  const ex = inv.find((i) => i.id === id);
  if (ex) ex.qty += qty; else if (inv.length < 24) inv.push({ id, qty });
}
export function addFloat(g: GameState, x: number, y: number, text: string, color: string, size = 13) {
  g.floats.push({ x, y, text, color, life: 1100, vy: -0.028, size });
  if (g.floats.length > 40) g.floats.shift();
}
function burst(g: GameState, x: number, y: number, color: string, n = 10, spd = 0.09) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.4 + Math.random());
    g.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.02, life: 500 + Math.random() * 400, maxLife: 900, color, size: 1.5 + Math.random() * 2.5, grav: 0.00016 });
  }
  if (g.particles.length > 240) g.particles.splice(0, g.particles.length - 240);
}

export function useItemAt(g: GameState, idx: number): boolean {
  const it = g.p.inv[idx];
  if (!it) return false;
  const def = ITEMS[it.id];
  if (!def) return false;
  if (def.kind === "consumivel" && def.heal) {
    g.p.hp = Math.min(g.p.maxHp, g.p.hp + def.heal);
    addFloat(g, g.p.x, g.p.y - 1, `+${def.heal} ❤️`, "#4ade80", 15);
    it.qty -= 1; if (it.qty <= 0) g.p.inv.splice(idx, 1);
    return true;
  }
  if (def.kind === "arma" || def.kind === "armadura" || def.kind === "amuleto") {
    const slot = def.kind;
    const old = g.p.equip[slot];
    g.p.equip[slot] = it.id;
    it.qty -= 1; if (it.qty <= 0) g.p.inv.splice(idx, 1);
    if (old) addItem(g.p.inv, old, 1);
    recomputeStats(g.p);
    pushEvent(g, `${def.emoji} ${def.name} equipado!`, "✨", "good");
    g.bestPower = Math.max(g.bestPower, currentPower(g.p));
    return true;
  }
  if (def.kind === "cupao") {
    pushEvent(g, "Cupão pronto para reclamar na conta — abre o painel de Cupões!", "🎟️", "epic");
    return false;
  }
  return false;
}
export function sellItemAt(g: GameState, idx: number): boolean {
  const it = g.p.inv[idx];
  if (!it) return false;
  const def = ITEMS[it.id];
  if (!def || def.kind === "cupao") return false;
  const val = Math.max(2, Math.round((def.value || 5) * 0.5)) * it.qty;
  g.p.gold += val;
  g.p.inv.splice(idx, 1);
  addFloat(g, g.p.x, g.p.y - 1, `+${val} 💰`, "#fbbf24", 14);
  return true;
}
export function storeVault(g: GameState, idx: number): boolean {
  const it = g.p.inv[idx];
  if (!it || it.id === "cupao_mundo") return false;
  const vx = g.p.vault.find((v) => v.id === it.id);
  if (vx) vx.qty += it.qty; else if (g.p.vault.length < 24) g.p.vault.push({ id: it.id, qty: it.qty }); else return false;
  g.p.inv.splice(idx, 1);
  return true;
}
export function takeVault(g: GameState, idx: number): boolean {
  const it = g.p.vault[idx];
  if (!it) return false;
  addItem(g.p.inv, it.id, it.qty);
  g.p.vault.splice(idx, 1);
  return true;
}

// ─── Ataques / combate ───────────────────────────────────────
export function doAttack(g: GameState) {
  const p = g.p;
  if (p.attackCd > 0 || p.dead || g.duel?.phase === "end") return;
  const st = pStats(p);
  p.attackCd = 420;
  p.attackAnim = 260;
  const range = 1.7, arc = 1.5;
  let hitAny = false;
  for (const e of g.ents) {
    if (e.dead || e.kind === "npc") continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d > range + e.r / TILE_R) continue;
    const ang = Math.atan2(e.y - p.y, e.x - p.x);
    let da = Math.abs(((ang - p.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (da > arc) continue;
    let dmg = Math.max(2, Math.round(st.atk * (0.9 + Math.random() * 0.35) - e.def * 0.5));
    const crit = Math.random() < 0.14;
    if (crit) dmg = Math.round(dmg * 1.8);
    if (p.buffs.atkUntil > now()) dmg = Math.round(dmg * 1.5);
    e.hp -= dmg; e.hitFlash = 180;
    e.state = "aggro"; e.target = { x: p.x, y: p.y };
    addFloat(g, e.x, e.y - 0.8, crit ? `${dmg}!` : `${dmg}`, crit ? "#f87171" : "#fff", crit ? 17 : 13);
    burst(g, e.x, e.y, "#fca5a5", crit ? 12 : 6);
    hitAny = true;
    if (e.hp <= 0) killEnt(g, e);
  }
  // duelo
  if (g.duel && g.duel.phase === "fight") {
    const d = g.duel;
    const dd = dist(p.x, p.y, d.oppX, d.oppY);
    if (dd < range + 0.5) {
      const ang = Math.atan2(d.oppY - p.y, d.oppX - p.x);
      const da = Math.abs(((ang - p.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (da < arc) {
        let dmg = Math.max(2, Math.round(st.atk * (0.9 + Math.random() * 0.35) - d.oppDef * 0.5));
        const crit = Math.random() < 0.14;
        if (crit) dmg = Math.round(dmg * 1.8);
        if (p.buffs.atkUntil > now()) dmg = Math.round(dmg * 1.5);
        d.oppHp -= dmg;
        addFloat(g, d.oppX, d.oppY - 0.8, crit ? `${dmg}!` : `${dmg}`, "#fbbf24", 15);
        if (d.oppHp <= 0) endDuel(g, "win");
      }
    }
  }
  if (hitAny) g.screenShake = Math.max(g.screenShake, 3);
}
export const TILE_R = 48;

function killEnt(g: GameState, e: Ent) {
  e.dead = true; e.deadT = now();
  e.state = "dead";
  burst(g, e.x, e.y, e.color, 16, 0.12);
  const p = g.p;
  if (e.kind === "mob" || e.kind === "boss" || e.kind === "guarda") {
    const xp = e.xp || 10;
    const gold = e.gold ? Math.round(e.gold[0] + Math.random() * (e.gold[1] - e.gold[0])) : 5;
    p.gold += gold; p.kills += 1; p.streak += 1;
    g.p.charge = clamp(g.p.charge + (e.kind === "boss" ? 60 : 6), 0, 100);
    p.quest.kills += 1;
    bumpChallenge(g, "kills", 1);
    addFloat(g, e.x, e.y - 1, `+${xp} XP`, "#a5b4fc", 13);
    addFloat(g, e.x, e.y - 1.4, `+${gold} 💰`, "#fbbf24", 13);
    gainXp(g, xp);
    // loot
    const tier = e.kind === "boss" ? 3 : e.tier || 1;
    const rarity = lootRarityRoll(tier * 8 + p.karma * 0.1);
    const itemId = rollLoot(rarity);
    addItem(p.inv, itemId, 1);
    const rmeta = { comum: "#cbd5e1", raro: "#4ade80", epico: "#c084fc", lendario: "#fbbf24", mitico: "#f87171" }[rarity];
    addFloat(g, e.x, e.y - 1.9, ` loot: ${ITEMS[itemId]?.emoji}`, rmeta, 14);
    if (rarity === "epico" || rarity === "lendario" || rarity === "mitico") {
      pushEvent(g, `LOOT ${rmeta === "#fbbf24" ? "LENDÁRIO" : "ÉPICO"}: ${ITEMS[itemId]?.name}!`, ITEMS[itemId]?.emoji, "epic");
      logEvent(g, "loot_rare", ITEMS[itemId]?.name, 1);
    }
    if (e.kind === "boss" && e.villain) {
      const v = VILLAINS.find((V) => V.id === e.villain);
      p.saga.defeated[e.villain] = (p.saga.defeated[e.villain] || 0) + 1;
      p.trofeus += 25; p.karma += 2;
      g.bossActive = null;
      pushEvent(g, `VILÃO DERROTADO: ${v?.name} caiu! +25 troféus`, v?.emoji || "🏆", "epic");
      if (Math.random() < 0.55) { addItem(p.inv, "cupao_mundo", 1); pushEvent(g, "O vilão deixou cair um CUPÃO DO MUNDO! Reclama em Cupões.", "🎟️", "epic"); }
      g.screenShake = 10;
      logEvent(g, "boss", `Derrotou ${v?.name}`, 1);
    }
    if (e.kind === "guarda") { p.heat = clamp(p.heat - 10, 0, 100); }
  } else if (e.kind === "shadow") {
    // derrotar outro herói (sombra): troféus + loot melhor
    p.kills += 1; p.streak += 1; p.trofeus += 4;
    p.quest.kills += 1;
    bumpChallenge(g, "kills", 1);
    gainXp(g, 40);
    addFloat(g, e.x, e.y - 1, "Herói derrotado! +4 🏆", "#fbbf24", 14);
    const rarity = lootRarityRoll(14);
    addItem(p.inv, rollLoot(rarity), 1);
    logEvent(g, "pvp_win", `Derrotou ${e.name}`, 1);
  }
}

export function gainXp(g: GameState, xp: number) {
  const p = g.p;
  p.xp += xp;
  let need = xpNeeded(p.level);
  while (p.xp >= need) {
    p.xp -= need;
    p.level += 1;
    recomputeStats(p);
    p.hp = p.maxHp;
    pushEvent(g, `NÍVEL ${p.level}! Os inimigos ficam mais fortes…`, "⬆️", "epic");
    logEvent(g, "level", `Nível ${p.level}`, p.level);
    need = xpNeeded(p.level);
  }
}

export function damagePlayer(g: GameState, dmg: number, fromX: number, fromY: number) {
  const p = g.p;
  if (p.iframes > 0 || p.dead) return;
  if (p.buffs.shield) { p.buffs.shield = false; addFloat(g, p.x, p.y - 1, "BLOQUEADO", "#60a5fa", 15); return; }
  const st = pStats(p);
  const real = Math.max(1, Math.round(dmg - st.def * 0.55));
  p.hp -= real;
  p.iframes = 450;
  addFloat(g, p.x, p.y - 1, `-${real}`, "#f87171", 15);
  burst(g, p.x, p.y, "#fda4af", 8);
  g.screenShake = Math.max(g.screenShake, 5);
  // knockback leve
  const a = Math.atan2(p.y - fromY, p.x - fromX);
  moveEnt(g, p, Math.cos(a) * 0.25, Math.sin(a) * 0.25);
  if (p.hp <= 0) killPlayer(g);
}
function killPlayer(g: GameState) {
  const p = g.p;
  p.dead = true; p.deadT = now(); p.hp = 0; p.deaths += 1; p.streak = 0;
  const lost = Math.round(p.gold * 0.12);
  p.gold -= lost;
  p.heat = clamp(p.heat - 20, 0, 100);
  pushEvent(g, `Foste derrotado… perdeste ${lost} ouro. Renasces na tua cama ou na Praça.`, "💀", "bad");
  logEvent(g, "death", "Foi derrotado", 1);
  if (g.duel && g.duel.phase === "fight") endDuel(g, "lose");
}
export function respawnPlayer(g: GameState) {
  const p = g.p;
  p.dead = false;
  p.hp = Math.round(p.maxHp * 0.7);
  p.energy = 70;
  p.iframes = 2000;
  const bed = p.bed;
  if (bed) { p.x = bed.x; p.y = bed.y; } else { p.x = 0.5; p.y = -10.5; }
}

// ─── Habilidades ─────────────────────────────────────────────
export function castAbility(g: GameState, i: number) {
  const p = g.p;
  if (p.dead) return;
  const cls = CLASSES[p.classId];
  const ab = cls.abilities[i];
  if (!ab) return;
  const t = now();
  if ((p.abilityCds[ab.id] || 0) > t) return;
  const st = pStats(p);
  p.abilityCds[ab.id] = t + ab.cd;
  p.attackAnim = 300;
  if (ab.id === "golpe") {
    for (const e of g.ents) {
      if (e.dead || e.kind === "npc") continue;
      if (dist(p.x, p.y, e.x, e.y) < 2.6) {
        const dmg = Math.max(2, Math.round(st.atk * 1.4 - e.def * 0.4));
        e.hp -= dmg; e.hitFlash = 200; e.state = "aggro";
        addFloat(g, e.x, e.y - 0.8, `${dmg}`, "#fbbf24", 15);
        if (e.hp <= 0) killEnt(g, e);
      }
    }
    burst(g, p.x, p.y, "#fbbf24", 24, 0.16);
  } else if (ab.id === "grito") {
    p.buffs.atkUntil = t + 6000;
    burst(g, p.x, p.y, "#ef4444", 18);
    pushEvent(g, "GRITO DE GUERRA! Dano +50% por 6s", "📢", "good");
  } else if (ab.id === "flecha") {
    g.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(p.face), vy: Math.sin(p.face), kind: "flecha", dmg: Math.round(st.atk * 1.3), from: "player", life: 1600, r: 0.2 });
  } else if (ab.id === "passo") {
    p.iframes = Math.max(p.iframes, 900);
    const dash = 2.2;
    moveEnt(g, p, Math.cos(p.face) * dash, Math.sin(p.face) * dash, 0.34);
    burst(g, p.x, p.y, "#22c55e", 14);
  } else if (ab.id === "fogo") {
    g.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(p.face), vy: Math.sin(p.face), kind: "fogo", dmg: Math.round(st.atk * 1.5), from: "player", life: 1400, r: 0.35 });
  } else if (ab.id === "escudo") {
    p.buffs.shield = true;
    burst(g, p.x, p.y, "#60a5fa", 12);
    pushEvent(g, "Escudo Arcano ativo!", "🛡️", "good");
  }
}

export function castUltimate(g: GameState) {
  const p = g.p;
  if (p.charge < 100 || p.dead) return;
  p.charge = 0;
  const st = pStats(p);
  pushEvent(g, "ULTIMATE! PODER MÁXIMO!", "💥", "epic");
  g.screenShake = 9;
  for (const e of g.ents) {
    if (e.dead || e.kind === "npc") continue;
    if (dist(p.x, p.y, e.x, e.y) < 5) {
      const dmg = Math.round(st.atk * 2.6);
      e.hp -= dmg; e.hitFlash = 260;
      addFloat(g, e.x, e.y - 0.9, `${dmg}!`, "#f87171", 19);
      if (e.hp <= 0) killEnt(g, e);
    }
  }
  if (g.duel && g.duel.phase === "fight") {
    const d = g.duel;
    if (dist(p.x, p.y, d.oppX, d.oppY) < 5) {
      const dmg = Math.round(st.atk * 2.6);
      d.oppHp -= dmg;
      addFloat(g, d.oppX, d.oppY - 0.9, `${dmg}!`, "#f87171", 19);
      if (d.oppHp <= 0) endDuel(g, "win");
    }
  }
  burst(g, p.x, p.y, "#fde047", 40, 0.22);
}

// ─── Duelos 1v1 ──────────────────────────────────────────────
export function startDuel(g: GameState, entId: string) {
  if (g.duel) return;
  const e = g.ents.find((E) => E.id === entId);
  if (!e || e.dead) return;
  const p = g.p;
  const stakeGold = Math.min(150, Math.max(30, Math.round(p.gold * 0.1)));
  const stakeItem = p.inv.length ? p.inv[Math.floor(Math.random() * p.inv.length)].id : "madeira";
  const scale = 1 + p.level * 0.18;
  g.duel = {
    oppId: e.id, oppName: e.name || e.mobId || "Desafiante",
    oppHp: Math.round((80 + p.level * 22) * scale), oppMaxHp: Math.round((80 + p.level * 22) * scale),
    oppAtk: Math.round((12 + p.level * 2.2) * scale), oppDef: Math.round(4 + p.level), oppSpd: 1.35,
    oppX: e.x, oppY: e.y, oppFace: 0, oppCd: 0,
    phase: "count", t: 2400, result: "", stakeGold, stakeItem,
    cx: (p.x + e.x) / 2, cy: (p.y + e.y) / 2,
  };
  e.dead = true; // sai do mundo comum durante o duelo
  pushEvent(g, `DUELO 1v1 contra ${g.duel.oppName}! Aposta: ${stakeGold} ouro + item`, "⚔️", "info");
  logEvent(g, "duel_start", `Contra ${g.duel.oppName}`, 1);
}
function endDuel(g: GameState, result: "win" | "lose") {
  const d = g.duel;
  if (!d || d.phase === "end") return;
  d.phase = "end"; d.result = result;
  const p = g.p;
  if (result === "win") {
    p.gold += d.stakeGold;
    addItem(p.inv, d.stakeItem, 1);
    p.trofeus += 8;
    p.quest.duel += 1;
    bumpChallenge(g, "duel", 1);
    gainXp(g, 60 + p.level * 8);
    pushEvent(g, `VITÓRIA! Ganhaste ${d.stakeGold} ouro + ${ITEMS[d.stakeItem]?.name || "item"} +8 🏆`, "🏆", "epic");
    logEvent(g, "duel_win", `Venceu ${d.oppName}`, 1);
  } else {
    p.gold = Math.max(0, p.gold - d.stakeGold);
    pushEvent(g, `Derrota no duelo… -${d.stakeGold} ouro. Treina e volta!`, "💀", "bad");
    logEvent(g, "duel_lose", `Perdeu contra ${d.oppName}`, 1);
  }
}
export function closeDuel(g: GameState) {
  if (g.duel && g.duel.phase === "end") g.duel = null;
}

// ─── Interações ──────────────────────────────────────────────
export function computeInteract(g: GameState) {
  const p = g.p;
  let best: GameState["interact"] = null;
  let bestD = 2.2;
  const consider = (d: number, kind: string, label: string, sub?: string, data?: any) => {
    if (d < bestD) { bestD = d; best = { kind, label, sub, data }; }
  };
  // NPCs
  for (const e of g.ents) {
    if (e.kind !== "npc" || e.dead) continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (e.role === "mercador") consider(d, "mercador", "Falar com Mercador", "compra e vende loot");
    else if (e.role === "ferreiro") consider(d, "ferreiro", "Falar com Ferreiro", "melhora equipamento");
    else if (e.role === "banco") consider(d, "banco", "Banco de Pontos", "troca troféus por moeda real");
    else if (e.role === "auctioneer") consider(d, "leilao", "Leilão da Feira", "bens reais em leilão");
  }
  // tabuleta de desafios
  for (const v of VILLAGES) {
    const d = dist(p.x, p.y, v.board.x + 0.5, v.board.y + 0.5);
    if (d < 6) consider(d * 0.6, "board", "Quadro de Desafios", "empresas têm missões para ti");
  }
  // desafiar heróis (sombras) para duelo 1v1
  for (const e of g.ents) {
    if (e.kind !== "shadow" || e.dead) continue;
    const d = dist(p.x, p.y, e.x, e.y);
    consider(d, "duelar", `Desafiar ${e.name || "Herói"}`, "duelo 1v1 com aposta", { id: e.id });
  }
  // baús: próprio vs shadow
  for (const [k, part] of g.structures) {
    if (part.kind !== "bau") continue;
    const d = dist(p.x, p.y, part.x + 0.5, part.y + 0.5);
    consider(d, "meuBau", "O teu Baú", "guarda itens valiosos", { key: k });
  }
  for (const b of shadowBasesAround(p.x, p.y, 4)) {
    const d = dist(p.x, p.y, b.x + 0.5, b.y + 0.5);
    consider(d, "roubar", `Roubar baú de ${b.owner}`, `proteção ${b.prot}/3 — cuidado com o alarme`, { key: b.key });
  }
  // plantações prontas
  for (const [, part] of g.structures) {
    if (part.kind !== "plantacao" || !part.ready) continue;
    const d = dist(p.x, p.y, part.x + 0.5, part.y + 0.5);
    consider(d, "colher", "Colher plantação", "manga e fibra crescidas", { key: `${part.x},${part.y}` });
  }
  // marcos
  const lm = landmarkNear(p.x, p.y, 5);
  if (lm && !p.discoveries.includes(lm.id)) consider(0.5, "marco", `Descobrir: ${lm.name}`, lm.lore, { id: lm.id });
  // portal do herói (praça) — vai para o hub da plataforma
  const dHub = dist(p.x, p.y, 2.5, -12.5);
  consider(dHub * 0.9, "portalHub", "Portal da Plataforma", "jogos, sorteios e leilões");
  g.interact = best;
}

export function doInteract(g: GameState) {
  const it = g.interact;
  if (!it) return;
  const p = g.p;
  switch (it.kind) {
    case "mercador": {
      // vende metade do que não é cupão
      let total = 0;
      for (let i = p.inv.length - 1; i >= 0; i--) {
        const def = ITEMS[p.inv[i].id];
        if (def && def.kind === "material") { total += Math.max(2, Math.round((def.value || 5) * 0.5)) * p.inv[i].qty; p.inv.splice(i, 1); }
      }
      if (total > 0) { p.gold += total; pushEvent(g, `Mercador pagou ${total} ouro pelos materiais!`, "💰", "good"); logEvent(g, "sell", "Vendeu materiais", total); }
      else pushEvent(g, "Mercador: «Traz-me madeira, pedra e fibra que eu compro tudo!»", "🧑‍🌾", "info");
      break;
    }
    case "ferreiro": {
      const best = ["paos", "cutelo", "arco", "catana", "fulgor", "coroa_l"].find((id) => p.inv.find((i) => i.id === id));
      if (best && p.gold >= 60) {
        p.gold -= 60;
        const def = ITEMS[best];
        if (def.atk) ITEMS[best].atk = Math.round(def.atk * 1.15);
        pushEvent(g, `Ferreio melhorou ${def.name} (+15% ataque) por 60 ouro!`, "⚒️", "good");
        recomputeStats(p);
        logEvent(g, "forge", def.name, 1);
      } else if (best) pushEvent(g, "Ferreiro: «Preciso de 60 de ouro para forjar isto!»", "⚒️", "info");
      else pushEvent(g, "Ferreiro: «Traz-me uma arma e eu mejoro-a por 60 ouro.»", "⚒️", "info");
      break;
    }
    case "banco": {
      if (p.trofeus >= 10) {
        pushEvent(g, `Banco: tens ${p.trofeus} troféus. Abre o painel de CUPÕES/BANCO para trocar por moeda real!`, "🏦", "epic");
      } else pushEvent(g, "Banco: «Volta com 10 troféus ou mais para trocares por moeda real.»", "🏦", "info");
      break;
    }
    case "leilao":
      pushEvent(g, "Leiloeiro: «Bens reais à espera de lances — abre a Feira no painel!»", "⚖️", "info");
      break;
    case "board":
      pushEvent(g, `Desafios de empresas prontos: ${g.challenges.length} missões com cupões reais!`, "📋", "epic");
      break;
    case "meuBau":
      pushEvent(g, "Baú aberto — usa o painel da BASE para guardar/tirar itens.", "📦", "info");
      break;
    case "roubar":
      startHeist(g, it.data.key);
      break;
    case "colher": {
      const part = g.structures.get(it.data.key);
      if (part) {
        part.ready = false; part.plantedAt = now();
        addItem(p.inv, "manga", 2); addItem(p.inv, "fibra", 2);
        p.quest.collect += 2; bumpChallenge(g, "collect", 2);
        addFloat(g, part.x + 0.5, part.y, "+2 🥭 +2 🌿", "#4ade80", 14);
        logEvent(g, "harvest", "Colheita na plantação", 2);
      }
      break;
    }
    case "marco": {
      const lm = LANDMARKS.find((L) => L.id === it.data.id);
      if (lm && !p.discoveries.includes(lm.id)) {
        p.discoveries.push(lm.id);
        p.trofeus += 3;
        p.quest.visit += 1;
        bumpChallenge(g, "visit", 1);
        gainXp(g, lm.reward);
        pushEvent(g, `DESCOBERTA: ${lm.name}! +${lm.reward} XP +3 🏆`, lm.emoji, "epic");
        logEvent(g, "discover", lm.name, 1);
      }
      break;
    }
    case "portalHub":
      pushEvent(g, "Portal aberto — o hub da plataforma fica a um clique (botão 🎮 no HUD).", "🌀", "info");
      break;
    case "duelar":
      startDuel(g, it.data.id);
      break;
  }
}

// ─── Log para plataforma (fila de atividades) ────────────────
const actQueue: any[] = [];
export function logEvent(g: GameState, kind: string, label: string, value: number) {
  actQueue.push({ guestId: g.p.uid, kind: "mundo_" + kind, label, value, at: new Date().toISOString() });
  if (actQueue.length > 80) actQueue.splice(0, actQueue.length - 80);
  g.activityCount += 1;
}
export function drainActivity(): any[] { return actQueue.splice(0, actQueue.length); }

export function bumpChallenge(g: GameState, kind: "kills" | "collect" | "visit" | "steal" | "duel", n: number) {
  for (const c of g.challenges) {
    if (c.objective.kind === kind) {
      (c as any).progress = Math.min(c.objective.goal, ((c as any).progress || 0) + n);
      if ((c as any).progress === c.objective.goal && !(c as any).done) {
        (c as any).done = true;
        pushEvent(g, `DESAFIO COMPLETO: ${c.title} — reclama o cupão!`, "📋", "epic");
      }
    }
  }
}

// ─── Spawns ──────────────────────────────────────────────────
function spawnMob(g: GameState, mobId: string, x: number, y: number, tier = 1): Ent {
  const d = MOBS[mobId];
  const scale = 1 + (g.p.level - 1) * 0.09 + (tier - 1) * 0.25;
  return {
    id: "e" + g.entSerial++, kind: "mob", mobId,
    x, y, vx: 0, vy: 0, face: Math.random() * Math.PI * 2,
    hp: Math.round(d.hp * scale), maxHp: Math.round(d.hp * scale),
    atk: Math.round(d.atk * scale), def: d.def, spd: d.spd, r: d.r,
    state: "wander", target: null, wanderT: 0, cd: 0, anim: Math.random() * 1000, hitFlash: 0,
    emoji: d.emoji, color: d.color, xp: Math.round(d.xp * scale), gold: d.gold, aggro: d.aggro,
    spawnX: x, spawnY: y, tier,
  };
}
function spawnShadow(g: GameState, x: number, y: number, baseKey: string): Ent {
  const i = Math.floor(Math.random() * 900);
  const p = g.p;
  const scale = 1 + (p.level - 1) * 0.12;
  return {
    id: "e" + g.entSerial++, kind: "shadow",
    x, y, vx: 0, vy: 0, face: Math.random() * Math.PI * 2,
    hp: Math.round(70 * scale), maxHp: Math.round(70 * scale),
    atk: Math.round(12 * scale), def: 4, spd: 1.5, r: 15,
    state: "wander", target: null, wanderT: 0, cd: 0, anim: Math.random() * 1000, hitFlash: 0,
    name: "Herói " + ["Kud", "Nzo", "Mai", "Til", "Van", "Job"][i % 6] + i,
    emoji: "🧍", color: "#38bdf8", xp: 40, gold: [10, 25], aggro: 0,
    spawnX: x, spawnY: y, baseKey,
  };
}
function spawnGuard(g: GameState, x: number, y: number): Ent {
  const p = g.p;
  const scale = 1 + (p.level - 1) * 0.1 + p.heat * 0.004;
  return {
    id: "e" + g.entSerial++, kind: "guarda",
    x, y, vx: 0, vy: 0, face: 0,
    hp: Math.round(90 * scale), maxHp: Math.round(90 * scale),
    atk: Math.round(15 * scale), def: 7, spd: 1.9, r: 15,
    state: "aggro", target: { x: g.p.x, y: g.p.y }, wanderT: 0, cd: 0, anim: 0, hitFlash: 0,
    name: "Guarda do Mundo", emoji: "👮", color: "#2563eb", xp: 25, gold: [0, 0], aggro: 900,
    spawnX: x, spawnY: y,
  };
}
function spawnNPC(g: GameState, role: string, x: number, y: number, name: string): Ent {
  return {
    id: "e" + g.entSerial++, kind: "npc", role,
    x: x + 0.5, y: y + 0.5, vx: 0, vy: 0, face: Math.PI / 2,
    hp: 50, maxHp: 50, atk: 0, def: 0, spd: 0, r: 14,
    state: "idle", target: null, wanderT: 0, cd: 0, anim: Math.random() * 1000, hitFlash: 0,
    name, emoji: role === "mercador" ? "🧑‍🌾" : role === "ferreiro" ? "👨‍🏭" : role === "banco" ? "🏦" : "⚖️",
    color: "#f59e0b", xp: 0, gold: [0, 0], aggro: 0,
    spawnX: x, spawnY: y,
  };
}
function spawnBoss(g: GameState, villainId: string): Ent | null {
  const v = VILLAINS.find((V) => V.id === villainId);
  const arena = v && villainArena(v.region);
  if (!v || !arena) return null;
  const p = g.p;
  const scale = 1 + (p.level - 1) * 0.08 + (p.saga.defeated[v.id] || 0) * 0.15;
  return {
    id: "e" + g.entSerial++, kind: "boss", villain: v.id,
    x: arena.x + 0.5, y: arena.y + 0.5, vx: 0, vy: 0, face: Math.PI,
    hp: Math.round(v.hp * scale), maxHp: Math.round(v.hp * scale),
    atk: Math.round(v.atk * scale), def: v.def, spd: v.spd, r: 24,
    state: "aggro", target: { x: p.x, y: p.y }, wanderT: 0, cd: 0, anim: 0, hitFlash: 0,
    name: v.name, emoji: v.emoji, color: v.color, xp: v.xp, gold: v.gold, aggro: 300,
    spawnX: arena.x, spawnY: arena.y, telegraph: 0,
  };
}

// ─── Tick principal ──────────────────────────────────────────
export function tick(g: GameState, dtMs: number) {
  if (g.paused) return;
  const dt = Math.min(50, dtMs);
  const t = now();
  const p = g.p;

  g.playTimeMs += dt;
  // tempo do mundo
  g.time += dt;
  g.phase = (g.time % 360000) / 360000;
  g.night = g.phase > 0.52 && g.phase < 0.98;
  g.weatherT -= dt;
  if (g.weatherT <= 0) {
    const r = Math.random();
    g.weather = r < 0.6 ? "limpo" : r < 0.85 ? "vento" : "chuva";
    g.weatherT = 120_000 + Math.random() * 120_000;
    if (g.weather === "chuva") pushEvent(g, "Começou a chover… as pegadas contam histórias.", "🌧️", "info");
  }

  // região atual
  const reg = regionAt(p.x, p.y);
  g.regionId = reg.id; g.regionName = reg.name;

  if (p.dead) {
    if (t - p.deadT > 2600) respawnPlayer(g);
    updateFx(g, dt);
    return;
  }

  // ── movimento do jogador ──
  const st = pStats(p);
  let speed = 3.1 * st.spd * dt * 0.001;
  const sprinting = g.controls.sprint && p.energy > 2 && (g.controls.mx !== 0 || g.controls.my !== 0);
  if (sprinting) { speed *= 1.55; p.energy = Math.max(0, p.energy - dt * 0.012); }
  else p.energy = Math.min(100, p.energy + dt * 0.008);
  const ml = Math.hypot(g.controls.mx, g.controls.my);
  p.moving = ml > 0.08;
  if (p.moving) {
    const nx = g.controls.mx / Math.max(1, ml), ny = g.controls.my / Math.max(1, ml);
    moveEnt(g, p, nx * speed, ny * speed, 0.34);
    p.face = Math.atan2(ny, nx);
    p.anim += dt * (sprinting ? 0.02 : 0.013);
  } else p.anim += dt * 0.004;
  if (p.attackCd > 0) p.attackCd -= dt;
  if (p.attackAnim > 0) p.attackAnim -= dt;
  if (p.iframes > 0) p.iframes -= dt;

  // ── duelos ──
  if (g.duel) tickDuel(g, dt);

  // ── roubo em curso ──
  if (g.heist) {
    g.heist.t += dt;
    const b = shadowBasesAround(p.x, p.y, 3).find((x) => x.key === g.heist!.baseKey);
    if (!b || dist(p.x, p.y, b.x, b.y) > 3.2) cancelHeist(g);
    else if (g.heist.t >= g.heist.dur) {
      const prot = b.prot;
      const nightBonus = g.night ? 0.12 : 0;
      const hunterBonus = p.classId === 1 ? 0.1 : 0;
      const chance = clamp(0.88 - prot * 0.17 + nightBonus + hunterBonus, 0.2, 0.95);
      completeHeist(g, Math.random() < chance);
    }
  }

  // ── heat / guardas ──
  if (p.heat > 0) {
    p.heat = Math.max(0, p.heat - dt * 0.0011);
    (g as any).guardT = ((g as any).guardT || 0) - dt;
    if (p.heat > 30 && (g as any).guardT <= 0 && g.ents.filter((e) => e.kind === "guarda" && !e.dead).length < Math.floor(p.heat / 30)) {
      (g as any).guardT = 1400;
      const a = Math.random() * Math.PI * 2;
      g.ents.push(spawnGuard(g, p.x + Math.cos(a) * 10, p.y + Math.sin(a) * 10));
    }
  }

  // ── spawns ──
  g.spawnT -= dt;
  if (g.spawnT <= 0) { g.spawnT = 1400; doSpawns(g); }

  // ── entidades ──
  for (const e of g.ents) {
    if (e.dead) continue;
    e.anim += dt * 0.006;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.kind === "npc") { npcChat(e); continue; }
    if (e.kind === "mob" || e.kind === "boss") aiCombat(g, e, dt);
    else if (e.kind === "guarda") aiGuard(g, e, dt);
    else if (e.kind === "shadow") aiShadow(g, e, dt);
  }
  // limpar mortos antigos
  g.ents = g.ents.filter((e) => !(e.dead && t - (e.deadT || 0) > 1200));

  // ── projéteis ──
  for (const pr of g.projectiles) {
    pr.life -= dt;
    const PS = { flecha: 11, fogo: 8, canhao: 7, torreta: 10 };
    const sp = PS[pr.kind] || 9;
    pr.x += pr.vx * sp * dt * 0.001;
    pr.y += pr.vy * sp * dt * 0.001;
    if (pr.from === "player") {
      for (const e of g.ents) {
        if (e.dead || e.kind === "npc") continue;
        if (dist(pr.x, pr.y, e.x, e.y) < e.r / 48 + pr.r + 0.15) {
          const dmg = Math.max(2, Math.round(pr.dmg - e.def * 0.4));
          e.hp -= dmg; e.hitFlash = 180; e.state = "aggro";
          addFloat(g, e.x, e.y - 0.8, `${dmg}`, "#93c5fd", 14);
          burst(g, e.x, e.y, pr.kind === "fogo" ? "#fb923c" : "#93c5fd", 8);
          pr.life = 0;
          if (e.hp <= 0) killEnt(g, e);
          break;
        }
      }
      if (g.duel && g.duel.phase === "fight" && dist(pr.x, pr.y, g.duel.oppX, g.duel.oppY) < 0.6) {
        const dmg = Math.max(2, Math.round(pr.dmg - g.duel.oppDef * 0.4));
        g.duel.oppHp -= dmg;
        addFloat(g, g.duel.oppX, g.duel.oppY - 0.8, `${dmg}`, "#93c5fd", 14);
        pr.life = 0;
        if (g.duel.oppHp <= 0) endDuel(g, "win");
      }
    } else {
      if (dist(pr.x, pr.y, p.x, p.y) < 0.55) {
        damagePlayer(g, pr.dmg, pr.x, pr.y);
        pr.life = 0;
      }
    }
    if (pr.kind === "fogo" && Math.random() < 0.4) burst(g, pr.x, pr.y, "#fb923c", 2, 0.04);
  }
  g.projectiles = g.projectiles.filter((pr) => pr.life > 0);

  // ── torretas da base (proteção) ──
  for (const [, part] of g.structures) {
    if (part.kind !== "torreta") continue;
    part.cd = ((part as any).cd || 0) - dt;
    if (((part as any).cd || 0) <= 0) {
      for (const e of g.ents) {
        if (e.dead || e.kind === "npc" || e.kind === "guarda") continue;
        if (dist(e.x, e.y, part.x, part.y) < 5) {
          (part as any).cd = 900;
          const dd = Math.max(0.1, dist(e.x, e.y, part.x, part.y));
          g.projectiles.push({ x: part.x + 0.5, y: part.y + 0.2, vx: (e.x - part.x) / dd, vy: (e.y - part.y) / dd, kind: "torreta", dmg: 14, from: "player", life: 1200, r: 0.15 });
          break;
        }
      }
    }
  }
  // ── plantações crescem ──
  for (const [, part] of g.structures) {
    if (part.kind !== "plantacao") continue;
    if (!part.ready && t - (part.plantedAt || 0) > 90_000) { part.ready = true; }
  }

  // ── colisão com boss/arena ──
  tickBosses(g);

  // ── interações ──
  computeInteract(g);

  // ── descoberta automática de marcos ──
  const lm = landmarkNear(p.x, p.y, 4.5);
  if (lm && !p.discoveries.includes(lm.id) && !g.interact) {
    // descobre ao tocar
    p.discoveries.push(lm.id); p.trofeus += 3; p.quest.visit += 1;
    bumpChallenge(g, "visit", 1);
    gainXp(g, lm.reward);
    pushEvent(g, `DESCOBERTA: ${lm.name}! +${lm.reward} XP`, lm.emoji, "epic");
    logEvent(g, "discover", lm.name, 1);
  }

  // ── FX ──
  updateFx(g, dt);
  if (g.screenShake > 0) g.screenShake = Math.max(0, g.screenShake - dt * 0.02);

  // ── autosave ──
  g.saveT -= dt;
  if (g.saveT <= 0) { g.saveT = 6000; saveGame(g); }
}

function updateFx(g: GameState, dt: number) {
  for (const f of g.floats) { f.life -= dt; f.y += f.vy * dt * 0.033; }
  g.floats = g.floats.filter((f) => f.life > 0);
  for (const pa of g.particles) { pa.life -= dt; pa.x += pa.vx * dt * 0.033; pa.y += pa.vy * dt * 0.033; pa.vy += pa.grav * dt; }
  g.particles = g.particles.filter((pa) => pa.life > 0);
}

// ── IA ──
function aiCombat(g: GameState, e: Ent, dt: number) {
  const p = g.p;
  const d = dist(p.x, p.y, e.x, e.y);
  if (e.kind === "mob" && e.state !== "aggro" && d < e.aggro / 48) e.state = "aggro";
  if (e.state === "aggro" && d > (e.aggro / 48) * 2.2 && e.kind === "mob") { e.state = "wander"; e.target = null; }
  if (e.state === "wander") {
    e.wanderT -= dt;
    if (e.wanderT <= 0) {
      e.wanderT = 1200 + Math.random() * 2200;
      const a = Math.random() * Math.PI * 2;
      e.target = { x: e.spawnX + Math.cos(a) * 3.5, y: e.spawnY + Math.sin(a) * 3.5 };
    }
    if (e.target) {
      const td = dist(e.x, e.y, e.target.x, e.target.y);
      if (td > 0.3) {
        const s = e.spd * 1.4 * dt * 0.001;
        const dx = (e.target.x - e.x) / td * s, dy = (e.target.y - e.y) / td * s;
        moveEnt(g, e, dx, dy, e.r / 48 * 0.7);
        e.face = Math.atan2(dy, dx);
      }
    }
  } else if (e.state === "aggro") {
    e.cd -= dt;
    // telegraph de boss
    if (e.kind === "boss") {
      if ((e.telegraph || 0) > 0) {
        e.telegraph -= dt;
        if ((e.telegraph || 0) <= 0) {
          // AoE slam
          if (d < 4.5) damagePlayer(g, Math.round(e.atk * 1.6), e.x, e.y);
          burst(g, e.x, e.y, e.color, 26, 0.2);
          g.screenShake = 7;
        }
        return;
      }
      if (e.cd <= 0 && Math.random() < 0.45) { e.telegraph = 900; e.cd = 4200; return; }
      // canhão do almirante
      if (e.villain === "almir" && e.cd <= 0 && d > 3) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        g.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(a), vy: Math.sin(a), kind: "canhao", dmg: Math.round(e.atk * 1.2), from: "ent", life: 2200, r: 0.3 });
        e.cd = 2600;
      }
    }
    if (d > 1.1) {
      const s = e.spd * 1.5 * dt * 0.001;
      const dx = (p.x - e.x) / d * s, dy = (p.y - e.y) / d * s;
      moveEnt(g, e, dx, dy, e.r / 48 * 0.7);
      e.face = Math.atan2(dy, dx);
    } else if (e.cd <= 0) {
      e.cd = e.kind === "boss" ? 1300 : 900;
      damagePlayer(g, Math.round(e.atk * (0.85 + Math.random() * 0.4)), e.x, e.y);
    }
    if (e.kind === "mob" && e.hp < e.maxHp * 0.2 && Math.random() < 0.01) e.state = "flee";
  } else if (e.state === "flee") {
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    moveEnt(g, e, Math.cos(a) * e.spd * 1.6 * dt * 0.001, Math.sin(a) * e.spd * 1.6 * dt * 0.001, e.r / 48 * 0.7);
    if (d > 9) { e.state = "wander"; }
  }
}
function aiGuard(g: GameState, e: Ent, dt: number) {
  const p = g.p;
  const d = dist(p.x, p.y, e.x, e.y);
  if (p.heat < 12) { e.dead = true; e.deadT = now(); return; }
  e.cd -= dt;
  if (d > 1.1) {
    const s = e.spd * 1.65 * dt * 0.001;
    moveEnt(g, e, (p.x - e.x) / d * s, (p.y - e.y) / d * s, e.r / 48 * 0.7);
    e.face = Math.atan2(p.y - e.y, p.x - e.x);
  } else if (e.cd <= 0) {
    e.cd = 1000;
    damagePlayer(g, Math.round(e.atk * (0.8 + Math.random() * 0.4)), e.x, e.y);
    if (p.hp < p.maxHp * 0.35) {
      // multa: prende e liberta
      const fine = Math.min(200, Math.round(p.gold * 0.25));
      p.gold -= fine; p.heat = 0;
      pushEvent(g, `Apanhado pelos guardas! Multa de ${fine} ouro. Comporta-te…`, "👮", "bad");
      logEvent(g, "busted", "Multa paga", fine);
      e.dead = true; e.deadT = now();
    }
  }
}
function aiShadow(g: GameState, e: Ent, dt: number) {
  e.wanderT -= dt;
  if (e.wanderT <= 0) {
    e.wanderT = 1500 + Math.random() * 2600;
    const a = Math.random() * Math.PI * 2;
    const home = e.baseKey ? shadowBaseAt(e.spawnX, e.spawnY) : null;
    const hx = home ? home.x : e.spawnX, hy = home ? home.y : e.spawnY;
    e.target = { x: hx + Math.cos(a) * 4, y: hy + Math.sin(a) * 4 };
  }
  if (e.target) {
    const td = dist(e.x, e.y, e.target.x, e.target.y);
    if (td > 0.3) {
      const s = e.spd * 1.3 * dt * 0.001;
      moveEnt(g, e, (e.target.x - e.x) / td * s, (e.target.y - e.y) / td * s, e.r / 48 * 0.7);
      e.face = Math.atan2(e.target.y - e.y, e.target.x - e.x);
    }
  }
  if (Math.random() < 0.002) {
    e.chat = ["Boa tarde!", "Ouvi dizer que há vilões na savana…", "Cuidado com roubos à noite!", "Esta terra é minha!", "Já visitaste a Feira?", "Bateu, parceiro?"][Math.floor(Math.random() * 6)];
    e.chatUntil = now() + 3200;
  }
}
function npcChat(e: Ent) {
  if (e.chatUntil && e.chatUntil < now()) e.chat = undefined;
  if (!e.chat && Math.random() < 0.0015) {
    const lines: Record<string, string[]> = {
      mercador: ["Compro madeira, pedra e fibra!", "Bons preços, herói!"],
      ferreiro: ["Trás armas, eu faço milagres.", "Forja quente hoje!"],
      banco: ["Troféus valem dinheiro real!", "O banco do povo."],
      auctioneer: ["Bens reais a leilão!", "Lance alto, ganha grande!"],
    };
    const arr = lines[e.role || "mercador"] || ["Bom dia!"];
    e.chat = arr[Math.floor(Math.random() * arr.length)];
    e.chatUntil = now() + 3500;
  }
}

function doSpawns(g: GameState) {
  const p = g.p;
  const night = g.night;
  const capMob = 26;
  const mobs = g.ents.filter((e) => e.kind === "mob" && !e.dead).length;
  if (mobs < capMob) {
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 13 + Math.random() * 11;
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      const id = mobSpawnAt(Math.floor(x), Math.floor(y), night);
      if (id) {
        const tier = Math.random() < 0.12 ? 2 : 1;
        g.ents.push(spawnMob(g, id, x, y, tier));
        break;
      }
    }
  }
  // sombras (heróis) — perto de bases e ao acaso
  const shadows = g.ents.filter((e) => e.kind === "shadow" && !e.dead).length;
  if (shadows < 7 && Math.random() < 0.5) {
    const bases = shadowBasesAround(p.x, p.y, 22);
    if (bases.length) {
      const b = bases[Math.floor(Math.random() * bases.length)];
      const ex = b.x + (Math.random() - 0.5) * 6, ey = b.y + (Math.random() - 0.5) * 6;
      if (!g.ents.some((E) => E.kind === "shadow" && E.baseKey === b.key && !E.dead)) g.ents.push(spawnShadow(g, ex, ey, b.key));
    }
  }
  // NPCs das vilas próximas
  for (const v of VILLAGES) {
    const d = dist(p.x, p.y, v.x, v.y);
    if (d < 34 && !g.ents.some((E) => E.kind === "npc" && E.spawnX === v.market.x && E.spawnY === v.market.y && !E.dead)) {
      g.ents.push(spawnNPC(g, "mercador", v.market.x, v.market.y, "Mercador " + v.name.split(" ").slice(-1)));
      g.ents.push(spawnNPC(g, "ferreiro", v.market.x + 1.5, v.market.y + 1, "Ferreiro"));
      g.ents.push(spawnNPC(g, "auctioneer", v.board.x - 1, v.board.y + 1, "Leiloeiro"));
      if (v.bank) g.ents.push(spawnNPC(g, "banco", v.bank.x, v.bank.y, "Banco Bateu"));
    }
  }
}

function tickBosses(g: GameState) {
  const p = g.p;
  for (const v of VILLAINS) {
    const arena = villainArena(v.region);
    if (!arena) continue;
    const d = dist(p.x, p.y, arena.x, arena.y);
    const alive = g.ents.some((E) => E.kind === "boss" && E.villain === v.id && !E.dead);
    if (d < 18 && !alive && g.bossActive !== v.id) {
      const b = spawnBoss(g, v.id);
      if (b) {
        g.ents.push(b);
        g.bossActive = v.id;
        pushEvent(g, `${v.emoji} ${v.name} DESPERTOU! «${v.lore}»`, v.emoji, "epic");
        g.screenShake = 8;
      }
    } else if (d > 26 && alive) {
      const e = g.ents.find((E) => E.kind === "boss" && E.villain === v.id && !E.dead);
      if (e) { e.dead = true; e.deadT = now(); }
      if (g.bossActive === v.id) g.bossActive = null;
    }
  }
}

function tickDuel(g: GameState, dt: number) {
  const d = g.duel!;
  const p = g.p;
  d.t -= dt;
  if (d.phase === "count") {
    if (d.t <= 0) { d.phase = "fight"; d.t = 0; pushEvent(g, "LUTEM!", "⚔️", "epic"); }
    return;
  }
  if (d.phase === "fight") {
    d.oppCd -= dt;
    const dd = dist(p.x, p.y, d.oppX, d.oppY);
    if (dd > 1.1) {
      const s = d.oppSpd * 1.6 * dt * 0.001;
      d.oppX += (p.x - d.oppX) / dd * s;
      d.oppY += (p.y - d.oppY) / dd * s;
    } else if (d.oppCd <= 0) {
      d.oppCd = 950;
      damagePlayer(g, Math.round(d.oppAtk * (0.85 + Math.random() * 0.4)), d.oppX, d.oppY);
    }
    d.oppFace = Math.atan2(p.y - d.oppY, p.x - d.oppX);
  }
}

// ─── Desafios de empresas: aplicar dados da plataforma ───────
export function applyPlatform(g: GameState, data: any, challenges: CompanyChallenge[]) {
  g.platform = data;
  g.challenges = challenges;
  g.online = data?.online || 1;
  const acts = (data?.activityCount ?? 0);
  g.activityCount = acts;
  const prev = g.expansion;
  g.expansion = expansionLevel(g.online, acts);
  if (g.expansion > prev) {
    pushEvent(g, `O MUNDO CRESCERU! ${g.expansion} territórios desbloqueados — explora o desconhecido!`, "🌍", "epic");
  }
}

export function claimChallenge(g: GameState, id: string): boolean {
  const c = g.challenges.find((C) => C.id === id);
  if (!c || !(c as any).done || (c as any).claimed) return false;
  (c as any).claimed = true;
  const p = g.p;
  p.trofeus += c.reward.trofeus;
  if (c.reward.cupao) {
    addItem(p.inv, "cupao_mundo", 1);
    (p as any).pendingVouchers = (p as any).pendingVouchers || [];
    (p as any).pendingVouchers.push(c.reward.cupao);
    pushEvent(g, `CUPÃO REAL GANHO: ${c.reward.cupao.code} (${c.reward.cupao.label})!`, "🎟️", "epic");
  } else {
    pushEvent(g, `Desafio concluído: +${c.reward.trofeus} troféus!`, "🏆", "good");
  }
  logEvent(g, "company_challenge", c.title, 1);
  return true;
}
