// ============================================================
// BATEU RPG: LENDAS — NÚCLEO ISOMÓRFICO (v41 · v48)
// Padrão estudado do Veloren (docs/REA-veloren-v35.md): o crate
// `common` é partilhado entre client e servidor para que as duas
// pontas apliquem AS MESMAS regras. Este ficheiro corre IGUAL no
// browser (vite) e no Node (type stripping — verificado na v37).
// zero DOM · zero three.js · fonte única da verdade.
// v48 — o único import é DADOS puros do motor (I/B de constants.ts,
// padrão do core da cidade desde a v47): o espólio dos baús refere
// os IDs REAIS dos itens em vez de duplicar números (extensão .ts
// explícita — o Node não resolve imports sem extensão).
//
// Diferenciação honesta (documentada no REA-progressao-v38): o
// Veloren NÃO tem seletor de dificuldade — só Hardcore (permadeath,
// common/src/comp/hardcore.rs:5). Os nossos 3 níveis com efeitos
// mensuráveis são um diferenciador próprio. As curvas de XP seguem
// a FORMA matemática do skillset (logística — skillset/mod.rs:101),
// nunca código GPL.
// ============================================================

import { B, I } from "../blocos/constants.ts";

// ── Mundo ─────────────────────────────────────────────────────
export const SEED_RPG = 20251113;          // fixo: todos os jogadores vêem o mesmo mundo
/** Altura plana da Planície da Aldeia (spawn) — determinística. */
export const ALTURA_ALDEIA = 32;
/** Spawn: centro da Aldeia Inicial. */
export const SPAWN_ALDEIA: [number, number] = [2.5, 4.5];

// ── Dificuldade (diferenciador próprio, não existe no Veloren) ──
export type DificuldadeRpg = "medio" | "dificil" | "lenda";
export interface RegrasDificuldadeRpg {
  id: DificuldadeRpg;
  nome: string;
  desc: string;
  /** Multiplicador de vida dos inimigos. */
  multHpMob: number;
  /** Multiplicador de dano recebido. */
  multDanoMob: number;
  /** Multiplicador de XP ganho. */
  multXP: number;
  /** Multiplicador de créditos de missões. */
  multCred: number;
  /** Alcance (blocos) para descobrir um POI. */
  raioPoi: number;
  /** Frequência de spawns hostis (1 = base). */
  freqSpawn: number;
}

export const DIFICULDADES_RPG: Record<DificuldadeRpg, RegrasDificuldadeRpg> = {
  medio: {
    id: "medio", nome: "MÉDIO",
    desc: "O equilíbrio dos contos. Inimigos como contam os bardos, recompensas justas.",
    multHpMob: 1.0, multDanoMob: 1.0, multXP: 1.0, multCred: 1.0, raioPoi: 14, freqSpawn: 1.0,
  },
  dificil: {
    id: "dificil", nome: "DIFÍCIL",
    desc: "Para quem já sobreviveu a uma noite no Miombo. Inimigos 50% mais fortes, XP e créditos +25%.",
    multHpMob: 1.5, multDanoMob: 1.5, multXP: 1.25, multCred: 1.25, raioPoi: 12, freqSpawn: 1.35,
  },
  lenda: {
    id: "lenda", nome: "LENDA",
    desc: "Os guardiões acordam. Inimigos mais que duplicados, XP e créditos +60% — só para lendas vivas.",
    multHpMob: 2.2, multDanoMob: 2.2, multXP: 1.6, multCred: 1.6, raioPoi: 10, freqSpawn: 1.8,
  },
};
export const ORDEM_DIFICULDADE: DificuldadeRpg[] = ["medio", "dificil", "lenda"];

// ── Regiões (geografia do jogo — biomas PALOP reais como inspiração) ──
export interface Regiao {
  id: string;
  nome: string;
  nivel: number;       // nível recomendado — escala os inimigos da região
  cor: string;         // cor de acento (HUD/banner)
  cx: number; cz: number; raio: number;
  desc: string;
}

