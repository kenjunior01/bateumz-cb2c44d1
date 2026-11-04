// ============================================================
// CIDADE BATEU — Missões urbanas (locais e honestas)
// Tudo determinístico por dia; guardado em localStorage.
// Zero dados falsos: uma missão só está feita quando o jogador
// realmente chega ao local (verificado por proximidade 3D).
//
// v38 — camadas novas, padrões do Veloren:
//  · XP de atividade real → progressao.ts (curva citada do skillset).
//  · Cadeia «Roteiro do Imbondeiro» — 6 capítulos verificáveis
//    localmente (o Veloren NÃO tem missões/quests — mundo aberto puro;
//    fonte: clone real não contém sistema de quests em common/src —
//    diferenciador documentado em docs/REA-progressao-v38.md).
//  · Alvos diários respondem à dificuldade (DIFICULDADES).
// ============================================================

import { DISTRITOS } from "./cidade";
import {
  DIFICULDADES, lerPerfil, guardarPerfil, ganharXP, multXPExploracao,
  bonusCreditoMissao, type Perfil,
} from "./progressao";

const K_ESTADO = "bateu_cidade_missao";
const K_CREDITOS = "bateu_cidade_creditos";
export const CREDITO_POR_MISSAO = 15;
const XP_VISITA = 8;
const XP_MISSAO = 40;
const XP_QUIZ_ACERTO = 5;
const XP_CAPITULO = 60;
const CREDITO_CAPITULO = 10;

export interface Missao {
  id: string;
  desc: string;
  alvo: number;            // quantos "pontos" precisa
  distritoAlvo?: string;   // visita específica exigida (id do distrito)
  tipo: "visitas" | "destino";
}

export interface EstadoMissao {
  dia: string;
  visitados: string[];   // ids de portais visitados hoje
  reclamadas: string[];  // ids de missões concluídas hoje
}

const hojeISO = () => new Date().toISOString().slice(0, 10);

export function estadoMissao(): EstadoMissao {
  try {
    const raw = localStorage.getItem(K_ESTADO);
    if (raw) {
      const e = JSON.parse(raw) as EstadoMissao;
      if (e.dia === hojeISO()) return { dia: e.dia, visitados: e.visitados ?? [], reclamadas: e.reclamadas ?? [] };
    }
  } catch { /* estado novo */ }
  return { dia: hojeISO(), visitados: [], reclamadas: [] };
}

function guardarEstado(e: EstadoMissao) {
  try { localStorage.setItem(K_ESTADO, JSON.stringify(e)); } catch { /* quota */ }
}

/** As missões de hoje — determinísticas por dia (mesmas para todos),
 *  alvo do circuito ajustado pela dificuldade do perfil. */
export function missoesDeHoje(): Missao[] {
  const diaSemana = new Date().getUTCDay(); // 0..6 — rotação justa pelos distritos
  const destaque = DISTRITOS[diaSemana % DISTRITOS.length];
  const alvo = DIFICULDADES[lerPerfil().dificuldade].alvoVisitas;
  return [
    { id: "circuito", desc: `Visita ${alvo} distritos da cidade`, alvo, tipo: "visitas" },
    { id: `destaque_${destaque.id}`, desc: `Chega ao destaque do dia: ${destaque.nome}`, alvo: 1, distritoAlvo: destaque.id, tipo: "destino" },
    { id: "lar", desc: "Encontra a tua casa e entra", alvo: 1, tipo: "destino" },
  ];
}

export function creditosCidade(): number {
  try { return Number(localStorage.getItem(K_CREDITOS)) || 0; } catch { return 0; }
}

function adicionarCreditos(n: number) {
  try { localStorage.setItem(K_CREDITOS, String(creditosCidade() + n)); } catch { /* quota */ }
}

/** v34 — ganhos de atividade real além das missões (ex.: quiz da praça).
 *  Só é chamada depois de a atividade acontecer de facto no jogo. */
