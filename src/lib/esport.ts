// =============================================================
// E-SPORT BATEU — TORNEIOS · LIGAS · EMPRESAS (v86)
// ─────────────────────────────────────────────────────────────
// O pedido: «as funcionalidades de e-sport devem estar a
// funcionar MUITO — criação de torneios, ligas para diferentes
// jogos, e as empresas também podem criar.»
//
// NÚCLEO ISOMÓRFICO PURO (padrão desafios.ts v70 / iaHistorico
// v58 / progressaoConta v84): zero React, zero DOM obrigatório,
// seguro em Node — as suítes importam isto sem browser.
//
// REGRA DA CASA (honestidade):
// · SEM SERVIDOR DE E-SPORT ainda — o estado vive NO APARELHO
//   (`bateu_esport_v1`) e a nota está na UI. Nada finge backend.
// · RESULTADOS REAIS OU NADA: só entram pontos vindos de
//   partidas que o jogo REPORTOU de verdade (bus `bateu:partida`).
//   No BATEU KART cada corrida dá POSIÇÕES REAIS a TODOS os 12
//   pilotos (tu + 11 rivais IA do circuito) — o campeonato é uma
//   competição a sério contra o campo. Nos outros jogos, a liga
//   acumula os TEUS pontos reais por partida (os rivais IA só
//   correm posições no kart — declarado na UI, nunca inventado).
// · PRÉMIOS: Pontos Bateu, claim 1×, pagos pela UI com a store
//   da progressão (pontosDeJogo) — o ciclo de retenção fecha.
// =============================================================

// ── tipos ─────────────────────────────────────────────────────
export type FormatoTorneio = "campeonato" | "eliminatoria";
export type PistaTorneio = "praia" | "deserto" | "vulcao" | "qualquer";

export interface OrganizadorEsport {
  tipo: "jogador" | "empresa";
  nome: string;
  sector: string;   // empresa: sector; jogador: «Piloto»
  cor: string;      // CSS hex (marca nos cartões)
  iniciais: string; // 2-3 letras do logótipo gerado
}

export interface ParticipanteEsport {
  id: string;        // "eu" para o jogador; bots: slug do nome
  nome: string;
  pontos: number;    // campeonato: pontos acumulados
  vitorias: number;
  partidas: number;
  eBot: boolean;     // rivais IA do circuito — SEMPRE etiquetados
  rondaEliminado?: number; // eliminatória: ronda em que caiu
}

export interface HistoricoEsport { em: number; texto: string }

export interface TorneioEsport {
  id: string;
  nome: string;
  jogo: string;                    // id do catálogo (JOGOS_ESPORT)
  formato: FormatoTorneio;
  tamanho: number;                 // 4 | 8 | 12 (eliminatória: 4 | 8)
  organizador: OrganizadorEsport;
  premioPontos: number;            // Pontos Bateu do campeão
  pista: PistaTorneio;             // kart: pista da ronda
  voltas: number;                  // kart: voltas da ronda (3-5)
  estado: "inscricao" | "ativo" | "terminado";
  criadoEm: number;
  terminaEm: number;               // campeonato: fim da janela; eliminatória: teto
  participantes: ParticipanteEsport[];
  ronda: number;                   // eliminatória: ronda atual (1…rondasTotal)
  rondasTotal: number;
  vencedorId: string;              // "" enquanto aberto
  premioReclamado: boolean;
  historico: HistoricoEsport[];
}

export interface LigaEsport {
  id: string;
  nome: string;
  jogo: string;
  temporada: string;               // «Temporada 1» gerada
  organizador: OrganizadorEsport;
  premioPontos: number;
  criadoEm: number;
  terminaEm: number;
  estado: "ativo" | "terminado";
  pontuacao: ParticipanteEsport[];
  campeaoId: string;
  premioReclamado: boolean;
  historico: HistoricoEsport[];
}

export interface EstadoEsport {
  torneios: TorneioEsport[];
  ligas: LigaEsport[];
  ts: number;
}

