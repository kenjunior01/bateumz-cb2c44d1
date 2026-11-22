// ============================================================
// DESBLOQUEIOS DE NÍVEL (v80) — NÚCLEO PURO
// ────────────────────────────────────────────────────────────
// «Progressão desbloqueia prémios.» — a v78 DECLARAVA os
// desbloqueios (strings nos NIVEIS); a v80 torna-os REAIS:
// catálogo com identidade própria, gating honesto por nível e
// SELEÇÃO de cosmeticos (moldura do avatar + título) que o
// jogador pode aplicar onde a conta/aparelho aparece.
//
// Módulo PURO (browser E Node no MESMO código — padrão progressao
// v78 / ciclo v79): zero React, zero localStorage, zero DOM.
//
// REGRAS DO PRODUTO (anti-dark-pattern, guardrail v78 mantido):
// · desbloqueios são COSMÉTICOS ou ESTRUTURAIS — NÃO EXISTE tipo
//   que altere stats/moedas/velocidade (vantagem competitiva é
//   impossível por construção; a suíte prova por regex e por
//   enum fechado de tipos);
// · o CATÁLOGO tem de estar SINCRONIZADO com NIVEIS nos dois
//   sentidos (nenhum id órfão nas NIVEIS, nenhum id ausente do
//   catálogo) — catalogoSincronizadoComNiveis() e a suíte
//   recusam qualquer deriva;
// · SELEÇÃO HONESTA: escolher algo bloqueado é RECUSADO (mesmo
//   vindo da store do aparelho ou de um futuro servidor) —
//   hidratarCosmeticos revalida TUDO contra o nível real;
// · nunca há «quase desbloqueado» fictício: o cartão bloqueado
//   mostra o nível e os pontos EXATOS que faltam.
// ============================================================

import { NIVEIS, nivelDe } from "./progressao";

// ── Catálogo (um id por string em NIVEIS — sincronizado) ───────
export type TipoDesbloqueio = "avatar" | "moldura" | "tema" | "titulo" | "estrutural";

export interface DesbloqueioDef {
  id: string;
  tipo: TipoDesbloqueio;
  nome: string;
  desc: string;
  /** nível mínimo para USAR (derivado de NIVEIS — a fonte é uma só). */
  nivel: number;
  /** cor de acento (dado de apresentação — não é DOM). */
  cor: string;
}

export const CAT_DESBLOQUEIOS: DesbloqueioDef[] = [
  { id: "avatar-classico", tipo: "avatar", nome: "Avatar clássico", desc: "O avatar inicial de todos os jogadores Bateu.", nivel: 1, cor: "#94a3b8" },
  { id: "moldura-bronze", tipo: "moldura", nome: "Moldura Bronze", desc: "Moldura de bronze à volta do teu avatar.", nivel: 2, cor: "#b45309" },
  { id: "tema-praia", tipo: "tema", nome: "Tema Praia", desc: "Ambiente de praia nos painéis de progressão.", nivel: 2, cor: "#0ea5e9" },
  { id: "moldura-prata", tipo: "moldura", nome: "Moldura Prata", desc: "Moldura de prata à volta do teu avatar.", nivel: 3, cor: "#94a3b8" },
  { id: "acesso-torneios", tipo: "estrutural", nome: "Acesso a torneios", desc: "Inscrição em torneios da comunidade (estrutural — não altera regras de jogo).", nivel: 3, cor: "#a3e635" },
  { id: "titulo-competidor", tipo: "titulo", nome: "Título «Competidor»", desc: "Mostra «Competidor» ao lado do teu nome.", nivel: 3, cor: "#a3e635" },
  { id: "moldura-ouro", tipo: "moldura", nome: "Moldura Ouro", desc: "Moldura de ouro à volta do teu avatar.", nivel: 4, cor: "#f59e0b" },
  { id: "missoes-especiais", tipo: "estrutural", nome: "Missões especiais", desc: "Missões extra de fim de semana, com os mesmos alvos alcançáveis.", nivel: 4, cor: "#f59e0b" },
  { id: "titulo-campeao", tipo: "titulo", nome: "Título «Campeão»", desc: "Mostra «Campeão» ao lado do teu nome.", nivel: 4, cor: "#f59e0b" },
  { id: "moldura-lenda", tipo: "moldura", nome: "Moldura Lenda", desc: "A moldura exclusiva de quem chegou ao topo.", nivel: 5, cor: "#f43f5e" },
  { id: "titulo-lenda", tipo: "titulo", nome: "Título «Lenda Bateu»", desc: "Mostra «Lenda Bateu» ao lado do teu nome.", nivel: 5, cor: "#f43f5e" },
  { id: "prioridade-campanhas", tipo: "estrutural", nome: "Prioridade em campanhas", desc: "Acesso antecipado a campanhas da comunidade (estrutural).", nivel: 5, cor: "#f43f5e" },
];

const POR_ID = new Map(CAT_DESBLOQUEIOS.map((d) => [d.id, d]));