export function adicionarCreditosCidade(n: number) {
  if (!Number.isFinite(n) || n <= 0) return;
  adicionarCreditos(Math.floor(n));
}

/** Créditos reais que uma missão diária paga AGORA (dificuldade + Cidadão). */
export function creditoMissaoAtual(p?: Perfil): number {
  const perfil = p ?? lerPerfil();
  const base = Math.round(CREDITO_POR_MISSAO * DIFICULDADES[perfil.dificuldade].multCred);
  return base + bonusCreditoMissao(perfil);
}

// ── Cadeia «Roteiro do Imbondeiro» (6 capítulos, sempre os mesmos) ──
export interface Capitulo {
  id: string;
  titulo: string;
  desc: string;
  /** Alvo do progresso (para barras). */
  alvo: number;
  /** Calcula o progresso atual (0..alvo) a partir do perfil. */
  prog: (p: Perfil) => number;
}

export const ROTEIRO: Capitulo[] = [
  { id: "lar",        titulo: "O primeiro lar",      desc: "Entra na Tua Casa",                       alvo: 1, prog: (p) => (p.cadeiaVisitados.includes("__casa__") ? 1 : 0) },
  { id: "quiosque",   titulo: "Vozes da cidade",     desc: "Visita o Quiosque da Praça",              alvo: 1, prog: (p) => (p.cadeiaVisitados.includes("__quiosque__") ? 1 : 0) },
  { id: "quiz3",      titulo: "Saber da praça",      desc: "Acerta 3 perguntas no Quiz da Praça",     alvo: 3, prog: (p) => Math.min(3, p.cadeiaQuiz) },
  { id: "naturais2",  titulo: "Além da fusão",       desc: "Descobre 2 marcos naturais fora da cidade", alvo: 2, prog: (p) => Math.min(2, p.marcos.filter((id) => id === "alto_leste" || id === "colina_areias" || id === "miradouro_so" || id === "arvore_solitaria" || id === "areias_poente" || id === "campos_sudeste").length) },
  { id: "noite",      titulo: "Noite na cidade",     desc: "Fica na praça quando a noite chega",      alvo: 1, prog: (p) => (p.cadeiaNoite ? 1 : 0) },
  { id: "circuito8",  titulo: "Cidadão do mundo",    desc: "Visita 8 dos 10 distritos (sempre, não só hoje)", alvo: 8, prog: (p) => Math.min(8, p.cadeiaVisitados.filter((id) => DISTRITOS.some((d) => d.id === id)).length) },
];

/** Estado legível da cadeia para HUD/Diário. */
export function estadoCadeia(p: Perfil): {
  completo: boolean; indice: number; capitulo?: Capitulo; prog: number; alvo: number;
} {
  if (p.cadeia >= ROTEIRO.length) return { completo: true, indice: ROTEIRO.length, prog: 1, alvo: 1 };
  const cap = ROTEIRO[p.cadeia];
  return { completo: false, indice: p.cadeia, capitulo: cap, prog: cap.prog(p), alvo: cap.alvo };
}

function avancarCadeia(p: Perfil): Capitulo[] {
  const feitos: Capitulo[] = [];
  let guardou = false;
  for (let guard = 0; guard < 3; guard++) {
    if (p.cadeia >= ROTEIRO.length) break;
    const cap = ROTEIRO[p.cadeia];
    if (cap.prog(p) < cap.alvo) break;
    // capítulo fechado: paga e avança
    const dif = DIFICULDADES[p.dificuldade];
    adicionarCreditos(Math.round(CREDITO_CAPITULO * dif.multCred));
    ganharXP(p, XP_CAPITULO);
    p.cadeia += 1;
    feitos.push(cap);
    guardou = true;
  }
  if (guardou) guardarPerfil(p);
  return feitos;
}

