// ============================================================
// PROGRESSÃO BATEU (v78) — NÚCLEO PURO
// ────────────────────────────────────────────────────────────
// «Jogos geram pontos. Pontos geram progressão. Progressão
// desbloqueia prémios. Prémios dão motivo para regressar.»
//
// Módulo PURO (browser E Node no MESMO código — padrão da casa
// desde o regionalCore v73): zero React, zero localStorage, zero
// DOM. A store do aparelho e um futuro servidor consomem as MESMAS
// funções. Determinístico: as missões do dia dependem SÓ da data
// + jogador (mesmo dia = mesmas missões, em qualquer dispositivo).
//
// CARTUBEIRAS SEPARADAS (regra do produto): PONTOS (progressão),
// BILHETES (sorteios com regras próprias), PRÉMIOS (resgates) e
// SALDO (dinheiro) são QUATRO coisas diferentes — este núcleo só
// gere PONTOS e expõe o modelo de EXIBIÇÃO das quatro. NUNCA
// converte pontos em dinheiro nem mistura saldos (não existe API
// de conversão implícita — o resgate é sempre uma operação
// explícita, com regras próprias, noutra camada).
//
// GUARDRAILS ANTI-DARK-PATTERN (regras do produto):
// · pontos NÃO expiram (não existe função que os retire, exceto
//   resgates explícitos definidos noutra camada);
// · missões IMPOSSÍVEIS são recusadas na criação (alvos só de
//   MODELOS validados — testado);
// · a missão AVISA quando está a acabar (avisoExpiracao < 6 h) —
//   nada expira sem aviso;
// · recomendações são REGRAS determinísticas (não IA) e só com
//   dados reais do estado;
// · níveis dão desbloqueios COSMÉTICOS/estruturais — NUNCA
//   vantagem competitiva em jogo (nenhum unlock altera stats).
// ============================================================

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

// ── Níveis (desbloqueios só cosméticos/estruturais) ────────────
export interface NivelDef {
  nivel: number;
  nome: string;
  pontos: number; // limiar para ALCANÇAR este nível
  desbloqueia: string[];
}
export const NIVEIS: NivelDef[] = [
  { nivel: 1, nome: "Novo jogador", pontos: 0, desbloqueia: ["avatar-classico"] },
  { nivel: 2, nome: "Explorador", pontos: 500, desbloqueia: ["moldura-bronze", "tema-praia"] },
  { nivel: 3, nome: "Competidor", pontos: 2000, desbloqueia: ["moldura-prata", "acesso-torneios", "titulo-competidor"] },
  { nivel: 4, nome: "Campeão", pontos: 6000, desbloqueia: ["moldura-ouro", "missoes-especiais", "titulo-campeao"] },
  { nivel: 5, nome: "Lenda Bateu", pontos: 15000, desbloqueia: ["moldura-lenda", "titulo-lenda", "prioridade-campanhas"] },
];
export const NIVEL_MAX = NIVEIS[NIVEIS.length - 1].nivel;

export interface EstadoNivel {
  nivel: number;
  nome: string;
  desbloqueia: string[];
  proximo: { nivel: number; nome: string; pontosFaltam: number } | null; // null = nível máximo (honesto)
}
export function nivelDe(pontos: number): EstadoNivel {
  const p = Math.max(0, Math.floor(pontos) || 0);
  let atual = NIVEIS[0];
  for (const n of NIVEIS) if (p >= n.pontos) atual = n;
  const seguinte = NIVEIS.find((n) => n.nivel === atual.nivel + 1) ?? null;
  return {
    nivel: atual.nivel,
    nome: atual.nome,
    desbloqueia: [...atual.desbloqueia],
    proximo: seguinte ? { nivel: seguinte.nivel, nome: seguinte.nome, pontosFaltam: seguinte.pontos - p } : null,
  };
}

// ── Estado ─────────────────────────────────────────────────────
export interface Missao {
  id: string;
  modelo: string;
  titulo: string;
  jogoId: string | null; // null = qualquer jogo
  jogosDistintos: number; // 0 = não pede jogos distintos
  alvo: number;
  progresso: number;
  pontos: number;
  criadaEm: number;
  terminaEm: number;
  reclamada: boolean;
}

