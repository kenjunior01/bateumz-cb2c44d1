// =============================================================
// ESPORTS AVANÇADO — BATEU
// Motor de features de nível profissional para o hub de esports:
//  · Power Rankings (rating composto, forma, streaks)
//  · Fantasy Esports (draft com orçamento, pontuação ao vivo, liga)
//  · Head-to-Head (histórico de confrontos diretos)
//  · Previsões da Comunidade (polls com odds vivas)
//  · Transmissões & Watch Parties
//  · Prize Pool com crowdfunding (embaixadores aumentam o prémio)
// Tudo funciona sem backend: motor local determinístico que corre
// ao vivo, pronto para sincronizar com Supabase quando existirem
// as tabelas `esport_fantasy_*` / `esport_polls`.
// =============================================================

import { supabase } from "@/integrations/supabase/client";
const sb: any = supabase;

// ------------------------------------------------------------
// TIPOS
// ------------------------------------------------------------

export interface PowerRankTeam {
  id: string;
  nome: string;
  tag: string;
  logo_emoji: string;
  rating: number;          // 0-100 composto
  rating_delta: number;    // subida/descida vs. semana anterior
  forma: ("W" | "L" | "D")[]; // últimos 5
  vitorias: number;
  derrotas: number;
  streak: number;          // positivo = wins, negativo = losses
  kills: number;
  deaths: number;
  kd: number;
  torque: number;          // soma de prémios ganhos (MZN)
  ranking: number;
}

export interface FantasyJogador {
  id: string;
  nome: string;
  tag: string;
  equipa: string;
  papel: "entry" | "sniper" | "support" | "capitao" | "igl";
  emoji: string;
  preco: number;           // MZN fantasy
  media_pontos: number;
  pontos_ultima: number;
  pick_rate: number;       // 0-1
  forma: number[];         // últimos 5 jogos (pontos)
}

export interface FantasySlot {
  jogador: FantasyJogador | null;
}

export interface FantasyLigaUser {
  id: string;
  nome: string;
  pontos: number;
  pontos_ronda: number;
  emblema: string;
  e_eu?: boolean;
}

export interface PollOpcao {
  id: string;
  label: string;
  votos: number;
  pct: number;
  odds: string;
}

export interface Poll {
  id: string;
  pergunta: string;
  contexto: string;
  opcoes: PollOpcao[];
  total_votos: number;
  termina_em: number;
  meu_voto: string | null;
}

export interface StreamAoVivo {
  id: string;
  titulo: string;
  canal: string;
  jogo: string;
  emoji: string;
  viewers: number;
  is_watch_party: boolean;
  destaque: boolean;
}

export interface PrizePoolInfo {
  base: number;
  crowdfunding: number;
  meta: number;
  contribuidores: number;
  distribuicao: { lugar: number; pct: number; valor: number }[];
}

export interface H2H {
  equipaA: { nome: string; vitorias: number; emoji: string };
  equipaB: { nome: string; vitorias: number; emoji: string };
  empates: number;
  ultimos: { data: string; resultado: string; placar: string }[];
}

// ------------------------------------------------------------
// DADOS DEMO — equipas da liga Bateu Pro
// ------------------------------------------------------------

