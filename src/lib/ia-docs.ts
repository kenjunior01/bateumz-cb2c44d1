// ═══════════════════════════════════════════════════════════════════════
// v56 — IA LÊ A PLATAFORMA — MAPEADORES PUROS linha→DocPlataforma
//
// Isomórfico (browser E Node): transforma linhas cruas das tabelas da
// plataforma (raffles · contests · blog_posts) em DocPlataforma do núcleo
// RAG. Zero supabase aqui — a consulta vive em ia-plataforma.ts; o mapeio
// é PURO e testável byte a byte no Node (padrão v46–v55).
//
// Honestidade dos dados:
//   · prize_value NUNCA entra no doc (o sorteador pode esconder o valor —
//     hide_prize_value — e o RAG nunca vaza o que a UI não mostra);
//   · campos nulos são OMITIDOS (nunca "null" no texto — sem lixo no
//     embedding);
//   · datas ficam só na parte ISO (determinístico em qualquer locale);
//   · caps declarados: texto do doc truncado, docs por tipo limitados.
// ═══════════════════════════════════════════════════════════════════════

import { LIMITES_RAG, type DocPlataforma, type TipoDocPlataforma } from "./nemotron-rag.ts";

export const LIMITES_DOCS = {
  POR_TIPO: 25,             // docs máximos por fonte por indexação
  TEXTO_CAP: 1200,          // caracteres do texto do doc (antes do chunking)
  ROTULO_CAP: LIMITES_RAG.ROTULO_CONTEXTO_CAP,
} as const;

export interface LinhaSorteio {
  id: string;
  title: string;
  description?: string | null;
  prize_title?: string | null;
  hide_prize_value?: boolean | null;
  prize_value?: number | null;
  ticket_price?: number | null;
  currency?: string | null;
  total_tickets?: number | null;
  sold_tickets?: number | null;
  category?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  end_date?: string | null;
  slug?: string | null;
}

export interface LinhaConcurso {
  id: string;
  title: string;
  description?: string | null;
  prize_description?: string | null;
  category?: string | null;
  entry_fee?: number | null;
  end_date?: string | null;
}

export interface LinhaBlog {
  id: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  author_name?: string | null;
  slug?: string | null;
}

/** Junta partes não-vazias com " · " — determinístico, sem lixo de null. */
function juntarPartes(partes: (string | null | undefined)[], separador = " · "): string {
  return partes.map((p) => String(p ?? "").trim()).filter(Boolean).join(separador);
}

/** Só a parte ISO da data (YYYY-MM-DD) — nunca formatada por locale. */
function dataIso(d?: string | null): string | null {
  const s = String(d ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

function truncar(s: string, cap: number): string {
  const limpo = String(s ?? "").trim();
  return limpo.length > cap ? `${limpo.slice(0, cap - 1).trimEnd()}…` : limpo;
}

function exigir(id: unknown, title: unknown, fonte: string): { id: string; title: string } {
  const i = String(id ?? "").trim();
  const t = String(title ?? "").trim();
  if (!i || !t) throw new Error(`${fonte}: linha sem id/title — descartada`);
  return { id: i, title: t };
}

// ── Sorteio → doc (a REgra do hide_prize_value é respeitada) ────────────

export function raffleParaDoc(r: LinhaSorteio): DocPlataforma {
  const { id, title } = exigir(r?.id, r?.title, "sorteio");
  const partes: (string | null | undefined)[] = [];
  if (r.prize_title) partes.push(`Prémio: ${r.prize_title}`);
  // prize_value NUNCA entra — nem com hide_prize_value false (a plataforma
  // nem sempre mostra o valor; o RAG nunca mostra mais do que a UI).
  if (r.description) partes.push(r.description);
  if (r.ticket_price != null && Number.isFinite(Number(r.ticket_price)) && Number(r.ticket_price) >= 0) {
    partes.push(`Bilhete: ${r.ticket_price} ${r.currency || ""}`.trim().replace(/\s+$/, ""));
  }
  if (r.total_tickets != null && r.sold_tickets != null) {
    partes.push(`Bilhetes vendidos: ${r.sold_tickets}/${r.total_tickets}`);
  }
  const local = juntarPartes([r.city, r.province, r.country]);
  if (local) partes.push(`Local: ${local}`);
  if (r.category) partes.push(`Categoria: ${r.category}`);
  const fim = dataIso(r.end_date);
  if (fim) partes.push(`Termina: ${fim}`);
  // FALHO REAL (mesma regra do concurso): doc só com título → texto vazio →
  // docParaPassagens recusava-o. Fallback honesto: o texto é o próprio título.
  const corpo = juntarPartes(partes, " — ") || title;
  return {
    id: `raf-${id}`,
    tipo: "sorteio" as TipoDocPlataforma,
    rotulo: truncar(title, LIMITES_DOCS.ROTULO_CAP),
    texto: truncar(corpo, LIMITES_DOCS.TEXTO_CAP),
    url: `/raffle/${r.slug || id}`,
  };
}

// ── Concurso → doc ──────────────────────────────────────────────────────

export function contestParaDoc(c: LinhaConcurso): DocPlataforma {
  const { id, title } = exigir(c?.id, c?.title, "concurso");
  const partes: (string | null | undefined)[] = [];
  if (c.description) partes.push(c.description);
  if (c.prize_description) partes.push(`Prémio: ${c.prize_description}`);
  if (c.category) partes.push(`Categoria: ${c.category}`);
  if (c.entry_fee != null && Number(c.entry_fee) > 0) partes.push(`Taxa de entrada: ${c.entry_fee}`);
  const fim = dataIso(c.end_date);
  if (fim) partes.push(`Termina: ${fim}`);
  // FALHO REAL apanhado no teste: um doc só com título (todos os campos
  // nulos) teria texto vazio → docParaPassagens recusava-o e o RAG perdia
  // o doc INTEIRO. Fallback honesto: o texto passa a ser o próprio título.
  const corpo = juntarPartes(partes, " — ") || title;
  return {
    id: `con-${id}`,
    tipo: "concurso" as TipoDocPlataforma,
    rotulo: truncar(title, LIMITES_DOCS.ROTULO_CAP),
    texto: truncar(corpo, LIMITES_DOCS.TEXTO_CAP),
    url: `/concursos/${id}`,
  };
}

// ── Blog → doc (summary primeiro; content só quando falta o resumo) ─────

export function blogParaDoc(b: LinhaBlog): DocPlataforma {
  const { id, title } = exigir(b?.id, b?.title, "blog");
  const base = String(b.summary ?? "").trim();
  const corpo0 = base || String(b.content ?? "").trim();
  const partes: (string | null | undefined)[] = [];
  if (b.author_name) partes.push(`Por ${b.author_name}`);
  if (corpo0) partes.push(corpo0);
  return {
    id: `blog-${id}`,
    tipo: "blog" as TipoDocPlataforma,
    rotulo: truncar(title, LIMITES_DOCS.ROTULO_CAP),
    texto: truncar(juntarPartes(partes, " — ") || title, LIMITES_DOCS.TEXTO_CAP),
    url: b.slug ? `/blog/${b.slug}` : undefined,
  };
}
