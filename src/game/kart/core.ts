// ============================================================
// BATEU KART: CIRCUITO DAS LENDAS — NÚCLEO PURO (v65)
// ────────────────────────────────────────────────────────────
// Kart racer estilo Mario Kart, desenhado para CORRIDAS LONGAS
// (pistas ~2 km, 3-5 voltas) com progressão de garagem: cada
// piloto MELHORA o seu carro (motor, turbo, pneus, blindagem)
// e as ARMAS (casca, casca-alvo, míssil, óleo, raio).
//
// Módulo PURO (browser E Node no MESMO código, padrão da casa
// desde a v58): zero react, zero three.js, zero imports. O motor
// visual (motor.ts) e um futuro servidor de corridas online
// consomem as MESMAS funções — regra v63/v64 (servidor nunca
// escreve lógica própria). RNG determinística (mulberry32).
//
// Conteúdo: pistas Catmull-Rom fechadas · física arcade com
// DERRAPAGEM e MINI-TURBO · 8 itens com pesos por POSIÇÃO (atrás
// = armas melhores) · IA de 11 bots (v75 ELITE: ESQUIVA cascas/
// mísseis/óleo, escudo levantado NA HORA, itens com estratégia,
// desvio de trânsito para ultrapassar e reação à largada) ·
// voltas/posições/tempo por amostras · garagem (4 karts ×
// 5 melhorias × 5 níveis) · save validado · recompensas.
// ============================================================

// ── Constantes do mundo ────────────────────────────────────────
export const MAX_CORREDORES = 12;
export const VOLTAS_MIN = 3;
export const VOLTAS_MAX = 5;
export const VOLTAS_OMISSAO = 4;
export const NIVEL_MAX_MELHORIA = 5;
export const PASSO_AMOSTRA = 2.5; // u entre amostras da pista
export const COIN_BONUS_VEL = 0.35; // +vel máx por moeda (u/s)
export const COIN_BONUS_TETO = 5; // teto do bónus (≈14 moedas)
export const RAIO_CAIXA = 2.3;
export const RAIO_MOEDA = 1.7;
export const RESPAWN_CAIXA = 5; // s
export const VIDA_OLEO = 25; // s
export const PAREDE_EXTRA = 9; // u além da borda onde há barreira

// ── RNG determinística (mesma casa da arena) ───────────────────
export function rng32(semente: number): () => number {
  let a = (semente | 0) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

// ── Pistas ─────────────────────────────────────────────────────
export type TemaId = "praia" | "deserto" | "vulcao";

export interface PistaDef {
  id: string;
  nome: string;
  tema: TemaId;
  largura: number; // meia-largura da estrada (u)
  voltasSugeridas: number;
  nivelNecessario: number;
  corEstrada: number;
  corBordaA: number;
  corBordaB: number;
  corChao: number;
  corCeu: number;
  corNevoa: number;
  pontos: [number, number][]; // pontos de controlo Catmull-Rom (fechada)
}

// Praia do Bateu — pista LONGA e fluida (~2 km) com chicanes suaves.
const PRAIA: [number, number][] = [
  [-233, -186], [-93, -233], [62, -233], [202, -186], [248, -93],
  [233, 0], [264, 93], [202, 186], [93, 233], [-31, 217],
  [-93, 155], [-171, 186], [-248, 140], [-271, 47], [-233, -47],
  [-271, -109],
];

// Deserto dos Dados — técnicos: pinos apertados e retas curtas.
const DESERTO: [number, number][] = [
  [-182, -182], [-42, -210], [84, -182], [126, -84], [56, -42],
  [126, 14], [154, 112], [84, 182], [-14, 154], [-56, 210],
  [-154, 196], [-210, 112], [-154, 56], [-224, -14], [-196, -112],
];

// Vulcão Ferido — a mais LONGA, traçado aberto com curvas rápidas.
const VULCAO: [number, number][] = [
  [-272, -208], [-128, -256], [32, -240], [176, -208], [240, -112],
  [176, -32], [272, 48], [240, 160], [128, 240], [0, 192],
  [-80, 256], [-192, 208], [-272, 112], [-208, 32], [-288, -48],
  [-256, -144],
];

export const PISTAS: PistaDef[] = [
  {
    id: "praia", nome: "Praia do Bateu", tema: "praia", largura: 7, voltasSugeridas: 4,
    nivelNecessario: 1,
    corEstrada: 0xb89b6d, corBordaA: 0xd94f43, corBordaB: 0xf2f2f2, corChao: 0x3fa0c8,
    corCeu: 0x8fd7f2, corNevoa: 0xbfe8f5, pontos: PRAIA,
  },
  {
    id: "deserto", nome: "Deserto dos Dados", tema: "deserto", largura: 6.5, voltasSugeridas: 4,
    nivelNecessario: 3,
    corEstrada: 0x8f7a5c, corBordaA: 0xc23b2e, corBordaB: 0xf5efe0, corChao: 0xd8b26a,
    corCeu: 0xf2c98a, corNevoa: 0xe8cf9f, pontos: DESERTO,
  },
  {
    id: "vulcao", nome: "Vulcão Ferido", tema: "vulcao", largura: 6.5, voltasSugeridas: 5,
    nivelNecessario: 5,
    corEstrada: 0x4a4448, corBordaA: 0xff5a2a, corBordaB: 0x2c282c, corChao: 0x33262a,
    corCeu: 0x5a2a33, corNevoa: 0x6e3a3a, pontos: VULCAO,
  },
];
export const IDS_PISTAS = PISTAS.map((p) => p.id);

// v68 — ARENA DE BATALHA (Coliseu das Lendas): anel curto e LARGO para a
// Batalha de Balões. NÃO entra em PISTAS (o menu de corridas fica intacto) —
// pistaPorId também a resolve para o motor.
const COLISEU: [number, number][] = [
  [0, -96], [64, -78], [96, -26], [88, 40], [48, 84],
  [-8, 96], [-64, 80], [-94, 28], [-86, -36], [-44, -82],
];

export const ARENA_BATALHA: PistaDef = {
  id: "coliseu", nome: "Coliseu das Lendas", tema: "vulcao", largura: 11, voltasSugeridas: 1,
  nivelNecessario: 1,
  corEstrada: 0x3a3f47, corBordaA: 0xf2b632, corBordaB: 0x2c282c, corChao: 0x2a2126,
  corCeu: 0x43203a, corNevoa: 0x552d45, pontos: COLISEU,
};

export const pistaPorId = (id: string): PistaDef | null =>
  PISTAS.find((p) => p.id === id) ?? (id === ARENA_BATALHA.id ? ARENA_BATALHA : null);

// ── Construção da pista (Catmull-Rom fechada → amostras) ───────
export interface Amostra {
  x: number; z: number;
  tx: number; tz: number; // tangente unitária
  nx: number; nz: number; // normal unitária (lateral)
  curva: number; // |curvatura| (rad/u), suavizada
  s: number; // distância acumulada desde a linha de partida
}
export interface CaixaItemPos { x: number; z: number; i: number; lateral: number }
export interface MoedaPos { x: number; z: number; i: number }
export interface RampaPos { x: number; z: number; tx: number; tz: number; s: number }
export interface Pista {
  def: PistaDef;
  amostras: Amostra[];
  comprimento: number;
  caixas: CaixaItemPos[];
  moedas: MoedaPos[];
  rampas: RampaPos[];
}

function pontoCatmull(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number): [number, number] {
  const t2 = t * t, t3 = t2 * t;
  const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
  const z = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
  return [x, z];
}

/** Constrói a pista: spline fechada → amostras uniformes ~2,5 u + objetos. Determinística. */
export function construirPista(def: PistaDef): Pista {
  const P = def.pontos;
  const n = P.length;
  const denso: [number, number][] = [];
  const PASSOS = 48;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let j = 0; j < PASSOS; j++) denso.push(pontoCatmull(p0, p1, p2, p3, j / PASSOS));
  }
  // reamostragem por comprimento de arco (~PASSO_AMOSTRA uniforme)
  const amostras: Amostra[] = [];
  let alvo = 0, acum = 0;
  for (let i = 0; i < denso.length; i++) {
    const a = denso[i], b = denso[(i + 1) % denso.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (alvo <= acum + seg && seg > 1e-9) {
      const f = (alvo - acum) / seg;
      amostras.push({ x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, tx: 0, tz: 0, nx: 0, nz: 0, curva: 0, s: alvo });
      alvo += PASSO_AMOSTRA;
    }
    acum += seg;
  }
  const m = amostras.length;
  for (let i = 0; i < m; i++) {
    const a = amostras[(i - 1 + m) % m], b = amostras[(i + 1) % m];
    const dx = b.x - a.x, dz = b.z - a.z;
    const d = Math.hypot(dx, dz) || 1;
    amostras[i].tx = dx / d; amostras[i].tz = dz / d;
    amostras[i].nx = -amostras[i].tz; amostras[i].nz = amostras[i].tx;
    amostras[i].s = i * PASSO_AMOSTRA;
  }
  // curvatura suavizada (janela ±5)
  for (let i = 0; i < m; i++) {
    const a = amostras[(i - 5 + m) % m], b = amostras[(i + 5) % m];
    const da = Math.atan2(b.tx, b.tz) - Math.atan2(a.tx, a.tz);
    const dAng = Math.atan2(Math.sin(da), Math.cos(da));
    amostras[i].curva = Math.abs(dAng) / (10 * PASSO_AMOSTRA);
  }
  const comprimento = m * PASSO_AMOSTRA;

  // ── objetos na pista (frações do traçado) ──
  const na = (frac: number) => amostras[((Math.floor((((frac % 1) + 1) % 1) * m)) % m + m) % m];
  const caixas: CaixaItemPos[] = [];
  for (const f of [0.08, 0.27, 0.46, 0.65, 0.86]) {
    const a = na(f);
    for (const lat of [-def.largura * 0.55, 0, def.largura * 0.55]) {
      caixas.push({ x: a.x + a.nx * lat, z: a.z + a.nz * lat, i: Math.round(a.s / PASSO_AMOSTRA), lateral: lat });
    }
  }
  const moedas: MoedaPos[] = [];
  for (const f of [0.14, 0.33, 0.52, 0.72, 0.93]) {
    for (let k = 0; k < 5; k++) {
      const a = na(f + k * 0.006);
      const lat = (k % 2 === 0 ? -1 : 1) * def.largura * 0.45;
      moedas.push({ x: a.x + a.nx * lat, z: a.z + a.nz * lat, i: Math.round(a.s / PASSO_AMOSTRA) });
    }
  }
  // rampas de turbo nas 3 "retas" mais limpas entre candidatos
  const candidatos = [0.16, 0.36, 0.56, 0.76, 0.95];
  const ordenados = [...candidatos].sort((f1, f2) => na(f1).curva - na(f2).curva).slice(0, 3);
  const rampas: RampaPos[] = ordenados.map((f) => {
    const a = na(f);
    return { x: a.x, z: a.z, tx: a.tx, tz: a.tz, s: a.s };
  });
  return { def, amostras, comprimento, caixas, moedas, rampas };
}