const EQUIPAS_BASE = [
  { id: "t1", nome: "Zambeze Titans", tag: "ZBT", emoji: "🐊", base: 92, v: 18, d: 4, kills: 412, deaths: 231, torque: 145_000 },
  { id: "t2", nome: "Niassa Wolves", tag: "NSW", emoji: "🐺", base: 88, v: 16, d: 6, kills: 388, deaths: 254, torque: 98_500 },
  { id: "t3", nome: "Mapito Phoenix", tag: "MPX", emoji: "🔥", base: 85, v: 14, d: 8, kills: 355, deaths: 278, torque: 76_000 },
  { id: "t4", nome: "Ilha dos Tigres", tag: "IDT", emoji: "🐯", base: 81, v: 13, d: 9, kills: 340, deaths: 301, torque: 54_000 },
  { id: "t5", nome: "Chimoio Kings", tag: "CHK", emoji: "👑", base: 77, v: 11, d: 11, kills: 318, deaths: 322, torque: 41_500 },
  { id: "t6", nome: "Ponto Zero 258", tag: "PZ0", emoji: "🎯", base: 74, v: 10, d: 12, kills: 302, deaths: 340, torque: 33_000 },
  { id: "t7", nome: "Limpopo Strikers", tag: "LPS", emoji: "⚡", base: 69, v: 8, d: 14, kills: 281, deaths: 365, torque: 22_000 },
  { id: "t8", nome: "Bazaruto Sharks", tag: "BZS", emoji: "🦈", base: 64, v: 6, d: 16, kills: 250, deaths: 388, torque: 15_000 },
];

const FORMAS: ("W" | "L" | "D")[][] = [
  ["W", "W", "W", "L", "W"],
  ["W", "W", "L", "W", "W"],
  ["L", "W", "W", "W", "L"],
  ["W", "L", "W", "L", "W"],
  ["L", "L", "W", "W", "L"],
  ["W", "L", "L", "W", "L"],
  ["L", "W", "L", "L", "W"],
  ["L", "L", "L", "W", "L"],
];

const DELTAS = [2, 1, -1, 3, -2, 1, -3, 2];

// ------------------------------------------------------------
// POWER RANKINGS
// ------------------------------------------------------------

export function getPowerRankings(): PowerRankTeam[] {
  const lista = EQUIPAS_BASE.map((e, i) => {
    const kd = e.kills / e.deaths;
    const streak = FORMAS[i].reduce((acc, r, idx) => {
      if (idx === 0) return r === "W" ? 1 : r === "L" ? -1 : 0;
      if (acc > 0 && r === "W") return acc + 1;
      if (acc < 0 && r === "L") return acc - 1;
      return r === "W" ? 1 : r === "L" ? -1 : 0;
    }, 0);
    const bonusForma = FORMAS[i].filter((r) => r === "W").length * 1.6;
    const bonusKd = Math.min(8, kd * 4);
    const bonusTorque = Math.min(6, (e.torque / 145_000) * 6);
    return {
      id: e.id,
      nome: e.nome,
      tag: e.tag,
      logo_emoji: e.emoji,
      rating: Math.round(Math.min(99, e.base + bonusForma * 0.4 + bonusKd * 0.3 + bonusTorque * 0.2)),
      rating_delta: DELTAS[i],
      forma: FORMAS[i],
      vitorias: e.v,
      derrotas: e.d,
      streak,
      kills: e.kills,
      deaths: e.deaths,
      kd: Math.round(kd * 100) / 100,
      torque: e.torque,
      ranking: 0,
    } satisfies PowerRankTeam;
  });
  lista.sort((a, b) => b.rating - a.rating);
  lista.forEach((t, i) => (t.ranking = i + 1));
  return lista;
}

// ------------------------------------------------------------
// FANTASY ESPORTS
// ------------------------------------------------------------

