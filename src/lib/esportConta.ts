// ═══════════════════════════════════════════════════════════════════════
// v91 — «E-SPORT SEGUE A CONTA» — NÚCLEO ISOMÓRFICO (browser E Node)
// A fatia anotada desde a v86/v87: os torneios/ligas do aparelho passam a
// seguir a CONTA entre dispositivos. Este módulo é PURO (zero supabase,
// zero DOM, zero React — padrão progressaoConta v84 / regionalCore v73):
// as regras do MERGE entre aparelhos, a HIDRATAÇÃO dura das linhas do
// servidor e a IMPRESSÃO anti-spam — tudo provado no Node.
//
// Modelo de sincronização (honesto, declarado):
//   · o APARELHO continua a ser a fonte imediata (jogável sem rede);
//   · o SERVIDOR guarda UMA linha por conta com os torneios/ligas;
//   · o MERGE entre aparelhos é por UNIÃO DE IDS: um torneio criado no
//     telemóvel e outro no portátil coexistem (caps 12/8 do núcleo);
//   · o MESMO id em dois aparelhos NUNCA mistura participantes — vence o
//     estado MAIS AVANÇADO: prémio reclamado → estado (terminado > ativo >
//     inscrição) → mais histórico (mais partidas reais consumidas) → ts
//     mais recente. Limitação DECLARADA: nunca soma progresso de dois
//     aparelhos no mesmo torneio (mostra o mais avançado dos dois);
//   · rivais IA continuam SEMPRE etiquetados (eBot obrigatório no
//     hidratar — uma linha podre não pode apagar a etiqueta «IA»);
//   · o que não pode ser validado é DESCARTADO com honestidade (torneio
//     podre → fora da linha, nunca lança);
//   · as reclamações (claim 1×) viajam: `premioReclamado` vence em
//     qualquer lado — o mesmo prémio NUNCA é pago duas vezes;
//   · 4 CARTEIRAS continuam SEPARADAS: aqui só existem Pontos Bateu de
//     PRÉMIOS de e-sport (pagos pela store da progressão, como na v86).
// ═══════════════════════════════════════════════════════════════════════

import {
  EstadoEsport, TorneioEsport, LigaEsport, OrganizadorEsport, ParticipanteEsport,
  HistoricoEsport, TETO_TORNEIOS, TETO_LIGAS, JOGOS_ESPORT,
} from "./esport";

// ── Limites (os MESMOS do CHECK da migração SQL — sincronizados) ────────
export const LIMITES_ESPORT_CONTA = {
  USER_ID_CAP: 60,
  ID_CAP: 60,
  TEXTO_CAP: 80,
  SECTOR_CAP: 24,
  TORNEIOS_CAP: TETO_TORNEIOS,   // 12 — o mesmo teto do aparelho
  LIGAS_CAP: TETO_LIGAS,         // 8  — o mesmo teto do aparelho
  PARTICIPANTES_CAP: 12,         // 1 humano + 11 rivais IA do circuito
  HISTORICO_CAP: 24,             // últimas 24 entradas (as recentes contam)
  PONTOS_CAP: 2_000_000,         // mesmo teto da progressão
} as const;

export const CODIGO_MIGRACAO_PENDENTE = "PGRST205";

/** Chave do cache de CONTA no aparelho (o convidado mantém a chave v86). */
export function chaveCacheContaEsport(userId: string): string {
  const id = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, LIMITES_ESPORT_CONTA.USER_ID_CAP);
  return `bateu_esport_v1:u:${id}`;
}

// ── HIDRATAÇÃO dura (linha do servidor e caches à prova de podre) ───────
const JOGOS_VALIDOS = new Set(JOGOS_ESPORT.map((j) => j.id));
const FORMATOS = new Set(["campeonato", "eliminatoria"]);
const PISTAS = new Set(["praia", "deserto", "vulcao", "qualquer"]);
const ESTADOS_T = new Set(["inscricao", "ativo", "terminado"]);
const ESTADOS_L = new Set(["ativo", "terminado"]);

function strLimpo(v: unknown, cap: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, cap) : null;
}
function intLimpo(v: unknown, min: number, max: number, padrao: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : padrao;
  return Math.min(max, Math.max(min, n));
}
function boolLimpo(v: unknown): boolean { return v === true; }
function msLimpo(v: unknown, padrao = 0): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : padrao;
}

function hidratarOrganizador(o: unknown): OrganizadorEsport | null {
  if (typeof o !== "object" || o === null) return null;
  const r = o as Record<string, unknown>;
  const nome = strLimpo(r.nome, LIMITES_ESPORT_CONTA.TEXTO_CAP);
  if (!nome) return null;
  const tipo = r.tipo === "empresa" ? "empresa" : "jogador";
  const sector = strLimpo(r.sector, LIMITES_ESPORT_CONTA.SECTOR_CAP) ?? (tipo === "empresa" ? "Patrocínio" : "Piloto");
  const cor = typeof r.cor === "string" && /^#[0-9a-fA-F]{3,8}$/.test(r.cor.trim()) ? r.cor.trim() : "#f97316";
  const iniciais = strLimpo(r.iniciais, 3) ?? (tipo === "empresa" ? "EM" : "EU");
  return { tipo, nome, sector, cor, iniciais };
}