// ── partidas reais (o que o jogo reportou) ────────────────────
export interface ResultadoCampoEsport { id: string; nome: string; posicao: number }
export interface PartidaEsport {
  jogoId: string;
  pontos: number;                  // pontos reais reportados (0 se n/a)
  vitoria: boolean;
  posicao?: number;                // kart: a MINHA posição
  total?: number;
  campo?: ResultadoCampoEsport[];  // kart: posições de TODOS os 12 pilotos
}

// ── persistência honesta (aparelho) ───────────────────────────
export const CHAVE_ESPORT = "bateu_esport_v1";
export const TETO_TORNEIOS = 12;
export const TETO_LIGAS = 8;

function lsLer(chave: string): string | null {
  try { return typeof localStorage !== "undefined" ? localStorage.getItem(chave) : null; } catch { return null; }
}
function lsGuardar(chave: string, valor: string): void {
  try { if (typeof localStorage !== "undefined") localStorage.setItem(chave, valor); } catch { /* sem storage — honesto */ }
}

export function lerEsport(): EstadoEsport {
  try {
    const raw = lsLer(CHAVE_ESPORT);
    if (raw) {
      const p = JSON.parse(raw) as EstadoEsport;
      if (p && Array.isArray(p.torneios) && Array.isArray(p.ligas)) return p;
    }
  } catch { /* corrupto → novo */ }
  return { torneios: [], ligas: [], ts: 0 };
}

function guardarEsport(e: EstadoEsport): void {
  e.ts = Date.now();
  lsGuardar(CHAVE_ESPORT, JSON.stringify(e));
}

// ── catálogo de jogos do e-sport (fonte única — espelho do
//    gamesCatalog ALL_GAMES sem imports React do kit) ──────────
export interface JogoEsportDef { id: string; label: string; temCampo: boolean }
export const JOGOS_ESPORT: JogoEsportDef[] = [
  { id: "kart", label: "BATEU KART: Circuito das Lendas", temCampo: true },
  { id: "tetris", label: "Tetris", temCampo: false },
  { id: "chess", label: "Xadrez", temCampo: false },
  { id: "checkers", label: "Damas", temCampo: false },
  { id: "connect4", label: "Ligar 4", temCampo: false },
  { id: "snakebattle", label: "Batalha de Cobras", temCampo: false },
  { id: "spaceshooter", label: "Guerra Espacial", temCampo: false },
  { id: "dominoes", label: "Dominó", temCampo: false },
  { id: "urusse", label: "Urusse", temCampo: false },
  { id: "tictactoepro", label: "Galo PRO", temCampo: false },
];
export function jogoEsport(id: string): JogoEsportDef | null {
  return JOGOS_ESPORT.find((j) => j.id === id) ?? null;
}

// ── rivais IA (os MESMOS 11 pilotos do circuito — honestos: cada
//    participante-bot é etiquetado «IA» na classificação) ───────
export const RIVAIS_IA = ["Kudisso", "Zapata", "Makuti", "Ndove", "Turbo Tia", "Capalanga", "Xitique", "Djakba", "Maningue", "Bué Rápido", "Marimba"];

// ── pontuação por POSIÇÃO REAL (tabela fixa estilo F1, 12.º lugar = 0) ──
export const PONTOS_POSICAO = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0];
export function pontosPorPosicao(posicao: number): number {
  const i = Math.round(posicao) - 1;
  if (!Number.isFinite(i) || i < 0 || i >= PONTOS_POSICAO.length) return 0;
  return PONTOS_POSICAO[i];
}
export const TETO_PONTOS_PARTIDA_SEM_CAMPO = 25; // jogos sem campo: teto honesto por partida

// ── validação ─────────────────────────────────────────────────
export const PREMIO_MIN = 100;
export const PREMIO_MAX = 5000;
export const JANELA_MIN_DIAS = 1;
export const JANELA_MAX_DIAS = 30;