const JOGADORES_BASE: Omit<FantasyJogador, "pontos_ultima" | "forma">[] = [
  { id: "p1", nome: "KIDaBora", tag: "KDB", equipa: "Zambeze Titans", papel: "capitao", emoji: "🐉", preco: 22.5, media_pontos: 78.4, pick_rate: 0.41 },
  { id: "p2", nome: "TofoMaster", tag: "TFM", equipa: "Zambeze Titans", papel: "entry", emoji: "🌊", preco: 19.8, media_pontos: 71.2, pick_rate: 0.33 },
  { id: "p3", nome: "NiassaKing", tag: "NSK", equipa: "Niassa Wolves", papel: "sniper", emoji: "🏹", preco: 21.0, media_pontos: 74.6, pick_rate: 0.29 },
  { id: "p4", nome: "Wolvezito", tag: "WVZ", equipa: "Niassa Wolves", papel: "support", emoji: "🛡️", preco: 14.2, media_pontos: 58.9, pick_rate: 0.18 },
  { id: "p5", nome: "PhoenixX", tag: "PHX", equipa: "Mapito Phoenix", papel: "entry", emoji: "☄️", preco: 18.4, media_pontos: 66.8, pick_rate: 0.22 },
  { id: "p6", nome: "MapitoPro", tag: "MTP", equipa: "Mapito Phoenix", papel: "igl", emoji: "🧠", preco: 16.6, media_pontos: 62.3, pick_rate: 0.15 },
  { id: "p7", nome: "TigreReal", tag: "TGR", equipa: "Ilha dos Tigres", papel: "sniper", emoji: "🐅", preco: 17.2, media_pontos: 63.5, pick_rate: 0.12 },
  { id: "p8", nome: "IlhaNinja", tag: "ILN", equipa: "Ilha dos Tigres", papel: "support", emoji: "🏝️", preco: 12.8, media_pontos: 54.1, pick_rate: 0.09 },
  { id: "p9", nome: "Chimoio1", tag: "CH1", equipa: "Chimoio Kings", papel: "entry", emoji: "⛰️", preco: 15.5, media_pontos: 59.7, pick_rate: 0.11 },
  { id: "p10", nome: "KingCrown", tag: "KCR", equipa: "Chimoio Kings", papel: "capitao", emoji: "👑", preco: 20.3, media_pontos: 69.9, pick_rate: 0.19 },
  { id: "p11", nome: "ZeroBala", tag: "ZB0", equipa: "Ponto Zero 258", papel: "sniper", emoji: "🎯", preco: 16.1, media_pontos: 61.0, pick_rate: 0.13 },
  { id: "p12", nome: "PontoSul", tag: "PTS", equipa: "Ponto Zero 258", papel: "igl", emoji: "🗺️", preco: 13.4, media_pontos: 55.6, pick_rate: 0.07 },
  { id: "p13", nome: "LimpopoJet", tag: "LPJ", equipa: "Limpopo Strikers", papel: "entry", emoji: "💧", preco: 12.1, media_pontos: 52.8, pick_rate: 0.06 },
  { id: "p14", nome: "Striker258", tag: "S25", equipa: "Limpopo Strikers", papel: "support", emoji: "⚡", preco: 11.2, media_pontos: 50.3, pick_rate: 0.05 },
  { id: "p15", nome: "TubaraoMoz", tag: "TBM", equipa: "Bazaruto Sharks", papel: "capitao", emoji: "🦈", preco: 14.9, media_pontos: 57.2, pick_rate: 0.08 },
  { id: "p16", nome: "SharkBait", tag: "SHT", equipa: "Bazaruto Sharks", papel: "sniper", emoji: "🫧", preco: 10.5, media_pontos: 48.7, pick_rate: 0.04 },
];

const FORMAS_PONTOS = [
  [82, 74, 91, 66, 79], [70, 66, 78, 71, 69],
  [85, 72, 64, 80, 72], [55, 61, 48, 66, 62],
  [68, 60, 72, 65, 70], [61, 55, 66, 58, 63],
  [72, 68, 61, 70, 66], [50, 58, 47, 62, 55],
  [62, 55, 66, 60, 58], [75, 70, 78, 66, 72],
  [66, 58, 61, 70, 62], [54, 60, 52, 58, 56],
  [52, 48, 55, 50, 54], [45, 52, 48, 55, 49],
  [58, 62, 55, 60, 57], [42, 50, 46, 55, 48],
];

export const FANTASY_ORCAMENTO = 100; // MZN fantasy
export const FANTASY_SLOTS = 5;

export function getJogadoresFantasy(): FantasyJogador[] {
  return JOGADORES_BASE.map((j, i) => ({
    ...j,
    pontos_ultima: FORMAS_PONTOS[i][FORMAS_PONTOS[i].length - 1],
    forma: FORMAS_PONTOS[i],
  }));
}

