// ============================================================
// CIDADE BATEU — Missões urbanas diárias (locais e honestas)
// Tudo determinístico por dia; guardado em localStorage.
// Zero dados falsos: uma missão só está feita quando o jogador
// realmente chega ao local (verificado por proximidade 3D).
// ============================================================

import { DISTRITOS } from "./cidade";

const K_ESTADO = "bateu_cidade_missao";
const K_CREDITOS = "bateu_cidade_creditos";
const CREDITO_POR_MISSAO = 15;

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

/** As 3 missões de hoje — determinísticas por dia (mesmas para todos). */
export function missoesDeHoje(): Missao[] {
  const diaSemana = new Date().getUTCDay(); // 0..6 — rotação justa pelos distritos
  const destaque = DISTRITOS[diaSemana % DISTRITOS.length];
  return [
    { id: "circuito", desc: "Visita 4 distritos da cidade", alvo: 4, tipo: "visitas" },
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

/** Registra uma visita a um portal (chamada só quando o jogador está mesmo lá).
 *  Devolve as missões concluídas por este registo ([] se nenhuma). */
export function registarVisita(idPortal: string): Missao[] {
  const e = estadoMissao();
  if (!e.visitados.includes(idPortal)) e.visitados.push(idPortal);
  const concluidas: Missao[] = [];
  for (const m of missoesDeHoje()) {
    if (e.reclamadas.includes(m.id)) continue;
    const feita =
      m.tipo === "visitas"
        ? e.visitados.length >= m.alvo
        : m.id === "lar" ? idPortal === "__casa__" : idPortal === m.distritoAlvo || e.visitados.includes(m.distritoAlvo ?? "");
    if (feita) {
      e.reclamadas.push(m.id);
      adicionarCreditos(CREDITO_POR_MISSAO);
      concluidas.push(m);
    }
  }
  guardarEstado(e);
  return concluidas;
}

/** Progresso de uma missão para mostrar no HUD. */
export function progressoMissao(m: Missao, e: EstadoMissao): number {
  if (m.tipo === "visitas") return Math.min(m.alvo, e.visitados.length);
  return e.reclamadas.includes(m.id) ? 1 : 0;
}