export interface InputTorneio {
  nome: string;
  jogo: string;
  formato: FormatoTorneio;
  tamanho: number;
  premioPontos: number;
  pista: PistaTorneio;
  voltas: number;
  janelaDias: number;
  organizadorEmpresa: boolean;
  empresaNome: string;
  empresaSector: string;
}

const CORES_MARCA = ["#e0453a", "#31c46c", "#2ea043", "#9b3de0", "#ff5a2a", "#e6b31e", "#3ddc55", "#40c4ff", "#ff4081", "#e0b31e"];

export function validaTorneio(i: InputTorneio): { sim: boolean; motivo: string } {
  const nome = (i.nome ?? "").trim();
  if (nome.length < 4 || nome.length > 40) return { sim: false, motivo: "nome 4-40" };
  if (!jogoEsport(i.jogo)) return { sim: false, motivo: "jogo desconhecido" };
  if (i.formato !== "campeonato" && i.formato !== "eliminatoria") return { sim: false, motivo: "formato inválido" };
  if (i.formato === "eliminatoria" && i.tamanho !== 4 && i.tamanho !== 8) return { sim: false, motivo: "eliminatória 4 ou 8" };
  if (i.tamanho !== 4 && i.tamanho !== 8 && i.tamanho !== 12) return { sim: false, motivo: "tamanho 4/8/12" };
  if (!Number.isFinite(i.premioPontos) || i.premioPontos < PREMIO_MIN || i.premioPontos > PREMIO_MAX) return { sim: false, motivo: `prémio ${PREMIO_MIN}-${PREMIO_MAX}` };
  if (i.jogo === "kart" && !["praia", "deserto", "vulcao", "qualquer"].includes(i.pista)) return { sim: false, motivo: "pista inválida" };
  if (i.jogo === "kart" && ![3, 4, 5].includes(i.voltas)) return { sim: false, motivo: "voltas 3-5" };
  if (!Number.isFinite(i.janelaDias) || i.janelaDias < JANELA_MIN_DIAS || i.janelaDias > JANELA_MAX_DIAS) return { sim: false, motivo: `janela ${JANELA_MIN_DIAS}-${JANELA_MAX_DIAS} dias` };
  if (i.organizadorEmpresa) {
    const emp = (i.empresaNome ?? "").trim();
    if (emp.length < 2 || emp.length > 24) return { sim: false, motivo: "nome da empresa 2-24" };
    if ((i.empresaSector ?? "").trim().length < 2) return { sim: false, motivo: "sector 2-24" };
  }
  return { sim: true, motivo: "" };
}

export interface InputLiga {
  nome: string;
  jogo: string;
  premioPontos: number;
  janelaDias: number;
  organizadorEmpresa: boolean;
  empresaNome: string;
  empresaSector: string;
}

export function validaLiga(i: InputLiga): { sim: boolean; motivo: string } {
  const nome = (i.nome ?? "").trim();
  if (nome.length < 4 || nome.length > 40) return { sim: false, motivo: "nome 4-40" };
  if (!jogoEsport(i.jogo)) return { sim: false, motivo: "jogo desconhecido" };
  if (!Number.isFinite(i.premioPontos) || i.premioPontos < PREMIO_MIN || i.premioPontos > PREMIO_MAX) return { sim: false, motivo: `prémio ${PREMIO_MIN}-${PREMIO_MAX}` };
  if (!Number.isFinite(i.janelaDias) || i.janelaDias < JANELA_MIN_DIAS || i.janelaDias > JANELA_MAX_DIAS) return { sim: false, motivo: `janela ${JANELA_MIN_DIAS}-${JANELA_MAX_DIAS} dias` };
  if (i.organizadorEmpresa) {
    const emp = (i.empresaNome ?? "").trim();
    if (emp.length < 2 || emp.length > 24) return { sim: false, motivo: "nome da empresa 2-24" };
    if ((i.empresaSector ?? "").trim().length < 2) return { sim: false, motivo: "sector 2-24" };
  }
  return { sim: true, motivo: "" };
}

