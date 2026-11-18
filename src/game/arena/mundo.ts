// ============================================================
// ARENA DAS LENDAS — MUNDO (dados determinísticos do mapa)
// ────────────────────────────────────────────────────────────
// Mapa em vista de topo inspirado em League of Legends, gerado
// a partir de DADOS PUROS (nada de voxels — o estilo Minecraft
// foi apagado): terreno suave com cores por vértice, rio em
// diagonal, lanes claras, arbustos, árvores/rochas low-poly e
// os camps partilhados (a MESMA fonte CAMPS do core.ts que o
// servidor usa — zero segunda fonte).
// Puro TS — corre no browser e no Node (testes/probe).
// ============================================================
import { CAMPS, METADE_MUNDO, POS_BASE, type Pos } from "./core.ts";

// ── Rio: banda diagonal de topo-esquerda → fundo-direita ───────
// No eixo do mapa (x, z), o rio segue a reta z = x. Distância
// perpendicular à reta decide se é água/borda/terra.
export const RIO_LARGURA = 7;         // meia-largura da água
export const RIO_BORDA = 3.5;         // faixa de areia à volta

export function distAoRio(x: number, z: number): number {
  // distância perpendicular à reta z = x: |x - z| / √2
  return Math.abs(x - z) / Math.SQRT2;
}

// ── Lanes: caminhos claros que ligam a base ao centro e ao norte ──
// Uma lane principal da base ao centro (estilo LoL single-lane co-op)
// e trilhos de selva às zonas dos chefes.
export const LANE_PONTOS: Pos[] = [
  { x: POS_BASE.x, z: POS_BASE.z },
  { x: -58, z: 58 },
  { x: -38, z: 38 },
  { x: -16, z: 16 },
  { x: 0, z: 0 },
  { x: 18, z: -18 },
  { x: 38, z: -38 },
  { x: 58, z: -58 },
];
export const LANE_LARGURA = 7;

/** Distância ao caminho da lane (polilinha simples). */
export function distAoCaminho(x: number, z: number, pontos: Pos[]): number {
  let melhor = Infinity;
  for (let i = 0; i < pontos.length - 1; i++) {
    const a = pontos[i], b = pontos[i + 1];
    const abx = b.x - a.x, abz = b.z - a.z;
    const apx = x - a.x, apz = z - a.z;
    const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / (abx * abx + abz * abz || 1)));
    const px = a.x + abx * t, pz = a.z + abz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < melhor) melhor = d;
  }
  return melhor;
}

export const LANE = LANE_PONTOS;
// Trilhos de selva para os covis dos chefes (visuais do caminho)
export const TRILHO_DRAGAO: Pos[] = [{ x: 24, z: -24 }, { x: 40, z: -40 }, { x: 56, z: -54 }, { x: 62, z: -62 }];
export const TRILHO_BARAO: Pos[] = [{ x: -24, z: -24 }, { x: -40, z: -40 }, { x: -56, z: -54 }, { x: -62, z: -62 }];

// ── Arbustos (brush, estilo LoL: patches de relva alta) ────────
export const ARBUSTOS: { x: number; z: number; r: number }[] = [
  { x: -30, z: 30, r: 5 }, { x: -44, z: 12, r: 4.5 }, { x: -12, z: 44, r: 4.5 },
  { x: 30, z: -30, r: 5 }, { x: 12, z: -44, r: 4.5 }, { x: 44, z: -12, r: 4.5 },
  { x: -58, z: 34, r: 4 }, { x: 34, z: -58, r: 4 }, { x: -34, z: -10, r: 4 },
  { x: 10, z: 34, r: 4 }, { x: 58, z: 30, r: 4 }, { x: -30, z: -58, r: 4 },
];

// ── Estruturas ─────────────────────────────────────────────────
export const TORRES: Pos[] = [
  { x: -52, z: 52 },   // torre exterior da base
  { x: -30, z: 30 },   // torre do meio da lane
  { x: -12, z: 12 },   // torre interior
];
export const POS_FONTE: Pos = POS_BASE;

// ── Ruído determinístico (sem deps — xorshift) ─────────────────
function rand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

