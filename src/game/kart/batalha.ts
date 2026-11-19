// ============================================================
// BATALHA DE BALÕES — v68 (núcleo isomórfico, 100% sobre o core)
// ────────────────────────────────────────────────────────────
// Modo «Batalha» estilo Mario Kart: anel curto e largo (Coliseu),
// 12 pilotos, 3 balões cada. Quem é atingido por ARMA perde 1
// balão e fica breve-invulnerável; a 0 balões o kart fica FORA
// (wreck em campo, sem controlo, sem itens). Vence o último de pé;
// quando o TETO de tempo fecha, ganha quem tem mais balões
// (desempate: golpes feitos, depois progresso).
//
// HONESTO: reaproveita a física/itens/IA do core passo a passo
// (passoCorrida com voltas «infinitas» — ninguém «termina» por
// distância) e computa APENAS a camada de balões/ranking aqui.
// Isomórfico puro: corre no browser E no Node (suíte de testes).
// ============================================================
import {
  construirPista, novaCorrida, passoCorrida, ARENA_BATALHA,
  MAX_CORREDORES,
  type Corredor, type EntradaKart, type EstadoCorrida, type KartId, type MelhoriaId, type PistaDef,
} from "./core.ts";

/** Balões por piloto no início. */
export const BALOES_INICIAIS = 3;
/** Janela sem perder balão depois de um golpe (o stun do core já protege ~1-1,7 s; isto acrescenta a folga). */
export const INVUL_BALAO_S = 2.2;
/** Teto honesto da batalha: fecha por ranking de balões. */
export const DURACAO_BATALHA_S = 180;
/** «Voltas» infinitas: a batalha NÃO termina por distância — só por balões/teto. */
export const VOLTAS_INFINITAS = 999;

/** Def usada pela batalha (a MESMA que pistaPorId("coliseu") resolve). */
export const pistaBatalha: PistaDef = ARENA_BATALHA;

export type EventoBatalha =
  | { t: "balao"; alvo: number; por: number; restam: number }
  | { t: "eliminado"; alvo: number; por: number }
  | { t: "fimBatalha"; vencedor: number };

export interface EstadoBatalha {
  /** A «corrida» subjacente — física, itens, IA, colisões, projéteis (voltas=∞). */
  cor: EstadoCorrida;
  /** Balões por corredor (índice = id). */
  baloes: number[];
  /** Invulnerabilidade restante por corredor (s). */
  invuln: number[];
  /** Golpes creditados por corredor (desempate do ranking). */
  golpes: number[];
  /** Ids eliminados POR ORDEM de eliminação (o último eliminado é o melhor dos fora). */
  eliminados: number[];
  fim: boolean;
  vencedor: number; // -1 enquanto corre
  eventos: EventoBatalha[];
}

export function novaBatalha(opts: {
  kartJogador: KartId;
  melhoriasJogador?: Partial<Record<MelhoriaId, number>>;
  nomeJogador?: string;
  semente?: number;
}): EstadoBatalha {
  const pista = construirPista(pistaBatalha);
  const cor = novaCorrida({
    pista,
    voltas: VOLTAS_INFINITAS,
    kartJogador: opts.kartJogador,
    melhoriasJogador: opts.melhoriasJogador,
    nomeJogador: opts.nomeJogador,
    semente: opts.semente,
  });
  // FURO fechado (apanhado pela sonda): novaCorrida CLAMPEIA voltas a
  // VOLTAS_MAX (5) — «999» entrava como 5 e a batalha ACABAVA por
  // distância (5 voltas do anel). O clamp é da corrida; a batalha define
  // o campo DEPOIS da construção: ninguém «termina» por voltas aqui.
  cor.voltas = VOLTAS_INFINITAS;
  return {
    cor,
    baloes: new Array(MAX_CORREDORES).fill(BALOES_INICIAIS),
    invuln: new Array(MAX_CORREDORES).fill(0),
    golpes: new Array(MAX_CORREDORES).fill(0),
    eliminados: [],
    fim: false,
    vencedor: -1,
    eventos: [],
  };
}

/** Perda de balão (com invulnerabilidade + eliminação a zero). `por` pode ser o dono do projétil ou o lançador do raio. */
function perderBalao(b: EstadoBatalha, alvo: number, por: number): void {
  if (alvo < 0 || alvo >= b.baloes.length) return;
  if (b.baloes[alvo] <= 0 || b.invuln[alvo] > 0) return;
  const c = b.cor.corredores[alvo];
  if (!c || c.terminou) return;
  b.baloes[alvo]--;
  b.invuln[alvo] = INVUL_BALAO_S;
  if (por >= 0 && por !== alvo) b.golpes[por]++;
  if (b.baloes[alvo] <= 0) {
    c.terminou = true; // wreck: sai do controlo/itens e não volta a ser atingido (o core respeita terminou)
    b.eliminados.push(alvo);
    b.eventos.push({ t: "eliminado", alvo, por });
  } else {
    b.eventos.push({ t: "balao", alvo, por, restam: b.baloes[alvo] });
  }
}