// ── organizador (jogador OU empresa) ──────────────────────────
function organizadorDe(i: { organizadorEmpresa: boolean; empresaNome: string; empresaSector: string }): OrganizadorEsport {
  if (!i.organizadorEmpresa) {
    return { tipo: "jogador", nome: "Eu", sector: "Piloto", cor: "#f97316", iniciais: "EU" };
  }
  const nome = i.empresaNome.trim();
  const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 16) || "empresa";
  const iniciais = nome.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "EM";
  return {
    tipo: "empresa",
    nome,
    sector: (i.empresaSector || "Patrocínio").trim().slice(0, 24),
    cor: CORES_MARCA[Math.abs(hashSlug(slug)) % CORES_MARCA.length],
    iniciais: iniciais.slice(0, 3),
  };
}

function hashSlug(s: string): number {
  let h = 0;
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) | 0;
  return h;
}

// ── criar torneio ─────────────────────────────────────────────
export function criarTorneio(input: InputTorneio, agoraMs = Date.now()): { t: TorneioEsport | null; motivo: string } {
  const v = validaTorneio(input);
  if (!v.sim) return { t: null, motivo: v.motivo };
  const estado = lerEsport();
  if (estado.torneios.length >= TETO_TORNEIOS) return { t: null, motivo: `teto de ${TETO_TORNEIOS} torneios no aparelho` };
  const elim = input.formato === "eliminatoria";
  const t: TorneioEsport = {
    id: `local-${input.jogo}-${agoraMs.toString(36)}-${(hashSlug(input.nome) >>> 0).toString(36)}`,
    nome: input.nome.trim(),
    jogo: input.jogo,
    formato: input.formato,
    tamanho: input.tamanho,
    organizador: organizadorDe(input),
    premioPontos: Math.round(input.premioPontos),
    pista: input.jogo === "kart" ? input.pista : "qualquer",
    voltas: input.jogo === "kart" ? Math.round(input.voltas) : 4,
    estado: "inscricao",
    criadoEm: agoraMs,
    terminaEm: agoraMs + Math.round(input.janelaDias) * 86_400_000,
    participantes: [],
    ronda: 0,
    rondasTotal: elim ? (input.tamanho === 8 ? 2 : 2) : 0,
    vencedorId: "",
    premioReclamado: false,
    historico: [{ em: agoraMs, texto: `Torneio criado por ${input.organizadorEmpresa ? input.empresaNome.trim() : "jogador"}` }],
  };
  estado.torneios.push(t);
  guardarEsport(estado);
  return { t, motivo: "" };
}

// ── inscrição + arranque ──────────────────────────────────────
const EU_ID = "eu";

export function inscreverTorneio(id: string, meuNome = "Eu", agoraMs = Date.now()): { ok: boolean; motivo: string } {
  const estado = lerEsport();
  const t = estado.torneios.find((x) => x.id === id);
  if (!t) return { ok: false, motivo: "torneio não encontrado" };
  if (t.estado !== "inscricao") return { ok: false, motivo: "inscrições fechadas" };
  if (t.participantes.some((p) => p.id === EU_ID)) return { ok: false, motivo: "já inscrito" };
  t.participantes.push({ id: EU_ID, nome: meuNome.trim() || "Eu", pontos: 0, vitorias: 0, partidas: 0, eBot: false });
  t.historico.push({ em: agoraMs, texto: "Inscrição confirmada" });
  guardarEsport(estado);
  return { ok: true, motivo: "" };
}

/** Preenche a grelha com rivais IA e abre o torneio. Os bots são
 *  HONESTOS: são os rivais do circuito, etiquetados «IA», e só
 *  pontuam em partidas que ACONTECEM de verdade (posições reais). */