/** Amostra mais próxima com busca EM JANELA (±40) em volta de iAntigo — custo O(1) por passo. */
export function amostraPerto(pista: Pista, x: number, z: number, iAntigo: number): { i: number; lateral: number; ds: number } {
  const m = pista.amostras.length;
  const J = 40;
  let melhor = 0, melhorD = Infinity;
  for (let k = -J; k <= J; k++) {
    const i = ((iAntigo + k) % m + m) % m;
    const a = pista.amostras[i];
    const d = (a.x - x) * (a.x - x) + (a.z - z) * (a.z - z);
    if (d < melhorD) { melhorD = d; melhor = i; }
  }
  const a = pista.amostras[melhor];
  const lateral = (x - a.x) * a.nx + (z - a.z) * a.nz;
  // progresso fino: projeção na tangente (±1 amostra)
  const ds = (x - a.x) * a.tx + (z - a.z) * a.tz;
  const prox = pista.amostras[(melhor + 1) % m];
  return { i: melhor, lateral, ds: ds > PASSO_AMOSTRA * 0.5 ? prox.s : a.s };
}

// ── Garagem: karts e melhorias ─────────────────────────────────
export type KartId = "viralata" | "foguetinho" | "tanque" | "cupim";
export const IDS_KARTS: KartId[] = ["viralata", "foguetinho", "tanque", "cupim"];

export interface KartDef {
  id: KartId;
  nome: string;
  descricao: string;
  cor: number;
  velMax: number; // u/s
  acel: number; // u/s²
  virada: number; // rad/s base
  blind: number; // base de blindagem
  armas: number; // poder base das armas
  custoMoedas: number; // 0 = inicial
  nivelNecessario: number;
}

export const KARTS: Record<KartId, KartDef> = {
  viralata: { id: "viralata", nome: "Vira-Lata", descricao: "Equilibrado e fiel — o primeiro carro de toda a lenda.", cor: 0xe6b31e, velMax: 38, acel: 13.5, virada: 1.9, blind: 0, armas: 0, custoMoedas: 0, nivelNecessario: 1 },
  foguetinho: { id: "foguetinho", nome: "Foguetinho", descricao: "Acelera como um espirro — rei das largadas.", cor: 0x31c46c, velMax: 36.5, acel: 16.5, virada: 2.1, blind: 0, armas: 0, custoMoedas: 1500, nivelNecessario: 2 },
  tanque: { id: "tanque", nome: "Tanque Bateu", descricao: "Pesado, alto a velocidade e quase não sente golpes.", cor: 0x9b3de0, velMax: 41.5, acel: 11, virada: 1.62, blind: 2, armas: 0.5, custoMoedas: 3000, nivelNecessario: 4 },
  cupim: { id: "cupim", nome: "Cupim de Corrida", descricao: "O refinado da oficina: bom em tudo, exceto em ser barato.", cor: 0xe0453a, velMax: 39.5, acel: 14.5, virada: 2.0, blind: 1, armas: 0.3, custoMoedas: 5200, nivelNecessario: 6 },
};

export type MelhoriaId = "motor" | "turbo" | "pneus" | "blindagem" | "armas";
export const IDS_MELHORIAS: MelhoriaId[] = ["motor", "turbo", "pneus", "blindagem", "armas"];

/** Custo em moedas para subir do nível `nv` para nv+1 (nv 0..4). Devolve 0 quando está no teto. */
export function custoMelhoria(nv: number): number {
  if (nv < 0 || nv >= NIVEL_MAX_MELHORIA) return 0;
  return Math.round(140 * Math.pow(1.7, nv)); // 140 · 238 · 405 · 688 · 1169
}

export interface StatsKart {
  velMax: number; acel: number; virada: number; grip: number;
  turboMult: number; turboDur: number;
  stunReducao: number; // 0..0.6
  poderArma: number;
}

/** Stats finais = base do kart + melhorias (função ISOMÓRFICA — a mesma conta no browser e num futuro servidor). */
export function statsDe(kartId: KartId, mel: Partial<Record<MelhoriaId, number>>): StatsKart {
  const k = KARTS[kartId] ?? KARTS.viralata;
  const m = (id: MelhoriaId) => clamp(Math.round(mel[id] ?? 0), 0, NIVEL_MAX_MELHORIA);
  const motor = m("motor"), turbo = m("turbo"), pneus = m("pneus"), blind = m("blindagem"), armas = m("armas");
  return {
    velMax: k.velMax + motor * 1.3,
    acel: k.acel + pneus * 0.35,
    virada: k.virada + pneus * 0.09,
    grip: 7.5 + pneus * 0.35,
    turboMult: 1.32 + turbo * 0.03,
    turboDur: 1.3 + turbo * 0.16,
    stunReducao: clamp(k.blind * 0.05 + blind * 0.09, 0, 0.6),
    poderArma: k.armas + armas * 0.15,
  };
}

export function kartDesbloqueado(id: KartId, possuidos: string[], nivel: number, moedas: number): { sim: boolean; motivo: "possuido" | "nivel" | "moedas" | "" } {
  if (possuidos.includes(id)) return { sim: true, motivo: "possuido" };
  const k = KARTS[id];
  if (!k) return { sim: false, motivo: "nivel" };
  if (nivel < k.nivelNecessario) return { sim: false, motivo: "nivel" };
  if (moedas < k.custoMoedas) return { sim: false, motivo: "moedas" };
  return { sim: true, motivo: "" };
}

// ── Progressão ─────────────────────────────────────────────────
export const NIVEL_TETO = 30;
/** XP necessário para SAIR do nível n (n → n+1). */
export function xpDoNivel(n: number): number { return 150 + (n - 1) * 90; }
/** XP TOTAL acumulado até ENTRAR no nível n. Inverso exato de nivelDeXp. */
export function xpTotalAteNivel(n: number): number {
  let t = 0;
  for (let k = 1; k < clamp(n, 1, NIVEL_TETO); k++) t += xpDoNivel(k);
  return t;
}
export function nivelDeXp(xp: number): number {
  let n = 1, restante = Math.max(0, xp | 0);
  while (n < NIVEL_TETO && restante >= xpDoNivel(n)) { restante -= xpDoNivel(n); n++; }
  return n;
}

const TABELA_MOEDAS = [400, 320, 260, 210, 180, 160, 140, 120, 110, 100, 90, 80];
const TABELA_XP = [220, 180, 150, 130, 115, 100, 90, 80, 70, 60, 50, 40];
export function recompensaCorrida(posicao: number, moedasRecolhidas: number, voltas: number): { moedas: number; xp: number } {
  const p = clamp(Math.round(posicao), 1, MAX_CORREDORES);
  const bonusVoltas = Math.max(0, voltas - 3) * 30;
  return {
    moedas: TABELA_MOEDAS[p - 1] + Math.max(0, moedasRecolhidas | 0) * 12 + bonusVoltas,
    xp: TABELA_XP[p - 1] + Math.max(0, moedasRecolhidas | 0) * 4,
  };
}