export const REGIOES: Regiao[] = [
  { id: "aldeia",    nome: "Planície da Aldeia",  nivel: 1, cor: "#facc15", cx: 0,   cz: 0,   raio: 26, desc: "O lar. Casas de pau-a-pino, fogueira acesa e o imbondeiro dos contos." },
  { id: "planalto",  nome: "Planalto dos Ventos", nivel: 2, cor: "#f59e0b", cx: -56, cz: 14,  raio: 34, desc: "Relva alta onde o vento nunca para. Zumbis vagam ao anoitecer." },
  { id: "miombo",    nome: "Miombo Profundo",     nivel: 3, cor: "#22c55e", cx: 58,  cz: -42, raio: 36, desc: "Floresta densa de miombo — bioma real do leste de Moçambique e Angola. Aranhas caçam aqui." },
  { id: "costa",     nome: "Costa dos Corais",    nivel: 3, cor: "#22d3ee", cx: 8,   cz: 64,  raio: 36, desc: "Areia branca e mar. O porto dos ventos espera corsários." },
  { id: "serra",     nome: "Serra do Norte",      nivel: 4, cor: "#a78bfa", cx: -18, cz: -80, raio: 34, desc: "Pedra e altura. Da torre vê-se metade do mundo." },
  { id: "cinzas",    nome: "Terra de Cinzas",     nivel: 5, cor: "#fb923c", cx: 82,  cz: 52,  raio: 30, desc: "Solo vulcânico e estouradores. Ninguém acampa duas vezes aqui." },
];

/** Região em (x, z) — null = Terras Selvagens (entre regiões). */
export function regiaoEm(x: number, z: number): Regiao | null {
  let melhor: Regiao | null = null;
  let melhorD = Infinity;
  for (const r of REGIOES) {
    const d = Math.hypot(x - r.cx, z - r.cz);
    if (d <= r.raio && d < melhorD) { melhor = r; melhorD = d; }
  }
  return melhor;
}

/** As Terras Selvagens (fora de qualquer região) — nível 2, hostil. */
export const NIVEL_SELVAGEM = 2;

// ── POIs (pontos de interesse com baú de tesouro) ──────────────
export type TipoPoi = "aldeia" | "torre" | "acampamento" | "ruinas" | "cova" | "baoba" | "porto" | "forja";
export interface Poi {
  id: string;
  nome: string;
  tipo: TipoPoi;
  regiao: string;      // id da região
  x: number; z: number;
  /** Baús do POI (coordenadas do mundo — geradas pelo MundoRPG). */
  baus: { chave: string; x: number; y: number; z: number }[];
  desc: string;
}

const bau = (poi: string, n: number, x: number, y: number, z: number) => ({ chave: `poi:${poi}:${n}`, x, y, z });

export const POIS: Poi[] = [
  { id: "aldeia",  nome: "Aldeia Inicial",       tipo: "aldeia",      regiao: "aldeia",   x: 0,   z: 2,   baus: [bau("aldeia", 1, 4, ALTURA_ALDEIA + 1, 5)],  desc: "Onde tudo começa. A fogueira nunca apaga." },
  { id: "torre",   nome: "Torre do Vigia",       tipo: "torre",       regiao: "aldeia",   x: 14,  z: -16, baus: [bau("torre", 1, 14, ALTURA_ALDEIA + 10, -16)], desc: "Do topo vê-se o Planalto inteiro — e o que nele se move." },
  { id: "cacadores", nome: "Acampamento dos Caçadores", tipo: "acampamento", regiao: "planalto", x: -52, z: 18, baus: [bau("cacadores", 1, -52, 35, 18)], desc: "Tendas, um espeto e as histórias de quem voltou." },
  { id: "forja",   nome: "Forja Perdida",        tipo: "forja",       regiao: "cinzas",   x: 82,  z: 52,  baus: [bau("forja", 1, 82, 34, 52)], desc: "Fornalhas ainda mornas. Alguém fundiu ferro aqui — há pouco tempo." },
  { id: "ruinas",  nome: "Ruínas de Kivulivuli", tipo: "ruinas",      regiao: "miombo",   x: 58,  z: -42, baus: [bau("ruinas", 1, 54, 33, -46), bau("ruinas", 2, 62, 33, -38)], desc: "Muros partidos de um reino que os mapas esqueceram. O Guardião dorme aqui." },
  { id: "cova",    nome: "Cova dos Morcegos",    tipo: "cova",        regiao: "miombo",   x: 70,  z: -30, baus: [bau("cova", 1, 70, 28, -31)], desc: "Uma boca de pedra na encosta. Dentro, o fresco da terra." },
  { id: "baoba",   nome: "Baobá Ancião",         tipo: "baoba",       regiao: "planalto", x: -38, z: 34,  baus: [bau("baoba", 1, -36, 33, 34)], desc: "A árvore mais velha da planície. Há quem peça desculpa antes de tocar-lhe." },
  { id: "porto",   nome: "Porto dos Ventos",     tipo: "porto",       regiao: "costa",    x: 10,  z: 66,  baus: [bau("porto", 1, 10, 32, 68)], desc: "Cais de tábuas gastas. O mar devolve o que leva." },
];