export function iniciarTorneio(id: string, agoraMs = Date.now()): { ok: boolean; motivo: string } {
  const estado = lerEsport();
  const t = estado.torneios.find((x) => x.id === id);
  if (!t) return { ok: false, motivo: "torneio não encontrado" };
  if (t.estado !== "inscricao") return { ok: false, motivo: "já iniciado" };
  if (!t.participantes.some((p) => p.id === EU_ID)) return { ok: false, motivo: "inscreve-te primeiro" };
  const faltam = t.tamanho - t.participantes.length;
  for (let k = 0; k < faltam; k++) {
    const nome = RIVAIS_IA[k % RIVAIS_IA.length];
    t.participantes.push({ id: `ia-${k}`, nome, pontos: 0, vitorias: 0, partidas: 0, eBot: true });
  }
  t.estado = "ativo";
  t.ronda = t.formato === "eliminatoria" ? 1 : 0;
  t.historico.push({ em: agoraMs, texto: `Arranque — ${t.participantes.length} competidores (${t.participantes.filter((p) => p.eBot).length} rivais IA)` });
  guardarEsport(estado);
  return { ok: true, motivo: "" };
}

// ── janelas: expiração honesta ────────────────────────────────
export function expirarPendentes(agoraMs = Date.now()): { torneiosFechados: TorneioEsport[]; ligasFechadas: LigaEsport[] } {
  const estado = lerEsport();
  const torneiosFechados: TorneioEsport[] = [];
  const ligasFechadas: LigaEsport[] = [];
  for (const t of estado.torneios) {
    if (t.estado === "terminado") continue;
    if (agoraMs < t.terminaEm) continue;
    if (t.formato === "campeonato") {
      t.estado = "terminado";
      const ordem = [...t.participantes].sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias);
      t.vencedorId = ordem[0]?.id ?? "";
      t.historico.push({ em: agoraMs, texto: `Janela fechada — campeão: ${ordem[0]?.nome ?? "—"}` });
      torneiosFechados.push(t);
    } else if (t.estado === "inscricao") {
      t.estado = "terminado";
      t.historico.push({ em: agoraMs, texto: "Janela fechada sem arranque — ninguém competiu" });
      torneiosFechados.push(t);
    }
  }
  for (const l of estado.ligas) {
    if (l.estado === "terminado") continue;
    if (agoraMs < l.terminaEm) continue;
    l.estado = "terminado";
    const ordem = [...l.pontuacao].sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias);
    l.campeaoId = ordem[0]?.id ?? "";
    l.historico.push({ em: agoraMs, texto: `Temporada fechada — campeão: ${ordem[0]?.nome ?? "—"}` });
    ligasFechadas.push(l);
  }
  if (torneiosFechados.length || ligasFechadas.length) guardarEsport(estado);
  return { torneiosFechados, ligasFechadas };
}

// ── PIPELINE DE RESULTADOS REAIS ──────────────────────────────
/** UMA partida real → alimenta TODOS os torneios ativos desse jogo
 *  (campeonato: pontos por posição real de TODO o campo; jogos
 *  sem campo: só o jogador, teto por partida declarado).
 *  Devolve os ids dos torneios que FICARAM terminados (toast). */
export function partidaParaTorneios(partida: PartidaEsport, agoraMs = Date.now()): string[] {
  if (!partida || typeof partida.jogoId !== "string") return [];
  expirarPendentes(agoraMs);
  const estado = lerEsport();
  const terminados: string[] = [];
  for (const t of estado.torneios) {
    if (t.estado !== "ativo" || t.jogo !== partida.jogoId) continue;
    if (t.formato === "campeonato") {
      aplicarPartidaCampeonato(t, partida, agoraMs);
      if (agoraMs >= t.terminaEm) {
        t.estado = "terminado";
        const ordem = [...t.participantes].sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias);
        t.vencedorId = ordem[0]?.id ?? "";
        t.historico.push({ em: agoraMs, texto: `Campeonato fechado — campeão: ${ordem[0]?.nome ?? "—"}` });
        terminados.push(t.id);
      }
    } else {
      const res = avancarEliminatoria(t, partida, agoraMs);
      if (res === "terminado-campeao" || res === "terminado-eliminado") terminados.push(t.id);
    }
  }
  guardarEsport(estado);
  return terminados;
}

