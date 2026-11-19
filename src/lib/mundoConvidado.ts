// ============================================================
// v61 — MUNDO 3D SEM REGISTO (item 2 do roadmap «Bateu corrections»)
// O Mundo 3D (BATEU KART) corre SEM conta: o progresso (moedas,
// garagem, melhorias, recordes) guarda-se no APARELHO (localStorage,
// bateu_kart_save) e nunca sai dele. As RECOMPENSAS DE CONTA (pontos
// de engajamento, carteira, jogos do gestor, histórico da IA) vivem
// FORA do perímetro do mundo — em tabelas/rotas que exigem JWT (RLS
// ou edge function 401).
//
// Este módulo é a FONTE ÚNICA dessas duas regras: puro (browser E
// Node), sem react/supabase — as suítes provam a honestidade sem
// browser e o LiveHub consome o MESMO contrato que os testes.
// ============================================================

/** O modo honesto de quem está no mundo: convidado (sem sessão) ou conta. */
export type ModoMundo = "convidado" | "conta";

/** Rótulo honesto do convidado no hub (i18n no UI; constante no núcleo). */
export const ROTULO_CONVIDADO = "Convidado";

/**
 * Tabelas CONTA-APENAS: NENHUM pedido do convidado as pode tocar.
 * Este é o perímetro de recompensas que o roadmap manda proteger:
 *  · spin_wheel_games  — jogos guardados do gestor (roleta)
 *  · ia_historico      — histórico da IA (v58, RLS + JWT)
 *  · engagement_points — pontos de engajamento (leaderboard /pontos,
 *                        concedidos só pela edge function com JWT)
 * NOTA: `lives` e `profiles` NÃO são conta-apenas — são leituras
 * públicas de conteúdo (o hub mostra «ao vivo agora» a qualquer um).
 */
export const TABELAS_CONTA_APENAS = [
  "spin_wheel_games",
  "ia_historico",
  "engagement_points",
] as const;

/**
 * O modo do utilizador a partir do objeto `user` do AuthContext.
 * HONESTO: só há «conta» com um id VERIFICÁVEL (string não vazia) —
 * qualquer objeto podre/sem id cai em «convidado», que faz ZERO
 * pedidos ao perímetro de conta (padrão convidado da v58).
 */
export function modoDoUtilizador(user: unknown): ModoMundo {
  const id = (user as { id?: unknown } | null | undefined)?.id;
  return typeof id === "string" && id.trim().length > 0 ? "conta" : "convidado";
}

/** Jogos com progressão PRÓPRIA no aparelho — não alimentam o kit universal. */
export const JOGOS_SEM_KIT = ["kart"] as const;

/**
 * O fim de partida deste jogo alimenta as missões/XP do kit universal?
 * v61: extraído do LiveHub para o contrato testável — o BATEU KART
 * tem progressão própria (garagem/moedas no aparelho), os restantes
 * jogos do hub alimentam o kit (TAMBÉM no aparelho — nunca é
 * recompensa de conta). `null` (sem jogo ativo) nunca reporta.
 */
export function deveReportarUniversal(
  jogo: string | null,
  excecoes: readonly string[] = JOGOS_SEM_KIT,
): boolean {
  return typeof jogo === "string" && jogo.length > 0 && !excecoes.includes(jogo);
}

/**
 * A tabela PostgREST visada por um URL de pedido (`/rest/v1/<tabela>`).
 * null quando o URL não é do PostgREST (auth, edge functions, APIs
 * externas, ativos).
 */
export function tabelaDeRest(url: string): string | null {
  if (typeof url !== "string" || url.length === 0) return null;
  const m = /\/rest\/v1\/([^/?#]+)/.exec(url);
  return m ? m[1] : null;
}

/** O URL visa uma tabela CONTA-APENAS (o convidado nunca as toca)? */
export function eContaApenas(url: string): boolean {
  const tabela = tabelaDeRest(url);
  if (!tabela) return false;
  return (TABELAS_CONTA_APENAS as readonly string[]).includes(tabela);
}

/**
 * O pedido ESCREVE no PostgREST? (métodos que mudam estado). O
 * convidado pode fazer LEITURAS públicas (lives), nunca ESCRITAS.
 */
export function eEscritaRest(url: string, metodo: string): boolean {
  if (!tabelaDeRest(url)) return false;
  return !["GET", "HEAD", "OPTIONS"].includes(metodo.toUpperCase());
}

/**
 * Funções edge CONTA-APENAS: exigem JWT do utilizador e devolvem 401
 * sem sessão (provado no código de cada função em supabase/functions/).
 * O convidado NUNCA as chama. NOTAS honestas:
 *  · paypal-config / track-ambassador-visit / log-password-reset são
 *    PÚBLICAS (sem JWT) — config do SDK, contador de visitas, aviso de
 *    reset; qualquer visitante pode tocá-las (o E2E logs-as como públicas)
 *  · as admin/cron (admin-*, auto-draw, notify-*, settle-*, process-*)
 *    usam chaves de serviço no SERVIDOR — o browser do convidado nunca
 *    as conhece; a prova é que nenhum URL delas aparece no ledger.
 */
export const FUNCOES_CONTA_APENAS = [
  "award-engagement-points",
  "spin-wheel-spin",
  "raffle-draw",
  "mascot-chat",
  "mascot-message",
  "nemotron-chat",
  "nemotron-embed",
  "nemotron-visao",
  "paypal-create-order",
  "paypal-capture-order",
] as const;

/** O URL visa uma função edge CONTA-APENAS? (o convidado nunca a chama) */
export function funcaoContaApenas(url: string): boolean {
  const m = /\/functions\/v1\/([^/?#]+)/.exec(url);
  if (!m) return false;
  return (FUNCOES_CONTA_APENAS as readonly string[]).includes(m[1]);
}