// ── Save do aparelho (honesto: progresso é do dispositivo) ─────
export interface SaveKart {
  moedas: number;
  xp: number;
  kart: KartId;
  possuidos: KartId[];
  melhorias: Record<string, number>; // chave `${kartId}.${melhoria}` → 0..5
  recordes: Record<string, number>; // pistaId → melhor tempo (s)
  corridas: number;
  vitorias: number;
  ts: number;
}

export function saveOmissao(): SaveKart {
  return { moedas: 250, xp: 0, kart: "viralata", possuidos: ["viralata"], melhorias: {}, recordes: {}, corridas: 0, vitorias: 0, ts: 0 };
}

/** ÚNICA porta de entrada do save externo (padrão jogoValido v60): podre → omissão honesta. */
export function validarSaveKart(bruto: unknown): SaveKart {
  const o = saveOmissao();
  if (!bruto || typeof bruto !== "object") return o;
  const p = bruto as Partial<SaveKart>;
  const out: SaveKart = {
    moedas: clamp(Math.round(Number(p.moedas) || 0), 0, 9_999_999),
    xp: clamp(Math.round(Number(p.xp) || 0), 0, 9_999_999),
    kart: IDS_KARTS.includes(p.kart as KartId) ? (p.kart as KartId) : "viralata",
    possuidos: Array.isArray(p.possuidos) ? IDS_KARTS.filter((k) => (p.possuidos as string[]).includes(k)) : ["viralata"],
    melhorias: {},
    recordes: {},
    corridas: clamp(Math.round(Number(p.corridas) || 0), 0, 999_999),
    vitorias: clamp(Math.round(Number(p.vitorias) || 0), 0, 999_999),
    ts: clamp(Math.round(Number(p.ts) || 0), 0, 8.64e15),
  };
  if (!out.possuidos.includes("viralata")) out.possuidos.push("viralata");
  if (!out.possuidos.includes(out.kart)) out.kart = "viralata";
  if (p.melhorias && typeof p.melhorias === "object") {
    for (const k of IDS_KARTS) for (const mel of IDS_MELHORIAS) {
      const v = (p.melhorias as Record<string, unknown>)[`${k}.${mel}`];
      if (typeof v === "number" && Number.isFinite(v)) out.melhorias[`${k}.${mel}`] = clamp(Math.round(v), 0, NIVEL_MAX_MELHORIA);
    }
  }
  if (p.recordes && typeof p.recordes === "object") {
    for (const id of IDS_PISTAS) {
      const v = (p.recordes as Record<string, unknown>)[id];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) out.recordes[id] = clamp(v, 1, 3600);
    }
  }
  return out;
}

// ── Itens ──────────────────────────────────────────────────────
export type ItemKartId = "cogumelo" | "cogumelo3" | "casca" | "cascaAlvo" | "oleo" | "missil" | "raio" | "escudo";
export const IDS_ITENS: ItemKartId[] = ["cogumelo", "cogumelo3", "casca", "cascaAlvo", "oleo", "missil", "raio", "escudo"];

/** Pesos por POSIÇÃO — padrão Mario Kart: quem está atrás recebe armas melhores. */
export function pesosItem(posicao: number, total: number): Record<ItemKartId, number> {
  const p = clamp(Math.round(posicao), 1, Math.max(1, total));
  if (p === 1) return { cogumelo: 12, cogumelo3: 0, casca: 30, cascaAlvo: 6, oleo: 26, missil: 0, raio: 0, escudo: 26 };
  if (p <= 3) return { cogumelo: 16, cogumelo3: 6, casca: 20, cascaAlvo: 18, oleo: 14, missil: 10, raio: 2, escudo: 14 };
  if (p <= 6) return { cogumelo: 12, cogumelo3: 16, casca: 12, cascaAlvo: 18, oleo: 4, missil: 16, raio: 12, escudo: 10 };
  return { cogumelo: 12, cogumelo3: 22, casca: 5, cascaAlvo: 16, oleo: 0, missil: 20, raio: 18, escudo: 7 };
}

export function rolarItem(rng: () => number, posicao: number, total: number): ItemKartId {
  const pesos = pesosItem(posicao, total);
  let soma = 0;
  for (const id of IDS_ITENS) soma += pesos[id];
  if (soma <= 0) return "cogumelo";
  let r = rng() * soma;
  for (const id of IDS_ITENS) { r -= pesos[id]; if (r <= 0) return id; }
  return "cogumelo";
}

// ── Corrida ────────────────────────────────────────────────────
export type FaseCorrida = "contagem" | "corrida" | "fim";

export interface Corredor {
  id: number;
  nome: string;
  kart: KartId;
  cor: number;
  eJogador: boolean;
  // física
  x: number; z: number; ang: number; // ângulo do CARRO (visual)
  dirAng: number; // ângulo do MOVIMENTO (deriva = diferença)
  vel: number;
  lateralPerto: number; // distância lateral assinada à amostra mais perto
  derrapando: boolean; derivaDir: number; derivaCarga: number;
  boost: number; stun: number; escudo: number;
  foraPista: boolean; contrario: number; ultContrario: number;
  // progresso
  iAmostra: number; sTotal: number; dsAnt: number;
  volta: number; terminou: boolean; tempoFim: number;
  posicao: number;
  moedas: number;
  item: ItemKartId | null; itens3: number;
  caixaCooldown: number;
  // runtime
  stats: StatsKart;
  iaRubber: number;
  iaOffset: number; iaSkill: number; iaItemTimer: number; iaFrenagem: number;
  iaDesvio: number; // v75: desvio lateral DINÂMICO (esquiva perigos; decai a 0)
  iaLargada: number; // v75: reação à largada (s) — 0 para humanos
}

export interface ProjetilKart { id: number; tipo: "casca" | "cascaAlvo" | "missil"; x: number; z: number; ang: number; vel: number; dono: number; alvo: number; vida: number; iAmostra: number }
export interface PerigoKart { id: number; tipo: "oleo"; x: number; z: number; dono: number; vida: number; idade: number }
export interface CaixaViva { x: number; z: number; viva: boolean; respawn: number }
export interface MoedaViva { x: number; z: number; viva: boolean }

export type EventoCorrida =
  | { t: "caixa"; id: number }
  | { t: "moeda"; id: number }
  | { t: "item"; id: number; item: ItemKartId }
  | { t: "uso"; id: number; item: ItemKartId }
  | { t: "golpe"; alvo: number; tipo: ItemKartId; por: number }
  | { t: "raio"; por: number }
  | { t: "escudo"; alvo: number }
  | { t: "deriva"; fase: 1 | 2; id: number }
  | { t: "rampa"; id: number }
  | { t: "volta"; id: number; volta: number }
  | { t: "contrario" }
  | { t: "chegada"; id: number; posicao: number; tempo: number }
  | { t: "fim"; posicao: number; moedas: number; xp: number; tempo: number; recorde: boolean }
  | { t: "fimSala" }; // v66 ONLINE: a sala fechou (todos os humanos chegaram) — cada cliente calcula o SEU payout local

export interface EntradaKart { acelerar: boolean; travar: boolean; virar: number; derrapar: boolean; usarItem: boolean }
export const entradaParada = (): EntradaKart => ({ acelerar: false, travar: false, virar: 0, derrapar: false, usarItem: false });

export interface EstadoCorrida {
  fase: FaseCorrida;
  tempoContagem: number;
  tempo: number;
  voltas: number;
  pista: Pista;
  corredores: Corredor[];
  projeteis: ProjetilKart[];
  perigos: PerigoKart[];
  caixas: CaixaViva[];
  moedas: MoedaViva[];
  eventos: EventoCorrida[];
  rng: () => number;
  seqId: number;
  recordeAnterior: number;
  resultados: { id: number; nome: string; posicao: number; tempo: number }[];
  payout: { moedas: number; xp: number; recorde: boolean } | null;
}

const NOMES_BOTS = ["Kudisso", "Zapata", "Makuti", "Ndove", "Turbo Tia", "Capalanga", "Xitique", "Djakba", "Maningue", "Bué Rápido", "Marimba"];
const CORES_BOTS = [0x3b82f6, 0x22c55e, 0xef4444, 0xeab308, 0xa855f7, 0x14b8a6, 0xf97316, 0xec4899, 0x8b5cf6, 0x84cc16, 0x06b6d4];

function posicaoNaPista(pista: Pista, s: number, lateral: number): { x: number; z: number; ang: number; i: number } {
  const m = pista.amostras.length;
  const i = ((Math.floor(s / PASSO_AMOSTRA) % m) + m) % m;
  const a = pista.amostras[i];
  return { x: a.x + a.nx * lateral, z: a.z + a.nz * lateral, ang: Math.atan2(a.tx, a.tz), i };
}