export function poiEm(x: number, z: number, raio: number): Poi | null {
  let melhor: Poi | null = null;
  let melhorD = Infinity;
  for (const p of POIS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d <= raio && d < melhorD) { melhor = p; melhorD = d; }
  }
  return melhor;
}

// ── Espólio dos baús (v48) — a mesa é DETERMINÍSTICA e IGUAL para
// todos os jogadores (mesma filosofia da semente fixa: o baú X do POI Y
// entrega sempre o mesmo espólio). Todos os itens são REAIS do motor
// partilhado (ITENS/BLOCOS em blocos/constants.ts) — zero item inventado.
// Coerente com cada POI: caçadores têm carne e couro, o porto tem peixe,
// a cova tem tochas, a forja guarda o peitoral de ferro do fim da lenda.
export type ItemEspolio = { id: number; qtd: number };
export const ESPOLIO_BAUS: Record<string, ItemEspolio[]> = {
  "poi:aldeia:1":    [{ id: I.PAO, qtd: 2 }, { id: I.MACA, qtd: 1 }],
  "poi:torre:1":    [{ id: B.TOCHA, qtd: 6 }, { id: I.CARNE_ASSADA, qtd: 2 }],
  "poi:cacadores:1": [{ id: I.CARNE_ASSADA, qtd: 3 }, { id: I.COURO, qtd: 1 }, { id: I.ESPADA_PEDRA, qtd: 1 }],
  "poi:baoba:1":    [{ id: I.MACA, qtd: 3 }, { id: I.PAO, qtd: 1 }],
  "poi:porto:1":    [{ id: I.PEIXE_ASSADO, qtd: 3 }, { id: I.FIO, qtd: 2 }],
  "poi:cova:1":     [{ id: B.TOCHA, qtd: 8 }, { id: I.CARNE_CRUA, qtd: 2 }],
  "poi:ruinas:1":   [{ id: I.BARRA_FERRO, qtd: 2 }, { id: I.CARNE_ASSADA, qtd: 1 }],
  "poi:ruinas:2":   [{ id: I.ARMADURA_COURO, qtd: 1 }, { id: I.PAO, qtd: 2 }],
  "poi:forja:1":    [{ id: I.ARMADURA_FERRO, qtd: 1 }, { id: I.BARRA_FERRO, qtd: 2 }],
};

// ── XP / Níveis (forma logística do skillset Veloren, escalada) ──
export const NIVEL_MAX = 30;

/** XP acumulado total para atingir o nível `n` (1 = zero XP). */
export function xpParaNivel(n: number): number {
  if (n <= 1) return 0;
  let total = 0;
  for (let k = 1; k < n; k++) total += custoNivel(k);
  return total;
}

/** Custo de subir do nível `k` para `k+1` — curva suave, nunca decrescente. */
export function custoNivel(k: number): number {
  return Math.round(60 + 18 * k + 2.2 * k * k);
}

export function nivelDe(xp: number): number {
  let n = 1;
  while (n < NIVEL_MAX && xp >= xpParaNivel(n + 1)) n++;
  return n;
}

export interface ProgressoNivel { nivel: number; atual: number; falta: number; }
export function progressoNivel(xp: number): ProgressoNivel {
  const nivel = nivelDe(xp);
  const base = xpParaNivel(nivel);
  const alvo = nivel >= NIVEL_MAX ? base : xpParaNivel(nivel + 1);
  return { nivel, atual: xp - base, falta: Math.max(0, alvo - xp) };
}

// ── Competências (padrão SkillGroupKind do Veloren, mod.rs:89) ──
export type RamoRpg = "guerreiro" | "explorador" | "sabio";
export const RAMOS_RPG: RamoRpg[] = ["guerreiro", "explorador", "sabio"];
export const NIVEL_MAX_RAMO_RPG = 3;

export const NOMES_RAMO: Record<RamoRpg, string> = {
  guerreiro: "Guerreiro",
  explorador: "Explorador",
  sabio: "Sábio",
};