export interface EstadoProgressao {
  versao: number;
  jogadorId: string; // "" = convidado (progresso SÓ no aparelho — honesto)
  pontos: number;
  corridas: number; // partidas jogadas hoje (contador do dia corrente)
  diaContador: string; // "2026-11-22" — o contador de partidas é POR DIA
  jogosHoje: string[]; // jogos distintos jogados hoje
  vitoriasHoje: number;
  missoes: Missao[];
  missoesConcluidasTotal: number;
  ultimaAtividade: number;
}

export const VERSAO_PROGRESSAO = 1;

export function estadoPadrao(jogadorId = ""): EstadoProgressao {
  return {
    versao: VERSAO_PROGRESSAO,
    jogadorId,
    pontos: 0,
    corridas: 0,
    diaContador: "",
    jogosHoje: [],
    vitoriasHoje: 0,
    missoes: [],
    missoesConcluidasTotal: 0,
    ultimaAtividade: 0,
  };
}

/** Recupera JSON podre (lição do hidratarEstado do regionalCore v73). */
export function hidratarProgressao(cru: unknown, jogadorIdAgora = ""): EstadoProgressao {
  const base = estadoPadrao(jogadorIdAgora);
  if (typeof cru !== "object" || cru === null) return base;
  const o = cru as Record<string, unknown>;
  const num = (v: unknown, min = 0) => (typeof v === "number" && Number.isFinite(v) && v >= min ? Math.floor(v) : null);
  const dia = typeof o.diaContador === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.diaContador) ? o.diaContador : "";
  const jogos = Array.isArray(o.jogosHoje) ? o.jogosHoje.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 40).slice(0, 60) : [];
  const missoes = Array.isArray(o.missoes)
    ? (o.missoes as Record<string, unknown>[]).slice(0, 12).flatMap((mm) => {
        if (typeof mm !== "object" || mm === null) return [];
        const id = typeof mm.id === "string" ? mm.id.slice(0, 60) : "";
        const modelo = typeof mm.modelo === "string" ? mm.modelo.slice(0, 40) : "";
        const titulo = typeof mm.titulo === "string" ? mm.titulo.slice(0, 120) : "";
        const alvo = num(mm.alvo, 1);
        const pontos = num(mm.pontos, 1);
        if (!id || !modelo || !titulo || !alvo || !pontos) return [];
        return [{
          id, modelo, titulo,
          jogoId: typeof mm.jogoId === "string" ? mm.jogoId.slice(0, 40) : null,
          jogosDistintos: num(mm.jogosDistintos) ?? 0,
          alvo,
          progresso: clamp(num(mm.progresso) ?? 0, 0, alvo),
          pontos,
          criadaEm: num(mm.criadaEm) ?? 0,
          terminaEm: num(mm.terminaEm) ?? 0,
          reclamada: mm.reclamada === true,
        }] as Missao[];
      })
    : [];
  return {
    versao: VERSAO_PROGRESSAO,
    jogadorId: typeof o.jogadorId === "string" ? o.jogadorId.slice(0, 60) : jogadorIdAgora,
    pontos: num(o.pontos) ?? 0,
    corridas: num(o.corridas) ?? 0,
    diaContador: dia,
    jogosHoje: jogos,
    vitoriasHoje: num(o.vitoriasHoje) ?? 0,
    missoes,
    missoesConcluidasTotal: num(o.missoesConcluidasTotal) ?? 0,
    ultimaAtividade: num(o.ultimaAtividade) ?? 0,
  };
}