// ── Árvores e rochas (evitando rio, lane, camps e base) ────────
export interface Decor { x: number; z: number; s: number; v: number }
function longeDeTudo(x: number, z: number): boolean {
  if (distAoRio(x, z) < RIO_LARGURA + RIO_BORDA + 2) return false;
  if (distAoCaminho(x, z, LANE) < LANE_LARGURA + 2) return false;
  if (distAoCaminho(x, z, TRILHO_DRAGAO) < 4) return false;
  if (distAoCaminho(x, z, TRILHO_BARAO) < 4) return false;
  if (Math.hypot(x - POS_BASE.x, z - POS_BASE.z) < 16) return false;
  for (const c of CAMPS) if (Math.hypot(x - c.x, z - c.z) < 10) return false;
  for (const t of TORRES) if (Math.hypot(x - t.x, z - t.z) < 6) return false;
  for (const a of ARBUSTOS) if (Math.hypot(x - a.x, z - a.z) < a.r + 2.5) return false;
  return true;
}

function gerarDecors(n: number, seed: number, escalaMin: number, escalaMax: number): Decor[] {
  const r = rand(seed);
  const out: Decor[] = [];
  let tentativas = 0;
  while (out.length < n && tentativas < n * 40) {
    tentativas++;
    const x = (r() * 2 - 1) * (METADE_MUNDO - 6);
    const z = (r() * 2 - 1) * (METADE_MUNDO - 6);
    if (!longeDeTudo(x, z)) continue;
    // espaçamento mínimo entre decors
    let perto = false;
    for (const d of out) { if ((x - d.x) * (x - d.x) + (z - d.z) * (z - d.z) < 16) { perto = true; break; } }
    if (perto) continue;
    out.push({ x, z, s: escalaMin + r() * (escalaMax - escalaMin), v: r() });
  }
  return out;
}

/** Árvores do mapa (determinísticas — o MESMO layout no cliente e no servidor de referência). */
export function arvores(): Decor[] { return gerarDecors(150, 20261118, 0.8, 1.5); }
/** Rochas do mapa. */
export function rochas(): Decor[] { return gerarDecors(46, 777001, 0.5, 1.3); }

// ── Cores do terreno (função pura — usada pelo motor 3D E pelo minimapa) ──
// Paleta suave estilo LoL/hordes.io (nada de blocos).
export type TipoTerreno = "relva" | "relvaEscura" | "lane" | "agua" | "areia" | "selva" | "base";

export function tipoTerreno(x: number, z: number): TipoTerreno {
  const dRio = distAoRio(x, z);
  if (dRio < RIO_LARGURA) return "agua";
  if (dRio < RIO_LARGURA + RIO_BORDA) return "areia";
  const dBase = Math.hypot(x - POS_BASE.x, z - POS_BASE.z);
  if (dBase < 14) return "base";
  if (distAoCaminho(x, z, LANE) < LANE_LARGURA) return "lane";
  if (distAoCaminho(x, z, TRILHO_DRAGAO) < 3 || distAoCaminho(x, z, TRILHO_BARAO) < 3) return "lane";
  // selva = longe do centro/rio, tom mais escuro com manchas determinísticas
  const mancha = Math.sin(x * 0.09 + Math.cos(z * 0.07) * 2.2) * Math.cos(z * 0.085 + Math.sin(x * 0.06) * 1.8);
  if (mancha > 0.55) return "relvaEscura";
  if (mancha < -0.62) return "selva";
  return "relva";
}

export const CORES_TERRENO: Record<TipoTerreno, [number, number, number]> = {
  relva: [0.36, 0.55, 0.27],
  relvaEscura: [0.30, 0.47, 0.24],
  lane: [0.52, 0.47, 0.33],
  agua: [0.16, 0.38, 0.55],
  areia: [0.62, 0.56, 0.38],
  selva: [0.24, 0.40, 0.22],
  base: [0.44, 0.42, 0.38],
};

/** Cor RGB [0..1] do terreno em (x,z) com variação determinística suave. */
export function corTerreno(x: number, z: number): [number, number, number] {
  const base = CORES_TERRENO[tipoTerreno(x, z)];
  const v = (Math.sin(x * 0.7) * Math.cos(z * 0.6)) * 0.022;
  return [
    Math.min(1, Math.max(0, base[0] + v)),
    Math.min(1, Math.max(0, base[1] + v)),
    Math.min(1, Math.max(0, base[2] + v)),
  ];
}