/** Efeito mensurável por nível de ramo (UI e motor usam ESTAS regras). */
export const EFEITO_RAMO: Record<RamoRpg, string[]> = {
  guerreiro: ["+2 de dano por nível de golpe"],
  explorador: ["+8% de velocidade por nível (tecto 18%)", "+2 blocos de alcance de descoberta por nível"],
  sabio: ["+5% de XP por nível", "regeneração de vida fora de combate"],
};

/** Cada nível de ramo custa 1 ponto (cap 3 — como o custo total do Veloren). */
export const CUSTO_PONTO = 1;

// ── Combate (as MESMAS fórmulas no cliente e num futuro servidor) ──
// Nota honesta: o tecto de vida do motor partilhado é VIDA_MAX=20
// (blocos/constants.ts) — o guerreiro NÃO promete vida extra, só dano.

/** Dano do herói: base 3 + arma + 2/nível de guerreiro. */
export function danoHeroi(guerreiro: number, danoArma: number): number {
  return 3 + danoArma + guerreiro * 2;
}

/** Multiplicador de dano do herói sobre o golpe base do motor. */
export function multDanoHeroi(nivel: number, guerreiro: number): number {
  return 1 + (nivel - 1) * 0.06 + guerreiro * 0.5;
}

/** Velocidade: +8% por nível de explorador (tecto do motor: 1.18). */
export function escalaVelExplorador(explorador: number): number {
  return Math.min(1.18, 1 + explorador * 0.08);
}

/** Alcance de descoberta de POI: raio da dificuldade + 2/nível explorador. */
export function raioDescoberta(dif: RegrasDificuldadeRpg, explorador: number): number {
  return dif.raioPoi + explorador * 2;
}

/** XP por derrotar um inimigo — escala com região, dificuldade e sábio. */
export function xpPorKiller(
  tipo: "zumbi" | "aranha" | "estourador" | "passivo",
  nivelRegiao: number,
  dif: RegrasDificuldadeRpg,
  sabio: number,
): number {
  const base = tipo === "estourador" ? 16 : tipo === "aranha" ? 12 : tipo === "zumbi" ? 10 : 4;
  const bruto = base * (1 + (nivelRegiao - 1) * 0.25) * dif.multXP * (1 + sabio * 0.05);
  return Math.max(1, Math.round(bruto));
}

/** HP de um inimigo recém-nascido: perfil do motor × região × dificuldade. */
export function hpInimigo(hpBase: number, nivelRegiao: number, dif: RegrasDificuldadeRpg): number {
  return Math.max(1, Math.round(hpBase * (1 + (nivelRegiao - 1) * 0.35) * dif.multHpMob));
}

// ── Missões ───────────────────────────────────────────────────
export type ObjetivoTipo = "matar" | "descobrirRegiao" | "chegarPoi" | "abrirBaus" | "sobreviverNoite" | "andar";
export interface Objetivo {
  tipo: ObjetivoTipo;
  /** Alvo: tipo de inimigo ("hostil"/"zumbi"/"aranha"/"estourador"), id de região/POI, ou nº. */
  alvo: string;
  qtd: number;
  texto: string;
}
export interface Missao {
  id: string;
  titulo: string;
  historia: boolean;   // capítulo da história principal
  ordem: number;       // ordem dentro da história
  objetivos: Objetivo[];
  xp: number;
  creditos: number;
}

export const HISTORIA: Missao[] = [
  {
    id: "h1", titulo: "Chamado da Aldeia", historia: true, ordem: 1,
    objetivos: [{ tipo: "chegarPoi", alvo: "torre", qtd: 1, texto: "Sobe à Torre do Vigia" }],
    xp: 60, creditos: 10,
  },
  {
    id: "h2", titulo: "Manto da Noite", historia: true, ordem: 2,
    objetivos: [{ tipo: "matar", alvo: "hostil", qtd: 5, texto: "Derrota 5 inimigos hostis" }],
    xp: 110, creditos: 15,
  },
  {
    id: "h3", titulo: "O Miombo Profundo", historia: true, ordem: 3,
    objetivos: [
      { tipo: "descobrirRegiao", alvo: "miombo", qtd: 1, texto: "Descobre o Miombo Profundo" },
      { tipo: "matar", alvo: "aranha", qtd: 4, texto: "Derrota 4 aranhas no miombo" },
    ],
    xp: 160, creditos: 20,
  },
  {
    id: "h4", titulo: "Ruínas de Kivulivuli", historia: true, ordem: 4,
    objetivos: [
      { tipo: "chegarPoi", alvo: "ruinas", qtd: 1, texto: "Chega às Ruínas de Kivulivuli" },
      { tipo: "abrirBaus", alvo: "2", qtd: 2, texto: "Abre 2 baús de tesouro" },
    ],
    xp: 200, creditos: 25,
  },
  {
    id: "h5", titulo: "Caçada aos Estouradores", historia: true, ordem: 5,
    objetivos: [{ tipo: "matar", alvo: "estourador", qtd: 3, texto: "Derrota 3 estouradores" }],
    xp: 260, creditos: 30,
  },
  {
    id: "h6", titulo: "O Guardião das Ruínas", historia: true, ordem: 6,
    objetivos: [
      { tipo: "matar", alvo: "guardiao", qtd: 1, texto: "Derrota o Guardião das Ruínas" },
      { tipo: "descobrirRegiao", alvo: "cinzas", qtd: 1, texto: "Descobre a Terra de Cinzas" },
    ],
    xp: 420, creditos: 60,
  },
];