// ── Dia local (determinístico a partir do ms passado) ──────────
/** "2026-11-22" no fuso LOCAL do aparelho — o contador de partidas é por dia. */
export function diaDe(agoraMs: number): string {
  const d = new Date(agoraMs);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
/** Fim do dia local em ms (23:59:59.999) — as missões do dia terminam aqui. */
function fimDoDiaMs(agoraMs: number): number {
  const d = new Date(agoraMs);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// ── Catálogo de MODELOS de missões (alvos SEMPRE alcançáveis) ──
export interface ModeloMissao {
  modelo: string;
  titulo: string;
  jogoId: string | null;
  jogosDistintos: number;
  alvo: number;
  pontos: number;
}
export const MODELOS_MISSOES: ModeloMissao[] = [
  { modelo: "joga-kart", titulo: "Joga BATEU KART 1 vez", jogoId: "kart", jogosDistintos: 0, alvo: 1, pontos: 100 },
  { modelo: "joga-tetris", titulo: "Joga Tetris 1 vez", jogoId: "tetris", jogosDistintos: 0, alvo: 1, pontos: 100 },
  { modelo: "joga-3-partidas", titulo: "Joga 3 partidas hoje", jogoId: null, jogosDistintos: 0, alvo: 3, pontos: 100 },
  { modelo: "joga-2-diferentes", titulo: "Joga 2 jogos diferentes hoje", jogoId: null, jogosDistintos: 2, alvo: 2, pontos: 150 },
  { modelo: "vence-1", titulo: "Vence 1 partida hoje", jogoId: null, jogosDistintos: 0, alvo: 1, pontos: 200 },
  { modelo: "joga-memoria", titulo: "Joga Memória 1 vez", jogoId: "memory", jogosDistintos: 0, alvo: 1, pontos: 100 },
];

/**
 * Missões do dia: sorteio determinístico por (dia + jogador) — o mesmo
 * jogador no mesmo dia vê AS MESMAS missões em qualquer dispositivo.
 * EMBARALHAMENTO Fisher-Yates com xorshift32 semeado pelo hash do
 * dia+jogador: o determinismo mantém-se e as combinações VARIAM ao longo
 * da semana (a 1.ª rotação usava uma JANELA consecutiva de 3 modelos e
 * «Joga BATEU KART» + «2 jogos diferentes» — a 3 posições de distância —
 * NUNCA podiam coexistir no mesmo dia: combinações impossíveis = missões
 * chatas. Furo caçado pela suíte). Teto 3 missões/dia. As que já existem
 * no estado NÃO são recriadas (o progresso do jogador nunca é apagado).
 */
export function gerarMissoesDoDia(estado: EstadoProgressao, agoraMs: number): EstadoProgressao {
  const dia = diaDe(agoraMs);
  const e: EstadoProgressao = { ...estado };
  // novo dia → reset dos contadores do dia
  if (e.diaContador !== dia) { e.corridas = 0; e.jogosHoje = []; e.vitoriasHoje = 0; e.diaContador = dia; }
  const termina = fimDoDiaMs(agoraMs);
  const existentes = new Set(e.missoes.filter((mm) => mm.terminaEm >= agoraMs).map((mm) => mm.modelo));
  const chave = `${dia}|${e.jogadorId}`;
  let h = 2166136261;
  for (let i = 0; i < chave.length; i++) { h ^= chave.charCodeAt(i); h = Math.imul(h, 16777619); }
  let semente = (h >>> 0) || 1;
  const rnd = () => { semente ^= semente << 13; semente ^= semente >>> 17; semente ^= semente << 5; semente >>>= 0; return semente / 4294967296; };
  const idxs = MODELOS_MISSOES.map((_, i) => i);
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  const vagas = Math.max(0, 3 - e.missoes.filter((mm) => mm.terminaEm >= agoraMs).length);
  let criadas = 0;
  for (let k = 0; k < MODELOS_MISSOES.length && criadas < vagas; k++) {
    const modelo = MODELOS_MISSOES[idxs[k]];
    if (existentes.has(modelo.modelo)) continue;
    e.missoes = [...e.missoes, {
      id: `mis-${dia}-${modelo.modelo}-${(h >>> 0).toString(36).slice(0, 4)}`,
      modelo: modelo.modelo,
      titulo: modelo.titulo,
      jogoId: modelo.jogoId,
      jogosDistintos: modelo.jogosDistintos,
      alvo: modelo.alvo,
      progresso: 0,
      pontos: modelo.pontos,
      criadaEm: agoraMs,
      terminaEm: termina,
      reclamada: false,
    }];
    criadas++;
  }
  // expiradas saem do estado (o histórico fica no contador total)
  e.missoes = e.missoes.filter((mm) => mm.terminaEm >= agoraMs);
  return e;
}

/** Aviso honesto de expiração (nada expira sem aviso): < 6 h → «expira-breve». */
export function avisoExpiracao(mm: Missao, agoraMs: number): { restamMs: number; expiraBreve: boolean } {
  const restamMs = Math.max(0, mm.terminaEm - agoraMs);
  return { restamMs, expiraBreve: restamMs > 0 && restamMs < 6 * 3600_000 };
}

/** Registo de ATIVIDADE real do jogador — é o único caminho para o progresso. */
export type EventoProgressao = { t: "jogo"; jogoId: string } | { t: "vitoria"; jogoId: string };
export function registarEvento(estado: EstadoProgressao, ev: EventoProgressao, agoraMs: number): EstadoProgressao {
  const dia = diaDe(agoraMs);
  const e: EstadoProgressao = { ...estado };
  if (e.diaContador !== dia) { e.corridas = 0; e.jogosHoje = []; e.vitoriasHoje = 0; e.diaContador = dia; }
  const jogoId = ev.jogoId.slice(0, 40);
  if (ev.t === "jogo") {
    e.corridas = clamp(e.corridas + 1, 0, 999);
    if (!e.jogosHoje.includes(jogoId)) e.jogosHoje = [...e.jogosHoje, jogoId].slice(0, 60);
  } else {
    e.vitoriasHoje = clamp(e.vitoriasHoje + 1, 0, 999);
    e.corridas = clamp(e.corridas + 1, 0, 999);
    if (!e.jogosHoje.includes(jogoId)) e.jogosHoje = [...e.jogosHoje, jogoId].slice(0, 60);
  }
  e.ultimaAtividade = agoraMs;
  // progresso das missões (cada modelo come COMO decide — alvo nunca ultrapassado)
  e.missoes = e.missoes.map((mm) => {
    if (mm.reclamada || mm.terminaEm < agoraMs) return mm;
    let novo = mm.progresso;
    if (ev.t === "jogo") {
      if (mm.jogosDistintos > 0) {
        // progresso de «jogos distintos» = nº de jogos de hoje que contam para a missão
        const conta = mm.jogoId ? e.jogosHoje.filter((j) => j === mm.jogoId).length : e.jogosHoje.length;
        novo = clamp(conta, 0, mm.alvo);
      } else if (mm.jogoId === null || mm.jogoId === jogoId) {
        novo = clamp(mm.progresso + 1, 0, mm.alvo);
      }
    } else if (ev.t === "vitoria" && mm.modelo === "vence-1") {
      novo = clamp(mm.progresso + 1, 0, mm.alvo);
    }
    return novo !== mm.progresso ? { ...mm, progresso: novo } : mm;
  });
  return e;
}

/**
 * PONTOS de jogo: o jogo REPORTA o resultado e o núcleo aplica o TETO
 * do jogo (anti-farm honesto — o teto é do CATÁLOGO e é exibido no
 * cartão «Até X pontos»). Recusa negativo e teto inválido. Os pontos
 * NUNCA expiram — não existe caminho que os retire (resgates são
 * explícitos e noutra camada).
 */
export function registrarPontosDeJogo(
  estado: EstadoProgressao,
  jogoId: string,
  pontosReportados: number,
  tetoJogo: number,
  agoraMs: number,
): { estado: EstadoProgressao; pontosAplicados: number; motivo: string } {
  const jogo = jogoId.slice(0, 40);
  if (!Number.isFinite(pontosReportados) || pontosReportados < 0) return { estado, pontosAplicados: 0, motivo: "valor" };
  if (!Number.isFinite(tetoJogo) || tetoJogo <= 0) return { estado, pontosAplicados: 0, motivo: "jogo" };
  const aplicados = clamp(Math.floor(pontosReportados), 0, tetoJogo);
  const e: EstadoProgressao = { ...estado, pontos: estado.pontos + aplicados, ultimaAtividade: Math.max(estado.ultimaAtividade, agoraMs) };
  return { estado: e, pontosAplicados: aplicados, motivo: "ok" };
}

/** Reclamar missão concluída — a ÚNICA forma de os pontos da missão entrarem. */
export function clamarMissao(estado: EstadoProgressao, missaoId: string, agoraMs: number): { estado: EstadoProgressao; pontos: number; motivo: string } {
  const mm = estado.missoes.find((x) => x.id === missaoId);
  if (!mm) return { estado, pontos: 0, motivo: "inexistente" };
  if (mm.reclamada) return { estado, pontos: 0, motivo: "ja" };
  if (mm.terminaEm < agoraMs) return { estado, pontos: 0, motivo: "expirada" };
  if (mm.progresso < mm.alvo) return { estado, pontos: 0, motivo: "falta" };
  const e: EstadoProgressao = {
    ...estado,
    pontos: estado.pontos + mm.pontos,
    missoes: estado.missoes.map((x) => (x.id === missaoId ? { ...x, reclamada: true } : x)),
    missoesConcluidasTotal: estado.missoesConcluidasTotal + 1,
  };
  return { estado: e, pontos: mm.pontos, motivo: "ok" };
}

// ── Recomendações (REGRAS determinísticas — NÃO é IA) ──────────
export interface JogoCatalogo {
  id: string;
  label: string;
  minutosMax: number; // tempo médio máximo declarado no catálogo
  dificuldade: "Fácil" | "Média" | "Difícil";
  multiplayer: boolean;
  precisaConta: boolean;
}
export interface Recomendacao {
  jogoId: string;
  razao: string; // porquê HONESTO, ligado a dados reais
}
/**
 * Recomendar jogos por REGRAS (o produto proíbe IA a decidir benefícios):
 * 1.º jogos com missão ativa · depois convidado → os que não pedem conta ·
 * pouco tempo → curtos · nível ≤ 2 → fáceis · nível ≥ 3 → multiplayer ·
 * sem repetir e teto 4.
 */
export function recomendarJogos(
  estado: EstadoProgressao,
  catalogo: JogoCatalogo[],
  agoraMs: number,
  contexto: { minutosDisponiveis?: number } = {},
): Recomendacao[] {
  const nivel = nivelDe(estado.pontos).nivel;
  const missoesAtivas = estado.missoes.filter((mm) => !mm.reclamada && mm.terminaEm >= agoraMs && mm.progresso < mm.alvo);
  const razoes = new Map<string, string>();
  const ordem: string[] = [];
  const add = (id: string, razao: string) => {
    if (razoes.has(id) || ordem.length >= 4) return;
    razoes.set(id, razao); ordem.push(id);
  };
  // 1) missão ativa de jogo específico
  for (const mm of missoesAtivas) if (mm.jogoId) add(mm.jogoId, "Completa a missão de hoje");
  // 2) missão «jogos distintos» → um jogo que ainda não jogou hoje
  const distintos = missoesAtivas.find((mm) => mm.jogosDistintos > 0);
  if (distintos) {
    const aindaNao = catalogo.find((g) => !estado.jogosHoje.includes(g.id));
    if (aindaNao) add(aindaNao.id, "Completa a missão de hoje");
  }
  // 3) convidado → jogos que não pedem conta
  if (!estado.jogadorId) {
    const g = catalogo.find((x) => !x.precisaConta && !razoes.has(x.id));
    if (g) add(g.id, "Joga sem registo");
  }
  // 4) pouco tempo → jogo curto
  if (contexto.minutosDisponiveis !== undefined) {
    const g = catalogo.find((x) => x.minutosMax <= contexto.minutosDisponiveis! && !razoes.has(x.id));
    if (g) add(g.id, `Cabe nos teus ${contexto.minutosDisponiveis} min`);
  }
  // 5) nível baixo → fáceis · nível alto → multiplayer
  if (nivel <= 2) {
    const g = catalogo.find((x) => x.dificuldade === "Fácil" && !razoes.has(x.id));
    if (g) add(g.id, "Fácil para começar");
  } else {
    const g = catalogo.find((x) => x.multiplayer && !razoes.has(x.id));
    if (g) add(g.id, "Multiplayer para competidores");
  }
  // 6) completar com o topo do catálogo
  for (const g of catalogo) if (ordem.length < 4) add(g.id, "Popular no Bateu");
  return ordem.map((id) => ({ jogoId: id, razao: razoes.get(id) ?? "Popular no Bateu" }));
}

// ── Modelo de EXIBIÇÃO das 4 carteiras (PONTOS ≠ BILHETES ≠ PRÉMIOS ≠ SALDO) ──
export interface CarteirasVisao {
  pontos: number;
  bilhetes: number;
  premiosDisponiveis: number;
  saldo: { valor: number; moeda: string };
}
/** Só MONTA a exibição — os valores vêm das FONTES reais de cada carteira
 *  (bilhetes do sistema de sorteios, prémios do sistema de resgates, saldo
 *  da carteira financeira). NUNCA converte nem mistura — sem API de conversão. */
export function visaoCarteiras(estado: EstadoProgressao, bilhetes: number, premiosDisponiveis: number, saldo: { valor: number; moeda: string }): CarteirasVisao {
  return {
    pontos: Math.max(0, Math.floor(estado.pontos) || 0),
    bilhetes: Math.max(0, Math.floor(bilhetes) || 0),
    premiosDisponiveis: Math.max(0, Math.floor(premiosDisponiveis) || 0),
    saldo,
  };
}
