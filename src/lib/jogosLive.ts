// ============================================================
// v60 — SELEÇÃO DO JOGO ATIVO DO LIVEHUB, VALIDADA
// As três fontes do jogo ativo (URL ?game=, localStorage
// «liveActiveGame», evento «activeGame» do bus) são DADOS EXTERNOS:
// nenhum entra no estado sem passar por jogoValido(). Antes eram
// casts `as GameId` que o compilador não podia verificar (um valor
// podre guardado no localStorage deixava o hub sem painel nenhum).
// A lista de ids é INJETADA — o módulo é puro (browser E Node), sem
// react/lucide/supabase, e testável direto nas suítes.
// ============================================================

/**
 * Devolve `bruto` se for uma string que existe na lista `ids`;
 * caso contrário null. É a ÚNICA porta de entrada de valores
 * externos no estado «jogo ativo» do LiveHub.
 */
export function jogoValido<T extends string>(bruto: unknown, ids: readonly T[]): T | null {
  if (typeof bruto !== "string") return null;
  return (ids as readonly string[]).includes(bruto) ? bruto : null;
}