function hidratarParticipante(p: unknown): ParticipanteEsport | null {
  if (typeof p !== "object" || p === null) return null;
  const r = p as Record<string, unknown>;
  const id = strLimpo(r.id, LIMITES_ESPORT_CONTA.ID_CAP);
  const nome = strLimpo(r.nome, LIMITES_ESPORT_CONTA.TEXTO_CAP);
  if (!id || !nome) return null;
  const out: ParticipanteEsport = {
    id,
    nome,
    pontos: intLimpo(r.pontos, 0, LIMITES_ESPORT_CONTA.PONTOS_CAP, 0),
    vitorias: intLimpo(r.vitorias, 0, 100_000, 0),
    partidas: intLimpo(r.partidas, 0, 100_000, 0),
    // honestidade NÃO negociável: só é humano o que vier marcado como
    // não-bot E com id "eu"; tudo o resto fica etiquetado IA
    eBot: r.eBot === false ? id === "eu" ? false : true : true,
  };
  const el = r.rondaEliminado;
  if (typeof el === "number" && Number.isFinite(el) && el > 0) out.rondaEliminado = Math.floor(el);
  return out;
}

function hidratarHistorico(h: unknown): HistoricoEsport[] {
  if (!Array.isArray(h)) return [];
  const limpo: HistoricoEsport[] = [];
  for (const e of h) {
    if (typeof e !== "object" || e === null) continue;
    const r = e as Record<string, unknown>;
    const texto = strLimpo(r.texto, LIMITES_ESPORT_CONTA.TEXTO_CAP);
    if (!texto) continue;
    limpo.push({ em: msLimpo(r.em, 0), texto });
  }
  // as MAIS RECENTES ficam (as antigas saem com honestidade — cap no fio)
  return limpo.slice(-LIMITES_ESPORT_CONTA.HISTORICO_CAP);
}

function hidratarParticipantes(ps: unknown): ParticipanteEsport[] {
  if (!Array.isArray(ps)) return [];
  const vistos = new Map<string, ParticipanteEsport>();
  for (const p of ps) {
    const hid = hidratarParticipante(p);
    if (hid) vistos.set(hid.id, hid);
    if (vistos.size >= LIMITES_ESPORT_CONTA.PARTICIPANTES_CAP) break;
  }
  return [...vistos.values()];
}

/** Torneio podre → null (nunca lança). Válido → TorneioEsport capado. */
export function hidratarTorneioEsport(bruto: unknown): TorneioEsport | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const r = bruto as Record<string, unknown>;
  const id = strLimpo(r.id, LIMITES_ESPORT_CONTA.ID_CAP);
  const nome = strLimpo(r.nome, LIMITES_ESPORT_CONTA.TEXTO_CAP);
  if (!id || !nome) return null;
  if (typeof r.jogo !== "string" || !JOGOS_VALIDOS.has(r.jogo)) return null;
  if (typeof r.formato !== "string" || !FORMATOS.has(r.formato)) return null;
  const organizador = hidratarOrganizador(r.organizador);
  if (!organizador) return null;
  const formato = r.formato as TorneioEsport["formato"];
  const tamanho = intLimpo(r.tamanho, 4, 12, formato === "eliminatoria" ? 4 : 4);
  return {
    id,
    nome,
    jogo: r.jogo,
    formato,
    tamanho,
    organizador,
    premioPontos: intLimpo(r.premioPontos, 100, 5000, 100),
    pista: typeof r.pista === "string" && PISTAS.has(r.pista) ? (r.pista as TorneioEsport["pista"]) : "qualquer",
    voltas: intLimpo(r.voltas, 3, 5, 4),
    estado: typeof r.estado === "string" && ESTADOS_T.has(r.estado) ? (r.estado as TorneioEsport["estado"]) : "inscricao",
    criadoEm: msLimpo(r.criadoEm, 0),
    terminaEm: msLimpo(r.terminaEm, 0),
    participantes: hidratarParticipantes(r.participantes),
    ronda: intLimpo(r.ronda, 0, 3, 0),
    rondasTotal: intLimpo(r.rondasTotal, 0, 3, 0),
    vencedorId: typeof r.vencedorId === "string" ? r.vencedorId.slice(0, LIMITES_ESPORT_CONTA.ID_CAP) : "",
    premioReclamado: boolLimpo(r.premioReclamado),
    historico: hidratarHistorico(r.historico),
  };
}