export function getPapeisFantasy(): { id: FantasyJogador["papel"]; label: string }[] {
  return [
    { id: "capitao", label: "Capitão (x1.5)" },
    { id: "entry", label: "Entry Fragger" },
    { id: "sniper", label: "Sniper" },
    { id: "igl", label: "IGL / Estratega" },
    { id: "support", label: "Support" },
  ];
}

/** Pontos ao vivo da ronda — evolui por minuto de forma determinística. */
export function getPontosRondaAoVivo(): Record<string, number> {
  const min = Math.floor(Date.now() / 60_000);
  const out: Record<string, number> = {};
  JOGADORES_BASE.forEach((j, i) => {
    const base = FORMAS_PONTOS[i][FORMAS_PONTOS[i].length - 1];
    const osc = ((min * 7 + i * 13) % 17) - 8; // -8..+8
    out[j.id] = Math.max(12, base + osc);
  });
  return out;
}

// ------------------------------------------------------------
// LIGA FANTASY (localStorage por dispositivo)
// ------------------------------------------------------------

const FANTASY_KEY = "bateu_fantasy_v1";

export interface MeuTimeFantasy {
  nome: string;
  jogadorIds: string[];
  capitaoId: string | null;
  criado_em: number;
}

export function carregarTimeFantasy(): MeuTimeFantasy | null {
  try {
    const raw = localStorage.getItem(FANTASY_KEY);
    return raw ? (JSON.parse(raw) as MeuTimeFantasy) : null;
  } catch {
    return null;
  }
}

export function guardarTimeFantasy(nome: string, jogadorIds: string[], capitaoId: string | null): MeuTimeFantasy {
  const t: MeuTimeFantasy = { nome, jogadorIds, capitaoId, criado_em: Date.now() };
  try { localStorage.setItem(FANTASY_KEY, JSON.stringify(t)); } catch { /* ignore */ }
  return t;
}

export function apagarTimeFantasy() {
  try { localStorage.removeItem(FANTASY_KEY); } catch { /* ignore */ }
}

export function custoTime(jogadorIds: string[]): number {
  const jogadores = getJogadoresFantasy();
  return jogadorIds.reduce((acc, id) => acc + (jogadores.find((j) => j.id === id)?.preco ?? 0), 0);
}

/** Pontuação do meu time: soma dos jogadores + capitão vale x1.5. */
export function pontuarTime(time: MeuTimeFantasy, pontos?: Record<string, number>): { total: number; detalhe: { id: string; nome: string; pontos: number; capitao: boolean }[] } {
  const aoVivo = pontos ?? getPontosRondaAoVivo();
  const jogadores = getJogadoresFantasy();
  let total = 0;
  const detalhe = time.jogadorIds.map((id) => {
    const j = jogadores.find((x) => x.id === id);
    const base = aoVivo[id] ?? 0;
    const capitao = id === time.capitaoId;
    const p = Math.round(capitao ? base * 1.5 : base);
    total += p;
    return { id, nome: j?.nome ?? id, pontos: p, capitao };
  });
  return { total, detalhe };
}

export function getLigaFantasy(): FantasyLigaUser[] {
  const eu = carregarTimeFantasy();
  const rivais: FantasyLigaUser[] = [
    { id: "r1", nome: "CoachZambeze", pontos: 12450, pontos_ronda: 342, emblema: "🐊" },
    { id: "r2", nome: "FantasyMozPro", pontos: 12180, pontos_ronda: 361, emblema: "🏹" },
    { id: "r3", nome: "TubaraoDoDraft", pontos: 11890, pontos_ronda: 298, emblema: "🦈" },
    { id: "r4", nome: "Kapitao_258", pontos: 11540, pontos_ronda: 315, emblema: "👑" },
    { id: "r5", nome: "XitiqueEantasy", pontos: 11205, pontos_ronda: 287, emblema: "💎" },
    { id: "r6", nome: "PhoenixDraft", pontos: 10930, pontos_ronda: 330, emblema: "🔥" },
    { id: "r7", nome: "IlhaFanClub", pontos: 10460, pontos_ronda: 276, emblema: "🏝️" },
  ];
  if (eu) {
    const meus = pontuarTime(eu).total;
    rivais.push({ id: "eu", nome: eu.nome, pontos: 9800 + meus, pontos_ronda: meus, emblema: "⭐", e_eu: true });
  }
  return rivais.sort((a, b) => b.pontos - a.pontos);
}