/** Registra acertos do Quiz da Praça (chamado só depois do quiz real).
 *  Paga XP (créditos são pagos pelo próprio quiz, com bónus do Sábio). */
export function registarQuiz(acertos: number): { xpGanho: number; capitulos: Capitulo[] } {
  const n = Math.max(0, Math.floor(acertos || 0));
  if (n <= 0) return { xpGanho: 0, capitulos: [] };
  const p = lerPerfil();
  p.cadeiaQuiz += n;
  const ev = ganharXP(p, XP_QUIZ_ACERTO * n);
  const capitulos = avancarCadeia(ev.perfil);
  return { xpGanho: Math.round(XP_QUIZ_ACERTO * n * DIFICULDADES[p.dificuldade].multXP), capitulos };
}

/** Registra que o jogador viveu o anoitecer na praça (chamado pela página
 *  no momento em que `noite` passa a true com o jogador a <10 blocos do centro). */
export function registarNoitePraca(): Capitulo[] {
  const p = lerPerfil();
  if (p.cadeiaNoite) return [];
  p.cadeiaNoite = true;
  guardarPerfil(p);
  return avancarCadeia(p);
}

/** Registra a descoberta REAL de um marco (a página garante proximidade).
 *  Devolve null se já estava descoberto. */
export function descobrirMarco(id: string): { xpGanho: number; capitulos: Capitulo[] } | null {
  const p = lerPerfil();
  if (p.marcos.includes(id)) return null;
  p.marcos.push(id);
  // base 25 × Explorador (entrada de ganharXP) × dificuldade (dentro de ganharXP);
  // xpGanho exibe EXATAMENTE o que foi concedido (mesmas duas arredondagens)
  const q = Math.round(25 * multXPExploracao(p));
  ganharXP(p, q);
  const xpGanho = Math.round(q * DIFICULDADES[p.dificuldade].multXP);
  const capitulos = avancarCadeia(p);
  return { xpGanho, capitulos };
}

/** Registra uma visita a um portal (chamada só quando o jogador está mesmo lá).
 *  Devolve as missões concluídas por este registo ([] se nenhuma). */
export function registarVisita(idPortal: string): Missao[] {
  const e = estadoMissao();
  if (!e.visitados.includes(idPortal)) e.visitados.push(idPortal);

  // XP da visita (1.ª vez hoje — marcador próprio no estado diário)
  // + cadeia persistente (cadeiaVisitados nunca recomeça)
  const p = lerPerfil();
  if (!e.reclamadas.includes(`xp_${idPortal}`)) {
    e.reclamadas.push(`xp_${idPortal}`);
    ganharXP(p, Math.round(XP_VISITA * multXPExploracao(p)));
    if (!p.cadeiaVisitados.includes(idPortal)) p.cadeiaVisitados.push(idPortal);
    guardarPerfil(p);
    avancarCadeia(p);
  }

  const concluidas: Missao[] = [];
  const creditoUnit = creditoMissaoAtual(p);
  for (const m of missoesDeHoje()) {
    if (e.reclamadas.includes(m.id)) continue;
    const feita =
      m.tipo === "visitas"
        ? e.visitados.length >= m.alvo
        : m.id === "lar" ? idPortal === "__casa__" : idPortal === m.distritoAlvo || e.visitados.includes(m.distritoAlvo ?? "");
    if (feita) {
      e.reclamadas.push(m.id);
      adicionarCreditos(creditoUnit);
      ganharXP(p, XP_MISSAO);
      concluidas.push(m);
    }
  }
  guardarEstado(e);
  if (concluidas.length) avancarCadeia(lerPerfil());
  return concluidas;
}

/** Progresso de uma missão para mostrar no HUD. */
export function progressoMissao(m: Missao, e: EstadoMissao): number {
  if (m.tipo === "visitas") return Math.min(m.alvo, e.visitados.length);
  return e.reclamadas.includes(m.id) ? 1 : 0;
}