/** Liga podre → null (nunca lança). */
export function hidratarLigaEsport(bruto: unknown): LigaEsport | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const r = bruto as Record<string, unknown>;
  const id = strLimpo(r.id, LIMITES_ESPORT_CONTA.ID_CAP);
  const nome = strLimpo(r.nome, LIMITES_ESPORT_CONTA.TEXTO_CAP);
  if (!id || !nome) return null;
  if (typeof r.jogo !== "string" || !JOGOS_VALIDOS.has(r.jogo)) return null;
  const organizador = hidratarOrganizador(r.organizador);
  if (!organizador) return null;
  return {
    id,
    nome,
    jogo: r.jogo,
    temporada: strLimpo(r.temporada, LIMITES_ESPORT_CONTA.TEXTO_CAP) ?? "Temporada 1",
    organizador,
    premioPontos: intLimpo(r.premioPontos, 100, 5000, 100),
    criadoEm: msLimpo(r.criadoEm, 0),
    terminaEm: msLimpo(r.terminaEm, 0),
    estado: typeof r.estado === "string" && ESTADOS_L.has(r.estado) ? (r.estado as LigaEsport["estado"]) : "ativo",
    pontuacao: hidratarParticipantes(r.pontuacao),
    campeaoId: typeof r.campeaoId === "string" ? r.campeaoId.slice(0, LIMITES_ESPORT_CONTA.ID_CAP) : "",
    premioReclamado: boolLimpo(r.premioReclamado),
    historico: hidratarHistorico(r.historico),
  };
}

/** Estado completo podre → versão válida (podres descartados, nunca lança). */
export function hidratarEstadoEsport(bruto: unknown): EstadoEsport {
  const out: EstadoEsport = { torneios: [], ligas: [], ts: 0 };
  if (typeof bruto !== "object" || bruto === null) return out;
  const r = bruto as Record<string, unknown>;
  if (Array.isArray(r.torneios)) {
    for (const t of r.torneios) {
      const hid = hidratarTorneioEsport(t);
      if (hid) out.torneios.push(hid);
      if (out.torneios.length >= LIMITES_ESPORT_CONTA.TORNEIOS_CAP) break;
    }
  }
  if (Array.isArray(r.ligas)) {
    for (const l of r.ligas) {
      const hid = hidratarLigaEsport(l);
      if (hid) out.ligas.push(hid);
      if (out.ligas.length >= LIMITES_ESPORT_CONTA.LIGAS_CAP) break;
    }
  }
  out.ts = msLimpo(r.ts, 0);
  return out;
}

// ── MERGE entre aparelhos (a regra central da v91) ──────────────────────
const RANK_ESTADO_T: Record<TorneioEsport["estado"], number> = { inscricao: 1, ativo: 2, terminado: 3 };
const RANK_ESTADO_L: Record<LigaEsport["estado"], number> = { ativo: 1, terminado: 2 };

function ultimaAtividadeT(t: TorneioEsport): number {
  return t.historico.length > 0 ? t.historico[t.historico.length - 1].em : t.criadoEm;
}
function ultimaAtividadeL(l: LigaEsport): number {
  return l.historico.length > 0 ? l.historico[l.historico.length - 1].em : l.criadoEm;
}

function torneioMaisAvancado(a: TorneioEsport, b: TorneioEsport): TorneioEsport {
  if (a.premioReclamado !== b.premioReclamado) return a.premioReclamado ? a : b;
  const ra = RANK_ESTADO_T[a.estado], rb = RANK_ESTADO_T[b.estado];
  if (ra !== rb) return ra > rb ? a : b;
  if (a.historico.length !== b.historico.length) return a.historico.length > b.historico.length ? a : b;
  return ultimaAtividadeT(a) >= ultimaAtividadeT(b) ? a : b;
}

function ligaMaisAvancada(a: LigaEsport, b: LigaEsport): LigaEsport {
  if (a.premioReclamado !== b.premioReclamado) return a.premioReclamado ? a : b;
  const ra = RANK_ESTADO_L[a.estado], rb = RANK_ESTADO_L[b.estado];
  if (ra !== rb) return ra > rb ? a : b;
  if (a.historico.length !== b.historico.length) return a.historico.length > b.historico.length ? a : b;
  return ultimaAtividadeL(a) >= ultimaAtividadeL(b) ? a : b;
}

/**
 * O MERGE da v91: UNIÃO por id (um torneio por aparelho coexiste), mesmo id
 * vence o estado MAIS AVANÇADO (nunca mistura participantes — declarado).
 * Nunca muta — devolve um estado NOVO (padrão do núcleo v86).
 */
