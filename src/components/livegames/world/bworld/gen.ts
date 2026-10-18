// ============================================================
// MUNDO BATEU — Geração procedural determinística · v1
// O mundo é ENORME e cresce com a plataforma: regiões
// desbloqueiam conforme utilizadores entram e empresas
// colocam desafios. Tudo determinístico por seed — cada
// utilizador vê o mesmo mundo, sem servidor de terreno.
// ============================================================

import {
  BIOMES, LANDMARKS, REGIONS, REGION_RADIUS, T, TILE,
  type BiomeId, type Tile, type VaultItem,
} from "./types";

// ─── Hash / ruído determinístico ─────────────────────────────
export function hash2(x: number, y: number, seed = 1337): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177) | 0;
  h = (h ^ (h >> 16)) | 0;
  return (h >>> 0) / 4294967295;
}
export function noise2(x: number, y: number, seed = 9001): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, seed: number): number {
  return noise2(x * 0.06, y * 0.06, seed) * 0.6 + noise2(x * 0.15, y * 0.15, seed + 7) * 0.3 + noise2(x * 0.4, y * 0.4, seed + 13) * 0.1;
}

// ─── Nomes de heróis (bases para roubar) ─────────────────────
const FIRST = ["Kud", "Nzol", "Bak", "Mal", "Job", "Zec", "Til", "Van", "Kim", "Pap", "Mac", "Ru", "Djo", "Lad", "Bat"];
const LAST = ["a", "indo", "uta", "ando", "eta", "ança", "ibo", "anga", "indo", "uela", "issa", "anga", "ito", "ueno", "olo"];
export function heroName(i: number): string { return FIRST[i % FIRST.length] + LAST[(i * 7 + 3) % LAST.length]; }

// ─── Vilas: posições determinísticas por região ──────────────
export interface Village {
  id: string; name: string; x: number; y: number; region: string;
  board: { x: number; y: number };     // tabuleta de desafios de empresas
  market: { x: number; y: number };    // mercador
  bank: { x: number; y: number } | null; // só no musseque
  houses: { x: number; y: number }[];  // cantos de casas (footprint 5x4)
}
export const VILLAGES: Village[] = (() => {
  const out: Village[] = [];
  for (const r of REGIONS) {
    const n = r.id === "musseque" ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const ox = (hash2(r.cx + i, r.cy, 55) - 0.5) * 60;
      const oy = (hash2(r.cx, r.cy + i, 77) - 0.5) * 60;
      const x = Math.round(r.cx + ox), y = Math.round(r.cy + oy);
      out.push({
        id: `v_${r.id}_${i}`, name: r.id === "musseque" ? (i === 0 ? "Vila Central" : "Bairro Kudissanga") : `Vila ${r.name.split(" ").slice(-1)[0]}${i ? " II" : ""}`,
        x, y, region: r.id,
        board: { x: x + 5, y: y - 4 },
        market: { x: x - 5, y: y - 3 },
        bank: r.id === "musseque" && i === 0 ? { x: x - 12, y: y + 2 } : null,
        houses: [0, 1, 2, 3].map((h) => ({ x: x + [-9, 8, -8, 9][h], y: y + [-8, -7, 6, 7][h] })),
      });
    }
  }
  return out;
})();

// ─── Região / bioma num ponto ────────────────────────────────
export function regionAt(x: number, y: number): { id: string; biome: BiomeId; name: string; unlocked: boolean } {
  let best = null as null | { id: string; biome: BiomeId; name: string; unlockAt: number; d: number };
  for (const r of REGIONS) {
    const d = Math.hypot(x - r.cx, y - r.cy);
    if (d < REGION_RADIUS && (!best || d < best.d)) best = { id: r.id, biome: r.biome, name: r.name, unlockAt: r.unlockAt, d };
  }
  if (best) return { id: best.id, biome: best.biome, name: best.name, unlocked: true };
  // território selvagem entre regiões
  const fx = x >= 0 ? "Leste" : "Oeste", fy = y >= 0 ? "Sul" : "Norte";
  return { id: "oc", biome: "oc", name: `Território Selvagem (${fy}-${fx})`, unlocked: true };
}

export function biomeAt(x: number, y: number): BiomeId { return regionAt(x, y).biome; }

// ─── Rios (Kwanza) e estradas ────────────────────────────────
export function riverX(y: number): number {
  return Math.round(Math.sin(y * 0.025) * 26 + (noise2(0.5, y * 0.05, 4242) - 0.5) * 30 + 60);
}
export function isRiver(x: number, y: number): boolean {
  const rx = riverX(y);
  return x === rx || x === rx - 1;
}
function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
const ROAD_PTS: [number, number][] = (() => {
  const pts: [number, number][] = [];
  for (const v of VILLAGES) pts.push([v.x, v.y]);
  return pts;
})();
export function isRoad(x: number, y: number): boolean {
  for (let i = 0; i < ROAD_PTS.length; i++) {
    const a = ROAD_PTS[i];
    // cada vila liga ao centro (0,0) e à vila anterior
    const b = i === 0 ? [0, -14] : ROAD_PTS[i - 1];
    if (distSeg(x, y, a[0], a[1], b[0], b[1]) < 1.6) return true;
  }
  return false;
}