const IDX_JOGADOR = 6; // grelha 2×6: jogador no MEIO — começa a LUTAR para o pódio

/** Nova corrida: 12 corredores (jogador + 11 IA), grelha ATRÁS da linha, contagem 3-2-1-JÁ. */
export function novaCorrida(opts: {
  pista: Pista;
  voltas?: number;
  kartJogador: KartId;
  melhoriasJogador?: Partial<Record<MelhoriaId, number>>;
  nomeJogador?: string;
  semente?: number;
  recordeAnterior?: number;
}): EstadoCorrida {
  const rng = rng32(opts.semente ?? ((Math.random() * 2 ** 31) | 0));
  const voltas = clamp(Math.round(opts.voltas ?? VOLTAS_OMISSAO), VOLTAS_MIN, VOLTAS_MAX);
  const pista = opts.pista;
  const L = pista.comprimento;
  const corredores: Corredor[] = [];
  for (let i = 0; i < MAX_CORREDORES; i++) {
    const eJogador = i === IDX_JOGADOR;
    const kart: KartId = eJogador ? opts.kartJogador : IDS_KARTS[i % IDS_KARTS.length];
    const linha = Math.floor(i / 2);
    const lateral = (i % 2 === 0 ? -1 : 1) * 2.3;
    const s = L - (8 + linha * 5); // ATRÁS da linha
    const p = posicaoNaPista(pista, s, lateral);
    const stats = eJogador ? statsDe(kart, opts.melhoriasJogador ?? {}) : statsDe(kart, {});
    const ref = amostraPerto(pista, p.x, p.z, p.i);
    const skill = eJogador ? 1 : 0.7 + rng() * 0.27; // v77: leque largo — de «Turbo Tia» (0,70) a pro (0,97)
    corredores.push({
      id: i,
      nome: eJogador ? (opts.nomeJogador?.trim() || "Tu") : NOMES_BOTS[(i < 6 ? i : i - 1) % NOMES_BOTS.length],
      kart, cor: eJogador ? KARTS[kart].cor : CORES_BOTS[(i + 10) % CORES_BOTS.length],
      eJogador,
      x: p.x, z: p.z, ang: p.ang, dirAng: p.ang, vel: 0,
      lateralPerto: ref.lateral,
      derrapando: false, derivaDir: 0, derivaCarga: 0,
      boost: 0, stun: 0, escudo: 0, foraPista: false, contrario: 0, ultContrario: -9,
      iAmostra: p.i, sTotal: s - L, dsAnt: ref.ds, // sTotal NEGATIVO: cruza a linha → 0 → volta 1
      volta: 0, terminou: false, tempoFim: 0, posicao: i + 1, moedas: 0,
      item: null, itens3: 0, caixaCooldown: 0,
      stats,
      iaRubber: 1,
      iaOffset: eJogador ? 0 : (rng() - 0.5) * pista.def.largura * 1.1,
      iaSkill: skill,
      iaItemTimer: 2 + rng() * 4,
      iaFrenagem: 0.6 + rng() * 0.5,
      iaDesvio: 0,
      // v77: reflexo pela DESTREZA (0,25…1) — a fórmula da v76 com o leque largo
      // punha 0,54 s no piloto fraco (fora do intervalo honesto 0,04-0,4)
      iaLargada: eJogador ? 0 : 0.3 - clamp((skill - 0.78) / 0.17, 0.25, 1) * 0.22 + rng() * 0.05,
    });
  }
  return {
    fase: "contagem",
    tempoContagem: 3.9,
    tempo: 0,
    voltas,
    pista,
    corredores,
    projeteis: [],
    perigos: [],
    caixas: pista.caixas.map((c) => ({ x: c.x, z: c.z, viva: true, respawn: 0 })),
    moedas: pista.moedas.map((c) => ({ x: c.x, z: c.z, viva: true })),
    eventos: [],
    rng,
    seqId: 1,
    recordeAnterior: opts.recordeAnterior ?? Infinity,
    resultados: [],
    payout: null,
  };
}

export function posicoesDe(e: EstadoCorrida): Corredor[] {
  return [...e.corredores].sort((a, b) => {
    if (a.terminou && b.terminou) return a.tempoFim - b.tempoFim;
    if (a.terminou) return -1;
    if (b.terminou) return 1;
    return b.sTotal - a.sTotal;
  });
}

// ── Itens: uso e efeitos ───────────────────────────────────────
export function usarItemKart(e: EstadoCorrida, c: Corredor, stats: StatsKart): void {
  if (!c.item) return;
  // abrir o pacote de 3 cogumelos
  if (c.item === "cogumelo3" && c.itens3 === 0) c.itens3 = 3;
  // a gastar cargas do pacote
  if (c.itens3 > 0) {
    c.itens3--;
    c.boost = Math.max(c.boost, stats.turboDur);
    e.eventos.push({ t: "uso", id: c.id, item: "cogumelo" });
    if (c.itens3 === 0) c.item = null;
    return;
  }
  const item = c.item;
  const h = { x: Math.sin(c.ang), z: Math.cos(c.ang) };
  const proximoNaFrente = (): Corredor | null => {
    const ordem = posicoesDe(e);
    const idx = ordem.findIndex((x) => x.id === c.id);
    return idx > 0 ? ordem[idx - 1] : null;
  };
  if (item === "cogumelo") {
    c.boost = Math.max(c.boost, stats.turboDur);
  } else if (item === "casca") {
    e.projeteis.push({ id: e.seqId++, tipo: "casca", x: c.x + h.x * 3, z: c.z + h.z * 3, ang: c.ang, vel: 46 + stats.poderArma * 6, dono: c.id, alvo: -1, vida: 3.5, iAmostra: c.iAmostra });
  } else if (item === "cascaAlvo") {
    const alvo = proximoNaFrente();
    e.projeteis.push({ id: e.seqId++, tipo: "cascaAlvo", x: c.x + h.x * 3, z: c.z + h.z * 3, ang: c.ang, vel: 40 + stats.poderArma * 5, dono: c.id, alvo: alvo ? alvo.id : -1, vida: 6, iAmostra: c.iAmostra });
  } else if (item === "missil") {
    const alvo = proximoNaFrente();
    e.projeteis.push({ id: e.seqId++, tipo: "missil", x: c.x + h.x * 3, z: c.z + h.z * 3, ang: c.ang, vel: 55 + stats.poderArma * 6, dono: c.id, alvo: alvo ? alvo.id : -1, vida: 7, iAmostra: c.iAmostra });
  } else if (item === "oleo") {
    e.perigos.push({ id: e.seqId++, tipo: "oleo", x: c.x - h.x * 4.5, z: c.z - h.z * 4.5, dono: c.id, vida: VIDA_OLEO, idade: 0 });
  } else if (item === "raio") {
    for (const o of e.corredores) {
      if (o.id === c.id || o.terminou) continue;
      if (o.escudo > 0) { o.escudo = 0; e.eventos.push({ t: "escudo", alvo: o.id }); continue; }
      o.stun = Math.max(o.stun, 1.15 * (1 - o.stats.stunReducao));
      o.vel *= 0.35;
    }
    e.eventos.push({ t: "raio", por: c.id });
  } else if (item === "escudo") {
    c.escudo = 9;
  }
  e.eventos.push({ t: "uso", id: c.id, item });
  c.item = null;
}

function acertar(e: EstadoCorrida, vitima: Corredor, tipo: ItemKartId, por: number): void {
  if (vitima.escudo > 0) { vitima.escudo = 0; e.eventos.push({ t: "escudo", alvo: vitima.id }); return; }
  const red = vitima.stats.stunReducao;
  const base = tipo === "missil" ? 1.7 : tipo === "oleo" ? 0.9 : 1.05;
  vitima.stun = Math.max(vitima.stun, base * (1 - red));
  vitima.vel *= 0.3;
  vitima.derrapando = false; vitima.derivaCarga = 0;
  e.eventos.push({ t: "golpe", alvo: vitima.id, tipo, por });
}

// ── IA dos bots (v77 — UNIÃO da ELITE v76 + do CÉREBRO de corrida) ──
// A v76 deu aos bots DEFESA (esquivam projéteis/óleo/trânsito com o
// desvio dinâmico iaDesvio, levantam o escudo NA HORA, reagem à
// largada). A união v77 junta o CÉREBRO DE CORRIDA: LINHA DE CORRIDA
// dinâmica (interior das curvas pelo PICO de curvatura — relação
// −sinal verificada na sonda), FRENAGEM por JANELA 12-40 amostras,
// DERIVA no cotovelo (mini-turbo de saída), MOEDAS nas retas e
// BLOQUEIO do líder — mantendo TODA a defesa v76 intacta. Itens:
// cone de tiro (casca verde voa reto), teleguiados ao alcance, nada
// desperdiçado em alvo com escudo, turbo para as retas, raio atrás
// no pelotão. TUDO determinístico: só matemática sobre o estado —
// nada de Math.random fora da roleta de itens.