export function mesclarEstadosEsport(a: EstadoEsport, b: EstadoEsport): EstadoEsport {
  const torneios = new Map<string, TorneioEsport>();
  for (const t of hidratarEstadoEsport(a).torneios) torneios.set(t.id, t);
  for (const t of hidratarEstadoEsport(b).torneios) {
    const atual = torneios.get(t.id);
    torneios.set(t.id, atual ? torneioMaisAvancado(atual, t) : t);
  }
  const ligas = new Map<string, LigaEsport>();
  for (const l of hidratarEstadoEsport(a).ligas) ligas.set(l.id, l);
  for (const l of hidratarEstadoEsport(b).ligas) {
    const atual = ligas.get(l.id);
    ligas.set(l.id, atual ? ligaMaisAvancada(atual, l) : l);
  }
  const listaT = [...torneios.values()]
    .sort((x, y) => y.criadoEm - x.criadoEm)
    .slice(0, LIMITES_ESPORT_CONTA.TORNEIOS_CAP);
  const listaL = [...ligas.values()]
    .sort((x, y) => y.criadoEm - x.criadoEm)
    .slice(0, LIMITES_ESPORT_CONTA.LIGAS_CAP);
  return { torneios: listaT, ligas: listaL, ts: Math.max(a.ts || 0, b.ts || 0) };
}

/** Vínculo convidado → conta: união dos dois estados (mesma regra do merge). */
export function absorverConvidadoEsport(estadoConta: EstadoEsport, estadoConvidado: EstadoEsport): EstadoEsport {
  return mesclarEstadosEsport(estadoConta, estadoConvidado);
}

// ── Linha do servidor (forma do fio esport_conta) ───────────────────────
export interface LinhaEsportConta {
  user_id: string;
  jogador_id: string;
  torneios: TorneioEsport[];
  ligas: LigaEsport[];
}

function userIdValido(userId: string): boolean {
  return typeof userId === "string" && userId.length > 0 && userId.length <= LIMITES_ESPORT_CONTA.USER_ID_CAP;
}

/** Estado → linha do servidor (validação dura; nunca lança; podres ficam fora). */
export function estadoParaLinhaEsport(e: EstadoEsport, userId: string, jogadorIdAparelho = ""): LinhaEsportConta | null {
  if (!userIdValido(userId)) return null;
  const limpo = hidratarEstadoEsport(e);
  return {
    user_id: userId,
    jogador_id: (jogadorIdAparelho || userId).slice(0, LIMITES_ESPORT_CONTA.USER_ID_CAP),
    torneios: limpo.torneios,
    ligas: limpo.ligas,
  };
}

/** Linha → estado (user_id tem de bater CERTO — RLS provado no núcleo). */
export function linhaParaEstadoEsport(linha: unknown, userId: string): EstadoEsport | null {
  if (!userIdValido(userId)) return null;
  if (typeof linha !== "object" || linha === null) return null;
  const o = linha as Record<string, unknown>;
  if (typeof o.user_id !== "string" || o.user_id !== userId) return null;
  return hidratarEstadoEsport({ torneios: o.torneios, ligas: o.ligas, ts: o.ts });
}

// ── Impressão anti-spam (dedupe dos envios) ─────────────────────────────
/**
 * Impressão determinística do estado sincronizável: por torneio/liga,
 * id + estado + claim + ronda + nº de entradas de histórico + progresso
 * de CADA participante (id:pontos:vitórias:partidas) — é o progresso das
 * partidas reais que muda o servidor. Ordenado por id (nunca pela ordem
 * do array) para dois aparelhos com o MESMO estado imprimir IGUAL.
 */
function partImpressao(ps: ParticipanteEsport[]): string {
  return ps.slice().sort((x, y) => x.id.localeCompare(y.id))
    .map((p) => `${p.id}:${p.pontos}:${p.vitorias}:${p.partidas}:${p.rondaEliminado ?? ""}`)
    .join(",");
}

export function impressaoEstadoEsport(e: EstadoEsport): string {
  const limpo = hidratarEstadoEsport(e);
  const ts = limpo.torneios.slice().sort((x, y) => x.id.localeCompare(y.id))
    .map((t) => `T${t.id}|${t.estado}|${t.ronda}/${t.rondasTotal}|${t.premioReclamado ? 1 : 0}|${t.vencedorId}|${t.historico.length}|${partImpressao(t.participantes)}`);
  const ls = limpo.ligas.slice().sort((x, y) => x.id.localeCompare(y.id))
    .map((l) => `L${l.id}|${l.estado}|${l.premioReclamado ? 1 : 0}|${l.campeaoId}|${l.historico.length}|${partImpressao(l.pontuacao)}`);
  return [...ts, ...ls].join(";");
}

/** Enviar? false quando nada de sincronizável mudou desde o último envio. */
export function deveEnviarEsport(ultimoEnviado: string | null, estado: EstadoEsport): boolean {
  return ultimoEnviado !== impressaoEstadoEsport(estado);
}
