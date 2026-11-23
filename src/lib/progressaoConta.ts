// ═══════════════════════════════════════════════════════════════════════
// v84 — «O PROGRESSO SEGUE A CONTA» — NÚCLEO ISOMÓRFICO (browser E Node)
// A fatia anotada desde a v83: o progresso do jogador segue a CONTA entre
// dispositivos. Este módulo é PURO (zero supabase, zero DOM, zero React —
// padrão iaHistorico v58 / ciclo v79): as regras do MERGE entre aparelhos,
// a forma da linha do servidor e os caps — tudo provado no Node.
//
// Modelo de sincronização (honesto, declarado):
//   · o APARELHO continua a ser a fonte imediata (jogável sem rede);
//   · o SERVIDOR é a fonte de verdade da progressão sincronizada;
//   · o MERGE entre aparelhos é por MÁXIMO (pontos, missões concluídas):
//     os pontos NUNCA descem e NUNCA dupla-contam — declarado: jogadas
//     paralelas em dois aparelhos contam o maior, nunca a soma;
//   · o progresso de CONVIDADO do aparelho é ABSORVIDO no primeiro
//     vínculo à conta (mesmo merge por máximo) e o ficheiro de convidado
//     é limpo DEPOIS de absorvido — nada é apagado sem ter sido somado;
//   · as missões do dia unem-se por MODELO (o id muda com a semente do
//     jogador — convidado vs conta): ganha a que tiver mais progresso,
//     «reclamada» vence em qualquer lado;
//   · o que não pode ser validado é DESCARTADO com honestidade (linha
//     podre nunca mata a sincronização — padrão hidratarProgressao);
//   · as 4 CARTEIRAS continuam SEPARADAS: aqui só existe a progressão
//     de PONTOS — bilhetes/prémios/saldo vivem nas camadas próprias.
// ═══════════════════════════════════════════════════════════════════════

import {
  EstadoProgressao, Missao, VERSAO_PROGRESSAO, estadoPadrao, hidratarProgressao,
} from "./progressao";

// ── Limites (os MESMOS do CHECK da migração SQL — sincronizados) ────────
export const LIMITES_PROGRESSAO_CONTA = {
  USER_ID_CAP: 60,
  JOGADOR_ID_CAP: 60,
  PONTOS_CAP: 2_000_000,
  MISSOES_CONCLUIDAS_CAP: 100_000,
  MISSOES_CAP: 12,
  JOGOS_HOJE_CAP: 60,
} as const;

// Código do PostgREST quando a tabela ainda não existe (migração pendente)
export const CODIGO_MIGRACAO_PENDENTE = "PGRST205";

/** Chave do cache de CONTA no aparelho (o convidado mantém a chave v78). */
export function chaveCacheConta(userId: string): string {
  const id = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, LIMITES_PROGRESSAO_CONTA.USER_ID_CAP);
  return `bateu_progressao_v78:u:${id}`;
}

// ── MERGE entre aparelhos (a regra central da v84) ──────────────────────
function mesclarMissoes(a: Missao[], b: Missao[]): Missao[] {
  const porModelo = new Map<string, Missao>();
  // a primeiro (ordem de inserção preservada), b depois
  for (const mm of [...a, ...b]) {
    if (!mm || typeof mm.modelo !== "string" || !mm.modelo) continue;
    const atual = porModelo.get(mm.modelo);
    if (!atual) { porModelo.set(mm.modelo, mm); continue; }
    porModelo.set(mm.modelo, escolherMissao(atual, mm));
  }
  const lista = [...porModelo.values()].slice(0, LIMITES_PROGRESSAO_CONTA.MISSOES_CAP);
  return lista;
}

/** Vence: «reclamada» → mais progresso → termina mais tarde (janela maior). */
function escolherMissao(a: Missao, b: Missao): Missao {
  if (a.reclamada !== b.reclamada) return a.reclamada ? a : b;
  if (a.progresso !== b.progresso) return a.progresso > b.progresso ? a : b;
  return a.terminaEm >= b.terminaEm ? a : b;
}

/**
 * O MERGE da v84: máximo nos contadores permanentes, união por modelo nas
 * missões, contadores DO DIA pela atividade mais recente. Nunca muta —
 * devolve um estado NOVO (padrão do núcleo v78).
 */