/** Correspondência honesta campo↔grelha: o JOGADOR é sempre id «eu»;
 *  os rivais IA casam POR NOME (o campo real do kart vem com os nomes
 *  dos pilotos, não com os ids da grelha). */
function participanteDoCampo(t: { participantes: ParticipanteEsport[] }, r: ResultadoCampoEsport): ParticipanteEsport | null {
  if (r.id === EU_ID) return t.participantes.find((p) => !p.eBot) ?? null;
  return t.participantes.find((p) => p.eBot && p.nome === r.nome) ?? null;
}

function aplicarPartidaCampeonato(t: TorneioEsport, partida: PartidaEsport, agoraMs: number): void {
  if (partida.campo && partida.campo.length > 0) {
    // campo REAL (kart): cada piloto pontua pela posição verdadeira
    for (const r of partida.campo) {
      const p = participanteDoCampo(t, r);
      if (!p) continue; // campo maior que a grelha: só a grelha pontua
      const pts = pontosPorPosicao(r.posicao);
      p.pontos += pts;
      p.partidas += 1;
      if (r.posicao === 1) p.vitorias += 1;
    }
  } else {
    // jogo SEM campo: só o JOGADOR acumula os TEUS pontos reais (teto honesto)
    const eu = t.participantes.find((x) => x.id === EU_ID);
    if (eu) {
      eu.pontos += Math.min(TETO_PONTOS_PARTIDA_SEM_CAMPO, Math.max(0, Math.round(partida.pontos)));
      eu.partidas += 1;
      if (partida.vitoria) eu.vitorias += 1;
    }
  }
  t.historico.push({ em: agoraMs, texto: `Partida de ${partida.jogoId} contabilizada` });
  if (t.historico.length > 40) t.historico = t.historico.slice(-40);
}

/** Eliminatória (kart): ronda r exige POSIÇÃO REAL ≤ corte.
 *  8 competidores: r1 top 4, final top 1. 4: r1 top 2, final top 1.
 *  A ronda é UMA corrida real contra o campo completo. */
export function corteRonda(t: TorneioEsport): number {
  if (t.formato !== "eliminatoria") return 0;
  if (t.ronda >= t.rondasTotal) return 1;
  return Math.max(1, Math.round(t.tamanho / Math.pow(2, t.ronda)));
}

function avancarEliminatoria(t: TorneioEsport, partida: PartidaEsport, agoraMs: number): "ok" | "terminado-campeao" | "terminado-eliminado" {
  if (!partida.campo || partida.campo.length === 0) return "ok"; // eliminatória exige posições reais
  const corte = corteRonda(t);
  const minha = partida.campo.find((r) => r.id === EU_ID);
  if (!minha) return "ok";
  const eu = t.participantes.find((x) => x.id === EU_ID);
  if (!eu) return "ok";
  eu.partidas += 1;
  if (minha.posicao === 1) eu.vitorias += 1;
  const avanca = minha.posicao <= corte;
  if (!avanca) {
    eu.rondaEliminado = t.ronda;
    t.estado = "terminado";
    t.historico.push({ em: agoraMs, texto: `Eliminado na ronda ${t.ronda} (corte top ${corte}, chegou ${minha.posicao}º)` });
    return "terminado-eliminado";
  }
  if (t.ronda >= t.rondasTotal) {
    t.estado = "terminado";
    t.vencedorId = EU_ID;
    t.historico.push({ em: agoraMs, texto: "CAMPEÃO — venceu a final (1.º no corte)" });
    return "terminado-campeao";
  }
  t.historico.push({ em: agoraMs, texto: `Ronda ${t.ronda} ultrapassada (corte top ${corte}, chegou ${minha.posicao}º) → ronda ${t.ronda + 1}` });
  t.ronda += 1;
  return "ok";
}