const DESVIO_TETO = 5.8; // teto do desvio lateral (u) — dentro da estrada (largura ≥ 6,5)
const DESVIO_CRESC = 9; // u/s de subida do desvio quando há ameaça
const DESVIO_RELAXA = 2.2; // u/s de descida quando a pista fica livre

/** Curvatura média das próximas n amostras (≈0 = reta perfeita). */
function curvaFrente(pista: Pista, iAmostra: number, n: number): number {
  const m = pista.amostras.length;
  let soma = 0;
  for (let k = 1; k <= n; k++) soma += pista.amostras[((iAmostra + k) % m + m) % m].curva;
  return soma / n;
}

/** Variação ASSINADA do ângulo da tangente entre duas amostras (rad).
 *  >0 = o traçado vira para o lado NEGATIVO da normal (interior = −sinal). */
export function assinaturaCurva(pista: Pista, iA: number, iB: number): number {
  const m = pista.amostras.length;
  const a = pista.amostras[((iA % m) + m) % m];
  const b = pista.amostras[((iB % m) + m) % m];
  const da = Math.atan2(b.tx, b.tz) - Math.atan2(a.tx, a.tz);
  return Math.atan2(Math.sin(da), Math.cos(da));
}

/** Linha de corrida: lateral ALVO (u, no referencial da normal da pista) à
 *  frente de iAmostra — aperta para o INTERIOR nas curvas, centro nas retas.
 *  Pura (zero rng) para os testes: interior = −sinal × peso do pico de
 *  curvatura na janela (o apex manda, não a amostra do fim da janela). */
export function linhaCorrida(pista: Pista, iAmostra: number, vel: number): number {
  const m = pista.amostras.length;
  const largura = pista.def.largura;
  const mira = Math.floor(clamp(8 + vel * 0.5, 10, 26)); // olhar cresce com a velocidade
  let mag = 0;
  for (let k = 2; k <= mira; k++) {
    const cv = pista.amostras[((iAmostra + k) % m + m) % m].curva;
    if (cv > mag) mag = cv;
  }
  if (mag < 0.005) return 0; // reta: a linha é o centro (moedas entram por fora)
  const sinal = assinaturaCurva(pista, iAmostra + 2, iAmostra + mira);
  const peso = clamp(mag / 0.02, 0.35, 1.25);
  return clamp(-sinal * largura * 0.45 * peso, -largura * 0.55, largura * 0.55);
}

function iaDecidir(e: EstadoCorrida, c: Corredor, dt: number): EntradaKart {
  const ent = entradaParada();
  const pista = e.pista;
  const m = pista.amostras.length;

  // reação à largada: o «JÁ» não apanha ninguém a dormir, mas ninguém
  // é máquina — melhor destreza → reflexo mais curto (0,08…0,35 s)
  if (e.tempo < c.iaLargada) return ent;

  // JANELA de curvatura à frente (v77 — hábeis antevêem mais): usada pela
  // frenagem, pela deriva, pelas moedas e pelo cogumelo
  const skill = clamp((c.iaSkill - 0.78) / 0.17, 0.25, 1); // destreza 0,25…1
  const janela = Math.floor(clamp(10 + c.vel * (0.35 + skill * 0.45), 12, 40));
  let curvaMax = 0;
  for (let k = 6; k <= janela; k++) {
    const cv = pista.amostras[((c.iAmostra + k) % m + m) % m].curva;
    if (cv > curvaMax) curvaMax = cv;
  }

  // rubber-banding SUAVE (padrão Mario Kart: os de trás ganham fôlego).
  // v77 FURO: no ONLINE corredores[6] é um BOT (SLOTS_REDE baralha id≠slot)
  // — o gap passa a medir-se contra o PRIMEIRO humano da grelha.
  const jogador = e.corredores.find((x) => x.eJogador) ?? e.corredores[IDX_JOGADOR];
  const gap = jogador.sTotal - c.sTotal;
  c.iaRubber = gap > 120 ? 1.07 : gap < -120 ? 0.93 : 1;

  // ── DESVIO (v76 intacto): projéteis > óleo > trânsito. O iaOffset é a
  //    linha pessoal; o iaDesvio é lateral DINÂMICA que cresce para fugir
  //    do perigo e relaxa a 0 quando a pista fica livre.
  const minhaLat = c.lateralPerto;
  const tetoLat = pista.def.largura * 0.92;
  const fugirDe = (perigoLat: number, forca: number): number => {
    let dir = perigoLat > minhaLat ? -1 : 1; // longe do perigo…
    if (Math.abs(c.iaOffset + dir * DESVIO_TETO * forca) > tetoLat) dir = -dir; // …sem pista desse lado → contorno pelo outro
    return dir * DESVIO_TETO * forca;
  };
  let alvoDesvio = 0;
  let ameacaAtiva = false;

  // 1) projéteis — o PERIGO MAIS PERTO decide
  let perigo: { d: number; lat: number; forca: number } | null = null;
  for (const p of e.projeteis) {
    if (p.dono === c.id) continue;
    const d = Math.hypot(p.x - c.x, p.z - c.z);
    const tele = p.alvo === c.id; // teleguiado VEM ATIRA-SE-ME — raio de atenção maior
    if (d > (tele ? 62 : 46)) continue;
    const lp = amostraPerto(pista, p.x, p.z, c.iAmostra).lateral;
    if (!tele && Math.abs(lp - minhaLat) > 5.5) continue; // passa longe da minha linha
    const forca = (p.tipo === "missil" ? 1 : p.tipo === "cascaAlvo" ? 0.85 : 0.7) * skill;
    if (!perigo || d < perigo.d) perigo = { d, lat: lp, forca };
  }
  if (perigo) { alvoDesvio = fugirDe(perigo.lat, perigo.forca); ameacaAtiva = true; }

  // 2) óleo — mancha no caminho → contornar (a minha própria: a física
  //    perdoa 1,5 s; eu contorno a partir das 2)
  if (!ameacaAtiva) {
    for (const h of e.perigos) {
      if (h.dono === c.id && h.idade < 2) continue;
      const d = Math.hypot(h.x - c.x, h.z - c.z);
      if (d > 48) continue;
      const lh = amostraPerto(pista, h.x, h.z, c.iAmostra).lateral;
      if (Math.abs(lh - minhaLat) < 4.4) { alvoDesvio = fugirDe(lh, 1.0 * skill); ameacaAtiva = true; break; }
    }
  }

  // 3) trânsito — kart colado à frente na minha linha → tirar-me da
  //    colisão (que custa velocidade aos DOIS) e tomar a linha por fora
  if (!ameacaAtiva) {
    let melhor: Corredor | null = null, dMelhor = 14;
    for (const o of e.corredores) {
      if (o.id === c.id || o.terminou) continue;
      const d = Math.hypot(o.x - c.x, o.z - c.z);
      if (d < dMelhor && o.sTotal > c.sTotal) { melhor = o; dMelhor = d; }
    }
    if (melhor) {
      const lo = amostraPerto(pista, melhor.x, melhor.z, c.iAmostra).lateral;
      if (Math.abs(lo - minhaLat) < 3.4) { alvoDesvio = fugirDe(lo, 0.55 * skill); ameacaAtiva = true; }
    }
  }

  // dinâmica do desvio: sobe rápido com ameaça, relaxa sem ela
  if (ameacaAtiva) c.iaDesvio += clamp(alvoDesvio - c.iaDesvio, -DESVIO_CRESC * dt, DESVIO_CRESC * dt);
  else c.iaDesvio -= Math.sign(c.iaDesvio) * Math.min(Math.abs(c.iaDesvio), DESVIO_RELAXA * dt);
  c.iaDesvio = clamp(c.iaDesvio, -DESVIO_TETO, DESVIO_TETO);

  // ── ALVO LATERAL (v77): LINHA DE CORRIDA + personalidade + desvio
  //    de perigo + moedas (só em reta) + bloqueio do líder
  let alvoLat = linhaCorrida(pista, c.iAmostra, c.vel) + c.iaOffset * 0.45 + c.iaDesvio;

  // MOEDAS nas retas (v77): peso pequeno — o traçado nunca é trocado por moeda
  if (!c.derrapando && c.moedas < 10 && curvaMax < 0.01) {
    const a = pista.amostras[c.iAmostra];
    const h = { x: Math.sin(c.ang), z: Math.cos(c.ang) };
    let melhorD = Infinity, ganho = 0;
    for (const mo of e.moedas) {
      if (!mo.viva) continue;
      const dx = mo.x - c.x, dz = mo.z - c.z;
      const df = dx * h.x + dz * h.z; // à frente (corpo)
      if (df < 4 || df > 34) continue;
      const latMo = dx * a.nx + dz * a.nz; // lateral da moeda em relação a MIM
      if (Math.abs(latMo) > 6.5) continue;
      if (df < melhorD) { melhorD = df; ganho = latMo * 0.6; }
    }
    if (Number.isFinite(melhorD)) alvoLat += ganho;
  }

  // BLOQUEIO do líder (v77): o 1.º hábil espelha a lateral do 2.º para
  // fechar a linha de ultrapassagem (nunca em derrapagem)
  const ordem0 = posicoesDe(e);
  const idxEu = ordem0.findIndex((x) => x.id === c.id);
  if (idxEu === 0 && skill > 0.88 && !c.derrapando && ordem0[1]) {
    const seg = ordem0[1];
    const a = pista.amostras[c.iAmostra];
    const h = { x: Math.sin(c.ang), z: Math.cos(c.ang) };
    const dx = seg.x - c.x, dz = seg.z - c.z;
    const df = dx * h.x + dz * h.z;
    if (df < 4 && df > -22) {
      const dl = dx * a.nx + dz * a.nz;
      alvoLat += clamp(dl * 0.6, -pista.def.largura * 0.35, pista.def.largura * 0.35);
    }
  }

  // direção: em ameaça o olhar ENCOLHE (55% — v76) — o volante responde
  // ao desvio AGORA em vez de surrar o ponto de fuga 50 u à frente
  const look = Math.floor(10 + c.vel * 0.35);
  const lookEfetivo = ameacaAtiva ? Math.max(6, Math.floor(look * 0.55)) : look;
  const alvoA = pista.amostras[((c.iAmostra + lookEfetivo) % m + m) % m];
  const tx = alvoA.x + alvoA.nx * alvoLat, tz = alvoA.z + alvoA.nz * alvoLat;
  const dif = Math.atan2(tx - c.x, tz - c.z) - c.ang;
  const difN = Math.atan2(Math.sin(dif), Math.cos(dif));
  ent.virar = clamp(difN * (1.9 + skill * 1.1), -1, 1);

  // frenagem por JANELA (v77 — hábeis antevêem mais e carregam mais velocidade)
  const frenagem = c.iaFrenagem * (1.25 - skill * 0.55);
  const velCurva = 36 - curvaMax * 900 * frenagem;
  ent.acelerar = true;
  if (c.vel > Math.max(18, velCurva)) { ent.acelerar = false; ent.travar = c.vel > velCurva + 6; }

  // deriva nas curvas de verdade (v77): o PICO da janela manda — mesmo com
  // a linha suave, o bot derrapa no cotovelo e sai com MINI-TURBO
  ent.derrapar = c.vel > 20 && (Math.abs(difN) > 0.3 || curvaMax > 0.014);

  // ── ITENS com cabeça (v76 + v77): o timer re-agenda SEMPRE — quem
  //    guarda não fica a olhar para o item para nunca.
  c.iaItemTimer -= dt;
  if (c.iaItemTimer <= 0 && c.item) {
    c.iaItemTimer = 0.9 + e.rng() * 1.6; // decide mais vezes (antes 1,6-4,4)
    const item = c.item;
    const alvo = proximoPara(c, e);
    const dxA = alvo ? alvo.x - c.x : 0, dzA = alvo ? alvo.z - c.z : 0;
    const dAlvo = alvo ? Math.hypot(dxA, dzA) : Infinity;
    const dfA = alvo ? dxA * Math.sin(c.ang) + dzA * Math.cos(c.ang) : -Infinity;
    const aNorm = pista.amostras[c.iAmostra];
    const dlA = alvo ? dxA * aNorm.nx + dzA * aNorm.nz : 0;
    const alvoEscudado = alvo ? alvo.escudo > 0 : false;
    if (item === "escudo") {
      // míssil/casca-alvo à vista → o escudo FICA NO BOLSO até o perigo
      // chegar perto (o uso à toa desperdiça 9 s de proteção)
      const tel = e.projeteis.find((p) => p.alvo === c.id && (p.tipo === "missil" || p.tipo === "cascaAlvo"));
      ent.usarItem = !tel || Math.hypot(tel.x - c.x, tel.z - c.z) < 28;
    } else if (item === "cogumelo" || item === "cogumelo3") {
      // turbo guardado para a RETA (v76, régua calibrada nas 3 pistas) —
      // ou a fugir de quem anda colado (v77)
      const perseguidorPerto = e.corredores.some((o) => o.id !== c.id && !o.terminou && o.sTotal < c.sTotal && c.sTotal - o.sTotal < 14);
      ent.usarItem = curvaFrente(pista, c.iAmostra, 16) < 0.0028 || perseguidorPerto;
    } else if (item === "raio") {
      // v77: raio atrás no pelotão vale ouro; na liderança guarda um pouco
      ent.usarItem = c.posicao >= 5 || e.rng() < 0.3;
    } else if (item === "casca") {
      // v77: a verde voa RETO — só com alvo NO CONE (à frente 8-80 u e
      // ±3,2 de lateral) e SEM escudo (tiro desperdiçado é tiro perdido)
      ent.usarItem = alvo && !alvoEscudado && dfA > 8 && dfA < 80 && Math.abs(dlA) < 3.2;
    } else if (item === "cascaAlvo") {
      ent.usarItem = alvo && !alvoEscudado && dfA > 4 && dAlvo < 150;
    } else if (item === "missil") {
      ent.usarItem = alvo && !alvoEscudado && dAlvo < 200;
    } else if (item === "oleo") {
      // v76: óleo só vale a pena com alguém COLADO atrás — senão fica no
      // meio de ninguém (mantido da v76; determinístico no «guardar»)
      const atras = e.corredores.some((o) => o.id !== c.id && !o.terminou && o.sTotal < c.sTotal && c.sTotal - o.sTotal < 55);
      ent.usarItem = atras && e.rng() < 0.75;
    }
  }
  return ent;
}
function proximoPara(c: Corredor, e: EstadoCorrida): Corredor | null {
  const ordem = posicoesDe(e);
  const idx = ordem.findIndex((x) => x.id === c.id);
  return idx > 0 ? ordem[idx - 1] : null;
}