// ─── Casas das vilas (footprints sólidos com porta) ──────────
export interface HouseFoot { x: number; y: number; w: number; h: number; doorX: number; doorY: number; }
export function houseFoots(): HouseFoot[] {
  const out: HouseFoot[] = [];
  for (const v of VILLAGES) {
    for (const h of v.houses) {
      out.push({ x: h.x - 2, y: h.y - 2, w: 5, h: 4, doorX: h.x, doorY: h.y + 1 });
    }
  }
  return out;
}
const HOUSES = houseFoots();
function inHouse(x: number, y: number): "wall" | "door" | "floor" | null {
  for (const h of HOUSES) {
    if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) {
      const border = x === h.x || x === h.x + h.w - 1 || y === h.y || y === h.y + h.h - 1;
      if (x === h.doorX && y === h.doorY) return "door";
      if (border) return "wall";
      return "floor";
    }
  }
  return null;
}

// ─── Bases de sombra (heróis simulados — para ROUBAR) ────────
export interface ShadowBase {
  key: string; owner: string; x: number; y: number; prot: number; // 0..3
  vault: VaultItem[]; gold: number; tier: number; alarmR: number;
}
const VAULT_POOL = ["manga", "madeira", "pedra", "fibra", "pele", "funge", "cutelo", "couraca", "conta", "catana", "ferro", "buzio", "cristal", "elixir", "cupao_mundo"];
export function shadowBaseAt(gx: number, gy: number): ShadowBase | null {
  // grelha de células 26x26 tiles; ~18% têm base
  const cell = 26;
  const cx = Math.floor(gx / cell), cy = Math.floor(gy / cell);
  const r = hash2(cx, cy, 31337);
  if (r > 0.18) return null;
  const bx = cx * cell + Math.floor(hash2(cx, cy, 777) * 12) + 4;
  const by = cy * cell + Math.floor(hash2(cy, cx, 888) * 12) + 4;
  if (Math.abs(gx - bx) > 4 || Math.abs(gy - by) > 4) return null;
  const seed = Math.floor(hash2(bx, by, 999) * 1e6);
  const owner = heroName(Math.abs(seed) % 900);
  const tier = 1 + Math.floor(hash2(bx, by, 111) * 3); // 1..3
  const prot = Math.min(3, tier + (hash2(bx, by, 222) > 0.6 ? 1 : 0));
  const nItems = 2 + tier * 2;
  const vault: VaultItem[] = [];
  for (let i = 0; i < nItems; i++) {
    const id = VAULT_POOL[Math.floor(hash2(bx * 3 + i, by, 555) * VAULT_POOL.length)];
    const ex = vault.find((v) => v.id === id);
    if (ex) ex.qty += 1; else vault.push({ id, qty: 1 });
  }
  return {
    key: `${bx},${by}`, owner, x: bx, y: by, prot, vault, tier,
    gold: Math.round((40 + hash2(bx, by, 333) * 160) * tier),
    alarmR: 4 + prot * 1.2,
  };
}

// ─── Tile final (com estruturas) ─────────────────────────────
export function tileAt(x: number, y: number, expansion: number): Tile {
  const b = biomeAt(x, y);
  let t: Tile = BIOMES[b].ground;
  // variação natural
  const n = fbm(x, y, 51);
  if (b === "savana" && n > 0.62) t = T.DIRT;
  if (b === "costa") { t = n > 0.55 ? T.GRASS : T.SAND; }
  if (b === "leba") { t = n > 0.6 ? T.ROCK : (n > 0.4 ? T.GRASS : T.DIRT); }
  if (b === "maiombe") { t = n > 0.75 ? T.DIRT : T.FOREST; }
  if (b === "namibe") { t = n > 0.65 ? T.SAND : T.DESERT; }
  if (b === "musseque") { t = n > 0.7 ? T.DIRT : T.CITY; }
  if (b === "lunda") { t = n > 0.55 ? T.ROCK : T.DIRT; }
  // oceano: sul do mundo + manchas de ruído
  if (y > 250) t = T.OCEAN;
  if (y > 235 && n < 0.3) t = T.OCEAN;
  if (x < -280 || x > 280 || y < -280) t = t === T.OCEAN ? T.OCEAN : T.MIST;
  // rio Kwanza
  if (isRiver(x, y) && t !== T.OCEAN && t !== T.MIST) t = T.RIVER;
  // estradas
  if (t !== T.OCEAN && t !== T.MIST && isRoad(x, y)) t = isRiver(x - 2, y) ? T.BRIDGE : T.ROAD;
  // vilas: praça + casas
  for (const v of VILLAGES) {
    if (Math.abs(x - v.x) <= 3 && Math.abs(y - v.y) <= 3) { t = T.PLAZA; }
    else if (Math.abs(x - v.x) <= 4 && Math.abs(y - v.y) <= 4 && t !== T.OCEAN) { t = T.DIRT; }
  }
  const h = inHouse(x, y);
  if (h === "wall") t = T.WALL;
  else if (h === "door") t = T.DOOR;
  else if (h === "floor") t = T.WOODFLOOR;
  // neblina do desconhecido — o mundo CRESCE com a plataforma
  const frontier = 170 + expansion * 40;
  if (Math.hypot(x, y) > frontier && t !== T.OCEAN) t = T.MIST;
  return t;
}