// ── LIGAS ─────────────────────────────────────────────────────
export function criarLiga(input: InputLiga, agoraMs = Date.now()): { l: LigaEsport | null; motivo: string } {
  const v = validaLiga(input);
  if (!v.sim) return { l: null, motivo: v.motivo };
  const estado = lerEsport();
  if (estado.ligas.length >= TETO_LIGAS) return { l: null, motivo: `teto de ${TETO_LIGAS} ligas no aparelho` };
  const temporadaN = estado.ligas.filter((l) => l.jogo === input.jogo).length + 1;
  const l: LigaEsport = {
    id: `local-liga-${input.jogo}-${agoraMs.toString(36)}-${(hashSlug(input.nome) >>> 0).toString(36)}`,
    nome: input.nome.trim(),
    jogo: input.jogo,
    temporada: `Temporada ${temporadaN}`,
    organizador: organizadorDe(input),
    premioPontos: Math.round(input.premioPontos),
    criadoEm: agoraMs,
    terminaEm: agoraMs + Math.round(input.janelaDias) * 86_400_000,
    estado: "ativo",
    pontuacao: [],
    campeaoId: "",
    premioReclamado: false,
    historico: [{ em: agoraMs, texto: `Liga criada por ${input.organizadorEmpresa ? input.empresaNome.trim() : "jogador"}` }],
  };
  estado.ligas.push(l);
  guardarEsport(estado);
  return { l, motivo: "" };
}

export function inscreverLiga(id: string, meuNome = "Eu", agoraMs = Date.now()): { ok: boolean; motivo: string } {
  const estado = lerEsport();
  const l = estado.ligas.find((x) => x.id === id);
  if (!l) return { ok: false, motivo: "liga não encontrada" };
  if (l.estado !== "ativo") return { ok: false, motivo: "temporada fechada" };
  if (agoraMs >= l.terminaEm) return { ok: false, motivo: "temporada expirada" };
  if (l.pontuacao.some((p) => p.id === EU_ID)) return { ok: false, motivo: "já inscrito" };
  l.pontuacao.push({ id: EU_ID, nome: meuNome.trim() || "Eu", pontos: 0, vitorias: 0, partidas: 0, eBot: false });
  l.historico.push({ em: agoraMs, texto: "Inscrição confirmada" });
  guardarEsport(estado);
  return { ok: true, motivo: "" };
}

/** Partida real → alimenta as LIGAS ativas desse jogo. */
export function partidaParaLigas(partida: PartidaEsport, agoraMs = Date.now()): string[] {
  if (!partida || typeof partida.jogoId !== "string") return [];
  expirarPendentes(agoraMs);
  const estado = lerEsport();
  const terminadas: string[] = [];
  for (const l of estado.ligas) {
    if (l.estado !== "ativo" || l.jogo !== partida.jogoId) continue;
    if (agoraMs >= l.terminaEm) continue;
    const eu = l.pontuacao.find((p) => p.id === EU_ID);
    if (eu) {
      if (partida.campo && partida.campo.length > 0) {
        const minha = partida.campo.find((r) => r.id === EU_ID);
        if (minha) {
          eu.pontos += pontosPorPosicao(minha.posicao);
          eu.partidas += 1;
          if (minha.posicao === 1) eu.vitorias += 1;
        }
      } else {
        eu.pontos += Math.min(TETO_PONTOS_PARTIDA_SEM_CAMPO, Math.max(0, Math.round(partida.pontos)));
        eu.partidas += 1;
        if (partida.vitoria) eu.vitorias += 1;
      }
      l.historico.push({ em: agoraMs, texto: `Partida de ${partida.jogoId} contabilizada` });
      if (l.historico.length > 40) l.historico = l.historico.slice(-40);
    }
    if (agoraMs >= l.terminaEm) {
      l.estado = "terminado";
      const ordem = [...l.pontuacao].sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias);
      l.campeaoId = ordem[0]?.id ?? "";
      l.historico.push({ em: agoraMs, texto: `Temporada fechada — campeão: ${ordem[0]?.nome ?? "—"}` });
      terminadas.push(l.id);
    }
  }
  guardarEsport(estado);
  return terminadas;
}