// ── Física de um corredor ──────────────────────────────────────
function passoKart(e: EstadoCorrida, c: Corredor, ent: EntradaKart, stats: StatsKart, dt: number): void {
  const pista = e.pista;
  const emCorrida = e.fase === "corrida";

  if (c.stun > 0) {
    // girou: sem controlo, desliza a perder velocidade
    c.stun = Math.max(0, c.stun - dt);
    c.vel *= Math.pow(0.25, dt);
    c.ang += 9 * dt;
    c.dirAng += 9 * dt;
  } else if (emCorrida && !c.terminou) {
    const virar = clamp(ent.virar, -1, 1);
    const podeDrift = ent.derrapar && c.vel > 16;
    if (podeDrift && !c.derrapando && virar !== 0) {
      c.derrapando = true; c.derivaDir = Math.sign(virar); c.derivaCarga = 0;
    }
    if (!podeDrift && c.derrapando) {
      // soltar → MINI-TURBO por tiers (azul / laranja)
      if (c.derivaCarga >= 2.0) { c.boost = Math.max(c.boost, stats.turboDur * 0.9 + 0.4); e.eventos.push({ t: "deriva", fase: 2, id: c.id }); }
      else if (c.derivaCarga >= 0.9) { c.boost = Math.max(c.boost, stats.turboDur * 0.45 + 0.2); e.eventos.push({ t: "deriva", fase: 1, id: c.id }); }
      c.derrapando = false; c.derivaCarga = 0;
    }
    if (c.derrapando) c.derivaCarga += dt * (1.1 + Math.abs(virar) * 0.9);

    const teto = stats.velMax + Math.min(COIN_BONUS_TETO, c.moedas * COIN_BONUS_VEL) + (c.boost > 0 ? stats.velMax * (stats.turboMult - 1) : 0);
    if (ent.acelerar) c.vel += stats.acel * dt;
    if (ent.travar) c.vel -= 32 * dt;
    // atrito leve — o teto é o CLAMP (equilíbrio 13,5/0,35 ≈ 38,6 ≈ velMax)
    c.vel -= c.vel * (c.derrapando ? 0.55 : 0.35) * dt;
    c.vel = clamp(c.vel, 0, teto);

    c.foraPista = Math.abs(c.lateralPerto) > pista.def.largura;
    if (c.foraPista) {
      const tetoFora = stats.velMax * 0.42;
      if (c.vel > tetoFora) c.vel -= (c.vel - tetoFora) * 2.6 * dt;
    }

    const fatorVel = clamp(c.vel / 12, 0.3, 1.12);
    const extraDrift = c.derrapando ? c.derivaDir * stats.virada * 0.42 : 0;
    c.ang += (virar * stats.virada * fatorVel + extraDrift) * dt;
    // ângulo do MOVIMENTO persegue o ângulo do carro (grip) — deriva = atraso
    const grip = c.derrapando ? Math.max(2.6, stats.grip * 0.42) : stats.grip;
    let da = c.ang - c.dirAng;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    c.dirAng += da * Math.min(1, grip * dt);

    if (ent.usarItem) usarItemKart(e, c, stats);
  }

  if (c.boost > 0) c.boost = Math.max(0, c.boost - dt);
  if (c.escudo > 0) c.escudo = Math.max(0, c.escudo - dt);

  // integração do movimento (fora de controlo também desliza)
  const dx = Math.sin(c.dirAng), dz = Math.cos(c.dirAng);
  c.x += dx * c.vel * dt;
  c.z += dz * c.vel * dt;

  // barreiras macias
  const limite = pista.def.largura + PAREDE_EXTRA;
  const ref = amostraPerto(pista, c.x, c.z, c.iAmostra);
  if (Math.abs(ref.lateral) > limite) {
    const a = pista.amostras[ref.i];
    const sobre = Math.abs(ref.lateral) - limite;
    const sinal = Math.sign(ref.lateral);
    c.x -= a.nx * sobre * sinal;
    c.z -= a.nz * sobre * sinal;
    c.vel *= 0.82;
    c.dirAng = c.ang;
  }

  // rampas de turbo (3 por pista — retas mais limpas)
  for (const r of pista.rampas) {
    if (Math.hypot(c.x - r.x, c.z - r.z) < 4.5 && c.boost < 1.2) {
      c.boost = 1.25;
      e.eventos.push({ t: "rampa", id: c.id });
      break;
    }
  }

  // progresso ao longo da pista
  const antes = c.iAmostra;
  const ref2 = amostraPerto(pista, c.x, c.z, antes);
  c.iAmostra = ref2.i;
  c.lateralPerto = ref2.lateral;
  const m = pista.amostras.length;
  let ds = (ref2.i - antes) * PASSO_AMOSTRA;
  if (ds > (m / 2) * PASSO_AMOSTRA) ds -= m * PASSO_AMOSTRA;
  if (ds < -(m / 2) * PASSO_AMOSTRA) ds += m * PASSO_AMOSTRA;
  ds += ref2.ds - c.dsAnt;
  c.dsAnt = ref2.ds;
  ds = clamp(ds, -30, 30);
  c.sTotal += ds;
  if (ds < -2) c.contrario += dt; else c.contrario = Math.max(0, c.contrario - dt * 2);
  if (c.eJogador && c.contrario > 1.2 && e.tempo - c.ultContrario > 3) {
    c.ultContrario = e.tempo;
    e.eventos.push({ t: "contrario" });
  }
  const voltaNova = Math.floor(c.sTotal / pista.comprimento) + 1;
  if (voltaNova > c.volta && voltaNova >= 1 && voltaNova <= e.voltas) {
    c.volta = voltaNova;
    if (e.fase === "corrida") e.eventos.push({ t: "volta", id: c.id, volta: voltaNova });
  }
  if (!c.terminou && c.sTotal >= pista.comprimento * e.voltas) {
    c.terminou = true;
    c.tempoFim = e.tempo;
    const ordem = posicoesDe(e);
    c.posicao = ordem.findIndex((x) => x.id === c.id) + 1;
    e.eventos.push({ t: "chegada", id: c.id, posicao: c.posicao, tempo: c.tempoFim });
  }
}