/** Ranking da batalha: vivos primeiro (balões ↓, golpes ↓, progresso ↓), depois eliminados por ordem REVERSA. */
export function rankingBatalha(b: EstadoBatalha): Corredor[] {
  const vivos = b.cor.corredores.filter((c) => !c.terminou && b.baloes[c.id] > 0);
  vivos.sort((a, c) =>
    b.baloes[c.id] - b.baloes[a.id] ||
    b.golpes[c.id] - b.golpes[a.id] ||
    c.sTotal - a.sTotal ||
    a.id - c.id,
  );
  const fora = [...b.eliminados].reverse().map((id) => b.cor.corredores[id]);
  return [...vivos, ...fora];
}

/** Recompensa da batalha (tabela por posição + bónus por balão sobrevivente — o bónus nunca excede os 3 iniciais). */
export function recompensaBatalha(posicao: number, baloes: number): { moedas: number; xp: number } {
  const tabela = [120, 85, 65, 50, 40, 34, 28, 22, 18, 14, 10, 8];
  const base = tabela[Math.max(0, Math.min(tabela.length - 1, posicao - 1))];
  return { moedas: base + Math.min(BALOES_INICIAIS, Math.max(0, baloes)) * 10, xp: Math.round(base * 0.6) };
}

function encerrar(b: EstadoBatalha): void {
  b.fim = true;
  const ordem = rankingBatalha(b);
  ordem.forEach((c, idx) => { c.posicao = idx + 1; });
  b.cor.resultados = ordem.map((c, idx) => ({ id: c.id, nome: c.nome, posicao: idx + 1, tempo: 0 }));
  const jogador = b.cor.corredores.find((c) => c.eJogador) ?? b.cor.corredores[6];
  const posJogador = ordem.findIndex((c) => c.id === jogador.id) + 1;
  const rec = recompensaBatalha(posJogador, Math.max(0, b.baloes[jogador.id]));
  b.cor.payout = { moedas: rec.moedas, xp: rec.xp, recorde: false };
  const vivos = b.cor.corredores.filter((c) => !c.terminou && b.baloes[c.id] > 0);
  b.vencedor = vivos.length > 0 ? vivos[0].id : (b.eliminados.length > 0 ? b.eliminados[b.eliminados.length - 1] : jogador.id);
  b.eventos.push({ t: "fimBatalha", vencedor: b.vencedor });
}

/**
 * Passo da batalha (SOLO — o jogador é o único humano; os bots usam a IA do core).
 * Processa TODOS os eventos de golpe/raio PENDENTES no core (os gerados neste passo
 * E qualquer residual — invariante: quem consome a fila depois é o motor, que a
 * DRENA por frame para som/avisos; produção nunca reprocessa) e traduz em BALÕES.
 */
export function passoBatalha(b: EstadoBatalha, entradaJogador: EntradaKart, dt: number): void {
  if (b.fim) return;
  passoCorrida(b.cor, entradaJogador, dt);
  const lote = b.cor.eventos.slice();

  // escudos consumidos NESTE lote protegem os balões (o core já bloqueia o stun)
  const protegidos = new Set<number>();
  for (const ev of lote) if (ev.t === "escudo") protegidos.add(ev.alvo);

  for (const ev of lote) {
    if (ev.t === "golpe") {
      perderBalao(b, ev.alvo, ev.por);
    } else if (ev.t === "raio") {
      for (const c of b.cor.corredores) {
        if (c.id === ev.por || c.terminou) continue;
        if (protegidos.has(c.id)) continue;
        perderBalao(b, c.id, ev.por);
      }
    }
  }

  for (let i = 0; i < b.invuln.length; i++) if (b.invuln[i] > 0) b.invuln[i] = Math.max(0, b.invuln[i] - dt);

  // fim por eliminação do JOGADOR: o passoCorrida (solo) fecha quando o jogador terminou
  if (b.cor.fase === "fim") { encerrar(b); return; }

  const vivos = b.cor.corredores.filter((c) => !c.terminou && b.baloes[c.id] > 0);
  if (vivos.length <= 1) { b.cor.fase = "fim"; encerrar(b); return; }
  if (b.cor.tempo >= DURACAO_BATALHA_S) { b.cor.fase = "fim"; encerrar(b); }
}

// ── Gancho de teste (Node): batalha completa determinística ────
export function simularBatalha(opts: Parameters<typeof novaBatalha>[0] & { dt?: number; maxSegundos?: number }): { estado: EstadoBatalha; passos: number } {
  const b = novaBatalha(opts);
  const dt = opts.dt ?? 1 / 30;
  const teto = opts.maxSegundos ?? (DURACAO_BATALHA_S + 30);
  let passos = 0;
  const e = b.cor;
  while (!b.fim && passos * dt < teto) {
    const j = e.corredores.find((c) => c.eJogador) ?? e.corredores[6];
    // o piloto do teste conduz pela pista (como o dirigirAuto) e usa o item assim que o recebe
    const m = e.pista.amostras.length;
    const alvo = e.pista.amostras[(j.iAmostra + 12) % m];
    const dif = Math.atan2(alvo.x - j.x, alvo.z - j.z) - j.ang;
    const usar = j.item !== null;
    passoBatalha(b, { acelerar: true, travar: false, virar: Math.max(-1, Math.min(1, Math.atan2(Math.sin(dif), Math.cos(dif)) * 2.5)), derrapar: false, usarItem: usar }, dt);
    e.eventos.length = 0; // dreno (invariante de produção: o motor drena por frame)
    passos++;
  }
  return { estado: b, passos };
}