// ── prémios (claim 1×) ────────────────────────────────────────
export function podeClamarTorneio(id: string): boolean {
  const { torneios } = lerEsport();
  const t = torneios.find((x) => x.id === id);
  return !!t && t.estado === "terminado" && t.vencedorId === EU_ID && !t.premioReclamado;
}

export function clamarPremioTorneio(id: string, agoraMs = Date.now()): { pontos: number } | null {
  const estado = lerEsport();
  const t = estado.torneios.find((x) => x.id === id);
  if (!t || !podeClamarTorneio(id)) return null;
  t.premioReclamado = true;
  t.historico.push({ em: agoraMs, texto: `Prémio clamado: ${t.premioPontos} Pontos Bateu` });
  guardarEsport(estado);
  return { pontos: t.premioPontos };
}

export function podeClamarLiga(id: string): boolean {
  const { ligas } = lerEsport();
  const l = ligas.find((x) => x.id === id);
  return !!l && l.estado === "terminado" && l.campeaoId === EU_ID && !l.premioReclamado;
}

export function clamarPremioLiga(id: string, agoraMs = Date.now()): { pontos: number } | null {
  const estado = lerEsport();
  const l = estado.ligas.find((x) => x.id === id);
  if (!l || !podeClamarLiga(id)) return null;
  l.premioReclamado = true;
  l.historico.push({ em: agoraMs, texto: `Prémio clamado: ${l.premioPontos} Pontos Bateu` });
  guardarEsport(estado);
  return { pontos: l.premioPontos };
}

// ── bus de partidas reais (o MESMO contrato do painel v78) ────
/** Instala o ouvinte de `bateu:partida` { jogoId, vitoria, pontos,
 *  posicao, total, campo } — idempotente (um flag por módulo). */
let busInstalado = false;
export function ouvirPartidasEsport(): void {
  if (busInstalado || typeof window === "undefined") return;
  busInstalado = true;
  const onPartida = (ev: Event) => {
    const d = (ev as CustomEvent<Record<string, unknown>>).detail;
    if (!d || typeof d.jogoId !== "string") return;
    const partida: PartidaEsport = {
      jogoId: d.jogoId,
      pontos: typeof d.pontos === "number" && Number.isFinite(d.pontos) ? d.pontos : 0,
      vitoria: d.vitoria === true,
      posicao: typeof d.posicao === "number" ? d.posicao : undefined,
      total: typeof d.total === "number" ? d.total : undefined,
      campo: Array.isArray(d.campo) ? (d.campo as ResultadoCampoEsport[]).filter((r) => r && typeof r.id === "string" && Number.isFinite(r.posicao)) : undefined,
    };
    try { partidaParaTorneios(partida); } catch { /* estado corrupto não derruba o jogo */ }
    try { partidaParaLigas(partida); } catch { /* idem */ }
  };
  window.addEventListener("bateu:partida", onPartida as EventListener);
}

// ── helpers de UI ─────────────────────────────────────────────
export function torneiosDoAparelho(): TorneioEsport[] {
  expirarPendentes();
  return lerEsport().torneios.slice().sort((a, b) => b.criadoEm - a.criadoEm);
}
export function ligasDoAparelho(): LigaEsport[] {
  expirarPendentes();
  return lerEsport().ligas.slice().sort((a, b) => b.criadoEm - a.criadoEm);
}
export function torneioPorId(id: string): TorneioEsport | null {
  expirarPendentes();
  return lerEsport().torneios.find((x) => x.id === id) ?? null;
}
export function ligaPorId(id: string): LigaEsport | null {
  expirarPendentes();
  return lerEsport().ligas.find((x) => x.id === id) ?? null;
}
export function classificacaoTorneio(t: TorneioEsport): ParticipanteEsport[] {
  return [...t.participantes].sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || a.nome.localeCompare(b.nome));
}
export function classificacaoLiga(l: LigaEsport): ParticipanteEsport[] {
  return [...l.pontuacao].sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || a.nome.localeCompare(b.nome));
}