/** Nível mínimo para usar um desbloqueio — null se o id não existe. */
export function nivelMinimoDe(id: string): number | null {
  const d = POR_ID.get(typeof id === "string" ? id.slice(0, 60) : "");
  return d ? d.nivel : null;
}

/** Todos os desbloqueios alcançáveis até ao nível N (ordenados por nível). */
export function desbloqueadosAte(nivel: number): DesbloqueioDef[] {
  const n = Math.max(1, Math.min(5, Math.floor(nivel) || 1));
  return CAT_DESBLOQUEIOS.filter((d) => d.nivel <= n);
}

/** Todos os desbloqueios de UM nível (para «o nível X desbloqueia:»). */
export function desbloqueiosDoNivel(nivel: number): DesbloqueioDef[] {
  return CAT_DESBLOQUEIOS.filter((d) => d.nivel === nivel);
}

/** Pode usar? HONESTO: id existe E nível real ≥ nivel mínimo. */
export function podeUsar(id: string, nivel: number): boolean {
  const min = nivelMinimoDe(id);
  return min !== null && Math.max(1, Math.floor(nivel) || 1) >= min;
}

/**
 * GUARDA DE SINCRONIZAÇÃO: o catálogo e NIVEIS têm de concordar nos
 * DOIS sentidos. Se alguém editar NIVEIS sem o catálogo (ou vice-
 * versa), isto devolve a lista de problemas — a suíte recusa o build.
 * Corrida a cada teste e barata o suficiente para o E2E.
 */
export function catalogoSincronizadoComNiveis(): string[] {
  const problemas: string[] = [];
  const idsNiveis = new Set(NIVEIS.flatMap((n) => n.desbloqueia));
  const idsCatalogo = new Set(CAT_DESBLOQUEIOS.map((d) => d.id));
  for (const id of idsNiveis) if (!idsCatalogo.has(id)) problemas.push(`orfao-em-niveis:${id}`);
  for (const id of idsCatalogo) if (!idsNiveis.has(id)) problemas.push(`orfao-no-catalogo:${id}`);
  // o nível declarado no catálogo tem de bater certo com NIVEIS
  for (const n of NIVEIS) {
    for (const id of n.desbloqueia) {
      const d = POR_ID.get(id);
      if (d && d.nivel !== n.nivel) problemas.push(`nivel-divergente:${id}`);
    }
  }
  return problemas;
}

// ── Cosmeticos SELECIONADOS (estado próprio, lógica pura) ──────
export interface CosmeticosEstado {
  molduraId: string | null;
  tituloId: string | null;
  temaId: string | null;
}

export const VERSAO_COSMETICOS = 1;

export function cosmeticosPadrao(): CosmeticosEstado {
  return { molduraId: null, tituloId: null, temaId: null };
}

/** Tipos selecionáveis (avatar/estrutural são sempre ativos — não se escolhem). */
export function tipoSelecionavel(tipo: TipoDesbloqueio): boolean {
  return tipo === "moldura" || tipo === "titulo" || tipo === "tema";
}

/** Hidratar JSON podre: ids fora do catálogo ou BLOQUEADOS → null (honesto). */
export function hidratarCosmeticos(cru: unknown, nivel: number): CosmeticosEstado {
  const base = cosmeticosPadrao();
  if (typeof cru !== "object" || cru === null) return base;
  const o = cru as Record<string, unknown>;
  const limpar = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const id = v.slice(0, 60);
    return podeUsar(id, nivel) ? id : null; // bloqueado/podre → null
  };
  return { molduraId: limpar(o.molduraId), tituloId: limpar(o.tituloId), temaId: limpar(o.temaId) };
}

/** Escolher/remover um cosmetico — RECUSA o que está bloqueado (motivo honesto). */
export function escolherCosmetico(
  estado: CosmeticosEstado,
  tipo: "moldura" | "titulo" | "tema",
  id: string | null,
  nivel: number,
): { estado: CosmeticosEstado; motivo: "ok" | "bloqueado" | "inexistente" | "tipo" } {
  if (tipo !== "moldura" && tipo !== "titulo" && tipo !== "tema") return { estado, motivo: "tipo" };
  if (id === null || id === "") {
    return { estado: { ...estado, [`${tipo}Id`]: null } as CosmeticosEstado, motivo: "ok" };
  }
  const def = POR_ID.get(id.slice(0, 60));
  if (!def) return { estado, motivo: "inexistente" };
  if (def.tipo !== tipo) return { estado, motivo: "tipo" };
  if (!podeUsar(id, nivel)) return { estado, motivo: "bloqueado" };
  return { estado: { ...estado, [`${tipo}Id`]: id } as CosmeticosEstado, motivo: "ok" };
}

/** O desbloqueio «aplicável» de um nível para exibir honestamente o que falta. */
export function resumoFalta(pontos: number): string {
  const st = nivelDe(pontos);
  return st.proximo
    ? `Faltam ${st.proximo.pontosFaltam.toLocaleString("pt-PT")} pontos para desbloquear o nível ${st.proximo.nivel} · ${st.proximo.nome}`
    : "Todos os desbloqueios alcançados — nível máximo.";
}