// ── Passo da corrida (no solo corre no rAF; o servidor online corre passoCorridaMulti a 30 TPS) ──
/** Corpo comum da física/itens/progresso — entradas POR CORREDOR (solo = só o slot do jogador). */
function passoCorpo(e: EstadoCorrida, entradas: Record<number, EntradaKart>, dtC: number): void {
  const pista = e.pista;

  for (const c of e.corredores) {
    let ent: EntradaKart;
    if (c.terminou) ent = entradaParada();
    else if (c.eJogador) ent = entradas[c.id] ?? entradaParada();
    else ent = iaDecidir(e, c, dtC);
    const rb = c.eJogador ? 1 : c.iaRubber;
    if (!c.eJogador && rb > 1) c.boost = Math.max(c.boost, 0.3); // fôlego dos de trás
    const stats = rb === 1 ? c.stats : { ...c.stats, velMax: c.stats.velMax * rb };
    passoKart(e, c, ent, stats, dtC);
  }

  // colisões kart-kart — o CHOQUE perde velocidade, o CONTACTO CONTÍNUO não (v67):
  // drenar ×0,92 por STEP de sobreposição congelava pilhas de karts nos cotovelos
  // (ambos a 4 u/s com acelerar preso — o bot de trás empurra, o de cima prende).
  // Agora só perde quem se APROXIMA (fecho > 0): batida continua a custar, rastejar
  // lado a lado / pilha temporária mantém o motor a funcionar e a pilha desfaz-se.
  for (let i = 0; i < e.corredores.length; i++) {
    for (let j = i + 1; j < e.corredores.length; j++) {
      const a = e.corredores[i], b = e.corredores[j];
      const dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.4 || d < 1e-6) continue;
      const sobre = (2.4 - d) / 2;
      const nx = dx / d, nz = dz / d;
      a.x -= nx * sobre; a.z -= nz * sobre;
      b.x += nx * sobre; b.z += nz * sobre;
      const vax = Math.sin(a.dirAng) * a.vel, vaz = Math.cos(a.dirAng) * a.vel;
      const vbx = Math.sin(b.dirAng) * b.vel, vbz = Math.cos(b.dirAng) * b.vel;
      const fecho = (vax - vbx) * nx + (vaz - vbz) * nz; // >0 = um avança contra o outro (aproximação)
      if (fecho > 0.5) { a.vel *= 0.92; b.vel *= 0.92; }
    }
  }

  // projéteis
  for (let i = e.projeteis.length - 1; i >= 0; i--) {
    const p = e.projeteis[i];
    p.vida -= dtC;
    if (p.tipo !== "casca" && p.alvo >= 0) {
      // FURO v75 fechado: o alvo é ID de corredor — em ONLINE os ids vêm de
      // SLOTS_REDE e NÃO são índices do array (o míssil perseguia o kart ERRADO)
      const alvo = e.corredores.find((cc) => cc.id === p.alvo);
      if (alvo && !alvo.terminou) {
        const dif = Math.atan2(alvo.x - p.x, alvo.z - p.z) - p.ang;
        const difN = Math.atan2(Math.sin(dif), Math.cos(dif));
        const taxa = (p.tipo === "missil" ? 5.5 : 3.5) * dtC;
        p.ang += clamp(difN, -taxa, taxa);
      }
    }
    p.x += Math.sin(p.ang) * p.vel * dtC;
    p.z += Math.cos(p.ang) * p.vel * dtC;
    const ref = amostraPerto(pista, p.x, p.z, p.iAmostra);
    p.iAmostra = ref.i;
    if (p.tipo === "casca" && Math.abs(ref.lateral) > pista.def.largura + 1.5) p.vida = 0;
    for (const c of e.corredores) {
      if (c.id === p.dono || c.terminou || c.stun > 0) continue;
      if (Math.hypot(c.x - p.x, c.z - p.z) < (p.tipo === "missil" ? 2.8 : 2.2)) {
        acertar(e, c, p.tipo, p.dono);
        p.vida = 0;
        break;
      }
    }
    if (p.vida <= 0) e.projeteis.splice(i, 1);
  }

  // perigos (óleo)
  for (let i = e.perigos.length - 1; i >= 0; i--) {
    const h = e.perigos[i];
    h.vida -= dtC;
    h.idade += dtC;
    if (h.vida <= 0) { e.perigos.splice(i, 1); continue; }
    for (const c of e.corredores) {
      if (c.terminou || c.stun > 0) continue;
      if (c.id === h.dono && h.idade < 1.5) continue;
      if (Math.hypot(c.x - h.x, c.z - h.z) < 1.8) { acertar(e, c, "oleo", h.dono); h.vida = 0; break; }
    }
  }

  // caixas de item
  for (const cx of e.caixas) {
    if (!cx.viva) {
      cx.respawn -= dtC;
      if (cx.respawn <= 0) cx.viva = true;
      continue;
    }
    for (const c of e.corredores) {
      if (c.terminou || c.item || c.caixaCooldown > 0) continue;
      if (Math.hypot(c.x - cx.x, c.z - cx.z) < RAIO_CAIXA) {
        cx.viva = false; cx.respawn = RESPAWN_CAIXA;
        c.caixaCooldown = 0.4;
        const ordem = posicoesDe(e);
        const pos = ordem.findIndex((x) => x.id === c.id) + 1;
        const item = rolarItem(e.rng, pos, e.corredores.length);
        c.item = item;
        e.eventos.push({ t: "item", id: c.id, item });
        break;
      }
    }
  }
  for (const c of e.corredores) if (c.caixaCooldown > 0) c.caixaCooldown = Math.max(0, c.caixaCooldown - dtC);

  // moedas
  for (const mo of e.moedas) {
    if (!mo.viva) continue;
    for (const c of e.corredores) {
      if (c.terminou) continue;
      if (Math.hypot(c.x - mo.x, c.z - mo.z) < RAIO_MOEDA) {
        mo.viva = false;
        c.moedas++;
        if (c.eJogador) e.eventos.push({ t: "moeda", id: c.id });
        break;
      }
    }
  }

  // posições
  const ordem = posicoesDe(e);
  ordem.forEach((c, idx) => { c.posicao = idx + 1; });
}

