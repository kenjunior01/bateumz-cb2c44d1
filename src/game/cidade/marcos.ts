// ============================================================
// CIDADE BATEU — Marcos de exploração (v38)
// Padrão estudado do Veloren: Waypoint + WaypointArea(raio) —
// common/src/comp/location.rs:7,34 (descoberta por proximidade);
// nós: marcos com raio próprio, journal local honesto.
//
// ZERO INVENÇÃO: os 6 marcos naturais foram MEDIDOS no worldgen real
// (SEED_CIDADE=20251103) com a sonda scripts/sonda-marcos-v38.mjs
// (esbuild+node, corria o próprio MundoCidade) — altura, bioma e bloco
// de topo são os valores medidos em 2026-11-04. Nomes descrevem só o
// que o terreno provado tem. Os urbanos são as estruturas do gerador.
// ============================================================

import { POS_CASA, POS_TROFEUS, POS_QUIOSQUE, ALTURA_PLATEAU } from "./cidade";

export interface Marco {
  id: string;
  nome: string;              // nome próprio (como os distritos — não traduzido)
  desc: string;              // facto medido / papel real na cidade
  x: number; z: number;
  /** Altura da descoberta (y) — para o rótulo e o gatilho 3D. */
  y: number;
  natural: boolean;          // fora do plateau (conta para capítulos da cadeia)
  xp: number;                // XP da primeira descoberta
}

/** Plateau raio 58, fusão até 72 (cidade.ts) — natural = dist > RAIO_FUSAO. */
const natural = (x: number, z: number) => Math.hypot(x, z) > 72;

export const MARCOS: Marco[] = [
  // ── Urbanos (estruturas do gerador, cidade.ts) ──
  { id: "praca",    nome: "Praça do Imbondeiro", desc: "O coração da cidade — sob a copa do baobá.",        x: 0, z: 0, y: ALTURA_PLATEAU + 1, natural: false, xp: 10 },
  { id: "casa",     nome: "Tua Casa",            desc: "O teu lar: cama, baú e a mesa de criação.",          x: POS_CASA[0], z: POS_CASA[1], y: ALTURA_PLATEAU + 1, natural: false, xp: 15 },
  { id: "trofeus",  nome: "Sala de Troféus",     desc: "O pavilhão das tuas conquistas reais.",              x: POS_TROFEUS[0], z: POS_TROFEUS[1], y: ALTURA_PLATEAU + 1, natural: false, xp: 10 },
  { id: "quiosque", nome: "Quiosque da Praça",   desc: "Rádios PALOP ao vivo e o quiz com perguntas reais.", x: POS_QUIOSQUE[0], z: POS_QUIOSQUE[1], y: ALTURA_PLATEAU + 1, natural: false, xp: 10 },
  // ── Naturais (medidos pela sonda — nada inventado) ──
  // (90,0)   altura=37 planície relva  → +3 acima do plateau
  { id: "alto_leste", nome: "Alto do Leste",       desc: "Relva a 37 de altura (medido): sobe 3 acima do plateau a leste.", x: 90, z: 0, y: 37, natural: true, xp: 25 },
  // (0,-90)  altura=42 deserto areia → o ponto alto medido perto da cidade
  { id: "colina_areias", nome: "Colina das Areias", desc: "Areia a 42 de altura (medido): o alto de areia mais perto da cidade.", x: 0, z: -90, y: 42, natural: true, xp: 30 },
  // (-110,110) altura=42 planície relva
  { id: "miradouro_so", nome: "Miradouro do Sudoeste", desc: "Relva a 42 de altura (medido): vista larga sobre a fusão da cidade.", x: -110, z: 110, y: 42, natural: true, xp: 30 },
  // (60,100) topo=FOLHAS → copa de árvore real no gerador
  { id: "arvore_solitaria", nome: "Árvore do Caminho Sul", desc: "Copa de folhas a 37 de altura (medido): a sombra a caminho do sul.", x: 60, z: 100, y: 37, natural: true, xp: 25 },
  // (-90,0) altura=33 deserto areia → desce abaixo do nível do plateau
  { id: "areias_poente", nome: "Areias do Poente", desc: "Areia de deserto a 33 de altura (medido): abaixo do nível da cidade.", x: -90, z: 0, y: 33, natural: true, xp: 25 },
  // (120,60) altura=37 planície relva
  { id: "campos_sudeste", nome: "Campos de Sudeste", desc: "Planície de relva a 37 de altura (medido): campo aberto além da fusão.", x: 120, z: 60, y: 37, natural: true, xp: 25 },
];

export const TOTAL_NATURAIS = MARCOS.filter((m) => m.natural).length;

/** Marco mais próximo dentro do raio (padrão WaypointArea, location.rs:34).
 *  `raio` por defeito é o da dificuldade do perfil — quem chama decide. */
export function marcoPerto(x: number, z: number, raio = 10): { marco: Marco; dist: number } | null {
  let melhor: { marco: Marco; dist: number } | null = null;
  for (const m of MARCOS) {
    const d = Math.hypot(x - m.x, z - m.z);
    if (d <= raio && (!melhor || d < melhor.dist)) melhor = { marco: m, dist: d };
  }
  return melhor;
}

/** TODOS os marcos no raio, do mais perto ao mais longe (v38 — furo fechado:
 *  com "só o mais próximo", o marco da praça nunca descobria enquanto a
 *  Sala de Troféus, mais perto, estivesse em alcance). */
export function marcosPerto(x: number, z: number, raio = 10): { marco: Marco; dist: number }[] {
  const dentro: { marco: Marco; dist: number }[] = [];
  for (const m of MARCOS) {
    const d = Math.hypot(x - m.x, z - m.z);
    if (d <= raio) dentro.push({ marco: m, dist: d });
  }
  return dentro.sort((a, b) => a.dist - b.dist);
}

export function marcoPorId(id: string): Marco | undefined {
  return MARCOS.find((m) => m.id === id);
}
