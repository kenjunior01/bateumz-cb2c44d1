// ============================================================
// CICLO À VISTA (v79) — NÚCLEO PURO
// ────────────────────────────────────────────────────────────
// «Jogos geram pontos. Pontos geram progressão. Progressão
// desbloqueia prémios.» — a fatia 2 da visão de retenção torna
// esse ciclo VISÍVEL na navegação: «Continuar a jogar», «Jogo do
// dia», benefícios nos cartões («Até X pontos») e uma página
// Prémios que explica os caminhos sem nunca prometer dinheiro.
//
// Módulo PURO (browser E Node no MESMO código — padrão da casa:
// progressao.ts v78, regionalCore v73): zero React, zero
// localStorage, zero DOM. Determinístico: o «Jogo do dia» depende
// SÓ da data — o mesmo dia mostra o MESMO jogo a TODOS (rotação
// global honesta, muda à meia-noite; nada de aleatoriedade por
// visitante que impossibilitasse a conversa «jogaste o do dia?»).
//
// HONESTIDADE (regras do produto):
// · benefício só aparece com dados REAIS do catálogo — sem teto
//   declarado NÃO há chip (nunca inventar «Até X pontos»);
// · «Continuar a jogar» só com histórico real do aparelho, validado
//   contra o catálogo (id podre/desconhecido nunca entra);
// · o Jogo do dia é UMA escolha determinística — não é «patrocínio»
//   nem «sorteio com prémio»: o rótulo declara o que é.
// ============================================================

// ── Dia local (mesma convenção do progressao.ts v78) ───────────
/** "2026-11-22" no fuso LOCAL do aparelho. */
export function diaDe(agoraMs: number): string {
  const d = new Date(agoraMs);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** FNV-1a 32 bits (mesma construção das missões do dia v78). */
function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * JOGO DO DIA: escolha determinística GLOBAL por dia — xorshift32
 * semeado pelo hash da data + Fisher-Yates sobre os índices do
 * catálogo. Mesmo dia = mesmo jogo em qualquer dispositivo; dias
 * diferentes rodam (provado na suíte com uma janela de 14 dias).
 * Catálogo vazio → null (honesto: não há jogo, não há promessa).
 */
export function jogoDoDia(catalogo: { id: string }[], agoraMs: number): string | null {
  if (!Array.isArray(catalogo) || catalogo.length === 0) return null;
  const ids = catalogo
    .map((g) => (typeof g?.id === "string" ? g.id.slice(0, 40) : ""))
    .filter((id) => id.length > 0);
  if (ids.length === 0) return null;
  let semente = fnv1a(`jogo-do-dia|${diaDe(agoraMs)}`) || 1;
  const rnd = () => { semente ^= semente << 13; semente ^= semente >>> 17; semente ^= semente << 5; semente >>>= 0; return semente / 4294967296; };
  const idxs = ids.map((_, i) => i);
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  return ids[idxs[0]];
}

// ── Secções da página Jogos (modelo de EXIBIÇÃO) ───────────────
export interface SecoesJogos {
  /** ids do catálogo com histórico REAL do aparelho (ordem do mais recente). */
  continuar: string[];
  /** o Jogo do dia (determinístico global) — null sem catálogo. */
  doDia: string | null;
}

/**
 * MONTA as secções do ciclo a partir de dados REAIS:
 * · «continuar» = ids recentes do aparelho VALIDADOS contra o
 *   catálogo (desconhecido/duplicado/podre nunca entra — padrão
 *   jogoValido v60) e nunca mais de 8;
 * · «doDia» = jogoDoDia do catálogo inteiro.
 * Só monta — não lê storage (isso é da página), não decide por IA.
 */
export function seccoesJogos(
  catalogo: { id: string }[],
  idsRecentes: string[],
  agoraMs: number,
): SecoesJogos {
  const validos = new Set(
    (Array.isArray(catalogo) ? catalogo : [])
      .map((g) => (typeof g?.id === "string" ? g.id : ""))
      .filter((id) => id.length > 0),
  );
  const continuar: string[] = [];
  if (Array.isArray(idsRecentes)) {
    for (const cru of idsRecentes.slice(0, 40)) {
      const id = typeof cru === "string" ? cru.slice(0, 40) : "";
      if (id && validos.has(id) && !continuar.includes(id)) continuar.push(id);
      if (continuar.length >= 8) break;
    }
  }
  return { continuar, doDia: jogoDoDia(catalogo, agoraMs) };
}

// ── Rótulos de BENEFÍCIO (só com dados reais — nunca inventados) ──
/** «Até X pontos» — só quando o catálogo declara teto (v78). */
export function labelBeneficio(pontosMax: number | undefined): string | null {
  if (typeof pontosMax !== "number" || !Number.isFinite(pontosMax) || pontosMax <= 0) return null;
  return `Até ${Math.floor(pontosMax)} pontos`;
}
/** «~X min» — só quando o catálogo declara duração. */
export function labelDuracao(minutos: number | undefined): string | null {
  if (typeof minutos !== "number" || !Number.isFinite(minutos) || minutos <= 0) return null;
  return `~${Math.floor(minutos)} min`;
}
/** Dificuldade declarada (v78) — passa através, ou null. */
export function labelDificuldade(d: string | undefined): string | null {
  return d === "Fácil" || d === "Média" || d === "Difícil" ? d : null;
}