// ------------------------------------------------------------
// PREVISÕES DA COMUNIDADE (polls ao vivo)
// ------------------------------------------------------------

const POLLS_KEY = "bateu_polls_votos_v1";

const POLLS_BASE: Omit<Poll, "meu_voto">[] = [
  {
    id: "poll-final",
    pergunta: "Quem vence a Grande Final da Bateu Pro League?",
    contexto: "Final ao vivo sábado às 19h · melhor de 5",
    opcoes: [
      { id: "t1", label: "Zambeze Titans", votos: 1842, pct: 0, odds: "" },
      { id: "t2", label: "Niassa Wolves", votos: 1203, pct: 0, odds: "" },
    ],
    total_votos: 3045,
    termina_em: Date.now() + 2 * 24 * 3_600_000,
  },
  {
    id: "poll-mvp",
    pergunta: "Quem é o MVP da temporada?",
    contexto: "Média de pontos + impacto em clutch",
    opcoes: [
      { id: "p1", label: "KIDaBora (KDB)", votos: 2210, pct: 0, odds: "" },
      { id: "p3", label: "NiassaKing (NSK)", votos: 1688, pct: 0, odds: "" },
      { id: "p10", label: "KingCrown (KCR)", votos: 940, pct: 0, odds: "" },
    ],
    total_votos: 4838,
    termina_em: Date.now() + 5 * 24 * 3_600_000,
  },
  {
    id: "poll-upset",
    pergunta: "Haverá uma zebra nos quartos de final?",
    contexto: "Ponto Zero 258 vs Zambeze Titans",
    opcoes: [
      { id: "sim", label: "Sim, zebra confirmada!", votos: 512, pct: 0, odds: "" },
      { id: "nao", label: "Não, Titans esmagam", votos: 1980, pct: 0, odds: "" },
    ],
    total_votos: 2492,
    termina_em: Date.now() + 18 * 3_600_000,
  },
];