/** SOLO: a corrida termina quando o jogador (slot 6) cruza a linha — com payout. */
export function passoCorrida(e: EstadoCorrida, entradaJogador: EntradaKart, dt: number): void {
  const dtC = Math.min(dt, 0.25); // catch-up honesto (lição v63)
  if (e.fase === "contagem") {
    e.tempoContagem -= dtC;
    if (e.tempoContagem <= 0) { e.fase = "corrida"; e.tempoContagem = 0; }
    return;
  }
  if (e.fase === "fim") return;
  e.tempo += dtC;
  passoCorpo(e, { [IDX_JOGADOR]: entradaJogador }, dtC);

  // o jogador terminou → a corrida TERMINA para ele (padrão Mario Kart)
  const jogador = e.corredores[IDX_JOGADOR];
  if (jogador.terminou) {
    e.fase = "fim";
    const recorde = jogador.tempoFim < e.recordeAnterior;
    const rec = recompensaCorrida(jogador.posicao, jogador.moedas, e.voltas);
    e.payout = { moedas: rec.moedas, xp: rec.xp, recorde };
    e.resultados = posicoesDe(e).map((c, idx) => ({ id: c.id, nome: c.nome, posicao: idx + 1, tempo: c.terminou ? c.tempoFim : 0 }));
    e.eventos.push({ t: "fim", posicao: jogador.posicao, moedas: rec.moedas, xp: rec.xp, tempo: jogador.tempoFim, recorde });
  }
}

// ══ v66 — ONLINE: sala partilhada (vários humanos + bots na MESMA grelha) ══

/** Olá validado que o cliente manda ao servidor (padrão validaOla da arena). */
export interface OlaKart { nome: string; kart: KartId; melhorias: Partial<Record<MelhoriaId, number>> }

export function validaOlaKart(bruto: unknown): OlaKart | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const o = bruto as Record<string, unknown>;
  const nome = typeof o.nome === "string"
    ? o.nome.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()
    : "";
  if (nome.length < 1 || nome.length > 16) return null;
  const kart = IDS_KARTS.find((k) => k === o.kart);
  if (!kart) return null;
  const melhorias: Partial<Record<MelhoriaId, number>> = {};
  const mBruto = typeof o.melhorias === "object" && o.melhorias !== null ? o.melhorias as Record<string, unknown> : {};
  for (const m of IDS_MELHORIAS) {
    const v = mBruto[m];
    if (typeof v === "number" && Number.isFinite(v)) melhorias[m] = Math.max(0, Math.min(NIVEL_MAX_MELHORIA, Math.floor(v)));
  }
  return { nome, kart, melhorias };
}

/** Slots de grelha dos HUMANOS (o 1.º fica no slot 6 — igual ao solo; os restantes nos pares alternados). */
export const SLOTS_REDE = [6, 8, 10, 0, 2, 4, 1, 3, 5, 7, 9, 11];

/** Nova corrida da SALA: humanos nos primeiros slots de SLOTS_REDE, bots preenchem o resto. */
export function novaCorridaOnline(opts: {
  pista: Pista;
  voltas?: number;
  jogadores: OlaKart[];
  semente?: number;
}): EstadoCorrida {
  const rng = rng32(opts.semente ?? ((Math.random() * 2 ** 31) | 0));
  const voltas = clamp(Math.round(opts.voltas ?? VOLTAS_OMISSAO), VOLTAS_MIN, VOLTAS_MAX);
  const pista = opts.pista;
  const L = pista.comprimento;
  const humanos = opts.jogadores.slice(0, MAX_CORREDORES);
  const corredores: Corredor[] = [];
  for (let slot = 0; slot < MAX_CORREDORES; slot++) {
    const h = slot < humanos.length ? humanos[slot] : null;
    const id = SLOTS_REDE[slot];
    const kart: KartId = h ? h.kart : IDS_KARTS[id % IDS_KARTS.length];
    const linha = Math.floor(id / 2);
    const lateral = (id % 2 === 0 ? -1 : 1) * 2.3;
    const s = L - (8 + linha * 5); // ATRÁS da linha
    const p = posicaoNaPista(pista, s, lateral);
    const stats = h ? statsDe(h.kart, h.melhorias) : statsDe(kart, {});
    const ref = amostraPerto(pista, p.x, p.z, p.i);
    const skill = h ? 1 : 0.7 + rng() * 0.27; // v77: leque largo — de «Turbo Tia» (0,70) a pro (0,97)
    corredores.push({
      id,
      nome: h ? h.nome : NOMES_BOTS[slot % NOMES_BOTS.length],
      kart, cor: h ? KARTS[kart].cor : CORES_BOTS[(slot + 10) % CORES_BOTS.length],
      eJogador: !!h,
      x: p.x, z: p.z, ang: p.ang, dirAng: p.ang, vel: 0,
      lateralPerto: ref.lateral,
      derrapando: false, derivaDir: 0, derivaCarga: 0,
      boost: 0, stun: 0, escudo: 0, foraPista: false, contrario: 0, ultContrario: -9,
      iAmostra: p.i, sTotal: s - L, dsAnt: ref.ds,
      volta: 0, terminou: false, tempoFim: 0, posicao: id + 1, moedas: 0,
      item: null, itens3: 0, caixaCooldown: 0,
      stats,
      iaRubber: 1,
      iaOffset: h ? 0 : (rng() - 0.5) * pista.def.largura * 1.1,
      iaSkill: skill,
      iaItemTimer: 2 + rng() * 4,
      iaFrenagem: 0.6 + rng() * 0.5,
      iaDesvio: 0,
      // v77: reflexo pela DESTREZA (0,25…1) — a fórmula da v76 com o leque largo
      // punha 0,54 s no piloto fraco (fora do intervalo honesto 0,04-0,4)
      iaLargada: h ? 0 : 0.3 - clamp((skill - 0.78) / 0.17, 0.25, 1) * 0.22 + rng() * 0.05,
    });
  }
  return {
    fase: "contagem",
    tempoContagem: 3.9,
    tempo: 0,
    voltas,
    pista,
    corredores,
    projeteis: [],
    perigos: [],
    caixas: pista.caixas.map((c) => ({ x: c.x, z: c.z, viva: true, respawn: 0 })),
    moedas: pista.moedas.map((c) => ({ x: c.x, z: c.z, viva: true })),
    eventos: [],
    rng,
    seqId: 1,
    recordeAnterior: Infinity, // recorde é DO APARELHO de cada cliente (payout local)
    resultados: [],
    payout: null,
  };
}

/** MULTI (servidor 30 TPS): entradas POR CORREDOR — a sala fecha quando TODOS os humanos chegam (sem payout: cada cliente calcula o seu localmente). */
export function passoCorridaMulti(e: EstadoCorrida, entradas: Record<number, EntradaKart>, dt: number): void {
  const dtC = Math.min(dt, 0.25);
  if (e.fase === "contagem") {
    e.tempoContagem -= dtC;
    if (e.tempoContagem <= 0) { e.fase = "corrida"; e.tempoContagem = 0; }
    return;
  }
  if (e.fase === "fim") return;
  e.tempo += dtC;
  passoCorpo(e, entradas, dtC);

  const humanos = e.corredores.filter((c) => c.eJogador);
  if (humanos.length > 0 && humanos.every((c) => c.terminou)) {
    e.fase = "fim";
    e.resultados = posicoesDe(e).map((c, idx) => ({ id: c.id, nome: c.nome, posicao: idx + 1, tempo: c.terminou ? c.tempoFim : 0 }));
    e.eventos.push({ t: "fimSala" });
  }
}

// ── Gancho de teste (Node): smoke test determinístico de corrida completa ──
export function simularCorrida(opts: Parameters<typeof novaCorrida>[0] & { dt?: number; maxSegundos?: number }): { estado: EstadoCorrida; passos: number } {
  const e = novaCorrida(opts);
  const dt = opts.dt ?? 1 / 30;
  const teto = opts.maxSegundos ?? 1200;
  let passos = 0;
  while (e.fase !== "fim" && passos * dt < teto) {
    const j = e.corredores[IDX_JOGADOR];
    const m = e.pista.amostras.length;
    const alvo = e.pista.amostras[(j.iAmostra + 12) % m];
    const dif = Math.atan2(alvo.x - j.x, alvo.z - j.z) - j.ang;
    passoCorrida(e, { acelerar: true, travar: false, virar: clamp(Math.atan2(Math.sin(dif), Math.cos(dif)) * 2.5, -1, 1), derrapar: false, usarItem: false }, dt);
    passos++;
  }
  return { estado: e, passos };
}