// ── Diárias: 3 missões determinísticas por dia (hash da data) ──
export interface MissaoDia {
  id: string;
  titulo: string;
  objetivo: Objetivo;
  xp: number;
  creditos: number;
}

/** PRNG determinístico (mulberry32) — sem imports, corre igual em toda parte. */
function aleatorio(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Língua de EXIBIÇÃO dos textos gerados (v62 — roadmap item 3). O PT
 *  continua canónico (omissão = "pt", os testes do núcleo ficam intactos);
 *  "en" devolve as mesmas missões com texto inglês — mesmo alvo, mesma qtd,
 *  mesmas recompensas. A tradução dos TÍTULOS vive em nomes.ts (tituloDiaria)
 *  para não duplicar catálogo aqui. */
export type LinguaTextos = "pt" | "en";

const MODELOS_DIARIA: { titulo: string; tipo: ObjetivoTipo; alvo: string; baseQtd: number; xp: number; cred: number }[] = [
  { titulo: "Caçada da manhã", tipo: "matar", alvo: "hostil", baseQtd: 4, xp: 45, cred: 8 },
  { titulo: "Colecionador de tesouros", tipo: "abrirBaus", alvo: "1", baseQtd: 1, xp: 40, cred: 6 },
  { titulo: "Botas gastas", tipo: "andar", alvo: "300", baseQtd: 300, xp: 40, cred: 6 },
  { titulo: "A noite que sobreviveste", tipo: "sobreviverNoite", alvo: "1", baseQtd: 1, xp: 55, cred: 10 },
  { titulo: "Roteiro do dia", tipo: "descobrirRegiao", alvo: "qualquer", baseQtd: 1, xp: 50, cred: 8 },
  { titulo: "Controlo de pragas", tipo: "matar", alvo: "zumbi", baseQtd: 6, xp: 50, cred: 9 },
];

/** Dia local (YYYY-MM-DD do fuso do jogador) — igual ao padrão das missões da cidade. */
export function diaLocal(data: Date = new Date()): string {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 3 diárias determinísticas para o dia (mesmo dia → mesmas missões, em todo o mundo). */
export function missoesDiarias(dia: string, dif: RegrasDificuldadeRpg, lingua: LinguaTextos = "pt"): MissaoDia[] {
  let h = 0;
  for (let i = 0; i < dia.length; i++) h = (Math.imul(h, 31) + dia.charCodeAt(i)) | 0;
  const rnd = aleatorio(h ^ 0x5eed);
  const escolhidas: { titulo: string; tipo: ObjetivoTipo; alvo: string; baseQtd: number; xp: number; cred: number }[] = [];
  const pool = [...MODELOS_DIARIA];
  while (escolhidas.length < 3 && pool.length > 0) {
    const i = Math.floor(rnd() * pool.length);
    escolhidas.push(pool.splice(i, 1)[0]);
  }
  return escolhidas.map((m, i) => {
    const qtd = Math.max(1, Math.round(m.baseQtd * (m.tipo === "andar" ? 1 : 1 + ordemDificuldade(dif.id) * 0.25)));
    return {
      id: `d:${dia}:${i}`,
      titulo: m.titulo,
      objetivo: { tipo: m.tipo, alvo: m.alvo, qtd, texto: textoObjetivo(m.tipo, m.alvo, qtd, lingua) },
      xp: Math.round(m.xp * dif.multXP),
      creditos: Math.round(m.cred * dif.multCred),
    };
  });
}

function ordemDificuldade(id: DificuldadeRpg): number {
  return id === "medio" ? 0 : id === "dificil" ? 1 : 2;
}

function textoObjetivo(tipo: ObjetivoTipo, alvo: string, qtd: number, lingua: LinguaTextos = "pt"): string {
  const en = lingua === "en";
  switch (tipo) {
    case "matar": return alvo === "zumbi" ? (en ? `Defeat ${qtd} zombies` : `Derrota ${qtd} zumbis`) : alvo === "aranha" ? (en ? `Defeat ${qtd} spiders` : `Derrota ${qtd} aranhas`) : alvo === "estourador" ? (en ? `Defeat ${qtd} boomers` : `Derrota ${qtd} estouradores`) : (en ? `Defeat ${qtd} hostile enemies` : `Derrota ${qtd} inimigos hostis`);
    case "abrirBaus": return en ? `Open ${qtd} treasure chest${qtd > 1 ? "s" : ""}` : `Abre ${qtd} baú${qtd > 1 ? "s" : ""} de tesouro`;
    case "andar": return en ? `Walk ${qtd} blocks` : `Caminha ${qtd} blocos`;
    case "sobreviverNoite": return en ? "Survive a full night" : "Sobrevive a uma noite inteira";
    case "descobrirRegiao": return en ? "Discover a new region" : "Descobre uma região nova";
    case "chegarPoi": return en ? `Reach the destination: ${alvo}` : `Chega ao destino: ${alvo}`;
  }
}

// ── Estado das missões (mutado por eventos, serializável) ──────
export interface EstadoMissoes {
  /** Capítulos da história concluídos (ids). */
  historiaFeitas: string[];
  /** Progresso bruto por missão da história (id → contadores por objetivo). */
  contadores: Record<string, Record<string, number>>;
  diarias: { dia: string; feitas: string[]; prog: Record<string, number> };
  concluidasTotal: number;
}

export function estadoMissoesInicial(): EstadoMissoes {
  return { historiaFeitas: [], contadores: {}, diarias: { dia: "", feitas: [], prog: {} }, concluidasTotal: 0 };
}

export interface RecompensaMissao { id: string; titulo: string; xp: number; creditos: number; diaria: boolean; }

export interface EventoJogo {
  tipo: ObjetivoTipo;
  alvo?: string;
  qtd?: number;
  dia: string;
  dif: RegrasDificuldadeRpg;
}

/** Evento de jogo → atualiza missões. Devolve missões concluídas neste evento. */
export function aplicarEvento(est: EstadoMissoes, evento: EventoJogo): RecompensaMissao[] {
  const recompensas: RecompensaMissao[] = [];
  const qtdEv = evento.qtd ?? 1;

  // ── diárias do dia ──
  if (est.diarias.dia !== evento.dia) {
    est.diarias = { dia: evento.dia, feitas: [], prog: {} };
  }
  for (const d of missoesDiarias(evento.dia, evento.dif)) {
    if (est.diarias.feitas.includes(d.id)) continue;
    const o = d.objetivo;
    if (o.tipo !== evento.tipo) continue;
    if (o.tipo === "descobrirRegiao") {
      est.diarias.prog[d.id] = (est.diarias.prog[d.id] ?? 0) + 1;
    } else if (o.tipo === "matar" && (o.alvo === evento.alvo || (o.alvo === "hostil" && evento.alvo !== "passivo" && evento.alvo !== undefined))) {
      est.diarias.prog[d.id] = (est.diarias.prog[d.id] ?? 0) + qtdEv;
    } else if (o.tipo !== "matar") {
      est.diarias.prog[d.id] = (est.diarias.prog[d.id] ?? 0) + qtdEv;
    }
    if ((est.diarias.prog[d.id] ?? 0) >= o.qtd) {
      est.diarias.feitas.push(d.id);
      recompensas.push({ id: d.id, titulo: d.titulo, xp: d.xp, creditos: d.creditos, diaria: true });
    }
  }

  // ── capítulo atual da história (o próximo não feito) ──
  const atual = HISTORIA.find((h) => !est.historiaFeitas.includes(h.id));
  if (atual) {
    const c = (est.contadores[atual.id] ??= {});
    for (const o of atual.objetivos) {
      if (o.tipo !== evento.tipo) continue;
      // regra do alvo: tipos com alvo exigem correspondência; "hostil"
      // aceita qualquer inimigo EXCETO passivos e os tipos com alvo próprio;
      // tipos sem alvo semântico (andar/abrirBaus/sobreviverNoite) contam sempre.
      const temAlvo = o.tipo === "matar" || o.tipo === "chegarPoi" || o.tipo === "descobrirRegiao";
      const alvoMatch = !temAlvo
        ? true
        : o.tipo === "matar" && o.alvo === "hostil"
          ? evento.alvo !== "passivo" && evento.alvo !== undefined
          : o.alvo === evento.alvo;
      if (!alvoMatch) continue;
      const chave = `${o.tipo}:${o.alvo}`;
      c[chave] = (c[chave] ?? 0) + qtdEv;
    }
    let completos = 0;
    for (const o of atual.objetivos) {
      const chave = `${o.tipo}:${o.alvo}`;
      if ((c[chave] ?? 0) >= o.qtd) completos++;
    }
    if (completos >= atual.objetivos.length) {
      est.historiaFeitas.push(atual.id);
      est.concluidasTotal++;
      recompensas.push({ id: atual.id, titulo: atual.titulo, xp: atual.xp, creditos: atual.creditos, diaria: false });
    }
  }

  return recompensas;
}

/** Capítulo atual (não concluído) — null = história completa. */
export function capituloAtual(est: EstadoMissoes): Missao | null {
  return HISTORIA.find((h) => !est.historiaFeitas.includes(h.id)) ?? null;
}

/** Progresso de um objetivo da história para a UI. */
export function progressoObjetivo(est: EstadoMissoes, idMissao: string, o: Objetivo): number {
  return Math.min(o.qtd, est.contadores[idMissao]?.[`${o.tipo}:${o.alvo}`] ?? 0);
}

// ── Perfil completo (o que o save guarda) ─────────────────────
export interface PerfilRpg {
  v: 41;
  dificuldade: DificuldadeRpg;
  xp: number;
  pontos: number;
  skills: Record<RamoRpg, number>;
  missoes: EstadoMissoes;
  descobertas: { regioes: string[]; pois: string[]; baus: string[] };
  creditos: number;
  kills: { hostil: number; zumbi: number; aranha: number; estourador: number; passivo: number; guardiao: number };
  mortes: number;
  blocos: number;
  /** O Guardião das Ruínas já caiu (persistido — a lenda não se refaz). */
  bossDerrotado: boolean;
  /** Última posição (para CONTINUAR) — honesto: o mundo regenera igual (semente fixa). */
  pos: [number, number, number] | null;
  /** v48: mochila do motor guardada com o perfil (36 posições + peitoral).
   *  Sem isto, o espólio dos baús desapareceria no CONTINUAR com o baú já
   *  marcado aberto (perda silenciosa — furo fechado). Opcional: saves
   *  v41 antigos não têm estes campos e continuam válidos (kit de sempre). */
  inv: ({ id: number; qtd: number } | null)[] | null;
  invArm: { id: number; qtd: number } | null;
  /** v50: itens NO CHÃO guardados com a lenda — sem isto, o loot largado
   *  (Q) ou ainda não recolhido evaporaria no CONTINUAR (perda silenciosa,
   *  o mesmo furo que a v48 fechou para a mochila). Opcional: saves antigos
   *  não têm o campo e continuam válidos (o chão nasce vazio). */
  itensChao: { id: number; qtd: number; x: number; y: number; z: number }[] | null;
  ts: number;
}

export function perfilInicial(dif: DificuldadeRpg = "medio"): PerfilRpg {
  return {
    v: 41,
    dificuldade: dif,
    xp: 0,
    pontos: 0,
    skills: { guerreiro: 0, explorador: 0, sabio: 0 },
    missoes: estadoMissoesInicial(),
    descobertas: { regioes: [], pois: [], baus: [] },
    creditos: 0,
    kills: { hostil: 0, zumbi: 0, aranha: 0, estourador: 0, passivo: 0, guardiao: 0 },
    mortes: 0,
    blocos: 0,
    bossDerrotado: false,
    pos: null,
    inv: null,
    invArm: null,
    itensChao: null,
    ts: 0,
  };
}

/** Validador de save — dados inválidos NUNCA entram (padrão do armazem.ts). */
export function validarPerfilRpg(v: unknown): PerfilRpg | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Partial<PerfilRpg>;
  if (p.v !== 41) return null;
  if (!p.dificuldade || !DIFICULDADES_RPG[p.dificuldade]) return null;
  if (typeof p.xp !== "number" || !Number.isFinite(p.xp) || p.xp < 0) return null;
  if (typeof p.pontos !== "number" || !Number.isFinite(p.pontos) || p.pontos < 0) return null;
  if (!p.skills || !RAMOS_RPG.every((r) => typeof p.skills![r] === "number" && p.skills![r] >= 0 && p.skills![r] <= NIVEL_MAX_RAMO_RPG)) return null;
  if (!p.missoes || typeof p.missoes !== "object" || !Array.isArray(p.missoes.historiaFeitas)) return null;
  if (!p.descobertas || !Array.isArray(p.descobertas.regioes) || !Array.isArray(p.descobertas.pois) || !Array.isArray(p.descobertas.baus)) return null;
  if (typeof p.creditos !== "number" || !Number.isFinite(p.creditos) || p.creditos < 0) return null;
  if (!p.kills || typeof p.kills !== "object") return null;
  if (typeof p.mortes !== "number" || typeof p.blocos !== "number") return null;
  if (typeof p.bossDerrotado !== "boolean") return null;
  if (p.pos !== null && (!Array.isArray(p.pos) || p.pos.length !== 3)) return null;
  // v48: mochila opcional — inválida NUNCA entra (cai em null e o herói
  // recebe o kit de sempre); peitoral só com id/qtd reais.
  const invValida = (a: unknown): ({ id: number; qtd: number } | null)[] | null => {
    if (a === undefined) return null;
    if (!Array.isArray(a) || a.length > 36) return null;
    return a.map((s) =>
      s && typeof s === "object" && typeof (s as any).id === "number" && (s as any).id > 0
        && typeof (s as any).qtd === "number" && (s as any).qtd > 0
        ? { id: (s as any).id, qtd: Math.floor((s as any).qtd) } : null);
  };
  const armValida = (a: unknown): { id: number; qtd: number } | null => {
    if (!a || typeof a !== "object") return null;
    const s = a as any;
    return typeof s.id === "number" && s.id > 0 ? { id: s.id, qtd: 1 } : null;
  };
  // v50: itens no chão — inválidos NUNCA entram (degradados; o mundo nasce
  // sem eles); coords não finitas e cap > 48 são cortados, não rebentam.
  const chaoValida = (a: unknown): { id: number; qtd: number; x: number; y: number; z: number }[] | null => {
    if (a === undefined) return null;
    if (!Array.isArray(a)) return null;
    const itens = a
      .filter((e) => e && typeof e === "object"
        && typeof (e as any).id === "number" && (e as any).id > 0
        && typeof (e as any).qtd === "number" && (e as any).qtd > 0
        && ["x", "y", "z"].every((k) => typeof (e as any)[k] === "number" && Number.isFinite((e as any)[k])))
      .slice(0, 48)
      .map((e) => ({ id: (e as any).id, qtd: Math.floor((e as any).qtd), x: (e as any).x, y: (e as any).y, z: (e as any).z }));
    return itens;
  };
  const base = perfilInicial(p.dificuldade);
  return {
    v: 41,
    dificuldade: p.dificuldade,
    xp: p.xp,
    pontos: p.pontos,
    skills: { guerreiro: p.skills!.guerreiro, explorador: p.skills!.explorador, sabio: p.skills!.sabio },
    missoes: p.missoes,
    descobertas: p.descobertas,
    creditos: p.creditos,
    kills: { ...base.kills, ...p.kills },
    mortes: p.mortes,
    blocos: p.blocos,
    bossDerrotado: p.bossDerrotado,
    pos: p.pos ?? null,
    inv: invValida(p.inv),
    invArm: armValida(p.invArm),
    itensChao: chaoValida(p.itensChao),
    ts: typeof p.ts === "number" ? p.ts : 0,
  };
}

/** O save é válido para CONTINUAR só se tiver algo além do perfil virgem. */
export function perfilTemProgresso(p: PerfilRpg): boolean {
  return p.xp > 0 || p.missoes.concluidasTotal > 0 || p.descobertas.regioes.length > 0 || p.descobertas.pois.length > 0 || p.kills.hostil > 0;
}

/** Texto do espólio de um baú para avisos/UI — ex.: "2× Pão, 1× Maçã".
 *  Os nomes vêm do motor partilhado (NOMES) — zero duplicação. */
export function textoEspolio(chave: string, NOMES: Record<number, string>): string {
  const esp = ESPOLIO_BAUS[chave];
  if (!esp) return "";
  return esp.map((e) => `${e.qtd}× ${NOMES[e.id] ?? "?"}`).join(", ");
}