// ─── Árvores / recursos por tile ─────────────────────────────
export type PropKind = "arvore" | "palmeira" | "cacto" | "rocha" | "touca" | "flor" | "capim";
export function propAt(x: number, y: number): PropKind | null {
  const t = tileAt(x, y, 9);
  if (t === T.OCEAN || t === T.RIVER || t === T.WALL || t === T.WOODFLOOR || t === T.PLAZA || t === T.MIST || t === T.ROAD || t === T.DOOR) return null;
  const b = biomeAt(x, y);
  const bi = BIOMES[b];
  const r = hash2(x, y, 4242);
  // casas/vilas/bases limpas
  if (inHouse(x, y)) return null;
  const sb = shadowBaseAt(x, y);
  if (sb && Math.abs(x - sb.x) <= 4 && Math.abs(y - sb.y) <= 4) return null;
  for (const v of VILLAGES) { if (Math.abs(x - v.x) <= 5 && Math.abs(y - v.y) <= 5) return null; }
  const r2 = hash2(x, y, 4243);
  if (r2 < bi.trees) return b === "costa" ? "palmeira" : "arvore";
  if (r2 < bi.trees + bi.cacti) return "cacto";
  if (r2 < bi.trees + bi.cacti + bi.rocks) return "rocha";
  if (r < bi.grassTuft * 0.6) return "touca";
  if (r < bi.grassTuft) return (b === "maiombe" || b === "savana") ? "flor" : "capim";
  return null;
}

// ─── Marcos: teste de proximidade ────────────────────────────
export function landmarkNear(x: number, y: number, r = 6): (typeof LANDMARKS)[number] | null {
  for (const l of LANDMARKS) { if (Math.hypot(x - l.x, y - l.y) <= r) return l; }
  return null;
}

// ─── Arenas de vilões: centro por região ─────────────────────
export function villainArena(region: string): { x: number; y: number } | null {
  const r = REGIONS.find((R) => R.id === region);
  if (!r) return null;
  return { x: r.cx + 22, y: r.cy + 18 };
}

// ─── Bases de sombra próximas (spawner/roubo) ────────────────
export function shadowBasesAround(x: number, y: number, radius: number): ShadowBase[] {
  const cell = 26;
  const out: ShadowBase[] = [];
  const c0x = Math.floor((x - radius) / cell), c1x = Math.floor((x + radius) / cell);
  const c0y = Math.floor((y - radius) / cell), c1y = Math.floor((y + radius) / cell);
  for (let cx = c0x; cx <= c1x; cx++) {
    for (let cy = c0y; cy <= c1y; cy++) {
      const b = shadowBaseAt(cx * cell + 8, cy * cell + 8);
      if (b && Math.hypot(b.x - x, b.y - y) <= radius) out.push(b);
    }
  }
  return out;
}

// ─── Nível de expansão (o mundo CRESCE com a plataforma) ─────
// f(online, atividade registada, época) — sem base, cresce por tempo/época
export function expansionLevel(online: number, activityCount: number): number {
  const base = 1
    + (online >= 10 ? 1 : 0) + (online >= 30 ? 1 : 0) + (online >= 80 ? 1 : 0)
    + (activityCount >= 50 ? 1 : 0) + (activityCount >= 200 ? 1 : 0) + (activityCount >= 600 ? 1 : 0)
    + (activityCount >= 1500 ? 1 : 0);
  return Math.min(8, base);
}
export function unlockedRegions(expansion: number): typeof REGIONS {
  return REGIONS.filter((r) => r.unlockAt <= expansion);
}

// ─── Spawn de mobs por tile (determinístico + vivo) ──────────
export function mobSpawnAt(x: number, y: number, night: boolean): string | null {
  const t = tileAt(x, y, 9);
  if (t === T.OCEAN || t === T.RIVER || t === T.MIST || t === T.WALL || t === T.WOODFLOOR || t === T.PLAZA) return null;
  const b = biomeAt(x, y);
  const bi = BIOMES[b];
  const r = hash2(x, y, 6161);
  const density = night ? 0.02 : 0.012;
  if (r > density) return null;
  let pool = bi.mobs;
  if (night && hash2(x, y, 6162) > 0.55) pool = ["espetro"];
  return pool[Math.floor(hash2(x, y, 6163) * pool.length)];
}