export function mesclarEstados(a: EstadoProgressao, b: EstadoProgressao, agoraMs: number): EstadoProgressao {
  const dia = (() => {
    const d = new Date(agoraMs);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  })();
  const aHoje = a.diaContador === dia;
  const bHoje = b.diaContador === dia;

  let corridas = 0, vitoriasHoje = 0, jogosHoje: string[] = [], diaContador = "";
  if (aHoje && bHoje) {
    corridas = Math.max(a.corridas, b.corridas);
    vitoriasHoje = Math.max(a.vitoriasHoje, b.vitoriasHoje);
    jogosHoje = [...new Set([...a.jogosHoje, ...b.jogosHoje])].slice(0, LIMITES_PROGRESSAO_CONTA.JOGOS_HOJE_CAP);
    diaContador = dia;
  } else if (aHoje) {
    corridas = a.corridas; vitoriasHoje = a.vitoriasHoje; jogosHoje = [...a.jogosHoje]; diaContador = dia;
  } else if (bHoje) {
    corridas = b.corridas; vitoriasHoje = b.vitoriasHoje; jogosHoje = [...b.jogosHoje]; diaContador = dia;
  } // nenhum é de hoje → contadores do dia nascem vazios (o tick re-agenda)

  return {
    versao: VERSAO_PROGRESSAO,
    jogadorId: a.jogadorId || b.jogadorId,
    pontos: Math.max(a.pontos, b.pontos),
    corridas,
    diaContador,
    jogosHoje,
    vitoriasHoje,
    missoes: mesclarMissoes(a.missoes, b.missoes),
    missoesConcluidasTotal: Math.max(a.missoesConcluidasTotal, b.missoesConcluidasTotal),
    ultimaAtividade: Math.max(a.ultimaAtividade, b.ultimaAtividade),
  };
}

/**
 * O vínculo do convidado à conta: o estado da conta começa pelo MERGE
 * (máximo) entre o que a conta já tinha e o progresso de convidado do
 * aparelho — os pontos do convidado MUDAM-SE para a conta (nunca somam
 * duas vezes, porque o merge é máximo). Devolve o estado novo e o aviso
 * de que o ficheiro de convidado deve ser limpo DEPOIS de gravado.
 */
export function absorverConvidado(
  estadoConta: EstadoProgressao,
  estadoConvidado: EstadoProgressao,
  userId: string,
  agoraMs: number,
): EstadoProgressao {
  const unido = mesclarEstados(estadoConta, estadoConvidado, agoraMs);
  return { ...unido, jogadorId: userId };
}

// ── Linha do servidor (forma do fio progressao_conta) ───────────────────
export interface LinhaProgressaoConta {
  user_id: string;
  jogador_id: string | null;
  pontos: number;
  missoes_concluidas_total: number;
  missoes: Missao[];
}

function userIdValido(userId: string): boolean {
  return typeof userId === "string" && userId.length > 0 && userId.length <= LIMITES_PROGRESSAO_CONTA.USER_ID_CAP;
}

/** Estado → linha do servidor (validação dura; nunca lança). */
export function estadoParaLinha(e: EstadoProgressao, userId: string): LinhaProgressaoConta | null {
  if (!userIdValido(userId)) return null;
  // round-trip pelo hidratar: as missões saem validadas e capadas
  const limpo = hidratarProgressao({ pontos: e.pontos, missoes: e.missoes, missoesConcluidasTotal: e.missoesConcluidasTotal }, userId);
  return {
    user_id: userId,
    jogador_id: (e.jogadorId || userId).slice(0, LIMITES_PROGRESSAO_CONTA.JOGADOR_ID_CAP),
    pontos: Math.min(Math.max(0, Math.floor(limpo.pontos) || 0), LIMITES_PROGRESSAO_CONTA.PONTOS_CAP),
    missoes_concluidas_total: Math.min(Math.max(0, Math.floor(limpo.missoesConcluidasTotal) || 0), LIMITES_PROGRESSAO_CONTA.MISSOES_CONCLUIDAS_CAP),
    missoes: limpo.missoes.slice(0, LIMITES_PROGRESSAO_CONTA.MISSOES_CAP),
  };
}

/** Linha do servidor → estado (linha podre → null contado; nunca lança). */
export function linhaParaEstado(linha: unknown, userId: string): EstadoProgressao | null {
  if (!userIdValido(userId)) return null;
  if (typeof linha !== "object" || linha === null) return null;
  const o = linha as Record<string, unknown>;
  // user_id da linha tem de bater CERTO com a conta (RLS garante; o núcleo prova)
  if (typeof o.user_id !== "string" || o.user_id !== userId) return null;
  const hidratado = hidratarProgressao(
    { pontos: o.pontos, missoes: o.missoes, missoesConcluidasTotal: o.missoes_concluidas_total },
    userId,
  );
  return { ...hidratado, jogadorId: userId };
}

// ── Impressão do estado sincronizável (dedupe dos envios) ───────────────
/**
 * A impressão dos campos que VALEM envio (pontos, total, jogador, missões).
 * Os contadores DO DIA (corridas/jogosHoje/vitorias) NÃO contam: o tick de
 * 30 s da UI regrava o estado a cada passagem — sem esta impressão, cada
 * abertura de página pagaria um upsert vazio a cada 30 s.
 */
export function impressaoEstado(e: EstadoProgressao): string {
  return [
    e.pontos,
    e.missoesConcluidasTotal,
    e.jogadorId,
    ...e.missoes.map((mm) => `${mm.id}:${mm.progresso}:${mm.reclamada ? 1 : 0}`),
  ].join("|");
}

/** Enviar? false quando nada de sincronizável mudou desde o último envio. */
export function deveEnviar(ultimoEnviado: string | null, estado: EstadoProgressao): boolean {
  return ultimoEnviado !== impressaoEstado(estado);
}

/** Estado base de conta (id já vinculado) — para começos limpos. */
export function estadoContaPadrao(userId: string): EstadoProgressao {
  return { ...estadoPadrao(userId) };
}