function votosMeus(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(POLLS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getPolls(): Poll[] {
  const meus = votosMeus();
  // drift vivo: votos crescem devagar com o tempo (determinístico)
  const min = Math.floor(Date.now() / 60_000);
  return POLLS_BASE.map((p, pi) => {
    const drift = (min % 97) + pi * 13;
    const opcoes = p.opcoes.map((o, oi) => {
      const votos = o.votos + Math.floor(drift * (0.5 + ((oi * 7 + pi * 3) % 10) / 12));
      return { ...o, votos };
    });
    const total = opcoes.reduce((a, o) => a + o.votos, 0);
    return {
      ...p,
      opcoes: opcoes.map((o) => {
        const pct = total > 0 ? o.votos / total : 0;
        return { ...o, pct, odds: (1 / Math.max(pct, 0.05)).toFixed(2) };
      }),
      total_votos: total,
      meu_voto: meus[p.id] ?? null,
    };
  });
}

export function votarPoll(pollId: string, opcaoId: string): Poll[] {
  const meus = votosMeus();
  meus[pollId] = opcaoId;
  try { localStorage.setItem(POLLS_KEY, JSON.stringify(meus)); } catch { /* ignore */ }
  return getPolls();
}

// ------------------------------------------------------------
// TRANSMISSÕES & WATCH PARTIES
// ------------------------------------------------------------

export function getStreamsAoVivo(): StreamAoVivo[] {
  const min = Math.floor(Date.now() / 60_000);
  return [
    { id: "s1", titulo: "GRANDE FINAL — Zambeze Titans vs Niassa Wolves", canal: "Bateu Esports Oficial", jogo: "Bateu Arena FPS", emoji: "🏆", viewers: 3420 + (min % 40) * 7, is_watch_party: false, destaque: true },
    { id: "s2", titulo: "Watch Party da Final com CoachZambeze", canal: "CoachZambeze", jogo: "Watch Party", emoji: "🍿", viewers: 812 + (min % 25) * 3, is_watch_party: true, destaque: false },
    { id: "s3", titulo: "Semifinal — Mapito Phoenix vs Ilha dos Tigres", canal: "Bateu Esports 2", jogo: "Bateu Arena FPS", emoji: "⚔️", viewers: 1544 + (min % 30) * 5, is_watch_party: false, destaque: false },
    { id: "s4", titulo: "Análise pós-jogo + draft fantasy da ronda", canal: "FantasyMozPro", jogo: "Talk Show", emoji: "🎙️", viewers: 391 + (min % 15) * 2, is_watch_party: false, destaque: false },
    { id: "s5", titulo: "Open Qualifier — Limpopo vs Bazaruto", canal: "Bateu Esports 3", jogo: "Bateu Arena FPS", emoji: "🦈", viewers: 687 + (min % 20) * 4, is_watch_party: false, destaque: false },
  ];
}

// ------------------------------------------------------------
// PRIZE POOL COM CROWDFUNDING
// ------------------------------------------------------------

export function getPrizePool(): PrizePoolInfo {
  const min = Math.floor(Date.now() / 60_000);
  const base = 250_000;
  const crowdfunding = 87_400 + (min % 60) * 25;
  const total = base + crowdfunding;
  const dist = [0.4, 0.25, 0.15, 0.1, 0.06, 0.04];
  return {
    base,
    crowdfunding,
    meta: 400_000,
    contribuidores: 1204 + (min % 50),
    distribuicao: dist.map((pct, i) => ({ lugar: i + 1, pct, valor: Math.round(total * pct) })),
  };
}

// ------------------------------------------------------------
// HEAD-TO-HEAD
// ------------------------------------------------------------

export function getH2H(idA: string, idB: string): H2H {
  const a = EQUIPAS_BASE.find((e) => e.id === idA);
  const b = EQUIPAS_BASE.find((e) => e.id === idB);
  if (!a || !b) {
    return {
      equipaA: { nome: "—", vitorias: 0, emoji: "❓" },
      equipaB: { nome: "—", vitorias: 0, emoji: "❓" },
      empates: 0,
      ultimos: [],
    };
  }
  // histórico determinístico
  const seed = (a.id.length * 7 + b.id.length * 13) % 10;
  const va = 3 + (seed % 4);
  const vb = 2 + ((seed + 3) % 3);
  return {
    equipaA: { nome: a.nome, vitorias: va, emoji: a.emoji },
    equipaB: { nome: b.nome, vitorias: vb, emoji: b.emoji },
    empates: seed % 2,
    ultimos: [
      { data: "12 Out", resultado: `${a.tag} venceu`, placar: "2-1" },
      { data: "28 Set", resultado: `${b.tag} venceu`, placar: "1-2" },
      { data: "14 Set", resultado: `${a.tag} venceu`, placar: "2-0" },
      { data: "30 Ago", resultado: "Empate", placar: "1-1" },
      { data: "16 Ago", resultado: `${b.tag} venceu`, placar: "0-2" },
    ],
  };
}

// ------------------------------------------------------------
// SINCRONIZAÇÃO SUPABASE (opcional, silenciosa)
// ------------------------------------------------------------

export async function guardarTimeFantasySupabase(userId: string, time: MeuTimeFantasy): Promise<boolean> {
  try {
    const { error } = await sb.from("esport_fantasy_teams").upsert({
      user_id: userId,
      nome: time.nome,
      jogador_ids: time.jogadorIds,
      capitao_id: time.capitaoId,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}
