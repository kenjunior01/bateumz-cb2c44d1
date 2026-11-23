// ═══════════════════════════════════════════════════════════════════════
// v82 — CONTEXTO DA IA — a IA sabe ONDE o utilizador está (briefing passo 11)
//
// «IA context-aware»: quando abres uma página de entidade (sorteio,
// leilão, concurso, jogo, partida de desporto), a página publica os
// dados REAIS já carregados e a IA do Bateu (/ia) CHEGA com esse contexto
// preparado — chip «Estás a ver: …», perguntas sugeridas da entidade e
// o system prompt recebe os factos reais.
//
// Regras de honestidade (o padrão do REA):
//   · o contexto é publicado SÓ pelas páginas, com dados REAIS do
//     carregamento — nunca inventado nem calculado pela IA;
//   · UM slot só (o utilizador está num sítio de cada vez) — publicar
//     substitui;
//   · SOBREVIVE à navegação (é esse o produto: abres o sorteio e a /ia
//     chega com o contexto preparado) mas morre com a SESSÃO
//     (sessionStorage), com o TTL declarado e com o X do chip;
//   · factos com CAP (quantidade + caracteres) para o prompt não inchar.
//
// Isomórfico: zero DOM, zero React — testável no Node (padrão v46–v59);
// a persistência de sessão está protegida com typeof localStorage guard.
// ═══════════════════════════════════════════════════════════════════════

export type TipoContextoIa = "sorteio" | "leilao" | "concurso" | "jogo" | "desporto";

export interface ContextoIa {
  tipo: TipoContextoIa;
  id: string;
  titulo: string;
  rota: string;
  factos: string[];
  /** Opcional na entrada: a publicação carimba Date.now() quando falta. */
  geradoEm?: number;
}

export const TTL_CONTEXTO_MS = 15 * 60_000;
export const FACTOS_CAP = 8;
export const FACTO_CARACTERES_CAP = 200;
const CHAVE_SESSAO = "bateu.ia.contexto.v82";
const TIPOS_VALIDOS: TipoContextoIa[] = ["sorteio", "leilao", "concurso", "jogo", "desporto"];

// ── Persistência de SESSÃO (morre com o tab; nunca localStorage) ────────

function carregarSessao(agora: number = Date.now()): ContextoIa | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const cru = sessionStorage.getItem(CHAVE_SESSAO);
    if (!cru) return null;
    const o = JSON.parse(cru);
    if (!o || typeof o !== "object") return null;
    if (!TIPOS_VALIDOS.includes(o.tipo)) return null;
    if (typeof o.titulo !== "string" || !o.titulo.trim()) return null;
    if (typeof o.rota !== "string" || !o.rota) return null;
    if (!Array.isArray(o.factos) || !o.factos.every((f: unknown) => typeof f === "string")) return null;
    if (!Number.isFinite(o.geradoEm) || agora - o.geradoEm > TTL_CONTEXTO_MS) return null; // expirado
    return o as ContextoIa;
  } catch {
    return null;
  }
}

function guardarSessao(ctx: ContextoIa | null): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (ctx) sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(ctx));
    else sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {}
}

// ── Loja (um slot + ouvintes; começa do que a sessão guardou) ────────────

let atual: ContextoIa | null = carregarSessao();
const ouvintes = new Set<() => void>();

function notificar() {
  for (const fn of ouvintes) {
    try { fn(); } catch {} // ouvinte morto nunca derruba a loja
  }
}

/** Referência ESTÁVEL entre publicações (contrato do useSyncExternalStore). */
export function lerContextoIa(): ContextoIa | null {
  return atual;
}

export function subscreverContextoIa(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => { ouvintes.delete(fn); };
}

/** Publica (substitui o slot). Saneia com CAPs; sem título ou sem factos
 *  reais, NÃO publica (honesto: nada de contexto vazio) — devolve o estado. */
export function publicarContextoIa(entrada: ContextoIa): ContextoIa | null {
  const titulo = String(entrada?.titulo ?? "").trim().slice(0, 120);
  const factos = (Array.isArray(entrada?.factos) ? entrada.factos : [])
    .map((f) => String(f ?? "").trim().slice(0, FACTO_CARACTERES_CAP))
    .filter((f) => f.length > 0)
    .slice(0, FACTOS_CAP);
  if (!titulo || factos.length === 0) return atual;
  atual = {
    tipo: entrada.tipo,
    id: String(entrada?.id ?? "").slice(0, 120),
    titulo,
    rota: String(entrada?.rota ?? "/").slice(0, 200) || "/",
    factos,
    geradoEm: Number.isFinite(entrada?.geradoEm) && entrada.geradoEm > 0 ? entrada.geradoEm : Date.now(),
  };
  guardarSessao(atual);
  notificar();
  return atual;
}

/** Limpa o slot. Com `rota`, SÓ limpa se a página actual for a dona. */
export function limparContextoIa(rota?: string): void {
  if (rota && atual?.rota !== rota) return;
  if (!atual) return;
  atual = null;
  guardarSessao(null);
  notificar();
}

/** v82 — só para testes Node: esvazia o slot SEM tocar na sessão. */
export function resetContextoIaTeste(): void {
  atual = null;
  notificar();
}

/** Limpa SEMPRE (o X do chip na própria IA). */
export function limparContextoIaTotal(): void {
  limparContextoIa();
}

// ── Validade + prompt ────────────────────────────────────────────────────

export function contextoValido(ctx: ContextoIa | null, agora: number = Date.now()): boolean {
  return !!ctx && Number.isFinite(ctx.geradoEm) && agora - (ctx.geradoEm as number) <= TTL_CONTEXTO_MS;
}

/** Bloco para o system prompt — string vazia quando não há contexto válido.
 *  A regra ao modelo é explícita: usa os factos se relevantes, ignora se
 *  não, e NUNCA inventa para lá da lista. */
export function contextoParaPrompt(ctx: ContextoIa | null, agora: number = Date.now()): string {
  if (!contextoValido(ctx, agora)) return "";
  const linhas = (ctx as ContextoIa).factos.map((f) => `- ${f}`).join("\n");
  return (
    ` CONTEXTO DA PÁGINA ACTUAL — o utilizador veio de ${ctx!.rota} e está a ver «${ctx!.titulo}» ` +
    `(dados reais do momento). Usa estes factos se forem relevantes; se a pergunta for outra, ignora-os. ` +
    `NUNCA inventes factos fora desta lista:\n${linhas}`
  );
}

// ── Perguntas sugeridas por tipo (i18n keys — a UI resolve com t()) ──────

export const QUESTOES_POR_TIPO: Record<TipoContextoIa, string[]> = {
  sorteio: ["ia.ctx.q.sorteio.1", "ia.ctx.q.sorteio.2", "ia.ctx.q.sorteio.3"],
  leilao: ["ia.ctx.q.leilao.1", "ia.ctx.q.leilao.2", "ia.ctx.q.leilao.3"],
  concurso: ["ia.ctx.q.concurso.1", "ia.ctx.q.concurso.2", "ia.ctx.q.concurso.3"],
  jogo: ["ia.ctx.q.jogo.1", "ia.ctx.q.jogo.2", "ia.ctx.q.jogo.3"],
  desporto: ["ia.ctx.q.desporto.1", "ia.ctx.q.desporto.2", "ia.ctx.q.desporto.3"],
};

export function questoesDeContexto(ctx: ContextoIa | null, agora: number = Date.now()): string[] {
  if (!contextoValido(ctx, agora)) return [];
  return QUESTOES_POR_TIPO[(ctx as ContextoIa).tipo] ?? [];
}
